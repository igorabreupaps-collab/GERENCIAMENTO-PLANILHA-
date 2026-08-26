const config = require("./config");
const { createApp } = require("./app");

const app = createApp();

app.listen(config.port, () => {
  console.log(`Painel SPDA API ouvindo na porta ${config.port}`);
});
