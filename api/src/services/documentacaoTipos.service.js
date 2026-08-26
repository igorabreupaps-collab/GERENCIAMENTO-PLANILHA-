const { documentacaoTiposRepository } = require("../repositories/documentacaoTipos.repository");

const documentacaoTiposService = {
  list: () => documentacaoTiposRepository.countsByTipo(),
};

module.exports = { documentacaoTiposService };
