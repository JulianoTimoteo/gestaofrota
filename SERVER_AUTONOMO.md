# Guia de Autonomia do Servidor SimpleFarm Integration

O servidor roda **100% no notebook** (ou PC fixo). O tablet acessa via **Wi-Fi ou 4G** apontando para o IP do computador. **O cabo USB não é necessário para nada.**

---

## Por que o servidor ficava offline após reiniciar?

Foram identificadas e corrigidas **3 causas raiz**:

| # | Problema | Status |
|---|----------|--------|
| 1 | `start_server.bat` só iniciava o Python, esquecia o Node.js (porta 3000) | ✅ Corrigido |
| 2 | Nenhuma tarefa agendada no Windows Task Scheduler | ✅ Corrigido |
| 3 | Sem watchdog para reiniciar se um dos servidores caísse | ✅ Corrigido |

---

## Como Instalar (Uma Única Vez)

### Passo 1 — Clique com botão DIREITO e execute como Administrador:

```
scripts\INSTALAR_SERVIDOR.bat
```

O instalador irá:
- ✅ Verificar Node.js e Python
- ✅ Instalar todas as dependências automaticamente
- ✅ Registrar os servidores no **Agendador de Tarefas do Windows** (boot automático)
- ✅ Registrar o **Watchdog** (verifica e reinicia a cada 5 minutos)
- ✅ Liberar as portas **3000** e **8000** no Firewall
- ✅ Exibir o IP do computador para você anotar

### Passo 2 — Configure o tablet

No navegador do tablet, acesse:
```
http://IP_DO_COMPUTADOR:3000
```

> **Exemplo**: Se o IP do computador for `192.168.1.50`, acesse `http://192.168.1.50:3000`

### Passo 3 — Desconecte o cabo USB

O sistema funciona 100% via Wi-Fi. O cabo USB era usado apenas para ADB (sincronização de banco), que **já está desativado** (`TABLET_DB_ENABLED = False`).

---

## Portas Utilizadas

| Porta | Serviço | Descrição |
|-------|---------|-----------|
| **3000** | Node.js (Frontend) | Serve o `index.html` para o tablet |
| **8000** | Python (Backend API) | API REST + acesso ao banco SQLite |

---

## Arquitetura do Sistema

```
┌─────────────────────────────────────────────────┐
│         NOTEBOOK / PC (Windows)                 │
│                                                 │
│  ┌─────────────────┐   ┌─────────────────────┐  │
│  │  Python Flask   │   │   Node.js Express   │  │
│  │   porta 8000    │◄──│    porta 3000       │  │
│  │   (API + DB)    │   │  (Proxy + Frontend) │  │
│  └────────┬────────┘   └──────────┬──────────┘  │
│           │                       │             │
│    meus_banco.db (SQLite local)   │             │
│                                   │             │
│  Agendador Windows (boot)─────────┘             │
│  Watchdog (cada 5min)                           │
└───────────────────────────┬─────────────────────┘
                            │
                    Wi-Fi / Rede Local
                            │
              ┌─────────────▼──────────────┐
              │     TABLET ANDROID         │
              │  Navegador → porta 3000    │
              │  Banco: /sdcard/ (backup)  │
              │  Rede: Wi-Fi ou 4G         │
              │  Cabo USB: NÃO NECESSÁRIO  │
              └────────────────────────────┘
```

---

## Dica Importante — IP Fixo

Se o IP do computador mudar (DHCP dinâmico), o tablet não encontra mais o servidor.

**Solução**: Configure uma **reserva de IP por MAC address** no seu roteador para que o computador sempre receba o mesmo IP. Consulte o manual do roteador ou o técnico de TI da usina.

---

## Verificação Manual

Para confirmar que os servidores estão rodando:

```powershell
# No PowerShell:
netstat -an | findstr ":3000"   # Deve aparecer "LISTENING"
netstat -an | findstr ":8000"   # Deve aparecer "LISTENING"
```

Ou acesse no próprio computador:
- http://localhost:3000 (Frontend)
- http://localhost:8000/health (API Python)

---

## Log do Watchdog

O watchdog salva um log em:
```
scripts\watchdog.log
```

Consulte este arquivo se houver problemas de disponibilidade.

---

## Reiniciar Manualmente (sem reboot)

Se precisar reiniciar os servidores agora:
1. Duplo clique em `scripts\run_background.vbs`

OU via Task Scheduler:
```powershell
Start-ScheduledTask -TaskName "SimpleFarm_Integration_Server"
```
