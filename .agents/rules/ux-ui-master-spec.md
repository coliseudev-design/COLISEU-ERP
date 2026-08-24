# COLISEU ERP — UX/UI MASTER SPECIFICATION v1.0

## STATUS: REGRA OBRIGATÓRIA E ABSOLUTA DO SISTEMA

Esta especificação governa toda a interface visual, layout, arquitetura de informação, componentes React, temas CSS e interações com IA no **Coliseu ERP**.

---

### 1. PRINCÍPIO CENTRAL
> **O usuário não deve navegar pelo sistema. O sistema deve conduzir o usuário pelo trabalho.**
> **Não redesenhar telas isoladamente. Redesenhar o sistema como um produto único.**

### 2. ANTI-PADRÕES PROIBIDOS (REGRA 2 & 81)
- Excesso de cards decorativos sem função.
- Gradientes chamativos e glassmorphism exagerado.
- Aparência de "dashboard genérico gerado por IA" com brilhos e estrelas flutuantes.
- Chatbot gigante ocupando espaço da tela (IA deve ser discreta `✦ Insight` e acionável).
- Botões sem hierarquia (deve existir **uma única ação primária** destacada por tela).
- Inconsistência de componentes entre módulos (tabela de Clientes e Produtos devem funcionar exatamente igual).

### 3. REFERÊNCIAS VISUAIS ENTERPRISE
- SAP Fiori
- Microsoft Fluent / Dynamics
- Salesforce Lightning
- Oracle Redwood
- Odoo

---

### 4. ARQUITETURA GLOBAL DE LAYOUT (REGRA 5, 6, 7, 8, 9, 10)
```text
┌──────────────────────────────────────────────────────────────────────────┐
│ LOGO │ Filial/Empresa │ Busca/Ctrl+K │ Atalhos │ Alertas │ Ajuda │ Perfil │
├──────────────┬───────────────────────────────────────────────────────────┤
│              │ [Breadcrumb: Comercial / Clientes / João da Silva]         │
│ MENU         │                                                           │
│ LATERAL      │ Título da Página                            [+ Ação Primária] │
│ (Expandido / │ ───────────────────────────────────────────────────────── │
│  Recolhido / │                                                           │
│  Favoritos)  │ Conteúdo Operacional (Tabela / Form / Drawer / Timeline)   │
│              │                                                           │
└──────────────┴───────────────────────────────────────────────────────────┘
```

### 5. DIRETRIVAS POR MÓDULO & VERTICAL
1. **Vertical Mestre**: `Cliente -> Orçamento -> Pedido -> Estoque -> Financeiro` com contexto preservado.
2. **Dashboards por Perfil**:
   - Diretor: Resumo Executivo (Vendas, Margem, Recebimentos, Inadimplência, Estoque).
   - Gerente Comercial: Metas, Vendas, Pipeline Kanban, Vendedores.
   - Financeiro: Saldo, Contas a Pagar/Receber, Vencidos, Fluxo de Caixa, Previsto x Realizado.
   - Estoque: Total, Críticos, Rupturas, Inventários.
   - Vendedor: Metas, Oportunidades, Propostas, Follow-ups.
3. **Tabelas Operacionais Densa**: Busca instantânea, filtros persistentes em drawer/painel, ordenação, seleção em lote, paginação, exportação.
4. **Drawers de Inspeção**: Abrir detalhes de cliente/pedido sem sair da tabela principal.
5. **Erros Fiscais Amigáveis**: NUNCA exibir "Rejeição 539". Exibir o motivo em português, campo afetado e botão `[Corrigir Documento]`.
6. **Command Bar & IA Contextual**: `Ctrl+K` para busca/ações com modal de confirmação explícito antes de executar ações atômicas.

---

### 6. CHECKLIST DE QUALIDADE (REGRA 83)
- Clareza: 100%
- Consistência: 100%
- Produtividade: 100%
- Legibilidade: 100%
- Acessibilidade: 100%
- Performance: 100%
