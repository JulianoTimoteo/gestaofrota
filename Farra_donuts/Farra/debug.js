
        let equipments = [];
        let operacoes = [];
        let ordensServico = [];
        let equipamentosComOS = new Set();
        let equipFiltroEquipe = 'TODAS';
        let operFiltroEquipe = 'TODAS';
        let isSyncing = false;

        const equipesDisponiveis = ["LINHA AMARELA", "PREPARO", "TRATOS CULTURAIS", "HERBICIDA", "FERTIRRIGAÇÃO", "PLANTIO",
            "BIOMASSA", "COLHEITA", "TRANSPORTE", "OUTRAS"
        ];

        function addLog(message, type = 'info') {
            const logDiv = document.getElementById('apiLog');
            const time = new Date().toLocaleTimeString('pt-BR');
            const className = type === 'success' ? 'success' : type === 'error' ? 'error' : type === 'warning' ? 'warning' : '';
            logDiv.innerHTML += `<div class="${className}">[${time}] ${message}</div>`;
            logDiv.scrollTop = logDiv.scrollHeight;
        }

        function updateStatus(message, type = 'info') {
            const statusEl = document.getElementById('loginStatus');
            statusEl.style.display = 'inline-block';
            statusEl.textContent = message;
            statusEl.className = `login-status ${type}`;
            const dot = document.getElementById('statusDot');
            const conn = document.getElementById('connectionStatus');
            if (type === 'success') {
                dot.className = 'status-dot green';
                conn.textContent = 'Conectado';
                document.getElementById('footerStatus').textContent = 'Conectado ao SimpleFarm';
            } else if (type === 'error') {
                dot.className = 'status-dot red';
                conn.textContent = 'Erro';
                document.getElementById('footerStatus').textContent = 'Erro na conexão';
            } else {
                dot.className = 'status-dot gray';
                conn.textContent = 'Aguardando';
                document.getElementById('footerStatus').textContent = 'Aguardando ação';
            }
        }

        function atualizarStatusGeral() {
            document.getElementById('osAbertasCount').textContent = ordensServico.length;
            document.getElementById('equipOsCount').textContent = equipamentosComOS.size;
            document.getElementById('equipOkCount').textContent = equipments.length - equipamentosComOS.size;
            document.getElementById('syncStatus').textContent = `${ordensServico.length} OS`;
            document.getElementById('apiOsCount').textContent = `${ordensServico.length} registros`;

            const tbody = document.getElementById('osTableBody');
            if (ordensServico.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="empty-message">Nenhuma OS carregada</td></tr>';
            } else {
                let html = '';
                ordensServico.forEach(os => {
                    html += `<tr>
                        <td><strong>${os.codigoEquip || os.EQP_CC_AGD?.match(/(\d+)/)?.[1] || '—'}</strong></td>
                        <td>${os.codOS || os.COD_OS || '—'}</td>
                        <td><span class="badge-equip os-aberta">${os.statusOS || os.STATUS_OS || 'ABERTA'}</span></td>
                        <td>${os.oficina || os.OFICINA || '—'}</td>
                        <td>${os.dataEntrada || os.OS_DT_ENTRADA || '—'}</td>
                        <td>${(os.descricao || os.OS_OBSERVACAO || '').substring(0, 40) + ((os.descricao || os.OS_OBSERVACAO || '').length > 40 ? '...' : '')}</td>
                    </tr>`;
                });
                tbody.innerHTML = html;
            }

            renderEquipamentos();
            renderOperacoes(document.getElementById('filterOperacao')?.value || '');
        }

        async function fetchFromAPI() {
            if (!authToken) {
                addLog('🔒 Faça login primeiro', 'warning');
                return;
            }

            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            if (!username || !password) {
                addLog('⚠️ Preencha usuário e senha do SimpleFarm!', 'warning');
                return;
            }

            if (isSyncing) {
                addLog('⏳ Sincronização em andamento...', 'warning');
                return;
            }

            isSyncing = true;
            const syncBtn = document.getElementById('syncBtn');
            const fetchBtn = document.getElementById('fetchBtn');
            syncBtn.disabled = true;
            fetchBtn.disabled = true;
            syncBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sincronizando...';
            fetchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Buscando...';

            addLog(`🔄 Sincronizando via API para: ${username}...`, 'info');
            updateStatus('Sincronizando...', 'info');
            document.getElementById('syncStatus').textContent = 'Sincronizando...';

            try {
                const response = await fetch(`${window.location.origin}/api/sync`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify({ username, password })
                });

                if (response.status === 401) {
                    addLog('🔒 Sessão expirada. Faça login novamente.', 'error');
                    doLogout();
                    return;
                }

                const result = await response.json();

                if (result.success) {
                    addLog(`✅ Sincronização concluída!`, 'success');
                    addLog(`   - Equipamentos: ${result.data.equipamentos}`, 'success');
                    addLog(`   - Operações: ${result.data.operacoes}`, 'success');
                    addLog(`   - OS: ${result.data.ordensServico}`, 'success');

                    await carregarDados();
                    document.getElementById('lastSync').textContent = new Date().toLocaleString('pt-BR');
                    updateStatus(`${result.data.ordensServico} OS carregadas`, 'success');
                    document.getElementById('syncStatus').textContent = `${result.data.ordensServico} OS`;
                } else {
                    addLog(`❌ Erro: ${result.error || 'Falha na sincronização'}`, 'error');
                    updateStatus('Erro na sincronização', 'error');
                }
            } catch (error) {
                addLog(`❌ Erro: ${error.message}`, 'error');
                updateStatus('Erro de conexão', 'error');
            }

            isSyncing = false;
            syncBtn.disabled = false;
            fetchBtn.disabled = false;
            syncBtn.innerHTML = '<i class="fas fa-sync"></i> Sincronizar';
            fetchBtn.innerHTML = '<i class="fas fa-database"></i> Buscar OS';
        }

        async function carregarDados() {
            try {
                const headers = {
                    'Content-Type': 'application/json'
                };
                if (authToken) {
                    headers['Authorization'] = `Bearer ${authToken}`;
                }

                const response = await fetch(`${window.location.origin}/api/dados`, {
                    headers: headers
                });

                if (response.status === 401) {
                    addLog('🔒 Sessão expirada. Faça login novamente.', 'error');
                    doLogout();
                    return;
                }

                const result = await response.json();

                if (result.success) {
                    const data = result.data;
                    equipments = data.equipamentos || [];
                    operacoes = data.operacoes || [];
                    ordensServico = data.ordensServico || [];

                    equipamentosComOS = new Set();
                    ordensServico.forEach(os => {
                        const codigo = os.codigoEquip || os.EQP_CC_AGD?.match(/(\d+)/)?.[1] || '';
                        if (codigo) equipamentosComOS.add(codigo);
                    });

                    equipments = equipments.map(eq => ({
                        ...eq,
                        grupo: eq.grupo || eq.Grupo || 'NÃO DEFINIDO'
                    }));

                    atualizarStatusGeral();

                    if (equipments.length === 0 && operacoes.length === 0 && ordensServico.length === 0) {
                        addLog('⚠️ Nenhum dado encontrado. Verifique suas credenciais.', 'warning');
                    }

                    renderEquipamentos();
                    renderOperacoes(document.getElementById('filterOperacao')?.value || '');
                    renderTeamTabs();
                    atualizarAbasEquipe();
                }
            } catch (error) {
                addLog(`❌ Erro ao carregar dados: ${error.message}`, 'error');
            }
        }

        function renderEquipTeamFilter() {
            const container = document.getElementById('equipTeamFilter');
            const teams = ['TODAS', ...getEquipesDisponiveis()];
            let html = '';
            teams.forEach(team => {
                const count = team === 'TODAS' ?
                    equipments.length :
                    equipments.filter(eq => (eq.grupo || eq.Grupo || '') === team).length;
                const active = equipFiltroEquipe === team ? 'active' : '';
                html += `<button class="team-filter-btn ${active}" onclick="filterEquipByTeam('${team}')">
                    ${team} <span class="count">${count}</span>
                </button>`;
            });
            container.innerHTML = html;
        }
