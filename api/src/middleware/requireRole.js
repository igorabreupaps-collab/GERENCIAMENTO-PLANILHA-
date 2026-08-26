const { ForbiddenError } = require("../errors/AppError");

// Uso: router.post('/areas', authRequired, requireRole('editor', 'admin'), handler)
// Precisa rodar depois de authRequired (espera req.user já preenchido).
function requireRole(...allowedRoles) {
  return function (req, res, next) {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return next(new ForbiddenError());
    }
    next();
  };
}

module.exports = { requireRole };
