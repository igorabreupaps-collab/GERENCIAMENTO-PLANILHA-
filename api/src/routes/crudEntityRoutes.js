const express = require("express");
const { authRequired } = require("../middleware/auth");
const { requireRole } = require("../middleware/requireRole");
const { EDIT_ROLES } = require("../constants/roles");

// Fábrica de router: dado um controller (list/create/update/remove), monta
// as 4 rotas REST padrão com a autorização de sempre (leitura para qualquer
// usuário autenticado, escrita restrita a editor/admin). Elimina a
// duplicação que existia entre areas.routes.js, documentos.routes.js e
// naoConformidades.routes.js -- eram praticamente o mesmo arquivo.
function createCrudEntityRoutes(controller) {
  const router = express.Router();

  router.get("/", authRequired, controller.list);
  router.post("/", authRequired, requireRole(...EDIT_ROLES), controller.create);
  router.patch("/:id", authRequired, requireRole(...EDIT_ROLES), controller.update);
  router.delete("/:id", authRequired, requireRole(...EDIT_ROLES), controller.remove);

  return router;
}

module.exports = { createCrudEntityRoutes };
