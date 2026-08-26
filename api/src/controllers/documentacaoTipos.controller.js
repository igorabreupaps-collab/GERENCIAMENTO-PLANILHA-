const { asyncHandler } = require("../lib/asyncHandler");
const { documentacaoTiposService } = require("../services/documentacaoTipos.service");

const documentacaoTiposController = {
  list: asyncHandler(async (req, res) => {
    res.json(await documentacaoTiposService.list());
  }),
};

module.exports = { documentacaoTiposController };
