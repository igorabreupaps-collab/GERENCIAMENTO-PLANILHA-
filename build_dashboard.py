# -*- coding: utf-8 -*-
"""
Gera o dashboard HTML (self-contained) a partir de dashboard_data.json.

A partir desta versao, TODA a renderizacao (KPIs, graficos, tabelas) e feita
em JavaScript no navegador, a partir de um objeto de dados D. O Python so
gera o "estado inicial" (INITIAL_DATA, extraido da planilha na hora da
geracao) e embute a biblioteca SheetJS + o motor de renderizacao em JS.

Isso permite que o dashboard tenha um botao "Carregar planilha": o usuario
seleciona um .xlsx atualizado, o proprio navegador le e recalcula os dados
(sem precisar do Excel, de macro, ou de voltar a pedir para o Claude) e
re-renderiza o painel inteiro na hora.

Uso:
    python3 build_dashboard.py dashboard_data.json dashboard.html [sheetjs.js]
"""
import json
import sys
import os


def resolve_paths(argv):
    """CLI args -> (data_path, out_path, sheetjs_path), com os defaults de
    sempre. Extraído do nível de módulo pra não rodar (nem exigir um
    dashboard_data.json no disco) só por importar este arquivo -- é o que
    permite testar render_html() isoladamente."""
    data_path = argv[1] if len(argv) > 1 else "dashboard_data.json"
    out_path = argv[2] if len(argv) > 2 else "dashboard.html"
    sheetjs_path = argv[3] if len(argv) > 3 else os.path.join(
        os.path.dirname(os.path.abspath(__file__)), "vendor", "xlsx.core.min.js"
    )
    return data_path, out_path, sheetjs_path


