import os
import sys
import time
import threading
from datetime import datetime
from flask import Flask, jsonify, request, render_template_string, send_file
import database
import scraper
import pandas as pd
import io

app = Flask(__name__)

SCRAPING_EM_ANDAMENTO = False
INTERVALO_MINUTOS = 15
LOCK_SCRAPING = threading.Lock()

def loop_agendador():
    """Loop em segundo plano que executa o scraping e sincroniza com Firebase a cada 15 min."""
    time.sleep(15)
    while True:
        try:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Executando ciclo agendado (15 min)...", flush=True)
            executar_sync_seguro()
        except Exception as e:
            print(f"[Agendador] Erro no ciclo automatico: {e}", flush=True)
        time.sleep(INTERVALO_MINUTOS * 60)

def executar_sync_seguro():
    global SCRAPING_EM_ANDAMENTO
    with LOCK_SCRAPING:
        if SCRAPING_EM_ANDAMENTO:
            return {'sucesso': False, 'mensagem': 'Scraping ja em andamento.'}
        SCRAPING_EM_ANDAMENTO = True

    try:
        resultado = scraper.executar_scraping()
        return resultado
    finally:
        with LOCK_SCRAPING:
            SCRAPING_EM_ANDAMENTO = False

# ── Templates HTML Integrado (Todas as 12 Colunas) ───────────────────────────
HTML_DASHBOARD = """
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SimpleFarm Desktop - Central de OS (12 Colunas Completas)</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-body: #0a0e17;
            --bg-card: rgba(18, 24, 38, 0.95);
            --bg-hover: rgba(56, 189, 248, 0.08);
            --border-color: rgba(255, 255, 255, 0.08);
            --text-primary: #f8fafc;
            --text-secondary: #94a3b8;
            --accent-green: #16a34a;
            --accent-green-hover: #22c55e;
            --accent-blue: #0284c7;
            --badge-campo: #38bdf8;
            --badge-externa: #f59e0b;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Inter', sans-serif; }
        body { background: var(--bg-body); color: var(--text-primary); min-height: 100vh; padding: 20px; }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            padding: 16px 24px;
            border-radius: 12px;
            margin-bottom: 20px;
        }
        .header-title { display: flex; align-items: center; gap: 14px; }
        .header-title i { font-size: 26px; color: #38bdf8; }
        .header-title h1 { font-size: 19px; font-weight: 700; }
        .header-title span { font-size: 13px; color: var(--text-secondary); }

        .header-actions { display: flex; align-items: center; gap: 12px; }
        .status-badge {
            background: rgba(34, 197, 94, 0.15);
            color: #22c55e;
            border: 1px solid rgba(34, 197, 94, 0.3);
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .status-badge.loading {
            background: rgba(245, 158, 11, 0.15);
            color: #f59e0b;
            border-color: rgba(245, 158, 11, 0.3);
        }

        .btn {
            background: var(--accent-green);
            color: #fff;
            border: none;
            padding: 9px 16px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            transition: all 0.2s ease;
            text-decoration: none;
        }
        .btn:hover { background: var(--accent-green-hover); }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-secondary {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid var(--border-color);
            color: var(--text-primary);
        }
        .btn-secondary:hover { background: rgba(255, 255, 255, 0.1); }

        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
            gap: 16px;
            margin-bottom: 20px;
        }
        .metric-card {
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            padding: 16px 20px;
            border-radius: 12px;
            position: relative;
        }
        .metric-card::after {
            content: ''; position: absolute; top: 0; left: 0; width: 4px; height: 100%;
            background: #38bdf8; border-radius: 12px 0 0 12px;
        }
        .metric-card.green::after { background: #22c55e; }
        .metric-card.yellow::after { background: #f59e0b; }
        .metric-card.red::after { background: #ef4444; }

        .metric-label { font-size: 12px; color: var(--text-secondary); font-weight: 500; }
        .metric-value { font-size: 26px; font-weight: 700; color: #fff; margin-top: 4px; }
        .metric-sub { font-size: 11px; color: var(--text-secondary); margin-top: 2px; }

        .card-container {
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            padding: 18px;
        }
        .toolbar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 16px;
            margin-bottom: 16px;
            flex-wrap: wrap;
        }
        .search-box {
            position: relative;
            flex: 1;
            max-width: 450px;
        }
        .search-box input {
            width: 100%;
            background: #0a0e17;
            border: 1px solid var(--border-color);
            padding: 10px 14px 10px 38px;
            border-radius: 8px;
            color: #fff;
            font-size: 13px;
            outline: none;
        }
        .search-box input:focus { border-color: #38bdf8; }
        .search-box i {
            position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
            color: var(--text-secondary); font-size: 14px;
        }

        .filter-buttons { display: flex; gap: 8px; }
        .filter-btn {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid var(--border-color);
            color: var(--text-secondary);
            padding: 7px 14px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
        }
        .filter-btn.active {
            background: var(--accent-blue);
            color: #fff;
            border-color: var(--accent-blue);
        }

        .table-responsive {
            overflow-x: auto;
            max-height: 620px;
            border: 1px solid var(--border-color);
            border-radius: 8px;
        }
        table { width: 100%; border-collapse: collapse; text-align: left; font-size: 12px; white-space: nowrap; }
        thead {
            background: #111726;
            position: sticky;
            top: 0;
            z-index: 10;
        }
        th {
            padding: 11px 12px;
            color: #94a3b8;
            font-weight: 600;
            border-bottom: 1px solid var(--border-color);
            border-right: 1px solid rgba(255,255,255,0.03);
        }
        td {
            padding: 10px 12px;
            border-bottom: 1px solid rgba(255,255,255,0.04);
            border-right: 1px solid rgba(255,255,255,0.02);
            color: var(--text-primary);
        }
        tbody tr:hover { background: var(--bg-hover); }

        .badge-tag {
            padding: 3px 7px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
            display: inline-block;
        }
        .badge-campo { background: rgba(56, 189, 248, 0.15); color: #38bdf8; }
        .badge-externa { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
        .badge-status { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
        .badge-dias { font-weight: 700; }
        .badge-dias.ok { color: #22c55e; }
        .badge-dias.warn { color: #f59e0b; }
        .badge-dias.critico { color: #ef4444; }

        .footer {
            text-align: center;
            color: var(--text-secondary);
            font-size: 12px;
            margin-top: 24px;
        }
    </style>
</head>
<body>

    <div class="header">
        <div class="header-title">
            <i class="fa-solid fa-screwdriver-wrench"></i>
            <div>
                <h1>OFI 002 - Demanda de OS v2</h1>
                <span>SimpleFarm Desktop • Mapeamento das 12 Colunas Oficiais</span>
            </div>
        </div>
        <div class="header-actions">
            <div id="statusBadge" class="status-badge">
                <i class="fa-solid fa-circle-check"></i>
                <span id="statusTexto">Sincronizado</span>
            </div>
            <button id="btnSync" class="btn" onclick="dispararSync()">
                <i class="fa-solid fa-arrows-rotate"></i> Sincronizar Agora
            </button>
            <a href="/api/exportar/excel" class="btn btn-secondary">
                <i class="fa-solid fa-file-excel"></i> Exportar Excel
            </a>
            <a href="/screenshot" target="_blank" class="btn btn-secondary">
                <i class="fa-solid fa-camera"></i> Ver Tela Original
            </a>
        </div>
    </div>

    <!-- Metricas -->
    <div class="metrics-grid">
        <div class="metric-card green">
            <div class="metric-label">Total de OS no Banco</div>
            <div id="metricTotal" class="metric-value">--</div>
            <div class="metric-sub">Demandas ativas de oficina</div>
        </div>
        <div class="metric-card">
            <div class="metric-label">Oficina de Campo</div>
            <div id="metricCampo" class="metric-value">--</div>
            <div class="metric-sub">Oficinas volantes e Pit-Stop</div>
        </div>
        <div class="metric-card yellow">
            <div class="metric-label">Oficina Externa</div>
            <div id="metricExterna" class="metric-value">--</div>
            <div class="metric-sub">Concessionárias e Terceiros</div>
        </div>
        <div class="metric-card red">
            <div class="metric-label">Maior Permanência</div>
            <div id="metricDias" class="metric-value">--</div>
            <div class="metric-sub">Tempo máximo parado</div>
        </div>
    </div>

    <!-- Tabela 12 Colunas -->
    <div class="card-container">
        <div class="toolbar">
            <div class="search-box">
                <i class="fa-solid fa-magnifying-glass"></i>
                <input type="text" id="searchInput" placeholder="Pesquisar por Cód. OS, Frota, Oficina, Serviço..." onkeyup="filtrarTabela()">
            </div>
            <div class="filter-buttons">
                <button class="filter-btn active" onclick="filtrarOficina('TODOS', this)">Todas as Oficinas</button>
                <button class="filter-btn" onclick="filtrarOficina('CAMPO', this)">Campo</button>
                <button class="filter-btn" onclick="filtrarOficina('EXTERNA', this)">Externa</button>
            </div>
            <div id="contadorRegistros" style="font-size: 13px; color: var(--text-secondary); font-weight: 500;">
                Carregando registros...
            </div>
        </div>

        <div class="table-responsive">
            <table>
                <thead>
                    <tr>
                        <th>Tipo OS</th>
                        <th>SubClasse</th>
                        <th>Frota / CC</th>
                        <th>Cód. OS</th>
                        <th>Status OS</th>
                        <th>Tipo Oficina</th>
                        <th>Oficina</th>
                        <th>Data Comunicação</th>
                        <th>Data Entrada</th>
                        <th>Data Previsão</th>
                        <th>Dias Permanência</th>
                        <th>Descrição Serviço</th>
                    </tr>
                </thead>
                <tbody id="tabelaOS">
                    <tr><td colspan="12" style="text-align: center; color: var(--text-secondary); padding: 30px;">Carregando registros do banco...</td></tr>
                </tbody>
            </table>
        </div>
    </div>

    <div class="footer">
        SimpleFarm Versão Desktop • Banco SQLite: <code>simplefarm.db</code> • 12 Colunas Integradas • Atualização automática
    </div>

    <script>
        let dadosCompletos = [];
        let filtroOficinaAtual = 'TODOS';

        async function carregarDados() {
            try {
                const res = await fetch('/api/os');
                dadosCompletos = await res.json();
                
                const resStatus = await fetch('/api/status');
                const statusData = await resStatus.json();
                
                atualizarMetricas(statusData);
                renderizarTabela();
            } catch (e) {
                console.error("Erro ao carregar dados:", e);
            }
        }

        function atualizarMetricas(data) {
            document.getElementById('metricTotal').innerText = data.total_ativas || 0;
            document.getElementById('metricCampo').innerText = data.total_campo || 0;
            document.getElementById('metricExterna').innerText = data.total_externa || 0;
            document.getElementById('metricDias').innerText = (data.max_dias || 0) + ' dias';

            const badge = document.getElementById('statusBadge');
            const texto = document.getElementById('statusTexto');
            const btn = document.getElementById('btnSync');

            if (data.scraping_em_andamento) {
                badge.className = 'status-badge loading';
                texto.innerText = 'Extraindo do SimpleFarm...';
                btn.disabled = true;
            } else {
                badge.className = 'status-badge';
                const hora = data.ultimo_sync ? data.ultimo_sync.data_hora.split(' ')[1] : '--:--';
                texto.innerText = 'Sincronizado (' + hora + ')';
                btn.disabled = false;
            }
        }

        function renderizarTabela() {
            const tbody = document.getElementById('tabelaOS');
            const busca = document.getElementById('searchInput').value.toLowerCase().trim();

            const filtrados = dadosCompletos.filter(item => {
                const matchOficina = filtroOficinaAtual === 'TODOS' || (item.tipo_oficina && item.tipo_oficina.includes(filtroOficinaAtual));
                const matchBusca = !busca || 
                    (item.cod_os && item.cod_os.toLowerCase().includes(busca)) ||
                    (item.frota_cc && item.frota_cc.toLowerCase().includes(busca)) ||
                    (item.subclasse && item.subclasse.toLowerCase().includes(busca)) ||
                    (item.oficina && item.oficina.toLowerCase().includes(busca)) ||
                    (item.status_os && item.status_os.toLowerCase().includes(busca)) ||
                    (item.descricao_servico && item.descricao_servico.toLowerCase().includes(busca));
                return matchOficina && matchBusca;
            });

            document.getElementById('contadorRegistros').innerText = `Exibindo ${filtrados.length} de ${dadosCompletos.length} OS`;

            if (filtrados.length === 0) {
                tbody.innerHTML = '<tr><td colspan="12" style="text-align: center; color: var(--text-secondary); padding: 30px;">Nenhuma Ordem de Serviço encontrada para os filtros aplicados.</td></tr>';
                return;
            }

            tbody.innerHTML = filtrados.map(os => {
                const isCampo = os.tipo_oficina && os.tipo_oficina.includes('CAMPO');
                const badgeOficina = isCampo ? 'badge-tag badge-campo' : 'badge-tag badge-externa';
                const diasNum = parseFloat(os.dias_permanencia) || 0;
                const classeDias = diasNum > 10 ? 'badge-dias critico' : (diasNum > 3 ? 'badge-dias warn' : 'badge-dias ok');

                return `
                    <tr>
                        <td><span style="color: #94a3b8; font-weight: 500;">${os.tipo_os || 'NORMAL'}</span></td>
                        <td style="color: #cbd5e1; font-size: 11px;">${os.subclasse || ''}</td>
                        <td style="font-weight: 600; color: #fff;">${os.frota_cc || ''}</td>
                        <td style="font-weight: 700; color: #38bdf8;">${os.cod_os || ''}</td>
                        <td><span class="badge-tag badge-status">${os.status_os || 'ABERTA'}</span></td>
                        <td><span class="${badgeOficina}">${os.tipo_oficina || ''}</span></td>
                        <td>${os.oficina || ''}</td>
                        <td>${os.data_comunicacao || ''}</td>
                        <td>${os.data_entrada || ''}</td>
                        <td>${os.data_previsao || '-'}</td>
                        <td><span class="${classeDias}">${os.dias_permanencia != null ? os.dias_permanencia : '0.0'}</span></td>
                        <td style="white-space: normal; min-width: 250px;">${os.descricao_servico || ''}</td>
                    </tr>
                `;
            }).join('');
        }

        function filtrarOficina(tipo, btn) {
            filtroOficinaAtual = tipo;
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderizarTabela();
        }

        function filtrarTabela() {
            renderizarTabela();
        }

        async function dispararSync() {
            const btn = document.getElementById('btnSync');
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sincronizando...';

            try {
                await fetch('/api/sync', { method: 'POST' });
                const interval = setInterval(async () => {
                    const res = await fetch('/api/status');
                    const status = await res.json();
                    atualizarMetricas(status);
                    if (!status.scraping_em_andamento) {
                        clearInterval(interval);
                        btn.disabled = false;
                        btn.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> Sincronizar Agora';
                        carregarDados();
                    }
                }, 2000);
            } catch (e) {
                alert("Falha ao disparar sincronizacao: " + e);
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> Sincronizar Agora';
            }
        }

        carregarDados();
        setInterval(carregarDados, 15000);
    </script>
</body>
</html>
"""

