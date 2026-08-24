import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../lib/formatters';
import {
  Sparkles,
  X,
  Plus,
  Trash2,
  Tag,
  CheckCircle2,
  Barcode,
  ShoppingBag,
  Zap,
} from 'lucide-react';
import {
  ItemSimuladoCarrinho,
  simularPromocoesNoCarrinho,
} from '../../lib/promocoesAvancadas';

interface ModalSimuladorPromocaoProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRODUTOS_TESTE: ItemSimuladoCarrinho[] = [
  { produtoId: 'prod-001', codigoBarras: '7891991000803', descricao: 'Verniz Poliuretano Alto Sólidos 5L', marca: 'CORAL', categoria: 'TINTAS AUTOMOTIVAS', quantidade: 2, precoUnitarioTabela: 200.00 },
  { produtoId: 'prod-002', codigoBarras: '7896006700018', descricao: 'Primer Epóxi Cinza Automotivo 3.6L', marca: 'CORAL', categoria: 'TINTAS AUTOMOTIVAS', quantidade: 1, precoUnitarioTabela: 150.00 },
  { produtoId: 'prod-006', codigoBarras: '7896006700100', descricao: 'Lixa d Água Grão 600 Folha', marca: '3M', categoria: 'ABRASIVOS', quantidade: 3, precoUnitarioTabela: 5.50 },
];

export const ModalSimuladorPromocao: React.FC<ModalSimuladorPromocaoProps> = ({
  isOpen,
  onClose,
}) => {
  const [carrinho, setCarrinho] = useState<ItemSimuladoCarrinho[]>([
    { produtoId: 'prod-001', codigoBarras: '7891991000803', descricao: 'Verniz Poliuretano Alto Sólidos 5L', marca: 'CORAL', categoria: 'TINTAS AUTOMOTIVAS', quantidade: 1, precoUnitarioTabela: 200.00 },
    { produtoId: 'prod-006', codigoBarras: '7896006700100', descricao: 'Lixa d Água Grão 600 Folha', marca: '3M', categoria: 'ABRASIVOS', quantidade: 3, precoUnitarioTabela: 5.50 },
  ]);
  const [cupom, setCupom] = useState('COLISEU10');

  if (!isOpen) return null;

  const resultado = simularPromocoesNoCarrinho(carrinho, cupom);

  const handleAddProduto = (prod: ItemSimuladoCarrinho) => {
    const existing = carrinho.find((p) => p.produtoId === prod.produtoId);
    if (existing) {
      setCarrinho(
        carrinho.map((p) => (p.produtoId === prod.produtoId ? { ...p, quantidade: p.quantidade + 1 } : p))
      );
    } else {
      setCarrinho([...carrinho, { ...prod, quantidade: 1 }]);
    }
  };

  const handleUpdateQtd = (produtoId: string, delta: number) => {
    setCarrinho(
      carrinho
        .map((p) => (p.produtoId === produtoId ? { ...p, quantidade: Math.max(1, p.quantidade + delta) } : p))
    );
  };

  const handleRemove = (produtoId: string) => {
    setCarrinho(carrinho.filter((p) => p.produtoId !== produtoId));
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 11500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '850px',
          maxHeight: '94vh',
          backgroundColor: 'var(--surface-1)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--surface-2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Zap size={20} color="#f59e0b" />
            <div>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Simulador Interativo de Promoções & Descontos no Checkout
              </h2>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Teste a aplicação de regras em tempo real antes de ativar na frente de caixa.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Adicionar produtos rápidos */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', backgroundColor: 'var(--surface-2)', padding: '10px 14px', borderRadius: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>+ Adicionar Produto de Teste:</span>
            {PRODUTOS_TESTE.map((prod) => (
              <button
                key={prod.produtoId}
                type="button"
                onClick={() => handleAddProduto(prod)}
                className="coliseu-btn coliseu-btn-secondary"
                style={{ fontSize: '10px', height: '26px' }}
              >
                + {prod.descricao.slice(0, 22)}...
              </button>
            ))}
          </div>

          {/* Carrinho de Compras */}
          <div className="coliseu-table-container">
            <table className="coliseu-table" style={{ fontSize: '11px' }}>
              <thead>
                <tr>
                  <th>Item / Produto</th>
                  <th style={{ width: '100px', textAlign: 'center' }}>Qtd</th>
                  <th style={{ width: '100px', textAlign: 'right' }}>De (Tabela)</th>
                  <th style={{ width: '110px', textAlign: 'right' }}>Por (Promoção)</th>
                  <th style={{ width: '110px', textAlign: 'right' }}>Total Líquido</th>
                  <th style={{ width: '40px', textAlign: 'center' }}></th>
                </tr>
              </thead>
              <tbody>
                {resultado.itens.map((item) => (
                  <tr key={item.produtoId}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{item.descricao}</div>
                      {item.nomePromocaoAplicada && (
                        <div style={{ fontSize: '10px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Tag size={10} /> {item.nomePromocaoAplicada}
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                        <button
                          type="button"
                          onClick={() => handleUpdateQtd(item.produtoId, -1)}
                          style={{ width: '20px', height: '20px', borderRadius: '3px', border: '1px solid var(--border-default)', background: 'var(--surface-2)', cursor: 'pointer' }}
                        >
                          -
                        </button>
                        <span style={{ fontWeight: 700, minWidth: '18px', textAlign: 'center' }}>{item.quantidade}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQtd(item.produtoId, 1)}
                          style={{ width: '20px', height: '20px', borderRadius: '3px', border: '1px solid var(--border-default)', background: 'var(--surface-2)', cursor: 'pointer' }}
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--text-muted)', textDecoration: item.descontoAplicado > 0 ? 'line-through' : 'none' }}>
                      {formatCurrency(item.precoUnitarioOriginal)}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: item.descontoAplicado > 0 ? '#10b981' : 'var(--text-primary)' }}>
                      {formatCurrency(item.precoUnitarioFinal)}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 800, fontFamily: 'monospace' }}>
                      {formatCurrency(item.totalLiquido)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleRemove(item.produtoId)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Campo de Cupom de Desconto */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '10px', backgroundColor: 'var(--surface-2)', borderRadius: '6px' }}>
            <Tag size={16} color="#f59e0b" />
            <span style={{ fontSize: '11px', fontWeight: 600 }}>Aplicar Cupom Promocional:</span>
            <input
              type="text"
              value={cupom}
              onChange={(e) => setCupom(e.target.value.toUpperCase())}
              placeholder="Digite o código (Ex: COLISEU10)..."
              className="coliseu-input"
              style={{ width: '160px', height: '30px', fontWeight: 700, fontFamily: 'monospace' }}
            />
          </div>

          {/* Resumo Final de Totais e Promoções Ativadas */}
          <div style={{ padding: '14px', backgroundColor: 'rgba(16, 185, 129, 0.08)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.25)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                Promoções Acionadas no Checkout:
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                {resultado.promocoesAtivadas.map((promo, idx) => (
                  <span
                    key={idx}
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: 'var(--surface-1)',
                      border: '1px solid #10b981',
                      color: '#10b981',
                    }}
                  >
                    ✓ {promo}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Subtotal Bruto: {formatCurrency(resultado.subtotalBruto)} • Economia: <strong style={{ color: '#10b981' }}>- {formatCurrency(resultado.totalDesconto)}</strong>
              </div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#10b981', fontFamily: 'monospace' }}>
                TOTAL FINAL: {formatCurrency(resultado.totalLiquido)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
