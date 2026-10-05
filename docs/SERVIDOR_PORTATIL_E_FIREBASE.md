# Arquitetura do Servidor Portátil (Pendrive) & Nuvem Gratuita Firebase

## 1. Visão Geral
Este documento descreve a infraestrutura híbrida de sincronização e execução autônoma 24/7 desenvolvida para o **Gestão de Frota (Usina Pitangueiras)**:
1. **Versão Nuvem Gratuita (Firebase Firestore - Plano Spark)**: Permite que todos os clientes (PWA mobile e Desktop) acessem os dados consolidados da frota e ordens de serviço sem custo de hospedagem e sem necessidade de conexão direta via VPN com a rede interna da Usina.
2. **Servidor Portátil Executável para Pendrive (`GestaoFrota_Servidor.exe`)**: Executável autônomo compilado que roda em segundo plano na área de notificação do Windows (Bandeja do Sistema / System Tray), sem exigir instalação do Python ou qualquer dependência no computador de destino.

---

## 2. Versão Nuvem: Firebase Firestore (Custo Zero / Spark Plan)

### Arquitetura de Armazenamento e Limites Gratuitos
O plano Spark do Google Cloud / Firebase oferece:
- **Leituras**: 50.000 / dia gratuitas.
- **Escritas**: 20.000 / dia gratuitas.
- **Armazenamento**: 1 GB gratuito.

Para garantir que o sistema opere **100% dentro da faixa gratuita indefinidamente**:
- A sincronização completa em lote detalhada é feita em blocos de até 400 documentos por batch (respeitando a regra do Firestore de no máximo 500 operações por batch).
- Um documento especial consolidado `estado_frota/atual` armazena o resumo pré-calculado com todas as frotas ativas, contagens por equipe e estatísticas de OS críticas.
- Apenas 1 escrita consolidada é realizada por ciclo, consumindo menos de 3% da cota gratuita diária mesmo rodando 24 horas por dia (288 ciclos de 5 minutos = ~288 escritas/dia).

### Coleções no Firestore
- `ordens_servico`: Armazena os documentos individuais das ordens de serviço ativas com histórico de abertura, equipe e tempos calculados.
- `estado_frota/atual`: Documento consolidado consumido pelo Frontend PWA no GitHub Pages ou aplicativo mobile.
- `alarmes_regras`: Regras de alarme por usuário (ex: alertar se Fertirrigação < 85%).
- `alarmes_disparados`: Histórico de alertas emitidos para notificação push/sonora.

---

## 3. Servidor de Produção Portátil (Pendrive)

### Localização do Pacote
A pasta final gerada e pronta para cópia em pendrive está localizada em:
`gestaofrota/GestaoFrota_Servidor_Pendrive/`

### Conteúdo do Pacote
```
GestaoFrota_Servidor_Pendrive/
├── GestaoFrota_Servidor.exe                          # Executável principal compilado
├── Iniciar_Servidor.bat                              # Launcher com clique duplo
├── LEIA-ME_COMO_USAR.txt                             # Manual de instruções completo
├── simplefarm.db                                     # Banco de dados local SQLite (WAL)
├── osoficina-firebase-adminsdk-fbsvc-e1d1ef7a32.json # Credencial de acesso à nuvem
├── _internal/                                        # Dependências embutidas (DLLs/Python runtime)
└── Appweb/                                           # Frontend PWA completo (HTML, CSS, JS, Assets)
```

### Comportamento na Bandeja do Sistema (System Tray)
O aplicativo roda minimizado ao lado do relógio do Windows (`pystray`) com alteração dinâmica de cor do ícone em tempo real:
- 🟢 **Verde**: Servidor **ativo**, realizando raspagem de dados no SimpleFarm ou sincronizando com o Firebase Firestore.
- 🟡 **Amarelo**: Servidor em **repouso/espera**, aguardando o próximo ciclo (intervalo programado de 5 minutos).
- 🔴 **Vermelho**: Ocorreu um **erro de execução**, falha de conexão de rede ou indisponibilidade de autenticação.

### Menu de Contexto (Botão Direito no Ícone da Bandeja)
1. **Status Dinâmico**: Exibe a hora do último ciclo de sincronização e se houve sucesso ou erro.
2. **Sincronizar Agora**: Força um ciclo imediato de raspagem e atualização de dados.
3. **Sincronizar Nuvem (Firebase)**: Dispara o envio imediato dos dados do banco local para o Cloud Firestore.
4. **Abrir Painel de Gestão (Navegador)**: Abre automaticamente o navegador padrão em `http://localhost:8000`.
5. **Abrir Pasta do Servidor**: Abre o Explorer do Windows na pasta do executável.
6. **Encerrar Servidor**: Finaliza as threads, fecha as conexões com o SQLite e encerra o processo liberando a porta 8000.

---

## 4. Como Executar em Outro Computador
1. Copie a pasta `GestaoFrota_Servidor_Pendrive` para o pendrive ou diretamente para o computador de destino (ex: `C:\GestaoFrota`).
2. Dê dois cliques em `Iniciar_Servidor.bat`.
3. O ícone aparecerá instantaneamente na bandeja perto do relógio.
4. Para inicialização automática quando a máquina ligar:
   - Pressione `Win + R`, digite `shell:startup` e pressione Enter.
   - Cole um atalho de `Iniciar_Servidor.bat` nessa pasta de inicialização do Windows.

---

## 5. Garantia de Continuidade da API do GitHub
- A sincronização local continua gerando e atualizando o arquivo `Appweb/dados.json` a cada ciclo.
- A API que alimenta o GitHub Pages e os consumidores da rota estática `/dados.json` e `/api/dados` permanece **100% ativa e compatível**, sem qualquer alteração que quebre integrações existentes.
