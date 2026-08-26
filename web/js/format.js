// Helpers de formatação puros (sem DOM, sem rede) -- usados tanto pelo
// renderer.js no navegador quanto pelos testes em Node. Ver o final do
// arquivo pra como isso fica disponível nos dois ambientes sem build step.
function esc(s) {
  if (s === null || s === undefined) return "";
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function fmtPct(x) {
  return typeof x === "number" ? (x * 100).toFixed(1) + "%" : "—";
}

function fmtDateBR(iso) {
  if (!iso) return "—";
  var p = iso.split("-");
  return p[2] + "/" + p[1] + "/" + p[0];
}

var Format = { esc: esc, fmtPct: fmtPct, fmtDateBR: fmtDateBR };

// UMD-lite: exporta como módulo CommonJS pros testes (Node/Jest) e como
// global `Format` no navegador (script simples, sem bundler -- é a decisão
// de arquitetura deste projeto, ver README).
if (typeof module !== "undefined" && module.exports) {
  module.exports = Format;
} else {
  window.Format = Format;
}
