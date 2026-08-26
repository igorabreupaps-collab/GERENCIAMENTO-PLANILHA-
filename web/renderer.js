// Camada de renderização pura (sem chamadas de rede) -- recebe um objeto D
// já calculado (ver web/js/aggregate.js) e escreve no DOM. Reaproveita quase
// 1:1 os helpers visuais que existiam em build_dashboard.py (RENDERER_JS):
// chartCard(), statTile(), gaugeRing(), *Row(), previewCard(). A diferença é
// que agora as tabelas editáveis (Áreas / Não Conformidades) chamam de volta
// callbacks (ctx.onX) em vez de acumular estado local -- cada edição salva
// direto na API por meio dessas callbacks, fornecidas pelo app.js.
//
// esc()/fmtPct()/fmtDateBR() vêm de js/format.js; STATUS_COLOR, NC_SEV_COLOR,
// STATUS_ORDER, NC_SEV_ORDER, STATUS_OPTIONS, DOC_TIPOS, DOC_TBODY_ID e
// computeAggregates() vêm de js/aggregate.js (carregados antes deste arquivo
// em index.html) -- extraídos pra módulos próprios porque são lógica pura,
// testável sem DOM.
var esc = Format.esc, fmtPct = Format.fmtPct, fmtDateBR = Format.fmtDateBR;
var STATUS_COLOR = Aggregate.STATUS_COLOR, NC_SEV_COLOR = Aggregate.NC_SEV_COLOR;
var STATUS_ORDER = Aggregate.STATUS_ORDER, NC_SEV_ORDER = Aggregate.NC_SEV_ORDER;
var STATUS_OPTIONS = Aggregate.STATUS_OPTIONS;
var DOC_TIPOS = Aggregate.DOC_TIPOS, DOC_TBODY_ID = Aggregate.DOC_TBODY_ID;
var computeAggregates = Aggregate.computeAggregates;

var ICONS = {
  "grid": '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="display:block"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
  "alert_triangle": '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="display:block"><path d="M12 3.5 21 19.5H3z"/><line x1="12" y1="9.5" x2="12" y2="13.5"/><circle cx="12" cy="16.5" r="0.9" fill="currentColor" stroke="none"/></svg>',
  "clipboard_list": '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="display:block"><rect x="6" y="4" width="12" height="17" rx="2"/><rect x="9" y="2.5" width="6" height="3" rx="1"/><line x1="9" y1="10" x2="15" y2="10"/><line x1="9" y1="13.5" x2="15" y2="13.5"/><line x1="9" y1="17" x2="13" y2="17"/></svg>',
  "alert_octagon": '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="display:block"><path d="M8 3h8l5 5v8l-5 5H8l-5-5V8z"/><line x1="12" y1="8" x2="12" y2="13"/><circle cx="12" cy="16.2" r="0.9" fill="currentColor" stroke="none"/></svg>',
  "sun": '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="display:block"><circle cx="12" cy="12" r="4.2"/><line x1="12" y1="2.5" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="21.5"/><line x1="4.2" y1="4.2" x2="6" y2="6"/><line x1="18" y1="18" x2="19.8" y2="19.8"/><line x1="2.5" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="21.5" y2="12"/><line x1="4.2" y1="19.8" x2="6" y2="18"/><line x1="18" y1="6" x2="19.8" y2="4.2"/></svg>',
  "moon": '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="display:block"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/></svg>',
  "building": '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="display:block"><rect x="4" y="3" width="11" height="18" rx="1"/><rect x="15" y="9" width="5" height="12" rx="1"/><line x1="7" y1="7" x2="7" y2="7.01"/><line x1="11" y1="7" x2="11" y2="7.01"/><line x1="7" y1="11" x2="7" y2="11.01"/><line x1="11" y1="11" x2="11" y2="11.01"/><line x1="7" y1="15" x2="7" y2="15.01"/><line x1="11" y1="15" x2="11" y2="15.01"/></svg>',
  "check_circle": '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="display:block"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9.5"/></svg>',
  "clock": '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="display:block"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/></svg>',
  "info_circle": '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="display:block"><circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16"/><circle cx="12" cy="7.8" r="0.9" fill="currentColor" stroke="none"/></svg>',
  "alert_circle": '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="display:block"><circle cx="12" cy="12" r="9"/><line x1="12" y1="7.5" x2="12" y2="13"/><circle cx="12" cy="16.2" r="0.9" fill="currentColor" stroke="none"/></svg>',
  "plus": '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="display:block"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  "users": '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="display:block"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="8.5" r="2.6"/><path d="M15.5 14.2c2.6 0.4 4.5 2.7 4.5 5.8"/></svg>',
  "edit_pencil": '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="display:block"><path d="M4 20l0.9-3.6L15.5 5.8l2.7 2.7L7.6 19.1z"/><path d="M13.7 7.6l2.7 2.7"/><path d="M4 20l3.6-0.9"/></svg>',
  "eye": '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="display:block"><path d="M2 12s3.5-7.5 10-7.5S22 12 22 12s-3.5 7.5-10 7.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  "eye_off": '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="display:block"><path d="M2 12s3.5-7.5 10-7.5c2 0 3.7 0.5 5.1 1.3M22 12s-1.4 3-4.3 5.1M9.9 9.9a3 3 0 0 0 4.2 4.2"/><path d="M6.1 6.1C3.5 7.9 2 12 2 12"/><line x1="3" y1="3" x2="21" y2="21"/></svg>',
  "upload": '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="display:block"><path d="M12 15.5V4"/><path d="M7.5 8.5 12 4l4.5 4.5"/><path d="M4.5 15.5v3a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-3"/></svg>'
};

