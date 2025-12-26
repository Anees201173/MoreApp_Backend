const express = require('express')
const { body } = require('express-validator')
const router = express.Router()
const authorize = require('../middleware/authorize')
const auth = require('../middleware/auth')
const { createCompany,
    getAllCompanies,
    getCompanyById,
    updateCompany,
    deleteCompany,
    toggleCompanyStatus,
    uploadCompany } = require('../controllers/comapny.controller')
const { single } = require('../middleware/multer');

// ===================== Validators ===================== //

// create company validators
const createValidators = [
    body('name')
        .trim()
        .notEmpty().withMessage('Company name is required')
        .isLength({ min: 2 }).withMessage('Company name must be at least 2 characters'),

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
];

// update company validators 
const updateValidators = [
    body('name')
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ min: 2 }).withMessage('Company name must be at least 2 characters')
        .matches(/^[A-Za-z0-9\s&.-]+$/).withMessage('Company name contains invalid characters'),
    body('phone')
        .optional({ checkFalsy: true })
        .isMobilePhone().withMessage('Invalid phone number format'),
    body('address')
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ min: 5 }).withMessage('Address must be at least 5 characters long')
];

// ===================== Routes ===================== //

router.post('/', auth, authorize('superadmin'), createValidators, createCompany)
router.get('/', auth, getAllCompanies)
router.get('/:id', auth, authorize('superadmin', 'companyadmin'), getCompanyById)
router.put('/:id', auth, authorize('superadmin', 'companyadmin'), updateValidators, updateCompany)
router.delete('/:id', auth, authorize("superadmin"), deleteCompany)
router.patch('/:id/toggle-status', auth, authorize('superadmin'), toggleCompanyStatus)

// upload route
router.post('/:id/upload', auth, authorize('superadmin', 'companyadmin'), single('image'), uploadCompany)



module.exports = router