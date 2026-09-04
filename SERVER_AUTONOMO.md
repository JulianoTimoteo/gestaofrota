# Guia de Autonomia do Servidor SimpleFarm Integration

Para que o servidor funcione **100% livremente e independente de notebook**, siga este guia.

---

## 1. Por que o servidor ficava offline?

1. **Execucao Manual no Terminal**: O backend estava sendo iniciado manualmente via terminal (`python app.py`) em um notebook. Quando o notebook era fechado, entrava em modo de espera (sleep) ou desconectava do Wi-Fi, o processo era encerrado.
2. **Falta de Servico em Segundo Plano**: Nao havia um agendamento ou servico de sistema registrado no Windows para manter a aplicacao rodando 24 horas por dia.
3. **Bloqueio por USB/ADB (Solucionado)**: O sistema tentava fazer sync via ADB com timeout longo se o dispositivo nao estivesse conectado. Adicionamos checagem ultra-rapida (2s) de ADB.

---

## 2. Como Rodar em Segundo Plano (Sem Janela e Autonomo)

Foram criados scripts prontos na pasta `scripts/`:

### A) Iniciar Rapidamente em Background (Oculto)
Basta dar duplo clique no arquivo:
```text
scripts/run_background.vbs
```
Isso inicia o servidor invisivel em segundo plano com **loop de autorrecuperacao** (se o processo cair, ele reinicia automaticamente apos 5s).

### B) Instalar para Iniciar Automaticamente no Boot do Windows (Recomendado)
Abra o PowerShell como Administrador na raiz do projeto e execute:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install_windows_task.ps1
```
Isso registra a tarefa no **Agendador de Tarefas do Windows** (Task Scheduler) para rodar na inicializacao do sistema, mesmo sem nenhum usuario logado na tela.

---

## 3. Recomendacao para Servidor Dedicado (Usina)

Para independencia total:
1. Copie esta pasta do projeto para um **computador fixo / servidor da usina** que permaneca ligado 24/7.
2. Execute o script `install_windows_task.ps1`.
3. Certifique-se de que a porta `8000` esteja liberada no firewall do Windows:
   ```powershell
   New-NetFirewallRule -DisplayName "SimpleFarm Server" -Direction Inbound -Protocol TCP -LocalPort 8000 -Action Allow
   ```