def read_text_file(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def load_json_data(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)

# ---------------------------------------------------------------------------
# Icon set: small hand-authored outline SVGs (stroke-based, 24x24 viewBox,
# currentColor) so the dashboard reads as "enterprise software" instead of
# emoji. Defined once here and mirrored into JS (as ICONS_JS below) so both
# the static HTML shell and the dynamic renderer draw from the same set.
# ---------------------------------------------------------------------------
def _svg(inner):
    return (
        '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
        'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" '
        'style="display:block">' + inner + "</svg>"
    )

ICONS = {
    "grid": _svg('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>'
                 '<rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'),
    "alert_triangle": _svg('<path d="M12 3.5 21 19.5H3z"/><line x1="12" y1="9.5" x2="12" y2="13.5"/>'
                            '<circle cx="12" cy="16.5" r="0.9" fill="currentColor" stroke="none"/>'),
    "clipboard_list": _svg('<rect x="6" y="4" width="12" height="17" rx="2"/><rect x="9" y="2.5" width="6" height="3" rx="1"/>'
                            '<line x1="9" y1="10" x2="15" y2="10"/><line x1="9" y1="13.5" x2="15" y2="13.5"/><line x1="9" y1="17" x2="13" y2="17"/>'),
    "alert_octagon": _svg('<path d="M8 3h8l5 5v8l-5 5H8l-5-5V8z"/><line x1="12" y1="8" x2="12" y2="13"/>'
                           '<circle cx="12" cy="16.2" r="0.9" fill="currentColor" stroke="none"/>'),
    "file_text": _svg('<path d="M7 2.5h7l4 4v14.5a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1z"/><path d="M14 2.5V7h4"/>'
                       '<line x1="8.5" y1="12" x2="15.5" y2="12"/><line x1="8.5" y1="15.5" x2="15.5" y2="15.5"/><line x1="8.5" y1="19" x2="12.5" y2="19"/>'),
    "upload": _svg('<path d="M12 15.5V4"/><path d="M7.5 8.5 12 4l4.5 4.5"/><path d="M4.5 15.5v3a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-3"/>'),
    "download": _svg('<path d="M12 4v11.5"/><path d="M7.5 11 12 15.5 16.5 11"/><path d="M4.5 17.5v3a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-3"/>'),
    "sun": _svg('<circle cx="12" cy="12" r="4.2"/><line x1="12" y1="2.5" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="21.5"/>'
                '<line x1="4.2" y1="4.2" x2="6" y2="6"/><line x1="18" y1="18" x2="19.8" y2="19.8"/><line x1="2.5" y1="12" x2="5" y2="12"/>'
                '<line x1="19" y1="12" x2="21.5" y2="12"/><line x1="4.2" y1="19.8" x2="6" y2="18"/><line x1="18" y1="6" x2="19.8" y2="4.2"/>'),
    "moon": _svg('<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/>'),
    "building": _svg('<rect x="4" y="3" width="11" height="18" rx="1"/><rect x="15" y="9" width="5" height="12" rx="1"/>'
                      '<line x1="7" y1="7" x2="7" y2="7.01"/><line x1="11" y1="7" x2="11" y2="7.01"/>'
                      '<line x1="7" y1="11" x2="7" y2="11.01"/><line x1="11" y1="11" x2="11" y2="11.01"/>'
                      '<line x1="7" y1="15" x2="7" y2="15.01"/><line x1="11" y1="15" x2="11" y2="15.01"/>'),
    "check_circle": _svg('<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9.5"/>'),
    "clock": _svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>'),
    "info_circle": _svg('<circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16"/>'
                         '<circle cx="12" cy="7.8" r="0.9" fill="currentColor" stroke="none"/>'),
    "alert_circle": _svg('<circle cx="12" cy="12" r="9"/><line x1="12" y1="7.5" x2="12" y2="13"/>'
                          '<circle cx="12" cy="16.2" r="0.9" fill="currentColor" stroke="none"/>'),
    "edit_pencil": _svg('<path d="M4 20l0.9-3.6L15.5 5.8l2.7 2.7L7.6 19.1z"/><path d="M13.7 7.6l2.7 2.7"/>'
                         '<path d="M4 20l3.6-0.9"/>'),
    "plus": _svg('<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>'),
    "trash": _svg('<path d="M5 7h14"/><path d="M9 7V4.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1V7"/>'
                   '<path d="M7 7l0.8 12a1.5 1.5 0 0 0 1.5 1.4h5.4a1.5 1.5 0 0 0 1.5-1.4L17 7"/>'),
    "cloud_check": _svg('<path d="M7.5 18a4.5 4.5 0 0 1-0.6-8.96A5.5 5.5 0 0 1 17.4 8.1 4 4 0 0 1 17 16H8z"/>'
                         '<path d="M9.5 13l2 2 3.5-3.8"/>'),
}
ICONS_JS = "var ICONS = " + json.dumps(ICONS, ensure_ascii=False) + ";\n"

# ---------------------------------------------------------------------------
# CSS (static; no Python interpolation needed)
# ---------------------------------------------------------------------------
CSS = """
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
:root {
  color-scheme: light;
  --page: #f9f9f7;
  --surface: #ffffff;
  --text-primary: #0b0b0b;
  --text-secondary: #52514e;
  --muted: #898781;
  --gridline: #e1e0d9;
  --border: rgba(11,11,11,0.08);
  --shadow-sm: 0 1px 2px rgba(11,11,11,0.04), 0 1px 3px rgba(11,11,11,0.06);
  --shadow-md: 0 4px 10px rgba(11,11,11,0.06), 0 2px 4px rgba(11,11,11,0.05);
  --brand: #1F3864;
  --brand-light: #2E4E8C;
  --series-1: #2a78d6;
  --status-good: #0ca30c;
  --status-warning: #fab219;
  --status-serious: #ec835a;
  --status-critical: #d03b3b;
  --tone-good-bg: #e8f6e8;
  --tone-warning-bg: #fff4e0;
  --tone-critical-bg: #fbe9e9;
  --tone-brand-bg: #e9edf5;
  --tone-neutral-bg: rgba(137,135,129,0.14);
  --sidebar-bg: #14213d;
  --sidebar-ink: #dfe4f0;
  --sidebar-muted: #8f9bbd;
  --sidebar-active: #1F3864;
}
:root[data-theme="dark"] {
  color-scheme: dark;
  --page: #0d0d0d;
  --surface: #1a1a19;
  --text-primary: #ffffff;
  --text-secondary: #c3c2b7;
  --muted: #898781;
  --gridline: #2c2c2a;
  --border: rgba(255,255,255,0.09);
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.35), 0 1px 3px rgba(0,0,0,0.28);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.4), 0 2px 5px rgba(0,0,0,0.3);
  --brand: #4a6fb5;
  --brand-light: #5c82c9;
  --series-1: #3987e5;
  --tone-good-bg: #123312;
  --tone-warning-bg: #3a2c0c;
  --tone-critical-bg: #3a1414;
  --tone-brand-bg: #182236;
  --tone-neutral-bg: rgba(137,135,129,0.18);
  --sidebar-bg: #0a0f1e;
  --sidebar-ink: #dfe4f0;
  --sidebar-muted: #6f7ba0;
  --sidebar-active: #1F3864;
}
* { box-sizing: border-box; }
html, body { height: 100%; margin: 0; }
body {
  font-family: "Inter", system-ui, -apple-system, "Segoe UI", sans-serif;
  background: var(--page);
  color: var(--text-primary);
  overflow: hidden;
  -webkit-font-smoothing: antialiased;
}

.app { display: flex; height: 100vh; width: 100vw; }

/* ---------- Sidebar ---------- */
.sidebar {
  width: 302px;
  flex: 0 0 302px;
  background: var(--sidebar-bg);
  color: var(--sidebar-ink);
  display: flex;
  flex-direction: column;
  padding: 20px 14px;
  overflow-y: auto;
}
.sidebar .wordmark { font-size: 16.5px; font-weight: 800; letter-spacing: 0.2px; color: #fff; }
.sidebar .tagline { font-size: 10.5px; color: var(--sidebar-muted); letter-spacing: 1.5px; text-transform: uppercase; margin-top: 3px; }
.sidebar .brand-block { padding: 4px 8px 18px; border-bottom: 1px solid rgba(255,255,255,0.08); margin-bottom: 14px; }

.nav-menu { list-style: none; margin: 0; padding: 0; flex: 1; }
.nav-menu li { margin-bottom: 2px; }
.nav-item {
  width: 100%; display: flex; align-items: center; gap: 11px;
  background: transparent; border: none; color: var(--sidebar-ink);
  font-size: 13.5px; text-align: left; padding: 10px 11px; border-radius: 9px;
  cursor: pointer; font-family: inherit; transition: background 0.12s ease;
}
.nav-item .nav-icon { font-size: 16px; width: 18px; flex: 0 0 18px; display: flex; align-items: center; justify-content: center; color: var(--sidebar-muted); }
.nav-item.active .nav-icon, .nav-item:hover .nav-icon { color: #fff; }
.nav-item .nav-label { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nav-item:hover { background: rgba(255,255,255,0.06); }
.nav-item.active { background: var(--sidebar-active); color: #fff; font-weight: 600; box-shadow: var(--shadow-sm); }
.nav-badge {
  font-size: 11px; font-weight: 700; border-radius: 999px; padding: 1px 8px;
  background: var(--status-critical); color: #fff; min-width: 10px; text-align: center;
}
.nav-badge.tone-warning { background: var(--status-warning); color: #3a2c0c; }
.nav-badge.tone-good { background: var(--status-good); color: #fff; }

.upload-block { margin: 4px 0 14px; }
.upload-btn {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  text-align: center; background: var(--sidebar-active); color: #fff;
  border-radius: 9px; padding: 10px 10px; font-size: 13px; cursor: pointer; font-weight: 600;
  transition: background 0.12s ease;
}
.upload-btn .btn-icon { font-size: 15px; display: flex; }
.upload-btn:hover { background: var(--brand-light); }
.upload-hint { font-size: 10.5px; color: var(--sidebar-muted); margin-top: 6px; line-height: 1.4; }
.upload-status { font-size: 11.5px; margin-top: 8px; line-height: 1.4; word-break: break-word; color: var(--sidebar-muted); }
.upload-status.ok { color: #8fd98f; }
.upload-status.err { color: #ff9b9b; }
.download-btn {
  width: 100%; margin-top: 8px; border: 1px solid rgba(255,255,255,0.16); background: transparent;
  color: var(--sidebar-ink); border-radius: 999px; padding: 7px 10px; font-size: 12px; cursor: pointer;
  font-family: inherit; display: flex; align-items: center; justify-content: center; gap: 7px;
  transition: background 0.12s ease;
}
.download-btn .btn-icon { font-size: 13px; display: flex; }
.download-btn:hover { background: rgba(255,255,255,0.08); }

.sidebar-footer { border-top: 1px solid rgba(255,255,255,0.08); padding-top: 14px; margin-top: 10px; }
.theme-toggle {
  width: 100%; border: 1px solid rgba(255,255,255,0.16); background: transparent; color: var(--sidebar-ink);
  border-radius: 999px; padding: 8px 12px; font-size: 12.5px; cursor: pointer; font-family: inherit;
  display: flex; align-items: center; justify-content: center; gap: 8px; transition: background 0.12s ease;
}
.theme-toggle .btn-icon { font-size: 14px; display: flex; }
.theme-toggle:hover { background: rgba(255,255,255,0.08); }
.sidebar-meta { font-size: 11px; color: var(--sidebar-muted); line-height: 1.7; margin-top: 12px; }

/* ---------- Main content ---------- */
.main { flex: 1; min-width: 0; height: 100vh; overflow: hidden; display: flex; flex-direction: column; }
.panel { display: none; flex-direction: column; height: 100%; padding: 22px 30px; overflow: hidden; }
.panel.active { display: flex; }
.panel-head { flex: 0 0 auto; margin-bottom: 14px; }
.panel-body { flex: 1; min-height: 0; overflow-y: auto; }

h1.title { font-size: 19px; font-weight: 700; letter-spacing: -0.1px; margin: 0 0 3px; }
.subtitle { color: var(--text-secondary); font-size: 13px; margin: 0; }

.stat-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; margin-bottom: 16px; flex: 0 0 auto; }
.stat-tile {
  background: var(--surface); border: 1px solid var(--border); border-radius: 14px;
  padding: 14px 12px; text-align: center; box-shadow: var(--shadow-sm);
}
.stat-tile .stat-value { font-size: 24px; font-weight: 700; line-height: 1.1; letter-spacing: -0.2px; }
.stat-tile .stat-label { font-size: 11px; color: var(--text-secondary); margin-top: 5px; line-height: 1.25; min-height: 28px; }
.stat-tile .stat-sub { font-size: 10.5px; color: var(--muted); margin-top: 3px; }
.tone-brand .stat-value { color: var(--brand); }
.tone-good .stat-value { color: var(--status-good); }
.tone-warning .stat-value { color: #a86a00; }
.tone-critical .stat-value { color: var(--status-critical); }
:root[data-theme="dark"] .tone-warning .stat-value { color: var(--status-warning); }

.stat-icon-badge {
  width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center;
  margin: 0 auto 9px; font-size: 17px;
}
.stat-icon-badge.tone-brand { background: var(--tone-brand-bg); color: var(--brand); }
.stat-icon-badge.tone-good { background: var(--tone-good-bg); color: var(--status-good); }
.stat-icon-badge.tone-warning { background: var(--tone-warning-bg); color: #a86a00; }
:root[data-theme="dark"] .stat-icon-badge.tone-warning { color: var(--status-warning); }
.stat-icon-badge.tone-critical { background: var(--tone-critical-bg); color: var(--status-critical); }

.gauge-ring { width: 34px; height: 34px; margin: 0 auto 9px; }
.gauge-ring circle { fill: none; stroke-width: 3.4; }
.gauge-ring .gauge-track { stroke: var(--gridline); }
.gauge-ring .gauge-fill { stroke-linecap: round; transform: rotate(-90deg); transform-origin: 50% 50%; transition: stroke-dasharray 0.3s ease; }

.grid-2 { display: flex; gap: 16px; flex: 1; min-height: 0; }
.grid-2 > div { flex: 1; min-width: 0; min-height: 0; display: flex; flex-direction: column; }
.grid-2 .card { flex: 1; min-height: 0; display: flex; flex-direction: column; }
.chart-wrap { flex: 1; min-height: 0; display: flex; flex-direction: column; }
.chart-view { flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center; }
.card {
  background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 16px 18px;
  box-shadow: var(--shadow-sm);
}
.card-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.card h3 { font-size: 14px; font-weight: 600; margin: 0; }
.toggle-btn {
  font-size: 12px; border: 1px solid var(--border); background: transparent; color: var(--text-secondary);
  padding: 5px 10px; border-radius: 6px; cursor: pointer; font-family: inherit; transition: background 0.12s ease;
}
.toggle-btn:hover { background: var(--page); }
.legend { display: flex; flex-wrap: wrap; gap: 12px; font-size: 12px; color: var(--text-secondary); margin: 6px 0 2px; }
.legend-item { display: flex; align-items: center; gap: 6px; }
.legend-swatch { width: 10px; height: 10px; border-radius: 2px; display: inline-block; }

.bar-chart { width: 100%; height: 100%; }
.bar-track { fill: var(--gridline); }
.bar-catlabel { font-size: 12px; fill: var(--text-secondary); }
.bar-vallabel { font-size: 12px; fill: var(--text-primary); font-weight: 600; }
.bar-g { cursor: pointer; outline: none; }
.bar-g:focus .bar-fill, .bar-g:hover .bar-fill { opacity: 0.82; }

.data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.data-table th, .data-table td { text-align: left; padding: 7px 8px; border-bottom: 1px solid var(--gridline); }
.data-table th.num, .data-table td.num { text-align: right; font-variant-numeric: tabular-nums; }

.alert-banner {
  display: flex; align-items: center; gap: 13px; background: var(--tone-critical-bg);
  border: 1px solid rgba(208,59,59,0.28); border-radius: 12px; padding: 12px 16px; margin-bottom: 14px;
  flex: 0 0 auto; font-size: 13px;
}
.alert-banner .icon { font-size: 19px; color: var(--status-critical); display: flex; flex: 0 0 auto; }
.alert-banner strong { color: var(--status-critical); }
.alert-banner.tone-warning { background: var(--tone-warning-bg); border-color: rgba(168,106,0,0.28); }
.alert-banner.tone-warning .icon { color: #a86a00; }
.alert-banner.tone-warning strong { color: #a86a00; }
:root[data-theme="dark"] .alert-banner.tone-warning strong,
:root[data-theme="dark"] .alert-banner.tone-warning .icon { color: var(--status-warning); }
.alert-banner.tone-good { background: var(--tone-good-bg); border-color: rgba(12,163,12,0.28); }
.alert-banner.tone-good .icon { color: var(--status-good); }
.alert-banner.tone-good strong { color: var(--status-good); }

.link-btn {
  font-size: 12px; border: 1px solid var(--border); background: transparent; color: var(--brand);
  padding: 5px 10px; border-radius: 6px; cursor: pointer; font-family: inherit; font-weight: 600; white-space: nowrap;
}
.link-btn:hover { background: var(--page); }
:root[data-theme="dark"] .link-btn { color: var(--brand-light); }
.alert-banner .link-btn { margin-left: auto; flex: 0 0 auto; }

/* ---------- Overview: fills remaining vertical space with charts + previews ---------- */
.overview-body { display: flex; flex-direction: column; gap: 16px; flex: 1; min-height: 0; }
.preview-list { display: flex; flex-direction: column; gap: 1px; overflow-y: auto; flex: 1; min-height: 0; }
.preview-row {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  padding: 10px 4px; border-bottom: 1px solid var(--gridline); transition: background 0.1s ease;
}
.preview-list > .preview-row:last-child { border-bottom: none; }
.preview-row:hover { background: var(--page); }
.preview-row-title { font-size: 13px; font-weight: 600; }
.preview-row-sub { font-size: 11.5px; color: var(--text-secondary); margin-top: 2px; }
.preview-empty { font-size: 13px; color: var(--muted); padding: 16px 4px; text-align: center; }
.stat-icon { font-size: 17px; margin-bottom: 4px; opacity: 0.85; line-height: 1; }

table.list-table { width: 100%; border-collapse: collapse; font-size: 13px; background: var(--surface);
  border: 1px solid var(--border); border-radius: 14px; overflow: hidden; box-shadow: var(--shadow-sm); }
table.list-table th {
  background: var(--page); color: var(--text-secondary); text-align: left; padding: 10px 12px;
  font-weight: 600; font-size: 11px; letter-spacing: 0.04em; text-transform: uppercase;
  border-bottom: 1px solid var(--gridline); position: sticky; top: 0;
}
table.list-table td { padding: 10px 12px; border-bottom: 1px solid var(--gridline); vertical-align: top; }
table.list-table tr:last-child td { border-bottom: none; }
table.list-table tbody tr { transition: background 0.1s ease; }
table.list-table tbody tr:hover { background: var(--page); }
.table-note { font-size: 12px; color: var(--muted); margin: 8px 2px 0; flex: 0 0 auto; }

.table-scroll { flex: 1; min-height: 0; overflow-y: auto; border-radius: 14px; box-shadow: var(--shadow-sm); }
.table-scroll table.list-table { border-radius: 0; box-shadow: none; }

.badge { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 999px; font-size: 11.5px; font-weight: 600; white-space: nowrap; }
.badge.tone-critical { background: var(--tone-critical-bg); color: var(--status-critical); }
.badge.tone-warning { background: var(--tone-warning-bg); color: #a86a00; }
:root[data-theme="dark"] .badge.tone-warning { color: var(--status-warning); }
.badge.tone-good { background: var(--tone-good-bg); color: var(--status-good); }
.badge.tone-neutral { background: var(--tone-neutral-bg); color: var(--text-secondary); }

.tooltip {
  position: fixed; pointer-events: none; background: var(--text-primary); color: var(--surface);
  font-size: 12px; padding: 6px 10px; border-radius: 6px; opacity: 0; transform: translate(-50%, -110%);
  transition: opacity 0.1s; z-index: 50; white-space: nowrap;
}
.tooltip.show { opacity: 0.95; }
.tooltip .tt-value { font-weight: 700; }

/* ---------- Upload confirmation toast ---------- */
.toast {
  position: fixed; bottom: 24px; right: 24px; left: auto; transform: translateY(24px);
  display: flex; align-items: flex-start; gap: 10px;
  background: var(--status-good); color: #fff; font-size: 13.5px; font-weight: 600; line-height: 1.4;
  padding: 13px 18px; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.3);
  opacity: 0; pointer-events: none; transition: opacity 0.25s ease, transform 0.25s ease;
  z-index: 100; max-width: 340px;
}
.toast.show { opacity: 1; transform: translateY(0); }
.toast.err { background: var(--status-critical); }
.toast .toast-icon { font-size: 17px; flex: 0 0 auto; margin-top: 1px; display: flex; }

@keyframes highlightPulse {
  0% { box-shadow: 0 0 0 0 rgba(12,163,12,0.55); }
  70% { box-shadow: 0 0 0 10px rgba(12,163,12,0); }
  100% { box-shadow: 0 0 0 0 rgba(12,163,12,0); }
}
.just-updated { animation: highlightPulse 1s ease-out 2; border-radius: 10px; }

.doc-panel-body { display: flex; flex-direction: column; }
.doc-panel-body .chart-card { flex: 1; min-height: 0; display: flex; flex-direction: column; }
.doc-panel-body .chart-wrap { flex: 1; min-height: 0; }

/* ---------- Editor panel ---------- */
.editor-body { display: flex; flex-direction: column; gap: 16px; }
.editor-note { font-size: 12.5px; color: var(--text-secondary); background: var(--tone-brand-bg); border-radius: 10px; padding: 10px 14px; line-height: 1.5; }
.editor-section-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.editor-add-btn {
  display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 600;
  border: 1px solid var(--border); background: var(--page); color: var(--text-primary);
  padding: 6px 12px; border-radius: 999px; cursor: pointer; font-family: inherit; transition: background 0.12s ease;
}
.editor-add-btn:hover { background: var(--tone-brand-bg); }
.editor-add-btn .btn-icon { font-size: 12px; display: flex; }
table.editor-table { width: 100%; border-collapse: collapse; font-size: 13px; }
table.editor-table th {
  text-align: left; padding: 6px 6px; font-size: 10.5px; letter-spacing: 0.04em; text-transform: uppercase;
  color: var(--muted); font-weight: 600;
}
table.editor-table td { padding: 4px 6px; vertical-align: middle; }
table.editor-table input, table.editor-table select {
  width: 100%; border: 1px solid var(--border); border-radius: 7px; padding: 7px 9px;
  font: inherit; font-size: 12.5px; background: var(--surface); color: var(--text-primary);
}
table.editor-table input:focus, table.editor-table select:focus { outline: 2px solid var(--brand); outline-offset: -1px; }
.row-remove-btn {
  border: none; background: transparent; color: var(--muted); cursor: pointer; font-size: 15px;
  padding: 6px 8px; border-radius: 6px; display: flex; align-items: center; justify-content: center;
}
.row-remove-btn:hover { background: var(--tone-critical-bg); color: var(--status-critical); }
.editor-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.editor-save-btn {
  display: inline-flex; align-items: center; gap: 8px; font-size: 13.5px; font-weight: 600;
  border: none; background: var(--brand); color: #fff; padding: 10px 18px; border-radius: 999px;
  cursor: pointer; font-family: inherit; transition: background 0.12s ease;
}
.editor-save-btn:hover { background: var(--brand-light); }
.editor-save-btn .btn-icon { font-size: 14px; display: flex; }
.editor-status { font-size: 12.5px; color: var(--text-secondary); }
.editor-status.ok { color: var(--status-good); }
.editor-status.err { color: var(--status-critical); }

/* ---------- Small screens: fall back to a normal scrolling layout ---------- */
@media (max-width: 860px) {
  body { overflow: auto; }
  .app { flex-direction: column; height: auto; }
  .sidebar { width: 100%; flex: 0 0 auto; height: auto; flex-direction: row; flex-wrap: wrap; align-items: center; }
  .sidebar .brand-block { border-bottom: none; margin-bottom: 0; padding: 4px 8px; }
  .nav-menu { display: flex; flex-wrap: wrap; gap: 6px; flex: 1 1 100%; }
  .upload-block { flex: 1 1 100%; }
  .sidebar-footer { border-top: none; flex: 1 1 100%; }
  .main { height: auto; overflow: visible; }
  .panel { overflow: visible; padding: 18px 16px; }
  .panel-body { overflow: visible; }
  .stat-grid { grid-template-columns: repeat(2, 1fr); }
  .grid-2 { flex-direction: column; }
  .table-scroll { max-height: 360px; }
}
"""

# ---------------------------------------------------------------------------
# Renderer JS (static; no Python interpolation needed -- operates entirely
# on a data object D, whether that comes from INITIAL_DATA or from a
# freshly-uploaded spreadsheet parsed with SheetJS).
# ---------------------------------------------------------------------------
RENDERER_JS = r"""
(function () {
  "use strict";

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

  var REQUIRED_SHEETS = ["Controle", "Desenhos", "MDs", "LMs", "MCs", "RIs"];

  // [label, sheetName, dataStartRow, floorLastRow]
  var DOC_SHEETS = [
    ["Desenhos (DE)", "Desenhos", 5, 92],
    ["Memoriais Descritivos (MD)", "MDs", 4, 87],
    ["Listas de Materiais (LM)", "LMs", 4, 89],
    ["Análises de Risco (MC)", "MCs", 4, 98],
    ["Relatórios de Inspeção (RI)", "RIs", 4, 99]
  ];

  // Não conformidades: colunas M/N/O/P/Q na aba RIs (Descrição/Severidade/
  // Status/Responsável/Data), à direita das colunas de-para.
  var NC_DESC_COL = 13, NC_SEV_COL = 14, NC_STATUS_COL = 15, NC_RESP_COL = 16, NC_DATE_COL = 17;

  // -------------------------------------------------------------------
  // small helpers
  // -------------------------------------------------------------------
  function esc(s) {
    if (s === null || s === undefined) return "";
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function fmtPct(x) {
    return (typeof x === "number") ? (x * 100).toFixed(1) + "%" : "—";
  }
  function fmtDateBR(iso) {
    if (!iso) return "—";
    var p = iso.split("-");
    return p[2] + "/" + p[1] + "/" + p[0];
  }
  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  function isoDate(d) {
    if (!d) return null;
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  }

  // -------------------------------------------------------------------
  // chart / table / tile builders (mirrors what used to be built server-side)
  // -------------------------------------------------------------------
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

    var svg = (
      '<svg class="bar-chart" id="' + chartId + '" viewBox="0 0 ' + width + " " + height + '" role="group" aria-label="Gráfico de barras">' +
      bars + "</svg>"
    );

    var rows = items.map(function (it) {
      return "<tr><td>" + esc(it[0]) + '</td><td class="num">' + esc(it[1]) + esc(unit) + "</td></tr>";
    }).join("");
    var table = '<table class="data-table"><thead><tr><th>Categoria</th><th class="num">Valor</th></tr></thead><tbody>' + rows + "</tbody></table>";
    return { svg: svg, table: table };
  }

  function chartCard(title, chartId, items, colors, legend, unit, emptyText) {
    if (!items.length) {
      return (
        '<div class="card chart-card">' +
        '<div class="card-head"><h3>' + esc(title) + "</h3></div>" +
        '<div class="chart-wrap"><div class="chart-view">' +
        '<div class="preview-empty">' + esc(emptyText || "Sem dados no momento.") + "</div>" +
        "</div></div></div>"
      );
    }
    var built = barChartSVG(chartId, items, colors, unit);
    var legendHtml = "";
    if (legend && legend.length) {
      var swatches = legend.map(function (l) {
        return '<span class="legend-item"><span class="legend-swatch" style="background:' + l[1] + '"></span>' + esc(l[0]) + "</span>";
      }).join("");
      legendHtml = '<div class="legend">' + swatches + "</div>";
    }
    return (
      '<div class="card chart-card">' +
      '<div class="card-head"><h3>' + esc(title) + '</h3>' +
      '<button class="toggle-btn" data-target="' + chartId + '-wrap" type="button">Ver tabela</button></div>' +
      legendHtml +
      '<div class="chart-wrap" id="' + chartId + '-wrap">' +
      '<div class="chart-view">' + built.svg + "</div>" +
      '<div class="table-view" hidden>' + built.table + "</div>" +
      "</div></div>"
    );
  }

  function statTile(value, label, tone, sub, iconSlotHtml) {
    var subHtml = sub ? '<div class="stat-sub">' + esc(sub) + "</div>" : "";
    return (
      '<div class="stat-tile tone-' + tone + '">' +
      (iconSlotHtml || "") +
      '<div class="stat-value">' + esc(value) + "</div>" +
      '<div class="stat-label">' + esc(label) + "</div>" +
      subHtml + "</div>"
    );
  }

  function iconBadge(tone, iconHtml) {
    return '<div class="stat-icon-badge tone-' + tone + '">' + iconHtml + "</div>";
  }

  // Circular progress ring used for the "Adequação técnica média" KPI --
  // fraction is 0..1; color follows the same good/warning/critical bands
  // used everywhere else in the dashboard.
  function gaugeRing(fraction) {
    var pct = (typeof fraction === "number") ? Math.max(0, Math.min(1, fraction)) : 0;
    var r = 15, c = 2 * Math.PI * r;
    var dash = (pct * c).toFixed(1) + " " + c.toFixed(1);
    var color = pct >= 0.95 ? "var(--status-good)" : (pct >= 0.8 ? "var(--status-warning)" : "var(--status-critical)");
    return (
      '<svg class="gauge-ring" viewBox="0 0 34 34">' +
      '<circle class="gauge-track" cx="17" cy="17" r="' + r + '"/>' +
      '<circle class="gauge-fill" cx="17" cy="17" r="' + r + '" stroke="' + color + '" stroke-dasharray="' + dash + '"/>' +
      "</svg>"
    );
  }

  function vencDiasTxt(v) {
    var dias = v.dias;
    return dias < 0 ? (Math.abs(dias) + " dias vencido") : ("vence em " + dias + " dias");
  }

  function vencRow(v) {
    var tone = v.situacao === "vencido" ? "critical" : "warning";
    return (
      "<tr><td>" + esc(v.area) + "</td><td>" + esc(v.documento) + "</td><td>" + esc(fmtDateBR(v.data)) + "</td>" +
      '<td><span class="badge tone-' + tone + '">' + esc(vencDiasTxt(v)) + "</span></td></tr>"
    );
  }

  function pendRow(p) {
    return "<tr><td>" + esc(p.area) + "</td><td>" + esc(p.pendencia) + "</td></tr>";
  }

  function ncRow(n) {
    var sevTone = n.severidade === "Crítica" ? "critical" : (n.severidade === "Média" ? "warning" : "neutral");
    var statusTone = n.status === "Aberta" ? "critical" : (n.status === "Corrigida" ? "good" : "neutral");
    return (
      "<tr><td>" + esc(n.area) + "</td><td>" + esc(n.numero_ri) + "</td><td>" + esc(n.descricao) + "</td>" +
      '<td><span class="badge tone-' + sevTone + '">' + esc(n.severidade) + "</span></td>" +
      '<td><span class="badge tone-' + statusTone + '">' + esc(n.status) + "</span></td>" +
      "<td>" + esc(n.responsavel || "—") + "</td><td>" + esc(fmtDateBR(n.data)) + "</td></tr>"
    );
  }

  // Compact preview rows used inside the Visão Geral overview panel
  function vencPreviewRow(v) {
    var tone = v.situacao === "vencido" ? "critical" : "warning";
    return (
      '<div class="preview-row"><div><div class="preview-row-title">' + esc(v.area) + "</div>" +
      '<div class="preview-row-sub">' + esc(v.documento) + " · " + esc(fmtDateBR(v.data)) + "</div></div>" +
      '<span class="badge tone-' + tone + '">' + esc(vencDiasTxt(v)) + "</span></div>"
    );
  }

  function pendPreviewRow(p) {
    return (
      '<div class="preview-row"><div><div class="preview-row-title">' + esc(p.area) + "</div>" +
      '<div class="preview-row-sub">' + esc(p.pendencia) + "</div></div></div>"
    );
  }

  function previewCard(items, buildRow, emptyText) {
    if (!items.length) return '<div class="preview-empty">' + esc(emptyText) + "</div>";
    return items.map(buildRow).join("");
  }

  // -------------------------------------------------------------------
  // main render: takes a D object (same shape whether from Python-baked
  // INITIAL_DATA JSON or freshly parsed from an uploaded spreadsheet) and
  // (re)builds every dynamic piece of the page.
  // -------------------------------------------------------------------
  var CURRENT_DATA = null;

  function renderDashboard(D) {
    CURRENT_DATA = D;
    var statusCounts = D.status_counts || {};
    var nc = D.nao_conformidades || [];
    var ncAbertas = D.nc_abertas || 0;

    var conformes = statusCounts["SPDA Conforme"] || 0;
    var naoConf = statusCounts["SPDA Não Conforme"] || 0;

    var vencidos = (D.vencimentos || []).filter(function (v) { return v.situacao === "vencido"; });
    var vencendo = (D.vencimentos || []).filter(function (v) { return v.situacao === "vencendo"; });
    var areasSet = {};
    (D.vencimentos || []).forEach(function (v) { areasSet[v.area] = true; });
    var areasAfetadas = Object.keys(areasSet).length;

    var pend = D.pendencias_abertas || [];

    var naoConfTone = naoConf ? "critical" : "good";
    var kpiHtml = [
      statTile(D.areas_total, "Áreas monitoradas", "brand", null, iconBadge("brand", ICONS.building)),
      statTile(fmtPct(D.adequacao_media), "Adequação técnica média", "good", null, gaugeRing(D.adequacao_media)),
      statTile(conformes, "Áreas SPDA conforme", "good", null, iconBadge("good", ICONS.check_circle)),
      statTile(naoConf, "Áreas SPDA não conforme", naoConfTone, null, iconBadge(naoConfTone, ICONS.alert_triangle)),
      statTile(vencidos.length, "Documentos de vencimento vencidos", "critical", areasAfetadas + " áreas afetadas", iconBadge("critical", ICONS.clock)),
      statTile(pend.length, "Pendências abertas", "warning", null, iconBadge("warning", ICONS.clipboard_list))
    ].join("");
    document.getElementById("kpi-grid").innerHTML = kpiHtml;

    // Executive-summary banner at the top of Visão Geral: one honest sentence
    // about the overall situation, with a shortcut into whichever panel has
    // the most pressing detail.
    var pctBanner = D.areas_total ? Math.round((areasAfetadas / D.areas_total) * 100) : 0;
    var insightTone, insightIcon, insightHtml;
    if (vencidos.length > 0 || ncAbertas > 0) {
      insightTone = "critical"; insightIcon = ICONS.alert_triangle;
      var insightParts = [];
      if (vencidos.length > 0) {
        insightParts.push(vencidos.length + " documento(s) de conformidade vencido(s) (" + areasAfetadas + " de " + D.areas_total + " áreas, " + pctBanner + "%)");
      }
      if (ncAbertas > 0) {
        insightParts.push(ncAbertas + " pendência(s) de execução em aberto");
      }
      var insightLinkPanel = vencidos.length > 0 ? "vencimentos" : "naoconformidades";
      var insightLinkLabel = vencidos.length > 0 ? "Ver vencimentos →" : "Ver pendências de execução →";
      insightHtml = (
        "<strong>" + insightParts.join(" e ") + "</strong>" +
        (pend.length ? ", além de " + pend.length + " pendência(s) em aberto." : ".") +
        ' <button class="link-btn" data-panel="' + insightLinkPanel + '" type="button">' + insightLinkLabel + "</button>"
      );
    } else if (pend.length > 0) {
      insightTone = "warning"; insightIcon = ICONS.info_circle;
      insightHtml = (
        "<strong>" + pend.length + " pendência(s) em aberto</strong> aguardando conclusão. Nenhum documento de conformidade vencido no momento." +
        ' <button class="link-btn" data-panel="pendencias" type="button">Ver pendências →</button>'
      );
    } else {
      insightTone = "good"; insightIcon = ICONS.check_circle;
      insightHtml = "<strong>Tudo em dia:</strong> nenhum vencimento de conformidade, pendência de execução ou pendência em aberto no momento.";
    }
    var insightEl = document.getElementById("overview-insight");
    insightEl.className = "alert-banner tone-" + insightTone;
    insightEl.innerHTML = '<span class="icon">' + insightIcon + '</span><div>' + insightHtml + "</div>";

    var statusItems = STATUS_ORDER.filter(function (k) { return statusCounts[k] > 0; }).map(function (k) { return [k, statusCounts[k]]; });
    var statusLegend = statusItems.map(function (it) { return [it[0], STATUS_COLOR[it[0]]]; });
    document.getElementById("chart-status-slot").innerHTML = chartCard(
      "Distribuição de status das áreas ativas", "chart-status", statusItems, STATUS_COLOR, statusLegend
    );

    var ncSevCounts = {};
    nc.forEach(function (n) {
      var s = n.severidade || "Não informado";
      ncSevCounts[s] = (ncSevCounts[s] || 0) + 1;
    });
    var ncItems = NC_SEV_ORDER.filter(function (k) { return ncSevCounts[k] > 0; }).map(function (k) { return [k, ncSevCounts[k]]; });
    var ncLegend = ncItems.map(function (it) { return [it[0], NC_SEV_COLOR[it[0]]]; });
    document.getElementById("chart-nc-slot").innerHTML = chartCard(
      "Pendências de execução por severidade", "chart-nc", ncItems, NC_SEV_COLOR, ncLegend, "",
      "Nenhuma pendência de execução registrada na aba RIs até o momento."
    );

    var docItems = Object.keys(D.documentacao || {}).map(function (k) { return [k, D.documentacao[k]]; });
    var docColors = {};
    docItems.forEach(function (it) { docColors[it[0]] = "var(--series-1)"; });
    document.getElementById("doc-chart-slot").innerHTML = chartCard(
      "Volume por tipo de documento", "chart-doc", docItems, docColors
    );

    document.getElementById("nav-badge-vencimentos").textContent = vencidos.length;
    document.getElementById("nav-badge-pendencias").textContent = (D.pendencias_abertas || []).length;
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
      ? ('<p class="table-note">+ ' + resto + " outros documentos " + restoWord + ' — detalhamento completo na aba "Controle" da planilha.</p>')
      : "";

    document.getElementById("pend-tbody").innerHTML = pend.length
      ? pend.map(pendRow).join("")
      : '<tr><td colspan="2">Nenhuma pendência registrada.</td></tr>';

    // Overview previews: a 5-item taste of the two "action needed" lists,
    // each linking into its full panel -- fills the overview with concrete,
    // actionable content instead of leaving it a wall of charts.
    document.getElementById("preview-venc").innerHTML = previewCard(
      allVenc.slice(0, 5), vencPreviewRow, "Nenhum vencimento nos próximos 90 dias."
    );
    document.getElementById("preview-pend").innerHTML = previewCard(
      pend.slice(0, 5), pendPreviewRow, "Nenhuma pendência registrada."
    );

    // ---- Pendências de execução (não conformidades da aba RIs) ----
    document.getElementById("nc-tbody").innerHTML = nc.length
      ? nc.map(ncRow).join("")
      : '<tr><td colspan="7">Nenhuma pendência de execução registrada. Preencha a seção de não conformidades na aba RIs da planilha e recarregue para vê-las aqui.</td></tr>';

    var ncBannerEl = document.getElementById("nc-alert-banner");
    var ncAlertText = document.getElementById("nc-alert-text");
    var ncAlertIcon = document.getElementById("nc-alert-icon");
    if (nc.length === 0) {
      ncBannerEl.className = "alert-banner tone-good";
      ncAlertIcon.innerHTML = ICONS.check_circle;
      ncAlertText.innerHTML = "<strong>Nenhuma pendência de execução registrada até o momento.</strong> Preencha a seção de não conformidades na aba RIs da planilha para acompanhar aqui.";
    } else if (ncAbertas === 0) {
      ncBannerEl.className = "alert-banner tone-good";
      ncAlertIcon.innerHTML = ICONS.check_circle;
      ncAlertText.innerHTML = "<strong>Todas as " + nc.length + " pendência(s) de execução registrada(s) estão corrigidas.</strong>";
    } else {
      ncBannerEl.className = "alert-banner tone-critical";
      ncAlertIcon.innerHTML = ICONS.alert_octagon;
      ncAlertText.innerHTML = "<strong>" + ncAbertas + " de " + nc.length + " pendência(s) de execução estão em aberto.</strong> Priorize as de severidade crítica.";
    }

    document.getElementById("doc-footer-note").innerHTML = (
      "Painel gerado automaticamente a partir da planilha de controle — para atualizar, use \"Carregar planilha\" no menu ao lado, " +
      "ou envie a planilha revisada para gerar uma nova versão. MSI Engenharia e Tecnologia © " + esc(String(D.gerado_em || "").slice(0, 4)) + "."
    );

    document.getElementById("sidebar-meta").innerHTML = (
      "Contrato " + esc(D.contrato) + "<br>" + esc(D.cliente) + "<br>Gerado em " + esc(fmtDateBR(D.gerado_em))
    );

    // ---- Editor panel: always reflect the latest data when (re)rendered ----
    renderEditorPend(D.pendencias_abertas || []);
    renderEditorNc(D.nao_conformidades || []);

    // keep the embedded INITIAL_DATA script text in sync so that
    // "Baixar HTML atualizado" saves a file that reopens with THIS data,
    // not the data the page was originally generated with.
    var dataScript = document.getElementById("initial-data-script");
    if (dataScript) dataScript.textContent = "window.__INITIAL_DATA__ = " + JSON.stringify(D) + ";";
  }

  // -------------------------------------------------------------------
  // Editor panel: lets someone type updates to Pendências abertas and
  // Pendências de Execução directly in the dashboard, no spreadsheet
  // round-trip required. "Salvar e publicar" writes the new data into
  // CURRENT_DATA, re-renders everything, and -- when this page is running
  // as a published Claude artifact with the "artifact" capability granted
  // -- publishes just the data file, so every other open view (and the
  // next person who opens the link) picks up the change automatically.
  // -------------------------------------------------------------------
  function ncSevOptions(sel) {
    return ["Crítica", "Média", "Baixa"].map(function (o) {
      return "<option" + (o === sel ? " selected" : "") + ">" + o + "</option>";
    }).join("");
  }
  function ncStatusOptions(sel) {
    return ["Aberta", "Corrigida"].map(function (o) {
      return "<option" + (o === sel ? " selected" : "") + ">" + o + "</option>";
    }).join("");
  }

  function renderEditorPend(items) {
    var tbody = document.getElementById("editor-pend-tbody");
    if (!tbody) return;
    tbody.innerHTML = (items.length ? items : []).map(function (p, i) {
      return (
        "<tr>" +
        '<td><input type="text" data-field="area" value="' + esc(p.area || "") + '"></td>' +
        '<td><input type="text" data-field="pendencia" value="' + esc(p.pendencia || "") + '"></td>' +
        '<td><button type="button" class="row-remove-btn" data-remove-pend="' + i + '" title="Remover linha">✕</button></td>' +
        "</tr>"
      );
    }).join("");
  }

  function renderEditorNc(items) {
    var tbody = document.getElementById("editor-nc-tbody");
    if (!tbody) return;
    tbody.innerHTML = (items.length ? items : []).map(function (n, i) {
      return (
        "<tr>" +
        '<td><input type="text" data-field="area" value="' + esc(n.area || "") + '"></td>' +
        '<td><input type="text" data-field="numero_ri" value="' + esc(n.numero_ri || "") + '"></td>' +
        '<td><input type="text" data-field="descricao" value="' + esc(n.descricao || "") + '"></td>' +
        '<td><select data-field="severidade">' + ncSevOptions(n.severidade) + "</select></td>" +
        '<td><select data-field="status">' + ncStatusOptions(n.status) + "</select></td>" +
        '<td><input type="text" data-field="responsavel" value="' + esc(n.responsavel || "") + '"></td>' +
        '<td><input type="date" data-field="data" value="' + esc(n.data || "") + '"></td>' +
        '<td><button type="button" class="row-remove-btn" data-remove-nc="' + i + '" title="Remover linha">✕</button></td>' +
        "</tr>"
      );
    }).join("");
  }

  function harvestPendRows() {
    var rows = document.querySelectorAll("#editor-pend-tbody tr");
    var out = [];
    rows.forEach(function (tr) {
      var area = tr.querySelector('[data-field="area"]').value.trim();
      var pendencia = tr.querySelector('[data-field="pendencia"]').value.trim();
      if (area || pendencia) out.push({ area: area, codigo: null, pendencia: pendencia });
    });
    return out;
  }

  function harvestNcRows() {
    var rows = document.querySelectorAll("#editor-nc-tbody tr");
    var out = [];
    rows.forEach(function (tr) {
      var descricao = tr.querySelector('[data-field="descricao"]').value.trim();
      var area = tr.querySelector('[data-field="area"]').value.trim();
      if (!descricao && !area) return;
      out.push({
        area: area || null,
        numero_ri: tr.querySelector('[data-field="numero_ri"]').value.trim() || null,
        descricao: descricao,
        severidade: tr.querySelector('[data-field="severidade"]').value,
        status: tr.querySelector('[data-field="status"]').value,
        responsavel: tr.querySelector('[data-field="responsavel"]').value.trim() || null,
        data: tr.querySelector('[data-field="data"]').value || null
      });
    });
    return out;
  }

  function addPendRow() {
    var current = harvestPendRows();
    current.push({ area: "", codigo: null, pendencia: "" });
    renderEditorPend(current);
  }
  function removePendRow(idx) {
    var current = harvestPendRows();
    current.splice(idx, 1);
    renderEditorPend(current);
  }
  function addNcRow() {
    var current = harvestNcRows();
    current.push({ area: "", numero_ri: "", descricao: "", severidade: "Média", status: "Aberta", responsavel: "", data: null });
    renderEditorNc(current);
  }
  function removeNcRow(idx) {
    var current = harvestNcRows();
    current.splice(idx, 1);
    renderEditorNc(current);
  }

  function showEditorStatus(message, tone) {
    var el = document.getElementById("editor-status");
    if (!el) return;
    el.textContent = message;
    el.className = "editor-status" + (tone ? " " + tone : "");
  }

  function saveEditorChanges() {
    var D = CURRENT_DATA || {};
    D.pendencias_abertas = harvestPendRows();

    var ncRows = harvestNcRows();
    var SEV_ORDER_MAP = { "Crítica": 0, "Média": 1, "Baixa": 2, "Não informado": 3 };
    ncRows.forEach(function (n) { n.severidade = n.severidade || "Não informado"; n.status = n.status || "Não informado"; });
    ncRows.sort(function (a, b) {
      var sa = SEV_ORDER_MAP.hasOwnProperty(a.severidade) ? SEV_ORDER_MAP[a.severidade] : 9;
      var sb = SEV_ORDER_MAP.hasOwnProperty(b.severidade) ? SEV_ORDER_MAP[b.severidade] : 9;
      if (sa !== sb) return sa - sb;
      var oa = a.status === "Aberta" ? 0 : 1, ob = b.status === "Aberta" ? 0 : 1;
      return oa - ob;
    });
    D.nao_conformidades = ncRows;
    D.nc_abertas = ncRows.filter(function (n) { return n.status === "Aberta"; }).length;

    renderDashboard(D);
    showToast("Alterações salvas nesta página.", false);
    showEditorStatus("Publicando...", "");
    publishData(D);
  }

  function publishData(D) {
    if (!window.claude || typeof window.claude.use !== "function") {
      showEditorStatus("Alterações salvas apenas neste arquivo local — abra a versão publicada no Cowork para publicar automaticamente.", "err");
      return;
    }
    window.claude.use("artifact").then(function (artifact) {
      if (!artifact) {
        showEditorStatus("Publicação indisponível nesta visualização (arquivo aberto localmente ou sem permissão).", "err");
        return;
      }
      return artifact.publish({ "data.json": JSON.stringify(D) }).then(function () {
        showEditorStatus("Publicado! Quem abrir este link já vê os dados atualizados.", "ok");
      });
    }).catch(function (err) {
      var code = err && err.code;
      if (code === "not_writer" || code === "not_granted") {
        showEditorStatus("Você está em modo somente leitura aqui — não é possível publicar mudanças.", "err");
      } else if (code === "conflict") {
        showEditorStatus("Alguém publicou uma versão mais nova — a página vai recarregar.", "err");
      } else {
        showEditorStatus("Não foi possível publicar agora" + (err && err.message ? (": " + err.message) : "."), "err");
      }
    });
  }

  // -------------------------------------------------------------------
  // spreadsheet parsing (client-side, via SheetJS) -- mirrors the same
  // extraction logic used server-side in extract_data.py
  // -------------------------------------------------------------------
  function cellAt(ws, row, col) {
    var addr = XLSX.utils.encode_cell({ r: row - 1, c: col - 1 });
    var cell = ws[addr];
    return cell ? cell.v : undefined;
  }
  function lastRowOf(ws, floor) {
    if (!ws || !ws["!ref"]) return floor;
    var range = XLSX.utils.decode_range(ws["!ref"]);
    return Math.max(range.e.r + 1, floor);
  }
  function asDate(v) { return (v instanceof Date) ? v : null; }

  function extractD(workbook) {
    var missing = REQUIRED_SHEETS.filter(function (n) { return !workbook.Sheets[n]; });
    if (missing.length) {
      throw new Error("Faltam as abas: " + missing.join(", "));
    }

    var today = new Date();
    today.setHours(0, 0, 0, 0);

    // ---- Controle (cabeçalho linha 2/3, dados a partir da linha 4) ----
    var wsC = workbook.Sheets["Controle"];
    var lastC = lastRowOf(wsC, 4);
    var areas = [];
    for (var r = 4; r <= lastC; r++) {
      var desc = cellAt(wsC, r, 5);
      if (!desc) continue;
      areas.push({
        codigo_ld: cellAt(wsC, r, 2),
        descricao: String(desc).trim(),
        status: cellAt(wsC, r, 26),
        adequacao_geral: (function (v) { return typeof v === "number" ? v : null; })(cellAt(wsC, r, 16)),
        validade_laudo: asDate(cellAt(wsC, r, 20)),
        validade_is: asDate(cellAt(wsC, r, 23)),
        pendencia: (function (v) { return v ? String(v).trim() : null; })(cellAt(wsC, r, 29))
      });
    }

    var statusCounts = {};
    areas.forEach(function (a) {
      var s = a.status || "Não informado";
      statusCounts[s] = (statusCounts[s] || 0) + 1;
    });

    var adequacoes = areas.map(function (a) { return a.adequacao_geral; }).filter(function (v) { return typeof v === "number"; });
    var adequacaoMedia = adequacoes.length ? (adequacoes.reduce(function (a, b) { return a + b; }, 0) / adequacoes.length) : null;

    var pendenciasAbertas = areas
      .filter(function (a) { return a.pendencia && ["OK", "-", ""].indexOf(a.pendencia.toUpperCase()) === -1; })
      .map(function (a) { return { area: a.descricao, codigo: a.codigo_ld, pendencia: a.pendencia }; });

    function daysDiff(d) { return Math.round((d - today) / 86400000); }

    var vencimentos = [];
    areas.forEach(function (a) {
      [["validade_laudo", "Laudo completo (medição)"], ["validade_is", "Inspeção Semestral (IS)"]].forEach(function (pair) {
        var v = a[pair[0]];
        if (!v) return;
        var dd = daysDiff(v);
        if (dd <= 90) {
          vencimentos.push({
            area: a.descricao, codigo: a.codigo_ld, documento: pair[1],
            data: isoDate(v), dias: dd, situacao: dd < 0 ? "vencido" : "vencendo"
          });
        }
      });
    });
    vencimentos.sort(function (a, b) { return a.dias - b.dias; });

    // ---- Documentacao (contagem por aba; linha inicial varia por aba) ----
    var documentacao = {};
    DOC_SHEETS.forEach(function (spec) {
      var label = spec[0], sheetName = spec[1], drow = spec[2], floor = spec[3];
      var ws = workbook.Sheets[sheetName];
      var last = lastRowOf(ws, Math.max(floor, drow));
      var count = 0;
      for (var rr = drow; rr <= last; rr++) { if (cellAt(ws, rr, 1)) count++; }
      documentacao[label] = count;
    });

    // ---- Não conformidades (aba RIs, colunas M/N/O/P/Q) ----
    var wsRI = workbook.Sheets["RIs"];
    var lastRI = lastRowOf(wsRI, 4);
    var naoConformidades = [];
    for (var rRI = 4; rRI <= lastRI; rRI++) {
      var descNC = cellAt(wsRI, rRI, NC_DESC_COL);
      if (!descNC || !String(descNC).trim()) continue;
      var areaNC = cellAt(wsRI, rRI, 3);
      var numeroRI = cellAt(wsRI, rRI, 1);
      var sevNC = cellAt(wsRI, rRI, NC_SEV_COL);
      var statusNC = cellAt(wsRI, rRI, NC_STATUS_COL);
      var respNC = cellAt(wsRI, rRI, NC_RESP_COL);
      var dataNC = asDate(cellAt(wsRI, rRI, NC_DATE_COL));
      naoConformidades.push({
        area: areaNC ? String(areaNC).trim() : null,
        numero_ri: numeroRI,
        descricao: String(descNC).trim(),
        severidade: sevNC || "Não informado",
        status: statusNC || "Não informado",
        responsavel: respNC,
        data: dataNC ? isoDate(dataNC) : null
      });
    }
    var SEV_ORDER_MAP = { "Crítica": 0, "Média": 1, "Baixa": 2, "Não informado": 3 };
    naoConformidades.sort(function (a, b) {
      var sa = SEV_ORDER_MAP.hasOwnProperty(a.severidade) ? SEV_ORDER_MAP[a.severidade] : 9;
      var sb = SEV_ORDER_MAP.hasOwnProperty(b.severidade) ? SEV_ORDER_MAP[b.severidade] : 9;
      if (sa !== sb) return sa - sb;
      var oa = a.status === "Aberta" ? 0 : 1, ob = b.status === "Aberta" ? 0 : 1;
      return oa - ob;
    });
    var ncAbertasCount = naoConformidades.filter(function (n) { return n.status === "Aberta"; }).length;

    return {
      gerado_em: isoDate(new Date()),
      contrato: "089/2026",
      cliente: "Ferro+ Mineração S.A",
      empresa: "MSI Engenharia e Tecnologia",
      objeto: "Sistema de Proteção contra Descargas Atmosféricas (SPDA)",
      areas_total: areas.length,
      status_counts: statusCounts,
      adequacao_media: adequacaoMedia,
      documentacao: documentacao,
      pendencias_abertas: pendenciasAbertas,
      vencimentos: vencimentos,
      nao_conformidades: naoConformidades,
      nc_abertas: ncAbertasCount
    };
  }

  // -------------------------------------------------------------------
  // interactions (event delegation -- survives innerHTML re-renders
  // without needing to rebind listeners every time)
  // -------------------------------------------------------------------
  var tooltip, ttValue, ttLabel;
  var g_lastRect = { left: 0, top: 0 };
  function showTip(e, g) {
    ttValue.textContent = g.getAttribute("data-value");
    ttLabel.textContent = g.getAttribute("data-label");
    tooltip.classList.add("show");
    moveTip(e);
  }
  function moveTip(e) {
    var x = e.clientX !== undefined ? e.clientX : g_lastRect.left;
    var y = e.clientY !== undefined ? e.clientY : g_lastRect.top;
    tooltip.style.left = x + "px";
    tooltip.style.top = y + "px";
  }
  function hideTip() { tooltip.classList.remove("show"); }

  var toastTimer = null;
  function showToast(message, isError) {
    var toast = document.getElementById("toast");
    var icon = document.getElementById("toast-icon");
    var text = document.getElementById("toast-text");
    text.textContent = message;
    icon.innerHTML = isError ? ICONS.alert_circle : ICONS.check_circle;
    toast.classList.toggle("err", !!isError);
    toast.classList.add("show");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove("show"); }, isError ? 6000 : 4200);
  }

  function activatePanel(name) {
    document.querySelectorAll(".nav-item[data-panel]").forEach(function (b) {
      b.classList.remove("active"); b.setAttribute("aria-selected", "false");
    });
    document.querySelectorAll(".panel").forEach(function (p) { p.classList.remove("active"); });
    var navBtn = document.querySelector('.nav-item[data-panel="' + name + '"]');
    if (navBtn) { navBtn.classList.add("active"); navBtn.setAttribute("aria-selected", "true"); }
    var panel = document.getElementById("panel-" + name);
    if (panel) panel.classList.add("active");
  }

  function goToPanel(name) { activatePanel(name); }

  function pulse(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.classList.remove("just-updated");
    // force reflow so the animation restarts if it was just applied
    void el.offsetWidth;
    el.classList.add("just-updated");
  }

  function setupInteractions() {
    tooltip = document.getElementById("tooltip");
    ttValue = document.getElementById("tt-value");
    ttLabel = document.getElementById("tt-label");

    document.addEventListener("click", function (e) {
      var panelBtn = e.target.closest("[data-panel]");
      if (panelBtn) {
        activatePanel(panelBtn.getAttribute("data-panel"));
        return;
      }
      var toggleBtn = e.target.closest(".toggle-btn[data-target]");
      if (toggleBtn) {
        var wrap = document.getElementById(toggleBtn.getAttribute("data-target"));
        var chartView = wrap.querySelector(".chart-view");
        var tableView = wrap.querySelector(".table-view");
        var showingTable = !tableView.hidden;
        tableView.hidden = showingTable;
        chartView.hidden = !showingTable;
        toggleBtn.textContent = showingTable ? "Ver tabela" : "Ver gráfico";
        return;
      }
      if (e.target.closest("#editor-add-pend")) { addPendRow(); return; }
      if (e.target.closest("#editor-add-nc")) { addNcRow(); return; }
      var rmPend = e.target.closest("[data-remove-pend]");
      if (rmPend) { removePendRow(parseInt(rmPend.getAttribute("data-remove-pend"), 10)); return; }
      var rmNc = e.target.closest("[data-remove-nc]");
      if (rmNc) { removeNcRow(parseInt(rmNc.getAttribute("data-remove-nc"), 10)); return; }
      if (e.target.closest("#editor-save-btn")) { saveEditorChanges(); return; }
    });

    document.getElementById("themeToggle").addEventListener("click", function () {
      var root = document.documentElement;
      var isDark = root.getAttribute("data-theme") === "dark";
      root.setAttribute("data-theme", isDark ? "light" : "dark");
      document.getElementById("themeIcon").innerHTML = isDark ? ICONS.moon : ICONS.sun;
      document.getElementById("themeLabel").textContent = isDark ? "Modo escuro" : "Modo claro";
    });

    document.addEventListener("pointermove", function (e) {
      var g = e.target.closest(".bar-g");
      if (g) showTip(e, g);
    });
    document.addEventListener("pointerover", function (e) {
      var g = e.target.closest(".bar-g");
      if (g && (!e.relatedTarget || !g.contains(e.relatedTarget))) showTip(e, g);
    });
    document.addEventListener("pointerout", function (e) {
      var g = e.target.closest(".bar-g");
      if (g && (!e.relatedTarget || !g.contains(e.relatedTarget))) hideTip();
    });
    document.addEventListener("focusin", function (e) {
      var g = e.target.closest(".bar-g");
      if (g) {
        var rect = g.getBoundingClientRect();
        g_lastRect = { left: rect.left + rect.width / 2, top: rect.top };
        showTip({ clientX: g_lastRect.left, clientY: g_lastRect.top }, g);
      }
    });
    document.addEventListener("focusout", function (e) {
      var g = e.target.closest(".bar-g");
      if (g) hideTip();
    });
  }

  // -------------------------------------------------------------------
  // upload / download
  // -------------------------------------------------------------------
  function setupUpload() {
    var input = document.getElementById("fileInput");
    var status = document.getElementById("upload-status");
    input.addEventListener("change", function (e) {
      var file = e.target.files[0];
      e.target.value = "";
      if (!file) return;
      status.className = "upload-status";
      status.textContent = "Lendo " + file.name + "...";
      var reader = new FileReader();
      reader.onload = function (ev) {
        try {
          var data = new Uint8Array(ev.target.result);
          var wb = XLSX.read(data, { type: "array", cellDates: true });
          var D = extractD(wb);
          renderDashboard(D);
          var when = new Date().toLocaleTimeString("pt-BR");
          status.className = "upload-status ok";
          status.textContent = 'Dashboard atualizado com "' + file.name + '" às ' + when + ".";
          showToast("Dashboard atualizado com \"" + file.name + "\" às " + when + ".", false);
          goToPanel("overview");
          pulse("overview-insight");
          pulse("kpi-grid");
          pulse("chart-status-slot");
          pulse("chart-nc-slot");
          pulse("preview-venc");
          pulse("preview-pend");
        } catch (err) {
          status.className = "upload-status err";
          status.textContent = "Erro ao processar a planilha: " + err.message;
          showToast("Não foi possível atualizar: " + err.message, true);
        }
      };
      reader.onerror = function () {
        status.className = "upload-status err";
        status.textContent = "Não foi possível ler o arquivo.";
        showToast("Não foi possível ler o arquivo.", true);
      };
      reader.readAsArrayBuffer(file);
    });

    function blobDownload(html, filename) {
      var blob = new Blob([html], { type: "text/html" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    document.getElementById("downloadBtn").addEventListener("click", function () {
      var html = "<!DOCTYPE html>\n" + document.documentElement.outerHTML;
      var filename = "dashboard_spda_" + isoDate(new Date()) + ".html";
      // Inside the published artifact's sandbox, a plain <a download> link is
      // inert -- the viewer must grant the save through the "downloads"
      // capability instead. Outside that sandbox (a plain local file opened
      // straight in the browser) window.claude does not exist at all, and
      // the blob/anchor trick below works exactly as it always has.
      if (window.claude && typeof window.claude.use === "function") {
        window.claude.use("downloads").then(function (downloads) {
          if (!downloads) { blobDownload(html, filename); return; }
          return downloads.save({ filename: filename, data: html }).catch(function (err) {
            showToast("Não foi possível baixar aqui" + (err && err.message ? (": " + err.message) : "."), true);
          });
        });
      } else {
        blobDownload(html, filename);
      }
    });
  }

  // On a plain downloaded/attached HTML file there is no data.json next to
  // it (and file:// fetches are blocked by the browser anyway), so this
  // silently falls back to the data baked in at generation time. On a
  // published Claude artifact where "Salvar e publicar" has run at least
  // once, data.json exists alongside this page and wins -- that's how a
  // fresh visit picks up edits made through the Editor panel.
  function loadInitialData() {
    return fetch("data.json", { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error("no data.json");
      return r.json();
    }).catch(function () {
      return window.__INITIAL_DATA__;
    });
  }

  window.addEventListener("DOMContentLoaded", function () {
    setupInteractions();
    setupUpload();
    loadInitialData().then(function (D) {
      renderDashboard(D || window.__INITIAL_DATA__);
    });
  });
})();
"""

# The renderer references a global ICONS object (dynamic banners, toast,
# KPI badges); prepend it so it's defined before the IIFE runs.
RENDERER_JS = ICONS_JS + RENDERER_JS

# ---------------------------------------------------------------------------
# Static HTML shell -- built with plain string concatenation (not an
# f-string) so the CSS/JS blocks above never need brace-escaping.
# ---------------------------------------------------------------------------
HTML_SHELL = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>MSI Engenharia — Painel SPDA · Ferro+ Mineração</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<style>__CSS__</style>
</head>
<body>
<div class="app">

  <nav class="sidebar" aria-label="Navegação do painel">
    <div class="brand-block">
      <div class="wordmark">MSI ENGENHARIA</div>
      <div class="tagline">Painel SPDA</div>
    </div>
    <ul class="nav-menu" role="tablist" aria-orientation="vertical">
      <li><button class="nav-item active" role="tab" aria-selected="true" aria-controls="panel-overview" data-panel="overview">
        <span class="nav-icon">{ICONS['grid']}</span><span class="nav-label">Visão Geral</span>
      </button></li>
      <li><button class="nav-item" role="tab" aria-selected="false" aria-controls="panel-vencimentos" data-panel="vencimentos">
        <span class="nav-icon">{ICONS['alert_triangle']}</span><span class="nav-label">Vencimentos</span><span class="nav-badge" id="nav-badge-vencimentos">0</span>
      </button></li>
      <li><button class="nav-item" role="tab" aria-selected="false" aria-controls="panel-pendencias" data-panel="pendencias">
        <span class="nav-icon">{ICONS['clipboard_list']}</span><span class="nav-label">Pendências</span><span class="nav-badge tone-warning" id="nav-badge-pendencias">0</span>
      </button></li>
      <li><button class="nav-item" role="tab" aria-selected="false" aria-controls="panel-naoconformidades" data-panel="naoconformidades">
        <span class="nav-icon">{ICONS['alert_octagon']}</span><span class="nav-label">Pendências de Execução</span><span class="nav-badge" id="nav-badge-nc">0</span>
      </button></li>
      <li><button class="nav-item" role="tab" aria-selected="false" aria-controls="panel-documentacao" data-panel="documentacao">
        <span class="nav-icon">{ICONS['file_text']}</span><span class="nav-label">Documentação</span>
      </button></li>
      <li><button class="nav-item" role="tab" aria-selected="false" aria-controls="panel-editor" data-panel="editor">
        <span class="nav-icon">{ICONS['edit_pencil']}</span><span class="nav-label">Editor</span>
      </button></li>
    </ul>

    <div class="upload-block">
      <label class="upload-btn" for="fileInput"><span class="btn-icon">{ICONS['upload']}</span>Carregar planilha</label>
      <input type="file" id="fileInput" accept=".xlsx,.xlsm" hidden>
      <div class="upload-hint">Selecione o .xlsx atualizado para recalcular o painel na hora, sem precisar do Excel nem de macros.</div>
      <div class="upload-status" id="upload-status"></div>
      <button class="download-btn" id="downloadBtn" type="button"><span class="btn-icon">{ICONS['download']}</span>Baixar HTML atualizado</button>
    </div>

    <div class="sidebar-footer">
      <button class="theme-toggle" id="themeToggle" type="button">
        <span class="btn-icon" id="themeIcon">{ICONS['moon']}</span><span id="themeLabel">Modo escuro</span>
      </button>
      <div class="sidebar-meta" id="sidebar-meta"></div>
    </div>
  </nav>

  <main class="main">

    <section class="panel active" id="panel-overview" role="tabpanel">
      <div class="panel-head">
        <h1 class="title">Resumo geral</h1>
        <p class="subtitle">Indicadores consolidados a partir do controle de áreas, pendências de execução e documentação técnica.</p>
      </div>
      <div class="alert-banner" id="overview-insight">
        <span class="icon">{ICONS['alert_triangle']}</span>
        <div></div>
      </div>
      <div class="stat-grid" id="kpi-grid"></div>
      <div class="overview-body">
        <div class="grid-2">
          <div id="chart-status-slot"></div>
          <div id="chart-nc-slot"></div>
        </div>
        <div class="grid-2">
          <div class="card">
            <div class="card-head">
              <h3>Vencimentos mais urgentes</h3>
              <button class="link-btn" data-panel="vencimentos" type="button">Ver todos →</button>
            </div>
            <div class="preview-list" id="preview-venc"></div>
          </div>
          <div class="card">
            <div class="card-head">
              <h3>Pendências abertas</h3>
              <button class="link-btn" data-panel="pendencias" type="button">Ver todas →</button>
            </div>
            <div class="preview-list" id="preview-pend"></div>
          </div>
        </div>
      </div>
    </section>

    <section class="panel" id="panel-vencimentos" role="tabpanel">
      <div class="panel-head">
        <h1 class="title">Vencimentos de laudos e inspeções</h1>
        <p class="subtitle">Documentos de conformidade (laudo completo por medição e inspeção semestral) organizados por urgência.</p>
      </div>
      <div class="alert-banner tone-critical">
        <span class="icon">{ICONS['alert_triangle']}</span>
        <div id="alert-text"></div>
      </div>
      <div class="panel-body">
        <div class="table-scroll">
          <table class="list-table">
            <thead><tr><th>Área</th><th>Documento</th><th>Validade</th><th>Situação</th></tr></thead>
            <tbody id="venc-tbody"></tbody>
          </table>
        </div>
        <div id="resto-note"></div>
      </div>
    </section>

    <section class="panel" id="panel-pendencias" role="tabpanel">
      <div class="panel-head">
        <h1 class="title">Pendências abertas</h1>
        <p class="subtitle">Ações registradas na aba Controle que ainda não foram concluídas.</p>
      </div>
      <div class="panel-body">
        <div class="table-scroll">
          <table class="list-table">
            <thead><tr><th>Área</th><th>Ação pendente</th></tr></thead>
            <tbody id="pend-tbody"></tbody>
          </table>
        </div>
      </div>
    </section>

    <section class="panel" id="panel-naoconformidades" role="tabpanel">
      <div class="panel-head">
        <h1 class="title">Pendências de Execução</h1>
        <p class="subtitle">Registradas na aba RIs da planilha, com severidade, status e responsável.</p>
      </div>
      <div class="alert-banner tone-critical" id="nc-alert-banner">
        <span class="icon" id="nc-alert-icon">{ICONS['alert_octagon']}</span>
        <div id="nc-alert-text"></div>
      </div>
      <div class="panel-body">
        <div class="table-scroll">
          <table class="list-table">
            <thead><tr><th>Área</th><th>RI Nº</th><th>Descrição</th><th>Severidade</th><th>Status</th><th>Responsável</th><th>Data</th></tr></thead>
            <tbody id="nc-tbody"></tbody>
          </table>
        </div>
      </div>
    </section>

    <section class="panel" id="panel-documentacao" role="tabpanel">
      <div class="panel-head">
        <h1 class="title">Documentação técnica emitida</h1>
        <p class="subtitle">Volume de documentos emitidos por tipo, desde o início do contrato.</p>
      </div>
      <div class="panel-body doc-panel-body">
        <div id="doc-chart-slot"></div>
        <p class="table-note" id="doc-footer-note"></p>
      </div>
    </section>

    <section class="panel" id="panel-editor" role="tabpanel">
      <div class="panel-head">
        <h1 class="title">Editor</h1>
        <p class="subtitle">Atualize pendências e pendências de execução direto aqui — sem precisar subir a planilha.</p>
      </div>
      <div class="panel-body">
        <div class="editor-body">
          <div class="editor-note">
            Este editor atualiza <strong>Pendências abertas</strong> e <strong>Pendências de Execução</strong>. Os demais
            indicadores (áreas monitoradas, adequação técnica, vencimentos, documentação) continuam vindo da planilha —
            use "Carregar planilha" no menu ao lado para atualizá-los.
          </div>

          <div class="card">
            <div class="editor-section-head">
              <h3>Pendências abertas</h3>
              <button class="editor-add-btn" id="editor-add-pend" type="button"><span class="btn-icon">{ICONS['plus']}</span>Adicionar linha</button>
            </div>
            <table class="editor-table">
              <thead><tr><th style="width:38%">Área</th><th>Pendência</th><th style="width:36px"></th></tr></thead>
              <tbody id="editor-pend-tbody"></tbody>
            </table>
          </div>

          <div class="card">
            <div class="editor-section-head">
              <h3>Pendências de Execução</h3>
              <button class="editor-add-btn" id="editor-add-nc" type="button"><span class="btn-icon">{ICONS['plus']}</span>Adicionar linha</button>
            </div>
            <table class="editor-table">
              <thead><tr>
                <th style="width:16%">Área</th><th style="width:12%">RI Nº</th><th style="width:24%">Descrição</th>
                <th style="width:10%">Severidade</th><th style="width:10%">Status</th><th style="width:12%">Responsável</th>
                <th style="width:11%">Data</th><th style="width:36px"></th>
              </tr></thead>
              <tbody id="editor-nc-tbody"></tbody>
            </table>
          </div>

          <div class="editor-actions">
            <button class="editor-save-btn" id="editor-save-btn" type="button"><span class="btn-icon">{ICONS['cloud_check']}</span>Salvar e publicar</button>
            <span class="editor-status" id="editor-status"></span>
          </div>
        </div>
      </div>
    </section>

  </main>
</div>

<div class="tooltip" id="tooltip"><span class="tt-value" id="tt-value"></span> <span id="tt-label"></span></div>
<div class="toast" id="toast" role="status" aria-live="polite">
  <span class="toast-icon" id="toast-icon">{ICONS['check_circle']}</span>
  <span id="toast-text"></span>
</div>

<script id="initial-data-script">window.__INITIAL_DATA__ = %%INITIAL_DATA_JSON%%;</script>
<script>__SHEETJS__</script>
<script>__RENDERER__</script>
</body>
</html>"""

def render_html(data, sheetjs_src):
    """Monta o HTML final: shell estático (CSS/ICONS já embutidos) + SheetJS
    + motor de renderização + o estado inicial (extraído da planilha na hora
    da geração). Função pura -- não toca disco, então é testável direto."""
    initial_data_json = json.dumps(data, ensure_ascii=False)
    return (
        HTML_SHELL
        .replace("__CSS__", CSS)
        .replace("__SHEETJS__", sheetjs_src)
        .replace("__RENDERER__", RENDERER_JS)
        .replace("%%INITIAL_DATA_JSON%%", initial_data_json)
    )


def main(argv):
    data_path, out_path, sheetjs_path = resolve_paths(argv)
    data = load_json_data(data_path)
    sheetjs_src = read_text_file(sheetjs_path)
    html = render_html(data, sheetjs_src)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(html)
    print("Wrote", out_path, "(", len(html), "bytes )")


if __name__ == "__main__":
    main(sys.argv)
