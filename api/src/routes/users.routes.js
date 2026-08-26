const express = require("express");
const { authRequired } = require("../middleware/auth");
const { requireRole } = require("../middleware/requireRole");
const { ROLES } = require("../constants/roles");
const { usersController } = require("../controllers/users.controller");

const router = express.Router();

router.get("/", authRequired, requireRole(ROLES.ADMIN), usersController.list);
router.post("/", authRequired, requireRole(ROLES.ADMIN), usersController.create);
router.patch("/:id/role", authRequired, requireRole(ROLES.ADMIN), usersController.updateRole);

module.exports = router;
