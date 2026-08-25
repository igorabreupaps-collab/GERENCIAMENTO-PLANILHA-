// Uso: router.post('/areas', authRequired, requireRole('editor', 'admin'), handler)
// Precisa rodar depois de authRequired (espera req.user já preenchido).
function requireRole(...allowedRoles) {
  return function (req, res, next) {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Você não tem permissão para esta ação." });
    }
    next();
  };
}

module.exports = { requireRole };
