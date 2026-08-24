# 06 — DATABASE ARCHITECTURE

## Arquitetura de Banco de Dados Criptografado & DDL SQLCipher

### 1. Especificações do Banco Local
- **Engine**: SQLite 3 com estenografia **SQLCipher AES-256-GCM**.
- **Chave de Decodificação**: Derivada do vault do OS via `PRAGMA key = '...'` na abertura da conexão (`db/connection.rs`).
- **Modo Concorrente**: `PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;`.

### 2. Estrutura das 60 Tabelas Auditadas
As 60 tabelas possuem obrigatoriamente as 7 colunas universais de sincronização:
```sql
id TEXT PRIMARY KEY NOT NULL,
device_id TEXT NOT NULL,
created_at TEXT NOT NULL,
updated_at TEXT NOT NULL,
x_sync_status TEXT NOT NULL DEFAULT 'PENDING',
x_version INTEGER NOT NULL DEFAULT 1,
is_deleted INTEGER NOT NULL DEFAULT 0
```
