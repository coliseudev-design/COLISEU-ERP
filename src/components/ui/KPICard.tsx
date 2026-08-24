import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { formatCurrency, formatPercent } from '../../lib/formatters';

export interface KPICardProps {
  title: string;
  value: number | string;
  isCurrency?: boolean;
  change?: number | string;
  changeType?: 'positive' | 'negative' | 'neutral';
  periodLabel?: string;
  actionText?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
  subtitle?: string;
  variant?: 'card' | 'inline';
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  isCurrency = false,
  change,
  changeType = 'neutral',
  periodLabel = 'vs. período anterior',
  actionText,
  onAction,
  icon,
  subtitle,
  variant = 'inline',
}) => {
  const displayValue = typeof value === 'number' && isCurrency ? formatCurrency(value) : value;

  const renderTrend = () => {
    if (change === undefined || change === null) return null;

    if (typeof change === 'string') {
      const color =
        changeType === 'positive'
          ? 'var(--status-success)'
          : changeType === 'negative'
          ? 'var(--status-danger)'
          : 'var(--text-muted)';
      return (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-medium)', color }}>
          <span>{change}</span>
        </div>
      );
    }

    const isPositive = change > 0;
    const isNegative = change < 0;
    const color = isPositive ? 'var(--status-success)' : isNegative ? 'var(--status-danger)' : 'var(--text-muted)';

    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-medium)', color }}>
        {isPositive ? <ArrowUpRight size={13} /> : isNegative ? <ArrowDownRight size={13} /> : <Minus size={13} />}
        <span>{formatPercent(change, true)}</span>
        <span style={{ color: 'var(--text-subtle)', fontWeight: 'var(--font-weight-normal)', marginLeft: '4px' }}>{periodLabel}</span>
      </div>
    );
  };

  const containerStyle: React.CSSProperties =
    variant === 'card'
      ? {
          backgroundColor: 'var(--surface-1)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--spacing-3) var(--spacing-4)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }
      : {
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          padding: 'var(--spacing-2) 0',
        };

  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span
          style={{
            fontSize: 'var(--font-size-xs)',
            fontWeight: 'var(--font-weight-medium)',
            color: 'var(--text-muted)',
            letterSpacing: '0.02em',
          }}
        >
          {title}
        </span>
        {icon && <div style={{ color: 'var(--text-subtle)', opacity: 0.8 }}>{icon}</div>}
      </div>

      <div
        style={{
          fontSize: 'var(--font-size-xl)',
          fontWeight: 'var(--font-weight-semibold)',
          color: 'var(--text-primary)',
          letterSpacing: '-0.01em',
          lineHeight: 'var(--line-height-tight)',
        }}
        className="tabular-nums"
      >
        {displayValue}
      </div>

      {subtitle && (
        <span style={{ fontSize: 'var(--font-size-2xs)', color: 'var(--text-muted)', lineHeight: 1.3 }}>
          {subtitle}
        </span>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
        {renderTrend()}
        {actionText && onAction && (
          <button
            type="button"
            onClick={onAction}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-link)',
              fontSize: 'var(--font-size-xs)',
              fontWeight: 'var(--font-weight-medium)',
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: 0,
            }}
          >
            {actionText}
          </button>
        )}
      </div>
    </div>
  );
};
