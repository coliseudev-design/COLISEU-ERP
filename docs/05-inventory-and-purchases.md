# Coliseu ERP — Documentação de Estoque & Compras Preditivas (Fase 5)

**Data de Implementação:** 14/08/2026  
**Versão:** 1.0  
**Status:** Implementado  

---

## 1. Visão Geral do Módulo de Estoque

A Fase 5 fornece gestão de suprimentos e almoxarifado no **Coliseu ERP**, incorporando regras de varejo brasileiro como de-para de XML NF-e, fracionamento de caixas e matriz de cores/tamanhos.

---

## 2. Importação XML NF-e & De-Para (`XmlEntradaPage.tsx` — Handbook §23)

Processo de Entrada em 4 Passos:
1. **Upload / Leitura do XML**: Extração de dados da NFe do fornecedor.
2. **De-Para Automático**: Vínculo inteligente de CNPJ do fornecedor e EAN/GTIN do item com o cadastro local.
3. **Fator de Conversão / Fracionamento**: Converte caixas/fardos em unidades de venda (`domain/xml_import.rs`).
4. **Alimentação de Estoque & Contas a Pagar**: Entrada física no estoque e geração automática dos títulos no financeiro.

---

## 3. Matriz de Grade de Produtos (Moda & Calçados — Handbook §25)

Suporte a variações bidimensionais (Tamanho × Cor):
```text
Item Pai: Tênis Esportivo Pro
Grid:
     │ 38  │ 39  │ 40  │ 41  │ 42  │
Preto│  2  │  5  │  8  │  4  │  1  │
Azul │  0  │  3  │  6  │  2  │  0  │
```

---

## 4. Recompra Preditiva via Coliseu AI (§22)

- Cálculo automático de **Giro Médio Diário**, **Ponto de Pedido** e **Estoque Mínimo**.
- Alerta proativo quando um produto atinge o estoque crítico com sugestão de pedido de compra pronto para cotação.
