const { FieldSubscription, Field, User } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

// helper to add months
const addMonths = (date, months) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
};

// Create a monthly/quarterly/yearly subscription for a field
exports.createSubscription = asyncHandler(async (req, res) => {
  const { field_id, type = 'monthly', start_date } = req.body;

  if (!field_id) throw new ApiError(400, 'field_id is required');

  const field = await Field.findByPk(field_id);
  if (!field) throw new ApiError(404, 'Field not found');

  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, 'User not authenticated');

  const start = start_date || new Date().toISOString().slice(0, 10);
  let monthsToAdd = 1;
  if (type === 'quarterly') monthsToAdd = 3;
  if (type === 'yearly') monthsToAdd = 12;
  const end = addMonths(start, monthsToAdd);

  const subscription = await FieldSubscription.create({
    field_id,
    user_id: userId,
    type,
    start_date: start,
    end_date: end,
  });

  res.status(201).json(new ApiResponse(201, { subscription }, 'Subscription created successfully'));
});

// Get subscriptions for a specific field
exports.getFieldSubscriptions = asyncHandler(async (req, res) => {
  const { field_id, status } = req.query;
  if (!field_id) throw new ApiError(400, 'field_id query param is required');

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
