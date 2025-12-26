const { Product, Category, User, Merchant } = require("../models");
const { Op } = require("sequelize");
const { validationResult } = require("express-validator");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const { getPagination, getPagingData } = require("../utils/pagination");
const { sanitizeObject } = require("../utils/helpers");

// Helper: sanitize product output
const sanitizeProduct = (product) => sanitizeObject(product.toJSON(), []);

// ----------------------------------------------------
// @desc     Create Product
// @route    POST /api/v1/products
// @access   Private (Only Merchant)
// ----------------------------------------------------
exports.createProduct = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, "Validation failed", errors.array());
  }

  // Only merchants can create products
  if (req.user.role !== "merchant") {
    throw new ApiError(403, "Only merchants can list products");
  }

  // find merchant record for this authenticated user
  const merchant = await Merchant.findOne({ where: { user_id: req.user.id } });
  if (!merchant)
    throw new ApiError(
      404,
      "Merchant profile not found. Create a merchant profile first."
    );

  const {
    title,
    name,
    description,
    price,
    quantity,
    size,
    color,
    images,
    uploads,
    category_id,
  } = req.body;

  const finalTitle = title || name;
  const finalImages = images || uploads;

  // Check category exists & active (Category uses `status`)
  const category = await Category.findByPk(category_id);
  if (!category || !category.status) {
    throw new ApiError(404, "Category not found or inactive");
  }

  // Avoid duplicate product title for same merchant
  const existing = await Product.findOne({
    where: {
      title: finalTitle,
      merchant_id: merchant.id,
    },
  });

  if (existing) {
    throw new ApiError(400, "You already listed a product with this title");
  }

  const finalProduct = await Product.create({
    title: finalTitle,
    description,
    price,
    quantity,
    size,
    color,
    images: finalImages,
    category_id,
    merchant_id: merchant.id,
  });

  res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { product: sanitizeProduct(finalProduct) },
        "Product created successfully"
      )
    );
});

// ----------------------------------------------------
// @desc     Get all products (pagination + filters)
// @route    GET /api/v1/products
// @access   Public (for ecommerce listing)
// ----------------------------------------------------
exports.getAllProducts = asyncHandler(async (req, res) => {
  const { page, size, search, category_id, merchant_id, status } = req.query;

  const { limit, offset } = getPagination(page, size);
  const whereClause = {};

  if (search) {
    whereClause[Op.or] = [
      { title: { [Op.iLike]: `%${search}%` } },
      { description: { [Op.iLike]: `%${search}%` } },
    ];
  }

  if (category_id) whereClause.category_id = category_id;
  if (merchant_id) whereClause.merchant_id = merchant_id;
  if (status !== undefined) whereClause.status = status === "true";

  const data = await Product.findAndCountAll({
    where: whereClause,
    limit,
    offset,
    order: [["id", "DESC"]],
  });

  const result = getPagingData(data, page, limit);

  res
    .status(200)
    .json(new ApiResponse(200, result, "Products retrieved successfully"));
});

// ----------------------------------------------------
// @desc     Get Product by ID
// @route    GET /api/v1/products/:id
// @access   Public
// ----------------------------------------------------
exports.getProductById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const product = await Product.findByPk(id);
  if (!product) throw new ApiError(404, "Product not found");

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { product: sanitizeProduct(product) },
        "Product retrieved successfully"
      )
    );
});

