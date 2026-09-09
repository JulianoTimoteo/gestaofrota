        // ================================================================
        // ESTADO GLOBAL — única fonte da verdade
        // ================================================================
        let authToken    = localStorage.getItem('sf_auth_token') || sessionStorage.getItem('sf_auth_token') || '';
        let userRole     = localStorage.getItem('sf_auth_role')  || sessionStorage.getItem('sf_auth_role') || 'admin';
        let equipments   = [];
        let operacoes    = [];
        let ordensServico = [];
        let equipamentosComOS = new Set();
        let equipFiltroEquipe = 'TODAS';
        let isSyncing    = false;
        let syncTimer    = null;

        // Aba ativa — gerenciada em memória (não força re-render ao recarregar dados)
        let activeMainTab    = localStorage.getItem('sf_active_tab')          || 'tab-admin';
        let activeAdminSub   = localStorage.getItem('sf_active_admin_subtab') || 'tab-equipamentos';
        let activeTeam       = localStorage.getItem('sf_active_team')         || null;

        const ADMIN_ROLES = ['admin', 'master'];

