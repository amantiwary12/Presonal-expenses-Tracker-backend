export const authorizeRoles =
  (...roles) =>
  (req, res, next) => {

    if (!roles.includes(req.userRole)) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    next();
  };