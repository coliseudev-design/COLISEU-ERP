import { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useBiPeriodQuery } from '../../hooks/useBiPeriodQuery';
import { useQuery } from '@tanstack/react-query';
import { BIService } from '../../services/biApi';
import { BiPeriodFilter } from '../../types/bi.types';
import { 
  Building2, TrendingUp, TrendingDown, DollarSign, Target, Award, 
  MapPin, Users, ShoppingCart, Activity, ShieldCheck, Box, ChevronDown, Search, AlertCircle, Trophy, X, ShieldAlert
} from 'lucide-react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatBRL, formatBRLCompact, formatNum } from '../../utils/format';
import clsx from 'clsx';
import { PromptViewer } from '../../components/PromptViewer';


// Badge Comparativo para tabelas
const DeltaBadge = ({ pct }: { pct: number | null }) => {
  if (pct === null) return <span className="text-text-muted">-</span>;
  const isUp = pct > 0;
  const isDown = pct < 0;
  return (
    <div className={clsx(
      "inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md",
      isUp ? "bg-success/10 text-success" : isDown ? "bg-danger/10 text-danger" : "bg-text-muted/10 text-text-muted"
    )}>
      {isUp && <TrendingUp size={12} className="mr-1" />}
      {isDown && <TrendingDown size={12} className="mr-1" />}
      {Math.abs(pct).toFixed(1)}%
    </div>
  );
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-bg-primary border border-border shadow-card-hover p-4 rounded-xl z-50">
        <p className="text-text-primary font-bold mb-2 pb-2 border-b border-divider">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex justify-between items-center gap-4 text-sm mb-1">
            <span className="text-text-secondary flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
              {entry.name}:
            </span>
            <span className="font-bold text-text-primary">
              {entry.name.includes('Valor') || entry.name.includes('Receita')
                ? formatBRL(entry.value)
                : entry.name.includes('Margem') 
                  ? `${entry.value.toFixed(1)}%` 
                  : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function SupplierAnalyticsDashboard() {
  const { filter } = useOutletContext<{ filter: BiPeriodFilter }>();
  const [activeTab, setActiveTab] = useState('Visão Geral de Vendas');
  const [selectedBrand, setSelectedBrand] = useState(''); // Default to empty (All Brands)
  const [stockSearch, setStockSearch] = useState('');
  const [stockSort, setStockSort] = useState('alto'); // 'alto', 'baixo', 'custo'
  const [selectedProductCode, setSelectedProductCode] = useState<string | null>(null);

  const supplierFilter = { ...filter, marca: selectedBrand };

  const { data, isLoading } = useBiPeriodQuery(
    ['bi', 'supplier', selectedBrand],
    () => BIService.getSupplierAnalytics(supplierFilter),
    supplierFilter
  );

  const performanceMensal = useMemo(() => {
    const raw = data?.monthly_performance || [];
    return raw.map((row, i) => {
      const prev = i > 0 ? raw[i - 1] : null;
      const cresc_vendas = prev && prev.valor > 0 ? ((row.valor - prev.valor) / prev.valor) * 100 : null;
      const cresc_qtde = prev && prev.qtde > 0 ? ((row.qtde - prev.qtde) / prev.qtde) * 100 : null;
      return {
        ...row,
        vendas: row.valor,
        cresc_vendas,
        cresc_qtde
      };
    });
  }, [data?.monthly_performance]);

  const stockKpis = data?.stock_kpis || { custo_total: 0, venda_total: 0, volume_total: 0 };
  const rawInventory = data?.inventory || [];
  const stockMargem = stockKpis.venda_total > 0 ? ((stockKpis.venda_total - stockKpis.custo_total) / stockKpis.venda_total) * 100 : 0;

  const filteredInventory = useMemo(() => {
    let result = [...rawInventory];
    if (stockSearch) {
      const q = stockSearch.toLowerCase();
      result = result.filter(item => 
        item.desc.toLowerCase().includes(q) || 
        item.cod.toLowerCase().includes(q)
      );
    }
    if (stockSort === 'alto') {
      result.sort((a, b) => b.estoque - a.estoque);
    } else if (stockSort === 'baixo') {
      result.sort((a, b) => a.estoque - b.estoque);
    } else if (stockSort === 'custo') {
      result.sort((a, b) => b.valor_total - a.valor_total);
    }
    return result;
  }, [rawInventory, stockSearch, stockSort]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-text-secondary">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500 mr-3"></div>
        Carregando Performance de Parceiros...
      </div>
    );
  }



  const chartData = data?.monthly_performance || [];
  const overview = data?.overview || { receita: 0, custo: 0, pedidos: 0, clientes: 0 };
  const topProducts = data?.top_products || [];
  const topBrands = data?.top_brands || [];
  const availableBrands = data?.available_brands || ['VHM TRACTOR'];
  const margem = overview.receita > 0 ? ((overview.receita - overview.custo) / overview.receita) * 100 : 0;
  const ticketMedio = overview.pedidos > 0 ? overview.receita / overview.pedidos : 0;

  const totalCompanyRevenue = data?.total_company_revenue || 0;
  const currentBrandData = selectedBrand ? topBrands.find((b: any) => b.name === selectedBrand) : null;
  const currentRank = currentBrandData ? `${currentBrandData.rank}º` : '-';
  const currentShare = (() => {
    if (!selectedBrand) return '100.0%';
    if (!currentBrandData || totalCompanyRevenue <= 0) return '0.0%';
    const pct = (currentBrandData.receita / totalCompanyRevenue) * 100;
    if (pct < 0.01) return pct.toFixed(3) + '%';
    if (pct < 0.1) return pct.toFixed(2) + '%';
    return pct.toFixed(1) + '%';
  })();

  return (
    <div aria-label="Fornecedores Dashboard" className="space-y-6 animate-in fade-in duration-300 pb-10">
      
      {/* ORANGE BANNER */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-600 rounded-xl p-5 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6 text-white relative overflow-hidden">
        {/* Subtle background decoration */}
        <div className="absolute right-0 top-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
        
        <div className="flex items-center gap-4 z-10">
          <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
            <Target size={32} className="text-white" />
          </div>
          <div className="flex flex-col gap-1.5">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight">{selectedBrand || 'Todas as Marcas'}</h2>
              <p className="text-orange-100 font-medium text-sm leading-none mt-0.5">Raio-X de Performance no Período</p>
            </div>
            
            {/* Filtro de Marca e Botão Analisar em Linha (Movidos conforme solicitado) */}
            <div className="flex items-center gap-2 mt-1">
              <select 
                aria-label="Selecionar Marca"
                className="bg-white/10 hover:bg-white/20 border border-white/25 rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:border-white/50 max-w-[200px] cursor-pointer"
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                style={{ colorScheme: 'dark' }}
              >
                <option value="" className="text-slate-900 bg-white">Todas as Marcas</option>
                {availableBrands.map((b: string) => (
                  <option key={b} value={b} className="text-slate-900 bg-white">{b}</option>
                ))}
              </select>
              <button 
                type="button"
                className="bg-white text-orange-600 hover:bg-orange-50 font-black px-3.5 py-1 rounded-lg text-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-[0.97] cursor-pointer border border-transparent"
              >
                <Search size={12} className="text-orange-600" /> Analisar
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 z-10">
          <div className="bg-white text-orange-600 rounded-xl px-4 py-3 flex items-center gap-3 shadow-md">
            <div className="text-2xl font-extrabold bg-orange-100 rounded-full w-10 h-10 flex items-center justify-center">{currentRank}</div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-wider text-orange-400">Posição no Ranking</span>
              <span className="text-xs font-bold text-orange-600">Período Selecionado</span>
            </div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl px-4 py-3 flex flex-col justify-center shadow-md">
            <span className="text-[10px] font-black uppercase tracking-wider text-orange-100">Share da Empresa</span>
            <span className="text-xl font-extrabold text-white">{currentShare}</span>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="flex items-center gap-6 border-b border-border px-2">
        {['Visão Geral de Vendas', 'Ranking de Marcas', 'Análise de Estoque', 'Catálogo'].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={clsx(
              "pb-3 text-sm font-bold uppercase tracking-wide transition-colors relative flex items-center gap-2",
              activeTab === tab ? "text-brand-500" : "text-text-muted hover:text-text-primary"
            )}
          >
            {tab === 'Visão Geral de Vendas' && <Activity size={16} />}
            {tab === 'Ranking de Marcas' && <Target size={16} />}
            {tab === 'Análise de Estoque' && <Box size={16} />}
            {tab === 'Catálogo' && <ShoppingCart size={16} />}
            {tab}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-500 rounded-t-full"></div>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'Visão Geral de Vendas' && (
        !selectedBrand ? (
          <div className="bg-bg-primary border border-border shadow-card rounded-xl p-12 text-center animate-in fade-in flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-bg-secondary rounded-full flex items-center justify-center mb-4">
              <Activity size={32} className="text-text-muted" />
            </div>
            <h3 className="text-xl font-bold text-text-primary mb-2">Selecione uma Marca</h3>
            <p className="text-sm text-text-secondary max-w-md">
              Para visualizar a <strong>Visão Geral de Vendas</strong>, escolha uma marca específica no filtro superior. Para ver o portfólio completo, acesse a guia "Ranking de Marcas".
            </p>
          </div>
        ) : (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* PERFORMANCE MENSAL TABLE */}
          <div className="bg-bg-primary border border-border shadow-card rounded-xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-divider">
          <h3 className="font-bold text-text-primary text-sm uppercase tracking-wider">Performance Mensal</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-bg-secondary/30 text-[10px] text-text-muted uppercase font-bold tracking-wider">
                <th className="px-5 py-3">MÊS / ANO</th>
                <th className="px-5 py-3 text-right">TOTAL VENDAS (R$)</th>
                <th className="px-5 py-3 text-center">CRESCIMENTO (VENDAS)</th>
                <th className="px-5 py-3 text-right">QTDE. VENDIDA</th>
                <th className="px-5 py-3 text-center">CRESCIMENTO (QTDE.)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider/30 text-xs">
              {performanceMensal.map((row, i) => (
                <tr key={i} className="hover:bg-bg-secondary/50 transition-colors">
                  <td className="px-5 py-3 font-bold text-text-primary">{row.mes}</td>
                  <td className="px-5 py-3 text-right font-mono font-bold text-text-primary">{formatBRL(row.vendas)}</td>
                  <td className="px-5 py-3 text-center"><DeltaBadge pct={row.cresc_vendas} /></td>
                  <td className="px-5 py-3 text-right font-bold text-text-primary">{row.qtde}</td>
                  <td className="px-5 py-3 text-center"><DeltaBadge pct={row.cresc_qtde} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* ROW 1 */}
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-4 flex flex-col justify-between hover:border-success/50 transition-colors">
          <div className="flex items-center gap-2 text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">
            <DollarSign size={14} className="text-success" /> Receita Total
          </div>
          <div>
            <div className="text-xl font-extrabold text-text-primary mb-1">{formatBRL(overview.receita)}</div>
            <div className="flex items-center gap-1 text-[10px] text-text-muted font-bold">Baseado nas vendas da marca</div>
          </div>
        </div>
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-4 flex flex-col justify-between hover:border-danger/50 transition-colors">
          <div className="flex items-center gap-2 text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">
            <DollarSign size={14} className="text-danger" /> Custo
          </div>
          <div>
            <div className="text-xl font-extrabold text-text-primary mb-1">{formatBRL(overview.custo)}</div>
            <div className="text-[10px] text-text-muted">Custo das vendas</div>
          </div>
        </div>
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-4 flex flex-col justify-between hover:border-brand-500/50 transition-colors">
          <div className="flex items-center gap-2 text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">
            <Target size={14} className="text-brand-500" /> Margem
          </div>
          <div>
            <div className="text-xl font-extrabold text-text-primary mb-1">{margem.toFixed(1)}%</div>
            <div className="text-[10px] text-text-muted">Rentabilidade bruta</div>
          </div>
        </div>
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">
            <Box size={14} className="text-warning" /> Volume de Pedidos
          </div>
          <div>
            <div className="text-xl font-extrabold text-text-primary mb-1">{overview.pedidos}</div>
            <div className="text-[10px] text-text-muted">Pedidos no período</div>
          </div>
        </div>
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">
            <ShoppingCart size={14} className="text-cyan-500" /> Valor Médio de Compra
          </div>
          <div>
            <div className="text-xl font-extrabold text-text-primary mb-1">{formatBRL(ticketMedio)}</div>
            <div className="text-[10px] text-text-muted">Valor médio por pedido</div>
          </div>
        </div>

        {/* ROW 2 */}
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">
            <Award size={14} className="text-blue-500" /> Principal Cliente
          </div>
          <div>
            <div className="text-sm font-extrabold text-text-primary mb-1 leading-tight break-words">NORTH FACE LOGÍSTICA E TRANSPORTES LTDA</div>
            <div className="text-[10px] text-text-muted mt-2">Maior comprador</div>
          </div>
        </div>
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">
            <MapPin size={14} className="text-text-secondary" /> Cidade Destaque
          </div>
          <div>
            <div className="text-xl font-extrabold text-text-primary mb-1">N/A</div>
            <div className="text-[10px] text-text-muted">Mais vendas no período</div>
          </div>
        </div>
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">
            <Users size={14} className="text-brand-500" /> Vendedor Destaque
          </div>
          <div>
            <div className="text-xl font-extrabold text-text-primary mb-1">N/A</div>
            <div className="text-[10px] text-text-muted">Maior volume na marca</div>
          </div>
        </div>
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">
            <Box size={14} className="text-text-secondary" /> SKUs Vendidos
          </div>
          <div>
            <div className="text-xl font-extrabold text-text-primary mb-1">{topProducts.length}</div>
            <div className="text-[10px] text-text-muted">Produtos distintos</div>
          </div>
        </div>
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">
            <Building2 size={14} className="text-cyan-500" /> Clientes Ativos
          </div>
          <div>
            <div className="text-xl font-extrabold text-text-primary mb-1">{overview.clientes}</div>
            <div className="text-[10px] text-text-muted">Compraram no período</div>
          </div>
        </div>
      </div>

      {/* TOP 3 PRODUTOS EM VENDAS */}
      <div>
        <h3 className="font-bold text-text-primary text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
          <Award size={18} className="text-warning" /> Top 3 Produtos em Vendas
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {topProducts.slice(0, 3).map((prod, index) => {
             const isFirst = index === 0;
             const isSecond = index === 1;
             const isThird = index === 2;
             
             let colors = {
                 border: isFirst ? 'border-warning/30' : isSecond ? 'border-text-secondary/30' : 'border-[#b08d57]/30',
                 hover: isFirst ? 'hover:border-warning' : isSecond ? 'hover:border-text-secondary' : 'hover:border-[#b08d57]',
                 bg: isFirst ? 'bg-warning' : isSecond ? 'bg-text-secondary' : 'bg-[#b08d57]',
                 text: isFirst ? 'text-warning' : isSecond ? 'text-text-secondary' : 'text-[#b08d57]',
                 label: isFirst ? '1º Lugar' : isSecond ? '2º Lugar' : '3º Lugar'
             };

             return (
               <div key={index} className={`bg-bg-primary border ${colors.border} shadow-card rounded-xl p-5 relative overflow-hidden group ${colors.hover} transition-colors`}>
                  {isFirst && (
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                       <Award size={64} className="text-warning" />
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-6 h-6 rounded-full ${colors.bg} flex items-center justify-center text-white text-xs font-bold`}>{index + 1}</div>
                    <span className={`text-xs font-bold ${colors.text} uppercase tracking-wider`}>{colors.label}</span>
                  </div>
                  <div className="text-sm font-bold text-text-primary mb-6 pr-8 truncate" title={prod.name}>{prod.name}</div>
                  <div className="flex justify-between items-end border-t border-divider/50 pt-4 mt-auto">
                     <div>
                        <div className="text-[10px] text-text-muted uppercase font-bold tracking-wider mb-1">Volume</div>
                        <div className="text-sm font-bold text-text-primary">{prod.volume} un.</div>
                     </div>
                     <div className="text-right">
                        <div className="text-[10px] text-text-muted uppercase font-bold tracking-wider mb-1">Receita</div>
                        <div className={`text-lg font-extrabold ${isFirst ? 'text-success' : 'text-text-primary'}`}>{formatBRL(prod.receita)}</div>
                     </div>
                  </div>
               </div>
             );
          })}
        </div>
      </div>

      {/* EVOLUÇÃO DE VENDAS NO PERÍODO (ComposedChart) */}
      <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-text-primary text-sm uppercase tracking-wider">Evolução de Vendas no Período</h3>
          <div className="bg-bg-secondary border border-border rounded-lg px-3 py-1 flex items-center gap-2 text-xs font-medium">
             Gráfico de Barras <ChevronDown size={14} className="text-text-muted" />
          </div>
        </div>
        <div className="h-[250px] sm:h-[320px] lg:h-[370px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 20, right: 20, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.3} />
              <XAxis dataKey="mes" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false} />
              <YAxis yAxisId="left" tickFormatter={(v) => formatBRLCompact(v)} tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-bg-tertiary)', opacity: 0.3 }} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '20px' }} iconType="circle" />
              <Bar yAxisId="left" dataKey="valor" name="Valor Total" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Line yAxisId="right" type="monotone" dataKey="qtde" name="Quantidade" stroke="#10B981" strokeWidth={2} dot={{ r: 4, fill: '#10B981', strokeWidth: 0 }} />
              <Line yAxisId="right" type="monotone" dataKey="margem" name="Margem (%)" stroke="#F59E0B" strokeWidth={2} dot={{ r: 4, fill: '#F59E0B', strokeWidth: 0 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* RANKING DE PRODUTOS VENDIDOS */}
      <div className="bg-bg-primary border border-border shadow-card rounded-xl flex flex-col overflow-hidden">
        <div className="p-4 border-b border-divider flex justify-between items-center">
          <h3 className="font-bold text-text-primary text-sm uppercase tracking-wider">Ranking de Produtos Vendidos</h3>
          <div className="bg-bg-secondary border border-border rounded-lg px-3 py-1 flex items-center gap-2 text-xs font-medium">
             Top 30 <ChevronDown size={14} className="text-text-muted" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-bg-secondary/30 text-[10px] text-text-muted uppercase font-bold tracking-wider">
                <th className="px-5 py-3 w-16">POS</th>
                <th className="px-5 py-3">PRODUTO</th>
                <th className="px-5 py-3 text-right">QTDE. VENDIDA</th>
                <th className="px-5 py-3 text-right">VALOR TOTAL (R$)</th>
                <th className="px-5 py-3 text-right">PARTICIPAÇÃO (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider/30 text-xs">
              {topProducts.map((prod: any, idx: number) => (
                <tr key={idx} className="hover:bg-bg-secondary/50 transition-colors">
                  <td className="px-5 py-3 font-bold text-text-muted">{prod.rank}º</td>
                  <td className="px-5 py-3 font-bold text-text-primary">{prod.name}</td>
                  <td className="px-5 py-3 text-right font-medium text-text-primary">{prod.volume}</td>
                  <td className="px-5 py-3 text-right font-mono font-bold text-text-primary">{formatBRL(prod.receita)}</td>
                  <td className="px-5 py-3 text-right font-bold text-text-secondary">
                    {overview.receita > 0 ? ((prod.receita / overview.receita) * 100).toFixed(1) : 0}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* INTELIGÊNCIA DE NEGOCIAÇÃO */}
      <div className="mt-8">
        <h3 className="font-bold text-text-primary text-base flex items-center gap-2 mb-4">
          <ShieldCheck size={20} className="text-brand-500" /> Insights de Negociação (IA)
        </h3>
        
        <div className="bg-bg-primary border border-border shadow-card rounded-xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-divider">
            <h3 className="font-bold text-text-primary text-sm tracking-wider">Insights de Negociação (IA)</h3>
          </div>
          <div className="p-5 space-y-4">
            <div className="bg-success/5 border border-success/20 rounded-lg p-4 flex gap-4">
              <div className="mt-0.5"><TrendingUp size={18} className="text-success" /></div>
              <div>
                <h4 className="font-bold text-success text-sm mb-1">Tendência de Crescimento Forte</h4>
                <p className="text-sm text-text-secondary">A marca cresceu 32.9%. Ótimo momento para negociar maiores volumes de compra com desconto.</p>
              </div>
            </div>
            <div className="bg-success/5 border border-success/20 rounded-lg p-4 flex gap-4">
              <div className="mt-0.5"><Target size={18} className="text-success" /></div>
              <div>
                <h4 className="font-bold text-success text-sm mb-1">Rentabilidade Elevada</h4>
                <p className="text-sm text-text-secondary">A marca apresenta excelente margem de lucro médio. Considere realizar campanhas de incentivo para a equipe de vendas focar nestes produtos.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
)}
      {activeTab === 'Ranking de Marcas' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-brand-500 text-white p-2 rounded-lg"><Trophy size={24} /></div>
            <div>
              <h3 className="font-bold text-text-primary text-lg">Ranking e Desempenho de Marcas</h3>
              <p className="text-sm text-text-secondary">Visão geral do faturamento e market share por marca</p>
            </div>
          </div>

          {/* 1. Visão Geral (Top Marcas em formato de Ranking) */}
          <div className="bg-bg-primary border border-border shadow-card rounded-xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-divider flex justify-between items-center bg-gradient-to-r from-bg-secondary to-bg-primary">
              <h3 className="font-bold text-text-primary text-sm uppercase tracking-wider flex items-center gap-2">
                <Trophy size={18} className="text-brand-500" />
                🏆 Top 10 Marcas - Faturamento Geral
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="bg-bg-secondary/30 text-[10px] text-text-muted uppercase font-bold tracking-wider">
                    <th className="px-5 py-3 w-16 text-center">POS</th>
                    <th className="px-5 py-3">MARCA</th>
                    <th className="px-5 py-3 text-right">VOLUME</th>
                    <th className="px-5 py-3 text-right">RECEita</th>
                    <th className="px-5 py-3 text-center">TENDÊNCIA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-divider/30 text-xs">
                  {topBrands.map((brand: any, idx: number) => {
                    const isTop3 = brand.rank <= 3;
                    const isSelected = selectedBrand && brand.name === selectedBrand;
                    return (
                      <tr key={idx} className={`hover:bg-bg-secondary/50 transition-colors ${isTop3 ? 'bg-brand-500/5' : ''} ${isSelected ? 'bg-brand-500/20 border-l-4 border-brand-500' : ''}`}>
                        <td className="px-5 py-3 text-center">
                          {brand.rank === 1 && <span className="text-xl" title="Ouro">🥇</span>}
                          {brand.rank === 2 && <span className="text-xl" title="Prata">🥈</span>}
                          {brand.rank === 3 && <span className="text-xl" title="Bronze">🥉</span>}
                          {brand.rank > 3 && <span className="font-bold text-text-muted">{brand.rank}º</span>}
                        </td>
                        <td className="px-5 py-3 font-bold text-text-primary">{brand.name}</td>
                        <td className="px-5 py-3 text-right font-medium text-text-secondary">{brand.volume} un.</td>
                        <td className="px-5 py-3 text-right font-bold text-brand-500">{formatBRL(brand.receita)}</td>
                        <td className="px-5 py-3 text-center">
                          <TrendingUp size={16} className={isTop3 ? "text-success mx-auto" : "text-text-muted mx-auto"} />
                        </td>
                      </tr>
                    );
                  })}
                  {topBrands.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-text-muted">Nenhuma marca encontrada no período.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 2. Análise da Marca Selecionada */}
            <div className="bg-bg-primary border border-border shadow-card rounded-xl overflow-hidden flex flex-col">
              <div className="p-4 border-b border-divider bg-bg-secondary/30">
                <h3 className="font-bold text-text-primary text-sm flex items-center gap-2">
                  <Target size={16} className="text-brand-500" /> 🎯 Análise de Desempenho
                </h3>
              </div>
              <div className="p-5 flex-1 flex flex-col justify-center space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-brand-500/10 rounded-full flex items-center justify-center text-brand-500 font-bold text-xl">
                    {selectedBrand ? selectedBrand.charAt(0) : '*'}
                  </div>
                  <div>
                    <h4 className="font-bold text-text-primary">{selectedBrand || 'Portfólio Geral (Todas as Marcas)'}</h4>
                    <p className="text-xs text-text-secondary">Visão consolidada de vendas e penetração</p>
                  </div>
                </div>
                
                <p className="text-sm text-text-secondary leading-relaxed">
                  A seleção atual gerou <strong className="text-text-primary">{formatBRL(overview.receita)}</strong> em faturamento.
                  O produto destaque <strong>{topProducts[0]?.name}</strong> representa uma fatia considerável das vendas ({topProducts[0]?.volume} un.).
                </p>

                {topProducts.length > 0 ? (
                  <div className="bg-success/5 border border-success/20 rounded-lg p-4">
                    <h4 className="font-bold text-success text-sm mb-1 flex items-center gap-1">
                      <span>🎉</span> Excelente Posicionamento
                    </h4>
                    <p className="text-xs text-text-secondary">A marca apresenta uma ótima aceitação no mix de produtos. Os volumes de vendas dos top produtos demonstram forte aderência do cliente final.</p>
                  </div>
                ) : (
                  <div className="bg-warning/5 border border-warning/20 rounded-lg p-4">
                    <h4 className="font-bold text-warning text-sm mb-1 flex items-center gap-1">
                      <AlertCircle size={14} /> Atenção Necessária
                    </h4>
                    <p className="text-xs text-text-secondary">Não há volume de vendas significativo registrado para esta seleção no período. Revise as políticas comerciais ou faça campanhas de reativação.</p>
                  </div>
                )}
              </div>
            </div>

            {/* 3. Insights de Negociação */}
            <div className="bg-bg-primary border border-border shadow-card rounded-xl overflow-hidden flex flex-col">
               <div className="p-4 border-b border-divider bg-bg-secondary/30">
                <h3 className="font-bold text-text-primary text-sm flex items-center gap-2">
                  <ShieldCheck size={16} className="text-warning" /> 💡 Insights de Negociação (IA)
                </h3>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex gap-3 items-start">
                  <div className="bg-brand-500/10 text-brand-500 p-2 rounded-full mt-0.5"><TrendingUp size={16} /></div>
                  <div>
                    <h4 className="text-sm font-bold text-text-primary mb-1">Ação de Expansão (Cross-Sell)</h4>
                    <p className="text-xs text-text-secondary">
                      Aproveite a tração de vendas do produto <strong>{topProducts[0]?.name || 'líder'}</strong> para oferecer itens de marcas correlatas com margens maiores no momento do fechamento do pedido.
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-3 items-start">
                  <div className="bg-success/10 text-success p-2 rounded-full mt-0.5"><Target size={16} /></div>
                  <div>
                    <h4 className="text-sm font-bold text-text-primary mb-1">Campanha de Incentivo à Equipe</h4>
                    <p className="text-xs text-text-secondary">
                      Ofereça SPIFF (bônus imediato) para os vendedores que incluírem os itens do Top 5 deste ranking nos próximos 30 dias para pulverizar ainda mais as vendas.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {activeTab === 'Análise de Estoque' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 p-2.5 rounded-xl"><Box size={20} /></div>
            <div>
              <h3 className="font-extrabold text-text-primary text-base">Diagnóstico Financeiro do Inventário</h3>
              <p className="text-xs text-text-secondary">Visão quantitativa e custos de capital investido</p>
            </div>
          </div>

          {/* 1. Resumo Financeiro */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 hover:border-danger/40 transition-colors">
              <div className="flex items-center gap-2 text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">
                <DollarSign size={14} className="text-danger" /> Custo Total em Estoque
              </div>
              <div className="text-2xl font-extrabold text-text-primary mb-1 font-mono">{formatBRL(stockKpis.custo_total)}</div>
              <div className="text-[10px] text-text-secondary font-semibold">Capital imobilizado</div>
            </div>
            
            <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 hover:border-success/40 transition-colors">
              <div className="flex items-center gap-2 text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">
                <DollarSign size={14} className="text-success" /> Preço Venda Total
              </div>
              <div className="text-2xl font-extrabold text-text-primary mb-1 font-mono">{formatBRL(stockKpis.venda_total)}</div>
              <div className="text-[10px] text-text-secondary font-semibold">Valor potencial de venda</div>
            </div>
            
            <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 hover:border-brand-500/40 transition-colors">
              <div className="flex items-center gap-2 text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">
                <Box size={14} className="text-brand-500" /> Volume Total Físico
              </div>
              <div className="text-2xl font-extrabold text-text-primary mb-1 font-mono">
                {formatNum(stockKpis.volume_total)} un.
              </div>
              <div className="text-[10px] text-text-secondary font-semibold">Quantidade total em estoque</div>
            </div>

            <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 border-l-4 border-l-emerald-500 hover:shadow-md transition-all">
              <div className="flex items-center gap-2 text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">
                <Target size={14} className="text-emerald-500" /> Margem Média
              </div>
              <div className="text-2xl font-extrabold text-emerald-500 mb-1 font-mono">{stockMargem.toFixed(1)}%</div>
              <div className="text-[10px] text-text-secondary font-semibold">Ganho médio planejado</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 2. Análise de Rentabilidade */}
            <div className="bg-bg-primary border border-border shadow-card rounded-xl overflow-hidden flex flex-col hover:shadow-md transition-shadow">
              <div className="p-4 border-b border-divider bg-bg-secondary/20">
                <h3 className="font-bold text-text-primary text-xs uppercase tracking-wider flex items-center gap-2">
                  <Activity size={15} className="text-success" /> Análise de Rentabilidade
                </h3>
              </div>
              <div className="p-5 flex-1 flex flex-col justify-center space-y-4">
                <p className="text-sm text-text-secondary leading-relaxed">
                  Com base no custo total de <strong className="text-text-primary font-mono">{formatBRL(stockKpis.custo_total)}</strong> e no valor potencial de venda de <strong className="text-text-primary font-mono">{formatBRL(stockKpis.venda_total)}</strong>, a operação projeta uma Margem Bruta de <strong className="text-success font-mono">{stockMargem.toFixed(1)}%</strong>.
                </p>
                <div className="bg-success/5 border border-success/15 rounded-lg p-4">
                  <h4 className="font-bold text-success text-xs uppercase tracking-wider mb-1">Veredito do Sistema</h4>
                  <p className="text-xs text-text-secondary leading-relaxed">A margem do fornecedor apresenta rentabilidade saudável e margem positiva. Foco em ações de giro para evitar envelhecimento de estoque.</p>
                </div>
              </div>
            </div>

            {/* 3. Alertas e recomendações */}
            <div className="bg-bg-primary border border-border shadow-card rounded-xl overflow-hidden flex flex-col hover:shadow-md transition-shadow">
              <div className="p-4 border-b border-divider bg-bg-secondary/20">
                <h3 className="font-bold text-text-primary text-xs tracking-wider flex items-center gap-2">
                  <ShieldAlert size={15} className="text-warning" /> Alertas e Insights
                </h3>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex gap-3 items-start bg-danger/5 border border-danger/10 p-3.5 rounded-xl">
                  <div className="bg-danger/10 text-danger p-2 rounded-lg shrink-0"><AlertCircle size={16} /></div>
                  <div>
                    <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-1">Risco de Capital Imobilizado</h4>
                    <p className="text-[11px] text-text-secondary leading-relaxed">
                      O fornecedor possui <strong className="text-danger font-mono">{formatBRL(stockKpis.custo_total)}</strong> imobilizados em estoque. Foco em produtos curva C que tenham baixo giro para otimização de caixa.
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-3 items-start bg-warning/5 border border-warning/10 p-3.5 rounded-xl">
                  <div className="bg-warning/10 text-warning p-2 rounded-lg shrink-0"><TrendingUp size={16} /></div>
                  <div>
                    <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-1">Ações Sugeridas: Negociação de Giro</h4>
                    <p className="text-[11px] text-text-secondary leading-relaxed">
                      Realizar ações promocionais ou prazos especiais para desovar itens sem giro.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Rastreamento de Estoque */}
          <div className="bg-bg-primary border border-border shadow-card rounded-xl overflow-hidden flex flex-col mt-6">
            <div className="p-4 border-b border-divider flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-bg-secondary/30">
              <h3 className="font-bold text-text-primary text-sm uppercase tracking-wider flex items-center gap-2">
                <Box size={16} className="text-brand-500" />
                Rastreamento de Estoque
              </h3>
              
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 bg-bg-primary border border-border rounded-lg px-3 py-1.5 shadow-sm min-w-[220px]">
                  <Search size={14} className="text-text-muted shrink-0" />
                  <input 
                    type="text" 
                    placeholder="Buscar produto por nome ou cod..."
                    value={stockSearch}
                    onChange={(e) => setStockSearch(e.target.value)}
                    className="bg-transparent text-xs text-text-primary placeholder-text-muted outline-none w-full"
                  />
                  {stockSearch && (
                    <button onClick={() => setStockSearch('')} className="text-text-muted hover:text-text-primary cursor-pointer">
                      <X size={14} />
                    </button>
                  )}
                </div>
                
                <select 
                  value={stockSort}
                  onChange={(e) => setStockSort(e.target.value)}
                  className="bg-bg-primary border border-border rounded-lg px-3 py-1.5 text-xs text-text-primary outline-none cursor-pointer"
                >
                  <option value="alto">Ordenar por: Estoque (Alto)</option>
                  <option value="baixo">Ordenar por: Estoque (Baixo)</option>
                  <option value="custo">Ordenar por: Valor de Custo (Alto)</option>
                </select>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead>
                  <tr className="bg-bg-secondary/30 text-[10px] text-text-muted uppercase font-bold tracking-wider border-b border-divider">
                    <th className="px-2 py-2">CÓDIGO</th>
                    <th className="px-2 py-2">PRODUTO</th>
                    <th className="px-2 py-2 text-center">UN.</th>
                    <th className="px-2 py-2">MARCA</th>
                    <th className="px-2 py-2 text-right">ESTOQUE</th>
                    <th className="px-2 py-2 text-right">CUSTO UN.</th>
                    <th className="px-2 py-2 text-right">PREÇO UNIT.</th>
                    <th className="px-2 py-2 text-right">VALOR TOTAL</th>
                    <th className="px-2 py-2 text-center">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-divider/30 text-[11px]">
                  {filteredInventory.map((item, idx) => (
                    <tr key={idx} className="hover:bg-bg-secondary/50 transition-colors">
                      <td className="px-2 py-2 font-mono font-semibold text-text-secondary text-left">{item.cod}</td>
                      <td className="px-2 py-2 font-bold text-text-primary truncate max-w-[200px]" title={item.desc}>
                        <div className="flex items-center justify-between w-full">
                          <span className="truncate">{item.desc}</span>
                          <button 
                            onClick={() => setSelectedProductCode(item.cod)}
                            className="text-brand-500 hover:text-brand-600 transition-colors p-0.5 rounded hover:bg-brand-500/10 cursor-pointer flex-shrink-0 ml-1.5"
                            title="Ver Raio-X de vendas"
                          >
                            <Search size={13} />
                          </button>
                        </div>
                      </td>
                      <td className="px-2 py-2 text-center text-text-secondary">{item.un}</td>
                      <td className="px-2 py-2 text-text-secondary">{item.marca}</td>
                      <td className="px-2 py-2 text-right font-bold text-text-primary font-mono">{formatNum(item.estoque)}</td>
                      <td className="px-2 py-2 text-right font-mono text-text-secondary">{formatBRL(item.custo)}</td>
                      <td className="px-2 py-2 text-right font-mono text-text-secondary">{formatBRL(item.preco)}</td>
                      <td className="px-2 py-2 text-right font-mono font-bold text-text-primary">{formatBRL(item.valor_total)}</td>
                      <td className="px-2 py-2 text-center">
                        <span className={clsx(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border",
                          item.status === 'Ideal' && "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
                          item.status === 'Critico' && "bg-amber-500/10 text-amber-500 border-amber-500/20",
                          item.status === 'Ruptura' && "bg-red-500/10 text-red-500 border-red-500/20"
                        )}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredInventory.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-5 py-12 text-center text-text-secondary font-semibold">
                        Nenhum item em estoque para esta busca ou marca.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Catálogo' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-bg-primary border border-border shadow-card rounded-xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-divider flex justify-between items-center bg-gradient-to-r from-bg-secondary to-bg-primary">
              <h3 className="font-bold text-text-primary text-sm uppercase tracking-wider flex items-center gap-2">
                <ShoppingCart size={18} className="text-brand-500" />
                Catálogo Geral de Produtos
              </h3>
            </div>
            
            {/* Tabela — visível em sm+ */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead>
                  <tr className="bg-bg-secondary/30 text-[10px] text-text-muted uppercase font-bold tracking-wider border-b border-divider">
                    <th className="px-2 py-2 text-left">CÓDIGO</th>
                    <th className="px-2 py-2 text-left">DESCRIÇÃO</th>
                    <th className="px-2 py-2 text-right">PREÇO CUSTO (R$)</th>
                    <th className="px-2 py-2 text-right">PREÇO VENDA (R$)</th>
                    <th className="px-2 py-2 text-center">MARGEM (%)</th>
                    <th className="px-2 py-2 text-right">ESTOQUE ATUAL</th>
                    <th className="px-2 py-2 text-center">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-divider/30 text-[11px]">
                  {rawInventory.map((item: any, idx: number) => {
                    const preco = parseFloat(item.preco || 0);
                    const custo = parseFloat(item.custo || 0);
                    const margemLucro = preco > 0 ? ((preco - custo) / preco) * 100 : 0;
                    
                    let statusClass = 'text-danger bg-danger/10 border-danger/20';
                    let statusLabel = 'Crítico';
                    if (item.status === 'Ideal') {
                      statusClass = 'text-success bg-success/10 border-success/20';
                      statusLabel = 'Ideal';
                    } else if (item.status === 'Critico') {
                      statusClass = 'text-warning bg-warning/10 border-warning/20';
                      statusLabel = 'Crítico';
                    } else if (item.status === 'Ruptura') {
                      statusClass = 'text-danger bg-danger/10 border-danger/20';
                      statusLabel = 'Ruptura';
                    }

                    return (
                      <tr key={idx} className="hover:bg-bg-secondary/50 transition-colors">
                        <td className="px-2 py-2 font-mono font-semibold text-text-secondary text-left">{item.cod}</td>
                        <td className="px-2 py-2 font-bold text-text-primary text-left truncate max-w-[200px]" title={item.desc}>
                          <div className="flex items-center justify-between w-full">
                            <span className="truncate">{item.desc}</span>
                            <button 
                              onClick={() => setSelectedProductCode(item.cod)}
                              className="text-brand-500 hover:text-brand-600 transition-colors p-0.5 rounded hover:bg-brand-500/10 cursor-pointer flex-shrink-0 ml-1.5"
                              title="Ver Raio-X de vendas"
                            >
                              <Search size={13} />
                            </button>
                          </div>
                        </td>
                        <td className="px-2 py-2 text-right font-mono font-bold text-text-secondary">{formatBRL(custo)}</td>
                        <td className="px-2 py-2 text-right font-mono font-bold text-brand-500">{formatBRL(preco)}</td>
                        <td className="px-2 py-2 text-center font-mono font-bold text-success">{margemLucro.toFixed(1)}%</td>
                        <td className="px-2 py-2 text-right font-mono font-bold text-text-primary">{formatNum(item.estoque)} un.</td>
                        <td className="px-2 py-2 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${statusClass}`}>
                            {statusLabel}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {rawInventory.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-text-secondary font-semibold">
                        Nenhum produto cadastrado no catálogo deste fornecedor.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Cards mobile — visível apenas em xs */}
            <div className="sm:hidden flex flex-col divide-y divide-divider/30">
              {rawInventory.map((item: any, idx: number) => {
                const preco = parseFloat(item.preco || 0);
                const custo = parseFloat(item.custo || 0);
                const margemLucro = preco > 0 ? ((preco - custo) / preco) * 100 : 0;
                
                let statusClass = 'text-danger bg-danger/10 border-danger/20';
                if (item.status === 'Ideal') statusClass = 'text-success bg-success/10 border-success/20';
                else if (item.status === 'Critico') statusClass = 'text-warning bg-warning/10 border-warning/20';

                return (
                  <div key={idx} className="py-3 px-4 space-y-1.5">
                    <div className="flex justify-between items-center gap-2">
                      <div>
                        <span className="text-[10px] font-mono text-brand-500 font-bold">{item.cod}</span>
                        <p className="text-[11px] font-bold text-text-primary truncate max-w-[180px]">{item.desc}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${statusClass}`}>{item.status}</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-text-muted">
                      <span>Custo: <span className="font-mono text-text-secondary font-bold">{formatBRL(custo)}</span></span>
                      <span>Venda: <span className="font-mono text-brand-500 font-bold">{formatBRL(preco)}</span></span>
                      <span>Margem: <span className="font-mono text-success font-bold">{margemLucro.toFixed(1)}%</span></span>
                      <span>Estoque: <span className="font-mono text-text-primary font-bold">{formatNum(item.estoque)}</span></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 hover:shadow-md transition-shadow">
              <h4 className="font-bold text-text-primary text-sm flex items-center gap-2 mb-3">
                <Target size={16} className="text-success" /> Destaque de Rentabilidade
              </h4>
              <p className="text-xs text-text-secondary mb-2">Produto com melhor projeção de margem do catálogo.</p>
              {(() => {
                const items = [...rawInventory].sort((a, b) => {
                  const mA = a.preco > 0 ? ((a.preco - a.custo) / a.preco) : 0;
                  const mB = b.preco > 0 ? ((b.preco - b.custo) / b.preco) : 0;
                  return mB - mA;
                });
                const best = items[0];
                if (!best) return <div className="text-xs text-text-secondary">Nenhum produto disponível</div>;
                const margem = best.preco > 0 ? ((best.preco - best.custo) / best.preco) * 100 : 0;
                return (
                  <div className="bg-success/5 border border-success/15 rounded-lg p-3">
                    <div className="font-bold text-success text-sm truncate">{best.desc}</div>
                    <div className="text-xs text-success/80 mt-1">Margem Projetada: {margem.toFixed(1)}% • Código: {best.cod}</div>
                  </div>
                );
              })()}
            </div>
            
            <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 hover:shadow-md transition-shadow">
              <h4 className="font-bold text-text-primary text-sm flex items-center gap-2 mb-3">
                <Activity size={16} className="text-warning" /> Ação Recomendada
              </h4>
              <p className="text-xs text-text-secondary mb-2">Sugestão automática do sistema baseada no volume atual.</p>
              <div className="bg-warning/10 border border-warning/20 rounded-lg p-3">
                <div className="font-bold text-warning text-sm truncate">Campanha de Giro Rápido</div>
                <div className="text-xs text-warning/80 mt-1 font-semibold">Sugerido para produtos com status Ideal (Estoque Alto)</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product Detail Modal */}
      {selectedProductCode && (
        <ProductDetailModal
          codigo={selectedProductCode}
          onClose={() => setSelectedProductCode(null)}
        />
      )}
    </div>
  );
}

function ProductDetailModal({ codigo, onClose }: { codigo: string; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['bi', 'product-detail', codigo],
    queryFn: () => BIService.getProductDetail(codigo),
    enabled: !!codigo
  });

  const [activeSubTab, setActiveSubTab] = useState<'mensal' | 'diario' | 'clientes'>('mensal');

  if (isLoading || !data) {
    return (
      <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center backdrop-blur-sm">
        <div className="bg-bg-primary border border-border shadow-2xl rounded-2xl p-6 w-full max-w-md text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500 mx-auto mb-3"></div>
          <p className="text-sm text-text-secondary font-bold">Carregando Raio-X do Produto...</p>
        </div>
      </div>
    );
  }

  const { product, kpis, monthly_performance } = data;

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-bg-primary border border-border shadow-2xl rounded-2xl w-full max-w-4xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-4 py-3 border-b border-divider flex justify-between items-center bg-gradient-to-r from-bg-secondary to-bg-primary">
          <div>
            <span className="text-[9px] font-black uppercase tracking-wider text-brand-500">Raio-X de Vendas (Últimos 6 Meses)</span>
            <h3 className="font-extrabold text-text-primary text-sm mt-0.5">{product.desc}</h3>
          </div>
          <button onClick={onClose} className="p-1 text-text-muted hover:text-text-primary hover:bg-bg-secondary rounded-lg transition-colors cursor-pointer">
            <X size={16} />
          </button>
        </div>

        {/* Modal 2-Column Grid */}
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          
          {/* Left Column: Sales and Chart */}
          <div className="space-y-3 flex flex-col justify-between">
            {/* Top row: period selection & KPI cards */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-text-secondary">PERÍODO:</span>
                  <select aria-label="Selecionar Período" className="bg-bg-secondary border border-border rounded px-2 py-0.5 text-[10px] text-text-primary outline-none focus:border-brand-500 cursor-pointer font-bold">
                    <option value="tudo">Tudo (6 meses)</option>
                  </select>
                </div>
              </div>

              {/* KPIs (4 cards in a 2x2 grid) */}
              <div className="grid grid-cols-4 gap-2">
                <div className="bg-bg-secondary/40 border border-border/50 rounded-lg p-2 flex flex-col text-center">
                  <span className="text-[8px] font-bold text-text-muted uppercase">Faturamento</span>
                  <span className="text-[11px] font-extrabold text-text-primary mt-0.5 font-mono">{formatBRL(kpis.faturamento)}</span>
                </div>
                <div className="bg-bg-secondary/40 border border-border/50 rounded-lg p-2 flex flex-col text-center">
                  <span className="text-[8px] font-bold text-text-muted uppercase">Qtd Vendida</span>
                  <span className="text-[11px] font-extrabold text-text-primary mt-0.5 font-mono">{formatNum(kpis.qtd_vendida)} un.</span>
                </div>
                <div className="bg-bg-secondary/40 border border-border/50 rounded-lg p-2 flex flex-col text-center">
                  <span className="text-[8px] font-bold text-text-muted uppercase">% Marca</span>
                  <span className="text-[11px] font-extrabold text-success mt-0.5 font-mono">{kpis.pct_marca.toFixed(1)}%</span>
                </div>
                <div className="bg-bg-secondary/40 border border-border/50 rounded-lg p-2 flex flex-col text-center">
                  <span className="text-[8px] font-bold text-text-muted uppercase">Preço Unit.</span>
                  <span className="text-[11px] font-extrabold text-text-primary mt-0.5 font-mono">{formatBRL(kpis.preco_unit)}</span>
                </div>
              </div>
            </div>

            {/* Evolution Chart Area */}
            <div className="border border-border/50 rounded-xl p-3 space-y-2 flex-1 flex flex-col justify-between">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-black uppercase tracking-wider text-text-secondary/70">Evolução Mensal</span>
                
                {/* Mini Tabs */}
                <div className="flex bg-bg-secondary p-0.5 rounded border border-border/40">
                  {(['mensal', 'diario', 'clientes'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveSubTab(tab)}
                      className={clsx(
                        "px-2 py-0.5 rounded text-[9px] font-bold capitalize transition-all cursor-pointer",
                        activeSubTab === tab ? "bg-bg-primary text-text-primary shadow-sm" : "text-text-secondary hover:text-text-primary"
                      )}
                    >
                      {tab === 'diario' ? 'Diário' : tab}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chart container */}
              <div className="h-32 w-full mt-2">
                {activeSubTab === 'mensal' ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={monthly_performance} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                      <XAxis dataKey="mes" stroke="#94a3b8" fontSize={8} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={8} tickLine={false} axisLine={false} tickFormatter={formatBRLCompact} />
                      <Tooltip 
                        formatter={(val: any) => [formatBRL(val), 'Faturamento']}
                        contentStyle={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', borderRadius: '6px', fontSize: '10px' }}
                      />
                      <Bar dataKey="valor" fill="#3B82F6" radius={[3, 3, 0, 0]} maxBarSize={20} />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-[10px] text-text-secondary font-semibold italic bg-bg-secondary/15 rounded border border-dashed border-border/40">
                    Detalhamento {activeSubTab} indisponível.
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Right Column: Inventory Projections and Details */}
          <div className="space-y-3 flex flex-col justify-between">
            {/* Projeção de Estoque Section */}
            <div className="border border-border/50 rounded-xl p-3 space-y-3">
              <span className="text-[9px] font-black uppercase tracking-wider text-text-secondary/70 block">Valores & Projeção do Estoque Atual</span>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col bg-bg-secondary/20 p-2 rounded-lg border border-border/30">
                  <span className="text-[9px] font-medium text-text-secondary/60">Custo Unitário</span>
                  <span className="text-[11px] font-bold text-text-primary font-mono mt-0.5">{formatBRL(product.custo)}</span>
                </div>
                <div className="flex flex-col bg-bg-secondary/20 p-2 rounded-lg border border-border/30">
                  <span className="text-[9px] font-medium text-text-secondary/60">Preço de Venda</span>
                  <span className="text-[11px] font-bold text-brand-500 font-mono mt-0.5">{formatBRL(product.preco)}</span>
                </div>
              </div>

              <div className="border-t border-divider/60 pt-2 grid grid-cols-3 gap-2">
                <div className="flex flex-col text-center">
                  <span className="text-[8px] font-bold text-text-secondary/60 uppercase">Custo Total</span>
                  <span className="text-[10px] font-black text-text-primary font-mono mt-0.5">{formatBRL(product.estoque * product.custo)}</span>
                </div>
                <div className="flex flex-col text-center">
                  <span className="text-[8px] font-bold text-text-secondary/60 uppercase">Venda Total</span>
                  <span className="text-[10px] font-black text-brand-500 font-mono mt-0.5">{formatBRL(product.estoque * product.preco)}</span>
                </div>
                <div className="flex flex-col text-center">
                  <span className="text-[8px] font-bold text-success/80 uppercase">Lucro Proj.</span>
                  <span className="text-[10px] font-black text-success font-mono mt-0.5">{formatBRL((product.estoque * product.preco) - (product.estoque * product.custo))}</span>
                </div>
              </div>
            </div>

            {/* Group and Brand Details */}
            <div className="bg-bg-secondary/30 border border-border/40 rounded-xl p-3 text-[11px] font-semibold space-y-2 flex-1 flex flex-col justify-center">
              <div className="flex justify-between items-center border-b border-divider/40 pb-1.5">
                <span className="text-text-secondary font-medium">Categoria / Grupo:</span>
                <span className="text-text-primary font-bold">{product.categoria}</span>
              </div>
              <div className="flex justify-between items-center border-b border-divider/40 pb-1.5">
                <span className="text-text-secondary font-medium">Marca / Fornecedor:</span>
                <span className="text-text-primary font-bold">{product.marca}</span>
              </div>
              <div className="flex justify-between items-center pt-0.5">
                <span className="text-text-secondary font-medium">Estoque Físico Atual:</span>
                <span className="text-text-primary font-bold font-mono text-xs">{formatNum(product.estoque)} un.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
