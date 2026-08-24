import React from 'react';
import { formatCurrency } from '../../lib/formatters';

export interface LiquidacaoResumoProps {
  subtotal: number;
  desconto: number;
  juros: number;
  multa: number;
  valorLiquidar: number;
  qtdTitulos: number;
  onDescontoChange: (value: number) => void;
  onJurosChange: (value: number) => void;
  onMultaChange: (value: number) => void;
}

export const LiquidacaoResumo: React.FC<LiquidacaoResumoProps> = ({
  subtotal,
  desconto,
  juros,
  multa,
  valorLiquidar,
  qtdTitulos,
  onDescontoChange,
  onJurosChange,
  onMultaChange
}) => {
  return (
    <fieldset style={{ padding: '16px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
      <legend style={{ padding: '0 8px', fontWeight: 600, color: 'var(--text-primary)' }}>
        Resumo da Liquidação
      </legend>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <div>
          <label className="coliseu-label" style={{ fontSize: '12px', marginBottom: '6px', display: 'block' }}>Sub-Total</label>
          <input 
            className="coliseu-input"
            style={{ height: '38px', width: '100%' }}
            value={formatCurrency(subtotal)}
            readOnly
          />
        </div>
        <div>
          <label className="coliseu-label" style={{ fontSize: '12px', marginBottom: '6px', display: 'block' }}>Desconto</label>
          <input 
            type="number"
            className="coliseu-input"
            style={{ height: '38px', width: '100%' }}
            value={desconto}
            onChange={(e) => onDescontoChange(Number(e.target.value))}
          />
        </div>
        <div>
          <label className="coliseu-label" style={{ fontSize: '12px', marginBottom: '6px', display: 'block' }}>Nº Títulos Selecionados</label>
          <input 
            className="coliseu-input"
            style={{ height: '38px', width: '100%' }}
            value={qtdTitulos}
            readOnly
          />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
        <div>
          <label className="coliseu-label" style={{ fontSize: '12px', marginBottom: '6px', display: 'block' }}>Juros</label>
          <input 
            type="number"
            className="coliseu-input"
            style={{ height: '38px', width: '100%' }}
            value={juros}
            onChange={(e) => onJurosChange(Number(e.target.value))}
          />
        </div>
        <div>
          <label className="coliseu-label" style={{ fontSize: '12px', marginBottom: '6px', display: 'block' }}>Multa</label>
          <input 
            type="number"
            className="coliseu-input"
            style={{ height: '38px', width: '100%' }}
            value={multa}
            onChange={(e) => onMultaChange(Number(e.target.value))}
          />
        </div>
        <div>
          <label className="coliseu-label" style={{ fontSize: '12px', marginBottom: '6px', display: 'block', fontWeight: 'bold' }}>Valor a Liquidar</label>
          <div style={{ height: '38px', display: 'flex', alignItems: 'center', fontSize: '18px', fontWeight: 'bold', color: 'var(--status-success)' }}>
            {formatCurrency(valorLiquidar)}
          </div>
        </div>
      </div>
    </fieldset>
  );
};
