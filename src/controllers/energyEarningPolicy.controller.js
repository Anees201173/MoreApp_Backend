const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

const { EnergyEarningPolicy } = require('../models');

const toNumber = (v) => {
  const n = Number.parseFloat(v);
  if (!Number.isFinite(n)) return null;
  return n;
};

const toPercent = (value, fieldName) => {
  const n = toNumber(value);
  if (n === null) throw new ApiError(400, `${fieldName} must be a number between 0 and 100`);
  if (n < 0 || n > 100) throw new ApiError(400, `${fieldName} must be between 0 and 100`);
  return n;
};

// @desc   List energy earning policies
// @route  GET /api/v1/dashboard/superadmin/energy-earning-policies?include_inactive=true
// @access Private (superadmin)
exports.listEnergyEarningPolicies = asyncHandler(async (req, res) => {
  const includeInactive = String(req.query?.include_inactive || '').toLowerCase() === 'true';
  const where = includeInactive ? {} : { is_active: true };

  const items = await EnergyEarningPolicy.findAll({
    where,
    order: [['id', 'ASC']],
    attributes: ['id', 'name', 'percent_ecommerce', 'percent_field_booking', 'percent_subscription', 'is_active', 'updatedAt'],
  });

  res.status(200).json(new ApiResponse(200, { items }, 'Energy earning policies retrieved successfully'));
});

// @desc   Create energy earning policy
// @route  POST /api/v1/dashboard/superadmin/energy-earning-policies
// @access Private (superadmin)
exports.createEnergyEarningPolicy = asyncHandler(async (req, res) => {
  const name = String(req.body?.name || '').trim();
  if (!name) throw new ApiError(400, 'name is required');

  const payload = {
    name,
    percent_ecommerce: toPercent(req.body?.percent_ecommerce ?? 0, 'percent_ecommerce'),
    percent_field_booking: toPercent(req.body?.percent_field_booking ?? 0, 'percent_field_booking'),
    percent_subscription: toPercent(req.body?.percent_subscription ?? 0, 'percent_subscription'),
    is_active: req.body?.is_active === undefined ? true : Boolean(req.body.is_active),
    created_by_user_id: req.user?.id || null,
    updated_by_user_id: req.user?.id || null,
  };

  const existing = await EnergyEarningPolicy.findOne({ where: { name } });
  if (existing) throw new ApiError(400, 'A policy with this name already exists');

  const created = await EnergyEarningPolicy.create(payload);

  res.status(201).json(new ApiResponse(201, { policy: created }, 'Energy earning policy created successfully'));
});

// @desc   Update energy earning policy
// @route  PUT /api/v1/dashboard/superadmin/energy-earning-policies/:id
// @access Private (superadmin)
exports.updateEnergyEarningPolicy = asyncHandler(async (req, res) => {
  const id = Number.parseInt(req.params?.id, 10);
  if (!Number.isFinite(id) || id <= 0) throw new ApiError(400, 'Invalid policy id');

  const policy = await EnergyEarningPolicy.findByPk(id);
  if (!policy) throw new ApiError(404, 'Policy not found');

  const name = req.body?.name === undefined ? undefined : String(req.body.name || '').trim();
  if (name !== undefined && !name) throw new ApiError(400, 'name cannot be empty');

  if (name !== undefined && name !== policy.name) {
    const existing = await EnergyEarningPolicy.findOne({ where: { name } });
    if (existing) throw new ApiError(400, 'A policy with this name already exists');
  }

  if (name !== undefined) policy.name = name;
  if (req.body?.percent_ecommerce !== undefined) {
    policy.percent_ecommerce = toPercent(req.body.percent_ecommerce, 'percent_ecommerce');
  }
  if (req.body?.percent_field_booking !== undefined) {
    policy.percent_field_booking = toPercent(req.body.percent_field_booking, 'percent_field_booking');
  }
  if (req.body?.percent_subscription !== undefined) {
    policy.percent_subscription = toPercent(req.body.percent_subscription, 'percent_subscription');
  }
  if (req.body?.is_active !== undefined) policy.is_active = Boolean(req.body.is_active);

  policy.updated_by_user_id = req.user?.id || null;
  if (!policy.created_by_user_id) policy.created_by_user_id = req.user?.id || null;

  await policy.save();

  res.status(200).json(new ApiResponse(200, { policy }, 'Energy earning policy updated successfully'));
});
