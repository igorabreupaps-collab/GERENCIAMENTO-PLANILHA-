const express = require("express");
const { authRequired } = require("../middleware/auth");
const { meController } = require("../controllers/me.controller");

const router = express.Router();

router.get("/", authRequired, meController.get);
router.patch("/password", authRequired, meController.changePassword);

module.exports = router;
