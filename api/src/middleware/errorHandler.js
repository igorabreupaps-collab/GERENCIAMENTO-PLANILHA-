const { AppError } = require("../errors/AppError");

const POSTGRES_ERROR_RESPONSES = {
  "23505": { status: 409, message: "Já existe um registro com esse valor único." }, // unique_violation
  "23503": { status: 400, message: "Referência inválida (registro relacionado não existe)." }, // foreign_key_violation
  "23514": { status: 400, message: "Valor inválido para um dos campos." }, // check_violation
};

// Middleware de erro central (4 argumentos -- é assim que o Express
// reconhece um error handler). Mantém as respostas de erro em um formato
// único e evita vazar stack trace/detalhes internos pro cliente.
function errorHandler(err, req, res, next) {
  console.error(err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  const pgResponse = POSTGRES_ERROR_RESPONSES[err.code];
  if (pgResponse) {
    return res.status(pgResponse.status).json({ error: pgResponse.message });
  }

  res.status(500).json({ error: "Erro interno do servidor." });
}

module.exports = { errorHandler };
