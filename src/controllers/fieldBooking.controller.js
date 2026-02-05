const { FieldBooking, Field, User, FieldAvailability, FieldClosure, Merchant, Company, sequelize } = require('../models');
const { Op } = require('sequelize');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

const isMissingTableError = (err, tableName) => {
  const msg = String(err?.original?.message || err?.message || '');
  const code = err?.original?.code;
  if (code === '42P01' && msg.toLowerCase().includes(String(tableName).toLowerCase())) return true;
  if (/does not exist|undefined_table|relation .* does not exist/i.test(msg) && msg.toLowerCase().includes(String(tableName).toLowerCase())) {
    return true;
  }
  return false;
};

const ensureMerchantOwnsField = async (req, fieldId, transaction) => {
  if (!req.user || !req.user.role) {
    throw new ApiError(401, 'User not authenticated');
  }

  if (req.user.role === 'superadmin') {
    const field = await Field.findByPk(fieldId, { transaction });
    if (!field) throw new ApiError(404, 'Field not found');
    return { field, merchant: null };
  }

  if (req.user.role !== 'merchant') {
    throw new ApiError(403, 'Only merchants can manage bookings');
  }

  const merchant = await Merchant.findOne({ where: { user_id: req.user.id }, transaction });
  if (!merchant) throw new ApiError(404, 'Merchant profile not found for current user');

  const field = await Field.findByPk(fieldId, { transaction });
  if (!field) throw new ApiError(404, 'Field not found');

  if (field.merchant_id !== merchant.id) {
    throw new ApiError(403, 'You are not allowed to manage bookings for this field');
  }

  return { field, merchant };
};

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

// Resolve company context for bookings
const resolveCompanyIdForBookings = async (req) => {
  if (!req.user || !req.user.role) {
    throw new ApiError(401, 'User not authenticated');
  }

  // companyadmin → company where admin_id = user.id
  if (req.user.role === 'companyadmin') {
    const company = await Company.findOne({ where: { admin_id: req.user.id } });
    if (!company) {
      throw new ApiError(404, 'Company not found for this admin');
    }
    return company.id;
  }

  // employee user with company_id
  if (req.user.role === 'user' && req.user.company_id) {
    return req.user.company_id;
  }

  // superadmin can specify company_id explicitly
  if (req.user.role === 'superadmin' && req.query.company_id) {
    return req.query.company_id;
  }

  throw new ApiError(400, 'Company context is required to view bookings');
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

    // Block specific closed dates (if closures feature is enabled)
    try {
      const closure = await FieldClosure.findOne({ where: { field_id, date: booking_date }, transaction: t });
      if (closure) {
        throw new ApiError(400, `Field is closed on ${booking_date}${closure.reason ? `: ${closure.reason}` : ''}`);
      }
    } catch (err) {
      // If the table isn't migrated yet, ignore closures.
      if (!isMissingTableError(err, 'field_closures')) throw err;
    }

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

// PATCH /api/v1/field-bookings/:id/status
// Body: { status: 'completed' | 'cancelled' | 'confirmed' | 'pending' }
exports.updateBookingStatus = asyncHandler(async (req, res) => {
  const bookingId = Number(req.params.id);
  if (!Number.isFinite(bookingId)) throw new ApiError(400, 'Booking id must be a number');

  const status = typeof req.body?.status === 'string' ? req.body.status.trim() : '';
  const allowed = new Set(['pending', 'confirmed', 'cancelled', 'completed']);
  if (!allowed.has(status)) {
    throw new ApiError(400, 'status must be one of: pending, confirmed, cancelled, completed');
  }

  const updated = await sequelize.transaction(async (t) => {
    const booking = await FieldBooking.findByPk(bookingId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!booking) throw new ApiError(404, 'Booking not found');

    await ensureMerchantOwnsField(req, booking.field_id, t);

    // Basic transition guard: don't change a cancelled booking to completed
    if (booking.status === 'cancelled' && status !== 'cancelled') {
      throw new ApiError(400, 'Cancelled bookings cannot be updated');
    }

    booking.status = status;
    await booking.save({ transaction: t });
    return booking;
  });

  res.status(200).json(new ApiResponse(200, { booking: updated }, 'Booking status updated'));
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

// Helper to compute basic booking stats
const computeBookingStats = (items) => {
  const now = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(now.getDate() - 30);

  const toDate = (d) => {
    if (!d) return null;
    const dt = new Date(d);
    return Number.isNaN(dt.getTime()) ? null : dt;
  };

  let totalBookings = 0;
  let monthlyBookings = 0;
  let successfulBookings = 0;
  let cancelledBookings = 0;

  for (const b of items) {
    totalBookings += 1;
    const bookingDate = toDate(b.booking_date || b.createdAt);
    if (bookingDate && bookingDate >= thirtyDaysAgo) {
      monthlyBookings += 1;
    }
    if (b.status === 'cancelled') {
      cancelledBookings += 1;
    }
    if (b.status === 'confirmed' || b.status === 'completed') {
      successfulBookings += 1;
    }
  }

  return {
    totalBookings,
    monthlyBookings,
    successfulBookings,
    cancelledBookings,
  };
};

// Get bookings for a company (via companyadmin / employee / superadmin with company_id)
exports.getCompanyBookings = asyncHandler(async (req, res) => {
  const companyId = await resolveCompanyIdForBookings(req);
  const { status } = req.query;

  const where = {};
  if (status) where.status = status;

  const items = await FieldBooking.findAll({
    where,
    order: [
      ['booking_date', 'DESC'],
      ['start_time', 'DESC'],
    ],
    include: [
      { model: Field, as: 'field', attributes: ['id', 'title', 'address', 'city'] },
      {
        model: User,
        as: 'user',
        required: true,
        attributes: ['id', 'name', 'email', 'phone', 'company_id'],
        where: { company_id: companyId },
      },
    ],
  });

  const stats = computeBookingStats(items);

  res
    .status(200)
    .json(new ApiResponse(200, { items, stats }, 'Company bookings retrieved successfully'));
});

// Get all bookings for superadmin (global view)
exports.getAdminBookings = asyncHandler(async (req, res) => {
  const { status } = req.query;

  const where = {};
  if (status) where.status = status;

  const items = await FieldBooking.findAll({
    where,
    order: [
      ['booking_date', 'DESC'],
      ['start_time', 'DESC'],
    ],
    include: [
      { model: Field, as: 'field', attributes: ['id', 'title', 'address', 'city'] },
      {
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email', 'phone', 'company_id'],
      },
    ],
  });

  const stats = computeBookingStats(items);

  res
    .status(200)
    .json(new ApiResponse(200, { items, stats }, 'All bookings retrieved successfully'));
});
