# -*- coding: utf-8 -*-
import datetime

from tests.python.helpers import build_workbook
from extract_data import (
    as_date,
    last_row_with_value,
    read_areas,
    compute_status_counts,
    compute_adequacao_media,
    compute_pendencias_abertas,
    compute_vencimentos,
    read_documentacao_counts,
    read_nao_conformidades,
    sort_nao_conformidades,
    compute_nc_counts,
    build_dashboard_data,
)


def test_as_date_aceita_datetime_e_date_e_ignora_o_resto():
    assert as_date(datetime.datetime(2026, 3, 5, 10, 0)) == datetime.date(2026, 3, 5)
    assert as_date(datetime.date(2026, 3, 5)) == datetime.date(2026, 3, 5)
    assert as_date("2026-03-05") is None
    assert as_date(None) is None


def test_last_row_with_value_ignora_linhas_vazias_no_meio_e_no_fim():
    wb = build_workbook({"S": [(4, 5, "a"), (5, 5, None), (6, 5, "b"), (7, 5, None)]})
    ws = wb["S"]
    assert last_row_with_value(ws, 5, 4, 10) == 6


def test_read_areas_le_uma_linha_da_aba_controle():
    wb = build_workbook({"Controle": [
        (4, 2, "LD-01"),
        (4, 5, "Área 1"),
        (4, 16, 0.85),
        (4, 20, datetime.datetime(2026, 6, 15)),
        (4, 23, datetime.datetime(2026, 8, 1)),
        (4, 26, "SPDA Conforme"),
        (4, 27, "Sim"),
        (4, 29, "OK"),
    ]})
    areas = read_areas(wb)
    assert len(areas) == 1
    a = areas[0]
    assert a["codigo_ld"] == "LD-01"
    assert a["descricao"] == "Área 1"
    assert a["status"] == "SPDA Conforme"
    assert a["adequacao_geral"] == 0.85
    assert a["validade_laudo"] == "2026-06-15"
    assert a["validade_is"] == "2026-08-01"
    assert a["dossie"] == "Sim"
    assert a["pendencia"] == "OK"


def test_read_areas_pula_linhas_sem_descricao():
    wb = build_workbook({"Controle": [(4, 2, "LD-01")]})
    assert read_areas(wb) == []


def test_compute_status_counts_usa_nao_informado_como_default():
    areas = [{"status": "SPDA Conforme"}, {"status": "SPDA Conforme"}, {"status": None}]
    assert compute_status_counts(areas) == {"SPDA Conforme": 2, "Não informado": 1}


def test_compute_adequacao_media_ignora_valores_nao_numericos():
    areas = [{"adequacao_geral": 0.9}, {"adequacao_geral": 0.7}, {"adequacao_geral": None}]
    assert compute_adequacao_media(areas) == 0.8
    assert compute_adequacao_media([{"adequacao_geral": None}]) is None


def test_compute_pendencias_abertas_ignora_ok_traco_e_vazio():
    areas = [
        {"descricao": "A1", "codigo_ld": None, "pendencia": "OK"},
        {"descricao": "A2", "codigo_ld": None, "pendencia": "-"},
        {"descricao": "A3", "codigo_ld": None, "pendencia": None},
        {"descricao": "A4", "codigo_ld": "C4", "pendencia": "Aguardando ART"},
    ]
    result = compute_pendencias_abertas(areas)
    assert result == [{"area": "A4", "codigo": "C4", "pendencia": "Aguardando ART"}]


def test_compute_vencimentos_marca_vencido_ou_vencendo_e_ordena_por_dias():
    today = datetime.date(2026, 3, 5)
    areas = [
        {"descricao": "Vencido", "codigo_ld": None, "validade_laudo": "2026-02-28", "validade_is": None},
        {"descricao": "Vencendo", "codigo_ld": None, "validade_laudo": None, "validade_is": "2026-04-04"},
        {"descricao": "Fora da janela", "codigo_ld": None, "validade_laudo": "2026-12-01", "validade_is": None},
    ]
    vencimentos = compute_vencimentos(areas, today)
    assert [v["area"] for v in vencimentos] == ["Vencido", "Vencendo"]
    assert vencimentos[0]["situacao"] == "vencido"
    assert vencimentos[0]["dias"] == -5
    assert vencimentos[1]["situacao"] == "vencendo"
    assert vencimentos[1]["dias"] == 30


def test_read_documentacao_counts_conta_linhas_com_numero_por_aba():
    wb = build_workbook({
        "Desenhos": [(5, 1, "DE-001"), (6, 1, "DE-002"), (7, 1, None)],
        "MDs": [(4, 1, "MD-001")],
        "LMs": [],
        "MCs": [],
        "RIs": [],
    })
    counts = read_documentacao_counts(wb)
    assert counts["Desenhos (DE)"] == 2
    assert counts["Memoriais Descritivos (MD)"] == 1


def test_read_nao_conformidades_usa_nao_informado_como_default():
    wb = build_workbook({"RIs": [(4, 13, "Descrição da ocorrência"), (4, 3, "Área 1"), (4, 1, "RI-001")]})
    rows = read_nao_conformidades(wb)
    assert rows == [{
        "area": "Área 1",
        "numero_ri": "RI-001",
        "descricao": "Descrição da ocorrência",
        "severidade": "Não informado",
        "status": "Não informado",
        "responsavel": None,
        "data": None,
    }]


def test_sort_nao_conformidades_ordena_por_severidade_e_depois_abertas_primeiro():
    rows = [
        {"severidade": "Baixa", "status": "Aberta"},
        {"severidade": "Crítica", "status": "Corrigida"},
        {"severidade": "Crítica", "status": "Aberta"},
    ]
    ordered = sort_nao_conformidades(rows)
    assert [(r["severidade"], r["status"]) for r in ordered] == [
        ("Crítica", "Aberta"), ("Crítica", "Corrigida"), ("Baixa", "Aberta"),
    ]


def test_compute_nc_counts():
    rows = [{"status": "Aberta", "severidade": "Crítica"}, {"status": "Corrigida", "severidade": "Crítica"}]
    abertas, status_counts, sev_counts = compute_nc_counts(rows)
    assert abertas == 1
    assert status_counts == {"Aberta": 1, "Corrigida": 1}
    assert sev_counts == {"Crítica": 2}


def test_build_dashboard_data_monta_o_dicionario_final_sem_expor_a_lista_de_areas():
    wb = build_workbook({
        "Controle": [(4, 5, "Área 1"), (4, 26, "SPDA Conforme")],
        "Desenhos": [], "MDs": [], "LMs": [], "MCs": [], "RIs": [],
    })
    data = build_dashboard_data(wb, datetime.date(2026, 3, 5))
    assert "areas" not in data
    assert data["areas_total"] == 1
    assert data["status_counts"] == {"SPDA Conforme": 1}
    assert data["gerado_em"] == "2026-03-05"
    assert data["contrato"] == "089/2026"
