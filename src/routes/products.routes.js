const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const authorize = require('../middleware/authorize');
const auth = require('../middleware/auth');

const { createProduct, getAllProducts, getProductById, updateProduct, deleteProduct, toggleProductStatus, getUserProduct, uploadProductImages } = require('../controllers/product.controller');
const { array } = require('../middleware/multer');


// ===================== Validators ===================== //

// Create Product Validators
const createValidators = [
    body('title')
        .trim()
        .notEmpty().withMessage('Product title is required')
        .isLength({ min: 2 }).withMessage('Product title must be at least 2 characters'),

    body('description')
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ min: 2 }).withMessage('Product description must be at least 2 characters'),

    body('price')
        .notEmpty().withMessage('Price is required')
        .isNumeric().withMessage('Price must be a number'),

    body('quantity')
        .notEmpty().withMessage('Quantity is required')
        .isInt({ min: 0 }).withMessage('Quantity must be a positive integer'),

    body('category_id')
        .notEmpty().withMessage('category_id is required')
        .isInt().withMessage('category_id must be an integer'),

    body('size')
        .optional()
        .isString().withMessage('Size must be a string'),

    body('color')
        .optional()
        .isString().withMessage('Color must be a string'),

    body('discount_percentage')
        .optional()
        .isInt({ min: 0, max: 100 }).withMessage('Discount must be between 0 and 100'),

    body('images')
        .optional()
        .isArray().withMessage('Images should be an array of URLs'),
];


// Update Product Validators
const updateValidators = [
    body('title')
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ min: 2 }).withMessage('Product title must be at least 2 characters'),

    body('description')
        .trim()
        .optional()
        .isLength({ min: 2 }).withMessage('Product description must be at least 2 characters'),

    body('price')
        .optional()
        .isNumeric().withMessage('Price must be a number'),

    body('quantity')
        .optional()
        .isInt({ min: 0 }).withMessage('Quantity must be a positive integer'),

    body('category_id')
        .optional()
        .isInt().withMessage('category_id must be an integer'),

    body('size')
        .optional()
        .isString(),

    body('color')
        .optional()
        .isString(),

    body('discount_percentage')
        .optional()
        .isInt({ min: 0, max: 100 }),

    body('images')
        .optional()
        .isArray(),
];


// ===================== Product Routes ===================== //
// Only Merchant can create products
router.post('/', auth, authorize('merchant'), createValidators, createProduct);
router.get('/', auth, getAllProducts);
router.get('/:id', auth, getProductById);
router.get('/user/:merchant_id', auth, getUserProduct)
router.put('/:id', auth, authorize('merchant'), updateValidators, updateProduct);
router.delete('/:id', auth, authorize('merchant'), deleteProduct);
router.patch('/:id/toggle-status', auth, authorize('superadmin', 'merchant'), toggleProductStatus);

// upload product images (multiple)
router.post('/:id/upload', auth, authorize('superadmin', 'merchant'), array('images', 10), uploadProductImages);


module.exports = router;
