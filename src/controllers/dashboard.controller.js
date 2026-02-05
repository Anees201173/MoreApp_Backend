const { Op } = require('sequelize');
const { Merchant, Store, Product, Field, FieldBooking, User, Order } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

const DATE_MS = 24 * 60 * 60 * 1000;

const toDateOnly = (date) => {
  const d = new Date(date);
  return d.toISOString().slice(0, 10);
};

const addDays = (date, days) => new Date(date.getTime() + days * DATE_MS);

const monthKey = (date) => {
  const d = new Date(date);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

const monthName = (monthKeyStr) => {
  const [y, m] = monthKeyStr.split('-').map((x) => Number(x));
  const d = new Date(Date.UTC(y, m - 1, 1));
  return d.toLocaleString('en-US', { month: 'short' });
};

const resolveRange = (rangeRaw) => {
  const range = String(rangeRaw || 'month').toLowerCase();
  const now = new Date();

  if (range === 'year') {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));
    const end = now;
    return { range: 'year', start, end };
  }

  const days = range === 'day' ? 1 : range === 'week' ? 7 : 30;
  const start = addDays(now, -(days - 1));
  const end = now;
  return { range: days === 1 ? 'day' : days === 7 ? 'week' : 'month', start, end };
};

const buildBuckets = ({ range, start, end }) => {
  if (range === 'year') {
    const buckets = [];
    const s = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
    for (let i = 0; i < 12; i++) {
      const d = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth() + i, 1));
      const key = monthKey(d);
      buckets.push({ key, name: monthName(key) });
    }
    return buckets;
  }

  const buckets = [];
  const startDay = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const endDay = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));

  for (let d = startDay; d <= endDay; d = addDays(d, 1)) {
    const key = toDateOnly(d);
    const name = `${d.getUTCDate()}`; // compact label for chart
    buckets.push({ key, name });
  }

  return buckets;
};

const sumDecimal = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const normalizeStatus = (s) => String(s || '').trim().toLowerCase();
const isRevenueStatus = (s) => {
  const v = normalizeStatus(s);
  return v === 'confirmed' || v === 'completed';
};

