import React from 'react';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  tabKey?: string;
  active?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  onNavigate?: (tabKey: string) => void;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, onNavigate }) => {
  return (
    <nav
      aria-label="Navegação estrutural"
      style={{
        display: 'flex',
        alignItems: 'center',
        fontSize: 'var(--font-size-sm)',
        color: 'var(--text-secondary)',
        marginBottom: 'var(--spacing-2)',
      }}
    >
      <ol
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-1-5)',
          listStyle: 'none',
          padding: 0,
          margin: 0,
        }}
      >
        <li style={{ display: 'inline-flex', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => onNavigate?.('dashboard')}
            disabled={!onNavigate}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--spacing-1)',
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: onNavigate ? 'pointer' : 'default',
              fontSize: 'var(--font-size-sm)',
              padding: 0,
            }}
          >
            <Home size={13} aria-hidden="true" />
            <span>Início</span>
          </button>
        </li>

        {items.map((item, idx) => {
          const isLast = idx === items.length - 1 || item.active;
          return (
            <li
              key={idx}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--spacing-1-5)',
              }}
            >
              <ChevronRight size={12} style={{ color: 'var(--text-disabled)' }} aria-hidden="true" />
              {isLast ? (
                <span
                  aria-current="page"
                  style={{
                    color: 'var(--text-primary)',
                    fontWeight: 'var(--font-weight-semibold)',
                  }}
                >
                  {item.label}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => item.tabKey && onNavigate?.(item.tabKey)}
                  disabled={!item.tabKey || !onNavigate}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    fontWeight: 'var(--font-weight-normal)',
                    cursor: item.tabKey && onNavigate ? 'pointer' : 'default',
                    fontSize: 'var(--font-size-sm)',
                    padding: 0,
                  }}
                >
                  {item.label}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
