const db = require("../db");
const { buildInsert, buildUpdate } = require("../lib/updateQuery");

// Repository genérico para as entidades "tabela + lista de campos
// permitidos" (areas, documentos, nao_conformidades hoje). `table` e
// `orderBy` nunca vêm de input do usuário -- são constantes definidas pelo
// código que instancia o repository, então a interpolação direta na query é
// segura (os valores de linha continuam 100% parametrizados via
// buildInsert/buildUpdate).
function createCrudRepository({ table, allowedFields, orderBy }) {
  return {
    findAll: async () => {
      const { rows } = await db.query(`select * from ${table} order by ${orderBy}`);
      return rows;
    },

    insert: async (data, defaults, userId) => {
      const { sql, values } = buildInsert(table, allowedFields, data, defaults, userId);
      const { rows } = await db.query(sql, values);
      return rows[0];
    },

    update: async (id, data, userId) => {
      const built = buildUpdate(table, allowedFields, data, id, userId);
      if (!built) return { noFieldsProvided: true };
      const { rows } = await db.query(built.sql, built.values);
      return { row: rows[0] };
    },

    remove: async (id) => {
      await db.query(`delete from ${table} where id = $1`, [id]);
    },
  };
}

module.exports = { createCrudRepository };
