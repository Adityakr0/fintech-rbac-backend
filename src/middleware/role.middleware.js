function authorizeRoles(...roles) {
  return (req, res, next) => {

    if (!req.user) {
      return res.status(401).json({
        message: "Unauthorized: User not found"
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Forbidden: ${req.user.role} role is not allowed`
      });
    }

    next();
  };
}

module.exports = { authorizeRoles };