const {
  MerchantSubscription,
  MerchantSubscriptionPlan,
  MerchantSubscriptionRedemption,
  Merchant,
  User,
  sequelize,
} = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { Op } = require('sequelize');

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

const toDateOnlyString = (date) => {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const parseDateOnlyOrThrow = (value, fieldName) => {
  if (!value) return null;
  if (typeof value !== 'string' || !DATE_ONLY_RE.test(value)) {
    throw new ApiError(400, `${fieldName} must be in YYYY-MM-DD format`);
  }
  const [y, m, d] = value.split('-').map(Number);
  const candidate = new Date(Date.UTC(y, m - 1, d));
  if (
    candidate.getUTCFullYear() !== y ||
    candidate.getUTCMonth() !== m - 1 ||
    candidate.getUTCDate() !== d
  ) {
    throw new ApiError(400, `${fieldName} is not a valid date`);
  }
  return value;
};

const daysInMonthUtc = (year, monthIndex0) => {
  return new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate();
};

const addMonthsDateOnly = (dateOnly, monthsToAdd) => {
  const [y, m, d] = dateOnly.split('-').map(Number);
  const baseMonthIndex0 = m - 1;

  const targetMonthIndex0 = baseMonthIndex0 + Number(monthsToAdd);
  const targetYear = y + Math.floor(targetMonthIndex0 / 12);
  const normalizedTargetMonthIndex0 = ((targetMonthIndex0 % 12) + 12) % 12;

  const lastDay = daysInMonthUtc(targetYear, normalizedTargetMonthIndex0);
  const day = Math.min(d, lastDay);

  const yyyy = String(targetYear).padStart(4, '0');
  const mm = String(normalizedTargetMonthIndex0 + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const addDaysDateOnly = (dateOnly, daysToAdd) => {
  const [y, m, d] = dateOnly.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + Number(daysToAdd));
  return toDateOnlyString(dt);
};

const normalizeSubscriptionType = (input) => {
  const raw = String(input ?? 'monthly').trim().toLowerCase();
  if (raw === 'monthly' || raw === 'month') return 'monthly';
  if (raw === 'quarterly' || raw === 'quarter') return 'quarterly';
  if (raw === 'yearly' || raw === 'year') return 'yearly';
  throw new ApiError(400, `Invalid subscription type: ${input}`);
};

const getMerchantForUserOrThrow = async (req) => {
  if (!req.user) throw new ApiError(401, 'Not authorized');
  if (req.user.role !== 'merchant') throw new ApiError(403, 'Only merchants can perform this action');

  const merchant = await Merchant.findOne({ where: { user_id: req.user.id } });
  if (!merchant) throw new ApiError(403, 'Merchant profile not found');
  return merchant;
};

const expireStaleSubscriptions = async (whereBase) => {
  const today = toDateOnlyString(new Date());
  await MerchantSubscription.update(
    { status: 'expired' },
    {
      where: {
        ...whereBase,
        status: 'active',
        end_date: { [Op.lt]: today },
      },
    }
  );
};

// @desc    Merchant adds a subscription for a user (gym/etc)
// @route   POST /api/v1/subscriptions
// @access  Private (merchant only)
exports.createSubscription = asyncHandler(async (req, res) => {
  const merchant = await getMerchantForUserOrThrow(req);

  const {
    user_id,
    plan_id,
    title,
    description,
    photo_url,
    price,
    duration_days,
    duration,
    type = 'monthly',
    start_date,
  } = req.body;

  const subscriberId = user_id ?? req.user?.id;
  if (!subscriberId) throw new ApiError(400, 'user_id is required');

  const subscriber = await User.findByPk(subscriberId, { attributes: ['id', 'name', 'email', 'phone', 'role'] });
  if (!subscriber) throw new ApiError(404, 'User not found');

  let plan = null;
  const parsedPlanId = plan_id === undefined || plan_id === null || String(plan_id).trim() === ''
    ? null
    : Number(plan_id);
  if (parsedPlanId !== null) {
    if (!Number.isInteger(parsedPlanId) || parsedPlanId <= 0) {
      throw new ApiError(400, 'plan_id must be a positive integer');
    }
    plan = await MerchantSubscriptionPlan.findByPk(parsedPlanId);
    if (!plan) throw new ApiError(404, 'Subscription plan not found');
    if (Number(plan.merchant_id) !== Number(merchant.id)) {
      throw new ApiError(403, 'You can only subscribe users to your own plans');
    }
  }

  const normalizedTitle = plan ? plan.title : title;
  if (!normalizedTitle || !String(normalizedTitle).trim()) throw new ApiError(400, 'title is required');

  const rawPrice = plan ? plan.price : price;
  const parsedPrice = rawPrice === undefined || rawPrice === null || String(rawPrice).trim() === ''
    ? null
    : Number(rawPrice);
  if (parsedPrice === null || !Number.isFinite(parsedPrice) || parsedPrice < 0) {
    throw new ApiError(400, 'price is required and must be a non-negative number');
  }

  const durationRaw = (plan ? plan.duration_days : undefined) ?? duration_days ?? duration;
  const parsedDurationDays = durationRaw === undefined || durationRaw === null || String(durationRaw).trim() === ''
    ? null
    : Number(durationRaw);
  if (!Number.isFinite(parsedDurationDays) || parsedDurationDays <= 0 || !Number.isInteger(parsedDurationDays)) {
    throw new ApiError(400, 'duration is required and must be a positive integer (days)');
  }

  const rawPhotoUrl = plan ? plan.photo_url : photo_url;
  const normalizedPhotoUrl = rawPhotoUrl === undefined || rawPhotoUrl === null || !String(rawPhotoUrl).trim()
    ? null
    : String(rawPhotoUrl).trim();

  const normalizedType = normalizeSubscriptionType(type);
  const requestedStart = parseDateOnlyOrThrow(start_date, 'start_date');
  const today = toDateOnlyString(new Date());

  // Auto-expire old active subs for this merchant+user
  await expireStaleSubscriptions({ merchant_id: merchant.id, user_id: subscriber.id });

  // If user already has an active subscription with same title under this merchant,
  // extend it cleanly by starting the day after the latest end_date.
  const latestActive = await MerchantSubscription.findOne({
    where: {
      merchant_id: merchant.id,
      user_id: subscriber.id,
      status: 'active',
      ...(plan ? { plan_id: plan.id } : { title: String(normalizedTitle).trim() }),
    },
    order: [['end_date', 'DESC']],
  });

  const start = latestActive
    ? addDaysDateOnly(String(latestActive.end_date), 1)
    : (requestedStart || today);

  const end = parsedDurationDays
    ? addDaysDateOnly(start, parsedDurationDays)
    : (() => {
        let monthsToAdd = 1;
        if (normalizedType === 'quarterly') monthsToAdd = 3;
        if (normalizedType === 'yearly') monthsToAdd = 12;
        return addMonthsDateOnly(start, monthsToAdd);
      })();

  const subscription = await MerchantSubscription.create({
    merchant_id: merchant.id,
    user_id: subscriber.id,
    plan_id: plan ? plan.id : null,
    title: String(normalizedTitle).trim(),
    description: (plan ? plan.description : description) ?? null,
    photo_url: normalizedPhotoUrl,
    price: parsedPrice,
    duration_days: parsedDurationDays,
    type: normalizedType,
    start_date: start,
    end_date: end,
    status: 'active',
  });

  res.status(201).json(new ApiResponse(201, { subscription }, 'Subscription created successfully'));
});

// @desc    Get subscriptions for the authenticated user
// @route   GET /api/v1/subscriptions/me
// @access  Private
exports.getMySubscriptions = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, 'User not authenticated');

  await expireStaleSubscriptions({ user_id: userId });

  const { status } = req.query;
  const where = { user_id: userId };
  if (status) where.status = String(status).trim();

  const items = await MerchantSubscription.findAll({
    where,
    order: [['start_date', 'DESC']],
    include: [
      {
        model: Merchant,
        as: 'merchant',
        attributes: ['id', 'name', 'address', 'phone'],
      },
    ],
  });

  res.status(200).json(new ApiResponse(200, { items }, 'My subscriptions retrieved successfully'));
});

