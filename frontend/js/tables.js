        // GESTÃO DE USUÁRIOS DO BANCO DE DADOS (CRUD)
        // ================================================================
        let currentUsersCache = [];

        window.openUserCrudModal = function(userId = null) {
            const overlay = document.getElementById('modalAddUserOverlay');
            const titleEl = document.getElementById('modalUserTitle');
            const form = document.getElementById('formUserCrud');
            if (!overlay || !form) return;

            form.reset();
            document.getElementById('crudUserId').value = '';

            if (userId) {
                const user = currentUsersCache.find(u => u.id == userId);
                if (user) {
                    document.getElementById('crudUserId').value = user.id;
                    document.getElementById('crudUserLogin').value = user.usuario || '';
                    document.getElementById('crudUserNome').value = user.nome || '';
                    document.getElementById('crudUserEmail').value = user.email || '';
                    document.getElementById('crudUserNivel').value = user.nivel_chave || (user.admin ? 'admin' : 'visualizador');
                    document.getElementById('crudUserAtivo').value = user.ativo !== 0 ? '1' : '0';
                    document.getElementById('crudUserSenha').value = '';
                    document.getElementById('lblCrudUserSenha').textContent = 'Nova Senha (Deixe em branco para manter a atual)';
                    if (titleEl) titleEl.innerHTML = `<i class="fas fa-user-edit" style="color:var(--color-primary);"></i> Editar Usuário #${user.id} (${user.usuario})`;
                }
            } else {
                document.getElementById('lblCrudUserSenha').textContent = 'Senha *';
                if (titleEl) titleEl.innerHTML = `<i class="fas fa-user-plus" style="color:var(--color-primary);"></i> Cadastrar Novo Usuário`;
            }
            overlay.classList.add('active');
        };

        window.closeUserCrudModal = function() {
            const overlay = document.getElementById('modalAddUserOverlay');
            if (overlay) overlay.classList.remove('active');
        };

        window.salvarUsuarioForm = async function(event) {
            event.preventDefault();
            const userId = document.getElementById('crudUserId').value;
            const usuario = document.getElementById('crudUserLogin').value.trim();
            const nome = document.getElementById('crudUserNome').value.trim();
            const email = document.getElementById('crudUserEmail').value.trim();
            const nivel_chave = document.getElementById('crudUserNivel').value;
            const senha = document.getElementById('crudUserSenha').value.trim();
            const ativo = parseInt(document.getElementById('crudUserAtivo').value, 10);

            if (!usuario || !nome || !email) {
                alert('Preencha todos os campos obrigatórios (*).');
                return;
            }

            if (!userId && !senha) {
                alert('Informe uma senha inicial para o novo usuário.');
                return;
            }

            const payload = {
                usuario, nome, email, nivel_chave, ativo,
                admin: ['admin', 'analista', 'supervisor'].includes(nivel_chave) ? 1 : 0
            };
            if (senha) payload.senha = senha;

            showGlobalLoader();
            try {
                const isEdit = !!userId;
                const url = isEdit ? `${API_BASE}/api/usuarios/${userId}` : `${API_BASE}/api/usuarios`;
                const method = isEdit ? 'PUT' : 'POST';

                const res = await fetch(url, {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + authToken
                    },
                    body: JSON.stringify(payload)
                });
                const result = await res.json();
                if (res.ok && result.success) {
                    alert(result.message || (isEdit ? 'Usuário atualizado com sucesso!' : 'Usuário cadastrado com sucesso!'));
                    closeUserCrudModal();
                    renderUsuariosList();
                    if (typeof notifyDataSyncChange === 'function') notifyDataSyncChange('user_updated');
                } else {
                    alert('Erro ao salvar usuário: ' + (result.error || 'Erro desconhecido.'));
                }
            } catch (err) {
                alert('Falha na comunicação com o servidor: ' + err.message);
            } finally {
                hideGlobalLoader();
            }
        };

        window.excluirUsuarioCrud = async function(userId, usuarioNome) {
            if (usuarioNome === 'julianotimoteo' || userId == 1 || userId == 2) {
                alert('O usuário Master (' + usuarioNome + ') é protegido e não pode ser excluído.');
                return;
            }
            if (!confirm(`Tem certeza que deseja EXCLUIR permanentemente o usuário #${userId} (${usuarioNome}) do banco de dados?`)) {
                return;
            }

            showGlobalLoader();
            try {
                const res = await fetch(`${API_BASE}/api/usuarios/${userId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': 'Bearer ' + authToken }
                });
                const result = await res.json();
                if (res.ok && result.success) {
                    alert(`Usuário ${usuarioNome} excluído com sucesso!`);
                    renderUsuariosList();
                    if (typeof notifyDataSyncChange === 'function') notifyDataSyncChange('user_deleted');
                } else {
                    alert('Erro ao excluir usuário: ' + (result.error || 'Erro desconhecido.'));
                }
            } catch (err) {
                alert('Erro de conexão: ' + err.message);
            } finally {
                hideGlobalLoader();
            }
        };

        async function renderUsuariosList() {
            const tbody   = document.getElementById('usuariosTableBody');
            const countEl = document.getElementById('totalUsuariosCount');
            if (!tbody) return;

            if (isStaticGitHubPages()) {
                if (countEl) countEl.textContent = `1 usuário registrado (Modo Cloud)`;
                tbody.innerHTML = `<tr>
                    <td><strong>#1</strong></td>
                    <td><strong style="color:var(--color-primary);">julianotimoteo</strong></td>
                    <td>Juliano Timóteo</td>
                    <td style="font-size:0.8rem;color:var(--color-gray-600);">julianotimoteo@usinapitangueiras.com.br</td>
                    <td><span class="badge-equip os-aberta">Administrador</span></td>
                    <td><span class="badge-equip os-fechada"><i class="fas fa-check-circle"></i> Ativo</span></td>
                    <td style="font-size:0.8rem;color:var(--color-gray-500);">Online agora</td>
                    <td><span style="font-weight:700;color:var(--color-primary);"><i class="fas fa-shield-alt"></i> Master Protegido</span></td>
                </tr>`;
                return;
            }

            try {
                const res = await fetch(`${API_BASE}/api/usuarios`, {
                    headers: { Authorization: 'Bearer ' + authToken }
                });
                if (!res.ok) {
                    tbody.innerHTML = '<tr><td colspan="8" class="empty-message">Apenas administradores podem visualizar os usuários do banco.</td></tr>';
                    return;
                }
                const result = await res.json();
                if (result && result.success && Array.isArray(result.data)) {
                    currentUsersCache = result.data;
                    const users = result.data;
                    if (countEl) countEl.textContent = `${users.length} usuários registrados`;

                    const rolesMap = {
                        'master': { label: 'Level 100 · Master Admin', badge: 'os-aberta' },
                        'admin': { label: 'Level 100 · Master Admin', badge: 'os-aberta' },
                        'gerente': { label: 'Level 80 · Gerente', badge: 'team-badge' },
                        'supervisor': { label: 'Level 60 · Supervisor', badge: 'team-badge' },
                        'operador': { label: 'Level 40 · Operador', badge: 'os-fechada' },
                        'visualizador': { label: 'Level 20 · Visualizador', badge: 'os-fechada' }
                    };

                    tbody.innerHTML = users.map(u => {
                        const roleInfo = rolesMap[u.nivel_chave] || { label: u.nivel_chave || 'Visualizador', badge: 'os-fechada' };
                        const isProtectedMaster = (u.usuario === 'julianotimoteo' || u.id == 1 || u.id == 2);
                        const userEmail = u.email || `${u.usuario}@usinapitangueiras.com.br`;
                        const lastLogin = u.ultimo_login ? u.ultimo_login : 'Nunca';
                        const statusBadge = u.ativo !== 0 ? '<span class="badge-equip os-fechada"><i class="fas fa-check-circle"></i> Ativo</span>' : '<span class="badge-equip os-aberta">Inativo</span>';

                        const actionButtons = isProtectedMaster
                            ? `<span style="font-size:0.78rem;font-weight:700;color:var(--color-primary);"><i class="fas fa-shield-alt"></i> Master Protegido</span>`
                            : `<div style="display:flex;gap:4px;">
                                <button type="button" onclick="openUserCrudModal(${u.id})" class="btn-sm" style="padding:0.25rem 0.5rem;font-size:0.75rem;font-weight:600;border-radius:6px;background:var(--color-primary);color:#fff;border:none;cursor:pointer;"><i class="fas fa-edit"></i> Editar</button>
                                <button type="button" onclick="excluirUsuarioCrud(${u.id}, '${u.usuario}')" class="btn-sm" style="padding:0.25rem 0.5rem;font-size:0.75rem;font-weight:600;border-radius:6px;background:#ef4444;color:#fff;border:none;cursor:pointer;"><i class="fas fa-trash-alt"></i> Excluir</button>
                               </div>`;

                        return `<tr>
                            <td><strong>#${u.id}</strong></td>
                            <td><strong style="color:var(--color-primary);">${u.usuario}</strong></td>
                            <td>${u.nome || u.usuario}</td>
                            <td style="font-size:0.8rem;color:var(--color-gray-600);">${userEmail}</td>
                            <td><span class="badge-equip ${roleInfo.badge}">${roleInfo.label}</span></td>
                            <td>${statusBadge}</td>
                            <td style="font-size:0.8rem;color:var(--color-gray-500);">${lastLogin}</td>
                            <td>${actionButtons}</td>
                        </tr>`;
                    }).join('');
                }
            } catch (e) {
                tbody.innerHTML = `<tr><td colspan="8" class="empty-message">Erro ao carregar usuários: ${e.message}</td></tr>`;
            }
        }

        // ================================================================
        // GERENCIADOR DE BANCO (EXPLORADOR DE TABELAS SQLITE)
        // ================================================================
        let dbTablesListCache = [];

        window.carregarListaTabelasExplorer = async function() {
            const selectEl = document.getElementById('dbExplorerSelect');
            const infoEl   = document.getElementById('dbExplorerInfo');
            if (!selectEl) return;

            try {
                const res = await fetch(`${API_BASE}/api/db/tables`, {
                    headers: { Authorization: 'Bearer ' + authToken }
                });
                if (!res.ok) {
                    if (infoEl) infoEl.textContent = 'Apenas administradores podem visualizar o gerenciador de banco.';
                    return;
                }
                const result = await res.json();
                if (result && result.success && Array.isArray(result.data)) {
                    dbTablesListCache = result.data;
                    let html = '<option value="">-- Selecione uma Tabela do Banco --</option>';
                    dbTablesListCache.forEach(t => {
                        html += `<option value="${t.tabela}">${t.tabela} (${t.registros} registros · ${t.colunas ? t.colunas.length : 0} colunas)</option>`;
                    });
                    selectEl.innerHTML = html;
                    if (infoEl) infoEl.textContent = `Total no banco: ${result.data.length} tabelas encontradas. Selecione uma tabela acima.`;
                }
            } catch (err) {
                if (infoEl) infoEl.textContent = 'Erro ao carregar tabelas do banco: ' + err.message;
            }
        };

        window.carregarDadosTabelaExplorer = async function() {
            const tableName = document.getElementById('dbExplorerSelect').value;
            const infoEl    = document.getElementById('dbExplorerInfo');
            const theadEl   = document.getElementById('dbExplorerThead');
            const tbodyEl   = document.getElementById('dbExplorerTbody');

            if (!tableName) {
                if (infoEl) infoEl.textContent = 'Aguardando seleção de tabela...';
                theadEl.innerHTML = '<tr><th>Selecione uma tabela acima para visualizar os dados</th></tr>';
                tbodyEl.innerHTML = '<tr><td class="empty-message">Nenhuma tabela selecionada.</td></tr>';
                return;
            }

            if (infoEl) infoEl.textContent = `Carregando registros da tabela "${tableName}"...`;
            showGlobalLoader();

            try {
                const res = await fetch(`${API_BASE}/api/db/query`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + authToken
                    },
                    body: JSON.stringify({ query: `SELECT * FROM "${tableName}" LIMIT 100` })
                });
                const result = await res.json();
                if (res.ok && result.success && Array.isArray(result.columns)) {
                    const cols = result.columns;
                    const rows = result.data || [];

                    if (infoEl) infoEl.textContent = `Tabela "${tableName}": exibindo ${rows.length} de ${rows.length >= 100 ? '100+' : rows.length} registros (Colunas: ${cols.join(', ')})`;

                    theadEl.innerHTML = `<tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr>`;

                    if (rows.length === 0) {
                        tbodyEl.innerHTML = `<tr><td colspan="${cols.length}" class="empty-message">Tabela vazia (0 registros).</td></tr>`;
                    } else {
                        tbodyEl.innerHTML = rows.map(r => {
                            return `<tr>${cols.map(c => {
                                let val = r[c];
                                if (val === null || val === undefined) val = '<span style="color:#94a3b8;font-style:italic;">NULL</span>';
                                return `<td style="font-size:0.8rem;">${val}</td>`;
                            }).join('')}</tr>`;
                        }).join('');
                    }
                } else {
                    alert('Erro ao consultar tabela: ' + (result.error || 'Erro retornado pela API'));
                }
            } catch (err) {
                alert('Erro ao comunicar com o banco: ' + err.message);
            } finally {
                hideGlobalLoader();
            }
        };

        // ================================================================
        // GERADOR DE CHAVES DE API & INTEGRAÇÕES REST
        // ================================================================
        window.carregarChavesApiExplorer = async function() {
            const tbodyEl = document.getElementById('apiKeysTableBody');
            if (!tbodyEl) return;

            try {
                const res = await fetch(`${API_BASE}/api/apikeys`, {
                    headers: { 'Authorization': 'Bearer ' + authToken }
                });
                if (!res.ok) {
                    tbodyEl.innerHTML = '<tr><td colspan="8" class="empty-message">Apenas administradores podem visualizar chaves de API.</td></tr>';
                    return;
                }
                const result = await res.json();
                if (result && result.success && Array.isArray(result.data)) {
                    if (result.data.length === 0) {
                        tbodyEl.innerHTML = '<tr><td colspan="8" class="empty-message">Nenhuma chave de API gerada até o momento. Clique em "+ Gerar Nova Chave API".</td></tr>';
                    } else {
                        tbodyEl.innerHTML = result.data.map(k => {
                            const isAtivo = k.ativo == 1;
                            const statusBadge = isAtivo ? '<span class="count-badge os-fechada">Ativa</span>' : '<span class="count-badge os-aberta">Inativa</span>';
                            const actionBtn = isAtivo 
                                ? `<button class="btn btn-outline btn-sm" style="color:#ef4444;border-color:#ef4444;font-size:0.75rem;" onclick="revogarApiKey(${k.id})"><i class="fas fa-ban"></i> Revogar</button>`
                                : `<button class="btn btn-outline btn-sm" style="color:#10b981;border-color:#10b981;font-size:0.75rem;" onclick="toggleApiKeyStatus(${k.id}, 1)"><i class="fas fa-check"></i> Reativar</button>`;
                            return `<tr>
                                <td><strong>#${k.id}</strong></td>
                                <td><strong>${k.nome_programa || 'Programa Sem Nome'}</strong></td>
                                <td><code style="background:var(--color-gray-100);padding:2px 6px;border-radius:4px;font-size:0.78rem;">${k.chave_api || '-'}</code> <button class="btn btn-sm btn-outline" style="padding:2px 6px;font-size:0.7rem;" onclick="navigator.clipboard.writeText('${k.chave_api}')" title="Copiar Chave"><i class="fas fa-copy"></i></button></td>
                                <td><span class="count-badge" style="background:#e0e7ff;color:#3730a3;">${k.permissao || 'leitura'}</span></td>
                                <td>${statusBadge}</td>
                                <td style="font-size:0.78rem;">${k.criado_em || '-'}</td>
                                <td style="font-size:0.78rem;">${k.ultimo_uso || 'Nunca'}</td>
                                <td>${actionBtn}</td>
                            </tr>`;
                        }).join('');
                    }
                }
            } catch (err) {
                tbodyEl.innerHTML = `<tr><td colspan="8" class="empty-message">Erro ao carregar chaves de API: ${err.message}</td></tr>`;
            }
        };

        window.openCreateApiKeyModal = async function() {
            const nome = prompt("Digite o nome do programa / sistema para integrar (ex: Sistema SAP, App Tablet, BI):");
            if (!nome || !nome.trim()) return;

            const permissao = confirm("Deseja conceder permissão de LEITURA E ESCRITA para esta chave?\n\n[OK] = Leitura e Escrita\n[Cancelar] = Somente Leitura") ? 'escrita' : 'leitura';

            showGlobalLoader();
            try {
                const res = await fetch(`${API_BASE}/api/apikeys`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + authToken
                    },
                    body: JSON.stringify({ nome_programa: nome.trim(), permissao })
                });
                const result = await res.json();
                if (res.ok && result.success) {
                    alert(`🔑 Chave de API Gerada com Sucesso!\n\nNome: ${nome}\nChave Secret Key:\n${result.chave_api}\n\nCopie esta chave e armazene em local seguro!`);
                    carregarChavesApiExplorer();
                } else {
                    alert('Erro ao gerar chave de API: ' + (result.error || 'Falha no servidor'));
                }
            } catch (err) {
                alert('Erro de conexão: ' + err.message);
            } finally {
                hideGlobalLoader();
            }
        };

        window.revogarApiKey = async function(keyId) {
            if (!confirm(`Tem certeza que deseja revogar e excluir a chave de API #${keyId}?`)) return;
            showGlobalLoader();
            try {
                const res = await fetch(`${API_BASE}/api/apikeys/${keyId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': 'Bearer ' + authToken }
                });
                const result = await res.json();
                if (res.ok && result.success) {
                    carregarChavesApiExplorer();
                } else {
                    alert('Erro ao revogar chave: ' + (result.error || 'Falha'));
                }
            } catch (err) {
                alert('Erro ao revogar: ' + err.message);
            } finally {
                hideGlobalLoader();
            }
        };

        window.toggleApiKeyStatus = async function(keyId, novoAtivo) {
            showGlobalLoader();
            try {
                const res = await fetch(`${API_BASE}/api/apikeys/${keyId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + authToken
                    },
                    body: JSON.stringify({ ativo: novoAtivo, permissao: 'leitura' })
                });
                const result = await res.json();
                if (res.ok && result.success) {
                    carregarChavesApiExplorer();
                }
            } catch (err) {
                alert('Erro: ' + err.message);
            } finally {
                hideGlobalLoader();
            }
        };

        window.testarEndpointApi = async function(endpoint) {
            const box = document.getElementById('apiTesterResponseBox');
            const title = document.getElementById('apiTesterTitle');
            const pre = document.getElementById('apiTesterPre');

            if (box) box.style.display = 'block';
            if (title) title.textContent = `Testando ${endpoint}...`;
            if (pre) pre.textContent = 'Carregando resposta do servidor...';

            try {
                const res = await fetch(`${API_BASE}${endpoint}`, {
                    headers: { 'Authorization': 'Bearer ' + authToken }
                });
                const data = await res.json().catch(() => ({ status: res.status }));
                if (title) title.textContent = `HTTP ${res.status} OK - GET ${endpoint}`;
                if (pre) pre.textContent = JSON.stringify(data, null, 2);
            } catch (err) {
                if (title) title.textContent = `Erro ao testar GET ${endpoint}`;
                if (pre) pre.textContent = err.message;
            }
        };

        // ================================================================
        // FILTROS E RENDER DE EQUIPAMENTOS
        // ================================================================
        function getEquipesDisponiveis() {
            const currentUser = (localStorage.getItem('sf_auth_user') || sessionStorage.getItem('sf_auth_user') || '').toLowerCase();
            const role = (localStorage.getItem('sf_auth_role') || sessionStorage.getItem('sf_auth_role') || '').toLowerCase();
            const isMaster = currentUser === 'julianotimoteo' || currentUser === 'admin' || role === 'master' || role === 'admin' || role === '100' || !localStorage.getItem('sf_auth_perms');

            const standardTeams = ['BIOMASSA', 'CAMINHOES', 'COLHEDORA', 'FERTIRRIGACAO', 'HERBICIDA', 'LINHA AMARELA', 'PREPARO', 'TRATOS CULTURAIS'];
            const extraTeams = equipments.map(eq => eq.grupo).filter(g => g && !standardTeams.includes(g));
            let allTeams = [...new Set([...standardTeams, ...extraTeams])];

            if (isMaster) {
                return allTeams.sort();
            }

            // Para outros usuários, filtrar com base nas permissões dinâmicas salvas no banco
            let permsRaw = localStorage.getItem('sf_auth_perms') || sessionStorage.getItem('sf_auth_perms');
            if (permsRaw) {
                try {
                    let perms = JSON.parse(permsRaw);
                    if (Array.isArray(perms) && perms.length > 0) {
                        let allowedCodes = perms.filter(p => p.permitido === 1).map(p => p.codigo_recurso.toLowerCase().replace(/_/g, ''));
                        let allowedNames = perms.filter(p => p.permitido === 1).map(p => p.nome_recurso.toUpperCase());
                        
                        allTeams = allTeams.filter(team => {
                            let tClean = team.toLowerCase().replace(/\s+/g, '').replace(/_/g, '');
                            let tUpper = team.toUpperCase();

                            // Normalizar singular/plural (colhedora/colhedoras, caminhoes/caminhões)
                            let isColhedoraMatch = (tClean.includes('colhedor') && allowedCodes.some(c => c.includes('colhedor')));
                            let isCaminhaoMatch = (tClean.includes('caminh') && allowedCodes.some(c => c.includes('caminh')));

                            return isColhedoraMatch || isCaminhaoMatch || allowedCodes.includes(tClean) || allowedNames.includes(tUpper);
                        });
                    }
                } catch(e) {}
            }
            return allTeams.sort();
        }

        function renderEquipTeamFilter() {
            const container = document.getElementById('equipTeamFilter');
            if (!container) return;
            const teams = ['TODAS', ...getEquipesDisponiveis()];
            container.innerHTML = teams.map(team => {
                const count  = team === 'TODAS' ? equipments.length : equipments.filter(eq => eq.grupo === team).length;
                const active = equipFiltroEquipe === team ? 'active' : '';
                return `<button class="team-filter-btn ${active}" data-team="${team}">${team} <span class="count">${count}</span></button>`;
            }).join('');
        }

        function renderEquipamentos() {
            const tbody   = document.getElementById('equipTableBody');
            const countEl = document.getElementById('totalEquipCount');
            if (!tbody) return;

            const tableWrap = tbody.closest('.table-wrap');
            const savedScroll = tableWrap ? tableWrap.scrollTop : 0;

            const filter = (document.getElementById('filterEquip')?.value || '').toLowerCase();
            const dados  = equipments.filter(eq => {
                if (equipFiltroEquipe && equipFiltroEquipe !== 'TODAS' && eq.grupo !== equipFiltroEquipe) return false;
                return `${eq.codigo} ${eq.descricao} ${eq.modelo} ${eq.grupo} ${eq.tipo} ${eq.operacao}`.toLowerCase().includes(filter);
            });

            if (countEl) countEl.textContent = dados.length;

            if (dados.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" class="empty-message">Nenhum equipamento encontrado.</td></tr>';
                renderEquipTeamFilter();
                return;
            }

            const allTeams = getEquipesDisponiveis();

            // Tipos para a lista suspensa
            const allTipos = [...new Set([...LISTA_TIPOS_PADRAO, ...equipments.map(e => e.tipo)])].sort();

            // Operações formatadas (Código + Descrição) da API e padrões
            const apiOps = operacoes.map(o => formatarOp(o)).filter(Boolean);
            const defaultOps = [
                '101 - PREPARO DE SOLO',
                '102 - TRANSPORTE DE VINHACA',
                '103 - PULVERIZACAO DE DEFENSIVOS',
                '104 - COLHEITA DE CANA',
                '105 - PLANTIO DE CANA',
                '106 - HERBICIDA',
                '107 - TRATOS CULTURAIS',
                '108 - APLICAÇÃO DE ADUBO',
                '109 - CARREGAMENTO'
            ];
            const allOperacoes = [...new Set([...apiOps, ...defaultOps, ...equipments.map(e => e.operacao).filter(Boolean)])].sort();

            tbody.innerHTML = dados.map(eq => {
                const hasOS       = equipamentosComOS.has(String(eq.codigo));
                const statusLabel = hasOS ? 'Com OS' : 'OK';
                const statusClass = hasOS ? 'os-aberta' : 'os-fechada';
                const osBtn       = hasOS ? `<button class="os-info-btn" data-frota="${eq.codigo}" title="Ver OS">📋</button>` : '';

                const moverOptions = allTeams.map(t =>
                    `<option value="${t}" ${t === eq.grupo ? 'selected' : ''}>${t}</option>`
                ).join('');

                const tipoOptions = allTipos.map(t =>
                    `<option value="${t}" ${t.toLowerCase() === (eq.tipo || '').toLowerCase() ? 'selected' : ''}>${t}</option>`
                ).join('');

                const currentOp = eq.operacao || '101 - PREPARO DE SOLO';
                const optionsHtml = allOperacoes.map(op => {
                    const isSelected = op.toLowerCase() === currentOp.toLowerCase() ? 'selected' : '';
                    return `<div class="sd-option ${isSelected}" data-value="${op}">${op}</div>`;
                }).join('');

                return `<tr>
                    <td><strong>${eq.codigo || '-'}</strong></td>
                    <td style="font-weight: 400 !important;">${eq.descricao || '-'}</td>
                    <td style="font-size:0.8rem;color:var(--color-gray-500);">${eq.modelo || '-'}</td>
                    <td>
                        <select class="tipo-select" data-codigo="${eq.codigo}" style="padding:0.25rem 0.4rem;font-size:0.78rem;font-weight:600;border-radius:6px;border:1px solid #93c5fd;background:#eff6ff;color:#1d4ed8;cursor:pointer;">
                            ${tipoOptions}
                        </select>
                    </td>
                    <td>
                        <div class="searchable-dropdown" data-codigo="${eq.codigo}">
                            <button type="button" class="sd-trigger">
                                <span class="sd-label">${currentOp}</span>
                                <i class="fas fa-chevron-down" style="font-size:0.65rem;margin-left:4px;opacity:0.6;"></i>
                            </button>
                            <div class="sd-popover">
                                <div class="sd-search-box">
                                    <i class="fas fa-search" style="font-size:0.75rem;color:var(--color-gray-400);margin-right:6px;"></i>
                                    <input type="text" class="sd-search-input" placeholder="Pesquisar operação..." autocomplete="off">
                                </div>
                                <div class="sd-options-list">
                                    ${optionsHtml}
                                </div>
                            </div>
                        </div>
                    </td>
                    <td><span class="badge-equip team-badge">${eq.grupo || '-'}</span></td>
                    <td><span class="badge-equip ${statusClass}">${statusLabel}</span> ${osBtn}</td>
                    <td>
                        <div style="display:flex;gap:0.4rem;align-items:center;">
                            <select class="mover-select" data-codigo="${eq.codigo}" style="padding:0.25rem 0.4rem;font-size:0.78rem;border-radius:6px;border:1px solid var(--color-border);background:var(--color-bg);color:var(--color-text);cursor:pointer;">
                                ${moverOptions}
                            </select>
                            <button type="button" class="btn-edit-equip" data-codigo="${eq.codigo}" title="Editar Equipamento / Frota" style="padding:0.25rem 0.5rem;font-size:0.78rem;font-weight:700;border-radius:6px;border:1px solid #3b82f6;background:#eff6ff;color:#1d4ed8;cursor:pointer;display:inline-flex;align-items:center;gap:3px;white-space:nowrap;">
                                <i class="fas fa-edit"></i> Editar
                            </button>
                            <button type="button" class="btn-inativar-equip" data-codigo="${eq.codigo}" title="Inativar Equipamento" style="padding:0.25rem 0.5rem;font-size:0.78rem;font-weight:700;border-radius:6px;border:1px solid #ef4444;background:#fee2e2;color:#b91c1c;cursor:pointer;display:inline-flex;align-items:center;gap:3px;white-space:nowrap;">
                                <i class="fas fa-ban"></i> Inativar
                            </button>
                        </div>
                    </td>
                </tr>`;
            }).join('');

            // Adicionar evento para Editar Equipamento
            tbody.querySelectorAll('.btn-edit-equip').forEach(btn => {
                btn.addEventListener('click', function() {
                    const cod = this.dataset.codigo;
                    openEditEquipModal(cod);
                });
            });

            // Adicionar evento para Inativar Equipamento
            tbody.querySelectorAll('.btn-inativar-equip').forEach(btn => {
                btn.addEventListener('click', function() {
                    const cod = this.dataset.codigo;
                    toggleInativarEquip(cod);
                });
            });

            // Adicionar evento para alterar Tipo de equipamento
            tbody.querySelectorAll('.tipo-select').forEach(select => {
                select.addEventListener('change', function() {
                    const cod = this.dataset.codigo;
                    const newTipo = this.value;
                    if (!cod || !newTipo) return;

                    const eq = equipments.find(item => item.codigo === cod);
                    if (eq) {
                        eq.tipo = newTipo;
                        setCustomEquipType(cod, newTipo);
                        addLog(`🏷️ Tipo do equipamento ${cod} alterado para "${newTipo}"`, 'success');
                        renderEquipamentos();
                        renderTeamTabs(false);
                        atualizarStatusGeral();
                    }
                });
            });

            // Configurar interatividade do Searchable Dropdown de Operações
            tbody.querySelectorAll('.searchable-dropdown').forEach(dropdown => {
                const trigger = dropdown.querySelector('.sd-trigger');
                const popover = dropdown.querySelector('.sd-popover');
                const searchInput = dropdown.querySelector('.sd-search-input');
                const options = dropdown.querySelectorAll('.sd-option');
                const label = dropdown.querySelector('.sd-label');
                const cod = dropdown.dataset.codigo;

                trigger.addEventListener('click', e => {
                    e.stopPropagation();
                    const wasActive = popover.classList.contains('active');
                    document.querySelectorAll('.sd-popover.active').forEach(p => p.classList.remove('active'));
                    if (!wasActive) {
                        popover.classList.add('active');
                        searchInput.value = '';
                        options.forEach(opt => opt.classList.remove('hidden'));
                        setTimeout(() => searchInput.focus(), 50);
                    }
                });

                searchInput.addEventListener('input', () => {
                    const query = searchInput.value.toLowerCase().trim();
                    options.forEach(opt => {
                        const val = (opt.dataset.value || '').toLowerCase();
                        if (val.includes(query)) {
                            opt.classList.remove('hidden');
                        } else {
                            opt.classList.add('hidden');
                        }
                    });
                });

                options.forEach(opt => {
                    opt.addEventListener('click', e => {
                        e.stopPropagation();
                        const newOp = opt.dataset.value;
                        if (!cod || !newOp) return;

                        const eq = equipments.find(item => item.codigo === cod);
                        if (eq) {
                            eq.operacao = newOp;
                            setCustomEquipOp(cod, newOp);
                            label.textContent = newOp;
                            options.forEach(o => o.classList.toggle('selected', o === opt));
                            popover.classList.remove('active');
                            addLog(`⚡ Operação do equipamento ${cod} alterada para "${newOp}"`, 'success');
                            renderTeamTabs(false);
                            atualizarStatusGeral();
                        }
                    });
                });
            });

            // Adicionar evento para mover equipamento de equipe
            tbody.querySelectorAll('.mover-select').forEach(select => {
                select.addEventListener('change', function() {
                    const cod = this.dataset.codigo;
                    const newGroup = this.value;
                    if (!cod || !newGroup) return;

                    const eq = equipments.find(item => item.codigo === cod);
                    if (eq) {
                        eq.grupo = newGroup;
                        setCustomEquipGroup(cod, newGroup);
                        addLog(`🚚 Equipamento ${cod} movido para a equipe ${newGroup}`, 'success');
                        renderEquipamentos();
                        renderTeamTabs(false);
                        atualizarStatusGeral();
                    }
                });
            });

            renderEquipTeamFilter();
            if (tableWrap && savedScroll > 0) tableWrap.scrollTop = savedScroll;
        }

        function renderOperacoes() {
            const tbody   = document.getElementById('operTableBody');
            const countEl = document.getElementById('totalOperCount');
            const filter  = (document.getElementById('filterOperacao')?.value || '').trim().toLowerCase();

            // Filtrar estritamente apenas operações PRODUTIVAS
            const apenasProdutivas = operacoes.filter(op => isOperacaoProdutiva(op));

            const dados = apenasProdutivas.filter(op => {
                if (!filter) return true;
                const opTeam   = getOpTeam(op).toLowerCase();
                const codStr   = String(op.codigo || '').toLowerCase();
                const descStr  = String(op.descricao || '').toLowerCase();
                const tipoStr  = String(op.tipoOperacao || op.tipo || '').toLowerCase();
                const grupoStr = String(op.grupoOperacao || op.grupo || '').toLowerCase();
                const corpStr  = String(op.corporativo || '').toLowerCase();

                // Busca por correspondência exata de código ou contida nos campos/equipe
                return codStr === filter ||
                       codStr.includes(filter) ||
                       descStr.includes(filter) ||
                       tipoStr.includes(filter) ||
                       grupoStr.includes(filter) ||
                       corpStr.includes(filter) ||
                       opTeam.includes(filter);
            });

            if (countEl) countEl.textContent = dados.length;

            if (dados.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="empty-message">Nenhuma operação produtiva encontrada.</td></tr>';
                return;
            }

            const allTeams = getEquipesDisponiveis();

            tbody.innerHTML = dados.map(op => {
                const currentTeam = getOpTeam(op);
                const moverOptions = ['-', ...allTeams].map(t =>
                    `<option value="${t}" ${t === currentTeam ? 'selected' : ''}>${t}</option>`
                ).join('');
                const teamBadge = currentTeam !== '-'
                    ? `<span class="badge-equip team-badge">${currentTeam}</span>`
                    : `<span style="color:var(--color-gray-400);font-size:0.8rem;">-</span>`;

                return `<tr>
                    <td><strong>${op.codigo || '-'}</strong></td>
                    <td style="font-weight: 400 !important;">${op.descricao || '-'}</td>
                    <td>${op.tipoOperacao || op.tipo || '-'}</td>
                    <td>${op.corporativo || 'Produtivas'}</td>
                    <td>${op.grupoOperacao || op.grupo || '-'}</td>
                    <td><span class="badge-equip os-fechada">${op.status || 'ATIVO'}</span></td>
                    <td>
                        <div style="display:flex;align-items:center;gap:0.4rem;flex-wrap:nowrap;">
                            ${teamBadge}
                            <select class="op-equipe-select" data-codigo="${op.codigo}" style="padding:0.2rem 0.4rem;font-size:0.75rem;border-radius:6px;border:1px solid var(--color-border);background:var(--color-bg);color:var(--color-text);cursor:pointer;">
                                ${moverOptions}
                            </select>
                            <button type="button" class="btn-edit-oper" data-codigo="${op.codigo}" title="Editar Operação" style="padding:0.2rem 0.45rem;font-size:0.75rem;font-weight:700;border-radius:6px;border:1px solid #3b82f6;background:#eff6ff;color:#1d4ed8;cursor:pointer;display:inline-flex;align-items:center;gap:3px;white-space:nowrap;">
                                <i class="fas fa-edit"></i> Editar
                            </button>
                            <button type="button" class="btn-delete-oper" data-codigo="${op.codigo}" title="Excluir Operação" style="padding:0.2rem 0.45rem;font-size:0.75rem;font-weight:700;border-radius:6px;border:1px solid #ef4444;background:#fee2e2;color:#b91c1c;cursor:pointer;display:inline-flex;align-items:center;gap:3px;white-space:nowrap;">
                                <i class="fas fa-trash-alt"></i> Excluir
                            </button>
                        </div>
                    </td>
                </tr>`;
            }).join('');

            // Adicionar evento para Editar Operação
            tbody.querySelectorAll('.btn-edit-oper').forEach(btn => {
                btn.addEventListener('click', function() {
                    const cod = this.dataset.codigo;
                    openEditOperModal(cod);
                });
            });

            // Adicionar evento para Excluir Operação
            tbody.querySelectorAll('.btn-delete-oper').forEach(btn => {
                btn.addEventListener('click', function() {
                    const cod = this.dataset.codigo;
                    excluirOperacao(cod);
                });
            });

            // Adicionar evento para alterar Equipe da Operação
            tbody.querySelectorAll('.op-equipe-select').forEach(select => {
                select.addEventListener('change', function() {
                    const cod = this.dataset.codigo;
                    const newTeam = this.value;
                    if (!cod) return;

                    setCustomOpTeam(cod, newTeam);
                    const targetOp = operacoes.find(o => String(o.codigo) === String(cod));
                    if (targetOp) {
                        targetOp.equipe = newTeam === '-' ? '' : newTeam;
                    }
                    addLog(`🚩 Equipe da operação ${cod} alterada para "${newTeam}"`, 'success');
                    renderOperacoes();
                    renderTeamTabs(false);
                    atualizarStatusGeral();
                });
            });
        }

        // ================================================================
        // ABA EQUIPES — CARROSSEL CÍCLICO 3 ITENS (ESQUERDA - CENTRO ATIVO - DIREITA)
        // ================================================================
        function navigateTeamTab(dir) {
            const baseTeams = getEquipesDisponiveis();
            const teams = [...baseTeams, '24h⚠️'];
            if (teams.length === 0) return;

            let currentIndex = teams.indexOf(activeTeam);
            if (currentIndex === -1) currentIndex = 0;

            const newIndex = (currentIndex + dir + teams.length) % teams.length;
            activeTeam = teams[newIndex];
            localStorage.setItem('sf_active_team', activeTeam);

            renderTeamTabs(false);
        }

        function renderTeamTabs(resetTeam = false) {
            const container = document.getElementById('equipeSubTabs');
            if (!container) return;

            const baseTeams = getEquipesDisponiveis();
            const teams = [...baseTeams, '24h⚠️'];
            const total = teams.length;

            if (total === 0) {
                container.innerHTML = '';
                document.getElementById('equipeSubContents').innerHTML =
                    '<div class="empty-message" style="padding:3rem;text-align:center;"><i class="fas fa-database" style="font-size:2rem;color:var(--color-gray-300);margin-bottom:0.5rem;display:block;"></i>Aguardando dados...</div>';
                return;
            }

            if (resetTeam || !activeTeam || !teams.includes(activeTeam)) {
                activeTeam = teams[0];
            }

            const isMobile = window.innerWidth <= 768;

            const getTeamCount = (teamName) => {
                const is24h = (teamName === '24h⚠️' || teamName === '24H ⚠️');
                return is24h
                    ? equipments.filter(eq => isEquip24h(eq)).length
                    : equipments.filter(eq => eq.grupo === teamName).length;
            };

            const getTeamLabel = (teamName) => {
                return (teamName === '24h⚠️' || teamName === '24H ⚠️')
                    ? '24h <i class="fas fa-exclamation-triangle pulse-icon"></i>'
                    : teamName;
            };

            let html = '';
            if (isMobile) {
                // NO CELULAR (<= 768px): Carrossel Cíclico 3 Itens (Esquerda - Centro Ativo - Direita)
                const currIndex = teams.indexOf(activeTeam);
                const prevIndex = (currIndex - 1 + total) % total;
                const nextIndex = (currIndex + 1) % total;

                const prevTeam = teams[prevIndex];
                const currTeam = teams[currIndex];
                const nextTeam = teams[nextIndex];

                if (total >= 3) {
                    html = `
                        <button class="team-carousel-btn side-btn prev-btn" data-team="${prevTeam}" title="Girar para a esquerda (${prevTeam})">
                            <i class="fas fa-chevron-left" style="font-size:0.75rem;opacity:0.75;"></i> ${getTeamLabel(prevTeam)} <span class="count">${getTeamCount(prevTeam)}</span>
                        </button>
                        <button class="team-carousel-btn center-active" data-team="${currTeam}" title="Aba Ativa Selecionada">
                            ${getTeamLabel(currTeam)} <span class="count">${getTeamCount(currTeam)}</span>
                        </button>
                        <button class="team-carousel-btn side-btn next-btn" data-team="${nextTeam}" title="Girar para a direita (${nextTeam})">
                            ${getTeamLabel(nextTeam)} <span class="count">${getTeamCount(nextTeam)}</span> <i class="fas fa-chevron-right" style="font-size:0.75rem;opacity:0.75;"></i>
                        </button>
                    `;
                } else {
                    html = teams.map(team => {
                        const isActive = team === activeTeam;
                        const sideClass = isActive ? 'center-active' : 'side-btn';
                        return `<button class="team-carousel-btn ${sideClass}" data-team="${team}">
                            ${getTeamLabel(team)} <span class="count">${getTeamCount(team)}</span>
                        </button>`;
                    }).join('');
                }
            } else {
                // NO DESKTOP (> 768px): Exibe TODAS as abas de equipe lado a lado de forma horizontal
                html = teams.map(team => {
                    const isActive = team === activeTeam;
                    const activeClass = isActive ? 'active' : '';
                    return `<button class="sub-tab-btn ${activeClass}" data-team="${team}">
                        ${getTeamLabel(team)} <span class="count">${getTeamCount(team)}</span>
                    </button>`;
                }).join('');
            }

            container.innerHTML = html;

            container.querySelectorAll('.team-carousel-btn, .sub-tab-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const targetTeam = btn.dataset.team;
                    if (!targetTeam) return;

                    activeTeam = targetTeam;
                    localStorage.setItem('sf_active_team', activeTeam);

                    renderTeamTabs(false);
                    if (!isMobile) autoCenterTab(btn);
                });
            });

            renderTeamTabContent(activeTeam);
            atualizarStatusGeral(activeTeam === '24h⚠️' ? null : activeTeam);
        }

        function renderTeamTabContent(team) {
            const content = document.getElementById('equipeSubContents');
            if (!content) return;

            const is24hTab = (team === '24h⚠️' || team === '24H ⚠️');

            if (is24hTab) {
                // Filtrar apenas equipamentos com >= 1.0 dia (>= 24h)
                let eqs24h = equipments.filter(eq => isEquip24h(eq));

                // ORDENAR DO COM MAIS DIAS PARA O COM MENOS DIAS (Decrescente)
                eqs24h.sort((a, b) => getEquipPermanenciaDias(b) - getEquipPermanenciaDias(a));

                if (eqs24h.length === 0) {
                    content.innerHTML = `<div class="card" style="padding:3rem 1.5rem;text-align:center;border-radius:12px;">
                        <i class="fas fa-check-circle" style="font-size:2.8rem;color:#22c55e;margin-bottom:0.75rem;display:block;"></i>
                        <h3 style="font-size:1.15rem;font-weight:700;">Nenhum equipamento em OS a mais de 24h!</h3>
                        <p style="font-size:0.85rem;color:var(--color-gray-500);margin-top:0.3rem;">Todos os equipamentos da frota estão operacionais ou com menos de 24h na oficina.</p>
                    </div>`;
                    return;
                }

                let html = `<div class="card">
                    <div class="card-header">
                        <h2><i class="fas fa-exclamation-triangle" style="color:#ef4444;"></i> Equipamentos a mais de 24h em OS Oficina (Ordenado por Maior Tempo)</h2>
                        <span class="count-badge os-aberta">${eqs24h.length} em OS crítica</span>
                    </div>
                    <div class="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Frota</th>
                                    <th class="hide-mobile">Descrição</th>
                                    <th class="hide-mobile">Modelo</th>
                                    <th>Equipe Original</th>
                                    <th class="hide-mobile">Operação</th>
                                    <th>Permanência OS ⬇️</th>
                                    <th>Status OS</th>
                                </tr>
                            </thead>
                            <tbody>` +
                            eqs24h.map(eq => {
                                const osBtn = `<button class="os-info-btn" data-frota="${eq.codigo}" title="Ver detalhes da OS">📋</button>`;
                                const diasVal = getEquipPermanenciaDias(eq);
                                const diasPermText = diasVal > 0 ? `${diasVal.toFixed(1).replace('.', ',')} dias` : '> 24h';
                                return `<tr>
                                    <td><strong>${eq.codigo || '-'}</strong></td>
                                    <td class="hide-mobile" style="font-weight: 400 !important;">${eq.descricao || '-'}</td>
                                    <td class="hide-mobile" style="font-size:0.8rem;color:var(--color-gray-500);">${eq.modelo || '-'}</td>
                                    <td><span class="badge-equip team-badge">${eq.grupo || '-'}</span></td>
                                    <td class="hide-mobile"><span class="badge-equip os-fechada">${eq.operacao || '-'}</span></td>
                                    <td><span class="badge-equip os-aberta" style="font-weight:700;"><i class="fas fa-clock"></i> ${diasPermText}</span></td>
                                    <td><span class="badge-equip os-aberta">Com OS</span> ${osBtn}</td>
                                </tr>`;
                            }).join('') +
                            `</tbody>
                        </table>
                    </div>
                </div>`;

                content.innerHTML = html;

                content.querySelectorAll('.os-info-btn').forEach(btn => {
                    btn.addEventListener('click', () => openOsReportModal(btn.dataset.frota));
                });
                return;
            }

            const teamEqs   = equipments.filter(eq => eq.grupo === team);
            const teamOps   = operacoes.filter(op => (op.equipe || '') === team);
            const comOS     = teamEqs.filter(eq => equipamentosComOS.has(String(eq.codigo)));
            const semOS     = teamEqs.length - comOS.length;
            const pctDisp   = teamEqs.length > 0 ? Math.round((semOS / teamEqs.length) * 100) : 0;
            const pctOS     = teamEqs.length > 0 ? Math.round((comOS.length / teamEqs.length) * 100) : 0;

            let html = '<div class="donut-grid">';

            // Donut geral da equipe
            html += buildDonutCardHTML({
                id:           `frota-${team}`,
                title:        `GERAL · ${team} · ${teamEqs.length} EQUIP.`,
                centerValue:  pctDisp,
                centerSuffix: '%',
                centerLabel:  'disp.',
                totalLabel:   'Total registrado',
                totalValue:   `${teamEqs.length} equip.`,
                segments: [
                    { color: '#22c55e', label: 'Disponível', value: `${semOS} equip.`,        pct: `${pctDisp}%`,  percent: pctDisp },
                    { color: '#ef4444', label: 'Com OS',     value: `${comOS.length} equip.`,  pct: `${pctOS}%`,   percent: pctOS   },
                    { color: '#2563eb', label: 'Operações',  value: `${teamOps.length} ativas`, pct: '',             percent: 0       }
                ]
            });

            // Donuts por tipo
            const byTipo = {};
            teamEqs.forEach(eq => {
                const t = eq.tipo || 'Outros';
                if (!byTipo[t]) byTipo[t] = [];
                byTipo[t].push(eq);
            });

            Object.keys(byTipo).sort().forEach(tipo => {
                const eqs     = byTipo[tipo];
                const cOS     = eqs.filter(eq => equipamentosComOS.has(String(eq.codigo))).length;
                const sOS     = eqs.length - cOS;
                const pd      = eqs.length > 0 ? Math.round((sOS / eqs.length) * 100) : 0;
                const po      = eqs.length > 0 ? Math.round((cOS / eqs.length) * 100) : 0;
                html += buildDonutCardHTML({
                    id:           `donut-${team}-${tipo}`,
                    title:        `TIPO: ${tipo.toUpperCase()} · ${eqs.length} EQUIP.`,
                    centerValue:  pd,
                    centerSuffix: '%',
                    centerLabel:  'disp.',
                    totalLabel:   'Total registrado',
                    totalValue:   `${eqs.length} equip.`,
                    segments: [
                        { color: '#22c55e', label: 'Disponível', value: `${sOS} equip.`, pct: `${pd}%`, percent: pd },
                        { color: '#ef4444', label: 'Com OS',     value: `${cOS} equip.`, pct: `${po}%`, percent: po }
                    ]
                });
            });

            html += '</div><div class="model-grid">';

            // Tabelas por tipo (blocos de 5)
            Object.keys(byTipo).sort().forEach(tipo => {
                const eqs  = byTipo[tipo];
                const SIZE = 5;
                for (let i = 0; i < eqs.length; i += SIZE) {
                    const chunk     = eqs.slice(i, i + SIZE);
                    const chunkNum  = Math.floor(i / SIZE) + 1;
                    const total     = Math.ceil(eqs.length / SIZE);
                    const hasOSCnt  = chunk.filter(eq => equipamentosComOS.has(String(eq.codigo))).length;

                    html += `<div class="card">
                        <div class="card-header">
                            <h2><i class="fas fa-cog"></i> ${tipo}${total > 1 ? ` (${chunkNum}/${total})` : ''}</h2>
                            <div style="display:flex;gap:0.5rem;align-items:center;">
                                <span class="count-badge ${hasOSCnt > 0 ? 'os-aberta' : 'os-fechada'}">${hasOSCnt} c/OS</span>
                                <span class="count-badge">${chunk.length} eqs</span>
                            </div>
                        </div>
                        <div class="table-wrap"><table><thead><tr>
                            <th>Frota</th><th>Descrição</th><th>Operação</th><th>Status OS</th>
                        </tr></thead><tbody>` +
                        chunk.map(eq => {
                            const hasOS = equipamentosComOS.has(String(eq.codigo));
                            const osBtn = hasOS ? `<button class="os-info-btn" data-frota="${eq.codigo}" title="Ver OS">📋</button>` : '';
                            const opText = eq.operacao || '-';
                            return `<tr>
                                <td><strong>${eq.codigo || '-'}</strong></td>
                                <td style="font-weight: 400 !important;">${eq.descricao || '-'}</td>
                                <td><span class="badge-equip os-fechada">${opText}</span></td>
                                <td><span class="badge-equip ${hasOS ? 'os-aberta' : 'os-fechada'}">${hasOS ? 'Com OS' : 'OK'}</span> ${osBtn}</td>
                            </tr>`;
                        }).join('') +
                        `</tbody></table></div></div>`;
                }
            });

            html += '</div>';
            content.innerHTML = html;
        }

        // ================================================================
