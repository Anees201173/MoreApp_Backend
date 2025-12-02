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
    toggleCompanyStatus } = require('../controllers/comapny.controller')


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
        .optional()
        .trim()
        .notEmpty().withMessage('Company name is required')
        .isLength({ min: 2 }).withMessage('Company name must be at least 2 characters'),
    body('phone')
        .optional()
        .isMobilePhone().withMessage('Invalid phone number'),
]


router.post('/', auth, authorize('superadmin'), createValidators, createCompany)
router.get('/', auth, authorize('superadmin'), updateValidators, getAllCompanies)
router.get('/:id', auth, authorize('superadmin', 'companyadmin', getCompanyById))
router.put('/:id', auth, authorize('superadmin', 'companyadmin'), updateCompany)
router.delete('/:id', auth, authorize("superadmin"), deleteCompany)
router.patch('/:id/toggle-status', auth, authorize('superadmin'), toggleCompanyStatus)



module.exports = router