const { FieldBooking, Field, User, FieldAvailability, sequelize } = require('../models');
const { Op } = require('sequelize');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

const parseTimeToMinutes = (t) => {
  if (typeof t !== 'string') return null;
  const trimmed = t.trim();
  const m = trimmed.match(/^([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);
  if (!m) return null;
  const hours = parseInt(m[1], 10);
  const minutes = parseInt(m[2], 10);
  return hours * 60 + minutes;
};

const getDayOfWeek = (dateStr) => {
  const d = new Date(`${dateStr}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d.getUTCDay();
};

// Create a booking for a field on specific day & time
exports.createBooking = asyncHandler(async (req, res) => {
  const { field_id, booking_date, start_time, end_time, total_price } = req.body;

  if (!field_id || !booking_date || !start_time || !end_time) {
    throw new ApiError(400, 'field_id, booking_date, start_time and end_time are required');
  }

  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, 'User not authenticated');

  const startMin = parseTimeToMinutes(String(start_time));
  const endMin = parseTimeToMinutes(String(end_time));
  if (startMin === null || endMin === null) {
    throw new ApiError(400, 'start_time and end_time must be in HH:mm format');
  }
  if (endMin <= startMin) {
    throw new ApiError(400, 'end_time must be after start_time');
  }

  const dayOfWeek = getDayOfWeek(String(booking_date));
  if (dayOfWeek === null) {
    throw new ApiError(400, 'booking_date must be YYYY-MM-DD');
  }

  const booking = await sequelize.transaction(async (t) => {
    // Lock the field row so two bookings can't be created at the same time for the same field
    const field = await Field.findByPk(field_id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!field) throw new ApiError(404, 'Field not found');

    // Validate requested time is within weekly availability for that day
    const windows = await FieldAvailability.findAll({
      where: {
        field_id,
        day_of_week: dayOfWeek,
        is_active: true,
      },
      transaction: t,
    });

    if (!windows.length) {
      throw new ApiError(400, 'Field is not available on this day');
    }

    const fitsWindow = windows.some((w) => {
      const wStart = parseTimeToMinutes(String(w.start_time));
      const wEnd = parseTimeToMinutes(String(w.end_time));
      if (wStart === null || wEnd === null) return false;
      return startMin >= wStart && endMin <= wEnd;
    });

    if (!fitsWindow) {
      throw new ApiError(400, 'Selected time is outside field opening hours');
    }

    // Prevent overlapping bookings (pending/confirmed block)
    const conflict = await FieldBooking.findOne({
      where: {
        field_id,
        booking_date,
        status: { [Op.in]: ['pending', 'confirmed'] },
        start_time: { [Op.lt]: end_time },
        end_time: { [Op.gt]: start_time },
      },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (conflict) {
      throw new ApiError(409, 'This slot is already booked');
    }

    // Optional price calculation fallback
    let finalPrice = total_price || null;
    if (finalPrice === null && field.price_per_hour !== null && field.price_per_hour !== undefined) {
      const hours = (endMin - startMin) / 60;
      finalPrice = (Number(field.price_per_hour) * hours).toFixed(2);
    }

    return FieldBooking.create(
      {
        field_id,
        user_id: userId,
        booking_date,
        start_time,
        end_time,
        total_price: finalPrice,
      },
      { transaction: t }
    );
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
