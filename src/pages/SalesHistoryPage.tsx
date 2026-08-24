import React, { useState } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Stepper } from '../components/ui/Stepper';
import { AIInsight } from '../components/ui/AIComponents';
import { formatCurrency, formatDate } from '../lib/formatters';
import { Search, Filter, Printer, Send, Check } from 'lucide-react';

export const SalesHistoryPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPedidoId, setSelectedPedidoId] = useState('PED-1092');
  const [filterFaturadoOnly, setFilterFaturadoOnly] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const vendas = [
    { id: 'PED-1092', cliente: 'PIVETA DISTRIBUIDORA DE TINTAS', data: '2026-08-14T10:30:00Z', valor: 140.74, status: 'Faturado', stepIndex: 5 },
    { id: 'PED-1091', cliente: 'AUTO PEÇAS DOURADOS LTDA', data: '2026-08-14T09:15:00Z', valor: 450.00, status: 'Bloqueado', stepIndex: 2 },
    { id: 'PED-1090', cliente: 'MECÂNICA SÃO JORGE LTDA', data: '2026-08-13T16:45:00Z', valor: 1250.00, status: 'Faturado', stepIndex: 5 },
  ];

  const filteredVendas = vendas.filter((v) => {
    const matchesSearch = v.id.toLowerCase().includes(searchTerm.toLowerCase()) || v.cliente.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterFaturadoOnly ? v.status === 'Faturado' : true;
    return matchesSearch && matchesFilter;
  });

  const activeVenda = vendas.find((v) => v.id === selectedPedidoId) || vendas[0];

  const orderSteps = [
    { id: 'step-1', label: 'Gerado' },
    { id: 'step-2', label: 'Orçamento' },
    { id: 'step-3', label: 'Analisado' },
    { id: 'step-4', label: 'Aprovado' },
    { id: 'step-5', label: 'Reservado' },
    { id: 'step-6', label: 'Faturado' },
  ];

  return (
    <div className="coliseu-page" style={{ minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {toastMessage && (
        <div className="coliseu-toast-container">
          <div className="coliseu-toast coliseu-toast--success" style={{
            backgroundColor: 'var(--surface-2)',
            border: '1px solid var(--status-success)',
            color: 'var(--text-primary)',
            padding: '0.75rem 1.25rem',
            borderRadius: '0.5rem',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}>
            <Check aria-hidden="true" style={{ width: '1.25rem', height: '1.25rem', color: 'var(--status-success)' }} />
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{toastMessage}</span>
          </div>
        </div>
      )}

      <PageHeader
        title="Histórico de Vendas & Esteira Operacional"
        subtitle="Rastreamento em 6 passos do ciclo de vida dos pedidos, desde a cotação até o faturamento fiscal."
        breadcrumbItems={[
          { label: 'Comercial', active: false },
          { label: 'Histórico de Vendas', active: true },
        ]}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '20px' }}>
        {/* Tabela de Pedidos */}
        <div className="coliseu-card" style={{ gridColumn: 'span 7' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <Input
              placeholder="Buscar por número do pedido ou cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Search aria-hidden="true" size={14} />}
              style={{ width: '100%' }}
            />
            <Button
              variant={filterFaturadoOnly ? 'success' : 'secondary'}
              size="md"
              leftIcon={<Filter aria-hidden="true" size={14} />}
              onClick={() => setFilterFaturadoOnly(!filterFaturadoOnly)}
            >
              {filterFaturadoOnly ? 'Somente Faturados' : 'Todos'}
            </Button>
          </div>

          <div className="coliseu-table-container">
            <table className="coliseu-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '0.75rem', fontFamily: 'monospace' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--surface-app)', color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.6875rem', borderBottom: '1px solid var(--surface-2)' }}>
                  <th style={{ padding: '0.75rem' }}>Número</th>
                  <th style={{ padding: '0.75rem' }}>Cliente</th>
                  <th style={{ padding: '0.75rem' }}>Data</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Valor Total</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredVendas.map((v) => (
                  <tr
                    key={v.id}
                    onClick={() => setSelectedPedidoId(v.id)}
                    style={{
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--surface-2)',
                      backgroundColor: v.id === selectedPedidoId ? 'rgba(37, 99, 235, 0.15)' : 'transparent',
                    }}
                  >
                    <td style={{ padding: '0.75rem', fontWeight: 700, color: 'var(--text-link)' }}>{v.id}</td>
                    <td style={{ padding: '0.75rem', color: 'var(--text-primary)', fontWeight: 600, fontFamily: 'Inter, system-ui, sans-serif' }}>{v.cliente}</td>
                    <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>{formatDate(v.data)}</td>
                    <td className="tabular-nums" style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--status-success)', fontWeight: 700 }}>
                      {formatCurrency(v.valor)}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      <StatusBadge status={v.status === 'Faturado' ? 'success' : 'danger'} label={v.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detalhes do Pedido & Esteira de Status */}
        <div className="coliseu-card" style={{ gridColumn: 'span 5', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--surface-2)', paddingBottom: '12px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{activeVenda.id}</h3>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{activeVenda.cliente}</span>
            </div>
            <StatusBadge status={activeVenda.status === 'Faturado' ? 'success' : 'danger'} label={activeVenda.status} />
          </div>

          {/* Esteira Operacional */}
          <div style={{ backgroundColor: 'var(--surface-app)', padding: '12px', border: '1px solid var(--surface-2)', borderRadius: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Esteira Operacional</span>
            <Stepper steps={orderSteps} currentStepIndex={activeVenda.stepIndex} isError={activeVenda.status === 'Bloqueado'} />
          </div>

          {/* Resumo Financeiro */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--surface-app)', padding: '12px', border: '1px solid var(--surface-2)', borderRadius: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Valor Líquido Faturado:</span>
            <span className="tabular-nums" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--status-success)', fontFamily: 'monospace' }}>
              {formatCurrency(activeVenda.valor)}
            </span>
          </div>

          {/* Ações do Pedido */}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Button
              variant="secondary"
              leftIcon={<Printer aria-hidden="true" size={14} />}
              onClick={() => showToast(`🖨️ Reimpressão do comprovante do pedido ${activeVenda.id} iniciada!`)}
              style={{ flex: 1 }}
            >
              Reimprimir DANFE
            </Button>
            <Button
              variant="primary"
              leftIcon={<Send aria-hidden="true" size={14} />}
              onClick={() => showToast(`📱 Comprovante do pedido ${activeVenda.id} enviado via WhatsApp!`)}
              style={{ flex: 1 }}
            >
              Enviar WhatsApp
            </Button>
          </div>

          <AIInsight
            title="✦ Análise Preditiva do Pedido"
            description={
              activeVenda.status === 'Bloqueado'
                ? 'Pedido bloqueado na etapa Analisado devido ao limite de crédito do cliente excedido.'
                : 'Pedido liberado na esteira com reserva de estoque confirmada no Depósito Central.'
            }
          />
        </div>
      </div>
    </div>
  );
};
