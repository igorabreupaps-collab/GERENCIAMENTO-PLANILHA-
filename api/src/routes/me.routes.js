const express = require("express");
const db = require("../db");
const { authRequired } = require("../middleware/auth");
const { hashPassword, comparePassword } = require("../lib/password");
const { asyncHandler } = require("../lib/asyncHandler");

const router = express.Router();

router.get("/", authRequired, (req, res) => {
  res.json(req.user);
});

router.patch(
  "/password",
  authRequired,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Informe a senha atual e a nova senha." });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: "A nova senha precisa ter pelo menos 8 caracteres." });
    }

    const { rows } = await db.query("select password_hash from users where id = $1", [req.user.id]);
    const ok = await comparePassword(currentPassword, rows[0].password_hash);
    if (!ok) {
      return res.status(401).json({ error: "Senha atual incorreta." });
    }

    const newHash = await hashPassword(newPassword);
    await db.query("update users set password_hash = $1 where id = $2", [newHash, req.user.id]);
    res.json({ ok: true });
  })
);

module.exports = router;
