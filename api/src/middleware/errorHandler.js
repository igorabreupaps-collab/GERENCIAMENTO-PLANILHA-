// Middleware de erro central (4 argumentos -- é assim que o Express
// reconhece um error handler). Mantém as respostas de erro em um formato
// único e evita vazar stack trace/detalhes internos pro cliente.
function errorHandler(err, req, res, next) {
  console.error(err);

  if (err.code === "23505") {
    // unique_violation do Postgres (ex.: e-mail duplicado)
    return res.status(409).json({ error: "Já existe um registro com esse valor único." });
  }
  if (err.code === "23503") {
    // foreign_key_violation
    return res.status(400).json({ error: "Referência inválida (registro relacionado não existe)." });
  }
  if (err.code === "23514") {
    // check_violation
    return res.status(400).json({ error: "Valor inválido para um dos campos." });
  }

  res.status(500).json({ error: "Erro interno do servidor." });
}

module.exports = { errorHandler };
