import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { X, Tag, Check, Sparkles, Building } from 'lucide-react';
import { adicionarMarcaRapida, MarcaItem } from '../../lib/classificacoes';

interface ModalCadastroRapidoMarcaProps {
  isOpen: boolean;
  onClose: () => void;
  onMarcaCadastrada: (marca: MarcaItem) => void;
  sugestaoNome?: string;
}

export const ModalCadastroRapidoMarca: React.FC<ModalCadastroRapidoMarcaProps> = ({
  isOpen,
  onClose,
  onMarcaCadastrada,
  sugestaoNome = '',
}) => {
  const [nome, setNome] = useState(sugestaoNome);
  const [fabricante, setFabricante] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      setError('Por favor, informe o nome da marca.');
      return;
    }

    const nova = adicionarMarcaRapida(nome, fabricante);
    onMarcaCadastrada(nova);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(3px)',
        zIndex: 11000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          backgroundColor: 'var(--surface-1)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--surface-2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '6px',
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                color: '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Tag size={16} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Cadastro Rápido de Marca
              </h3>
              <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>
                Disponível instantaneamente em filtros, produtos e XML
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {error && (
            <div
              style={{
                padding: '8px 12px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '4px',
                color: '#ef4444',
                fontSize: '11px',
              }}
            >
              {error}
            </div>
          )}

          <div>
            <label className="coliseu-label" style={{ fontSize: '11px', marginBottom: '4px' }}>
              Nome da Marca / Fabricante *
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="Ex: TIGRE, TRAMONTINA, SUVINIL..."
              value={nome}
              onChange={(e) => {
                setNome(e.target.value.toUpperCase());
                setError(null);
              }}
              className="coliseu-input"
              style={{ height: '36px', fontSize: '13px', fontWeight: 600 }}
            />
          </div>

          <div>
            <label className="coliseu-label" style={{ fontSize: '11px', marginBottom: '4px' }}>
              Razão Social / Fabricante (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ex: TIGRE TUBOS E CONEXÕES S.A."
              value={fabricante}
              onChange={(e) => setFabricante(e.target.value.toUpperCase())}
              className="coliseu-input"
              style={{ height: '36px', fontSize: '12px' }}
            />
          </div>

          {/* Footer */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '8px',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '14px',
              marginTop: '4px',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              className="coliseu-btn coliseu-btn-secondary"
              style={{ padding: '7px 14px', fontSize: '12px' }}
            >
              Cancelar
            </button>
            <Button
              variant="primary"
              type="submit"
              style={{ padding: '7px 18px', fontSize: '12px', display: 'inline-flex', gap: '6px' }}
            >
              <Check size={15} /> Salvar & Selecionar Marca
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
