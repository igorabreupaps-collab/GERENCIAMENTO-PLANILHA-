const { verifyToken } = require("../lib/jwt");
const { asyncHandler } = require("../lib/asyncHandler");
const { usersRepository } = require("../repositories/users.repository");
const { UnauthorizedError } = require("../errors/AppError");

// Sempre relê o usuário do banco a partir do id no token -- nunca confia num
// "role" guardado dentro do JWT. Isso garante que, se um admin rebaixar
// alguém, a mudança vale já na próxima requisição dessa pessoa, sem esperar
// o token expirar.
const authRequired = asyncHandler(async function (req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    throw new UnauthorizedError("Não autenticado.");
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch (err) {
    throw new UnauthorizedError("Sessão inválida ou expirada.");
  }

  const user = await usersRepository.findAuthContextById(payload.sub);
  if (!user) {
    throw new UnauthorizedError("Usuário não encontrado.");
  }

  req.user = user;
  next();
});

module.exports = { authRequired };