// ---------------------------------------------------------------------
// chart / table / tile builders
// ---------------------------------------------------------------------
function barChartSVG(chartId, items, colors, unit) {
  unit = unit || "";
  var maxValue = 1;
  items.forEach(function (it) { if (it[1] > maxValue) maxValue = it[1]; });
  var barH = 24, gap = 22, topPad = 8, leftPad = 190, rightPad = 60, width = 560;
  var height = topPad * 2 + items.length * (barH + gap) - gap;
  var plotW = width - leftPad - rightPad;

  var bars = items.map(function (it, i) {
    var label = it[0], value = it[1];
    var y = topPad + i * (barH + gap);
    var bw = maxValue ? (value / maxValue) * plotW : 0;
    var color = colors[label] || "var(--series-1)";
    return (
      '<g class="bar-g" tabindex="0" role="img" aria-label="' + esc(label) + ": " + esc(value) + esc(unit) + '"' +
      ' data-label="' + esc(label) + '" data-value="' + esc(value) + esc(unit) + '">' +
      '<rect x="' + leftPad + '" y="' + y + '" width="' + plotW + '" height="' + barH + '" class="bar-track"/>' +
      '<rect x="' + leftPad + '" y="' + y + '" width="' + bw.toFixed(1) + '" height="' + barH + '" rx="4" fill="' + color + '" class="bar-fill"/>' +
      '<text x="' + (leftPad - 12) + '" y="' + (y + barH / 2) + '" text-anchor="end" dominant-baseline="middle" class="bar-catlabel">' + esc(label) + "</text>" +
      '<text x="' + (leftPad + bw + 8) + '" y="' + (y + barH / 2) + '" dominant-baseline="middle" class="bar-vallabel">' + esc(value) + esc(unit) + "</text>" +
      "</g>"
    );
  }).join("");

  var svg = '<svg class="bar-chart" id="' + chartId + '" viewBox="0 0 ' + width + " " + height + '" role="group" aria-label="Gráfico de barras">' + bars + "</svg>";
  var rows = items.map(function (it) { return "<tr><td>" + esc(it[0]) + '</td><td class="num">' + esc(it[1]) + esc(unit) + "</td></tr>"; }).join("");
  var table = '<table class="data-table"><thead><tr><th>Categoria</th><th class="num">Valor</th></tr></thead><tbody>' + rows + "</tbody></table>";
  return { svg: svg, table: table };
}

