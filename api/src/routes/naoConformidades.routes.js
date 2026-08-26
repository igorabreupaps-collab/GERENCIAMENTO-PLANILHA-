const { createCrudRepository } = require("../repositories/crudRepository");
const { createCrudEntityService } = require("../services/crudEntityService");
const { createCrudEntityController } = require("../controllers/crudEntityController");
const { createCrudEntityRoutes } = require("./crudEntityRoutes");

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

const repository = createCrudRepository({ table: "nao_conformidades", allowedFields: ALLOWED_FIELDS, orderBy: "id" });
const service = createCrudEntityService(repository, {
  defaults: { descricao: "Nova ocorrência", severidade: "Média", status: "Aberta" },
  notFoundMessage: "Registro não encontrado.",
});
const controller = createCrudEntityController(service);

module.exports = createCrudEntityRoutes(controller);
