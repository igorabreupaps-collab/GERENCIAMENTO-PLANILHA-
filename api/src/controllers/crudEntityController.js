const { asyncHandler } = require("../lib/asyncHandler");

// Controller genérico: só traduz HTTP <-> service. Nenhuma regra de negócio
// mora aqui -- é por isso que dá pra reusar o mesmo controller pras 3
// entidades CRUD (areas, documentos, nao_conformidades) sem duplicar nada.
function createCrudEntityController(service) {
  return {
    list: asyncHandler(async (req, res) => {
      res.json(await service.list());
    }),

    create: asyncHandler(async (req, res) => {
      const created = await service.create(req.body, req.user.id);
      res.status(201).json(created);
    }),

    update: asyncHandler(async (req, res) => {
      const id = parseInt(req.params.id, 10);
      const updated = await service.update(id, req.body, req.user.id);
      res.json(updated);
    }),

    remove: asyncHandler(async (req, res) => {
      const id = parseInt(req.params.id, 10);
      await service.remove(id);
      res.status(204).end();
    }),
  };
}

module.exports = { createCrudEntityController };
