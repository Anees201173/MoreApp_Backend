const { FieldBooking, Field, User } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

// Create a booking for a field on specific day & time
exports.createBooking = asyncHandler(async (req, res) => {
  const { field_id, booking_date, start_time, end_time, total_price } = req.body;

  if (!field_id || !booking_date || !start_time || !end_time) {
    throw new ApiError(400, 'field_id, booking_date, start_time and end_time are required');
  }

  const field = await Field.findByPk(field_id);
  if (!field) throw new ApiError(404, 'Field not found');

  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, 'User not authenticated');

  const booking = await FieldBooking.create({
    field_id,
    user_id: userId,
    booking_date,
    start_time,
    end_time,
    total_price: total_price || null,
  });

  res.status(201).json(new ApiResponse(201, { booking }, 'Booking created successfully'));
});

// Get bookings for a specific field (optionally by status)
exports.getFieldBookings = asyncHandler(async (req, res) => {
  const { field_id, status } = req.query;
  if (!field_id) throw new ApiError(400, 'field_id query param is required');

  const where = { field_id };
  if (status) where.status = status;

  const items = await FieldBooking.findAll({
    where,
    order: [
      ['booking_date', 'DESC'],
      ['start_time', 'DESC'],
    ],
    include: [
      { model: Field, as: 'field', attributes: ['id', 'title', 'address', 'city'] },
      { model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone'] },
    ],
  });

  res.status(200).json(new ApiResponse(200, { items }, 'Field bookings retrieved successfully'));
});
