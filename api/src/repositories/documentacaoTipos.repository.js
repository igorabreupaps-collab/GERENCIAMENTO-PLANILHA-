const db = require("../db");

const documentacaoTiposRepository = {
  // Contagem sempre calculada a partir dos documentos de verdade (tabela
  // "documentos") -- nunca um número digitado à parte que pode ficar
  // desatualizado.
  countsByTipo: async () => {
    const { rows } = await db.query(
      `select dt.tipo, count(d.id)::int as quantidade
       from documentacao_tipos dt
       left join documentos d on d.tipo = dt.tipo
       group by dt.tipo
       order by dt.tipo`
    );
    return rows;
  },
};

module.exports = { documentacaoTiposRepository };
