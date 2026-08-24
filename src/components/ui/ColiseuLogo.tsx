import React from 'react';
import { useTheme } from '../../lib/theme';

export interface ColiseuLogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'full' | 'icon' | 'classic';
  className?: string;
  style?: React.CSSProperties;
  showErpBadge?: boolean;
  themeOverride?: 'dark' | 'light';
}

export const ColiseuLogo: React.FC<ColiseuLogoProps> = ({
  size = 'md',
  variant = 'full',
  className = '',
  style,
  showErpBadge = true,
  themeOverride,
}) => {
  const { theme } = useTheme();
  const currentTheme = themeOverride || theme || 'dark';

  const heights = {
    sm: 34,
    md: 42,
    lg: 52,
  };

  const iconSizes = {
    sm: 28,
    md: 34,
    lg: 44,
  };

  const currentHeight = heights[size] || 42;
  const currentIconSize = iconSizes[size] || 34;
  const logoSrc = currentTheme === 'light' ? '/coliseu-logo.png' : '/coliseu-logo-dark.png';

  if (variant === 'icon') {
    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          ...style,
        }}
        className={className}
        title="Coliseu ERP"
      >
        <img
          src="/coliseu-icon.png"
          alt="Coliseu ERP"
          style={{
            width: `${currentIconSize}px`,
            height: `${currentIconSize}px`,
            objectFit: 'contain',
            userSelect: 'none',
          }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        userSelect: 'none',
        ...style,
      }}
      className={className}
    >
      {/* Imagem Oficial da Coliseu Sistemas (Original no modo Claro, Adaptada no modo Escuro) */}
      <img
        src={logoSrc}
        alt="Coliseu ERP"
        style={{
          height: `${currentHeight}px`,
          width: 'auto',
          maxWidth: size === 'lg' ? '220px' : size === 'md' ? '180px' : '150px',
          objectFit: 'contain',
          display: 'block',
        }}
      />

      {showErpBadge && (
        <span
          style={{
            fontSize: size === 'lg' ? '12px' : size === 'md' ? '10px' : '9px',
            fontWeight: 800,
            padding: size === 'lg' ? '2.5px 8px' : size === 'md' ? '2px 6px' : '1.5px 5px',
            borderRadius: '5px',
            backgroundColor: '#0284c7',
            color: '#ffffff',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            lineHeight: 1,
            marginLeft: '3px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }}
        >
          ERP
        </span>
      )}
    </div>
  );
};
