const request = require("supertest");

jest.mock("../db", () => require("./helpers/queryRouter").createQueryRouter());

const db = require("../db");
const { createApp } = require("../app");
const { registerAuthenticatedUser } = require("./helpers/authHelper");

const app = createApp();
const EDITOR = { id: "e1", email: "editor@x.com", nome: "Editor", role: "editor" };

beforeEach(() => db.reset());

test("POST /api/nao-conformidades aplica os defaults (descrição/severidade/status) quando não informados", async () => {
  const auth = registerAuthenticatedUser(db, EDITOR);
  db.when(/insert into nao_conformidades/, async (sql, params) => {
    expect(params).toContain("Nova ocorrência");
    expect(params).toContain("Média");
    expect(params).toContain("Aberta");
    return { rows: [{ id: 1 }] };
  });

  const res = await request(app).post("/api/nao-conformidades").set("Authorization", auth).send({});
  expect(res.status).toBe(201);
});
