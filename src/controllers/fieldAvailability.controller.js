const { Field, Merchant, FieldAvailability, FieldClosure, FieldBooking, FieldCategory } = require('../models');
const { Op } = require('sequelize');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

const isMissingTableError = (err, tableName) => {
  const msg = String(err?.original?.message || err?.message || '');
  const code = err?.original?.code;
  // Postgres: 42P01 = undefined_table
  if (code === '42P01' && msg.toLowerCase().includes(String(tableName).toLowerCase())) return true;
  if (/does not exist|undefined_table|relation .* does not exist/i.test(msg) && msg.toLowerCase().includes(String(tableName).toLowerCase())) {
    return true;
  }
  return false;
};

const parseISODateOnlyToUTC = (dateStr) => {
  if (typeof dateStr !== 'string') return null;
  const m = dateStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const year = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  const day = parseInt(m[3], 10);
  const d = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(d.getTime())) return null;
  return d;
};

const formatUTCDateOnly = (dateObj) => {
  return new Date(dateObj.getTime()).toISOString().slice(0, 10);
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
  const startDateRaw = req.query.start_date ?? req.query.week_start;

  const slotMinutesRaw = req.query.slot_minutes;
  const slotMinutesParsed = slotMinutesRaw !== undefined ? parseInt(String(slotMinutesRaw), 10) : 60;
  const slotMinutes = Number.isFinite(slotMinutesParsed) && slotMinutesParsed > 0 ? slotMinutesParsed : 60;

  // Range / week view (Mon/Tue/...)
  if (startDateRaw) {
    const startDateUTC = parseISODateOnlyToUTC(String(startDateRaw));
    if (!startDateUTC) throw new ApiError(400, 'start_date/week_start must be YYYY-MM-DD');

    const daysRaw = req.query.days;
    const daysParsed = daysRaw !== undefined ? parseInt(String(daysRaw), 10) : 7;
    const days = Number.isFinite(daysParsed) && daysParsed > 0 ? Math.min(daysParsed, 31) : 7;

    const hideClosed = String(req.query.hide_closed ?? '').toLowerCase();
    const shouldHideClosed = hideClosed === '1' || hideClosed === 'true' || hideClosed === 'yes';

    const startStr = formatUTCDateOnly(startDateUTC);
    const endDateUTC = new Date(startDateUTC.getTime() + (days - 1) * 24 * 60 * 60 * 1000);
    const endStr = formatUTCDateOnly(endDateUTC);

    const [availRows, bookingRows, closureRows] = await Promise.all([
      FieldAvailability.findAll({
        where: { field_id: fieldId, is_active: true },
        order: [['day_of_week', 'ASC'], ['start_time', 'ASC']],
      }),
      FieldBooking.findAll({
        where: {
          field_id: fieldId,
          booking_date: { [Op.between]: [startStr, endStr] },
          status: { [Op.in]: ['pending', 'confirmed'] },
        },
        order: [['booking_date', 'ASC'], ['start_time', 'ASC']],
      }),
      (async () => {
        try {
          return await FieldClosure.findAll({
            where: {
              field_id: fieldId,
              date: { [Op.between]: [startStr, endStr] },
            },
          });
        } catch (err) {
          if (isMissingTableError(err, 'field_closures')) return [];
          throw err;
        }
      })(),
    ]);

    const availByDay = new Map();
    for (const a of availRows) {
      const d = Number(a.day_of_week);
      if (!availByDay.has(d)) availByDay.set(d, []);
      availByDay.get(d).push(a);
    }

    const bookingsByDate = new Map();
    for (const b of bookingRows) {
      const dateKey = String(b.booking_date);
      if (!bookingsByDate.has(dateKey)) bookingsByDate.set(dateKey, []);
      bookingsByDate.get(dateKey).push(b);
    }

    const closureByDate = new Map();
    for (const c of closureRows) {
      closureByDate.set(String(c.date), c);
    }

    const items = [];
    for (let i = 0; i < days; i += 1) {
      const currentUTC = new Date(startDateUTC.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = formatUTCDateOnly(currentUTC);
      const dayOfWeek = getDayOfWeek(dateStr);

      const closure = closureByDate.get(dateStr) || null;
      const dayAvail = availByDay.get(dayOfWeek) || [];

      const isClosed = Boolean(closure) || dayAvail.length === 0;
      const reason = closure ? (closure.reason || null) : null;

      if (shouldHideClosed && isClosed) continue;

      const dayBookings = bookingsByDate.get(dateStr) || [];
      const bookedRanges = dayBookings
        .map((b) => ({
          start: parseTimeToMinutes(String(b.start_time)),
          end: parseTimeToMinutes(String(b.end_time)),
        }))
        .filter((r) => r.start !== null && r.end !== null);

      const slots = [];
      if (!isClosed) {
        for (const a of dayAvail) {
          const startMin = parseTimeToMinutes(String(a.start_time));
          const endMin = parseTimeToMinutes(String(a.end_time));
          if (startMin === null || endMin === null) continue;

          for (let t = startMin; t + slotMinutes <= endMin; t += slotMinutes) {
            const slotStart = t;
            const slotEnd = t + slotMinutes;
            const booked = bookedRanges.some((r) => slotStart < r.end && slotEnd > r.start);
            slots.push({
              start_time: minutesToTime(slotStart),
              end_time: minutesToTime(slotEnd),
              booked,
            });
          }
        }
      }

      items.push({
        date: dateStr,
        day_of_week: dayOfWeek,
        is_closed: isClosed,
        reason,
        slots,
      });
    }

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          {
            start_date: startStr,
            days,
            slot_minutes: slotMinutes,
            items,
          },
          'Field slots retrieved'
        )
      );
    return;
  }

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

  let closure = null;
  try {
    closure = await FieldClosure.findOne({ where: { field_id: fieldId, date: String(date) } });
  } catch (err) {
    if (!isMissingTableError(err, 'field_closures')) throw err;
  }

  const avail = await FieldAvailability.findAll({
    where: {
      field_id: fieldId,
      day_of_week: dayOfWeek,
      is_active: true,
    },
    order: [['start_time', 'ASC']],
  });

  const isClosed = Boolean(closure) || avail.length === 0;
  const reason = closure ? (closure.reason || null) : null;

  if (isClosed) {
    res.status(200).json(
      new ApiResponse(
        200,
        {
          date,
          day_of_week: dayOfWeek,
          slot_minutes: slotMinutes,
          is_closed: true,
          reason,
          slots: [],
        },
        'Field slots retrieved'
      )
    );
    return;
  }

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
    new ApiResponse(
      200,
      { date, day_of_week: dayOfWeek, slot_minutes: slotMinutes, is_closed: false, reason: null, slots },
      'Field slots retrieved'
    )
  );
});

