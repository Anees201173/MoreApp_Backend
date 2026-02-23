const { MerchantSubscriptionPlan, MerchantSubscription, Merchant } = require('../models');
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

  const { title, description, photo_url, price, duration_days, duration, is_active } = req.body;

  if (!title || !String(title).trim()) throw new ApiError(400, 'title is required');
  if (!description || !String(description).trim()) throw new ApiError(400, 'description is required');

  const parsedPrice = Number(price);
  if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
    throw new ApiError(400, 'price is required and must be a non-negative number');
  }

  const durationRaw = duration_days ?? duration;
  const parsedDuration = Number(durationRaw);
  if (!Number.isInteger(parsedDuration) || parsedDuration <= 0) {
    throw new ApiError(400, 'duration is required and must be a positive integer (days)');
  }

  const plan = await MerchantSubscriptionPlan.create({
    merchant_id: merchant.id,
    title: String(title).trim(),
    description: String(description).trim(),
    photo_url: photo_url && String(photo_url).trim() ? String(photo_url).trim() : null,
    price: parsedPrice,
    duration_days: parsedDuration,
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

  // If user already has an active subscription for this plan, extend it by starting next day
  const latestActive = await MerchantSubscription.findOne({
    where: {
      merchant_id: plan.merchant_id,
      user_id: req.user.id,
      plan_id: plan.id,
      status: 'active',
    },
    order: [['end_date', 'DESC']],
  });

  const start = latestActive ? addDaysDateOnly(String(latestActive.end_date), 1) : today;
  const end = addDaysDateOnly(start, durationDays);

  const subscription = await MerchantSubscription.create({
    merchant_id: plan.merchant_id,
    user_id: req.user.id,
    plan_id: plan.id,
    title: String(plan.title).trim(),
    description: plan.description ?? null,
    photo_url: plan.photo_url ?? null,
    price: plan.price,
    duration_days: durationDays,
    type: 'monthly',
    start_date: start,
    end_date: end,
    status: 'active',
  });

  res.status(201).json(new ApiResponse(201, { subscription }, 'Subscribed successfully'));
});
