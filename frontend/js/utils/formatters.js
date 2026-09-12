        // NORMALIZAÇÃO DE TIPO E EQUIPES PERSONALIZADAS
        // ================================================================
        const LISTA_TIPOS_PADRAO = [
            'Trator',
            'Caminhão',
            'Motobomba',
            'Uniport',
            'Pá carregadeira',
            'Motoniveladora',
            'Colhedora',
            'Pulverizador',
            'Escavadeira',
            'Veículo Utilitário',
            'Outros'
        ];

        function normalizarTipo(tipoRaw, descRaw = '', modeloRaw = '') {
            const text = `${tipoRaw || ''} ${descRaw || ''} ${modeloRaw || ''}`.toUpperCase();
            if (text.includes('MOTOBOMBA') || text.includes('MOTO BOMBA') || text.includes('BOMBA')) return 'Motobomba';
            if (text.includes('TRATOR')) return 'Trator';
            if (text.includes('CAMINHÃO') || text.includes('CAMINHAO')) return 'Caminhão';
            if (text.includes('UNIPORT')) return 'Uniport';
            if (text.includes('CARREGADEIRA')) return 'Pá carregadeira';
            if (text.includes('MOTONIVELADORA')) return 'Motoniveladora';
            if (text.includes('COLHEDORA') || text.includes('COLHEITADEIRA')) return 'Colhedora';
            if (text.includes('PULVERIZADOR')) return 'Pulverizador';
            if (text.includes('ESCAVADEIRA')) return 'Escavadeira';
            if (tipoRaw && tipoRaw.trim()) {
                const clean = tipoRaw.trim();
                if (clean.length <= 18) {
                    return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
                }
            }
            return 'Outros';
        }

        function normalizarNomeEquipe(nome) {
            if (!nome) return 'PREPARO';
            const clean = String(nome).toUpperCase().trim()
                .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            if (clean.includes('COLHED') || clean.includes('COLHEIT')) return 'COLHEDORA';
            if (clean.includes('CAMINH') || clean.includes('CAVALO')) return 'CAMINHOES';
            if (clean.includes('BIOMASS')) return 'BIOMASSA';
            if (clean.includes('FERT')) return 'FERTIRRIGACAO';
            if (clean.includes('HERB')) return 'HERBICIDA';
            if (clean.includes('AMAREL')) return 'LINHA AMARELA';
            if (clean.includes('PREPAR')) return 'PREPARO';
            if (clean.includes('TRATO')) return 'TRATOS CULTURAIS';
            return clean;
        }

        async function syncAdminConfigToServer() {
            if (isStaticGitHubPages()) return;
            const payload = {
                customGroups: getCustomEquipGroups(),
                customTypes: getCustomEquipTypes(),
                customOps: getCustomEquipOps(),
                customOpTeams: getCustomOpTeams()
            };
            try {
                await fetch(`${API_BASE}/api/config/admin`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify(payload)
                }).catch(() => null);
            } catch(e) {}
        }

        function formatarOp(op) {
            if (!op) return '';
            if (typeof op === 'string') return op;
            const cod  = op.codigo || op['Código'] || op.codigoOperacao || '';
            const desc = op.descricao || op['Descrição'] || op.tipoOperacao || '';
            if (cod && desc) return `${cod} - ${desc}`;
            return desc || cod || '101 - PREPARO DE SOLO';
        }

        function getOpTeam(op) {
            if (!op) return '-';
            const codStr = String(op.codigo || '').trim();
            const descStr = String(op.descricao || '').trim().toLowerCase();

            // 1. Equipe personalizada manualmente via localStorage ou server JSON
            const custom = getCustomOpTeams();
            if (codStr && custom[codStr]) return custom[codStr];

            // 2. Propriedade direta de equipe do objeto
            if (op.equipe && op.equipe !== '-' && op.equipe.trim() !== '') return op.equipe;

            // 3. Mapeamento por Código Exato (Usina Pitangueiras)
            const codeTeamMap = {
                // HERBICIDA
                '1031': 'HERBICIDA', '1032': 'HERBICIDA', '1064': 'HERBICIDA', '1078': 'HERBICIDA',
                '1079': 'HERBICIDA', '1090': 'HERBICIDA', '1091': 'HERBICIDA', '1105': 'HERBICIDA',
                '1107': 'HERBICIDA', '5001': 'HERBICIDA', '5003': 'HERBICIDA', '5005': 'HERBICIDA',

                // FERTIRRIGACAO
                '1026': 'FERTIRRIGACAO', '1028': 'FERTIRRIGACAO', '1029': 'FERTIRRIGACAO', '1030': 'FERTIRRIGACAO',
                '1033': 'FERTIRRIGACAO', '1034': 'FERTIRRIGACAO', '1050': 'FERTIRRIGACAO', '1068': 'FERTIRRIGACAO',
                '1070': 'FERTIRRIGACAO', '1071': 'FERTIRRIGACAO', '1072': 'FERTIRRIGACAO', '1076': 'FERTIRRIGACAO',
                '1082': 'FERTIRRIGACAO', '1084': 'FERTIRRIGACAO', '1089': 'FERTIRRIGACAO', '1092': 'FERTIRRIGACAO',
                '1094': 'FERTIRRIGACAO', '1102': 'FERTIRRIGACAO', '2018': 'FERTIRRIGACAO', '2020': 'FERTIRRIGACAO',
                '2042': 'FERTIRRIGACAO', '3063': 'FERTIRRIGACAO', '3083': 'FERTIRRIGACAO', '3084': 'FERTIRRIGACAO',
                '3087': 'FERTIRRIGACAO', '4017': 'FERTIRRIGACAO', '4018': 'FERTIRRIGACAO', '4024': 'FERTIRRIGACAO',
                '6003': 'FERTIRRIGACAO', '6004': 'FERTIRRIGACAO', '6005': 'FERTIRRIGACAO',

                // LINHA AMARELA
                '1002': 'LINHA AMARELA', '1003': 'LINHA AMARELA', '1005': 'LINHA AMARELA', '1042': 'LINHA AMARELA',
                '1056': 'LINHA AMARELA', '1083': 'LINHA AMARELA', '1086': 'LINHA AMARELA',

                // TRATOS CULTURAIS
                '1006': 'TRATOS CULTURAIS', '1007': 'TRATOS CULTURAIS', '1008': 'TRATOS CULTURAIS', '1009': 'TRATOS CULTURAIS',
                '1022': 'TRATOS CULTURAIS', '1041': 'TRATOS CULTURAIS', '1044': 'TRATOS CULTURAIS', '1045': 'TRATOS CULTURAIS',
                '1046': 'TRATOS CULTURAIS', '1047': 'TRATOS CULTURAIS', '1048': 'TRATOS CULTURAIS', '1074': 'TRATOS CULTURAIS',
                '1081': 'TRATOS CULTURAIS', '1096': 'TRATOS CULTURAIS',

                // PREPARO
                '1001': 'PREPARO', '1004': 'PREPARO', '1011': 'PREPARO', '1013': 'PREPARO',
                '1014': 'PREPARO', '1015': 'PREPARO', '1016': 'PREPARO', '1018': 'PREPARO',
                '1019': 'PREPARO', '1020': 'PREPARO', '1023': 'PREPARO', '1025': 'PREPARO',
                '1039': 'PREPARO', '1057': 'PREPARO', '1058': 'PREPARO',

                // BIOMASSA
                '1024': 'BIOMASSA', '1052': 'BIOMASSA', '1061': 'BIOMASSA', '2006': 'BIOMASSA',
                '2007': 'BIOMASSA', '2030': 'BIOMASSA', '2031': 'BIOMASSA', '2032': 'BIOMASSA',
                '3051': 'BIOMASSA', '3053': 'BIOMASSA', '3054': 'BIOMASSA', '3055': 'BIOMASSA',
                '3060': 'BIOMASSA', '4001': 'BIOMASSA', '4002': 'BIOMASSA', '4006': 'BIOMASSA',
                '4008': 'BIOMASSA', '4009': 'BIOMASSA', '4010': 'BIOMASSA', '4011': 'BIOMASSA',
                '4012': 'BIOMASSA', '4013': 'BIOMASSA', '4015': 'BIOMASSA', '4016': 'BIOMASSA',
                '4021': 'BIOMASSA', '4022': 'BIOMASSA'
            };

            if (codeTeamMap[codStr]) return codeTeamMap[codStr];

            // 4. Fallback por Palavras-Chave Específicas
            if (descStr.includes('colhedora') || descStr.includes('colheita')) return 'COLHEDORA';
            if (descStr.includes('caminhão') || descStr.includes('caminhao') || descStr.includes('cavalo mecanico') || descStr.includes('transporte de cana')) return 'CAMINHOES';
            if (descStr.includes('herbicida') || descStr.includes('defensiv') || descStr.includes('inseticida') || descStr.includes('fungicida') || descStr.includes('catacao') || descStr.includes('dessecacao') || descStr.includes('drench')) return 'HERBICIDA';
            if (descStr.includes('vinhaça') || descStr.includes('vinhaca') || descStr.includes('fertilizante') || descStr.includes('fertirrigacao') || descStr.includes('adubação') || descStr.includes('adubacao') || descStr.includes('gesso') || descStr.includes('calcario') || descStr.includes('compostagem') || descStr.includes('torta') || descStr.includes('fosfato')) return 'FERTIRRIGACAO';
            if (descStr.includes('preparo') || descStr.includes('aração') || descStr.includes('aracao') || descStr.includes('subsolagem') || descStr.includes('sulcação') || descStr.includes('sulcacao') || descStr.includes('terraceamento') || descStr.includes('gradagem') || descStr.includes('curva') || descStr.includes('soqueira') || descStr.includes('quebra de lombo') || descStr.includes('aceiro')) return 'PREPARO';
            if (descStr.includes('corte mecanizado') || descStr.includes('transbordo') || descStr.includes('biomassa') || descStr.includes('enfardamento') || descStr.includes('balanca') || descStr.includes('furador') || descStr.includes('mesa')) return 'BIOMASSA';
            if (descStr.includes('linha amarela') || descStr.includes('terraplanagem') || descStr.includes('escavadeira') || descStr.includes('estrada') || descStr.includes('aterro') || descStr.includes('rolo compactador') || descStr.includes('sistematizacao')) return 'LINHA AMARELA';
            if (descStr.includes('tratos') || descStr.includes('cultivo') || descStr.includes('plantio') || descStr.includes('roçadeira') || descStr.includes('rocadeira') || descStr.includes('muda') || descStr.includes('silagem') || descStr.includes('canterizador') || descStr.includes('cinturando') || descStr.includes('citrus')) return 'TRATOS CULTURAIS';

            return 'PREPARO';
        }

        function getTeamDefaultOp(grupo) {
            const map = {
                'BIOMASSA': '4001 - Corte Mecanizado De Cana Crua',
                'CAMINHOES': '3083 - Transporte de Vinhaca Carreg',
                'COLHEDORA': '4001 - Corte Mecanizado De Cana Crua',
                'FERTIRRIGACAO': '1068 - Aplicacao De Vinhaca Localizada',
                'HERBICIDA': '1031 - Aplicacao de Herbicida',
                'LINHA AMARELA': '1003 - Conservacao De Estradas',
                'PREPARO': '1001 - Terraceamento',
                'TRATOS CULTURAIS': '1044 - Plantio Mecanizado'
            };
            return map[grupo] || '1001 - Terraceamento';
        }

        function isOperacaoProdutiva(op) {
            if (!op) return false;
            const status = String(op.status || '').toUpperCase();
            if (status === 'INATIVO' || status === 'INATIVA') return false;

            const grupo = String(op.grupoOperacao || op.grupo || '').toUpperCase();
            const tipo  = String(op.tipoOperacao || op.tipo || '').toUpperCase();
            const corp  = String(op.corporativo || '').toUpperCase();
            const desc  = String(op.descricao || '').toUpperCase();

            // Excluir explicitamente improdutivas, manutenção, clima, faltas, testes e indeterminados
            if (grupo.includes('IMPRODUTIVA') || tipo.includes('IMPRODUTIVA') ||
                tipo.includes('MANUTENÇÃO') || grupo.includes('MANUTENÇÃO') ||
                tipo.includes('CLIMA') || tipo.includes('FALTA') ||
                grupo.includes('INDETERMINADO') || tipo.includes('INDETERMINADO') ||
                desc.includes('INDETERMINADO') || desc.includes('OPERAÇÃO TESTE') || desc.includes('OPERACAO TESTE')) {
                return false;
            }

            // Apenas operações produtoras válidas
            if (grupo.includes('PRODUTIVA') || tipo.includes('PRODUTIVA') || corp.includes('PRODUTIVA') || tipo.includes('AUXILIAR')) {
                return true;
            }

            return false;
        }

        // ================================================================
        // VERIFICAR EQUIPAMENTOS EM OS > 24 HORAS
        // ================================================================
        function getEquipPermanenciaDias(eq) {
            if (!eq || !eq.codigo) return 0;
            const codStr = String(eq.codigo).trim();

            const osMatches = ordensServico.filter(os => {
                const osCod = (os.codigoEquip || os.codigo_equip || '').split(' - ')[0].trim();
                return osCod === codStr;
            });

            let maxDias = 0;

            if (osMatches.length > 0) {
                for (const os of osMatches) {
                    let dias = parseFloat(String(os.diasPermanencia || os.dias_permanencia || 0).replace(',', '.'));
                    if (isNaN(dias)) dias = 0;

                    if (dias <= 0) {
                        const dataEnt = os.dataEntrada || os.data_entrada;
                        if (dataEnt) {
                            const entDate = new Date(dataEnt);
                            if (!isNaN(entDate.getTime())) {
                                dias = (new Date() - entDate) / (1000 * 60 * 60 * 24);
                            }
                        }
                    }

                    if (dias > maxDias) maxDias = dias;
                }
            }

            if (maxDias === 0 && eq.diasOS) {
                const d = parseFloat(String(eq.diasOS).replace(',', '.'));
                if (!isNaN(d)) maxDias = d;
            }

            return maxDias;
        }

        function isEquip24h(eq) {
            return getEquipPermanenciaDias(eq) >= 1.0;
        }

        // ================================================================