// shared builder for merchant dashboard (merchant-scoped or admin-scoped)
const buildMerchantDashboardPayload = async ({ merchant, range }) => {
  const currentRange = resolveRange(range);
  const buckets = buildBuckets(currentRange);

  // Previous period (same length) for change calculations
  const prevEnd = addDays(currentRange.start, -1);
  const prevStart =
    currentRange.range === 'year'
      ? new Date(Date.UTC(prevEnd.getUTCFullYear(), prevEnd.getUTCMonth() - 11, 1))
      : addDays(currentRange.start, -(buckets.length));

  const startStr = toDateOnly(currentRange.start);
  const endStr = toDateOnly(currentRange.end);
  const prevStartStr = toDateOnly(prevStart);
  const prevEndStr = toDateOnly(prevEnd);

  const bookingWhere = {
    booking_date: { [Op.between]: [startStr, endStr] },
  };

  const prevBookingWhere = {
    booking_date: { [Op.between]: [prevStartStr, prevEndStr] },
  };

  const bookingInclude = [
    {
      model: Field,
      as: 'field',
      required: true,
      where: { merchant_id: merchant.id },
      attributes: ['id', 'sports'],
    },
  ];

  const [
    storesCount,
    productsCount,
    activeProductsCount,
    fieldsCount,
    bookings,
    prevBookings,
  ] = await Promise.all([
    Store.count({ where: { merchant_id: merchant.id } }),
    Product.count({ where: { merchant_id: merchant.id } }),
    Product.count({ where: { merchant_id: merchant.id, status: true } }),
    Field.count({ where: { merchant_id: merchant.id } }),
    FieldBooking.findAll({
      where: bookingWhere,
      include: bookingInclude,
      attributes: ['booking_date', 'status', 'total_price'],
      order: [['booking_date', 'ASC']],
    }),
    FieldBooking.findAll({
      where: prevBookingWhere,
      include: bookingInclude,
      attributes: ['booking_date', 'status', 'total_price'],
      order: [['booking_date', 'ASC']],
    }),
  ]);

  const bucketIndex = new Map(buckets.map((b, i) => [b.key, i]));

  const revenueSeries = buckets.map((b) => ({ name: b.name, revenue: 0, profit: 0 }));
  const bookingsByStatus = { total: 0, pending: 0, confirmed: 0, cancelled: 0, completed: 0 };

  const sportsTotals = new Map();
  const sportsSeries = new Map(); // sport -> array(count per bucket)

  for (const bk of bookings) {
    bookingsByStatus.total += 1;
    const statusKey = normalizeStatus(bk.status);
    if (statusKey && bookingsByStatus[statusKey] !== undefined) bookingsByStatus[statusKey] += 1;

    const bucketKey = currentRange.range === 'year' ? monthKey(bk.booking_date) : String(bk.booking_date);
    const idx = bucketIndex.get(bucketKey);

    if (idx !== undefined && isRevenueStatus(bk.status)) {
      const amount = sumDecimal(bk.total_price);
      revenueSeries[idx].revenue += amount;
      revenueSeries[idx].profit += amount; // currently profit == revenue (no fee model yet)
    }

    const field = bk.field;
    const rawSports = field && Array.isArray(field.sports) ? field.sports : [];
    const list = rawSports.length ? rawSports : ['Other'];

    for (const sport of list) {
      const key = String(sport).trim() || 'Other';
      sportsTotals.set(key, (sportsTotals.get(key) || 0) + 1);

      if (!sportsSeries.has(key)) {
        sportsSeries.set(key, new Array(buckets.length).fill(0));
      }

      if (idx !== undefined) {
        sportsSeries.get(key)[idx] += 1;
      }
    }
  }

  const prevSportsTotals = new Map();
  for (const bk of prevBookings) {
    const field = bk.field;
    const rawSports = field && Array.isArray(field.sports) ? field.sports : [];
    const list = rawSports.length ? rawSports : ['Other'];

    for (const sport of list) {
      const key = String(sport).trim() || 'Other';
      prevSportsTotals.set(key, (prevSportsTotals.get(key) || 0) + 1);
    }
  }

  const totalRevenue = revenueSeries.reduce((acc, x) => acc + sumDecimal(x.revenue), 0);
  const totalProfit = revenueSeries.reduce((acc, x) => acc + sumDecimal(x.profit), 0);

  const avgBookingValue = bookingsByStatus.total
    ? Number((totalRevenue / bookingsByStatus.total).toFixed(2))
    : 0;

  const popularSports = [...sportsTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name, total]) => {
      const prev = prevSportsTotals.get(name) || 0;
      const changePct = prev === 0 ? (total > 0 ? 100 : 0) : ((total - prev) / prev) * 100;

      return {
        name,
        total,
        changePct: Number(changePct.toFixed(1)),
        series: sportsSeries.get(name) || new Array(buckets.length).fill(0),
      };
    });

  return {
    range: {
      type: currentRange.range,
      start: startStr,
      end: endStr,
    },
    top: {
      storesCount,
      productsCount,
      activeProductsCount,
      fieldsCount,
      bookingsCount: bookingsByStatus.total,
    },
    overview: {
      bookings: bookingsByStatus,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalProfit: Number(totalProfit.toFixed(2)),
      avgBookingValue,
    },
    popularSports,
    revenueSeries: revenueSeries.map((x) => ({
      name: x.name,
      revenue: Number(x.revenue.toFixed(2)),
      profit: Number(x.profit.toFixed(2)),
    })),
  };
};

// @desc   Merchant dashboard stats (popular sports, overview, revenue/profit series)
// @route  GET /api/v1/dashboard/merchant?range=day|week|month|year
// @access Private (merchant)
exports.getMerchantDashboard = asyncHandler(async (req, res) => {
  const merchant = await Merchant.findOne({ where: { user_id: req.user.id } });
  if (!merchant) {
    throw new ApiError(404, 'Merchant profile not found for current user');
  }

  const payload = await buildMerchantDashboardPayload({
    merchant,
    range: req.query.range,
  });

  res
    .status(200)
    .json(new ApiResponse(200, payload, 'Merchant dashboard retrieved successfully'));
});

// @desc   Merchant dashboard for superadmin (by merchant id)
// @route  GET /api/v1/dashboard/merchant/:merchantId
// @access Private (superadmin)
exports.getMerchantDashboardForAdmin = asyncHandler(async (req, res) => {
  const merchantId = Number(req.params.merchantId || req.params.id);
  if (!Number.isFinite(merchantId)) {
    throw new ApiError(400, 'merchantId must be a number');
  }

  const merchant = await Merchant.findByPk(merchantId);
  if (!merchant) {
    throw new ApiError(404, 'Merchant not found');
  }

  const payload = await buildMerchantDashboardPayload({
    merchant,
    range: req.query.range,
  });

  res
    .status(200)
    .json(new ApiResponse(200, payload, 'Merchant dashboard retrieved successfully'));
});

