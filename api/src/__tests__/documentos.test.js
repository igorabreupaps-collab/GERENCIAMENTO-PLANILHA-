const request = require("supertest");

jest.mock("../db", () => require("./helpers/queryRouter").createQueryRouter());

const db = require("../db");
const { createApp } = require("../app");
const { registerAuthenticatedUser } = require("./helpers/authHelper");

const app = createApp();
const EDITOR = { id: "e1", email: "editor@x.com", nome: "Editor", role: "editor" };

beforeEach(() => db.reset());

describe("POST /api/documentos", () => {
  test("400 quando falta tipo ou número", async () => {
    const auth = registerAuthenticatedUser(db, EDITOR);
    const res = await request(app)
      .post("/api/documentos")
      .set("Authorization", auth)
      .send({ tipo: "Desenhos (DE)" });
    expect(res.status).toBe(400);
  });

  test("201 quando tipo e número estão presentes", async () => {
    const auth = registerAuthenticatedUser(db, EDITOR);
    db.when(/insert into documentos/, async () => ({ rows: [{ id: 1, tipo: "Desenhos (DE)", numero: "DE-001" }] }));

    const res = await request(app)
      .post("/api/documentos")
      .set("Authorization", auth)
      .send({ tipo: "Desenhos (DE)", numero: "DE-001" });
    expect(res.status).toBe(201);
  });
});
