# 11 — OBSERVABILITY

## Observabilidade, Logs & Tracing (§43, §44, §102)

1. **CorrelationId**: Propagado em 100% das requisições via IPC, worker Rust e auditoria de banco.
2. **Tracing Crate em Rust**: `tracing` e `tracing-subscriber` para estruturar logs JSON formatados.
3. **Diagnóstico Imediato**: Responde instantaneamente às 10 perguntas fundamentais (§102) em caso de erro operacional.
