const express = require("express");
const { body } = require("express-validator");
const {
  getAllUsers,
  getUserById,
  getMyProfile,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
  searchUsers,
  searchCustomers,
  createCompanyEmployee,
  getCompanyEmployees,
  grantEmployeeEnergyPoints,
} = require("../controllers/userController");
const auth = require("../middleware/auth");
const authorize = require("../middleware/authorize");

const router = express.Router();

// Validation rules
// Create user (admin-only) - aligned with User model and createUser controller
const createUserValidation = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters"),
  body("username")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Username must be between 2 and 50 characters"),
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
  body("phone")
    .optional()
    .isMobilePhone()
    .withMessage("Please provide a valid phone number"),
  body("role")
    .optional()
    .isIn(["superadmin", "companyadmin", "merchant", "user"])
    .withMessage("Role must be superadmin, companyadmin, merchant, or user"),
];

const updateUserValidation = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage(" name must be between 2 and 50 characters"),
  body("username")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("username must be between 2 and 50 characters"),
  body("phone")
    .optional()
    .isMobilePhone()
    .withMessage("Please provide a valid phone number"),
];

// Validation for company employee creation (company admin)
const createEmployeeValidation = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters"),
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
  body("phone")
    .optional()
    .isMobilePhone()
    .withMessage("Please provide a valid phone number"),
  body("gender")
    .optional()
    .isIn(["male", "female"])
    .withMessage("Gender must be either male or female"),
];

const grantEnergyPointsValidation = [
  body("energy_points")
    .exists()
    .withMessage("energy_points is required")
    .isFloat({ gt: 0 })
    .withMessage("energy_points must be greater than 0"),
];

// Routes
router.get("/", auth, authorize("superadmin"), getAllUsers);
router.get("/search", auth, authorize("superadmin"), searchUsers);
router.get(
  "/employees",
  auth,
  authorize("superadmin", "companyadmin"),
  getCompanyEmployees
);
router.get("/me", auth, getMyProfile);
router.get("/:id", auth, getUserById);
//router.get("/search-customers", auth, authorize(""), searchCustomers); 

// Admin-only user creation endpoint (used by SuperAdmin dashboard flows)
router.post("/", auth, authorize("superadmin"), createUserValidation, createUser);

// Company admin creates employees for their company
router.post(
  "/employees",
  auth,
  authorize("superadmin", "companyadmin"),
  createEmployeeValidation,
  createCompanyEmployee
);

// Company admin grants energy points to an employee (deducts company wallet)
router.post(
  "/employees/:id/grant-energy-points",
  auth,
  authorize("companyadmin"),
  grantEnergyPointsValidation,
  grantEmployeeEnergyPoints
);

router.put("/:id", auth, authorize("superadmin", "user"), updateUser);
router.delete("/:id", auth, authorize("superadmin"), deleteUser);
router.patch("/:id/toggle-status", auth, authorize("superadmin", "companyadmin"), toggleUserStatus);

module.exports = router;
