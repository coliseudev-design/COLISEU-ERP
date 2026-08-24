# Coliseu ERP — Documentação do App Shell e UI Enterprise (Fase 1)

**Data de Implementação:** 14/08/2026  
**Versão:** 1.0  
**Status:** Implementado  

---

## 1. Visão Geral da Interface

A Fase 1 estabelece o **App Shell** do Coliseu ERP, transformando o layout em um ambiente empresarial de classe mundial orientado aos princípios SAP Fiori, Microsoft Fluent e Salesforce Lightning.

---

## 2. Estrutura do App Shell (Handbook §9)

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ COLISEU │ 🔍 Busca Global (Ctrl+K) │ ⚡ Atalhos │ 🔔 Alertas │ 👤 Usuário   │
├─────────────────┬───────────────────────────────────────────────────────────┤
│                 │                                                           │
│  MENU LATERAL   │                     ÁREA DE CONTEÚDO                      │
│  (Recolhível &  │                                                           │
│   Pesquisável)  │   • Breadcrumb                                            │
│                 │   • Cabeçalho do Módulo & Ação Principal                  │
│  ● Comercial    │   • DataTable Enterprise / Formulário / Dashboard         │
│  ● Compras      │   • Rodapé de Estado & Notificações                       │
│  ● Estoque      │                                                           │
│  ● Financeiro   │                                                           │
│  ● Fiscal       │                                                           │
│  ● Inteligência │                                                           │
│  ● Configs      │                                                           │
│                 │                                                           │
└─────────────────┴───────────────────────────────────────────────────────────┘
```

---

## 3. Command Bar Inteligente (`Ctrl+K`) — Handbook §11-12

A Command Bar é o ponto central de produtividade. Pressionar `Ctrl+K` em qualquer lugar abre a barra flutuante capaz de:
1. **Navegar**: Abrir telas (ex: "PDV", "Financeiro", "Configurações").
2. **Buscar Registros**: Clientes, fornecedores, produtos, pedidos, notas fiscais.
3. **Comandos Inteligentes (IA)**: Executar consultas em linguagem natural (ex: *"clientes inativos há 90 dias"*).

---

## 4. Componentes Base do Design System (Handbook §39)

Todos os componentes seguem a biblioteca central em `src/components/ui/`:
- `Button` e `IconButton`: Suporte a variantes (primary, secondary, danger, ghost), tamanhos (sm, md, lg) e estados (disabled, loading).
- `Input`, `Select`, `Combobox`: Campos com labels, mensagens de validação e estados de erro.
- `Card`: Contêiner estruturado com header, body e footer.
- `Modal` e `Drawer`: Diálogos flutuantes e painéis laterais deslizantes.
- `Badge` e `Alert`: Sinalizações semânticas (Sucesso, Atenção, Erro, Informação).
- `Skeleton`: Carregamento fluido sem telas em branco.
- `EmptyState`: Mensagens de ausência de dados orientadas à ação.

---

## 5. DataTable Enterprise (Handbook §15)

O componente `DataTableEnterprise` oferece:
- Ordenação por coluna (asc/desc).
- Filtros por texto e por coluna.
- Seleção de linhas única ou múltipla.
- Ações em lote (ex: exportar, excluir, aprovar).
- Densidade configurável (Compacto, Padrão, Confortável).
- Paginação com controle de itens por página.
- Exportação CSV / JSON.
