const { ValidationError, NotFoundError } = require("../errors/AppError");

// Service genérico por trás das 3 entidades "CRUD simples com campos
// permitidos" (areas, documentos, nao_conformidades). Concentra as regras
// que hoje estavam espalhadas dentro de cada arquivo de rota: validação de
// criação e a mensagem de "não encontrado" -- ambas configuráveis por
// entidade, o resto do fluxo é idêntico (Open/Closed: estende-se via
// config, não copiando o método inteiro de novo).
function createCrudEntityService(repository, { defaults = {}, notFoundMessage = "Registro não encontrado.", validateCreate } = {}) {
  return {
    list: () => repository.findAll(),

    create: async (data, userId) => {
      if (validateCreate) validateCreate(data);
      return repository.insert(data, defaults, userId);
    },

    update: async (id, data, userId) => {
      const result = await repository.update(id, data, userId);
      if (result.noFieldsProvided) {
        throw new ValidationError("Nenhum campo válido para atualizar.");
      }
      if (!result.row) {
        throw new NotFoundError(notFoundMessage);
      }
      return result.row;
    },

    remove: (id) => repository.remove(id),
  };
}

module.exports = { createCrudEntityService };
