const path = require("path");
const express = require("express");
const config = require("./config");
const { errorHandler } = require("./middleware/errorHandler");

const authRoutes = require("./routes/auth.routes");
const meRoutes = require("./routes/me.routes");
const areasRoutes = require("./routes/areas.routes");
const naoConformidadesRoutes = require("./routes/naoConformidades.routes");
const documentacaoTiposRoutes = require("./routes/documentacaoTipos.routes");
const documentosRoutes = require("./routes/documentos.routes");
const contratoInfoRoutes = require("./routes/contratoInfo.routes");
const usersRoutes = require("./routes/users.routes");

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

app.listen(config.port, () => {
  console.log(`Painel SPDA API ouvindo na porta ${config.port}`);
});
