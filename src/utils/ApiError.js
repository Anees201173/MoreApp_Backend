class ApiError extends Error {
  constructor(statusCode, message, data = null, isOperational = true, stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.data = data;
    this.isOperational = isOperational;
    this.success = false;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

module.exports = ApiError;