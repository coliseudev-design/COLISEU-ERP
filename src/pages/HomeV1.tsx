import { useMemo, useState, useEffect } from 'react'
import { useBranchPeriodQuery } from '../hooks/useApi'
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingBag,
  Calculator, Wallet, Trophy, Medal, ChevronRight, BarChart2,
  AlertTriangle, Crown, Target, Users, Tag, Box, ArrowUpRight,
  ChevronDown, Sliders, X, LayoutDashboard, MapPin
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LineChart, Line, PieChart, Pie
} from 'recharts'
import { formatBRL, formatBRLCompact, formatNum } from '../utils/format'
import { usePeriodStore, PERIOD_OPTIONS, type PeriodKey } from '../store/periodStore'
import PeriodFilter from '../components/PeriodFilter'
import clsx from 'clsx'

// ─── Sparkline Component ──────────────────────────────────────────────────────
function Sparkline({ data }: { data: number[] }) {
  if (!data || data.length === 0) return null
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const width = 120
  const height = 30
  const points = data.map((val, index) => {
    const x = (index / (data.length - 1)) * width
    const y = height - ((val - min) / range) * (height - 4) - 2
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const pathD = `M ${points.join(' L ')}`
  return (
    <svg className="overflow-visible shrink-0 opacity-60" width={width} height={height}>
      <path
        d={pathD}
        fill="none"
        stroke="#00a896"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const MEDAL_COLORS = ['#F59E0B', '#94A3B8', '#CD7C2F']
const MEDAL_LABELS = ['🥇', '🥈', '🥉']
const BAR_COLORS = [
  '#0066CC', '#10B981', '#F59E0B', '#EF4444',
  '#06B6D4', '#0891B2', '#EC4899', '#F97316',
  '#14B8A6', '#6366F1',
]

// ─── Tooltip ─────────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-bg-primary border border-border shadow-card-hover rounded-xl p-3 text-xs z-50">
      <p className="font-semibold text-text-secondary mb-1">{label}</p>
      {payload.map((e: any, i: number) => (
        <p key={i} className="font-bold text-text-primary">{formatBRL(e.value)}</p>
      ))}
    </div>
  )
}

// ─── Format helper for date range ───────────────────────────────────────────
const formatDateBRL = (dateStr: string) => {
  if (!dateStr) return ''
  const parts = dateStr.slice(0, 10).split('-')
  if (parts.length < 3) return dateStr
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

// Gauge Chart Component using PieChart for HomeV1
const GaugeChart = ({ realizado, meta }: { realizado: number, meta: number }) => {
  const atingimento = meta > 0 ? (realizado / meta) * 100 : 0
  const value = Math.min(atingimento, 100)
  const data = [
    { name: 'Atingido', value: value, color: '#00a896' },
    { name: 'Restante', value: 100 - value, color: '#f1f5f9' }
  ]
  
  return (
    <div className="w-full flex flex-col items-center">
      <div className="relative h-32 w-full mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="100%"
              startAngle={180}
              endAngle={0}
              innerRadius={60}
              outerRadius={80}
              paddingAngle={0}
              dataKey="value"
              stroke="none"
              cornerRadius={4}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
          <span className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">{atingimento.toFixed(1)}%</span>
        </div>
      </div>
      <div className="text-center mt-3">
        <div className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Realizado vs Meta</div>
        <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
          {formatBRLCompact(realizado)} / <span className="text-slate-400">{formatBRLCompact(meta)}</span>
        </div>
      </div>
    </div>
  )
}

export default function HomeV1() {
  const period = usePeriodStore((s) => s.period)
  const setPeriod = usePeriodStore((s) => s.setPeriod)
  const setCustomRange = usePeriodStore((s) => s.setCustomRange)
  const globalStartDate = usePeriodStore((s) => s.startDate)
  const globalEndDate = usePeriodStore((s) => s.endDate)

  // ─── Selector States ────────────────────────────────────────────────────────
  const [selectedVendedor, setSelectedVendedor] = useState('todas')
  const [selectedMarca, setSelectedMarca] = useState('todas')
  const [selectedCidade, setSelectedCidade] = useState('todas')

  // ─── Mobile Layout States ──────────────────────────────────────────────────
  const [isMobile, setIsMobile] = useState(false)
  const [activeTab, setActiveTab] = useState<'estatisticas' | 'receitas' | 'vendedores' | 'cidades'>('estatisticas')
  const [showFiltersSheet, setShowFiltersSheet] = useState(false)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // ─── Query Filters ──────────────────────────────────────────────────────────
  const queryParams = useMemo(() => {
    const p: Record<string, any> = {}
    if (selectedVendedor !== 'todas') {
      p.vendedor_id = selectedVendedor
    }
    return p
  }, [selectedVendedor])

  // ─── API Queries ────────────────────────────────────────────────────────────
  const ov = useBranchPeriodQuery<any>('/estatisticas/overview', queryParams)
  const kpisQuery = useBranchPeriodQuery<any>('/estatisticas/kpis', queryParams)
  const fatMes = useBranchPeriodQuery<any>('/vendas/faturadas', queryParams)
  const vd = useBranchPeriodQuery<any>('/ranking/vendedores', queryParams)
  const marcasQuery = useBranchPeriodQuery<any>('/ranking/marcas', queryParams)
  const cidadesQuery = useBranchPeriodQuery<any>('/ranking/cidades', queryParams)
  const clientesQuery = useBranchPeriodQuery<any>('/ranking/clientes', queryParams)
  const categoriasQuery = useBranchPeriodQuery<any>('/ranking/categorias', queryParams)

  // ─── Dropdown Lists Queries (Unfiltered to list options) ────────────────────
  const sellersDropdown = useBranchPeriodQuery<any>('/ranking/vendedores', { limit: 100 })
  const brandsDropdown = useBranchPeriodQuery<any>('/ranking/marcas', { limit: 100 })
  const citiesDropdown = useBranchPeriodQuery<any>('/ranking/cidades', { limit: 100 })

  // ─── Chart Toggle State ──────────────────────────────────────────────────────
  const [chartMode, setChartMode] = useState<'diario' | 'mensal' | 'anual'>('diario')
  const [selectedYearChart, setSelectedYearChart] = useState<string>('all')

  // ─── Calculations ───────────────────────────────────────────────────────────
  const totalPeriodo = ov.data?.mes?.total || 0
  const totalAnterior = ov.data?.anterior?.total || 0
  const qtdPeriodo = kpisQuery.data?.vendas?.qtd_pedidos || ov.data?.mes?.qtd || 0
  const qtdItens = kpisQuery.data?.vendas?.qtd_itens || ov.data?.mes?.qtd_itens || 0
  const ticketMedio = kpisQuery.data?.vendas?.ticket_medio || (qtdPeriodo > 0 ? totalPeriodo / qtdPeriodo : 0)
  const crescimentoPct = totalAnterior > 0 ? ((totalPeriodo - totalAnterior) / totalAnterior) * 100 : 0
  const taxaConversao = kpisQuery.data?.kpis?.taxa_conversao_pct || 0
  const clientesAtivos = kpisQuery.data?.kpis?.clientes_ativos || 0

  // ─── Derived Primary KPIs ───────────────────────────────────────────────────
  const melhorVendedor = vd.data?.data?.[0]
  const melhorCliente = clientesQuery.data?.data?.[0]
  const melhorMarca = marcasQuery.data?.data?.[0]
  const melhorCidade = cidadesQuery.data?.data?.[0]

  // Filter rankings local lists by Brand and City if selected
  const filteredTopSellers = useMemo(() => {
    let list = vd.data?.data || []
    return list.slice(0, 8)
  }, [vd.data])

  const top10Marcas = useMemo(() => {
    let list = marcasQuery.data?.data || []
    if (selectedMarca !== 'todas') {
      list = list.filter((m: any) => m.marca === selectedMarca || m.nome === selectedMarca)
    }
    return list.slice(0, 10)
  }, [marcasQuery.data, selectedMarca])

  const top10Grupos = useMemo(() => {
    let list = categoriasQuery.data?.data || []
    return list.slice(0, 10)
  }, [categoriasQuery.data])

  const top10Cidades = useMemo(() => {
    let list = cidadesQuery.data?.data || []
    if (selectedCidade !== 'todas') {
      list = list.filter((c: any) => c.nome === selectedCidade)
    }
    return list.slice(0, 10)
  }, [cidadesQuery.data, selectedCidade])

  const top10Clientes = useMemo(() => {
    let list = clientesQuery.data?.data || []
    return list.slice(0, 10)
  }, [clientesQuery.data])

  // ─── Chart Data ─────────────────────────────────────────────────────────────
  const rawDailyData = useMemo(() => {
    return fatMes.data?.data || []
  }, [fatMes.data])

  // Available years from chart data
  const availableChartYears = useMemo(() => {
    const years = new Set<string>()
    rawDailyData.forEach((d: any) => {
      if (d.data && d.data.length >= 4) years.add(d.data.substring(0, 4))
    })
    return Array.from(years).sort()
  }, [rawDailyData])

  const dailyChartData = useMemo(() => {
    if (selectedYearChart === 'all') return rawDailyData
    return rawDailyData.filter((d: any) => d.data && d.data.startsWith(selectedYearChart))
  }, [rawDailyData, selectedYearChart])

  const sparklineData = useMemo(() => {
    return dailyChartData.map((d: any) => d.total || 0).slice(-20)
  }, [dailyChartData])

  const monthlyChartData = useMemo(() => {
    const raw = selectedYearChart === 'all'
      ? rawDailyData
      : rawDailyData.filter((d: any) => d.data && d.data.startsWith(selectedYearChart))
    const groups: Record<string, number> = {}
    raw.forEach((d: any) => {
      if (!d.data) return
      const month = d.data.substring(0, 7) // "YYYY-MM"
      groups[month] = (groups[month] || 0) + (d.total || 0)
    })
    return Object.entries(groups)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, total]) => {
        const [y, m] = month.split('-')
        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
        const label = `${monthNames[parseInt(m) - 1]}/${y.substring(2)}`
        return { label, total }
      })
  }, [rawDailyData, selectedYearChart])

  const yearlyChartData = useMemo(() => {
    const groups: Record<string, number> = {}
    rawDailyData.forEach((d: any) => {
      if (!d.data) return
      const year = d.data.substring(0, 4) // "YYYY"
      groups[year] = (groups[year] || 0) + (d.total || 0)
    })
    return Object.entries(groups)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([year, total]) => ({ label: year, total }))
  }, [rawDailyData])

  return (
    <div className={clsx("space-y-4 pb-8", isMobile ? "pb-28" : "pb-8")} aria-label="Visão Estratégica Dashboard">

      {/* ── PERIOD FILTER ROW ────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        {/* Custom Period Button Group */}
        <div className="hidden md:flex items-center w-full">
          <PeriodFilter excludePeriods={['yesterday']} />
        </div>
      </div>

      {/* ── SELECTOR FILTERS ROW ─────────────────────────────────────────── */}
      <div className="hidden md:grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Vendedor Dropdown */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Vendedor</label>
          <div className="relative">
            <select
              value={selectedVendedor}
              onChange={(e) => setSelectedVendedor(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 dark:text-white outline-none appearance-none focus:border-[#00a896] transition-colors cursor-pointer"
            >
              <option value="todas">Todos os Vendedores</option>
              {sellersDropdown.data?.data?.map((s: any) => (
                <option key={s.id} value={s.id}>{s.nome}</option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Marca Dropdown */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Marca</label>
          <div className="relative">
            <select
              value={selectedMarca}
              onChange={(e) => setSelectedMarca(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 dark:text-white outline-none appearance-none focus:border-[#00a896] transition-colors cursor-pointer"
            >
              <option value="todas">Todas as Marcas</option>
              {brandsDropdown.data?.data?.map((b: any) => (
                <option key={b.nome} value={b.nome}>{b.nome}</option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Cidade Dropdown */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Cidade</label>
          <div className="relative">
            <select
              value={selectedCidade}
              onChange={(e) => setSelectedCidade(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 dark:text-white outline-none appearance-none focus:border-[#00a896] transition-colors cursor-pointer"
            >
              <option value="todas">Todas as Cidades</option>
              {citiesDropdown.data?.data?.map((c: any) => (
                <option key={c.nome} value={c.nome}>{c.nome}</option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ── HERO KPI: FATURAMENTO PRINCIPAL COMPARATIVO ──────────────────── */}
      {(!isMobile || activeTab === 'estatisticas') && (
        <>
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all duration-300 hover:shadow-md">
        {/* Left vertical border stripe */}
        <div className="absolute left-0 top-0 h-full w-1.5 bg-[#00a896] rounded-l-2xl" />

        {/* Current Period */}
        <div className="flex-1 pl-4 flex items-center gap-4">
          <div className="p-3.5 bg-emerald-50 rounded-2xl text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 shrink-0">
            <ShoppingBag size={24} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none block mb-1.5">
              Faturamento Período Atual
            </span>
            <div className="text-xl sm:text-2xl md:text-3xl font-black text-slate-800 dark:text-white mono leading-none">
              {ov.isLoading ? '...' : formatBRL(totalPeriodo)}
            </div>
            <div className="text-[10px] text-slate-400 font-bold tracking-wide mt-1.5">
              {kpisQuery.data?.period?.start ? `${formatDateBRL(kpisQuery.data.period.start)} a ${formatDateBRL(kpisQuery.data.period.end)}` : ''}
            </div>
          </div>
        </div>

        {/* Center Growth Comparison Badge */}
        <div className="shrink-0 flex flex-col items-center justify-center border-y md:border-y-0 md:border-x border-slate-100 py-4 md:py-0 md:px-10">
          <div className={clsx(
            "w-14 h-14 rounded-full flex flex-col items-center justify-center font-black text-xs border shadow-sm",
            crescimentoPct >= 0
              ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
              : 'bg-red-50 border-red-200 text-red-600'
          )}>
            {crescimentoPct >= 0 ? <TrendingUp size={14} className="mb-0.5" /> : <TrendingDown size={14} className="mb-0.5" />}
            {Math.abs(crescimentoPct).toFixed(1)}%
          </div>
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider text-center mt-2.5 block max-w-[120px] leading-tight">
            em relação ao mesmo período anterior
          </span>
        </div>

        {/* Previous Period */}
        <div className="flex-1 flex items-center gap-4 justify-start md:justify-end pr-4">
          <div className="text-left md:text-right">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none block mb-1.5">
              Faturamento Período Anterior
            </span>
            <div className="text-lg sm:text-xl md:text-2xl font-extrabold text-slate-700 dark:text-slate-300 mono leading-none">
              {ov.isLoading ? '...' : formatBRL(totalAnterior)}
            </div>
            <div className="text-[10px] text-slate-400 font-bold tracking-wide mt-1.5">
              Período de Referência Anterior
            </div>
          </div>
          <div className="p-3.5 bg-slate-50 rounded-2xl text-slate-400 dark:bg-slate-800/30 dark:text-slate-500 shrink-0">
            <BarChart2 size={24} />
          </div>
        </div>
      </div>

      {/* ── ROW 2 OF KPIs: TOP PERFORMANCE ENTITIES (4 Cards) ─────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Melhor Vendedor */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 flex items-center justify-between shadow-sm group hover:-translate-y-0.5 transition-all duration-300">
          <div className="flex-1 min-w-0">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">
              Melhor Vendedor
            </span>
            <div className="text-sm font-extrabold text-slate-800 dark:text-white truncate uppercase mb-1">
              {melhorVendedor?.nome || '—'}
            </div>
            <div className="text-sm sm:text-base font-black text-[#00a896] mono">
              {melhorVendedor ? formatBRL(melhorVendedor.total) : '—'}
            </div>
            <div className="text-[9px] text-slate-400 font-bold mt-1">
              {melhorVendedor && totalPeriodo > 0 ? `${((melhorVendedor.total / totalPeriodo) * 100).toFixed(1)}% do faturamento total` : '—'}
            </div>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl shrink-0 ml-3">
            <Crown size={18} />
          </div>
        </div>

        {/* Melhor Cliente */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 flex items-center justify-between shadow-sm group hover:-translate-y-0.5 transition-all duration-300">
          <div className="flex-1 min-w-0">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">
              Melhor Cliente
            </span>
            <div className="text-sm font-extrabold text-slate-800 dark:text-white truncate uppercase mb-1">
              {melhorCliente?.nome || '—'}
            </div>
            <div className="text-sm sm:text-base font-black text-rose-500 mono">
              {melhorCliente ? formatBRL(melhorCliente.total) : '—'}
            </div>
            <div className="text-[9px] text-slate-400 font-bold mt-1">
              Cliente com maior faturamento
            </div>
          </div>
          <div className="p-2.5 bg-rose-50 text-rose-500 rounded-xl shrink-0 ml-3">
            <Users size={18} />
          </div>
        </div>

        {/* Marca Destaque */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 flex items-center justify-between shadow-sm group hover:-translate-y-0.5 transition-all duration-300">
          <div className="flex-1 min-w-0">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">
              Marca Mais Vendida
            </span>
            <div className="text-sm font-extrabold text-slate-800 dark:text-white truncate uppercase mb-1">
              {melhorMarca?.nome || melhorMarca?.marca || '—'}
            </div>
            <div className="text-sm sm:text-base font-black text-sky-500 mono">
              {melhorMarca ? formatBRL(melhorMarca.total) : '—'}
            </div>
            <div className="text-[9px] text-slate-400 font-bold mt-1">
              Marca líder em faturamento
            </div>
          </div>
          <div className="p-2.5 bg-sky-50 text-sky-500 rounded-xl shrink-0 ml-3">
            <Tag size={18} />
          </div>
        </div>

        {/* Cidade Destaque */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 flex items-center justify-between shadow-sm group hover:-translate-y-0.5 transition-all duration-300">
          <div className="flex-1 min-w-0">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">
              Cidade Destaque
            </span>
            <div className="text-sm font-extrabold text-slate-800 dark:text-white truncate uppercase mb-1">
              {melhorCidade?.nome || '—'}
            </div>
            <div className="text-sm sm:text-base font-black text-emerald-600 mono">
              {melhorCidade ? formatBRL(melhorCidade.total) : '—'}
            </div>
            <div className="text-[9px] text-slate-400 font-bold mt-1">
              Cidade líder em faturamento
            </div>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl shrink-0 ml-3">
            <Target size={18} />
          </div>
        </div>
      </div>

      {/* ── ROW 3 OF KPIs: METRICS DETAILS (4 Cards) ───────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Volume de Itens */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 flex items-center justify-between shadow-sm group hover:-translate-y-0.5 transition-all duration-300">
          <div>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">
              Volume de Itens
            </span>
            <div className="text-2xl font-black text-slate-800 dark:text-white mono mb-1">
              {ov.isLoading ? '...' : formatNum(qtdItens)}
            </div>
            <span className="text-[9px] text-slate-400 font-bold">Total de itens faturados</span>
          </div>
          <div className="p-2.5 bg-sky-50 text-sky-500 rounded-xl shrink-0 ml-3">
            <Box size={18} />
          </div>
        </div>

        {/* Ticket Médio */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 flex items-center justify-between shadow-sm group hover:-translate-y-0.5 transition-all duration-300">
          <div>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">
              Ticket Médio
            </span>
            <div className="text-2xl font-black text-slate-800 dark:text-white mono mb-1">
              {ov.isLoading ? '...' : formatBRL(ticketMedio)}
            </div>
            <span className="text-[9px] text-slate-400 font-bold">Média por nota fiscal</span>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-500 rounded-xl shrink-0 ml-3">
            <Calculator size={18} />
          </div>
        </div>

        {/* Taxa de Conversão */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 flex items-center justify-between shadow-sm group hover:-translate-y-0.5 transition-all duration-300">
          <div>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">
              Taxa de Conversão
            </span>
            <div className="text-2xl font-black text-slate-800 dark:text-white mono mb-1">
              {kpisQuery.isLoading ? '...' : `${taxaConversao.toFixed(1)}%`}
            </div>
            <span className="text-[9px] text-slate-400 font-bold">Conversão de metas no período</span>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl shrink-0 ml-3">
            <TrendingUp size={18} />
          </div>
        </div>

        {/* Clientes com Compra */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 flex items-center justify-between shadow-sm group hover:-translate-y-0.5 transition-all duration-300">
          <div>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">
              Clientes com Compra
            </span>
            <div className="text-2xl font-black text-slate-800 dark:text-white mono mb-1">
              {kpisQuery.isLoading ? '...' : formatNum(clientesAtivos)}
            </div>
            <span className="text-[9px] text-slate-400 font-bold">Clientes ativos no período</span>
          </div>
        </div>
      </div>
      </>)}

      {/* ── ROW 4: PERIOD EVOLUTION CHART (MOVED BETWEEN CARDS & SELLERS) ── */}
      {(!isMobile || activeTab === 'receitas') && (
        <>
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
          <div>
            <h3 className="font-extrabold text-slate-800 dark:text-white text-xs uppercase tracking-widest">
              Faturamento no Período
            </h3>
            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block mt-0.5">
              Valores Excluindo Departamento Equipamentos
            </span>
          </div>

          {/* Filtro de Ano */}
          <div className="flex items-center gap-2 flex-wrap shrink-0 self-start sm:self-auto">
            {availableChartYears.length > 1 && (
              <div className="bg-slate-100 p-0.5 rounded-lg flex items-center gap-0.5 border border-slate-200/50">
                <button
                  onClick={() => setSelectedYearChart('all')}
                  className={clsx(
                    'px-3 py-1 text-[10px] font-bold rounded-md uppercase tracking-wider transition-all duration-200 cursor-pointer',
                    selectedYearChart === 'all'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  )}
                >
                  Todos
                </button>
                {availableChartYears.map(year => (
                  <button
                    key={year}
                    onClick={() => setSelectedYearChart(year)}
                    className={clsx(
                      'px-3 py-1 text-[10px] font-bold rounded-md uppercase tracking-wider transition-all duration-200 cursor-pointer',
                      selectedYearChart === year
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    )}
                  >
                    {year}
                  </button>
                ))}
              </div>
            )}

            {/* Toggle buttons for chart mode */}
            <div className="bg-slate-100 p-0.5 rounded-lg flex items-center border border-slate-200/50">
              <button
                onClick={() => setChartMode('diario')}
                className={clsx(
                  'px-3.5 py-1 text-[10px] font-bold rounded-md uppercase tracking-wider transition-all duration-200 cursor-pointer',
                  chartMode === 'diario'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                )}
              >
                Diário
              </button>
              <button
                onClick={() => setChartMode('mensal')}
                className={clsx(
                  'px-3.5 py-1 text-[10px] font-bold rounded-md uppercase tracking-wider transition-all duration-200 cursor-pointer',
                  chartMode === 'mensal'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                )}
              >
                Mensal
              </button>
              <button
                onClick={() => setChartMode('anual')}
                className={clsx(
                  'px-3.5 py-1 text-[10px] font-bold rounded-md uppercase tracking-wider transition-all duration-200 cursor-pointer',
                  chartMode === 'anual'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                )}
              >
                Ano
              </button>
            </div>
          </div>
        </div>

        {/* Recharts Container */}
        <div className="h-64 sm:h-72">
          {fatMes.isLoading ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">Carregando dados do faturamento...</div>
          ) : (chartMode === 'diario' ? dailyChartData : chartMode === 'mensal' ? monthlyChartData : yearlyChartData).length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">Sem faturamento registrado no período</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {chartMode === 'diario' && dailyChartData.length > 20 ? (
                <LineChart data={dailyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.4} />
                  <XAxis
                    dataKey="data"
                    tick={{ fontSize: 9, fill: 'var(--color-text-muted)', fontWeight: 700 }}
                    tickFormatter={(d: string) => d?.slice(8) || d} // Show day only
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 9, fill: 'var(--color-text-muted)', fontWeight: 700 }}
                    tickFormatter={formatBRLCompact}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#00a896"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                  />
                </LineChart>
              ) : (
                <BarChart
                  data={chartMode === 'diario' ? dailyChartData : chartMode === 'mensal' ? monthlyChartData : yearlyChartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.4} />
                  <XAxis
                    dataKey={chartMode === 'diario' ? 'data' : 'label'}
                    tick={{ fontSize: 9, fill: 'var(--color-text-muted)', fontWeight: 700 }}
                    tickFormatter={(d: string) => chartMode === 'diario' ? (d?.slice(5) || d) : d}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 9, fill: 'var(--color-text-muted)', fontWeight: 700 }}
                    tickFormatter={formatBRLCompact}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-bg-tertiary)', opacity: 0.3 }} />
                  <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={38} fill="#00a896">
                    {(chartMode === 'diario' ? dailyChartData : chartMode === 'mensal' ? monthlyChartData : yearlyChartData).map((_: any, i: number) => (
                      <Cell key={`cell-${i}`} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </>)}

      {/* ── MIDDLE ROW: SELLERS CHART + RANKING LIST ─────────────────────── */}
      {(!isMobile || activeTab === 'vendedores') && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sellers Horizontal Bar Chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-center mb-5">
            <h3 className="font-extrabold text-slate-800 dark:text-white text-xs uppercase tracking-widest">
              Desempenho dos Vendedores (Gráfico)
            </h3>
          </div>
          <div className="h-[220px] sm:h-[280px]">
            {vd.isLoading ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">Carregando gráfico...</div>
            ) : filteredTopSellers.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">Sem dados comerciais</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredTopSellers} layout="vertical" margin={{ left: 10, right: 30, top: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" opacity={0.4} />
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="nome"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => String(v).length > 12 ? String(v).substring(0, 12) + '...' : v}
                    tick={{ fontSize: 9, fill: 'var(--color-text-primary)', fontWeight: 700 }}
                    width={90}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-bg-tertiary)', opacity: 0.3 }} />
                  <Bar dataKey="total" radius={[0, 4, 4, 0]} maxBarSize={16}>
                    {filteredTopSellers.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top Sellers Ranked List */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-extrabold text-slate-800 dark:text-white text-xs uppercase tracking-widest">
              Top Vendedores (Ranking)
            </h3>
          </div>
          <div className="flex-1 space-y-2 pr-1 overflow-y-visible sm:overflow-y-auto max-h-none sm:max-h-[280px]">
            {vd.isLoading ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">Carregando ranking...</div>
            ) : filteredTopSellers.map((seller: any, i: number) => {
              const pct = totalPeriodo > 0 ? (seller.total / totalPeriodo) * 100 : 0
              const initials = seller.nome ? seller.nome.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'V'
              const medal = i < 3 ? MEDAL_LABELS[i] : null

              return (
                <div key={seller.id} className="flex items-center gap-3.5 p-2 hover:bg-slate-50 dark:hover:bg-slate-800/30 rounded-xl transition-all duration-200 border border-transparent hover:border-slate-100">
                  {/* Medal or Index */}
                  <div className="w-8 shrink-0 flex items-center justify-center">
                    {medal ? (
                      <span className="text-xl">{medal}</span>
                    ) : (
                      <span className="text-xs font-black text-slate-400 mono">#{i + 1}</span>
                    )}
                  </div>

                  {/* Avatar bubble */}
                  <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                    {initials}
                  </div>

                  {/* Seller name & faturamento */}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-extrabold text-slate-700 dark:text-slate-200 uppercase truncate">
                      {seller.nome}
                    </div>
                    <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
                      Participação de vendas
                    </div>
                  </div>

                  {/* Value & percentage share */}
                  <div className="text-right shrink-0 pl-2">
                    <div className="text-xs font-black text-slate-800 dark:text-white mono">
                      {formatBRL(seller.total)}
                    </div>
                    <div className="text-[9px] text-[#00a896] font-bold mt-0.5">
                      {pct.toFixed(1)}% share
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      )}

      {/* ── ROW 5: CIDADES CHART + RANKING LIST ─────────────────────────── */}
      {(!isMobile || activeTab === 'cidades') && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cities Horizontal Bar Chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-center mb-5">
            <h3 className="font-extrabold text-slate-800 dark:text-white text-xs uppercase tracking-widest flex items-center gap-1.5">
              <Target size={14} className="text-emerald-600" /> Desempenho das Cidades (Gráfico)
            </h3>
          </div>
          <div className="h-[220px] sm:h-[280px]">
            {cidadesQuery.isLoading ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">Carregando gráfico...</div>
            ) : top10Cidades.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">Sem dados de cidades</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={top10Cidades} layout="vertical" margin={{ left: 10, right: 30, top: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" opacity={0.4} />
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="nome"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => String(v).length > 12 ? String(v).substring(0, 12) + '...' : v}
                    tick={{ fontSize: 9, fill: 'var(--color-text-primary)', fontWeight: 700 }}
                    width={90}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-bg-tertiary)', opacity: 0.3 }} />
                  <Bar dataKey="total" radius={[0, 4, 4, 0]} maxBarSize={16}>
                    {top10Cidades.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top 10 Cidades Ranking */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-extrabold text-slate-800 dark:text-white text-xs uppercase tracking-widest flex items-center gap-1.5">
              <Target size={14} className="text-emerald-600" /> Top Cidades (Ranking)
            </h3>
          </div>
          <div className="flex-1 space-y-2 pr-1 overflow-y-visible sm:overflow-y-auto max-h-none sm:max-h-[280px]">
            {cidadesQuery.isLoading ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">Carregando ranking...</div>
            ) : top10Cidades.map((item: any, i: number) => {
              const pct = totalPeriodo > 0 ? (item.total / totalPeriodo) * 100 : 0
              return (
                <div key={i} className="flex items-center gap-3.5 p-2 hover:bg-slate-50 dark:hover:bg-slate-800/30 rounded-xl transition-all duration-200 border border-transparent hover:border-slate-100">
                  {/* Position */}
                  <div className="w-8 shrink-0 flex items-center justify-center">
                    <span className="text-xs font-black text-slate-400 mono">#{i + 1}</span>
                  </div>

                  {/* City Name */}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-extrabold text-slate-700 dark:text-slate-200 uppercase truncate">
                      {item.nome}
                    </div>
                  </div>

                  {/* Value */}
                  <div className="text-right shrink-0 pl-2">
                    <div className="text-xs font-black text-slate-800 dark:text-white mono">
                      {formatBRL(item.total)}
                    </div>
                    <div className="text-[9px] text-[#00a896] font-bold mt-0.5">
                      {pct.toFixed(1)}% share
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      )}





      {/* ── MOBILE STICKY BOTTOM NAVIGATION ──────────────────────────────── */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800/80 py-2 px-4 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] select-none">
          <div className="flex items-center justify-around w-full max-w-md mx-auto">
            {/* Tab Estatísticas */}
            <button
              onClick={() => setActiveTab('estatisticas')}
              className={clsx(
                "flex flex-col items-center justify-center py-1 flex-1 cursor-pointer transition-all",
                activeTab === 'estatisticas' ? "text-[#00a896]" : "text-slate-400 dark:text-slate-500"
              )}
            >
              <LayoutDashboard size={18} />
              <span className="text-[8px] font-bold uppercase tracking-wider mt-1">ESTATÍSTICAS</span>
            </button>

            {/* Tab Receitas */}
            <button
              onClick={() => setActiveTab('receitas')}
              className={clsx(
                "flex flex-col items-center justify-center py-1 flex-1 cursor-pointer transition-all",
                activeTab === 'receitas' ? "text-[#00a896]" : "text-slate-400 dark:text-slate-500"
              )}
            >
              <TrendingUp size={18} />
              <span className="text-[8px] font-bold uppercase tracking-wider mt-1">RECEITAS</span>
            </button>

            {/* Tab Vendedores */}
            <button
              onClick={() => setActiveTab('vendedores')}
              className={clsx(
                "flex flex-col items-center justify-center py-1 flex-1 cursor-pointer transition-all",
                activeTab === 'vendedores' ? "text-[#00a896]" : "text-slate-400 dark:text-slate-500"
              )}
            >
              <Trophy size={18} />
              <span className="text-[8px] font-bold uppercase tracking-wider mt-1">VENDEDORES</span>
            </button>

            {/* Tab Cidades */}
            <button
              onClick={() => setActiveTab('cidades')}
              className={clsx(
                "flex flex-col items-center justify-center py-1 flex-1 cursor-pointer transition-all",
                activeTab === 'cidades' ? "text-[#00a896]" : "text-slate-400 dark:text-slate-500"
              )}
            >
              <MapPin size={18} />
              <span className="text-[8px] font-bold uppercase tracking-wider mt-1">CIDADES</span>
            </button>

            {/* Tab Filtros (Trigger Bottom Sheet) */}
            <button
              onClick={() => setShowFiltersSheet(true)}
              className="flex flex-col items-center justify-center py-1 flex-1 cursor-pointer transition-all text-slate-400 dark:text-slate-500 relative"
            >
              {(selectedVendedor !== 'todas' || selectedMarca !== 'todas' || selectedCidade !== 'todas' || period !== 'thisMonth') && (
                <span className="absolute top-1 right-6 w-2 h-2 rounded-full bg-emerald-500 border border-white" />
              )}
              <Sliders size={18} />
              <span className="text-[8px] font-bold uppercase tracking-wider mt-1">FILTROS</span>
            </button>
          </div>
        </div>
      )}

      {/* ── MOBILE FILTERS BOTTOM SHEET ──────────────────────────────────── */}
      {isMobile && showFiltersSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center select-none animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setShowFiltersSheet(false)}
          />
          {/* Bottom Sheet Drawer */}
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl p-6 shadow-2xl z-10 animate-in slide-in-from-bottom duration-300 max-h-[85vh] overflow-y-auto flex flex-col pb-8">
            {/* Handle bar */}
            <div className="w-12 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-5 shrink-0" />

            <div className="flex justify-between items-center mb-6 shrink-0">
              <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">
                Filtrar Relatórios
              </h3>
              <button
                onClick={() => setShowFiltersSheet(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-6 flex-1">
              {/* Seletor de Período */}
              <div>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2.5 pl-1">
                  Período
                </span>
                <PeriodFilter excludePeriods={['yesterday']} compact={true} />
              </div>

              {/* Vendedor Dropdown */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">
                  Vendedor
                </label>
                <div className="relative">
                  <select
                    value={selectedVendedor}
                    onChange={(e) => setSelectedVendedor(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800 dark:text-white outline-none appearance-none focus:border-[#00a896] transition-colors cursor-pointer"
                  >
                    <option value="todas">Todos os Vendedores</option>
                    {sellersDropdown.data?.data?.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.nome}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Marca Dropdown */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">
                  Marca
                </label>
                <div className="relative">
                  <select
                    value={selectedMarca}
                    onChange={(e) => setSelectedMarca(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800 dark:text-white outline-none appearance-none focus:border-[#00a896] transition-colors cursor-pointer"
                  >
                    <option value="todas">Todas as Marcas</option>
                    {brandsDropdown.data?.data?.map((b: any) => (
                      <option key={b.nome} value={b.nome}>{b.nome}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Cidade Dropdown */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">
                  Cidade
                </label>
                <div className="relative">
                  <select
                    value={selectedCidade}
                    onChange={(e) => setSelectedCidade(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800 dark:text-white outline-none appearance-none focus:border-[#00a896] transition-colors cursor-pointer"
                  >
                    <option value="todas">Todas as Cidades</option>
                    {citiesDropdown.data?.data?.map((c: any) => (
                      <option key={c.nome} value={c.nome}>{c.nome}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="mt-8 shrink-0">
              <button
                onClick={() => setShowFiltersSheet(false)}
                className="w-full py-3.5 bg-[#00a896] hover:bg-[#008f80] text-white font-bold rounded-2xl text-xs shadow-md transition-all active:scale-[0.98] cursor-pointer"
              >
                Aplicar Filtros
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
