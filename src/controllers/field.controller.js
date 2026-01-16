const { Field, Merchant } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

// Create a new field
exports.createField = asyncHandler(async (req, res) => {
  const { title, description, address, sports, images, merchant_id, city, latitude, longitude, price_per_hour, field_category_id } = req.body;

  const parseArrayField = (val) => {
    if (Array.isArray(val)) return val;
    if (!val && val !== 0) return [];
    if (typeof val === 'string') {
      // try JSON parse
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        // fallback to comma split
        return val.split(',').map((s) => s.trim()).filter(Boolean);
      }
    }
    return [];
  };

  // if an image file is uploaded (multer + cloudinary), add its url to images
  const file = req.file;
  let uploadedUrl = null;
  if (file) uploadedUrl = file.path || file.secure_url || file.url || null;

  // determine merchant id: prefer provided merchant_id, otherwise attempt from req.user
  let effectiveMerchantId = merchant_id || null;
  if (!effectiveMerchantId && req.user && req.user.role === 'merchant') {
    const m = await Merchant.findOne({ where: { user_id: req.user.id } });
    if (m) effectiveMerchantId = m.id;
  }

  if (!title || !title.trim()) {
    throw new ApiError(400, 'Field title is required');
  }

  const field = await Field.create({
    title: title.trim(),
    description,
    address,
    sports: parseArrayField(sports),
    images: (() => {
      const base = parseArrayField(images);
      if (uploadedUrl) base.push(uploadedUrl);
      return base;
    })(),
    city,
    latitude: latitude !== undefined && latitude !== null ? Number(latitude) : null,
    longitude: longitude !== undefined && longitude !== null ? Number(longitude) : null,
    price_per_hour: price_per_hour !== undefined && price_per_hour !== null ? Number(price_per_hour) : null,
    field_category_id: field_category_id !== undefined && field_category_id !== null ? Number(field_category_id) : null,
    merchant_id: effectiveMerchantId,
  });

  res.status(201).json(new ApiResponse(201, { field }, 'Field created successfully'));
});

// Get fields with optional filtering
exports.getFields = asyncHandler(async (req, res) => {
  const { merchant_id } = req.query;
  const where = {};

  // If a merchant is authenticated and no merchant_id query provided, scope to that merchant
  if (!merchant_id && req.user && req.user.role === 'merchant') {
    const m = await Merchant.findOne({ where: { user_id: req.user.id } });
    if (m) where.merchant_id = m.id;
  } else if (merchant_id) {
    where.merchant_id = merchant_id;
  }

  const items = await Field.findAll({ where, order: [['created_at', 'DESC']] });
  res.status(200).json(new ApiResponse(200, { items }, 'Fields retrieved'));
});

// Get single field
exports.getField = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const field = await Field.findByPk(id);
  if (!field) throw new ApiError(404, 'Field not found');
  res.status(200).json(new ApiResponse(200, { field }, 'Field retrieved'));
});

// Update field
exports.updateField = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const field = await Field.findByPk(id);
  if (!field) throw new ApiError(404, 'Field not found');

  const { title, description, address, sports, images, status, city, latitude, longitude, price_per_hour, field_category_id } = req.body;

  // handle optional uploaded image
  const file = req.file;
  if (file) {
    const url = file.path || file.secure_url || file.url || null;
    const current = Array.isArray(field.images) ? field.images.slice() : [];
    if (url) current.push(url);
    field.images = current;
  }

  await field.update({
    // Use incoming values when provided, otherwise preserve existing ones
    title: title !== undefined ? title : field.title,
    description: description !== undefined ? description : field.description,
    address: address !== undefined ? address : field.address,
    sports:
      sports !== undefined
        ? Array.isArray(sports)
          ? sports
          : field.sports
        : field.sports,
    images:
      images !== undefined && Array.isArray(images) && images.length
        ? images
        : field.images,
    status: status !== undefined ? status : field.status,
    city: city !== undefined ? city : field.city,
    latitude:
      latitude !== undefined && latitude !== null
        ? Number(latitude)
        : field.latitude,
    longitude:
      longitude !== undefined && longitude !== null
        ? Number(longitude)
        : field.longitude,
    price_per_hour:
      price_per_hour !== undefined && price_per_hour !== null
        ? Number(price_per_hour)
        : field.price_per_hour,
    field_category_id:
      field_category_id !== undefined && field_category_id !== null
        ? Number(field_category_id)
        : field.field_category_id,
  });

  res.status(200).json(new ApiResponse(200, { field }, 'Field updated'));
});

// Delete field
exports.deleteField = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const field = await Field.findByPk(id);
  if (!field) throw new ApiError(404, 'Field not found');
  await field.destroy();
  res.status(200).json(new ApiResponse(200, {}, 'Field deleted'));
});
