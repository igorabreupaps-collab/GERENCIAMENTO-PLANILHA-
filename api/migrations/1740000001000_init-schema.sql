-- Up Migration

-- Painel SPDA — schema inicial (self-hosted: PostgreSQL puro, sem RLS).
-- Autorização por perfil (viewer/editor/admin) é feita na API (src/middleware),
-- não no banco -- ver plano/README para a justificativa.

create extension if not exists "pgcrypto";

-- users: autenticação (e-mail + senha) e perfil de acesso, numa tabela só.
create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  nome text,
  role text not null default 'viewer' check (role in ('viewer', 'editor', 'admin')),
  created_at timestamptz not null default now()
);

-- contrato_info: metadados institucionais (1 linha só)
create table contrato_info (
  id smallint primary key default 1 check (id = 1),
  contrato text not null,
  cliente text not null,
  empresa text not null,
  objeto text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references users(id)
);

insert into contrato_info (contrato, cliente, empresa, objeto) values (
  '089/2026',
  'Ferro+ Mineração S.A',
  'MSI Engenharia e Tecnologia',
  'Sistema de Proteção contra Descargas Atmosféricas (SPDA)'
);

-- areas: equivalente à aba "Controle" da planilha
create table areas (
  id bigserial primary key,
  codigo_ld text,
  descricao text not null,
  status text,
  adequacao_geral numeric,
  validade_laudo date,
  validade_is date,
  dossie text,
  pendencia text,
  updated_at timestamptz not null default now(),
  updated_by uuid references users(id)
);

create index areas_descricao_idx on areas (descricao);

-- nao_conformidades: equivalente à seção de não conformidades da aba "RIs"
create table nao_conformidades (
  id bigserial primary key,
  area_id bigint references areas(id) on delete set null,
  area_texto text,
  numero_ri text,
  descricao text not null,
  severidade text not null default 'Não informado'
    check (severidade in ('Crítica', 'Média', 'Baixa', 'Não informado')),
  status text not null default 'Não informado'
    check (status in ('Aberta', 'Corrigida', 'Não informado')),
  responsavel text,
  data date,
  updated_at timestamptz not null default now(),
  updated_by uuid references users(id)
);

create index nao_conformidades_area_id_idx on nao_conformidades (area_id);

-- documentacao_tipos: contagem agregada por tipo de documento
create table documentacao_tipos (
  tipo text primary key,
  quantidade integer not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid references users(id)
);

-- updated_at automático em toda escrita. updated_by NÃO é setado aqui --
-- a API sabe quem é o usuário autenticado (req.user.id) e passa isso
-- explicitamente em cada INSERT/UPDATE.
create function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger areas_set_updated_at before update on areas
  for each row execute function set_updated_at();
create trigger nc_set_updated_at before update on nao_conformidades
  for each row execute function set_updated_at();
create trigger doc_set_updated_at before update on documentacao_tipos
  for each row execute function set_updated_at();
create trigger contrato_set_updated_at before update on contrato_info
  for each row execute function set_updated_at();

-- Down Migration

drop trigger if exists contrato_set_updated_at on contrato_info;
drop trigger if exists doc_set_updated_at on documentacao_tipos;
drop trigger if exists nc_set_updated_at on nao_conformidades;
drop trigger if exists areas_set_updated_at on areas;
drop function if exists set_updated_at();
drop table if exists documentacao_tipos;
drop table if exists nao_conformidades;
drop table if exists areas;
drop table if exists contrato_info;
drop table if exists users;
