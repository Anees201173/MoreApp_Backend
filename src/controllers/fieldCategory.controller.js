const { FieldCategory } = require('../models');
const { validationResult } = require('express-validator');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

// Helper to sanitize response
const sanitize = (category) => category.toJSON();

// @desc    Create field category
// @route   POST /api/v1/field-categories
// @access  Private (superadmin)
exports.createFieldCategory = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Validation failed', errors.array());
  }

  const { name, description, icon_url } = req.body;

  const existing = await FieldCategory.findByName(name);
  if (existing) {
    throw new ApiError(400, 'Field category already exists with this name');
  }

  const category = await FieldCategory.create({ name, description, icon_url });

  res
    .status(201)
    .json(new ApiResponse(201, { category: sanitize(category) }, 'Field category created successfully'));
});

// @desc    Get all field categories
// @route   GET /api/v1/field-categories
// @access  Private (admin/superadmin)
exports.getFieldCategories = asyncHandler(async (req, res) => {
  const items = await FieldCategory.findAll({ order: [['id', 'DESC']] });
  res
    .status(200)
    .json(new ApiResponse(200, { items: items.map(sanitize) }, 'Field categories retrieved successfully'));
});

// @desc    Get single field category
// @route   GET /api/v1/field-categories/:id
// @access  Private
exports.getFieldCategoryById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const category = await FieldCategory.findByPk(id);
  if (!category) throw new ApiError(404, 'Field category not found');

  res
    .status(200)
    .json(new ApiResponse(200, { category: sanitize(category) }, 'Field category retrieved successfully'));
});

// @desc    Update field category
// @route   PUT /api/v1/field-categories/:id
// @access  Private (superadmin)
exports.updateFieldCategory = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Validation failed', errors.array());
  }

  const { id } = req.params;
  const { name, description, icon_url, is_active } = req.body;

  const category = await FieldCategory.findByPk(id);
  if (!category) throw new ApiError(404, 'Field category not found');

  await category.update({ name, description, icon_url, is_active });

  res
    .status(200)
    .json(new ApiResponse(200, { category: sanitize(category) }, 'Field category updated successfully'));
});

// @desc    Delete field category
// @route   DELETE /api/v1/field-categories/:id
// @access  Private (superadmin)
exports.deleteFieldCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const category = await FieldCategory.findByPk(id);
  if (!category) throw new ApiError(404, 'Field category not found');

  await category.destroy();

  res.status(200).json(new ApiResponse(200, null, 'Field category deleted successfully'));
});

// @desc    Toggle field category active status
// @route   PATCH /api/v1/field-categories/:id/toggle-status
// @access  Private (superadmin)
exports.toggleFieldCategoryStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const category = await FieldCategory.findByPk(id);
  if (!category) throw new ApiError(404, 'Field category not found');

  await category.update({ is_active: !category.is_active });

  res
    .status(200)
    .json(
      new ApiResponse(200, { category: sanitize(category) }, `Field category status set to ${category.is_active ? 'active' : 'inactive'} successfully`)
    );
});
