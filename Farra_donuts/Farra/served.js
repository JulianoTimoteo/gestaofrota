
        function doLogin() {
            const user = document.getElementById('loginUser').value.trim();
            const pass = document.getElementById('loginPass').value;
            const statusEl = document.getElementById('loginStatus');
            
            if (!user || !pass) {
                statusEl.textContent = 'Preencha usuario e senha';
                statusEl.className = 'login-status error';
                return;
            }
            
            statusEl.textContent = 'Entrando...';
            statusEl.className = 'login-status info';
            
            fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usuario: user, senha: pass })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success && data.token) {
                    localStorage.setItem('sf_auth_token', data.token);
                    localStorage.setItem('sf_auth_user', data.usuario);
                    statusEl.textContent = 'Login OK!';
                    statusEl.className = 'login-status success';
                    setTimeout(() => location.reload(), 1000);
                } else {
                    statusEl.textContent = data.error || 'Falha no login';
                    statusEl.className = 'login-status error';
                }
            })
            .catch(err => {
                statusEl.textContent = 'Erro: ' + err.message;
                statusEl.className = 'login-status error';
            });
        }
        
        document.getElementById('loginBtn').addEventListener('click', doLogin);
        document.getElementById('loginPass').addEventListener('keydown', function(e) {
            if (e.key === 'Enter') doLogin();
        });
        
        const toggleBtn = document.getElementById('togglePassBtn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', function() {
                const input = document.getElementById('loginPass');
                const icon = this.querySelector('i');
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.className = 'fas fa-eye-slash';
                } else {
                    input.type = 'password';
                    icon.className = 'fas fa-eye';
                }
            });
        }
        
        const debugBtn = document.getElementById('debugApiBtn');
        if (debugBtn) {
            debugBtn.addEventListener('click', function() {
                const statusEl = document.getElementById('loginStatus');
                statusEl.textContent = 'Testando API...';
                statusEl.className = 'login-status info';
                fetch('/api/auth/config')
                    .then(res => res.json())
                    .then(data => {
                        statusEl.textContent = 'API OK! Auth: ' + (data.autenticacao_ativa ? 'ATIVADA' : 'DESATIVADA');
                        statusEl.className = 'login-status success';
                    })
                    .catch(err => {
                        statusEl.textContent = 'API ERRO: ' + err.message;
                        statusEl.className = 'login-status error';
                    });
            });
        }
    