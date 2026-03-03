const { SubscriptionCategory } = require('../models');
const { validationResult } = require('express-validator');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

const sanitize = (category) => (typeof category?.toJSON === 'function' ? category.toJSON() : category);

// @desc    Create subscription category
// @route   POST /api/v1/subscription-categories
// @access  Private (superadmin)
exports.createSubscriptionCategory = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Validation failed', errors.array());
  }

  const { name, icon_url } = req.body;

  const existing = await SubscriptionCategory.findByName(String(name).trim());
  if (existing) {
    throw new ApiError(400, 'Subscription category already exists with this name');
  }

  const category = await SubscriptionCategory.create({
    name: String(name).trim(),
    icon_url: icon_url && String(icon_url).trim() ? String(icon_url).trim() : null,
  });

  res.status(201).json(new ApiResponse(201, { category: sanitize(category) }, 'Subscription category created successfully'));
});

// @desc    Get all subscription categories
// @route   GET /api/v1/subscription-categories
// @access  Private (any authenticated role)
exports.getSubscriptionCategories = asyncHandler(async (req, res) => {
  const { include_inactive } = req.query;

  const where = {};
  if (!include_inactive) where.is_active = true;

  const items = await SubscriptionCategory.findAll({ where, order: [['id', 'DESC']] });
  res.status(200).json(new ApiResponse(200, { items: items.map(sanitize) }, 'Subscription categories retrieved successfully'));
});

// @desc    Get single subscription category
// @route   GET /api/v1/subscription-categories/:id
// @access  Private
exports.getSubscriptionCategoryById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const category = await SubscriptionCategory.findByPk(id);
  if (!category) throw new ApiError(404, 'Subscription category not found');

  res.status(200).json(new ApiResponse(200, { category: sanitize(category) }, 'Subscription category retrieved successfully'));
});

// @desc    Update subscription category
// @route   PUT /api/v1/subscription-categories/:id
// @access  Private (superadmin)
exports.updateSubscriptionCategory = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Validation failed', errors.array());
  }

  const { id } = req.params;
  const { name, icon_url, is_active } = req.body;

  const category = await SubscriptionCategory.findByPk(id);
  if (!category) throw new ApiError(404, 'Subscription category not found');

  await category.update({
    name: name === undefined ? category.name : String(name).trim(),
    icon_url: icon_url === undefined ? category.icon_url : (String(icon_url).trim() ? String(icon_url).trim() : null),
    is_active: is_active === undefined ? category.is_active : Boolean(is_active),
  });

  res.status(200).json(new ApiResponse(200, { category: sanitize(category) }, 'Subscription category updated successfully'));
});

// @desc    Delete subscription category
// @route   DELETE /api/v1/subscription-categories/:id
// @access  Private (superadmin)
exports.deleteSubscriptionCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const category = await SubscriptionCategory.findByPk(id);
  if (!category) throw new ApiError(404, 'Subscription category not found');

  await category.destroy();

  res.status(200).json(new ApiResponse(200, null, 'Subscription category deleted successfully'));
});

// @desc    Toggle subscription category active status
// @route   PATCH /api/v1/subscription-categories/:id/toggle-status
// @access  Private (superadmin)
exports.toggleSubscriptionCategoryStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const category = await SubscriptionCategory.findByPk(id);
  if (!category) throw new ApiError(404, 'Subscription category not found');

  await category.update({ is_active: !category.is_active });

  res.status(200).json(
    new ApiResponse(
      200,
      { category: sanitize(category) },
      `Subscription category status set to ${category.is_active ? 'active' : 'inactive'} successfully`
    )
  );
});
