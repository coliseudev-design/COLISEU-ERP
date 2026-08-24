import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { KPICard } from '../components/ui/KPICard';
import { AIInsight } from '../components/ui/AIComponents';
import { StatusBadge } from '../components/ui/StatusBadge';
import { formatCurrency, formatDate } from '../lib/formatters';
import {
  ShoppingBag,
  Sparkles,
  RefreshCw,
  Building2,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Package,
  Users,
  Clock,
  ArrowRight,
  BarChart3,
  PieChart,
  ShieldAlert,
  Calendar,
  Layers,
  Award,
  Wallet,
  Bot,
  CheckCircle2,
} from 'lucide-react';
import { reportsService, BIExecutivoData, BIKpisMacro } from '../lib/reports';
import { SeletorPeriodoPersonalizado } from '../components/bi/SeletorPeriodoPersonalizado';
import { CopilotIaModal } from '../components/bi/CopilotIaModal';

export interface DashboardPageProps {
  onNavigate?: (page: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'360' | 'comercial' | 'financeiro' | 'estoque'>('360');
  const [filial, setFilial] = useState<'todas' | 'matriz' | 'dourados'>('todas');
  const [dataInicio, setDataInicio] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [dataFim, setDataFim] = useState(() => new Date().toISOString().split('T')[0]);
  const [periodoLabel, setPeriodoLabel] = useState('Este Mês (Mês Atual)');

  const [biData, setBiData] = useState<BIExecutivoData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [chartMetric, setChartMetric] = useState<'faturamento' | 'lucro'>('faturamento');

  const carregarBiData = async () => {
    setIsLoading(true);
    try {
      const filialId = filial === 'todas' ? 'todas' : filial === 'matriz' ? 'fil_matriz_01' : 'fil_dourados_02';
      const data = await reportsService.gerarBiExecutivo(dataInicio, dataFim, filialId);
      setBiData(data);
    } catch (err: any) {
      console.error('Erro ao gerar BI Executivo 360:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    carregarBiData();
  }, [dataInicio, dataFim, filial]);

  const kpis = biData?.kpis;
  const evolucao = biData?.evolucao_temporal || [];

  // SVG Chart Calculations
  const chartW = 600;
  const chartH = 150;
  const maxVal = Math.max(
    ...evolucao.map((d) => Math.max(d.faturamento, d.meta, d.lucro)),
    10000
  );

  const pointsFaturamento = evolucao
    .map((d, i) => {
      const x = 30 + (i * (chartW - 60)) / Math.max(evolucao.length - 1, 1);
      const val = chartMetric === 'faturamento' ? d.faturamento : d.lucro;
      const y = chartH - 25 - (val / maxVal) * (chartH - 45);
      return `${x},${y}`;
    })
    .join(' ');

  const pointsMeta = evolucao
    .map((d, i) => {
      const x = 30 + (i * (chartW - 60)) / Math.max(evolucao.length - 1, 1);
      const y = chartH - 25 - (d.meta / maxVal) * (chartH - 45);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="coliseu-page" style={{ gap: 'var(--spacing-3)' }}>
      {/* Header do Workspace com Botão Copilot IA */}
      <PageHeader
        title="Centro de Inteligência & BI Executivo 360°"
        description="Telemetria avançada de tomada de decisão com inteligência artificial preditiva e análise financeira, comercial e de suprimentos."
        breadcrumbItems={[
          { label: 'Visão Geral', active: false },
          { label: 'Intelligence BI 360°', active: true },
        ]}
        primaryAction={{
          label: 'Nova Venda (PDV)',
          onClick: () => onNavigate?.('pdv'),
          icon: <ShoppingBag aria-hidden="true" size={14} />,
        }}
      />

      {/* Barra de Ferramentas Executiva & Filtros de Período Customizado */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 'var(--spacing-3)',
          backgroundColor: 'var(--surface-1)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
          padding: '8px var(--spacing-3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)', flexWrap: 'wrap' }}>
          {/* Seletor de Período Customizado (X até Y) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
              Período:
            </span>
            <SeletorPeriodoPersonalizado
              dataInicio={dataInicio}
              dataFim={dataFim}
              onChange={(ini, fim, label) => {
                setDataInicio(ini);
                setDataFim(fim);
                setPeriodoLabel(label);
              }}
            />
          </div>

          <div style={{ width: '1px', height: '18px', backgroundColor: 'var(--border-subtle)' }} />

          {/* Seletor de Filial */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Building2 size={12} style={{ color: 'var(--text-muted)' }} />
            <select
              value={filial}
              onChange={(e) => setFilial(e.target.value as any)}
              style={{
                backgroundColor: 'var(--surface-sunken)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-xs)',
                padding: '4px 8px',
                fontSize: '11px',
                outline: 'none',
              }}
            >
              <option value="todas">Consolidado (Todas as Filiais)</option>
              <option value="matriz">01 - Filial Matriz Dourados</option>
              <option value="dourados">02 - Filial Campo Grande</option>
            </select>
          </div>
        </div>

        {/* Botões de Ação do Topo: IA Copilot & Refresh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setIsCopilotOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'rgba(99, 102, 241, 0.12)',
              color: '#6366f1',
              border: '1px solid rgba(99, 102, 241, 0.35)',
              borderRadius: 'var(--radius-xs)',
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <Sparkles size={13} />
            <span>Consultar IA Copilot</span>
          </button>

          <button
            type="button"
            onClick={carregarBiData}
            title="Atualizar Telemetria do BI"
            style={{
              backgroundColor: 'var(--surface-2)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-xs)',
              padding: '4px 8px',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
            }}
          >
            <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
            <span>{isLoading ? 'Calculando...' : 'Atualizar'}</span>
          </button>
        </div>
      </div>

      {/* Navegador de Módulos de Inteligência (Abas) */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '2px',
        }}
      >
        {[
          { key: '360', label: '🌟 Cockpit Executivo 360°', desc: 'Visão Geral & Decisão' },
          { key: 'comercial', label: '📈 BI Comercial & Vendas', desc: 'Curva ABC & Vendedores' },
          { key: 'financeiro', label: '💳 BI Financeiro & Liquidez', desc: 'DRE & Fluxo de Caixa' },
          { key: 'estoque', label: '📦 BI Estoque & Suprimentos', desc: 'Giro & Ruptura' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              padding: '6px 14px',
              backgroundColor: activeTab === tab.key ? 'var(--surface-1)' : 'transparent',
              color: activeTab === tab.key ? 'var(--action-primary)' : 'var(--text-secondary)',
              borderTop: activeTab === tab.key ? '2px solid var(--action-primary)' : '2px solid transparent',
              borderLeft: activeTab === tab.key ? '1px solid var(--border-subtle)' : '1px solid transparent',
              borderRight: activeTab === tab.key ? '1px solid var(--border-subtle)' : '1px solid transparent',
              borderBottom: 'none',
              borderRadius: 'var(--radius-xs) var(--radius-xs) 0 0',
              fontSize: '12px',
              fontWeight: activeTab === tab.key ? 600 : 400,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* CONTEÚDO DA ABA 1: COCKPIT EXECUTIVO 360° */}
      {activeTab === '360' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
          {/* 6 Cards Macro-Executivos */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 'var(--spacing-3)',
              backgroundColor: 'var(--surface-1)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: 'var(--spacing-3) var(--spacing-4)',
            }}
          >
            <KPICard
              title="Faturamento Bruto"
              value={kpis?.faturamento_bruto || 0}
              isCurrency
              change={8.4}
              periodLabel="no intervalo"
              subtitle={`Meta: ${formatCurrency(kpis?.faturamento_meta || 0)} (${kpis?.percent_atingimento_meta || 0}%)`}
              actionText="Ver DRE"
              onAction={() => onNavigate?.('dre')}
            />

            <KPICard
              title="Lucro Operacional"
              value={kpis?.lucro_operacional || 0}
              isCurrency
              change={kpis?.margem_efetiva || 0}
              periodLabel="margem líquida"
              subtitle={`CMV: ${formatCurrency(kpis?.cmv_total || 0)}`}
              actionText="Ver Rentabilidade"
              onAction={() => onNavigate?.('reports')}
            />

            <KPICard
              title="Ticket Médio"
              value={kpis?.ticket_medio || 0}
              isCurrency
              change={3.2}
              periodLabel="por pedido"
              subtitle={`${kpis?.total_pedidos || 0} pedidos concluídos`}
              actionText="Ver Vendas"
              onAction={() => onNavigate?.('sales')}
            />

            <KPICard
              title="Contas a Receber"
              value={kpis?.contas_receber_total || 0}
              isCurrency
              change={-2.1}
              periodLabel="carteira a liquidar"
              subtitle={`${formatCurrency(kpis?.contas_receber_hoje || 0)} vencem hoje`}
              actionText="Ver Financeiro"
              onAction={() => onNavigate?.('financial')}
            />

            <KPICard
              title="Saldo Projetado"
              value={kpis?.saldo_projetado || 0}
              isCurrency
              change={0.0}
              periodLabel="liquidez operacional"
              subtitle={`A Pagar: ${formatCurrency(kpis?.contas_pagar_total || 0)}`}
              actionText="Fluxo de Caixa"
              onAction={() => onNavigate?.('financial')}
            />

            <KPICard
              title="Estoque Ativo"
              value={kpis?.valor_total_estoque || 0}
              isCurrency
              change={-4.0}
              periodLabel="ativo a custo"
              subtitle={`${kpis?.itens_ruptura_iminente || 0} SKUs em risco de falta`}
              actionText="Ver Estoque"
              onAction={() => onNavigate?.('inventory')}
            />
          </div>

          {/* Fita de Telemetria Fiscal & Documentos Emitidos */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 'var(--spacing-2)',
              backgroundColor: 'var(--surface-1)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '6px var(--spacing-4)',
              fontSize: '11px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>📑 Documentos Fiscais no Período:</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>NF-e (Mod. 55):</span>
                <span style={{ fontWeight: 700, color: 'var(--action-primary)' }}>{kpis?.total_nfes_emitidas || 0} autorizadas</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>NFC-e (Mod. 65):</span>
                <span style={{ fontWeight: 700, color: 'var(--status-success)' }}>{kpis?.total_nfces_emitidas || 0} emitidas</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>CT-e (Mod. 57):</span>
                <span style={{ fontWeight: 700, color: '#ca8a04' }}>{kpis?.total_ctes_emitidos || 0} emitidos</span>
              </div>
            </div>

            {kpis?.valor_faturado_fiscal ? (
              <div style={{ color: 'var(--text-secondary)' }}>
                Faturamento Fiscal Total: <strong style={{ color: 'var(--text-primary)' }}>{formatCurrency(kpis.valor_faturado_fiscal)}</strong>
              </div>
            ) : null}
          </div>

          {/* Gráfico de Evolução Multidimensional vs Meta */}
          <div
            style={{
              backgroundColor: 'var(--surface-1)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: 'var(--spacing-3) var(--spacing-4)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--spacing-2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <div>
                <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Evolução Temporal no Período Selecionado ({periodoLabel})
                </span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>
                  Comparativo dinâmico de performance diária extraído diretamente das vendas do banco de dados
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ display: 'flex', backgroundColor: 'var(--surface-2)', borderRadius: '4px', padding: '2px' }}>
                  <button
                    type="button"
                    onClick={() => setChartMetric('faturamento')}
                    style={{
                      padding: '2px 8px',
                      fontSize: '10px',
                      fontWeight: chartMetric === 'faturamento' ? 600 : 400,
                      backgroundColor: chartMetric === 'faturamento' ? 'var(--surface-1)' : 'transparent',
                      color: chartMetric === 'faturamento' ? 'var(--action-primary)' : 'var(--text-secondary)',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                    }}
                  >
                    Faturamento Bruto
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartMetric('lucro')}
                    style={{
                      padding: '2px 8px',
                      fontSize: '10px',
                      fontWeight: chartMetric === 'lucro' ? 600 : 400,
                      backgroundColor: chartMetric === 'lucro' ? 'var(--surface-1)' : 'transparent',
                      color: chartMetric === 'lucro' ? 'var(--domain-estoque)' : 'var(--text-secondary)',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                    }}
                  >
                    Lucro Bruto (Margem)
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: chartMetric === 'faturamento' ? 'var(--action-primary)' : 'var(--domain-estoque)' }} />
                    <span style={{ color: 'var(--text-secondary)' }}>{chartMetric === 'faturamento' ? 'Faturamento Real' : 'Lucro Real'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '8px', height: '2px', backgroundColor: 'var(--text-subtle)' }} />
                    <span style={{ color: 'var(--text-muted)' }}>Meta Planejada</span>
                  </div>
                </div>
              </div>
            </div>

            {/* SVG Chart */}
            <div style={{ width: '100%', overflowX: 'auto', paddingTop: '8px' }}>
              <svg viewBox={`0 0 ${chartW} ${chartH}`} style={{ width: '100%', height: '150px', overflow: 'visible' }}>
                {[0, 1, 2, 3].map((g) => {
                  const y = 15 + g * 32;
                  return (
                    <line
                      key={g}
                      x1="30"
                      y1={y}
                      x2={chartW - 20}
                      y2={y}
                      stroke="var(--border-subtle)"
                      strokeDasharray="2 2"
                    />
                  );
                })}

                {evolucao.length > 1 && (
                  <polyline
                    fill="none"
                    stroke="var(--text-subtle)"
                    strokeWidth="1.5"
                    strokeDasharray="4 3"
                    points={pointsMeta}
                  />
                )}

                {evolucao.length > 1 && (
                  <polyline
                    fill="none"
                    stroke={chartMetric === 'faturamento' ? 'var(--action-primary)' : 'var(--domain-estoque)'}
                    strokeWidth="2"
                    points={pointsFaturamento}
                  />
                )}

                {evolucao.map((d, i) => {
                  const x = 30 + (i * (chartW - 60)) / Math.max(evolucao.length - 1, 1);
                  const val = chartMetric === 'faturamento' ? d.faturamento : d.lucro;
                  const y = chartH - 25 - (val / maxVal) * (chartH - 45);
                  return (
                    <g key={i}>
                      <circle
                        cx={x}
                        cy={y}
                        r="3.5"
                        fill="var(--surface-1)"
                        stroke={chartMetric === 'faturamento' ? 'var(--action-primary)' : 'var(--domain-estoque)'}
                        strokeWidth="2"
                      />
                      <text x={x} y={chartH - 5} fill="var(--text-muted)" fontSize="9" textAnchor="middle">
                        {d.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Seção Alertas Estratégicos & Diagnóstico de IA */}
          <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: 'var(--spacing-3)' }}>
            {/* Alertas Estratégicos */}
            <div
              style={{
                backgroundColor: 'var(--surface-1)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: 'var(--spacing-3) var(--spacing-4)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--spacing-2)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-primary)' }}>
                  <AlertTriangle size={14} style={{ color: 'var(--status-warning)' }} />
                  <span>Radar de Anomalias & Decisões Imediatas</span>
                </div>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  {biData?.alertas_estrategicos?.length || 0} ações pendentes
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {biData?.alertas_estrategicos?.map((alerta) => (
                  <div
                    key={alerta.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      backgroundColor: 'var(--surface-2)',
                      borderLeft: `3px solid ${
                        alerta.severidade === 'danger'
                          ? 'var(--status-danger)'
                          : alerta.severidade === 'warning'
                          ? 'var(--status-warning)'
                          : 'var(--status-info)'
                      }`,
                      borderRadius: '0 var(--radius-xs) var(--radius-xs) 0',
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: '11px', color: 'var(--text-primary)', display: 'block' }}>
                        {alerta.titulo}
                      </strong>
                      <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                        {alerta.descricao}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onNavigate?.(alerta.action_target)}
                      className="coliseu-btn coliseu-btn-secondary coliseu-btn--sm"
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      <span>{alerta.acao_recomendada.split(' ')[0]}</span>
                      <ArrowRight size={11} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Executive Insight Card */}
            <div
              style={{
                backgroundColor: 'var(--surface-1)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                borderRadius: 'var(--radius-sm)',
                padding: 'var(--spacing-3) var(--spacing-4)',
                background: 'linear-gradient(135deg, var(--surface-1) 0%, rgba(99, 102, 241, 0.04) 100%)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '8px',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6366f1', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                  <Sparkles size={15} />
                  <span>Diagnóstico Executivo de IA (Resumo)</span>
                </div>

                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                  {biData?.resumo_ia_diagnostico?.split('\n')[2] || 'Análise preditiva em processamento sobre as métricas de vendas e liquidez.'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsCopilotOpen(true)}
                className="coliseu-btn coliseu-btn-primary coliseu-btn--sm"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <Bot size={13} />
                <span>Abrir Copilot & Perguntar à IA</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA ABA 2: BI COMERCIAL & VENDAS */}
      {activeTab === 'comercial' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: 'var(--spacing-3)' }}>
            {/* Curva ABC de Produtos (Pareto 80/20) */}
            <div
              style={{
                backgroundColor: 'var(--surface-1)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: 'var(--spacing-3) var(--spacing-4)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div>
                  <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Curva ABC de Produtos (Princípio de Pareto 80/20)
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>
                    Identificação dos produtos que representam a maior fatia de faturamento e margem
                  </span>
                </div>
              </div>

              <div className="coliseu-table-container">
                <table className="coliseu-table">
                  <thead>
                    <tr>
                      <th>Classe</th>
                      <th>SKU</th>
                      <th>Produto / Descrição</th>
                      <th style={{ textAlign: 'right' }}>Qtd</th>
                      <th style={{ textAlign: 'right' }}>Faturamento</th>
                      <th style={{ textAlign: 'right' }}>Margem %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {biData?.curva_abc_produtos?.map((prod) => (
                      <tr key={prod.produto_id}>
                        <td>
                          <span
                            style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: 700,
                              backgroundColor:
                                prod.classe === 'A'
                                  ? 'rgba(234, 179, 8, 0.2)'
                                  : prod.classe === 'B'
                                  ? 'rgba(59, 130, 246, 0.2)'
                                  : 'rgba(107, 114, 128, 0.2)',
                              color:
                                prod.classe === 'A'
                                  ? '#ca8a04'
                                  : prod.classe === 'B'
                                  ? '#2563eb'
                                  : 'var(--text-muted)',
                            }}
                          >
                            Classe {prod.classe}
                          </span>
                        </td>
                        <td className="text-mono" style={{ fontSize: '11px' }}>{prod.sku}</td>
                        <td style={{ fontWeight: 500 }}>{prod.descricao}</td>
                        <td style={{ textAlign: 'right' }} className="tabular-nums">{prod.quantidade_vendida}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }} className="tabular-nums">{formatCurrency(prod.faturamento_total)}</td>
                        <td style={{ textAlign: 'right', color: 'var(--status-success)' }} className="tabular-nums">{prod.margem_lucro_percent}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Ranking de Vendedores & Metas */}
            <div
              style={{
                backgroundColor: 'var(--surface-1)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: 'var(--spacing-3) var(--spacing-4)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Performance da Equipe Comercial
                </span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Ranking & Metas</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {biData?.ranking_vendedores?.map((vend, idx) => (
                  <div
                    key={vend.vendedor_id}
                    style={{
                      padding: '8px',
                      backgroundColor: 'var(--surface-2)',
                      borderRadius: 'var(--radius-xs)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        #{idx + 1} {vend.nome}
                      </span>
                      <span style={{ color: 'var(--action-primary)', fontWeight: 700 }} className="tabular-nums">
                        {formatCurrency(vend.faturamento)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' }}>
                      <span>{vend.total_pedidos} pedidos (Ticket Médio: {formatCurrency(vend.ticket_medio)})</span>
                      <span>Meta: {vend.percent_meta}% atingida</span>
                    </div>

                    {/* Progress Bar da Meta */}
                    <div style={{ height: '4px', backgroundColor: 'var(--surface-sunken)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.min(vend.percent_meta, 100)}%`,
                          backgroundColor: vend.percent_meta >= 100 ? 'var(--status-success)' : 'var(--action-primary)',
                          borderRadius: '2px',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA ABA 3: BI FINANCEIRO & LIQUIDEZ */}
      {activeTab === 'financeiro' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-3)' }}>
            {/* DRE Sintética Visual */}
            <div
              style={{
                backgroundColor: 'var(--surface-1)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: 'var(--spacing-3) var(--spacing-4)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-primary)' }}>
                DRE Gerencial Sintética do Período
              </span>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span>(+) Receita Bruta de Vendas</span>
                  <strong className="tabular-nums">{formatCurrency(kpis?.faturamento_bruto || 0)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span>(-) Deduções e Tributos Incidentes</span>
                  <span className="tabular-nums">{formatCurrency((kpis?.faturamento_bruto || 0) - (kpis?.faturamento_liquido || 0))}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span>(=) Receita Operacional Líquida</span>
                  <strong className="tabular-nums">{formatCurrency(kpis?.faturamento_liquido || 0)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: 'var(--status-danger)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span>(-) Custo das Mercadorias Vendidas (CMV)</span>
                  <span className="tabular-nums">-{formatCurrency(kpis?.cmv_total || 0)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', backgroundColor: 'var(--surface-2)', borderRadius: '4px' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>(=) Lucro Bruto Operacional</strong>
                  <strong style={{ color: 'var(--status-success)' }} className="tabular-nums">
                    {formatCurrency(kpis?.lucro_operacional || 0)} ({kpis?.margem_efetiva || 0}%)
                  </strong>
                </div>
              </div>
            </div>

            {/* Fluxo de Caixa Projetado */}
            <div
              style={{
                backgroundColor: 'var(--surface-1)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: 'var(--spacing-3) var(--spacing-4)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Fluxo de Caixa Projetado (Próximos 14 Dias)
                </span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Entradas vs Saídas</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '200px', overflowY: 'auto' }}>
                {biData?.fluxo_caixa_projetado?.map((dia) => (
                  <div
                    key={dia.data}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '4px 8px',
                      backgroundColor: 'var(--surface-2)',
                      borderRadius: 'var(--radius-xs)',
                      fontSize: '11px',
                    }}
                  >
                    <span style={{ color: 'var(--text-secondary)' }}>{dia.label}</span>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <span style={{ color: 'var(--status-success)' }} className="tabular-nums">
                        +{formatCurrency(dia.entradas_previstas)}
                      </span>
                      <span style={{ color: 'var(--status-danger)' }} className="tabular-nums">
                        -{formatCurrency(dia.saidas_previstas)}
                      </span>
                      <strong style={{ color: dia.saldo_dia >= 0 ? 'var(--text-primary)' : 'var(--status-danger)' }} className="tabular-nums">
                        Saldo: {formatCurrency(dia.saldo_acumulado)}
                      </strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA ABA 4: BI ESTOQUE & SUPRIMENTOS */}
      {activeTab === 'estoque' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
          <div
            style={{
              backgroundColor: 'var(--surface-1)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: 'var(--spacing-3) var(--spacing-4)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div>
                <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Matriz de Itens com Risco Iminente de Ruptura
                </span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>
                  Produtos com estoque abaixo da cobertura mínima de segurança com sugestão de compra automática
                </span>
              </div>
            </div>

            <div className="coliseu-table-container">
              <table className="coliseu-table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>SKU</th>
                    <th>Descrição</th>
                    <th style={{ textAlign: 'right' }}>Saldo Atual</th>
                    <th style={{ textAlign: 'right' }}>Consumo/Dia</th>
                    <th style={{ textAlign: 'right' }}>Cobertura</th>
                    <th style={{ textAlign: 'right' }}>Sugestão Compra</th>
                    <th style={{ textAlign: 'center' }}>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {biData?.estoque_risco?.map((item) => (
                    <tr key={item.produto_id}>
                      <td>
                        <span
                          style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: 700,
                            backgroundColor: item.status_risco === 'CRITICO' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                            color: item.status_risco === 'CRITICO' ? 'var(--status-danger)' : '#ca8a04',
                          }}
                        >
                          {item.status_risco}
                        </span>
                      </td>
                      <td className="text-mono" style={{ fontSize: '11px' }}>{item.sku}</td>
                      <td style={{ fontWeight: 500 }}>{item.descricao}</td>
                      <td style={{ textAlign: 'right' }} className="tabular-nums">{item.saldo_atual}</td>
                      <td style={{ textAlign: 'right' }} className="tabular-nums">{item.consumo_diario}/dia</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }} className="tabular-nums">{item.cobertura_dias} dias</td>
                      <td style={{ textAlign: 'right', color: 'var(--action-primary)', fontWeight: 700 }} className="tabular-nums">
                        +{item.sugestao_compra} un
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => onNavigate?.('inventory')}
                          className="coliseu-btn coliseu-btn-secondary coliseu-btn--sm"
                        >
                          Comprar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal do Copilot Executivo com IA */}
      <CopilotIaModal
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        biData={biData}
      />
    </div>
  );
};
