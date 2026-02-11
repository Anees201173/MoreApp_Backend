const {
  Field,
  Merchant,
  FieldCategory,
  FieldAvailability,
  FieldSubscriptionPlan,
  Addon,
  User,
  sequelize,
} = require('../models');
const { Op } = require('sequelize');
const { getPagination, getPagingData } = require('../utils/pagination');
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

const getDayOfWeekUTC = (dateStr) => {
  // dateStr: YYYY-MM-DD
  const d = new Date(`${dateStr}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d.getUTCDay();
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

const normalizeDateOnly = (raw) => {
  if (raw === undefined || raw === null) return null;
  const val = String(raw).trim();
  if (!val) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) return null;
  const d = new Date(`${val}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return val;
};

const timeToHHmm = (t) => {
  if (t === undefined || t === null) return null;
  const s = String(t);
  // Handles both TIME strings like "09:00:00" and already formatted "09:00"
  if (/^\d{2}:\d{2}/.test(s)) return s.slice(0, 5);
  return s;
};

// Create a new field
exports.createField = asyncHandler(async (req, res) => {
  const { title, description, address, sports, images, merchant_id, city, latitude, longitude, price_per_hour, field_category_id } = req.body;

  const rawAvailability = req.body.availability ?? req.body.availabilities;
  const parseAvailability = (val) => {
    if (!val) return null;
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        return Array.isArray(parsed) ? parsed : null;
      } catch {
        return null;
      }
    }
    return null;
  };

  const availability = parseAvailability(rawAvailability);

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

  const result = await sequelize.transaction(async (t) => {
    const field = await Field.create(
      {
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
      },
      { transaction: t }
    );

    if (availability && availability.length) {
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
          throw new ApiError(400, 'availability start_time/end_time must be in HH:mm format');
        }
        if (endMin <= startMin) {
          throw new ApiError(400, 'availability end_time must be after start_time');
        }

        return {
          field_id: field.id,
          day_of_week: day,
          start_time: start,
          end_time: end,
          is_active: true,
        };
      });

      await FieldAvailability.bulkCreate(rows, { transaction: t });
    }

    return field;
  });

  res.status(201).json(new ApiResponse(201, { field: result }, 'Field created successfully'));
});

// Get fields with optional filtering
exports.getFields = asyncHandler(async (req, res) => {
  const {
    merchant_id,
    city,
    field_category_id,
    min_price,
    max_price,
    page,
    size,
    name,
  } = req.query;
  const where = {};

  const normalizedName = name !== undefined && name !== null ? String(name).trim() : '';

  // If a merchant is authenticated and no merchant_id query provided, scope to that merchant
  if (!merchant_id && req.user && req.user.role === 'merchant') {
    const m = await Merchant.findOne({ where: { user_id: req.user.id } });
    if (m) where.merchant_id = m.id;
  } else if (merchant_id) {
    where.merchant_id = merchant_id;
  }

  if (city) {
    where.city = { [Op.iLike]: `%${String(city).trim()}%` };
  }

  if (normalizedName) {
    where[Op.or] = [
      { title: { [Op.iLike]: `%${normalizedName}%` } },
      { '$fieldCategory.name$': { [Op.iLike]: `%${normalizedName}%` } },
    ];
  }

  if (field_category_id !== undefined && field_category_id !== null && String(field_category_id).trim() !== '') {
    const categoryId = parseInt(String(field_category_id).trim(), 10);
    if (!Number.isFinite(categoryId)) {
      throw new ApiError(400, 'field_category_id must be a number');
    }
    where.field_category_id = categoryId;
  }

  const parsedMin = min_price !== undefined && min_price !== null && String(min_price).trim() !== '' ? Number(min_price) : null;
  const parsedMax = max_price !== undefined && max_price !== null && String(max_price).trim() !== '' ? Number(max_price) : null;
  if (parsedMin !== null || parsedMax !== null) {
    where.price_per_hour = {
      ...(parsedMin !== null ? { [Op.gte]: parsedMin } : {}),
      ...(parsedMax !== null ? { [Op.lte]: parsedMax } : {}),
    };
  }

  const usePaging = page !== undefined || size !== undefined;

  if (usePaging) {
    const { limit, offset } = getPagination(page, size);
    const data = await Field.findAndCountAll({
      where,
      limit,
      offset,
      order: [['created_at', 'DESC']],
      distinct: true,
      include: [
        {
          model: FieldCategory,
          as: 'fieldCategory',
          required: false,
        },
      ],
    });

    const result = getPagingData(data, page, limit);
    res.status(200).json(new ApiResponse(200, result, 'Fields retrieved'));
    return;
  }

  const items = await Field.findAll({
    where,
    order: [['created_at', 'DESC']],
    include: [
      {
        model: FieldCategory,
        as: 'fieldCategory',
        required: false,
      },
    ],
  });
  res.status(200).json(new ApiResponse(200, { items }, 'Fields retrieved'));
});