// @desc    Get subscriptions for a specific user (e.g. profile view)
// @route   GET /api/v1/subscriptions/user/:userId
// @access  Private
exports.getSubscriptionsForUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  if (!userId) throw new ApiError(400, 'userId is required');

  await expireStaleSubscriptions({ user_id: userId });

  const { status } = req.query;
  const where = { user_id: userId };
  if (status) where.status = String(status).trim();

  const items = await MerchantSubscription.findAll({
    where,
    order: [['start_date', 'DESC']],
    include: [
      {
        model: Merchant,
        as: 'merchant',
        attributes: ['id', 'name', 'address', 'phone'],
      },
      {
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email', 'phone'],
      },
    ],
  });

  res.status(200).json(new ApiResponse(200, { items }, 'User subscriptions retrieved successfully'));
});

// @desc    Merchant lists subscriptions they issued
// @route   GET /api/v1/subscriptions/merchant/me
// @access  Private (merchant only)
exports.getMyIssuedSubscriptions = asyncHandler(async (req, res) => {
  const merchant = await getMerchantForUserOrThrow(req);

  await expireStaleSubscriptions({ merchant_id: merchant.id });

  const { status, user_id } = req.query;
  const where = { merchant_id: merchant.id };
  if (status) where.status = String(status).trim();
  if (user_id) where.user_id = user_id;

  const items = await MerchantSubscription.findAll({
    where,
    order: [['start_date', 'DESC']],
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email', 'phone'],
      },
    ],
  });

  res.status(200).json(new ApiResponse(200, { items }, 'Merchant subscriptions retrieved successfully'));
});

