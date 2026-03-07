const ApiError = require('../utils/ApiError');

const authorize = (...roles) => {
  return (req, res, next) => {
     //console.log("Authorize Middleware => req.user:", req.user);
    if (!req.user || !req.user.role) {
      return next(new ApiError(401, 'Not authorized to access this route'));
    }

    const allowedRoles = roles
      .flat()
      .filter((r) => r !== null && r !== undefined)
      .map((r) => String(r).trim().toLowerCase());

    const userRole = String(req.user.role).trim().toLowerCase();

    if (!allowedRoles.includes(userRole)) {
      return next(new ApiError(403, `User role ${req.user.role} is not authorized`));
    }

    next();
  };
};

module.exports = authorize;
