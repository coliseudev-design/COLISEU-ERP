# Coliseu ERP — Documentação de Arquitetura da Fundação (Fase 0)

**Data de Implementação:** 14/08/2026  
**Versão:** 1.0  
**Status:** Implementado  

---

## 1. Visão Geral da Arquitetura

A Fase 0 estabelece as bases estruturais do **Coliseu ERP**, garantindo isolamento de domínios, segurança de dados criptografados, roteamento de modelos de IA multi-provedor, design system corporativo sem dependências de frameworks CSS externos, e um barramento de eventos interno auditável.

---

## 2. Estrutura de Diretórios e Domínios

O projeto segue uma arquitetura modular por domínios no backend Rust e no frontend React/TypeScript:

```
ERP/
├── docs/                             ← Documentação técnica viva de longo prazo
│   └── 00-foundation-architecture.md
├── src/                              ← Frontend React/Vite/TypeScript
│   ├── assets/                       ← Design Tokens e CSS Corporativo
│   ├── components/                   ← Componentes React do Coliseu
│   │   ├── ai/                       ← Painel e widgets de IA
│   │   └── ui/                       ← Componentes base do Design System
│   ├── lib/                          ← Wrappers de IPC e APIs
│   └── pages/                        ← Telas do sistema
└── src-tauri/                        ← Backend Rust / Tauri v2
    └── src/
        ├── commands/                 ← Handlers IPC Tauri
        ├── db/                       ← SQLite / SQLCipher + Schemas
        ├── domain/                   ← Domínios de negócio isolados
        ├── events/                   ← Event Bus desacoplado
        ├── fiscal/                   ← Emissão, NF-e, NFC-e, SPED
        ├── danfse/                   ← Gerador PDF DANFSe A4 (NT-008)
        └── ai/                       ← Engine de IA, LLM Router e Encriptação
```

---

## 3. Banco de Dados Criptografado & Tabela `llm_providers`

As configurações de IA e chaves API são persistidas no banco SQLite encriptado (SQLCipher) com chaveamento AES-256 no nível da aplicação.

### Schema `llm_providers`

```sql
CREATE TABLE IF NOT EXISTS llm_providers (
    id TEXT PRIMARY KEY NOT NULL,
    device_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    x_sync_status TEXT NOT NULL DEFAULT 'pending',
    x_version INTEGER NOT NULL DEFAULT 1,
    is_deleted INTEGER NOT NULL DEFAULT 0,

    provider_type TEXT NOT NULL UNIQUE, -- 'openai', 'anthropic', 'gemini', 'deepseek', 'ollama'
    name TEXT NOT NULL,
    api_key_encrypted TEXT,
    api_url TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    default_model TEXT,
    config_json TEXT
);
```

---

## 4. Roteador de IA Multi-Provedor (`llm_router`)

O backend Rust disponibiliza o módulo `ai::llm_router`, capaz de:
- Executar teste de conectividade (ping) com OpenAI, Anthropic, Gemini, DeepSeek e servidores local Ollama.
- Selecionar o modelo mais adequado para a tarefa (ex: modelo rápido para busca, modelo avançado para raciocínio financeiro/fiscal).
- Descriptografar em memória a chave API antes da chamada HTTP e destruí-la imediatamente após.

---

## 5. Barramento de Eventos (`Event Bus`)

Eventos de domínio são publicados assincronamente através de `events::bus`, permitindo auditabilidade, reatividade e gatilhos para agentes de IA proativos.

Eventos padronizados:
- `empresa.criada`, `empresa.atualizada`
- `cliente.criado`, `cliente.inativo_detectado`
- `venda.realizada`, `venda.cancelada`
- `estoque.minimo_atingido`
- `financeiro.conta_vencida`
- `fiscal.nota_emitida`, `fiscal.nota_rejeitada`

---

## 6. Design System Corporativo Coliseu

- **Tokens CSS**: Definidos em `:root` (Cores neutras enterprise, cores semânticas, espaçamentos 4px/8px/12px/16px/24px/32px/48px/64px).
- **Tipografia**: Inter corporativa com hierarquia estrita (H1 24px, H2 20px, H3 16px, Body 14px, Caption 12px).
- **Sem Frameworks CSS Ad-hoc**: CSS puro e desacoplado garantindo performance extrema e controle total de estilos.
