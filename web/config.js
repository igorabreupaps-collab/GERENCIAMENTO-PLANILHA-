// Configuração pública do frontend. A API e o frontend são servidos pela
// mesma origem (o Express do serviço "api" serve tanto /api/* quanto estes
// arquivos estáticos) -- por isso baseUrl fica vazio e os fetches usam
// caminho relativo ("/api/..."), sem precisar de CORS.
var API_CONFIG = {
  baseUrl: ""
};
