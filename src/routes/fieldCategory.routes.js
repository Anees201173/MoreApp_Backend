const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const {
  createFieldCategory,
  getFieldCategories,
  getFieldCategoryById,
  updateFieldCategory,
  deleteFieldCategory,
  toggleFieldCategoryStatus,
} = require('../controllers/fieldCategory.controller');

const createValidators = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Field category name is required')
    .isLength({ min: 2 })
    .withMessage('Field category name must be at least 2 characters'),
  body('icon_url')
    .optional({ checkFalsy: true })
    .trim()
    .isURL()
    .withMessage('Icon URL must be a valid URL'),
];

const updateValidators = [];

// Superadmin creates/updates/deletes, others can read
router.post('/', auth, authorize('superadmin'), createValidators, createFieldCategory);
router.get('/', auth, getFieldCategories);
router.get('/:id', auth, getFieldCategoryById);
router.put('/:id', auth, authorize('superadmin'), updateValidators, updateFieldCategory);
router.delete('/:id', auth, authorize('superadmin'), deleteFieldCategory);
router.patch('/:id/toggle-status', auth, authorize('superadmin'), toggleFieldCategoryStatus);

module.exports = router;
