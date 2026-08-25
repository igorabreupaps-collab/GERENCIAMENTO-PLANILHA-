const express = require("express");
const db = require("../db");
const { comparePassword } = require("../lib/password");
const { signToken } = require("../lib/jwt");
const { asyncHandler } = require("../lib/asyncHandler");

const router = express.Router();

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const email = (req.body.email || "").trim().toLowerCase();
    const password = req.body.password || "";
    if (!email || !password) {
      return res.status(400).json({ error: "Informe e-mail e senha." });
    }

    const { rows } = await db.query("select * from users where email = $1", [email]);
    const user = rows[0];
    if (!user) {
      return res.status(401).json({ error: "E-mail ou senha inválidos." });
    }

    const ok = await comparePassword(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: "E-mail ou senha inválidos." });
    }

    const token = signToken(user.id);
    res.json({
      token,
      user: { id: user.id, email: user.email, nome: user.nome, role: user.role },
    });
  })
);

module.exports = router;
