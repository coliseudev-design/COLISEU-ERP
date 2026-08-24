import React, { useState, useEffect, useRef } from 'react';
import { Bell, HelpCircle, Search, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../lib/theme';

interface AppHeaderProps {
  onOpenCommandBar?: () => void;
  activeModuleTitle?: string;
  activeModuleBadge?: string;
  activeTab?: string;
}

const TAB_TITLES: Record<string, string> = {
  dashboard: 'Visão Executiva',
  pessoas: 'Clientes & Parceiros',
  products: 'Catálogo de Produtos',
  pdv: 'Caixa PDV',
  pre_venda: 'Pré-Venda & Balcão',
  sales: 'Histórico de Vendas',
  condicional: 'Venda Condicional',
  promotions: 'Tabela de Promoções',
  purchases: 'Cotações & Compras',
  xml_entrada: 'Entrada XML NF-e',
  inventory: 'Saldos de Estoque',
  stock_transfer: 'Transferência de Estoque',
  grades: 'Grade Cor & Tamanho',
  etiquetas: 'Gerador de Etiquetas',
  financial: 'Contas a Pagar/Receber',
  dre: 'DRE Gerencial',
  ofx: 'Conciliação OFX',
  pix_boleto: 'Cobrança PIX & Boleto',
  sped: 'SPED Fiscal EFD',
  tax_rules: 'Regras Tributárias',
  reports: 'BI & Relatórios',
  configuracoes: 'Configurações ERP',
  users: 'Usuários & Acessos',
  audit: 'Auditoria & Logs',
  ai_providers: 'Configurações de IA',
};

export const AppHeader: React.FC<AppHeaderProps> = ({
  onOpenCommandBar,
  activeModuleTitle,
  activeTab = 'dashboard',
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme } = useTheme();

  const displayTitle = activeModuleTitle || TAB_TITLES[activeTab] || 'Coliseu ERP';

  // Close notifications on click outside or Escape
  useEffect(() => {
    if (!showNotifications) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showNotifications]);

  return (
    <header
      style={{
        height: 'var(--header-height)',
        backgroundColor: 'var(--surface-1)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 var(--spacing-4)',
        color: 'var(--text-primary)',
        position: 'sticky',
        top: 0,
        zIndex: 'var(--z-sticky)',
        fontFamily: 'var(--font-family-body)',
        transition: 'background-color var(--motion-fast) var(--motion-ease), border-color var(--motion-fast) var(--motion-ease)',
      }}
    >
      {/* Zona Esquerda: Identidade do Módulo + Status Conexão Discreto + Tenant */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
        <h2
          style={{
            fontSize: 'var(--font-size-sm)',
            fontWeight: 'var(--font-weight-semibold)',
            margin: 0,
            color: 'var(--text-primary)',
            letterSpacing: 'var(--letter-spacing-tight)',
          }}
        >
          {displayTitle}
        </h2>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: 'var(--font-size-2xs)',
              color: 'var(--status-success)',
              backgroundColor: 'var(--status-success-bg)',
              padding: '1px 6px',
              borderRadius: 'var(--radius-xs)',
              border: '1px solid var(--status-success-border)',
            }}
          >
            <span
              style={{
                width: '5px',
                height: '5px',
                borderRadius: '50%',
                backgroundColor: 'var(--status-success)',
              }}
            />
            Sincronizado
          </span>

          <span
            style={{
              fontSize: '10px',
              color: 'var(--text-muted)',
              backgroundColor: 'var(--surface-2)',
              border: '1px solid var(--border-subtle)',
              padding: '1px 6px',
              borderRadius: 'var(--radius-xs)',
              fontFamily: 'var(--font-family-mono)',
            }}
            title="Empresa e Unidade Ativa"
          >
            [PIVETA DIST] - [MATRIZ]
          </span>
        </div>
      </div>

      {/* Zona Centro: Command Bar Search Shortcut */}
      <button
        type="button"
        onClick={onOpenCommandBar}
        aria-label="Buscar comandos, parceiros, produtos (Ctrl+K)"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-2)',
          backgroundColor: 'var(--surface-sunken)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-sm)',
          padding: '4px var(--spacing-3)',
          width: '320px',
          cursor: 'pointer',
          color: 'var(--text-muted)',
          textAlign: 'left',
          transition: 'border-color var(--motion-fast) var(--motion-ease), background-color var(--motion-fast) var(--motion-ease)',
        }}
      >
        <Search size={13} style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
        <span
          style={{
            flex: 1,
            fontSize: 'var(--font-size-xs)',
            color: 'var(--text-muted)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          Buscar ou navegar...
        </span>
        <kbd
          style={{
            backgroundColor: 'var(--surface-2)',
            color: 'var(--text-secondary)',
            borderRadius: 'var(--radius-xs)',
            padding: '1px 4px',
            fontSize: 'var(--font-size-2xs)',
            border: '1px solid var(--border-subtle)',
            fontFamily: 'var(--font-family-mono)',
          }}
        >
          Ctrl+K
        </kbd>
      </button>

      {/* Zona Direita: Seletor de Tema, Notificações, Ajuda e Usuário */}
      <div
        ref={notificationRef}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-2)',
          position: 'relative',
        }}
      >
        {/* Botão Alternador de Tema Claro / Escuro */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={`Alternar para ${theme === 'dark' ? 'Tema Claro' : 'Tema Escuro'}`}
          style={{
            background: 'var(--surface-sunken)',
            border: '1px solid var(--border-subtle)',
            color: theme === 'dark' ? '#f59e0b' : 'var(--action-primary)',
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: 'var(--font-size-2xs)',
            fontWeight: 'var(--font-weight-medium)',
            transition: 'background-color var(--motion-fast) var(--motion-ease)',
          }}
          title={theme === 'dark' ? 'Mudar para Tema Claro (Baseado em Coliseu Sistemas)' : 'Mudar para Tema Escuro (Enterprise Dark)'}
        >
          {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
          <span style={{ color: 'var(--text-secondary)' }}>{theme === 'dark' ? 'Claro' : 'Escuro'}</span>
        </button>

        {/* Notificações */}
        <button
          type="button"
          onClick={() => setShowNotifications(!showNotifications)}
          aria-label="Notificações do sistema"
          aria-expanded={showNotifications}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: 'var(--spacing-1)',
            borderRadius: 'var(--radius-sm)',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Notificações"
        >
          <Bell size={15} aria-hidden="true" />
          <span
            style={{
              position: 'absolute',
              top: '3px',
              right: '3px',
              width: '5px',
              height: '5px',
              borderRadius: '50%',
              backgroundColor: 'var(--status-warning)',
            }}
          />
        </button>

        {showNotifications && (
          <div
            role="region"
            aria-label="Central de Notificações"
            style={{
              position: 'absolute',
              top: '38px',
              right: '60px',
              width: '280px',
              backgroundColor: 'var(--surface-2)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--spacing-3)',
              boxShadow: 'var(--shadow-lg)',
              zIndex: 'var(--z-popover)',
              fontSize: 'var(--font-size-xs)',
            }}
          >
            <div
              style={{
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--text-primary)',
                borderBottom: '1px solid var(--border-subtle)',
                paddingBottom: 'var(--spacing-1-5)',
                marginBottom: 'var(--spacing-2)',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>Notificações</span>
              <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-2xs)' }}>2 alertas</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
              <div style={{ color: 'var(--text-secondary)', lineHeight: 1.3 }}>
                <span style={{ color: 'var(--text-primary)', fontWeight: 'var(--font-weight-medium)' }}>
                  Sync Local-First:
                </span>{' '}
                Mutações gravadas no SQLite local e validadas.
              </div>
              <div style={{ color: 'var(--text-secondary)', lineHeight: 1.3 }}>
                <span style={{ color: 'var(--status-warning)', fontWeight: 'var(--font-weight-medium)' }}>
                  Estoque Crítico:
                </span>{' '}
                5 itens atingiram o ponto de reposição.
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onOpenCommandBar}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: 'var(--spacing-1)',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Atalhos e Ajuda"
          aria-label="Atalhos e Ajuda"
        >
          <HelpCircle size={15} aria-hidden="true" />
        </button>

        <div style={{ width: '1px', height: '16px', backgroundColor: 'var(--border-subtle)', margin: '0 2px' }} />

        {/* Perfil do Usuário */}
        <div
          tabIndex={0}
          role="button"
          aria-label="Perfil do usuário"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-2)',
            cursor: 'pointer',
            borderRadius: 'var(--radius-sm)',
            padding: '2px 4px',
          }}
        >
          <div
            style={{
              width: '24px',
              height: '24px',
              borderRadius: 'var(--radius-xs)',
              backgroundColor: 'var(--surface-3)',
              border: '1px solid var(--border-strong)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-primary)',
              fontSize: 'var(--font-size-2xs)',
              fontWeight: 'var(--font-weight-semibold)',
            }}
          >
            AD
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span
              style={{
                fontSize: 'var(--font-size-xs)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--text-primary)',
                lineHeight: 1.1,
              }}
            >
              SILENUS
            </span>
            <span style={{ fontSize: 'var(--font-size-2xs)', color: 'var(--text-muted)' }}>
              Matriz / Suporte
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
