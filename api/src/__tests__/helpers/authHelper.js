const { signToken } = require("../../lib/jwt");

// Registra no db mockado a resposta que o middleware authRequired espera ao
// reler o usuário do "token", e devolve o header Authorization pronto pra
// usar em supertest.
function registerAuthenticatedUser(db, user) {
  db.when(/select id, email, nome, role from users where id = \$1/, async () => ({ rows: [user] }));
  return `Bearer ${signToken(user.id)}`;
}

module.exports = { registerAuthenticatedUser };
