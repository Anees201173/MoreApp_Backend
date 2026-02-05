const { FieldSubscriptionPlan, Field, Merchant } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

const normalizePlanType = (input) => {
  const raw = String(input ?? '').trim().toLowerCase();
  if (raw === 'monthly' || raw === 'month') return 'monthly';
  if (raw === 'quarterly' || raw === 'quarter') return 'quarterly';
  if (raw === 'yearly' || raw === 'year') return 'yearly';
  throw new ApiError(400, `Invalid plan type: ${input}`);
};

const normalizeVisibility = (input) => {
  const raw = String(input ?? 'public').trim().toLowerCase();
  if (raw === 'public' || raw === 'pub') return 'public';
  if (raw === 'private' || raw === 'priv') return 'private';
  throw new ApiError(400, `Invalid visibility: ${input}`);
};

const parseFeatures = (val) => {
  if (!val && val !== 0) return [];
  if (Array.isArray(val)) return val.filter(Boolean).map(String);
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
    } catch {
      // ignore
    }
    return val
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
};

const getMerchantForUser = async (req) => {
  if (!req.user || req.user.role !== 'merchant') return null;
  return Merchant.findOne({ where: { user_id: req.user.id } });
};

// Merchant creates or updates a plan for a field+type (idempotent upsert behavior)
exports.upsertPlan = asyncHandler(async (req, res) => {
  const { field_id, type, title, description, price, currency, features, visibility, is_active } = req.body;

  if (!req.user) throw new ApiError(401, 'Not authorized');

  const normalizedType = normalizePlanType(type);
  const normalizedVisibility = normalizeVisibility(visibility);

  const numericPrice = Number(price);
  if (!field_id) throw new ApiError(400, 'field_id is required');
  if (!title || !String(title).trim()) throw new ApiError(400, 'title is required');
  if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
    throw new ApiError(400, 'price must be a positive number');
  }

  const field = await Field.findByPk(field_id);
  if (!field) throw new ApiError(404, 'Field not found');

  // merchant ownership enforcement (superadmin can bypass)
  let effectiveMerchantId = field.merchant_id;
  if (req.user.role === 'merchant') {
    const merchant = await getMerchantForUser(req);
    if (!merchant) throw new ApiError(403, 'Merchant profile not found');
    if (!field.merchant_id || Number(field.merchant_id) !== Number(merchant.id)) {
      throw new ApiError(403, 'You can only manage plans for your own fields');
    }
    effectiveMerchantId = merchant.id;
  }

  if (!effectiveMerchantId) {
    throw new ApiError(400, 'Field is not assigned to a merchant');
  }

  const planFeatures = parseFeatures(features);
  const effectiveCurrency = (currency && String(currency).trim()) ? String(currency).trim().toUpperCase() : 'SAR';

  const [plan, created] = await FieldSubscriptionPlan.findOrCreate({
    where: { field_id, type: normalizedType },
    defaults: {
      field_id,
      merchant_id: effectiveMerchantId,
      type: normalizedType,
      title: String(title).trim(),
      description: description ?? null,
      price: numericPrice,
      currency: effectiveCurrency,
      features: planFeatures,
      visibility: normalizedVisibility,
      is_active: is_active === undefined ? true : Boolean(is_active),
    },
  });

  if (!created) {
    // Ensure merchant_id stays correct
    plan.merchant_id = effectiveMerchantId;
    plan.title = String(title).trim();
    plan.description = description ?? null;
    plan.price = numericPrice;
    plan.currency = effectiveCurrency;
    plan.features = planFeatures;
    plan.visibility = normalizedVisibility;
    if (is_active !== undefined) plan.is_active = Boolean(is_active);
    await plan.save();
  }

  res
    .status(created ? 201 : 200)
    .json(new ApiResponse(created ? 201 : 200, { plan }, created ? 'Plan created' : 'Plan updated'));
});

