import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Calculator, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '../../lib/formatters';
import { transporteService, PisoMinimoResult } from '../../lib/transporte';

interface PisoMinimoCalculatorProps {
  distanciaKmInicial?: number;
  numeroEixosInicial?: number;
  tipoCargaInicial?: string;
  valorFreteInformado?: number;
  onAplicarPiso?: (valorPiso: number) => void;
}

export const PisoMinimoCalculator: React.FC<PisoMinimoCalculatorProps> = ({
  distanciaKmInicial = 350,
  numeroEixosInicial = 3,
  tipoCargaInicial = 'GERAL',
  valorFreteInformado = 0,
  onAplicarPiso,
}) => {
  const [distanciaKm, setDistanciaKm] = useState(distanciaKmInicial);
  const [numeroEixos, setNumeroEixos] = useState(numeroEixosInicial);
  const [tipoCarga, setTipoCarga] = useState(tipoCargaInicial);
  const [tipoOperacao, setTipoOperacao] = useState<'LOTACAO' | 'FRACIONADA'>('LOTACAO');
  const [resultado, setResultado] = useState<PisoMinimoResult | null>(null);
  const [isCalculando, setIsCalculando] = useState(false);

  const handleCalcular = async () => {
    setIsCalculando(true);
    try {
      const res = await transporteService.calcularPisoMinimo({
        distancia_km: distanciaKm,
        numero_eixos: numeroEixos,
        tipo_carga: tipoCarga,
        tipo_operacao: tipoOperacao,
      });
      setResultado(res);
    } finally {
      setIsCalculando(false);
    }
  };

  const isAbaixoDoPiso = resultado && valorFreteInformado > 0 && valorFreteInformado < resultado.valor_piso_minimo;

  return (
    <div
      style={{
        padding: '14px',
        backgroundColor: 'var(--surface-2)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-default)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Calculator size={15} color="#3b82f6" /> Calculadora de Piso Mínimo de Frete (ANTT)
        </div>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Lei nº 13.703/2018</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '120px 100px 1.5fr 1fr', gap: '8px' }}>
        <div>
          <label className="coliseu-label">Distância (Km):</label>
          <input
            type="number"
            className="coliseu-input"
            value={distanciaKm}
            onChange={(e) => setDistanciaKm(parseFloat(e.target.value) || 0)}
            style={{ height: '32px', textAlign: 'center', fontWeight: 700 }}
          />
        </div>

        <div>
          <label className="coliseu-label">Nº de Eixos:</label>
          <select
            className="coliseu-input"
            value={numeroEixos}
            onChange={(e) => setNumeroEixos(parseInt(e.target.value) || 2)}
            style={{ height: '32px', fontWeight: 700 }}
          >
            <option value={2}>2 Eixos (Toco)</option>
            <option value={3}>3 Eixos (Truck)</option>
            <option value={4}>4 Eixos (Bitruck)</option>
            <option value={5}>5 Eixos (Carreta 2E)</option>
            <option value={6}>6 Eixos (Carreta 3E)</option>
            <option value={7}>7 Eixos (Bitrem)</option>
            <option value={9}>9 Eixos (Rodotrem)</option>
          </select>
        </div>

        <div>
          <label className="coliseu-label">Tipo de Carga:</label>
          <select
            className="coliseu-input"
            value={tipoCarga}
            onChange={(e) => setTipoCarga(e.target.value)}
            style={{ height: '32px', fontWeight: 600 }}
          >
            <option value="GERAL">Carga Geral</option>
            <option value="GRANEL_SOLIDO">Granel Sólido</option>
            <option value="GRANEL_LIQUIDO">Granel Líquido</option>
            <option value="FRIGORIFICADA">Frigorificada / Refrigerada</option>
            <option value="PERIGOSA">Carga Perigosa (Produtos Químicos)</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <Button
            variant="secondary"
            onClick={handleCalcular}
            disabled={isCalculando}
            style={{ width: '100%', height: '32px', fontSize: '11px', fontWeight: 700 }}
          >
            {isCalculando ? 'Calculando...' : 'Calcular Piso'}
          </Button>
        </div>
      </div>

      {resultado && (
        <div
          style={{
            padding: '10px 12px',
            backgroundColor: isAbaixoDoPiso ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
            border: `1px solid ${isAbaixoDoPiso ? '#ef4444' : '#10b981'}`,
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isAbaixoDoPiso ? <ShieldAlert size={20} color="#ef4444" /> : <CheckCircle2 size={20} color="#10b981" />}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 800, color: isAbaixoDoPiso ? '#ef4444' : '#10b981' }}>
                Piso Mínimo Legal: {formatCurrency(resultado.valor_piso_minimo)}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                CCD (R$/km): R$ {resultado.coeficiente_deslocamento_ccd.toFixed(2)} | CC (Carga/Desc): R$ {resultado.coeficiente_carga_descarga_cc.toFixed(2)}
              </div>
            </div>
          </div>

          {onAplicarPiso && (
            <Button
              variant="primary"
              onClick={() => onAplicarPiso(resultado.valor_piso_minimo)}
              style={{ height: '28px', fontSize: '11px', backgroundColor: '#3b82f6', borderColor: '#3b82f6' }}
            >
              Aplicar Valor
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
