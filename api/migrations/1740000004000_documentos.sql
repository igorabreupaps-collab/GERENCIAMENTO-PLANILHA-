-- Up Migration

-- documentacao_tipos deixa de guardar uma contagem manual (nunca tinha
-- endpoint de escrita mesmo -- ficava sempre em 0) e vira só a lista de
-- tipos válidos, referenciada por documentos.tipo. A contagem real por tipo
-- passa a ser calculada por COUNT(*) na hora da consulta.
alter table documentacao_tipos drop trigger doc_set_updated_at;
alter table documentacao_tipos drop column quantidade;
alter table documentacao_tipos drop column updated_at;
alter table documentacao_tipos drop column updated_by;

-- documentos: equivalente simplificado das abas Desenhos/MDs/LMs/MCs/RIs da
-- planilha. Cada linha é um documento; "tipo" diz de qual aba ele veio.
-- Os títulos múltiplos e inconsistentes da planilha original (Título 1..6,
-- variando por aba) viram um único campo "titulo" -- ver decisão no plano.
create table documentos (
  id bigserial primary key,
  tipo text not null references documentacao_tipos(tipo),
  numero text not null unique,
  area_id bigint references areas(id) on delete set null,
  area_texto text,
  titulo text,
  revisao integer,
  data_emissao date,
  numero_msi text,
  numero_jmendes text,
  observacao text,
  updated_at timestamptz not null default now(),
  updated_by uuid references users(id)
);

create index documentos_tipo_idx on documentos (tipo);
create index documentos_area_id_idx on documentos (area_id);

create trigger documentos_set_updated_at before update on documentos
  for each row execute function set_updated_at();

-- Down Migration

drop trigger if exists documentos_set_updated_at on documentos;
drop table if exists documentos;

alter table documentacao_tipos add column quantidade integer not null default 0;
alter table documentacao_tipos add column updated_at timestamptz not null default now();
alter table documentacao_tipos add column updated_by uuid references users(id);
create trigger doc_set_updated_at before update on documentacao_tipos
  for each row execute function set_updated_at();
