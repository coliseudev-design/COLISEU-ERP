# Coliseu ERP — Documentação Financeira & Cobrança Inteligente (Fase 6)

**Data de Implementação:** 14/08/2026  
**Versão:** 1.0  
**Status:** Implementado  

---

## 1. Visão Geral do Módulo Financeiro

A Fase 6 dota o **Coliseu ERP** de gestão financeira avançada, cobrindo todo o ciclo do caixa até a conciliação bancária por IA e réguas automáticas de cobrança via WhatsApp.

---

## 2. DRE Gerencial & Fluxo de Caixa (`DrePage.tsx` / `FinancialPage.tsx` — Handbook §28)

- **Fluxo de Caixa Realizado vs Projetado**: Projeção gráfica e tabular dos próximos 30/60/90 dias.
- **DRE Gerencial por Competência**:
  - Receita Bruta de Vendas (-) Deduções / Impostos
  - (=) Receita Líquida (-) Custos de Mercadorias Vendidas (CMV)
  - (=) Lucro Bruto (-) Despesas Operacionais / Administrativas
  - (=) Resultado Líquido do Exercício (EBITDA / Lucro Líquido)

---

## 3. Conciliação Bancária OFX (`OfxPage.tsx` — Handbook §29)

- Leitura de arquivos `.ofx` de qualquer banco brasileiro (Itaú, Bradesco, Banco do Brasil, Santander, Sicoob, Sicredi, Inter, Nubank).
- Sugestão automática de correspondência com títulos a pagar/receber utilizando inteligência artificial (`domain/finance.rs`).

---

## 4. Régua de Cobrança Proativa WhatsApp & PIX Dinâmico (Handbook §30)

Gatilhos da Régua:
1. **Lembrete de Vencimento (-3 dias)**: Envio polido via WhatsApp com resumo da fatura.
2. **Dia do Vencimento (Dia D)**: Envio de QR Code PIX copia e cola e boleto em PDF.
3. **Aviso de Atraso (+5 dias)**: Alerta de pendência oferecendo facilidades de renegociação.
