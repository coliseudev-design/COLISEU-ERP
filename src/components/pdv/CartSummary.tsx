import React from 'react';
import type { CartItem } from '../../lib/discount';
import { calculateCart } from '../../lib/discount';
import { formatCurrency } from '../../lib/formatters';
import { ShoppingCart, Trash2, Plus, Minus, CreditCard } from 'lucide-react';

export interface CartSummaryProps {
  items: CartItem[];
  onUpdateQuantity: (index: number, qty: number) => void;
  onRemoveItem: (index: number) => void;
  onClearCart: () => void;
  discountValue: number;
  discountType: 'value' | 'percent';
  onUpdateDiscount: (val: number, type: 'value' | 'percent') => void;
  onOpenPayment: () => void;
}

export const CartSummary: React.FC<CartSummaryProps> = ({
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  discountValue,
  discountType,
  onOpenPayment,
}) => {
  const calc = calculateCart(items, discountValue, discountType);

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
      {/* Header Carrinho */}
      <div
        style={{
          padding: '8px var(--spacing-3)',
          backgroundColor: 'var(--surface-1)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ShoppingCart size={15} style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--text-primary)' }}>
            Carrinho de Venda
          </span>
          <span
            style={{
              fontSize: '10px',
              backgroundColor: 'var(--surface-2)',
              border: '1px solid var(--border-subtle)',
              padding: '1px 5px',
              borderRadius: 'var(--radius-xs)',
              color: 'var(--text-secondary)',
            }}
          >
            {items.length} {items.length === 1 ? 'item' : 'itens'}
          </span>
        </div>
        {items.length > 0 && (
          <button
            type="button"
            onClick={onClearCart}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--status-danger)',
              fontSize: '11px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Trash2 size={11} /> Limpar
          </button>
        )}
      </div>

      {/* Lista de Itens no Carrinho */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--spacing-2)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {items.length === 0 ? (
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
            <ShoppingCart size={32} style={{ marginBottom: '6px', opacity: 0.4 }} />
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Carrinho Vazio</p>
            <span style={{ fontSize: '10px', color: 'var(--text-subtle)' }}>Bipe um produto ou use F1</span>
          </div>
        ) : (
          items.map((item, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: 'var(--surface-sunken)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-xs)',
                padding: '6px 10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <h5
                  style={{
                    fontSize: '11px',
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--text-primary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    margin: 0,
                  }}
                >
                  {item.produto.descricao}
                </h5>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }} className="tabular-nums">
                  {formatCurrency(item.preco_unitario)} / Un
                </span>
              </div>

              {/* Seletor de Quantidade */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <button
                  type="button"
                  onClick={() => onUpdateQuantity(idx, Math.max(1, item.quantidade - 1))}
                  style={{
                    backgroundColor: 'var(--surface-2)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    width: '20px',
                    height: '20px',
                    borderRadius: '2px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Minus size={10} />
                </button>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    width: '22px',
                    textAlign: 'center',
                  }}
                  className="tabular-nums"
                >
                  {item.quantidade}
                </span>
                <button
                  type="button"
                  onClick={() => onUpdateQuantity(idx, item.quantidade + 1)}
                  style={{
                    backgroundColor: 'var(--surface-2)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    width: '20px',
                    height: '20px',
                    borderRadius: '2px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Plus size={10} />
                </button>
              </div>

              <div style={{ textAlign: 'right', minWidth: '65px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--status-success)' }} className="tabular-nums">
                  {formatCurrency(item.quantidade * item.preco_unitario)}
                </span>
              </div>

              <button
                type="button"
                onClick={() => onRemoveItem(idx)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '2px',
                }}
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Painel de Fechamento / Totais */}
      <div
        style={{
          padding: 'var(--spacing-3)',
          backgroundColor: 'var(--surface-sunken)',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
          <span>Subtotal:</span>
          <span style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--text-primary)' }} className="tabular-nums">
            {formatCurrency(calc.subtotal)}
          </span>
        </div>

        {calc.desconto_total_combinado > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--status-danger)' }}>
            <span>Desconto Aplicado:</span>
            <span style={{ fontWeight: 600 }} className="tabular-nums">
              -{formatCurrency(calc.desconto_total_combinado)}
            </span>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px', borderTop: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--text-primary)' }}>
            TOTAL A PAGAR:
          </span>
          <span style={{ fontSize: '18px', fontWeight: 'var(--font-weight-bold)', color: 'var(--status-success)' }} className="tabular-nums">
            {formatCurrency(calc.valor_total)}
          </span>
        </div>

        <button
          type="button"
          onClick={onOpenPayment}
          disabled={items.length === 0}
          className="coliseu-btn coliseu-btn-primary"
          style={{
            width: '100%',
            height: '36px',
            justifyContent: 'center',
            fontSize: 'var(--font-size-xs)',
            fontWeight: 'var(--font-weight-semibold)',
            marginTop: '2px',
          }}
        >
          <CreditCard size={14} />
          <span>Finalizar Venda (F2)</span>
        </button>
      </div>
    </div>
  );
};
