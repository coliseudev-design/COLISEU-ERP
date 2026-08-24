import React, { useEffect, useState } from 'react';
import { Search, Sparkles, Command, ArrowRight, X } from 'lucide-react';

export interface CommandBarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: string) => void;
}

export const CommandBarModal: React.FC<CommandBarModalProps> = ({ isOpen, onClose, onNavigate }) => {
  const [query, setQuery] = useState('');
  const [aiThinking, setAiThinking] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery('');
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const quickNavs = [
    { label: 'Ponto de Venda (PDV)', tab: 'pdv' },
    { label: 'Central de Transporte & Logística', tab: 'transporte' },
    { label: 'Emissão de CT-e 4.00 (Conhecimento de Transporte)', tab: 'cte' },
    { label: 'Manifesto Eletrônico de Carga (MDF-e)', tab: 'gerenciamento_mdfe' },
    { label: 'Gestão de Frota & Veículos', tab: 'frota' },
    { label: 'Motoristas & Condutores', tab: 'motoristas' },
    { label: 'Cadastro de Produtos', tab: 'products' },
    { label: 'Gestão de Estoque', tab: 'inventory' },
    { label: 'Contas & Caixa (Financeiro)', tab: 'finance' },
    { label: 'Clientes & Fornecedores (Pessoas)', tab: 'pessoas' },
    { label: 'Regras Fiscais & Tributação', tab: 'tax-rules' },
    { label: 'Painel IA Multi-Provedor', tab: 'ai-providers' },
    { label: 'Configurações da Empresa', tab: 'configuracoes' },
  ];

  const filteredNavs = quickNavs.filter((n) => n.label.toLowerCase().includes(query.toLowerCase()));

  const handleAiQuery = async () => {
    if (!query.trim()) return;
    setAiThinking(true);
    setAiResponse(null);

    // Simulação da interpretação de linguagem natural via Roteador LLM (§12)
    setTimeout(() => {
      setAiThinking(false);
      setAiResponse(
        `🤖 [Coliseu AI Engine]: Analisei sua solicitação ("${query}"). ` +
        `Recomendo acessar o módulo correspondente para verificar os dados atualizados.`
      );
    }, 1200);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'var(--surface-overlay)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '80px',
        zIndex: 'var(--z-modal)',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '640px',
          backgroundColor: 'var(--surface-1)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
        }}
      >
        {/* Command Bar Header Input */}
        <div style={{ padding: 'var(--spacing-4)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)', borderBottom: '1px solid var(--border-strong)' }}>
          <Command size={20} color="var(--action-primary)" />
          <input
            type="text"
            autoFocus
            role="combobox"
            aria-expanded="true"
            placeholder="Digite um comando, navegação ou pergunta para a IA... (ex: 'PDV', 'quanto tenho para pagar este mês?')"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setAiResponse(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (filteredNavs[selectedIndex]) {
                  onNavigate(filteredNavs[selectedIndex].tab);
                  onClose();
                } else if (query.trim().length > 3) {
                  handleAiQuery();
                }
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex((prev) => Math.min(prev + 1, filteredNavs.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex((prev) => Math.max(prev - 1, 0));
              }
            }}
            style={{
              flex: 1,
              backgroundColor: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              fontSize: 'var(--font-size-base)',
              outline: 'none',
            }}
          />
          <button onClick={onClose} style={{ backgroundColor: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {/* AI Query Prompt Bar */}
        {query.trim().length > 3 && (
          <div
            onClick={handleAiQuery}
            style={{
              padding: '10px 16px',
              backgroundColor: 'var(--status-ai-bg, rgba(99, 102, 241, 0.1))',
              borderBottom: '1px solid var(--border-strong)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--font-size-md)', color: 'var(--status-ai)' }}>
              <Sparkles size={16} />
              <span>Perguntar para Coliseu AI: "{query}"</span>
            </div>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', backgroundColor: 'var(--surface-sunken)', padding: '2px 6px', borderRadius: 'var(--radius-sm)' }}>Pressione Enter</span>
          </div>
        )}

        {/* AI Response Area */}
        {aiThinking && (
          <div style={{ padding: '16px', fontSize: 'var(--font-size-md)', color: 'var(--status-ai)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={16} className="animate-spin" /> Interpretando intenção corporativa via Roteador LLM...
          </div>
        )}

        {aiResponse && (
          <div style={{ padding: '16px', backgroundColor: 'var(--surface-sunken)', borderBottom: '1px solid var(--border-strong)', fontSize: 'var(--font-size-md)', color: 'var(--text-primary)', lineHeight: 1.5 }}>
            {aiResponse}
          </div>
        )}

        {/* Navigation Suggestions */}
        <div style={{ maxHeight: '320px', overflowY: 'auto', padding: '8px' }}>
          <div style={{ padding: '8px 12px', fontSize: 'var(--font-size-xs)', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Navegação Rápida Módulos
          </div>

          {filteredNavs.map((nav, idx) => {
            const isSelected = selectedIndex === idx;
            return (
              <div
                key={nav.tab}
                onClick={() => {
                  onNavigate(nav.tab);
                  onClose();
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  color: isSelected ? 'var(--text-on-primary)' : 'var(--text-primary)',
                  backgroundColor: isSelected ? 'var(--action-secondary-hover)' : 'transparent',
                  fontSize: 'var(--font-size-md)',
                  transition: 'background-color 0.1s ease',
                }}
              >
                <span>{nav.label}</span>
                <ArrowRight size={14} color={isSelected ? 'var(--text-on-primary)' : 'var(--text-muted)'} />
              </div>
            );
          })}
        </div>

        {/* Footer shortcuts helper */}
        <div style={{ padding: '8px 16px', backgroundColor: 'var(--surface-sunken)', borderTop: '1px solid var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
          <div>
            Navegar <kbd style={{ backgroundColor: 'var(--surface-3)', padding: '2px 4px', borderRadius: '3px' }}>↑</kbd>{' '}
            <kbd style={{ backgroundColor: 'var(--surface-3)', padding: '2px 4px', borderRadius: '3px' }}>↓</kbd>
          </div>
          <div>
            Fechar <kbd style={{ backgroundColor: 'var(--surface-3)', padding: '2px 4px', borderRadius: '3px' }}>Esc</kbd>
          </div>
        </div>
      </div>
    </div>
  );
};
