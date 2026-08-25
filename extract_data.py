# -*- coding: utf-8 -*-
"""
Extrai os dados da planilha MSI (Controle, listas de documentos e as
não conformidades registradas em RIs) para um JSON que alimenta o
dashboard HTML.

Reexecute este script sempre que a planilha for atualizada, e depois
regenere o dashboard (build_dashboard.py) a partir do JSON gerado.

Nota: a partir da revisão R05 a planilha não tem mais RDO/OS/Obsoletos
(o usuário removeu essas abas), e o Controle foi reorganizado (cabeçalho
começa na linha 2, dados a partir da linha 4).
"""
import json
import sys
import datetime
import openpyxl

XLSX_PATH = sys.argv[1] if len(sys.argv) > 1 else "K19-204-FER-LD-001-R05 - Lista de Documentos (MSI).xlsx"
TODAY = datetime.date.fromisoformat(sys.argv[2]) if len(sys.argv) > 2 else datetime.date.today()

wb = openpyxl.load_workbook(XLSX_PATH, data_only=True)


def as_date(v):
    if isinstance(v, datetime.datetime):
        return v.date()
    if isinstance(v, datetime.date):
        return v
    return None


def last_row_with_value(ws, col, floor, ceiling=None):
    """Dynamic last-row detection so the script keeps working as rows are added."""
    ceiling = ceiling or ws.max_row
    last = floor - 1
    for r in range(floor, ceiling + 1):
        if ws.cell(row=r, column=col).value:
            last = r
    return max(last, floor - 1)


# ---------------------------------------------------------------------------
# Controle (cabeçalho linha 2/3, dados a partir da linha 4)
# ---------------------------------------------------------------------------
ws = wb["Controle"]
CONTROLE_DATA_ROW = 4
CONTROLE_LAST_ROW = last_row_with_value(ws, 5, CONTROLE_DATA_ROW, 200)  # col E = descrição

areas = []
for r in range(CONTROLE_DATA_ROW, CONTROLE_LAST_ROW + 1):
    desc = ws.cell(row=r, column=5).value  # E: Descricao da Area
    if not desc:
        continue
    codigo_ld = ws.cell(row=r, column=2).value  # B
    status = ws.cell(row=r, column=26).value  # Z
    adequacao_geral = ws.cell(row=r, column=16).value  # P
    validade_laudo = as_date(ws.cell(row=r, column=20).value)  # T
    validade_is = as_date(ws.cell(row=r, column=23).value)  # W
    pendencia = ws.cell(row=r, column=29).value  # AC
    dossie = ws.cell(row=r, column=27).value  # AA
    areas.append({
        "row": r,
        "codigo_ld": codigo_ld,
        "descricao": str(desc).strip(),
        "status": status,
        "adequacao_geral": adequacao_geral,
        "validade_laudo": validade_laudo.isoformat() if validade_laudo else None,
        "validade_is": validade_is.isoformat() if validade_is else None,
        "pendencia": (str(pendencia).strip() if pendencia else None),
        "dossie": dossie,
    })

status_counts = {}
for a in areas:
    s = a["status"] or "Não informado"
    status_counts[s] = status_counts.get(s, 0) + 1

adequacoes = [a["adequacao_geral"] for a in areas if isinstance(a["adequacao_geral"], (int, float))]
adequacao_media = sum(adequacoes) / len(adequacoes) if adequacoes else None

pendencias_abertas = [
    {"area": a["descricao"], "codigo": a["codigo_ld"], "pendencia": a["pendencia"]}
    for a in areas
    if a["pendencia"] and a["pendencia"].upper() not in ("OK", "-", "")
]


def days_diff(iso_date):
    d = datetime.date.fromisoformat(iso_date)
    return (d - TODAY).days


vencimentos = []
for a in areas:
    for campo, label in (("validade_laudo", "Laudo completo (medição)"), ("validade_is", "Inspeção Semestral (IS)")):
        v = a[campo]
        if not v:
            continue
        dd = days_diff(v)
        if dd <= 90:  # vencido ou vencendo nos proximos 90 dias
            vencimentos.append({
                "area": a["descricao"],
                "codigo": a["codigo_ld"],
                "documento": label,
                "data": v,
                "dias": dd,
                "situacao": "vencido" if dd < 0 else "vencendo",
            })
vencimentos.sort(key=lambda x: x["dias"])

