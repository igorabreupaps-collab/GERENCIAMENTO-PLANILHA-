const express = require("express");
const db = require("../db");
const { authRequired } = require("../middleware/auth");
const { asyncHandler } = require("../lib/asyncHandler");

const router = express.Router();

router.get(
  "/",
  authRequired,
  asyncHandler(async (req, res) => {
    const { rows } = await db.query("select * from contrato_info where id = 1");
    res.json(rows[0] || null);
  })
);

module.exports = router;
