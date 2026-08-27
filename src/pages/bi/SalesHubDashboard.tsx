import { useState, useMemo, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useBiPeriodQuery } from '../../hooks/useBiPeriodQuery';
import { useBranchPeriodQuery } from '../../hooks/useApi';
import { BIService } from '../../services/biApi';
import { BiPeriodFilter } from '../../types/bi.types';
import { Box, DollarSign, Target, CheckCircle2, X, Filter, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatBRL, formatNum, formatBRLCompact } from '../../utils/format';
import clsx from 'clsx';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-bg-primary border border-border shadow-card-hover p-3 rounded-lg z-50">
        <p className="text-text-secondary text-xs mb-1 font-medium">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm font-bold" style={{ color: entry.color || 'var(--color-text-primary)' }}>
            {entry.name === 'total' || entry.name === 'valor' || entry.name === 'value'
              ? formatBRL(entry.value)
              : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function SalesHubDashboard() {
  const [isMobile, setIsMobile] = useState(false);
  const [showFiltersSheet, setShowFiltersSheet] = useState(false);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { filter } = useOutletContext<{ filter: BiPeriodFilter }>();

  const [selectedVendedor, setSelectedVendedor] = useState<string>('all');
  const [selectedCidade, setSelectedCidade] = useState<string>('all');
  const [selectedGrupo, setSelectedGrupo] = useState<string>('all');
  const [selectedMarca, setSelectedMarca] = useState<string>('all');

  // Fetch unfiltered lists to populate dropdown options
  const vdFull = useBranchPeriodQuery<any>('/ranking/vendedores', { limit: 100 });
  const cidFull = useBranchPeriodQuery<any>('/ranking/cidades', { limit: 100 });
  const catFull = useBranchPeriodQuery<any>('/ranking/categorias', { limit: 100 });
  const marFull = useBranchPeriodQuery<any>('/ranking/marcas', { limit: 100 });

  const activeFilter = useMemo(() => ({
    ...filter,
    vendedor_id: selectedVendedor !== 'all' ? selectedVendedor : undefined,
    cidade: selectedCidade !== 'all' ? selectedCidade : undefined,
    grupo: selectedGrupo !== 'all' ? selectedGrupo : undefined,
    marca: selectedMarca !== 'all' ? selectedMarca : undefined
  }), [filter, selectedVendedor, selectedCidade, selectedGrupo, selectedMarca]);

  const { data, isLoading, isError } = useBiPeriodQuery(
    ['bi', 'sales-hub', activeFilter],
    BIService.getSalesHub,
    activeFilter
  );

  const [statusFilter, setStatusFilter] = useState('TODOS');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  const { filteredOrders, currentOrders, totalPages, availableStatuses } = useMemo(() => {
    const orders = data?.recent_orders || [];
    
    const statuses = Array.from(new Set(orders.map((o: any) => o.status))).filter(Boolean) as string[];
    
    const filtered = statusFilter === 'TODOS' 
      ? orders 
      : orders.filter((o: any) => o.status === statusFilter);
    
    const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentOrders = filtered.slice(startIndex, startIndex + itemsPerPage);
    
    return { filteredOrders: filtered, currentOrders, totalPages, availableStatuses: statuses };
  }, [data?.recent_orders, statusFilter, currentPage]);

  const handleFilterChange = (newStatus: string) => {
    setStatusFilter(newStatus);
    setCurrentPage(1);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-text-secondary">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500 mr-3"></div>
        Carregando Hub de Vendas...
      </div>
    );
  }

  const mockSellers = data?.top_sellers || [];

  const mockRecentOrders: any[] = [];

  const heatmapData = Array.from({ length: 4 }).map(() => 
    Array.from({ length: 7 }).map(() => Math.floor(Math.random() * 10))
  );

  return (
    <div aria-label="Hub de Vendas Dashboard" className="space-y-6 animate-in fade-in duration-300">
      
      {/* HEADER ACTIONS */}
      {isMobile && (
        <div className="mb-2">
          <button
            onClick={() => setShowFiltersSheet(true)}
            className="w-full sm:w-auto px-4 h-11 bg-bg-primary border border-divider text-text-primary rounded-xl text-xs font-bold shadow-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer shrink-0"
          >
            <Filter size={14} className="text-brand-500" />
            <span>Filtros Comerciais</span>
            {(selectedVendedor !== 'all' || selectedCidade !== 'all' || selectedGrupo !== 'all' || selectedMarca !== 'all') && (
              <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
            )}
          </button>
        </div>
      )}

      {/* DESKTOP FILTERS BAR */}
      {!isMobile && (
        <div className="bg-bg-primary border border-divider shadow-card rounded-2xl p-4 flex flex-wrap items-center gap-3 w-full animate-in fade-in duration-200">
          <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest mr-2 flex items-center gap-1.5">
            <Filter size={13} className="text-brand-500" />
            Filtros:
          </span>
          
          {/* VENDEDOR */}
          <select
            aria-label="Selecionar Vendedor"
            value={selectedVendedor}
            onChange={(e) => setSelectedVendedor(e.target.value)}
            className="px-3 py-1.5 bg-bg-secondary border border-divider text-text-primary rounded-lg text-xs font-bold shadow-sm focus:outline-none focus:ring-1 focus:ring-brand-500 transition-all duration-300 cursor-pointer"
          >
            <option value="all">Todos os Vendedores</option>
            {vdFull.data?.data?.map((seller: any) => (
              <option key={seller.id} value={seller.id}>
                {seller.nome}
              </option>
            ))}
          </select>

          {/* CIDADE */}
          <select
            aria-label="Selecionar Cidade"
            value={selectedCidade}
            onChange={(e) => setSelectedCidade(e.target.value)}
            className="px-3 py-1.5 bg-bg-secondary border border-divider text-text-primary rounded-lg text-xs font-bold shadow-sm focus:outline-none focus:ring-1 focus:ring-brand-500 transition-all duration-300 cursor-pointer"
          >
            <option value="all">Todas as Cidades</option>
            {cidFull.data?.data?.map((city: any) => (
              <option key={city.nome} value={city.nome}>
                {city.nome}
              </option>
            ))}
          </select>

          {/* GRUPO */}
          <select
            aria-label="Selecionar Grupo"
            value={selectedGrupo}
            onChange={(e) => setSelectedGrupo(e.target.value)}
            className="px-3 py-1.5 bg-bg-secondary border border-divider text-text-primary rounded-lg text-xs font-bold shadow-sm focus:outline-none focus:ring-1 focus:ring-brand-500 transition-all duration-300 cursor-pointer"
          >
            <option value="all">Todos os Grupos</option>
            <option value="Sem Grupo">Sem Grupo</option>
            {catFull.data?.data?.map((cat: any) => (
              cat.nome !== 'Sem Grupo' && cat.nome !== 'S/ GRUPO' && (
                <option key={cat.nome} value={cat.nome}>
                  {cat.nome}
                </option>
              )
            ))}
          </select>

          {/* MARCA */}
          <select
            aria-label="Selecionar Marca"
            value={selectedMarca}
            onChange={(e) => setSelectedMarca(e.target.value)}
            className="px-3 py-1.5 bg-bg-secondary border border-divider text-text-primary rounded-lg text-xs font-bold shadow-sm focus:outline-none focus:ring-1 focus:ring-brand-500 transition-all duration-300 cursor-pointer"
          >
            <option value="all">Todas as Marcas</option>
            <option value="Sem Marca">Sem Marca</option>
            {marFull.data?.data?.map((brand: any) => (
              brand.nome !== 'Sem Marca' && brand.nome !== 'S/ MARCA' && (
                <option key={brand.nome} value={brand.nome}>
                  {brand.nome}
                </option>
              )
            ))}
          </select>
        </div>
      )}

      {/* TOP KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* VOLUME DE PEDIDOS */}
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 relative overflow-hidden">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 bg-success/10 text-success rounded-lg">
              <Box size={16} />
            </div>
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Volume de Pedidos</span>
          </div>
          <div className="text-3xl font-extrabold text-text-primary pl-1 mb-1">
            {formatNum(data?.total_pedidos || 0)} <span className="text-xs font-medium text-text-muted lowercase">pedidos</span>
          </div>
          <div className="flex justify-end text-[10px] text-success font-bold mt-1">100% atingido</div>
          <div className="w-full bg-bg-secondary h-1 mt-1 rounded-full overflow-hidden">
             <div className="bg-success h-full w-[100%]"></div>
          </div>
        </div>

        {/* FATURAMENTO */}
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 relative overflow-hidden">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 bg-warning/10 text-warning rounded-lg">
              <DollarSign size={16} />
            </div>
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Faturamento</span>
          </div>
          <div className="text-3xl font-extrabold text-text-primary pl-1 mb-1">
            {formatBRL(data?.faturamento_total || 0)}
          </div>
          <div className="flex justify-end text-[10px] text-warning font-bold mt-1">85% atingido</div>
          <div className="w-full bg-bg-secondary h-1 mt-1 rounded-full overflow-hidden">
             <div className="bg-warning h-full w-[85%]"></div>
          </div>
        </div>

        {/* TICKET MÉDIO */}
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 relative overflow-hidden">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 bg-cyan-500/10 text-cyan-500 rounded-lg">
              <Target size={16} />
            </div>
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Ticket Médio</span>
          </div>
          <div className="text-3xl font-extrabold text-text-primary pl-1 mb-1">
            {formatBRL(data?.ticket_medio || 0)}
          </div>
          <div className="flex justify-end text-[10px] text-cyan-500 font-bold mt-1">92% atingido</div>
          <div className="w-full bg-bg-secondary h-1 mt-1 rounded-full overflow-hidden">
             <div className="bg-cyan-500 h-full w-[92%]"></div>
          </div>
        </div>
      </div>

      {/* MAPA DE ATIVIDADE DE VENDAS (Heatmap Simples) */}
      <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5">
        <h3 className="font-bold text-text-primary text-sm uppercase tracking-wider mb-1">Mapa de Atividade de Vendas</h3>
        <p className="text-xs text-text-muted mb-4">Heatmap de volume de vendas na semana (seg-dom)</p>
        
        <div className="w-full overflow-x-auto">
          <div className="min-w-[600px] border border-divider rounded-lg p-2">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'].map(d => (
                <div key={d} className="text-center text-[10px] font-bold text-text-muted uppercase">{d}</div>
              ))}
            </div>
            <div className="flex flex-col gap-1">
              {heatmapData.map((row, rowIdx) => (
                <div key={rowIdx} className="grid grid-cols-7 gap-1">
                  {row.map((val, colIdx) => (
                    <div 
                      key={colIdx} 
                      className="h-10 sm:h-12 md:h-16 rounded-md border border-divider/30 transition-colors hover:border-brand-500"
                      style={{ 
                        backgroundColor: val === 0 ? 'var(--color-bg-secondary)' : `rgba(16, 185, 129, ${0.1 + (val / 10) * 0.9})`
                      }}
                      title={`${val} vendas`}
                    ></div>
                  ))}
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center mt-3 px-2">
              <span className="text-[10px] text-text-muted uppercase">Baixo</span>
              <span className="text-[10px] text-text-muted uppercase">Alto</span>
            </div>
          </div>
        </div>
      </div>

      {/* RANKING DE VENDEDORES & COMPARATIVO */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* RANKING (Tabela) */}
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 flex flex-col">
          <h3 className="font-bold text-text-primary text-sm uppercase tracking-wider mb-1">Ranking de Vendedores</h3>
          <p className="text-xs text-text-muted mb-4">Performance do time comercial de vendas</p>
          
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-divider text-[10px] text-text-muted uppercase font-bold tracking-wider">
                  <th className="pb-2 w-8 text-center">#</th>
                  <th className="pb-2">VENDEDOR</th>
                  <th className="pb-2 text-right">FATURADO</th>
                  <th className="pb-2 text-right">SHARE %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider/30 text-xs">
                {mockSellers.map((seller: any, i: number) => (
                  <tr key={i} className="hover:bg-bg-secondary transition-colors group">
                    <td className="py-3 text-center text-text-muted font-mono">{i+1}</td>
                    <td className="py-3 font-bold text-text-primary flex items-center gap-2">
                      <CheckCircle2 size={12} className="text-brand-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      {seller.name}
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-text-primary">{formatBRL(seller.value)}</td>
                    <td className="py-3 text-right font-bold text-warning">{seller.share.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* COMPARATIVO (Gráfico) */}
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 flex flex-col">
          <h3 className="font-bold text-text-primary text-sm uppercase tracking-wider mb-1">Comparativo de Vendas</h3>
          <p className="text-xs text-text-muted mb-4">Visualização de performance da equipe</p>
          
          <div className="flex-1 min-h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockSellers} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" opacity={0.3} />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={{ stroke: 'var(--color-border)' }} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: 'var(--color-text-secondary)', fontWeight: 500 }} 
                  width={isMobile ? 50 : 60} 
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-bg-tertiary)', opacity: 0.4 }} />
                <Bar dataKey="value" fill="#10B981" radius={[0, 4, 4, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* FILA DE PEDIDOS RECENTES */}
      <div className="bg-bg-primary border border-border shadow-card rounded-xl p-4 sm:p-5 flex flex-col">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
          <h3 className="font-bold text-text-primary text-sm uppercase tracking-wider">Fila de Pedidos Recentes</h3>
          
          {!isMobile && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted font-medium">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => handleFilterChange(e.target.value)}
                className="bg-bg-secondary border border-divider rounded-lg text-sm px-3 py-1.5 text-text-primary focus:outline-none focus:border-brand-500 cursor-pointer font-bold"
              >
                <option value="TODOS">Todos os Status</option>
                {availableStatuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        
        {isMobile ? (
          <div className="grid grid-cols-1 gap-3.5">
            {currentOrders.map((order: any, i: number) => {
              const isFaturado = order.status && ['FATURADO', 'FINALIZADO'].includes(order.status.trim().toUpperCase());
              const isCancelado = order.status && ['CANCELADO', 'DEVOLVIDO'].includes(order.status.trim().toUpperCase());
              
              return (
                <div key={order.id || i} className="p-4 border border-divider/50 rounded-2xl bg-bg-secondary/20 flex flex-col gap-2.5 shadow-sm hover:border-divider transition-all duration-300">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-[10px] text-text-muted font-black">Nº NOTA: {order.numero_nota}</span>
                    <span className={clsx(
                      "text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider border",
                      isFaturado ? 'bg-success/15 text-success border-success/10' :
                      isCancelado ? 'bg-danger/15 text-danger border-danger/10' :
                      'bg-warning/15 text-warning border-warning/10'
                    )}>
                      {order.status ? order.status.trim() : 'NORMAL'}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-text-primary leading-snug">{order.cliente}</h4>
                    <p className="text-[10px] text-text-secondary mt-1 font-medium">Vendedor: {order.vendedor}</p>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-divider/20 mt-1">
                    <div className="flex items-center gap-1 text-[11px] text-text-secondary font-bold">
                      <Calendar size={13} className="text-text-muted" />
                      {order.data}
                    </div>
                    <div className="text-sm font-mono font-extrabold text-success">
                      {formatBRL(order.valor)}
                    </div>
                  </div>
                </div>
              );
            })}
            {currentOrders.length === 0 && (
              <p className="text-center text-xs text-text-muted py-8 font-semibold">Nenhum pedido encontrado.</p>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-x-auto border border-divider/50 rounded-2xl shadow-sm">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b border-divider text-[10px] text-text-secondary uppercase font-black tracking-wider bg-bg-secondary/60">
                  <th className="py-3.5 px-5 font-mono text-[9px]">CÓD</th>
                  <th className="py-3.5 px-5">Nº NOTA</th>
                  <th className="py-3.5 px-5">CLIENTE</th>
                  <th className="py-3.5 px-5">VENDEDOR</th>
                  <th className="py-3.5 px-5">DATA</th>
                  <th className="py-3.5 px-5 text-right">VALOR TOTAL</th>
                  <th className="py-3.5 px-5 text-center">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider/20">
                {currentOrders.map((order: any, i: number) => (
                  <tr key={order.id || i} className="hover:bg-bg-secondary/40 transition-colors">
                    <td className="py-3.5 px-5 font-mono text-text-muted">{order.id}</td>
                    <td className="py-3.5 px-5 text-brand-500 font-extrabold">{order.numero_nota}</td>
                    <td className="py-3.5 px-5 text-text-primary font-bold truncate max-w-[200px]" title={order.cliente}>{order.cliente}</td>
                    <td className="py-3.5 px-5 text-text-secondary font-medium">{order.vendedor}</td>
                    <td className="py-3.5 px-5 text-text-muted">{order.data}</td>
                    <td className="py-3.5 px-5 text-right font-mono font-extrabold text-success">{formatBRL(order.valor)}</td>
                    <td className="py-3.5 px-5 text-center">
                      <span className={clsx(
                        "text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider border",
                        order.status && ['FATURADO', 'FINALIZADO'].includes(order.status.trim().toUpperCase())
                          ? 'bg-success/15 text-success border-success/10'
                          : order.status && ['CANCELADO', 'DEVOLVIDO'].includes(order.status.trim().toUpperCase())
                          ? 'bg-danger/15 text-danger border-danger/10'
                          : 'bg-warning/15 text-warning border-warning/10'
                      )}>
                        {order.status ? order.status.trim() : 'NORMAL'}
                      </span>
                    </td>
                  </tr>
                ))}
                {currentOrders.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-text-muted font-bold">Nenhum pedido encontrado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-4 pt-4 border-t border-divider">
            <span className="text-xs text-text-muted">
              Mostrando {currentOrders.length} de {filteredOrders.length} pedidos
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-xl text-xs font-bold border border-divider hover:bg-bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-sm"
              >
                Anterior
              </button>
              <div className="flex items-center px-2">
                <span className="text-xs text-text-muted font-medium">Página {currentPage} de {totalPages}</span>
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-xl text-xs font-bold border border-divider hover:bg-bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-sm"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>

      {isError && (
        <div className="bg-danger/10 border border-danger/20 text-danger p-3 rounded-lg text-sm mt-4">
          Aviso: Os dados não puderam ser carregados devido a uma falha de conexão com o banco de dados/API.
        </div>
      )}

      {/* BottomSheet for Filters on Mobile */}
      {isMobile && showFiltersSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setShowFiltersSheet(false)}
          />
          {/* Sheet container */}
          <div className="relative w-full max-h-[85vh] bg-bg-primary rounded-t-3xl border-t border-divider shadow-2xl flex flex-col z-10 animate-in slide-in-from-bottom duration-300">
            {/* Grab handle decoration */}
            <div className="w-12 h-1.5 bg-bg-tertiary rounded-full mx-auto my-3 shrink-0" />
            
            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-4 border-b border-divider shrink-0">
              <h3 className="text-base font-bold text-text-primary">Filtros Comerciais</h3>
              <button
                onClick={() => setShowFiltersSheet(false)}
                className="p-1.5 text-text-secondary hover:bg-bg-secondary rounded-lg cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Filters Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 pb-10">
              {/* VENDEDOR */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-secondary uppercase">Vendedor</label>
                <select
                  value={selectedVendedor}
                  onChange={(e) => setSelectedVendedor(e.target.value)}
                  className="w-full h-11 px-3 bg-bg-secondary border border-divider text-text-primary rounded-xl text-sm font-semibold cursor-pointer"
                >
                  <option value="all">Todos os Vendedores</option>
                  {vdFull.data?.data?.map((seller: any) => (
                    <option key={seller.id} value={seller.id}>{seller.nome}</option>
                  ))}
                </select>
              </div>

              {/* CIDADE */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-secondary uppercase">Cidade</label>
                <select
                  value={selectedCidade}
                  onChange={(e) => setSelectedCidade(e.target.value)}
                  className="w-full h-11 px-3 bg-bg-secondary border border-divider text-text-primary rounded-xl text-sm font-semibold cursor-pointer"
                >
                  <option value="all">Todas as Cidades</option>
                  {cidFull.data?.data?.map((city: any) => (
                    <option key={city.nome} value={city.nome}>{city.nome}</option>
                  ))}
                </select>
              </div>

              {/* GRUPO */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-secondary uppercase">Grupo</label>
                <select
                  value={selectedGrupo}
                  onChange={(e) => setSelectedGrupo(e.target.value)}
                  className="w-full h-11 px-3 bg-bg-secondary border border-divider text-text-primary rounded-xl text-sm font-semibold cursor-pointer"
                >
                  <option value="all">Todos os Grupos</option>
                  <option value="Sem Grupo">Sem Grupo</option>
                  {catFull.data?.data?.map((cat: any) => (
                    cat.nome !== 'Sem Grupo' && cat.nome !== 'S/ GRUPO' && (
                      <option key={cat.nome} value={cat.nome}>{cat.nome}</option>
                    )
                  ))}
                </select>
              </div>

              {/* MARCA */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-secondary uppercase">Marca</label>
                <select
                  value={selectedMarca}
                  onChange={(e) => setSelectedMarca(e.target.value)}
                  className="w-full h-11 px-3 bg-bg-secondary border border-divider text-text-primary rounded-xl text-sm font-semibold cursor-pointer"
                >
                  <option value="all">Todas as Marcas</option>
                  <option value="Sem Marca">Sem Marca</option>
                  {marFull.data?.data?.map((brand: any) => (
                    brand.nome !== 'Sem Marca' && brand.nome !== 'S/ MARCA' && (
                      <option key={brand.nome} value={brand.nome}>{brand.nome}</option>
                    )
                  ))}
                </select>
              </div>

              {/* STATUS DE PEDIDOS */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-secondary uppercase">Status do Pedido</label>
                <select
                  value={statusFilter}
                  onChange={(e) => handleFilterChange(e.target.value)}
                  className="w-full h-11 px-3 bg-bg-secondary border border-divider text-text-primary rounded-xl text-sm font-semibold cursor-pointer"
                >
                  <option value="TODOS">Todos os Status</option>
                  {availableStatuses.map((status: string) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sticky Action Footer */}
            <div className="p-4 border-t border-divider bg-bg-primary flex gap-3 shrink-0">
              <button
                onClick={() => {
                  setSelectedVendedor('all');
                  setSelectedCidade('all');
                  setSelectedGrupo('all');
                  setSelectedMarca('all');
                  setStatusFilter('TODOS');
                  setShowFiltersSheet(false);
                }}
                className="flex-1 py-3 border border-divider text-text-secondary font-bold text-sm rounded-xl active:bg-bg-secondary cursor-pointer"
              >
                Limpar
              </button>
              <button
                onClick={() => setShowFiltersSheet(false)}
                className="flex-1 py-3 bg-brand-500 text-white font-bold text-sm rounded-xl active:bg-brand-600 shadow-sm cursor-pointer"
              >
                Aplicar Filtros
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
