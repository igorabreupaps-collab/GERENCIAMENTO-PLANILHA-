# -*- coding: utf-8 -*-
import build_dashboard as mod


def test_resolve_paths_usa_defaults_sem_argumentos():
    data_path, out_path, sheetjs_path = mod.resolve_paths(["prog"])
    assert data_path == "dashboard_data.json"
    assert out_path == "dashboard.html"
    assert sheetjs_path.endswith("xlsx.core.min.js")


def test_resolve_paths_aceita_argumentos_posicionais():
    data_path, out_path, sheetjs_path = mod.resolve_paths(["prog", "d.json", "o.html", "s.js"])
    assert (data_path, out_path, sheetjs_path) == ("d.json", "o.html", "s.js")


def test_render_html_embute_css_sheetjs_renderer_e_dados_iniciais():
    data = {"areas_total": 42, "contrato": "X"}
    html = mod.render_html(data, "/* sheetjs */")
    assert "<!DOCTYPE html>" in html
    assert "/* sheetjs */" in html
    assert '"areas_total": 42' in html
    assert "__CSS__" not in html
    assert "__SHEETJS__" not in html
    assert "__RENDERER__" not in html
    assert "%%INITIAL_DATA_JSON%%" not in html


def test_render_html_e_pura_nao_toca_disco(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    mod.render_html({"a": 1}, "")
    assert list(tmp_path.iterdir()) == []
