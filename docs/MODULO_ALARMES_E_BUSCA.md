# Módulo de Alarmes por Usuário, Barra de Busca Universal e Filtros de Frota

**Data de Implementação:** 05/10/2026  
**Versão do Sistema:** Gestão de Frota v14 - API (2026_v42)  
**Autor:** Engenharia de Software Antigravity / Usina Pitangueiras  

---

## 1. Visão Geral e Objetivos do Módulo

O **Módulo de Alarmes e Monitoramento por Usuário** foi projetado para atender à necessidade crítica da gestão agrícola e automotiva de acompanhar metas de disponibilidade por equipe (ex.: manter Fertirrigação acima de 85% de disponibilidade) de forma proativa, autônoma e segura.

### Principais Pilares:
1. **Segregação Estrita por Usuário:** As regras de alarme pertencem exclusivamente ao usuário que as criou. O alarme configurado por Juliano Timóteo nunca irá acionar o celular ou painel de outro operador.
2. **Alertas Multissensoriais:** Alarme sonoro tipo sirene industrial, vibração de emergência no smartphone e notificação nativa tipo pop-up no topo da tela.
3. **Operação Contínua (App Aberto ou Fechado):** O servidor monitora continuamente as métricas a cada 30 segundos e grava disparos no banco de dados. O Service Worker e a checagem periódica garantem o disparo do alerta em qualquer estado da aplicação.
4. **Gerenciamento Descomplicado:** Interruptores liga/desliga (*toggle*) estilo iOS para pausar ou reativar regras sem precisar excluí-las, botão de teste imediato no aparelho e histórico de auditoria com data/hora de cada disparo.
5. **Barra de Pesquisa Instantânea Universal:** Localizada logo abaixo do carrossel de equipes, permitindo filtrar em tempo real qualquer informação (frota, descrição, operação, tipo e status da OS) em todas as abas.
6. **Exclusão de OUTROS da Aba Crítica `24h⚠️`:** Apenas equipamentos das equipes oficiais participam da contagem e da listagem de OS críticas com mais de 24 horas de oficina.

---

## 2. Modelagem do Banco de Dados SQLite (`simplefarm.db`)

Para suportar o módulo de alarmes com integridade relacional e auditoria completa, foram criadas três tabelas dedicadas:

```sql
-- 1. Regras de alarme cadastradas por usuário
CREATE TABLE IF NOT EXISTS alarmes_regras (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL,
    usuario_login TEXT,
    equipe TEXT NOT NULL,
    tipo_gatilho TEXT NOT NULL DEFAULT 'DISPONIBILIDADE_MENOR', -- DISPONIBILIDADE_MENOR, OS_MAIOR, etc.
    valor_limite REAL NOT NULL,                                  -- Ex: 85.0 (%)
    cooldown_minutos INTEGER DEFAULT 30,                         -- Intervalo mínimo entre disparos
    ativo INTEGER DEFAULT 1,                                     -- 1 = Ativo, 0 = Inativo (Toggle)
    som INTEGER DEFAULT 1,                                       -- 1 = Tocar sirene
    vibracao INTEGER DEFAULT 1,                                  -- 1 = Vibrar aparelho
    ultimo_disparo TEXT,                                         -- Data/hora do último disparo realizado
    criado_em TEXT DEFAULT (datetime('now', 'localtime')),
    atualizado_em TEXT DEFAULT (datetime('now', 'localtime'))
);

-- 2. Histórico e registro de auditoria de disparos de alarme
CREATE TABLE IF NOT EXISTS alarmes_historico (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    regra_id INTEGER,
    usuario_id INTEGER NOT NULL,
    equipe TEXT NOT NULL,
    mensagem TEXT NOT NULL,
    valor_registrado REAL,                                       -- Valor da métrica no momento do disparo
    data_disparo TEXT DEFAULT (datetime('now', 'localtime'))
);

-- 3. Inscrições de Web Push dos dispositivos do usuário
CREATE TABLE IF NOT EXISTS alarmes_inscricoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL,
    endpoint TEXT UNIQUE NOT NULL,
    keys_p256dh TEXT,
    keys_auth TEXT,
    user_agent TEXT,
    criado_em TEXT DEFAULT (datetime('now', 'localtime'))
);
```

---

## 3. Arquitetura do Backend (`Servidor-Banco/app.py`)

