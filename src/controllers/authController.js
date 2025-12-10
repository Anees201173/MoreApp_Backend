const jwt = require("jsonwebtoken");
const { User } = require("../models");
const { validationResult } = require("express-validator");
const config = require("../config/config");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const { generateOTP, sanitizeObject } = require("../utils/helpers");
const { sendPasswordResetEmail } = require("../utils/email");
const { json } = require("sequelize");

// Generate JWT token
const generateToken = (userId, role) => {
  return jwt.sign({ id: userId, role }, config.jwt.secret, {
    expiresIn: config.jwt.expire,
  });
};

// @desc    Register a new user
// @route   POST /api/v1/auth/register
// @access  Public
const register = asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, "Validation failed", errors.array());
  }

  const {
    name,
    username,
    email,
    password,
    phone,
    role,
    gender,
    country,
    city,
  } = req.body;

  // Check if email exists
  let user = await User.findByEmail(email);

  if (user) {
    // If email exists but not verified, resend OTP
    if (!user.email_verified) {
      const otp = generateOTP(6).toUpperCase();
      const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

      user.otp = otp;
      user.otpType = "register";
      user.otpExpires = otpExpires;
      await user.save();

      console.log(`Resent OTP for ${email}: ${otp}`);
      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            { email: user.email },
            `Registration OTP resent to ${email}. Verify to complete registration`
          )
        );
    }

    // If email exists and verified, reject
    throw new ApiError(400, "User already exists with this email");
  }

  // Check if username already exists
  const existingUserName = await User.findByUserName(username);
  if (existingUserName) {
    throw new ApiError(400, "Username taken, choose another username");
  }

  // Generate OTP for new user
  const otp = generateOTP(6).toUpperCase();
  const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

  // Create new user (unverified)
  user = await User.create({
    name,
    username,
    email,
    password,
    phone,
    role,
    gender,
    country,
    city,
    email_verified: false,
    otp: otp,
    otpType: "register",
    otpExpires: otpExpires,
  });

  console.log(`OTP for ${email}: ${otp}`);
  res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { email: user.email },
        `Registration OTP sent to ${email}. Verify to complete registration`
      )
    );
});

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, "Validation failed", errors.array());
  }

  const { email, password } = req.body;

  // Find user by email
  const user = await User.findByEmail(email);
  if (!user) {
    throw new ApiError(401, "Invalid credentials");
  }

  // Check if user is active
  if (!user.is_active) {
    throw new ApiError(401, "Account is deactivated");
  }

  // Validate password
  const isValidPassword = await user.validatePassword(password);
  if (!isValidPassword) {
    throw new ApiError(401, "Invalid credentials");
  }

  // Update last login
  await user.update({ last_login: new Date() });

  // Sanitize user object before sending
  const sanitizedUser = sanitizeObject(user.toJSON(), [
    "password",
    "otp",
    "otpExpires",
    "otpType",
    "refreshToken", // optional, if you store it in DB
  ]);

  // Generate token
  const token = generateToken(user.id, user.role);
  // const refreshToken = generateRefreshToken(user.id);
  // await user.update({ refreshToken });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        sanitizedUser,
        token,
        // refreshToken
      },
      "Login successful"
    )
  );
});

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.user.id);

  // Sanitize user object before sending
  const sanitizedUser = sanitizeObject(user.toJSON(), [
    "password",
    "otp",
    "otpExpires",
    "otpType",
    "refreshToken", // optional, if you store it in DB
  ]);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  res
    .status(200)
    .json(
      new ApiResponse(200, { sanitizedUser }, "Profile retrieved successfully")
    );
});

// @desc    Update user profile
// @route   PUT /api/v1/auth/update
// @access  Private
const updateProfile = asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, "Validation failed", errors.array());
  }

  const { name, username, phone, role } = req.body;

  const user = await User.findByPk(req.user.id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Update user
  await user.update({
    name: name || user.name,
    username: username || user.username,
    phone: phone || user.phone,
    role: role || user.role,
  });

  res
    .status(200)
    .json(new ApiResponse(200, { user }, "Profile updated successfully"));
});

// @desc    Change password
// @route   PUT /api/v1/auth/change-password
// @access  Private
const changePassword = asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, "Validation failed", errors.array());
  }

  const { current_password, new_password, confirm_password } = req.body;

  const user = await User.findByPk(req.user.id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Validate current password
  const isValidPassword = await user.validatePassword(current_password);
  if (!isValidPassword) {
    throw new ApiError(400, "Current password is incorrect");
  }

  // check confirm Password
  if (!new_password === confirm_password) {
    throw new ApiError(400, "password and confirm password must be same");
  }

  // Update password
  await user.update({ password: new_password });

  res
    .status(200)
    .json(new ApiResponse(200, null, "Password changed successfully"));
});

