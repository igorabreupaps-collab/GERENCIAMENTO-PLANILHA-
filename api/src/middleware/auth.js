const { verifyToken } = require("../lib/jwt");
const { asyncHandler } = require("../lib/asyncHandler");
const db = require("../db");

// Sempre relê o usuário do banco a partir do id no token -- nunca confia num
// "role" guardado dentro do JWT. Isso garante que, se um admin rebaixar
// alguém, a mudança vale já na próxima requisição dessa pessoa, sem esperar
// o token expirar.
const authRequired = asyncHandler(async function (req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Não autenticado." });
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch (err) {
    return res.status(401).json({ error: "Sessão inválida ou expirada." });
  }

  const { rows } = await db.query(
    "select id, email, nome, role from users where id = $1",
    [payload.sub]
  );
  if (!rows.length) {
    return res.status(401).json({ error: "Usuário não encontrado." });
  }

  req.user = rows[0];
  next();
});

module.exports = { authRequired };
