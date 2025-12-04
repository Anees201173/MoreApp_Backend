const { Category, User } = require('../models');
const { Op } = require('sequelize');
const { validationResult } = require('express-validator');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { getPagination, getPagingData } = require('../utils/pagination');
const { sanitizeObject } = require('../utils/helpers');

// Helper to sanitize Category data
const sanitizeCategory = (category) =>
    sanitizeObject(category.toJSON(), []);

// --------------------------------------------------------
// @desc    Create new category
// @route   POST /api/v1/category
// @access  Private (SuperAdmin only)
// --------------------------------------------------------
const createCategory = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new ApiError(400, 'Validation failed', errors.array());
    }

    const { name, description,  } = req.body;

    // Ensure admin_id belongs to a super admin
    // const admin = await User.findByPk(admin_id);
    // if (!admin || admin.role !== 'superadmin') {
    //     throw new ApiError(403, 'admin_id must belong to a super admin');
    // }

    const category = await Category.create({
        name,
        description,
    });

    res.status(201).json(
        new ApiResponse(
            201,
            { category: sanitizeCategory(category) },
            'Category created successfully'
        )
    );
});

// --------------------------------------------------------
// @desc    Get all categories
// @route   GET /api/v1/category
// @access  Private (Admin)
// --------------------------------------------------------
const getAllCategories = asyncHandler(async (req, res) => {
    const { page, size, search, is_active } = req.query;
    const { limit, offset } = getPagination(page, size);

    const whereClause = {};

    if (search) {
        whereClause[Op.or] = [
            { name: { [Op.iLike]: `%${search}%` } },
            { description: { [Op.iLike]: `%${search}%` } }
        ];
    }

    if (is_active !== undefined) {
        whereClause.is_active = is_active === 'true';
    }

    const data = await Category.findAndCountAll({
        where: whereClause,
        limit,
        offset,
        order: [['id', 'DESC']],
        include: [
            { model: User, as: 'admin', attributes: ['id', 'name', 'email'] }
        ]
    });

    const result = getPagingData(data, page, limit);

    res.status(200).json(
        new ApiResponse(200, result, 'Categories retrieved successfully')
    );
});

// --------------------------------------------------------
// @desc    Get category by ID
// @route   GET /api/v1/category/:id
// @access  Private
// --------------------------------------------------------
const getCategoryById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const category = await Category.findByPk(id, {
        include: [
            { model: User, as: 'admin', attributes: ['id', 'name', 'email'] }
        ]
    });

    if (!category) throw new ApiError(404, 'Category not found');

    res.status(200).json(
        new ApiResponse(
            200,
            { category: sanitizeCategory(category) },
            'Category retrieved successfully'
        )
    );
});

// --------------------------------------------------------
// @desc    Update category
// @route   PUT /api/v1/category/:id
// @access  Private (SuperAdmin or category admin)
// --------------------------------------------------------
const updateCategory = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new ApiError(400, 'Validation failed', errors.array());
    }

    const { id } = req.params;
    const { name, description, admin_id } = req.body;

    const category = await Category.findByPk(id);
    if (!category) throw new ApiError(404, 'Category not found');

    // Authorization
    if (req.user.role !== 'superadmin' && req.user.id !== category.admin_id) {
        throw new ApiError(403, 'Not authorized to update this category');
    }

    // If changing admin_id — verify it's super admin
    if (admin_id) {
        const admin = await User.findByPk(admin_id);
        if (!admin || admin.role !== 'superadmin') {
            throw new ApiError(403, 'admin_id must belong to a super admin');
        }
    }

    await category.update({ name, description, admin_id });

    res.status(200).json(
        new ApiResponse(
            200,
            { category: sanitizeCategory(category) },
            'Category updated successfully'
        )
    );
});

// --------------------------------------------------------
// @desc    Delete category
// @route   DELETE /api/v1/category/:id
// @access  Private (Admin)
// --------------------------------------------------------
const deleteCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const category = await Category.findByPk(id);
    if (!category) throw new ApiError(404, 'Category not found');

    await category.destroy();

    res.status(200).json(new ApiResponse(200, null, 'Category deleted successfully'));
});

// --------------------------------------------------------
// @desc    Toggle category active status
// @route   PATCH /api/v1/category/:id/toggle-status
// @access  Private (Admin)
// --------------------------------------------------------
const toggleCategoryStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const category = await Category.findByPk(id);
    if (!category) throw new ApiError(404, 'Category not found');

    await category.update({ is_active: !category.is_active });

    res.status(200).json(
        new ApiResponse(
            200,
            { category: sanitizeCategory(category) },
            `Category status set to ${category.is_active ? 'active' : 'inactive'} successfully`
        )
    );
});

module.exports = {
    createCategory,
    getAllCategories,
    getCategoryById,
    updateCategory,
    deleteCategory,
    toggleCategoryStatus
};
