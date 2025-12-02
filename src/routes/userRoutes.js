const express = require("express");
const { body } = require("express-validator");
const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
  searchUsers,
  searchCustomers,
} = require("../controllers/userController");
const auth = require("../middleware/auth");
const authorize = require("../middleware/authorize");

const router = express.Router();

// Validation rules
const createUserValidation = [
  body("first_name")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("First name must be between 2 and 50 characters"),
  body("last_name")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Last name must be between 2 and 50 characters"),
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
    .isIn(["admin", "member", "customer"])
    .withMessage("Role must be admin, member, or customer"),
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

// Routes
router.get("/", auth, authorize("superadmin"), getAllUsers);
router.get("/:id", auth, getUserById);
router.get("/search", auth, authorize("superadmin"), searchUsers);
//router.get("/search-customers", auth, authorize(""), searchCustomers); 
// router.post("/", createUserValidation, createUser);
router.put("/:id", auth, authorize("superadmin", "user"), updateUserValidation, updateUser);
router.delete("/:id", auth, authorize("superadmin"), deleteUser);
router.patch("/:id/toggle-status", auth, authorize("superadmin"), toggleUserStatus);

module.exports = router;
