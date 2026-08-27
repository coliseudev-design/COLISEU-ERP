import { useState } from 'react'
import { useApiQuery } from '../hooks/useApi'
import DataTable from '../components/DataTable'
import { Filter, ArrowDownCircle, ArrowUpCircle, AlertCircle, CheckCircle } from 'lucide-react'
import { formatBRL, formatDate } from '../utils/format'

export default function Titulos() {
  const [tipo, setTipo] = useState<'' | 'RECEBER' | 'PAGAR'>('')
  const [status, setStatus] = useState<'' | 'ABERTO' | 'PAGO' | 'VENCIDA'>('')

  const { data: res, isLoading } = useApiQuery<any>('/financeiro/contas', {
    tipo: tipo || undefined,
    status: status || undefined,
    limit: 200
  })

  const titulos = res?.data || []

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="card !p-3 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-text-secondary" />
          <span className="text-sm font-medium text-text-primary">Filtros:</span>
        </div>
        <select
          className="input w-full sm:w-auto sm:min-w-[150px]"
          value={tipo}
          onChange={(e) => setTipo(e.target.value as any)}
          aria-label="Tipo de Conta"
        >
          <option value="">Todas as Contas</option>
          <option value="RECEBER">A Receber</option>
          <option value="PAGAR">A Pagar</option>
        </select>
        <select
          className="input w-full sm:w-auto sm:min-w-[150px]"
          value={status}
          onChange={(e) => setStatus(e.target.value as any)}
          aria-label="Status de Pagamento"
        >
          <option value="">Todos os Status</option>
          <option value="ABERTO">Em Aberto</option>
          <option value="PAGO">Pago</option>
          <option value="VENCIDA">Vencida</option>
        </select>
        <div className="flex-1"></div>
        <span className="text-xs text-text-secondary">
          {titulos.length} títulos encontrados
        </span>
      </div>

      <DataTable
        loading={isLoading}
        data={titulos}
        empty="Nenhum título encontrado com os filtros atuais."
        columns={[
          {
            key: 'tipo',
            label: 'TIPO',
            render: (r: any) => {
              const rTipo = String(r.tipo || '').trim()
              return (
                <span className={`flex items-center gap-1.5 text-xs font-bold ${rTipo === 'RECEBER' ? 'text-success' : 'text-danger'}`}>
                  {rTipo === 'RECEBER' ? <ArrowDownCircle size={14} /> : <ArrowUpCircle size={14} />}
                  {rTipo}
                </span>
              )
            }
          },
          { 
            key: 'descricao', 
            label: 'DESCRIÇÃO', 
            render: (r: any) => (
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-xs sm:text-sm text-text-primary leading-tight truncate">{r.descricao || '—'}</span>
                <span className="text-[10px] text-text-muted mt-0.5 sm:hidden truncate max-w-[150px]">
                  {r.cliente || '—'}
                </span>
              </div>
            )
          },
          { key: 'cliente', label: 'CLIENTE/FORNECEDOR', className: 'hidden sm:table-cell', render: (r: any) => <span className="text-sm text-text-secondary">{r.cliente || '—'}</span> },
          { key: 'data_vencimento', label: 'VENCIMENTO', render: (r: any) => <span className="mono text-xs">{formatDate(r.data_vencimento)}</span> },
          {
            key: 'valor',
            label: 'VALOR',
            align: 'right',
            render: (r: any) => <span className="font-semibold">{formatBRL(r.valor)}</span>
          },
          {
            key: 'status_pagamento',
            label: 'STATUS',
            align: 'right',
            render: (r: any) => {
              const rStatus = String(r.status_pagamento || '').trim()
              let isVencida = rStatus === 'ABERTO' && new Date(r.data_vencimento) < new Date(new Date().setHours(0,0,0,0));
              let statusText = isVencida ? 'VENCIDA' : rStatus;
              
              let badgeClass = 'bg-bg-tertiary text-text-secondary border-border';
              let Icon = null;
              
              if (statusText === 'PAGO') {
                 badgeClass = 'bg-green-100 text-green-700 border-green-200';
                 Icon = CheckCircle;
              } else if (statusText === 'VENCIDA') {
                 badgeClass = 'bg-red-100 text-red-700 border-red-200';
                 Icon = AlertCircle;
              } else if (statusText === 'ABERTO') {
                 badgeClass = 'bg-blue-100 text-blue-700 border-blue-200';
              }
              
              return (
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${badgeClass}`}>
                  {Icon && <Icon size={12} />}
                  {statusText}
                </span>
              )
            }
          }
        ]}
      />
    </div>
  )
}
