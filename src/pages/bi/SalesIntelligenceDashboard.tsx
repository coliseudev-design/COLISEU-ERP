import { useState, useMemo, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useBiPeriodQuery } from '../../hooks/useBiPeriodQuery';
import { useBranchPeriodQuery } from '../../hooks/useApi';
import { BIService } from '../../services/biApi';
import { BiPeriodFilter } from '../../types/bi.types';
import { 
  TrendingUp, TrendingDown, DollarSign, Box, Target, Trophy, 
  BarChart3, FileText, ChevronLeft, ChevronRight, ArrowUpDown, 
  Calendar, ShoppingBag, EyeOff
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { formatBRL, formatBRLCompact, formatNum } from '../../utils/format';
import clsx from 'clsx';

// Badge Comparativo
const ComparisonBadge = ({ pct }: { pct: number }) => {
  const isUp = pct > 0;
  const isDown = pct < 0;
  return (
    <div className={clsx(
      "flex items-center text-xs font-bold px-2 py-1 rounded-md mt-1 w-fit",
      isUp ? "bg-success/10 text-success" : isDown ? "bg-danger/10 text-danger" : "bg-text-muted/10 text-text-muted"
    )}>
      {isUp && <TrendingUp size={14} className="mr-1" />}
      {isDown && <TrendingDown size={14} className="mr-1" />}
      {Math.abs(pct).toFixed(1)}% vs. anterior
    </div>
  );
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-bg-primary border border-border shadow-card-hover p-3 rounded-lg z-50">
        <p className="text-text-secondary text-xs mb-1 font-medium">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm font-bold" style={{ color: entry.color || 'var(--color-text-primary)' }}>
            {entry.name === 'total' || entry.name === 'valor' || entry.name === 'value' || entry.name === 'vendas'
              ? formatBRL(entry.value)
              : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function SalesIntelligenceDashboard() {
  const [isMobile, setIsMobile] = useState(false);
  const [evolutionViewMode, setEvolutionViewMode] = useState<'chart' | 'text'>('chart');

  // Table sorting states
  const [sortField, setSortField] = useState<'data' | 'valor' | 'cliente'>('data');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  // Table status filter state
  const [statusFilter] = useState<string>('TODOS');
  // Table pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const [evolutionGroupBy, setEvolutionGroupBy] = useState<'dia' | 'mes'>('dia');
  const [selectedYear, setSelectedYear] = useState<string>('all');

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const context = useOutletContext<any>() || {};
  const { filter } = context;

  const [localVendedor, setLocalVendedor] = useState<string>('all');
  const [localCidade, setLocalCidade] = useState<string>('all');

  const selectedVendedor = context.selectedVendedor !== undefined ? context.selectedVendedor : localVendedor;
  const setSelectedVendedor = context.setSelectedVendedor !== undefined ? context.setSelectedVendedor : setLocalVendedor;

  const selectedCidade = context.selectedCidade !== undefined ? context.selectedCidade : localCidade;
  const setSelectedCidade = context.setSelectedCidade !== undefined ? context.setSelectedCidade : setLocalCidade;

  // List of sellers and cities unfiltered for the dropdown lists
  const vdFull = useBranchPeriodQuery<any>('/ranking/vendedores', { limit: 100 });
  const cidadesFull = useBranchPeriodQuery<any>('/ranking/cidades', { limit: 100 });

  const activeFilter = useMemo(() => ({
    ...filter,
    vendedor_id: selectedVendedor !== 'all' ? selectedVendedor : undefined,
    cidade: selectedCidade !== 'all' ? selectedCidade : undefined
  }), [filter, selectedVendedor, selectedCidade]);

  // Query both endpoints simultaneously
  const { data: salesIntData, isLoading: isSalesIntLoading, isError: isSalesIntError } = useBiPeriodQuery(
    ['bi', 'sales-intelligence'],
    BIService.getSalesIntelligence,
    activeFilter
  );

  const { data: salesHubData, isLoading: isSalesHubLoading, isError: isSalesHubError } = useBiPeriodQuery(
    ['bi', 'sales-hub-kpis'],
    BIService.getSalesHub,
    activeFilter
  );

  const isLoading = isSalesIntLoading || isSalesHubLoading;
  const isError = isSalesIntError || isSalesHubError;

  const summary = salesIntData?.executive_summary || {
    faturamento: 0, faturamento_anterior: 0, crescimento_pct: 0,
    quantidade_pedidos: 0, quantidade_pedidos_anterior: 0, crescimento_pedidos_pct: 0,
    ticket_medio: 0, ticket_medio_anterior: 0, crescimento_ticket_pct: 0,
    clientes_ativos: 0
  };

  // Safe data transformations
  const revenueTrajectory = useMemo(() => {
    return (salesIntData?.revenue_trajectory || []).map(r => ({
      dia: r.dia || r.date || '',
      valor: Number(r.valor !== undefined ? r.valor : r.value || 0)
    }));
  }, [salesIntData?.revenue_trajectory]);

  // Available years from trajectory data
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    revenueTrajectory.forEach((item: any) => {
      if (item.dia && item.dia.includes('-')) {
        years.add(item.dia.split('-')[0]);
      }
    });
    return Array.from(years).sort();
  }, [revenueTrajectory]);

  // Filtered trajectory by selected year
  const filteredTrajectory = useMemo(() => {
    if (selectedYear === 'all') return revenueTrajectory;
    return revenueTrajectory.filter((item: any) =>
      item.dia && item.dia.startsWith(selectedYear)
    );
  }, [revenueTrajectory, selectedYear]);

  // Grouped Evolution Data (Daily or Monthly)
  const groupedEvolutionData = useMemo(() => {
    if (evolutionGroupBy === 'dia') {
      return filteredTrajectory.map((item: any) => {
        let label = item.dia;
        if (label && label.includes('-')) {
          const parts = label.split('-');
          if (parts.length >= 3) {
            label = `${parts[2]}/${parts[1]}`;
          }
        }
        return {
          label,
          value: item.valor
        };
      });
    } else {
      const groups: Record<string, { key: string; label: string; value: number }> = {};
      filteredTrajectory.forEach((item: any) => {
        let monthKey = '';
        let monthLabel = '';
        if (item.dia && item.dia.includes('-')) {
          const parts = item.dia.split('-');
          if (parts.length >= 2) {
            const year = parts[0];
            const month = parts[1];
            monthKey = `${year}-${month}`;
            const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
            const monthIdx = parseInt(month, 10) - 1;
            const shortYear = year.slice(2);
            if (monthIdx >= 0 && monthIdx < 12) {
              monthLabel = `${monthNames[monthIdx]}/${shortYear}`;
            } else {
              monthLabel = `${month}/${year}`;
            }
          }
        }
        if (monthKey) {
          if (!groups[monthKey]) {
            groups[monthKey] = { key: monthKey, label: monthLabel, value: 0 };
          }
          groups[monthKey].value += item.valor || 0;
        }
      });
      return Object.values(groups)
        .sort((a, b) => a.key.localeCompare(b.key))
        .map(g => ({
          label: g.label,
          value: g.value
        }));
    }
  }, [filteredTrajectory, evolutionGroupBy]);

  const isPeriodOver30Days = useMemo(() => {
    if (filter.period === 'last12m') return true;
    if (filter.start_date && filter.end_date) {
      const s = new Date(filter.start_date + 'T00:00:00');
      const e = new Date(filter.end_date + 'T23:59:59');
      const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
      return diff > 30;
    }
    return false;
  }, [filter]);

  useEffect(() => {
    if (isPeriodOver30Days) {
      setEvolutionGroupBy('mes');
    } else {
      setEvolutionGroupBy('dia');
    }
  }, [isPeriodOver30Days]);

  // Chronological Details per Day or Month
  const chronologicalDetails = useMemo(() => {
    if (evolutionGroupBy === 'dia') {
      return revenueTrajectory.map((d) => {
        let formattedDate = d.dia;
        if (formattedDate && formattedDate.includes('-')) {
          const parts = formattedDate.split('-');
          if (parts.length >= 3) {
            formattedDate = `${parts[2]}/${parts[1]}/${parts[0].slice(2)}`;
          }
        }
        return {
          label: formattedDate,
          value: d.valor,
          key: d.dia
        };
      }).sort((a, b) => a.key.localeCompare(b.key));
    } else {
      // Group by month
      const groups: Record<string, { key: string; label: string; value: number }> = {};
      revenueTrajectory.forEach((item: any) => {
        let monthKey = '';
        let monthLabel = '';
        if (item.dia && item.dia.includes('-')) {
          const parts = item.dia.split('-');
          if (parts.length >= 2) {
            const year = parts[0];
            const month = parts[1];
            monthKey = `${year}-${month}`;
            const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
            const monthIdx = parseInt(month, 10) - 1;
            const shortYear = year.slice(2);
            if (monthIdx >= 0 && monthIdx < 12) {
              monthLabel = `${monthNames[monthIdx]}/${shortYear}`;
            } else {
              monthLabel = `${month}/${year}`;
            }
          }
        }
        if (monthKey) {
          if (!groups[monthKey]) {
            groups[monthKey] = { key: monthKey, label: monthLabel, value: 0 };
          }
          groups[monthKey].value += item.valor || 0;
        }
      });
      return Object.values(groups)
        .sort((a, b) => a.key.localeCompare(b.key))
        .map(g => ({
          label: g.label,
          value: g.value,
          key: g.key
        }));
    }
  }, [revenueTrajectory, evolutionGroupBy]);

  // Order sorting & filtering logic
  const { filteredOrders, currentOrders, totalPages } = useMemo(() => {
    const orders = salesHubData?.recent_orders || [];
    
    // Sort
    let result = [...orders].sort((a: any, b: any) => {
      let comparison = 0;
      if (sortField === 'data') {
        comparison = new Date(a.data_emissao || a.data || 0).getTime() - new Date(b.data_emissao || b.data || 0).getTime();
      } else if (sortField === 'valor') {
        comparison = (a.valor_total || a.valor || 0) - (b.valor_total || b.valor || 0);
      } else if (sortField === 'cliente') {
        comparison = String(a.cliente_nome || a.cliente || '').localeCompare(String(b.cliente_nome || b.cliente || ''));
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    const totalPages = Math.ceil(result.length / itemsPerPage) || 1;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentOrders = result.slice(startIndex, startIndex + itemsPerPage);
    
    return { filteredOrders: result, currentOrders, totalPages };
  }, [salesHubData?.recent_orders, sortField, sortOrder, currentPage]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [sortField, sortOrder, selectedVendedor, selectedCidade, filter]);

  const handleSort = (field: 'data' | 'valor' | 'cliente') => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const getRevenueTrajectorySummary = () => {
    if (revenueTrajectory.length === 0) return "Nenhum dado de evolução disponível.";
    const sorted = [...revenueTrajectory].sort((a: any, b: any) => b.valor - a.valor);
    const peak = sorted[0];
    const lowest = sorted[sorted.length - 1];
    return `A evolução comercial indica variações de faturamento, com pico no dia ${peak.dia} (${formatBRL(peak.valor)}) e menor faturamento no dia ${lowest.dia} (${formatBRL(lowest.valor)}).`;
  };

  const isTrajectoryEmpty = revenueTrajectory.length === 0 || revenueTrajectory.every(r => r.valor === 0);

  const totalNotesCount = filteredOrders.length;
  const totalNotesSum = useMemo(() => {
    return filteredOrders.reduce((sum: number, o: any) => sum + (o.valor_total || o.valor || 0), 0);
  }, [filteredOrders]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-80 text-text-secondary">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500 mr-3"></div>
        Carregando Hub de vendas...
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      
      {/* HEADER SECTION */}
      <div className="hidden sm:flex flex-row items-center gap-4 border-b border-divider/40 pb-3 mb-2">
        {/* Vendedor Filter */}
        <div className="flex flex-col gap-1 w-48 lg:w-56 text-left">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider pl-1">Vendedor</span>
          <select
            value={selectedVendedor}
            onChange={(e) => setSelectedVendedor(e.target.value)}
            className="h-10 px-3 bg-bg-primary border border-border text-text-primary rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all duration-300 w-full cursor-pointer shadow-sm"
          >
            <option value="all">Todos os Vendedores</option>
            {vdFull.data?.data?.map((seller: any) => (
              <option key={seller.id} value={seller.id}>
                {seller.nome || seller.vendedor}
              </option>
            ))}
          </select>
        </div>

        {/* Cidade Filter */}
        <div className="flex flex-col gap-1 w-48 lg:w-56 text-left">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider pl-1">Cidade</span>
          <select
            value={selectedCidade}
            onChange={(e) => setSelectedCidade(e.target.value)}
            className="h-10 px-3 bg-bg-primary border border-border text-text-primary rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all duration-300 w-full cursor-pointer shadow-sm"
          >
            <option value="all">Todas as Cidades</option>
            {cidadesFull.data?.data?.map((c: any, idx: number) => (
              <option key={idx} value={c.nome}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* TOP KPIs - ASYMMETRIC GRID (1 MAIN LARGER + 4 SUPPORT CARDS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
        {/* FATURAMENTO (MAIN LARGER CARD) */}
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 relative overflow-hidden md:col-span-2 lg:col-span-2 flex flex-col justify-between">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-brand-500"></div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-brand-500/10 text-brand-500 rounded-lg">
                <DollarSign size={20} />
              </div>
              <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Faturamento Total</span>
            </div>
            <div className="text-3xl font-black text-text-primary pl-1 my-2">
              {formatBRL(summary.faturamento)}
            </div>
          </div>
          <ComparisonBadge pct={summary.crescimento_pct || 0} />
        </div>

        {/* VOLUME DE ITENS */}
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-brand-500"></div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-brand-500/10 text-brand-500 rounded-lg">
                <Box size={16} />
              </div>
              <span className="text-xs font-bold text-text-secondary uppercase tracking-wider block">Volume Itens</span>
            </div>
            <div className="text-xl font-extrabold text-text-primary pl-1 mb-1 mt-2">
              {formatNum(summary.quantidade_itens || 0)}
            </div>
          </div>
          <span className="text-[10px] text-text-muted mt-2 block font-medium">Itens comercializados</span>
        </div>

        {/* TICKET MÉDIO */}
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-brand-500"></div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-brand-500/10 text-brand-500 rounded-lg">
                <Target size={16} />
              </div>
              <span className="text-xs font-bold text-text-secondary uppercase tracking-wider block">Ticket Médio</span>
            </div>
            <div className="text-xl font-extrabold text-text-primary pl-1 mb-1 mt-2">
              {formatBRL(summary.ticket_medio || 0)}
            </div>
          </div>
          <span className="text-[10px] text-text-muted mt-2 block font-medium">Média por faturamento</span>
        </div>

        {/* NOTAS E PEDIDOS */}
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-brand-500"></div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-brand-500/10 text-brand-500 rounded-lg">
                <ShoppingBag size={16} />
              </div>
              <span className="text-xs font-bold text-text-secondary uppercase tracking-wider block">Notas / Pedidos</span>
            </div>
            <div className="text-xl font-extrabold text-text-primary pl-1 mb-1 mt-2">
              {salesHubData?.recent_orders?.length || summary.quantidade_pedidos || 0}
            </div>
          </div>
          <span className="text-[10px] text-text-muted mt-2 block font-medium">Documentos emitidos</span>
        </div>
      </div>

      {/* EVOLUÇÃO TEMPORAL (TRAJETÓRIA) */}
      <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-1">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-brand-500" />
            <h3 className="font-bold text-text-primary text-xs uppercase tracking-wider">Evolução Comercial</h3>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Filtro de Ano */}
            {availableYears.length > 1 && (
              <div className="flex items-center gap-1 bg-bg-secondary p-0.5 rounded-lg border border-divider">
                <button
                  onClick={() => setSelectedYear('all')}
                  className={clsx(
                    "px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer",
                    selectedYear === 'all'
                      ? "bg-bg-primary text-brand-500 shadow-sm"
                      : "text-text-secondary hover:text-text-primary"
                  )}
                >
                  Todos
                </button>
                {availableYears.map(year => (
                  <button
                    key={year}
                    onClick={() => setSelectedYear(year)}
                    className={clsx(
                      "px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer",
                      selectedYear === year
                        ? "bg-bg-primary text-brand-500 shadow-sm"
                        : "text-text-secondary hover:text-text-primary"
                    )}
                  >
                    {year}
                  </button>
                ))}
              </div>
            )}

            {/* Agrupamento: Diário / Mensal */}
            <div className="flex items-center gap-1 bg-bg-secondary p-0.5 rounded-lg border border-divider">
              <button
                onClick={() => setEvolutionGroupBy('dia')}
                className={clsx(
                  "px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer",
                  evolutionGroupBy === 'dia'
                    ? "bg-bg-primary text-brand-500 shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                Diário
              </button>
              <button
                onClick={() => setEvolutionGroupBy('mes')}
                className={clsx(
                  "px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer",
                  evolutionGroupBy === 'mes'
                    ? "bg-bg-primary text-brand-500 shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                Mensal
              </button>
            </div>

            {/* View Toggles */}
            <div className="flex items-center gap-1 bg-bg-secondary p-0.5 rounded-lg border border-divider">
              <button
                onClick={() => setEvolutionViewMode('chart')}
                disabled={isTrajectoryEmpty}
                className={clsx(
                  "p-1.5 rounded-md transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
                  evolutionViewMode === 'chart'
                    ? "bg-bg-primary text-brand-500 shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                )}
                title="Ver Gráfico"
              >
                <BarChart3 size={14} />
              </button>
              <button
                onClick={() => setEvolutionViewMode('text')}
                className={clsx(
                  "p-1.5 rounded-md transition-all cursor-pointer",
                  evolutionViewMode === 'text'
                    ? "bg-bg-primary text-brand-500 shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                )}
                title="Ver Resumo Textual"
              >
                <FileText size={14} />
              </button>
            </div>
          </div>
        </div>
        <p className="text-xs text-text-muted mb-4">Gráfico de faturamento realizado ao longo do período.</p>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-2">
          {/* Left Chart column (col-span-2) */}
          <div className="lg:col-span-2 h-[200px] sm:h-[260px] lg:h-[320px] w-full">
            {isTrajectoryEmpty ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-border rounded-xl bg-bg-secondary/10">
                <EyeOff size={32} className="text-text-muted mb-2 stroke-[1.5]" />
                <p className="text-xs text-text-secondary font-medium">Sem dados suficientes para gerar a evolução neste período.</p>
              </div>
            ) : evolutionViewMode === 'chart' ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={groupedEvolutionData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.3} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
                  <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => formatBRLCompact(v)} tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-bg-tertiary)', opacity: 0.4 }} />
                  <Bar dataKey="value" fill="#0D9488" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="space-y-4 h-full flex flex-col justify-between">
                <p className="text-xs text-text-secondary italic leading-relaxed border-l-2 border-brand-500 pl-3">
                  {getRevenueTrajectorySummary()}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 overflow-y-auto max-h-[160px] pr-1">
                  {groupedEvolutionData.map((item: any, index: number) => (
                    <div key={index} className="p-2 rounded-xl bg-bg-secondary/40 border border-divider">
                      <div className="text-[9px] text-text-secondary font-semibold uppercase">{item.label}</div>
                      <div className="text-xs font-bold text-text-primary font-mono mt-0.5">{formatBRL(item.value)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Chronological Details per Day or Month */}
          <div className="lg:col-span-1 flex flex-col justify-between h-[200px] sm:h-[260px] lg:h-[260px]">
            <div className="flex items-center gap-1.5 border-b border-divider/40 pb-2 mb-2">
              <Calendar size={14} className="text-brand-500" />
              <span className="text-[10px] font-bold text-text-primary uppercase tracking-wider">
                {evolutionGroupBy === 'dia' ? 'Faturamento por Dia' : 'Faturamento por Mês'}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[220px] pr-1 text-[11px] scrollbar-none divide-y divide-divider/30">
              {chronologicalDetails.map((item: any, index: number) => (
                <div key={item.key} className="flex justify-between items-center py-2 px-1 hover:bg-bg-secondary/40 rounded transition-colors">
                  <span className="text-text-secondary font-mono w-6 shrink-0">{index + 1}</span>
                  <span className="text-text-primary flex-1 font-semibold pl-2">{item.label}</span>
                  <span className="font-bold text-text-primary font-mono text-right shrink-0">{formatBRL(item.value)}</span>
                </div>
              ))}
              {chronologicalDetails.length === 0 && (
                <div className="text-center py-10 text-text-muted text-xs">Sem vendas registradas no período.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* PEDIDOS RECENTES (MODERN TABLE WITH 50-BY-50 PAGINATION & MOBILE FALLBACK) */}
      <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-divider pb-4 mb-4">
          <div>
            <h3 className="font-bold text-text-primary text-sm uppercase tracking-wider">Relação de Notas</h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Total: <span className="font-bold text-brand-500">{totalNotesCount} notas</span> faturadas no período • Acumulado: <span className="font-bold text-success">{formatBRL(totalNotesSum)}</span>
            </p>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden sm:block overflow-x-auto border border-divider/50 rounded-xl">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead>
              <tr className="border-b border-divider text-[10px] text-text-secondary uppercase font-extrabold tracking-wider bg-bg-secondary/60">
                <th 
                  onClick={() => handleSort('data')}
                  className="py-3 px-4 cursor-pointer hover:bg-bg-secondary/80 select-none transition-colors w-32"
                >
                  <div className="flex items-center gap-1">
                    DATA
                    <ArrowUpDown size={11} className={clsx(sortField === 'data' ? "text-brand-500" : "text-text-muted")} />
                  </div>
                </th>
                <th className="py-3 px-4 w-28">PEDIDO</th>
                <th className="py-3 px-4 w-40">VENDEDOR</th>
                <th 
                  onClick={() => handleSort('cliente')}
                  className="py-3 px-4 cursor-pointer hover:bg-bg-secondary/80 select-none transition-colors"
                >
                  <div className="flex items-center gap-1">
                    CLIENTE
                    <ArrowUpDown size={11} className={clsx(sortField === 'cliente' ? "text-brand-500" : "text-text-muted")} />
                  </div>
                </th>
                <th className="py-3 px-4 w-28">TIPO</th>
                <th 
                  onClick={() => handleSort('valor')}
                  className="py-3 px-4 text-right cursor-pointer hover:bg-bg-secondary/80 select-none transition-colors w-40"
                >
                  <div className="flex items-center gap-1 justify-end">
                    VALOR TOTAL
                    <ArrowUpDown size={11} className={clsx(sortField === 'valor' ? "text-brand-500" : "text-text-muted")} />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider/20">
              {currentOrders.map((order: any, idx: number) => {
                const isDevolucao = order.es === 2 || order.processo === 2 || (order.valor_total || order.valor || 0) < 0;
                return (
                  <tr key={order.id || idx} className="hover:bg-bg-secondary/40 transition-colors">
                    <td className="py-3 px-4 text-text-secondary font-medium">{order.data_emissao || order.data}</td>
                    <td className="py-3 px-4 text-text-secondary font-mono">{order.numero_nota || order.numero_pedido || '-'}</td>
                    <td className="py-3 px-4 text-text-secondary">{order.vendedor_nome || order.vendedor}</td>
                    <td className="py-3 px-4 font-bold text-text-primary truncate max-w-[240px]" title={order.cliente_nome}>
                      {order.cliente_nome || order.cliente}
                    </td>
                    <td className="py-3 px-4">
                      {isDevolucao ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-danger/10 text-danger">
                          Devolução
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-success/10 text-success">
                          Venda
                        </span>
                      )}
                    </td>
                    <td className={clsx(
                      "py-3 px-4 text-right font-mono font-extrabold",
                      isDevolucao ? "text-danger" : "text-success"
                    )}>
                      {formatBRL(order.valor_total || order.valor)}
                    </td>
                  </tr>
                );
              })}
              {currentOrders.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-text-muted font-medium">
                    Nenhuma nota encontrada para os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View Fallback */}
        <div className="sm:hidden space-y-2">
          {currentOrders.map((order: any, idx: number) => {
            const isDevolucao = order.es === 2 || order.processo === 2 || (order.valor_total || order.valor || 0) < 0;
            return (
              <div key={order.id || idx} className="p-3 border border-divider rounded-xl bg-bg-secondary/10 flex flex-col gap-1.5">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-xs font-bold text-text-primary leading-tight truncate max-w-[190px] block" title={order.cliente_nome || order.cliente}>
                      {order.cliente_nome || order.cliente}
                    </h4>
                    <div className="text-[10px] mt-1 flex items-center gap-1.5 leading-none">
                      <span className="text-[#00a896] dark:text-[#00c2ad] font-semibold">
                        {order.vendedor_nome || order.vendedor ? (order.vendedor_nome || order.vendedor).split(' ')[0] : '-'}
                      </span>
                      <span className="text-text-muted font-medium">•</span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-semibold font-mono">
                        Ped: {order.numero_nota || order.numero_pedido || '-'}
                      </span>
                    </div>
                  </div>
                  {isDevolucao ? (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-danger/10 text-danger shrink-0">
                      Devolução
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-success/10 text-success shrink-0">
                      Venda
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center pt-1.5 border-t border-divider mt-0.5">
                  <div className="flex items-center gap-1 text-[10px] text-text-muted">
                    <Calendar size={12} />
                    {order.data_emissao || order.data}
                  </div>
                  <div className={clsx(
                    "text-xs font-mono font-bold",
                    isDevolucao ? "text-danger" : "text-success"
                  )}>
                    {formatBRL(order.valor_total || order.valor)}
                  </div>
                </div>
              </div>
            );
          })}
          {currentOrders.length === 0 && (
            <div className="py-8 text-center text-text-muted text-xs">
              Nenhuma nota encontrada.
            </div>
          )}
        </div>

        {/* PAGINATION CONTROLS */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-4 pt-4 border-t border-divider/20 text-xs">
            <span className="text-[10px] sm:text-xs text-text-secondary">
              Exibindo {currentOrders.length} de {filteredOrders.length} registros
            </span>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1 rounded-md border border-divider hover:bg-bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                aria-label="Anterior"
              >
                <ChevronLeft size={16} />
              </button>
              
              <span className="font-semibold text-text-primary text-[10px] sm:text-xs">
                {currentPage} de {totalPages}
              </span>
              
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1 rounded-md border border-divider hover:bg-bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                aria-label="Próxima"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {isError && (
        <div className="bg-danger/10 border border-danger/20 text-danger p-3 rounded-lg text-sm mt-4">
          Aviso: Os dados não puderam ser carregados devido a uma falha de conexão com o banco de dados/API.
        </div>
      )}

    </div>
  );
}
