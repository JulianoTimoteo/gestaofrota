        // SYNC TIMER (5 MINUTOS — 300 SEGUNDOS)
        // ================================================================
        function iniciarSyncTimer() {
            if (syncTimer) clearInterval(syncTimer);
            const CINCO_MINUTOS = 5 * 60 * 1000; // 5 minutos (300.000 ms)
            syncTimer = setInterval(async () => {
                if (!authToken || isSyncing) return;
                isSyncing = true;
                addLog('🔄 Sincronização automática em segundo plano (ciclo 5 min)...', 'info');
                await carregarDados(true); // background = true
                isSyncing = false;
            }, CINCO_MINUTOS);
        }

        var singleSessionTimer = null;
        function iniciarCheckSessaoUnicaTimer() {
            // Live API always enabled
            if (singleSessionTimer) clearInterval(singleSessionTimer);
            singleSessionTimer = setInterval(async () => {
                if (!authToken || authToken === 'sf_standalone_session_token') return;
                try {
                    const res = await fetch(`${API_BASE}/api/auth/me`, {
                        headers: { 'Authorization': `Bearer ${authToken}` }
                    }).catch(() => null);

                    if (res && res.status === 401) {
                        const d = await res.json().catch(() => null);
                        desconectarPorAcessoDuplicado(d ? d.error : 'Sua sessão foi encerrada porque este usuário entrou em outro dispositivo.');
                    }
                } catch(e) {}
            }, 5000);
        }

        // ================================================================
