const express = require("express");
const { authRequired } = require("../middleware/auth");
const { documentacaoTiposController } = require("../controllers/documentacaoTipos.controller");

const router = express.Router();

router.get("/", authRequired, documentacaoTiposController.list);

module.exports = router;