// ----------------------------------------------------
// @desc     Get products of a specific merchant (public)
// @route    GET /api/v1/products/user/:merchant_id
// @access   Public
// ----------------------------------------------------
exports.getUserProduct = asyncHandler(async (req, res) => {
  const { merchant_id } = req.params;
  const { page, size, search, category_id, status } = req.query;

  const { limit, offset } = getPagination(page, size);

  const merchant = await Merchant.findByPk(merchant_id);
  if (!merchant) {
    throw new ApiError(404, "Merchant not found");
  }

  const whereClause = { merchant_id: merchant_id };

  if (search) {
    whereClause[Op.or] = [
      { title: { [Op.iLike]: `%${search}%` } },
      { description: { [Op.iLike]: `%${search}%` } },
    ];
  }

  if (category_id) whereClause.category_id = category_id;
  if (status !== undefined) whereClause.status = status === "true";

  const data = await Product.findAndCountAll({
    where: whereClause,
    limit,
    offset,
    order: [["id", "DESC"]],
  });

  const result = getPagingData(data, page, limit);
  result.items = result.items.map(sanitizeProduct);

  // include merchant owner info from User model
  const owner = await User.findByPk(merchant.user_id);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        merchant: {
          id: merchant.id,
          user_id: merchant.user_id,
          owner_name: owner ? owner.name : null,
          owner_username: owner ? owner.username : null,
        },
        ...result,
      },
      "Merchant products retrieved successfully"
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
    throw new ApiError(400, "Validation failed", errors.array());
  }

  const { id } = req.params;

  const product = await Product.findByPk(id);
  if (!product) throw new ApiError(404, "Product not found");

  // Only product owner (merchant) can update
  if (req.user.role !== "superadmin") {
    if (req.user.role !== "merchant") {
      throw new ApiError(403, "Not authorized to update this product");
    }

    const merchant = await Merchant.findOne({
      where: { user_id: req.user.id },
    });
    if (!merchant || merchant.id !== product.merchant_id) {
      throw new ApiError(403, "Not authorized to update this product");
    }
  }

  // Prevent merchants from changing merchant_id
  const updatePayload = { ...req.body };
  if (req.user.role === "merchant") delete updatePayload.merchant_id;

  const updated = await product.update(updatePayload);

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { product: sanitizeProduct(updated) },
        "Product updated successfully"
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
  if (!product) throw new ApiError(404, "Product not found");
  if (req.user.role !== "superadmin") {
    if (req.user.role !== "merchant") {
      throw new ApiError(403, "Not authorized to delete this product");
    }

    const merchant = await Merchant.findOne({
      where: { user_id: req.user.id },
    });
    if (!merchant || merchant.id !== product.merchant_id) {
      throw new ApiError(403, "Not authorized to delete this product");
    }
  }

  await product.destroy();

  res
    .status(200)
    .json(new ApiResponse(200, null, "Product deleted successfully"));
});

// ----------------------------------------------------
// @desc     Toggle Product Active/Inactive (for merchant)
// @route    PATCH /api/v1/products/:id/toggle-status
// @access   Private (Merchant only)
// ----------------------------------------------------
exports.toggleProductStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const product = await Product.findByPk(id);
  if (!product) throw new ApiError(404, "Product not found");

  if (req.user.role !== "superadmin") {
    if (req.user.role !== "merchant") {
      throw new ApiError(403, "Not authorized");
    }

    const merchant = await Merchant.findOne({
      where: { user_id: req.user.id },
    });
    if (!merchant || merchant.id !== product.merchant_id) {
      throw new ApiError(403, "Not authorized");
    }
  }

  await product.update({ status: !product.status });

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { product: sanitizeProduct(product) },
        `Product status set to ${product.status ? "active" : "inactive"}`
      )
    );
});

// ----------------------------------------------------
// @desc     Upload product images
// @route    POST /api/v1/products/:id/upload
// @access   Private (merchant who owns product or superadmin)
// ----------------------------------------------------
exports.uploadProductImages = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const product = await Product.findByPk(id);
  if (!product) throw new ApiError(404, 'Product not found');

  // authorization: superadmin or the merchant owner
  if (req.user.role !== 'superadmin') {
    if (req.user.role !== 'merchant') throw new ApiError(403, 'Not authorized');

    const merchant = await Merchant.findOne({ where: { user_id: req.user.id } });
    if (!merchant || merchant.id !== product.merchant_id) {
      throw new ApiError(403, 'Not authorized to upload images for this product');
    }
  }

  const files = req.files || [];
  if (!files.length) throw new ApiError(400, 'No files uploaded');

  const urls = files.map((f) => f.path || f.secure_url || f.url).filter(Boolean);
  if (!urls.length) throw new ApiError(500, 'Uploaded files missing URLs');

  const images = Array.isArray(product.images) ? product.images.slice() : [];
  images.push(...urls);
  await product.update({ images });

  res.status(200).json(new ApiResponse(200, { images: product.images }, 'Product images uploaded successfully'));
});
