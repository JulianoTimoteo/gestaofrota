# Ponto de Restauração — Gestão de Frota v14

**Data de Criação:** 04/09/2026 12:52 (Horário Local)  
**Tag Git:** `ponto-de-restauracao`  
**Commit Hash:** Initial Commit (`68d1b76`)

---

## 📌 Estado Garantido Neste Ponto de Restauração

1. **Estabilidade de Tela e Troca de Abas**:
   - Troca de abas instantânea e sem re-renderização desnecessária.
   - Navegação mantida mesmo durante atualizações em segundo plano.

2. **Temporizador de Atualização Automática (5 Minutos)**:
   - Temporizador de 300 segundos (5 minutos) com barra discreta de progresso no footer.
   - Atualizações em segundo plano sem deslogar o usuário ou resetar o scroll da tela.

3. **Correção de Autenticação / Biometria**:
   - Login por biometria e formulário operando com armazenamento persistente em `localStorage` e suporte a `sessionStorage`.
   - Token JWT / Admin devidamente preservado.

4. **Integração com API Backend**:
   - Carregamento de todos os 64 equipamentos e ordens de serviço.
   - `statusOS` e badges calculados diretamente da API.

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