const { usersRepository } = require("../repositories/users.repository");
const { comparePassword, hashPassword } = require("../lib/password");
const { ValidationError, UnauthorizedError } = require("../errors/AppError");

const MIN_PASSWORD_LENGTH = 8;

const meService = {
  changePassword: async (userId, currentPassword, newPassword) => {
    if (!currentPassword || !newPassword) {
      throw new ValidationError("Informe a senha atual e a nova senha.");
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      throw new ValidationError(`A nova senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`);
    }

    const currentHash = await usersRepository.getPasswordHash(userId);
    const currentMatches = await comparePassword(currentPassword, currentHash);
    if (!currentMatches) {
      throw new UnauthorizedError("Senha atual incorreta.");
    }

    const newHash = await hashPassword(newPassword);
    await usersRepository.updatePasswordHash(userId, newHash);
  },
};

module.exports = { meService, MIN_PASSWORD_LENGTH };
