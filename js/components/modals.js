        // CONTROLE DE SESSÃO ÚNICA (DESCONECTA DISPOSITIVOS ANTERIORES E EVITA SATURAÇÃO DO BANCO)
        // ================================================================
        function desconectarPorAcessoDuplicado(motivo = '') {
            const user = localStorage.getItem('sf_auth_user') || sessionStorage.getItem('sf_auth_user') || 'Usuário';

            ['sf_auth_token','sf_auth_user','sf_auth_role','sf_active_session_token'].forEach(k => {
                localStorage.removeItem(k);
                sessionStorage.removeItem(k);
            });
            authToken = '';
            if (syncTimer) { clearInterval(syncTimer); syncTimer = null; }

            updateAuthUI();
            mostrarModalAcessoDuplicado(user, motivo);
        }

        function mostrarModalAcessoDuplicado(usuarioNome, motivo) {
            let overlay = document.getElementById('duplicateSessionOverlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'duplicateSessionOverlay';
                overlay.className = 'action-modal-overlay active';
                overlay.style.zIndex = '999999';
                overlay.innerHTML = `
                    <div class="action-modal" style="max-width:460px;text-align:center;padding:2rem 1.5rem;border-radius:18px;background:var(--color-bg);border:2px solid #ef4444;box-shadow:0 15px 50px rgba(239,68,68,0.4);">
                        <div style="width:64px;height:64px;border-radius:50%;background:#fee2e2;color:#ef4444;display:inline-flex;align-items:center;justify-content:center;font-size:2rem;margin:0 auto 1rem auto;">
                            <i class="fas fa-shield-alt"></i>
                        </div>
                        <h2 style="font-size:1.25rem;font-weight:800;color:var(--color-text);margin-bottom:0.5rem;">Sessão Desconectada (Acesso Único)</h2>
                        <p style="font-size:0.88rem;color:var(--color-gray-600);line-height:1.4;margin-bottom:1rem;">
                            O usuário <strong style="color:var(--color-primary);">${usuarioNome}</strong> realizou login em outro dispositivo ou local.
                        </p>
                        <div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.25);border-radius:10px;padding:0.75rem;font-size:0.8rem;color:#991b1b;margin-bottom:1.25rem;text-align:left;">
                            <i class="fas fa-exclamation-triangle" style="margin-right:4px;"></i>
                            <strong>Proteção Anti-Saturação:</strong> Para proteger o banco de dados do tablet e evitar acessos duplicados simultâneos, apenas 1 login ativo por usuário é permitido.
                        </div>
                        <button class="btn btn-primary" onclick="fecharModalSessaoDuplicada()" style="width:100%;justify-content:center;padding:0.65rem;font-weight:700;">
                            <i class="fas fa-sign-in-alt"></i> Fazer Novo Login
                        </button>
                    </div>
                `;
                document.body.appendChild(overlay);
            } else {
                overlay.classList.add('active');
            }
        }

        function fecharModalSessaoDuplicada() {
            const overlay = document.getElementById('duplicateSessionOverlay');
            if (overlay) overlay.classList.remove('active');
            const loginOverlay = document.getElementById('loginOverlay');
            if (loginOverlay) loginOverlay.classList.remove('hidden');
        }

        // Detectar alteração de login no mesmo dispositivo/navegador (Multi-abas)
        window.addEventListener('storage', (e) => {
            if (e.key === 'sf_auth_token') {
                const myToken = authToken;
                if (myToken && e.newValue && e.newValue !== myToken) {
                    desconectarPorAcessoDuplicado('Outro login com este usuário foi realizado nesta máquina/navegador.');
                }
            }
        });

        // MODAL OS
        // ================================================================
        function openOsReportModal(frotaCod) {
            const osList = ordensServico.filter(os =>
                (os.codigoEquip || '').split(' - ')[0].trim() === String(frotaCod)
            );
            const modal = document.getElementById('osReportModalOverlay');
            const title = document.getElementById('osReportModalTitle');
            const body  = document.getElementById('osReportModalBody');
            if (!modal || !body) return;

            title.innerHTML = `<i class="fas fa-clipboard-list" style="color:var(--color-primary);"></i> OS · Frota ${frotaCod}`;

            if (osList.length === 0) {
                body.innerHTML = `<div style="padding:1.5rem;text-align:center;color:var(--color-gray-500);">
                    <i class="fas fa-check-circle" style="font-size:2rem;color:#22c55e;margin-bottom:0.5rem;display:block;"></i>
                    <p style="font-weight:600;">Equipamento sem OS abertas</p>
                    <p style="font-size:0.85rem;margin-top:0.3rem;">Este equipamento está disponível para operação.</p>
                </div>`;
            } else {
                body.innerHTML = `<div style="display:flex;flex-direction:column;gap:0.8rem;">` +
                    osList.map(os => `
                        <div class="os-report-card">
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">
                                <strong style="font-size:0.95rem;">OS nº ${os.codOS || 'S/N'}</strong>
                                <span class="badge-equip os-aberta">${os.statusOS || 'ABERTA'}</span>
                            </div>
                            <div class="os-report-meta"><i class="fas fa-calendar-alt" style="margin-right:4px;"></i> <strong>Entrada:</strong> ${os.dataEntrada || '—'}</div>
                            <div class="os-report-meta"><i class="fas fa-clock" style="margin-right:4px;"></i> <strong>Dias:</strong> ${os.diasPermanencia || '—'}</div>
                            <div class="os-report-meta"><i class="fas fa-tools" style="margin-right:4px;"></i> <strong>Tipo:</strong> ${os.tipoOficina || '—'} — ${os.oficina || '—'}</div>
                            <div class="os-report-desc"><strong style="color:var(--color-primary);">Descrição:</strong> ${os.descricao || 'Manutenção registrada no sistema'}</div>
                        </div>`).join('') +
                `</div>`;
            }
            modal.classList.add('active');
        }

        // ================================================================
        // CADASTRO DE NOVA FROTA E OPERAÇÃO PRODUTIVA
        // ================================================================
        async function submitAddEquip(e) {
            if (e) e.preventDefault();
            const codigo    = (document.getElementById('addEquipCodigo')?.value || '').trim();
            const descricao = (document.getElementById('addEquipDescricao')?.value || '').trim();
            const modelo    = (document.getElementById('addEquipModelo')?.value || '').trim();
            const tipo      = (document.getElementById('addEquipTipo')?.value || 'Trator').trim();
            const grupo     = (document.getElementById('addEquipGrupo')?.value || 'PREPARO').trim();
            const errEl     = document.getElementById('addEquipError');

            if (!codigo || !descricao || !modelo) {
                if (errEl) { errEl.textContent = 'Por favor, preencha todos os campos obrigatórios.'; errEl.style.display = 'block'; }
                return;
            }

            const exists = equipments.some(eq => String(eq.codigo) === String(codigo));
            if (exists) {
                if (errEl) { errEl.textContent = `A frota ${codigo} já está cadastrada no sistema.`; errEl.style.display = 'block'; }
                return;
            }

            if (errEl) errEl.style.display = 'none';
            showGlobalLoader();

            try {
                const res = await fetch(`${API_BASE}/api/equipamentos`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify({ codigo, descricao, modelo, tipo, grupo })
                });

                const data = await res.json();
                if (res.ok && data.success) {
                    const defaultOp = (operacoes[0] ? formatarOp(operacoes[0]) : '101 - PREPARO DE SOLO');
                    const newEquip = {
                        codigo: String(codigo),
                        descricao: descricao,
                        modelo: modelo,
                        tipoRaw: tipo,
                        tipo: tipo,
                        grupo: grupo,
                        operacao: defaultOp,
                        statusOS: 'OK',
                        codOS: ''
                    };
                    equipments.unshift(newEquip);

                    document.getElementById('modalAddEquipOverlay')?.classList.remove('active');
                    document.getElementById('formAddEquip')?.reset();

                    addLog(`✅ Frota ${codigo} (${descricao}) cadastrada no programa e gravada no banco!`, 'success');
                    renderEquipamentos();
                    renderTeamTabs(false);
                    atualizarStatusGeral();
                } else {
                    if (errEl) { errEl.textContent = data.error || 'Erro ao gravar no banco de dados.'; errEl.style.display = 'block'; }
                }
            } catch (err) {
                if (errEl) { errEl.textContent = 'Falha de conexão ao enviar para o banco: ' + err.message; errEl.style.display = 'block'; }
            } finally {
                hideGlobalLoader();
            }
        }

        async function submitAddOper(e) {
            if (e) e.preventDefault();
            const codigo    = (document.getElementById('addOperCodigo')?.value || '').trim();
            const descricao = (document.getElementById('addOperDescricao')?.value || '').trim();
            const tipoOp    = 'PRODUTIVA';
            const corp      = 'PITANGUEIRAS';
            const grupoOp   = 'Produtivas';
            const equipe    = (document.getElementById('addOperEquipe')?.value || '').trim();
            const errEl     = document.getElementById('addOperError');

            if (!codigo || !descricao) {
                if (errEl) { errEl.textContent = 'Por favor, preencha o Código e a Descrição da operação.'; errEl.style.display = 'block'; }
                return;
            }

            const exists = operacoes.some(op => String(op.codigo) === String(codigo));
            if (exists) {
                if (errEl) { errEl.textContent = `A operação ${codigo} já está cadastrada no sistema.`; errEl.style.display = 'block'; }
                return;
            }

            if (errEl) errEl.style.display = 'none';
            showGlobalLoader();

            try {
                const res = await fetch(`${API_BASE}/api/operacoes`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify({ codigo, descricao, tipoOperacao: tipoOp, corporativo: corp, grupoOperacao: grupoOp, equipe, status: 'ATIVO' })
                });

                const data = await res.json();
                if (res.ok && data.success) {
                    const newOper = {
                        codigo: String(codigo),
                        descricao: descricao,
                        tipoOperacao: tipoOp,
                        tipo: tipoOp,
                        corporativo: corp,
                        grupoOperacao: grupoOp,
                        status: 'ATIVO',
                        equipe: equipe
                    };
                    if (equipe) setCustomOpTeam(codigo, equipe);
                    operacoes.unshift(newOper);

                    document.getElementById('modalAddOperOverlay')?.classList.remove('active');
                    document.getElementById('formAddOper')?.reset();

                    addLog(`✅ Operação Produtiva ${codigo} (${descricao}) cadastrada no programa e gravada no banco!`, 'success');
                    renderOperacoes();
                    renderTeamTabs(false);
                    atualizarStatusGeral();
                } else {
                    if (errEl) { errEl.textContent = data.error || 'Erro ao gravar no banco de dados.'; errEl.style.display = 'block'; }
                }
            } catch (err) {
                if (errEl) { errEl.textContent = 'Falha de conexão ao enviar para o banco: ' + err.message; errEl.style.display = 'block'; }
            } finally {
                hideGlobalLoader();
            }
        }

        // ================================================================
