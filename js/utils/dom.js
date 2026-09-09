        // ================================================================
        // TEMA
        // ================================================================
        function initThemeToggle() {
            const checkbox  = document.getElementById('themeToggleCheckbox');
            const saved     = localStorage.getItem('sf_theme') || 'light';
            if (saved === 'dark') {
                document.body.classList.add('dark-theme');
                if (checkbox) checkbox.checked = true;
            }
            if (checkbox) {
                checkbox.addEventListener('change', function () {
                    document.body.classList.toggle('dark-theme', this.checked);
                    localStorage.setItem('sf_theme', this.checked ? 'dark' : 'light');
                });
            }
        }

        // ================================================================
        // GLOBAL LOADER
        // ================================================================
        function showGlobalLoader() {
            const loader = document.getElementById('globalLoaderOverlay');
            if (loader) loader.classList.add('active');
        }

        function hideGlobalLoader() {
            const loader = document.getElementById('globalLoaderOverlay');
            if (loader) loader.classList.remove('active');
        }

        // ================================================================
        // RELÓGIO
        // ================================================================
        function startRealtimeClock() {
            const el = document.getElementById('headerClock');
            if (!el) return;
            const tick = () => {
                const n = new Date();
                el.textContent = `${n.toLocaleDateString('pt-BR')}, ${n.toLocaleTimeString('pt-BR')}`;
            };
            tick();
            setInterval(tick, 1000);
        }

        // ================================================================
        // AUTH UI
        // ================================================================
        // STATUS / CONEXÃO
        // ================================================================
        function setConnectionStatus(type, message = '') {
            const dot       = document.getElementById('statusDot');
            const ping      = document.getElementById('radarPing');
            const conn      = document.getElementById('connectionStatus');
            const container = document.getElementById('statusContainer');
            const footer    = document.getElementById('footerStatus');
            if (!conn) return;
            const map = {
                success: ['#16a34a', '#22c55e', 'Conectado',    'connected'],
                error:   ['#dc2626', '#ef4444', 'Desconectado', 'disconnected'],
                syncing: ['#ca8a04', '#eab308', 'Atualizando...', 'syncing'],
                gray:    ['#6b7280', '#9ca3af', message || 'Aguardando...', '']
            };
            const [coreColor, pingColor, label, containerClass] = map[type] || map.gray;
            if (dot)  dot.setAttribute('fill', coreColor);
            if (ping) ping.setAttribute('fill', pingColor);
            conn.textContent = label;
            if (container && containerClass !== undefined) {
                container.className = `status-badge ${containerClass}`;
            }
            if (footer) {
                if (type === 'error') {
                    footer.textContent = `Desconectado · ${message || 'Sem conexão com o servidor'}`;
                } else if (type === 'syncing') {
                    footer.textContent = `Atualizando dados do servidor...`;
                } else if (type === 'success') {
                    footer.textContent = `Conectado · Servidor online`;
                }
            }
        }

        // LOG
        // ================================================================
        function addLog(message, type = 'info') {
            const logDiv = document.getElementById('apiLog');
            if (!logDiv) return;
            const time  = new Date().toLocaleTimeString('pt-BR');
            const color = type === 'success' ? '#10b981' :
                          type === 'error'   ? '#ef4444' :
                          type === 'warning' ? '#f59e0b' : '#94a3b8';
            const div = document.createElement('div');
            div.style.color = color;
            div.textContent = `[${time}] ${message}`;
            logDiv.appendChild(div);
            // Manter últimas 50 linhas
            while (logDiv.children.length > 50) logDiv.removeChild(logDiv.firstChild);
            logDiv.scrollTop = logDiv.scrollHeight;
        }

        // ================================================================
        // AUTO-CENTER TAB BUTTONS (ROLA PARA O CENTRO AO CLICAR)
        // ================================================================
        function autoCenterTab(btn) {
            if (!btn) return;
            const container = btn.parentElement;
            if (!container) return;

            const btnLeft = btn.offsetLeft;
            const btnWidth = btn.offsetWidth;
            const containerWidth = container.clientWidth;
            const targetScrollLeft = btnLeft - (containerWidth / 2) + (btnWidth / 2);

            container.scrollTo({
                left: Math.max(0, targetScrollLeft),
                behavior: 'smooth'
            });
        }

        // ================================================================
        // TAB SWITCHING — estável, nunca volta para admin sozinho
        // ================================================================
        function switchMainTab(tabId, persist = true) {
            if (!tabId) return;
            activeMainTab = tabId;
            if (persist) {
                localStorage.setItem('sf_active_tab', tabId);
                sessionStorage.setItem('sf_active_tab', tabId);
            }
            document.querySelectorAll('#mainTabs > .tab-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.tab === tabId);
            });
            document.querySelectorAll('#tab-admin, #tab-equipe').forEach(el => {
                el.classList.toggle('active', el.id === tabId);
            });
        }

        function switchAdminSubTab(subId, persist = true) {
            if (!subId) return;
            activeAdminSub = subId;
            if (persist) {
                localStorage.setItem('sf_active_admin_subtab', subId);
                sessionStorage.setItem('sf_active_admin_subtab', subId);
            }
            document.querySelectorAll('#adminSubTabs > .tab-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.subtab === subId);
            });
            document.querySelectorAll('#adminSubContents > .tab-content').forEach(el => {
                el.classList.toggle('active', el.id === subId);
            });
            if (subId === 'tab-usuarios') {
                renderUsuariosList();
            } else if (subId === 'tab-database') {
                carregarListaTabelasExplorer();
            } else if (subId === 'tab-apikeys') {
                carregarChavesApiExplorer();
            }
        }

        // ================================================================
        // RBAC (chamado apenas no login/init — não ao recarregar dados)
        // ================================================================
        function applyRBAC() {
            const mainTabs       = document.getElementById('mainTabs');
            const adminTabBtn    = document.querySelector('.tab-btn[data-tab="tab-admin"]');
            const adminTabContent = document.getElementById('tab-admin');

            const curUser = (localStorage.getItem('sf_auth_user') || sessionStorage.getItem('sf_auth_user') || '').toLowerCase();
            const isAdminUser = ADMIN_ROLES.includes(userRole) && !curUser.includes('rafael');

            if (isAdminUser) {
                if (mainTabs)        mainTabs.style.display       = 'inline-flex';
                if (adminTabBtn)     adminTabBtn.style.display    = '';
                if (adminTabContent) adminTabContent.style.display = '';
                document.querySelectorAll('#adminSubTabs > .tab-btn').forEach(btn => btn.style.display = '');

                switchMainTab(activeMainTab || 'tab-admin', false);
                switchAdminSubTab(activeAdminSub || 'tab-equipamentos', false);
            } else {
                // Usuário Gerente/Operador (ex: Rafael Farra): ocultar totalmente abas de administração e mostrar apenas dados da operação (#tab-equipe)
                if (adminTabBtn)     adminTabBtn.style.display    = 'none';
                if (adminTabContent) adminTabContent.style.display = 'none';
                if (mainTabs)        mainTabs.style.display        = 'none';
                switchMainTab('tab-equipe', false);
            }
        }

        // ================================================================
