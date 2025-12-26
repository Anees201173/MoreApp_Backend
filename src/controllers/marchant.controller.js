const { Merchant, User } = require('../models');
const { Op } = require('sequelize');
const { validationResult } = require('express-validator');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { getPagination, getPagingData } = require('../utils/pagination');
const { sanitizeObject } = require('../utils/helpers');

// Helper to sanitize Merchant data
const sanitizeMerchant = (merchant) =>
    sanitizeObject(merchant.toJSON(), ['password']);

// @desc    Create new merchant
// @route   POST /api/v1/merchant
// @access  Private (Admin)
const createMerchant = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new ApiError(400, 'Validation failed', errors.array());
    }

    const { name, email, password, confirm_password, phone, address, user_id } = req.body;

    if (password !== confirm_password) {
        throw new ApiError(400, 'Password and confirm password must match');
    }

    const existingEmail = await Merchant.findByEmail(email);
    if (existingEmail) {
        throw new ApiError(400, 'Merchant email already exists');
    }

    const merchant = await Merchant.create({ 
        name, 
        email, 
        password, 
        phone, 
        address,
        user_id 
    });

    res.status(201).json(new ApiResponse(201, { merchant: sanitizeMerchant(merchant) }, 'Merchant created successfully'));
});

// @desc    Get all merchants
// @route   GET /api/v1/merchant
// @access  Private (Admin)
const getAllMerchants = asyncHandler(async (req, res) => {
    const { page, size, search, is_active } = req.query;
    const { limit, offset } = getPagination(page, size);

    const whereClause = {};
    if (search) {
        whereClause[Op.or] = [
            { name: { [Op.iLike]: `%${search}%` } },
            { email: { [Op.iLike]: `%${search}%` } }
        ];
    }

    if (is_active !== undefined) {
        whereClause.is_active = is_active === 'true';
    }

    const data = await Merchant.findAndCountAll({
        where: whereClause,
        limit,
        offset,
        order: [['id', 'DESC']],
        include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }],
        attributes: { exclude: ['password'] }
    });

    const result = getPagingData(data, page, limit);

    res.status(200).json(new ApiResponse(200, result, 'Merchants retrieved successfully'));
});

// @desc    Get merchant by ID
// @route   GET /api/v1/merchant/:id
// @access  Private
const getMerchantById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const merchant = await Merchant.findByPk(id, {
        include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }],
        attributes: { exclude: ['password'] }
    });

    if (!merchant) throw new ApiError(404, 'Merchant not found');

    res.status(200).json(new ApiResponse(200, { merchant: sanitizeMerchant(merchant) }, 'Merchant retrieved successfully'));
});

// @desc    Update merchant
// @route   PUT /api/v1/merchant/:id
// @access  Private (Admin or Merchant Admin)
const updateMerchant = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new ApiError(400, 'Validation failed', errors.array());
    }

    const { id } = req.params;
    const { name, phone, address, user_id } = req.body;

    const merchant = await Merchant.findByPk(id);
    if (!merchant) throw new ApiError(404, 'Merchant not found');

    if (req.user.role !== 'superadmin' && req.user.id !== merchant.user_id) {
        throw new ApiError(403, 'Not authorized to update this merchant');
    }

    const updateData = { name, phone, address, user_id };
    await merchant.update(updateData);

    res.status(200).json(new ApiResponse(200, { merchant: sanitizeMerchant(merchant) }, 'Merchant updated successfully'));
});

// @desc    Delete merchant
// @route   DELETE /api/v1/merchant/:id
// @access  Private (Admin)
const deleteMerchant = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const merchant = await Merchant.findByPk(id);
    if (!merchant) throw new ApiError(404, 'Merchant not found');

    await merchant.destroy();

    res.status(200).json(new ApiResponse(200, null, 'Merchant deleted successfully'));
});

// @desc    Toggle merchant active status
// @route   PATCH /api/v1/merchant/:id/toggle-status
// @access  Private (Admin)
const toggleMerchantStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const merchant = await Merchant.findByPk(id);
    if (!merchant) throw new ApiError(404, 'Merchant not found');

    await merchant.update({ is_active: !merchant.is_active });

    res.status(200).json(new ApiResponse(
        200,
        { merchant: sanitizeMerchant(merchant) },
        `Merchant status set to ${merchant.is_active ? 'active' : 'inactive'} successfully`
    ));
});

// @desc    Upload merchant images
// @route   POST /api/v1/merchant/:id/upload
// @access  Private (superadmin or merchant)
const uploadMerchant = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const merchant = await Merchant.findByPk(id);
    if (!merchant) throw new ApiError(404, 'Merchant not found');

    // authorization: merchant owner (user_id) or superadmin
    if (req.user.role !== 'superadmin' && req.user.id !== merchant.user_id) {
        throw new ApiError(403, 'Not authorized to upload for this merchant');
    }

    const file = req.file;
    if (!file) throw new ApiError(400, 'No file uploaded');

    const url = file.path || file.secure_url || file.url || null;
    if (!url) throw new ApiError(500, 'Uploaded file missing URL');

    const uploads = Array.isArray(merchant.uploads) ? merchant.uploads.slice() : [];
    uploads.push(url);
    await merchant.update({ uploads });

    res.status(200).json(new ApiResponse(200, { uploads: merchant.uploads }, 'File uploaded successfully'));
});

module.exports = {
    createMerchant,
    getAllMerchants,
    getMerchantById,
    updateMerchant,
    deleteMerchant,
    toggleMerchantStatus
    , uploadMerchant
};