// @desc   Merchant wallet (balance + money flow series + recent transactions derived from bookings)
// @route  GET /api/v1/dashboard/merchant/wallet?range=day|week|month|year
// @access Private (merchant)
exports.getMerchantWallet = asyncHandler(async (req, res) => {
  const merchant = await Merchant.findOne({ where: { user_id: req.user.id } });
  if (!merchant) {
    throw new ApiError(404, 'Merchant profile not found for current user');
  }

  const parseTimeToMinutes = (t) => {
    if (typeof t !== 'string') return null;
    const trimmed = t.trim();
    const m = trimmed.match(/^([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);
    if (!m) return null;
    const hours = parseInt(m[1], 10);
    const minutes = parseInt(m[2], 10);
    return hours * 60 + minutes;
  };

  const getBookingAmount = (bk) => {
    const direct = sumDecimal(bk?.total_price);
    if (direct > 0) return direct;

    const pricePerHour = sumDecimal(bk?.field?.price_per_hour);
    const startMin = parseTimeToMinutes(String(bk?.start_time || ''));
    const endMin = parseTimeToMinutes(String(bk?.end_time || ''));
    if (!pricePerHour || startMin === null || endMin === null || endMin <= startMin) return 0;

    const hours = (endMin - startMin) / 60;
    return pricePerHour * hours;
  };

  const currentRange = resolveRange(req.query.range);
  const buckets = buildBuckets(currentRange);

  const startStr = toDateOnly(currentRange.start);
  const endStr = toDateOnly(currentRange.end);

  const startDateTime = new Date(Date.UTC(
    currentRange.start.getUTCFullYear(),
    currentRange.start.getUTCMonth(),
    currentRange.start.getUTCDate(),
    0,
    0,
    0,
    0
  ));

  const endDateTime = new Date(Date.UTC(
    currentRange.end.getUTCFullYear(),
    currentRange.end.getUTCMonth(),
    currentRange.end.getUTCDate(),
    23,
    59,
    59,
    999
  ));

  const bucketIndex = new Map(buckets.map((b, i) => [b.key, i]));
  const series = buckets.map((b) => ({ name: b.name, sales: 0, expenses: 0 }));

  const fieldJoin = {
    model: Field,
    as: 'field',
    required: true,
    where: { merchant_id: merchant.id },
    attributes: ['id', 'title', 'images', 'price_per_hour'],
  };

  const userJoin = {
    model: User,
    as: 'user',
    required: false,
    attributes: ['id', 'name', 'username', 'email'],
  };

  const [allRevenueBookings, bookingsInRange, recentRevenueBookings] = await Promise.all([
    FieldBooking.findAll({
      include: [fieldJoin],
      where: {
        status: { [Op.in]: ['confirmed', 'completed'] },
      },
      attributes: ['id', 'booking_date', 'status', 'total_price', 'start_time', 'end_time', 'createdAt', 'updatedAt'],
    }),
    FieldBooking.findAll({
      include: [fieldJoin],
      where: {
        updatedAt: { [Op.between]: [startDateTime, endDateTime] },
      },
      attributes: ['id', 'booking_date', 'status', 'total_price', 'start_time', 'end_time', 'createdAt', 'updatedAt'],
      order: [['updatedAt', 'ASC']],
    }),
    FieldBooking.findAll({
      include: [fieldJoin, userJoin],
      where: {
        status: { [Op.in]: ['confirmed', 'completed'] },
      },
      attributes: ['id', 'booking_date', 'status', 'total_price', 'start_time', 'end_time', 'createdAt', 'updatedAt'],
      order: [['updatedAt', 'DESC']],
      limit: 25,
    }),
  ]);

  let rangeSales = 0;
  let rangeBookingCount = 0;

  for (const bk of bookingsInRange) {
    const ts = bk.updatedAt || bk.createdAt || bk.booking_date;
    const bucketKey =
      currentRange.range === 'year'
        ? monthKey(ts)
        : toDateOnly(ts);
    const idx = bucketIndex.get(bucketKey);
    if (idx === undefined) continue;

    if (isRevenueStatus(bk.status)) {
      const amount = getBookingAmount(bk);
      series[idx].sales += amount;
      rangeSales += amount;
      rangeBookingCount += 1;
    }
  }

  const balance = allRevenueBookings.reduce((acc, bk) => acc + getBookingAmount(bk), 0);
  const allTimeBookingCount = allRevenueBookings.length;

  res.status(200).json(
    new ApiResponse(
      200,
      {
        range: {
          type: currentRange.range,
          start: startStr,
          end: endStr,
        },
        wallet: {
          balance: Number(balance.toFixed(2)),
          expenses: 0,
          sales: Number(rangeSales.toFixed(2)),
          totalSaving: Number(balance.toFixed(2)),
          bookingCount: allTimeBookingCount,
          subscriptionCount: 0,
          storeSales: 0,
        },
        series: series.map((x) => ({
          name: x.name,
          sales: Number(x.sales.toFixed(2)),
          expenses: Number(x.expenses.toFixed(2)),
        })),
        transactions: recentRevenueBookings.map((bk) => ({
          id: bk.id,
          booking_date: bk.booking_date,
          transaction_date: bk.updatedAt || bk.createdAt,
          status: normalizeStatus(bk.status),
          total_price: Number(getBookingAmount(bk).toFixed(2)),
          createdAt: bk.createdAt,
          updatedAt: bk.updatedAt,
          field: bk.field
            ? {
                id: bk.field.id,
                title: bk.field.title,
                images: bk.field.images || [],
              }
            : null,
          user: bk.user
            ? {
                id: bk.user.id,
                name: bk.user.name,
                username: bk.user.username,
                email: bk.user.email,
              }
            : null,
        })),
      },
      'Merchant wallet retrieved successfully'
    )
  );
});

// ============================================================
//  SUPERADMIN DASHBOARD (GLOBAL SALES / REVENUE OVERVIEW)
// ============================================================
// @desc   Superadmin dashboard stats (global orders + bookings revenue series)
// @route  GET /api/v1/dashboard/superadmin?range=day|week|month|year
// @access Private (superadmin)
exports.getSuperadminDashboard = asyncHandler(async (req, res) => {
  const currentRange = resolveRange(req.query.range);
  const buckets = buildBuckets(currentRange);
  const bucketIndex = new Map(buckets.map((b, i) => [b.key, i]));

  const start = currentRange.start;
  const end = currentRange.end;
  const startStr = toDateOnly(start);
  const endStr = toDateOnly(end);

  const [orders, bookings] = await Promise.all([
    Order.findAll({
      where: {
        createdAt: { [Op.between]: [start, end] },
        status: { [Op.in]: ['paid', 'completed'] },
      },
      attributes: ['createdAt', 'total'],
      order: [['createdAt', 'ASC']],
    }),
    FieldBooking.findAll({
      where: {
        booking_date: { [Op.between]: [startStr, endStr] },
        status: { [Op.in]: ['confirmed', 'completed'] },
      },
      attributes: ['booking_date', 'total_price'],
      order: [['booking_date', 'ASC']],
    }),
  ]);

  const revenueSeries = buckets.map((b) => ({ name: b.name, admin: 0, sales: 0 }));
  const profitSeries = buckets.map((b) => ({ name: b.name, sales: 0, profit: 0 }));

  const addToBucket = (bucketKey, amount) => {
    const idx = bucketIndex.get(bucketKey);
    if (idx === undefined) return;
    const value = sumDecimal(amount);
    revenueSeries[idx].sales += value;
    revenueSeries[idx].admin += value; // currently profit == revenue globally
    profitSeries[idx].sales += value;
    profitSeries[idx].profit += value;
  };

  for (const order of orders) {
    const key =
      currentRange.range === 'year'
        ? monthKey(order.createdAt)
        : toDateOnly(order.createdAt);
    addToBucket(key, order.total);
  }

  for (const booking of bookings) {
    const key =
      currentRange.range === 'year'
        ? monthKey(booking.booking_date)
        : String(booking.booking_date);
    addToBucket(key, booking.total_price);
  }

  const totalRevenue = revenueSeries.reduce(
    (acc, x) => acc + sumDecimal(x.sales),
    0,
  );
  const totalProfit = profitSeries.reduce(
    (acc, x) => acc + sumDecimal(x.profit),
    0,
  );

  const responsePayload = {
    range: {
      type: currentRange.range,
      start: startStr,
      end: endStr,
    },
    totals: {
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalProfit: Number(totalProfit.toFixed(2)),
      ordersCount: orders.length,
      bookingsCount: bookings.length,
    },
    revenueSeries: revenueSeries.map((x) => ({
      name: x.name,
      admin: Number(sumDecimal(x.admin).toFixed(2)),
      sales: Number(sumDecimal(x.sales).toFixed(2)),
    })),
    profitSeries: profitSeries.map((x) => ({
      name: x.name,
      sales: Number(sumDecimal(x.sales).toFixed(2)),
      profit: Number(sumDecimal(x.profit).toFixed(2)),
    })),
  };

  res.status(200).json(
    new ApiResponse(
      200,
      responsePayload,
      'Superadmin dashboard retrieved successfully',
    ),
  );
});
