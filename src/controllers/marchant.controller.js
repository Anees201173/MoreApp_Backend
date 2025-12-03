const { Marchant, User } = require('../models');
const { Op } = require('sequelize');
const { validationResult } = require('express-validator');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { getPagination, getPagingData } = require('../utils/pagination');
const { sanitizeObject } = require('../utils/helpers');

// Helper to sanitize Marchant data
const sanitizeMarchant = (marchant) =>
    sanitizeObject(marchant.toJSON(), ['password']);

// @desc    Create new marchant
// @route   POST /api/v1/marchant
// @access  Private (Admin)
const createMarchant = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new ApiError(400, 'Validation failed', errors.array());
    }

    const { name, email, password, confirm_password, phone, address } = req.body;

    if (password !== confirm_password) {
        throw new ApiError(400, 'Password and confirm password must match');
    }

    const existingEmail = await Marchant.findByEmail(email);
    if (existingEmail) {
        throw new ApiError(400, 'Marchant email already exists');
    }

    const marchant = await Marchant.create({ name, email, password, phone, address });

    res.status(201).json(new ApiResponse(201, { marchant: sanitizeMarchant(marchant) }, 'Marchant created successfully'));
});

// @desc    Get all marchants
// @route   GET /api/v1/marchant
// @access  Private (Admin)
const getAllMarchants = asyncHandler(async (req, res) => {
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

    const data = await Marchant.findAndCountAll({
        where: whereClause,
        limit,
        offset,
        order: [['id', 'DESC']],
        include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }],
        attributes: { exclude: ['password'] }
    });

    const result = getPagingData(data, page, limit);

    res.status(200).json(new ApiResponse(200, result, 'Marchants retrieved successfully'));
});

// @desc    Get marchant by ID
// @route   GET /api/v1/marchant/:id
// @access  Private
const getMarchantById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const marchant = await Marchant.findByPk(id, {
        include: [{ model: User, as: 'marchantadmin', attributes: ['id', 'name', 'email'] }],
        attributes: { exclude: ['password'] }
    });

    if (!marchant) throw new ApiError(404, 'Marchant not found');

    res.status(200).json(new ApiResponse(200, { marchant: sanitizeMarchant(marchant) }, 'Marchant retrieved successfully'));
});

// @desc    Update marchant
// @route   PUT /api/v1/marchant/:id
// @access  Private (Admin or Marchant Admin)
const updateMarchant = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new ApiError(400, 'Validation failed', errors.array());
    }

    const { id } = req.params;
    const { name, phone, address, admin_id } = req.body;

    const marchant = await Marchant.findByPk(id);
    if (!marchant) throw new ApiError(404, 'Marchant not found');

    if (req.user.role !== 'superadmin' && req.user.id !== marchant.admin_id) {
        throw new ApiError(403, 'Not authorized to update this marchant');
    }

    const updateData = { name, phone, address, admin_id };
    await marchant.update(updateData);

    res.status(200).json(new ApiResponse(200, { marchant: sanitizeMarchant(marchant) }, 'Marchant updated successfully'));
});

// @desc    Delete marchant
// @route   DELETE /api/v1/marchant/:id
// @access  Private (Admin)
const deleteMarchant = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const marchant = await Marchant.findByPk(id);
    if (!marchant) throw new ApiError(404, 'Marchant not found');

    await marchant.destroy();

    res.status(200).json(new ApiResponse(200, null, 'Marchant deleted successfully'));
});

// @desc    Toggle marchant active status
// @route   PATCH /api/v1/marchant/:id/toggle-status
// @access  Private (Admin)
const toggleMarchantStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const marchant = await Marchant.findByPk(id);
    if (!marchant) throw new ApiError(404, 'Marchant not found');

    await marchant.update({ is_active: !marchant.is_active });

    res.status(200).json(new ApiResponse(
        200,
        { marchant: sanitizeMarchant(marchant) },
        `Marchant status set to ${marchant.is_active ? 'active' : 'inactive'} successfully`
    ));
});

module.exports = {
    createMarchant,
    getAllMarchants,
    getMarchantById,
    updateMarchant,
    deleteMarchant,
    toggleMarchantStatus
};
