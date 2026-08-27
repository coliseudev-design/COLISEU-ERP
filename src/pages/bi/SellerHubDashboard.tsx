import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePeriodStore, periodToParams } from '../../store/periodStore';
import { useBranchParam } from '../../contexts/BranchContext';
import PeriodFilter from '../../components/PeriodFilter';
import { useBiPeriodQuery } from '../../hooks/useBiPeriodQuery';
import { useBranchPeriodQuery } from '../../hooks/useApi';
import { BIService } from '../../services/biApi';
import { BiPeriodFilter } from '../../types/bi.types';
import { 
  Trophy, Users, Box, Award, DollarSign, TrendingUp, TrendingDown, 
  Calendar, MapPin, FileText, ChevronLeft, ChevronRight, Activity,
  BarChart3, ArrowUpDown, Clock, Search, EyeOff, Tag, PieChart as PieIcon, List,
  Target, ChevronDown
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, PieChart, Pie, Cell
} from 'recharts';
import { formatBRL, formatNum, formatBRLCompact } from '../../utils/format';
import clsx from 'clsx';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-bg-primary border border-border shadow-card-hover p-3 rounded-lg z-50">
        <p className="text-text-secondary text-xs mb-1 font-medium">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm font-bold text-text-primary">
            {entry.name === 'total' || entry.name === 'valor' || entry.name === 'value' || entry.name.includes('Faturamento')
              ? formatBRL(entry.value)
              : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const formatPeriod = (s?: string, e?: string) => {
  if (!s || !e) return '';
  if (s === e) return s;
  return `${s} a ${e}`;
};

const COLORS = ['#0D9488', '#0F766E', '#115E59', '#134E4A', '#14B8A6', '#2DD4BF', '#5EEAD4', '#99F6E4', '#CCFBF1', '#F0FDFA'];

export default function SellerHubDashboard() {
  const periodState = usePeriodStore();
  const branchParam = useBranchParam();
  const globalFilter = useMemo<any>(() => ({
    ...periodToParams(periodState),
    ...branchParam
  }), [periodState, branchParam]);
  const { sellerId } = useParams();
  const navigate = useNavigate();

  // Fetch list of sellers dynamically
  const vdFull = useBranchPeriodQuery<any>('/ranking/vendedores', { limit: 100 });

  // Local Filter state matching mock
  const [selectedVendedor, setSelectedVendedor] = useState<string>('');
  const [selectedCidade, setSelectedCidade] = useState<string>('todas');
  const [selectedMarca, setSelectedMarca] = useState<string>('todas');

  const cidadesDropdown = useBranchPeriodQuery<any>('/ranking/cidades', { limit: 100 });
  const marcasDropdown = useBranchPeriodQuery<any>('/ranking/marcas', { limit: 100 });
  
  // Toggles for charts & rankings
  const [viewMode, setViewMode] = useState<Record<string, 'chart' | 'text'>>({
    historico: 'chart',
    diaSemana: 'chart',
    evolucao12m: 'chart'
  });

  const [rankingViews, setRankingViews] = useState<Record<string, 'list' | 'bar'>>({
    marcas: 'list',
    clientes: 'list',
    grupos: 'list',
    produtos: 'list'
  });
  const [evolucaoPeriodType, setEvolucaoPeriodType] = useState<'months' | 'days'>('months');

  // Table filtering and sorting states
  const [clientQuery, setClientQuery] = useState('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('TODOS');
  const [invoiceSortField, setInvoiceSortField] = useState<'numero' | 'data' | 'valor'>('data');
  const [invoiceSortOrder, setInvoiceSortOrder] = useState<'asc' | 'desc'>('desc');
  const [visibleInvoicesCount, setVisibleInvoicesCount] = useState(50);

  // Set default seller when list loaded
  useEffect(() => {
    const list = Array.isArray(vdFull.data) ? vdFull.data : vdFull.data?.data || [];
    if (sellerId) {
      setSelectedVendedor(sellerId);
    } else if (list.length > 0 && !selectedVendedor) {
      setSelectedVendedor(String(list[0].id || list[0].vendedor_id));
    }
  }, [vdFull.data, selectedVendedor, sellerId]);

  const activeFilter = useMemo(() => ({
    ...globalFilter,
    vendedor_id: selectedVendedor || undefined,
    cidade: selectedCidade !== 'todas' && selectedCidade !== 'all' ? selectedCidade : undefined,
    marca: selectedMarca !== 'todas' && selectedMarca !== 'all' ? selectedMarca : undefined
  }), [globalFilter, selectedVendedor, selectedCidade, selectedMarca]);

  const selectedSellerName = useMemo(() => {
    const list = Array.isArray(vdFull.data) ? vdFull.data : vdFull.data?.data || [];
    if (!selectedVendedor || list.length === 0) return '';
    const seller = list.find((v: any) => String(v.id || v.vendedor_id) === String(selectedVendedor));
    return seller ? (seller.nome || seller.nome_vendedor || '') : '';
  }, [selectedVendedor, vdFull.data]);

  const { data, isLoading, isError } = useBiPeriodQuery<any>(
    ['bi', 'seller-summary', activeFilter],
    async (f) => {
      const response = await BIService.getSellerSummary(f);
      return response;
    },
    activeFilter
  );

  // Reset pagination limit when selected vendor, query, or filters change
  useEffect(() => {
    setVisibleInvoicesCount(50);
  }, [selectedVendedor, globalFilter, clientQuery, invoiceStatusFilter]);

  // Safe metrics extraction
  const faturamento = data?.faturamento || 0;
  const faturamentoAnterior = data?.faturamento_anterior || 0;
  const ticketMedio = data?.ticket_medio || 0;
  const notasEmitidas = data?.notas_emitidas || 0;
  const clientesNovos = data?.clientes_novos || 0;
  const clientesAtivos = data?.clientes_ativos || 0;
  const novosPct = data?.novos_pct || 0;
  const antigosPct = data?.antigos_pct || 100;
  const cidadeTop = data?.cidade_top || 'N/A';
  const cidadeTopValor = data?.cidade_top_valor || 0;
  const crescimentoPct = data?.crescimento_pct || 0;
  const melhorMes = data?.melhor_mes_12m || { mes: 'N/A', valor: 0 };

  const topMarcas = data?.top_marcas || [];
  const topClientes = data?.top_clientes || [];
  const topGrupos = data?.top_grupos || [];
  const topProdutos = data?.top_produtos || [];
  
  const principalCliente = topClientes.length > 0 ? topClientes[0] : null;
  
  const historicoVendas = data?.historico_vendas || [];
  const vendasPorDiaSemana = data?.vendas_por_dia_semana || [];
  const invoicesList = data?.notas_fiscais || [];

  const dateRangeLabel = useMemo(() => {
    if (!data?.start_date) return '';
    const isTodayFilter = globalFilter.period === 'today' || globalFilter.period === 'hoje';
    if (isTodayFilter) {
      return `Último dia com informações: ${data.start_date}`;
    }
    return formatPeriod(data.start_date, data.end_date);
  }, [data?.start_date, data?.end_date, globalFilter.period]);

  const maxBrandValue = useMemo(() => {
    if (topMarcas.length === 0) return 0;
    return Math.max(...topMarcas.map((m: any) => m.value));
  }, [topMarcas]);

  // Calculate total values for percentage share display in rankings
  const totalMarcasVal = useMemo(() => topMarcas.reduce((acc: number, curr: any) => acc + curr.value, 0), [topMarcas]);
  const totalClientesVal = useMemo(() => topClientes.reduce((acc: number, curr: any) => acc + curr.value, 0), [topClientes]);
  const totalGruposVal = useMemo(() => topGrupos.reduce((acc: number, curr: any) => acc + curr.value, 0), [topGrupos]);
  const totalProdutosVal = useMemo(() => topProdutos.reduce((acc: number, curr: any) => acc + curr.value, 0), [topProdutos]);

  // Filter Invoices by search and status
  const filteredInvoices = useMemo(() => {
    let result = invoicesList;
    
    // Search by client or note number
    if (clientQuery.trim()) {
      const query = clientQuery.toLowerCase();
      result = result.filter((inv: any) => 
        String(inv.cliente || '').toLowerCase().includes(query) ||
        String(inv.numero_nota || '').toLowerCase().includes(query)
      );
    }
    
    // Filter by status
    if (invoiceStatusFilter !== 'TODOS') {
      result = result.filter((inv: any) => 
        String(inv.status || '').trim().toUpperCase() === invoiceStatusFilter.toUpperCase()
      );
    }
    
    return result;
  }, [invoicesList, clientQuery, invoiceStatusFilter]);

  // Sort Invoices
  const sortedInvoices = useMemo(() => {
    const list = [...filteredInvoices];
    return list.sort((a: any, b: any) => {
      let comparison = 0;
      if (invoiceSortField === 'numero') {
        comparison = String(a.numero_nota || '').localeCompare(String(b.numero_nota || ''));
      } else if (invoiceSortField === 'data') {
        const parseDate = (dStr: string) => {
          if (!dStr) return 0;
          const parts = dStr.split('/');
          if (parts.length === 3) {
            // dd/mm/yyyy -> timestamp
            return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0])).getTime();
          }
          return new Date(dStr).getTime();
        };
        comparison = parseDate(a.data) - parseDate(b.data);
      } else if (invoiceSortField === 'valor') {
        comparison = (a.valor || 0) - (b.valor || 0);
      }
      return invoiceSortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredInvoices, invoiceSortField, invoiceSortOrder]);

  // Extract unique statuses for filter pills
  const availableInvoiceStatuses = useMemo<string[]>(() => {
    const statuses = invoicesList.map((inv: any) => String(inv.status || '').trim().toUpperCase()).filter(Boolean);
    return Array.from(new Set(statuses)) as string[];
  }, [invoicesList]);

  // Limit visible invoices to visibleInvoicesCount
  const currentInvoices = useMemo(() => {
    return sortedInvoices.slice(0, visibleInvoicesCount);
  }, [sortedInvoices, visibleInvoicesCount]);

  const handleInvoiceSort = (field: 'numero' | 'data' | 'valor') => {
    if (invoiceSortField === field) {
      setInvoiceSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setInvoiceSortField(field);
      setInvoiceSortOrder('desc');
    }
  };

  const getHistoricoVendasSummary = () => {
    if (historicoVendas.length === 0) return "Sem histórico de faturamento neste período.";
    const sorted = [...historicoVendas].sort((a: any, b: any) => b.valor - a.valor);
    const peak = sorted[0];
    const lowest = sorted[sorted.length - 1];
    return `O faturamento diário consolidado registrou seu pico no dia ${peak.dia} no valor de ${formatBRL(peak.valor)}, e o menor valor no dia ${lowest.dia} no valor de ${formatBRL(lowest.valor)}.`;
  };

  const getVendasDiaSemanaSummary = () => {
    if (vendasPorDiaSemana.length === 0) return "Sem faturamento registrado por dia da semana.";
    const sorted = [...vendasPorDiaSemana].sort((a: any, b: any) => b.valor - a.valor);
    const peak = sorted[0];
    const totalVal = vendasPorDiaSemana.reduce((acc: number, curr: any) => acc + curr.valor, 0);
    const peakPct = totalVal > 0 ? (peak.valor / totalVal) * 100 : 0;
    return `O dia de maior faturamento na semana é ${peak.dia} com faturamento acumulado de ${formatBRL(peak.valor)}, representando ${peakPct.toFixed(1)}% do faturamento semanal total.`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96 text-text-secondary">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500 mr-3"></div>
        Carregando Hub do Vendedor...
      </div>
    );
  }

  const isHistoricoEmpty = historicoVendas.length === 0 || historicoVendas.every((v: any) => v.valor === 0);


  return (
    <div className="space-y-3 animate-in fade-in duration-300">
      
      {/* CARD 1: PERÍODO DE ANÁLISE */}
      <div className="bg-bg-primary border border-divider rounded-xl p-2.5 px-4 flex items-center justify-between shadow-sm animate-in slide-in-from-top duration-200">
        <span className="text-[10px] font-bold text-text-secondary/80 uppercase tracking-widest pl-1">Período de Análise</span>
        <div className="flex items-center min-w-0">
          <PeriodFilter />
        </div>
      </div>

      {/* CARD 2: FILTROS DE SELEÇÃO */}
      <div className="bg-bg-primary border border-divider shadow-sm rounded-xl p-3.5 flex flex-wrap gap-3 items-center">
        {sellerId ? (
          <button
            onClick={() => navigate('/comercial/equipe')}
            className="px-4 py-2.5 bg-bg-secondary hover:bg-bg-tertiary border border-divider text-text-primary rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <ChevronLeft size={16} />
            Voltar para Equipe
          </button>
        ) : (
          <div className="flex flex-wrap gap-3 items-center w-full">
            {/* Vendedor */}
            <div className="flex flex-col gap-0.5 w-full sm:w-56">
              <span className="text-[10px] font-bold text-text-secondary/70 uppercase tracking-wider pl-1">Vendedor</span>
              <div className="relative w-full">
                <select
                  value={selectedVendedor}
                  onChange={(e) => setSelectedVendedor(e.target.value)}
                  className="appearance-none h-9 px-3 bg-bg-secondary border border-divider text-text-primary rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all duration-300 w-full cursor-pointer pr-10 shadow-sm"
                >
                  <option value="">Selecione um vendedor...</option>
                  {(Array.isArray(vdFull.data) ? vdFull.data : vdFull.data?.data || []).map((v: any) => (
                    <option key={v.id || v.vendedor_id} value={v.id || v.vendedor_id}>{v.nome || v.nome_vendedor}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
              </div>
            </div>

            {/* Cidade */}
            <div className="flex flex-col gap-0.5 w-full sm:w-56">
              <span className="text-[10px] font-bold text-text-secondary/70 uppercase tracking-wider pl-1">Cidade</span>
              <div className="relative w-full">
                <select
                  value={selectedCidade}
                  onChange={(e) => setSelectedCidade(e.target.value)}
                  className="appearance-none h-9 px-3 bg-bg-secondary border border-divider text-text-primary rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all duration-300 w-full cursor-pointer pr-10 shadow-sm uppercase"
                >
                  <option value="todas">Todas as Cidades</option>
                  {(Array.isArray(cidadesDropdown.data) ? cidadesDropdown.data : cidadesDropdown.data?.data || []).map((c: any) => (
                    <option key={c.nome || c.cidade} value={c.nome || c.cidade}>{c.nome || c.cidade}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
              </div>
            </div>

            {/* Marca */}
            <div className="flex flex-col gap-0.5 w-full sm:w-56">
              <span className="text-[10px] font-bold text-text-secondary/70 uppercase tracking-wider pl-1">Marca</span>
              <div className="relative w-full">
                <select
                  value={selectedMarca}
                  onChange={(e) => setSelectedMarca(e.target.value)}
                  className="appearance-none h-9 px-3 bg-bg-secondary border border-divider text-text-primary rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all duration-300 w-full cursor-pointer pr-10 shadow-sm uppercase"
                >
                  <option value="todas">Todas as Marcas</option>
                  {(Array.isArray(marcasDropdown.data) ? marcasDropdown.data : marcasDropdown.data?.data || []).map((m: any) => (
                    <option key={m.nome || m.marca} value={m.nome || m.marca}>{m.nome || m.marca}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
              </div>
            </div>
          </div>
        )}
      </div>

       {/* HIGHLIGHTED FATURAMENTO & METAS GRID */}
      <div className="grid grid-cols-1 gap-3.5">
        {/* Faturamento Comparison Card */}
        <div className="bg-bg-primary border border-divider shadow-sm rounded-xl p-4.5 px-6 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-4 hover:shadow-card-hover transition-all duration-300">
          {/* Left teal border decoration */}
          <div className="absolute top-0 bottom-0 left-0 w-[6px] bg-brand-500"></div>

          {/* Current Faturamento Card Content */}
          <div className="flex items-center gap-4 flex-1 w-full">
            <div className="p-3 bg-brand-500/10 text-brand-500 rounded-2xl shrink-0 shadow-sm">
              <DollarSign size={28} className="stroke-[2.5]" />
            </div>
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-text-secondary uppercase tracking-widest block">Faturamento Atual</span>
              <div className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight leading-none">
                {formatBRL(faturamento)}
              </div>
              <span className="text-xs text-text-muted font-medium block">Período selecionado</span>
            </div>
          </div>

          {/* Center: Comparison Arrow & Percentage Inline */}
          <div className="flex flex-col items-center justify-center shrink-0 py-2 px-4 rounded-xl bg-bg-secondary border border-divider shadow-sm w-full md:w-auto">
            <span className={clsx(
              "text-xs font-black flex items-center gap-1",
              crescimentoPct >= 0 ? "text-success" : "text-danger"
            )}>
              {crescimentoPct >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              {crescimentoPct >= 0 ? "+" : ""}{crescimentoPct.toFixed(1)}%
            </span>
            <span className="text-[9px] text-text-muted font-bold uppercase tracking-wider mt-0.5">vs. mês anterior</span>
          </div>

          {/* Previous Month Faturamento Card Content */}
          <div className="flex items-center gap-4 flex-1 md:justify-end text-left md:text-right w-full">
            <div className="space-y-0.5 md:order-1 order-2 flex-1 md:flex-initial">
              <span className="text-xs font-bold text-text-secondary uppercase tracking-widest block">Faturamento Anterior</span>
              <div className="text-xl font-extrabold text-text-primary tracking-tight leading-none">
                {formatBRL(faturamentoAnterior)}
              </div>
              <span className="text-xs text-text-muted font-medium block">Mês completo anterior</span>
            </div>
            <div className="p-3 bg-text-muted/10 text-text-muted rounded-2xl shrink-0 md:order-2 order-1 shadow-sm">
              <DollarSign size={22} />
            </div>
          </div>
        </div>
      </div>

      {/* 6 OPERATIONAL KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {/* Card 1: Ticket Médio */}
        <div className="bg-bg-primary border border-divider/60 shadow-sm hover:shadow-card-hover rounded-xl p-4 px-5 flex items-center gap-4 transition-all duration-300 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-brand-500"></div>
          <div className="p-3 bg-brand-500/10 text-brand-500 rounded-xl shrink-0">
            <Trophy size={24} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider block">Ticket Médio</span>
            <div className="text-xl font-black text-text-primary tracking-tight truncate mt-1">
              {formatBRL(ticketMedio)}
            </div>
            <span className="text-xs text-text-muted font-semibold block mt-0.5">Média por venda</span>
          </div>
        </div>

        {/* Card 2: Notas Emitidas */}
        <div className="bg-bg-primary border border-divider/60 shadow-sm hover:shadow-card-hover rounded-xl p-4 px-5 flex items-center gap-4 transition-all duration-300 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-brand-500"></div>
          <div className="p-3 bg-brand-500/10 text-brand-500 rounded-xl shrink-0">
            <FileText size={24} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider block">Notas Emitidas</span>
            <div className="text-xl font-black text-text-primary tracking-tight truncate mt-1">
              {formatNum(notasEmitidas)}
            </div>
            <span className="text-xs text-text-muted font-semibold block mt-0.5">Total documentos</span>
          </div>
        </div>

        {/* Card 3: Clientes Atendidos */}
        <div className="bg-bg-primary border border-divider/60 shadow-sm hover:shadow-card-hover rounded-xl p-4 px-5 flex items-center gap-4 transition-all duration-300 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-brand-500"></div>
          <div className="p-3 bg-brand-500/10 text-brand-500 rounded-xl shrink-0">
            <Users size={24} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider block">Clientes Atendidos</span>
            <div className="text-xl font-black text-text-primary tracking-tight truncate mt-1">
              {clientesAtivos}
            </div>
            <span className="text-xs text-text-muted font-semibold block mt-0.5">
              {notasEmitidas} {notasEmitidas === 1 ? 'pedido' : 'pedidos'} de {clientesAtivos} {clientesAtivos === 1 ? 'cliente' : 'clientes'}
            </span>
          </div>
        </div>

        {/* Card 4: Cidade Top */}
        <div className="bg-bg-primary border border-divider/60 shadow-sm hover:shadow-card-hover rounded-xl p-4 px-5 flex items-center gap-4 transition-all duration-300 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-brand-500"></div>
          <div className="p-3 bg-brand-500/10 text-brand-500 rounded-xl shrink-0">
            <MapPin size={24} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider block">Cidade Top</span>
            <div className="text-xl font-black text-text-primary tracking-tight truncate mt-1" title={cidadeTop}>
              {cidadeTop}
            </div>
            <span className="text-xs font-bold text-brand-500 block mt-0.5">
              {formatBRLCompact(cidadeTopValor)} faturados
            </span>
          </div>
        </div>

        {/* Card 5: Principal Cliente */}
        <div className="bg-bg-primary border border-divider/60 shadow-sm hover:shadow-card-hover rounded-xl p-4 px-5 flex items-center gap-4 transition-all duration-300 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-brand-500"></div>
          <div className="p-3 bg-brand-500/10 text-brand-500 rounded-xl shrink-0">
            <Award size={24} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider block">Principal Cliente</span>
            <div className="text-xl font-black text-text-primary tracking-tight truncate mt-1" title={principalCliente ? principalCliente.name : 'N/A'}>
              {principalCliente ? principalCliente.name : 'N/A'}
            </div>
            <span className="text-xs font-bold text-brand-500 block mt-0.5">
              {principalCliente ? formatBRLCompact(principalCliente.value) : 'Sem vendas'} faturados
            </span>
          </div>
        </div>

        {/* Card 6: Melhor Mês */}
        <div className="bg-bg-primary border border-divider/60 shadow-sm hover:shadow-card-hover rounded-xl p-4 px-5 flex items-center gap-4 transition-all duration-300 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-brand-500"></div>
          <div className="p-3 bg-brand-500/10 text-brand-500 rounded-xl shrink-0">
            <Calendar size={24} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider block">Melhor Mês (12m)</span>
            <div className="text-xl font-black text-brand-500 tracking-tight truncate mt-1">
              {melhorMes && melhorMes.valor > 0 ? formatBRLCompact(melhorMes.valor) : 'Sem vendas'}
            </div>
            <span className="text-xs font-bold text-text-primary block mt-0.5">
              {melhorMes && melhorMes.mes !== 'N/A' ? melhorMes.mes : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* SECTION: RANKINGS DE DESEMPENHO EM DUAS COLUNAS/LINHAS */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3.5">
        
        {/* CARD 1: TOP 10 MARCAS */}
        <div className="bg-bg-primary border border-divider shadow-sm rounded-xl p-4.5 flex flex-col min-h-[380px] transition-all">
          <div className="flex justify-between items-center border-b border-divider/20 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <Award className="text-brand-500" size={18} />
              <h3 className="text-sm font-extrabold text-text-primary uppercase tracking-wider">Top 10 Marcas</h3>
            </div>
            <div className="flex bg-bg-secondary p-0.5 rounded-xl border border-divider shadow-sm shrink-0">
              <button
                onClick={() => setRankingViews(prev => ({ ...prev, marcas: 'list' }))}
                className={clsx(
                  "px-3 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer uppercase tracking-wider",
                  rankingViews.marcas === 'list'
                    ? "bg-brand-500 text-white shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                Lista
              </button>
              <button
                onClick={() => setRankingViews(prev => ({ ...prev, marcas: 'bar' }))}
                className={clsx(
                  "px-3 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer uppercase tracking-wider",
                  rankingViews.marcas === 'bar'
                    ? "bg-brand-500 text-white shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                Gráfico
              </button>
            </div>
          </div>

          <div className="flex-1 text-xs pr-1">
            {rankingViews.marcas === 'list' ? (
              <div className="space-y-1">
                {topMarcas.slice(0, 10).map((m: any, index: number) => {
                  const rank = index + 1;
                  const share = totalMarcasVal > 0 ? (m.value / totalMarcasVal) * 100 : 0;
                  return (
                    <div key={m.name || index} className="relative flex justify-between items-center py-2 px-3 rounded-lg overflow-hidden group hover:bg-bg-secondary/45 transition-colors">
                      <div 
                        className="absolute left-0 top-0 bottom-0 bg-brand-500/5 group-hover:bg-brand-500/10 transition-all duration-500" 
                        style={{ width: `${share}%` }} 
                      />
                      <span className="relative z-10 text-text-secondary truncate font-medium text-xs flex-1 min-w-0 mr-3 flex items-center gap-2" title={m.name}>
                        <span className={clsx("font-mono text-xs min-w-[20px]", rank === 1 ? "text-amber-500 font-extrabold" : rank === 2 ? "text-slate-400 font-extrabold" : rank === 3 ? "text-orange-600 font-extrabold" : "text-text-muted font-bold")}>#{rank}</span>
                        <span className="truncate text-text-primary group-hover:text-brand-500 transition-colors">{m.name}</span>
                      </span>
                      <div className="relative z-10 text-right shrink-0 flex items-center gap-1.5 font-mono text-xs">
                        <span className="font-extrabold text-text-primary">{formatBRL(m.value)}</span>
                        <span className="text-[10px] text-text-secondary">({share.toFixed(1)}%)</span>
                      </div>
                    </div>
                  );
                })}
                {topMarcas.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6">
                    <EyeOff size={24} className="text-text-muted mb-1 stroke-[1.5]" />
                    <span className="text-xs text-text-muted font-bold">Nenhuma marca faturada.</span>
                  </div>
                )}
              </div>
            ) : (
              topMarcas.length > 0 ? (
                <div className="h-[370px] w-full flex items-center justify-center py-2 pr-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={topMarcas.slice(0, 10)}
                      layout="vertical"
                      margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                    >
                      <XAxis type="number" hide />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        width={90} 
                        tick={{ fontSize: 9, fill: 'currentColor' }} 
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(val) => val && val.length > 15 ? val.substring(0, 15) + '...' : val}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" fill="#0D9488" radius={[0, 4, 4, 0]}>
                        {topMarcas.slice(0, 10).map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6">
                  <EyeOff size={24} className="text-text-muted mb-1 stroke-[1.5]" />
                  <span className="text-xs text-text-muted font-bold">Sem dados no período.</span>
                </div>
              )
            )}
          </div>
        </div>

        {/* CARD 2: TOP 10 GRUPOS */}
        <div className="bg-bg-primary border border-divider shadow-sm rounded-xl p-4.5 flex flex-col min-h-[380px] transition-all">
          <div className="flex justify-between items-center border-b border-divider/20 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <Box className="text-brand-500" size={18} />
              <h3 className="text-sm font-extrabold text-text-primary uppercase tracking-wider">Top 10 Grupos</h3>
            </div>
            <div className="flex bg-bg-secondary p-0.5 rounded-xl border border-divider shadow-sm shrink-0">
              <button
                onClick={() => setRankingViews(prev => ({ ...prev, grupos: 'list' }))}
                className={clsx(
                  "px-3 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer uppercase tracking-wider",
                  rankingViews.grupos === 'list'
                    ? "bg-brand-500 text-white shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                Lista
              </button>
              <button
                onClick={() => setRankingViews(prev => ({ ...prev, grupos: 'bar' }))}
                className={clsx(
                  "px-3 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer uppercase tracking-wider",
                  rankingViews.grupos === 'bar'
                    ? "bg-brand-500 text-white shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                Gráfico
              </button>
            </div>
          </div>

          <div className="flex-1 text-xs pr-1">
            {rankingViews.grupos === 'list' ? (
              <div className="space-y-1">
                {topGrupos.slice(0, 10).map((g: any, index: number) => {
                  const rank = index + 1;
                  const share = totalGruposVal > 0 ? (g.value / totalGruposVal) * 100 : 0;
                  return (
                    <div key={g.name || index} className="relative flex justify-between items-center py-2 px-3 rounded-lg overflow-hidden group hover:bg-bg-secondary/45 transition-colors">
                      <div 
                        className="absolute left-0 top-0 bottom-0 bg-brand-500/5 group-hover:bg-brand-500/10 transition-all duration-500" 
                        style={{ width: `${share}%` }} 
                      />
                      <span className="relative z-10 text-text-secondary truncate font-medium text-xs flex-1 min-w-0 mr-3 flex items-center gap-2" title={g.name}>
                        <span className={clsx("font-mono text-xs min-w-[20px]", rank === 1 ? "text-amber-500 font-extrabold" : rank === 2 ? "text-slate-400 font-extrabold" : rank === 3 ? "text-orange-600 font-extrabold" : "text-text-muted font-bold")}>#{rank}</span>
                        <span className="truncate text-text-primary group-hover:text-brand-500 transition-colors">{g.name}</span>
                      </span>
                      <div className="relative z-10 text-right shrink-0 flex items-center gap-1.5 font-mono text-xs">
                        <span className="font-extrabold text-text-primary">{formatBRL(g.value)}</span>
                        <span className="text-[10px] text-text-secondary">({share.toFixed(1)}%)</span>
                      </div>
                    </div>
                  );
                })}
                {topGrupos.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6">
                    <EyeOff size={24} className="text-text-muted mb-1 stroke-[1.5]" />
                    <span className="text-xs text-text-muted font-bold">Nenhum grupo faturado.</span>
                  </div>
                )}
              </div>
            ) : (
              topGrupos.length > 0 ? (
                <div className="h-[370px] w-full flex items-center justify-center py-2 pr-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={topGrupos.slice(0, 10)}
                      layout="vertical"
                      margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                    >
                      <XAxis type="number" hide />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        width={90} 
                        tick={{ fontSize: 9, fill: 'currentColor' }} 
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(val) => val && val.length > 15 ? val.substring(0, 15) + '...' : val}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" fill="#0D9488" radius={[0, 4, 4, 0]}>
                        {topGrupos.slice(0, 10).map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6">
                  <EyeOff size={24} className="text-text-muted mb-1 stroke-[1.5]" />
                  <span className="text-xs text-text-muted font-bold">Sem dados no período.</span>
                </div>
              )
            )}
          </div>
        </div>

        {/* CARD 3: TOP 10 CLIENTES */}
        <div className="bg-bg-primary border border-divider shadow-sm rounded-xl p-4.5 flex flex-col min-h-[380px] transition-all">
          <div className="flex justify-between items-center border-b border-divider/20 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <Users className="text-brand-500" size={18} />
              <h3 className="text-sm font-extrabold text-text-primary uppercase tracking-wider">Top 10 Clientes</h3>
            </div>
            <div className="flex bg-bg-secondary p-0.5 rounded-xl border border-divider shadow-sm shrink-0">
              <button
                onClick={() => setRankingViews(prev => ({ ...prev, clientes: 'list' }))}
                className={clsx(
                  "px-3 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer uppercase tracking-wider",
                  rankingViews.clientes === 'list'
                    ? "bg-brand-500 text-white shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                Lista
              </button>
              <button
                onClick={() => setRankingViews(prev => ({ ...prev, clientes: 'bar' }))}
                className={clsx(
                  "px-3 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer uppercase tracking-wider",
                  rankingViews.clientes === 'bar'
                    ? "bg-brand-500 text-white shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                Gráfico
              </button>
            </div>
          </div>

          <div className="flex-1 text-xs pr-1">
            {rankingViews.clientes === 'list' ? (
              <div className="space-y-1">
                {topClientes.slice(0, 10).map((c: any, index: number) => {
                  const rank = index + 1;
                  const share = totalClientesVal > 0 ? (c.value / totalClientesVal) * 100 : 0;
                  return (
                    <div key={c.name || index} className="relative flex justify-between items-center py-2 px-3 rounded-lg overflow-hidden group hover:bg-bg-secondary/45 transition-colors">
                      <div 
                        className="absolute left-0 top-0 bottom-0 bg-brand-500/5 group-hover:bg-brand-500/10 transition-all duration-500" 
                        style={{ width: `${share}%` }} 
                      />
                      <span className="relative z-10 text-text-secondary truncate font-medium text-xs flex-1 min-w-0 mr-3 flex items-center gap-2" title={c.name}>
                        <span className={clsx("font-mono text-xs min-w-[20px]", rank === 1 ? "text-amber-500 font-extrabold" : rank === 2 ? "text-slate-400 font-extrabold" : rank === 3 ? "text-orange-600 font-extrabold" : "text-text-muted font-bold")}>#{rank}</span>
                        <span className="truncate text-text-primary group-hover:text-brand-500 transition-colors">{c.name}</span>
                      </span>
                      <div className="relative z-10 text-right shrink-0 flex items-center gap-1.5 font-mono text-xs">
                        <span className="font-extrabold text-text-primary">{formatBRL(c.value)}</span>
                        <span className="text-[10px] text-text-secondary">({share.toFixed(1)}%)</span>
                      </div>
                    </div>
                  );
                })}
                {topClientes.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6">
                    <EyeOff size={24} className="text-text-muted mb-1 stroke-[1.5]" />
                    <span className="text-xs text-text-muted font-bold">Nenhum cliente faturado.</span>
                  </div>
                )}
              </div>
            ) : (
              topClientes.length > 0 ? (
                <div className="h-[370px] w-full flex items-center justify-center py-2 pr-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={topClientes.slice(0, 10)}
                      layout="vertical"
                      margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                    >
                      <XAxis type="number" hide />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        width={90} 
                        tick={{ fontSize: 9, fill: 'currentColor' }} 
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(val) => val && val.length > 15 ? val.substring(0, 15) + '...' : val}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" fill="#0D9488" radius={[0, 4, 4, 0]}>
                        {topClientes.slice(0, 10).map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6">
                  <EyeOff size={24} className="text-text-muted mb-1 stroke-[1.5]" />
                  <span className="text-xs text-text-muted font-bold">Sem dados no período.</span>
                </div>
              )
            )}
          </div>
        </div>

        {/* CARD 4: TOP 10 PRODUTOS */}
        <div className="bg-bg-primary border border-divider shadow-sm rounded-xl p-4.5 flex flex-col min-h-[380px] transition-all">
          <div className="flex justify-between items-center border-b border-divider/20 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <Trophy className="text-brand-500" size={18} />
              <h3 className="text-sm font-extrabold text-text-primary uppercase tracking-wider">Top 10 Produtos</h3>
            </div>
            <div className="flex bg-bg-secondary p-0.5 rounded-xl border border-divider shadow-sm shrink-0">
              <button
                onClick={() => setRankingViews(prev => ({ ...prev, produtos: 'list' }))}
                className={clsx(
                  "px-3 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer uppercase tracking-wider",
                  rankingViews.produtos === 'list'
                    ? "bg-brand-500 text-white shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                Lista
              </button>
              <button
                onClick={() => setRankingViews(prev => ({ ...prev, produtos: 'bar' }))}
                className={clsx(
                  "px-3 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer uppercase tracking-wider",
                  rankingViews.produtos === 'bar'
                    ? "bg-brand-500 text-white shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                Gráfico
              </button>
            </div>
          </div>

          <div className="flex-1 text-xs pr-1">
            {rankingViews.produtos === 'list' ? (
              <div className="space-y-1">
                {topProdutos.slice(0, 10).map((p: any, index: number) => {
                  const rank = index + 1;
                  const share = totalProdutosVal > 0 ? (p.value / totalProdutosVal) * 100 : 0;
                  return (
                    <div key={p.name || index} className="relative flex justify-between items-center py-2 px-3 rounded-lg overflow-hidden group hover:bg-bg-secondary/45 transition-colors">
                      <div 
                        className="absolute left-0 top-0 bottom-0 bg-brand-500/5 group-hover:bg-brand-500/10 transition-all duration-500" 
                        style={{ width: `${share}%` }} 
                      />
                      <span className="relative z-10 text-text-secondary truncate font-medium text-xs flex-1 min-w-0 mr-3 flex items-center gap-2" title={p.name}>
                        <span className={clsx("font-mono text-xs min-w-[20px]", rank === 1 ? "text-amber-500 font-extrabold" : rank === 2 ? "text-slate-400 font-extrabold" : rank === 3 ? "text-orange-600 font-extrabold" : "text-text-muted font-bold")}>#{rank}</span>
                        <span className="truncate text-text-primary group-hover:text-brand-500 transition-colors">{p.name}</span>
                      </span>
                      <div className="relative z-10 text-right shrink-0 flex items-center gap-1.5 font-mono text-xs">
                        <span className="font-extrabold text-text-primary">{formatBRL(p.value)}</span>
                        <span className="text-[10px] text-text-secondary">({share.toFixed(1)}%)</span>
                      </div>
                    </div>
                  );
                })}
                {topProdutos.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6">
                    <EyeOff size={24} className="text-text-muted mb-1 stroke-[1.5]" />
                    <span className="text-xs text-text-muted font-bold">Nenhum produto faturado.</span>
                  </div>
                )}
              </div>
            ) : (
              topProdutos.length > 0 ? (
                <div className="h-[370px] w-full flex items-center justify-center py-2 pr-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={topProdutos.slice(0, 10)}
                      layout="vertical"
                      margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                    >
                      <XAxis type="number" hide />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        width={90} 
                        tick={{ fontSize: 9, fill: 'currentColor' }} 
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(val) => val && val.length > 15 ? val.substring(0, 15) + '...' : val}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" fill="#0D9488" radius={[0, 4, 4, 0]}>
                        {topProdutos.slice(0, 10).map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6">
                  <EyeOff size={24} className="text-text-muted mb-1 stroke-[1.5]" />
                  <span className="text-xs text-text-muted font-bold">Sem dados no período.</span>
                </div>
              )
            )}
          </div>
        </div>

      </div>

      {/* SECTION: EVOLUÇÃO DO FATURAMENTO (MENSAL VS DIÁRIO GRÁFICO E VALORES TOGGLE) */}
      <div className="bg-bg-primary border border-divider shadow-card rounded-2xl p-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center border-b border-divider/20 pb-4 mb-5 gap-4">
          <div>
            <h3 className="text-base font-extrabold text-text-primary uppercase tracking-wider">
              {evolucaoPeriodType === 'months' ? "Evolução do Faturamento (Últimos 12 Meses)" : "Evolução do Faturamento (Diário)"}
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              {evolucaoPeriodType === 'months' 
                ? "Histórico mensal de faturamento líquido realizado pelo vendedor selecionado" 
                : "Histórico diário detalhado de faturamento realizado no período selecionado"}
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
            <div className="flex bg-bg-secondary p-0.5 rounded-xl border border-divider shadow-sm shrink-0">
              <button
                onClick={() => setEvolucaoPeriodType('months')}
                className={clsx(
                  "px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer",
                  evolucaoPeriodType === 'months'
                    ? "bg-brand-500 text-white shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                Mensal
              </button>
              <button
                onClick={() => setEvolucaoPeriodType('days')}
                className={clsx(
                  "px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer",
                  evolucaoPeriodType === 'days'
                    ? "bg-brand-500 text-white shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                Diário
              </button>
            </div>

            <button
              onClick={() => setViewMode(prev => ({ ...prev, evolucao12m: prev.evolucao12m === 'chart' ? 'text' : 'chart' }))}
              className="px-4 py-2 bg-bg-secondary hover:bg-bg-secondary/80 text-text-secondary hover:text-text-primary rounded-xl border border-divider transition-all cursor-pointer shadow-sm text-xs font-bold flex items-center gap-1.5 shrink-0 justify-center"
            >
              {viewMode.evolucao12m === 'chart' ? <List size={14} /> : <BarChart3 size={14} />}
              {viewMode.evolucao12m === 'chart' ? "Visualizar em Valores" : "Visualizar em Gráfico"}
            </button>
          </div>
        </div>

        {viewMode.evolucao12m === 'chart' ? (
          (evolucaoPeriodType === 'months' ? data?.evolucao_12m : historicoVendas) && (evolucaoPeriodType === 'months' ? data.evolucao_12m.length > 0 : historicoVendas.length > 0) ? (
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={evolucaoPeriodType === 'months' ? data.evolucao_12m : historicoVendas} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorEvol" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0D9488" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#0D9488" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(var(--color-divider), 0.15)" vertical={false} />
                  <XAxis dataKey={evolucaoPeriodType === 'months' ? "mes" : "dia"} tick={{ fontSize: 10, fill: 'currentColor' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'currentColor' }} axisLine={false} tickLine={false} tickFormatter={(v) => formatBRLCompact(v)} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="valor" name={evolucaoPeriodType === 'months' ? "Faturamento Líquido" : "Faturamento Diário"} stroke="#0D9488" strokeWidth={2.5} fillOpacity={1} fill="url(#colorEvol)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="py-12 text-center text-text-muted text-xs font-semibold">
              {evolucaoPeriodType === 'months' ? "Nenhum histórico disponível para os últimos 12 meses." : "Nenhum histórico diário disponível no período."}
            </div>
          )
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {(evolucaoPeriodType === 'months' ? data?.evolucao_12m : historicoVendas)?.map((e: any, index: number) => (
              <div key={index} className="p-4 border border-divider/40 bg-bg-secondary/10 rounded-2xl flex flex-col justify-between hover:border-divider/70 transition-all duration-300 shadow-sm">
                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block">
                  {evolucaoPeriodType === 'months' ? e.mes : e.dia}
                </span>
                <span className="text-sm font-black text-text-primary mt-1.5">{formatBRL(e.valor)}</span>
              </div>
            ))}
            {(!(evolucaoPeriodType === 'months' ? data?.evolucao_12m : historicoVendas) || (evolucaoPeriodType === 'months' ? data.evolucao_12m.length === 0 : historicoVendas.length === 0)) && (
              <div className="col-span-full text-center py-8 text-text-muted text-xs font-semibold">
                Nenhum valor disponível.
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION: NOTAS FISCAIS DO VENDEDOR (PAGINATION 50-BY-50, SEARCH BY CLIENT & COLUMN SORTING) */}
      <div className="bg-bg-primary border border-divider shadow-card rounded-2xl p-6 flex flex-col">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-divider pb-4 mb-5 gap-4">
          <div>
            <h3 className="text-base font-extrabold text-text-primary uppercase tracking-wider">Notas Fiscais do Vendedor</h3>
            <p className="text-xs text-text-secondary mt-0.5">Fila de notas faturadas no período consultado</p>
          </div>
          <span className="text-[10px] font-extrabold text-text-muted uppercase bg-bg-secondary px-3.5 py-1.5 rounded-full border border-divider/10 shrink-0 shadow-sm">
            {filteredInvoices.length} encontrados / {invoicesList.length} total
          </span>
        </div>

        {/* Filter Inputs (Client Search + Status Filter Pills) */}
        <div className="flex flex-col md:flex-row gap-4 mb-5 items-stretch md:items-center">
          {/* Client & Nota Search */}
          <div className="relative flex-1 max-w-md">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-text-muted">
              <Search size={15} />
            </span>
            <input
              type="text"
              placeholder="Buscar por cliente ou nº nota..."
              value={clientQuery}
              onChange={(e) => setClientQuery(e.target.value)}
              className="w-full pl-10 pr-4 h-11 bg-bg-secondary border border-divider text-text-primary text-xs rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all duration-300"
            />
          </div>

          {/* Status filter pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] text-text-secondary font-black uppercase tracking-wider mr-1 flex items-center gap-1">
              <Tag size={13} className="text-brand-500" />
              Filtrar Status:
            </span>
            {['TODOS', ...availableInvoiceStatuses].map((status) => (
              <button
                key={status}
                onClick={() => setInvoiceStatusFilter(status)}
                className={clsx(
                  "px-3.5 py-1.5 text-[10px] font-black rounded-full border transition-all uppercase tracking-wider cursor-pointer shadow-sm",
                  invoiceStatusFilter === status
                    ? "bg-brand-500 text-white border-brand-500"
                    : "bg-bg-secondary text-text-secondary border-divider hover:text-text-primary"
                )}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Desktop Table View (>= 900px) */}
        <div className="hidden min-[900px]:block overflow-x-auto w-full border border-divider/50 rounded-2xl shadow-sm">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead>
              <tr className="border-b border-divider text-[10px] text-text-secondary uppercase font-black tracking-wider bg-bg-secondary/60">
                <th className="py-3.5 px-5 font-mono text-[9px]">COD</th>
                <th 
                  onClick={() => handleInvoiceSort('numero')}
                  className="py-3.5 px-5 cursor-pointer hover:bg-bg-secondary/80 select-none transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    Nº NOTA
                    <ArrowUpDown size={12} className={clsx(invoiceSortField === 'numero' ? "text-brand-500" : "text-text-muted/65")} />
                  </div>
                </th>
                <th className="py-3.5 px-5">CLIENTE</th>
                <th 
                  onClick={() => handleInvoiceSort('data')}
                  className="py-3.5 px-5 cursor-pointer hover:bg-bg-secondary/80 select-none transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    DATA
                    <ArrowUpDown size={12} className={clsx(invoiceSortField === 'data' ? "text-brand-500" : "text-text-muted/65")} />
                  </div>
                </th>
                <th 
                  onClick={() => handleInvoiceSort('valor')}
                  className="py-3.5 px-5 text-right cursor-pointer hover:bg-bg-secondary/80 select-none transition-colors"
                >
                  <div className="flex items-center gap-1.5 justify-end">
                    VALOR TOTAL
                    <ArrowUpDown size={12} className={clsx(invoiceSortField === 'valor' ? "text-brand-500" : "text-text-muted/65")} />
                  </div>
                </th>
                <th className="py-3.5 px-5 text-center">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider/20">
              {currentInvoices.map((inv: any, i: number) => (
                <tr key={inv.cod || i} className="hover:bg-bg-secondary/40 transition-colors">
                  <td className="py-3.5 px-5 font-mono text-text-muted">{inv.cod}</td>
                  <td className="py-3.5 px-5 text-brand-500 font-extrabold">{inv.numero_nota}</td>
                  <td className="py-3.5 px-5 text-text-primary font-bold truncate max-w-[280px]" title={inv.cliente}>
                    {inv.cliente}
                  </td>
                  <td className="py-3.5 px-5 text-text-secondary font-medium">{inv.data}</td>
                  <td className="py-3.5 px-5 text-right font-mono font-extrabold text-success">
                    {formatBRL(inv.valor)}
                  </td>
                  <td className="py-3.5 px-5 text-center">
                    <span className={clsx(
                      "text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider border",
                      inv.status && ['FATURADO', 'FINALIZADO'].includes(inv.status.trim()) 
                        ? 'bg-success/15 text-success border-success/10' 
                        : 'bg-text-muted/10 text-text-muted border-divider/10'
                    )}>
                      {inv.status ? inv.status.trim() : 'Normal'}
                    </span>
                  </td>
                </tr>
              ))}
              {currentInvoices.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-text-muted font-bold">
                    Nenhuma nota fiscal emitida para os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile/Tablet Card View Fallback (< 900px) */}
        <div className="min-[900px]:hidden space-y-3.5">
          {currentInvoices.map((inv: any, i: number) => (
            <div key={inv.cod || i} className="p-5 border border-divider/60 rounded-2xl bg-bg-secondary/15 flex flex-col gap-3 hover:border-divider transition-all duration-300 shadow-sm">
              <div className="flex justify-between items-center">
                <span className="font-mono text-[10px] text-text-muted font-bold">COD: {inv.cod}</span>
                <span className={clsx(
                  "text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider border",
                  inv.status && ['FATURADO', 'FINALIZADO'].includes(inv.status.trim()) 
                    ? 'bg-success/15 text-success border-success/10' 
                    : 'bg-text-muted/10 text-text-muted border-divider/10'
                )}>
                  {inv.status ? inv.status.trim() : 'Normal'}
                </span>
              </div>
              <div>
                <h4 className="text-sm font-bold text-text-primary leading-snug">{inv.cliente}</h4>
                <p className="text-xs text-text-secondary mt-1">Nota: <span className="font-bold text-brand-500">{inv.numero_nota}</span></p>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-divider/20 mt-1">
                <div className="flex items-center gap-1.5 text-xs text-text-secondary font-medium">
                  <Calendar size={14} className="text-text-muted" />
                  {inv.data}
                </div>
                <div className="text-sm font-mono font-extrabold text-success">
                  {formatBRL(inv.valor)}
                </div>
              </div>
            </div>
          ))}
          {currentInvoices.length === 0 && (
            <div className="py-8 text-center text-text-muted text-xs font-semibold">
              Nenhuma nota fiscal encontrada.
            </div>
          )}
        </div>

        {/* PAGINATION PANEL - CARREGAR MAIS */}
        <div className="flex flex-col sm:flex-row justify-between items-center mt-5 pt-4 border-t border-divider/20 text-xs gap-3">
          <span className="text-[11px] text-text-secondary font-medium">
            Mostrando {Math.min(visibleInvoicesCount, sortedInvoices.length)} de {sortedInvoices.length} notas faturadas
          </span>
          
          {visibleInvoicesCount < sortedInvoices.length && (
            <button
              onClick={() => setVisibleInvoicesCount(prev => prev + 50)}
              className="px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold transition-all duration-200 shadow-sm flex items-center gap-1.5 cursor-pointer scale-100 hover:scale-[1.02] active:scale-[0.98]"
            >
              Carregar Mais (+50)
            </button>
          )}
        </div>
      </div>

      {isError && (
        <div className="bg-danger/10 border border-danger/25 text-danger p-4 rounded-2xl text-xs font-bold shadow-sm">
          Erro de comunicação: Não foi possível sincronizar os dados do vendedor. Verifique a conexão com a API do banco de dados Vet.
        </div>
      )}
    </div>
  );
}

