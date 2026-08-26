const { contratoInfoRepository } = require("../repositories/contratoInfo.repository");

const contratoInfoService = {
  get: () => contratoInfoRepository.find(),
};

module.exports = { contratoInfoService };
