const config = require('../config/config');
const ApiError = require('../utils/ApiError');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  console.error('Error:', err);

  // Sequelize bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = new ApiError(404, message);
  }

  // Sequelize duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = new ApiError(400, message);
  }

  // Sequelize validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message);
    error = new ApiError(400, message);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = new ApiError(401, message);
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = new ApiError(401, message);
  }

  // Sequelize connection error
  if (err.name === 'SequelizeConnectionError') {
    const message = 'Database connection failed';
    error = new ApiError(500, message);
  }

  // Sequelize unique constraint error
  if (err.name === 'SequelizeUniqueConstraintError') {
    const message = err.errors[0]?.message || 'Duplicate field value entered';
    error = new ApiError(400, message);
  }

  // Sequelize validation error
  if (err.name === 'SequelizeValidationError') {
    const message = err.errors.map(error => error.message).join(', ');
    error = new ApiError(400, message);
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Server Error',
    ...(config.nodeEnv === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;