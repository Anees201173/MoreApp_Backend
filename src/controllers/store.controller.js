const { Store, Merchant, Category } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

const toInt = (v) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
};

// Create Store (merchant or superadmin)
exports.createStore = asyncHandler(async (req, res) => {
  const { name, description, merchant_id, category_id } = req.body;

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

  const effectiveCategoryId = toInt(category_id);
  if (!effectiveCategoryId) {
    throw new ApiError(400, 'category_id is required');
  }

  const merchant = await Merchant.findByPk(effectiveMerchantId);
  if (!merchant) {
    throw new ApiError(404, 'Merchant not found');
  }

  const category = await Category.findByPk(effectiveCategoryId);
  if (!category) {
    throw new ApiError(404, 'Category not found');
  }

  const file = req.file;
  const imageUrl = file ? (file.path || file.secure_url || file.url || null) : null;

  const store = await Store.create({
    name: name.trim(),
    description,
    image: imageUrl,
    merchant_id: effectiveMerchantId,
    category_id: effectiveCategoryId,
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
  const items = await Store.findAll({
    where,
    include: [{ model: Category, as: 'category', attributes: ['id', 'name'], required: false }],
    order: [['createdAt', 'DESC']],
  });
  res.status(200).json(new ApiResponse(200, { items }, 'Stores retrieved'));
});

// Get stores by category id
// @route  GET /api/v1/stores/category/:category_id?merchant_id=
// @access Private
exports.getStoresByCategory = asyncHandler(async (req, res) => {
  const categoryId = toInt(req.params.category_id);
  if (!categoryId) {
    throw new ApiError(400, 'category_id must be a positive integer');
  }

  const where = { category_id: categoryId };
  const merchantId = req.query?.merchant_id ? toInt(req.query.merchant_id) : null;
  if (req.query?.merchant_id !== undefined && !merchantId) {
    throw new ApiError(400, 'merchant_id must be a positive integer');
  }
  if (merchantId) {
    where.merchant_id = merchantId;
  }

  const items = await Store.findAll({
    where,
    include: [{ model: Category, as: 'category', attributes: ['id', 'name'], required: false }],
    order: [['createdAt', 'DESC']],
  });

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
    include: [{ model: Category, as: 'category', attributes: ['id', 'name'], required: false }],
    order: [['createdAt', 'DESC']],
  });

  res.status(200).json(new ApiResponse(200, { items }, 'My stores retrieved'));
});

// Get single store
exports.getStore = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const store = await Store.findByPk(id, {
    include: [{ model: Category, as: 'category', attributes: ['id', 'name'], required: false }],
  });
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

  const { name, description, is_active, category_id } = req.body;
  const file = req.file;
  if (file) {
    store.image = file.path || file.secure_url || file.url || store.image;
  }

  const effectiveCategoryId = category_id === undefined ? undefined : toInt(category_id);
  if (category_id !== undefined && !effectiveCategoryId) {
    throw new ApiError(400, 'category_id must be a positive integer');
  }
  if (effectiveCategoryId) {
    const category = await Category.findByPk(effectiveCategoryId);
    if (!category) {
      throw new ApiError(404, 'Category not found');
    }
  }

  await store.update({
    name: name !== undefined ? name : store.name,
    description: description !== undefined ? description : store.description,
    is_active: is_active !== undefined ? is_active : store.is_active,
    category_id: effectiveCategoryId !== undefined ? effectiveCategoryId : store.category_id,
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
