const { MerchantSubscriptionPlan, MerchantSubscription, Merchant, User, SubscriptionCategory, sequelize } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { Op, Sequelize } = require('sequelize');

const toDateOnlyString = (date) => {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const addDaysDateOnly = (dateOnly, daysToAdd) => {
  const [y, m, d] = String(dateOnly).split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + Number(daysToAdd));
  return toDateOnlyString(dt);
};

const diffDaysDateOnly = (startDateOnly, endDateOnly) => {
  const [sy, sm, sd] = String(startDateOnly).split('-').map(Number);
  const [ey, em, ed] = String(endDateOnly).split('-').map(Number);
  const s = Date.UTC(sy, sm - 1, sd);
  const e = Date.UTC(ey, em - 1, ed);
  return Math.floor((e - s) / (24 * 60 * 60 * 1000));
};

const getMerchantForUserOrThrow = async (req) => {
  if (!req.user) throw new ApiError(401, 'Not authorized');
  if (req.user.role !== 'merchant') throw new ApiError(403, 'Only merchants can perform this action');

  const merchant = await Merchant.findOne({ where: { user_id: req.user.id } });
  if (!merchant) throw new ApiError(403, 'Merchant profile not found');
  return merchant;
};

// @desc    List merchant subscription plans for browsing (active by default)
// @route   GET /api/v1/merchant-subscription-plans
// @access  Private (any authenticated role)
exports.listPlans = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, 'Not authorized');

  const { merchant_id, include_inactive } = req.query;

  const where = {};
  if (merchant_id) where.merchant_id = Number(merchant_id);

  const role = req.user.role;

  if (role === 'superadmin') {
    if (!include_inactive) where.is_active = true;
  } else if (role === 'merchant') {
    // Merchants can include inactive ONLY for their own plans
    if (include_inactive) {
      const merchant = await getMerchantForUserOrThrow(req);
      where.merchant_id = merchant.id;
    } else {
      where.is_active = true;
    }
  } else {
    // Normal users (and other roles): only active plans
    where.is_active = true;
  }

  const items = await MerchantSubscriptionPlan.findAll({
    where,
    order: [['id', 'DESC']],
    include: [
      {
        model: Merchant,
        as: 'merchant',
        attributes: ['id', 'name', 'address', 'phone'],
      },
      {
        model: SubscriptionCategory,
        as: 'subscriptionCategory',
        attributes: ['id', 'name', 'icon_url', 'is_active'],
      },
    ],
  });

  res.status(200).json(new ApiResponse(200, { items }, 'Subscription plans retrieved successfully'));
});

// @desc    Get merchant subscription plan by id
// @route   GET /api/v1/merchant-subscription-plans/:id
// @access  Private (any authenticated role; inactive visible only to superadmin/owner merchant)
exports.getPlanById = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, 'Not authorized');

  const planId = Number(req.params.id);
  if (!Number.isInteger(planId) || planId <= 0) throw new ApiError(400, 'Invalid plan id');

  const plan = await MerchantSubscriptionPlan.findByPk(planId, {
    include: [
      {
        model: Merchant,
        as: 'merchant',
        attributes: ['id', 'name', 'address', 'phone'],
      },
      {
        model: SubscriptionCategory,
        as: 'subscriptionCategory',
        attributes: ['id', 'name', 'icon_url', 'is_active'],
      },
    ],
  });
  if (!plan) throw new ApiError(404, 'Subscription plan not found');

  if (!plan.is_active) {
    if (req.user.role === 'superadmin') {
      // allowed
    } else if (req.user.role === 'merchant') {
      const merchant = await getMerchantForUserOrThrow(req);
      if (Number(plan.merchant_id) !== Number(merchant.id)) {
        throw new ApiError(404, 'Subscription plan not found');
      }
    } else {
      throw new ApiError(404, 'Subscription plan not found');
    }
  }

  res.status(200).json(new ApiResponse(200, { plan }, 'Subscription plan retrieved successfully'));
});

