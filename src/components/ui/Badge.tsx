import React from 'react';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'ai' | 'neutral' | 'default';

export interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  icon?: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  children,
  icon,
  style,
  className = '',
}) => {
  const badgeClass = `coliseu-badge coliseu-badge--${variant} ${className}`.trim();

  return (
    <span
      className={badgeClass}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {icon}
      <span>{children}</span>
    </span>
  );
};
