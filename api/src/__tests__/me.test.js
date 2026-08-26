const request = require("supertest");

jest.mock("../db", () => require("./helpers/queryRouter").createQueryRouter());

const db = require("../db");
const { hashPassword } = require("../lib/password");
const { createApp } = require("../app");
const { registerAuthenticatedUser } = require("./helpers/authHelper");

const app = createApp();
const USER = { id: "u1", email: "u@x.com", nome: "U", role: "viewer" };

beforeEach(() => db.reset());

describe("GET /api/me", () => {
  test("200 com o usuário autenticado", async () => {
    const auth = registerAuthenticatedUser(db, USER);
    const res = await request(app).get("/api/me").set("Authorization", auth);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(USER);
  });
});

describe("PATCH /api/me/password", () => {
  test("400 quando falta senha atual ou nova", async () => {
    const auth = registerAuthenticatedUser(db, USER);
    const res = await request(app).patch("/api/me/password").set("Authorization", auth).send({ currentPassword: "x" });
    expect(res.status).toBe(400);
  });

  test("400 quando a nova senha tem menos de 8 caracteres", async () => {
    const auth = registerAuthenticatedUser(db, USER);
    const res = await request(app)
      .patch("/api/me/password")
      .set("Authorization", auth)
      .send({ currentPassword: "x", newPassword: "curta" });
    expect(res.status).toBe(400);
  });

  test("401 quando a senha atual está incorreta", async () => {
    const auth = registerAuthenticatedUser(db, USER);
    const hash = await hashPassword("senha-certa");
    db.when(/select password_hash from users where id = \$1/, async () => ({ rows: [{ password_hash: hash }] }));

    const res = await request(app)
      .patch("/api/me/password")
      .set("Authorization", auth)
      .send({ currentPassword: "errada", newPassword: "senha-nova-valida" });
    expect(res.status).toBe(401);
  });

  test("200 e atualiza o hash quando tudo está correto", async () => {
    const auth = registerAuthenticatedUser(db, USER);
    const hash = await hashPassword("senha-certa");
    db.when(/select password_hash from users where id = \$1/, async () => ({ rows: [{ password_hash: hash }] }));
    const updateSpy = jest.fn(async () => ({ rows: [] }));
    db.when(/update users set password_hash = \$1/, updateSpy);

    const res = await request(app)
      .patch("/api/me/password")
      .set("Authorization", auth)
      .send({ currentPassword: "senha-certa", newPassword: "senha-nova-valida" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(updateSpy).toHaveBeenCalledTimes(1);
  });
});
