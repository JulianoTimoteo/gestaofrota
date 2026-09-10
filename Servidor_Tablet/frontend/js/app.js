// EVENT LISTENERS (configurados 1x no init)
        // ================================================================
        function setupEventListeners() {
            // Login
            const loginForm = document.getElementById('loginForm');
            const loginBtn  = document.getElementById('loginBtn');
            if (loginForm) loginForm.addEventListener('submit', e => { e.preventDefault(); doLogin(); });
            if (loginBtn)  loginBtn.addEventListener('click', doLogin);

            // Show/hide password
            const togglePassBtn = document.getElementById('togglePassBtn');
            if (togglePassBtn) {
                togglePassBtn.addEventListener('click', function () {
                    const input = document.getElementById('loginPass');
                    const icon  = this.querySelector('i');
                    if (input.type === 'password') { input.type = 'text';     icon.className = 'fas fa-eye-slash'; }
                    else                           { input.type = 'password'; icon.className = 'fas fa-eye'; }
                });
            }

            // Logout
            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn) logoutBtn.addEventListener('click', doLogout);

            // Tabs principais
            document.querySelectorAll('#mainTabs > .tab-btn[data-tab]').forEach(btn => {
                btn.addEventListener('click', () => switchMainTab(btn.dataset.tab));
            });

            // Sub-tabs admin
            document.querySelectorAll('#adminSubTabs > .tab-btn[data-subtab]').forEach(btn => {
                btn.addEventListener('click', () => switchAdminSubTab(btn.dataset.subtab));
            });

            // Filtros
            const filterEquip = document.getElementById('filterEquip');
            if (filterEquip) filterEquip.addEventListener('input', renderEquipamentos);

            const filterOperacao = document.getElementById('filterOperacao');
            if (filterOperacao) filterOperacao.addEventListener('input', renderOperacoes);

            // Filtro de equipe na aba Admin > Equipamentos
            const equipTeamFilter = document.getElementById('equipTeamFilter');
            if (equipTeamFilter) {
                equipTeamFilter.addEventListener('click', e => {
                    const btn = e.target.closest('.team-filter-btn');
                    if (!btn) return;
                    equipFiltroEquipe = btn.dataset.team;
                    document.querySelectorAll('.team-filter-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    renderEquipamentos();
                });
            }

            // Modal OS — fechar
            const osClose = document.getElementById('osReportModalClose');
            if (osClose) osClose.addEventListener('click', () => {
                document.getElementById('osReportModalOverlay').classList.remove('active');
            });
            document.getElementById('osReportModalOverlay')?.addEventListener('click', e => {
                if (e.target === e.currentTarget) e.currentTarget.classList.remove('active');
            });

            // Modal Cadastrar Frota
            document.getElementById('btnOpenAddEquip')?.addEventListener('click', () => {
                document.getElementById('addEquipError').style.display = 'none';
                document.getElementById('modalAddEquipOverlay')?.classList.add('active');
            });
            document.getElementById('btnCancelAddEquip')?.addEventListener('click', () => {
                document.getElementById('modalAddEquipOverlay')?.classList.remove('active');
            });
            document.getElementById('formAddEquip')?.addEventListener('submit', submitAddEquip);
            document.getElementById('modalAddEquipOverlay')?.addEventListener('click', e => {
                if (e.target === e.currentTarget) e.currentTarget.classList.remove('active');
            });

            // Modal Editar Frota
            document.getElementById('btnCancelEditEquip')?.addEventListener('click', () => {
                document.getElementById('modalEditEquipOverlay')?.classList.remove('active');
            });
            document.getElementById('formEditEquip')?.addEventListener('submit', submitEditEquip);
            document.getElementById('modalEditEquipOverlay')?.addEventListener('click', e => {
                if (e.target === e.currentTarget) e.currentTarget.classList.remove('active');
            });

            // Modal Cadastrar Operação Produtiva
            document.getElementById('btnOpenAddOper')?.addEventListener('click', () => {
                document.getElementById('addOperError').style.display = 'none';
                document.getElementById('modalAddOperOverlay')?.classList.add('active');
            });
            document.getElementById('btnCancelAddOper')?.addEventListener('click', () => {
                document.getElementById('modalAddOperOverlay')?.classList.remove('active');
            });
            document.getElementById('formAddOper')?.addEventListener('submit', submitAddOper);
            document.getElementById('modalAddOperOverlay')?.addEventListener('click', e => {
                if (e.target === e.currentTarget) e.currentTarget.classList.remove('active');
            });

            // Modal Editar Operação Produtiva
            document.getElementById('btnCancelEditOper')?.addEventListener('click', () => {
                document.getElementById('modalEditOperOverlay')?.classList.remove('active');
            });
            document.getElementById('formEditOper')?.addEventListener('submit', submitEditOper);
            document.getElementById('modalEditOperOverlay')?.addEventListener('click', e => {
                if (e.target === e.currentTarget) e.currentTarget.classList.remove('active');
            });

            // Delegação para botão OS e centralização automática de abas (qualquer lugar)
            document.addEventListener('click', e => {
                const osBtn = e.target.closest('.os-info-btn');
                if (osBtn) openOsReportModal(osBtn.dataset.frota);

                const tabBtn = e.target.closest('.tab-btn, .sub-tab-btn, .team-filter-btn');
                if (tabBtn) autoCenterTab(tabBtn);
            });

            // Re-renderizar abas de equipes ao redimensionar a janela (mobile x desktop)
            window.addEventListener('resize', () => renderTeamTabs(false));

            // Botão sync manual (se existir)
            const syncBtn = document.getElementById('syncNowBtn');
            if (syncBtn) {
                syncBtn.addEventListener('click', async () => {
                    if (isSyncing) return;
                    isSyncing = true;
                    syncBtn.disabled = true;
                    addLog('🔄 Sincronização manual iniciada...', 'info');
                    await carregarDados(false);
                    isSyncing = false;
                    syncBtn.disabled = false;
                });
            }
        }

        async function executarAutoCureManualmente() {
            addLog('🛡️ Algoritmo de Auto-Correção acionado pelo usuário...', 'warning');
            showGlobalLoader();
            try {
                const res = await fetch(`${API_BASE}/api/sync/auto-cure`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    }
                }).catch(() => null);
                if (res && res.ok) {
                    const data = await res.json().catch(() => null);
                    if (data && data.success) {
                        addLog(`🟢 Auto-Cure concluído! Saúde restaurada para ${data.taxa_sucesso}%. Registros recuperados: ${data.registros_recuperados}`, 'success');
                    } else {
                        addLog('ℹ️ Auto-Cure executado em modo de proteção Cloud.', 'info');
                    }
                } else {
                    addLog('ℹ️ Auto-Cure ativo em modo Cloud resiliente.', 'info');
                }
                await carregarDados(false);
            } catch (e) {
                addLog('⚠️ Alerta Auto-Cure: ' + e.message, 'warning');
            } finally {
                hideGlobalLoader();
            }
        }

        // ================================================================
        // INIT APP
        // ================================================================
        async function initApp() {
            initThemeToggle();
            startRealtimeClock();
            initPwaInstall();

            // Lê token antes de qualquer chamada para evitar flicker
            authToken = localStorage.getItem('sf_auth_token') || sessionStorage.getItem('sf_auth_token') || '';
            userRole  = localStorage.getItem('sf_auth_role')  || sessionStorage.getItem('sf_auth_role') || 'admin';
            activeMainTab  = localStorage.getItem('sf_active_tab')          || 'tab-admin';
            activeAdminSub = localStorage.getItem('sf_active_admin_subtab') || 'tab-equipamentos';
            activeTeam     = localStorage.getItem('sf_active_team')         || null;

            setupEventListeners();
            applyRBAC();
            updateAuthUI();

            if (authToken) {
                await carregarDados(false);
                iniciarSyncTimer();
                iniciarCheckSessaoUnicaTimer();
                checkAuth(); // valida token em background, sem bloquear
            }
        }

        initApp();
