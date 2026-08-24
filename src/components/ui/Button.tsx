import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'success' | 'warning' | 'ghost' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  icon?: React.ReactNode;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  leftIcon,
  rightIcon,
  children,
  className = '',
  disabled,
  style,
  ...props
}) => {
  const displayLeftIcon = leftIcon || icon;
  
  const variantClass = variant === 'outline' ? 'coliseu-btn--secondary' : `coliseu-btn--${variant}`;
  const sizeClass = `coliseu-btn--${size}`;
  const combinedClassName = `coliseu-btn ${variantClass} ${sizeClass} ${className}`.trim();

  return (
    <button
      className={combinedClassName}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      style={style}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
      ) : (
        displayLeftIcon
      )}
      {children && <span>{children}</span>}
      {rightIcon && !isLoading && rightIcon}
    </button>
  );
};
