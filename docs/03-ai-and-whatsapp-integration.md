# Coliseu ERP — Documentação de IA & WhatsApp Gateway (Fase 3)

**Data de Implementação:** 14/08/2026  
**Versão:** 1.0  
**Status:** Implementado  

---

## 1. Visão Geral do WhatsApp Gateway & IA

Inspirado na arquitetura do `SaudeFinancas`, a Fase 3 dota o **Coliseu ERP** de capacidade de comunicação ativa via WhatsApp:
- Envio de comprovantes de venda, orçamentos e boletos.
- Alertas automáticos para gestores (fechamento de caixa, ruptura de estoque, NF-e rejeitada).
- Cobrança proativa respeitando réguas de vencimento de clientes.
- Atendimento e consulta de estoque/preços diretamente via mensagem.

---

## 2. Arquitetura do Módulo WhatsApp (`whatsapp_config`)

### Schema de Dados
```sql
CREATE TABLE IF NOT EXISTS whatsapp_config (
    id TEXT PRIMARY KEY NOT NULL,
    device_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    x_sync_status TEXT NOT NULL DEFAULT 'pending',
    x_version INTEGER NOT NULL DEFAULT 1,
    is_deleted INTEGER NOT NULL DEFAULT 0,

    filial_id TEXT NOT NULL REFERENCES filiais(id),
    session_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'DISCONNECTED', -- 'CONNECTED', 'DISCONNECTED', 'QRCODE'
    api_url TEXT,
    api_key_encrypted TEXT,
    phone_number TEXT,
    auto_reply_enabled INTEGER NOT NULL DEFAULT 0,
    webhook_secret TEXT
);
```

---

## 3. Fluxo de Envio e Recebimento

```text
┌────────────────────────┐      ┌─────────────────────────┐      ┌───────────────────────┐
│ GESTOR / CLIENTE       │ ◄──► │ WHATSAPP GATEWAY (RUST) │ ◄──► │ EVOLUTION / META API  │
│ (WhatsApp Celular)     │      │ (Coliseu AI Router)     │      │                       │
└────────────────────────┘      └────────────┬────────────┘      └───────────────────────┘
                                             │
                                             ▼
                               ┌───────────────────────────┐
                               │ BASE LOCAL SQLCIPHER      │
                               │ (Logs & Vendas & Contas)  │
                               └───────────────────────────┘
```

---

## 4. Endpoints IPC Tauri

- `get_whatsapp_config(filial_id)`: Retorna o status da conexão WhatsApp.
- `salvar_whatsapp_config(config)`: Salva URL da API e token encriptado.
- `enviar_mensagem_whatsapp(telefone, mensagem)`: Dispara mensagem individual.
- `enviar_relatorio_caixa_whatsapp(filial_id, telefone)`: Gera resumo financeiro do dia e envia ao gestor.
