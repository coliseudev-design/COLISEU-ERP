# 04 — FRONTEND ARCHITECTURE

## Arquitetura do Frontend React 18 & Design System

### 1. Camadas da Interface
```text
App.tsx (Main App Shell Router)
  ├── AppHeader (Navegação superior, busca global Ctrl+K e contexto)
  ├── SidebarNav (Menu por domínios e seção de favoritos fixáveis)
  ├── PageHeader (Breadcrumbs + Ação Primária Destacada)
  ├── Main Content (Tabelas operacionais, Forms tabulados, Drawers)
  └── CommandBarModal (Modal de busca universal e assistente IA)
```

### 2. Princípios de Implementação
- **Componentes do Design System**: Todos os componentes visuais são exportados de `src/components/ui/` (`Button`, `Input`, `Badge`, `DataTableEnterprise`, `PageHeader`, `Drawer`, `ActionConfirmModal`, `AIComponents`).
- **Comunicação React ↔ Rust via Tauri IPC**:
  - Wrapper IPC seguro com TypeScript em `src/lib/`.
  - Tratamento determinístico de resposta no formato JSON de Erro (§15).
