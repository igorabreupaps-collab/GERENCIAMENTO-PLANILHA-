const request = require("supertest");

jest.mock("../db", () => require("./helpers/queryRouter").createQueryRouter());

const db = require("../db");
const { createApp } = require("../app");
const { registerAuthenticatedUser } = require("./helpers/authHelper");

const app = createApp();

const VIEWER = { id: "v1", email: "viewer@x.com", nome: "Viewer", role: "viewer" };
const EDITOR = { id: "e1", email: "editor@x.com", nome: "Editor", role: "editor" };

beforeEach(() => db.reset());

describe("GET /api/areas", () => {
  test("401 sem token", async () => {
    const res = await request(app).get("/api/areas");
    expect(res.status).toBe(401);
  });

  test("200 e lista as áreas para qualquer usuário autenticado", async () => {
    const auth = registerAuthenticatedUser(db, VIEWER);
    db.when(/select \* from areas order by descricao/, async () => ({
      rows: [{ id: 1, descricao: "Área 1" }],
    }));

    const res = await request(app).get("/api/areas").set("Authorization", auth);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: 1, descricao: "Área 1" }]);
  });
});

describe("POST /api/areas", () => {
  test("403 para role viewer", async () => {
    const auth = registerAuthenticatedUser(db, VIEWER);
    const res = await request(app).post("/api/areas").set("Authorization", auth).send({});
    expect(res.status).toBe(403);
  });

  test("201 para editor, usando o default de descrição quando body vazio", async () => {
    const auth = registerAuthenticatedUser(db, EDITOR);
    db.when(/insert into areas/, async (sql, params) => {
      expect(params).toContain("Nova área");
      return { rows: [{ id: 1, descricao: "Nova área" }] };
    });

    const res = await request(app).post("/api/areas").set("Authorization", auth).send({});
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: 1, descricao: "Nova área" });
  });
});

describe("PATCH /api/areas/:id", () => {
  test("400 quando nenhum campo válido é enviado", async () => {
    const auth = registerAuthenticatedUser(db, EDITOR);
    const res = await request(app).patch("/api/areas/1").set("Authorization", auth).send({ campo_invalido: "x" });
    expect(res.status).toBe(400);
  });

  test("404 quando a área não existe", async () => {
    const auth = registerAuthenticatedUser(db, EDITOR);
    db.when(/update areas set/, async () => ({ rows: [] }));
    const res = await request(app).patch("/api/areas/999").set("Authorization", auth).send({ descricao: "X" });
    expect(res.status).toBe(404);
  });

  test("200 com o registro atualizado", async () => {
    const auth = registerAuthenticatedUser(db, EDITOR);
    db.when(/update areas set/, async () => ({ rows: [{ id: 1, descricao: "Atualizada" }] }));
    const res = await request(app).patch("/api/areas/1").set("Authorization", auth).send({ descricao: "Atualizada" });
    expect(res.status).toBe(200);
    expect(res.body.descricao).toBe("Atualizada");
  });
});

describe("DELETE /api/areas/:id", () => {
  test("204 e não retorna corpo", async () => {
    const auth = registerAuthenticatedUser(db, EDITOR);
    db.when(/delete from areas where id = \$1/, async () => ({ rows: [] }));
    const res = await request(app).delete("/api/areas/1").set("Authorization", auth);
    expect(res.status).toBe(204);
    expect(res.body).toEqual({});
  });
});
