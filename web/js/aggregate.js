// Agregação: recebe as linhas cruas das tabelas (areas/nao_conformidades/
// documentos, como a API devolve) e devolve o objeto D que alimenta
// renderDashboard(). Nenhuma chamada de rede nem acesso a DOM aqui -- é por
// isso que dá pra testar em Node sem jsdom.
var STATUS_COLOR = {
  "SPDA Conforme": "var(--status-good)",
  "Em andamento": "var(--status-warning)",
  "SPDA Não Conforme": "var(--status-critical)",
  "Paralisado/Novo Projeto": "var(--status-serious)",
  "Não informado": "var(--muted)"
};
var NC_SEV_COLOR = {
  "Crítica": "var(--status-critical)",
  "Média": "var(--status-warning)",
  "Baixa": "var(--muted)",
  "Não informado": "var(--muted)"
};
var STATUS_ORDER = ["SPDA Conforme", "Em andamento", "SPDA Não Conforme", "Paralisado/Novo Projeto", "Não informado"];
var NC_SEV_ORDER = ["Crítica", "Média", "Baixa", "Não informado"];
var STATUS_OPTIONS = STATUS_ORDER;
var SEV_ORDER_MAP = { "Crítica": 0, "Média": 1, "Baixa": 2, "Não informado": 3 };

var DOC_TIPOS = ["Desenhos (DE)", "Memoriais Descritivos (MD)", "Listas de Materiais (LM)", "Análises de Risco (MC)", "Relatórios de Inspeção (RI)"];
var DOC_TBODY_ID = {
  "Desenhos (DE)": "editor-doc-de-tbody",
  "Memoriais Descritivos (MD)": "editor-doc-md-tbody",
  "Listas de Materiais (LM)": "editor-doc-lm-tbody",
  "Análises de Risco (MC)": "editor-doc-mc-tbody",
  "Relatórios de Inspeção (RI)": "editor-doc-ri-tbody"
};

function computeAggregates(areasRaw, ncRaw, documentosRaw, contratoInfo) {
  var today = new Date(); today.setHours(0, 0, 0, 0);

  var statusCounts = {};
  var adequacoesSum = 0, adequacoesN = 0;
  areasRaw.forEach(function (a) {
    var s = a.status || "Não informado";
    statusCounts[s] = (statusCounts[s] || 0) + 1;
    if (typeof a.adequacao_geral === "number") { adequacoesSum += a.adequacao_geral; adequacoesN++; }
  });
  var adequacaoMedia = adequacoesN ? adequacoesSum / adequacoesN : null;

  var pendenciasAbertas = areasRaw
    .filter(function (a) { return a.pendencia && ["OK", "-", ""].indexOf(String(a.pendencia).trim().toUpperCase()) === -1; })
    .map(function (a) { return { area_id: a.id, area: a.descricao, codigo: a.codigo_ld, pendencia: a.pendencia }; });

  function daysDiff(iso) {
    var d = new Date(iso + "T00:00:00");
    return Math.round((d - today) / 86400000);
  }

  var vencimentos = [];
  areasRaw.forEach(function (a) {
    [["validade_laudo", "Laudo completo (medição)"], ["validade_is", "Inspeção Semestral (IS)"]].forEach(function (pair) {
      var v = a[pair[0]];
      if (!v) return;
      var dd = daysDiff(v);
      if (dd <= 90) {
        vencimentos.push({ area_id: a.id, area: a.descricao, codigo: a.codigo_ld, documento: pair[1], data: v, dias: dd, situacao: dd < 0 ? "vencido" : "vencendo" });
      }
    });
  });
  vencimentos.sort(function (a, b) { return a.dias - b.dias; });

  var areasById = {};
  areasRaw.forEach(function (a) { areasById[a.id] = a; });

  var nc = ncRaw.map(function (n) {
    var area = (n.area_id && areasById[n.area_id]) ? areasById[n.area_id].descricao : (n.area_texto || null);
    return {
      id: n.id, area_id: n.area_id, area: area,
      numero_ri: n.numero_ri, descricao: n.descricao,
      severidade: n.severidade || "Não informado", status: n.status || "Não informado",
      responsavel: n.responsavel, data: n.data
    };
  }).sort(function (a, b) {
    var sa = SEV_ORDER_MAP.hasOwnProperty(a.severidade) ? SEV_ORDER_MAP[a.severidade] : 9;
    var sb = SEV_ORDER_MAP.hasOwnProperty(b.severidade) ? SEV_ORDER_MAP[b.severidade] : 9;
    if (sa !== sb) return sa - sb;
    var oa = a.status === "Aberta" ? 0 : 1, ob = b.status === "Aberta" ? 0 : 1;
    return oa - ob;
  });

  var ncAbertas = nc.filter(function (n) { return n.status === "Aberta"; }).length;
  var ncStatusCounts = {}, ncSevCounts = {};
  nc.forEach(function (n) {
    ncStatusCounts[n.status] = (ncStatusCounts[n.status] || 0) + 1;
    ncSevCounts[n.severidade] = (ncSevCounts[n.severidade] || 0) + 1;
  });

  var documentos = (documentosRaw || []).map(function (d) {
    var area = (d.area_id && areasById[d.area_id]) ? areasById[d.area_id].descricao : (d.area_texto || null);
    return {
      id: d.id, tipo: d.tipo, numero: d.numero, area_id: d.area_id, area: area,
      titulo: d.titulo, revisao: d.revisao, data_emissao: d.data_emissao,
      numero_msi: d.numero_msi, numero_jmendes: d.numero_jmendes, observacao: d.observacao
    };
  });

  var lastUpdate = null;
  areasRaw.concat(ncRaw).forEach(function (r) {
    if (r.updated_at && (!lastUpdate || r.updated_at > lastUpdate)) lastUpdate = r.updated_at;
  });

  return {
    gerado_em: lastUpdate ? lastUpdate.slice(0, 10) : today.toISOString().slice(0, 10),
    contrato: contratoInfo ? contratoInfo.contrato : "",
    cliente: contratoInfo ? contratoInfo.cliente : "",
    empresa: contratoInfo ? contratoInfo.empresa : "",
    objeto: contratoInfo ? contratoInfo.objeto : "",
    areas: areasRaw,
    nao_conformidades: nc,
    documentos: documentos,
    areas_total: areasRaw.length,
    status_counts: statusCounts,
    adequacao_media: adequacaoMedia,
    pendencias_abertas: pendenciasAbertas,
    vencimentos: vencimentos,
    nc_abertas: ncAbertas,
    nc_status_counts: ncStatusCounts,
    nc_severidade_counts: ncSevCounts
  };
}

var Aggregate = {
  STATUS_COLOR: STATUS_COLOR,
  NC_SEV_COLOR: NC_SEV_COLOR,
  STATUS_ORDER: STATUS_ORDER,
  NC_SEV_ORDER: NC_SEV_ORDER,
  STATUS_OPTIONS: STATUS_OPTIONS,
  DOC_TIPOS: DOC_TIPOS,
  DOC_TBODY_ID: DOC_TBODY_ID,
  computeAggregates: computeAggregates
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = Aggregate;
} else {
  window.Aggregate = Aggregate;
}
