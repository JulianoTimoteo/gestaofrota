        function updateAuthUI() {
            const overlay   = document.getElementById('loginOverlay');
            const logoutBtn = document.getElementById('logoutBtn');
            const mainApp   = document.querySelector('.app');
            const token     = localStorage.getItem('sf_auth_token') || sessionStorage.getItem('sf_auth_token');

            if (overlay)   overlay.classList.toggle('hidden', !!token);
            if (mainApp)   mainApp.style.display = token ? 'block' : 'none';
            if (logoutBtn) logoutBtn.style.display = token ? 'inline-flex' : 'none';

            // Exibe o PRIMEIRO NOME do usuario logado no servidor
            const roleBadge = document.getElementById('userRoleBadge');
            if (roleBadge) {
                const rawName = localStorage.getItem('sf_auth_name') || sessionStorage.getItem('sf_auth_name') || localStorage.getItem('sf_auth_user') || sessionStorage.getItem('sf_auth_user') || 'Usuário';
                let firstName = rawName.trim();
                if (firstName.includes('@')) firstName = firstName.split('@')[0];
                firstName = firstName.split(' ')[0];
                firstName = firstName.charAt(0).toUpperCase() + firstName.slice(1);
                roleBadge.textContent = firstName;
            }
        }

        // ================================================================
        // LOGIN
        // ================================================================
        async function doLogin() {
            const user        = document.getElementById('loginUser').value.trim();
            const pass        = document.getElementById('loginPass').value;
            const keep        = document.getElementById('keepLogged')?.checked;
            const statusEl    = document.getElementById('loginStatus');
            const loginBtn    = document.getElementById('loginBtn');
            const cardWrapper = document.getElementById('loginCardWrapper');

            if (!user || !pass) {
                statusEl.textContent = 'Preencha usuário e senha';
                statusEl.className   = 'login-status error';
                if (cardWrapper) {
                    cardWrapper.classList.remove('state-default', 'state-success');
                    cardWrapper.classList.add('state-error');
                }
                return;
            }
            statusEl.textContent = 'Entrando...';
            statusEl.className   = 'login-status info';
            if (loginBtn) loginBtn.disabled = true;
            showGlobalLoader();

            // 1. TENTA PRIMEIRO VIA API DO BACKEND (SE DISPONÍVEL OU SE TIVER ENDEREÇO CONFIGURADO)
            let apiBaseToUse = (typeof API_BASE !== 'undefined' && API_BASE) ? API_BASE : window.location.origin;
            if (apiBaseToUse.includes('github.io') || apiBaseToUse.startsWith('file:')) {
                const customApi = localStorage.getItem('sf_custom_api_base');
                apiBaseToUse = customApi || 'http://127.0.0.1:8000';
            }

            let apiSuccess = false;
            try {
                const ctrl = new AbortController();
                const timeoutId = setTimeout(() => ctrl.abort(), 3500);
                const res = await fetch(`${apiBaseToUse}/api/auth/login`, {
                    method:  'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body:    JSON.stringify({ 
                        usuario: user, 
                        senha: pass, 
                        origem_site: window.location.href || 'https://julianotimoteo.github.io/gestaofrota/' 
                    }),
                    signal: ctrl.signal
                });
                clearTimeout(timeoutId);

                const data = await res.json();
                if (res.ok && data.success && data.token) {
                    apiSuccess = true;
                    const serverRole = data.nivel_chave || data.role || (data.admin ? 'admin' : 'visualizador');
                    const storage = keep ? localStorage : sessionStorage;
                    const displayName = data.nome || data.usuario || user;
                    storage.setItem('sf_auth_token', data.token);
                    storage.setItem('sf_auth_user',  data.usuario || user);
                    storage.setItem('sf_auth_name',  displayName);
                    storage.setItem('sf_auth_role',  serverRole);
                    if (data.permissoes) {
                        storage.setItem('sf_auth_perms', JSON.stringify(data.permissoes));
                    }
                    authToken = data.token;
                    userRole  = serverRole;
                    statusEl.textContent = '✅ Login efetuado com sucesso!';
                    statusEl.className   = 'login-status success';

                    if (cardWrapper) {
                        cardWrapper.classList.remove('state-default', 'state-error');
                        cardWrapper.classList.add('state-success');
                    }

                    updateAuthUI();
                    applyRBAC();

                    const overlay = document.getElementById('loginOverlay');
                    if (overlay) overlay.classList.add('hidden');

                    try { await carregarDados(); } catch (loadErr) {}
                    iniciarSyncTimer();
                    if (typeof iniciarCheckSessaoUnicaTimer === 'function') iniciarCheckSessaoUnicaTimer();
                    if (loginBtn) loginBtn.disabled = false;
                    hideGlobalLoader();
                    return;
                } else if (data && data.error && !res.ok) {
                    if (!data.error.includes('não cadastrado')) {
                        statusEl.textContent = '❌ ' + data.error;
                        statusEl.className   = 'login-status error';
                        if (cardWrapper) { cardWrapper.classList.remove('state-default', 'state-success'); cardWrapper.classList.add('state-error'); }
                        if (loginBtn) loginBtn.disabled = false;
                        hideGlobalLoader();
                        return;
                    }
                }
            } catch (apiErr) {
                console.warn('Backend API login indisponível, acionando validação autônoma local:', apiErr);
            }

            // 2. MODO AUTÔNOMO / GITHUB PAGES / OFFLINE
            const userInp = user.toLowerCase().trim();

            const allowedAccountsMap = {
                'julianotimoteo': { name: 'Juliano Timóteo', role: 'admin' },
                'julianotimoteo@usinapitangueiras.com.br': { name: 'Juliano Timóteo', role: 'admin' },
                'rafaelfarra': { name: 'Rafael Aparecido Farra', role: 'operador' },
                'rafaelfarra@usinapitangueiras.com.br': { name: 'Rafael Aparecido Farra', role: 'operador' },
                'logistica': { name: 'Logística Usina Pitangueiras', role: 'admin' },
                'logistica@usinapitangueiras.com.br': { name: 'Logística Usina Pitangueiras', role: 'admin' },
                'reginaldomantovani': { name: 'Reginaldo Fernando Mantovani', role: 'visualizador' },
                'reginaldomantovani@usinapitanguerias.com.br': { name: 'Reginaldo Fernando Mantovani', role: 'visualizador' },
                'reginaldomantovani@usinapitangueiras.com.br': { name: 'Reginaldo Fernando Mantovani', role: 'visualizador' }
            };

            try {
                const storedUsers = localStorage.getItem('sf_db_usuarios');
                if (storedUsers) {
                    const parsed = JSON.parse(storedUsers);
                    if (Array.isArray(parsed)) {
                        parsed.forEach(u => {
                            const uRole = u.nivel_chave || u.role || (u.admin ? 'admin' : 'visualizador');
                            const uName = u.nome || u.usuario;
                            if (u.usuario) allowedAccountsMap[u.usuario.toLowerCase().trim()] = { name: uName, role: uRole };
                            if (u.email) allowedAccountsMap[u.email.toLowerCase().trim()] = { name: uName, role: uRole };
                        });
                    }
                }
            } catch(e) {}

            const foundAccount = allowedAccountsMap[userInp];

            if (!foundAccount) {
                statusEl.textContent = `❌ Usuário ou e-mail '${user}' não cadastrado no banco de dados. Acesso negado.`;
                statusEl.className   = 'login-status error';
                if (cardWrapper) { cardWrapper.classList.remove('state-default', 'state-success'); cardWrapper.classList.add('state-error'); }
                if (loginBtn) loginBtn.disabled = false;
                hideGlobalLoader();
                return;
            }

            const validPass = pass.trim().length >= 3;
            if (!validPass) {
                statusEl.textContent = 'Senha inválida ou em branco';
                statusEl.className   = 'login-status error';
                if (cardWrapper) { cardWrapper.classList.remove('state-default', 'state-success'); cardWrapper.classList.add('state-error'); }
                if (loginBtn) loginBtn.disabled = false;
                hideGlobalLoader();
                return;
            }

            const role = foundAccount.role || 'visualizador';
            const userDisplayName = foundAccount.name || user;

            const token = 'sf_cloud_token_' + Date.now();
            const storage = keep ? localStorage : sessionStorage;
            storage.setItem('sf_auth_token', token);
            storage.setItem('sf_auth_user',  user);
            storage.setItem('sf_auth_name',  userDisplayName);
            storage.setItem('sf_auth_role',  role);
            authToken = token;
            userRole  = role;
            statusEl.textContent = '✅ Login efetuado com sucesso!';
            statusEl.className   = 'login-status success';

            if (cardWrapper) {
                cardWrapper.classList.remove('state-default', 'state-error');
                cardWrapper.classList.add('state-success');
            }

            updateAuthUI();
            applyRBAC();

            const overlay = document.getElementById('loginOverlay');
            if (overlay) overlay.classList.add('hidden');

            try { await carregarDados(); } catch (loadErr) {}
            iniciarSyncTimer();
            if (loginBtn) loginBtn.disabled = false;
            hideGlobalLoader();
            return;
                } catch (loadErr) {
                    console.warn('Alerta ao carregar dados pós-login:', loadErr);
                }
                iniciarSyncTimer();
            } finally {
                if (loginBtn) loginBtn.disabled = false;
                hideGlobalLoader();
            }
        }

        async function doLogout() {
            const token = localStorage.getItem('sf_auth_token') || sessionStorage.getItem('sf_auth_token');
            if (!isStaticGitHubPages()) {
                try {
                    await fetch(`${API_BASE}/api/auth/logout`, {
                        method: 'POST',
                        headers: { Authorization: 'Bearer ' + token }
                    });
                } catch (e) {}
            }
            ['sf_auth_token','sf_auth_user','sf_auth_name','sf_auth_role'].forEach(k => {
                localStorage.removeItem(k);
                sessionStorage.removeItem(k);
            });
            authToken = '';
            if (syncTimer) { clearInterval(syncTimer); syncTimer = null; }
            updateAuthUI();
        }

        function isUserInteracting() {
            const active = document.activeElement;
            if (active && (
                active.tagName === 'INPUT' ||
                active.tagName === 'SELECT' ||
                active.tagName === 'TEXTAREA' ||
                active.closest('#equipTableBody') ||
                active.closest('#operTableBody')
            )) {
                return true;
            }
            if (document.querySelector('.sd-popover.active') ||
                document.querySelector('#osReportModalOverlay.active') ||
                document.querySelector('#modalAddEquipOverlay.active') ||
                document.querySelector('#modalAddOperOverlay.active')) {
                return true;
            }
            return false;
        }

        // ================================================================
