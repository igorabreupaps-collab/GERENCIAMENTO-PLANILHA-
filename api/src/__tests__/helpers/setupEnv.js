// config.js exige essas variáveis pra ser carregado -- os testes nunca abrem
// uma conexão de banco real (o módulo "../db" é sempre mockado), então os
// valores aqui só precisam existir, não apontar pra nada de verdade.
process.env.DATABASE_URL = "postgres://test:test@localhost:5432/test";
process.env.JWT_SECRET = "test-secret-do-not-use-in-production";
process.env.JWT_EXPIRES_IN = "1h";
