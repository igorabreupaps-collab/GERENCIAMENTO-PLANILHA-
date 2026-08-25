// Express 4 não captura rejeições de handlers async automaticamente --
// sem isso, um erro de banco no meio de uma rota vira uma promise rejeitada
// sem dono, e a requisição nunca responde. Envolve o handler e encaminha
// qualquer erro pro errorHandler central via next(err).
function asyncHandler(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { asyncHandler };
