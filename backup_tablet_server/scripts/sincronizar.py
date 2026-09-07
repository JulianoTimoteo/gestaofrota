#!/usr/bin/env python3
"""Sincronizador Completo - SimpleFarm Integration
Atualiza metricas via API, OS via Playwright, e mantem equipamentos/operacoes.
"""
import os
import sys
import sqlite3
import requests
import urllib3
import time
from datetime import datetime
from pathlib import Path

urllib3.disable_warnings()

PROJECT_DIR = Path(__file__).parent.parent
DB_PATH = PROJECT_DIR / "meus_banco.db"

# Carrega .env se existir (opcional, nao quebra se python-dotenv nao estiver instalado)
try:
    from dotenv import load_dotenv
    load_dotenv(PROJECT_DIR / '.env')
except ImportError:
    pass

BASE_URL = os.environ.get('SF_BASE_URL', 'https://simplefarm.usinapitangueiras.com.br:8050')
USERNAME = os.environ.get('SF_USERNAME', 'julianotimoteo')
PASSWORD = os.environ.get('SF_PASSWORD', '')

def init_db(conn):
    conn.execute('''CREATE TABLE IF NOT EXISTS ordens_servico (
        id INTEGER PRIMARY KEY AUTOINCREMENT, tipo_os TEXT, sub_classe TEXT,
        frota_cc TEXT, codigo_equip TEXT, cod_os TEXT NOT NULL, status_os TEXT DEFAULT 'ABERTA',
        tipo_oficina TEXT, oficina TEXT, data_entrada TEXT, data_previsao TEXT,
        dias_permanencia TEXT, descricao TEXT, painel_id INTEGER, widget_id INTEGER,
        data_sincronizacao TEXT NOT NULL, UNIQUE(cod_os))''')
    conn.execute('''CREATE TABLE IF NOT EXISTS equipamentos (
        id INTEGER PRIMARY KEY AUTOINCREMENT, codigo INTEGER, descricao TEXT,
        modelo TEXT, tipo TEXT, grupo TEXT, data_sincronizacao TEXT)''')
    conn.execute('''CREATE TABLE IF NOT EXISTS operacoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT, codigo INTEGER, descricao TEXT,
        tipo_operacao TEXT, corporativo TEXT, grupo_operacao TEXT,
        tempo_operacao TEXT, estado TEXT, status TEXT, data_sincronizacao TEXT)''')
    conn.execute('''CREATE TABLE IF NOT EXISTS painel_metricas (
        id INTEGER PRIMARY KEY AUTOINCREMENT, painel_id INTEGER, painel_nome TEXT,
        widget_id INTEGER, widget_titulo TEXT, valor TEXT, unidade TEXT,
        cor_fundo TEXT, tipo_widget TEXT, data_extracao TIMESTAMP DEFAULT CURRENT_TIMESTAMP)''')
    conn.execute('''CREATE TABLE IF NOT EXISTS sincronizacao_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT, painel_id INTEGER, painel_nome TEXT,
        status TEXT, registros_extraidos INTEGER, erro TEXT, data_sincronizacao TEXT)''')
    conn.commit()

def login(max_retries=3):
    """Autentica com retry e backoff curto (1s, 2s entre tentativas)."""
    for attempt in range(1, max_retries + 1):
        try:
            session = requests.Session()
            session.verify = False
            resp = session.post(f'{BASE_URL}/Login/AuthenticateUser',
                data={'UserName': USERNAME, 'Password': PASSWORD, 'returnurl': ''},
                headers={'Content-Type': 'application/x-www-form-urlencoded'},
                allow_redirects=False, timeout=30)
            if resp.status_code == 302:
                return session
            print(f"    Login tentativa {attempt}/{max_retries}: status {resp.status_code} (esperado 302)")
        except requests.exceptions.Timeout:
            print(f"    Login tentativa {attempt}/{max_retries}: timeout")
        except requests.exceptions.ConnectionError as e:
            print(f"    Login tentativa {attempt}/{max_retries}: erro de conexao ({e})")
        except Exception as e:
            print(f"    Login tentativa {attempt}/{max_retries}: erro inesperado ({e})")
        if attempt < max_retries:
            time.sleep(attempt)
    return None

