import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Plus,
  CheckCircle,
  QrCode,
  ShoppingBag,
  Trash2,
  Search,
} from 'lucide-react';
import { dbService } from '../lib/db';
import type { Produto } from '../lib/types';
import { preVendaService, ComandaCompleta, ItemComandaInput } from '../lib/pre_venda';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export const PreVendaPage: React.FC = () => {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [clienteNome, setClienteNome] = useState('MARIA SILVA');
  const [carrinho, setCarrinho] = useState<{ produto: Produto; quantidade: number }[]>([]);
  const [comandaGerada, setComandaGerada] = useState<ComandaCompleta | null>(null);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  useEffect(() => {
    dbService
      .listProdutos('emp1')
      .then(setProdutos)
      .catch((err: any) => console.error(err));
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setComandaGerada(null);
      }
    };
    if (comandaGerada) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [comandaGerada]);

  const handleAdicionarItem = (p: Produto) => {
    setCarrinho((prev) => {
      const idx = prev.findIndex((i) => i.produto.id === p.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx].quantidade += 1;
        return copy;
      }
      return [...prev, { produto: p, quantidade: 1 }];
    });
  };

  const handleRemoverItem = (produtoId: string) => {
    setCarrinho((prev) => prev.filter((i) => i.produto.id !== produtoId));
  };

  const totalCarrinho = carrinho.reduce(
    (acc, item) => acc + item.produto.preco_venda * item.quantidade,
    0
  );

  const handleFinalizarComanda = async () => {
    if (carrinho.length === 0) {
      showToast('⚠️ Adicione ao menos 1 produto no atendimento');
      return;
    }

    setLoading(true);
    try {
      const itensInput: ItemComandaInput[] = carrinho.map((i) => ({
        produto_id: i.produto.id,
        variante_id: undefined,
        quantidade: i.quantidade,
        preco_unitario: i.produto.preco_venda,
      }));

      const res = await preVendaService.criarPreVendaComanda(
        'fil1',
        clienteNome,
        undefined,
        itensInput
      );
      setComandaGerada(res);
      setCarrinho([]);
      showToast(`🎉 Comanda '${res.numero_comanda}' gerada no balcão!`);
    } catch (err: any) {
      showToast(`❌ Erro ao criar comanda: ${err?.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filtered = produtos.filter(
    (p) =>
      p.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.codigo_sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="coliseu-page" style={{ minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {toastMessage && (
        <div className="coliseu-toast-container">
          <div className="coliseu-toast coliseu-toast--success" style={{
            backgroundColor: 'var(--surface-2)',
            border: '1px solid var(--status-success)',
            color: 'var(--text-primary)',
            padding: '0.75rem 1.25rem',
            borderRadius: '0.5rem',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}>
            <CheckCircle aria-hidden="true" style={{ width: '1.25rem', height: '1.25rem', color: 'var(--status-success)' }} />
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{toastMessage}</span>
          </div>
        </div>
      )}

      <PageHeader
        title="Atendimento de Balcão Móvel & Ordem de Pré-Venda"
        subtitle="Interface para celular/tablet: lance o atendimento na loja e gere o QR Code da comanda para o caixa PDV"
        icon={<Smartphone aria-hidden="true" style={{ color: 'var(--domain-compras)', width: '1.5rem', height: '1.5rem' }} />}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '1.5rem', marginTop: '1rem' }}>
        {/* Catálogo de Produtos e Busca */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ position: 'relative' }}>
            <Search aria-hidden="true" style={{ width: '1rem', height: '1rem', color: 'var(--text-muted)', position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)' }} />
            <Input
              type="text"
              placeholder="Buscar por descrição ou SKU do produto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '2.5rem', width: '100%' }}
            />
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: '1rem',
            maxHeight: '540px',
            overflowY: 'auto',
            paddingRight: '0.25rem',
          }}>
            {filtered.map((p) => (
              <div
                key={p.id}
                onClick={() => handleAdicionarItem(p)}
                style={{
                  backgroundColor: 'var(--surface-1)',
                  border: '1px solid var(--surface-2)',
                  borderRadius: '0.75rem',
                  padding: '1rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <span style={{ fontSize: '0.6875rem', fontFamily: 'monospace', color: 'var(--domain-compras)', fontWeight: 700, display: 'block' }}>
                    {p.codigo_sku}
                  </span>
                  <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0.25rem 0' }}>
                    {p.descricao}
                  </h3>
                  <span className="tabular-nums" style={{ fontSize: '0.875rem', color: 'var(--status-success)', fontFamily: 'monospace', fontWeight: 700 }}>
                    R$ {p.preco_venda.toFixed(2)}
                  </span>
                </div>
                <button onClick={() => handleAdicionarItem(p)} style={{
                  backgroundColor: 'var(--surface-2)',
                  border: 'none',
                  color: 'var(--domain-compras)',
                  width: '2rem',
                  height: '2rem',
                  borderRadius: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}>
                  <Plus aria-hidden="true" style={{ width: '1rem', height: '1rem' }} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Resumo da Comanda no Balcão */}
        <div className="coliseu-card" style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          <div>
              <h2 style={{
              fontSize: '1.125rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginBottom: '1rem',
              paddingBottom: '0.75rem',
              borderBottom: '1px solid var(--surface-2)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <ShoppingBag aria-hidden="true" style={{ width: '1.25rem', height: '1.25rem', color: 'var(--domain-compras)' }} />
              Comanda de Balcão
            </h2>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>
                Nome do Cliente
              </label>
              <Input
                type="text"
                value={clienteNome}
                onChange={(e) => setClienteNome(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '280px', overflowY: 'auto', paddingRight: '0.25rem' }}>
              {carrinho.map((item) => (
                <div
                  key={item.produto.id}
                  style={{
                    backgroundColor: 'var(--surface-app)',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--surface-2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.75rem',
                    fontFamily: 'monospace',
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 700, display: 'block' }}>{item.produto.descricao}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {item.quantidade}x R$ {item.produto.preco_venda.toFixed(2)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span className="tabular-nums" style={{ color: 'var(--status-success)', fontWeight: 700 }}>
                      R$ {(item.quantidade * item.produto.preco_venda).toFixed(2)}
                    </span>
                    <button
                      onClick={() => handleRemoverItem(item.produto.id)}
                      style={{ background: 'none', border: 'none', color: 'var(--status-danger)', cursor: 'pointer' }}
                    >
                      <Trash2 aria-hidden="true" style={{ width: '0.875rem', height: '0.875rem' }} />
                    </button>
                  </div>
                </div>
              ))}

              {carrinho.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2.5rem 0', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                  Selecione produtos ao lado para iniciar a comanda
                </div>
              )}
            </div>
          </div>

          <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--surface-2)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'monospace' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Total Atendimento:</span>
              <span className="tabular-nums" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--status-success)' }}>
                R$ {totalCarrinho.toFixed(2)}
              </span>
            </div>

            <Button
              variant="primary"
              onClick={handleFinalizarComanda}
              disabled={loading || carrinho.length === 0}
              style={{ width: '100%', padding: '0.75rem', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <QrCode aria-hidden="true" style={{ width: '1rem', height: '1rem' }} />
              {loading ? 'Gerando...' : 'Gerar Comanda / QR Code'}
            </Button>
          </div>
        </div>
      </div>

      {/* Modal de Comanda Gerada */}
      {comandaGerada && (
        <div className="coliseu-overlay" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
        }}>
          <div className="coliseu-modal" role="dialog" aria-modal="true" style={{
            maxWidth: '380px',
            width: '100%',
            padding: '1.5rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}>
            <div style={{
              width: '3rem',
              height: '3rem',
              backgroundColor: 'var(--domain-compras-bg)',
              color: 'var(--domain-compras)',
              borderRadius: '9999px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              border: '1px solid var(--domain-compras)',
            }}>
              <QrCode aria-hidden="true" style={{ width: '1.5rem', height: '1.5rem' }} />
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'monospace', textTransform: 'uppercase', display: 'block' }}>Ordem de Pré-Venda</span>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'monospace', margin: '0.25rem 0' }}>{comandaGerada.numero_comanda}</h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--status-success)', fontWeight: 700, display: 'block' }}>
                Cliente: {comandaGerada.cliente_nome}
              </span>
            </div>

            <div style={{ padding: '1rem', backgroundColor: 'var(--surface-app)', borderRadius: '0.75rem', border: '1px solid var(--surface-2)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '9rem', height: '9rem', backgroundColor: '#ffffff', padding: '0.5rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: 'var(--surface-app)', fontWeight: 700, fontFamily: 'monospace', textAlign: 'center', fontSize: '0.75rem' }}>
                  [QR CODE COMANDA {comandaGerada.numero_comanda}]
                </span>
              </div>
              <span style={{ fontSize: '0.625rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>Apresente este QR Code no Caixa PDV</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              <span>Valor Total:</span>
              <span className="tabular-nums" style={{ color: 'var(--status-success)', fontWeight: 700 }}>R$ {comandaGerada.valor_total.toFixed(2)}</span>
            </div>

            <Button
              variant="secondary"
              onClick={() => setComandaGerada(null)}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Novo Atendimento de Balcão
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
