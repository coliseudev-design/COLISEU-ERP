import { useState, useMemo, useEffect } from 'react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts'
import {
  DollarSign, ShoppingBag, Award, GitCompare, Play, Maximize2, ChevronDown
} from 'lucide-react'
import { useApiQuery, useBranchPeriodQuery } from '../hooks/useApi'
import { useBranch } from '../contexts/BranchContext'
import { PageFilters } from '../components/PageFilters'
import { formatBRL, formatBRLCompact, formatNum } from '../utils/format'
import clsx from 'clsx'

// Tooltip customizado premium
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-bg-primary border border-border shadow-card-hover p-3 rounded-xl z-50">
        <p className="text-text-primary font-bold text-xs mb-2 border-b border-divider/40 pb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-xs mb-1">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-text-secondary font-medium">{entry.name}:</span>
            <span className="text-text-primary font-bold">
              {entry.name.includes('Faturamento') || entry.name.includes('Ticket')
                ? formatBRL(entry.value)
                : formatNum(entry.value)}
            </span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

const MONTHS = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' }
]

const YEARS = [2026, 2025, 2024]

export default function ComparativoVendas() {
  const { filiais, selectedBranch, setSelectedBranch } = useBranch()

  // Filtros de cabeçalho
  const [status, setStatus] = useState('Processado')
  const [tipo, setTipo] = useState('Venda - Devolucao')
  const [tipoPeriodo, setTipoPeriodo] = useState<'mes' | 'personalizado'>('mes')

  const currentDate = useMemo(() => new Date(), [])
  const currentMonth = useMemo(() => currentDate.getMonth() + 1, [currentDate])
  const currentYear = useMemo(() => currentDate.getFullYear(), [currentDate])
  const prevMonth = useMemo(() => currentMonth === 1 ? 12 : currentMonth - 1, [currentMonth])
  const prevYear = useMemo(() => currentMonth === 1 ? currentYear - 1 : currentYear, [currentMonth, currentYear])

  // Períodos de Comparação
  const [analiseMes, setAnaliseMes] = useState(currentMonth)
  const [analiseAno, setAnaliseAno] = useState(currentYear)
  const [comparacaoMes, setComparacaoMes] = useState(prevMonth)
  const [comparacaoAno, setComparacaoAno] = useState(prevYear)

  // Intervalos Personalizados
  const [customAnaliseStart, setCustomAnaliseStart] = useState('')
  const [customAnaliseEnd, setCustomAnaliseEnd] = useState('')
  const [customComparacaoStart, setCustomComparacaoStart] = useState('')
  const [customComparacaoEnd, setCustomComparacaoEnd] = useState('')

  // Filtros inferiores
  const [vendedor, setVendedor] = useState('todas')
  const [cidade, setCidade] = useState('todas')
  const [marca, setMarca] = useState('todas')
  const [categoria, setCategoria] = useState('todas')

  // Estado do gráfico
  const [graficoFiltro, setGraficoFiltro] = useState<'marca' | 'categoria' | 'vendedor' | 'cidade'>('marca')
  const [tipoGrafico, setTipoGrafico] = useState<'barras' | 'linhas'>('barras')

  // Queries para popular os seletores dinamicamente
  const sellersDropdown = useBranchPeriodQuery<any>('/ranking/vendedores', { limit: 100 })
  const brandsDropdown = useBranchPeriodQuery<any>('/ranking/marcas', { limit: 100 })
  const citiesDropdown = useBranchPeriodQuery<any>('/ranking/cidades', { limit: 100 })
  const categoriesDropdown = useBranchPeriodQuery<any>('/ranking/categorias', { limit: 100 })

  // Inicializar datas padrão para o período personalizado
  useEffect(() => {
    if (!customAnaliseStart) {
      const today = new Date()
      const start = new Date(today.getFullYear(), today.getMonth(), 1)
      setCustomAnaliseStart(start.toISOString().slice(0, 10))
      setCustomAnaliseEnd(today.toISOString().slice(0, 10))
    }
    if (!customComparacaoStart) {
      const start = new Date(prevYear, prevMonth - 1, 1)
      const lastDay = new Date(prevYear, prevMonth, 0).getDate()
      const end = new Date(prevYear, prevMonth - 1, lastDay)
      setCustomComparacaoStart(start.toISOString().slice(0, 10))
      setCustomComparacaoEnd(end.toISOString().slice(0, 10))
    }
  }, [prevMonth, prevYear])

  // Geração de parâmetros de filtro de período com base na seleção
  const buildDateParams = (month: number, year: number) => {
    const pad = (n: number) => String(n).padStart(2, '0')
    const lastDay = new Date(year, month, 0).getDate()
    return {
      start_date: `${year}-${pad(month)}-01`,
      end_date: `${year}-${pad(month)}-${pad(lastDay)}`
    }
  }

  const analiseParams = useMemo(() => {
    const base = tipoPeriodo === 'mes'
      ? buildDateParams(analiseMes, analiseAno)
      : { start_date: customAnaliseStart, end_date: customAnaliseEnd }
    return {
      ...base,
      period: 'custom',
      depto_id: selectedBranch !== 'todas' ? selectedBranch : undefined,
      vendedor_id: vendedor !== 'todas' ? vendedor : undefined,
      cidade: cidade !== 'todas' ? cidade : undefined,
      marca: marca !== 'todas' ? marca : undefined,
      grupo: categoria !== 'todas' ? categoria : undefined,
      status: status !== 'Todos' ? status : undefined,
      tipo: tipo !== 'Todos' ? tipo : undefined
    }
  }, [tipoPeriodo, analiseMes, analiseAno, customAnaliseStart, customAnaliseEnd, selectedBranch, vendedor, cidade, marca, categoria, status, tipo])

  const comparacaoParams = useMemo(() => {
    const base = tipoPeriodo === 'mes'
      ? buildDateParams(comparacaoMes, comparacaoAno)
      : { start_date: customComparacaoStart, end_date: customComparacaoEnd }
    return {
      ...base,
      period: 'custom',
      depto_id: selectedBranch !== 'todas' ? selectedBranch : undefined,
      vendedor_id: vendedor !== 'todas' ? vendedor : undefined,
      cidade: cidade !== 'todas' ? cidade : undefined,
      marca: marca !== 'todas' ? marca : undefined,
      grupo: categoria !== 'todas' ? categoria : undefined,
      status: status !== 'Todos' ? status : undefined,
      tipo: tipo !== 'Todos' ? tipo : undefined
    }
  }, [tipoPeriodo, comparacaoMes, comparacaoAno, customComparacaoStart, customComparacaoEnd, selectedBranch, vendedor, cidade, marca, categoria, status, tipo])

  // Queries Reais de Dados do BI para os dois períodos
  const ovAnalise = useApiQuery<any>('/bi/sales/commercial-kpis', analiseParams)
  const ovComparacao = useApiQuery<any>('/bi/sales/commercial-kpis', comparacaoParams)

  // Ranking Query dinâmica dependendo do filtro selecionado
  const getRankingEndpoint = () => {
    if (graficoFiltro === 'marca') return '/ranking/marcas'
    if (graficoFiltro === 'categoria') return '/ranking/categorias'
    if (graficoFiltro === 'vendedor') return '/ranking/vendedores'
    return '/ranking/cidades'
  }

  const rankAnalise = useApiQuery<any>(getRankingEndpoint(), { ...analiseParams, limit: 15 })
  const rankComparacao = useApiQuery<any>(getRankingEndpoint(), { ...comparacaoParams, limit: 15 })

  // KPI Faturamento
  const fatAnalise = ovAnalise.data?.faturamento_total || 0
  const fatComparacao = ovComparacao.data?.faturamento_total || 0
  const fatDiff = fatAnalise - fatComparacao
  const fatPct = fatComparacao > 0 ? (fatDiff / fatComparacao) * 100 : 0

  // KPI Pedidos
  const pedAnalise = ovAnalise.data?.total_pedidos || 0
  const pedComparacao = ovComparacao.data?.total_pedidos || 0
  const pedDiff = pedAnalise - pedComparacao
  const pedPct = pedComparacao > 0 ? (pedDiff / pedComparacao) * 100 : 0

  // KPI Ticket Médio
  const tktAnalise = ovAnalise.data?.ticket_medio || 0
  const tktComparacao = ovComparacao.data?.ticket_medio || 0
  const tktDiff = tktAnalise - tktComparacao
  const tktPct = tktComparacao > 0 ? (tktDiff / tktComparacao) * 100 : 0

  // Combinação dos dados para Gráfico e Tabela
  const chartAndTableData = useMemo(() => {
    const mapAnalise = new Map<string, number>()
    const mapComparacao = new Map<string, number>()

    const listAnalise = rankAnalise.data?.data || []
    const listComparacao = rankComparacao.data?.data || []

    listAnalise.forEach((item: any) => {
      const name = item.nome || item.marca || item.categoria || item.cidade || 'NÃO INFORMADO'
      mapAnalise.set(name, item.total || 0)
    })

    listComparacao.forEach((item: any) => {
      const name = item.nome || item.marca || item.categoria || item.cidade || 'NÃO INFORMADO'
      mapComparacao.set(name, item.total || 0)
    })

    const allNames = Array.from(new Set([
      ...listAnalise.map((item: any) => item.nome || item.marca || item.categoria || item.cidade || 'NÃO INFORMADO'),
      ...listComparacao.map((item: any) => item.nome || item.marca || item.categoria || item.cidade || 'NÃO INFORMADO')
    ]))

    return allNames.map(name => {
      const valAnalise = mapAnalise.get(name) || 0
      const valComparacao = mapComparacao.get(name) || 0
      const diff = valAnalise - valComparacao
      const pct = valComparacao > 0 ? (diff / valComparacao) * 100 : 0

      return {
        name,
        analise: valAnalise,
        comparacao: valComparacao,
        diff,
        pct
      }
    }).sort((a, b) => b.analise - a.analise)
  }, [rankAnalise.data, rankComparacao.data])

  const labelAnalise = tipoPeriodo === 'mes'
    ? `${MONTHS.find(m => m.value === analiseMes)?.label}/${analiseAno}`
    : `${customAnaliseStart?.split('-').reverse().join('/')} - ${customAnaliseEnd?.split('-').reverse().join('/')}`

  const labelComparacao = tipoPeriodo === 'mes'
    ? `${MONTHS.find(m => m.value === comparacaoMes)?.label}/${comparacaoAno}`
    : `${customComparacaoStart?.split('-').reverse().join('/')} - ${customComparacaoEnd?.split('-').reverse().join('/')}`

  return (
    <div className="space-y-4 pb-6 animate-in fade-in duration-300">
      {/* Teleportamos todos os filtros da página para o cabeçalho superior unificado */}
      {/* Painel de Filtros da Página - Posicionado abaixo do título da tela */}
      {/* Painel de Filtros da Página - Estrutura organizada em 2 linhas distribuídas */}
      <div className="bg-bg-primary border border-border shadow-sm rounded-xl p-3.5 flex flex-col gap-3.5 text-xs w-full animate-in slide-in-from-top-3 duration-250">
        
        {/* LINHA 1: PERÍODOS DE COMPARAÇÃO */}
        <div className="flex flex-wrap items-center gap-4 w-full border-b border-divider/45 pb-3">
          {/* Mode Toggle */}
          <div className="bg-bg-secondary p-0.5 rounded-lg flex items-center border border-border shrink-0">
            <button
              onClick={() => setTipoPeriodo('mes')}
              className={clsx(
                "px-2.5 py-1 text-[10px] font-black rounded-md uppercase tracking-wider transition-all duration-200 cursor-pointer",
                tipoPeriodo === 'mes' ? "bg-brand-600 text-white shadow-sm" : "text-text-secondary hover:text-text-primary"
              )}
            >
              MÊS
            </button>
            <button
              onClick={() => setTipoPeriodo('personalizado')}
              className={clsx(
                "px-2.5 py-1 text-[10px] font-black rounded-md uppercase tracking-wider transition-all duration-200 cursor-pointer",
                tipoPeriodo === 'personalizado' ? "bg-brand-600 text-white shadow-sm" : "text-text-secondary hover:text-text-primary"
              )}
            >
              PERS
            </button>
          </div>

          {/* Análise Period */}
          <div className="flex items-center gap-2 border-r border-divider/40 pr-4 pl-1 shrink-0">
            <span className="text-[10px] text-blue-500 font-bold uppercase tracking-wider">ANÁLISE</span>
            {tipoPeriodo === 'mes' ? (
              <div className="flex items-center gap-1.5">
                <div className="relative">
                  <select
                    value={analiseMes}
                    onChange={(e) => setAnaliseMes(Number(e.target.value))}
                    className="bg-bg-secondary border border-border rounded-lg px-2.5 py-1.5 text-xs font-semibold text-text-primary outline-none cursor-pointer pr-7"
                  >
                    {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                  <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
                </div>
                <div className="relative">
                  <select
                    value={analiseAno}
                    onChange={(e) => setAnaliseAno(Number(e.target.value))}
                    className="bg-bg-secondary border border-border rounded-lg px-2.5 py-1.5 text-xs font-semibold text-text-primary outline-none cursor-pointer pr-7"
                  >
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={customAnaliseStart}
                  onChange={(e) => setCustomAnaliseStart(e.target.value)}
                  className="bg-bg-secondary border border-border rounded-lg px-2 py-1 text-xs font-semibold text-text-primary outline-none max-w-[110px]"
                />
                <span className="text-xs text-text-muted">a</span>
                <input
                  type="date"
                  value={customAnaliseEnd}
                  onChange={(e) => setCustomAnaliseEnd(e.target.value)}
                  className="bg-bg-secondary border border-border rounded-lg px-2 py-1 text-xs font-semibold text-text-primary outline-none max-w-[110px]"
                />
              </div>
            )}
          </div>

          {/* Comparação Period */}
          <div className="flex items-center gap-2 pr-4 shrink-0">
            <span className="text-[10px] text-orange-500 font-bold uppercase tracking-wider">COMPARAÇÃO</span>
            {tipoPeriodo === 'mes' ? (
              <div className="flex items-center gap-1.5">
                <div className="relative">
                  <select
                    value={comparacaoMes}
                    onChange={(e) => setComparacaoMes(Number(e.target.value))}
                    className="bg-bg-secondary border border-border rounded-lg px-2.5 py-1.5 text-xs font-semibold text-text-primary outline-none cursor-pointer pr-7"
                  >
                    {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                  <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
                </div>
                <div className="relative">
                  <select
                    value={comparacaoAno}
                    onChange={(e) => setComparacaoAno(Number(e.target.value))}
                    className="bg-bg-secondary border border-border rounded-lg px-2.5 py-1.5 text-xs font-semibold text-text-primary outline-none cursor-pointer pr-7"
                  >
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={customComparacaoStart}
                  onChange={(e) => setCustomComparacaoStart(e.target.value)}
                  className="bg-bg-secondary border border-border rounded-lg px-2 py-1 text-xs font-semibold text-text-primary outline-none max-w-[110px]"
                />
                <span className="text-xs text-text-muted">a</span>
                <input
                  type="date"
                  value={customComparacaoEnd}
                  onChange={(e) => setCustomComparacaoEnd(e.target.value)}
                  className="bg-bg-secondary border border-border rounded-lg px-2 py-1 text-xs font-semibold text-text-primary outline-none max-w-[110px]"
                />
              </div>
            )}
          </div>
        </div>

        {/* LINHA 2: CONTEXTOS DE FILTRAGEM (DISTRIBUÍDO EM GRID) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 w-full items-center pt-1">
          {/* Vendedor */}
          <div className="relative w-full">
            <select
              value={vendedor}
              onChange={(e) => setVendedor(e.target.value)}
              className="bg-bg-secondary border border-border rounded-lg px-3 py-2 text-xs font-bold text-text-primary outline-none w-full cursor-pointer pr-8"
            >
              <option value="todas">Vendedor: Todos</option>
              {sellersDropdown.data?.data?.map((s: any) => (
                <option key={s.id || s.nome} value={s.id}>{s.nome}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
          </div>

          {/* Cidade */}
          <div className="relative w-full">
            <select
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              className="bg-bg-secondary border border-border rounded-lg px-3 py-2 text-xs font-bold text-text-primary outline-none w-full cursor-pointer pr-8"
            >
              <option value="todas">Cidade: Todas</option>
              {citiesDropdown.data?.data?.map((c: any) => (
                <option key={c.nome || c.cidade} value={c.nome || c.cidade}>{c.nome || c.cidade}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
          </div>

          {/* Marca */}
          <div className="relative w-full">
            <select
              value={marca}
              onChange={(e) => setMarca(e.target.value)}
              className="bg-bg-secondary border border-border rounded-lg px-3 py-2 text-xs font-bold text-text-primary outline-none w-full cursor-pointer pr-8"
            >
              <option value="todas">Marca: Todas</option>
              {brandsDropdown.data?.data?.map((m: any) => (
                <option key={m.nome || m.marca} value={m.nome || m.marca}>{m.nome || m.marca}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
          </div>

          {/* Categoria */}
          <div className="relative w-full">
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="bg-bg-secondary border border-border rounded-lg px-3 py-2 text-xs font-bold text-text-primary outline-none w-full cursor-pointer pr-8"
            >
              <option value="todas">Categoria: Todas</option>
              {categoriesDropdown.data?.data?.map((c: any) => (
                <option key={c.nome || c.categoria} value={c.nome || c.categoria}>{c.nome || c.categoria}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
          </div>

          {/* Compare Button */}
          <button
            onClick={() => {
              ovAnalise.refetch();
              ovComparacao.refetch();
              rankAnalise.refetch();
              rankComparacao.refetch();
            }}
            className="bg-[#10B981] hover:bg-emerald-600 text-white font-black px-4 py-2 rounded-lg text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 w-full shadow-sm hover:shadow active:scale-[0.97] border border-transparent h-full min-h-[36px]"
          >
            <Play size={12} fill="white" />
            Comparar
          </button>
        </div>
      </div>

      {/* TIER 3: COMPARISON KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Faturamento KPI */}
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 flex flex-col justify-between hover:border-blue-500/30 transition-colors">
          <div className="flex items-center gap-2 text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-4 border-b border-divider/30 pb-2">
            <div className="p-1 bg-blue-500/10 rounded-lg text-blue-500"><DollarSign size={14} /></div> FATURAMENTO TOTAL
          </div>
          <div className="space-y-2 flex-1">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                <span className="w-2 h-2 rounded-full bg-blue-500" /> ANÁLISE
              </div>
              <span className="text-xs text-text-muted font-semibold">({tipoPeriodo === 'mes' ? labelAnalise : 'Análise'})</span>
            </div>
            <div className="text-xl font-black text-text-primary">{formatBRL(fatAnalise)}</div>

            <div className="flex justify-between items-center pt-2">
              <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                <span className="w-2 h-2 rounded-full bg-orange-500" /> COMPARAÇÃO
              </div>
              <span className="text-xs text-text-muted font-semibold">({tipoPeriodo === 'mes' ? labelComparacao : 'Comparação'})</span>
            </div>
            <div className="text-xl font-black text-text-primary">{formatBRL(fatComparacao)}</div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <div className={clsx(
              "px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1",
              fatPct >= 0 ? "bg-success/15 text-success" : "bg-danger/15 text-danger"
            )}>
              {fatPct >= 0 ? '+' : ''}{fatPct.toFixed(2)}%
            </div>
            <div className="text-[10px] text-text-secondary font-bold">
              Dif: <span className={clsx("font-extrabold", fatDiff >= 0 ? "text-success" : "text-danger")}>
                {fatDiff >= 0 ? '+' : ''}{formatBRL(fatDiff)}
              </span>
            </div>
          </div>
        </div>

        {/* Quantidade Pedidos KPI */}
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 flex flex-col justify-between hover:border-emerald-500/30 transition-colors">
          <div className="flex items-center gap-2 text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-4 border-b border-divider/30 pb-2">
            <div className="p-1 bg-emerald-500/10 rounded-lg text-emerald-500"><ShoppingBag size={14} /></div> QUANTIDADE DE PEDIDOS
          </div>
          <div className="space-y-2 flex-1">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                <span className="w-2 h-2 rounded-full bg-blue-500" /> ANÁLISE
              </div>
              <span className="text-xs text-text-muted font-semibold">({tipoPeriodo === 'mes' ? labelAnalise : 'Análise'})</span>
            </div>
            <div className="text-xl font-black text-text-primary">{formatNum(pedAnalise)}</div>

            <div className="flex justify-between items-center pt-2">
              <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                <span className="w-2 h-2 rounded-full bg-orange-500" /> COMPARAÇÃO
              </div>
              <span className="text-xs text-text-muted font-semibold">({tipoPeriodo === 'mes' ? labelComparacao : 'Comparação'})</span>
            </div>
            <div className="text-xl font-black text-text-primary">{formatNum(pedComparacao)}</div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <div className={clsx(
              "px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1",
              pedPct >= 0 ? "bg-success/15 text-success" : "bg-danger/15 text-danger"
            )}>
              {pedPct >= 0 ? '+' : ''}{pedPct.toFixed(2)}%
            </div>
            <div className="text-[10px] text-text-secondary font-bold">
              Dif: <span className={clsx("font-extrabold", pedDiff >= 0 ? "text-success" : "text-danger")}>
                {pedDiff >= 0 ? '+' : ''}{formatNum(pedDiff)} ped.
              </span>
            </div>
          </div>
        </div>

        {/* Ticket Médio KPI */}
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 flex flex-col justify-between hover:border-warning/30 transition-colors">
          <div className="flex items-center gap-2 text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-4 border-b border-divider/30 pb-2">
            <div className="p-1 bg-warning/10 rounded-lg text-warning"><Award size={14} /></div> TICKET MÉDIO
          </div>
          <div className="space-y-2 flex-1">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                <span className="w-2 h-2 rounded-full bg-blue-500" /> ANÁLISE
              </div>
              <span className="text-xs text-text-muted font-semibold">({tipoPeriodo === 'mes' ? labelAnalise : 'Análise'})</span>
            </div>
            <div className="text-xl font-black text-text-primary">{formatBRL(tktAnalise)}</div>

            <div className="flex justify-between items-center pt-2">
              <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                <span className="w-2 h-2 rounded-full bg-orange-500" /> COMPARAÇÃO
              </div>
              <span className="text-xs text-text-muted font-semibold">({tipoPeriodo === 'mes' ? labelComparacao : 'Comparação'})</span>
            </div>
            <div className="text-xl font-black text-text-primary">{formatBRL(tktComparacao)}</div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <div className={clsx(
              "px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1",
              tktPct >= 0 ? "bg-success/15 text-success" : "bg-danger/15 text-danger"
            )}>
              {tktPct >= 0 ? '+' : ''}{tktPct.toFixed(2)}%
            </div>
            <div className="text-[10px] text-text-secondary font-bold">
              Dif: <span className={clsx("font-extrabold", tktDiff >= 0 ? "text-success" : "text-danger")}>
                {tktDiff >= 0 ? '+' : ''}{formatBRL(tktDiff)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* TIER 4: VARIATION CHART CARD */}
      <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 flex flex-col">
        {/* Header Tabs for Chart selection */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6 border-b border-divider/40 pb-4">
          <div>
            <h3 className="font-extrabold text-text-primary text-xs uppercase tracking-widest">
              Faturamento ({tipoPeriodo === 'mes' ? `${labelAnalise.toUpperCase()} VS ${labelComparacao.toUpperCase()}` : 'Período Personalizado'})
            </h3>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Group selectors */}
            <div className="bg-bg-secondary p-0.5 rounded-lg flex items-center border border-border">
              <button
                onClick={() => setGraficoFiltro('marca')}
                className={clsx(
                  "px-3 py-1.5 text-[9px] font-extrabold rounded-md uppercase tracking-wider transition-all duration-150 cursor-pointer",
                  graficoFiltro === 'marca' ? "bg-bg-primary text-brand-600 dark:text-brand-400 shadow-sm" : "text-text-secondary hover:text-text-primary"
                )}
              >
                POR MARCA
              </button>
              <button
                onClick={() => setGraficoFiltro('categoria')}
                className={clsx(
                  "px-3 py-1.5 text-[9px] font-extrabold rounded-md uppercase tracking-wider transition-all duration-150 cursor-pointer",
                  graficoFiltro === 'categoria' ? "bg-bg-primary text-brand-600 dark:text-brand-400 shadow-sm" : "text-text-secondary hover:text-text-primary"
                )}
              >
                POR CATEGORIA
              </button>
              <button
                onClick={() => setGraficoFiltro('vendedor')}
                className={clsx(
                  "px-3 py-1.5 text-[9px] font-extrabold rounded-md uppercase tracking-wider transition-all duration-150 cursor-pointer",
                  graficoFiltro === 'vendedor' ? "bg-bg-primary text-brand-600 dark:text-brand-400 shadow-sm" : "text-text-secondary hover:text-text-primary"
                )}
              >
                POR VENDEDOR
              </button>
              <button
                onClick={() => setGraficoFiltro('cidade')}
                className={clsx(
                  "px-3 py-1.5 text-[9px] font-extrabold rounded-md uppercase tracking-wider transition-all duration-150 cursor-pointer",
                  graficoFiltro === 'cidade' ? "bg-bg-primary text-brand-600 dark:text-brand-400 shadow-sm" : "text-text-secondary hover:text-text-primary"
                )}
              >
                POR CIDADE
              </button>
            </div>

            {/* Type Chart Toggle */}
            <div className="bg-bg-secondary p-0.5 rounded-lg flex items-center border border-border">
              <button
                onClick={() => setTipoGrafico('barras')}
                className={clsx(
                  "px-3 py-1.5 text-[9px] font-extrabold rounded-md uppercase tracking-wider transition-all duration-150 cursor-pointer",
                  tipoGrafico === 'barras' ? "bg-bg-primary text-brand-600 dark:text-brand-400 shadow-sm" : "text-text-secondary hover:text-text-primary"
                )}
              >
                BARRAS
              </button>
              <button
                onClick={() => setTipoGrafico('linhas')}
                className={clsx(
                  "px-3 py-1.5 text-[9px] font-extrabold rounded-md uppercase tracking-wider transition-all duration-150 cursor-pointer",
                  tipoGrafico === 'linhas' ? "bg-bg-primary text-brand-600 dark:text-brand-400 shadow-sm" : "text-text-secondary hover:text-text-primary"
                )}
              >
                LINHAS
              </button>
            </div>
            
            <button className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-secondary rounded-lg border border-border transition-colors">
              <Maximize2 size={12} />
            </button>
          </div>
        </div>

        {/* Legend container */}
        <div className="flex flex-wrap items-center justify-center gap-6 mb-4 text-xs font-bold select-none">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-blue-500 rounded" />
            <span className="text-text-secondary">Período de Análise ({tipoPeriodo === 'mes' ? labelAnalise : 'Análise'})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-orange-500 rounded" />
            <span className="text-text-secondary">Período de Comparação ({tipoPeriodo === 'mes' ? labelComparacao : 'Comparação'})</span>
          </div>
        </div>

        {/* Recharts variation chart */}
        <div className="h-[250px] sm:h-[350px] lg:h-[400px]">
          {rankAnalise.isLoading || rankComparacao.isLoading ? (
            <div className="h-full flex items-center justify-center text-xs text-text-secondary">Carregando dados comparativos...</div>
          ) : chartAndTableData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-text-secondary">Sem faturamento registrado para os parâmetros selecionados</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {tipoGrafico === 'barras' ? (
                <BarChart data={chartAndTableData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.4} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 9, fill: 'var(--color-text-secondary)', fontWeight: 700 }}
                    angle={-25}
                    textAnchor="end"
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 9, fill: 'var(--color-text-secondary)', fontWeight: 700 }} 
                    tickFormatter={formatBRLCompact}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-bg-tertiary)', opacity: 0.3 }} />
                  <Bar dataKey="analise" name={`Análise (${tipoPeriodo === 'mes' ? labelAnalise : 'Análise'})`} fill="#3B82F6" radius={[3, 3, 0, 0]} maxBarSize={16} />
                  <Bar dataKey="comparacao" name={`Comparação (${tipoPeriodo === 'mes' ? labelComparacao : 'Comparação'})`} fill="#F97316" radius={[3, 3, 0, 0]} maxBarSize={16} />
                </BarChart>
              ) : (
                <LineChart data={chartAndTableData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.4} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 9, fill: 'var(--color-text-secondary)', fontWeight: 700 }}
                    angle={-25}
                    textAnchor="end"
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 9, fill: 'var(--color-text-secondary)', fontWeight: 700 }}
                    tickFormatter={formatBRLCompact}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="analise" name={`Análise (${tipoPeriodo === 'mes' ? labelAnalise : 'Análise'})`} stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="comparacao" name={`Comparação (${tipoPeriodo === 'mes' ? labelComparacao : 'Comparação'})`} stroke="#F97316" strokeWidth={2.5} dot={{ r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} />
                </LineChart>
              )}
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* TIER 5: DATA TABLE */}
      <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 flex flex-col">
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-divider/40">
          <h3 className="font-extrabold text-text-primary text-xs uppercase tracking-widest">
            Detalhamento do Comparativo
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap" aria-label="Tabela Comparativa Detalhada">
            <thead>
              <tr className="border-b border-divider text-[10px] text-text-secondary/70 uppercase font-black tracking-wider">
                <th className="pb-3 px-2">
                  {graficoFiltro === 'marca' ? 'MARCA' : graficoFiltro === 'categoria' ? 'CATEGORIA' : graficoFiltro === 'vendedor' ? 'VENDEDOR' : 'CIDADE'}
                </th>
                <th className="pb-3 px-2 text-right">PERÍODO DE ANÁLISE</th>
                <th className="pb-3 px-2 text-right">PERÍODO DE COMPARAÇÃO</th>
                <th className="pb-3 px-2 text-right font-black">DIFERENÇA (R$)</th>
                <th className="pb-3 px-2 text-right font-black">VARIAÇÃO (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider/30 text-[11px]">
              {rankAnalise.isLoading || rankComparacao.isLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-text-secondary">Carregando detalhamento...</td>
                </tr>
              ) : chartAndTableData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-text-secondary">Nenhum dado comercial encontrado para esta seleção.</td>
                </tr>
              ) : (
                chartAndTableData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-bg-secondary/40 transition-colors">
                    <td className="py-3 px-2 font-bold text-text-primary uppercase">{row.name}</td>
                    <td className="py-3 px-2 text-right text-text-secondary">{formatBRL(row.analise)}</td>
                    <td className="py-3 px-2 text-right text-text-secondary">{formatBRL(row.comparacao)}</td>
                    <td className={clsx(
                      "py-3 px-2 text-right font-extrabold",
                      row.diff >= 0 ? "text-success" : "text-danger"
                    )}>
                      {row.diff >= 0 ? '+' : ''}{formatBRL(row.diff)}
                    </td>
                    <td className="py-3 px-2 text-right font-bold">
                      <div className="flex items-center justify-end gap-2">
                        <span className={row.pct >= 0 ? "text-success" : "text-danger"}>
                          {row.pct >= 0 ? '+' : ''}{row.pct.toFixed(2)}%
                        </span>
                        {/* Pequeno indicador visual de variação */}
                        <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shrink-0 hidden sm:block">
                          <div 
                            className={clsx("h-full rounded-full", row.pct >= 0 ? "bg-success" : "bg-danger")}
                            style={{ width: `${Math.min(Math.abs(row.pct), 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
