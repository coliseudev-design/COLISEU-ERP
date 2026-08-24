import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../lib/formatters';
import { Banknote, CreditCard, QrCode, FileText, Plus, Trash2, Check } from 'lucide-react';

export interface Pagamento {
  especie: string;
  valor: number;
  nsuAutorizacao?: string;
  numeroCheque?: string;
  bancoOrigem?: string;
}

export interface PaymentSplitPanelProps {
  totalAPagar: number;
  pagamentos: Pagamento[];
  onPagamentosChange: (pagamentos: Pagamento[]) => void;
  caixas: Array<{ id: string; nome: string }>;
  contasBancarias: Array<{ id: string; nome: string }>;
  caixaSelecionado: string;
  contaSelecionada: string;
  onCaixaChange: (id: string) => void;
  onContaChange: (id: string) => void;
}

const ESPECIES = ['DINHEIRO', 'PIX', 'CARTÃO CRÉDITO', 'CARTÃO DÉBITO', 'CHEQUE', 'BOLETO'];

export const PaymentSplitPanel: React.FC<PaymentSplitPanelProps> = ({
  totalAPagar,
  pagamentos,
  onPagamentosChange,
  caixas,
  contasBancarias,
  caixaSelecionado,
  contaSelecionada,
  onCaixaChange,
  onContaChange
}) => {
  const [activeEspecie, setActiveEspecie] = useState(ESPECIES[0]);
  const [valorInput, setValorInput] = useState<number>(0);
  const [nsu, setNsu] = useState('');
  const [numCheque, setNumCheque] = useState('');
  const [bancoCheque, setBancoCheque] = useState('');

  const totalPago = pagamentos.reduce((acc, p) => acc + p.valor, 0);
  const faltante = Math.max(0, totalAPagar - totalPago);
  const troco = activeEspecie === 'DINHEIRO' && totalPago + valorInput > totalAPagar ? (totalPago + valorInput) - totalAPagar : 0;
  const percentage = totalAPagar > 0 ? Math.min(100, (totalPago / totalAPagar) * 100) : 0;

  React.useEffect(() => {
    if (pagamentos.length === 0) {
      setValorInput(totalAPagar);
    } else if (faltante > 0) {
      setValorInput(faltante);
    } else {
      setValorInput(0);
    }
  }, [totalAPagar, pagamentos.length, faltante]);

  const handleAddPayment = () => {
    if (valorInput <= 0) return;
    const newPayment: Pagamento = {
      especie: activeEspecie,
      valor: valorInput,
    };
    if (activeEspecie.includes('CARTÃO')) {
      newPayment.nsuAutorizacao = nsu;
    }
    if (activeEspecie === 'CHEQUE') {
      newPayment.numeroCheque = numCheque;
      newPayment.bancoOrigem = bancoCheque;
    }
    onPagamentosChange([...pagamentos, newPayment]);
    setValorInput(0);
    setNsu('');
    setNumCheque('');
    setBancoCheque('');
  };

  const handleRemovePayment = (index: number) => {
    const updated = [...pagamentos];
    updated.splice(index, 1);
    onPagamentosChange(updated);
  };

  const setExactValue = () => {
    setValorInput(faltante);
  };

  const getIconForEspecie = (e: string) => {
    if (e === 'DINHEIRO') return <Banknote size={16} />;
    if (e === 'PIX') return <QrCode size={16} />;
    if (e.includes('CARTÃO')) return <CreditCard size={16} />;
    if (e === 'CHEQUE' || e === 'BOLETO') return <FileText size={16} />;
    return <FileText size={16} />;
  };

  return (
    <div className="coliseu-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px', backgroundColor: 'var(--surface-1)' }}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
        {ESPECIES.map(esp => (
          <button
            key={esp}
            onClick={() => setActiveEspecie(esp)}
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--radius-xl)',
              border: activeEspecie === esp ? '1px solid var(--action-primary)' : '1px solid var(--border-subtle)',
              backgroundColor: activeEspecie === esp ? 'var(--action-primary)' : 'var(--surface-2)',
              color: activeEspecie === esp ? '#fff' : 'var(--text-primary)',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600,
              whiteSpace: 'nowrap'
            }}
          >
            {esp}
          </button>
        ))}
      </div>

      {/* Input Area */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <label className="coliseu-label">Valor do Pagamento</label>
          <div style={{ display: 'flex', gap: '4px' }}>
            <input 
              type="number"
              className="coliseu-input"
              style={{ height: '38px', width: '150px', fontSize: '16px', fontWeight: 'bold' }}
              value={valorInput}
              onChange={e => setValorInput(Number(e.target.value))}
            />
            <Button variant="secondary" onClick={setExactValue}>Valor Exato</Button>
          </div>
        </div>

        {activeEspecie.includes('CARTÃO') && (
          <div>
            <label className="coliseu-label">NSU Autorização</label>
            <input 
              className="coliseu-input"
              style={{ height: '38px' }}
              value={nsu}
              onChange={e => setNsu(e.target.value)}
            />
          </div>
        )}

        {activeEspecie === 'CHEQUE' && (
          <>
            <div>
              <label className="coliseu-label">Nº Cheque</label>
              <input 
                className="coliseu-input"
                style={{ height: '38px', width: '100px' }}
                value={numCheque}
                onChange={e => setNumCheque(e.target.value)}
              />
            </div>
            <div>
              <label className="coliseu-label">Banco</label>
              <input 
                className="coliseu-input"
                style={{ height: '38px', width: '120px' }}
                value={bancoCheque}
                onChange={e => setBancoCheque(e.target.value)}
              />
            </div>
          </>
        )}

        <Button variant="primary" onClick={handleAddPayment} style={{ height: '38px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Plus size={16} /> Adicionar Pagamento
        </Button>
      </div>

      {/* Troco Display */}
      {activeEspecie === 'DINHEIRO' && troco > 0 && (
        <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--status-success)' }}>
          Troco: {formatCurrency(troco)}
        </div>
      )}

      {/* Added payments list */}
      {pagamentos.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {pagamentos.map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: 'var(--surface-sunken)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {getIconForEspecie(p.especie)}
                <span style={{ fontSize: '14px', fontWeight: 600 }}>{p.especie}</span>
                {p.nsuAutorizacao && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>NSU: {p.nsuAutorizacao}</span>}
                {p.numeroCheque && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Chq: {p.numeroCheque}</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{formatCurrency(p.valor)}</span>
                <button onClick={() => handleRemovePayment(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--action-danger)' }}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Progress bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600 }}>
          <span>{formatCurrency(totalPago)} de {formatCurrency(totalAPagar)} ({percentage.toFixed(1)}%)</span>
          {faltante > 0 && <span style={{ color: 'var(--action-danger)' }}>Falta: {formatCurrency(faltante)}</span>}
          {faltante === 0 && <span style={{ color: 'var(--status-success)', display: 'flex', alignItems: 'center', gap: '4px' }}><Check size={14} /> Completo</span>}
        </div>
        <div style={{ height: '8px', backgroundColor: 'var(--surface-3)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
          <div style={{ height: '100%', backgroundColor: percentage >= 100 ? 'var(--status-success)' : 'var(--action-primary)', width: `${percentage}%`, transition: 'width 0.3s ease' }}></div>
        </div>
      </div>

      {/* Bottom selects row */}
      <div style={{ display: 'flex', gap: '16px' }}>
        <div style={{ flex: 1 }}>
          <label className="coliseu-label">Caixa</label>
          <select 
            className="coliseu-input" 
            style={{ height: '38px', width: '100%' }}
            value={caixaSelecionado}
            onChange={e => onCaixaChange(e.target.value)}
          >
            {caixas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label className="coliseu-label">Conta Bancária</label>
          <select 
            className="coliseu-input" 
            style={{ height: '38px', width: '100%' }}
            value={contaSelecionada}
            onChange={e => onContaChange(e.target.value)}
          >
            {contasBancarias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
};
