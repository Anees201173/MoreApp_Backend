const { Cart, CartItem, Product, Merchant, Store, Order, OrderItem, sequelize } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

const sumDecimal = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const round2 = (n) => Number(sumDecimal(n).toFixed(2));

const getEffectivePrice = (product) => {
  const price = sumDecimal(product?.price);
  const discount = sumDecimal(product?.discount_percentage);
  if (!discount) return price;
  const pct = Math.min(100, Math.max(0, discount));
  return price * (1 - pct / 100);
};

const getOrCreateActiveCart = async (userId, transaction) => {
  let cart = await Cart.findOne({ where: { user_id: userId, status: 'active' }, transaction });
  if (!cart) {
    cart = await Cart.create({ user_id: userId, status: 'active' }, { transaction });
  }
  return cart;
};

const serializeCart = async (cartId, transaction) => {
  const cart = await Cart.findByPk(cartId, {
    transaction,
    include: [
      {
        model: CartItem,
        as: 'items',
        include: [
          {
            model: Product,
            as: 'product',
            attributes: ['id', 'title', 'price', 'discount_percentage', 'quantity', 'images', 'merchant_id', 'store_id', 'status'],
          },
        ],
      },
    ],
    order: [[{ model: CartItem, as: 'items' }, 'id', 'ASC']],
  });

  const items = (cart?.items || []).map((it) => {
    const qty = Number(it.quantity) || 0;
    const unit = sumDecimal(it.unit_price);
    return {
      id: it.id,
      product_id: it.product_id,
      quantity: qty,
      unit_price: round2(unit),
      line_total: round2(unit * qty),
      product: it.product || null,
    };
  });

  const subtotal = items.reduce((acc, x) => acc + sumDecimal(x.line_total), 0);

  return {
    cart: cart ? { id: cart.id, status: cart.status, user_id: cart.user_id, createdAt: cart.createdAt, updatedAt: cart.updatedAt } : null,
    items,
    summary: {
      itemsCount: items.reduce((acc, x) => acc + (Number(x.quantity) || 0), 0),
      subtotal: round2(subtotal),
      total: round2(subtotal),
      currency: 'SAR',
    },
  };
};

// GET /api/v1/cart
exports.getMyCart = asyncHandler(async (req, res) => {
  const payload = await sequelize.transaction(async (t) => {
    const cart = await getOrCreateActiveCart(req.user.id, t);
    return serializeCart(cart.id, t);
  });

  res.status(200).json(new ApiResponse(200, payload, 'Cart retrieved successfully'));
});

// POST /api/v1/cart/items  { product_id, quantity }
exports.addToCart = asyncHandler(async (req, res) => {
  const productId = Number(req.body?.product_id);
  const quantity = req.body?.quantity === undefined ? 1 : Number(req.body.quantity);

  if (!Number.isFinite(productId)) throw new ApiError(400, 'product_id must be a number');
  if (!Number.isFinite(quantity) || quantity < 1) throw new ApiError(400, 'quantity must be >= 1');

  const payload = await sequelize.transaction(async (t) => {
    const cart = await getOrCreateActiveCart(req.user.id, t);

    const product = await Product.findByPk(productId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!product) throw new ApiError(404, 'Product not found');
    if (product.status !== true) throw new ApiError(400, 'Product is not available');

    const available = Number(product.quantity) || 0;
    if (available <= 0) throw new ApiError(409, 'Product is out of stock');

    const unitPrice = getEffectivePrice(product);

    const existing = await CartItem.findOne({ where: { cart_id: cart.id, product_id: productId }, transaction: t, lock: t.LOCK.UPDATE });
    const newQty = existing ? (Number(existing.quantity) || 0) + quantity : quantity;

    if (newQty > available) {
      throw new ApiError(409, `Only ${available} items available in stock`);
    }

    if (existing) {
      existing.quantity = newQty;
      existing.unit_price = unitPrice;
      await existing.save({ transaction: t });
    } else {
      await CartItem.create(
        {
          cart_id: cart.id,
          product_id: productId,
          quantity: newQty,
          unit_price: unitPrice,
        },
        { transaction: t }
      );
    }

    return serializeCart(cart.id, t);
  });

  res.status(200).json(new ApiResponse(200, payload, 'Item added to cart'));
});

// PATCH /api/v1/cart/items/:id  { quantity }
exports.updateCartItem = asyncHandler(async (req, res) => {
  const itemId = Number(req.params.id);
  const quantity = Number(req.body?.quantity);

  if (!Number.isFinite(itemId)) throw new ApiError(400, 'Cart item id must be a number');
  if (!Number.isFinite(quantity) || quantity < 1) throw new ApiError(400, 'quantity must be >= 1');

  const payload = await sequelize.transaction(async (t) => {
    const cart = await getOrCreateActiveCart(req.user.id, t);

    const item = await CartItem.findOne({ where: { id: itemId, cart_id: cart.id }, transaction: t, lock: t.LOCK.UPDATE });
    if (!item) throw new ApiError(404, 'Cart item not found');

    const product = await Product.findByPk(item.product_id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!product) throw new ApiError(404, 'Product not found');

    const available = Number(product.quantity) || 0;
    if (quantity > available) throw new ApiError(409, `Only ${available} items available in stock`);

    item.quantity = quantity;
    item.unit_price = getEffectivePrice(product);
    await item.save({ transaction: t });

    return serializeCart(cart.id, t);
  });

  res.status(200).json(new ApiResponse(200, payload, 'Cart item updated'));
});