// @desc    forget password
// @route   PUT /api/auth/forget-password
// @access  Private
const forgetPassword = asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, "Validation failed", errors.array());
  }

  const { email } = req.body;
  const user = await User.findByEmail(email);
  // check if user exists
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const otp = generateOTP(4).toUpperCase();
  const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes from now

  user.otp = otp;
  user.otpType = "reset";
  user.otpExpires = new Date(otpExpires);
  await user.save();

  await sendPasswordResetEmail(user, otp);
  console.log("here is otp", otp);

  res.status(200).json(new ApiResponse(200, null, "Password reset email sent"));
});

// @desc    verify otp
// @route   PUT /api/auth/verify-otp
// @access  public
const verifyOtp = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, "Validation failed", errors.array());
  }

  const { email, otp } = req.body;

  // Check user exists and OTP stored
  const user = await User.findByEmail(email);
  if (!user || !user.otp || !user.otpExpires) {
    throw new ApiError(400, "Invalid or expired OTP");
  }

  // Validate OTP and expiration
  if (
    user.otp.toUpperCase() !== otp.toUpperCase() ||
    user.otpExpires < Date.now()
  ) {
    throw new ApiError(400, "Invalid or expired OTP");
  }

  let token = null;

  // Registration verification
  if (user.otpType === "register") {
    user.email_verified = true;
    token = generateToken(user.id, user.role);
  }
  // Login OTP verification
  else if (user.otpType === "login") {
    token = generateToken(user.id, user.role);
  }
  // Reject anything else e.g. reset
  else {
    throw new ApiError(400, "OTP type not valid for login/register");
  }

  // Clear OTP fields after success
  user.otp = null;
  user.otpExpires = null;
  user.otpType = null;
  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, { token }, "OTP verified successfully"));
});

// @desc    reset password
// @route   PUT /api/auth/reset-password
// @access  Private
const resetPassword = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, "Validation failed", errors.array());
  }

  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    throw new ApiError(401, "Missing or invalid authorization token");
  }
  const token = authHeader.split(" ")[1];

  let decoded;
  try {
    decoded = jwt.verify(token, config.jwt.secret);
  } catch (err) {
    if (err && err.name === "TokenExpiredError") {
      throw new ApiError(400, "Reset token has expired");
    }
    throw new ApiError(400, "Invalid reset token");
  }

  if (decoded.type !== "password-reset") {
    throw new ApiError(400, "Invalid reset token");
  }

  const { new_password, confirm_password } = req.body;
  if (new_password !== confirm_password) {
    throw new ApiError(400, "New password and confirm password do not match");
  }

  const user = await User.findByPk(decoded.userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  await user.update({ password: new_password });

  res.status(200).json(new ApiResponse(200, null, "Password reset successful"));
});

// const refreshAccessToken = asyncHandler(async (req, res) => {
//   const errors = validationResult(req);
//   if (!errors.isEmpty()) {
//     throw new ApiError(400, 'Validation failed', errors.array());
//   }

//   const { refresh_token } = req.body;
//   if (!refresh_token) {
//     throw new ApiError(400, 'Refresh token is required');
//   }

//   let decoded;
//   try {
//     decoded = jwt.verify(refresh_token, config.jwt.secret);
//   } catch (err) {
//     if (err && err.name === 'TokenExpiredError') {
//       throw new ApiError(401, 'Refresh token expired');
//     }
//     throw new ApiError(401, 'Invalid refresh token');
//   }

//   if (decoded.type !== 'refresh') {
//     throw new ApiError(401, 'Invalid refresh token');
//   }

//   const user = await User.findByPk(decoded.userId);
//   if (!user || !user.refreshToken) {
//     throw new ApiError(401, 'Refresh token not found');
//   }

//   if (user.refreshToken !== refresh_token) {
//     throw new ApiError(401, 'Refresh token mismatch');
//   }

//   // Rotate refresh token
//   const newRefreshToken = generateRefreshToken(user.id);
//   await user.update({ refreshToken: newRefreshToken });

//   // Issue new access token
//   const newAccessToken = generateToken(user.id);

//   res.status(200).json(
//     new ApiResponse(200, {
//       token: newAccessToken,
//       refreshToken: newRefreshToken
//     }, 'Token refreshed successfully')
//   );
// });

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  forgetPassword,
  verifyOtp,
  resetPassword,
  generateToken,
};
