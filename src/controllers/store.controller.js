const { Store, Merchant } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

// Create Store (merchant or superadmin)
exports.createStore = asyncHandler(async (req, res) => {
  const { name, description, merchant_id } = req.body;

  if (!name || !name.trim()) {
    throw new ApiError(400, 'Store name is required');
  }

  // Determine merchant
  let effectiveMerchantId = merchant_id || null;

  if (!effectiveMerchantId && req.user && req.user.role === 'merchant') {
    const m = await Merchant.findOne({ where: { user_id: req.user.id } });
    if (!m) {
      throw new ApiError(400, 'Merchant profile not found for current user');
    }
    effectiveMerchantId = m.id;
  }

  if (!effectiveMerchantId) {
    throw new ApiError(400, 'merchant_id is required');
  }

  const merchant = await Merchant.findByPk(effectiveMerchantId);
  if (!merchant) {
    throw new ApiError(404, 'Merchant not found');
  }

  const file = req.file;
  const imageUrl = file ? (file.path || file.secure_url || file.url || null) : null;

  const store = await Store.create({
    name: name.trim(),
    description,
    image: imageUrl,
    merchant_id: effectiveMerchantId,
  });

  res.status(201).json(new ApiResponse(201, { store }, 'Store created'));
});

// Get all stores (optionally filter by merchant_id)
exports.getStores = asyncHandler(async (req, res) => {
  const { merchant_id } = req.query;
  const where = {};
  if (merchant_id) {
    where.merchant_id = merchant_id;
  }
  const items = await Store.findAll({ where, order: [['createdAt', 'DESC']] });
  res.status(200).json(new ApiResponse(200, { items }, 'Stores retrieved'));
});

// Get stores for current merchant user
exports.getMyStores = asyncHandler(async (req, res) => {
  const merchant = await Merchant.findOne({ where: { user_id: req.user.id } });
  if (!merchant) {
    throw new ApiError(404, 'Merchant profile not found for current user');
  }

  const items = await Store.findAll({
    where: { merchant_id: merchant.id },
    order: [['createdAt', 'DESC']],
  });

  res.status(200).json(new ApiResponse(200, { items }, 'My stores retrieved'));
});

// Get single store
exports.getStore = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const store = await Store.findByPk(id);
  if (!store) {
    throw new ApiError(404, 'Store not found');
  }
  res.status(200).json(new ApiResponse(200, { store }, 'Store retrieved'));
});

// Update store (merchant owner or superadmin)
exports.updateStore = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const store = await Store.findByPk(id);
  if (!store) {
    throw new ApiError(404, 'Store not found');
  }

  // If merchant, ensure ownership
  if (req.user && req.user.role === 'merchant') {
    const m = await Merchant.findOne({ where: { user_id: req.user.id } });
    if (!m || m.id !== store.merchant_id) {
      throw new ApiError(403, 'You are not allowed to update this store');
    }
  }

  const { name, description, is_active } = req.body;
  const file = req.file;
  if (file) {
    store.image = file.path || file.secure_url || file.url || store.image;
  }

  await store.update({
    name: name !== undefined ? name : store.name,
    description: description !== undefined ? description : store.description,
    is_active: is_active !== undefined ? is_active : store.is_active,
  });

  res.status(200).json(new ApiResponse(200, { store }, 'Store updated'));
});

// Delete store (merchant owner or superadmin)
exports.deleteStore = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const store = await Store.findByPk(id);
  if (!store) {
    throw new ApiError(404, 'Store not found');
  }

  if (req.user && req.user.role === 'merchant') {
    const m = await Merchant.findOne({ where: { user_id: req.user.id } });
    if (!m || m.id !== store.merchant_id) {
      throw new ApiError(403, 'You are not allowed to delete this store');
    }
  }

  await store.destroy();
  res.status(200).json(new ApiResponse(200, {}, 'Store deleted'));
});
