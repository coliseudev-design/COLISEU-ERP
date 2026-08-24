import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

export interface FiscalContingencyBannerProps {
  isContingency: boolean;
  pendingCount: number;
  onRetransmit: () => Promise<void>;
  isRetransmitting?: boolean;
}

export const FiscalContingencyBanner: React.FC<FiscalContingencyBannerProps> = ({
  isContingency,
  pendingCount,
  onRetransmit,
  isRetransmitting = false,
}) => {
  if (!isContingency && pendingCount === 0) {
    return null;
  }

  return (
    <div style={{
      backgroundColor: '#1e1b4b',
      borderBottom: '1px solid #f59e0b',
      padding: '0.5rem 1.5rem',
      color: '#f8fafc',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', fontSize: '0.75rem' }}>
        {/* Banner Left Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ padding: '0.375rem', backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', borderRadius: '0.5rem', border: '1px solid rgba(245, 158, 11, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle style={{ width: '1.25rem', height: '1.25rem' }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: '#fde047' }}>
              <span>CONTINGÊNCIA OFFLINE SEFAZ ATIVA (tpEmis = 9)</span>
              <Badge variant="warning">
                {pendingCount} {pendingCount === 1 ? 'doc pendente' : 'docs pendentes'}
              </Badge>
            </div>
            <p style={{ fontSize: '0.6875rem', color: '#cbd5e1', margin: '0.125rem 0 0 0' }}>
              Vendas emitidas com validação local e impressas em 2 vias. As NFC-e serão retransmitidas automaticamente.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <Button
          variant="secondary"
          onClick={onRetransmit}
          disabled={isRetransmitting}
          style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
        >
          <RefreshCw style={{ width: '0.875rem', height: '0.875rem' }} />
          <span>{isRetransmitting ? 'Retransmitindo...' : 'Forçar Retransmissão'}</span>
        </Button>
      </div>
    </div>
  );
};
