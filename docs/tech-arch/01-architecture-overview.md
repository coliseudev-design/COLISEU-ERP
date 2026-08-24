# 01 — ARCHITECTURE OVERVIEW

## Visão Geral da Arquitetura do Coliseu ERP v1.0

### 1. Modelo Arquitetural
O **Coliseu ERP** adota o modelo de **Monólito Modular Local-First de Alta Desempenho**, combinando a velocidade e segurança do **Rust** no backend local com a flexibilidade da biblioteca **React 18** no frontend desktop via **Tauri v2**.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                          TAURI FRONTEND (REACT 18)                      │
│ App Shell • Design System • Drawer • Command Bar Ctrl+K • React State  │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ IPC (Tauri Command Bridge / JSON)
┌──────────────────────────────────▼─────────────────────────────────────┐
│                          RUST BACKEND CORE                              │
│                                                                        │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │                  15 DOMÍNIOS DE NEGÓCIO ISOLADOS                   │ │
│ │ Identity • Organization • Customer • Supplier • Product • Sales    │ │
│ │ Purchasing • Inventory • Finance • Fiscal • Reporting • Notif     │ │
│ │ Integration • Audit • AI Engine Router                             │ │
│ └────────────────────────────────┬───────────────────────────────────┘ │
│                                  │                                     │
│ ┌────────────────────────────────▼───────────────────────────────────┐ │
│ │                  EVENT BUS & SERVIÇOS INFRA                       │ │
│ │ Domain Event Publisher • Async Workers • Contingency Fila SEFAZ    │ │
│ └────────────────────────────────┬───────────────────────────────────┘ │
│                                  │                                     │
│ ┌────────────────────────────────▼───────────────────────────────────┐ │
│ │               PERSISTÊNCIA SQLCIPHER CRIPTOGRAFADA                │ │
│ │ PRAGMA key (AES-256-GCM) • SQLite WAL Mode • Fila Write-Back Sync   │ │
│ └────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

### 2. Principais Atributos da Arquitetura
- **Isolamento de Segurança**: Chaves privadas de Certificados A1 e tokens de API encriptados no Vault de Credenciais nativo do Sistema Operacional (`keyring` crate).
- **Resiliência Offline Total**: Vendas no PDV e emissão contingencial de NFC-e funcionam 100% sem conexão com a internet.
- **Rastreabilidade End-to-End**: Todo evento possui `correlationId` único perpassando a camada IPC, backend Rust, worker assíncrono e banco de dados.
