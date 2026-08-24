# Coliseu ERP — Documentação do Módulo Comercial & CRM Pipeline (Fase 4)

**Data de Implementação:** 14/08/2026  
**Versão:** 1.0  
**Status:** Implementado  

---

## 1. Visão Geral do Módulo Comercial

A Fase 4 consolida a esteira comercial do **Coliseu ERP**, cobrindo desde a prospecção do Lead no Pipeline Kanban até o fechamento da venda, emissão da nota fiscal e envio automático do comprovante por WhatsApp.

---

## 2. Pipeline Visual Kanban (CRM — Handbook §20)

Estágios do Funil de Vendas:
```text
┌─────────────────┬──────────────────┬──────────────────┬──────────────────┬─────────────────┐
│     NOVO        │   QUALIFICAÇÃO   │     PROPOSTA     │    NEGOCIAÇÃO    │     GANHO       │
├─────────────────┼──────────────────┼──────────────────┼──────────────────┼─────────────────┤
│ • Cliente Alfa  │ • Cliente Beta   │ • Grupo Delta    │ • Empresa Sigma  │ • Venda #1042   │
│   R$ 5.000,00   │   R$ 12.000,00   │   R$ 45.000,00   │   R$ 8.500,00    │   R$ 15.000,00  │
└─────────────────┴──────────────────┴──────────────────┴──────────────────┴─────────────────┘
```

---

## 3. Conversão Orçamento → Pedido → Faturamento

1. **Orçamento**: Registro de proposta comercial com itens, tabelas de preço e validade.
2. **Pedido de Venda**: Aprovação pelo cliente com reserva de estoque imediata (`domain/sales.rs`).
3. **Faturamento**: Emissão de NF-e (Mod 55), NFC-e (Mod 65) ou NFS-e em 1 clique com autorização SEFAZ.

---

## 4. Agente Comercial de IA (Handbook §21)

O **Agente Comercial** atua integrado à Command Bar e ao Dashboard:
- Analisa a probabilidade de fechamento das oportunidades no Kanban.
- Sugere follow-ups para orçamentos parados há mais de 3 dias.
- Gera rascunhos de proposta comercial prontos para envio por WhatsApp.