// Public/user-facing list: defaults to active+public. Merchants can see all their own.
exports.listPlans = asyncHandler(async (req, res) => {
  const { field_id, merchant_id, type, include_inactive } = req.query;

  const where = {};
  if (field_id) where.field_id = field_id;
  if (merchant_id) where.merchant_id = merchant_id;
  if (type) where.type = normalizePlanType(type);

  const isMerchant = req.user && req.user.role === 'merchant';
  const isSuperadmin = req.user && req.user.role === 'superadmin';

  if (!isSuperadmin) {
    if (!include_inactive) where.is_active = true;
    // normal users only see public plans
    if (!isMerchant) where.visibility = 'public';
  }

  // If merchant, scope to their merchant_id unless explicitly filtered and superadmin
  if (isMerchant) {
    const merchant = await getMerchantForUser(req);
    if (merchant) where.merchant_id = merchant.id;
  }

  const items = await FieldSubscriptionPlan.findAll({
    where,
    order: [['field_id', 'ASC'], ['type', 'ASC']],
    include: [
      { model: Field, as: 'field', attributes: ['id', 'title', 'address', 'city'] },
    ],
  });

  res.status(200).json(new ApiResponse(200, { items }, 'Subscription plans retrieved successfully'));
});

exports.getPlanById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const plan = await FieldSubscriptionPlan.findByPk(id, {
    include: [{ model: Field, as: 'field', attributes: ['id', 'title', 'address', 'city'] }],
  });
  if (!plan) throw new ApiError(404, 'Plan not found');

  // Non-superadmins: private plans are visible only to owning merchant
  if (plan.visibility === 'private' && (!req.user || req.user.role !== 'superadmin')) {
    if (!req.user || req.user.role !== 'merchant') throw new ApiError(403, 'Plan is private');
    const merchant = await getMerchantForUser(req);
    if (!merchant || Number(plan.merchant_id) !== Number(merchant.id)) {
      throw new ApiError(403, 'Plan is private');
    }
  }

  // For normal users, hide inactive plans
  if ((!req.user || req.user.role === 'user') && !plan.is_active) {
    throw new ApiError(404, 'Plan not found');
  }

  res.status(200).json(new ApiResponse(200, { plan }, 'Plan retrieved successfully'));
});

exports.updatePlan = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const plan = await FieldSubscriptionPlan.findByPk(id);
  if (!plan) throw new ApiError(404, 'Plan not found');

  if (!req.user) throw new ApiError(401, 'Not authorized');
  if (req.user.role === 'merchant') {
    const merchant = await getMerchantForUser(req);
    if (!merchant || Number(plan.merchant_id) !== Number(merchant.id)) {
      throw new ApiError(403, 'You can only update your own plans');
    }
  } else if (req.user.role !== 'superadmin') {
    throw new ApiError(403, 'Not allowed');
  }

  const patch = req.body || {};

  if (patch.type !== undefined) plan.type = normalizePlanType(patch.type);
  if (patch.title !== undefined) {
    if (!String(patch.title).trim()) throw new ApiError(400, 'title cannot be empty');
    plan.title = String(patch.title).trim();
  }
  if (patch.description !== undefined) plan.description = patch.description ?? null;
  if (patch.price !== undefined) {
    const numericPrice = Number(patch.price);
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) throw new ApiError(400, 'price must be a positive number');
    plan.price = numericPrice;
  }
  if (patch.currency !== undefined) {
    const c = String(patch.currency).trim();
    plan.currency = c ? c.toUpperCase() : plan.currency;
  }
  if (patch.features !== undefined) plan.features = parseFeatures(patch.features);
  if (patch.visibility !== undefined) plan.visibility = normalizeVisibility(patch.visibility);
  if (patch.is_active !== undefined) plan.is_active = Boolean(patch.is_active);

  await plan.save();
  res.status(200).json(new ApiResponse(200, { plan }, 'Plan updated successfully'));
});

exports.togglePlanStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const plan = await FieldSubscriptionPlan.findByPk(id);
  if (!plan) throw new ApiError(404, 'Plan not found');

  if (!req.user) throw new ApiError(401, 'Not authorized');
  if (req.user.role === 'merchant') {
    const merchant = await getMerchantForUser(req);
    if (!merchant || Number(plan.merchant_id) !== Number(merchant.id)) {
      throw new ApiError(403, 'You can only update your own plans');
    }
  } else if (req.user.role !== 'superadmin') {
    throw new ApiError(403, 'Not allowed');
  }

  plan.is_active = !plan.is_active;
  await plan.save();

  res.status(200).json(new ApiResponse(200, { plan }, 'Plan status updated successfully'));
});
