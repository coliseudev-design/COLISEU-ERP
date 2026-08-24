import React, { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../lib/theme';
import { LogIn, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, loginError, isLoading } = useAuth();
  const { theme } = useTheme();
  const [username, setUsername] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !senha) return;
    try {
      await login(username, senha);
    } catch (err) {
      // Error is handled in context and exposed via loginError
    }
  }, [login, username, senha]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  const logoSrc = theme === 'dark' ? '/coliseu-logo-dark.png' : '/coliseu-logo.png';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: 'var(--surface-app)',
      padding: 'var(--spacing-4)',
      fontFamily: 'var(--font-family-sans)',
      color: 'var(--text-primary)'
    }}>
      <div style={{ marginBottom: 'var(--spacing-6)', textAlign: 'center' }}>
        <img src={logoSrc} alt="Coliseu ERP Logo" style={{ height: '52px', marginBottom: 'var(--spacing-2)' }} />
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>Coliseu ERP</h1>
        <p style={{ margin: '8px 0 0', color: 'var(--text-secondary)', fontSize: '14px' }}>
          Sistema de Gestão Empresarial
        </p>
      </div>

      <div style={{
        backgroundColor: 'var(--surface-1)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        width: '100%',
        maxWidth: '420px',
        padding: 'var(--spacing-6)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-4)'
      }}>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Acesso ao Sistema</h2>

        {loginError && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-2)',
            backgroundColor: 'var(--action-danger)',
            color: 'white',
            padding: 'var(--spacing-3)',
            borderRadius: 'var(--radius-md)',
            fontSize: '14px'
          }}>
            <AlertCircle size={18} />
            <span>{loginError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-1)' }}>
            <label style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)' }}>Usuário</label>
            <input
              type="text"
              className="coliseu-input"
              style={{ height: '42px' }}
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-1)' }}>
            <label style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)' }}>Senha</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="coliseu-input"
                style={{ height: '42px', width: '100%', paddingRight: '40px' }}
                value={senha}
                onChange={e => setSenha(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '8px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px'
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="coliseu-btn coliseu-btn-primary"
            style={{
              height: '44px',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--spacing-2)',
              marginTop: 'var(--spacing-2)'
            }}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
            <span>{isLoading ? 'Entrando...' : 'Entrar'}</span>
          </button>
        </form>
      </div>

      <div style={{ marginTop: 'var(--spacing-6)', color: 'var(--text-muted)', fontSize: '12px' }}>
        © 2026 Coliseu ERP — Todos os direitos reservados
      </div>
    </div>
  );
};
