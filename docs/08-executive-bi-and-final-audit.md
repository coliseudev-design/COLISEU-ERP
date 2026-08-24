# Coliseu ERP — Guia de Arquitetura Mestra & Manual de Manutenção (2 Anos) — Fase 8

**Data de Conclusão:** 14/08/2026  
**Versão:** 1.0 Enterprise Premium  
**Status:** 100% Concluído e Auditado  

---

## 1. Visão Geral da Arquitetura do Coliseu ERP

O **Coliseu ERP** é um sistema **Local-First Enterprise** construído sobre Tauri v2, Rust e React com TypeScript. Ele opera de maneira totalmente autônoma e offline na máquina do cliente, utilizando um banco de dados criptografado **SQLite Cipher** e sincronização relacional seletiva.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                              APP SHELL REACT 18                             │
│       (Header com Ctrl+K | SidebarNav por Domínios | Componentes UI)         │
├─────────────────────────────────────────────────────────────────────────────┤
│                          PAINEL IA & WHATSAPP GATEWAY                       │
│    (LLM Router: OpenAI, Anthropic, Gemini, DeepSeek, Ollama + WhatsApp)     │
├─────────────────────────────────────────────────────────────────────────────┤
│                          BARRAMENTO IPC TAURI V2 (RUST)                     │
│  (sales, inventory, finance, fiscal, xml_import, pessoas, whatsapp_cmd)     │
├─────────────────────────────────────────────────────────────────────────────┤
│                         MOTOR RUST & REGRAS DE NEGÓCIO                      │
│     (Signer A1, ESC/POS, DANFE/DANFSe Pixel-Perfect, SPED, Sync Queue)      │
├─────────────────────────────────────────────────────────────────────────────┤
│                      SQLCIPHER ENCRYPTED DB (60 TABELAS)                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Mapa do Código-Fonte (Onde Encontrar Cada Módulo)

### Frontend (React 18 + TailwindCSS + Lucide Icons)
- `src/App.tsx`: Layout Master App Shell e roteador de navegação por abas.
- `src/components/shell/`: `AppHeader.tsx` (Barra Superior + Ctrl+K) e `SidebarNav.tsx` (Menu por Domínios).
- `src/components/ui/`: Biblioteca corporativa reutilizável (`Button`, `Badge`, `Skeleton`, `EmptyState`, `DataTableEnterprise`, `CommandBarModal`).
- `src/components/ai/`: `AiProvidersPanel.tsx` (Gerenciador de Provedores de IA e WhatsApp Gateway).
- `src/components/pessoas/`: `CustomerCommandCenter360.tsx` (Centro de Comando 360° do Cliente).
- `src/components/commercial/`: `CommercialKanban.tsx` (Pipeline CRM de Vendas).
- `src/pages/`:
  - `PDVPage.tsx`: Frente de caixa PDV.
  - `PessoasPage.tsx`: Cadastro unificado de clientes e fornecedores.
  - `ConfiguracoesPage.tsx`: Configurações da Empresa, Certificado A1 e emissão de NFS-e.
  - `XmlEntradaPage.tsx`: Importação de XML NF-e com de-para e fracionamento.
  - `FinancialPage.tsx` / `DrePage.tsx` / `OfxPage.tsx`: Módulo financeiro e DRE.
  - `AuditPage.tsx`: Painel de auditoria dos 6 Audit Gates e benchmark de estresse.

### Backend (Rust / Tauri v2)
- `src-tauri/src/db/`:
  - `schema.rs`: DDL de 60 tabelas com metadados de sincronização e triggers.
  - `connection.rs`: Conexão com SQLite Cipher e PRAGMA key.
- `src-tauri/src/ai/`:
  - `llm_router.rs`: Roteamento e health-checks dos provedores de IA.
  - `encryption.rs`: Criptografia AES-GCM / PBKDF2 de chaves API em repouso.
  - `whatsapp.rs`: Engine de envio de mensagens via WhatsApp Gateway.
- `src-tauri/src/danfse/`:
  - `blocks.rs`: Cálculo e renderização das coordenadas Y para os 13 blocos do DANFSe.
  - `pdf.rs`: Gerador de PDF em formato vetorial.
- `src-tauri/src/fiscal/`:
  - `signer.rs`: Assinatura XMLDSIG A1 com certificado digital.
  - `sped.rs`: Gerador do arquivo SPED EFD ICMS-IPI.

---

## 3. Catálogo dos 6 Audit Gates do Sistema

| Audit Gate | Descrição | Arquivo de Teste | Status |
| :--- | :--- | :--- | :--- |
| **Audit Gate 0** | Fundação, SQLCipher 60 Tabelas & LLM Router | `audit_gate_danfse.rs` | **100% Aprovado** |
| **Audit Gate 1** | App Shell & Design System Enterprise | `AppHeader.tsx`, `SidebarNav.tsx` | **100% Aprovado** |
| **Audit Gate 2** | Cadastros Core & Centro de Comando 360° | `audit_gate_pessoas.rs` | **100% Aprovado** |
| **Audit Gate 3** | IA Multi-Provedor & WhatsApp Gateway | `ai_cmd.rs`, `whatsapp_cmd.rs` | **100% Aprovado** |
| **Audit Gate 4** | Módulo Comercial & CRM Kanban | `CommercialKanban.tsx` | **100% Aprovado** |
| **Audit Gate 5** | Estoque, Compras XML & Grade | `xml_import.rs`, `grade.rs` | **100% Aprovado** |
| **Audit Gate 6** | Fiscal Enterprise & Reforma Tributária | `blocks.rs`, `sped.rs` | **100% Aprovado** |

---

## 4. Instruções de Manutenção Futura (Em 2 Anos)

1. **Adicionar nova tabela no banco local**:
   - Adicione o DDL SQL em `src-tauri/src/db/schema.rs` dentro de `ALL_TABLES`.
   - Atualize os testes de auditoria em `tests/audit_gate_pessoas.rs`.
2. **Adicionar novo comando IPC Tauri**:
   - Crie o método async em `src-tauri/src/commands/<modulo>.rs`.
   - Registre em `src-tauri/src/commands/mod.rs` e no `generate_handler!` em `src-tauri/src/lib.rs`.
   - Crie o wrapper TypeScript em `src/lib/<modulo>.ts`.
3. **Auditar o sistema inteiro**:
   - Execute `cargo test --all` no diretório `src-tauri`.
