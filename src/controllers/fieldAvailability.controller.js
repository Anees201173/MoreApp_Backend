const { Field, Merchant, FieldAvailability, FieldBooking, FieldCategory } = require('../models');
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

const minutesToTime = (mins) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const getDayOfWeek = (dateStr) => {
  // dateStr YYYY-MM-DD
  const d = new Date(`${dateStr}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d.getUTCDay(); // 0..6
};

const ensureMerchantOwnsField = async (req, fieldId) => {
  if (!req.user || req.user.role !== 'merchant') {
    throw new ApiError(403, 'Only merchants can manage field availability');
  }

  const merchant = await Merchant.findOne({ where: { user_id: req.user.id } });
  if (!merchant) throw new ApiError(404, 'Merchant profile not found for current user');

  const field = await Field.findByPk(fieldId);
  if (!field) throw new ApiError(404, 'Field not found');

  if (field.merchant_id !== merchant.id) {
    throw new ApiError(403, 'You are not allowed to manage this field');
  }

  return { field, merchant };
};

// GET weekly availability (or slots for a specific date)
// GET /api/v1/fields/:id/availability
// Query:
//  - date=YYYY-MM-DD (optional) => returns slots for that date
//  - slot_minutes=30|60|90... (optional, default 60)
exports.getFieldAvailability = asyncHandler(async (req, res) => {
  const fieldId = Number(req.params.id);
  if (!Number.isFinite(fieldId)) throw new ApiError(400, 'Field id must be a number');

  const { date } = req.query;

  // If no date, return weekly schedule
  if (!date) {
    const items = await FieldAvailability.findAll({
      where: { field_id: fieldId, is_active: true },
      order: [['day_of_week', 'ASC'], ['start_time', 'ASC']],
    });

    res.status(200).json(new ApiResponse(200, { items }, 'Field availability retrieved'));
    return;
  }

  const dayOfWeek = getDayOfWeek(String(date));
  if (dayOfWeek === null) throw new ApiError(400, 'date must be YYYY-MM-DD');

  const slotMinutesRaw = req.query.slot_minutes;
  const slotMinutesParsed = slotMinutesRaw !== undefined ? parseInt(String(slotMinutesRaw), 10) : 60;
  const slotMinutes = Number.isFinite(slotMinutesParsed) && slotMinutesParsed > 0 ? slotMinutesParsed : 60;

  const avail = await FieldAvailability.findAll({
    where: {
      field_id: fieldId,
      day_of_week: dayOfWeek,
      is_active: true,
    },
    order: [['start_time', 'ASC']],
  });

  const bookings = await FieldBooking.findAll({
    where: {
      field_id: fieldId,
      booking_date: date,
      status: { [Op.in]: ['pending', 'confirmed'] },
    },
    order: [['start_time', 'ASC']],
  });

  const bookedRanges = bookings
    .map((b) => ({
      start: parseTimeToMinutes(String(b.start_time)),
      end: parseTimeToMinutes(String(b.end_time)),
    }))
    .filter((r) => r.start !== null && r.end !== null);

  const slots = [];
  for (const a of avail) {
    const startMin = parseTimeToMinutes(String(a.start_time));
    const endMin = parseTimeToMinutes(String(a.end_time));
    if (startMin === null || endMin === null) continue;

    for (let t = startMin; t + slotMinutes <= endMin; t += slotMinutes) {
      const slotStart = t;
      const slotEnd = t + slotMinutes;
      const isBooked = bookedRanges.some((r) => slotStart < r.end && slotEnd > r.start);

      slots.push({
        start_time: minutesToTime(slotStart),
        end_time: minutesToTime(slotEnd),
        booked: isBooked,
      });
    }
  }

  res.status(200).json(
    new ApiResponse(200, { date, day_of_week: dayOfWeek, slot_minutes: slotMinutes, slots }, 'Field slots retrieved')
  );
});

// PUT replace weekly availability
// PUT /api/v1/fields/:id/availability
// Body: { availability: [{ day_of_week: 0..6, start_time:'HH:mm', end_time:'HH:mm' }, ...] }
exports.setFieldAvailability = asyncHandler(async (req, res) => {
  const fieldId = Number(req.params.id);
  if (!Number.isFinite(fieldId)) throw new ApiError(400, 'Field id must be a number');

  await ensureMerchantOwnsField(req, fieldId);

  const availability = req.body.availability;
  if (!Array.isArray(availability)) {
    throw new ApiError(400, 'availability must be an array');
  }

  const rows = availability.map((a) => {
    const day = parseInt(String(a.day_of_week), 10);
    const start = typeof a.start_time === 'string' ? a.start_time.trim() : null;
    const end = typeof a.end_time === 'string' ? a.end_time.trim() : null;

    if (!Number.isFinite(day) || day < 0 || day > 6) {
      throw new ApiError(400, 'day_of_week must be between 0 and 6');
    }

    const startMin = parseTimeToMinutes(start);
    const endMin = parseTimeToMinutes(end);
    if (startMin === null || endMin === null) {
      throw new ApiError(400, 'start_time/end_time must be in HH:mm format');
    }

    if (endMin <= startMin) {
      throw new ApiError(400, 'end_time must be after start_time');
    }

    return {
      field_id: fieldId,
      day_of_week: day,
      start_time: start,
      end_time: end,
      is_active: true,
    };
  });

  // Replace schedule
  await FieldAvailability.destroy({ where: { field_id: fieldId } });
  const created = await FieldAvailability.bulkCreate(rows);

  res.status(200).json(new ApiResponse(200, { items: created }, 'Field availability updated'));
});
