import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import PeriodFilter from '../components/PeriodFilter';
import { usePeriodStore, PERIOD_OPTIONS, periodToParams } from '../store/periodStore';
import { BiPeriodFilter } from '../types/bi.types';
import { useBranchParam } from '../contexts/BranchContext';
import { Wallet, LineChart, ShieldAlert, X, FileText, Sliders, ChevronDown } from 'lucide-react';
import clsx from 'clsx';

export default function FinanceiroConsolidado() {
  const periodState = usePeriodStore();
  const location = useLocation();
  const navigate = useNavigate();
  const branchParam = useBranchParam();

  const [isMobile, setIsMobile] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const filter: BiPeriodFilter = {
    ...periodToParams(periodState),
    ...branchParam
  };

  const tabs = [
    { path: '/financeiro-consolidado', label: 'Gestão Financeira', shortLabel: 'Gestão', icon: Wallet },
    { path: '/financeiro-consolidado/fluxo-caixa', label: 'Fluxo de Caixa', shortLabel: 'Fluxo', icon: LineChart }
  ];

  return (
    <div className="flex flex-col h-full space-y-3 md:space-y-4 animate-in fade-in duration-300" aria-label="Módulo Financeiro">
      
      {/* Header do Módulo Financeiro */}
      <div className="bg-bg-primary border border-divider rounded-2xl p-4 sm:p-5 flex flex-col gap-4 shadow-card">
        {/* Line 1: Title */}
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight flex items-center gap-2 whitespace-nowrap">
            <Wallet className="text-brand-500" size={24} />
            Módulo Financeiro
          </h1>
        </div>

        {/* Line 2: Desktop Period Filter */}
        <div className="hidden md:flex items-center w-full">
          <PeriodFilter excludePeriods={['yesterday', 'lastMonth', 'last12m']} />
        </div>
      </div>

      {/* Tabs de Navegação + Filtros Mês/Ano */}
      <div className="hidden md:flex items-center justify-between gap-4 w-full">
        {/* Tabs de Navegação Financeira */}
        <div className="bg-bg-primary/80 backdrop-blur-md p-1 rounded-2xl border border-divider shadow-sm max-w-md w-full flex">
          {tabs.map((tab) => {
            const isActive = 
              tab.path === '/financeiro-consolidado'
                ? location.pathname === '/financeiro-consolidado' || location.pathname === '/financeiro-consolidado/gestao'
                : location.pathname.startsWith(tab.path);
                
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={clsx(
                  "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer",
                  isActive
                    ? "bg-brand-500 text-white shadow-md"
                    : "text-text-secondary hover:bg-bg-secondary hover:text-text-primary"
                )}
              >
                <tab.icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Mês / Ano Filters next to tabs */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-bg-primary border border-border rounded-xl px-3 py-1.5 shadow-sm text-xs font-bold text-text-primary">
            <span className="text-text-muted">Mês:</span>
            <span>Mês Atual</span>
            <ChevronDown size={14} className="text-text-muted" />
          </div>
          <div className="flex items-center gap-2 bg-bg-primary border border-border rounded-xl px-3 py-1.5 shadow-sm text-xs font-bold text-text-primary">
            <span className="text-text-muted">Ano:</span>
            <span>2026</span>
            <ChevronDown size={14} className="text-text-muted" />
          </div>
        </div>
      </div>

      {/* Mobile Bottom Sheet Filter Modal */}
      {showMobileFilters && (
        <div className="fixed inset-0 z-50 flex items-end justify-center select-none animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setShowMobileFilters(false)}
          />
          {/* Bottom Sheet Drawer */}
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl p-6 shadow-2xl z-10 animate-in slide-in-from-bottom duration-300 max-h-[85vh] overflow-y-auto flex flex-col pb-8">
            {/* Handle bar */}
            <div className="w-12 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-5 shrink-0" />

            <div className="flex justify-between items-center mb-6 shrink-0">
              <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">
                Filtrar Financeiro
              </h3>
              <button
                onClick={() => setShowMobileFilters(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-6 flex-1">
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2.5 pl-1">
                  Período
                </span>
                <PeriodFilter excludePeriods={['yesterday', 'lastMonth', 'last12m']} compact={true} />
              </div>
            </div>

            <div className="mt-8 shrink-0">
              <button
                onClick={() => setShowMobileFilters(false)}
                className="w-full py-3.5 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-2xl text-xs shadow-md transition-all active:scale-[0.98] cursor-pointer"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MOBILE STICKY BOTTOM NAVIGATION ──────────────────────────────── */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800/80 py-2 px-4 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] select-none">
          <div className="flex items-center justify-around w-full max-w-md mx-auto">
            {tabs.map((tab) => {
              const isActive = 
                tab.path === '/financeiro-consolidado'
                  ? location.pathname === '/financeiro-consolidado' || location.pathname === '/financeiro-consolidado/gestao'
                  : location.pathname.startsWith(tab.path);
              return (
                <button
                  key={tab.path}
                  onClick={() => navigate(tab.path)}
                  className={clsx(
                    "flex flex-col items-center justify-center py-1 flex-1 cursor-pointer transition-all",
                    isActive ? "text-[#00a896]" : "text-slate-400 dark:text-slate-500"
                  )}
                >
                  <tab.icon size={18} />
                  <span className="text-[8px] font-bold uppercase tracking-wider mt-1">{tab.shortLabel}</span>
                </button>
              );
            })}
            {/* Filtros Trigger button */}
            <button
              onClick={() => setShowMobileFilters(true)}
              className="flex flex-col items-center justify-center py-1 flex-1 cursor-pointer transition-all text-slate-400 dark:text-slate-500 relative"
            >
              {periodState.period !== 'thisMonth' && (
                <span className="absolute top-1 right-6 w-2 h-2 rounded-full bg-emerald-500 border border-white" />
              )}
              <Sliders size={18} />
              <span className="text-[8px] font-bold uppercase tracking-wider mt-1">Filtros</span>
            </button>
          </div>
        </div>
      )}

      {/* Conteúdo Dinâmico */}
      <div className={clsx("flex-1 min-h-0 overflow-y-auto pr-1", isMobile ? "pb-28" : "")}>
        <Outlet context={{ filter }} />
      </div>
    </div>
  );
}
