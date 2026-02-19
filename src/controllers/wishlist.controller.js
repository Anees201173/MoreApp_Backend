const { Product, ProductWishlist } = require('../models');

const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

// @desc    Get my wishlist products
// @route   GET /api/v1/wishlist/products
// @access  Private
const getMyWishlistProducts = asyncHandler(async (req, res) => {
  const items = await ProductWishlist.findAll({
    where: { user_id: req.user.id },
    include: [
      {
        model: Product,
        as: 'product',
      },
    ],
    order: [['createdAt', 'DESC']],
  });

  res
    .status(200)
    .json(new ApiResponse(200, { items }, 'Wishlist retrieved successfully'));
});

// @desc    Add a product to wishlist
// @route   POST /api/v1/wishlist/products/:productId
// @access  Private
const addProductToWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const productIdNum = Number(productId);

  if (!Number.isFinite(productIdNum) || productIdNum <= 0) {
    throw new ApiError(400, 'productId must be a valid number');
  }

  const product = await Product.findByPk(productIdNum);
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  const [row] = await ProductWishlist.findOrCreate({
    where: {
      user_id: req.user.id,
      product_id: productIdNum,
    },
    defaults: {
      user_id: req.user.id,
      product_id: productIdNum,
    },
  });

  res.status(201).json(
    new ApiResponse(
      201,
      { wished: true, item: row },
      'Product added to wishlist successfully'
    )
  );
});

// @desc    Remove a product from wishlist (unwishlist)
// @route   DELETE /api/v1/wishlist/products/:productId
// @access  Private
const removeProductFromWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const productIdNum = Number(productId);

  if (!Number.isFinite(productIdNum) || productIdNum <= 0) {
    throw new ApiError(400, 'productId must be a valid number');
  }

  await ProductWishlist.destroy({
    where: {
      user_id: req.user.id,
      product_id: productIdNum,
    },
  });

  res
    .status(200)
    .json(new ApiResponse(200, { wished: false }, 'Product removed from wishlist successfully'));
});

// @desc    Check if a product is wishlisted by me
// @route   GET /api/v1/wishlist/products/:productId/status
// @access  Private
const getWishlistStatus = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const productIdNum = Number(productId);

  if (!Number.isFinite(productIdNum) || productIdNum <= 0) {
    throw new ApiError(400, 'productId must be a valid number');
  }

  const existing = await ProductWishlist.findOne({
    where: {
      user_id: req.user.id,
      product_id: productIdNum,
    },
  });

  res
    .status(200)
    .json(new ApiResponse(200, { wished: !!existing }, 'Wishlist status retrieved successfully'));
});

module.exports = {
  getMyWishlistProducts,
  addProductToWishlist,
  removeProductFromWishlist,
  getWishlistStatus,
};