### 3.1. Identificação Segura do Usuário
A função `obter_usuario_da_requisicao()` analisa os cabeçalhos HTTP (`Authorization: Bearer <token>`, `X-User-Id`, `X-User-Token`) e cookies de sessão (`user_session`). Caso nenhum cabeçalho esteja presente em ambiente interno de desenvolvimento, adota o usuário administrador padrão (`id=1`, Juliano Timóteo), assegurando que queries nunca retornem dados cruzados entre operadores.

### 3.2. Cálculo Server-Side das Estatísticas das Equipes
A função `calcular_stats_equipes_servidor(conn)` espelha a lógica de renderização do frontend:
- Consulta frotas com OS aberta em oficina interna na tabela `ordens_servico` (`upper(status_os) = 'ABERTA' AND ativo = 1 AND tipo_oficina != 'EXTERNA'`).
- Consulta equipamentos em `equipamentos`.
- Aplica as listas de alta prioridade `C32_CAMINHOES` e `MASTER_OVERRIDES` para garantir que o agrupamento seja idêntico ao exibido nas abas da aplicação.
- Retorna total de frotas, quantidade com OS, sem OS e porcentagem de disponibilidade (`pct_disp`).

### 3.3. Ciclo de Monitoramento Contínuo em Segundo Plano
Integrado ao loop de auto-atualização do Live Tunnel (`_live_tunnel_loop`), executado a cada 30 segundos:
1. Executa `checar_regras_alarmes()`.
2. Busca todas as regras com `ativo = 1`.
3. Calcula as estatísticas das equipes.
4. Para cada regra:
   - Verifica se a disponibilidade atual violou o limite cadastrado (ex.: `< 85%`).
   - Verifica a janela de *cooldown* (evita disparos repetidos antes do tempo configurado).
   - Ao violar a regra, registra o disparo em `alarmes_historico`, atualiza `ultimo_disparo` em `alarmes_regras` e envia evento para a fila de alertas pendentes.

### 3.4. Roteamento Flask (Regra Crítica de Precedência)
> **IMPORTANTE PARA MANUTENÇÕES FUTURAS:**  
> Todas as rotas de API (`@app.route('/api/alarmes/...')`) **devem obrigatoriamente estar declaradas antes** da rota genérica `@app.route('/<path:filename>')`.  
> No Flask, o handler catch-all intercepta qualquer requisição não combinada anteriormente. Se novas rotas de API forem inseridas após o catch-all, retornarão erro 404 (`{"error": "Endpoint ... nao encontrado"}`).

### 3.5. Endpoints REST da API de Alarmes

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/alarmes/regras` | Retorna todas as regras cadastradas pelo usuário logado |
| `POST` | `/api/alarmes/regras` | Cria uma nova regra para o usuário logado |
| `PUT` | `/api/alarmes/regras/<id>` | Atualiza dados da regra ou alterna o status (`ativo`: 0 ou 1) |
| `DELETE` | `/api/alarmes/regras/<id>` | Exclui permanentemente uma regra do usuário logado |
| `GET` | `/api/alarmes/historico` | Retorna os últimos disparos registrados para o usuário |
| `POST` | `/api/alarmes/testar` | Dispara um alarme de teste imediato no aparelho com gravação em histórico |
| `GET` | `/api/alarmes/pendentes` | Retorna se há alarmes disparados nos últimos 45 segundos para tocar áudio/vibrar |
| `POST` | `/api/alarmes/inscrever-push` | Registra endpoint de notificação Web Push do navegador/dispositivo |

---

## 4. Arquitetura do Frontend (`Appweb/index.html` e `Appweb/sw.js`)

### 4.1. Sintetizador de Áudio Nativo (Web Audio API)
Para garantir máxima confiabilidade e independência de arquivos locais que poderiam falhar por bloqueio de codec, caminho relativo ou ausência de rede, foi construído um sintetizador de sirene industrial em tempo real:
- Utiliza `window.AudioContext` ou `window.webkitAudioContext`.
- Cria oscilador com modulação pulsante entre **960Hz e 770Hz** (frequências normatizadas para sirenes industriais de emergência).
- Aplica nó de ganho exponencial com decay suave para evitar estalos de áudio.

```javascript
function tocarSomSireneAlarme() {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        // Modulação de emergência (960Hz / 770Hz)
        const now = ctx.currentTime;
        osc.frequency.setValueAtTime(960, now);
        osc.frequency.setValueAtTime(770, now + 0.25);
        osc.frequency.setValueAtTime(960, now + 0.5);
        osc.frequency.setValueAtTime(770, now + 0.75);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 1.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 1.2);
    } catch (e) {
        console.warn('Web Audio indisponível:', e);
    }
}
```

### 4.2. Vibração de Emergência
Disparada no aparelho celular através da API nativa de vibração:
```javascript
if ('vibrate' in navigator) {
    navigator.vibrate([500, 250, 500, 250, 1000]); // Vibra 500ms, pausa 250ms, vibra 500ms, pausa 250ms, vibra 1s
}
```

### 4.3. Notificações Nativas e Service Worker (`sw.js`)
- Dispara notificação no topo do smartphone ou computador com ícone de alerta e tag de alarme de frota.
- O Service Worker escuta eventos `notificationclick`, trazendo a aplicação para o primeiro plano e focando automaticamente na aba `#tab-alarmes`.

