const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const authorize = require('../middleware/authorize');
const auth = require('../middleware/auth');
const {
    createMarchant,
    getAllMarchants,
    getMarchantById,
    updateMarchant,
    deleteMarchant,
    toggleMarchantStatus
} = require('../controllers/marchant.controller');

// ===================== Validators ===================== //

// create marchant validators
const createValidators = [
    body('name')
        .trim()
        .notEmpty().withMessage('Marchant name is required')
        .isLength({ min: 2 }).withMessage('Marchant name must be at least 2 characters'),

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

// update marchant validators
const updateValidators = [
    body('name')
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ min: 2 }).withMessage('Marchant name must be at least 2 characters')
        .matches(/^[A-Za-z0-9\s&.-]+$/).withMessage('Marchant name contains invalid characters'),

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

router.post('/', auth, authorize('superadmin'), createValidators, createMarchant);
router.get('/', auth, getAllMarchants);
router.get('/:id', auth, authorize('superadmin', 'marchant'), getMarchantById);
router.put('/:id', auth, authorize('superadmin', 'marchant'), updateValidators, updateMarchant);
router.delete('/:id', auth, authorize('superadmin'), deleteMarchant);
router.patch('/:id/toggle-status', auth, authorize('superadmin'), toggleMarchantStatus);


// ===================== Marchants Routes =================== // 

module.exports = router;