exports.createPlan = asyncHandler(async (req, res) => {
  const merchant = await getMerchantForUserOrThrow(req);

  const {
    subscription_category_id,
    title,
    description,
    photo_url,
    price,
    duration_days,
    duration,
    is_active,
    gift_energy_points,
    start_date,
    end_date,
    voucher_policy,
    max_total_uses,
  } = req.body;

  const parsedCategoryId = Number(subscription_category_id);
  if (!Number.isInteger(parsedCategoryId) || parsedCategoryId <= 0) {
    throw new ApiError(400, 'subscription_category_id is required');
  }

  const category = await SubscriptionCategory.findByPk(parsedCategoryId);
  if (!category || !category.is_active) {
    throw new ApiError(400, 'Selected subscription category is not available');
  }

  if (!title || !String(title).trim()) throw new ApiError(400, 'title is required');
  if (!description || !String(description).trim()) throw new ApiError(400, 'description is required');

  const parsedPrice = Number(price);
  if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
    throw new ApiError(400, 'price is required and must be a non-negative number');
  }

  const durationRaw = duration_days ?? duration;
  const parsedDuration =
    durationRaw === undefined || durationRaw === null || String(durationRaw).trim() === ''
      ? null
      : Number(durationRaw);
  if (parsedDuration !== null && (!Number.isInteger(parsedDuration) || parsedDuration <= 0)) {
    throw new ApiError(400, 'duration must be a positive integer (days)');
  }

  const giftRaw = gift_energy_points;
  const parsedGiftEnergyPoints =
    giftRaw === undefined || giftRaw === null || String(giftRaw).trim() === ''
      ? 0
      : Number(giftRaw);
  if (!Number.isFinite(parsedGiftEnergyPoints) || parsedGiftEnergyPoints < 0 || !Number.isInteger(parsedGiftEnergyPoints)) {
    throw new ApiError(400, 'gift_energy_points must be a non-negative integer');
  }

  const normalizedPolicyRaw =
    voucher_policy === undefined || voucher_policy === null || String(voucher_policy).trim() === ''
      ? 'unlimited'
      : String(voucher_policy).trim().toLowerCase();
  // Backwards compatibility: monthly_uses behaves as unlimited.
  const normalizedPolicy = normalizedPolicyRaw === 'monthly_uses' ? 'unlimited' : normalizedPolicyRaw;
  const allowedPolicies = new Set(['unlimited', 'total_uses']);
  if (!allowedPolicies.has(normalizedPolicy)) {
    throw new ApiError(400, 'voucher_policy must be one of: unlimited, total_uses');
  }

  const parsedMaxTotalUses =
    max_total_uses === undefined || max_total_uses === null || String(max_total_uses).trim() === ''
      ? null
      : Number(max_total_uses);
  if (parsedMaxTotalUses !== null && (!Number.isInteger(parsedMaxTotalUses) || parsedMaxTotalUses <= 0)) {
    throw new ApiError(400, 'max_total_uses must be a positive integer');
  }

  if (normalizedPolicy === 'total_uses' && parsedMaxTotalUses === null) {
    throw new ApiError(400, 'max_total_uses is required when voucher_policy is total_uses');
  }

  const normalizedStartDate = start_date && String(start_date).trim() ? toDateOnlyString(start_date) : null;
  if (start_date && !normalizedStartDate) {
    throw new ApiError(400, 'start_date is invalid');
  }

  const normalizedEndDate = end_date && String(end_date).trim() ? toDateOnlyString(end_date) : null;
  if (end_date && !normalizedEndDate) {
    throw new ApiError(400, 'end_date is invalid');
  }

  if (normalizedStartDate && normalizedEndDate) {
    if (diffDaysDateOnly(normalizedStartDate, normalizedEndDate) <= 0) {
      throw new ApiError(400, 'end_date must be after start_date');
    }
  }

  if (parsedDuration === null && !(normalizedStartDate && normalizedEndDate)) {
    throw new ApiError(400, 'duration is required (or provide both start_date and end_date)');
  }

  const durationDaysFinal = parsedDuration !== null
    ? parsedDuration
    : diffDaysDateOnly(normalizedStartDate, normalizedEndDate);

  const plan = await MerchantSubscriptionPlan.create({
    merchant_id: merchant.id,
    subscription_category_id: parsedCategoryId,
    title: String(title).trim(),
    description: String(description).trim(),
    photo_url: photo_url && String(photo_url).trim() ? String(photo_url).trim() : null,
    price: parsedPrice,
    duration_days: durationDaysFinal,
    gift_energy_points: parsedGiftEnergyPoints,
    start_date: normalizedStartDate,
    end_date: normalizedEndDate,
    voucher_policy: normalizedPolicy,
    max_total_uses: normalizedPolicy === 'total_uses' ? parsedMaxTotalUses : null,
    max_uses_per_month: null,
    is_active: is_active === undefined ? true : Boolean(is_active),
  });

  res.status(201).json(new ApiResponse(201, { plan }, 'Subscription plan created successfully'));
});

exports.getMyPlans = asyncHandler(async (req, res) => {
  const merchant = await getMerchantForUserOrThrow(req);

  // Keep subscription statuses accurate before counting actives
  const today = new Date().toISOString().slice(0, 10);
  await MerchantSubscription.update(
    { status: 'expired' },
    {
      where: {
        merchant_id: merchant.id,
        status: 'active',
        end_date: { [Op.lt]: today },
      },
    }
  );

  const { include_inactive } = req.query;
  const where = { merchant_id: merchant.id };
  if (!include_inactive) where.is_active = true;

  const items = await MerchantSubscriptionPlan.findAll({
    where,
    order: [['id', 'DESC']],
    include: [
      {
        model: SubscriptionCategory,
        as: 'subscriptionCategory',
        attributes: ['id', 'name', 'icon_url', 'is_active'],
      },
    ],
  });

  const planIds = items.map((p) => p.id).filter((id) => id !== undefined && id !== null);

  const countsByPlanId = new Map();
  for (const planId of planIds) {
    countsByPlanId.set(Number(planId), { total: 0, active: 0 });
  }

  if (planIds.length) {
    const rows = await MerchantSubscription.findAll({
      where: {
        merchant_id: merchant.id,
        plan_id: { [Op.in]: planIds },
      },
      attributes: [
        'plan_id',
        'status',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
      ],
      group: ['plan_id', 'status'],
      raw: true,
    });

    for (const row of rows) {
      const planId = Number(row.plan_id);
      const count = Number(row.count) || 0;
      const status = String(row.status || '').toLowerCase();

      if (!countsByPlanId.has(planId)) countsByPlanId.set(planId, { total: 0, active: 0 });
      const agg = countsByPlanId.get(planId);
      agg.total += count;
      if (status === 'active') agg.active += count;
    }
  }

  const itemsWithCounts = items.map((p) => {
    const json = typeof p.toJSON === 'function' ? p.toJSON() : p;
    const agg = countsByPlanId.get(Number(p.id)) || { total: 0, active: 0 };
    return {
      ...json,
      total_subscriptions: agg.total,
      active_subscriptions: agg.active,
    };
  });

  res.status(200).json(new ApiResponse(200, { items: itemsWithCounts }, 'Subscription plans retrieved successfully'));
});

