const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const authorize = require('../middleware/authorize');
const auth = require('../middleware/auth');

const {
    createCategory,
    getAllCategories,
    getCategoryById,
    updateCategory,
    deleteCategory,
    toggleCategoryStatus
} = require('../controllers/category.controller');


// ===================== Validators ===================== //

// create category validators
const createValidators = [
    body('name')
        .trim()
        .notEmpty().withMessage('Category name is required')
        .isLength({ min: 2 }).withMessage('Category name must be at least 2 characters'),

    body('description')
        .trim()
        .notEmpty().withMessage('Description is required')
        .isLength({ min: 2, max: 255 }).withMessage('Description must be between 2 and 255 characters'),

    body('admin_id')
        .notEmpty().withMessage('admin_id is required')
        .isInt().withMessage('admin_id must be an integer')
];

// update category validators
const updateValidators = [
    body('name')
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ min: 2 }).withMessage('Category name must be at least 2 characters'),

    body('description')
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ min: 2, max: 255 }).withMessage('Description must be between 2 and 255 characters'),

    body('admin_id')
        .optional()
        .isInt().withMessage('admin_id must be an integer')
];


// ===================== Admin - Category Routes ===================== //

// Create Category – Superadmin only
router.post('/', auth, authorize('superadmin'), createValidators, createCategory);
router.get('/', auth, getAllCategories);
router.get('/:id', auth, getCategoryById);
router.put('/:id', auth, authorize('superadmin',), updateValidators, updateCategory);
router.delete('/:id', auth, authorize('superadmin'), deleteCategory);
router.patch('/:id/toggle-status', auth, authorize('superadmin'), toggleCategoryStatus);

module.exports = router;
