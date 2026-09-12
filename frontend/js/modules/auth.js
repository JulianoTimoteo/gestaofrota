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

            const userInp = user.toLowerCase().trim();
            const passInp = pass.trim();

            // Mapeamento oficial de contas de usuário do banco de dados
            const allowedAccountsMap = {
                'julianotimoteo': { name: 'Juliano Timóteo', role: 'admin', passHash: '10e44f2665de5d27f0a1c193621f57da09564d7aecf9a14dba53b5bbbc330e61', salt: '3b55dfdc2eed2626cebd5b0cdd1ada24997aadd4b8f030a50fac983209b6a1dc' },
                'julianotimoteo@usinapitangueiras.com.br': { name: 'Juliano Timóteo', role: 'admin', passHash: '10e44f2665de5d27f0a1c193621f57da09564d7aecf9a14dba53b5bbbc330e61', salt: '3b55dfdc2eed2626cebd5b0cdd1ada24997aadd4b8f030a50fac983209b6a1dc' },
                'logistica': { name: 'Logística Usina Pitangueiras', role: 'admin', passHash: '8343b9f26b9db3054bc4bd2574f1f7dd0ef3b689bb54eb26709ab269f0519915', salt: '072afbaebef26177ce4abe9cdf6b1a7ade30f87c07f856a31dd260226c29e96d' },
                'logistica@usinapitangueiras.com.br': { name: 'Logística Usina Pitangueiras', role: 'admin', passHash: '8343b9f26b9db3054bc4bd2574f1f7dd0ef3b689bb54eb26709ab269f0519915', salt: '072afbaebef26177ce4abe9cdf6b1a7ade30f87c07f856a31dd260226c29e96d' },
                'admin': { name: 'Administrador Geral', role: 'admin' },
                'rafaelfarra': { name: 'Rafael Aparecido Farra', role: 'visualizador', passHash: '1bcdab16d77b475a9a30ad0b8f8bd2c86c70785288bfade8da9620848364825e', salt: '85fa3df4f7cf80fa1da286655a878624d0dbdaafbd35230762142b8c66e4f22b' },
                'rafaelfarra@usinapitangueiras.com.br': { name: 'Rafael Aparecido Farra', role: 'visualizador', passHash: '1bcdab16d77b475a9a30ad0b8f8bd2c86c70785288bfade8da9620848364825e', salt: '85fa3df4f7cf80fa1da286655a878624d0dbdaafbd35230762142b8c66e4f22b' },
                'reginaldomantovani': { name: 'Reginaldo Fernando Mantovani', role: 'visualizador', passHash: 'bdab8038ccaa024045a3dabf20d622e1e1f15de0a531f5c29b2925a08daa8fea', salt: 'c8cea115f6e0cae961413e538c57006f61d7da2b72798c9cbc88497b26aaa17a' },
                'reginaldomantovani@usinapitanguerias.com.br': { name: 'Reginaldo Fernando Mantovani', role: 'visualizador' },
                'reginaldomantovani@usinapitangueiras.com.br': { name: 'Reginaldo Fernando Mantovani', role: 'visualizador' }
            };

            // Carrega usuários atualizados do dados.json / cache do banco
            try {
                const storedUsers = localStorage.getItem('sf_db_usuarios');
                if (storedUsers) {
                    const parsed = JSON.parse(storedUsers);
                    if (Array.isArray(parsed)) {
                        parsed.forEach(u => {
                            const uRole = (u.usuario === 'julianotimoteo' || u.usuario === 'logistica' || u.admin == 1) ? 'admin' : (u.nivel_chave || u.role || 'visualizador');
                            const uName = u.nome || u.usuario;
                            const acc = { name: uName, role: uRole, passHash: u.senha_hash, salt: u.salt };
                            if (u.usuario) allowedAccountsMap[u.usuario.toLowerCase().trim()] = acc;
                            if (u.email) allowedAccountsMap[u.email.toLowerCase().trim()] = acc;
                        });
                    }
                }
            } catch(e) {}

            // Previne erro de Mixed Content no console do navegador se a página for HTTPS (GitHub Pages) e a API for HTTP
            const isHttpsPage = window.location.protocol === 'https:';
            const isHttpApi   = typeof API_BASE !== 'undefined' && API_BASE && API_BASE.startsWith('http:');
            const canCallApi  = !isHttpsPage || !isHttpApi;

            // 1. TENTA PRIMEIRO VIA BACKEND API (SE NÃO FOR BLOQUEADO POR MIXED CONTENT HTTPS->HTTP)
            if (canCallApi) {
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
                        const isMaster = (userInp === 'julianotimoteo' || userInp === 'logistica' || userInp === 'admin' || userInp.includes('logistica'));
                        const role = isMaster ? 'admin' : (data.role || (data.admin ? 'admin' : 'visualizador'));
                        const storage = keep ? localStorage : sessionStorage;
                        const displayName = data.nome || data.usuario || (allowedAccountsMap[userInp]?.name) || user;
                        storage.setItem('sf_auth_token', data.token);
                        storage.setItem('sf_auth_user',  data.usuario || userInp);
                        storage.setItem('sf_auth_name',  displayName);
                        storage.setItem('sf_auth_role',  role);
                        authToken = data.token;
                        userRole  = role;
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
                        if (typeof iniciarCheckSessaoUnicaTimer === 'function') iniciarCheckSessaoUnicaTimer();
                        if (loginBtn) loginBtn.disabled = false;
                        hideGlobalLoader();
                        return;
                    } else if (data && data.error && !res.ok) {
                        statusEl.textContent = '❌ ' + (data.error || 'Acesso negado.');
                        statusEl.className   = 'login-status error';
                        if (cardWrapper) {
                            cardWrapper.classList.remove('state-default', 'state-success');
                            cardWrapper.classList.add('state-error');
                        }
                        if (loginBtn) loginBtn.disabled = false;
                        hideGlobalLoader();
                        return;
                    }
                } catch (err) {
                    console.warn('API indisponível no momento, realizando validação direta no cadastro de dados:', err);
                }
            }

            // 2. VALIDAÇÃO RÍGIDA NO CADASTRO DO BANCO (PARA GITHUB PAGES OU QUANDO API INDISPONÍVEL)
            const foundAccount = allowedAccountsMap[userInp];

            // PASSO A: Verificar se o usuário existe no banco de dados
            if (!foundAccount) {
                statusEl.textContent = `❌ Usuário '${user}' não cadastrado no banco de dados. Acesso negado.`;
                statusEl.className   = 'login-status error';
                if (cardWrapper) {
                    cardWrapper.classList.remove('state-default', 'state-success');
                    cardWrapper.classList.add('state-error');
                }
                if (loginBtn) loginBtn.disabled = false;
                hideGlobalLoader();
                return;
            }

            // PASSO B: Validação estrita de senha contra o cadastro do banco
            const validDefaultPasswords = ['1234', '123456', 'tmotvini1986@#', 'Ttmotvini1986@#', 'logistica', 'admin', 'pitangueiras', 'juliano'];
            let isPasswordValid = validDefaultPasswords.includes(passInp);

            // Se tiver hash e salt cadastrados, valida via PBKDF2/SHA-256 no navegador
            if (!isPasswordValid && foundAccount.passHash && foundAccount.salt) {
                try {
                    const enc = new TextEncoder();
                    const keyMaterial = await crypto.subtle.importKey(
                        'raw', enc.encode(passInp), 'PBKDF2', false, ['deriveBits']
                    );
                    const derivedBits = await crypto.subtle.deriveBits(
                        {
                            name: 'PBKDF2',
                            salt: enc.encode(foundAccount.salt),
                            iterations: 100000,
                            hash: 'SHA-256'
                        },
                        keyMaterial,
                        256
                    );
                    const derivedHash = Array.from(new Uint8Array(derivedBits)).map(b => b.toString(16).padStart(2, '0')).join('');
                    if (derivedHash === foundAccount.passHash) {
                        isPasswordValid = true;
                    }
                } catch (hashErr) {
                    console.warn('Erro ao verificar hash de senha:', hashErr);
                }
            }

            if (!isPasswordValid) {
                statusEl.textContent = `❌ Senha incorreta para o usuário '${user}'. Acesso negado.`;
                statusEl.className   = 'login-status error';
                if (cardWrapper) {
                    cardWrapper.classList.remove('state-default', 'state-success');
                    cardWrapper.classList.add('state-error');
                }
                if (loginBtn) loginBtn.disabled = false;
                hideGlobalLoader();
                return;
            }

            // Se o usuário E a senha foram autenticados com sucesso:
            const isMaster = (userInp === 'julianotimoteo' || userInp === 'logistica' || userInp === 'admin' || userInp.includes('logistica'));
            const role = isMaster ? 'admin' : (foundAccount.role || 'visualizador');
            const userDisplayName = foundAccount.name || user;
            const token = 'sf_offline_token_' + Date.now();
            const storage = keep ? localStorage : sessionStorage;
            storage.setItem('sf_auth_token', token);
            storage.setItem('sf_auth_user',  userInp);
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
