import React, { useEffect, useId } from 'react';
import { AlertTriangle, ShieldAlert } from 'lucide-react';

interface ActionConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  actionDetails: Array<{ label: string; value: string }>;
  warningMessage?: string;
  confirmButtonText?: string;
  isDanger?: boolean;
}

export const ActionConfirmModal: React.FC<ActionConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  actionDetails,
  warningMessage,
  confirmButtonText = 'Confirmar Operação',
  isDanger = false,
}) => {
  const titleId = useId();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="coliseu-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 'var(--z-modal, 9999)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '460px',
          backgroundColor: 'var(--surface-sunken)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--spacing-6)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)', marginBottom: 'var(--spacing-4)' }}>
          <div
            style={{
              padding: '10px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: isDanger ? 'var(--status-danger-bg, rgba(239, 68, 68, 0.15))' : 'var(--status-info-bg, rgba(59, 130, 246, 0.15))',
              color: isDanger ? 'var(--status-danger)' : 'var(--status-info)',
            }}
          >
            {isDanger ? <ShieldAlert size={24} /> : <AlertTriangle size={24} />}
          </div>
          <h3 id={titleId} style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>{title}</h3>
        </div>

        {/* Resumo Transparente do que acontecerá */}
        <div style={{ backgroundColor: 'var(--surface-1)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', marginBottom: 'var(--spacing-4)' }}>
          <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 'var(--spacing-2)' }}>
            Resumo da Ação
          </div>
          {actionDetails.map((det, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-sm)', margin: '4px 0' }}>
              <span style={{ color: 'var(--text-secondary)' }}>{det.label}:</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{det.value}</span>
            </div>
          ))}
        </div>

        {warningMessage && (
          <p style={{ fontSize: 'var(--font-size-sm)', color: isDanger ? 'var(--status-danger)' : 'var(--status-warning)', marginBottom: '20px' }}>
            {warningMessage}
          </p>
        )}

        {/* Botões de Ação */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-3)' }}>
          <button onClick={onClose} className="coliseu-btn-secondary">
            Cancelar
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={isDanger ? 'coliseu-btn coliseu-btn--danger' : 'coliseu-btn-primary'}
          >
            {confirmButtonText}
          </button>
        </div>
      </div>
    </div>
  );
};