// @desc    Superadmin lists all subscriptions
// @route   GET /api/v1/subscriptions
// @access  Private (superadmin only)
exports.getAllSubscriptions = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, 'Not authorized');

  const { status, merchant_id, user_id, plan_id, page = 1, limit = 20 } = req.query;

  const where = {};
  if (status) where.status = String(status).trim();

  // Scope by role so we can safely allow this endpoint for multiple roles
  if (req.user.role === 'superadmin') {
    // superadmin can see everything + can filter across merchant/user/plan
    if (merchant_id) where.merchant_id = Number(merchant_id);
    if (user_id) where.user_id = Number(user_id);
    if (plan_id) where.plan_id = Number(plan_id);
  } else if (req.user.role === 'merchant') {
    const merchant = await getMerchantForUserOrThrow(req);
    where.merchant_id = merchant.id;
    // merchants can filter within their own subscriptions
    if (user_id) where.user_id = Number(user_id);
    if (plan_id) where.plan_id = Number(plan_id);
    await expireStaleSubscriptions({ merchant_id: merchant.id });
  } else if (req.user.role === 'user') {
    where.user_id = req.user.id;
    // users can optionally filter their own subscriptions
    if (merchant_id) where.merchant_id = Number(merchant_id);
    if (plan_id) where.plan_id = Number(plan_id);
    await expireStaleSubscriptions({ user_id: req.user.id });
  } else {
    throw new ApiError(403, `User role ${req.user.role} is not authorized`);
  }

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
  const offset = (pageNum - 1) * limitNum;

  const result = await MerchantSubscription.findAndCountAll({
    where,
    order: [['start_date', 'DESC']],
    limit: limitNum,
    offset,
    include: [
      {
        model: Merchant,
        as: 'merchant',
        attributes: ['id', 'name', 'address', 'phone'],
      },
      {
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email', 'phone'],
      },
      {
        model: MerchantSubscriptionPlan,
        as: 'plan',
        attributes: ['id', 'title', 'price', 'duration_days', 'is_active'],
        required: false,
      },
    ],
  });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        items: result.rows,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: result.count,
          totalPages: Math.ceil(result.count / limitNum),
        },
      },
      'Subscriptions retrieved successfully'
    )
  );
});

// @desc    Merchant cancels a subscription they issued
// @route   PATCH /api/v1/subscriptions/:id/cancel
// @access  Private (merchant only)
exports.cancelSubscription = asyncHandler(async (req, res) => {
  const merchant = await getMerchantForUserOrThrow(req);

  const { id } = req.params;
  const subscription = await MerchantSubscription.findByPk(id);
  if (!subscription) throw new ApiError(404, 'Subscription not found');

  if (Number(subscription.merchant_id) !== Number(merchant.id)) {
    throw new ApiError(403, 'You can only cancel subscriptions issued by you');
  }
  if (subscription.status !== 'active') {
    throw new ApiError(400, `Cannot cancel a ${subscription.status} subscription`);
  }

  subscription.status = 'cancelled';
  await subscription.save();

  res.status(200).json(new ApiResponse(200, { subscription }, 'Subscription cancelled successfully'));
});

