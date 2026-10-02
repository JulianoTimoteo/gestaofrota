# SimpleFarm Versão Desktop — Central de Ordens de Serviço (OS)

Sistema local autônomo de monitoramento, scraping e gerenciamento de Ordens de Serviço (Oficina) do SimpleFarm da Usina Pitangueiras.

---

## 🚀 Como Executar

Dê um duplo clique no arquivo:
```
iniciar_servidor.bat
```
Ou via terminal:
```powershell
cd "D:\ONEDRIVE\ROUBA INFORMAÃO\VersaoDesktop"
python app.py
```
O navegador abrirá automaticamente em: **`http://127.0.0.1:8080`**

---

## 🛠️ Arquitetura e Funcionalidades

1. **Scraper Automatizado (`scraper.py`)**:
   - Conecta diretamente ao SimpleFarm via Playwright headless (Chromium).
   - Realiza login seguro com usuário `julianotimoteo`.
   - Acessa o Painel 174 (`OsOficina - OFI 002 Demanda de OS v2`).
   - Extrai todas as 12 colunas da grade de OS (Cód. OS, Frota/CC, Oficina, Tipo Oficina, Dias de Permanência, Descrição de Serviço, etc.).
   - Ciclo de execução rápido e resiliente (~18 segundos).

2. **Banco de Dados Local SQLite (`simplefarm.db` / `database.py`)**:
   - **Tabela `ordens_servico`**: Armazena as demandas de OS ativas com deduplicação por chave primária (`cod_os`) e atualização automática (`UPSERT`).
   - **Tabela `historico_sync`**: Registra cada sincronização, duração, quantidade de OS e status.
   - Índices criados para consultas instantâneas.

3. **Dashboard Web Interativo (`app.py`)**:
   - Tema Glassmorphism Dark moderno e responsivo.
   - Indicadores numéricos em tempo real (Total Abertas, Campo, Externa, Maior Permanência).
   - Busca textual instantânea e filtros por oficina.
   - Botão **Sincronizar Agora** para disparar o robô sob demanda com retorno visual.
   - Exportação direta para planilha Excel (`.xlsx`).
   - Visualização da captura de tela de auditoria original do SimpleFarm (`/screenshot`).

4. **Agendador Contínuo**:
   - Loop em background que sincroniza automaticamente a cada **10 minutos** sem travar o servidor.

---

## 📡 Rotas da API REST

- `GET /api/status`: Retorna as métricas consolidadas e status do robô.
- `GET /api/os`: Retorna a lista completa de OS em formato JSON (suporta parâmetros `busca` e `tipo_oficina`).
- `POST /api/sync`: Dispara uma sincronização manual em segundo plano.
- `GET /api/historico`: Retorna o log das últimas sincronizações.
- `GET /api/exportar/excel`: Gera e faz download imediato da planilha Excel.
- `GET /screenshot`: Exibe o screenshot da tela original capturada no último ciclo.
