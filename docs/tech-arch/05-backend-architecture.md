# 05 — BACKEND ARCHITECTURE

## Arquitetura do Backend Rust em `src-tauri`

### 1. Estrutura de Módulos Rust
```text
src-tauri/src/
  ├── ai/                # Motor LLM Router, encriptação de keys e WhatsApp Gateway
  ├── commands/          # Handlers Tauri IPC registrados em lib.rs
  ├── db/                # Gerenciamento de conexão SQLCipher, DDL de 60 tabelas e PRAGMA key
  ├── domain/            # Lógica transacional atômica de vendas, financeiro, compras e pessoas
  ├── fiscal/            # Assinador XMLDSIG A1, gerador de chaves, QR Code NFC-e e SPED
  ├── printing/          # Driver ESC/POS para impressoras térmicas via USB/Serial
  └── sync/              # Fila Write-back ps_crud e algoritmos de fusão CRDT LWW
```

### 2. Padrão de Tratamento de Erros (§15)
Todo handler IPC retorna `Result<T, AppError>`, onde `AppError` é serializado como:
```json
{
  "code": "FISCAL_CERTIFICATE_EXPIRED",
  "message": "O certificado digital A1 expirou no dia 10/08/2026.",
  "details": { "expiracao": "2026-08-10" },
  "traceId": "trace_9a8b7c6d"
}
```
