import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import clsx from 'clsx';
import { useBiPeriodQuery } from '../../hooks/useBiPeriodQuery';
import { BIService } from '../../services/biApi';
import { BiPeriodFilter } from '../../types/bi.types';
import { 
  Wallet, ArrowUpRight, ArrowDownRight, DollarSign, CreditCard, 
  AlertTriangle, TrendingUp, TrendingDown, BarChart3, Clock, Search, ChevronDown
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatBRL, formatBRLCompact } from '../../utils/format';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-bg-primary border border-border shadow-card-hover p-3 rounded-lg z-50 min-w-[150px]">
        <p className="text-text-primary font-bold mb-2 text-sm">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex justify-between items-center gap-4 text-xs font-medium mb-1">
            <span style={{ color: entry.color }}>{entry.name}:</span>
            <span className="font-bold text-text-primary">
              {formatBRL(entry.value)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function FinancialIntelligenceDashboard() {
  const { filter } = useOutletContext<{ filter: BiPeriodFilter }>();

  const [expandedReceberIndex, setExpandedReceberIndex] = useState<number | null>(null);
  const [expandedPagarIndex, setExpandedPagarIndex] = useState<number | null>(null);

  const { data, isLoading } = useBiPeriodQuery(
    ['bi', 'financial'],
    BIService.getFinancialIntelligence,
    filter
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-text-secondary">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500 mr-3"></div>
        Carregando Gestão de Caixa...
      </div>
    );
  }

  // Mocks matching the reference image layout
  const projecaoData = [
    { periodo: 'Próx. 7 dias', entradas: 2584.30, saidas: 0, saldo: 2584.30 },
    { periodo: 'Próx. 15 dias', entradas: 8668.97, saidas: 0, saldo: 8668.97 },
    { periodo: 'Próx. 30 dias', entradas: 12244.47, saidas: 0, saldo: 12244.47 },
    { periodo: 'Próx. 60 dias', entradas: 15138.24, saidas: 0, saldo: 15138.24 },
    { periodo: 'Próx. 90 dias', entradas: 17680.64, saidas: 0, saldo: 17680.64 },
  ];

  const evolucaoData = [
    { mes: 'Jun/25', recebido: 155000, pago: 0 },
    { mes: 'Jul/25', recebido: 195000, pago: 0 },
    { mes: 'Ago/25', recebido: 250000, pago: 0 },
    { mes: 'Set/25', recebido: 210000, pago: 0 },
    { mes: 'Out/25', recebido: 180000, pago: 0 },
    { mes: 'Nov/25', recebido: 220000, pago: 0 },
    { mes: 'Dez/25', recebido: 130000, pago: 0 },
    { mes: 'Jan/26', recebido: 215000, pago: 0 },
    { mes: 'Fev/26', recebido: 223756.19, pago: 0 },
    { mes: 'Mar/26', recebido: 110000, pago: 0 },
    { mes: 'Abr/26', recebido: 0, pago: 0 },
    { mes: 'Mai/26', recebido: 0, pago: 0 },
  ];

  const topReceitas = [
    { nome: 'VENDAS', valor: 197500, pct: 100 },
    { nome: 'COMPRA MERCADORIAS', valor: 18700, pct: 9.4 },
  ];

  const totalReceber = typeof (data as any)?.contas_receber === 'number' ? (data as any).contas_receber : (data?.contas_receber?.total_a_receber || 0);
  const totalPagar = typeof (data as any)?.contas_pagar === 'number' ? (data as any).contas_pagar : (data?.contas_pagar?.total_a_pagar || 0);

  const agingReceber = [
    { label: 'Vencido', valor: data?.receber_vencido || 0, red: true },
    { label: '0-15 dias', valor: Math.max(0, totalReceber - (data?.receber_vencido || 0)) },
    { label: '16-30 dias', valor: 0 },
    { label: '31-60 dias', valor: 0 },
    { label: '60+ dias', valor: 0 },
  ];

  const agingPagar = [
    { label: 'Vencido', valor: data?.pagar_vencido || 0, red: true },
    { label: '0-15 dias', valor: Math.max(0, totalPagar - (data?.pagar_vencido || 0)) },
    { label: '16-30 dias', valor: 0 },
    { label: '31-60 dias', valor: 0 },
    { label: '60+ dias', valor: 0 },
  ];

  return (
    <div aria-label="Inteligência Financeira Dashboard" className="space-y-4 animate-in fade-in duration-300 pb-6">
      


      {/* TOP KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
        {/* Saldo Real */}
        <div className="bg-brand-500/[0.04] border-2 border-brand-500/80 shadow-[0_8px_30px_rgba(13,148,136,0.08)] rounded-2xl p-5 flex flex-col justify-between hover:scale-[1.01] transition-transform duration-300 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-brand-500/10 rounded-full -mr-6 -mt-6"></div>
          <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400 mb-3 text-[10px] font-black tracking-widest relative z-10">
            <Wallet size={16} className="text-brand-500 stroke-[2.5]" /> Disponibilidade em Caixa
          </div>
          <div className="relative z-10">
            <div
              className="text-2xl font-black text-brand-600 dark:text-brand-400 mb-1 tracking-tight truncate"
              title={formatBRL(data?.saldo_atual || 0)}
            >
              {formatBRLCompact(data?.saldo_atual || 0)}
            </div>
            <div className="text-[10px] text-success font-extrabold flex items-center gap-1">
              <ArrowUpRight size={13} className="stroke-[2.5]" /> Recebido: {formatBRLCompact(data?.recebimentos_realizados || 0)}
            </div>
          </div>
        </div>

        {/* Total Recebido */}
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-text-muted mb-2 text-[10px] font-bold uppercase tracking-wider">
            <ArrowUpRight size={14} className="text-blue-500"/> Total Recebido
          </div>
          <div>
            <div
              className="text-2xl font-extrabold text-text-primary mb-1 tracking-tight truncate"
              title={formatBRL(data?.recebimentos_realizados || 0)}
            >{formatBRLCompact(data?.recebimentos_realizados || 0)}</div>
            <div className="text-[10px] text-text-muted font-medium">No período selecionado</div>
          </div>
        </div>

        {/* Total Pago */}
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-text-muted mb-2 text-[10px] font-bold uppercase tracking-wider">
            <ArrowDownRight size={14} className="text-warning"/> Total Pago
          </div>
          <div>
            <div
              className="text-2xl font-extrabold text-text-primary mb-1 tracking-tight truncate"
              title={formatBRL(data?.pagamentos_realizados || 0)}
            >{formatBRLCompact(data?.pagamentos_realizados || 0)}</div>
            <div className="text-[10px] text-text-muted font-medium">No período selecionado</div>
          </div>
        </div>

        {/* A Receber */}
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-text-muted mb-2 text-[10px] font-bold uppercase tracking-wider">
            <DollarSign size={14} className="text-brand-500"/> A Receber
          </div>
          <div>
            <div
              className="text-2xl font-extrabold text-text-primary mb-1 tracking-tight truncate"
              title={formatBRL(data?.contas_receber || 0)}
            >{formatBRLCompact(data?.contas_receber || 0)}</div>
            <div className="text-[10px] text-danger font-bold flex items-center gap-1">
              <ArrowDownRight size={12}/> Títulos em aberto
            </div>
          </div>
        </div>

        {/* A Pagar */}
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-text-muted mb-2 text-[10px] font-bold uppercase tracking-wider">
            <CreditCard size={14} className="text-danger"/> A Pagar
          </div>
          <div>
            <div
              className="text-2xl font-extrabold text-text-primary mb-1 tracking-tight truncate"
              title={formatBRL(data?.contas_pagar || 0)}
            >{formatBRLCompact(data?.contas_pagar || 0)}</div>
            <div className="text-[10px] text-danger font-bold flex items-center gap-1">
              <ArrowDownRight size={12}/> Títulos em aberto
            </div>
          </div>
        </div>
      </div>

      {/* INADIMPLÊNCIA & PROJEÇÃO */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* Inadimplência */}
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5 flex flex-col justify-between">
          <h3 className="font-bold text-text-primary text-sm flex items-center gap-2 mb-6">
            <AlertTriangle size={16} className="text-warning"/> Inadimplência
          </h3>
          
          <div className="flex-1 flex flex-col items-center justify-center">
            {/* Custom SVG Donut Gauge */}
            <div className="relative w-32 sm:w-40 md:w-48 h-32 sm:h-40 md:h-48 mb-4 sm:mb-6">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle cx="50" cy="50" r="40" fill="none" stroke="var(--color-bg-tertiary)" strokeWidth="10" />
                {/* Value Ring (inadimplencia) */}
                <circle 
                  cx="50" cy="50" r="40" fill="none" stroke="#EF4444" strokeWidth="10" 
                  strokeDasharray={`${(data?.inadimplencia_pct || 0) * 2.51} ${100 * 2.51}`} 
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-danger tracking-tighter">{data?.inadimplencia_pct || 0}%</span>
                <span className="text-[9px] text-text-muted font-bold uppercase tracking-wider mt-0.5">Taxa de Atraso</span>
              </div>
            </div>

            <div className="w-full space-y-3">
              <div className="flex justify-between items-center bg-bg-secondary/30 p-3 rounded-lg border border-danger/20">
                <div>
                  <div className="text-xs font-bold text-danger">Receber Vencido</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-extrabold text-danger">{formatBRL(data?.receber_vencido || 0)}</div>
                  <div className="text-[10px] text-text-muted">Títulos vencidos</div>
                </div>
              </div>
              <div className="flex justify-between items-center bg-bg-secondary/30 p-3 rounded-lg border border-warning/20">
                <div>
                  <div className="text-xs font-bold text-warning">Pagar Vencido</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-extrabold text-warning">{formatBRL(data?.pagar_vencido || 0)}</div>
                  <div className="text-[10px] text-text-muted">Títulos vencidos</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Projeção de Fluxo de Caixa */}
        <div className="lg:col-span-2 bg-bg-primary border border-border shadow-card rounded-xl p-5 flex flex-col">
          <h3 className="font-bold text-text-primary text-sm flex items-center gap-2 mb-6">
            <TrendingUp size={16} className="text-blue-500"/> Projeção de Fluxo de Caixa
          </h3>
          
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-divider text-[10px] text-text-muted uppercase font-bold tracking-wider">
                  <th className="pb-3 px-2">PERÍODO</th>
                  <th className="pb-3 px-2 text-right">ENTRADAS PREVISTAS</th>
                  <th className="pb-3 px-2 text-right">SAÍDAS PREVISTAS</th>
                  <th className="pb-3 px-2 text-right">SALDO PROJETADO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider/30 text-xs">
                {projecaoData.map((row, i) => (
                  <tr key={i} className="hover:bg-bg-secondary/50 transition-colors">
                    <td className="py-4 px-2 font-bold text-text-primary flex items-center gap-2">
                      <Clock size={14} className="text-text-muted" /> {row.periodo}
                    </td>
                    <td className="py-4 px-2 text-right font-mono font-bold text-success">{formatBRL(row.entradas)}</td>
                    <td className="py-4 px-2 text-right font-mono font-bold text-danger">{formatBRL(row.saidas)}</td>
                    <td className="py-4 px-2 text-right">
                      <div className="inline-flex items-center gap-1 font-mono font-bold text-success bg-success/10 px-2 py-1 rounded">
                        <ArrowUpRight size={12} /> {formatBRL(row.saldo)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* EVOLUÇÃO MENSAL */}
      <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5">
        <h3 className="font-bold text-text-primary text-sm flex items-center gap-2 mb-6">
          <BarChart3 size={16} className="text-brand-500"/> Fluxo Realizado: Entradas vs Saídas
        </h3>
        <div className="h-[220px] sm:h-[280px] lg:h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={evolucaoData} margin={{ top: 20, right: 20, bottom: 0, left: -10 }} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.3} />
              <XAxis dataKey="mes" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(v) => formatBRLCompact(v)} tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-bg-tertiary)', opacity: 0.4 }} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} iconType="square" />
              <Bar dataKey="recebido" name="Recebido" fill="#10B981" radius={[2, 2, 0, 0]} maxBarSize={30} />
              <Bar dataKey="pago" name="Pago" fill="#EF4444" radius={[2, 2, 0, 0]} maxBarSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ÚLTIMAS CONTAS PAGAS & RECEBIDAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {/* Últimas Contas Pagas */}
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-3 sm:p-5">
          <h3 className="font-bold text-text-primary text-sm flex items-center gap-2 mb-4">
            <TrendingDown size={16} className="text-danger"/> Últimas 10 Contas Pagas
          </h3>
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-divider text-text-secondary font-semibold uppercase tracking-wider">
                  <th className="py-2.5">Descrição</th>
                  <th className="py-2.5">Pagamento</th>
                  <th className="py-2.5 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider font-medium">
                {(data?.ultimas_pagas || []).map((item: any, i: number) => (
                  <tr key={i} className="hover:bg-bg-secondary/40 transition-colors">
                    <td className="py-2.5 text-text-primary font-bold" title={item.descricao}>{item.descricao}</td>
                    <td className="py-2.5 text-text-secondary">{item.data_pagamento ? item.data_pagamento.substring(5, 10).split('-').reverse().join('/') : '-'}</td>
                    <td className="py-2.5 text-right font-mono text-danger font-bold whitespace-nowrap">{formatBRL(item.valor)}</td>
                  </tr>
                ))}
                {(!data?.ultimas_pagas || data.ultimas_pagas.length === 0) && (
                  <tr><td colSpan={3} className="py-6 text-center text-text-muted italic">Nenhuma conta paga no período</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {/* Mobile cards */}
          <div className="sm:hidden space-y-2">
            {(data?.ultimas_pagas || []).length === 0 && <p className="text-center text-text-muted text-xs py-4">Nenhuma conta paga no período</p>}
            {(data?.ultimas_pagas || []).map((item: any, i: number) => (
              <div key={i} className="p-3 rounded-xl border border-divider/50 bg-bg-secondary/10">
                <div className="flex justify-between items-start gap-2">
                  <span className="text-xs font-bold text-text-primary flex-1">{item.descricao}</span>
                  <span className="text-xs font-mono font-bold text-danger whitespace-nowrap">{formatBRL(item.valor)}</span>
                </div>
                <span className="text-[11px] text-text-muted mt-1 block">{item.data_pagamento ? item.data_pagamento.substring(5, 10).split('-').reverse().join('/') : '-'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Últimas Contas Recebidas */}
        <div className="bg-bg-primary border border-border shadow-card rounded-xl p-3 sm:p-5">
          <h3 className="font-bold text-text-primary text-sm flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-success"/> Últimas 10 Contas Recebidas
          </h3>
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-divider text-text-secondary font-semibold uppercase tracking-wider">
                  <th className="py-2.5">Descrição</th>
                  <th className="py-2.5">Recebimento</th>
                  <th className="py-2.5 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider font-medium">
                {(data?.ultimas_recebidas || []).map((item: any, i: number) => (
                  <tr key={i} className="hover:bg-bg-secondary/40 transition-colors">
                    <td className="py-2.5 text-text-primary font-bold">{item.descricao}</td>
                    <td className="py-2.5 text-text-secondary">{item.data_pagamento ? item.data_pagamento.substring(5, 10).split('-').reverse().join('/') : '-'}</td>
                    <td className="py-2.5 text-right font-mono text-success font-bold whitespace-nowrap">{formatBRL(item.valor)}</td>
                  </tr>
                ))}
                {(!data?.ultimas_recebidas || data.ultimas_recebidas.length === 0) && (
                  <tr><td colSpan={3} className="py-6 text-center text-text-muted italic">Nenhuma conta recebida no período</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {/* Mobile cards */}
          <div className="sm:hidden space-y-2">
            {(data?.ultimas_recebidas || []).length === 0 && <p className="text-center text-text-muted text-xs py-4">Nenhuma conta recebida no período</p>}
            {(data?.ultimas_recebidas || []).map((item: any, i: number) => (
              <div key={i} className="p-3 rounded-xl border border-divider/50 bg-bg-secondary/10">
                <div className="flex justify-between items-start gap-2">
                  <span className="text-xs font-bold text-text-primary flex-1">{item.descricao}</span>
                  <span className="text-xs font-mono font-bold text-success whitespace-nowrap">{formatBRL(item.valor)}</span>
                </div>
                <span className="text-[11px] text-text-muted mt-1 block">{item.data_pagamento ? item.data_pagamento.substring(5, 10).split('-').reverse().join('/') : '-'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MAPA DE VENCIMENTOS (AGING) */}
      <div className="bg-bg-primary border border-border shadow-card rounded-xl p-5">
        <h3 className="font-bold text-text-primary text-sm flex items-center gap-2 mb-6">
          <Clock size={16} className="text-warning"/> Mapa de Vencimentos (Aging)
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Contas a Receber Aging */}
          <div>
            <h4 className="font-bold text-[11px] uppercase tracking-wider text-blue-500 flex items-center gap-2 mb-3">
              <DollarSign size={14} /> CONTAS A RECEBER
            </h4>
            <div className="flex flex-col gap-2">
              {agingReceber.map((row, i) => {
                const isExpanded = expandedReceberIndex === i;
                const details = [
                  "Títulos com atraso no pagamento. Requer ação de cobrança comercial ativa.",
                  "Recebimentos previstos para os próximos 15 dias. Fluxo garantido para pagamentos imediatos.",
                  "Previsão de entrada na segunda quinzena do mês corrente.",
                  "Carteira de recebíveis de médio prazo cadastrada no ERP.",
                  "Planejamento financeiro de longo prazo com vencimento estendido."
                ];
                return (
                  <div key={i} className="flex flex-col">
                    <button 
                      onClick={() => setExpandedReceberIndex(isExpanded ? null : i)}
                      className={`w-full flex justify-between items-center p-3 rounded-xl transition-all duration-200 text-xs font-bold text-left focus:outline-none ${
                        row.red 
                          ? "bg-danger/5 hover:bg-danger/10 border border-danger/20" 
                          : "bg-bg-secondary/20 hover:bg-bg-secondary/40 border border-divider/60"
                      }`}
                    >
                      <span className={`flex items-center gap-2 ${row.red ? "text-danger" : "text-text-primary"}`}>
                        {row.red && <AlertTriangle size={13} />}
                        <span>{row.label}</span>
                      </span>
                      <div className="flex items-center gap-2 font-mono">
                        <span className={row.red ? "text-danger" : "text-blue-500"}>
                          {formatBRL(row.valor)}
                        </span>
                        <ChevronDown size={14} className={clsx("text-text-secondary transition-transform duration-300", isExpanded && "rotate-180")} />
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="bg-bg-secondary/35 border-x border-b border-divider/50 p-3 rounded-b-xl -mt-1 text-[11px] font-medium text-text-secondary animate-in slide-in-from-top-1 duration-200">
                        {details[i]}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Contas a Pagar Aging */}
          <div>
            <h4 className="font-bold text-[11px] uppercase tracking-wider text-warning flex items-center gap-2 mb-3">
              <CreditCard size={14} /> CONTAS A PAGAR
            </h4>
            <div className="flex flex-col gap-2">
              {agingPagar.map((row, i) => {
                const isExpanded = expandedPagarIndex === i;
                const details = [
                  "Contas vencidas em atraso. Priorizar pagamento para evitar acúmulo de juros e multas.",
                  "Contas com vencimento próximo. Provisão de saldo bancário recomendada.",
                  "Previsão de saída programada para a segunda quinzena do mês.",
                  "Duplicatas de fornecedores e prestadores de médio prazo.",
                  "Parcelamentos e compromissos contratuais de longo prazo."
                ];
                return (
                  <div key={i} className="flex flex-col">
                    <button 
                      onClick={() => setExpandedPagarIndex(isExpanded ? null : i)}
                      className={`w-full flex justify-between items-center p-3 rounded-xl transition-all duration-200 text-xs font-bold text-left focus:outline-none ${
                        row.red 
                          ? "bg-danger/5 hover:bg-danger/10 border border-danger/20" 
                          : "bg-bg-secondary/20 hover:bg-bg-secondary/40 border border-divider/60"
                      }`}
                    >
                      <span className={`flex items-center gap-2 ${row.red ? "text-danger" : "text-text-primary"}`}>
                        {row.red && <AlertTriangle size={13} />}
                        <span>{row.label}</span>
                      </span>
                      <div className="flex items-center gap-2 font-mono">
                        <span className={row.red ? "text-danger" : "text-warning"}>
                          {formatBRL(row.valor)}
                        </span>
                        <ChevronDown size={14} className={clsx("text-text-secondary transition-transform duration-300", isExpanded && "rotate-180")} />
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="bg-bg-secondary/35 border-x border-b border-divider/50 p-3 rounded-b-xl -mt-1 text-[11px] font-medium text-text-secondary animate-in slide-in-from-top-1 duration-200">
                        {details[i]}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
