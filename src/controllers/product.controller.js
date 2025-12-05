const { Product, Category, User } = require('../models');
const { Op } = require('sequelize');
const { validationResult } = require('express-validator');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { getPagination, getPagingData } = require('../utils/pagination');
const { sanitizeObject } = require('../utils/helpers');

// Helper: sanitize product output
const sanitizeProduct = (product) =>
    sanitizeObject(product.toJSON(), []);

// ----------------------------------------------------
// @desc     Create Product
// @route    POST /api/v1/products
// @access   Private (Only Merchant)
// ----------------------------------------------------
exports.createProduct = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new ApiError(400, 'Validation failed', errors.array());
    }

    // Only merchants can create products
    if (req.user.role !== 'merchant') {
        throw new ApiError(403, "Only merchants can list products");
    }

    const { name, description, price, quantity, size, color,
        uploads, energyPoints, category_id
    } = req.body;

    // Check category exists & active
    const category = await Category.findByPk(category_id);
    if (!category || !category.is_active) {
        throw new ApiError(404, 'Category not found or inactive');
    }

    // Avoid duplicate product name for same merchant
    const existing = await Product.findOne({
        where: {
            name,
            user_id: req.user.id
        }
    });

    if (existing) {
        throw new ApiError(400, 'You already listed a product with this name');
    }

    const finalProduct = await Product.create({
        name,
        description,
        price,
        quantity,
        size,
        color,
        uploads,
        energyPoints,
        category_id,
        user_id: req.user.id,
    });

    res.status(201).json(
        new ApiResponse(
            201,
            { product: sanitizeProduct(finalProduct) },
            'Product created successfully'
        )
    );
});

// ----------------------------------------------------
// @desc     Get all products (pagination + filters)
// @route    GET /api/v1/products
// @access   Public (for ecommerce listing)
// ----------------------------------------------------
exports.getAllProducts = asyncHandler(async (req, res) => {
    const { page, size, search, category_id, user_id, status } = req.query;

    const { limit, offset } = getPagination(page, size);
    const whereClause = {};

    if (search) {
        whereClause[Op.or] = [
            { name: { [Op.iLike]: `%${search}%` } },
            { description: { [Op.iLike]: `%${search}%` } }
        ];
    }

    if (category_id) whereClause.category_id = category_id;
    if (user_id) whereClause.user_id = user_id;
    if (status !== undefined) whereClause.status = status === "true";

    const data = await Product.findAndCountAll({
        where: whereClause,
        limit,
        offset,
        order: [['id', 'DESC']]
    });

    const result = getPagingData(data, page, limit);

    res.status(200).json(
        new ApiResponse(200, result, 'Products retrieved successfully')
    );
});

// ----------------------------------------------------
// @desc     Get Product by ID
// @route    GET /api/v1/products/:id
// @access   Public
// ----------------------------------------------------
exports.getProductById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const product = await Product.findByPk(id);
    if (!product) throw new ApiError(404, 'Product not found');

    res.status(200).json(
        new ApiResponse(
            200,
            { product: sanitizeProduct(product) },
            'Product retrieved successfully'
        )
    );
});

// ----------------------------------------------------
// @desc     Update Product
// @route    PUT /api/v1/products/:id
// @access   Private (Merchant only, must own the product)
// ----------------------------------------------------
exports.updateProduct = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new ApiError(400, 'Validation failed', errors.array());
    }

    const { id } = req.params;

    const product = await Product.findByPk(id);
    if (!product) throw new ApiError(404, 'Product not found');

    // Only product owner (merchant) can update
    if (req.user.role !== 'merchant' || req.user.id !== product.user_id) {
        throw new ApiError(403, 'Not authorized to update this product');
    }

    const updated = await product.update(req.body);

    res.status(200).json(
        new ApiResponse(
            200,
            { product: sanitizeProduct(updated) },
            'Product updated successfully'
        )
    );
});

// ----------------------------------------------------
// @desc     Delete Product
// @route    DELETE /api/v1/products/:id
// @access   Private (Merchant only, must own)
// ----------------------------------------------------
exports.deleteProduct = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const product = await Product.findByPk(id);
    if (!product) throw new ApiError(404, 'Product not found');

    if (req.user.role !== 'merchant' || req.user.id !== product.user_id) {
        throw new ApiError(403, 'Not authorized to delete this product');
    }

    await product.destroy();

    res.status(200).json(
        new ApiResponse(200, null, 'Product deleted successfully')
    );
});

// ----------------------------------------------------
// @desc     Toggle Product Active/Inactive (for merchant)
// @route    PATCH /api/v1/products/:id/toggle-status
// @access   Private (Merchant only)
// ----------------------------------------------------
exports.toggleProductStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const product = await Product.findByPk(id);
    if (!product) throw new ApiError(404, 'Product not found');

    if (req.user.role !== 'merchant' || req.user.id !== product.user_id) {
        throw new ApiError(403, 'Not authorized');
    }

    await product.update({ status: !product.status });

    res.status(200).json(
        new ApiResponse(
            200,
            { product: sanitizeProduct(product) },
            `Product status set to ${product.status ? 'active' : 'inactive'}`
        )
    );
});
