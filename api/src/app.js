const path = require("path");
const express = require("express");
const { errorHandler } = require("./middleware/errorHandler");

const authRoutes = require("./routes/auth.routes");
const meRoutes = require("./routes/me.routes");
const areasRoutes = require("./routes/areas.routes");
const naoConformidadesRoutes = require("./routes/naoConformidades.routes");
const documentacaoTiposRoutes = require("./routes/documentacaoTipos.routes");
const documentosRoutes = require("./routes/documentos.routes");
const contratoInfoRoutes = require("./routes/contratoInfo.routes");
const usersRoutes = require("./routes/users.routes");

// Fábrica do app Express -- separada de server.js (que só cuida de
// escutar a porta) para que os testes possam montar requisições contra o
// app sem abrir uma porta de rede de verdade.
function createApp() {
  const app = express();

  app.use(express.json());

  app.use("/api/auth", authRoutes);
  app.use("/api/me", meRoutes);
  app.use("/api/areas", areasRoutes);
  app.use("/api/nao-conformidades", naoConformidadesRoutes);
  app.use("/api/documentacao-tipos", documentacaoTiposRoutes);
  app.use("/api/documentos", documentosRoutes);
  app.use("/api/contrato-info", contratoInfoRoutes);
  app.use("/api/users", usersRoutes);

  // Frontend estático (web/) -- mesma origem da API, sem CORS.
  app.use(express.static(path.join(__dirname, "..", "web")));

  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
