const request = require("supertest");

jest.mock("../db", () => require("./helpers/queryRouter").createQueryRouter());

const db = require("../db");
const { createApp } = require("../app");
const { registerAuthenticatedUser } = require("./helpers/authHelper");

const app = createApp();
const ADMIN = { id: "admin-1", email: "admin@x.com", nome: "Admin", role: "admin" };
const EDITOR = { id: "e1", email: "editor@x.com", nome: "Editor", role: "editor" };

beforeEach(() => db.reset());

describe("GET /api/users", () => {
  test("403 para quem não é admin", async () => {
    const auth = registerAuthenticatedUser(db, EDITOR);
    const res = await request(app).get("/api/users").set("Authorization", auth);
    expect(res.status).toBe(403);
  });

  test("200 para admin", async () => {
    const auth = registerAuthenticatedUser(db, ADMIN);
    db.when(/select id, email, nome, role, created_at from users order by email/, async () => ({ rows: [] }));
    const res = await request(app).get("/api/users").set("Authorization", auth);
    expect(res.status).toBe(200);
  });
});

describe("POST /api/users", () => {
  test("400 com role inválido", async () => {
    const auth = registerAuthenticatedUser(db, ADMIN);
    const res = await request(app)
      .post("/api/users")
      .set("Authorization", auth)
      .send({ email: "novo@x.com", role: "super-admin", password: "12345678" });
    expect(res.status).toBe(400);
  });

  test("400 com senha curta", async () => {
    const auth = registerAuthenticatedUser(db, ADMIN);
    const res = await request(app)
      .post("/api/users")
      .set("Authorization", auth)
      .send({ email: "novo@x.com", role: "viewer", password: "123" });
    expect(res.status).toBe(400);
  });

  test("201 quando os dados são válidos", async () => {
    const auth = registerAuthenticatedUser(db, ADMIN);
    db.when(/insert into users/, async () => ({
      rows: [{ id: "u2", email: "novo@x.com", nome: null, role: "viewer" }],
    }));
    const res = await request(app)
      .post("/api/users")
      .set("Authorization", auth)
      .send({ email: "Novo@X.com", role: "viewer", password: "12345678" });
    expect(res.status).toBe(201);
    expect(res.body.email).toBe("novo@x.com");
  });
});

describe("PATCH /api/users/:id/role", () => {
  test("400 quando o próprio admin tenta se rebaixar", async () => {
    const auth = registerAuthenticatedUser(db, ADMIN);
    const res = await request(app)
      .patch(`/api/users/${ADMIN.id}/role`)
      .set("Authorization", auth)
      .send({ role: "viewer" });
    expect(res.status).toBe(400);
  });

  test("404 quando o usuário-alvo não existe", async () => {
    const auth = registerAuthenticatedUser(db, ADMIN);
    db.when(/update users set role = \$1/, async () => ({ rows: [] }));
    const res = await request(app)
      .patch("/api/users/nao-existe/role")
      .set("Authorization", auth)
      .send({ role: "editor" });
    expect(res.status).toBe(404);
  });

  test("200 quando o admin promove outro usuário", async () => {
    const auth = registerAuthenticatedUser(db, ADMIN);
    db.when(/update users set role = \$1/, async () => ({ rows: [{ id: "e1", role: "admin" }] }));
    const res = await request(app)
      .patch("/api/users/e1/role")
      .set("Authorization", auth)
      .send({ role: "admin" });
    expect(res.status).toBe(200);
    expect(res.body.role).toBe("admin");
  });
});