// Get single field
exports.getField = asyncHandler(async (req, res) => {
  const fieldId = Number(req.params.id);
  if (!Number.isFinite(fieldId)) throw new ApiError(400, 'Field id must be a number');

  const field = await Field.findByPk(fieldId, {
    // Keep Field timestamps, but reduce noise in nested relations.
    include: [
      {
        model: FieldCategory,
        as: 'fieldCategory',
        required: false,
        attributes: ['id', 'name', 'description', 'icon_url', 'is_active'],
      },
      {
        model: Merchant,
        as: 'merchant',
        required: false,
        attributes: ['id', 'name', 'phone', 'email', 'address', 'user_id', 'uploads', 'is_active', 'createdAt', 'updatedAt'],
        include: [
          {
            model: User,
            as: 'user',
            required: false,
            attributes: [
              'id',
              'name',
              'username',
              'email',
              'phone',
              'gender',
              'energy_points_balance',
              'city',
              'country',
              'role',
              'company_id',
              'is_active',
              'email_verified',
              'last_login',
              'createdAt',
              'updatedAt',
            ],
          },
        ],
      },
      {
        model: Addon,
        as: 'addons',
        required: false,
        where: { status: 'active' },
        attributes: ['id', 'title', 'description', 'price', 'image', 'status'],
      },
      {
        model: FieldSubscriptionPlan,
        as: 'subscriptionPlans',
        required: false,
        where: { is_active: true, visibility: 'public' },
        attributes: ['id', 'title', 'description', 'type', 'price', 'currency', 'features', 'visibility', 'is_active'],
      },
    ],
  });

  if (!field) throw new ApiError(404, 'Field not found');

  const cleanField = field.toJSON();

  res.status(200).json(
    new ApiResponse(
      200,
      {
        field: cleanField,
      },
      'Field retrieved'
    )
  );
});

// Get fields by field category id
exports.getFieldsByCategory = asyncHandler(async (req, res) => {
  const { field_category_id } = req.params;
  const { page, size } = req.query;

  const categoryId = Number(field_category_id);
  if (!Number.isFinite(categoryId)) {
    throw new ApiError(400, 'field_category_id must be a number');
  }

  const where = { field_category_id: categoryId };

  // If a merchant is authenticated, scope to their own fields
  if (req.user && req.user.role === 'merchant') {
    const m = await Merchant.findOne({ where: { user_id: req.user.id } });
    if (m) where.merchant_id = m.id;
  }

  const usePaging = page !== undefined || size !== undefined;
  if (usePaging) {
    const { limit, offset } = getPagination(page, size);
    const data = await Field.findAndCountAll({
      where,
      limit,
      offset,
      order: [['created_at', 'DESC']],
      include: [{ model: FieldCategory, as: 'fieldCategory' }],
    });

    const result = getPagingData(data, page, limit);
    res.status(200).json(new ApiResponse(200, result, 'Fields retrieved'));
    return;
  }

  const items = await Field.findAll({
    where,
    order: [['created_at', 'DESC']],
    include: [{ model: FieldCategory, as: 'fieldCategory' }],
  });

  res.status(200).json(new ApiResponse(200, { items }, 'Fields retrieved'));
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
