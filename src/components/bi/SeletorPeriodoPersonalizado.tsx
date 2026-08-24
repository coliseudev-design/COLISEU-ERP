import React, { useState, useEffect } from 'react';
import { Calendar, ChevronDown, Check } from 'lucide-react';

export type PeriodoPreset =
  | 'hoje'
  | 'ontem'
  | '7dias'
  | 'mes'
  | 'mes_ant'
  | '30dias'
  | 'trimestre'
  | 'ano'
  | 'personalizado';

export interface SeletorPeriodoProps {
  dataInicio: string;
  dataFim: string;
  onChange: (dataInicio: string, dataFim: string, label: string) => void;
}

export const SeletorPeriodoPersonalizado: React.FC<SeletorPeriodoProps> = ({
  dataInicio,
  dataFim,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [preset, setPreset] = useState<PeriodoPreset>('mes');
  const [customIni, setCustomIni] = useState(dataInicio);
  const [customFim, setCustomFim] = useState(dataFim);

  const getDatasPreset = (p: PeriodoPreset): { ini: string; fim: string; label: string } => {
    const hoje = new Date();
    const formatYMD = (d: Date) => d.toISOString().split('T')[0];

    switch (p) {
      case 'hoje': {
        const dStr = formatYMD(hoje);
        return { ini: dStr, fim: dStr, label: 'Hoje (Tempo Real)' };
      }
      case 'ontem': {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        const dStr = formatYMD(d);
        return { ini: dStr, fim: dStr, label: 'Ontem' };
      }
      case '7dias': {
        const d = new Date();
        d.setDate(d.getDate() - 6);
        return { ini: formatYMD(d), fim: formatYMD(hoje), label: 'Últimos 7 dias' };
      }
      case 'mes': {
        const iniMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        const mesNome = hoje.toLocaleString('pt-BR', { month: 'long' });
        const mesCapitalizado = mesNome.charAt(0).toUpperCase() + mesNome.slice(1);
        return {
          ini: formatYMD(iniMes),
          fim: formatYMD(hoje),
          label: `${mesCapitalizado} / ${hoje.getFullYear()} (Mês Atual)`,
        };
      }
      case 'mes_ant': {
        const iniMesAnt = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
        const fimMesAnt = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
        return { ini: formatYMD(iniMesAnt), fim: formatYMD(fimMesAnt), label: 'Mês Anterior' };
      }
      case '30dias': {
        const d = new Date();
        d.setDate(d.getDate() - 29);
        return { ini: formatYMD(d), fim: formatYMD(hoje), label: 'Últimos 30 dias' };
      }
      case 'trimestre': {
        const d = new Date();
        d.setDate(d.getDate() - 90);
        return { ini: formatYMD(d), fim: formatYMD(hoje), label: 'Último Trimestre (90d)' };
      }
      case 'ano': {
        const iniAno = new Date(hoje.getFullYear(), 0, 1);
        return { ini: formatYMD(iniAno), fim: formatYMD(hoje), label: `Ano ${hoje.getFullYear()}` };
      }
      case 'personalizado':
      default: {
        return {
          ini: customIni,
          fim: customFim,
          label: `${customIni.split('-').reverse().join('/')} até ${customFim.split('-').reverse().join('/')}`,
        };
      }
    }
  };

  const handleSelectPreset = (p: PeriodoPreset) => {
    setPreset(p);
    if (p !== 'personalizado') {
      const { ini, fim, label } = getDatasPreset(p);
      setCustomIni(ini);
      setCustomFim(fim);
      onChange(ini, fim, label);
      setIsOpen(false);
    }
  };

  const handleAplicarPersonalizado = () => {
    if (customIni && customFim) {
      setPreset('personalizado');
      const label = `${customIni.split('-').reverse().join('/')} até ${customFim.split('-').reverse().join('/')}`;
      onChange(customIni, customFim, label);
      setIsOpen(false);
    }
  };

  const currentLabel = getDatasPreset(preset).label;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          backgroundColor: 'var(--surface-sunken)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-xs)',
          padding: '4px 8px',
          fontSize: '11px',
          fontWeight: 'var(--font-weight-medium)',
          cursor: 'pointer',
          transition: 'all var(--motion-fast) var(--motion-ease)',
        }}
      >
        <Calendar size={12} style={{ color: 'var(--action-primary)' }} />
        <span>{currentLabel}</span>
        <ChevronDown size={11} style={{ color: 'var(--text-muted)' }} />
      </button>

      {isOpen && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 998 }}
            onClick={() => setIsOpen(false)}
          />
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              zIndex: 999,
              backgroundColor: 'var(--surface-1)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-sm)',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
              padding: 'var(--spacing-3)',
              width: '320px',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--spacing-2)',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
              Selecionar Período de Análise
            </div>

            {/* Presets Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
              {[
                { key: 'hoje', label: 'Hoje' },
                { key: 'ontem', label: 'Ontem' },
                { key: '7dias', label: 'Últimos 7 dias' },
                { key: 'mes', label: 'Este Mês' },
                { key: 'mes_ant', label: 'Mês Anterior' },
                { key: '30dias', label: 'Últimos 30 dias' },
                { key: 'trimestre', label: 'Trimestre' },
                { key: 'ano', label: 'Este Ano' },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleSelectPreset(item.key as PeriodoPreset)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '4px 8px',
                    fontSize: '11px',
                    textAlign: 'left',
                    backgroundColor: preset === item.key ? 'var(--surface-2)' : 'transparent',
                    color: preset === item.key ? 'var(--action-primary)' : 'var(--text-secondary)',
                    border: '1px solid',
                    borderColor: preset === item.key ? 'var(--action-primary)' : 'var(--border-subtle)',
                    borderRadius: 'var(--radius-xs)',
                    cursor: 'pointer',
                  }}
                >
                  <span>{item.label}</span>
                  {preset === item.key && <Check size={11} />}
                </button>
              ))}
            </div>

            <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)', margin: '4px 0' }} />

            {/* Personalizado de Data X até Data Y */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>
                PERÍODO PERSONALIZADO (DE X ATÉ Y)
              </span>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <div>
                  <label style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>
                    Data Início:
                  </label>
                  <input
                    type="date"
                    value={customIni}
                    onChange={(e) => setCustomIni(e.target.value)}
                    style={{
                      width: '100%',
                      backgroundColor: 'var(--surface-sunken)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-default)',
                      borderRadius: 'var(--radius-xs)',
                      padding: '3px 6px',
                      fontSize: '11px',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>
                    Data Fim:
                  </label>
                  <input
                    type="date"
                    value={customFim}
                    onChange={(e) => setCustomFim(e.target.value)}
                    style={{
                      width: '100%',
                      backgroundColor: 'var(--surface-sunken)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-default)',
                      borderRadius: 'var(--radius-xs)',
                      padding: '3px 6px',
                      fontSize: '11px',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleAplicarPersonalizado}
                className="coliseu-btn coliseu-btn-primary coliseu-btn--sm"
                style={{ width: '100%', marginTop: '4px', justifyContent: 'center' }}
              >
                Aplicar Intervalo de Datas
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
