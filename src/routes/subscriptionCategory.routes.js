const express = require('express');
const { body } = require('express-validator');

const router = express.Router();

const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const {
  createSubscriptionCategory,
  getSubscriptionCategories,
  getSubscriptionCategoryById,
  updateSubscriptionCategory,
  deleteSubscriptionCategory,
  toggleSubscriptionCategoryStatus,
} = require('../controllers/subscriptionCategory.controller');

const createValidators = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Subscription category name is required')
    .isLength({ min: 2, max: 80 })
    .withMessage('Subscription category name must be between 2 and 80 characters'),
  body('icon_url')
    .optional({ checkFalsy: true })
    .trim()
    .isURL()
    .withMessage('Icon URL must be a valid URL'),
];

const updateValidators = [];

router.post('/', auth, authorize('superadmin'), createValidators, createSubscriptionCategory);
// Public reads (merchant/user apps need to load these for selection)
router.get('/', getSubscriptionCategories);
router.get('/:id', getSubscriptionCategoryById);
router.put('/:id', auth, authorize('superadmin'), updateValidators, updateSubscriptionCategory);
router.delete('/:id', auth, authorize('superadmin'), deleteSubscriptionCategory);
router.patch('/:id/toggle-status', auth, authorize('superadmin'), toggleSubscriptionCategoryStatus);

module.exports = router;
