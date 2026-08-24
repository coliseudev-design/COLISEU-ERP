# 08 — EVENT ARCHITECTURE

## Arquitetura Orientada a Eventos de Domínio (§30-33)

Eventos são fatos imutáveis emitidos pelo domínio Rust e propagados de forma assíncrona.

```json
{
  "name": "OrderApproved.v1",
  "version": 1,
  "timestamp": "2026-08-14T14:20:00Z",
  "tenant": { "empresa_id": "emp_01", "filial_id": "fil_01" },
  "entityId": "ped_19382",
  "actor": "user_carlos",
  "correlationId": "corr_9a8b7c6d5e",
  "payload": {
    "total": 18420.00,
    "cliente_id": "cli_01",
    "forma_pagamento": "PIX"
  }
}
```

### Eventos do Sistema
- `CustomerCreated.v1`: Dispara verificação de limite de crédito.
- `OrderApproved.v1`: Dispara reserva de estoque e faturamento fiscal.
- `PaymentReceived.v1`: Atualiza saldo bancário e liquida título financeiro.
- `InvoiceIssued.v1`: Dispara envio automático de DANFE PDF e XML via WhatsApp.