### 4.4. Polling e Checagem Periódica
A função `checarAlarmesPendentesPeriodico()` roda a cada 5 segundos no frontend enquanto o aplicativo estiver aberto, verificando `/api/alarmes/pendentes`. Ao detectar um novo disparo, aciona a sirene e a vibração instantaneamente.

### 4.5. Barra de Pesquisa Instantânea Universal
- Elemento HTML `#teamSearchInput` estilizado com ícone de busca e botão de limpeza `#clearTeamSearchBtn`.
- Integrado na função `matchesEquipSearch(eq, term)`:
  - Compara código da frota, descrição do equipamento, modelo, tipo, grupo, número da OS e detalhes da operação produtiva.
- Recalcula instantaneamente os donuts de porcentagem e recria as tabelas em todas as abas das equipes e na aba 24h conforme o usuário digita.

### 4.6. Regra da Aba `24h⚠️` sem Equipe OUTROS
Na função `isEquip24h(eq)`:
```javascript
function isEquip24h(eq) {
    if (!eq) return false;
    const grp = String(eq.grupo || eq.Grupo || '').trim().toUpperCase();
    if (grp === 'OUTROS') return false; // REGRA: OUTROS não participa da aba 24h
    // ... validação de dias em oficina > 1.0 dia ...
}
```

---

## 5. Como Testar e Operar o Sistema de Alarmes

### 5.1. Teste Rápido pelo Navegador / Smartphone:
1. Abra o Gestão de Frota e acerte o login.
2. Clique na aba **<i class="fas fa-bell"></i> Alarmes** no menu superior.
3. Clique no botão **"Testar Alarme Agora"**:
   - O aparelho tocará a sirene de emergência de alta intensidade.
   - O smartphone vibrará na sequência de emergência.
   - O pop-up aparecerá na barra superior com o aviso de teste.
   - Uma nova linha será registrada na tabela de Histórico.

### 5.2. Criando uma Nova Regra:
1. Clique no botão **"+ Nova Regra"**.
2. Selecione a Equipe desejada (ex.: `FERTIRRIGACAO`, `COLHEDORAS`, `CAMINHOES`, etc.).
3. Escolha o Gatilho: `Disponibilidade MENOR que (%)` ou `Equipamentos em OS MAIOR que`.
4. Defina o Limite (ex.: `85` para 85%).
5. Defina o Intervalo entre Alertas (Cooldown em minutos, ex.: `30`).
6. Marque as opções de Som e Vibração.
7. Clique em **"Salvar Regra de Alarme"**.

### 5.3. Ligando e Desligando Regras:
- Na lista de regras, utilize o interruptor deslizante (*toggle*) ao lado de cada regra para ativá-la ou pausá-la imediatamente.

---

## 6. Procedimento de Reinicialização Segura do Servidor

Se for necessário reiniciar o serviço backend no servidor Windows:

```powershell
# 1. Localizar e encerrar instâncias anteriores na porta 8000
Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | ForEach-Object {
    if ($_.OwningProcess -ne 0) { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
}

# 2. Iniciar o servidor com Python
cd "C:\Users\julianotimoteo\OneDrive - Pitangueiras Acucar e Alcool Ltda\GESTOR FROTA\gestaofrota\Servidor-Banco"
python app.py
```
