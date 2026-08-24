import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { X, Layers, Check, Plus } from 'lucide-react';
import {
  getCategorias,
  adicionarCategoriaRapida,
  CategoriaItem,
} from '../../lib/classificacoes';

interface ModalCadastroRapidoCategoriaProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoriaCadastrada: (categoria: CategoriaItem, subcategoria?: string) => void;
  categoriaSelecionadaPrevia?: string;
}

export const ModalCadastroRapidoCategoria: React.FC<ModalCadastroRapidoCategoriaProps> = ({
  isOpen,
  onClose,
  onCategoriaCadastrada,
  categoriaSelecionadaPrevia = '',
}) => {
  const [modo, setModo] = useState<'nova_categoria' | 'nova_subcategoria'>(
    categoriaSelecionadaPrevia ? 'nova_subcategoria' : 'nova_categoria'
  );
  const [nomeCategoria, setNomeCategoria] = useState(
    modo === 'nova_subcategoria' ? categoriaSelecionadaPrevia : ''
  );
  const [nomeSubcategoria, setNomeSubcategoria] = useState('');
  const [margemSugerida, setMargemSugerida] = useState<number>(20);
  const [error, setError] = useState<string | null>(null);

  const categoriasExistentes = getCategorias();

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (modo === 'nova_categoria' && !nomeCategoria.trim()) {
      setError('Por favor, informe o nome da categoria.');
      return;
    }
    if (modo === 'nova_subcategoria' && (!nomeCategoria || !nomeSubcategoria.trim())) {
      setError('Selecione a categoria e informe a nova subcategoria.');
      return;
    }

    const cat = adicionarCategoriaRapida(nomeCategoria, nomeSubcategoria);
    onCategoriaCadastrada(cat, nomeSubcategoria.trim() || undefined);
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
          maxWidth: '500px',
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
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Layers size={16} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Cadastro Rápido de Categoria & Subcategoria
              </h3>
              <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>
                Classificação para relatórios, filtros e margens
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

          {/* Abas Rápidas: Nova Categoria vs Nova Subcategoria */}
          <div
            style={{
              display: 'flex',
              backgroundColor: 'var(--surface-3)',
              borderRadius: '6px',
              padding: '3px',
              gap: '4px',
            }}
          >
            <button
              type="button"
              onClick={() => setModo('nova_categoria')}
              style={{
                flex: 1,
                padding: '6px',
                fontSize: '11px',
                fontWeight: 600,
                border: 'none',
                borderRadius: '4px',
                backgroundColor: modo === 'nova_categoria' ? 'var(--surface-1)' : 'transparent',
                color: modo === 'nova_categoria' ? 'var(--text-primary)' : 'var(--text-muted)',
                cursor: 'pointer',
                boxShadow: modo === 'nova_categoria' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              + Nova Categoria Principal
            </button>
            <button
              type="button"
              onClick={() => setModo('nova_subcategoria')}
              style={{
                flex: 1,
                padding: '6px',
                fontSize: '11px',
                fontWeight: 600,
                border: 'none',
                borderRadius: '4px',
                backgroundColor: modo === 'nova_subcategoria' ? 'var(--surface-1)' : 'transparent',
                color: modo === 'nova_subcategoria' ? 'var(--text-primary)' : 'var(--text-muted)',
                cursor: 'pointer',
                boxShadow: modo === 'nova_subcategoria' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              + Nova Subcategoria (Filha)
            </button>
          </div>

          {modo === 'nova_categoria' ? (
            <>
              <div>
                <label className="coliseu-label" style={{ fontSize: '11px', marginBottom: '4px' }}>
                  Nome da Nova Categoria *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Ex: ILUMINAÇÃO & LED, JARDINAGEM, FERRAGENS..."
                  value={nomeCategoria}
                  onChange={(e) => {
                    setNomeCategoria(e.target.value.toUpperCase());
                    setError(null);
                  }}
                  className="coliseu-input"
                  style={{ height: '36px', fontSize: '13px', fontWeight: 600 }}
                />
              </div>

              <div>
                <label className="coliseu-label" style={{ fontSize: '11px', marginBottom: '4px' }}>
                  1ª Subcategoria Inicial (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: REFLETORES & PAINÉIS, MANGUEIRAS, FECHADURAS..."
                  value={nomeSubcategoria}
                  onChange={(e) => setNomeSubcategoria(e.target.value.toUpperCase())}
                  className="coliseu-input"
                  style={{ height: '36px', fontSize: '12px' }}
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="coliseu-label" style={{ fontSize: '11px', marginBottom: '4px' }}>
                  Categoria Pai Pertencente *
                </label>
                <select
                  required
                  value={nomeCategoria}
                  onChange={(e) => setNomeCategoria(e.target.value)}
                  className="coliseu-input"
                  style={{ height: '36px', fontSize: '12px' }}
                >
                  <option value="">Selecione a categoria principal...</option>
                  {categoriasExistentes.map((c) => (
                    <option key={c.id} value={c.nome}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="coliseu-label" style={{ fontSize: '11px', marginBottom: '4px' }}>
                  Nome da Nova Subcategoria *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Ex: VERNIZES PU, ARGAMASSA AC-III, DISJUNTORES DIN..."
                  value={nomeSubcategoria}
                  onChange={(e) => {
                    setNomeSubcategoria(e.target.value.toUpperCase());
                    setError(null);
                  }}
                  className="coliseu-input"
                  style={{ height: '36px', fontSize: '13px', fontWeight: 600 }}
                />
              </div>
            </>
          )}

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
              <Check size={15} /> Salvar & Selecionar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
