import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  Receipt,
  FileSpreadsheet,
  Settings,
  ChevronLeft,
  ChevronRight,
  Pin,
  Star,
  DollarSign,
  Boxes,
  Truck,
  Sparkles,
  ShieldCheck,
  Tag,
  ArrowRightLeft,
  QrCode,
  FileCheck,
  FileText,
  Store,
  Search,
  ChevronDown,
  Landmark,
  Wallet,
  Lock,
  Layers,
  ClipboardCheck,
  TrendingUp,
  Wrench,
  Sprout,
  Building,
  Target,
  Activity,
} from 'lucide-react';
import { ColiseuLogo } from '../ui/ColiseuLogo';

export interface SidebarNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  domain: string;
  domainColor: string;
}

const STORAGE_KEY_PINNED = 'coliseu_pinned_tabs';
const DEFAULT_PINNED = ['dashboard', 'pessoas', 'sales', 'financial', 'pdv'];

export const SidebarNav: React.FC<SidebarNavProps> = ({
  activeTab,
  setActiveTab,
  collapsed,
  setCollapsed,
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [openDomains, setOpenDomains] = useState<Record<string, boolean>>({
    'Business Intelligence': true,
    Comercial: true,
    Compras: false,
    Estoque: false,
    Financeiro: true,
    Fiscal: false,
    Transporte: true,
    Relatórios: false,
    Administração: false,
    'IA Engine': false,
  });

  const [pinnedTabs, setPinnedTabs] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PINNED);
      return saved ? JSON.parse(saved) : DEFAULT_PINNED;
    } catch {
      return DEFAULT_PINNED;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PINNED, JSON.stringify(pinnedTabs));
    } catch {
      // Storage fallback
    }
  }, [pinnedTabs]);

  const togglePin = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setPinnedTabs((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  };

  const toggleDomain = (domain: string) => {
    setOpenDomains((prev) => ({ ...prev, [domain]: !prev[domain] }));
  };

  const navItems: NavItem[] = useMemo(
    () => [
      { id: 'bi', label: 'Inteligência de Vendas', icon: <TrendingUp size={15} aria-hidden="true" />, domain: 'Business Intelligence', domainColor: '#06b6d4' },
      { id: 'bi/hub', label: 'Central de Pedidos (Hub)', icon: <Receipt size={15} aria-hidden="true" />, domain: 'Business Intelligence', domainColor: '#06b6d4' },
      { id: 'bi/vendedor', label: 'Hub do Vendedor', icon: <Users size={15} aria-hidden="true" />, domain: 'Business Intelligence', domainColor: '#06b6d4' },
      { id: 'bi/abc', label: 'Curva ABC (Pareto 80/20)', icon: <Layers size={15} aria-hidden="true" />, domain: 'Business Intelligence', domainColor: '#06b6d4' },
      { id: 'bi/finance', label: 'BI Financeiro & Liquidez', icon: <DollarSign size={15} aria-hidden="true" />, domain: 'Business Intelligence', domainColor: '#06b6d4' },
      { id: 'bi/customer', label: 'Radar 360° do Cliente', icon: <Activity size={15} aria-hidden="true" />, domain: 'Business Intelligence', domainColor: '#06b6d4' },
      { id: 'bi/comparative', label: 'Análise Comparativa (MoM/YoY)', icon: <ArrowRightLeft size={15} aria-hidden="true" />, domain: 'Business Intelligence', domainColor: '#06b6d4' },
      { id: 'bi/customer-analytics', label: 'Analytics & Churn Clientes', icon: <Users size={15} aria-hidden="true" />, domain: 'Business Intelligence', domainColor: '#06b6d4' },
      { id: 'bi/goals', label: 'Gestor & Atingimento Metas', icon: <Target size={15} aria-hidden="true" />, domain: 'Business Intelligence', domainColor: '#06b6d4' },
      { id: 'bi/supplier', label: 'Performance de Fornecedores', icon: <Building size={15} aria-hidden="true" />, domain: 'Business Intelligence', domainColor: '#06b6d4' },
      { id: 'bi/heatmap', label: 'Heatmap de Vendas', icon: <Sparkles size={15} aria-hidden="true" />, domain: 'Business Intelligence', domainColor: '#06b6d4' },
      { id: 'bi/ai-insights', label: 'AI Insights & Oportunidades', icon: <Sparkles size={15} aria-hidden="true" />, domain: 'Business Intelligence', domainColor: '#06b6d4' },
      { id: 'inteligencia', label: 'Estratégia & Performance', icon: <TrendingUp size={15} aria-hidden="true" />, domain: 'Business Intelligence', domainColor: '#06b6d4' },

      { id: 'dashboard', label: 'Visão Executiva 360°', icon: <LayoutDashboard size={15} aria-hidden="true" />, domain: 'Comercial', domainColor: 'var(--domain-comercial)' },
      { id: 'pessoas', label: 'Clientes & Parceiros', icon: <Users size={15} aria-hidden="true" />, domain: 'Comercial', domainColor: 'var(--domain-comercial)' },
      { id: 'products', label: 'Catálogo de Produtos', icon: <Package size={15} aria-hidden="true" />, domain: 'Comercial', domainColor: 'var(--domain-comercial)' },
      { id: 'pdv', label: 'Caixa PDV', icon: <Store size={15} aria-hidden="true" />, domain: 'Comercial', domainColor: 'var(--domain-comercial)' },
      { id: 'pre_venda', label: 'Pré-Venda & Balcão', icon: <ShoppingCart size={15} aria-hidden="true" />, domain: 'Comercial', domainColor: 'var(--domain-comercial)' },
      { id: 'sales', label: 'Histórico de Vendas', icon: <Receipt size={15} aria-hidden="true" />, domain: 'Comercial', domainColor: 'var(--domain-comercial)' },
      { id: 'pedidos_vendas', label: 'Pedidos & Orçamentos (B2B)', icon: <FileText size={15} aria-hidden="true" />, domain: 'Comercial', domainColor: 'var(--domain-comercial)' },
      { id: 'ordens_servico', label: 'Ordens de Serviço (O.S.)', icon: <Wrench size={15} aria-hidden="true" />, domain: 'Comercial', domainColor: 'var(--domain-comercial)' },
      { id: 'comissoes_metas', label: 'Comissões & Metas', icon: <Target size={15} aria-hidden="true" />, domain: 'Comercial', domainColor: 'var(--domain-comercial)' },
      { id: 'condicional', label: 'Venda Condicional', icon: <ArrowRightLeft size={15} aria-hidden="true" />, domain: 'Comercial', domainColor: 'var(--domain-comercial)' },
      { id: 'promotions', label: 'Promoções', icon: <Tag size={15} aria-hidden="true" />, domain: 'Comercial', domainColor: 'var(--domain-comercial)' },

      { id: 'purchases', label: 'Cotações & Compras', icon: <Truck size={15} aria-hidden="true" />, domain: 'Compras', domainColor: 'var(--domain-compras)' },
      { id: 'fornecedores_360', label: 'Fornecedores 360°', icon: <Building size={15} aria-hidden="true" />, domain: 'Compras', domainColor: 'var(--domain-compras)' },
      { id: 'xml_entrada', label: 'Entrada XML NF-e', icon: <FileCheck size={15} aria-hidden="true" />, domain: 'Compras', domainColor: 'var(--domain-compras)' },

      { id: 'inventory', label: 'Saldos de Estoque', icon: <Boxes size={15} aria-hidden="true" />, domain: 'Estoque', domainColor: 'var(--domain-estoque)' },
      { id: 'lotes', label: 'Lotes & Sementes (RENASEM)', icon: <Sprout size={15} aria-hidden="true" />, domain: 'Estoque', domainColor: 'var(--domain-estoque)' },
      { id: 'balanco_estoque', label: 'Balanço & Auditoria', icon: <ClipboardCheck size={15} aria-hidden="true" />, domain: 'Estoque', domainColor: 'var(--domain-estoque)' },
      { id: 'reajuste_precos', label: 'Reajuste de Preços', icon: <TrendingUp size={15} aria-hidden="true" />, domain: 'Estoque', domainColor: 'var(--domain-estoque)' },
      { id: 'categorias_marcas', label: 'Categorias & Marcas', icon: <Layers size={15} aria-hidden="true" />, domain: 'Estoque', domainColor: 'var(--domain-estoque)' },
      { id: 'stock_transfer', label: 'Transferência Estoque', icon: <ArrowRightLeft size={15} aria-hidden="true" />, domain: 'Estoque', domainColor: 'var(--domain-estoque)' },
      { id: 'grades', label: 'Grade Cor & Tamanho', icon: <Package size={15} aria-hidden="true" />, domain: 'Estoque', domainColor: 'var(--domain-estoque)' },
      { id: 'etiquetas', label: 'Gerador de Etiquetas', icon: <QrCode size={15} aria-hidden="true" />, domain: 'Estoque', domainColor: 'var(--domain-estoque)' },

      { id: 'financial', label: 'Contas a Receber & PDV', icon: <DollarSign size={15} aria-hidden="true" />, domain: 'Financeiro', domainColor: 'var(--domain-financeiro)' },
      { id: 'contas_pagar', label: 'Contas a Pagar (Retenções)', icon: <DollarSign size={15} aria-hidden="true" />, domain: 'Financeiro', domainColor: 'var(--domain-financeiro)' },
      { id: 'fluxo_caixa_projetado', label: 'Fluxo Projetado (30/60/90d)', icon: <Activity size={15} aria-hidden="true" />, domain: 'Financeiro', domainColor: 'var(--domain-financeiro)' },
      { id: 'dre', label: 'DRE Gerencial', icon: <FileSpreadsheet size={15} aria-hidden="true" />, domain: 'Financeiro', domainColor: 'var(--domain-financeiro)' },
      { id: 'ofx', label: 'Conciliação OFX', icon: <DollarSign size={15} aria-hidden="true" />, domain: 'Financeiro', domainColor: 'var(--domain-financeiro)' },
      { id: 'pix_boleto', label: 'Cobrança PIX/Boleto', icon: <QrCode size={15} aria-hidden="true" />, domain: 'Financeiro', domainColor: 'var(--domain-financeiro)' },
      { id: 'caixas', label: 'Cadastro de Caixas', icon: <Wallet size={15} aria-hidden="true" />, domain: 'Financeiro', domainColor: 'var(--domain-financeiro)' },
      { id: 'contas_bancarias', label: 'Contas Bancárias', icon: <Landmark size={15} aria-hidden="true" />, domain: 'Financeiro', domainColor: 'var(--domain-financeiro)' },

      { id: 'emissao_dfe', label: 'Emissão DF-e (NF-e/NFC-e)', icon: <FileCheck size={15} aria-hidden="true" />, domain: 'Fiscal', domainColor: 'var(--domain-fiscal)' },
      { id: 'mdfe', label: 'Manifesto MDF-e (Carga)', icon: <Truck size={15} aria-hidden="true" />, domain: 'Fiscal', domainColor: 'var(--domain-fiscal)' },
      { id: 'sped', label: 'SPED Fiscal EFD', icon: <Receipt size={15} aria-hidden="true" />, domain: 'Fiscal', domainColor: 'var(--domain-fiscal)' },
      { id: 'tax_rules', label: 'Regras Tributárias', icon: <ShieldCheck size={15} aria-hidden="true" />, domain: 'Fiscal', domainColor: 'var(--domain-fiscal)' },
      { id: 'naturezas_operacao', label: 'Naturezas de Operação (CFOP)', icon: <FileText size={15} aria-hidden="true" />, domain: 'Fiscal', domainColor: 'var(--domain-fiscal)' },
      { id: 'gerenciamento_nfe', label: 'Gerenciamento & Config. NF-e', icon: <Wrench size={15} aria-hidden="true" />, domain: 'Fiscal', domainColor: 'var(--domain-fiscal)' },
      { id: 'gerenciamento_nfce', label: 'Gerenciamento & Config. NFC-e', icon: <Store size={15} aria-hidden="true" />, domain: 'Fiscal', domainColor: 'var(--domain-fiscal)' },
      { id: 'gerenciamento_mdfe', label: 'Gerenciamento & Config. MDF-e', icon: <Truck size={15} aria-hidden="true" />, domain: 'Fiscal', domainColor: 'var(--domain-fiscal)' },

      { id: 'transporte', label: 'Central de Transporte', icon: <Truck size={15} aria-hidden="true" />, domain: 'Transporte', domainColor: '#3b82f6' },
      { id: 'cte', label: 'CT-e 4.00 (Emissão)', icon: <FileText size={15} aria-hidden="true" />, domain: 'Transporte', domainColor: '#3b82f6' },
      { id: 'frota', label: 'Frota & Veículos', icon: <Truck size={15} aria-hidden="true" />, domain: 'Transporte', domainColor: '#3b82f6' },
      { id: 'motoristas', label: 'Motoristas & Condutores', icon: <Users size={15} aria-hidden="true" />, domain: 'Transporte', domainColor: '#3b82f6' },
      { id: 'gerenciamento_cte', label: 'Configurações CT-e', icon: <Settings size={15} aria-hidden="true" />, domain: 'Transporte', domainColor: '#3b82f6' },

      { id: 'reports', label: 'BI & Relatórios', icon: <FileSpreadsheet size={15} aria-hidden="true" />, domain: 'Relatórios', domainColor: 'var(--domain-relatorios)' },

      { id: 'configuracoes', label: 'Configurações ERP', icon: <Settings size={15} aria-hidden="true" />, domain: 'Administração', domainColor: 'var(--domain-admin)' },
      { id: 'users', label: 'Usuários & Permissões', icon: <Users size={15} aria-hidden="true" />, domain: 'Administração', domainColor: 'var(--domain-admin)' },
      { id: 'grupos_acesso', label: 'Grupos de Acesso', icon: <Lock size={15} aria-hidden="true" />, domain: 'Administração', domainColor: 'var(--domain-admin)' },
      { id: 'audit', label: 'Log de Auditoria', icon: <ShieldCheck size={15} aria-hidden="true" />, domain: 'Administração', domainColor: 'var(--domain-admin)' },
      { id: 'ai_providers', label: 'Configurações de IA', icon: <Sparkles size={15} aria-hidden="true" />, domain: 'IA Engine', domainColor: 'var(--domain-ia)' },
    ],
    []
  );

  // Se a aba ativa mudar, garante que o domínio correspondente está aberto
  useEffect(() => {
    const item = navItems.find((i) => i.id === activeTab);
    if (item && !openDomains[item.domain]) {
      setOpenDomains((prev) => ({ ...prev, [item.domain]: true }));
    }
  }, [activeTab, navItems]);

  const filteredItems = useMemo(() => {
    if (!filterQuery.trim()) return navItems;
    const q = filterQuery.toLowerCase();
    return navItems.filter((i) => i.label.toLowerCase().includes(q) || i.domain.toLowerCase().includes(q));
  }, [navItems, filterQuery]);

  const domains = useMemo(() => Array.from(new Set(filteredItems.map((item) => item.domain))), [filteredItems]);

  return (
    <aside
      aria-label="Navegação Principal"
      style={{
        width: collapsed ? 'var(--sidebar-width-collapsed)' : 'var(--sidebar-width)',
        height: '100vh',
        backgroundColor: 'var(--surface-sunken)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width var(--motion-normal) var(--motion-ease)',
        userSelect: 'none',
        zIndex: 'var(--z-sidebar)',
      }}
    >
      {/* Header com Monograma Enterprise e Botão de Recolher */}
      <div
        style={{
          height: '56px',
          padding: '0 var(--spacing-3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--surface-1)',
        }}
      >
        {!collapsed ? (
          <ColiseuLogo size="md" variant="full" />
        ) : (
          <ColiseuLogo size="md" variant="icon" />
        )}

        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expandir Menu' : 'Recolher Menu'}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: 'var(--radius-xs)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title={collapsed ? 'Expandir Menu' : 'Recolher Menu'}
        >
          {collapsed ? <ChevronRight size={14} aria-hidden="true" /> : <ChevronLeft size={14} aria-hidden="true" />}
        </button>
      </div>

      {/* Busca Rápida na Sidebar (se expandida) */}
      {!collapsed && (
        <div style={{ padding: 'var(--spacing-2) var(--spacing-2) 0' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--surface-1)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '2px 8px',
            }}
          >
            <Search size={12} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Filtrar menu..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: 'var(--font-size-xs)',
                outline: 'none',
                padding: '3px 0',
              }}
            />
          </div>
        </div>
      )}

      {/* Navegação Scroll Container */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: 'var(--spacing-2) var(--spacing-1)' }}>
        {/* Seção de Favoritos (se expandida e sem filtro ativo) */}
        {!collapsed && !filterQuery && pinnedTabs.length > 0 && (
          <div style={{ marginBottom: 'var(--spacing-3)' }}>
            <div
              style={{
                padding: 'var(--spacing-1) var(--spacing-2)',
                fontSize: '10px',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Star size={9} color="var(--status-warning)" aria-hidden="true" /> Favoritos
            </div>
            {navItems
              .filter((item) => pinnedTabs.includes(item.id))
              .map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    type="button"
                    key={`fav-${item.id}`}
                    onClick={() => setActiveTab(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--spacing-2)',
                      padding: '5px var(--spacing-2)',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      backgroundColor: isActive ? 'var(--surface-2)' : 'transparent',
                      color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontSize: 'var(--font-size-xs)',
                      fontWeight: isActive ? 'var(--font-weight-semibold)' : 'var(--font-weight-normal)',
                      textAlign: 'left',
                      marginBottom: '1px',
                      borderLeft: isActive ? '2px solid var(--action-primary)' : '2px solid transparent',
                    }}
                  >
                    <span style={{ color: item.domainColor, opacity: isActive ? 1 : 0.75 }}>{item.icon}</span>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
          </div>
        )}

        {/* Domínios / Categorias */}
        {domains.map((domain) => {
          const items = filteredItems.filter((i) => i.domain === domain);
          const isOpen = Boolean(openDomains[domain]) || Boolean(filterQuery);

          return (
            <div key={domain} style={{ marginBottom: collapsed ? '4px' : '6px' }}>
              {!collapsed && (
                <button
                  type="button"
                  onClick={() => toggleDomain(domain)}
                  style={{
                    width: '100%',
                    padding: '4px var(--spacing-2)',
                    fontSize: '10px',
                    fontWeight: 'var(--font-weight-semibold)',
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <span>{domain}</span>
                  <ChevronDown
                    size={11}
                    style={{
                      transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                      transition: 'transform var(--motion-fast) var(--motion-ease)',
                    }}
                  />
                </button>
              )}

              {(isOpen || collapsed) &&
                items.map((item) => {
                  const isActive = activeTab === item.id;
                  const isPinned = pinnedTabs.includes(item.id);

                  return (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: '1px',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setActiveTab(item.id)}
                        aria-current={isActive ? 'page' : undefined}
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: collapsed ? 'center' : 'flex-start',
                          gap: 'var(--spacing-2)',
                          padding: collapsed ? '8px 0' : '5px var(--spacing-2)',
                          borderRadius: 'var(--radius-sm)',
                          border: 'none',
                          backgroundColor: isActive ? 'var(--surface-2)' : 'transparent',
                          color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          fontSize: 'var(--font-size-xs)',
                          fontWeight: isActive ? 'var(--font-weight-semibold)' : 'var(--font-weight-normal)',
                          textAlign: 'left',
                          borderLeft: isActive ? '2px solid var(--action-primary)' : '2px solid transparent',
                          minWidth: 0,
                        }}
                        title={collapsed ? `${item.label} (${domain})` : undefined}
                      >
                        <span style={{ color: item.domainColor, opacity: isActive ? 1 : 0.75 }}>{item.icon}</span>
                        {!collapsed && (
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.label}
                          </span>
                        )}
                      </button>

                      {!collapsed && (
                        <button
                          type="button"
                          onClick={(e) => togglePin(e, item.id)}
                          aria-label={isPinned ? `Remover dos Favoritos` : `Fixar nos Favoritos`}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: isPinned ? 'var(--status-warning)' : 'var(--text-subtle)',
                            opacity: isPinned ? 1 : 0.3,
                            padding: '3px 4px',
                            cursor: 'pointer',
                            borderRadius: 'var(--radius-xs)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          title={isPinned ? 'Remover dos Favoritos' : 'Fixar nos Favoritos'}
                        >
                          <Pin size={10} aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  );
                })}
            </div>
          );
        })}
      </nav>
    </aside>
  );
};