function chartCard(title, chartId, items, colors, legend, unit, emptyText) {
  if (!items.length) {
    return '<div class="card chart-card"><div class="card-head"><h3>' + esc(title) + "</h3></div>" +
      '<div class="chart-wrap"><div class="chart-view"><div class="preview-empty">' + esc(emptyText || "Sem dados no momento.") + "</div></div></div></div>";
  }
  var built = barChartSVG(chartId, items, colors, unit);
  var legendHtml = "";
  if (legend && legend.length) {
    legendHtml = '<div class="legend">' + legend.map(function (l) {
      return '<span class="legend-item"><span class="legend-swatch" style="background:' + l[1] + '"></span>' + esc(l[0]) + "</span>";
    }).join("") + "</div>";
  }
  return (
    '<div class="card chart-card"><div class="card-head"><h3>' + esc(title) + '</h3>' +
    '<button class="toggle-btn" data-target="' + chartId + '-wrap" type="button">Ver tabela</button></div>' +
    legendHtml + '<div class="chart-wrap" id="' + chartId + '-wrap">' +
    '<div class="chart-view">' + built.svg + "</div>" +
    '<div class="table-view" hidden>' + built.table + "</div></div></div>"
  );
}

function statTile(value, label, tone, sub, iconSlotHtml) {
  var subHtml = sub ? '<div class="stat-sub">' + esc(sub) + "</div>" : "";
  return '<div class="stat-tile tone-' + tone + '">' + (iconSlotHtml || "") + '<div class="stat-value">' + esc(value) + "</div>" +
    '<div class="stat-label">' + esc(label) + "</div>" + subHtml + "</div>";
}
function iconBadge(tone, iconHtml) { return '<div class="stat-icon-badge tone-' + tone + '">' + iconHtml + "</div>"; }

function gaugeRing(fraction) {
  var pct = (typeof fraction === "number") ? Math.max(0, Math.min(1, fraction)) : 0;
  var r = 15, c = 2 * Math.PI * r;
  var dash = (pct * c).toFixed(1) + " " + c.toFixed(1);
  var color = pct >= 0.95 ? "var(--status-good)" : (pct >= 0.8 ? "var(--status-warning)" : "var(--status-critical)");
  return '<svg class="gauge-ring" viewBox="0 0 34 34"><circle class="gauge-track" cx="17" cy="17" r="' + r + '"/>' +
    '<circle class="gauge-fill" cx="17" cy="17" r="' + r + '" stroke="' + color + '" stroke-dasharray="' + dash + '"/></svg>';
}

function vencDiasTxt(v) { return v.dias < 0 ? (Math.abs(v.dias) + " dias vencido") : ("vence em " + v.dias + " dias"); }
function vencRow(v) {
  var tone = v.situacao === "vencido" ? "critical" : "warning";
  return "<tr><td>" + esc(v.area) + "</td><td>" + esc(v.documento) + "</td><td>" + esc(fmtDateBR(v.data)) + "</td>" +
    '<td><span class="badge tone-' + tone + '">' + esc(vencDiasTxt(v)) + "</span></td></tr>";
}
function pendRow(p) { return "<tr><td>" + esc(p.area) + "</td><td>" + esc(p.pendencia) + "</td></tr>"; }
function ncRow(n) {
  var sevTone = n.severidade === "Crítica" ? "critical" : (n.severidade === "Média" ? "warning" : "neutral");
  var statusTone = n.status === "Aberta" ? "critical" : (n.status === "Corrigida" ? "good" : "neutral");
  return "<tr><td>" + esc(n.area) + "</td><td>" + esc(n.numero_ri) + "</td><td>" + esc(n.descricao) + "</td>" +
    '<td><span class="badge tone-' + sevTone + '">' + esc(n.severidade) + "</span></td>" +
    '<td><span class="badge tone-' + statusTone + '">' + esc(n.status) + "</span></td>" +
    "<td>" + esc(n.responsavel || "—") + "</td><td>" + esc(fmtDateBR(n.data)) + "</td></tr>";
}
function vencPreviewRow(v) {
  var tone = v.situacao === "vencido" ? "critical" : "warning";
  return '<div class="preview-row"><div><div class="preview-row-title">' + esc(v.area) + "</div>" +
    '<div class="preview-row-sub">' + esc(v.documento) + " · " + esc(fmtDateBR(v.data)) + "</div></div>" +
    '<span class="badge tone-' + tone + '">' + esc(vencDiasTxt(v)) + "</span></div>";
}
function pendPreviewRow(p) {
  return '<div class="preview-row"><div><div class="preview-row-title">' + esc(p.area) + "</div>" +
    '<div class="preview-row-sub">' + esc(p.pendencia) + "</div></div></div>";
}
function previewCard(items, buildRow, emptyText) {
  if (!items.length) return '<div class="preview-empty">' + esc(emptyText) + "</div>";
  return items.map(buildRow).join("");
}

