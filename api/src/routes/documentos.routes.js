const express = require("express");
const db = require("../db");
const { authRequired } = require("../middleware/auth");
const { requireRole } = require("../middleware/requireRole");
const { asyncHandler } = require("../lib/asyncHandler");
const { buildUpdate } = require("../lib/updateQuery");

const router = express.Router();

const ALLOWED_FIELDS = [
  "tipo",
  "numero",
  "area_id",
  "area_texto",
  "titulo",
  "revisao",
  "data_emissao",
  "numero_msi",
  "numero_jmendes",
  "observacao",
];

router.get(
  "/",
  authRequired,
  asyncHandler(async (req, res) => {
    const { rows } = await db.query("select * from documentos order by numero");
    res.json(rows);
  })
);

router.post(
  "/",
  authRequired,
  requireRole("editor", "admin"),
  asyncHandler(async (req, res) => {
    const tipo = req.body.tipo;
    const numero = (req.body.numero || "").trim();
    if (!tipo || !numero) {
      return res.status(400).json({ error: "Informe tipo e número do documento." });
    }
    const { rows } = await db.query(
      "insert into documentos (tipo, numero, updated_by) values ($1, $2, $3) returning *",
      [tipo, numero, req.user.id]
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
    const update = buildUpdate("documentos", ALLOWED_FIELDS, req.body, id, req.user.id);
    if (!update) {
      return res.status(400).json({ error: "Nenhum campo válido para atualizar." });
    }
    const { rows } = await db.query(update.sql, update.values);
    if (!rows.length) {
      return res.status(404).json({ error: "Documento não encontrado." });
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
    await db.query("delete from documentos where id = $1", [id]);
    res.status(204).end();
  })
);

module.exports = router;
