const db = require("../db");

const PUBLIC_COLUMNS = "id, email, nome, role, created_at";
const AUTH_CONTEXT_COLUMNS = "id, email, nome, role";

const usersRepository = {
  findByEmail: async (email) => {
    const { rows } = await db.query("select * from users where email = $1", [email]);
    return rows[0] || null;
  },

  // Colunas mínimas usadas pelo middleware de autenticação em toda
  // requisição -- deliberadamente sem created_at, pra manter req.user igual
  // ao token de sessão que o frontend já espera.
  findAuthContextById: async (id) => {
    const { rows } = await db.query(`select ${AUTH_CONTEXT_COLUMNS} from users where id = $1`, [id]);
    return rows[0] || null;
  },

  getPasswordHash: async (id) => {
    const { rows } = await db.query("select password_hash from users where id = $1", [id]);
    return rows[0] ? rows[0].password_hash : null;
  },

  listAll: async () => {
    const { rows } = await db.query(`select ${PUBLIC_COLUMNS} from users order by email`);
    return rows;
  },

  insert: async ({ email, nome, role, passwordHash }) => {
    const { rows } = await db.query(
      `insert into users (email, nome, role, password_hash)
       values ($1, $2, $3, $4)
       returning ${PUBLIC_COLUMNS}`,
      [email, nome, role, passwordHash]
    );
    return rows[0];
  },

  updateRole: async (id, role) => {
    const { rows } = await db.query(
      `update users set role = $1 where id = $2 returning ${PUBLIC_COLUMNS}`,
      [role, id]
    );
    return rows[0] || null;
  },

  updatePasswordHash: async (id, passwordHash) => {
    await db.query("update users set password_hash = $1 where id = $2", [passwordHash, id]);
  },
};

module.exports = { usersRepository };
