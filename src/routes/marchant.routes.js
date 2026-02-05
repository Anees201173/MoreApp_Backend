const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const authorize = require('../middleware/authorize');
const auth = require('../middleware/auth');
const {
    createMerchant,
    getAllMerchants,
    getMerchantById,
    updateMerchant,
    deleteMerchant,
    toggleMerchantStatus
} = require('../controllers/marchant.controller');
const { single } = require('../middleware/multer');
const { uploadMerchant } = require('../controllers/marchant.controller');
const {
    getFieldAvailability,
    setFieldAvailability,
    getFieldClosures,
    addFieldClosure,
    deleteFieldClosure
} = require('../controllers/fieldAvailability.controller');

// ===================== Validators ===================== //

// create merchant validators
const createValidators = [
    body('name')
        .trim()
        .notEmpty().withMessage('Merchant name is required')
        .isLength({ min: 2 }).withMessage('Merchant name must be at least 2 characters'),

    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Invalid email format'),

    body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),

    body('confirm_password')
        .notEmpty().withMessage('Confirm password is required')
        .custom((value, { req }) => value === req.body.password)
        .withMessage('Passwords do not match'),

    body('phone')
        .optional()
        .isMobilePhone().withMessage('Invalid phone number'),

    body('address')
        .trim()
        .notEmpty().withMessage('Address is required'),

    body('admin_id')
        .optional()
        .isInt().withMessage('Admin ID must be an integer')
];

// update merchant validators
const updateValidators = [
    body('name')
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ min: 2 }).withMessage('Merchant name must be at least 2 characters')
        .matches(/^[A-Za-z0-9\s&.-]+$/).withMessage('Merchant name contains invalid characters'),

    body('phone')
        .optional({ checkFalsy: true })
        .isMobilePhone().withMessage('Invalid phone number format'),

    body('address')
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ min: 5 }).withMessage('Address must be at least 5 characters long'),

    body('admin_id')
        .optional()
        .isInt().withMessage('Admin ID must be an integer')
];

// ===================== Admin Routes ===================== //

router.post('/', auth, authorize('superadmin'), createValidators, createMerchant);
router.get('/', auth, getAllMerchants);
router.get('/:id', auth, authorize('superadmin', 'merchant'), getMerchantById);
router.put('/:id', auth, authorize('superadmin', 'merchant'), updateValidators, updateMerchant);
router.delete('/:id', auth, authorize('superadmin'), deleteMerchant);
router.patch('/:id/toggle-status', auth, authorize('superadmin'), toggleMerchantStatus);


// ===================== Merchants Routes =================== // 

// upload route
router.post('/:id/upload', auth, authorize('superadmin', 'merchant'), single('image'), uploadMerchant);

// ===================== Merchant Field Availability ===================== //
// Alias endpoints for merchant panel (canonical endpoints live under /api/v1/fields)
router.get('/fields/:id/availability', auth, authorize('superadmin', 'merchant'), getFieldAvailability);
router.put('/fields/:id/availability', auth, authorize('superadmin', 'merchant'), setFieldAvailability);
router.get('/fields/:id/closures', auth, authorize('superadmin', 'merchant'), getFieldClosures);
router.post('/fields/:id/closures', auth, authorize('superadmin', 'merchant'), addFieldClosure);
router.delete('/fields/:id/closures/:date', auth, authorize('superadmin', 'merchant'), deleteFieldClosure);

module.exports = router;
