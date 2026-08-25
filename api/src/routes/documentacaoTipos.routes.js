const express = require("express");
const db = require("../db");
const { authRequired } = require("../middleware/auth");
const { asyncHandler } = require("../lib/asyncHandler");

const router = express.Router();

// Contagem sempre calculada a partir dos documentos de verdade (tabela
// "documentos") -- nunca um número digitado à parte que pode ficar
// desatualizado.
router.get(
  "/",
  authRequired,
  asyncHandler(async (req, res) => {
    const { rows } = await db.query(
      `select dt.tipo, count(d.id)::int as quantidade
       from documentacao_tipos dt
       left join documentos d on d.tipo = dt.tipo
       group by dt.tipo
       order by dt.tipo`
    );
    res.json(rows);
  })
);

module.exports = router;
