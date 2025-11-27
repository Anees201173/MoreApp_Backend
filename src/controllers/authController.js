const jwt = require("jsonwebtoken");
const { User } = require("../models");
const { validationResult } = require("express-validator");
const config = require("../config/config");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const { generateOTP } = require("../utils/helpers");
const { sendPasswordResetEmail } = require("../utils/email");

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, config.jwt.secret, {
    expiresIn: config.jwt.expire,
  });
};

const generateRefreshToken = (userId) => {
  // default to 30d if no specific refresh expiry provided
  const refreshExpire = process.env.JWT_REFRESH_EXPIRE || "30d";
  return jwt.sign({ userId, type: "refresh" }, config.jwt.secret, {
    expiresIn: refreshExpire,
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const register = asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, "Validation failed", errors.array());
  }

  const { first_name, last_name, email, password, phone, role, gender, country, city } = req.body;

  // Check if user already exists
  const existingUser = await User.findByEmail(email);
  if (existingUser) {
    throw new ApiError(400, "User already exists with this email");
  }

  // Create user
  const user = await User.create({
    first_name,
    last_name,
    email,
    password,
    phone,
    role,
  });

  // Generate token
  const token = generateToken(user.id);
  const refreshToken = generateRefreshToken(user.id);
  await user.update({ refreshToken });

  res.status(201).json(
    new ApiResponse(
      201,
      {
        user,
        token,
      },
      "User registered successfully"
    )
  );
});

// @desc    Login user
// @route   POST /api/auth/login
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

  // Generate token
  const token = generateToken(user.id);
  // const refreshToken = generateRefreshToken(user.id);
  // await user.update({ refreshToken });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        user,
        token,
        // refreshToken
      },
      "Login successful"
    )
  );
});

// @desc    Get current user profile
// @route   GET /api/auth/profile
// @access  Private
const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.user.id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, { user }, "Profile retrieved successfully"));
});

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, "Validation failed", errors.array());
  }

  const { first_name, last_name, phone } = req.body;

  const user = await User.findByPk(req.user.id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Update user
  await user.update({
    first_name: first_name || user.first_name,
    last_name: last_name || user.last_name,
    phone: phone || user.phone,
  });

  res
    .status(200)
    .json(new ApiResponse(200, { user }, "Profile updated successfully"));
});

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, "Validation failed", errors.array());
  }

  const { current_password, new_password } = req.body;

  const user = await User.findByPk(req.user.id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Validate current password
  const isValidPassword = await user.validatePassword(current_password);
  if (!isValidPassword) {
    throw new ApiError(400, "Current password is incorrect");
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
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const resetToken = generateOTP(4).toUpperCase();
  const resetTokenExpires = Date.now() + 10 * 60 * 1000; // 10 minutes from now

  user.resetPasswordToken = resetToken;
  user.resetPasswordExpires = new Date(resetTokenExpires);
  await user.save();

  await sendPasswordResetEmail(user, resetToken);
  console.log("here is reset token", resetToken);

  res.status(200).json(new ApiResponse(200, null, "Password reset email sent"));
});

const verifyOtp = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, "Validation failed", errors.array());
  }

  const { email, otp } = req.body;
  const user = await User.findByEmail(email);
  if (!user || !user.resetPasswordToken || !user.resetPasswordExpires) {
    throw new ApiError(400, "Invalid or expired reset token");
  }
  if (
    user.resetPasswordToken.toUpperCase() !== otp.toUpperCase() ||
    user.resetPasswordExpires < Date.now()
  ) {
    throw new ApiError(400, "Invalid or expired reset token");
  }

  // Update password and clear reset token
  const resetToken = jwt.sign(
    { userId: user.id, email: user.email },
    config.jwt.secret,
    { expiresIn: "10m" }
  );

  user.resetPasswordToken = null;
  user.resetPasswordExpires = null;
  await user.save();

  res
    .status(200)
    .json(new ApiResponse(200, { resetToken }, "OTP verified successfully"));
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
