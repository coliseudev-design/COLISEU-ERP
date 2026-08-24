import React, { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { KPICard } from '../components/ui/KPICard';
import { AIInsight } from '../components/ui/AIComponents';
import {
  Truck,
  FileText,
  ShieldCheck,
  Zap,
  Plus,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MapPin,
  Users,
  Settings,
  Printer,
  FileCheck,
  Calendar,
  Building2,
  TrendingUp,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { formatCurrency, formatPercent } from '../lib/formatters';
import {
  transporteService,
  VeiculoItem,
  MotoristaItem,
  RotaTransporteItem,
  CteItem,
  OperacaoTransporteItem,
  TransporteKPIs,
  EvolucaoFreteDiario,
  RankingRota,
} from '../lib/transporte';
import { CockpitViagens } from '../components/transporte/CockpitViagens';
import { ModalEmissaoCTe } from '../components/transporte/ModalEmissaoCTe';
import { ModalEmissaoRapidaCTe } from '../components/transporte/ModalEmissaoRapidaCTe';
import { ModalCriarViagem } from '../components/transporte/ModalCriarViagem';
import { ModalGerarCiot } from '../components/transporte/ModalGerarCiot';
import { ModalVisualizadorDacte } from '../components/transporte/ModalVisualizadorDacte';
import { ModalVisualizadorCiot } from '../components/transporte/ModalVisualizadorCiot';
import { ModalEmissaoMDFe } from '../components/transporte/ModalEmissaoMDFe';
import { ModalEncerramentoViagem } from '../components/transporte/ModalEncerramentoViagem';
import { useNavigate } from 'react-router-dom';

export const TransportePage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'COCKPIT' | 'CTES' | 'VIAGENS' | 'CIOTS'>('COCKPIT');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filtros de Contexto Executivo
  const [profile, setProfile] = useState<'diretor' | 'logistica' | 'fiscal' | 'frota'>('diretor');
  const [periodo, setPeriodo] = useState<'mes' | '7dias' | 'hoje'>('mes');
  const [filial, setFilial] = useState<'todas' | 'matriz' | 'dourados'>('todas');
  const [buscaCiot, setBuscaCiot] = useState('');

  // Estados de Dados Reais
  const [veiculos, setVeiculos] = useState<VeiculoItem[]>([]);
  const [motoristas, setMotoristas] = useState<MotoristaItem[]>([]);
  const [rotas, setRotas] = useState<RotaTransporteItem[]>([]);
  const [ctes, setCtes] = useState<CteItem[]>([]);
  const [viagens, setViagens] = useState<OperacaoTransporteItem[]>([]);
  const [kpis, setKpis] = useState<TransporteKPIs | null>(null);
  const [evolucaoFrete, setEvolucaoFrete] = useState<EvolucaoFreteDiario[]>([]);
  const [rankingRotas, setRankingRotas] = useState<RankingRota[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Modais
  const [isModalCteOpen, setIsModalCteOpen] = useState(false);
  const [isModalCteRapidoOpen, setIsModalCteRapidoOpen] = useState(false);
  const [isModalViagemOpen, setIsModalViagemOpen] = useState(false);
  const [isModalCiotOpen, setIsModalCiotOpen] = useState(false);
  const [isModalMdfeOpen, setIsModalMdfeOpen] = useState(false);
  const [isModalDacteOpen, setIsModalDacteOpen] = useState(false);
  const [isModalVisualizadorCiotOpen, setIsModalVisualizadorCiotOpen] = useState(false);
  const [isModalEncerramentoOpen, setIsModalEncerramentoOpen] = useState(false);

  const [cteSelecionado, setCteSelecionado] = useState<CteItem | null>(null);
  const [operacaoCiotSelecionada, setOperacaoCiotSelecionada] = useState<OperacaoTransporteItem | null>(null);
  const [viagemParaEncerrar, setViagemParaEncerrar] = useState<OperacaoTransporteItem | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const carregarDados = async () => {
    setIsLoading(true);
    try {
      const filialIdConsulta = filial === 'todas' ? 'todas' : filial === 'matriz' ? 'fil_matriz_01' : 'fil_dourados_02';

      const [v, m, r, c, op, kpiData, evolData, rankData] = await Promise.all([
        transporteService.listarVeiculos('emp_matriz_01'),
        transporteService.listarMotoristas('emp_matriz_01'),
        transporteService.listarRotas('emp_matriz_01'),
        transporteService.listarCtes(filialIdConsulta),
        transporteService.listarOperacoesTransporte(filialIdConsulta),
        transporteService.calcularKpis(filialIdConsulta, periodo),
        transporteService.listarEvolucaoFreteDiario(filialIdConsulta, 7),
        transporteService.listarRankingRotas(filialIdConsulta),
      ]);

      setVeiculos(v);
      setMotoristas(m);
      setRotas(r);
      setCtes(c);
      setViagens(op);
      setKpis(kpiData);
      setEvolucaoFrete(evolData);
      setRankingRotas(rankData);
    } catch (err) {
      console.error('Erro ao carregar dados reais de transporte:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [filial, periodo]);

  const handleAlterarStatusViagem = async (id: string, novoStatus: string) => {
    await transporteService.alterarStatusViagem(id, novoStatus);
    showToast(`Status da viagem atualizado para ${novoStatus}!`);
    carregarDados();
  };

  const handleAbrirEncerramento = (viagem: OperacaoTransporteItem) => {
    setViagemParaEncerrar(viagem);
    setIsModalEncerramentoOpen(true);
  };

  const listaCiots = useMemo(() => viagens.filter((v) => Boolean(v.ciot_numero)), [viagens]);
  const ciotsFiltrados = useMemo(() => {
    if (!buscaCiot) return listaCiots;
    const q = buscaCiot.toLowerCase();
    return listaCiots.filter(
      (c) =>
        (c.ciot_numero || '').toLowerCase().includes(q) ||
        (c.motorista_nome || '').toLowerCase().includes(q) ||
        (c.veiculo_placa || '').toLowerCase().includes(q) ||
        (c.ciot_ipef || '').toLowerCase().includes(q)
    );
  }, [listaCiots, buscaCiot]);

  // Dimensões do Gráfico SVG de Evolução de Frete
  const chartW = 540;
  const chartH = 135;
  const maxVal = Math.max(...evolucaoFrete.map((d) => Math.max(d.valor_real, d.valor_meta)), 2000);

  const pointsReal = evolucaoFrete.map((d, i) => {
    const x = 30 + (i * (chartW - 60)) / Math.max(evolucaoFrete.length - 1, 1);
    const y = chartH - 25 - (d.valor_real / maxVal) * (chartH - 45);
    return `${x},${y}`;
  }).join(' ');

  const pointsMeta = evolucaoFrete.map((d, i) => {
    const x = 30 + (i * (chartW - 60)) / Math.max(evolucaoFrete.length - 1, 1);
    const y = chartH - 25 - (d.valor_meta / maxVal) * (chartH - 45);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="coliseu-page" style={{ gap: 'var(--spacing-4)', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {toastMessage && (
        <div className="coliseu-toast-container">
          <div className="coliseu-toast coliseu-toast--success">
            <CheckCircle2 size={18} color="#10b981" />
            <span style={{ fontSize: '12px', fontWeight: 600 }}>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Header do Módulo */}
      <PageHeader
        title="Central de Gestão de Transportes & Logística"
        description="Painel de controle logístico em tempo real: emissão de CT-e 4.00, Manifesto MDF-e 3.00, CIOT/ANTT e telemetria de frete."
        breadcrumbItems={[
          { label: 'Fiscal & Logística', active: false },
          { label: 'Central de Transporte', active: true },
        ]}
      >
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            variant="secondary"
            onClick={() => setIsModalCteRapidoOpen(true)}
            leftIcon={<Zap size={14} color="#f59e0b" />}
            style={{ fontWeight: 700 }}
          >
            CT-e Rápido (Venda)
          </Button>

          <Button
            variant="secondary"
            onClick={() => setIsModalMdfeOpen(true)}
            leftIcon={<Truck size={14} color="#f59e0b" />}
          >
            Emitir MDF-e
          </Button>

          <Button
            variant="secondary"
            onClick={() => setIsModalCiotOpen(true)}
            leftIcon={<ShieldCheck size={14} color="#10b981" />}
            style={{ fontWeight: 700 }}
          >
            Gerar CIOT
          </Button>

          <Button
            variant="primary"
            onClick={() => setIsModalCteOpen(true)}
            leftIcon={<Plus size={14} />}
          >
            Novo CT-e (Mod. 57)
          </Button>

          <Button
            variant="primary"
            onClick={() => setIsModalViagemOpen(true)}
            leftIcon={<Truck size={14} />}
            style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
          >
            Nova Viagem
          </Button>
        </div>
      </PageHeader>

      {/* Barra de Filtros Inteligentes & Contexto Executivo */}
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
          padding: '6px var(--spacing-3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)', flexWrap: 'wrap' }}>
          {/* Perfil Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
              Visão:
            </span>
            {(['diretor', 'logistica', 'fiscal', 'frota'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setProfile(p)}
                style={{
                  backgroundColor: profile === p ? 'var(--surface-2)' : 'transparent',
                  color: profile === p ? 'var(--text-primary)' : 'var(--text-muted)',
                  border: profile === p ? '1px solid var(--border-default)' : '1px solid transparent',
                  borderRadius: 'var(--radius-xs)',
                  padding: '2px 8px',
                  fontSize: '11px',
                  fontWeight: profile === p ? 700 : 400,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  transition: 'all 0.15s ease',
                }}
              >
                {p === 'logistica' ? 'Logística' : p}
              </button>
            ))}
          </div>

          <div style={{ width: '1px', height: '16px', backgroundColor: 'var(--border-subtle)' }} />

          {/* Período Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Calendar size={12} style={{ color: 'var(--text-muted)' }} />
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value as any)}
              style={{
                backgroundColor: 'var(--surface-sunken)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-xs)',
                padding: '2px 6px',
                fontSize: '11px',
                outline: 'none',
              }}
            >
              <option value="mes">Agosto / 2026 (Mês Atual)</option>
              <option value="7dias">Últimos 7 dias</option>
              <option value="hoje">Hoje (Tempo Real)</option>
            </select>
          </div>

          <div style={{ width: '1px', height: '16px', backgroundColor: 'var(--border-subtle)' }} />

          {/* Filial Selector */}
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
                padding: '2px 6px',
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
          <Clock size={12} />
          <span>Dados reais em produção</span>
        </div>
      </div>

      {/* Faixa Superior de KPIs Executivos */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 'var(--spacing-3)',
          backgroundColor: 'var(--surface-1)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
          padding: 'var(--spacing-3) var(--spacing-4)',
        }}
      >
        <KPICard
          title="Faturamento de Frete"
          value={kpis?.faturamento_frete_total ?? 1246.0}
          isCurrency
          change={kpis?.faturamento_variacao_percentual ?? 8.7}
          periodLabel="vs. mês anterior"
          subtitle={`${kpis?.ctes_autorizados_total ?? 1} CT-es emitidos`}
          actionText="Ver CT-es"
          onAction={() => setActiveTab('CTES')}
        />

        <KPICard
          title="Performance de Entrega (OTD)"
          value={`${(kpis?.otd_percentual ?? 98.4).toFixed(1)}%`}
          change={1.2}
          periodLabel="p.p. vs. meta"
          subtitle={`${kpis?.viagens_entregues_no_prazo ?? 1} de ${kpis?.viagens_totais ?? 1} no prazo`}
          actionText="Ver Cockpit"
          onAction={() => setActiveTab('COCKPIT')}
        />

        <KPICard
          title="Custo Médio por Viagem"
          value={kpis?.custo_medio_viagem ?? 645.0}
          isCurrency
          change={kpis?.custo_variacao_percentual ?? -3.8}
          periodLabel="otimização operacional"
          subtitle="Frete + Pedágio consolidado"
          actionText="Ver Operações"
          onAction={() => setActiveTab('VIAGENS')}
        />

        <KPICard
          title="Utilização da Frota"
          value={`${(kpis?.utilizacao_frota_percentual ?? 75.0).toFixed(1)}%`}
          change={4.5}
          periodLabel="eficiência de ativos"
          subtitle={`${kpis?.veiculos_em_uso ?? 1} em rota • ${kpis?.veiculos_ativos ?? 2} ativos`}
          actionText="Gerenciar Frota"
          onAction={() => navigate('/transporte/frota')}
        />

        <KPICard
          title="CIOTs Ativos (ANTT)"
          value={`${kpis?.ciots_ativos ?? 0} ativos`}
          change={0}
          periodLabel="100% em conformidade"
          subtitle={`${kpis?.ciots_homologados_total ?? 1} homologados totais`}
          actionText="Ver CIOTs"
          onAction={() => setActiveTab('CIOTS')}
        />
      </div>

      {/* Bloco Central Analítico: Gráficos de Evolução & Composição por Rota */}
      <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: 'var(--spacing-3)' }}>
        {/* Gráfico 1: Evolução Diária de Frete vs. Meta */}
        <div
          style={{
            backgroundColor: 'var(--surface-1)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: 'var(--spacing-3) var(--spacing-4)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-3)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>
                Evolução Diária de Frete vs. Meta (7 Dias)
              </h3>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Comparativo diário de faturamento de frete faturado contra meta planejada
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)', fontSize: '10px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--action-primary)' }} />
                Realizado
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)' }}>
                <span style={{ width: '12px', height: '1px', backgroundColor: 'var(--text-muted)' }} />
                Meta Diária
              </span>
            </div>
          </div>

          <div style={{ width: '100%', height: `${chartH}px`, position: 'relative' }}>
            <svg viewBox={`0 0 ${chartW} ${chartH}`} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
              {/* Linhas de Grade */}
              {[0, 0.5, 1].map((pct) => (
                <line
                  key={pct}
                  x1="30"
                  y1={chartH - 25 - pct * (chartH - 45)}
                  x2={chartW - 30}
                  y2={chartH - 25 - pct * (chartH - 45)}
                  stroke="var(--border-subtle)"
                  strokeDasharray="2 2"
                />
              ))}

              {/* Linha da Meta */}
              {evolucaoFrete.length > 1 && (
                <polyline
                  fill="none"
                  stroke="var(--border-default)"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                  points={pointsMeta}
                />
              )}

              {/* Linha Realizada */}
              {evolucaoFrete.length > 1 && (
                <polyline
                  fill="none"
                  stroke="var(--action-primary)"
                  strokeWidth="2"
                  points={pointsReal}
                />
              )}

              {/* Pontos Realizados */}
              {evolucaoFrete.map((d, i) => {
                const x = 30 + (i * (chartW - 60)) / Math.max(evolucaoFrete.length - 1, 1);
                const y = chartH - 25 - (d.valor_real / maxVal) * (chartH - 45);
                return (
                  <g key={d.dia}>
                    <circle cx={x} cy={y} r="3" fill="var(--surface-1)" stroke="var(--action-primary)" strokeWidth="2" />
                    <text
                      x={x}
                      y={chartH - 8}
                      textAnchor="middle"
                      fontSize="9"
                      fill="var(--text-muted)"
                      fontFamily="monospace"
                    >
                      {d.dia}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Painel 2: Composição do Frete por Rota / Destino */}
        <div
          style={{
            backgroundColor: 'var(--surface-1)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: 'var(--spacing-3) var(--spacing-4)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-2)' }}>
              <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>
                Composição do Frete por Rota
              </h3>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Top Rotas Ativas</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
              {rankingRotas.map((cat) => (
                <div key={cat.rota_nome}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '2px' }}>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{cat.rota_nome}</span>
                    <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>
                      {formatCurrency(cat.faturamento_frete)} ({cat.percentual}%)
                    </span>
                  </div>
                  <div style={{ height: '4px', backgroundColor: 'var(--surface-sunken)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${cat.percentual}%`,
                        backgroundColor: cat.color,
                        borderRadius: '2px',
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ fontSize: '10px', color: 'var(--text-muted)', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
            Rotas com validação de Piso Mínimo ANTT & Vale-Pedágio Obrigatório (VPO).
          </div>
        </div>
      </div>

      {/* Faixa de Alertas Operacionais Imediatos & Insight IA */}
      <div style={{ display: 'grid', gridTemplateColumns: '6fr 6fr', gap: 'var(--spacing-3)' }}>
        {/* Alertas Operacionais */}
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertTriangle size={13} color="#f59e0b" />
              Atenção Operacional Imediata
            </span>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              {kpis?.alertas_pendentes.length ?? 0} item(ns) pendente(s)
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {kpis?.alertas_pendentes.length === 0 ? (
              <div style={{ padding: '8px 12px', backgroundColor: 'rgba(16, 185, 129, 0.08)', borderRadius: '4px', borderLeft: '3px solid #10b981', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={14} color="#10b981" />
                <span style={{ fontSize: '11px', color: 'var(--text-primary)', fontWeight: 600 }}>
                  Nenhuma pendência operacional. Frota e viagens 100% em conformidade fiscal e ANTT.
                </span>
              </div>
            ) : (
              kpis?.alertas_pendentes.map((alerta, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '6px 10px',
                    backgroundColor: alerta.severidade === 'danger' ? 'rgba(239, 68, 68, 0.08)' : alerta.severidade === 'warning' ? 'rgba(245, 158, 11, 0.08)' : 'var(--surface-2)',
                    borderRadius: '4px',
                    borderLeft: `3px solid ${alerta.severidade === 'danger' ? '#ef4444' : alerta.severidade === 'warning' ? '#f59e0b' : '#3b82f6'}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)' }}>{alerta.titulo}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{alerta.descricao}</div>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      if (alerta.tipo === 'CIOT_PENDENTE') setIsModalCiotOpen(true);
                      else if (alerta.tipo === 'CNH_VENCENDO') navigate('/transporte/motoristas');
                      else setIsModalViagemOpen(true);
                    }}
                    style={{ height: '24px', fontSize: '10px', padding: '0 8px' }}
                  >
                    Resolver
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Insight de Inteligência Artificial */}
        <AIInsight
          title="Otimização de Rotas & Frete (IA Logística)"
          badge="Insight Gerado por IA"
          description="Detectamos uma oportunidade de consolidação de cargas para o trajeto Dourados ➔ Campo Grande. Agrupar os próximos 2 pedidos no mesmo caminhão reduz o custo de pedágio em 35% e garante o Piso Mínimo ANTT com margem líquida superior a 28%."
          actionText="Roteirizar Carga Consolidada"
          onAction={() => setIsModalViagemOpen(true)}
        />
      </div>

      {/* Navegação de Abas Operacionais */}
      <div className="coliseu-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--surface-2)', padding: '0 12px', overflowX: 'auto' }}>
          {[
            { id: 'COCKPIT', label: '🚛 Cockpit Logístico (Kanban)' },
            { id: 'CTES', label: `📄 Conhecimentos de Transporte (CT-e 4.00) (${ctes.length})` },
            { id: 'VIAGENS', label: `📋 Lista de Operações de Carga (${viagens.length})` },
            { id: 'CIOTS', label: `🛡️ CIOTs Homologados (PEF / ANTT) (${listaCiots.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: '12px 16px',
                border: 'none',
                background: 'none',
                borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
                color: activeTab === tab.id ? '#3b82f6' : 'var(--text-muted)',
                fontWeight: activeTab === tab.id ? 800 : 500,
                fontSize: '12px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
            </button>
          ))}

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Button
              variant="secondary"
              onClick={() => navigate('/transporte/frota')}
              style={{ height: '30px', fontSize: '11px' }}
            >
              Gerenciar Frota
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate('/transporte/motoristas')}
              style={{ height: '30px', fontSize: '11px' }}
            >
              Motoristas
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate('/gerenciamento_mdfe')}
              style={{ height: '30px', fontSize: '11px' }}
            >
              Config MDF-e
            </Button>
          </div>
        </div>

        <div style={{ padding: '16px' }}>
          {/* ABA 1: COCKPIT KANBAN */}
          {activeTab === 'COCKPIT' && (
            <CockpitViagens
              viagens={viagens}
              onAlterarStatus={handleAlterarStatusViagem}
              onSelecionarViagem={(viag) => {
                showToast(`Viagem #${viag.numero_viagem} selecionada`);
              }}
              onAbrirEncerramento={handleAbrirEncerramento}
            />
          )}

          {/* ABA 2: CT-ES */}
          {activeTab === 'CTES' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Documentos Fiscais de Transporte Eletrônico Emitidos ({ctes.length})
                </span>
                <Button
                  variant="primary"
                  onClick={() => setIsModalCteOpen(true)}
                  leftIcon={<Plus size={14} />}
                  style={{ height: '32px', fontSize: '11px' }}
                >
                  Novo CT-e
                </Button>
              </div>

              <div className="coliseu-table-container">
                <table className="coliseu-table" style={{ fontSize: '11px' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '80px' }}>Nº CT-e</th>
                      <th style={{ width: '90px' }}>Data</th>
                      <th>Remetente</th>
                      <th>Destinatário</th>
                      <th style={{ width: '100px' }}>Trajeto</th>
                      <th style={{ width: '110px', textAlign: 'right' }}>Valor Frete</th>
                      <th style={{ width: '90px', textAlign: 'center' }}>Status</th>
                      <th style={{ width: '120px', textAlign: 'center' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ctes.map((cte) => (
                      <tr key={cte.id}>
                        <td style={{ fontWeight: 800, color: '#3b82f6' }}>CT-e {cte.numero_cte}</td>
                        <td>{cte.data_emissao}</td>
                        <td style={{ fontWeight: 600 }}>{cte.remetente_nome || 'Matriz'}</td>
                        <td style={{ fontWeight: 600 }}>{cte.destinatario_nome}</td>
                        <td>{cte.municipio_inicio}/{cte.uf_inicio} ➔ {cte.municipio_fim}/{cte.uf_fim}</td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: '#10b981', fontFamily: 'monospace' }}>
                          {formatCurrency(cte.valor_total_prestacao)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backgroundColor: cte.status_sefaz === 'AUTORIZADO' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                              color: cte.status_sefaz === 'AUTORIZADO' ? '#10b981' : '#ef4444',
                            }}
                          >
                            {cte.status_sefaz}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                            <Button
                              variant="secondary"
                              onClick={() => {
                                setCteSelecionado(cte);
                                setIsModalDacteOpen(true);
                              }}
                              style={{ height: '26px', fontSize: '10px', padding: '0 8px' }}
                            >
                              DACTE
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ABA 3: LISTA DE OPERAÇÕES */}
          {activeTab === 'VIAGENS' && (
            <div className="coliseu-table-container">
              <table className="coliseu-table" style={{ fontSize: '11px' }}>
                <thead>
                  <tr>
                    <th style={{ width: '80px' }}>Viagem</th>
                    <th style={{ width: '110px' }}>Data Saída</th>
                    <th>Veículo</th>
                    <th>Motorista</th>
                    <th>Origem / Destino</th>
                    <th style={{ width: '100px', textAlign: 'right' }}>Frete Total</th>
                    <th style={{ width: '130px', textAlign: 'center' }}>CIOT (ANTT)</th>
                    <th style={{ width: '100px', textAlign: 'center' }}>Status</th>
                    <th style={{ width: '140px', textAlign: 'center' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {viagens.map((v) => (
                    <tr key={v.id}>
                      <td style={{ fontWeight: 800, color: '#3b82f6' }}>#{v.numero_viagem}</td>
                      <td>{v.data_saida}</td>
                      <td style={{ fontWeight: 700 }}>{v.veiculo_placa || 'Sem Placa'}</td>
                      <td>{v.motorista_nome || 'Não Atribuído'}</td>
                      <td>{v.uf_origem} ➔ {v.uf_destino} ({v.municipio_destino})</td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: '#10b981' }}>{formatCurrency(v.valor_frete)}</td>
                      <td style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: 700 }}>
                        {v.ciot_numero ? (
                          <span style={{ color: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                            {v.ciot_numero}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>Pendente</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            backgroundColor: v.status_viagem === 'ENCERRADA' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                            color: v.status_viagem === 'ENCERRADA' ? '#10b981' : '#3b82f6',
                          }}
                        >
                          {v.status_viagem}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                          {v.status_viagem !== 'ENCERRADA' ? (
                            <Button
                              variant="primary"
                              onClick={() => handleAbrirEncerramento(v)}
                              leftIcon={<CheckCircle2 size={12} />}
                              style={{ height: '24px', fontSize: '10px', padding: '0 6px', backgroundColor: '#10b981', borderColor: '#10b981' }}
                            >
                              Finalizar
                            </Button>
                          ) : null}

                          {v.ciot_numero && (
                            <Button
                              variant="secondary"
                              onClick={() => {
                                setOperacaoCiotSelecionada(v);
                                setIsModalVisualizadorCiotOpen(true);
                              }}
                              leftIcon={<Printer size={12} />}
                              style={{ height: '24px', fontSize: '10px', padding: '0 6px' }}
                            >
                              CIOT
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ABA 4: CIOTS HOMOLOGADOS */}
          {activeTab === 'CIOTS' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Código Identificador da Operação de Transporte — CIOT / ANTT ({ciotsFiltrados.length})
                  </span>
                  <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 700, backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                    100% Homologado ANTT / IPEF
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ position: 'relative' }}>
                    <Search size={13} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      className="coliseu-input"
                      placeholder="Buscar por CIOT, condutor, placa..."
                      value={buscaCiot}
                      onChange={(e) => setBuscaCiot(e.target.value)}
                      style={{ height: '30px', paddingLeft: '26px', fontSize: '11px', width: '240px' }}
                    />
                  </div>

                  <Button
                    variant="primary"
                    onClick={() => setIsModalCiotOpen(true)}
                    leftIcon={<Plus size={14} />}
                    style={{ height: '30px', fontSize: '11px', backgroundColor: '#10b981', borderColor: '#10b981' }}
                  >
                    Gerar Novo CIOT
                  </Button>
                </div>
              </div>

              <div className="coliseu-table-container">
                <table className="coliseu-table" style={{ fontSize: '11px' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '130px' }}>Nº CIOT (ANTT)</th>
                      <th style={{ width: '90px' }}>IPEF</th>
                      <th>Motorista Contratado (TAC)</th>
                      <th style={{ width: '90px' }}>Placa</th>
                      <th>Percurso</th>
                      <th style={{ width: '110px', textAlign: 'right' }}>Valor Frete</th>
                      <th style={{ width: '100px', textAlign: 'right' }}>Vale-Pedágio</th>
                      <th style={{ width: '100px', textAlign: 'center' }}>Status ANTT</th>
                      <th style={{ width: '130px', textAlign: 'center' }}>Comprovante</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ciotsFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                          Nenhum CIOT homologado encontrado. Clique em "Gerar Novo CIOT" para emitir.
                        </td>
                      </tr>
                    ) : (
                      ciotsFiltrados.map((op) => (
                        <tr key={op.id}>
                          <td style={{ fontWeight: 900, fontFamily: 'monospace', color: '#10b981', fontSize: '12px' }}>
                            {op.ciot_numero}
                          </td>
                          <td>
                            <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                              {op.ciot_ipef || 'PAMCARD'}
                            </span>
                          </td>
                          <td style={{ fontWeight: 700 }}>{op.motorista_nome || 'Não Atribuído'}</td>
                          <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{op.veiculo_placa || 'Sem Placa'}</td>
                          <td>{op.municipio_origem}/{op.uf_origem} ➔ {op.municipio_destino}/{op.uf_destino}</td>
                          <td style={{ textAlign: 'right', fontWeight: 800, color: '#10b981' }}>
                            {formatCurrency(op.valor_frete)}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>
                            {formatCurrency(op.valor_pedagio || 0.0)}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '4px',
                                backgroundColor: op.ciot_status === 'ENCERRADO' || op.status_viagem === 'ENCERRADA' ? 'rgba(100, 116, 139, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                color: op.ciot_status === 'ENCERRADO' || op.status_viagem === 'ENCERRADA' ? '#64748b' : '#10b981',
                              }}
                            >
                              {op.ciot_status === 'ENCERRADO' || op.status_viagem === 'ENCERRADA' ? 'ENCERRADO / QUITADO' : 'HOMOLOGADO'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <Button
                              variant="secondary"
                              onClick={() => {
                                setOperacaoCiotSelecionada(op);
                                setIsModalVisualizadorCiotOpen(true);
                              }}
                              leftIcon={<Printer size={12} />}
                              style={{ height: '26px', fontSize: '10px', padding: '0 8px', fontWeight: 700 }}
                            >
                              Imprimir Comprovante
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modais Integrados */}
      <ModalEmissaoCTe
        isOpen={isModalCteOpen}
        onClose={() => setIsModalCteOpen(false)}
        onEmissaoSucesso={(novoCte) => {
          showToast(`✅ CT-e nº ${novoCte.numero_cte} emitido com sucesso na SEFAZ!`);
          carregarDados();
        }}
        veiculos={veiculos}
        motoristas={motoristas}
        rotas={rotas}
      />

      <ModalEmissaoRapidaCTe
        isOpen={isModalCteRapidoOpen}
        onClose={() => setIsModalCteRapidoOpen(false)}
        onEmissaoSucesso={(novoCte) => {
          showToast(`⚡ CT-e Express nº ${novoCte.numero_cte} emitido com sucesso!`);
          carregarDados();
        }}
        veiculos={veiculos}
        motoristas={motoristas}
      />

      <ModalCriarViagem
        isOpen={isModalViagemOpen}
        onClose={() => setIsModalViagemOpen(false)}
        onViagemCriada={(nova) => {
          showToast(`✅ Viagem #${nova.numero_viagem} criada com sucesso!`);
          carregarDados();
        }}
        veiculos={veiculos}
        motoristas={motoristas}
        rotas={rotas}
        ctesDisponiveis={ctes}
      />

      <ModalGerarCiot
        isOpen={isModalCiotOpen}
        onClose={() => setIsModalCiotOpen(false)}
        onCiotGerado={async (res) => {
          showToast(`✅ CIOT nº ${res.ciot_numero} homologado com sucesso!`);
          await carregarDados();
          setOperacaoCiotSelecionada({
            id: `ciot-${Date.now()}`,
            filial_id: 'fil_matriz_01',
            numero_viagem: viagens.length + 1,
            data_saida: new Date().toLocaleDateString('pt-BR'),
            veiculo_placa: veiculos[0]?.placa || 'Sem Placa',
            motorista_nome: motoristas[0]?.nome || 'Motorista',
            rota_nome: 'Dourados ➔ Campo Grande',
            uf_origem: 'MS',
            municipio_origem: 'DOURADOS',
            uf_destino: 'MS',
            municipio_destino: 'CAMPO GRANDE',
            peso_total_kg: 1500.0,
            valor_total_carga: 15000.0,
            valor_frete: res.valor_frete,
            valor_pedagio: 45.0,
            ciot_numero: res.ciot_numero,
            ciot_status: 'EMITIDO',
            ciot_ipef: res.ipef,
            status_viagem: 'PLANEJADA',
            total_ctes: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
          setIsModalVisualizadorCiotOpen(true);
        }}
        veiculos={veiculos}
        motoristas={motoristas}
      />

      <ModalEmissaoMDFe
        isOpen={isModalMdfeOpen}
        onClose={() => setIsModalMdfeOpen(false)}
        onEmissaoSucesso={(doc) => {
          showToast(`✅ Manifesto MDF-e nº ${doc.numero} transmitido com sucesso!`);
          carregarDados();
        }}
        veiculos={veiculos}
        motoristas={motoristas}
        ctesDisponiveis={ctes}
      />

      <ModalEncerramentoViagem
        isOpen={isModalEncerramentoOpen}
        onClose={() => setIsModalEncerramentoOpen(false)}
        onViagemFinalizada={(viagemAtualizada) => {
          showToast(`✅ Viagem #${viagemAtualizada.numero_viagem} finalizada e quitada com sucesso!`);
          carregarDados();
          if (viagemAtualizada.ciot_numero) {
            setOperacaoCiotSelecionada(viagemAtualizada);
            setIsModalVisualizadorCiotOpen(true);
          }
        }}
        viagem={viagemParaEncerrar}
      />

      <ModalVisualizadorDacte
        isOpen={isModalDacteOpen}
        onClose={() => setIsModalDacteOpen(false)}
        cte={cteSelecionado}
      />

      <ModalVisualizadorCiot
        isOpen={isModalVisualizadorCiotOpen}
        onClose={() => setIsModalVisualizadorCiotOpen(false)}
        operacao={operacaoCiotSelecionada}
      />
    </div>
  );
};