// ---------------------------------------------------------------------
// Editor: Áreas e Não Conformidades. canEdit=false renderiza os mesmos
// campos, porém desabilitados (Visualizador vê tudo, edita nada).
// ---------------------------------------------------------------------
function areaStatusOptions(sel) {
  return STATUS_OPTIONS.map(function (o) { return "<option" + (o === sel ? " selected" : "") + ">" + o + "</option>"; }).join("");
}
function ncSevOptions(sel) {
  return ["Crítica", "Média", "Baixa"].map(function (o) { return "<option" + (o === sel ? " selected" : "") + ">" + esc(o) + "</option>"; }).join("");
}
function ncStatusOptions(sel) {
  return ["Aberta", "Corrigida"].map(function (o) { return "<option" + (o === sel ? " selected" : "") + ">" + esc(o) + "</option>"; }).join("");
}

function renderEditorAreas(rows, canEdit) {
  var tbody = document.getElementById("editor-areas-tbody");
  if (!tbody) return;
  var dis = canEdit ? "" : "disabled";
  tbody.innerHTML = rows.map(function (a) {
    return (
      '<tr data-id="' + a.id + '">' +
      '<td><input type="text" data-field="codigo_ld" value="' + esc(a.codigo_ld || "") + '" ' + dis + "></td>" +
      '<td><input type="text" data-field="descricao" value="' + esc(a.descricao || "") + '" ' + dis + "></td>" +
      '<td><select data-field="status" ' + dis + ">" + areaStatusOptions(a.status) + "</select></td>" +
      '<td><input type="number" step="0.001" min="0" max="1" data-field="adequacao_geral" value="' + esc(a.adequacao_geral === null || a.adequacao_geral === undefined ? "" : a.adequacao_geral) + '" ' + dis + "></td>" +
      '<td><input type="date" data-field="validade_laudo" value="' + esc(a.validade_laudo || "") + '" ' + dis + "></td>" +
      '<td><input type="date" data-field="validade_is" value="' + esc(a.validade_is || "") + '" ' + dis + "></td>" +
      '<td><input type="text" data-field="dossie" value="' + esc(a.dossie || "") + '" ' + dis + "></td>" +
      '<td><input type="text" data-field="pendencia" value="' + esc(a.pendencia || "") + '" ' + dis + "></td>" +
      '<td><button type="button" class="row-remove-btn" data-remove-area="' + a.id + '" title="Remover área" ' + dis + ">✕</button></td>" +
      "</tr>"
    );
  }).join("");
}

function areaSelectOptions(areas, selId) {
  return '<option value="">— sem área —</option>' + areas.map(function (a) {
    return '<option value="' + a.id + '"' + (a.id === selId ? " selected" : "") + ">" + esc(a.descricao) + "</option>";
  }).join("");
}

function renderEditorNc(rows, areas, canEdit) {
  var tbody = document.getElementById("editor-nc-tbody");
  if (!tbody) return;
  var dis = canEdit ? "" : "disabled";
  tbody.innerHTML = rows.map(function (n) {
    return (
      '<tr data-id="' + n.id + '">' +
      '<td><select data-field="area_id" ' + dis + ">" + areaSelectOptions(areas, n.area_id) + "</select></td>" +
      '<td><input type="text" data-field="numero_ri" value="' + esc(n.numero_ri || "") + '" ' + dis + "></td>" +
      '<td><input type="text" data-field="descricao" value="' + esc(n.descricao || "") + '" ' + dis + "></td>" +
      '<td><select data-field="severidade" ' + dis + ">" + ncSevOptions(n.severidade) + "</select></td>" +
      '<td><select data-field="status" ' + dis + ">" + ncStatusOptions(n.status) + "</select></td>" +
      '<td><input type="text" data-field="responsavel" value="' + esc(n.responsavel || "") + '" ' + dis + "></td>" +
      '<td><input type="date" data-field="data" value="' + esc(n.data || "") + '" ' + dis + "></td>" +
      '<td><button type="button" class="row-remove-btn" data-remove-nc="' + n.id + '" title="Remover" ' + dis + ">✕</button></td>" +
      "</tr>"
    );
  }).join("");
}

