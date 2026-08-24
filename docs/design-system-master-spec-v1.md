# COLISEU ERP — DESIGN SYSTEM & VISUAL LANGUAGE SPECIFICATION (v1.0.0)

> **Documento Oficial de Engenharia & Design de Interface**
> **Referências Conceituais:** SAP Fiori, Microsoft Fluent, Salesforce Lightning Design System, Oracle Redwood, Odoo.
> **Princípio Guia:** *Enterprise First: dados > decoração | produtividade > efeitos | clareza > criatividade*

---

## 1. FOUNDATIONS (FUNDAÇÕES)

### 1.1 Pilares de Experiência
1. **Confiança & Estabilidade**: Interfaces de alto contraste (mínimo 4.5:1 WCAG AA), tipografia técnica legível (Inter/JetBrains Mono) e feedback determinístico.
2. **Precisão Operacional**: Números alinhados à direita com fonte monoespaçada, moedas formatadas no padrão ISO/BRL e tabelas de alta densidade sem espaços perdidos.
3. **Eficiência Operacional**: Uma ação primária clara por tela (§26), atalhos universais por teclado (`Ctrl+K`, `Ctrl+N`, `Ctrl+S`, `Esc`), retenção de contexto ao navegar.
4. **Inteligência Contextual Discreta**: Componentes de IA (`✦ Insight`, `✦ Sugestão`, `✦ Ação`) integrados organicamente sem brilhos decorativos ou assistentes flutuantes que tomem espaço da operação.

---

## 2. ARQUITETURA DE DESIGN TOKENS

Os tokens são organizados em 3 camadas hierárquicas:

```text
Primitive Tokens (Valores Brutos)
       ↓
Semantic Tokens (Significado no Contexto)
       ↓
Component Tokens (Estilo Aplicado ao Componente)
```

### 2.1 Primitive Tokens (`src/assets/coliseu-design-system.css`)
```css
:root {
  /* Cores Primitivas */
  --color-slate-950: #0f172a;
  --color-slate-900: #1e293b;
  --color-slate-800: #334155;
  --color-slate-700: #475569;
  --color-slate-600: #64748b;
  --color-slate-400: #94a3b8;
  --color-slate-100: #f8fafc;

  --color-blue-600: #2563eb;
  --color-blue-700: #1d4ed8;
  --color-sky-400: #38bdf8;
  --color-emerald-500: #10b981;
  --color-amber-500: #f59e0b;
  --color-red-500: #ef4444;

  /* Espaçamento Primitivo */
  --space-0: 0px;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;

  /* Radius Primitivo */
  --radius-none: 0px;
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;

  /* Tipografia */
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
}
```

### 2.2 Semantic Tokens
```css
:root {
  --color-bg-app: var(--color-slate-950);
  --color-bg-surface: var(--color-slate-900);
  --color-bg-hover: var(--color-slate-800);
  --color-text-primary: var(--color-slate-100);
  --color-text-secondary: var(--color-slate-400);
  --color-text-muted: var(--color-slate-600);
  --color-border-default: var(--color-slate-800);
  --color-border-focus: var(--color-blue-600);

  --color-action-primary: var(--color-blue-600);
  --color-action-primary-hover: var(--color-blue-700);

  --color-status-success: var(--color-emerald-500);
  --color-status-warning: var(--color-amber-500);
  --color-status-danger: var(--color-red-500);
  --color-status-info: var(--color-sky-400);
}
```

---

## 3. INVENTÁRIO & ESPECIFICAÇÃO DE COMPONENTES (§24, §25, §27, §30)

| Componente | Função | Variantes | Acessibilidade (WCAG) |
| :--- | :--- | :--- | :--- |
| **ColiseuButton** | Ação atômica ou navegação | Primary, Secondary, Danger, Ghost | Focus ring azul, `aria-disabled`, `type="button"` |
| **ColiseuInput** | Entrada de texto / números | Default, Error, Disabled | Label vinculada via `htmlFor`, helper text `aria-describedby` |
| **DataTableEnterprise** | Grade operacional de dados | Compact, Standard, Comfortable | Teclas `ArrowUp/Down`, `role="grid"`, `aria-selected` |
| **PageHeader** | Cabeçalho padronizado | Default com Breadcrumb + Primary Action | Nível `h1` único por página |
| **Drawer** | Inspeção lateral rápida | Standard (520px), Large (720px) | Fechar com `Esc`, foco preso ao abrir |
| **ActionConfirmModal** | Confirmação de segurança | Default, Danger | Foco no botão Cancelar por padrão (§50, §91) |
| **AIInsightBox** | Bloco contextual de IA | Insight, Sugestão, Ação | Indicador textual `✦ Coliseu AI` (§52-55) |

---

## 4. PADRÕES DE INTERAÇÃO & STATUS (§44)

### Vocabulário Único de Status Fiscais e Comerciais
- `Ativo` / `Concluído` / `Aprovado` -> Verde (`--color-status-success`)
- `Pendente` / `Em Análise` / `Atenção` -> Amarelo/Laranja (`--color-status-warning`)
- `Inativo` / `Rejeitado` / `Cancelado` / `Bloqueado` -> Vermelho (`--color-status-danger`)

### Mensagens de Erro Humanas (§49, §51)
NUNCA exibir apenas "Erro 500" ou "Rejeição 539". O padrão obrigatório é:
1. **O que aconteceu**: Descrição clara em português legível.
2. **O que fazer**: Instrução acionável para o operador.
3. **Ação imediata**: Botão `[Corrigir Documento]` ou `[Tentar Novamente]`.

---

## 5. TEMPLATES DE PÁGINA OFICIAIS (§74-78)

1. **List Page Template (`ListPageTemplate`)**:
   - `Breadcrumb` -> `PageHeader` (com 1 Ação Primária) -> `SearchBar & Filters` -> `DataTableEnterprise` -> `Pagination`.
2. **Detail Page Template (`DetailPageTemplate`)**:
   - `Breadcrumb` -> `Header` -> `Summary Cards` -> `Nav Tabs` -> `Tab Content / Timeline` -> `Drawer Detail`.
3. **Form Page Template (`FormPageTemplate`)**:
   - `Breadcrumb` -> `Header` -> `Tabbed Sections (Básicos, Contato, Endereço, Comercial, Financeiro)` -> `Field Validation` -> `ActionConfirmModal`.
4. **Dashboard Template (`DashboardPageTemplate`)**:
   - `Header` -> `Profile Selector (Diretor, Comercial, Financeiro, Estoque, Vendedor)` -> `AI Insights Box` -> `Metrics Grid` -> `Action Shortcuts`.

---

## 6. GOVERNANÇA DO DESIGN SYSTEM (§71, §72)

- **Regra de Ouro**: *"Reuse before create"*. Nenhum desenvolvedor ou agente de IA pode criar um botão, input, modal ou tabela customizado sem justificar a inviabilidade dos componentes oficiais.
- **Versionamento**: v1.0.0 (Governada por `.agents/rules/design-system-master-spec.md`).
