import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { PedidoVendaItem, cancelarPedidoVenda } from '../../lib/pedidosVenda';
import { formatCurrency } from '../../lib/formatters';
import { AlertTriangle, X, Ban, CheckCircle2 } from 'lucide-react';

interface ModalCancelarPedidoProps {
  isOpen: boolean;
  onClose: () => void;
  pedido: PedidoVendaItem | null;
  onCancelamentoConcluido: (pedidoAtualizado: PedidoVendaItem) => void;
}

export const ModalCancelarPedido: React.FC<ModalCancelarPedidoProps> = ({
  isOpen,
  onClose,
  pedido,
  onCancelamentoConcluido,
}) => {
  const [motivo, setMotivo] = useState('Desistência do cliente / Cancelamento comercial');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen || !pedido) return null;

  const handleConfirmarCancelamento = () => {
    if (!motivo.trim()) {
      alert('Por favor informe o motivo do cancelamento.');
      return;
    }

    setIsProcessing(true);
    try {
      const res = cancelarPedidoVenda(pedido.id, motivo);
      if (res.success && res.pedido) {
        onCancelamentoConcluido(res.pedido);
        onClose();
      } else {
        alert(res.message || 'Erro ao cancelar o pedido.');
      }
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(3px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          backgroundColor: 'var(--surface-1)',
          border: '1px solid var(--border-default)',
          borderRadius: '12px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '14px 18px',
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            borderBottom: '1px solid rgba(239, 68, 68, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ef4444',
              }}
            >
              <Ban size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#ef4444' }}>
                Cancelar Pedido / Venda Nº {pedido.numeroPedido}
              </h3>
              <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>
                Cliente: {pedido.clienteNome} • Valor: R$ {pedido.valorTotalFinal?.toFixed(2)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: '4px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '8px',
              padding: '12px',
              fontSize: '11.5px',
              color: 'var(--text-primary)',
              lineHeight: '1.5',
            }}
          >
            <div style={{ fontWeight: 700, color: '#ef4444', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <AlertTriangle size={14} /> Atenção às Ações Automáticas de Cancelamento:
            </div>
            <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
              <li>O status do pedido mudará para <strong>🟦 CANCELADO</strong>.</li>
              <li>O estoque dos <strong>{pedido.itens?.length || 0} itens</strong> será estornado e devolvido ao saldo disponível.</li>
              <li>Os títulos a receber gerados no módulo financeiro serão cancelados.</li>
            </ul>
          </div>

          <div>
            <label className="coliseu-label" style={{ fontSize: '11px', fontWeight: 700 }}>
              Motivo do Cancelamento:
            </label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              placeholder="Descreva o motivo do cancelamento da venda..."
              className="coliseu-input"
              style={{ width: '100%', padding: '8px', fontSize: '11.5px', resize: 'vertical' }}
            />
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 18px',
            backgroundColor: 'var(--surface-2)',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px',
          }}
        >
          <Button variant="secondary" size="sm" type="button" onClick={onClose} disabled={isProcessing}>
            Voltar
          </Button>
          <Button
            variant="danger"
            size="sm"
            type="button"
            onClick={handleConfirmarCancelamento}
            disabled={isProcessing}
            leftIcon={<Ban size={14} />}
            style={{ backgroundColor: '#ef4444', borderColor: '#ef4444', color: '#fff', fontWeight: 700 }}
          >
            {isProcessing ? 'Cancelando...' : 'Confirmar Cancelamento'}
          </Button>
        </div>
      </div>
    </div>
  );
};
