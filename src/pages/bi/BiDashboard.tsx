import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import PeriodFilter from '../../components/PeriodFilter';
import { PageFilters } from '../../components/PageFilters';
import { usePeriodStore, PERIOD_OPTIONS, periodToParams } from '../../store/periodStore';
import { BiPeriodFilter } from '../../types/bi.types';
import { useBranchParam } from '../../contexts/BranchContext';
import { X } from 'lucide-react';

export default function BiDashboard() {
  const periodState = usePeriodStore();
  const location = useLocation();
  const branchParam = useBranchParam();
  
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Contexto de filtros para páginas filhas via Outlet.
  // Usa periodToParams() para garantir snake_case (start_date/end_date) conforme padrão da API.
  // branchParam injeta depto_id e centro_custo quando uma filial está selecionada.
  const filter: BiPeriodFilter = {
    ...periodToParams(periodState),
    ...branchParam
  };

  // Radar 360 usa filtros próprios internos — ocultar filtro global
  const isRadar360 = location.pathname.includes('/bi/customer');

  const showFilter = !['/bi/abc', '/bi/customer-analytics', '/bi/goals', '/bi/heatmap', '/bi/comparative'].some(
    p => location.pathname.includes(p)
  ) && !isRadar360;

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Filtros Globais do BI teleportados para a linha do título */}
      {showFilter && (
        <PageFilters>
          <div className="flex items-center gap-1.5 bg-bg-secondary/40 border border-border/40 p-1 rounded-xl text-xs shadow-sm">
            <span className="text-[9px] font-bold text-text-secondary/80 uppercase tracking-widest pl-1">Período:</span>
            <PeriodFilter excludePeriods={['yesterday']} />
          </div>
        </PageFilters>
      )}

      {/* Mobile Sticky Bar trigger */}
      {isMobile && showFilter && (
        <div className="lg:hidden flex items-center justify-between gap-3 bg-bg-primary border border-border-primary shadow-sm rounded-xl p-3 animate-in slide-in-from-top duration-300">
          <div className="flex-1 min-w-0">
            <span className="text-[9px] font-bold text-text-muted uppercase block">Período Selecionado</span>
            <span className="text-xs font-bold text-text-primary truncate block">
              {periodState.period === 'custom' 
                ? 'Personalizado' 
                : PERIOD_OPTIONS.find(o => o.key === periodState.period)?.label || 'Mês atual'}
            </span>
          </div>
          <button
            onClick={() => setShowMobileFilters(true)}
            className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            Filtros
          </button>
        </div>
      )}

      {/* Mobile Drawer Filter Modal */}
      {showMobileFilters && showFilter && (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-end animate-in fade-in duration-200">
          <div className="w-full max-w-[320px] bg-bg-primary h-full shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300">
            <div className="p-5 flex-1 overflow-y-auto space-y-5">
              <div className="flex justify-between items-center border-b border-divider pb-3">
                <h4 className="font-extrabold text-sm text-text-primary uppercase tracking-wider">Filtros de Período</h4>
                <button
                  onClick={() => setShowMobileFilters(false)}
                  className="text-text-muted hover:text-text-primary"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Period Filter container */}
              <div className="space-y-2">
                <span className="text-[10px] font-extrabold text-text-secondary uppercase tracking-wider block">Período</span>
                <PeriodFilter excludePeriods={['yesterday']} compact={true} />
              </div>
            </div>

            <div className="p-4 border-t border-divider bg-bg-secondary/40 flex flex-col gap-2">
              <button
                onClick={() => setShowMobileFilters(false)}
                className="w-full h-12 bg-brand-500 hover:bg-brand-600 text-white rounded-2xl text-xs font-bold shadow-sm cursor-pointer transition-all flex items-center justify-center"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo Dinâmico das Abas/Dashboards */}
      <div className="flex-1 overflow-auto">
        <Outlet context={{ filter }} />
      </div>
    </div>
  );
}
