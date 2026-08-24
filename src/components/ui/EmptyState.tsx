import React from 'react';
import { PackageOpen } from 'lucide-react';

export interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'Nenhum registro encontrado',
  description = 'Não há dados disponíveis nesta visualização ou com os filtros aplicados.',
  icon = <PackageOpen size={40} color="var(--text-muted)" />,
  action,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        textAlign: 'center',
        backgroundColor: 'var(--surface-2)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      <div style={{ marginBottom: '16px' }}>{icon}</div>
      <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{title}</h3>
      <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '400px' }}>{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
};
