const { asyncHandler } = require("../lib/asyncHandler");
const { contratoInfoService } = require("../services/contratoInfo.service");

const contratoInfoController = {
  get: asyncHandler(async (req, res) => {
    res.json(await contratoInfoService.get());
  }),
};

module.exports = { contratoInfoController };