// Um documento (aba Desenhos/MDs/LMs/MCs/RIs da planilha original,
// simplificadas num campo comum). "rows" já vem filtrado por tipo pelo
// chamador -- cada tbody é uma sub-aba dentro do Editor.
function renderEditorDocumentos(tbodyId, rows, areas, canEdit) {
  var tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  var dis = canEdit ? "" : "disabled";
  tbody.innerHTML = rows.map(function (d) {
    return (
      '<tr data-id="' + d.id + '">' +
      '<td><input type="text" data-field="numero" value="' + esc(d.numero || "") + '" ' + dis + "></td>" +
      '<td><select data-field="area_id" ' + dis + ">" + areaSelectOptions(areas, d.area_id) + "</select></td>" +
      '<td><input type="text" data-field="titulo" value="' + esc(d.titulo || "") + '" ' + dis + "></td>" +
      '<td><input type="number" data-field="revisao" value="' + esc(d.revisao === null || d.revisao === undefined ? "" : d.revisao) + '" ' + dis + "></td>" +
      '<td><input type="date" data-field="data_emissao" value="' + esc(d.data_emissao || "") + '" ' + dis + "></td>" +
      '<td><input type="text" data-field="numero_msi" value="' + esc(d.numero_msi || "") + '" ' + dis + "></td>" +
      '<td><input type="text" data-field="numero_jmendes" value="' + esc(d.numero_jmendes || "") + '" ' + dis + "></td>" +
      '<td><input type="text" data-field="observacao" value="' + esc(d.observacao || "") + '" ' + dis + "></td>" +
      '<td><button type="button" class="row-remove-btn" data-remove-doc="' + d.id + '" title="Remover" ' + dis + ">✕</button></td>" +
      "</tr>"
    );
  }).join("");
}

function roleLabel(role) {
  return role === "admin" ? "Administrador" : role === "editor" ? "Editor" : "Visualizador";
}

function renderUsers(profiles, currentUserId) {
  var tbody = document.getElementById("users-tbody");
  if (!tbody) return;
  tbody.innerHTML = profiles.map(function (p) {
    var isSelf = p.id === currentUserId;
    return (
      "<tr><td>" + esc(p.email) + "</td><td>" + esc(p.nome || "—") + "</td>" +
      '<td><select data-user-role="' + p.id + '" ' + (isSelf ? "disabled" : "") + ">" +
      ["viewer", "editor", "admin"].map(function (r) {
        return '<option value="' + r + '"' + (r === p.role ? " selected" : "") + ">" + roleLabel(r) + "</option>";
      }).join("") + "</select></td>" +
      "<td>" + (isSelf ? '<span class="table-note">você</span>' : "") + "</td></tr>"
    );
  }).join("");
}

