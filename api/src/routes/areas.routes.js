const express = require("express");
const db = require("../db");
const { authRequired } = require("../middleware/auth");
const { requireRole } = require("../middleware/requireRole");
const { asyncHandler } = require("../lib/asyncHandler");
const { buildUpdate } = require("../lib/updateQuery");

const router = express.Router();

const ALLOWED_FIELDS = [
  "codigo_ld",
  "descricao",
  "status",
  "adequacao_geral",
  "validade_laudo",
  "validade_is",
  "dossie",
  "pendencia",
];

router.get(
  "/",
  authRequired,
  asyncHandler(async (req, res) => {
    const { rows } = await db.query("select * from areas order by descricao");
    res.json(rows);
  })
);

router.post(
  "/",
  authRequired,
  requireRole("editor", "admin"),
  asyncHandler(async (req, res) => {
    const descricao = (req.body.descricao || "Nova área").trim();
    const { rows } = await db.query(
      "insert into areas (descricao, updated_by) values ($1, $2) returning *",
      [descricao, req.user.id]
    );
    res.status(201).json(rows[0]);
  })
);

router.patch(
  "/:id",
  authRequired,
  requireRole("editor", "admin"),
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const update = buildUpdate("areas", ALLOWED_FIELDS, req.body, id, req.user.id);
    if (!update) {
      return res.status(400).json({ error: "Nenhum campo válido para atualizar." });
    }
    const { rows } = await db.query(update.sql, update.values);
    if (!rows.length) {
      return res.status(404).json({ error: "Área não encontrada." });
    }
    res.json(rows[0]);
  })
);

router.delete(
  "/:id",
  authRequired,
  requireRole("editor", "admin"),
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    await db.query("delete from areas where id = $1", [id]);
    res.status(204).end();
  })
);

module.exports = router;
