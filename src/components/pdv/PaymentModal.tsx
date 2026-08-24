import React, { useState, useEffect } from 'react';
import type { VendaPagamentoPayload } from '../../lib/types';
import {
  X,
  Banknote,
  CreditCard,
  QrCode,
  FileText,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Copy,
  Check,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';

export interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalAmount: number;
  onConfirmPayment: (pagamentos: VendaPagamentoPayload[]) => Promise<void>;
  isProcessing?: boolean;
}

const parseNumber = (val: string | number): number => {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const sanitized = val.toString().replace(/\s/g, '').replace(',', '.');
  const parsed = parseFloat(sanitized);
  return isNaN(parsed) ? 0 : parsed;
};

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  totalAmount,
  onConfirmPayment,
  isProcessing = false,
}) => {
  const [activeMethod, setActiveMethod] = useState<
    'DINHEIRO' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'PIX' | 'BOLETO'
  >('DINHEIRO');

  const [pagamentos, setPagamentos] = useState<VendaPagamentoPayload[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [nsuAuth, setNsuAuth] = useState<string>('');
  const [pixCopied, setPixCopied] = useState<boolean>(false);

  const totalPago = pagamentos.reduce((acc, curr) => acc + curr.valor, 0);
  const saldoRestante = Math.max(0, Math.round((totalAmount - totalPago) * 100) / 100);
  const trocoCalculado = Math.max(0, Math.round((totalPago - totalAmount) * 100) / 100);

  const numericInputVal = parseNumber(inputValue);

  useEffect(() => {
    if (isOpen) {
      setPagamentos([]);
      setInputValue(totalAmount.toFixed(2));
      setActiveMethod('DINHEIRO');
      setNsuAuth('');
      setPixCopied(false);
    }
  }, [isOpen, totalAmount]);

  useEffect(() => {
    if (saldoRestante > 0) {
      setInputValue(saldoRestante.toFixed(2));
    } else {
      setInputValue('0.00');
    }
  }, [saldoRestante]);

  if (!isOpen) return null;

  const handleAddPayment = () => {
    const val = parseNumber(inputValue);
    if (val <= 0) return;

    let troco = 0;
    if (activeMethod === 'DINHEIRO' && val > saldoRestante && pagamentos.length === 0) {
      troco = val - totalAmount;
    }

    const newPayment: VendaPagamentoPayload = {
      forma_pagamento: activeMethod,
      valor: val,
      troco,
      nsu_autorizacao: nsuAuth.trim() || undefined,
    };

    setPagamentos((prev) => [...prev, newPayment]);
    setNsuAuth('');
  };

  const handleRemovePayment = (index: number) => {
    setPagamentos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleQuickAmount = (amount: number) => {
    const current = parseNumber(inputValue);
    setInputValue((current + amount).toFixed(2));
  };

  const handleExactAmount = () => {
    setInputValue(saldoRestante.toFixed(2));
  };

  const handleFinalize = async () => {
    let finalPagamentos = [...pagamentos];
    const valInput = parseNumber(inputValue);

    if (finalPagamentos.length === 0 && valInput >= totalAmount) {
      const troco = activeMethod === 'DINHEIRO' ? Math.max(0, valInput - totalAmount) : 0;
      finalPagamentos.push({
        forma_pagamento: activeMethod,
        valor: valInput,
        troco,
        nsu_autorizacao: nsuAuth.trim() || undefined,
      });
    }

    const currentTotalPaid = finalPagamentos.reduce((acc, curr) => acc + curr.valor, 0);
    if (currentTotalPaid < totalAmount - 0.01) return;

    await onConfirmPayment(finalPagamentos);
  };

  const pixPayloadMock = `00020126580014br.gov.bcb.pix01368f9a2b1c-3d4e-5f6a-7b8c-9d0e1f2a3b4c520400005303986540${totalAmount.toFixed(
    2
  )}5802BR5915ERP LOCAL FIRST6009SAO PAULO62070503***6304A1B2`;

  const copyPixKey = () => {
    navigator.clipboard?.writeText(pixPayloadMock);
    setPixCopied(true);
    setTimeout(() => setPixCopied(false), 2000);
  };

  const canFinalize =
    !isProcessing &&
    (pagamentos.length > 0
      ? totalPago >= totalAmount - 0.01
      : numericInputVal >= totalAmount - 0.01);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 55,
      backgroundColor: 'rgba(3, 7, 18, 0.85)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '820px',
        backgroundColor: 'var(--surface-1)',
        border: '1px solid var(--border-strong)',
        borderRadius: '1rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '90vh',
      }}>
        {/* Modal Header */}
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--surface-sunken)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.5rem', backgroundColor: 'var(--status-success-bg)', border: '1px solid var(--status-success-border)', color: 'var(--status-success)', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Banknote style={{ width: '1.25rem', height: '1.25rem' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>Finalizar Pagamento da Venda</h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Selecione uma ou mais formas de pagamento</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem' }}
          >
            <X style={{ width: '1.25rem', height: '1.25rem' }} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 3fr)', flex: 1, overflowY: 'auto' }}>
          {/* Left Column */}
          <div style={{ padding: '1.25rem', backgroundColor: 'var(--surface-sunken)', borderRight: '1px solid var(--border-default)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem' }}>
            <div>
              <div style={{ backgroundColor: 'var(--surface-1)', border: '1px solid var(--border-default)', padding: '1rem', borderRadius: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Valor Total da Venda</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'monospace', color: 'var(--status-success)' }}>
                  R$ {totalAmount.toFixed(2).replace('.', ',')}
                </div>

                <div style={{ paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Total Lançado:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#ffffff' }}>
                    R$ {totalPago.toFixed(2).replace('.', ',')}
                  </span>
                </div>

                {saldoRestante > 0 ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--status-warning)', fontWeight: 700 }}>
                    <span>Falta Pagar:</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 800 }}>
                      R$ {saldoRestante.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--status-success)', fontWeight: 700, backgroundColor: 'var(--status-success-bg)', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid var(--status-success-border)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <CheckCircle2 style={{ width: '1rem', height: '1rem' }} /> Pago Efetivado
                    </span>
                    {trocoCalculado > 0 && (
                      <span style={{ fontFamily: 'monospace' }}>Troco: R$ {trocoCalculado.toFixed(2)}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Added Payments List */}
              <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ffffff', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Pagamentos Adicionados</span>
                  <span style={{ fontSize: '0.625rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>({pagamentos.length})</span>
                </div>

                {pagamentos.length === 0 ? (
                  <div style={{ padding: '1rem', border: '1px dashed var(--border-strong)', borderRadius: '0.5rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Nenhum pagamento lançado ainda.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', maxHeight: '160px', overflowY: 'auto' }}>
                    {pagamentos.map((p, idx) => (
                      <div
                        key={idx}
                        style={{ backgroundColor: 'var(--surface-1)', border: '1px solid var(--border-default)', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem' }}
                      >
                        <div>
                          <span style={{ fontWeight: 700, color: '#ffffff' }}>{p.forma_pagamento}</span>
                          {p.nsu_autorizacao && (
                            <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)', display: 'block', fontFamily: 'monospace' }}>
                              NSU: {p.nsu_autorizacao}
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 800, color: 'var(--status-success)' }}>
                            R$ {p.valor.toFixed(2)}
                          </span>
                          <button
                            onClick={() => handleRemovePayment(idx)}
                            style={{ background: 'none', border: 'none', color: 'var(--status-danger)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                          >
                            <Trash2 style={{ width: '0.875rem', height: '0.875rem' }} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', backgroundColor: 'var(--surface-1)', padding: '0.625rem', borderRadius: '0.5rem', border: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle style={{ width: '1rem', height: '1rem', color: 'var(--status-info)', flexShrink: 0 }} />
              <span>Multi-pagamento suportado. Combine Dinheiro, PIX e Cartões.</span>
            </div>
          </div>

          {/* Right Column */}
          <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem' }}>
            {/* Method Tabs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.375rem', padding: '0.25rem', backgroundColor: 'var(--surface-sunken)', border: '1px solid var(--border-default)', borderRadius: '0.75rem', fontSize: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setActiveMethod('DINHEIRO')}
                style={{
                  padding: '0.5rem',
                  borderRadius: '0.5rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.375rem',
                  backgroundColor: activeMethod === 'DINHEIRO' ? 'var(--status-success-bg)' : 'transparent',
                  color: activeMethod === 'DINHEIRO' ? 'var(--status-success)' : 'var(--text-secondary)',
                }}
              >
                <Banknote style={{ width: '1rem', height: '1rem' }} /> Dinheiro
              </button>
              <button
                type="button"
                onClick={() => setActiveMethod('CARTAO_CREDITO')}
                style={{
                  padding: '0.5rem',
                  borderRadius: '0.5rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.375rem',
                  backgroundColor: activeMethod === 'CARTAO_CREDITO' ? 'var(--status-info-bg)' : 'transparent',
                  color: activeMethod === 'CARTAO_CREDITO' ? 'var(--status-info)' : 'var(--text-secondary)',
                }}
              >
                <CreditCard style={{ width: '1rem', height: '1rem' }} /> Crédito
              </button>
              <button
                type="button"
                onClick={() => setActiveMethod('CARTAO_DEBITO')}
                style={{
                  padding: '0.5rem',
                  borderRadius: '0.5rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.375rem',
                  backgroundColor: activeMethod === 'CARTAO_DEBITO' ? 'var(--status-info-bg)' : 'transparent',
                  color: activeMethod === 'CARTAO_DEBITO' ? 'var(--status-info)' : 'var(--text-secondary)',
                }}
              >
                <CreditCard style={{ width: '1rem', height: '1rem' }} /> Débito
              </button>
              <button
                type="button"
                onClick={() => setActiveMethod('PIX')}
                style={{
                  padding: '0.5rem',
                  borderRadius: '0.5rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.375rem',
                  backgroundColor: activeMethod === 'PIX' ? 'var(--status-ai-bg)' : 'transparent',
                  color: activeMethod === 'PIX' ? 'var(--status-ai)' : 'var(--text-secondary)',
                }}
              >
                <QrCode style={{ width: '1rem', height: '1rem' }} /> PIX
              </button>
              <button
                type="button"
                onClick={() => setActiveMethod('BOLETO')}
                style={{
                  padding: '0.5rem',
                  borderRadius: '0.5rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.375rem',
                  backgroundColor: activeMethod === 'BOLETO' ? 'var(--status-warning-bg)' : 'transparent',
                  color: activeMethod === 'BOLETO' ? 'var(--status-warning)' : 'var(--text-secondary)',
                }}
              >
                <FileText style={{ width: '1rem', height: '1rem' }} /> Crediário
              </button>
            </div>

            {/* Input Form */}
            <div style={{ backgroundColor: 'var(--surface-sunken)', padding: '1rem', border: '1px solid var(--border-default)', borderRadius: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1, justifyContent: 'center' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                  Valor em {activeMethod}:
                </label>
                <Input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="0,00"
                  style={{ width: '100%', fontSize: '1.25rem', fontFamily: 'monospace', fontWeight: 800 }}
                />
              </div>

              {activeMethod === 'DINHEIRO' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <span>Atalhos de valor:</span>
                    <button
                      type="button"
                      onClick={handleExactAmount}
                      style={{ background: 'none', border: 'none', color: 'var(--text-link)', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Exato (R$ {saldoRestante.toFixed(2)})
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {[10, 20, 50, 100].map((amt) => (
                      <Button
                        key={amt}
                        variant="secondary"
                        type="button"
                        onClick={() => handleQuickAmount(amt)}
                        style={{ flex: 1, fontSize: '0.75rem', padding: '0.375rem 0' }}
                      >
                        +{amt}
                      </Button>
                    ))}
                  </div>

                  {numericInputVal > saldoRestante && (
                    <div style={{ padding: '0.625rem', backgroundColor: 'var(--status-success-bg)', border: '1px solid var(--status-success-border)', borderRadius: '0.5rem', color: 'var(--status-success)', fontSize: '0.75rem', fontFamily: 'monospace', fontWeight: 800, display: 'flex', justifyContent: 'space-between' }}>
                      <span>TROCO CALCULADO:</span>
                      <span>R$ {(numericInputVal - saldoRestante).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}

              {(activeMethod === 'CARTAO_CREDITO' || activeMethod === 'CARTAO_DEBITO') && (
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                    NSU / Código Autorização (Opcional):
                  </label>
                  <Input
                    type="text"
                    value={nsuAuth}
                    onChange={(e) => setNsuAuth(e.target.value)}
                    placeholder="Ex: 12345678"
                    style={{ width: '100%' }}
                  />
                </div>
              )}

              {activeMethod === 'PIX' && (
                <div style={{ backgroundColor: 'var(--surface-1)', border: '1px solid var(--border-default)', padding: '0.75rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '4.5rem', height: '4.5rem', backgroundColor: '#ffffff', padding: '0.375rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <QrCode style={{ width: '3.5rem', height: '3.5rem', color: '#0b1120' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.75rem' }}>
                    <span style={{ fontWeight: 800, color: 'var(--status-ai)' }}>QR Code PIX Gerado</span>
                    <p style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', margin: 0 }}>
                      Escaneie com o app do banco ou copie a chave:
                    </p>
                    <Button
                      variant="secondary"
                      type="button"
                      onClick={copyPixKey}
                      style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                    >
                      {pixCopied ? <Check style={{ width: '0.75rem', height: '0.75rem', color: 'var(--status-success)' }} /> : <Copy style={{ width: '0.75rem', height: '0.75rem' }} />}
                      {pixCopied ? 'Copiado!' : 'Copia e Cola PIX'}
                    </Button>
                  </div>
                </div>
              )}

              {saldoRestante > 0 && (
                <Button
                  variant="secondary"
                  type="button"
                  onClick={handleAddPayment}
                  style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem' }}
                >
                  <Plus style={{ width: '0.875rem', height: '0.875rem' }} />
                  Adicionar este pagamento ({activeMethod})
                </Button>
              )}
            </div>

            {/* Bottom Action Footer */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-default)' }}>
              <Button variant="secondary" type="button" onClick={onClose} disabled={isProcessing}>
                Cancelar (Esc)
              </Button>

              <Button
                variant="success"
                type="button"
                onClick={handleFinalize}
                disabled={!canFinalize}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem' }}
              >
                {isProcessing ? (
                  <span>Emitindo NFC-e...</span>
                ) : (
                  <>
                    <span>Confirmar & Emitir NFC-e (F2)</span>
                    <ArrowRight style={{ width: '1rem', height: '1rem' }} />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
