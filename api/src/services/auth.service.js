const { usersRepository } = require("../repositories/users.repository");
const { comparePassword } = require("../lib/password");
const { signToken } = require("../lib/jwt");
const { ValidationError, UnauthorizedError } = require("../errors/AppError");

const INVALID_CREDENTIALS_MESSAGE = "E-mail ou senha inválidos.";

function toPublicUser(user) {
  return { id: user.id, email: user.email, nome: user.nome, role: user.role };
}

const authService = {
  login: async (rawEmail, rawPassword) => {
    const email = (rawEmail || "").trim().toLowerCase();
    const password = rawPassword || "";
    if (!email || !password) {
      throw new ValidationError("Informe e-mail e senha.");
    }

    const user = await usersRepository.findByEmail(email);
    if (!user) {
      throw new UnauthorizedError(INVALID_CREDENTIALS_MESSAGE);
    }

    const passwordMatches = await comparePassword(password, user.password_hash);
    if (!passwordMatches) {
      throw new UnauthorizedError(INVALID_CREDENTIALS_MESSAGE);
    }

    return { token: signToken(user.id), user: toPublicUser(user) };
  },
};

module.exports = { authService };
