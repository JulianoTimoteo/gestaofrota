# Ponto de Restauração — Gestão de Frota v14

**Data de Atualização:** 05/10/2026 08:50 (Horário Local)  
**Versão Atual:** `2026_v42_modulo_alarmes_ativo`  
**Tag Git:** `v14-alarmes-busca-ok`  

---

## 📌 Estado Garantido Neste Ponto de Restauração

1. **Módulo de Alarmes por Usuário**:
   - Controle de disponibilidade percentual por equipe (ex.: Fertirrigação < 85%).
   - Segregação rigorosa por usuário: regras e disparos isolados no SQLite (`usuario_id`).
   - Alertas sonoros sintetizados via Web Audio API (sirene industrial 960Hz/770Hz) sem arquivos externos.
   - Vibração de emergência no celular (`navigator.vibrate`) e notificações nativas push no Service Worker (`sw.js`).
   - Monitoramento contínuo em segundo plano no servidor Flask a cada 30 segundos.
   - Toggle liga/desliga de regras e botão de teste imediato no aparelho.

2. **Barra de Pesquisa Instantânea Universal**:
   - Posicionada abaixo do carrossel de equipes em todas as abas.
   - Filtro em tempo real por frota, descrição, operação produtiva, tipo e OS.
   - Recálculo instantâneo dos donuts e contadores conforme digitação.

3. **Exclusão de OUTROS da Aba Crítica `24h⚠️`**:
   - Equipamentos da equipe `OUTROS` são desconsiderados da listagem e do badge numérico de OS crítica.

4. **Estabilidade de Tela e Atualização Contínua**:
   - Troca de abas instantânea sem re-renderização desnecessária.
   - Temporizador de sincronização e Live Tunnel a cada 30 segundos.
   - Sessão e tokens preservados em `localStorage` e `sessionStorage`.

---

## ↺ Como Restaurar a Qualquer Momento

Se precisar voltar exatamente a este estado limpo e estável, execute no terminal:

```bash
git checkout ponto-de-restauracao -f
```

Ou para resetar o branch atual diretamente para este ponto:

```bash
git reset --hard ponto-de-restauracao
```