-- Up Migration

-- Views derivadas -- nunca editadas diretamente, sempre recalculadas a
-- partir de "areas". Isso é o que garante que vencimentos/pendências ficam
-- sempre corretos sem nenhuma sincronização manual.

create view v_pendencias_abertas as
select
  id as area_id,
  codigo_ld,
  descricao as area,
  pendencia
from areas
where pendencia is not null
  and trim(pendencia) not in ('', 'OK', '-')
order by descricao;

create view v_vencimentos as
select
  id as area_id,
  codigo_ld,
  descricao as area,
  'Laudo completo (medição)' as documento,
  validade_laudo as data,
  (validade_laudo - current_date)::int as dias,
  case when validade_laudo < current_date then 'vencido' else 'vencendo' end as situacao
from areas
where validade_laudo is not null
  and (validade_laudo - current_date) <= 90
union all
select
  id as area_id,
  codigo_ld,
  descricao as area,
  'Inspeção Semestral (IS)' as documento,
  validade_is as data,
  (validade_is - current_date)::int as dias,
  case when validade_is < current_date then 'vencido' else 'vencendo' end as situacao
from areas
where validade_is is not null
  and (validade_is - current_date) <= 90
order by dias;

-- Down Migration

drop view if exists v_vencimentos;
drop view if exists v_pendencias_abertas;
