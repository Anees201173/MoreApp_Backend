const jwt = require("jsonwebtoken");
const { User } = require("../models");
const config = require("../config/config");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

const auth = asyncHandler(async (req, res, next) => {
  let token;

  // Get token from header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  // Make sure token exists
  if (!token) {
    throw new ApiError(401, "Not authorized to access this route");
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret);
    console.log("decoded", decoded);

    // Get user from token
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ["password"] },
    });

    if (!user) {
      throw new ApiError(401, "No user found with this token");
    }
    // console.log("user", user)
    // Check if user is active
    if (!user.is_active) {
      throw new ApiError(401, "User account is deactivated");
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new ApiError(401, "Token expired, please login again");
    }

    // 🔥 Let other authorization errors pass through
    throw error;
  }
});

module.exports = auth;
