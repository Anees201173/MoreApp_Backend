const { Addon, Merchant, Field } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

// Create addon (accepts single image upload as req.file)
exports.createAddon = asyncHandler(async (req, res) => {
  const { title, description, price, field_id, merchant_id } = req.body;

  if (!title || !title.trim()) {
    throw new ApiError(400, 'Addon title is required');
  }

  const file = req.file;
  const imageUrl = file ? (file.path || file.secure_url || file.url || null) : null;

  // prefer provided merchant_id, otherwise, try to infer from req.user if merchant
  let effectiveMerchantId = merchant_id || null;
  if (!effectiveMerchantId && req.user && req.user.role === 'merchant') {
    const m = await Merchant.findOne({ where: { user_id: req.user.id } });
    if (m) effectiveMerchantId = m.id;
  }

  // field existence check if provided
  if (field_id) {
    const f = await Field.findByPk(field_id);
    if (!f) {
      throw new ApiError(400, 'Target field not found');
    }
  }

  const addon = await Addon.create({
    title: title.trim(),
    description,
    price: price !== undefined && price !== null ? Number(price) : null,
    image: imageUrl,
    field_id: field_id !== undefined && field_id !== null ? Number(field_id) : null,
    merchant_id: effectiveMerchantId,
  });

  res.status(201).json(new ApiResponse(201, { addon }, 'Addon created'));
});

exports.getAddons = asyncHandler(async (req, res) => {
  const { field_id } = req.query;
  const where = {};
  if (field_id) where.field_id = field_id;
  const items = await Addon.findAll({ where, order: [['created_at','DESC']] });
  res.status(200).json(new ApiResponse(200, { items }, 'Addons retrieved'));
});

exports.getAddon = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const addon = await Addon.findByPk(id);
  if (!addon) throw new ApiError(404, 'Addon not found');
  res.status(200).json(new ApiResponse(200, { addon }, 'Addon retrieved'));
});

exports.updateAddon = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const addon = await Addon.findByPk(id);
  if (!addon) throw new ApiError(404, 'Addon not found');

  const { title, description, price, status, field_id } = req.body;
  const file = req.file;
  if (file) addon.image = file.path || file.secure_url || file.url || addon.image;

  await addon.update({
    title: title !== undefined ? title : addon.title,
    description: description !== undefined ? description : addon.description,
    price: price !== undefined && price !== null ? Number(price) : addon.price,
    status: status !== undefined ? status : addon.status,
    field_id: field_id !== undefined && field_id !== null ? Number(field_id) : addon.field_id,
  });

  res.status(200).json(new ApiResponse(200, { addon }, 'Addon updated'));
});

exports.deleteAddon = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const addon = await Addon.findByPk(id);
  if (!addon) throw new ApiError(404, 'Addon not found');
  await addon.destroy();
  res.status(200).json(new ApiResponse(200, {}, 'Addon deleted'));
});
