const express = require("express");
const db = require("../db");
const { authRequired } = require("../middleware/auth");
const { requireRole } = require("../middleware/requireRole");
const { asyncHandler } = require("../lib/asyncHandler");
const { hashPassword } = require("../lib/password");

const router = express.Router();

const VALID_ROLES = ["viewer", "editor", "admin"];

router.get(
  "/",
  authRequired,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const { rows } = await db.query(
      "select id, email, nome, role, created_at from users order by email"
    );
    res.json(rows);
  })
);

router.post(
  "/",
  authRequired,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const email = (req.body.email || "").trim().toLowerCase();
    const nome = (req.body.nome || "").trim() || null;
    const role = req.body.role;
    const password = req.body.password || "";

    if (!email || !VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: "Informe email e role válidos (viewer, editor, admin)." });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "A senha inicial precisa ter pelo menos 8 caracteres." });
    }

    const passwordHash = await hashPassword(password);
    const { rows } = await db.query(
      `insert into users (email, nome, role, password_hash)
       values ($1, $2, $3, $4)
       returning id, email, nome, role, created_at`,
      [email, nome, role, passwordHash]
    );
    res.status(201).json(rows[0]);
  })
);

router.patch(
  "/:id/role",
  authRequired,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: "Role inválido." });
    }
    if (id === req.user.id && role !== "admin") {
      return res.status(400).json({ error: "Você não pode remover seu próprio acesso de administrador." });
    }

    const { rows } = await db.query(
      "update users set role = $1 where id = $2 returning id, email, nome, role, created_at",
      [role, id]
    );
    if (!rows.length) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }
    res.json(rows[0]);
  })
);

module.exports = router;
