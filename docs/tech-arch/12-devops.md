# 12 — DEVOPS & CI/CD

## Pipeline de Deploy & Integração Contínua (§64-67)

1. **Pipeline CI/CD**:
   - `npm run build`: Type-checking em TypeScript + Minificação Vite React.
   - `cargo test --lib`: Validação dos 33 testes unitários do backend Rust.
   - `cargo build --release`: Compilação do executável otimizado `erp_local_first.exe`.
2. **Infraestrutura Local-First**: O binário gerado contém a aplicação completa isolada sem necessidade de servidor externo para operação básica.
