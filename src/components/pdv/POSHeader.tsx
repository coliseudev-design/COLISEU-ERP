import React, { useEffect, useState } from 'react';
import { Wifi, RefreshCw, AlertTriangle, Store, User, Clock, Keyboard } from 'lucide-react';

export interface POSHeaderProps {
  syncStatus: 'synced' | 'syncing' | 'contingency';
  filialNome?: string;
  filialCnpj?: string;
  operadorNome?: string;
  caixaNumero?: string;
  onManualSync?: () => void;
}

export const POSHeader: React.FC<POSHeaderProps> = ({
  syncStatus,
  filialNome = 'Filial Matriz 01',
  filialCnpj = '12.345.678/0001-90',
  operadorNome = 'Operador PDV',
  caixaNumero = 'CX-01',
  onManualSync,
}) => {
  const [time, setTime] = useState<string>('');
  const [date, setDate] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
      setDate(
        now.toLocaleDateString('pt-BR', {
          weekday: 'short',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header style={{ backgroundColor: 'var(--surface-1)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}>
      {/* Top Main Bar */}
      <div style={{ padding: '6px var(--spacing-4)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--spacing-4)' }}>
        {/* Branch & Terminal Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
            <div style={{ padding: '6px', backgroundColor: 'var(--surface-2)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-xs)', color: 'var(--text-secondary)' }}>
              <Store size={16} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-xs)', color: 'var(--text-primary)' }}>{filialNome}</span>
                <span style={{ fontSize: '10px', fontWeight: 600, padding: '1px 5px', backgroundColor: 'var(--surface-2)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', borderRadius: 'var(--radius-xs)' }}>
                  {caixaNumero}
                </span>
              </div>
              <p style={{ fontSize: '10px', color: 'var(--text-muted)', margin: 0 }}>CNPJ: {filialCnpj}</p>
            </div>
          </div>

          <div style={{ height: '20px', width: '1px', backgroundColor: 'var(--border-subtle)' }} />

          {/* Cashier Operator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
            <User size={13} />
            <span>Operador:</span>
            <span style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--text-primary)' }}>{operadorNome}</span>
          </div>
        </div>

        {/* Sync Status & Clock */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
          <button
            type="button"
            onClick={onManualSync}
            title="Clique para forçar sincronização"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '3px 8px',
              borderRadius: 'var(--radius-xs)',
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--surface-2)',
              fontSize: '11px',
              fontWeight: 'var(--font-weight-medium)',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
            }}
          >
            {syncStatus === 'synced' && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--status-success)' }}>
                <Wifi size={13} />
                <span>Online (Local-First)</span>
              </span>
            )}

            {syncStatus === 'syncing' && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--status-warning)' }}>
                <RefreshCw size={13} className="animate-spin" />
                <span>Sincronizando...</span>
              </span>
            )}

            {syncStatus === 'contingency' && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--status-danger)' }}>
                <AlertTriangle size={13} />
                <span>Contingência Offline</span>
              </span>
            )}
          </button>

          <div style={{ height: '20px', width: '1px', backgroundColor: 'var(--border-subtle)' }} />

          {/* Date & Live Clock */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)', backgroundColor: 'var(--surface-sunken)', padding: '3px 8px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)' }}>
            <Clock size={13} />
            <span style={{ textTransform: 'capitalize' }}>{date}</span>
            <span style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--text-primary)' }} className="tabular-nums">{time}</span>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Hint Bar */}
      <div style={{ backgroundColor: 'var(--surface-sunken)', padding: '3px var(--spacing-4)', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)', fontWeight: 'var(--font-weight-medium)' }}>
            <Keyboard size={12} /> Atalhos PDV:
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <kbd style={{ padding: '1px 4px', backgroundColor: 'var(--surface-2)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', borderRadius: '2px', fontSize: '9px', fontFamily: 'var(--font-family-mono)' }}>F1</kbd>
            Buscar Produto
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <kbd style={{ padding: '1px 4px', backgroundColor: 'var(--surface-2)', border: '1px solid var(--status-success-border)', color: 'var(--status-success)', borderRadius: '2px', fontSize: '9px', fontFamily: 'var(--font-family-mono)' }}>F2</kbd>
            Pagamento
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <kbd style={{ padding: '1px 4px', backgroundColor: 'var(--surface-2)', border: '1px solid var(--status-danger-border)', color: 'var(--status-danger)', borderRadius: '2px', fontSize: '9px', fontFamily: 'var(--font-family-mono)' }}>F3</kbd>
            Cancelar Venda
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <kbd style={{ padding: '1px 4px', backgroundColor: 'var(--surface-2)', border: '1px solid var(--status-warning-border)', color: 'var(--status-warning)', borderRadius: '2px', fontSize: '9px', fontFamily: 'var(--font-family-mono)' }}>F4</kbd>
            Sangria / Suprimento
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <kbd style={{ padding: '1px 4px', backgroundColor: 'var(--surface-2)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', borderRadius: '2px', fontSize: '9px', fontFamily: 'var(--font-family-mono)' }}>Esc</kbd>
            Fechar
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--text-muted)' }}>
          <span>Leitor EAN Ativo</span>
          <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: 'var(--status-success)' }} />
        </div>
      </div>
    </header>
  );
};
