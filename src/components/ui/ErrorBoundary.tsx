import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from './Button';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in Coliseu ERP:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '400px',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '32px',
            backgroundColor: 'var(--surface-app)',
          }}
        >
          <div
            className="coliseu-card"
            style={{
              maxWidth: '560px',
              width: '100%',
              padding: '28px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
              border: '1px solid var(--border-subtle)',
              boxShadow: '0 12px 32px rgba(0, 0, 0, 0.25)',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--status-danger)',
              }}
            >
              <AlertTriangle size={24} />
            </div>

            <div>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 600 }}>
                {this.props.fallbackTitle || 'Ocorreu um imprevisto na exibição desta tela'}
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                O sistema capturou o erro e protegeu seus dados. Clique no botão abaixo para restaurar a tela.
              </p>
            </div>

            {this.state.error && (
              <div
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '10px 14px',
                  backgroundColor: 'var(--surface-2)',
                  borderRadius: 'var(--radius-xs)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  fontFamily: 'monospace',
                  overflowX: 'auto',
                  maxHeight: '120px',
                }}
              >
                {this.state.error.toString()}
              </div>
            )}

            <Button variant="primary" size="md" onClick={this.handleReset} style={{ gap: '6px' }}>
              <RotateCcw size={14} />
              <span>Recarregar Tela</span>
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
