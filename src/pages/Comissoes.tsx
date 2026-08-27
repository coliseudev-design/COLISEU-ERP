import { useMemo, useState } from 'react'
import { useBranchPeriodQuery } from '../hooks/useApi'
import PeriodFilter from '../components/PeriodFilter'
import { useNavigate, useLocation, useOutletContext } from 'react-router-dom'
import clsx from 'clsx'
import {
  Users, Percent, ArrowDownAZ, Hash, Trophy, BarChart3,
  ShoppingCart, Receipt, Tag, User, DollarSign, BadgePercent,
  ChevronDown
} from 'lucide-react'
import { formatBRL, formatBRLCompact, formatNum } from '../utils/format'
import KPICard from '../components/KPICard'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

export default function Comissoes() {
  const navigate = useNavigate()
  const location = useLocation()
  const ranking = useBranchPeriodQuery<any>('/comissoes/ranking')

  const context = useOutletContext<any>() || {}
  const [localVendedor, setLocalVendedor] = useState<string>('all')
  const selectedVendedor = context.selectedVendedor !== undefined ? context.selectedVendedor : localVendedor
  const setSelectedVendedor = context.setSelectedVendedor !== undefined ? context.setSelectedVendedor : setLocalVendedor

  const dadosVendedores = ranking.data?.data || []

  // Ordena os vendedores por Total Vendido do maior para o menor
  const sortedData = useMemo(() => {
    return [...dadosVendedores].sort((a, b) => (b.total_vendas || 0) - (a.total_vendas || 0))
  }, [dadosVendedores])

  const filteredData = useMemo(() => {
    if (!selectedVendedor || selectedVendedor === 'all') return sortedData
    return sortedData.filter((v: any) => String(v.vendedor_id) === String(selectedVendedor))
  }, [sortedData, selectedVendedor])

  // Custom Tooltip for the chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-bg-primary p-3 rounded-lg shadow-card-hover border border-border text-sm">
          <p className="font-semibold text-text-primary mb-1">{payload[0].payload.vendedor}</p>
          <p className="text-brand-600 font-medium">Vendido: {formatBRL(payload[0].value)}</p>
          <p className="text-success font-medium">Comissão: {formatBRL(payload[0].payload.total_comissao)}</p>
        </div>
      );
    }
    return null;
  };

  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({})
  const toggleCard = (id: string) => {
    setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const isConsolidated = location.pathname.includes('/comercial')

  return (
    <div className="space-y-3 sm:space-y-4 pb-4" aria-label="Vendedores">
      {!isConsolidated && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold font-heading text-text-primary flex items-center gap-2">
            <Users className="text-brand-600" />
            Vendedores
          </h1>
          <PeriodFilter />
        </div>
      )}

      {ranking.isLoading ? (
        <div className="py-8 text-center text-text-secondary text-sm">Carregando dados dos vendedores...</div>
      ) : sortedData.length === 0 ? (
        <div className="py-8 text-center text-text-secondary text-sm card mt-4">Nenhum dado encontrado no período.</div>
      ) : (
        <div className="flex flex-col gap-4 sm:gap-6 mt-4">
          
          {/* Lista Resumida de Vendedores */}
          <div className="card w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 border-b border-divider pb-3">
              <div className="flex items-center gap-2">
                <Trophy size={18} className="text-warning" />
                <h2 className="font-heading font-semibold text-text-primary">Desempenho Consolidado</h2>
              </div>
              
              {/* Selector de vendedor - desktop only */}
              <div className="hidden sm:block w-full sm:w-64">
                <select
                  value={selectedVendedor}
                  onChange={(e) => setSelectedVendedor(e.target.value)}
                  className="h-10 px-3 bg-bg-secondary border border-border text-text-primary rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brand-500 w-full cursor-pointer shadow-sm"
                >
                  <option value="all">Todos os Vendedores</option>
                  {sortedData.map((v: any) => (
                    <option key={v.vendedor_id} value={v.vendedor_id}>{v.vendedor}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredData.map((v: any) => {
                const originalIndex = sortedData.findIndex((item: any) => item.vendedor_id === v.vendedor_id)
                const medal = originalIndex < 3 ? (originalIndex === 0 ? '🥇' : originalIndex === 1 ? '🥈' : '🥉') : null

                return (
                  <div 
                    key={v.vendedor_id} 
                    className="border border-divider rounded-2xl p-3 sm:p-5 bg-bg-primary hover:shadow-card-hover hover:border-brand-500/40 transition-all duration-300 relative shadow-card flex flex-col justify-between h-full hover:scale-[1.01] group"
                  >
                    {/* Badge Rank / Medal */}
                    {originalIndex < 3 ? (
                      <span className="absolute -top-3 -left-3 text-2xl drop-shadow-md select-none">
                        {medal}
                      </span>
                    ) : (
                      <span className="absolute -top-3 -left-3 w-8 h-8 flex items-center justify-center text-xs font-black rounded-full shadow-md text-white bg-brand-500">
                        {originalIndex + 1}º
                      </span>
                    )}
                  
                  <h3 className="font-semibold text-text-primary mb-3 pl-3 truncate border-b border-divider pb-2 group-hover:text-brand-500 transition-colors" title={v.vendedor}>
                    {v.vendedor}
                  </h3>
                  
                  <div className="space-y-4 flex-1 flex flex-col justify-between">
                    {/* Faturamento em Destaque */}
                    <div className="flex flex-col gap-1.5 items-center justify-center p-3 sm:p-4 bg-brand-500/[0.03] dark:bg-brand-500/[0.01] rounded-2xl border border-brand-500/20 group-hover:border-brand-500/40 transition-colors">
                      <span className="text-brand-600 dark:text-brand-400 text-[11px] sm:text-xs md:text-sm font-black uppercase tracking-widest">Total Faturado</span>
                      <span className="text-2xl font-black text-brand-500 tracking-tight">{formatBRL(v.total_vendas)}</span>
                    </div>

                    {/* Expander Button (Mobile Only) */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleCard(String(v.vendedor_id))
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 bg-bg-secondary hover:bg-bg-secondary/80 border border-divider/60 rounded-xl text-[11px] font-bold text-text-secondary sm:hidden cursor-pointer transition-all mt-1"
                    >
                      <span>{expandedCards[String(v.vendedor_id)] ? "Ocultar Detalhes" : "Ver Detalhes"}</span>
                      <ChevronDown size={14} className={clsx("transition-transform duration-300", expandedCards[String(v.vendedor_id)] && "rotate-180")} />
                    </button>

                    {/* Collapsible content (hidden on mobile by default, always visible on sm+) */}
                    <div className={clsx(
                      "space-y-4",
                      expandedCards[String(v.vendedor_id)] ? "block" : "hidden sm:block"
                    )}>
                      {/* Secundário: Vendas e Ticket */}
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <div className="flex items-center gap-2">
                          <div className="bg-bg-secondary p-1.5 rounded-md text-text-secondary">
                            <ShoppingCart size={14} />
                          </div>
                          <div>
                             <p className="text-[11px] sm:text-xs md:text-sm text-text-secondary leading-none mb-1 uppercase font-semibold">Vendas</p>
                            <p className="font-semibold text-text-primary text-sm leading-none">{formatNum(v.qtd_vendas)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="bg-bg-secondary p-1.5 rounded-md text-text-secondary">
                            <Receipt size={14} />
                          </div>
                          <div>
                             <p className="text-[11px] sm:text-xs md:text-sm text-text-secondary leading-none mb-1 uppercase font-semibold">Ticket Médio</p>
                            <p className="font-semibold text-text-primary text-sm leading-none">{formatBRL(v.ticket_medio)}</p>
                          </div>
                        </div>
                      </div>

                      {/* Destaques Inferiores */}
                      <div className="space-y-2.5 pt-3 border-t border-divider">
                        <div className="flex flex-col gap-1 text-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-text-secondary text-xs flex items-center gap-1">
                              <Trophy size={12} className="text-warning"/> Maior Venda
                            </span>
                            <span className="font-bold text-text-primary">{formatBRL(v.maior_venda)}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-text-secondary bg-bg-secondary px-2 py-1 rounded-md">
                            <User size={12} className="shrink-0" />
                            <span className="truncate font-medium" title={v.cliente_maior_venda}>{v.cliente_maior_venda}</span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1 text-sm">
                          <span className="text-text-secondary text-xs flex items-center gap-1">
                            <Tag size={12} className="text-brand-500" /> Produto Mais Vendido
                          </span>
                          <div className="text-xs text-text-primary font-medium bg-bg-secondary px-2 py-1 rounded-md truncate" title={v.melhor_produto}>
                            {v.melhor_produto}
                          </div>
                        </div>
                        
                        {v.qtd_descontos > 0 && (
                          <div className="flex justify-between items-center text-xs bg-danger/10 text-danger px-2 py-1.5 rounded-md mt-1 border border-danger/20">
                            <span className="font-medium flex items-center gap-1">
                              <BadgePercent size={12} className="shrink-0" />
                              Descontos ({v.qtd_descontos})
                            </span>
                            <span className="font-bold">{formatBRL(v.total_desconto)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Botão Detalhes */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/comercial/vendedor/${v.vendedor_id}`);
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 bg-brand-500 hover:bg-brand-600 active:scale-[0.98] text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm hover:shadow-md mt-2"
                    >
                      Detalhes
                  </button>
                  </div>
                </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
