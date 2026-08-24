# COLISEU ERP — DESIGN SYSTEM & VISUAL LANGUAGE MASTER SPECIFICATION v1.0

## STATUS: REGRA PERMANENTE E ABSOLUTA DE DESIGN SYSTEM

Este documento estabelece o Design System oficial do **Coliseu ERP**. Toda nova tela, componente, tema CSS, token ou módulo desenvolvido DEVE obedecer estritamente a estas diretrizes.

---

### 1. PRINCÍPIOS "ENTERPRISE FIRST" (§5, §7, §95)
> **dados > decoração**
> **produtividade > efeitos**
> **clareza > criatividade**
> **consistência > novidade**
> **acessibilidade > estética**
> **performance > animação**

### 2. O QUE NÃO FAZER (§6)
- NÃO transformar o ERP em dashboard de startup com gradientes chamativos e glassmorphism exagerado.
- NÃO utilizar chatbots gigantes ocupando o centro da tela.
- NÃO criar bordas arredondadas gigantes em todos os elementos (radius sóbrio sm: 4px, md: 6px, lg: 8px).
- NÃO utilizar cores apenas "porque fica bonito". Cor comunica estado, ação ou prioridade (§13).

### 3. ARQUITETURA DE DESIGN TOKENS (§9, §10, §11)
Organizada em 3 camadas:
1. **Primitive Tokens**: `color.blue.*`, `space.1..6`, `radius.sm..lg`, `font.family`.
2. **Semantic Tokens**: `color.background.primary`, `color.text.primary`, `color.border.default`, `color.action.primary`, `color.status.success`.
3. **Component Tokens**: `button.primary.bg`, `table.header.bg`, `modal.overlay.bg`.

### 4. COMPONENTES DE IA DISCRETOS (§52-57)
- `✦ Insight`: Análise discreta integrada ao fluxo.
- `✦ Sugestão`: Orientação preditiva contextual.
- `✦ Ação`: Preparar operação atômica com confirmação.
- NUNCA exibir porcentagens de confiança falsas (§57).

### 5. TEMPLATES OFICIAIS DE PÁGINA (§74-78)
- **List Page Template**: Breadcrumb -> Title -> Search/Toolbar -> Filters -> DataTable -> Pagination.
- **Detail Page Template**: Breadcrumb -> Header -> Summary -> Tabs -> Content/Timeline -> Actions.
- **Form Page Template**: Breadcrumb -> Title -> Tabbed Sections -> Fields -> Validation -> Actions.
- **Dashboard Template**: Header -> Profile Selector -> AI Insights -> KPIs -> Operational Grids.

### 6. REGRA DE GOVERNANÇA (§71, §72)
- **"Reuse before create"**: Nenhum módulo deve criar seu próprio botão, tabela, modal ou input. Reuse o componente do Design System em `src/components/ui/`.
