// Monta um UPDATE parametrizado só com os campos permitidos que vieram no
// body (edição parcial por campo, como o frontend já faz hoje -- cada input
// da tabela do Editor salva um campo por vez). Sempre inclui updated_by.
function buildUpdate(table, allowedFields, body, id, userId) {
  const sets = [];
  const values = [];
  let i = 1;

  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      sets.push(`${field} = $${i++}`);
      values.push(body[field] === "" ? null : body[field]);
    }
  }

  if (!sets.length) {
    return null;
  }

  sets.push(`updated_by = $${i++}`);
  values.push(userId);

  values.push(id);
  const sql = `update ${table} set ${sets.join(", ")} where id = $${i} returning *`;
  return { sql, values };
}

// Monta um INSERT parametrizado a partir dos campos permitidos que vieram no
// body, preenchendo com "defaults" quem não veio (usado tanto pelo botão
// "Adicionar" da interface -- body quase vazio, cai tudo em default -- quanto
// por importações em lote, que mandam a linha já preenchida inteira).
function buildInsert(table, allowedFields, body, defaults, userId) {
  const cols = [];
  const placeholders = [];
  const values = [];
  let i = 1;

  for (const field of allowedFields) {
    const provided = Object.prototype.hasOwnProperty.call(body, field) && body[field] !== undefined && body[field] !== "";
    const hasDefault = Object.prototype.hasOwnProperty.call(defaults, field);
    if (!provided && !hasDefault) continue;
    cols.push(field);
    placeholders.push(`$${i++}`);
    values.push(provided ? body[field] : defaults[field]);
  }

  cols.push("updated_by");
  placeholders.push(`$${i++}`);
  values.push(userId);

  const sql = `insert into ${table} (${cols.join(", ")}) values (${placeholders.join(", ")}) returning *`;
  return { sql, values };
}

module.exports = { buildUpdate, buildInsert };
