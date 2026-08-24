import React from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';

interface AIInsightProps {
  title?: string;
  message?: string;
  description?: string;
  badge?: string;
  actionText?: string;
  onAction?: () => void;
}

export const AIInsight: React.FC<AIInsightProps> = ({
  title = 'Análise de Inteligência Contextual',
  message,
  description,
  badge = 'Insight gerado por IA',
  actionText,
  onAction,
}) => {
  const content = description || message;

  return (
    <div className="coliseu-insight">
      <div className="coliseu-insight-header">
        <span className="coliseu-insight-title">{title}</span>
        <span className="coliseu-insight-tag">{badge}</span>
      </div>
      <p className="coliseu-insight-body">{content}</p>
      {actionText && onAction && (
        <div className="coliseu-insight-footer">
          <button
            type="button"
            onClick={onAction}
            className="coliseu-btn coliseu-btn-secondary coliseu-btn--sm"
          >
            <span>{actionText}</span>
            <ArrowRight aria-hidden="true" size={12} />
          </button>
        </div>
      )}
    </div>
  );
};

export const AISuggestion: React.FC<{ message: string; onApply?: () => void }> = ({
  message,
  onApply,
}) => {
  return (
    <div
      style={{
        backgroundColor: 'var(--surface-2)',
        border: '1px solid var(--border-subtle)',
        borderLeft: '3px solid var(--status-info)',
        padding: '8px 12px',
        borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'var(--spacing-3)',
      }}
    >
      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
        <span style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--text-primary)' }}>
          Sugestão do Sistema:{' '}
        </span>
        {message}
      </div>
      {onApply && (
        <button
          type="button"
          onClick={onApply}
          className="coliseu-btn coliseu-btn-secondary coliseu-btn--sm"
        >
          Aplicar
        </button>
      )}
    </div>
  );
};

export const AIProcessing: React.FC<{ statusText?: string }> = ({
  statusText = 'Processando análise contextual...',
}) => {
  return (
    <div
      aria-live="polite"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--spacing-2)',
        fontSize: 'var(--font-size-xs)',
        color: 'var(--text-muted)',
      }}
    >
      <Loader2 aria-hidden="true" size={13} className="animate-spin" />
      <span>{statusText}</span>
    </div>
  );
};

export const AIConfidence: React.FC<{ label: string; score: number }> = ({ label, score }) => {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: 'var(--font-size-2xs)',
        color: 'var(--text-muted)',
        backgroundColor: 'var(--surface-sunken)',
        padding: '1px 6px',
        borderRadius: 'var(--radius-xs)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <span>{label}:</span>
      <span
        style={{
          fontWeight: 'var(--font-weight-semibold)',
          color: score >= 80 ? 'var(--status-success)' : 'var(--status-warning)',
        }}
      >
        {score}%
      </span>
    </div>
  );
};