// ---------------------------------------------------------------------
// renderDashboard: popula os 6 painéis a partir de D (ver computeAggregates)
// ---------------------------------------------------------------------
function renderDashboard(D, role) {
  var statusCounts = D.status_counts || {};
  var nc = D.nao_conformidades || [];
  var ncAbertas = D.nc_abertas || 0;
  var canEdit = role === "editor" || role === "admin";

  var conformes = statusCounts["SPDA Conforme"] || 0;
  var naoConf = statusCounts["SPDA Não Conforme"] || 0;

  var vencidos = (D.vencimentos || []).filter(function (v) { return v.situacao === "vencido"; });
  var vencendo = (D.vencimentos || []).filter(function (v) { return v.situacao === "vencendo"; });
  var areasSet = {};
  (D.vencimentos || []).forEach(function (v) { areasSet[v.area] = true; });
  var areasAfetadas = Object.keys(areasSet).length;

  var pend = D.pendencias_abertas || [];
  var naoConfTone = naoConf ? "critical" : "good";

  document.getElementById("kpi-grid").innerHTML = [
    statTile(D.areas_total, "Áreas monitoradas", "brand", null, iconBadge("brand", ICONS.building)),
    statTile(fmtPct(D.adequacao_media), "Adequação técnica média", "good", null, gaugeRing(D.adequacao_media)),
    statTile(conformes, "Áreas SPDA conforme", "good", null, iconBadge("good", ICONS.check_circle)),
    statTile(naoConf, "Áreas SPDA não conforme", naoConfTone, null, iconBadge(naoConfTone, ICONS.alert_triangle)),
    statTile(vencidos.length, "Documentos de vencimento vencidos", "critical", areasAfetadas + " áreas afetadas", iconBadge("critical", ICONS.clock)),
    statTile(pend.length, "Pendências abertas", "warning", null, iconBadge("warning", ICONS.clipboard_list))
  ].join("");

  var pctBanner = D.areas_total ? Math.round((areasAfetadas / D.areas_total) * 100) : 0;
  var insightTone, insightIcon, insightHtml;
  if (vencidos.length > 0 || ncAbertas > 0) {
    insightTone = "critical"; insightIcon = ICONS.alert_triangle;
    var parts = [];
    if (vencidos.length > 0) parts.push(vencidos.length + " documento(s) de conformidade vencido(s) (" + areasAfetadas + " de " + D.areas_total + " áreas, " + pctBanner + "%)");
    if (ncAbertas > 0) parts.push(ncAbertas + " pendência(s) de execução em aberto");
    var linkPanel = vencidos.length > 0 ? "vencimentos" : "naoconformidades";
    var linkLabel = vencidos.length > 0 ? "Ver vencimentos →" : "Ver pendências de execução →";
    insightHtml = "<strong>" + parts.join(" e ") + "</strong>" + (pend.length ? ", além de " + pend.length + " pendência(s) em aberto." : ".") +
      ' <button class="link-btn" data-panel="' + linkPanel + '" type="button">' + linkLabel + "</button>";
  } else if (pend.length > 0) {
    insightTone = "warning"; insightIcon = ICONS.info_circle;
    insightHtml = "<strong>" + pend.length + " pendência(s) em aberto</strong> aguardando conclusão. Nenhum documento de conformidade vencido no momento." +
      ' <button class="link-btn" data-panel="pendencias" type="button">Ver pendências →</button>';
  } else {
    insightTone = "good"; insightIcon = ICONS.check_circle;
    insightHtml = "<strong>Tudo em dia:</strong> nenhum vencimento de conformidade, pendência de execução ou pendência em aberto no momento.";
  }
  var insightEl = document.getElementById("overview-insight");
  insightEl.className = "alert-banner tone-" + insightTone;
  insightEl.innerHTML = '<span class="icon">' + insightIcon + '</span><div>' + insightHtml + "</div>";

  var statusItems = STATUS_ORDER.filter(function (k) { return statusCounts[k] > 0; }).map(function (k) { return [k, statusCounts[k]]; });
  document.getElementById("chart-status-slot").innerHTML = chartCard(
    "Distribuição de status das áreas ativas", "chart-status", statusItems, STATUS_COLOR,
    statusItems.map(function (it) { return [it[0], STATUS_COLOR[it[0]]]; })
  );

  var ncSevCounts = {};
  nc.forEach(function (n) { var s = n.severidade || "Não informado"; ncSevCounts[s] = (ncSevCounts[s] || 0) + 1; });
  var ncItems = NC_SEV_ORDER.filter(function (k) { return ncSevCounts[k] > 0; }).map(function (k) { return [k, ncSevCounts[k]]; });
  document.getElementById("chart-nc-slot").innerHTML = chartCard(
    "Pendências de execução por severidade", "chart-nc", ncItems, NC_SEV_COLOR,
    ncItems.map(function (it) { return [it[0], NC_SEV_COLOR[it[0]]]; }), "",
    "Nenhuma pendência de execução registrada até o momento."
  );

  document.getElementById("nav-badge-vencimentos").textContent = vencidos.length;
  document.getElementById("nav-badge-pendencias").textContent = pend.length;
  document.getElementById("nav-badge-nc").textContent = ncAbertas;

  var pct = D.areas_total ? Math.round((areasAfetadas / D.areas_total) * 100) : 0;
  document.getElementById("alert-text").innerHTML = (
    "<strong>" + vencidos.length + " documentos vencidos</strong> em " + areasAfetadas + " das " + D.areas_total +
    " áreas monitoradas (" + pct + "%). Recomenda-se priorizar a renovação das inspeções semestrais e laudos completos abaixo."
  );

  var TOP_N = 20;
  var allVenc = D.vencimentos || [];
  var topVenc = allVenc.slice(0, TOP_N);
  var resto = allVenc.length - topVenc.length;
  document.getElementById("venc-tbody").innerHTML = topVenc.map(vencRow).join("");
  var restoWord = vencendo.length === 0 ? "vencidos" : "vencidos ou a vencer";
  document.getElementById("resto-note").innerHTML = resto > 0
    ? ('<p class="table-note">+ ' + resto + " outros documentos " + restoWord + " — veja a lista completa na aba Áreas do Editor.</p>")
    : "";

  document.getElementById("pend-tbody").innerHTML = pend.length ? pend.map(pendRow).join("") : '<tr><td colspan="2">Nenhuma pendência registrada.</td></tr>';
  document.getElementById("preview-venc").innerHTML = previewCard(allVenc.slice(0, 5), vencPreviewRow, "Nenhum vencimento nos próximos 90 dias.");
  document.getElementById("preview-pend").innerHTML = previewCard(pend.slice(0, 5), pendPreviewRow, "Nenhuma pendência registrada.");

  document.getElementById("nc-tbody").innerHTML = nc.length ? nc.map(ncRow).join("") :
    '<tr><td colspan="7">Nenhuma pendência de execução registrada. Cadastre pela aba Editor → Não Conformidades.</td></tr>';

  var ncBannerEl = document.getElementById("nc-alert-banner");
  var ncAlertText = document.getElementById("nc-alert-text");
  var ncAlertIcon = document.getElementById("nc-alert-icon");
  if (nc.length === 0) {
    ncBannerEl.className = "alert-banner tone-good"; ncAlertIcon.innerHTML = ICONS.check_circle;
    ncAlertText.innerHTML = "<strong>Nenhuma pendência de execução registrada até o momento.</strong>";
  } else if (ncAbertas === 0) {
    ncBannerEl.className = "alert-banner tone-good"; ncAlertIcon.innerHTML = ICONS.check_circle;
    ncAlertText.innerHTML = "<strong>Todas as " + nc.length + " pendência(s) de execução registrada(s) estão corrigidas.</strong>";
  } else {
    ncBannerEl.className = "alert-banner tone-critical"; ncAlertIcon.innerHTML = ICONS.alert_octagon;
    ncAlertText.innerHTML = "<strong>" + ncAbertas + " de " + nc.length + " pendência(s) de execução estão em aberto.</strong> Priorize as de severidade crítica.";
  }

  document.getElementById("sidebar-meta").innerHTML = (
    "Contrato " + esc(D.contrato) + "<br>" + esc(D.cliente) + "<br>Última alteração em " + esc(fmtDateBR(D.gerado_em))
  );

  renderEditorAreas(D.areas || [], canEdit);
  renderEditorNc(D.nao_conformidades || [], D.areas || [], canEdit);

  var documentos = D.documentos || [];
  DOC_TIPOS.forEach(function (tipo) {
    var rows = documentos.filter(function (d) { return d.tipo === tipo; });
    renderEditorDocumentos(DOC_TBODY_ID[tipo], rows, D.areas || [], canEdit);
  });

  document.querySelectorAll("#editor-add-area, #editor-add-nc, [data-add-doc-tipo]").forEach(function (btn) { btn.disabled = !canEdit; });
  var importFile = document.getElementById("editor-import-file");
  var importBtn = document.getElementById("editor-import-btn");
  if (importFile) importFile.disabled = !canEdit;
  if (importBtn) importBtn.classList.toggle("disabled", !canEdit);
  var readonlyBanner = document.getElementById("editor-readonly-banner");
  if (readonlyBanner) readonlyBanner.hidden = canEdit;
}
