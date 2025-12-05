const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const authorize = require('../middleware/authorize');
const auth = require('../middleware/auth');

const { createProduct, getAllProducts, getProductById, updateProduct, deleteProduct, toggleProductStatus, getUserProduct } = require('../controllers/product.controller');


// ===================== Validators ===================== //

// Create Product Validators
const createValidators = [
    body('name')
        .trim()
        .notEmpty().withMessage('Product name is required')
        .isLength({ min: 2 }).withMessage('Product name must be at least 2 characters'),

    body('description')
        .trim()
        .notEmpty().withMessage('Product description is required')
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

    body('energy_points')
        .optional()
        .isInt({ min: 0 }).withMessage('Energy points must be a positive integer'),

    body('uploads')
        .optional()
        .isArray().withMessage('Uploads should be an array of file URLs'),
];


// Update Product Validators
const updateValidators = [
    body('name')
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ min: 2 }).withMessage('Product name must be at least 2 characters'),

    body('description')
        .trim()
        .optional()
        .notEmpty().withMessage('Product description is required')
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

    body('energy_points')
        .optional()
        .isInt({ min: 0 }),

    body('uploads')
        .optional()
        .isArray(),
];


// ===================== Product Routes ===================== //
// Only Merchant can create products
router.post('/', auth, authorize('marchent'), createValidators, createProduct);
router.get('/', auth, getAllProducts);
router.get('/:id', auth, getProductById);
router.get('/user/:merchant_id', auth, getUserProduct)
router.put('/:id', auth, authorize('marchent'), updateValidators, updateProduct);
router.delete('/:id', auth, authorize('marchent'), deleteProduct);
router.patch('/:id/toggle-status', auth, authorize('superadmin', 'marchent'), toggleProductStatus);


module.exports = router;
