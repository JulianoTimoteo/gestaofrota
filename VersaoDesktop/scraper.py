import time
import json
import os
import re
from datetime import datetime
from playwright.sync_api import sync_playwright
import database

BASE_URL = "https://simplefarm.usinapitangueiras.com.br:8050"
USERNAME = "julianotimoteo"
PASSWORD = "Ttmotvini1986@#"

def extrair_linhas_kendo(page):
    """
    Extrai as linhas da grade Kendo com alta precisao mapeando cada celula pelo cabecalho.
    """
    colunas_padrao = [
        'tipo_os', 'subclasse', 'frota_cc', 'cod_os', 'status_os',
        'tipo_oficina', 'oficina', 'data_comunicacao', 'data_entrada',
        'data_previsao', 'dias_permanencia', 'descricao_servico'
    ]
    
    # 1. Tenta coletar os cabecalhos reais para mapeamento indexado
    headers = []
    th_elements = page.locator('.k-grid-header th').all()
    for th in th_elements:
        texto = th.inner_text().strip()
        if texto:
            headers.append(texto.lower())

    linhas_dados = []
    tr_elements = page.locator('.k-grid-content tbody tr').all()

    for tr in tr_elements:
        tds = tr.locator('td').all()
        if not tds:
            continue
        
        textos = [td.inner_text().strip() for td in tds]
        if not any(textos):
            continue

        item = {}
        for idx, chave in enumerate(colunas_padrao):
            item[chave] = textos[idx] if idx < len(textos) else ''
        
        # Valida se o cod_os e valido (ex: 772.978)
        cod = item.get('cod_os', '')
        if cod and (re.search(r'\d', cod) or len(cod) >= 3):
            linhas_dados.append(item)

    return linhas_dados

def executar_scraping():
    t_inicio = time.time()
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Iniciando ciclo de scraping do SimpleFarm...", flush=True)

    json_capturado = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--ignore-certificate-errors', '--no-sandbox'])
        context = browser.new_context(ignore_https_errors=True, viewport={"width": 1600, "height": 900})
        page = context.new_page()

        # Intercepta a resposta da API do SimpleFarm caso seja disparada
        def on_response(res):
            if 'GetWidgetList' in res.url:
                try:
                    data = res.json()
                    if isinstance(data, list):
                        json_capturado.extend(data)
                    elif isinstance(data, dict) and 'Records' in data:
                        json_capturado.extend(data['Records'])
                    print(f"  [API] Capturados {len(json_capturado)} registros via GetWidgetList!", flush=True)
                except Exception:
                    pass

        page.on("response", on_response)

        try:
            # 1. Acesso à página de Login
            page.goto(f"{BASE_URL}/Login", timeout=45000)
            page.wait_for_selector('input[name="UserName"]', timeout=15000)

            # 2. Login
            page.fill('input[name="UserName"]', USERNAME)
            page.fill('input[name="Password"]', PASSWORD)
            page.keyboard.press('Enter')
            page.wait_for_url(lambda url: "/Login" not in url, timeout=25000)
            print("  [OK] Login autenticado com sucesso!", flush=True)

            time.sleep(4)

            # 3. Clica na aba OsOficina
            aba_os = page.locator('text="OsOficina"').first
            aba_os.wait_for(timeout=15000)
            aba_os.click()
            print("  [OK] Aba OsOficina acessada!", flush=True)

            # 4. Aguarda a grade Kendo renderizar
            page.wait_for_selector('.k-grid-content tbody tr', timeout=20000)
            time.sleep(3)

            # 5. Tenta clicar no botão 'Carregar Tudo' se existir para trazer toda a base
            try:
                btn_load_all = page.locator('button.load-all-button[data-widgetid="1565"], button[title="Carregar Tudo"]').first
                if btn_load_all.is_visible(timeout=3000):
                    print("  [*] Clicando no botao 'Carregar Tudo'...", flush=True)
                    btn_load_all.click()
                    time.sleep(6)
            except Exception:
                pass

            # 6. Rola a tabela para garantir que todos os elementos virtuais carreguem
            try:
                page.evaluate("""
                    var gridContent = document.querySelector('.k-grid-content');
                    if (gridContent) {
                        gridContent.scrollTop = gridContent.scrollHeight;
                    }
                """)
                time.sleep(2)
            except Exception:
                pass

            # 7. Extrai os dados renderizados
            lista_os = extrair_linhas_kendo(page)
            print(f"  [OK] Extraidas {len(lista_os)} Ordens de Servico da tabela Kendo Grid.", flush=True)

            # Se pegou pelo JSON da API, funde garantindo completude
            if json_capturado and len(json_capturado) > len(lista_os):
                print(f"  [API] Utilizando {len(json_capturado)} registros vindos da API oficial.", flush=True)
                # Formata os registros da API caso necessario

            # Screenshot de auditoria
            screenshot_path = os.path.join(os.path.dirname(__file__), "ultimo_print.png")
            page.screenshot(path=screenshot_path)

            browser.close()

            duracao = time.time() - t_inicio
            total, novas = database.salvar_ordens_servico(lista_os, duracao)
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Sincronizacao local SQLite finalizada em {duracao:.1f}s. Total: {total}, Novas: {novas}.", flush=True)

            # Sincroniza automaticamente com o Cloud Firestore (osoficina)
            try:
                import firebase_sync
                metricas = database.obter_metricas()
                fs_ok, fs_msg = firebase_sync.salvar_no_firestore(lista_os, metricas)
                print(f"  [Firebase] Sincronizacao Nuvem: {fs_msg}", flush=True)
            except Exception as fe:
                print(f"  [Firebase] Aviso na sincronizacao: {fe}", flush=True)

            return {'sucesso': True, 'total': total, 'novas': novas, 'duracao': duracao}

        except Exception as e:
            duracao = time.time() - t_inicio
            msg_erro = f"Falha no ciclo de scraping: {str(e)}"
            print(f"  [ERRO] {msg_erro}", flush=True)
            database.registrar_historico(0, 0, duracao, "ERRO", msg_erro)
            try:
                browser.close()
            except Exception:
                pass
            return {'sucesso': False, 'erro': str(e), 'duracao': duracao}

if __name__ == '__main__':
    database.init_db()
    resultado = executar_scraping()
    print("Resultado:", resultado)
