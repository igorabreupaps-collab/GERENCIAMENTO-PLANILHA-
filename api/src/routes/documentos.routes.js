const { createCrudRepository } = require("../repositories/crudRepository");
const { createCrudEntityService } = require("../services/crudEntityService");
const { createCrudEntityController } = require("../controllers/crudEntityController");
const { createCrudEntityRoutes } = require("./crudEntityRoutes");
const { ValidationError } = require("../errors/AppError");

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

const repository = createCrudRepository({ table: "documentos", allowedFields: ALLOWED_FIELDS, orderBy: "numero" });
const service = createCrudEntityService(repository, {
  notFoundMessage: "Documento não encontrado.",
  validateCreate(data) {
    if (!data.tipo || !(data.numero || "").trim()) {
      throw new ValidationError("Informe tipo e número do documento.");
    }
  },
});
const controller = createCrudEntityController(service);

module.exports = createCrudEntityRoutes(controller);
