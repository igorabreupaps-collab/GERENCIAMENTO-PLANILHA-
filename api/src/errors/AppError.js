// Erros de domínio/HTTP explícitos -- permitem que services expressem "o que
// deu errado" sem conhecer Express (sem status code, sem res.json). O
// errorHandler central é quem traduz isso pra resposta HTTP.
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
  }
}

class ValidationError extends AppError {
  constructor(message) {
    super(message, 400);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = "Não autenticado.") {
    super(message, 401);
  }
}

class ForbiddenError extends AppError {
  constructor(message = "Você não tem permissão para esta ação.") {
    super(message, 403);
  }
}

class NotFoundError extends AppError {
  constructor(message = "Registro não encontrado.") {
    super(message, 404);
  }
}

class ConflictError extends AppError {
  constructor(message) {
    super(message, 409);
  }
}

module.exports = {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
};
