# 03 — DOMAIN ARCHITECTURE

## Arquitetura de Domínios e Fronteiras de Responsabilidade

O sistema é dividido em **15 Domínios de Negócio Módulos**:

1. **Identity**: Gerenciamento de credenciais, sessões locais, hashes Argon2id/BCrypt e renovação de tokens.
2. **Organization**: Contexto multi-empresa e multi-filial com isolamento estrito por `empresa_id` e `filial_id`.
3. **Customer**: Cadastro 360°, score de crédito (0-1000), validação de documentos CPF/CNPJ e análise de churn.
4. **Supplier**: Cadastro de fornecedores, avaliação de prazo de entrega e matriz CMP (Custo Médio Ponderado).
5. **Product**: Catálogo de SKUs, matriz de cores e tamanhos (grade), fator de conversão de caixa e impressão de etiquetas.
6. **Sales**: Motor transacional de vendas, PDV frente de caixa com atalhos F1..F12, esteira de pedidos e rateio de desconto.
7. **Purchasing**: Solicitações de compra, cotações com fornecedores e esteira de entrada por XML NF-e com de-para automático.
8. **Inventory**: Reserva de estoque, movimentações imutáveis com extrato, saldo por depósito e controle de ruptura.
9. **Finance**: Lançamentos a pagar/receber, DRE gerencial por competência, conciliação bancária OFX e cobrança PIX/Boleto.
10. **Fiscal**: Motor de emissão de NF-e, NFC-e e NFS-e (Modelo Dourados/MS), assinatura XMLDSIG, contingência offline e gerador SPED EFD ICMS-IPI.
11. **Reporting**: Agregadores para curva ABC de produtos/clientes e BI Executivo com projeções.
12. **Notification**: Central de tarefas, alertas de divergência e WhatsApp Gateway (Evolution API/Meta Cloud API).
13. **Integration**: Webhooks para e-commerce/marketplaces e clientes mTLS SOAP 1.2 da SEFAZ.
14. **Audit**: Registrador imutável de log funcional com `correlationId`, dados anteriores e posteriores.
15. **AI**: LLM Router para roteamento inteligente de prompts, guardrails de segurança e conectores L3 Human-in-the-loop.
