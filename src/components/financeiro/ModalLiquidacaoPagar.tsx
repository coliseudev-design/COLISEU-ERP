import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../lib/formatters';
import {
  CheckCircle2,
  X,
  CreditCard,
  Landmark,
  QrCode,
  FileText,
  DollarSign,
  AlertCircle,
} from 'lucide-react';
import {
  TituloPagarItem,
  liquidarTituloPagar,
} from '../../lib/fornecedores';

interface ModalLiquidacaoPagarProps {
  isOpen: boolean;
  onClose: () => void;
  titulo: TituloPagarItem | null;
  onSuccess: (titulo: TituloPagarItem) => void;
}

export const ModalLiquidacaoPagar: React.FC<ModalLiquidacaoPagarProps> = ({
  isOpen,
  onClose,
  titulo,
  onSuccess,
}) => {
  const [contaOrigem, setContaOrigem] = useState('748 - SICREDI (CONTA CORRENTE 45123-8)');
  const [formaPagamento, setFormaPagamento] = useState('PIX CORPORATIVO');
  const [comprovante, setComprovante] = useState(`E01234567${Date.now()}`);
  const [desconto, setDesconto] = useState(0);
  const [jurosMulta, setJurosMulta] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen || !titulo) return null;

  const totalEfetivo = Math.max(0, titulo.valorFinalPagar - desconto + jurosMulta);

  const handleConfirmarBaixa = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      const atualizado = liquidarTituloPagar(titulo.id, formaPagamento, contaOrigem, comprovante);
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
          maxWidth: '560px',
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
            <CheckCircle2 size={18} color="#10b981" />
            <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Baixar / Liquidar Título a Pagar — {titulo.numeroDocumento}
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

        {/* Body */}
        <form onSubmit={handleConfirmarBaixa} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Resumo do Fornecedor e Título */}
          <div style={{ padding: '12px', backgroundColor: 'var(--surface-2)', borderRadius: '6px', fontSize: '11px', lineHeight: 1.5 }}>
            <div><strong>Fornecedor:</strong> {titulo.fornecedorNome} ({titulo.fornecedorCnpj})</div>
            <div><strong>Documento:</strong> {titulo.numeroDocumento} • <strong>Vencimento:</strong> {titulo.dataVencimento}</div>
            <div style={{ marginTop: '4px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '4px' }}>
              <span>Valor Bruto: {formatCurrency(titulo.valorBruto)}</span>
              <span style={{ color: '#ef4444' }}>Retenções: - {formatCurrency(titulo.retencoes.valorTotalRetencoes)}</span>
              <span style={{ fontWeight: 700, color: '#10b981' }}>Líquido: {formatCurrency(titulo.valorFinalPagar)}</span>
            </div>
          </div>

          {/* Conta de Origem e Forma de Pagamento */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label className="coliseu-label">Conta Bancária de Saída *</label>
              <select
                className="coliseu-input"
                value={contaOrigem}
                onChange={(e) => setContaOrigem(e.target.value)}
                style={{ height: '36px', width: '100%', fontWeight: 600 }}
              >
                <option value="748 - SICREDI (CONTA CORRENTE 45123-8)">748 - SICREDI (C/C 45123-8)</option>
                <option value="001 - BANCO DO BRASIL (C/C 12890-2)">001 - BANCO DO BRASIL (C/C 12890-2)</option>
                <option value="CAIXA GERAL / TESOURARIA">CAIXA GERAL / TESOURARIA</option>
              </select>
            </div>

            <div>
              <label className="coliseu-label">Forma de Pagamento *</label>
              <select
                className="coliseu-input"
                value={formaPagamento}
                onChange={(e) => setFormaPagamento(e.target.value)}
                style={{ height: '36px', width: '100%', fontWeight: 600 }}
              >
                <option value="PIX CORPORATIVO">PIX CORPORATIVO</option>
                <option value="BOLETO BANCÁRIO / DDA">BOLETO BANCÁRIO / DDA</option>
                <option value="TRANSFERÊNCIA TED/DOC">TRANSFERÊNCIA TED/DOC</option>
                <option value="DÉBITO EM CONTA">DÉBITO EM CONTA</option>
                <option value="DINHEIRO / ESPÉCIE">DINHEIRO / ESPÉCIE</option>
              </select>
            </div>
          </div>

          {/* Desconto Obtido e Juros/Multa */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label className="coliseu-label">Desconto Adicional (R$)</label>
              <input
                type="number"
                step="0.01"
                className="coliseu-input"
                value={desconto || ''}
                onChange={(e) => setDesconto(parseFloat(e.target.value) || 0)}
                placeholder="0,00"
                style={{ height: '36px', width: '100%', textAlign: 'right', color: '#10b981' }}
              />
            </div>

            <div>
              <label className="coliseu-label">Juros / Multa Pagos (R$)</label>
              <input
                type="number"
                step="0.01"
                className="coliseu-input"
                value={jurosMulta || ''}
                onChange={(e) => setJurosMulta(parseFloat(e.target.value) || 0)}
                placeholder="0,00"
                style={{ height: '36px', width: '100%', textAlign: 'right', color: '#ef4444' }}
              />
            </div>
          </div>

          {/* Código / Comprovante da Transação */}
          <div>
            <label className="coliseu-label">Comprovante de Autenticação / End-to-End PIX</label>
            <input
              type="text"
              className="coliseu-input"
              value={comprovante}
              onChange={(e) => setComprovante(e.target.value)}
              style={{ height: '36px', width: '100%', fontFamily: 'monospace', fontSize: '11px' }}
            />
          </div>

          {/* Totalizador da Baixa */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(16, 185, 129, 0.08)', padding: '12px', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <span style={{ fontSize: '12px', fontWeight: 600 }}>VALOR EFETIVAMENTE PAGO:</span>
            <span style={{ fontSize: '18px', fontWeight: 800, color: '#10b981', fontFamily: 'monospace' }}>
              {formatCurrency(totalEfetivo)}
            </span>
          </div>

          {/* Footer de Ação */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px', borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
            <Button variant="secondary" type="button" onClick={onClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" disabled={isLoading} style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}>
              {isLoading ? 'Processando Baixa...' : 'Confirmar Liquidação (F10)'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
