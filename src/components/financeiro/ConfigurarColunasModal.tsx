import React from 'react';
import { Button } from '../ui/Button';
import { X, GripVertical, ArrowUp, ArrowDown, RotateCcw, Check, SlidersHorizontal } from 'lucide-react';

export interface ColumnItem {
  id: string;
  label: string;
  field: any;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface ConfigurarColunasModalProps {
  isOpen: boolean;
  onClose: () => void;
  columns: ColumnItem[];
  onSaveColumns: (newColumns: ColumnItem[]) => void;
  onResetColumns: () => void;
}

export const ConfigurarColunasModal: React.FC<ConfigurarColunasModalProps> = ({
  isOpen,
  onClose,
  columns,
  onSaveColumns,
  onResetColumns,
}) => {
  const [localCols, setLocalCols] = React.useState<ColumnItem[]>(columns);

  React.useEffect(() => {
    setLocalCols(columns);
  }, [columns, isOpen]);

  if (!isOpen) return null;

  const moveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...localCols];
    const item = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = item;
    setLocalCols(updated);
  };

  const moveDown = (index: number) => {
    if (index === localCols.length - 1) return;
    const updated = [...localCols];
    const item = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = item;
    setLocalCols(updated);
  };

  const handleSave = () => {
    onSaveColumns(localCols);
    onClose();
  };

  const handleReset = () => {
    onResetColumns();
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(2px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        className="coliseu-card"
        style={{
          width: '100%',
          maxWidth: '460px',
          backgroundColor: 'var(--surface-1)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.4)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--surface-2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <SlidersHorizontal size={16} color="var(--action-primary)" />
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Personalizar Ordem das Colunas</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="coliseu-btn coliseu-btn--ghost coliseu-btn--xs"
            style={{ padding: '4px' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Informação */}
        <div style={{ padding: '12px 16px 6px 16px', fontSize: '11px', color: 'var(--text-secondary)' }}>
          Altere a ordem das colunas da tabela conforme sua preferência de trabalho. O layout é salvo automaticamente no seu perfil.
        </div>

        {/* Lista de Colunas */}
        <div style={{ padding: '8px 16px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {localCols.map((col, index) => (
            <div
              key={col.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 10px',
                backgroundColor: 'var(--surface-2)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-xs)',
                fontSize: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '11px', width: '16px', textAlign: 'right' }}>
                  {index + 1}.
                </span>
                <span style={{ fontWeight: 500 }}>{col.label}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => moveUp(index)}
                  style={{
                    border: 'none',
                    background: 'none',
                    cursor: index === 0 ? 'not-allowed' : 'pointer',
                    opacity: index === 0 ? 0.3 : 0.8,
                    padding: '2px 4px',
                    borderRadius: 'var(--radius-xs)',
                    color: 'var(--text-primary)',
                  }}
                  title="Mover para a esquerda / cima"
                >
                  <ArrowUp size={13} />
                </button>
                <button
                  type="button"
                  disabled={index === localCols.length - 1}
                  onClick={() => moveDown(index)}
                  style={{
                    border: 'none',
                    background: 'none',
                    cursor: index === localCols.length - 1 ? 'not-allowed' : 'pointer',
                    opacity: index === localCols.length - 1 ? 0.3 : 0.8,
                    padding: '2px 4px',
                    borderRadius: 'var(--radius-xs)',
                    color: 'var(--text-primary)',
                  }}
                  title="Mover para a direita / baixo"
                >
                  <ArrowDown size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--surface-2)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Button variant="secondary" size="sm" onClick={handleReset} style={{ gap: '4px' }}>
            <RotateCcw size={12} />
            <span>Restaurar Padrão</span>
          </Button>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancelar
            </Button>
            <Button variant="primary" size="sm" onClick={handleSave} style={{ gap: '4px' }}>
              <Check size={14} />
              <span>Salvar Ordem</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
