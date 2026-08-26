const request = require("supertest");

jest.mock("../db", () => require("./helpers/queryRouter").createQueryRouter());

const db = require("../db");
const { hashPassword } = require("../lib/password");
const { createApp } = require("../app");

const app = createApp();

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    db.reset();
  });

  test("400 quando falta e-mail ou senha", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "a@b.com" });
    expect(res.status).toBe(400);
  });

  test("401 quando o e-mail não existe", async () => {
    db.when(/from users where email = \$1/, async () => ({ rows: [] }));
    const res = await request(app).post("/api/auth/login").send({ email: "nobody@x.com", password: "whatever" });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/inválidos/);
  });

  test("401 quando a senha está errada", async () => {
    const passwordHash = await hashPassword("senha-certa");
    db.when(/from users where email = \$1/, async () => ({
      rows: [{ id: "u1", email: "a@b.com", nome: "A", role: "viewer", password_hash: passwordHash }],
    }));
    const res = await request(app).post("/api/auth/login").send({ email: "a@b.com", password: "senha-errada" });
    expect(res.status).toBe(401);
  });

  test("200 e devolve token + usuário público quando as credenciais batem", async () => {
    const passwordHash = await hashPassword("senha-certa");
    db.when(/from users where email = \$1/, async () => ({
      rows: [{ id: "u1", email: "a@b.com", nome: "A", role: "viewer", password_hash: passwordHash }],
    }));
    const res = await request(app).post("/api/auth/login").send({ email: "A@B.com", password: "senha-certa" });
    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toEqual({ id: "u1", email: "a@b.com", nome: "A", role: "viewer" });
    expect(res.body.user.password_hash).toBeUndefined();
  });
});
