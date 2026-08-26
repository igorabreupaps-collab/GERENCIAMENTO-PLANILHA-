const express = require("express");
const { authRequired } = require("../middleware/auth");
const { contratoInfoController } = require("../controllers/contratoInfo.controller");

const router = express.Router();

router.get("/", authRequired, contratoInfoController.get);

module.exports = router;
