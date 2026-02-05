const { Order, OrderItem, Merchant, Store, User } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

const sumDecimal = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const round2 = (n) => Number(sumDecimal(n).toFixed(2));

// GET /api/v1/orders/admin (superadmin)
exports.getAllOrdersForAdmin = asyncHandler(async (req, res) => {
  const orders = await Order.findAll({
    order: [['createdAt', 'DESC']],
    include: [
      { model: OrderItem, as: 'items', attributes: ['id', 'product_id', 'product_title', 'product_image', 'quantity', 'unit_price', 'line_total'] },
      { model: Store, as: 'store', attributes: ['id', 'name', 'image'] },
      { model: Merchant, as: 'merchant', attributes: ['id', 'user_id'] },
      { model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone', 'city', 'country'] },
    ],
  });

  const items = orders || [];

  const stats = {
    totalOrders: items.length,
    totalRevenue: round2(items.reduce((acc, o) => acc + sumDecimal(o.total), 0)),
    paidOrders: items.filter((o) => o.status === 'paid').length,
    completedOrders: items.filter((o) => o.status === 'completed').length,
    cancelledOrders: items.filter((o) => o.status === 'cancelled').length,
    pendingOrders: items.filter((o) => o.status === 'pending').length,
  };

  res
    .status(200)
    .json(new ApiResponse(200, { items, stats }, 'All orders retrieved successfully'));
});

// GET /api/v1/orders/me (user)
exports.getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.findAll({
    where: { user_id: req.user.id },
    order: [['createdAt', 'DESC']],
    include: [
      { model: OrderItem, as: 'items', attributes: ['id', 'product_id', 'product_title', 'product_image', 'quantity', 'unit_price', 'line_total'] },
      { model: Store, as: 'store', attributes: ['id', 'name', 'image'] },
    ],
  });

  res.status(200).json(new ApiResponse(200, { items: orders }, 'Orders retrieved successfully'));
});

// GET /api/v1/orders/:id (user)
exports.getMyOrderById = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) throw new ApiError(400, 'Order id must be a number');

  const order = await Order.findByPk(id, {
    include: [
      { model: OrderItem, as: 'items', attributes: ['id', 'product_id', 'product_title', 'product_image', 'quantity', 'unit_price', 'line_total'] },
      { model: Store, as: 'store', attributes: ['id', 'name', 'image'] },
      { model: Merchant, as: 'merchant', attributes: ['id', 'user_id'] },
    ],
  });

  if (!order) throw new ApiError(404, 'Order not found');
  if (order.user_id !== req.user.id) throw new ApiError(403, 'You are not allowed to view this order');

  const items = order.items || [];
  const subtotal = items.reduce((acc, it) => acc + sumDecimal(it.line_total), 0);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        order,
        summary: {
          itemsCount: items.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0),
          subtotal: round2(subtotal),
          total: round2(order.total),
          currency: order.currency,
        },
      },
      'Order retrieved successfully'
    )
  );
});

// GET /api/v1/orders/merchant/me (merchant)
exports.getMerchantOrders = asyncHandler(async (req, res) => {
  const merchant = await Merchant.findOne({ where: { user_id: req.user.id } });
  if (!merchant) throw new ApiError(404, 'Merchant profile not found for current user');

  const orders = await Order.findAll({
    where: { merchant_id: merchant.id },
    order: [['createdAt', 'DESC']],
    include: [
      { model: OrderItem, as: 'items', attributes: ['id', 'product_id', 'product_title', 'product_image', 'quantity', 'unit_price', 'line_total'] },
      { model: Store, as: 'store', attributes: ['id', 'name', 'image'] },
      { model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone', 'city', 'country'] },
    ],
  });

  res.status(200).json(new ApiResponse(200, { items: orders }, 'Merchant orders retrieved successfully'));
});

// PATCH /api/v1/orders/:id/status (merchant)
exports.updateOrderStatus = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const status = typeof req.body?.status === 'string' ? req.body.status.trim() : '';
  if (!Number.isFinite(id)) throw new ApiError(400, 'Order id must be a number');

  const allowed = new Set(['pending', 'paid', 'cancelled', 'completed']);
  if (!allowed.has(status)) {
    throw new ApiError(400, 'status must be one of: pending, paid, cancelled, completed');
  }

  const merchant = await Merchant.findOne({ where: { user_id: req.user.id } });
  if (!merchant) throw new ApiError(404, 'Merchant profile not found for current user');

  const order = await Order.findByPk(id);
  if (!order) throw new ApiError(404, 'Order not found');
  if (order.merchant_id !== merchant.id) throw new ApiError(403, 'You are not allowed to update this order');

  order.status = status;
  await order.save();

  res.status(200).json(new ApiResponse(200, { order }, 'Order status updated successfully'));
});
