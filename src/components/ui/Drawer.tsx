import React, { useEffect, useId } from 'react';
import { X } from 'lucide-react';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  width?: string;
  children: React.ReactNode;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  width = '520px',
  children,
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
        zIndex: 'var(--z-overlay, 9990)',
        display: 'flex',
        justifyContent: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        className="coliseu-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        style={{
          width,
          maxWidth: '100vw',
          height: '100%',
          backgroundColor: 'var(--surface-app)',
          borderLeft: '1px solid var(--border-default)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* Header do Drawer */}
        <div style={{ padding: 'var(--spacing-4) var(--spacing-5)', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 id={titleId} style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>{title}</h2>
            {subtitle && <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            style={{ backgroundColor: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', borderRadius: 'var(--radius-sm)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Conteúdo do Drawer */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>{children}</div>
      </div>
    </div>
  );
};
