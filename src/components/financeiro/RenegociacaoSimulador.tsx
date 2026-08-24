import React, { useState, useMemo } from 'react';
import { Button } from '../ui/Button';
import { formatCurrency, formatDate } from '../../lib/formatters';
import { Titulo } from './TitulosSelecionaveisGrid';

export interface RenegociacaoConfig {
  descontoPercent: number;
  acrescimoPercent: number;
  numParcelas: number;
  intervaloDias: number;
  dataPrimeiraParcela: string;
  especieNovasParcelas: string;
}

export interface RenegociacaoSimuladorProps {
  titulosSelecionados: Titulo[];
  onConfirmar: (config: RenegociacaoConfig) => void;
  onCancelar: () => void;
}

export const RenegociacaoSimulador: React.FC<RenegociacaoSimuladorProps> = ({
  titulosSelecionados,
  onConfirmar,
  onCancelar
}) => {
  const [descontoPercent, setDescontoPercent] = useState<number>(0);
  const [acrescimoPercent, setAcrescimoPercent] = useState<number>(0);
  const [numParcelas, setNumParcelas] = useState<number>(1);
  const [intervaloDias, setIntervaloDias] = useState<number>(30);
  const [dataPrimeiraParcela, setDataPrimeiraParcela] = useState<string>(new Date().toISOString().split('T')[0]);
  const [especieNovasParcelas, setEspecieNovasParcelas] = useState<string>('BOLETO');

  const dividaOriginal = titulosSelecionados.reduce((acc, t) => acc + t.valorAtual, 0);
  const desconto = dividaOriginal * (descontoPercent / 100);
  const acrescimo = (dividaOriginal - desconto) * (acrescimoPercent / 100);
  const valorAcordo = dividaOriginal - desconto + acrescimo;

  const parcelasSimuladas = useMemo(() => {
    if (numParcelas < 1) return [];
    
    const valorBase = Math.floor((valorAcordo / numParcelas) * 100) / 100;
    const diferenca = Math.round((valorAcordo - (valorBase * numParcelas)) * 100) / 100;
    
    const result = [];
    let currentDate = new Date(dataPrimeiraParcela);
    
    for (let i = 1; i <= numParcelas; i++) {
      const isUltima = i === numParcelas;
      result.push({
        parcela: i,
        vencimento: new Date(currentDate).toISOString(),
        valor: isUltima ? valorBase + diferenca : valorBase
      });
      currentDate.setDate(currentDate.getDate() + intervaloDias);
    }
    
    return result;
  }, [valorAcordo, numParcelas, intervaloDias, dataPrimeiraParcela]);

  const handleConfirm = () => {
    onConfirmar({
      descontoPercent,
      acrescimoPercent,
      numParcelas,
      intervaloDias,
      dataPrimeiraParcela,
      especieNovasParcelas
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
        {titulosSelecionados.length} títulos selecionados — Dívida Original: {formatCurrency(dividaOriginal)}
      </div>

      <fieldset style={{ padding: '16px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
        <legend style={{ padding: '0 8px', fontWeight: 600, color: 'var(--text-primary)' }}>Configuração da Renegociação</legend>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label className="coliseu-label">Desconto sobre Juros/Multa (%)</label>
            <input 
              type="number"
              className="coliseu-input"
              style={{ height: '38px', width: '100%' }}
              value={descontoPercent}
              onChange={e => setDescontoPercent(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="coliseu-label">Acréscimo de Renegociação (%)</label>
            <input 
              type="number"
              className="coliseu-input"
              style={{ height: '38px', width: '100%' }}
              value={acrescimoPercent}
              onChange={e => setAcrescimoPercent(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="coliseu-label">Nº de Parcelas</label>
            <div style={{ display: 'flex', gap: '4px' }}>
              <input 
                type="number"
                min={1}
                max={48}
                className="coliseu-input"
                style={{ height: '38px', width: '60px' }}
                value={numParcelas}
                onChange={e => setNumParcelas(Number(e.target.value))}
              />
              {[3, 6, 12, 24].map(n => (
                <Button key={n} variant="secondary" onClick={() => setNumParcelas(n)}>{n}</Button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
          <div>
            <label className="coliseu-label">Intervalo entre Parcelas</label>
            <select 
              className="coliseu-input"
              style={{ height: '38px', width: '100%' }}
              value={intervaloDias}
              onChange={e => setIntervaloDias(Number(e.target.value))}
            >
              <option value={30}>30 dias</option>
              <option value={45}>45 dias</option>
              <option value={60}>60 dias</option>
              <option value={90}>90 dias</option>
            </select>
          </div>
          <div>
            <label className="coliseu-label">Data da 1ª Parcela</label>
            <input 
              type="date"
              className="coliseu-input"
              style={{ height: '38px', width: '100%' }}
              value={dataPrimeiraParcela}
              onChange={e => setDataPrimeiraParcela(e.target.value)}
            />
          </div>
          <div>
            <label className="coliseu-label">Espécie das Novas Parcelas</label>
            <select 
              className="coliseu-input"
              style={{ height: '38px', width: '100%' }}
              value={especieNovasParcelas}
              onChange={e => setEspecieNovasParcelas(e.target.value)}
            >
              <option value="BOLETO">BOLETO</option>
              <option value="CARNÊ">CARNÊ</option>
              <option value="PROMISSÓRIA">PROMISSÓRIA</option>
            </select>
          </div>
        </div>
      </fieldset>

      <div>
        <h4 style={{ marginBottom: '8px', fontWeight: 'bold' }}>SIMULAÇÃO DO ACORDO</h4>
        <div style={{ display: 'flex', gap: '24px', marginBottom: '12px', fontSize: '14px', backgroundColor: 'var(--surface-sunken)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
          <div>Dívida Original: <b>{formatCurrency(dividaOriginal)}</b></div>
          <div style={{ color: 'var(--action-danger)' }}>(-) Desconto: <b>{formatCurrency(desconto)}</b></div>
          <div style={{ color: 'var(--status-warning)' }}>(+) Acréscimo: <b>{formatCurrency(acrescimo)}</b></div>
          <div style={{ color: 'var(--status-success)' }}>(=) Valor do Acordo: <b>{formatCurrency(valorAcordo)}</b></div>
        </div>

        <div className="coliseu-table-container" style={{ maxHeight: '200px', overflowY: 'auto' }}>
          <table className="coliseu-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr>
                <th>Parc.</th>
                <th>Vencimento</th>
                <th style={{ textAlign: 'right' }}>Valor</th>
              </tr>
            </thead>
            <tbody>
              {parcelasSimuladas.map(p => (
                <tr key={p.parcela}>
                  <td>{p.parcela}</td>
                  <td>{formatDate(p.vencimento)}</td>
                  <td className="tabular-nums" style={{ textAlign: 'right' }}>{formatCurrency(p.valor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
        <Button variant="ghost" onClick={onCancelar}>Cancelar</Button>
        <Button variant="success" onClick={handleConfirm}>✓ Confirmar Acordo</Button>
      </div>
    </div>
  );
};