@app.route('/')
def dashboard():
    return render_template_string(HTML_DASHBOARD)

@app.route('/api/status')
def api_status():
    metricas = database.obter_metricas()
    metricas['scraping_em_andamento'] = SCRAPING_EM_ANDAMENTO
    return jsonify(metricas)

@app.route('/api/os')
def api_os():
    busca = request.args.get('busca')
    tipo_oficina = request.args.get('tipo_oficina')
    lista = database.listar_ordens_servico(busca=busca, tipo_oficina=tipo_oficina)
    return jsonify(lista)

@app.route('/api/sync', methods=['POST'])
def api_sync():
    global SCRAPING_EM_ANDAMENTO
    if SCRAPING_EM_ANDAMENTO:
        return jsonify({'sucesso': False, 'mensagem': 'Sincronizacao ja esta em andamento.'}), 429
    
    t = threading.Thread(target=executar_sync_seguro, daemon=True)
    t.start()
    return jsonify({'sucesso': True, 'mensagem': 'Sincronizacao iniciada em segundo plano.'})

@app.route('/api/sync/firebase', methods=['POST', 'GET'])
def api_sync_firebase():
    """Força sincronização imediata dos dados locais para o Cloud Firestore (osoficina)."""
    try:
        import firebase_sync
        lista = database.listar_ordens_servico()
        metricas = database.obter_metricas()
        sucesso, msg = firebase_sync.salvar_no_firestore(lista, metricas)
        return jsonify({'sucesso': sucesso, 'mensagem': msg, 'total_os': len(lista)})
    except Exception as e:
        return jsonify({'sucesso': False, 'erro': str(e)}), 500

