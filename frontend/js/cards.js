        function atualizarStatusGeral(teamFilter = null) {
            const osAbertasEl = document.getElementById('osAbertasCount');
            const equipOkEl   = document.getElementById('equipOkCount');
            const equipOsEl   = document.getElementById('equipOsCount');

            let filteredEqs = equipments;
            let filteredOS  = ordensServico;
            let teamComOS   = equipamentosComOS;

            if (teamFilter) {
                filteredEqs = equipments.filter(eq => (eq.grupo || '') === teamFilter);
                const codes = new Set(filteredEqs.map(eq => String(eq.codigo)).filter(Boolean));
                teamComOS   = new Set([...equipamentosComOS].filter(c => codes.has(c)));
                filteredOS  = ordensServico.filter(os => {
                    const cod = (os.codigoEquip || '').split(' - ')[0].trim();
                    return codes.has(cod);
                });
            }

            if (osAbertasEl) osAbertasEl.textContent = filteredOS.length;
            if (equipOkEl)   equipOkEl.textContent   = Math.max(0, filteredEqs.length - teamComOS.size);
            if (equipOsEl)   equipOsEl.textContent   = teamComOS.size;
        }

        // ================================================================
        // DONUT CARDS
        // ================================================================
        function buildDonutCardHTML(cfg) {
            const radius = 44;
            const circ   = 2 * Math.PI * radius;
            const segs   = cfg.segments || [];
            let offset   = 0;

            const rings = segs.map(seg => {
                const pct = seg.percent || 0;
                if (pct <= 0) return '';
                const len  = (pct / 100) * circ;
                const dash = `${len.toFixed(2)} ${(circ - len).toFixed(2)}`;
                const off  = (-offset).toFixed(2);
                offset += len;
                return `<circle class="donut-seg" cx="60" cy="60" r="${radius}"
                    stroke="${seg.color}" stroke-width="13" fill="none"
                    stroke-dasharray="${dash}" stroke-dashoffset="${off}"></circle>`;
            }).join('');

            const legend = segs.map(seg => `
                <div class="donut-legend-row">
                    <div class="donut-legend-left">
                        <span class="donut-dot" style="background:${seg.color};"></span>
                        <span class="donut-legend-name">${seg.label}</span>
                    </div>
                    <div class="donut-legend-right">
                        <span class="donut-val" style="color:${seg.color};">${seg.value}</span>
                        <span class="donut-pct">${seg.pct}</span>
                    </div>
                </div>`).join('');

            return `<div class="donut-card" data-donut-id="${cfg.id}">
                <div class="donut-chart-wrapper">
                    <svg viewBox="0 0 120 120">
                        <circle class="donut-ring-track" cx="60" cy="60" r="${radius}" stroke-width="13" fill="none"></circle>
                        ${rings}
                    </svg>
                    <div class="donut-center">
                        <div class="donut-value">${cfg.centerValue}${cfg.centerSuffix || '%'}</div>
                        <div class="donut-label">${cfg.centerLabel || 'disp.'}</div>
                    </div>
                </div>
                <div class="donut-legend-area">
                    <div class="donut-header-title">${cfg.title}</div>
                    <div class="donut-legend-rows">${legend}</div>
                    <div class="donut-total-row">
                        <span class="donut-total-label">${cfg.totalLabel || 'Total registrado'}</span>
                        <span class="donut-total-val">${cfg.totalValue || '—'}</span>
                    </div>
                </div>
            </div>`;
        }

        // ================================================================