def get_widget_value(session, panel_id, widget_id):
    for attempt in range(3):
        try:
            resp = session.post(f'{BASE_URL}/Home/GetWidgetValue',
                data={'UserPanelId': panel_id, 'ReferenceDate': datetime.utcnow().isoformat(), 'Widgets': widget_id},
                headers={'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest'}, timeout=60)
            if resp.status_code == 200 and len(resp.text) > 10:
                try:
                    return resp.json()
                except:
                    return None
            return None
        except requests.exceptions.Timeout:
            if attempt < 2:
                continue
            return None
        except Exception:
            return None

def sync_metricas(session, conn):
    """Sincroniza metricas dos paineis via API."""
    print("[1/4] Sincronizando metricas dos paineis...")
    paineis = [
        (67, 'LGT - Logistica', [497, 498, 499, 500, 501, 566, 502, 567, 503, 560, 561, 562, 563, 564, 565]),
        (102, 'BH Report', [965, 966, 967, 968, 969, 970, 971, 976, 980, 1002, 1003, 1107, 1110, 1111, 1113, 1119, 1120]),
        (104, 'Locais Atacados', [1011, 1014, 1015, 1016, 1017, 1077, 1078, 1079, 1080, 1081, 1082]),
        (105, 'Producao', [1018, 1033, 1034, 1035, 1036, 1037, 1038]),
        (106, 'Processo Plantio', [1045, 1049, 1098]),
        (146, 'COA Viagens', [1387, 1388, 1389]),
    ]

    total_metricas = 0
    for panel_id, panel_name, widgets in paineis:
        for widget_id in widgets:
            data = get_widget_value(session, panel_id, widget_id)
            if data and data.get('Displays'):
                for d in data['Displays']:
                    conn.execute('''INSERT INTO painel_metricas (painel_id, painel_nome, widget_id, widget_titulo, valor, unidade, tipo_widget)
                        VALUES (?, ?, ?, ?, ?, ?, ?)''',
                        (panel_id, panel_name, widget_id, d.get('Title', ''), str(d.get('Value', '')), d.get('UnitMeasurement', ''), 'value'))
                    total_metricas += 1
    conn.commit()
    print(f"    {total_metricas} metricas atualizadas")
    return total_metricas

