import React, { useState, useMemo } from 'react';
import type { Produto } from '../../lib/types';
import { formatCurrency } from '../../lib/formatters';
import { Search, Plus, Barcode, Package, Check, LayoutGrid, List } from 'lucide-react';

export interface ProductGridProps {
  products: Produto[];
  onSelectProduct: (product: Produto) => void;
  onQuickAdd: (product: Produto) => void;
  searchInputRef?: React.RefObject<HTMLInputElement>;
  focusedIndex?: number;
  setFocusedIndex?: (index: number) => void;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  onSelectProduct,
  onQuickAdd,
  searchInputRef,
  focusedIndex = 0,
  setFocusedIndex,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('TODOS');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [addedItemAnimation, setAddedItemAnimation] = useState<string | null>(null);

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      if (!p.ativo) return false;
      const matchSearch =
        query === '' ||
        p.descricao.toLowerCase().includes(query) ||
        p.codigo_sku.toLowerCase().includes(query) ||
        (p.codigo_barras && p.codigo_barras.toLowerCase().includes(query));

      if (selectedCategory === 'TODOS') return matchSearch;
      if (selectedCategory === 'COM_BARRA') return matchSearch && Boolean(p.codigo_barras);
      return matchSearch;
    });
  }, [products, searchQuery, selectedCategory]);

  const handleAdd = (p: Produto, e?: React.MouseEvent) => {
    e?.stopPropagation();
    onQuickAdd(p);
    setAddedItemAnimation(p.id);
    setTimeout(() => {
      setAddedItemAnimation(null);
    }, 350);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--surface-1)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-sm)',
        overflow: 'hidden',
      }}
    >
      {/* Top Search & Filter Bar */}
      <div
        style={{
          padding: 'var(--spacing-2) var(--spacing-3)',
          backgroundColor: 'var(--surface-1)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        <div style={{ position: 'relative', width: '100%' }}>
          <div
            style={{
              position: 'absolute',
              left: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }}
          >
            <Search size={14} />
          </div>
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por Descrição, SKU ou EAN (F1)..."
            style={{
              width: '100%',
              height: '32px',
              paddingLeft: '28px',
              paddingRight: '54px',
              backgroundColor: 'var(--surface-sunken)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-xs)',
              color: 'var(--text-primary)',
              fontSize: 'var(--font-size-xs)',
              outline: 'none',
            }}
          />
          <div
            style={{
              position: 'absolute',
              right: '6px',
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  backgroundColor: 'var(--surface-2)',
                  color: 'var(--text-muted)',
                  border: 'none',
                  padding: '1px 5px',
                  borderRadius: 'var(--radius-xs)',
                  fontSize: '9px',
                  cursor: 'pointer',
                }}
              >
                Limpar
              </button>
            )}
            <span
              style={{
                backgroundColor: 'var(--surface-2)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-muted)',
                padding: '1px 4px',
                borderRadius: '2px',
                fontSize: '9px',
                fontFamily: 'var(--font-family-mono)',
              }}
            >
              F1
            </span>
          </div>
        </div>

        {/* Quick Filter Pills + View Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              type="button"
              onClick={() => setSelectedCategory('TODOS')}
              style={{
                padding: '2px 8px',
                borderRadius: 'var(--radius-xs)',
                fontWeight: 'var(--font-weight-medium)',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: selectedCategory === 'TODOS' ? 'var(--surface-2)' : 'transparent',
                color: selectedCategory === 'TODOS' ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
            >
              Todos ({products.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('COM_BARRA')}
              style={{
                padding: '2px 8px',
                borderRadius: 'var(--radius-xs)',
                fontWeight: 'var(--font-weight-medium)',
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                backgroundColor: selectedCategory === 'COM_BARRA' ? 'var(--surface-2)' : 'transparent',
                color: selectedCategory === 'COM_BARRA' ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
            >
              <Barcode size={12} /> Bipáveis
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>{filteredProducts.length} itens</span>
            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--surface-sunken)', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)', padding: '1px' }}>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                title="Modo Grade"
                style={{
                  padding: '2px 4px',
                  background: viewMode === 'grid' ? 'var(--surface-2)' : 'transparent',
                  border: 'none',
                  color: viewMode === 'grid' ? 'var(--text-primary)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  borderRadius: '2px',
                  display: 'flex',
                }}
              >
                <LayoutGrid size={12} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                title="Modo Tabela Compacta"
                style={{
                  padding: '2px 4px',
                  background: viewMode === 'table' ? 'var(--surface-2)' : 'transparent',
                  border: 'none',
                  color: viewMode === 'table' ? 'var(--text-primary)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  borderRadius: '2px',
                  display: 'flex',
                }}
              >
                <List size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Grid or Table Container */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--spacing-2)' }}>
        {filteredProducts.length === 0 ? (
          <div
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              textAlign: 'center',
            }}
          >
            <Package size={32} style={{ marginBottom: '6px', opacity: 0.5 }} />
            <p style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)' }}>
              Nenhum produto localizado
            </p>
          </div>
        ) : viewMode === 'table' ? (
          /* Modo Tabela Operacional Densa */
          <div className="coliseu-table-container">
            <table className="coliseu-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Descrição</th>
                  <th>EAN</th>
                  <th style={{ textAlign: 'right' }}>Preço</th>
                  <th style={{ textAlign: 'center', width: '80px' }}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => {
                  const isJustAdded = addedItemAnimation === p.id;
                  return (
                    <tr
                      key={p.id}
                      onClick={() => onSelectProduct(p)}
                      style={{
                        cursor: 'pointer',
                        backgroundColor: isJustAdded ? 'var(--status-success-bg)' : undefined,
                      }}
                    >
                      <td className="text-mono" style={{ color: 'var(--text-link)', fontSize: '11px' }}>
                        {p.codigo_sku}
                      </td>
                      <td style={{ color: 'var(--text-primary)', fontWeight: 'var(--font-weight-medium)' }}>
                        {p.descricao}
                      </td>
                      <td className="text-mono" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
                        {p.codigo_barras || '—'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--status-success)' }} className="tabular-nums">
                        {formatCurrency(p.preco_venda)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={(e) => handleAdd(p, e)}
                          className="coliseu-btn coliseu-btn-secondary coliseu-btn--sm"
                          style={{ padding: '2px 6px', fontSize: '10px' }}
                        >
                          {isJustAdded ? <Check size={11} /> : <Plus size={11} />}
                          <span>{isJustAdded ? 'OK' : 'Add'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Modo Grade Compacta */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px' }}>
            {filteredProducts.map((p) => {
              const isJustAdded = addedItemAnimation === p.id;

              return (
                <div
                  key={p.id}
                  onClick={() => onSelectProduct(p)}
                  style={{
                    backgroundColor: isJustAdded ? 'var(--status-success-bg)' : 'var(--surface-sunken)',
                    border: `1px solid ${isJustAdded ? 'var(--status-success)' : 'var(--border-subtle)'}`,
                    borderRadius: 'var(--radius-xs)',
                    padding: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'border-color var(--motion-fast) var(--motion-ease)',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 'var(--font-weight-semibold)',
                          color: 'var(--text-muted)',
                          backgroundColor: 'var(--surface-2)',
                          padding: '1px 4px',
                          borderRadius: '2px',
                        }}
                      >
                        {p.codigo_sku}
                      </span>
                      <span style={{ fontSize: '9px', color: 'var(--text-subtle)', textTransform: 'uppercase' }}>
                        {p.unidade_medida}
                      </span>
                    </div>

                    <h4
                      style={{
                        fontSize: '11px',
                        fontWeight: 'var(--font-weight-medium)',
                        color: 'var(--text-primary)',
                        margin: '2px 0 6px 0',
                        lineHeight: 1.3,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {p.descricao}
                    </h4>
                  </div>

                  <div
                    style={{
                      paddingTop: '6px',
                      borderTop: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--status-success)' }} className="tabular-nums">
                        {formatCurrency(p.preco_venda)}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleAdd(p, e)}
                      className="coliseu-btn coliseu-btn-secondary coliseu-btn--sm"
                      style={{ padding: '2px 6px', fontSize: '10px' }}
                    >
                      {isJustAdded ? <Check size={11} /> : <Plus size={11} />}
                      <span>{isJustAdded ? 'OK' : 'Add'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
