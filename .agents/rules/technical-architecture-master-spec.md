# COLISEU ERP — TECHNICAL ARCHITECTURE & ENGINEERING SPECIFICATION v1.0

## STATUS: REGRA TÉCNICA E ARQUITETURAL ABSOLUTA

Este documento estabelece as decisões de engenharia, arquitetura de software, isolamento de domínios, segurança, concorrência, banco de dados local-first e integração de Inteligência Artificial para o **Coliseu ERP**.

---

### 1. PRINCÍPIO DA INDEPENDÊNCIA DA IA (§49, §100)
> **A IA é uma camada de inteligência contextual, NÃO a fundação transacional do ERP.**
> Se qualquer provedor de IA (OpenAI, Anthropic, Gemini, DeepSeek, Ollama) estiver indisponível ou offline, o ERP DEVE continuar funcionando perfeitamente em 100% de suas funções transacionais (vendas, PDV, faturamento, financeiro, fiscal, estoque).
> A IA NUNCA possui mais acesso que o usuário autenticado (§57). Operações de risco elevado exigem confirmação explícita *Human-in-the-Loop* Nível L3 (§58, §59).

### 2. ARQUITETURA MONÓLITO MODULAR EM RUST (§6, §7, §109, §110)
O Coliseu ERP adota a arquitetura de **Monólito Modular Local-First** em Rust + SQLite/SQLCipher com ponte Tauri IPC v2 para o frontend React 18:
- **Zero Microserviços Desnecessários**: Modularidade estrita via domínios Rust em vez de distribuição prematura (§109).
- **15 Domínios de Negócio Isolados (§7, §8)**:
  1. `Identity` (Autenticação e Sessões)
  2. `Organization` (Multi-Empresas e Multi-Filiais)
  3. `Customer` (Clientes e Limite de Crédito)
  4. `Supplier` (Fornecedores e Compras CMP)
  5. `Product` (Produtos, Grade e Fracionamento)
  6. `Sales` (Vendas, Pedidos e Desconto Shield)
  7. `Purchasing` (Cotações, Solicitações e XML NF-e)
  8. `Inventory` (Reserva, Saldos e Movimentações)
  9. `Finance` (Contas a Pagar/Receber, DRE e OFX)
  10. `Fiscal` (Motor NF-e/NFC-e/NFS-e e SPED)
  11. `Reporting` (Curva ABC e BI Executivo)
  12. `Notification` (Alertas internos e WhatsApp Gateway)
  13. `Integration` (Webhooks e mTLS SEFAZ)
  14. `Audit` (Logs funcionais e rastreabilidade CorrelationId)
  15. `AI` (LLM Router, Gateway e Ferramentas L3)

### 3. CONTRATO DE ERRO PADRONIZADO (§15)
Nenhum erro pode ser retornado em formato genérico ou misterioso. O contrato JSON de erro é:
```json
{
  "code": "ORDER_CREDIT_LIMIT_EXCEEDED",
  "message": "O pedido excede o limite de crédito disponível.",
  "details": { "limite": 10000.0, "tentativa": 14200.0 },
  "traceId": "corr_8f9a2b1c3d4e"
}
```

### 4. SEGURANÇA, SEGREDO E AUDITORIA (§26, §27, §60, §61, §97, §98)
- Zero segredos em código-fonte: Certificados digitais A1 e API Keys são encriptados com AES-256-GCM via OS Keyring (`keyring` crate).
- Auditoria Funcional Ampla: Registrar quem, o quê, quando, onde, valor anterior, valor posterior e CorrelationId.
- Princípio do Menor Privilégio: Todo acesso começa negado (§97).

### 5. ARQUITETURA ORIENTADA A EVENTOS DE DOMÍNIO (§30-33)
Eventos imutáveis versionados em Rust (`CustomerCreated.v1`, `OrderCreated.v1`, `OrderApproved.v1`, `PaymentReceived.v1`, `InvoiceIssued.v1`) com payloads contendo `tenant`, `correlationId`, `actor` e `timestamp`.

### 6. REGRAS PARA AGENTES DE CODIFICAÇÃO (§112)
- NÃO modificar arquitetura sem registro ADR.
- NÃO acessar o banco de outro domínio diretamente.
- NÃO colocar regras de negócio críticas exclusivamente no frontend.
- NÃO criar tabela SQL sem script DDL e versão no schema manager.
- NÃO permitir que a IA contorne autorizações do sistema.