exports.togglePlanStatus = asyncHandler(async (req, res) => {
  const merchant = await getMerchantForUserOrThrow(req);

  const { id } = req.params;
  const plan = await MerchantSubscriptionPlan.findByPk(id);
  if (!plan) throw new ApiError(404, 'Plan not found');
  if (Number(plan.merchant_id) !== Number(merchant.id)) {
    throw new ApiError(403, 'You can only update your own plans');
  }

  plan.is_active = !plan.is_active;
  await plan.save();

  res.status(200).json(new ApiResponse(200, { plan }, 'Plan status updated successfully'));
});

// @desc    User subscribes to a merchant subscription plan (purchase)
// @route   POST /api/v1/merchant-subscription-plans/:id/subscribe
// @access  Private (user)
exports.subscribeToPlan = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, 'Not authorized');
  if (req.user.role !== 'user') throw new ApiError(403, 'Only users can subscribe to a plan');

  const planId = Number(req.params.id);
  if (!Number.isInteger(planId) || planId <= 0) throw new ApiError(400, 'Invalid plan id');

  const plan = await MerchantSubscriptionPlan.findByPk(planId);
  if (!plan) throw new ApiError(404, 'Subscription plan not found');
  if (!plan.is_active) throw new ApiError(400, 'This plan is not active');

  const durationDays = Number(plan.duration_days);
  if (!Number.isInteger(durationDays) || durationDays <= 0) {
    throw new ApiError(400, 'Plan duration is invalid');
  }

  const today = toDateOnlyString(new Date());

  const planStart = plan.start_date ? String(plan.start_date) : null;
  const planEnd = plan.end_date ? String(plan.end_date) : null;

  // Auto-expire stale subs for this user/merchant
  await MerchantSubscription.update(
    { status: 'expired' },
    {
      where: {
        merchant_id: plan.merchant_id,
        user_id: req.user.id,
        status: 'active',
        end_date: { [Op.lt]: today },
      },
    }
  );

  // If user already has an active subscription for this plan, do not create a duplicate
  const latestActive = await MerchantSubscription.findOne({
    where: {
      merchant_id: plan.merchant_id,
      user_id: req.user.id,
      plan_id: plan.id,
      status: 'active',
    },
    order: [['end_date', 'DESC']],
  });

  const start = latestActive
    ? String(latestActive.start_date)
    : (planStart && today < planStart ? planStart : today);

  const baseEnd = latestActive
    ? addDaysDateOnly(String(latestActive.end_date), durationDays)
    : addDaysDateOnly(start, durationDays);

  const end = planEnd ? (baseEnd > planEnd ? planEnd : baseEnd) : baseEnd;

  if (today > end) {
    throw new ApiError(400, 'This plan has expired');
  }

  const remainingDays = Math.max(1, diffDaysDateOnly(start, end));

  const giftEnergyPoints = Number(plan.gift_energy_points ?? 0) || 0;

  const subscription = await sequelize.transaction(async (t) => {
    let saved;

    if (latestActive) {
      if (String(latestActive.end_date) >= end) {
        throw new ApiError(400, 'Cannot extend beyond the plan end date');
      }

      latestActive.end_date = end;
      latestActive.duration_days = Math.max(1, diffDaysDateOnly(String(latestActive.start_date), end));
      saved = await latestActive.save({ transaction: t });
    } else {
      saved = await MerchantSubscription.create(
        {
          merchant_id: plan.merchant_id,
          user_id: req.user.id,
          plan_id: plan.id,
          title: String(plan.title).trim(),
          description: plan.description ?? null,
          photo_url: plan.photo_url ?? null,
          price: plan.price,
          duration_days: remainingDays,
          type: 'monthly',
          start_date: start,
          end_date: end,
          status: 'active',
        },
        { transaction: t }
      );
    }

    if (giftEnergyPoints > 0) {
      await User.increment('energy_points_balance', {
        by: giftEnergyPoints,
        where: { id: req.user.id },
        transaction: t,
      });
    }

    return saved;
  });

  res.status(201).json(new ApiResponse(201, { subscription }, latestActive ? 'Subscription extended successfully' : 'Subscribed successfully'));
});
