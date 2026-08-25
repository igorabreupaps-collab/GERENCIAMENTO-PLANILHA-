# Painel SPDA — Ferro+ Mineração / MSI Engenharia

O painel migrou de "planilha Excel + script Python" para um app web com
banco de dados de verdade (**PostgreSQL, self-hosted via Docker Compose**),
login e perfis de acesso (Visualizador / Editor / Administrador). Dado
editado por um Editor aparece automaticamente para todo mundo com o
dashboard aberto (atualização por polling a cada poucos segundos) — sem
rodar script, sem reabrir arquivo.

**O painel antigo (`dashboard.html`, gerado a partir da planilha) continua
funcionando exatamente como antes** — veja "Painel antigo (planilha)" no fim
deste documento. Nada foi apagado.

## Arquitetura

- `postgres` — PostgreSQL 16, dados persistidos num volume Docker.
- `api` — backend Node.js/Express: autenticação (e-mail+senha, JWT próprio),
  CRUD de Áreas/Não Conformidades/Documentos, gestão de usuários, e serve o
  frontend estático (`web/`) na mesma origem — sem CORS.
- `migrate` — serviço que roda uma vez a cada `docker compose up`: aplica as
  migrations SQL e garante que o primeiro usuário Administrador existe.
- `web/` — frontend (login + 6 painéis + Editor com edição real + painel
  Usuários), HTML/CSS/JS puro, sem build step.

O Editor cobre as mesmas informações das abas da planilha original: Áreas
(Controle), Não Conformidades (seção de não conformidades da aba RIs), e
Documentos — uma tabela só, com um campo `tipo`, exibida como 5 sub-abas
(Desenhos, Memoriais Descritivos, Listas de Materiais, Análises de Risco,
Relatórios de Inspeção) para espelhar a estrutura da planilha. Os múltiplos
campos "Título 1..6" inconsistentes entre abas da planilha original foram
simplificados num único campo "Título" por documento. A contagem exibida no
painel Documentação é sempre calculada a partir dos documentos cadastrados
(nunca um número digitado à parte).

Autorização por perfil é decidida inteiramente pela API (middlewares
Express) — o banco não usa Row Level Security, porque agora só a própria API
fala com o Postgres (o navegador nunca acessa o banco direto).

## Como rodar

1. Instale o [Docker](https://docs.docker.com/get-docker/) (com Docker Compose) na máquina/servidor onde isso vai rodar.
2. Copie o template de variáveis de ambiente e edite os valores:
   ```bash
   cp .env.example .env
   ```
   Troque `POSTGRES_PASSWORD`, `JWT_SECRET` (um valor aleatório longo, ex.:
   `openssl rand -base64 48`), e `BOOTSTRAP_ADMIN_EMAIL`/`BOOTSTRAP_ADMIN_PASSWORD`
   (a conta do primeiro Administrador, criada automaticamente na primeira subida).
3. Suba tudo:
   ```bash
   docker compose up -d --build
   ```
   Na primeira vez, o serviço `migrate` aplica o schema e cria o admin de
   bootstrap antes do `api` subir — acompanhe com `docker compose logs -f migrate`.
4. Abra `http://localhost:3000` (ou o endereço/porta que o reverse proxy da
   empresa expuser) e entre com o e-mail/senha do `.env`.
5. Pare tudo com `docker compose down` (ou `docker compose down -v` para
   também apagar os dados do Postgres — cuidado, isso é destrutivo).

### Criar mais usuários

Só um Administrador pode criar contas, pelo painel **Usuários** dentro do
sistema. Como não há envio de e-mail configurado neste ambiente self-hosted,
o Administrador define a senha inicial na hora e informa a pessoa por fora
(chat, telefone) — ela pode trocar a senha depois de logar.

### Evoluindo o schema depois

Migrations novas vão em `api/migrations/` (SQL puro, com `-- Up Migration` e
`-- Down Migration`), aplicadas via `node-pg-migrate`. Para rodar manualmente
contra um banco já no ar:
```bash
docker compose run --rm migrate
```

## O que ainda não foi implementado

- **Importador da planilha para o Postgres**: não existe mais nenhum script
  pronto para isso (o antigo `scripts/migrate_to_supabase.py` falava com a
  API REST do Supabase e foi removido junto com o resto daquele caminho).
  Precisaria ser escrito do zero, batendo direto na API nova, se a
  reimportação do Excel ainda for necessária.
- Troca de senha pela própria pessoa tem endpoint pronto na API
  (`PATCH /api/me/password`) mas ainda não tem botão na interface.

## Painel antigo (planilha)

Fluxo original, mantido intacto e funcional:

- `dashboard.html` — o painel pronto, gerado a partir da planilha. Abre direto no navegador.
- `K19-204-FER-LD-001-R05 - Lista de Documentos (MSI).xlsx` — a planilha oficial.
- `extract_data.py` — lê a planilha e gera `dashboard_data.json`.
- `build_dashboard.py` — gera o `dashboard.html` a partir do `dashboard_data.json`.

```bash
python3 extract_data.py "K19-204-FER-LD-001-R05 - Lista de Documentos (MSI).xlsx"
python3 build_dashboard.py dashboard_data.json dashboard.html
```