// @desc    User cancels their own subscription
// @route   PATCH /api/v1/subscriptions/:id/cancel-me
// @access  Private (user)
exports.cancelMySubscription = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, 'Not authorized');

  const { id } = req.params;
  const subscription = await MerchantSubscription.findByPk(id);
  if (!subscription) throw new ApiError(404, 'Subscription not found');

  if (Number(subscription.user_id) !== Number(req.user.id)) {
    throw new ApiError(403, 'You can only cancel your own subscription');
  }

  if (subscription.status !== 'active') {
    throw new ApiError(400, `Cannot cancel a ${subscription.status} subscription`);
  }

  subscription.status = 'cancelled';
  await subscription.save();

  res.status(200).json(new ApiResponse(200, { subscription }, 'Subscription cancelled successfully'));
});

// @desc    Merchant redeems a subscription voucher usage
// @route   POST /api/v1/subscriptions/:id/redeem
// @access  Private (merchant only)
exports.redeemSubscription = asyncHandler(async (req, res) => {
  const merchant = await getMerchantForUserOrThrow(req);

  const subscriptionId = Number(req.params.id);
  if (!Number.isInteger(subscriptionId) || subscriptionId <= 0) {
    throw new ApiError(400, 'Invalid subscription id');
  }

  const now = new Date();
  const today = toDateOnlyString(now);

  const result = await sequelize.transaction(async (t) => {
    const subscription = await MerchantSubscription.findByPk(subscriptionId, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!subscription) throw new ApiError(404, 'Subscription not found');
    if (Number(subscription.merchant_id) !== Number(merchant.id)) {
      throw new ApiError(403, 'You can only redeem subscriptions issued by you');
    }

    // Ensure subscription is currently valid
    if (subscription.status !== 'active') {
      throw new ApiError(400, `Cannot redeem a ${subscription.status} subscription`);
    }
    if (String(subscription.start_date) > today) {
      throw new ApiError(400, 'Subscription has not started yet');
    }
    if (String(subscription.end_date) < today) {
      // keep status accurate
      subscription.status = 'expired';
      await subscription.save({ transaction: t });
      throw new ApiError(400, 'Subscription has expired');
    }

    let plan = null;
    if (subscription.plan_id) {
      plan = await MerchantSubscriptionPlan.findByPk(subscription.plan_id, { transaction: t });
    }

    const policyRaw = String(plan?.voucher_policy ?? 'unlimited').trim().toLowerCase();
    // "monthly" subscriptions should be unlimited access like a gym membership.
    // Backwards compatibility: monthly_uses behaves as unlimited.
    const policy = policyRaw === 'monthly_uses' ? 'unlimited' : policyRaw;
    const allowedPolicies = new Set(['unlimited', 'total_uses']);
    if (!allowedPolicies.has(policy)) {
      throw new ApiError(400, 'Subscription plan voucher policy is invalid');
    }

    const totalUsed = await MerchantSubscriptionRedemption.count({
      where: { subscription_id: subscription.id },
      transaction: t,
    });

    const maxTotalUses = plan?.max_total_uses === undefined || plan?.max_total_uses === null
      ? null
      : Number(plan.max_total_uses);

    if (policy === 'total_uses') {
      if (!Number.isInteger(maxTotalUses) || maxTotalUses <= 0) {
        throw new ApiError(400, 'Plan max_total_uses must be a positive integer');
      }
      if (Number(totalUsed) >= maxTotalUses) {
        throw new ApiError(400, 'No remaining voucher uses for this subscription');
      }
    }

    const redemption = await MerchantSubscriptionRedemption.create(
      {
        subscription_id: subscription.id,
        merchant_id: merchant.id,
        user_id: subscription.user_id,
        redeemed_at: now,
      },
      { transaction: t }
    );

    const updatedTotalUsed = Number(totalUsed) + 1;
    const updatedUsedThisMonth = null;

    return {
      subscription,
      plan,
      redemption,
      usage: {
        policy,
        total_used: updatedTotalUsed,
        used_this_month: updatedUsedThisMonth,
        max_total_uses: maxTotalUses,
        max_uses_per_month: null,
        remaining_total_uses:
          policy === 'total_uses' && Number.isInteger(maxTotalUses)
            ? Math.max(0, maxTotalUses - updatedTotalUsed)
            : null,
        remaining_monthly_uses: null,
      },
    };
  });

  res
    .status(201)
    .json(new ApiResponse(201, result, 'Subscription redeemed successfully'));
});