# ---------------------------------------------------------------------------
# Documentacao emitida (contagem por aba; linhas variam por aba)
# ---------------------------------------------------------------------------
doc_sheets = {
    "Desenhos (DE)": ("Desenhos", 5, 92),
    "Memoriais Descritivos (MD)": ("MDs", 4, 87),
    "Listas de Materiais (LM)": ("LMs", 4, 89),
    "Análises de Risco (MC)": ("MCs", 4, 98),
    "Relatórios de Inspeção (RI)": ("RIs", 4, 99),
}
documentacao = {}
for label, (sheet, drow, floor_last) in doc_sheets.items():
    sws = wb[sheet]
    last = last_row_with_value(sws, 1, drow, max(floor_last, sws.max_row))
    documentacao[label] = sum(1 for r in range(drow, last + 1) if sws.cell(row=r, column=1).value)

# ---------------------------------------------------------------------------
# Não conformidades (aba RIs, colunas M/N/O/P/Q = Descrição/Severidade/
# Status/Responsável/Data)
# ---------------------------------------------------------------------------
ri_ws = wb["RIs"]
RI_DATA_ROW = 4
RI_LAST_ROW = last_row_with_value(ri_ws, 1, RI_DATA_ROW, max(99, ri_ws.max_row))
NC_DESC_COL, NC_SEV_COL, NC_STATUS_COL, NC_RESP_COL, NC_DATE_COL = 13, 14, 15, 16, 17

nao_conformidades = []
for r in range(RI_DATA_ROW, RI_LAST_ROW + 1):
    desc = ri_ws.cell(row=r, column=NC_DESC_COL).value
    if not desc or not str(desc).strip():
        continue
    area = ri_ws.cell(row=r, column=3).value  # Descrição da Área
    numero = ri_ws.cell(row=r, column=1).value  # Número (K19-204-...-RI-xxx)
    severidade = ri_ws.cell(row=r, column=NC_SEV_COL).value
    status = ri_ws.cell(row=r, column=NC_STATUS_COL).value
    responsavel = ri_ws.cell(row=r, column=NC_RESP_COL).value
    data_nc = as_date(ri_ws.cell(row=r, column=NC_DATE_COL).value)
    nao_conformidades.append({
        "area": str(area).strip() if area else None,
        "numero_ri": numero,
        "descricao": str(desc).strip(),
        "severidade": severidade or "Não informado",
        "status": status or "Não informado",
        "responsavel": responsavel,
        "data": data_nc.isoformat() if data_nc else None,
    })

SEVERIDADE_ORDER = {"Crítica": 0, "Média": 1, "Baixa": 2, "Não informado": 3}
nao_conformidades.sort(key=lambda x: (SEVERIDADE_ORDER.get(x["severidade"], 9),
                                       0 if x["status"] == "Aberta" else 1))

nc_abertas = sum(1 for n in nao_conformidades if n["status"] == "Aberta")
nc_status_counts = {}
for n in nao_conformidades:
    nc_status_counts[n["status"]] = nc_status_counts.get(n["status"], 0) + 1
nc_severidade_counts = {}
for n in nao_conformidades:
    nc_severidade_counts[n["severidade"]] = nc_severidade_counts.get(n["severidade"], 0) + 1

# ---------------------------------------------------------------------------
# Output
# ---------------------------------------------------------------------------
data = {
    "gerado_em": TODAY.isoformat(),
    "contrato": "089/2026",
    "cliente": "Ferro+ Mineração S.A",
    "empresa": "MSI Engenharia e Tecnologia",
    "objeto": "Sistema de Proteção contra Descargas Atmosféricas (SPDA)",
    "areas_total": len(areas),
    "status_counts": status_counts,
    "adequacao_media": adequacao_media,
    "documentacao": documentacao,
    "pendencias_abertas": pendencias_abertas,
    "vencimentos": vencimentos,
    "nao_conformidades": nao_conformidades,
    "nc_abertas": nc_abertas,
    "nc_status_counts": nc_status_counts,
    "nc_severidade_counts": nc_severidade_counts,
}

out_path = sys.argv[3] if len(sys.argv) > 3 else "dashboard_data.json"
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("areas_total:", data["areas_total"])
print("status_counts:", status_counts)
print("adequacao_media:", adequacao_media)
print("documentacao:", documentacao)
print("pendencias_abertas:", len(pendencias_abertas))
print("vencimentos (<=90d):", len(vencimentos))
print("nao_conformidades:", len(nao_conformidades), "abertas:", nc_abertas)
print("Saved ->", out_path)
