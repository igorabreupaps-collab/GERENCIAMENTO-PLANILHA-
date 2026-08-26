const { usersRepository } = require("../repositories/users.repository");
const { hashPassword } = require("../lib/password");
const { ALL_ROLES } = require("../constants/roles");
const { ValidationError, NotFoundError } = require("../errors/AppError");

const MIN_PASSWORD_LENGTH = 8;

const usersService = {
  list: () => usersRepository.listAll(),

  create: async ({ email: rawEmail, nome: rawNome, role, password = "" }) => {
    const email = (rawEmail || "").trim().toLowerCase();
    const nome = (rawNome || "").trim() || null;

    if (!email || !ALL_ROLES.includes(role)) {
      throw new ValidationError(`Informe email e role válidos (${ALL_ROLES.join(", ")}).`);
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      throw new ValidationError(`A senha inicial precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`);
    }

    const passwordHash = await hashPassword(password);
    return usersRepository.insert({ email, nome, role, passwordHash });
  },

  updateRole: async (targetUserId, role, requestingUser) => {
    if (!ALL_ROLES.includes(role)) {
      throw new ValidationError("Role inválido.");
    }
    if (targetUserId === requestingUser.id && role !== "admin") {
      throw new ValidationError("Você não pode remover seu próprio acesso de administrador.");
    }

    const updated = await usersRepository.updateRole(targetUserId, role);
    if (!updated) {
      throw new NotFoundError("Usuário não encontrado.");
    }
    return updated;
  },
};

module.exports = { usersService };