// =======================================================
// Field closures (specific dates)
// =======================================================

// GET /api/v1/fields/:id/closures?from=YYYY-MM-DD&to=YYYY-MM-DD
exports.getFieldClosures = asyncHandler(async (req, res) => {
  const fieldId = Number(req.params.id);
  if (!Number.isFinite(fieldId)) throw new ApiError(400, 'Field id must be a number');

  const fromRaw = req.query.from;
  const toRaw = req.query.to;

  const where = { field_id: fieldId };
  if (fromRaw || toRaw) {
    const fromDate = fromRaw ? parseISODateOnlyToUTC(String(fromRaw)) : null;
    const toDate = toRaw ? parseISODateOnlyToUTC(String(toRaw)) : null;
    if (fromRaw && !fromDate) throw new ApiError(400, 'from must be YYYY-MM-DD');
    if (toRaw && !toDate) throw new ApiError(400, 'to must be YYYY-MM-DD');

    const fromStr = fromDate ? formatUTCDateOnly(fromDate) : '0001-01-01';
    const toStr = toDate ? formatUTCDateOnly(toDate) : '9999-12-31';
    where.date = { [Op.between]: [fromStr, toStr] };
  }

  let items = [];
  try {
    items = await FieldClosure.findAll({
      where,
      order: [['date', 'ASC']],
    });
  } catch (err) {
    // If migration hasn't been run yet, don't break the UI.
    if (!isMissingTableError(err, 'field_closures')) throw err;
    items = [];
  }

  res.status(200).json(new ApiResponse(200, { items }, 'Field closures retrieved'));
});

// POST /api/v1/fields/:id/closures
// Body: { date: 'YYYY-MM-DD', reason?: string }
exports.addFieldClosure = asyncHandler(async (req, res) => {
  const fieldId = Number(req.params.id);
  if (!Number.isFinite(fieldId)) throw new ApiError(400, 'Field id must be a number');

  await ensureMerchantOwnsField(req, fieldId);

  const dateRaw = req.body?.date;
  const reasonRaw = req.body?.reason;

  const dateUTC = parseISODateOnlyToUTC(String(dateRaw ?? ''));
  if (!dateUTC) throw new ApiError(400, 'date must be YYYY-MM-DD');
  const dateStr = formatUTCDateOnly(dateUTC);

  const reason = typeof reasonRaw === 'string' ? reasonRaw.trim() : null;

  let item;
  try {
    item = await FieldClosure.create({
      field_id: fieldId,
      date: dateStr,
      reason,
    });
  } catch (err) {
    if (isMissingTableError(err, 'field_closures')) {
      throw new ApiError(503, 'Closures feature is not enabled yet. Run migrations to create field_closures table.');
    }
    throw err;
  }

  res.status(201).json(new ApiResponse(201, { item }, 'Field closure added'));
});

// DELETE /api/v1/fields/:id/closures/:date
exports.deleteFieldClosure = asyncHandler(async (req, res) => {
  const fieldId = Number(req.params.id);
  if (!Number.isFinite(fieldId)) throw new ApiError(400, 'Field id must be a number');

  await ensureMerchantOwnsField(req, fieldId);

  const dateParam = String(req.params.date || '');
  const dateUTC = parseISODateOnlyToUTC(dateParam);
  if (!dateUTC) throw new ApiError(400, 'date must be YYYY-MM-DD');
  const dateStr = formatUTCDateOnly(dateUTC);

  let deleted;
  try {
    deleted = await FieldClosure.destroy({ where: { field_id: fieldId, date: dateStr } });
  } catch (err) {
    if (isMissingTableError(err, 'field_closures')) {
      throw new ApiError(503, 'Closures feature is not enabled yet. Run migrations to create field_closures table.');
    }
    throw err;
  }
  if (!deleted) throw new ApiError(404, 'Closure not found for that date');

  res.status(200).json(new ApiResponse(200, null, 'Field closure removed'));
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
