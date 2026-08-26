const request = require("supertest");

jest.mock("../db", () => require("./helpers/queryRouter").createQueryRouter());

const db = require("../db");
const { createApp } = require("../app");
const { registerAuthenticatedUser } = require("./helpers/authHelper");

const app = createApp();
const VIEWER = { id: "v1", email: "viewer@x.com", nome: "Viewer", role: "viewer" };

beforeEach(() => db.reset());

test("GET /api/contrato-info devolve null quando ainda não há registro", async () => {
  const auth = registerAuthenticatedUser(db, VIEWER);
  db.when(/from contrato_info where id = 1/, async () => ({ rows: [] }));
  const res = await request(app).get("/api/contrato-info").set("Authorization", auth);
  expect(res.status).toBe(200);
  expect(res.body).toBeNull();
});

test("GET /api/documentacao-tipos devolve a contagem por tipo", async () => {
  const auth = registerAuthenticatedUser(db, VIEWER);
  db.when(/from documentacao_tipos dt/, async () => ({
    rows: [{ tipo: "Desenhos (DE)", quantidade: 5 }],
  }));
  const res = await request(app).get("/api/documentacao-tipos").set("Authorization", auth);
  expect(res.status).toBe(200);
  expect(res.body).toEqual([{ tipo: "Desenhos (DE)", quantidade: 5 }]);
});
