const express = require("express");
const { body } = require("express-validator");
const {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  forgetPassword,
  verifyOtp,
  resetPassword,
} = require("../controllers/authController");
const auth = require("../middleware/auth");

const router = express.Router();

// Validation rules
const registerValidation = [
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

  body("gender")
    .isIn(["male", "female"])
    .withMessage("Gender must be either male or female"),

  body("role")
    .optional()
    .isIn(["superadmin", "companyadmin", "merchant", "user"])
    .withMessage("Role must be one of admin, customer, member, or user"),

  body("country")
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage("Country must be between 2 and 100 characters"),

  body("city")
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage("City must be between 2 and 100 characters"),
];

const loginValidation = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),
  body("password").notEmpty().withMessage("Password is required"),
];

const updateProfileValidation = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("First name must be between 2 and 50 characters"),
  body("username")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Last name must be between 2 and 50 characters"),
  body("phone")
    .optional()
    .isMobilePhone()
    .withMessage("Please provide a valid phone number"),
];

const changePasswordValidation = [
  body("current_password")
    .notEmpty()
    .withMessage("Current password is required"),

  body("new_password")
    .isLength({ min: 6 })
    .withMessage("New password must be at least 6 characters long"),

  body("confirm_password")
    .notEmpty()
    .withMessage("Confirm password is required")
    .custom((value, { req }) => {
      if (value !== req.body.new_password) {
        throw new Error("Confirm password does not match new password");
      }
      return true;
    }),
];

const forgetPasswordValidation = [
  body("email").isEmail().withMessage("Valid email is required"),
];

const verifyOtpValidation = [
  body("email").isEmail().withMessage("Valid email is required"),
  body("otp").isLength({ min: 4, max: 8 }).withMessage("Valid OTP is required"),
];

const resetPasswordValidation = [
  body("new_password")
    .isLength({ min: 6 })
    .withMessage("New password must be at least 6 characters"),
  body("confirm_password")
    .isLength({ min: 6 })
    .withMessage("Confirm password must be at least 6 characters")
    .custom((value, { req }) => value === req.body.new_password)
    .withMessage("Confirm password must match new password"),
];

// Routes
router.post("/register", registerValidation, register);
router.post("/login", loginValidation, login);
router.get("/me", auth, getProfile);
router.put("/update", auth, updateProfileValidation, updateProfile);
router.patch(
  "/change-password",
  auth,
  changePasswordValidation,
  changePassword
);
router.post("/forget-password", forgetPasswordValidation, forgetPassword);
router.post("/verify-otp", verifyOtpValidation, verifyOtp);
router.patch("/reset-password", auth, resetPasswordValidation, resetPassword);

module.exports = router;
