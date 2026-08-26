// Substituto mínimo de XLSX.utils (SheetJS) só com o que
// web/js/spreadsheet-import.js usa: notação A1 e range da planilha. Evita
// depender do vendor/xlsx.core.min.js (script de navegador, não é um módulo
// CommonJS) só pra rodar os testes de parsing em Node.
function colLetters(c) {
  let s = "";
  c += 1;
  while (c > 0) {
    const rem = (c - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    c = Math.floor((c - 1) / 26);
  }
  return s;
}

function encode_cell(cell) {
  return `${colLetters(cell.c)}${cell.r + 1}`;
}

function decode_range(ref) {
  const [, colS, rowS, colE, rowE] = ref.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
  function colIndex(letters) {
    let n = 0;
    for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
    return n - 1;
  }
  return {
    s: { r: parseInt(rowS, 10) - 1, c: colIndex(colS) },
    e: { r: parseInt(rowE, 10) - 1, c: colIndex(colE) },
  };
}

// Monta uma "worksheet" no formato SheetJS a partir de uma matriz de linhas
// (1-based na API de leitura, 0-based aqui internamente).
function buildSheet(rows) {
  const ws = {};
  let maxR = 0, maxC = 0;
  rows.forEach((row, r) => {
    row.forEach((value, c) => {
      if (value === undefined || value === null) return;
      ws[encode_cell({ r, c })] = { v: value };
      maxR = Math.max(maxR, r);
      maxC = Math.max(maxC, c);
    });
  });
  ws["!ref"] = `${encode_cell({ r: 0, c: 0 })}:${encode_cell({ r: maxR, c: maxC })}`;
  return ws;
}

// Monta uma worksheet a partir de células esparsas: [linha1based, coluna1based, valor].
// Mais prático que buildSheet() quando a planilha real tem dezenas de
// colunas mas só algumas importam pro teste.
function buildSheetFromCells(cells) {
  const ws = {};
  let maxR = 1, maxC = 1;
  cells.forEach(([row, col, value]) => {
    if (value === undefined || value === null) return;
    ws[encode_cell({ r: row - 1, c: col - 1 })] = { v: value };
    maxR = Math.max(maxR, row);
    maxC = Math.max(maxC, col);
  });
  ws["!ref"] = `${encode_cell({ r: 0, c: 0 })}:${encode_cell({ r: maxR - 1, c: maxC - 1 })}`;
  return ws;
}

module.exports = { XLSXUtils: { encode_cell, decode_range }, buildSheet, buildSheetFromCells };
