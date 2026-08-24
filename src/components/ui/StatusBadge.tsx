import React from 'react';
import { Badge, BadgeVariant } from './Badge';

export type ERPStatus =
  | 'Ativo'
  | 'Inativo'
  | 'Pendente'
  | 'Em análise'
  | 'Aprovado'
  | 'Rejeitado'
  | 'Cancelado'
  | 'Concluído'
  | 'Bloqueado'
  | 'Crítico'
  | string;

export interface StatusBadgeProps {
  status: ERPStatus;
  label?: string;
  style?: React.CSSProperties;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, style }) => {
  const displayLabel = label || status;

  const getStatusVariant = (st: string): { variant: BadgeVariant; dotColor: string } => {
    const lower = st.toLowerCase().trim();
    if (['ativo', 'aprovado', 'concluído', 'concluido', 'pago', 'autorizada', 'faturado', 'success'].includes(lower)) {
      return { variant: 'success', dotColor: 'var(--status-success)' };
    }
    if (['pendente', 'em análise', 'em analise', 'rascunho', 'processando', 'warning'].includes(lower)) {
      return { variant: 'warning', dotColor: 'var(--status-warning)' };
    }
    if (['inativo', 'rejeitado', 'cancelado', 'bloqueado', 'crítico', 'critico', 'vencido', 'erro', 'danger'].includes(lower)) {
      return { variant: 'danger', dotColor: 'var(--status-danger)' };
    }
    return { variant: 'neutral', dotColor: 'var(--status-neutral)' };
  };

  const { variant, dotColor } = getStatusVariant(status);

  return (
    <Badge
      variant={variant}
      style={style}
      icon={<span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: dotColor, display: 'inline-block' }} />}
    >
      {displayLabel}
    </Badge>
  );
};