@app.route('/api/historico')
def api_historico():
    return jsonify(database.listar_historico_sync(30))

@app.route('/api/exportar/excel')
def exportar_excel():
    lista = database.listar_ordens_servico()
    colunas_ordem = [
        'tipo_os', 'subclasse', 'frota_cc', 'cod_os', 'status_os',
        'tipo_oficina', 'oficina', 'data_comunicacao', 'data_entrada',
        'data_previsao', 'dias_permanencia', 'descricao_servico'
    ]
    nomes_colunas = {
        'tipo_os': 'Tipo OS',
        'subclasse': 'SubClasse',
        'frota_cc': 'Frota / CC',
        'cod_os': 'Cód. OS',
        'status_os': 'Status OS',
        'tipo_oficina': 'Tipo Oficina',
        'oficina': 'Oficina',
        'data_comunicacao': 'Data Comunicação',
        'data_entrada': 'Data Entrada',
        'data_previsao': 'Data Previsão',
        'dias_permanencia': 'Dias Permanência',
        'descricao_servico': 'Descrição Serviço'
    }
    df = pd.DataFrame(lista)
    # Seleciona e renomeia apenas as 12 colunas oficiais
    colunas_presentes = [c for c in colunas_ordem if c in df.columns]
    df = df[colunas_presentes].rename(columns=nomes_colunas)

    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='Demanda_OS', index=False)
    output.seek(0)
    
    nome_arquivo = f"Demanda_OS_12Colunas_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    return send_file(output, download_name=nome_arquivo, as_attachment=True)

@app.route('/screenshot')
def ver_screenshot():
    caminho = os.path.join(os.path.dirname(__file__), "ultimo_print.png")
    if os.path.exists(caminho):
        return send_file(caminho, mimetype='image/png')
    return "Nenhum screenshot disponivel ainda.", 404

def main():
    database.init_db()
    t_agendador = threading.Thread(target=loop_agendador, daemon=True)
    t_agendador.start()
    print("[*] Servidor SimpleFarm Desktop ativo em http://127.0.0.1:8080", flush=True)
    print(f"[*] Agendador configurado para executar a cada {INTERVALO_MINUTOS} minutos.", flush=True)
    app.run(host='0.0.0.0', port=8080, debug=False)

if __name__ == '__main__':
    main()
