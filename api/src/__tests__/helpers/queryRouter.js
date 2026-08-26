// Substituto de teste para "../db": em vez de falar com um Postgres de
// verdade (que não existe neste ambiente), roteia cada `query(sql, params)`
// para um handler registrado por padrão de texto da SQL. Cada teste registra
// só os padrões que a rota sob teste realmente dispara.
function createQueryRouter() {
  const handlers = [];

  const query = jest.fn(async (sql, params) => {
    const handler = handlers.find((h) => h.pattern.test(sql));
    if (!handler) {
      throw new Error(`Nenhum mock configurado para a query:\n${sql}`);
    }
    return handler.fn(sql, params);
  });

  function when(pattern, fn) {
    handlers.push({ pattern, fn });
  }

  function reset() {
    handlers.length = 0;
    query.mockClear();
  }

  return { query, when, reset, pool: {} };
}

module.exports = { createQueryRouter };
