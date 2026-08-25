const express = require("express");
const db = require("../db");
const { authRequired } = require("../middleware/auth");
const { requireRole } = require("../middleware/requireRole");
const { asyncHandler } = require("../lib/asyncHandler");
const { buildUpdate, buildInsert } = require("../lib/updateQuery");

const router = express.Router();

const ALLOWED_FIELDS = [
  "area_id",
  "area_texto",
  "numero_ri",
  "descricao",
  "severidade",
  "status",
  "responsavel",
  "data",
];

router.get(
  "/",
  authRequired,
  asyncHandler(async (req, res) => {
    const { rows } = await db.query("select * from nao_conformidades order by id");
    res.json(rows);
  })
);

router.post(
  "/",
  authRequired,
  requireRole("editor", "admin"),
  asyncHandler(async (req, res) => {
    const insert = buildInsert(
      "nao_conformidades", ALLOWED_FIELDS, req.body,
      { descricao: "Nova ocorrência", severidade: "Média", status: "Aberta" },
      req.user.id
    );
    const { rows } = await db.query(insert.sql, insert.values);
    res.status(201).json(rows[0]);
  })
);

router.patch(
  "/:id",
  authRequired,
  requireRole("editor", "admin"),
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const update = buildUpdate("nao_conformidades", ALLOWED_FIELDS, req.body, id, req.user.id);
    if (!update) {
      return res.status(400).json({ error: "Nenhum campo válido para atualizar." });
    }
    const { rows } = await db.query(update.sql, update.values);
    if (!rows.length) {
      return res.status(404).json({ error: "Registro não encontrado." });
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
    await db.query("delete from nao_conformidades where id = $1", [id]);
    res.status(204).end();
  })
);

module.exports = router;
