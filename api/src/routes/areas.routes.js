const { createCrudRepository } = require("../repositories/crudRepository");
const { createCrudEntityService } = require("../services/crudEntityService");
const { createCrudEntityController } = require("../controllers/crudEntityController");
const { createCrudEntityRoutes } = require("./crudEntityRoutes");

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

const repository = createCrudRepository({ table: "areas", allowedFields: ALLOWED_FIELDS, orderBy: "descricao" });
const service = createCrudEntityService(repository, {
  defaults: { descricao: "Nova área" },
  notFoundMessage: "Área não encontrada.",
});
const controller = createCrudEntityController(service);

module.exports = createCrudEntityRoutes(controller);
