import { usePeriodStore, PERIOD_OPTIONS, type PeriodKey } from '../store/periodStore'
import { Calendar } from 'lucide-react'
import clsx from 'clsx'
import React, { useState, useRef } from 'react'

interface Props {
  excludePeriods?: PeriodKey[]
  compact?: boolean
}

export default function PeriodFilter({ excludePeriods = [], compact = false }: Props) {
  const period = usePeriodStore((s) => s.period)
  const startDate = usePeriodStore((s) => s.startDate)
  const endDate = usePeriodStore((s) => s.endDate)
  const setPeriod = usePeriodStore((s) => s.setPeriod)
  const setCustomRange = usePeriodStore((s) => s.setCustomRange)
  const [showCustom, setShowCustom] = useState(period === 'custom')

  const scrollRef = useRef<HTMLDivElement>(null)
  const hasDragged = useRef(false)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeftState, setScrollLeftState] = useState(0)

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return
    setIsDragging(true)
    setStartX(e.pageX)
    setScrollLeftState(scrollRef.current.scrollLeft)
    hasDragged.current = false
  }

  const handleMouseLeave = () => {
    setIsDragging(false)
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return
    e.preventDefault()
    const x = e.pageX
    const walk = (x - startX) * 1.5 // Scroll sensitivity factor
    scrollRef.current.scrollLeft = scrollLeftState - walk
    if (Math.abs(x - startX) > 5) {
      hasDragged.current = true
    }
  }

  const handleClick = (p: PeriodKey) => {
    if (hasDragged.current) return // Prevent click if we were dragging
    if (p === 'custom') {
      setShowCustom(true)
      setPeriod('custom')
      if (!startDate || !endDate) {
        const today = new Date().toISOString().slice(0, 10)
        const monthAgo = new Date()
        monthAgo.setDate(monthAgo.getDate() - 30)
        setCustomRange(monthAgo.toISOString().slice(0, 10), today)
      }
    } else {
      setShowCustom(false)
      setPeriod(p)
    }
  }

  return (
    <div className={clsx(
      "w-full sm:w-auto max-w-full min-w-0 bg-bg-tertiary/40 dark:bg-bg-secondary/80 border border-divider/40 shadow-sm overflow-hidden",
      compact ? "p-0.5 rounded-lg" : "p-1 rounded-xl"
    )}>
      <div 
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        className={clsx(
          "flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden select-none [WebkitOverflowScrolling:touch]",
          isDragging ? "cursor-grabbing" : "cursor-grab"
        )}
      >
        {PERIOD_OPTIONS.filter(opt => !excludePeriods.includes(opt.key)).map((opt) => (
          <button
            key={opt.key}
            onClick={() => handleClick(opt.key)}
            className={clsx(
              'font-bold tracking-wide uppercase transition-all duration-200 whitespace-nowrap flex items-center justify-center flex-shrink-0 cursor-pointer',
              compact 
                ? 'px-2.5 py-1 text-[9px] rounded-md' 
                : 'px-3.5 py-1.5 text-[10px] md:text-xs rounded-lg flex-1 sm:flex-initial',
              period === opt.key
                ? 'bg-bg-primary dark:bg-bg-tertiary text-brand-600 dark:text-brand-400 shadow-sm'
                : 'bg-transparent text-text-secondary hover:text-text-primary hover:bg-bg-primary/30 border border-transparent active:scale-[0.98]',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {showCustom && period === 'custom' && (() => {
        const startMonth = startDate ? parseInt(startDate.split('-')[1], 10) : new Date().getMonth() + 1;
        const startYear = startDate ? parseInt(startDate.split('-')[0], 10) : new Date().getFullYear();
        const endMonth = endDate ? parseInt(endDate.split('-')[1], 10) : new Date().getMonth() + 1;
        const endYear = endDate ? parseInt(endDate.split('-')[0], 10) : new Date().getFullYear();
        const years = Array.from({ length: 10 }, (_, i) => 2020 + i);

        const handleCustomDateChange = (sM: number, sY: number, eM: number, eY: number) => {
          const startStr = `${sY}-${String(sM).padStart(2, '0')}-01`;
          const lastDay = new Date(eY, eM, 0).getDate();
          const endStr = `${eY}-${String(eM).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
          setCustomRange(startStr, endStr);
        };

        return (
          <div className="mt-3 pt-3 border-t border-divider/40 flex items-center gap-2.5 flex-wrap animate-in slide-in-from-top-1 duration-200 text-xs">
            <span className="font-bold text-text-secondary uppercase text-[10px]">De:</span>
            <select
              value={startMonth}
              onChange={(e) => handleCustomDateChange(parseInt(e.target.value), startYear, endMonth, endYear)}
              className="bg-bg-primary border border-divider text-text-primary rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-brand-500 transition-all duration-300 cursor-pointer font-bold"
              aria-label="Mês de Início"
            >
              {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'].map((m, idx) => (
                <option key={m} value={idx + 1}>{m}</option>
              ))}
            </select>
            <select
              value={startYear}
              onChange={(e) => handleCustomDateChange(startMonth, parseInt(e.target.value), endMonth, endYear)}
              className="bg-bg-primary border border-divider text-text-primary rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-brand-500 transition-all duration-300 cursor-pointer font-bold"
              aria-label="Ano de Início"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            <span className="font-bold text-text-secondary uppercase text-[10px]">Até:</span>
            <select
              value={endMonth}
              onChange={(e) => handleCustomDateChange(startMonth, startYear, parseInt(e.target.value), endYear)}
              className="bg-bg-primary border border-divider text-text-primary rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-brand-500 transition-all duration-300 cursor-pointer font-bold"
              aria-label="Mês de Término"
            >
              {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'].map((m, idx) => (
                <option key={m} value={idx + 1}>{m}</option>
              ))}
            </select>
            <select
              value={endYear}
              onChange={(e) => handleCustomDateChange(startMonth, startYear, endMonth, parseInt(e.target.value))}
              className="bg-bg-primary border border-divider text-text-primary rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-brand-500 transition-all duration-300 cursor-pointer font-bold"
              aria-label="Ano de Término"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        );
      })()}
    </div>
  )
}
