        function getCustomEquipGroups() {
            try {
                const s = localStorage.getItem('sf_custom_equip_groups');
                if (s) return JSON.parse(s);
            } catch(e) {}
            return (EMBEDDED_INITIAL_DATA && EMBEDDED_INITIAL_DATA.adminConfig && EMBEDDED_INITIAL_DATA.adminConfig.customGroups) ? EMBEDDED_INITIAL_DATA.adminConfig.customGroups : {};
        }

        function setCustomEquipGroup(codigo, newGrupo) {
            const custom = getCustomEquipGroups();
            custom[codigo] = newGrupo;
            localStorage.setItem('sf_custom_equip_groups', JSON.stringify(custom));
            syncAdminConfigToServer();
        }

        function getCustomEquipTypes() {
            try {
                const s = localStorage.getItem('sf_custom_equip_types');
                if (s) return JSON.parse(s);
            } catch(e) {}
            return (EMBEDDED_INITIAL_DATA && EMBEDDED_INITIAL_DATA.adminConfig && EMBEDDED_INITIAL_DATA.adminConfig.customTypes) ? EMBEDDED_INITIAL_DATA.adminConfig.customTypes : {};
        }

        function setCustomEquipType(codigo, newTipo) {
            const custom = getCustomEquipTypes();
            custom[codigo] = newTipo;
            localStorage.setItem('sf_custom_equip_types', JSON.stringify(custom));
            syncAdminConfigToServer();
        }

        function getCustomEquipOps() {
            try {
                const s = localStorage.getItem('sf_custom_equip_ops');
                if (s) return JSON.parse(s);
            } catch(e) {}
            return (EMBEDDED_INITIAL_DATA && EMBEDDED_INITIAL_DATA.adminConfig && EMBEDDED_INITIAL_DATA.adminConfig.customOps) ? EMBEDDED_INITIAL_DATA.adminConfig.customOps : {};
        }

        function setCustomEquipOp(codigo, newOp) {
            const custom = getCustomEquipOps();
            custom[codigo] = newOp;
            localStorage.setItem('sf_custom_equip_ops', JSON.stringify(custom));
            syncAdminConfigToServer();
        }

        function getCustomOpTeams() {
            try {
                const s = localStorage.getItem('sf_custom_op_teams');
                if (s) return JSON.parse(s);
            } catch(e) {}
            return (EMBEDDED_INITIAL_DATA && EMBEDDED_INITIAL_DATA.adminConfig && EMBEDDED_INITIAL_DATA.adminConfig.customOpTeams) ? EMBEDDED_INITIAL_DATA.adminConfig.customOpTeams : {};
        }

        function setCustomOpTeam(codigo, team) {
            const custom = getCustomOpTeams();
            custom[String(codigo)] = team;
            localStorage.setItem('sf_custom_op_teams', JSON.stringify(custom));
            syncAdminConfigToServer();
        }

