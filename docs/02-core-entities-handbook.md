# Coliseu ERP — Documentação dos Cadastros Core & Centro de Comando (Fase 2)

**Data de Implementação:** 14/08/2026  
**Versão:** 1.0  
**Status:** Implementado  

---

## 1. Visão Geral dos Cadastros Fundamentais

A Fase 2 estrutura os cadastros centrais que alimentam todos os módulos operacionais do Coliseu ERP (Comercial, Estoque, Financeiro e Fiscal), com suporte nativo a multi-empresa e multi-filial.

---

## 2. Centro de Comando do Cliente (Ficha 360° — Handbook §18)

Diferente de um cadastro tradicional simples, a ficha do cliente no Coliseu funciona como um **Centro de Comando 360°**:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ 👤 JOÃO DA SILVA (CPF: 123.456.789-00)                                       │
│ Classificação: CLIENTE VIP  | Score: 850 | Limite: R$ 15.000,00 (Disp: R$ 8.200)│
├─────────────────────────────────────────────────────────────────────────────┤
│ [Resumo] [Compras] [Financeiro] [Pedidos] [Veículos] [Interações IA]       │
├─────────────────────────────────────────────────────────────────────────────┤
│ • Total Comprado (12m): R$ 42.500,00                                         │
│ • Ticket Médio: R$ 850,00                                                   │
│ • Dias Médios de Atraso: 0 dias (Pagador Pontual)                           │
│ • Sugestão IA: Cliente propenso a renovação de frota de pneus este mês.    │
└─────────────────────────────────────────────────────────────────────────────┘
```

Abas integradas:
1. **Resumo & Dados Cadastrais**: Dados gerais, CPF/CNPJ, regime fiscal, score e limites.
2. **Histórico de Compras**: Linha do tempo de todas as vendas e itens adquiridos.
3. **Situação Financeira**: Contas em aberto, limite disponível e cobranças.
4. **Veículos & Ativos**: Veículos vinculados (placa, modelo, ano) para oficinas/auto-peças.
5. **Insights de Inteligência (IA)**: Recomendações automáticas de follow-up.

---

## 3. Multi-Empresa & Multi-Filial (Handbook §64)

- Toda transação é isolada por `empresa_id` e `filial_id`.
- Permite que um grupo empresarial opere múltiplas lojas e depósitos no mesmo banco local com sincronização seletiva.

---

## 4. Tributação Dinâmica & Reforma Tributária (LC 214/2025)

Os produtos e regras tributárias possuem campos nativos para a nova reforma tributária brasileira:
- **CBS (Contribuição sobre Bens e Serviços)**: Alíquota de teste (ex: 0,9%).
- **IBS (Imposto sobre Bens e Serviços)**: Alíquota estadual/municipal de teste (ex: 0,1%).
- **cClassTrib**: Código de Classificação Tributária para serviços e mercadorias.
