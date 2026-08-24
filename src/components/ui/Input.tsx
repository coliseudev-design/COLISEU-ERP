import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  required?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  helperText,
  error,
  required,
  leftIcon,
  rightIcon,
  id,
  className = '',
  disabled,
  style,
  ...props
}) => {
  const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
  const errorId = error ? `${inputId}-error` : undefined;
  const helperId = helperText ? `${inputId}-helper` : undefined;
  const describedBy = errorId || helperId;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      {label && (
        <label
          htmlFor={inputId}
          className="coliseu-label"
        >
          <span>{label}</span>
          {required && <span style={{ color: 'var(--status-danger)' }}>*</span>}
        </label>
      )}

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
        {leftIcon && (
          <div style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
            {leftIcon}
          </div>
        )}
        <input
          id={inputId}
          disabled={disabled}
          className={`coliseu-input ${error ? 'coliseu-input--error' : ''} ${className}`.trim()}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          style={{
            width: '100%',
            paddingLeft: leftIcon ? '36px' : '12px',
            paddingRight: rightIcon ? '36px' : '12px',
            ...style,
          }}
          {...props}
          onChange={(e) => {
            const t = props.type;
            const preserve = (props as any)['data-case'] === 'preserve';
            if (t !== 'email' && t !== 'password' && t !== 'url' && t !== 'number' && t !== 'date' && !preserve) {
              e.target.value = e.target.value.toUpperCase();
            }
            if (props.onChange) {
              props.onChange(e);
            }
          }}
        />
        {rightIcon && (
          <div style={{ position: 'absolute', right: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
            {rightIcon}
          </div>
        )}
      </div>

      {error ? (
        <span id={errorId} className="coliseu-input-error" style={{ fontSize: '11px', color: 'var(--status-danger)', marginTop: '4px' }}>{error}</span>
      ) : helperText ? (
        <span id={helperId} className="coliseu-input-helper" style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{helperText}</span>
      ) : null}
    </div>
  );
};
