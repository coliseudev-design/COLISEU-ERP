# 02 — TECHNOLOGY DECISION RECORD (TDR)

## Justificativa da Escolha da Stack Tecnológica

### 1. Framework Desktop: Tauri v2 vs Electron
- **Decisão**: **Tauri v2 com Rust**.
- **Justificativa**: Consumo de memória RAM reduzido (~40MB vs >400MB do Electron), binário compilado otimizado (~15MB vs >120MB), segurança nativa contra inspeções não autorizadas do código-fonte e acesso direto a hardware de impressão térmica via portas seriais/USB em Rust.

### 2. Banco de Dados Local: SQLCipher (PRAGMA key AES-256) + SQLite
- **Decisão**: **rusqlite com feature `bundled-sqlcipher`**.
- **Justificativa**: Atende a LGPD e regras fiscais brasileiras de proteção contra extração indevida de dados caso o computador seja roubado. Modo WAL (Write-Ahead Logging) ativado para suporte a altas taxas de leitura e escrita concorrentes.

### 3. Frontend Web Core: React 18 + Vite + TypeScript + TailwindCSS
- **Decisão**: **React 18 com Vite e TypeScript em modo estrito**.
- **Justificativa**: Tipagem estrita de contratos IPC, renderização rápida de componentes empresariais (tabelas de alta densidade e modais) e build de produção limpo.

### 4. Motor de Integração de IA: LLM Router Multi-Provedor
- **Decisão**: **Abstração em Rust conectando OpenAI, Anthropic, Gemini, DeepSeek e Ollama Local**.
- **Justificativa**: Evita lock-in com fornecedores únicos de inteligência e permite que empresas sem acesso à nuvem utilizem modelos locais (Ollama) para tarefas confidenciais.
