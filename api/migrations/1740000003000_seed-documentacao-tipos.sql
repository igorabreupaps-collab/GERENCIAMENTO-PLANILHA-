-- Up Migration

insert into documentacao_tipos (tipo, quantidade) values
  ('Desenhos (DE)', 0),
  ('Memoriais Descritivos (MD)', 0),
  ('Listas de Materiais (LM)', 0),
  ('Análises de Risco (MC)', 0),
  ('Relatórios de Inspeção (RI)', 0);

-- Down Migration

delete from documentacao_tipos where tipo in (
  'Desenhos (DE)', 'Memoriais Descritivos (MD)', 'Listas de Materiais (LM)',
  'Análises de Risco (MC)', 'Relatórios de Inspeção (RI)'
);
