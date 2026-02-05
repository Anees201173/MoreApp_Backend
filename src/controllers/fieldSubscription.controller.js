const { FieldSubscription, Field, User, FieldSubscriptionPlan } = require('../models');
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
  // Validate actual date
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

// Adds calendar months to a DATEONLY string, clamping to month-end when needed.
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

// Create a monthly/quarterly/yearly subscription for a field.
// If the user already has an active subscription for the field, the new subscription starts
// the day after the latest end_date to avoid overlap (clean renewal / extension flow).
exports.createSubscription = asyncHandler(async (req, res) => {
  const { field_id, type = 'monthly', start_date } = req.body;

  if (!field_id) throw new ApiError(400, 'field_id is required');

  const field = await Field.findByPk(field_id);
  if (!field) throw new ApiError(404, 'Field not found');

  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, 'User not authenticated');

  const normalizedType = normalizeSubscriptionType(type);
  const requestedStart = parseDateOnlyOrThrow(start_date, 'start_date');
  const today = toDateOnlyString(new Date());

  // Attach plan pricing if merchant has defined one for this field+type
  const plan = await FieldSubscriptionPlan.findOne({
    where: {
      field_id,
      type: normalizedType,
      is_active: true,
      visibility: 'public',
    },
    order: [['id', 'DESC']],
  });

  // Keep DB statuses consistent (auto-expire past subscriptions)
  await FieldSubscription.update(
    { status: 'expired' },
    {
      where: {
        field_id,
        user_id: userId,
        status: 'active',
        end_date: { [Op.lt]: today },
      },
    }
  );

  const latestActive = await FieldSubscription.findOne({
    where: {
      field_id,
      user_id: userId,
      status: 'active',
    },
    order: [['end_date', 'DESC']],
  });

  // If user renews while still active, auto-extend starting after current end.
  const start = latestActive
    ? addDaysDateOnly(String(latestActive.end_date), 1)
    : (requestedStart || today);

  let monthsToAdd = 1;
  if (normalizedType === 'quarterly') monthsToAdd = 3;
  if (normalizedType === 'yearly') monthsToAdd = 12;

  const end = addMonthsDateOnly(start, monthsToAdd);

  const subscription = await FieldSubscription.create({
    field_id,
    user_id: userId,
    type: normalizedType,
    plan_id: plan ? plan.id : null,
    price: plan ? plan.price : null,
    currency: plan ? plan.currency : 'SAR',
    start_date: start,
    end_date: end,
  });

  res.status(201).json(new ApiResponse(201, { subscription }, 'Subscription created successfully'));
});

// Get subscriptions for the authenticated user
exports.getMyFieldSubscriptions = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, 'User not authenticated');

  const today = toDateOnlyString(new Date());
  await FieldSubscription.update(
    { status: 'expired' },
    {
      where: {
        user_id: userId,
        status: 'active',
        end_date: { [Op.lt]: today },
      },
    }
  );

  const where = { user_id: userId };
  if (status) where.status = status;

  const items = await FieldSubscription.findAll({
    where,
    order: [['start_date', 'DESC']],
    include: [{ model: Field, as: 'field', attributes: ['id', 'title', 'address', 'city'] }],
  });

  res
    .status(200)
    .json(new ApiResponse(200, { items }, 'My field subscriptions retrieved successfully'));
});

// Cancel a subscription (owner-only)
exports.cancelSubscription = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, 'User not authenticated');

  const subscription = await FieldSubscription.findByPk(id);
  if (!subscription) throw new ApiError(404, 'Subscription not found');
  if (Number(subscription.user_id) !== Number(userId)) {
    throw new ApiError(403, 'Not allowed to cancel this subscription');
  }
  if (subscription.status !== 'active') {
    throw new ApiError(400, `Cannot cancel a ${subscription.status} subscription`);
  }

  subscription.status = 'cancelled';
  await subscription.save();

  res
    .status(200)
    .json(new ApiResponse(200, { subscription }, 'Subscription cancelled successfully'));
});

// Get subscriptions for a specific field
exports.getFieldSubscriptions = asyncHandler(async (req, res) => {
  const { field_id, status } = req.query;
  if (!field_id) throw new ApiError(400, 'field_id query param is required');

  const today = toDateOnlyString(new Date());
  await FieldSubscription.update(
    { status: 'expired' },
    {
      where: {
        field_id,
        status: 'active',
        end_date: { [Op.lt]: today },
      },
    }
  );

  const where = { field_id };
  if (status) where.status = status;

  const items = await FieldSubscription.findAll({
    where,
    order: [['start_date', 'DESC']],
    include: [
      { model: Field, as: 'field', attributes: ['id', 'title', 'address', 'city'] },
      { model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone'] },
    ],
  });

  res.status(200).json(new ApiResponse(200, { items }, 'Field subscriptions retrieved successfully'));
});

// Helper to compute basic subscription stats for admin
const computeAdminSubscriptionStats = (items) => {
  const now = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(now.getDate() - 30);

  const toDate = (d) => {
    if (!d) return null;
    const dt = new Date(d);
    return Number.isNaN(dt.getTime()) ? null : dt;
  };

  let totalRevenue = 0;
  let activeCount = 0;
  let expiredCount = 0;
  let renewalsLast30Days = 0;

  for (const sub of items) {
    if (sub.price) {
      const num = Number(sub.price);
      if (Number.isFinite(num)) totalRevenue += num;
    }

    if (sub.status === 'active') {
      activeCount += 1;
    }
    if (sub.status === 'expired') {
      expiredCount += 1;
    }

    const startDate = toDate(sub.start_date || sub.createdAt);
    if (startDate && startDate >= thirtyDaysAgo && sub.status === 'active') {
      renewalsLast30Days += 1;
    }
  }

  return {
    totalRevenue,
    activeCount,
    expiredCount,
    renewalsLast30Days,
  };
};

// Get all field subscriptions for superadmin (global view)
exports.getAdminSubscriptions = asyncHandler(async (req, res) => {
  const { status, type } = req.query;

  const where = {};
  if (status) where.status = status;
  if (type) where.type = normalizeSubscriptionType(type);

  const items = await FieldSubscription.findAll({
    where,
    order: [['start_date', 'DESC']],
    include: [
      { model: Field, as: 'field', attributes: ['id', 'title', 'address', 'city'] },
      { model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone'] },
      { model: FieldSubscriptionPlan, as: 'plan', attributes: ['id', 'title', 'type', 'price', 'currency', 'is_active'] },
    ],
  });

  const stats = computeAdminSubscriptionStats(items);

  res
    .status(200)
    .json(new ApiResponse(200, { items, stats }, 'All field subscriptions retrieved successfully'));
});
