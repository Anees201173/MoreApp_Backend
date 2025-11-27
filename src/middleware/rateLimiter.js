const rateLimit = require('express-rate-limit');
const config = require('../config/config');

// Create rate limiter
const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      error: message || 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// General rate limiter
const generalLimiter = createRateLimiter(
  config.rateLimit.windowMs,
  config.rateLimit.max,
  'Too many requests from this IP, please try again later.'
);

// Strict rate limiter for authentication routes
const authLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  5, // 5 attempts
  'Too many authentication attempts from this IP, please try again after 15 minutes.'
);

// Password reset rate limiter
const passwordResetLimiter = createRateLimiter(
  60 * 60 * 1000, // 1 hour
  3, // 3 attempts
  'Too many password reset attempts from this IP, please try again after 1 hour.'
);

module.exports = {
  generalLimiter,
  authLimiter,
  passwordResetLimiter,
  createRateLimiter
};