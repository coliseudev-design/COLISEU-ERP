import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { usePeriodStore, periodToParams } from '../../store/periodStore';
import { useBranchParam } from '../../contexts/BranchContext';
import PeriodFilter from '../../components/PeriodFilter';
import { useBranchPeriodQuery, useApiQuery } from '../../hooks/useApi';
import { BiPeriodFilter } from '../../types/bi.types';
import { 
  Users, UserPlus, UserMinus, Activity, AlertCircle, 
  Search, ChevronLeft, ChevronRight, ChevronDown, Award, EyeOff, FileText,
  TrendingUp, TrendingDown
} from 'lucide-react';
import { formatBRL, formatNum } from '../../utils/format';
import clsx from 'clsx';

export default function CustomerAnalyticsDashboard() {
  const navigate = useNavigate();
  const periodState = usePeriodStore();
  const branchParam = useBranchParam();

  // Filtro global unificado do período + filial
  const globalFilter = useMemo<any>(() => ({
    ...periodToParams(periodState),
    ...branchParam
  }), [periodState, branchParam]);

  // Estados locais dos filtros principais
  const [selectedVendedor, setSelectedVendedor] = useState<string>('todas');
  const [selectedCidade, setSelectedCidade] = useState<string>('todas');

  // Listas auxiliares para os filtros suspensos
  const sellersQuery = useBranchPeriodQuery<any>('/ranking/vendedores', { limit: 100 });
  const citiesQuery = useBranchPeriodQuery<any>('/ranking/cidades', { limit: 100 });

  // Estados locais da listagem geral
  const [search, setSearch] = useState<string>('');
  const [tempoInativo, setTempoInativo] = useState<string>('Qualquer Inatividade');
  const [ordenacao, setOrdenacao] = useState<string>('Mais inativos primeiro (Alerta)');
  const [page, setPage] = useState<number>(1);
  const limit = 15;

  // Debounce ou trigger instantâneo do search
  const [searchDebounced, setSearchDebounced] = useState<string>('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Params dinâmicos dos endpoints
  const analyticsParams = useMemo(() => ({
    ...globalFilter,
    vendedor_id: selectedVendedor,
    cidade: selectedCidade
  }), [globalFilter, selectedVendedor, selectedCidade]);

  const listParams = useMemo(() => ({
    ...globalFilter,
    vendedor_id: selectedVendedor,
    cidade: selectedCidade,
    search: searchDebounced,
    tempo_inativo: tempoInativo,
    ordenacao,
    limit,
    offset: (page - 1) * limit
  }), [globalFilter, selectedVendedor, selectedCidade, searchDebounced, tempoInativo, ordenacao, page]);

  // Queries
  const analytics = useBranchPeriodQuery<any>('/clientes/analytics-full', analyticsParams);
  const list = useApiQuery<any>('/clientes/lista', listParams);

  // Auxiliares de loading geral
  const isLoading = analytics.isLoading;

  const kpis = analytics.data?.kpis || {
    total_clientes: 0,
    mes_atual: 0,
    mes_anterior: 0,
    novos_clientes: 0,
    sem_vendas_atual: 0,
    sem_vendas_anterior: 0
  };

  const totalClientes = kpis.total_clientes || 1;
  const retencaoPct = totalClientes > 0 ? (kpis.mes_atual / totalClientes) * 100 : 0;
  const churnPct = totalClientes > 0 ? (kpis.sem_vendas_atual / totalClientes) * 100 : 0;
  const semVendasAtualPct = totalClientes > 0 ? (kpis.sem_vendas_atual / totalClientes) * 100 : 0;
  const semVendasAnteriorPct = totalClientes > 0 ? (kpis.sem_vendas_anterior / totalClientes) * 100 : 0;

  const totalPages = Math.ceil((list.data?.total || 0) / limit) || 1;

  return (
    <div aria-label="Análise de Clientes Dashboard" className="space-y-6 animate-in fade-in duration-300">
      
      {/* CARD 1: PERÍODO DE ANÁLISE */}
      <div className="bg-bg-primary border border-divider rounded-2xl p-4 flex items-center justify-between shadow-card animate-in slide-in-from-top duration-200">
        <span className="text-[10px] font-bold text-text-secondary/80 uppercase tracking-widest pl-1">Período de Análise</span>
        <div className="flex items-center min-w-0">
          <PeriodFilter />
        </div>
      </div>

      {/* CARD 2: FILTROS DE SELEÇÃO */}
      <div className="bg-bg-primary border border-divider shadow-card rounded-2xl p-5 flex flex-wrap gap-4 items-center animate-in slide-in-from-top duration-200">
        <div className="flex flex-wrap gap-4 items-center w-full">
          {/* Vendedor */}
          <div className="flex flex-col gap-1 w-full sm:w-64">
            <span className="text-[10px] font-bold text-text-secondary/70 uppercase tracking-wider pl-1">Vendedor</span>
            <div className="relative w-full">
              <select
                value={selectedVendedor}
                onChange={(e) => {
                  setSelectedVendedor(e.target.value);
                  setPage(1);
                }}
                className="appearance-none h-10 px-4 bg-bg-secondary border border-divider text-text-primary rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all duration-300 w-full cursor-pointer pr-10 shadow-sm"
              >
                <option value="todas">Todos os Vendedores</option>
                {sellersQuery.data?.data?.map((v: any) => (
                  <option key={v.id} value={v.id}>{v.nome}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
            </div>
          </div>

          {/* Cidade */}
          <div className="flex flex-col gap-1 w-full sm:w-64">
            <span className="text-[10px] font-bold text-text-secondary/70 uppercase tracking-wider pl-1">Cidade</span>
            <div className="relative w-full">
              <select
                value={selectedCidade}
                onChange={(e) => {
                  setSelectedCidade(e.target.value);
                  setPage(1);
                }}
                className="appearance-none h-10 px-4 bg-bg-secondary border border-divider text-text-primary rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all duration-300 w-full cursor-pointer pr-10 shadow-sm uppercase"
              >
                <option value="todas">Todas as Cidades</option>
                {citiesQuery.data?.data?.map((c: any) => (
                  <option key={c.nome || c.cidade} value={c.nome || c.cidade}>{c.nome || c.cidade}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-80 text-text-secondary">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500 mr-3 mb-2"></div>
          <span className="text-xs font-extrabold uppercase tracking-widest text-text-secondary">Carregando painel de clientes...</span>
        </div>
      ) : (
        <>
          {/* SEÇÃO 1: ATIVIDADE POR PERÍODO */}
          <div className="space-y-2">
            <span className="text-[10px] font-black text-text-secondary/80 uppercase tracking-wider pl-1 block">Atividade por Período</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Card 1: Total de Clientes */}
              <div className="bg-bg-primary border border-divider shadow-card rounded-2xl p-5 flex items-center justify-between">
                <div className="space-y-0.5 min-w-0">
                  <span className="text-[10px] font-bold text-text-secondary/70 uppercase tracking-wider block">Total de Clientes</span>
                  <span className="text-2xl font-black text-text-primary block font-mono">
                    {formatNum(kpis.total_clientes)}
                  </span>
                  <span className="text-[9px] text-text-secondary block font-bold">Base ativa cadastrada</span>
                </div>
                <div className="p-3 bg-brand-500/10 text-brand-500 rounded-2xl shrink-0">
                  <Users size={18} />
                </div>
              </div>

              {/* Card 2: Mês Atual */}
              <div className="bg-bg-primary border border-divider shadow-card rounded-2xl p-5 flex items-center justify-between">
                <div className="space-y-0.5 min-w-0">
                  <span className="text-[10px] font-bold text-text-secondary/70 uppercase tracking-wider block">Mês Atual</span>
                  <span className="text-2xl font-black text-text-primary block font-mono">
                    {formatNum(kpis.mes_atual)}
                  </span>
                  <span className="text-[9px] text-text-secondary block font-bold">Clientes com venda</span>
                </div>
                <div className="p-3 bg-success/10 text-success rounded-2xl shrink-0">
                  <TrendingUp size={18} className="text-emerald-500" />
                </div>
              </div>

              {/* Card 3: Mês Anterior */}
              <div className="bg-bg-primary border border-divider shadow-card rounded-2xl p-5 flex items-center justify-between">
                <div className="space-y-0.5 min-w-0">
                  <span className="text-[10px] font-bold text-text-secondary/70 uppercase tracking-wider block">Mês Anterior</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-text-primary block font-mono">
                      {formatNum(kpis.mes_anterior)}
                    </span>
                    <span className={clsx(
                      "text-[10px] font-mono font-extrabold flex items-center",
                      (kpis.mes_atual - kpis.mes_anterior) >= 0 ? "text-success" : "text-red-500"
                    )}>
                      {(kpis.mes_atual - kpis.mes_anterior) >= 0 ? '▲' : '▼'}{' '}
                      {Math.abs(kpis.mes_atual - kpis.mes_anterior)}
                    </span>
                  </div>
                  <span className="text-[9px] text-text-secondary block font-bold">Clientes com venda</span>
                </div>
                <div className="p-3 bg-slate-500/10 text-slate-500 rounded-2xl shrink-0">
                  <TrendingDown size={18} />
                </div>
              </div>

              {/* Card 4: Retenção */}
              <div className="bg-bg-primary border border-divider shadow-card rounded-2xl p-5 flex items-center justify-between">
                <div className="space-y-0.5 min-w-0">
                  <span className="text-[10px] font-bold text-text-secondary/70 uppercase tracking-wider block">Retenção</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-text-primary block font-mono">
                      {retencaoPct.toFixed(1)}%
                    </span>
                    <span className="text-[9px] font-bold text-text-muted font-mono">Meta CS: 28.0%</span>
                  </div>
                  <span className="text-[9px] text-text-secondary block font-bold">Peso sobre base total</span>
                </div>
                <div className={clsx(
                  "p-3 rounded-2xl shrink-0",
                  retencaoPct >= 28 ? "bg-success/10 text-success" : "bg-red-500/10 text-red-500"
                )}>
                  <Activity size={18} />
                </div>
              </div>

            </div>
          </div>

          {/* SEÇÃO 2: OPORTUNIDADES E RISCO */}
          <div className="space-y-2">
            <span className="text-[10px] font-black text-text-secondary/80 uppercase tracking-wider pl-1 block">Oportunidades e Risco</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Card 1: Novos Clientes */}
              <div className="bg-bg-primary border border-divider shadow-card rounded-2xl p-5 flex items-center justify-between">
                <div className="space-y-0.5 min-w-0">
                  <span className="text-[10px] font-bold text-text-secondary/70 uppercase tracking-wider block">Novos Clientes</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-text-primary block font-mono">
                      {formatNum(kpis.novos_clientes)}
                    </span>
                    <span className="text-[9px] font-bold text-text-muted font-mono">Meta: 21</span>
                  </div>
                  <span className="text-[9px] text-text-secondary block font-bold">Novos cadastros no período</span>
                </div>
                <div className="p-3 bg-brand-500/10 text-brand-500 rounded-2xl shrink-0">
                  <UserPlus size={18} />
                </div>
              </div>

              {/* Card 2: Sem Vendas (Mês Atual) */}
              <div className="bg-bg-primary border border-divider shadow-card rounded-2xl p-5 flex items-center justify-between">
                <div className="space-y-0.5 min-w-0">
                  <span className="text-[10px] font-bold text-text-secondary/70 uppercase tracking-wider block">Sem Vendas (Mês Atual)</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-text-primary block font-mono">
                      {formatNum(kpis.sem_vendas_atual)}
                    </span>
                    <span className="text-[9px] text-text-secondary font-mono">({semVendasAtualPct.toFixed(1)}%)</span>
                  </div>
                  <span className="text-[9px] text-text-secondary block font-bold">Clientes sem compras no período</span>
                </div>
                <div className="p-3 bg-red-500/10 text-red-500 rounded-2xl shrink-0">
                  <UserMinus size={18} />
                </div>
              </div>

              {/* Card 3: Sem Vendas (Mês Anterior) */}
              <div className="bg-bg-primary border border-divider shadow-card rounded-2xl p-5 flex items-center justify-between">
                <div className="space-y-0.5 min-w-0">
                  <span className="text-[10px] font-bold text-text-secondary/70 uppercase tracking-wider block">Sem Vendas (Mês Anterior)</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-text-primary block font-mono">
                      {formatNum(kpis.sem_vendas_anterior)}
                    </span>
                    <span className="text-[9px] text-text-secondary font-mono">({semVendasAnteriorPct.toFixed(1)}%)</span>
                  </div>
                  <span className="text-[9px] text-text-secondary block font-bold">Inatividade histórica anterior</span>
                </div>
                <div className="p-3 bg-orange-500/10 text-orange-600 rounded-2xl shrink-0">
                  <AlertCircle size={18} />
                </div>
              </div>

              {/* Card 4: Risco de Churn */}
              <div className="bg-bg-primary border border-divider shadow-card rounded-2xl p-5 flex items-center justify-between">
                <div className="space-y-0.5 min-w-0">
                  <span className="text-[10px] font-bold text-text-secondary/70 uppercase tracking-wider block">Risco de Churn</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-text-primary block font-mono">
                      {churnPct.toFixed(1)}%
                    </span>
                    <span className="text-[9px] font-bold text-text-muted font-mono">Meta: 72.0%</span>
                  </div>
                  <span className="text-[9px] text-text-secondary block font-bold">Peso inativo / Base total</span>
                </div>
                <div className={clsx(
                  "p-3 rounded-2xl shrink-0",
                  churnPct <= 72 ? "bg-success/10 text-success" : "bg-red-500/10 text-red-500"
                )}>
                  <Activity size={18} />
                </div>
              </div>

            </div>
          </div>

          {/* RANKINGS DE RECORRÊNCIA E RISCOS */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            
            {/* Clientes com Maior Recorrência */}
            <div className="bg-bg-primary border border-divider shadow-card rounded-2xl p-6 flex flex-col min-h-[380px] transition-all">
              <div className="flex items-center gap-2 border-b border-divider/20 pb-3 mb-4">
                <Award className="text-brand-500" size={18} />
                <h3 className="text-sm font-extrabold text-text-primary uppercase tracking-wider">Clientes com Maior Recorrência</h3>
              </div>

              <div className="flex-1 text-xs pr-1 space-y-1">
                {analytics.data?.recorrentes?.map((c: any, index: number) => {
                  const maxOrders = analytics.data.recorrentes[0]?.pedidos || 1;
                  const share = (c.pedidos / maxOrders) * 100;
                  const isTop3 = c.rank <= 3;
                  return (
                    <div key={c.id || index} className="relative flex justify-between items-center py-2 px-3 rounded-lg overflow-hidden group hover:bg-bg-secondary/45 transition-colors">
                      <div 
                        className="absolute left-0 top-0 bottom-0 bg-brand-500/5 group-hover:bg-brand-500/10 transition-all duration-500" 
                        style={{ width: `${share}%` }} 
                      />
                      <span className="relative z-10 text-text-secondary truncate font-medium text-xs flex-1 min-w-0 mr-3 flex items-center gap-2.5" title={c.name}>
                        <span className={clsx(
                          "font-mono text-xs min-w-[20px]", 
                          c.rank === 1 ? "text-amber-500 font-black" : c.rank === 2 ? "text-slate-400 font-black" : c.rank === 3 ? "text-orange-600 font-black" : "text-text-muted font-bold"
                        )}>
                          #{c.rank}
                        </span>
                        <div>
                          <span className="truncate text-text-primary font-bold group-hover:text-brand-500 transition-colors block text-xs">{c.name}</span>
                          <span className="text-[10px] text-text-secondary font-medium block">
                            Última compra: {c.ultimo_pedido ? new Date(c.ultimo_pedido).toLocaleDateString('pt-BR') : '—'}
                          </span>
                        </div>
                      </span>
                      <div className="relative z-10 text-right shrink-0 flex flex-col font-mono text-xs items-end">
                        <span className="font-extrabold text-brand-500 text-xs">{c.pedidos} pedidos</span>
                        <span className="text-[9px] text-text-secondary">{formatBRL(c.total_gasto)}</span>
                      </div>
                    </div>
                  );
                })}
                {(!analytics.data?.recorrentes || analytics.data.recorrentes.length === 0) && (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6">
                    <EyeOff size={24} className="text-text-muted mb-1 stroke-[1.5]" />
                    <span className="text-xs text-text-muted font-bold">Nenhum cliente faturado.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Clientes com Menos Recorrência */}
            <div className="bg-bg-primary border border-divider shadow-card rounded-2xl p-6 flex flex-col min-h-[380px] transition-all">
              <div className="flex items-center gap-2 border-b border-divider/20 pb-3 mb-4">
                <AlertCircle className="text-red-500" size={18} />
                <h3 className="text-sm font-extrabold text-text-primary uppercase tracking-wider">Clientes com Menos Recorrência</h3>
              </div>

              <div className="flex-1 text-xs pr-1 space-y-1">
                {analytics.data?.churn?.map((c: any, index: number) => {
                  const maxDias = analytics.data.churn[0]?.dias_inativo || 1;
                  const share = (c.dias_inativo / maxDias) * 100;
                  return (
                    <div key={c.id || index} className="relative flex justify-between items-center py-2 px-3 rounded-lg overflow-hidden group hover:bg-bg-secondary/45 transition-colors">
                      <div 
                        className="absolute left-0 top-0 bottom-0 bg-red-500/5 group-hover:bg-red-500/10 transition-all duration-500" 
                        style={{ width: `${share}%` }} 
                      />
                      <span className="relative z-10 text-text-secondary truncate font-medium text-xs flex-1 min-w-0 mr-3 flex items-center gap-2.5" title={c.name}>
                        <span className="font-mono text-xs min-w-[20px] text-red-500 font-extrabold">#{c.rank}</span>
                        <div>
                          <span className="truncate text-text-primary font-bold group-hover:text-red-500 transition-colors block text-xs">{c.name}</span>
                          <span className="text-[10px] text-red-500 font-black block">
                            {c.dias_inativo} dias sem comprar
                          </span>
                        </div>
                      </span>
                      <div className="relative z-10 text-right shrink-0 flex flex-col font-mono text-xs items-end">
                        <span className="font-extrabold text-text-primary text-xs">{c.pedidos} pedidos</span>
                        <span className="text-[9px] text-text-secondary">
                          Último: {c.ultimo_pedido ? new Date(c.ultimo_pedido).toLocaleDateString('pt-BR') : '—'}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {(!analytics.data?.churn || analytics.data.churn.length === 0) && (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6">
                    <EyeOff size={24} className="text-text-muted mb-1 stroke-[1.5]" />
                    <span className="text-xs text-text-muted font-bold">Nenhum cliente em risco.</span>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* LISTAGEM GERAL DE CLIENTES */}
          <div className="bg-bg-primary border border-divider shadow-card rounded-2xl p-6 space-y-4">
            
            <div className="border-b border-divider/20 pb-3">
              <h3 className="text-sm font-extrabold text-text-primary uppercase tracking-wider flex items-center gap-2">
                <FileText className="text-brand-500" size={16} />
                Listagem Geral de Clientes
              </h3>
              <p className="text-[10px] text-text-secondary font-bold mt-0.5">
                Todos os clientes ativos com filtros de inatividade e buscas instantâneas.
              </p>
            </div>

            {/* BARRA DE FILTROS DA LISTA */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="relative w-full">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar por nome ou CNPJ..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-9 pl-9 pr-4 bg-bg-secondary border border-divider text-text-primary rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all duration-300 shadow-sm"
                />
              </div>

              {/* Tempo Inativo */}
              <div className="relative w-full">
                <select
                  value={tempoInativo}
                  onChange={(e) => {
                    setTempoInativo(e.target.value);
                    setPage(1);
                  }}
                  className="appearance-none h-9 px-3 bg-bg-secondary border border-divider text-text-primary rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all duration-300 w-full cursor-pointer pr-9 shadow-sm"
                >
                  <option value="Qualquer Inatividade">Qualquer Inatividade</option>
                  <option value="Ativos (Comprou no mês)">Ativos (Comprou no mês)</option>
                  <option value="Inativo > 30 dias">Inativo &gt; 30 dias</option>
                  <option value="Inativo > 60 dias">Inativo &gt; 60 dias</option>
                  <option value="Inativo > 90 dias">Inativo &gt; 90 dias</option>
                  <option value="Sem compras / Churn">Sem compras / Churn</option>
                </select>
                <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
              </div>

              {/* Ordenação */}
              <div className="relative w-full">
                <select
                  value={ordenacao}
                  onChange={(e) => {
                    setOrdenacao(e.target.value);
                    setPage(1);
                  }}
                  className="appearance-none h-9 px-3 bg-bg-secondary border border-divider text-text-primary rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all duration-300 w-full cursor-pointer pr-9 shadow-sm"
                >
                  <option value="Mais inativos primeiro (Alerta)">Mais inativos primeiro (Alerta)</option>
                  <option value="Mais ativos primeiro">Mais ativos primeiro</option>
                  <option value="Maior faturamento">Maior faturamento</option>
                  <option value="Menor faturamento">Menor faturamento</option>
                  <option value="Ordem alfabética">Ordem alfabética</option>
                </select>
                <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
              </div>
            </div>

            {/* TABELA DE DADOS */}
            {list.isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-text-secondary">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-500 mr-3 mb-2"></div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-text-secondary">Buscando listagem...</span>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-divider">
                <table className="min-w-full divide-y divide-divider/25 text-left text-xs">
                  <thead className="bg-bg-secondary text-text-secondary uppercase text-[10px] font-black tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Cliente</th>
                      <th className="px-4 py-3">Cidade</th>
                      <th className="px-4 py-3">Vendedor Resp.</th>
                      <th className="px-4 py-3 text-right">Pedidos</th>
                      <th className="px-4 py-3">Última Compra</th>
                      <th className="px-4 py-3 text-right">Dias Inativo</th>
                      <th className="px-4 py-3 text-right">Risco Churn</th>
                      <th className="px-4 py-3 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-divider/10 bg-bg-primary text-text-primary text-[10.5px] font-medium">
                    {list.data?.data?.map((c: any) => {
                      const riskLevel = c.dias_inativo > 90 ? '99%' : c.dias_inativo > 60 ? '75%' : c.dias_inativo > 30 ? '40%' : '0%';
                      const isAlert = c.dias_inativo > 60;
                      return (
                        <tr key={c.id} className="hover:bg-bg-secondary/20 transition-colors">
                          {/* Cliente */}
                          <td className="px-4 py-2 min-w-[200px]">
                            <span className="block font-bold text-text-primary truncate max-w-[220px] text-[11px]">{c.nome}</span>
                            <span className="block text-[8.5px] text-text-secondary/70 font-mono mt-0.5">{c.documento || '—'}</span>
                          </td>
                          {/* Cidade */}
                          <td className="px-4 py-2 text-text-secondary font-bold uppercase truncate max-w-[120px]">
                            {c.cidade ? `${c.cidade}/${c.estado}` : '—'}
                          </td>
                          {/* Vendedor */}
                          <td className="px-4 py-2 text-text-secondary truncate max-w-[150px]">
                            {c.vendedor_resp || '—'}
                          </td>
                          {/* Pedidos */}
                          <td className="px-4 py-2 text-right font-mono font-bold">
                            {formatNum(c.qtd_pedidos)}
                          </td>
                          {/* Última Compra */}
                          <td className="px-4 py-2 text-text-secondary font-mono">
                            {c.ultimo_pedido ? new Date(c.ultimo_pedido).toLocaleDateString('pt-BR') : '—'}
                          </td>
                          {/* Dias Inativo */}
                          <td className="px-4 py-2 text-right font-mono">
                            <span className={clsx(
                              "px-2 py-0.5 rounded-md font-bold text-[9px]",
                              c.dias_inativo > 90 ? "bg-red-500/10 text-red-500" :
                              c.dias_inativo > 30 ? "bg-orange-500/10 text-orange-600" :
                              "bg-emerald-500/10 text-emerald-600"
                            )}>
                              {c.dias_inativo === 999 ? 'Sem Compras' : `${c.dias_inativo} dias`}
                            </span>
                          </td>
                          {/* Risco Churn */}
                          <td className="px-4 py-2 text-right font-mono">
                            <span className={clsx(
                              "font-black text-[10.5px]",
                              c.dias_inativo > 90 ? "text-red-500" :
                              c.dias_inativo > 30 ? "text-orange-500" :
                              "text-emerald-600"
                            )}>
                              {riskLevel}
                            </span>
                          </td>
                          {/* Ações */}
                          <td className="px-4 py-2 text-center">
                            <button
                              onClick={() => navigate(`/bi/customer?id=${c.id}`)}
                              className="px-2 py-0.5 bg-bg-secondary hover:bg-brand-500 hover:text-white border border-divider text-text-primary text-[9px] font-black rounded-lg transition-all cursor-pointer shadow-sm uppercase tracking-wider"
                            >
                              Ver Ficha
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {(!list.data?.data || list.data.data.length === 0) && (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-text-secondary font-bold">
                          Nenhum cliente encontrado com os filtros selecionados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* PAGINAÇÃO */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2 border-t border-divider/10">
                <span className="text-[10px] text-text-secondary font-bold">
                  Página {page} de {totalPages} ({list.data?.total || 0} clientes)
                </span>
                
                <div className="flex gap-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-divider bg-bg-secondary hover:bg-bg-tertiary disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-sm"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    className="p-1.5 rounded-lg border border-divider bg-bg-secondary hover:bg-bg-tertiary disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-sm"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}

          </div>
        </>
      )}

    </div>
  );
}
