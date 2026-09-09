        // INSTALAÇÃO DO APLICATIVO CELULAR (PWA)
        // ================================================================
        let deferredPwaPrompt = null;

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPwaPrompt = e;
            showPwaInstallPrompt();
        });

        function isAppInstalled() {
            return (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true);
        }

        function showPwaInstallPrompt() {
            if (isAppInstalled()) return;
            const dismissed = localStorage.getItem('sf_pwa_dismissed');
            if (dismissed && (Date.now() - parseInt(dismissed, 10)) < 24 * 3600 * 1000) {
                const headerBtn = document.getElementById('btnHeaderInstallPwa');
                if (headerBtn) headerBtn.style.display = 'inline-flex';
                return;
            }

            setTimeout(() => {
                const banner = document.getElementById('pwaInstallBanner');
                if (banner) banner.classList.remove('hidden');
                const headerBtn = document.getElementById('btnHeaderInstallPwa');
                if (headerBtn) headerBtn.style.display = 'inline-flex';
            }, 1800);
        }

        async function triggerPwaInstall() {
            const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
            if (isIOS) {
                const modal = document.getElementById('iosInstallModal');
                if (modal) modal.classList.add('active');
                return;
            }

            if (deferredPwaPrompt) {
                try {
                    deferredPwaPrompt.prompt();
                    const choiceResult = await deferredPwaPrompt.userChoice;
                    if (choiceResult && choiceResult.outcome === 'accepted') {
                        dismissPwaBanner();
                    }
                    deferredPwaPrompt = null;
                } catch(e) {
                    dismissPwaBanner();
                }
            } else {
                try {
                    if (window.installPwaApp) {
                        window.installPwaApp();
                    }
                } catch(e) {}
                dismissPwaBanner();
            }
        }

        function dismissPwaBanner() {
            const banner = document.getElementById('pwaInstallBanner');
            if (banner) banner.classList.add('hidden');
            localStorage.setItem('sf_pwa_dismissed', Date.now().toString());
        }

        function initPwaInstall() {
            document.getElementById('btnPwaInstallNow')?.addEventListener('click', triggerPwaInstall);
            document.getElementById('btnHeaderInstallPwa')?.addEventListener('click', triggerPwaInstall);
            document.getElementById('btnPwaDismiss')?.addEventListener('click', dismissPwaBanner);

            if ('serviceWorker' in navigator) {
                const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                if (isLocal) {
                    navigator.serviceWorker.getRegistrations().then(registrations => {
                        for (let registration of registrations) {
                            registration.unregister();
                        }
                    });
                } else {
                    navigator.serviceWorker.register('./sw.js').then(reg => {
                        console.log('Service Worker PWA registrado:', reg.scope);
                    }).catch(err => {
                        console.warn('Alerta SW PWA:', err);
                    });
                }
            }

            if (!isAppInstalled()) {
                showPwaInstallPrompt();
            }
        }

        // ================================================================
