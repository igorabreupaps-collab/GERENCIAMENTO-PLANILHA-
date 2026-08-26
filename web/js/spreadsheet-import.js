// Leitura da planilha (.xlsx) direto no navegador com SheetJS (global
// `XLSX`, ver vendor/xlsx.core.min.js) -- mesma lógica e mesmas colunas do
// scripts/import_planilha.py (mantidas em sincronia manualmente -- ver
// aquele arquivo se a planilha mudar de estrutura). Nenhuma chamada de rede
// nem acesso a DOM aqui: só transforma um workbook em listas de objetos.
function pad2(n) { return (n < 10 ? "0" : "") + n; }
function isoDate(d) {
  if (!(d instanceof Date) || isNaN(d)) return null;
  return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
}
function norm(s) { return (s || "").toString().trim().toLowerCase(); }
function cellAt(ws, row, col) {
  var addr = XLSX.utils.encode_cell({ r: row - 1, c: col - 1 });
  var cell = ws[addr];
  return cell ? cell.v : undefined;
}
function xlsxLastRow(ws, floor) {
  if (!ws || !ws["!ref"]) return floor;
  var range = XLSX.utils.decode_range(ws["!ref"]);
  return Math.max(range.e.r + 1, floor);
}
function lastRowWithValue(ws, col, floor, ceiling) {
  ceiling = ceiling || xlsxLastRow(ws, floor);
  var last = floor - 1;
  for (var r = floor; r <= ceiling; r++) {
    if (cellAt(ws, r, col)) last = r;
  }
  return Math.max(last, floor - 1);
}
function cellText(v) {
  if (v === undefined || v === null) return null;
  var s = String(v).trim();
  return s || null;
}

var IMPORT_DOC_SHEETS = {
  "Desenhos (DE)": { sheet: "Desenhos", dataRow: 5, floorLast: 92, tituloCols: [4, 5, 6], revCol: 8, dataCol: 9, msiCol: 10, jmCol: 11, obsCol: 2 },
  "Memoriais Descritivos (MD)": { sheet: "MDs", dataRow: 4, floorLast: 87, tituloCols: [4, 5, 6, 7, 8], revCol: 9, dataCol: 10, msiCol: 11, jmCol: 12, obsCol: 2 },
  "Listas de Materiais (LM)": { sheet: "LMs", dataRow: 4, floorLast: 89, tituloCols: [4, 5, 6, 7, 8], revCol: 9, dataCol: 10, msiCol: 11, jmCol: 12, obsCol: 2 },
  "Análises de Risco (MC)": { sheet: "MCs", dataRow: 4, floorLast: 98, tituloCols: [4, 5, 6, 7, 8], revCol: 9, dataCol: 10, msiCol: 11, jmCol: 12, obsCol: 2 },
  "Relatórios de Inspeção (RI)": { sheet: "RIs", dataRow: 4, floorLast: 99, tituloCols: [4, 5, 6, 7, 8], revCol: 9, dataCol: 10, msiCol: 11, jmCol: 12, obsCol: 2 }
};

function parseAreasFromWorkbook(wb) {
  var ws = wb.Sheets["Controle"];
  if (!ws) throw new Error('Aba "Controle" não encontrada na planilha.');
  var dataRow = 4;
  var lastRow = lastRowWithValue(ws, 5, dataRow, Math.max(200, xlsxLastRow(ws, dataRow)));
  var areas = [];
  for (var r = dataRow; r <= lastRow; r++) {
    var desc = cellAt(ws, r, 5);
    if (!desc) continue;
    var adequacao = cellAt(ws, r, 16);
    var validadeLaudo = cellAt(ws, r, 20);
    var validadeIs = cellAt(ws, r, 23);
    areas.push({
      codigo_ld: cellText(cellAt(ws, r, 2)),
      descricao: String(desc).trim(),
      status: cellText(cellAt(ws, r, 26)),
      adequacao_geral: typeof adequacao === "number" ? adequacao : null,
      validade_laudo: isoDate(validadeLaudo),
      validade_is: isoDate(validadeIs),
      dossie: cellText(cellAt(ws, r, 27)),
      pendencia: cellText(cellAt(ws, r, 29))
    });
  }
  return areas;
}

function parseNaoConformidadesFromWorkbook(wb) {
  var ws = wb.Sheets["RIs"];
  if (!ws) return [];
  var dataRow = 4;
  var lastRow = lastRowWithValue(ws, 1, dataRow, Math.max(99, xlsxLastRow(ws, dataRow)));
  var NC_DESC_COL = 13, NC_SEV_COL = 14, NC_STATUS_COL = 15, NC_RESP_COL = 16, NC_DATE_COL = 17;
  var rows = [];
  for (var r = dataRow; r <= lastRow; r++) {
    var desc = cellAt(ws, r, NC_DESC_COL);
    if (!desc || !String(desc).trim()) continue;
    rows.push({
      area_texto: cellText(cellAt(ws, r, 3)),
      numero_ri: cellText(cellAt(ws, r, 1)),
      descricao: String(desc).trim(),
      severidade: cellAt(ws, r, NC_SEV_COL) || "Não informado",
      status: cellAt(ws, r, NC_STATUS_COL) || "Não informado",
      responsavel: cellText(cellAt(ws, r, NC_RESP_COL)),
      data: isoDate(cellAt(ws, r, NC_DATE_COL))
    });
  }
  return rows;
}

function parseDocumentosFromWorkbook(wb) {
  var docs = [];
  Object.keys(IMPORT_DOC_SHEETS).forEach(function (tipo) {
    var cfg = IMPORT_DOC_SHEETS[tipo];
    var ws = wb.Sheets[cfg.sheet];
    if (!ws) return;
    var lastRow = lastRowWithValue(ws, 1, cfg.dataRow, Math.max(cfg.floorLast, xlsxLastRow(ws, cfg.dataRow)));
    for (var r = cfg.dataRow; r <= lastRow; r++) {
      var numero = cellAt(ws, r, 1);
      if (!numero) continue;
      var tituloParts = cfg.tituloCols.map(function (c) { return cellAt(ws, r, c); })
        .filter(function (v) { return v !== undefined && v !== null && String(v).trim(); })
        .map(function (v) { return String(v).trim(); });
      var revisao = cellAt(ws, r, cfg.revCol);
      docs.push({
        tipo: tipo,
        numero: String(numero).trim(),
        area_texto: cellText(cellAt(ws, r, 3)),
        titulo: tituloParts.length ? tituloParts.join(" — ") : null,
        revisao: typeof revisao === "number" ? revisao : null,
        data_emissao: isoDate(cellAt(ws, r, cfg.dataCol)),
        numero_msi: cellText(cellAt(ws, r, cfg.msiCol)),
        numero_jmendes: cellText(cellAt(ws, r, cfg.jmCol)),
        observacao: cellText(cellAt(ws, r, cfg.obsCol))
      });
    }
  });
  return docs;
}

var SpreadsheetImport = {
  norm: norm,
  parseAreasFromWorkbook: parseAreasFromWorkbook,
  parseNaoConformidadesFromWorkbook: parseNaoConformidadesFromWorkbook,
  parseDocumentosFromWorkbook: parseDocumentosFromWorkbook
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = SpreadsheetImport;
} else {
  window.SpreadsheetImport = SpreadsheetImport;
}
