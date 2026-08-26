const { XLSXUtils, buildSheetFromCells } = require("./helpers/fakeXlsxUtils");

global.XLSX = { utils: XLSXUtils };

const {
  parseAreasFromWorkbook,
  parseNaoConformidadesFromWorkbook,
  parseDocumentosFromWorkbook,
} = require("../../web/js/spreadsheet-import.js");

describe("parseAreasFromWorkbook", () => {
  test("lê uma linha da aba Controle e formata as datas como ISO", () => {
    const wb = {
      Sheets: {
        Controle: buildSheetFromCells([
          [4, 2, "LD-01"], // codigo_ld
          [4, 5, "Área 1"], // descricao
          [4, 16, 0.85], // adequacao_geral
          [4, 20, new Date(2026, 5, 15)], // validade_laudo (mês 0-based: junho)
          [4, 23, new Date(2026, 7, 1)], // validade_is
          [4, 26, "SPDA Conforme"], // status
          [4, 27, "Sim"], // dossie
          [4, 29, "OK"], // pendencia
        ]),
      },
    };
    const areas = parseAreasFromWorkbook(wb);
    expect(areas).toEqual([
      {
        codigo_ld: "LD-01",
        descricao: "Área 1",
        status: "SPDA Conforme",
        adequacao_geral: 0.85,
        validade_laudo: "2026-06-15",
        validade_is: "2026-08-01",
        dossie: "Sim",
        pendencia: "OK",
      },
    ]);
  });

  test("pula linhas sem descrição", () => {
    const wb = { Sheets: { Controle: buildSheetFromCells([[4, 2, "LD-01"]]) } };
    expect(parseAreasFromWorkbook(wb)).toEqual([]);
  });

  test("lança erro descritivo quando a aba Controle não existe", () => {
    expect(() => parseAreasFromWorkbook({ Sheets: {} })).toThrow(/Controle/);
  });
});

describe("parseNaoConformidadesFromWorkbook", () => {
  test("lê uma linha da aba RIs, usando 'Não informado' quando faltam severidade/status", () => {
    const wb = {
      Sheets: {
        RIs: buildSheetFromCells([
          [4, 1, "RI-001"], // numero_ri
          [4, 3, "Área 1"], // area_texto
          [4, 13, "Descrição da ocorrência"], // NC_DESC_COL
        ]),
      },
    };
    expect(parseNaoConformidadesFromWorkbook(wb)).toEqual([
      {
        area_texto: "Área 1",
        numero_ri: "RI-001",
        descricao: "Descrição da ocorrência",
        severidade: "Não informado",
        status: "Não informado",
        responsavel: null,
        data: null,
      },
    ]);
  });

  test("devolve lista vazia quando a aba RIs não existe (documentos ainda podem ser importados)", () => {
    expect(parseNaoConformidadesFromWorkbook({ Sheets: {} })).toEqual([]);
  });
});

describe("parseDocumentosFromWorkbook", () => {
  test("lê uma linha da aba MDs e concatena os campos de título não vazios", () => {
    const wb = {
      Sheets: {
        MDs: buildSheetFromCells([
          [4, 1, "MD-001"], // numero
          [4, 3, "Área 1"], // area_texto
          [4, 4, "Parte 1"],
          [4, 5, ""],
          [4, 6, "Parte 3"],
          [4, 9, 2], // revisao
          [4, 10, new Date(2026, 0, 10)], // data_emissao
          [4, 11, "MSI-1"],
          [4, 12, "JM-1"],
          [4, 2, "obs"],
        ]),
      },
    };
    const docs = parseDocumentosFromWorkbook(wb);
    const md = docs.find((d) => d.tipo === "Memoriais Descritivos (MD)");
    expect(md).toEqual({
      tipo: "Memoriais Descritivos (MD)",
      numero: "MD-001",
      area_texto: "Área 1",
      titulo: "Parte 1 — Parte 3",
      revisao: 2,
      data_emissao: "2026-01-10",
      numero_msi: "MSI-1",
      numero_jmendes: "JM-1",
      observacao: "obs",
    });
  });

  test("pula linhas sem número e ignora abas ausentes na planilha", () => {
    const wb = { Sheets: { MDs: buildSheetFromCells([[4, 3, "Área 1"]]) } };
    expect(parseDocumentosFromWorkbook(wb)).toEqual([]);
  });
});
