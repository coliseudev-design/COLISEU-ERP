import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../lib/formatters';
import {
  Sliders,
  Save,
  X,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import {
  ConfigProjecaoCaixa,
  getConfigProjecao,
  salvarConfigProjecao,
} from '../../lib/fluxoCaixaProjetado';

interface ModalSimuladorCenariosCaixaProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ModalSimuladorCenariosCaixa: React.FC<ModalSimuladorCenariosCaixaProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [config, setConfig] = useState<ConfigProjecaoCaixa>(getConfigProjecao);

  if (!isOpen) return null;

  const handleSalvar = (e: React.FormEvent) => {
    e.preventDefault();
    salvarConfigProjecao(config);
    onSuccess();
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 11000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '640px',
          maxHeight: '94vh',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sliders size={20} color="#3b82f6" />
            <div>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Simulador de Estresse de Caixa & Premissas de Projeção
              </h2>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Ajuste os parâmetros de inadimplência esperada e provisões de custos fixos.
              </div>
            </div>
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
        <form onSubmit={handleSalvar} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label className="coliseu-label">Provisão para Inadimplência / Atrasos (%)</label>
            <input
              type="number"
              step="0.5"
              min="0"
              max="30"
              value={config.inadimplenciaEsperadaPercent}
              onChange={(e) => setConfig({ ...config, inadimplenciaEsperadaPercent: parseFloat(e.target.value) || 0 })}
              className="coliseu-input"
              style={{ height: '38px', width: '100%', textAlign: 'center', fontWeight: 700, fontSize: '15px' }}
            />
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Percentual abatido preventivamente das entradas futuras para evitar frustração de liquidez.
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label className="coliseu-label">Custos Fixos Mensais (R$)</label>
              <input
                type="number"
                step="500"
                value={config.provisaoCustosFixosMensal}
                onChange={(e) => setConfig({ ...config, provisaoCustosFixosMensal: parseFloat(e.target.value) || 0 })}
                className="coliseu-input"
                style={{ height: '38px', width: '100%', textAlign: 'right', fontWeight: 700 }}
              />
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Aluguéis, água, luz, telecom e softwares.
              </div>
            </div>

            <div>
              <label className="coliseu-label">Folha & Comissões Mensais (R$)</label>
              <input
                type="number"
                step="500"
                value={config.provisaoFolhaComissoesMensal}
                onChange={(e) => setConfig({ ...config, provisaoFolhaComissoesMensal: parseFloat(e.target.value) || 0 })}
                className="coliseu-input"
                style={{ height: '38px', width: '100%', textAlign: 'right', fontWeight: 700 }}
              />
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Salários, encargos e pró-labore.
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px', borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" leftIcon={<Save size={16} />}>
              Salvar Premissas
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
