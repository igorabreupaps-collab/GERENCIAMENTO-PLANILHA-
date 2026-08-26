# -*- coding: utf-8 -*-
import datetime
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "scripts"))

from tests.python.helpers import build_workbook
import import_planilha as mod


def test_resolve_config_exige_credenciais():
    try:
        mod.resolve_config(["prog"], {})
        assert False, "deveria ter levantado ConfigError"
    except mod.ConfigError:
        pass


def test_resolve_config_aceita_credenciais_de_bootstrap_como_fallback():
    env = {"BOOTSTRAP_ADMIN_EMAIL": "admin@x.com", "BOOTSTRAP_ADMIN_PASSWORD": "secret123"}
    config = mod.resolve_config(["prog"], env)
    assert config["admin_email"] == "admin@x.com"
    assert config["admin_password"] == "secret123"
    assert config["api_base_url"] == "http://localhost:3000"
    assert config["force"] is False
    assert config["xlsx_path"] == "K19-204-FER-LD-001-R05 - Lista de Documentos (MSI).xlsx"


def test_resolve_config_le_caminho_do_xlsx_e_flag_force_da_cli():
    env = {"IMPORT_ADMIN_EMAIL": "a@x.com", "IMPORT_ADMIN_PASSWORD": "secret123"}
    config = mod.resolve_config(["prog", "planilha.xlsx", "--force"], env)
    assert config["xlsx_path"] == "planilha.xlsx"
    assert config["force"] is True


def test_resolve_config_normaliza_barra_final_do_api_base_url():
    env = {"IMPORT_ADMIN_EMAIL": "a@x.com", "IMPORT_ADMIN_PASSWORD": "secret123", "API_BASE_URL": "http://host:9000/"}
    config = mod.resolve_config(["prog"], env)
    assert config["api_base_url"] == "http://host:9000"


class FakeResponse:
    def __init__(self, status_code=200, json_data=None, text=""):
        self.status_code = status_code
        self._json = json_data or {}
        self.text = text
        self.ok = status_code < 400

    def json(self):
        return self._json

    def raise_for_status(self):
        if not self.ok:
            raise RuntimeError(f"HTTP {self.status_code}")


class FakeSession:
    def __init__(self):
        self.headers = {}
        self.posts = []
        self.get_response = FakeResponse(200, [])
        self.post_response = FakeResponse(200, {})

    def post(self, url, json):
        self.posts.append((url, json))
        return self.post_response

    def get(self, url):
        return self.get_response


def test_login_seta_o_header_authorization_com_o_token_recebido():
    session = FakeSession()
    session.post_response = FakeResponse(200, {"token": "abc123"})
    mod.login(session, "http://api", "a@x.com", "secret123")
    assert session.headers["Authorization"] == "Bearer abc123"


def test_api_post_levanta_erro_com_o_corpo_da_resposta_quando_falha():
    session = FakeSession()
    session.post_response = FakeResponse(400, {}, text="Informe tipo e número do documento.")
    try:
        mod.api_post(session, "http://api", "/api/documentos", {})
        assert False, "deveria ter levantado RuntimeError"
    except RuntimeError as err:
        assert "Informe tipo e número do documento." in str(err)


def test_read_areas_le_uma_linha_da_aba_controle():
    wb = build_workbook({"Controle": [
        (4, 2, "LD-01"), (4, 5, "Área 1"), (4, 16, 0.85),
        (4, 20, datetime.datetime(2026, 6, 15)), (4, 23, datetime.datetime(2026, 8, 1)),
        (4, 26, "SPDA Conforme"), (4, 27, "Sim"), (4, 29, "OK"),
    ]})
    areas = mod.read_areas(wb)
    assert areas == [{
        "codigo_ld": "LD-01", "descricao": "Área 1", "status": "SPDA Conforme",
        "adequacao_geral": 0.85, "validade_laudo": "2026-06-15", "validade_is": "2026-08-01",
        "dossie": "Sim", "pendencia": "OK",
    }]


def test_read_nao_conformidades_usa_nao_informado_como_default():
    wb = build_workbook({"RIs": [(4, 13, "Descrição"), (4, 3, "Área 1"), (4, 1, "RI-001")]})
    rows = mod.read_nao_conformidades(wb)
    assert rows == [{
        "area_texto": "Área 1", "numero_ri": "RI-001", "descricao": "Descrição",
        "severidade": "Não informado", "status": "Não informado", "responsavel": None, "data": None,
    }]


def test_read_documentos_concatena_titulos_e_ignora_linhas_sem_numero():
    wb = build_workbook({
        "Desenhos": [(5, 1, "DE-001"), (5, 3, "Área 1"), (5, 4, "Parte A"), (5, 5, "Parte B"), (5, 6, ""), (5, 8, 1)],
        "MDs": [], "LMs": [], "MCs": [], "RIs": [],
    })
    docs = mod.read_documentos(wb)
    de = [d for d in docs if d["tipo"] == "Desenhos (DE)"]
    assert de == [{
        "tipo": "Desenhos (DE)", "numero": "DE-001", "area_texto": "Área 1",
        "titulo": "Parte A — Parte B", "revisao": 1, "data_emissao": None,
        "numero_msi": None, "numero_jmendes": None, "observacao": None,
    }]
