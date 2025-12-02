const ApiError = require('../utils/ApiError');

const authorize = (...roles) => {
  return (req, res, next) => {
    // console.log("Authorize Middleware => req.user:", req.user);
    if (!req.user || !req.user.role) {
      return next(new ApiError(401, 'Not authorized to access this route'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, `User role ${req.user.role} is not authorized`));
    }

    next();
  };
};

module.exports = authorize;
