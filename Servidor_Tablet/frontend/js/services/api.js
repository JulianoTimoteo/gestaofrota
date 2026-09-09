        function isStaticGitHubPages() {
            const customApi = localStorage.getItem('sf_custom_api_base');
            if (customApi && customApi.trim() !== '') return false;
            if (window.location.hostname.includes('github.io')) {
                return true;
            }
            return false;
        }

        async function checkAuth() {
            let token = localStorage.getItem('sf_auth_token') || sessionStorage.getItem('sf_auth_token');
            if (!token || token === 'sf_standalone_session_token') { updateAuthUI(); return; }
            authToken = token;
            userRole  = localStorage.getItem('sf_auth_role') || 'admin';
            applyRBAC();
            updateAuthUI();

            // Evitar chamadas a /api/auth/me quando hospedado estaticamente no GitHub Pages (previne erro 404 no console)
            if (isStaticGitHubPages()) {
                return;
            }

            // Valida silenciosamente no servidor sem derrubar a tela do usuário em caso de instabilidade
            try {
                const ctrl = new AbortController();
                const t    = setTimeout(() => ctrl.abort(), 4000);
                const res  = await fetch(`${API_BASE}/api/auth/me`, {
                    headers: { Authorization: 'Bearer ' + token },
                    signal:  ctrl.signal
                });
                clearTimeout(t);
                if (res.ok) {
                    const d = await res.json();
                    if (d.success) {
                        const curUser = (localStorage.getItem('sf_auth_user') || sessionStorage.getItem('sf_auth_user') || '').toLowerCase();
                        const isMasterAdmin = (curUser.includes('juliano') || curUser.includes('logistica') || d.admin == 1) && !curUser.includes('rafael');
                        const isGerenteOperador = curUser.includes('rafael');
                        const newRole  = isMasterAdmin ? 'admin' : (isGerenteOperador ? 'operador' : (d.role || 'visualizador'));
                        localStorage.setItem('sf_auth_role', newRole);
                        sessionStorage.setItem('sf_auth_role', newRole);
                        userRole = newRole;
                        applyRBAC();
                        updateAuthUI();
                    }
                } else if (res.status === 401) {
                    const d = await res.json().catch(() => null);
                    if (d && (d.session_expired || d.error)) {
                        desconectarPorAcessoDuplicado(d.error);
                    }
                }
            } catch (e) {
                // Manter sessão local ativa em caso de falha de conexão
            }
        }

        // ================================================================
        // CARREGAR DADOS (sem alterar aba ativa)
        // ================================================================
        async function carregarDadosManualmenteLogo() {
            const btn = document.getElementById('logoRefreshBtn');
            const tooltip = document.getElementById('logoRefreshTooltip');
            if (btn) btn.classList.add('refreshing');
            if (tooltip) tooltip.innerHTML = '<i class="fas fa-sync-alt"></i> Sincronizando...';

            await carregarDados(false);

            if (tooltip) tooltip.innerHTML = '<i class="fas fa-check-circle"></i> Atualizado!';
            setTimeout(() => {
                if (btn) btn.classList.remove('refreshing');
                if (tooltip) tooltip.innerHTML = '<i class="fas fa-sync-alt"></i> Atualizar dados';
            }, 1800);
        }

        function processarPayloadDados(d, isOfflineFallback = false, isBackground = false) {
            if (!d) return;

            // Salvar no cache local para resiliência de rede
            if (!isOfflineFallback) {
                try { localStorage.setItem('sf_cached_data', JSON.stringify(d)); } catch (e) {}
            }

            operacoes     = d.operacoes     || [];
            ordensServico = (d.ordensServico || []).filter(os => {
                const oficina = (os.tipoOficina || os.tipo_oficina || '').toUpperCase();
                const tipoOs  = (os.tipoOS || os.tipo_os || '').toUpperCase();
                return oficina !== 'EXTERNA' && !tipoOs.includes('REPARO');
            });

            const customGroups = getCustomEquipGroups();
            const customTypes  = getCustomEquipTypes();
            const customOps    = getCustomEquipOps();

            const VALID_TEAMS = ['BIOMASSA', 'CAMINHOES', 'COLHEDORA', 'FERTIRRIGACAO', 'HERBICIDA', 'LINHA AMARELA', 'PREPARO', 'TRATOS CULTURAIS'];
            let customGroupsChanged = false;
            Object.keys(customGroups).forEach(k => {
                if (customGroups[k] && !VALID_TEAMS.includes(customGroups[k])) {
                    delete customGroups[k];
                    customGroupsChanged = true;
                }
            });
            if (customGroupsChanged) {
                localStorage.setItem('sf_custom_equip_groups', JSON.stringify(customGroups));
            }

            // Mapa de subClasses das Ordens de Serviço por código de equipamento
            const eqSubClassesMap = {};
            ordensServico.forEach(os => {
                const cod = (os.codigoEquip || os.codigo_equip || os.frotaCC || os.frota_cc || '').split(' - ')[0].trim();
                const sub = (os.subClasse || os.sub_classe || '').toUpperCase();
                if (cod) {
                    if (!eqSubClassesMap[cod]) eqSubClassesMap[cod] = [];
                    if (sub) eqSubClassesMap[cod].push(sub);
                }
            });

            // Mapear equipamentos com tipo limpo e operacao da lista
            equipments = (d.equipamentos || []).map(eq => {
                const codStr   = String(eq.codigo || '');
                const desc     = eq.descricao || '';
                const mod      = eq.modelo    || '';
                const rawT     = eq.tipo      || '';
                const defaultT = normalizarTipo(rawT, desc, mod);

                const osSubs   = (eqSubClassesMap[codStr] || []).join(' ');
                const fullText = (desc + ' ' + mod + ' ' + rawT + ' ' + osSubs).toUpperCase();

                let autoGroup = eq.grupo;
                if (osSubs.includes('14/1') || osSubs.includes('COLHED') || fullText.includes('COLHED') || fullText.includes('COLHEIT')) {
                    autoGroup = 'COLHEDORA';
                } else if (osSubs.includes('10/6') || osSubs.includes('10/1') || osSubs.includes('10/') || osSubs.includes('TRANSPORTE DE CANA') || osSubs.includes('CAVALO MECANICO') || fullText.includes('CAMINH')) {
                    autoGroup = 'CAMINHOES';
                }

                const assignedGroup = customGroups[codStr] || autoGroup || 'PREPARO';
                const finalGroup = VALID_TEAMS.includes(assignedGroup) ? assignedGroup : (VALID_TEAMS.includes(eq.grupo) ? eq.grupo : 'PREPARO');
                const defaultOp = getTeamDefaultOp(finalGroup);
                return {
                    codigo:    codStr,
                    descricao: desc,
                    modelo:    mod,
                    tipoRaw:   rawT,
                    tipo:      customTypes[codStr] || defaultT,
                    grupo:     finalGroup,
                    operacao:  customOps[codStr] || (eq.operacao ? formatarOp(eq.operacao) : defaultOp),
                    statusOS:  eq.statusOS  || 'OK',
                    codOS:     eq.codOS     || ''
                };
            });

            // Montar set de equipamentos com OS aberta
            equipamentosComOS = new Set();
            ordensServico.forEach(os => {
                const cod = (os.codigoEquip || '').split(' - ')[0].trim();
                if (cod && /^\d+$/.test(cod)) equipamentosComOS.add(cod);
            });
            equipments.forEach(eq => {
                if ((eq.statusOS || '').toUpperCase() !== 'OK' && eq.codigo) {
                    equipamentosComOS.add(String(eq.codigo));
                }
            });

            const syncTime = d.ultimaSincronizacao || new Date().toISOString();
            if (isOfflineFallback) {
                addLog(`🟢 Modo Standalone / Cloud — ${equipments.length} equip. · ${ordensServico.length} OS`, 'info');
                setConnectionStatus('success');
            } else {
                addLog(`✅ Dados atualizados — ${equipments.length} equip. · ${ordensServico.length} OS · Sync: ${syncTime}`, 'success');
                setConnectionStatus('success');
            }

            // Atualizar footer
            const footerStatus = document.getElementById('footerStatus');
            if (footerStatus) {
                footerStatus.textContent = isOfflineFallback 
                    ? `Modo Cloud (GitHub Pages) · ${equipments.length} frotas ativas`
                    : `Conectado · Última sync: ${syncTime}`;
            }

            // Atualizar contadores da aba Sync
            const syncEquip = document.getElementById('syncEquipCount');
            const syncOs    = document.getElementById('syncOsCount');
            const syncOp    = document.getElementById('syncOpCount');
            if (syncEquip) syncEquip.textContent = equipments.length;
            if (syncOs)    syncOs.textContent    = ordensServico.length;
            if (syncOp)    syncOp.textContent    = operacoes.length;

            atualizarStatusGeral();

            if (!isBackground || !isUserInteracting()) {
                renderEquipamentos();
                renderOperacoes();
                renderTeamTabs(false);
            }
        }

        async function carregarAdminConfigDoServidor() {
            if (isStaticGitHubPages()) return;
            try {
                const res = await fetch(`${API_BASE}/api/config/admin`, {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                }).catch(() => null);
                if (res && res.ok) {
                    const data = await res.json().catch(() => null);
                    if (data && data.success && data.data) {
                        const cfg = data.data;
                        if (cfg.customGroups) {
                            const cur = getCustomEquipGroups();
                            localStorage.setItem('sf_custom_equip_groups', JSON.stringify({ ...cur, ...cfg.customGroups }));
                        }
                        if (cfg.customTypes) {
                            const cur = getCustomEquipTypes();
                            localStorage.setItem('sf_custom_equip_types', JSON.stringify({ ...cur, ...cfg.customTypes }));
                        }
                        if (cfg.customOps) {
                            const cur = getCustomEquipOps();
                            localStorage.setItem('sf_custom_equip_ops', JSON.stringify({ ...cur, ...cfg.customOps }));
                        }
                        if (cfg.customOpTeams) {
                            const cur = getCustomOpTeams();
                            localStorage.setItem('sf_custom_op_teams', JSON.stringify({ ...cur, ...cfg.customOpTeams }));
                        }
                    }
                }
            } catch(e) {}
        }

        async function carregarDados(isBackground = false) {
            if (!authToken) {
                authToken = 'sf_standalone_session_token';
                localStorage.setItem('sf_auth_token', authToken);
                updateAuthUI();
            }

            await carregarAdminConfigDoServidor();

            if (!isBackground) {
                setConnectionStatus('syncing');
                showGlobalLoader();
            }

            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 30000);

                const res = await fetch(`${API_BASE}/api/dados?_t=${Date.now()}`, {
                    signal: controller.signal,
                    headers: {
                        'Content-Type':  'application/json',
                        'Authorization': `Bearer ${authToken}`
                    }
                });

                clearTimeout(timeoutId);

                if (res && res.ok) {
                    const result = await res.json();
                    if (result && result.success && result.data) {
                        processarPayloadDados(result.data, false, isBackground);
                        setConnectionStatus('online');
                        return;
                    }
                }
                setConnectionStatus('offline');
            } catch (error) {
                console.error('Erro ao conectar com DataServer /api/dados:', error);
                setConnectionStatus('offline');
            } finally {
                if (!isBackground) {
                    hideGlobalLoader();
                }
            }
        }

        // ================================================================