def sync_os(conn):
    """Sincroniza OS do Painel 174 via Playwright."""
    print("\n[2/4] Sincronizando OS Oficina (Painel 174)...")
    
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("    ERRO: Playwright nao instalado")
        return 0
    
    agora = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    total_os = 0
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(ignore_https_errors=True)
        page = context.new_page()
        
        # Login
        page.goto(f'{BASE_URL}/Login', wait_until='networkidle', timeout=30000)
        page.fill('input[name="UserName"]', USERNAME)
        page.fill('input[name="Password"]', PASSWORD)
        page.click('button[type="submit"], input[type="submit"]')
        page.wait_for_url('**/#/Home/**', timeout=15000)
        time.sleep(3)
        
        # Find and click OsOficina tab
        tabs = page.query_selector_all('.k-tabstrip-items .k-item, .k-item')
        target_tab = None
        for tab in tabs:
            text = tab.inner_text()
            if 'OsOficina' in text:
                target_tab = tab
                break
        
        if not target_tab:
            print("    ERRO: Aba OsOficina nao encontrada")
            browser.close()
            return 0
        
        target_tab.click()
        
        # Wait for loading
        try:
            page.wait_for_selector('.ga-loading-mask', state='hidden', timeout=15000)
        except:
            pass
        time.sleep(5)
        
        # Extract table data
        tables = page.query_selector_all('table')
        for table in tables:
            rows = table.query_selector_all('tbody tr')
            for row in rows:
                cells = row.query_selector_all('td')
                cell_texts = [c.inner_text().strip() for c in cells]
                
                if len(cell_texts) >= 6:
                    cod_os = cell_texts[3] if len(cell_texts) > 3 else ''
                    if cod_os:
                        try:
                            conn.execute('''INSERT OR REPLACE INTO ordens_servico 
                                (tipo_os, sub_classe, codigo_equip, cod_os, status_os, 
                                 tipo_oficina, oficina, data_entrada, data_previsao, 
                                 dias_permanencia, descricao, painel_id, widget_id, data_sincronizacao)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 174, 1565, ?)''',
                                (cell_texts[0] if len(cell_texts) > 0 else '',
                                 cell_texts[1] if len(cell_texts) > 1 else '',
                                 cell_texts[2] if len(cell_texts) > 2 else '',
                                 cod_os,
                                 cell_texts[4] if len(cell_texts) > 4 else '',
                                 cell_texts[5] if len(cell_texts) > 5 else '',
                                 cell_texts[6] if len(cell_texts) > 6 else '',
                                 cell_texts[7] if len(cell_texts) > 7 else '',
                                 cell_texts[8] if len(cell_texts) > 8 else '',
                                 cell_texts[9] if len(cell_texts) > 9 else '',
                                 cell_texts[10] if len(cell_texts) > 10 else '',
                                 agora))
                            total_os += 1
                        except Exception as e:
                            print(f"    Erro ao inserir OS: {e}")
        
        conn.commit()
        browser.close()
    
    print(f"    {total_os} OS sincronizadas")
    return total_os

def sync_equipamentos_operacoes(conn):
    """Atualiza data_sincronizacao de equipamentos e operacoes."""
    print("\n[3/4] Atualizando equipamentos e operacoes...")
    
    agora = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    # Update sync date for equipamentos
    conn.execute('UPDATE equipamentos SET data_sincronizacao = ? WHERE data_sincronizacao IS NULL', (agora,))
    
    # Update sync date for operacoes
    conn.execute('UPDATE operacoes SET data_sincronizacao = ? WHERE data_sincronizacao IS NULL', (agora,))
    
    conn.commit()
    
    cursor = conn.execute('SELECT COUNT(*) FROM equipamentos')
    eq_count = cursor.fetchone()[0]
    
    cursor = conn.execute('SELECT COUNT(*) FROM operacoes')
    op_count = cursor.fetchone()[0]
    
    print(f"    {eq_count} equipamentos no banco")
    print(f"    {op_count} operacoes no banco")
    
    return eq_count + op_count

def run_sync():
    print("=" * 60)
    print("SINCRONIZACAO SIMPLEFARM")
    print(f"Data: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    print("=" * 60)

    conn = sqlite3.connect(DB_PATH)
    init_db(conn)

    # 1. Sync metricas via API
    session = login()
    if not session:
        print("ERRO: Falha no login")
        return 0
    
    print("Login OK")
    total_metricas = sync_metricas(session, conn)
    
    # 2. Sync OS via Playwright
    total_os = sync_os(conn)
    
    # 3. Sync equipamentos/operacoes
    total_eq_op = sync_equipamentos_operacoes(conn)

    # Log
    total = total_metricas + total_os + total_eq_op
    conn.execute('''INSERT INTO sincronizacao_log (painel_id, painel_nome, status, registros_extraidos, data_sincronizacao)
        VALUES (NULL, 'Sincronizacao Completa', 'ok', ?, ?)''',
        (total, datetime.now().isoformat()))
    conn.commit()

    conn.close()
    print("\n" + "=" * 60)
    print("SINCRONIZACAO CONCLUIDA")
    print(f"  Metricas: {total_metricas}")
    print(f"  OS: {total_os}")
    print(f"  Equipamentos/Operacoes: {total_eq_op}")
    print("=" * 60)

    return total

if __name__ == '__main__':
    run_sync()