// DELETE /api/v1/cart/items/:id
exports.removeCartItem = asyncHandler(async (req, res) => {
  const itemId = Number(req.params.id);
  if (!Number.isFinite(itemId)) throw new ApiError(400, 'Cart item id must be a number');

  const payload = await sequelize.transaction(async (t) => {
    const cart = await getOrCreateActiveCart(req.user.id, t);
    const item = await CartItem.findOne({ where: { id: itemId, cart_id: cart.id }, transaction: t, lock: t.LOCK.UPDATE });
    if (!item) throw new ApiError(404, 'Cart item not found');

    await item.destroy({ transaction: t });
    return serializeCart(cart.id, t);
  });

  res.status(200).json(new ApiResponse(200, payload, 'Cart item removed'));
});

// POST /api/v1/cart/checkout
exports.checkoutCart = asyncHandler(async (req, res) => {
  const result = await sequelize.transaction(async (t) => {
    const cart = await getOrCreateActiveCart(req.user.id, t);

    const items = await CartItem.findAll({
      where: { cart_id: cart.id },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!items.length) throw new ApiError(400, 'Cart is empty');

    // Load and lock products
    const productIds = items.map((i) => i.product_id);
    const products = await Product.findAll({
      where: { id: productIds },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    // Validate
    for (const it of items) {
      const product = productMap.get(it.product_id);
      if (!product) throw new ApiError(404, `Product not found: ${it.product_id}`);
      if (product.status !== true) throw new ApiError(400, `Product not available: ${product.title}`);

      const available = Number(product.quantity) || 0;
      const qty = Number(it.quantity) || 0;
      if (qty < 1) throw new ApiError(400, 'Invalid cart quantity');
      if (qty > available) throw new ApiError(409, `Insufficient stock for ${product.title} (available: ${available})`);

      // refresh unit price
      it.unit_price = getEffectivePrice(product);
      await it.save({ transaction: t });
    }

    // Group into orders by merchant_id + store_id
    const groups = new Map();
    for (const it of items) {
      const p = productMap.get(it.product_id);
      const key = `${p.merchant_id}:${p.store_id || 'null'}`;
      if (!groups.has(key)) {
        groups.set(key, { merchant_id: p.merchant_id, store_id: p.store_id || null, items: [] });
      }
      groups.get(key).items.push({ cartItem: it, product: p });
    }

    const createdOrders = [];

    for (const g of groups.values()) {
      const orderSubtotal = g.items.reduce((acc, row) => {
        const qty = Number(row.cartItem.quantity) || 0;
        const unit = sumDecimal(row.cartItem.unit_price);
        return acc + unit * qty;
      }, 0);

      const order = await Order.create(
        {
          user_id: req.user.id,
          merchant_id: g.merchant_id,
          store_id: g.store_id,
          status: 'pending',
          currency: 'SAR',
          subtotal: round2(orderSubtotal),
          total: round2(orderSubtotal),
        },
        { transaction: t }
      );

      for (const row of g.items) {
        const qty = Number(row.cartItem.quantity) || 0;
        const unit = sumDecimal(row.cartItem.unit_price);
        const lineTotal = unit * qty;
        const image = (Array.isArray(row.product.images) && row.product.images[0]) || null;

        await OrderItem.create(
          {
            order_id: order.id,
            product_id: row.product.id,
            product_title: row.product.title,
            product_image: image,
            quantity: qty,
            unit_price: round2(unit),
            line_total: round2(lineTotal),
          },
          { transaction: t }
        );

        // decrement stock
        row.product.quantity = (Number(row.product.quantity) || 0) - qty;
        await row.product.save({ transaction: t });
      }

      createdOrders.push(order);
    }

    // Close cart and remove items
    cart.status = 'checked_out';
    await cart.save({ transaction: t });
    await CartItem.destroy({ where: { cart_id: cart.id }, transaction: t });

    // return detailed summary
    const detailed = [];
    for (const order of createdOrders) {
      const full = await Order.findByPk(order.id, {
        transaction: t,
        include: [
          { model: OrderItem, as: 'items', attributes: ['id', 'product_id', 'product_title', 'product_image', 'quantity', 'unit_price', 'line_total'] },
          { model: Merchant, as: 'merchant', attributes: ['id'] },
          { model: Store, as: 'store', attributes: ['id', 'name', 'image'] },
        ],
      });
      detailed.push(full);
    }

    // create a new active cart
    const newCart = await Cart.create({ user_id: req.user.id, status: 'active' }, { transaction: t });

    return {
      orders: detailed.map((o) => ({
        id: o.id,
        status: o.status,
        currency: o.currency,
        subtotal: round2(o.subtotal),
        total: round2(o.total),
        merchant_id: o.merchant_id,
        store_id: o.store_id,
        createdAt: o.createdAt,
        items: (o.items || []).map((it) => ({
          id: it.id,
          product_id: it.product_id,
          title: it.product_title,
          image: it.product_image,
          quantity: it.quantity,
          unit_price: round2(it.unit_price),
          line_total: round2(it.line_total),
        })),
      })),
      orderSummary: {
        ordersCount: detailed.length,
        itemsCount: items.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0),
        total: round2(detailed.reduce((acc, o) => acc + sumDecimal(o.total), 0)),
        currency: 'SAR',
      },
      cart: { id: newCart.id, status: newCart.status },
    };
  });

  res.status(201).json(new ApiResponse(201, result, 'Checkout completed successfully'));
});
