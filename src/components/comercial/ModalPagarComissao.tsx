import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../lib/formatters';
import {
  DollarSign,
  X,
  CreditCard,
  CheckCircle2,
  QrCode,
  Landmark,
} from 'lucide-react';
import {
  VendedorItem,
  pagarComissaoVendedor,
} from '../../lib/comissoes';

interface ModalPagarComissaoProps {
  isOpen: boolean;
  onClose: () => void;
  vendedor: VendedorItem | null;
  onSuccess: (vendedor: VendedorItem) => void;
}

export const ModalPagarComissao: React.FC<ModalPagarComissaoProps> = ({
  isOpen,
  onClose,
  vendedor,
  onSuccess,
}) => {
  const [valorPagar, setValorPagar] = useState<number>(vendedor?.totalComissaoPendente || 0);
  const [formaPagamento, setFormaPagamento] = useState('PIX IMEDIATO');
  const [contaOrigem, setContaOrigem] = useState('748 - SICREDI (C/C 45123-8)');
  const [comprovante, setComprovante] = useState(`PIX-COM-${Date.now()}`);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen || !vendedor) return null;

  const handleConfirmar = (e: React.FormEvent) => {
    e.preventDefault();
    if (valorPagar <= 0) {
      alert('Informe um valor de comissão válido para pagamento.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      const atualizado = pagarComissaoVendedor(vendedor.id, valorPagar);
      if (atualizado) {
        onSuccess(atualizado);
      }
      onClose();
    }, 800);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(3px)',
        zIndex: 12000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '540px',
          backgroundColor: 'var(--surface-1)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--surface-2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <DollarSign size={18} color="#10b981" />
            <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Pagamento de Comissão — {vendedor.nome}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleConfirmar} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Card Resumo do Vendedor */}
          <div style={{ padding: '12px', backgroundColor: 'var(--surface-2)', borderRadius: '6px', fontSize: '11px', lineHeight: 1.5 }}>
            <div><strong>Vendedor:</strong> {vendedor.nome} ({vendedor.cargo.replace('_', ' ')})</div>
            <div><strong>Chave PIX:</strong> {vendedor.chavePix || 'Não cadastrada'}</div>
            <div style={{ marginTop: '6px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '6px' }}>
              <span>Total Gerado: {formatCurrency(vendedor.totalComissaoGerada)}</span>
              <span>Já Pago: {formatCurrency(vendedor.totalComissaoPaga)}</span>
              <strong style={{ color: '#ef4444' }}>Saldo Pendente: {formatCurrency(vendedor.totalComissaoPendente)}</strong>
            </div>
          </div>

          {/* Valor a Pagar */}
          <div>
            <label className="coliseu-label">Valor a Pagar Agora (R$) *</label>
            <input
              type="number"
              step="0.01"
              max={vendedor.totalComissaoPendente}
              value={valorPagar}
              onChange={(e) => setValorPagar(parseFloat(e.target.value) || 0)}
              className="coliseu-input"
              style={{ height: '38px', width: '100%', textAlign: 'right', fontWeight: 700, fontSize: '16px', color: '#10b981' }}
              required
            />
          </div>

          {/* Conta de Saída e Forma */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label className="coliseu-label">Conta Bancária de Saída *</label>
              <select
                className="coliseu-input"
                value={contaOrigem}
                onChange={(e) => setContaOrigem(e.target.value)}
                style={{ height: '36px', width: '100%' }}
              >
                <option value="748 - SICREDI (C/C 45123-8)">748 - SICREDI (C/C 45123-8)</option>
                <option value="001 - BANCO DO BRASIL (C/C 12890-2)">001 - BANCO DO BRASIL</option>
                <option value="CAIXA GERAL / TESOURARIA">CAIXA GERAL</option>
              </select>
            </div>

            <div>
              <label className="coliseu-label">Forma de Pagamento *</label>
              <select
                className="coliseu-input"
                value={formaPagamento}
                onChange={(e) => setFormaPagamento(e.target.value)}
                style={{ height: '36px', width: '100%' }}
              >
                <option value="PIX IMEDIATO">PIX IMEDIATO</option>
                <option value="TRANSFERÊNCIA TED">TRANSFERÊNCIA TED</option>
                <option value="DINHEIRO / ESPÉCIE">DINHEIRO / ESPÉCIE</option>
              </select>
            </div>
          </div>

          {/* Comprovante */}
          <div>
            <label className="coliseu-label">Código da Autenticação / Comprovante PIX</label>
            <input
              type="text"
              className="coliseu-input"
              value={comprovante}
              onChange={(e) => setComprovante(e.target.value)}
              style={{ height: '36px', width: '100%', fontFamily: 'monospace' }}
            />
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px', borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
            <Button variant="secondary" type="button" onClick={onClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" disabled={isLoading} style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}>
              {isLoading ? 'Processando Pagamento...' : 'Confirmar Pagamento PIX'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
