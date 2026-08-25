// Cria o primeiro usuário administrador a partir das variáveis de ambiente
// BOOTSTRAP_ADMIN_EMAIL / BOOTSTRAP_ADMIN_PASSWORD / BOOTSTRAP_ADMIN_NOME.
// Idempotente (ON CONFLICT DO NOTHING) -- seguro rodar toda vez que o
// serviço "migrate" sobe, mesmo depois que o admin já existe.
//
// Isso existe porque, num banco vazio, ninguém consegue logar pra usar o
// painel Usuários e convidar o primeiro administrador -- alguém precisa
// nascer já com o cargo.
const db = require("../db");
const { hashPassword } = require("../lib/password");

async function main() {
  const email = (process.env.BOOTSTRAP_ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD || "";
  const nome = process.env.BOOTSTRAP_ADMIN_NOME || "Administrador";

  if (!email || !password) {
    console.log("BOOTSTRAP_ADMIN_EMAIL/BOOTSTRAP_ADMIN_PASSWORD não definidos -- pulando bootstrap de admin.");
    return;
  }
  if (password.length < 8) {
    throw new Error("BOOTSTRAP_ADMIN_PASSWORD precisa ter pelo menos 8 caracteres.");
  }

  const passwordHash = await hashPassword(password);
  const { rowCount } = await db.query(
    `insert into users (email, nome, role, password_hash)
     values ($1, $2, 'admin', $3)
     on conflict (email) do nothing`,
    [email, nome, passwordHash]
  );

  console.log(
    rowCount
      ? `Admin de bootstrap criado: ${email}`
      : `Admin de bootstrap já existia (${email}) -- nada a fazer.`
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Falha no bootstrap do admin:", err);
    process.exit(1);
  });
