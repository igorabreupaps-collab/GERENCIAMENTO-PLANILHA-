const db = require("../db");

const contratoInfoRepository = {
  find: async () => {
    const { rows } = await db.query("select * from contrato_info where id = 1");
    return rows[0] || null;
  },
};

module.exports = { contratoInfoRepository };
