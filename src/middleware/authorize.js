const ApiError = require('../utils/ApiError');

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new ApiError(401, 'Not authorized to access this route');
    }

    if (!roles.includes(req.user.role)) {
      throw new ApiError(403, `User role ${req.user.role} is not authorized to access this route`);
    }

    next();
  };
};

module.exports = authorize;