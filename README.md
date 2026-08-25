# Painel SPDA — Ferro+ Mineração / MSI Engenharia

Pasta com todo o código-fonte do painel de conformidade SPDA (contrato 089/2026).
O painel final é um **único arquivo HTML autocontido** (`dashboard.html`) — não precisa
de servidor, backend ou instalação de nada para ser aberto; basta dar duplo clique
ou abrir pelo navegador.

Os outros arquivos são o "código-fonte" que gera esse HTML a partir da planilha
Excel oficial. Você só precisa deles quando quiser **atualizar os dados** (planilha
nova, revisão nova) e regerar o painel.

## Estrutura da pasta

- `dashboard.html` — o painel pronto, já gerado. Pode abrir direto no navegador.
- `K19-204-FER-LD-001-R05 - Lista de Documentos (MSI).xlsx` — a planilha oficial
  (fonte dos dados).
- `extract_data.py` — lê a planilha `.xlsx` e gera `dashboard_data.json`.
- `dashboard_data.json` — os dados já extraídos, em JSON (é o que `build_dashboard.py`
  usa como entrada).
- `build_dashboard.py` — gera o `dashboard.html` final a partir do `dashboard_data.json`
  (contém todo o HTML/CSS/JS do painel).
- `extend_v2.py` — script auxiliar usado uma vez para reestruturar a planilha (colunas
  de-para, aba de não conformidades/pendências em RIs). Não precisa rodar de novo a
  menos que queira reaplicar essa reestruturação em outra planilha do zero.
- `vendor/xlsx.core.min.js` — biblioteca SheetJS embutida no painel (permite o botão
  "Carregar planilha" funcionar direto no navegador, sem servidor).
- `requirements.txt` — única dependência Python (`openpyxl`, usada para ler `.xlsx`).

## Como rodar no VS Code

1. Extraia o `.zip` e abra a pasta no VS Code (`Arquivo > Abrir Pasta...`).
2. Abra um terminal integrado (`Ctrl+\`` ou menu `Terminal > New Terminal`).
3. (Recomendado) crie um ambiente virtual e instale a dependência:

   ```bash
   python3 -m venv .venv
   source .venv/bin/activate      # no Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   ```

4. Para só **ver o painel** como está: abra `dashboard.html` com a extensão
   "Live Server" do VS Code, ou simplesmente dê duplo clique nele no explorador
   de arquivos — ele abre em qualquer navegador.

## Como atualizar os dados (planilha nova)

Sempre que a planilha `.xlsx` for atualizada (nova revisão, novos itens, etc.),
rode os dois scripts em sequência, na pasta do projeto:

```bash
python3 extract_data.py "K19-204-FER-LD-001-R05 - Lista de Documentos (MSI).xlsx"
python3 build_dashboard.py dashboard_data.json dashboard.html
```

- O primeiro comando lê a planilha e regrava `dashboard_data.json`.
- O segundo lê esse JSON e regrava `dashboard.html` com os dados novos.

Se quiser usar outra planilha ou nomes de arquivo diferentes, basta passar os
caminhos como argumento:

```bash
python3 extract_data.py "caminho/para/outra_planilha.xlsx"
python3 build_dashboard.py dashboard_data.json dashboard_novo.html
```

## Sobre o botão "Carregar planilha" dentro do próprio painel

O `dashboard.html` também permite carregar uma planilha `.xlsx` diretamente pelo
navegador (sem precisar rodar Python) — útil para atualizações rápidas sem abrir
o VS Code. Os scripts Python acima fazem a mesma coisa, mas via linha de comando,
e são úteis para automatizar ou versionar o processo.

## Aba "Editor" e publicação ao vivo

A aba **Editor** dentro do painel (pendências abertas e pendências de execução)
só publica atualizações automaticamente quando o `dashboard.html` está aberto
através do link publicado no Cowork/claude.ai (o artefato já enviado a você).
Ao abrir este `dashboard.html` localmente (fora do Cowork, como este arquivo da
pasta), a aba Editor funciona, mas o botão de salvar baixa um novo `.html`
atualizado em vez de publicar automaticamente — é o comportamento esperado para
um arquivo local/standalone.
