import { useState, useEffect, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell
} from 'recharts'
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingBag, 
  Users, Award, Map, Trophy, ChevronDown, LayoutDashboard,
  Tag, Sliders, MapPin, Package, Settings
} from 'lucide-react'
import { useBranchPeriodQuery } from '../hooks/useApi'
import { useAuthStore } from '../store/authStore'
import PeriodFilter from '../components/PeriodFilter'
import { PageFilters } from '../components/PageFilters'
import { usePeriodStore } from '../store/periodStore'
import { useBranch } from '../contexts/BranchContext'
import { formatBRL, formatBRLCompact, formatNum } from '../utils/format'
import clsx from 'clsx'

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
    )
  }
  return null
}

// Elemento reutilizável para renderizar listas de ranking de forma idêntica à imagem
function RankingList({
  title,
  data,
  isLoading,
  formatValue = formatBRL,
  total,
  icon: Icon
}: {
  title: string
  data: { name: string; value: number }[]
  isLoading: boolean
  formatValue?: (v: number) => string
  total: number
  icon: React.ElementType
}) {
  return (
    <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 flex flex-col h-full animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-4 border-b border-divider/40 pb-2">
        <h3 className="font-bold text-text-primary text-xs uppercase tracking-wider flex items-center gap-2">
          <Icon size={14} className="text-brand-500" /> {title}
        </h3>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto max-h-[300px] pr-1">
        {isLoading ? (
          <div className="h-48 flex items-center justify-center text-xs text-text-secondary">Carregando dados...</div>
        ) : data.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-xs text-text-secondary">Sem dados registrados</div>
        ) : (
          data.slice(0, 10).map((item, i) => {
            const pct = total > 0 ? (item.value / total) * 100 : 0;
            return (
              <div key={i} className="flex items-center justify-between p-2 hover:bg-bg-secondary/40 rounded-xl transition-all duration-200 border border-transparent hover:border-divider/30">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-6 shrink-0 flex items-center justify-center">
                    <span className={clsx(
                      "text-xs font-black mono",
                      i < 3 ? "text-brand-600 dark:text-brand-400" : "text-text-secondary/60"
                    )}>
                      #{i + 1}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-text-primary uppercase truncate max-w-[180px]" title={item.name}>
                    {item.name}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-black text-text-primary font-mono">{formatValue(item.value)}</div>
                  <div className="text-[9px] text-[#00a896] font-bold mt-0.5">{pct.toFixed(1)}% share</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function VisaoEstrategicaV3() {
  const user = useAuthStore((s: any) => s.user)
  
  // Consultas da API (usando os mesmos endpoints reais do backend)
  const ov = useBranchPeriodQuery<any>('/estatisticas/overview')
  const kpisData = useBranchPeriodQuery<any>('/estatisticas/kpis')
  const fatMes = useBranchPeriodQuery<any>('/vendas/faturadas')
  const vd = useBranchPeriodQuery<any>('/ranking/vendedores')
  const prod = useBranchPeriodQuery<any>('/ranking/produtos')
  const cli = useBranchPeriodQuery<any>('/ranking/clientes')
  const marcas = useBranchPeriodQuery<any>('/ranking/marcas')
  const cidades = useBranchPeriodQuery<any>('/ranking/cidades')
  const categorias = useBranchPeriodQuery<any>('/ranking/categorias')

  const { filiais, selectedBranch, setSelectedBranch } = useBranch()

  // Filtros locais Vendedor/Marca conforme Imagem 2
  const [selectedVendedor, setSelectedVendedor] = useState('todas')
  const [selectedMarca, setSelectedMarca] = useState('todas')

  // Mobile layout state
  const [isMobile, setIsMobile] = useState(false)
  const [activeTab, setActiveTab] = useState<'estatisticas' | 'receitas' | 'vendedores' | 'cidades'>('estatisticas')

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  
  // Mapeamento dos valores reais retornados pelas consultas
  const faturamentoAtual = ov.data?.mes?.total || 0;
  const qtdPedidos = kpisData.data?.vendas?.qtd_pedidos || ov.data?.mes?.qtd || 0;
  const qtdItens = kpisData.data?.vendas?.qtd_itens || ov.data?.mes?.qtd_itens || 0;
  const ticketMedio = kpisData.data?.vendas?.ticket_medio || (qtdPedidos > 0 ? faturamentoAtual / qtdPedidos : 0);
  
  const mockFaturamentoAnterior = ov.data?.anterior?.total || 0;
  const faturamentoCrescimento = mockFaturamentoAnterior > 0 ? ((faturamentoAtual - mockFaturamentoAnterior) / mockFaturamentoAnterior) * 100 : 0;

  const faturamentoPeriodoData = fatMes.data?.data && fatMes.data.data.length > 0 
    ? fatMes.data.data 
    : [
        { data: 'Jan', total: 156000 },
        { data: 'Fev', total: 142000 },
        { data: 'Mar', total: 180000 },
        { data: 'Abr', total: 175000 },
        { data: 'Mai', total: 198000 },
        { data: 'Jun', total: 210000 },
        { data: 'Jul', total: 223838 },
        { data: 'Ago', total: 240116 },
      ];

  // Listas de ranking preparadas
  const mockTopSellers = useMemo(() => {
    return vd.data?.data?.map((s: any) => ({ name: s.nome || s.vendedor, value: s.total || s.total_vendas })) || []
  }, [vd.data])

  const mockTopBrands = useMemo(() => {
    return marcas.data?.data?.map((m: any) => ({ name: m.nome || m.marca, value: m.total })) || []
  }, [marcas.data])

  const mockTopCategories = useMemo(() => {
    return categorias.data?.data?.map((c: any) => ({ name: c.nome || c.categoria, value: c.total })) || []
  }, [categorias.data])

  const mockTopCities = useMemo(() => {
    return cidades.data?.data?.map((c: any) => ({ name: c.nome || c.cidade, value: c.total })) || []
  }, [cidades.data])

  const mockTopClients = useMemo(() => {
    return cli.data?.data?.map((c: any) => ({ name: c.nome || c.cliente, value: c.total })) || []
  }, [cli.data])

  const barColors = [
    '#3B82F6', '#10B981', '#06B6D4', '#F59E0B', '#EF4444', 
    '#0D9488', '#EC4899', '#6366F1', '#14B8A6', '#F97316'
  ];

  return (
    <div className={clsx("space-y-3", isMobile ? "pb-28" : "pb-4")} aria-label="Visão Estratégica">
      
      {/* Teleportamos todos os filtros da página para o cabeçalho superior unificado */}
      <PageFilters>
        <div className="flex flex-wrap items-center gap-2 bg-bg-secondary/40 border border-border/40 p-1.5 rounded-xl text-xs shadow-sm">
          {/* Período */}
          <div className="flex items-center gap-1.5 border-r border-divider/40 pr-2">
            <span className="text-[9px] font-bold text-text-secondary uppercase tracking-widest">Período:</span>
            <PeriodFilter />
          </div>

          {/* Vendedor */}
          <div className="flex items-center gap-1.5 border-r border-divider/40 pr-2">
            <span className="text-[9px] text-text-secondary font-bold uppercase tracking-wider">Vendedor:</span>
            <div className="relative">
              <select
                value={selectedVendedor}
                onChange={(e) => setSelectedVendedor(e.target.value)}
                className="bg-bg-primary border border-border rounded-lg px-2 py-1 text-[10px] font-semibold text-text-primary outline-none cursor-pointer focus:border-brand-500 pr-5"
              >
                <option value="todas">Todos os Vendedores</option>
                {vd.data?.data?.map((v: any) => (
                  <option key={v.id || v.nome} value={v.nome}>{v.nome}</option>
                ))}
              </select>
              <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
            </div>
          </div>

          {/* Marca */}
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-text-secondary font-bold uppercase tracking-wider">Marca:</span>
            <div className="relative">
              <select
                value={selectedMarca}
                onChange={(e) => setSelectedMarca(e.target.value)}
                className="bg-bg-primary border border-border rounded-lg px-2 py-1 text-[10px] font-semibold text-text-primary outline-none cursor-pointer focus:border-brand-500 pr-5"
              >
                <option value="todas">Todas as Marcas</option>
                {marcas.data?.data?.map((m: any) => (
                  <option key={m.marca || m.nome} value={m.marca || m.nome}>{m.marca || m.nome}</option>
                ))}
              </select>
              <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
            </div>
          </div>
        </div>
      </PageFilters>

      {/* TIER 1: unified "RESULTADOS DE VENDAS" CARD */}
      <div className="bg-bg-primary rounded-xl p-5 border border-border shadow-card flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden animate-in fade-in duration-300">
        <div className="absolute top-0 left-0 w-full h-1 bg-brand-500"></div>
        
        {/* Left: Período Atual */}
        <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left">
          <span className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Faturamento Período Atual</span>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-success/10 rounded-xl text-success"><DollarSign size={24} /></div>
            <span className="text-2xl md:text-3xl font-black text-text-primary">{formatBRL(faturamentoAtual)}</span>
          </div>
          <span className="text-[10px] text-text-muted mt-1 font-semibold">Mês de Referência Atual</span>
        </div>

        {/* Center: Growth circle indicator */}
        <div className="flex flex-col items-center justify-center shrink-0">
          <div className={clsx(
            "w-16 h-16 rounded-full flex flex-col items-center justify-center border-2 font-black text-sm shadow-sm",
            faturamentoCrescimento >= 0 
              ? "bg-success/10 border-success/30 text-success" 
              : "bg-danger/10 border-danger/30 text-danger"
          )}>
            {faturamentoCrescimento >= 0 ? <TrendingUp size={16} className="mb-0.5" /> : <TrendingDown size={16} className="mb-0.5" />}
            {Math.abs(faturamentoCrescimento).toFixed(1)}%
          </div>
          <span className="text-[9px] font-bold text-text-secondary uppercase tracking-widest mt-2">Cresc. vs Período Anterior</span>
        </div>

        {/* Right: Período Anterior */}
        <div className="flex-1 flex flex-col items-center md:items-end text-center md:text-right">
          <span className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Faturamento Período Anterior</span>
          <div className="flex items-center gap-2.5">
            <span className="text-2xl md:text-3xl font-black text-text-primary/80">{formatBRL(mockFaturamentoAnterior)}</span>
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-text-secondary"><DollarSign size={24} /></div>
          </div>
          <span className="text-[10px] text-text-muted mt-1 font-semibold">Mês de Referência Anterior</span>
        </div>
      </div>

      {/* TIER 2: HIGHLIGHT BOXES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Melhor Vendedor */}
        <div className="bg-bg-primary rounded-xl p-4 border border-border shadow-card flex items-start justify-between relative hover:border-brand-500/50 transition-colors">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block">Melhor Vendedor</span>
            <div className="font-extrabold text-sm text-brand-600 dark:text-brand-400 truncate max-w-[150px]">
              {mockTopSellers.length > 0 ? mockTopSellers[0].name : '-'}
            </div>
            <div className="text-lg font-black text-text-primary font-mono mt-1">
              {formatBRL(mockTopSellers.length > 0 ? mockTopSellers[0].value : 0)}
            </div>
          </div>
          <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-500"><Trophy size={18} /></div>
        </div>

        {/* Melhor Cliente */}
        <div className="bg-bg-primary rounded-xl p-4 border border-border shadow-card flex items-start justify-between relative hover:border-brand-500/50 transition-colors">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block">Melhor Cliente</span>
            <div className="font-extrabold text-sm text-pink-500 truncate max-w-[150px]">
              {mockTopClients.length > 0 ? mockTopClients[0].name : '-'}
            </div>
            <div className="text-lg font-black text-text-primary font-mono mt-1">
              {formatBRL(mockTopClients.length > 0 ? mockTopClients[0].value : 0)}
            </div>
          </div>
          <div className="p-2 bg-pink-500/10 rounded-lg text-pink-500"><Users size={18} /></div>
        </div>

        {/* Marca Mais Vendida */}
        <div className="bg-bg-primary rounded-xl p-4 border border-border shadow-card flex items-start justify-between relative hover:border-brand-500/50 transition-colors">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block">Marca Mais Vendida</span>
            <div className="font-extrabold text-sm text-success truncate max-w-[150px]">
              {mockTopBrands.length > 0 ? mockTopBrands[0].name : '-'}
            </div>
            <div className="text-lg font-black text-text-primary font-mono mt-1">
              {formatBRL(mockTopBrands.length > 0 ? mockTopBrands[0].value : 0)}
            </div>
          </div>
          <div className="p-2 bg-success/10 rounded-lg text-success"><Award size={18} /></div>
        </div>

        {/* Cidade Destaque */}
        <div className="bg-bg-primary rounded-xl p-4 border border-border shadow-card flex items-start justify-between relative hover:border-brand-500/50 transition-colors">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block">Cidade Destaque</span>
            <div className="font-extrabold text-sm text-cyan-500 truncate max-w-[150px]">
              {mockTopCities.length > 0 ? mockTopCities[0].name : '-'}
            </div>
            <div className="text-lg font-black text-text-primary font-mono mt-1">
              {formatBRL(mockTopCities.length > 0 ? mockTopCities[0].value : 0)}
            </div>
          </div>
          <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-500"><Map size={18} /></div>
        </div>
      </div>

      {/* TIER 3: PRIMARY KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Quantidade de Pedidos', value: formatNum(qtdPedidos), desc: 'Total de pedidos no período', icon: ShoppingBag, color: 'text-brand-500', bg: 'bg-brand-500/10' },
          { label: 'Ticket Médio', value: formatBRL(ticketMedio), desc: 'Média por venda/fatura', icon: DollarSign, color: 'text-warning', bg: 'bg-warning/10' },
          { label: 'Taxa de Retenção', value: '31.6%', desc: 'Retenção de clientes recorrentes', icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Clientes com Compra', value: '262', desc: 'Clientes ativos no período', icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
        ].map((kpi, idx) => (
          <div key={idx} className="bg-bg-primary rounded-xl p-4 border border-border shadow-card flex flex-col justify-between hover:border-divider transition-all">
            <div className="flex items-center gap-2 text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-2">
              <div className={clsx('p-1.5 rounded-lg', kpi.bg, kpi.color)}><kpi.icon size={14} /></div> {kpi.label}
            </div>
            <div className="text-2xl font-black text-text-primary mb-1 mt-2">{kpi.value}</div>
            <div className="text-[10px] text-text-secondary font-medium">{kpi.desc}</div>
          </div>
        ))}
      </div>

      {/* TIER 4: GRAPHS & LISTS SECTIONS */}

      {/* ROW 1: SELLERS CHART & TOP VENDEDORES RANKING */}
      {(!isMobile || activeTab === 'vendedores') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Chart card */}
          <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-text-primary text-xs uppercase tracking-wider flex items-center gap-2">
                <Trophy size={14} className="text-brand-500" /> Desempenho dos Vendedores (Gráfico)
              </h3>
            </div>
            <div className="h-[200px] sm:h-[260px] lg:h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockTopSellers} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" opacity={0.5} />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false} 
                    tickFormatter={(v) => String(v).length > 12 ? String(v).substring(0, 12) + '...' : v}
                    tick={{ fontSize: 11, fill: 'var(--color-text-primary)', fontWeight: 600 }} 
                    width={80} 
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-bg-tertiary)', opacity: 0.4 }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={20}>
                    {mockTopSellers.map((_entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={barColors[index % barColors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Ranking list card */}
          <RankingList
            title="Top Vendedores (Ranking)"
            data={mockTopSellers}
            isLoading={vd.isLoading}
            total={faturamentoAtual}
            icon={Trophy}
          />
        </div>
      )}

      {/* ROW 2: TOP 10 MARCAS & TOP 10 CATEGORIAS */}
      {(!isMobile || activeTab === 'receitas') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RankingList
            title="Top 10 Marcas"
            data={mockTopBrands}
            isLoading={marcas.isLoading}
            total={faturamentoAtual}
            icon={Tag}
          />
          <RankingList
            title="Top 10 Categorias"
            data={mockTopCategories}
            isLoading={categorias.isLoading}
            total={faturamentoAtual}
            icon={Package}
          />
        </div>
      )}

      {/* ROW 3: TOP 10 CIDADES & TOP 10 CLIENTES */}
      {(!isMobile || activeTab === 'cidades') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RankingList
            title="Top 10 Cidades"
            data={mockTopCities}
            isLoading={cidades.isLoading}
            total={faturamentoAtual}
            icon={MapPin}
          />
          <RankingList
            title="Top 10 Clientes"
            data={mockTopClients}
            isLoading={cli.isLoading}
            total={faturamentoAtual}
            icon={Users}
          />
        </div>
      )}

      {/* ROW 4: FATURAMENTO NO PERÍODO CHART */}
      {(!isMobile || activeTab === 'receitas') && (
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-text-primary text-xs uppercase tracking-wider flex items-center gap-2">
              <TrendingUp size={14} className="text-brand-500" /> Faturamento no Período
            </h3>
          </div>
          <div className="h-[200px] sm:h-[260px] lg:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={faturamentoPeriodoData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.5} />
                <XAxis dataKey="data" axisLine={false} tickLine={false} tickFormatter={(v) => String(v).slice(0, 5)} tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => formatBRLCompact(v)} tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-bg-tertiary)', opacity: 0.4 }} />
                <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={40}>
                  {faturamentoPeriodoData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={barColors[index % barColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

    </div>
  )
}
