const ApiError = require('../utils/ApiError');

const notFoundHandler = (req, res, next) => {
  const error = new ApiError(404, `Not found - ${req.originalUrl}`);
  next(error);
};

module.exports = notFoundHandler;