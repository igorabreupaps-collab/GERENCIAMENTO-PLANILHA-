const { computeAggregates } = require("../../web/js/aggregate.js");

const TODAY = "2026-03-05T12:00:00";

function isoDaysFromToday(days) {
  const d = new Date(TODAY);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date(TODAY));
});
afterEach(() => {
  jest.useRealTimers();
});

describe("computeAggregates", () => {
  test("conta áreas por status e calcula a adequação média só sobre valores numéricos", () => {
    const areas = [
      { id: 1, descricao: "A1", status: "SPDA Conforme", adequacao_geral: 0.9 },
      { id: 2, descricao: "A2", status: "SPDA Conforme", adequacao_geral: 0.7 },
      { id: 3, descricao: "A3", status: "SPDA Não Conforme", adequacao_geral: null },
    ];
    const D = computeAggregates(areas, [], [], null);
    expect(D.status_counts).toEqual({ "SPDA Conforme": 2, "SPDA Não Conforme": 1 });
    expect(D.adequacao_media).toBeCloseTo(0.8);
    expect(D.areas_total).toBe(3);
  });

  test("área sem status cai em 'Não informado'", () => {
    const D = computeAggregates([{ id: 1, descricao: "A1" }], [], [], null);
    expect(D.status_counts).toEqual({ "Não informado": 1 });
  });

  test("pendencias_abertas ignora valores OK, '-' e vazio (case-insensitive)", () => {
    const areas = [
      { id: 1, descricao: "A1", pendencia: "ok" },
      { id: 2, descricao: "A2", pendencia: "-" },
      { id: 3, descricao: "A3", pendencia: "" },
      { id: 4, descricao: "A4", pendencia: "Aguardando ART" },
    ];
    const D = computeAggregates(areas, [], [], null);
    expect(D.pendencias_abertas).toEqual([{ area_id: 4, area: "A4", codigo: undefined, pendencia: "Aguardando ART" }]);
  });

  test("vencimentos: só entram documentos com validade em até 90 dias, marcados vencido/vencendo e ordenados por dias", () => {
    const areas = [
      { id: 1, descricao: "Vencido há 5 dias", validade_laudo: isoDaysFromToday(-5) },
      { id: 2, descricao: "Vence em 30 dias", validade_is: isoDaysFromToday(30) },
      { id: 3, descricao: "Fora da janela", validade_laudo: isoDaysFromToday(200) },
    ];
    const D = computeAggregates(areas, [], [], null);
    expect(D.vencimentos).toHaveLength(2);
    expect(D.vencimentos[0]).toMatchObject({ area: "Vencido há 5 dias", situacao: "vencido", dias: -5 });
    expect(D.vencimentos[1]).toMatchObject({ area: "Vence em 30 dias", situacao: "vencendo", dias: 30 });
  });

  test("não conformidades: resolve o nome da área por area_id (fallback pra area_texto), ordena por severidade e depois por status aberto primeiro", () => {
    const areas = [{ id: 1, descricao: "Área 1" }];
    const nc = [
      { id: 1, area_id: 1, severidade: "Baixa", status: "Aberta" },
      { id: 2, area_texto: "Área sem cadastro", severidade: "Crítica", status: "Corrigida" },
      { id: 3, area_id: 1, severidade: "Crítica", status: "Aberta" },
    ];
    const D = computeAggregates(areas, nc, [], null);
    expect(D.nao_conformidades.map((n) => n.id)).toEqual([3, 2, 1]);
    expect(D.nao_conformidades[0].area).toBe("Área 1");
    expect(D.nao_conformidades[1].area).toBe("Área sem cadastro");
    expect(D.nc_abertas).toBe(2);
  });

  test("não conformidade sem severidade/status vira 'Não informado'", () => {
    const D = computeAggregates([], [{ id: 1 }], [], null);
    expect(D.nao_conformidades[0]).toMatchObject({ severidade: "Não informado", status: "Não informado" });
  });

  test("documentos: resolve área do mesmo jeito que não conformidades", () => {
    const areas = [{ id: 1, descricao: "Área 1" }];
    const documentos = [{ id: 1, area_id: 1, tipo: "Desenhos (DE)", numero: "DE-001" }];
    const D = computeAggregates(areas, [], documentos, null);
    expect(D.documentos[0].area).toBe("Área 1");
  });

  test("repassa os campos de contrato quando informado, string vazia quando não", () => {
    const comContrato = computeAggregates([], [], [], { contrato: "C1", cliente: "X", empresa: "Y", objeto: "Z" });
    expect(comContrato).toMatchObject({ contrato: "C1", cliente: "X", empresa: "Y", objeto: "Z" });

    const semContrato = computeAggregates([], [], [], null);
    expect(semContrato).toMatchObject({ contrato: "", cliente: "", empresa: "", objeto: "" });
  });

  test("gerado_em usa o updated_at mais recente entre áreas e NCs, ou hoje se nenhum tiver", () => {
    const areas = [{ id: 1, descricao: "A1", updated_at: "2026-02-01T00:00:00Z" }];
    const nc = [{ id: 1, updated_at: "2026-02-20T00:00:00Z" }];
    const D = computeAggregates(areas, nc, [], null);
    expect(D.gerado_em).toBe("2026-02-20");

    const semUpdate = computeAggregates([], [], [], null);
    expect(semUpdate.gerado_em).toBe("2026-03-05");
  });
});
