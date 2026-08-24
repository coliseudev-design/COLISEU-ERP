import React from 'react';
import { Breadcrumb, BreadcrumbItem } from '../shell/Breadcrumb';
import { Button } from './Button';

export interface PageHeaderProps {
  title: string;
  description?: string;
  /** @deprecated Use `description` instead */
  subtitle?: string;
  icon?: React.ReactNode;
  breadcrumbItems?: BreadcrumbItem[];
  /** @deprecated Use `breadcrumbItems` instead */
  breadcrumb?: BreadcrumbItem[];
  onNavigateBreadcrumb?: (tabKey: string) => void;
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  children?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  subtitle,
  icon,
  breadcrumbItems,
  breadcrumb,
  onNavigateBreadcrumb,
  primaryAction,
  children,
}) => {
  const desc = description || subtitle;
  const items = breadcrumbItems || breadcrumb;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-1-5)', marginBottom: 'var(--spacing-2)' }}>
      {items && <Breadcrumb items={items} onNavigate={onNavigateBreadcrumb} />}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--spacing-3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2-5)' }}>
          {icon && <div style={{ color: 'var(--text-muted)' }}>{icon}</div>}
          <div>
            <h1
              className="coliseu-page-header__title"
              style={{
                fontSize: 'var(--font-size-lg)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--text-primary)',
                letterSpacing: 'var(--letter-spacing-tight)',
                margin: 0,
                lineHeight: 'var(--line-height-tight)',
              }}
            >
              {title}
            </h1>
            {desc && (
              <p
                className="coliseu-page-header__description"
                style={{
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--text-muted)',
                  marginTop: '2px',
                  lineHeight: 'var(--line-height-normal)',
                }}
              >
                {desc}
              </p>
            )}
          </div>
        </div>
        {primaryAction && (
          <Button variant="primary" size="md" icon={primaryAction.icon} onClick={primaryAction.onClick}>
            {primaryAction.label}
          </Button>
        )}
      </div>
      {children}
    </div>
  );
};
