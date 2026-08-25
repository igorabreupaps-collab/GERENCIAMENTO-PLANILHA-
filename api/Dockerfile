# Build context é a RAIZ do repositório (não api/), porque a imagem também
# precisa da pasta web/ (servida como estático pelo Express). Ver docker-compose.yml:
# build: { context: ., dockerfile: api/Dockerfile }
FROM node:20-alpine

WORKDIR /app

COPY api/package.json api/package-lock.json* ./
RUN npm install --omit=dev && npm cache clean --force

COPY api/ ./
COPY web/ ./web/

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "src/server.js"]
