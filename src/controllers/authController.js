const jwt = require("jsonwebtoken");
const { User } = require("../models");
const { validationResult } = require("express-validator");
const config = require("../config/config");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const { generateOTP, sanitizeObject } = require("../utils/helpers");
const { sendPasswordResetEmail } = require("../utils/email");

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, config.jwt.secret, {
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

  const { name, username, email, password, phone, role, gender, country, city } = req.body;

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
      return res.status(200).json(
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
    otpExpires: otpExpires
  });

  console.log(`OTP for ${email}: ${otp}`);
  res.status(201).json(
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
    'password',
    'otp',
    'otpExpires',
    'otpType',
    'refreshToken' // optional, if you store it in DB
  ]);

  // Generate token
  const token = generateToken(user.id);
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
    'password',
    'otp',
    'otpExpires',
    'otpType',
    'refreshToken' // optional, if you store it in DB
  ]);
 
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, { sanitizedUser }, "Profile retrieved successfully"));
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
  // check if user exists 
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const otp = generateOTP(4).toUpperCase();
  const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes from now

  user.opt = otp;
  user.otpExpires = new Date(otpExpires);
  await user.save();

  await sendPasswordResetEmail(user, otp);
  console.log("here is otp", opt);

  res.status(200).json(new ApiResponse(200, null, "Password reset email sent"));
});

const verifyOtp = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, "Validation failed", errors.array());
  }

  const { email, otp } = req.body;

  // check if email exists 
  const user = await User.findByEmail(email);
  if (!user || !user.otp || !user.otpExpires) {
    throw new ApiError(400, "Invalid or expired Otp");
  }
  // Otp validations 
  if (
    user.otp.toUpperCase() !== otp.toUpperCase() ||
    user.otpExpires < Date.now()
  ) {
    throw new ApiError(400, "Invalid or expired reset token");
  }



  // If OTP is for registration, mark email as verified
  if (user.otpType === "register") {
    user.email_verified = true;
  }

  // clear opt fields 
  user.otp = null;
  user.otpExpires = null;
  user.otpType = null
  await user.save();

  // Generate token (for password reset OTP only)
  let resetToken = null;
  if (user.otpType === "reset") {
    resetToken = jwt.sign(
      { userId: user.id, email: user.email },
      config.jwt.secret,
      { expiresIn: "10m" }
    );
  }

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
