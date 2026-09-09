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

            if (isStaticGitHubPages()) {
                const userInp = user.toLowerCase().trim();
                const allowedAccounts = [
                    'julianotimoteo', 'julianotimoteo@usinapitangueiras.com.br',
                    'rafaelfarra', 'rafaelfarra@usinapitangueiras.com.br',
                    'logistica', 'logistica@usinapitangueiras.com.br'
                ];

                if (!allowedAccounts.includes(userInp)) {
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

                let role = 'visualizador';
                if (userInp.includes('juliano') || userInp.includes('logistica')) {
                    role = 'admin';
                } else if (userInp.includes('rafael')) {
                    role = 'operador';
                } else {
                    role = 'visualizador';
                }

                const nameMap = {
                    'julianotimoteo': 'Juliano Timóteo',
                    'julianotimoteo@usinapitangueiras.com.br': 'Juliano Timóteo',
                    'rafaelfarra': 'Rafael Aparecido Farra',
                    'rafaelfarra@usinapitangueiras.com.br': 'Rafael Aparecido Farra',
                    'logistica': 'Logística Usina Pitangueiras',
                    'logistica@usinapitangueiras.com.br': 'Logística Usina Pitangueiras'
                };
                const userDisplayName = nameMap[userInp] || user;

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
            }

            try {
                const res  = await fetch(`${API_BASE}/api/auth/login`, {
                    method:  'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body:    JSON.stringify({ 
                        usuario: user, 
                        senha: pass, 
                        origem_site: window.location.href || 'https://julianotimoteo.github.io/gestaofrota/' 
                    })
                });
                const data = await res.json();

                if (res.ok && data.success && data.token) {
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
                    statusEl.textContent = '✅ Login efetuado!';
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
                    iniciarCheckSessaoUnicaTimer();
                } else {
                    statusEl.textContent = data.error || 'Usuário ou senha incorretos';
                    statusEl.className   = 'login-status error';
                    if (cardWrapper) {
                        cardWrapper.classList.remove('state-default', 'state-success');
                        cardWrapper.classList.add('state-error');
                    }
                }
            } catch (err) {
                applyRBAC();

                const overlay = document.getElementById('loginOverlay');
                if (overlay) overlay.classList.add('hidden');

                try {
                    await carregarDados();
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
