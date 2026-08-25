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

module.exports = { buildUpdate };
