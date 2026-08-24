import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Plus,
  CheckCircle,
  Clock,
  AlertTriangle,
  Barcode,
  Search,
  Check,
  Gift,
  FileCheck,
} from 'lucide-react';
import { dbService } from '../lib/db';
import type { Produto } from '../lib/types';
import {
  condicionalService,
  CondicionalCompleta,
  ItemCondicionalInput,
  ValeTrocaOutput,
} from '../lib/condicional';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { parseNumber, formatCurrency, formatDate } from '../lib/formatters';

export const CondicionalPage: React.FC = () => {
  const [condicionais, setCondicionais] = useState<CondicionalCompleta[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [activeTab, setActiveTab] = useState<'pendentes' | 'nova' | 'vale_troca'>('pendentes');

  // Nova Malinha
  const [clienteId, setClienteId] = useState('cli1');
  const [diasPrazo, setDiasPrazo] = useState(3);
  const [carrinho, setCarrinho] = useState<{ produto: Produto; quantidade: number }[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Devolução por Código
  const [selectedCond, setSelectedCond] = useState<CondicionalCompleta | null>(null);
  const [barcodeInput, setBarcodeInput] = useState('');

  // Vale Troca
  const [valorValeOriginal, setValorValeOriginal] = useState(100.0);
  const [percentualBonus, setPercentualBonus] = useState(5.0);
  const [valeGerado, setValeGerado] = useState<ValeTrocaOutput | null>(null);

  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const carregarCondicionais = async () => {
    try {
      const list = await condicionalService.listarCondicionaisPendentes('fil1');
      setCondicionais(list);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedCond(null);
      }
    };
    if (selectedCond) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCond]);

  useEffect(() => {
    carregarCondicionais();
    dbService.listProdutos('emp1').then(setProdutos).catch(console.error);
  }, []);

  const handleAdicionarItemMalinha = (p: Produto) => {
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

  const totalMalinha = carrinho.reduce(
    (acc, item) => acc + item.produto.preco_venda * item.quantidade,
    0
  );

  const handleSalvarMalinha = async () => {
    if (carrinho.length === 0) {
      showToast('⚠️ Selecione peças para enviar na malinha');
      return;
    }
    setLoading(true);
    try {
      const itensInput: ItemCondicionalInput[] = carrinho.map((i) => ({
        produto_id: i.produto.id,
        codigo_barras: i.produto.codigo_barras,
        quantidade: i.quantidade,
        preco_unitario: i.produto.preco_venda,
      }));

      const res = await condicionalService.criarVendaCondicional(
        'fil1',
        clienteId,
        undefined,
        diasPrazo,
        itensInput
      );
      showToast(`🎉 Malinha '${res.numero_condicional}' gerada! Prazo de ${diasPrazo} dias.`);
      setCarrinho([]);
      carregarCondicionais();
      setActiveTab('pendentes');
    } catch (err: any) {
      showToast(`❌ Erro ao gerar condicional: ${err?.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDevolverItemBarcode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCond || !barcodeInput.trim()) return;

    try {
      const msg = await condicionalService.devolverItemPorCodigo(
        selectedCond.id,
        barcodeInput.trim()
      );
      showToast(`✅ ${msg}`);
      setBarcodeInput('');
      carregarCondicionais();

      const updatedList = await condicionalService.listarCondicionaisPendentes('fil1');
      const found = updatedList.find((c) => c.id === selectedCond.id);
      if (found) setSelectedCond(found);
    } catch (err: any) {
      showToast(`❌ ${err?.message || err}`);
    }
  };

  const handleFaturarCondicional = async (condId: string) => {
    setLoading(true);
    try {
      const valorFat = await condicionalService.faturarCondicional(condId);
      showToast(`💰 Condicional faturada com sucesso! Débito de R$ ${valorFat.toFixed(2)} registrado na ficha do cliente.`);
      setSelectedCond(null);
      carregarCondicionais();
    } catch (err: any) {
      showToast(`❌ Erro ao faturar: ${err?.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGerarValeTroca = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await condicionalService.gerarValeTroca(
        clienteId,
        valorValeOriginal,
        percentualBonus,
        30
      );
      setValeGerado(res);
      showToast(`🎁 Vale-Troca '${res.codigo_vale}' gerado! Crédito total R$ ${res.valor_total_credito.toFixed(2)}.`);
    } catch (err: any) {
      showToast(`❌ Erro ao gerar vale: ${err?.message || err}`);
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
        title='Venda Condicional ("Malinha"), Devolução & Vale-Troca'
        subtitle="Peças para experimentar em casa, baixa por scanner EAN e geração de vale-troca com bônus"
        icon={<ShoppingBag aria-hidden="true" style={{ color: '#ec4899', width: '1.5rem', height: '1.5rem' }} />}
      />

      {/* Navegação de Abas */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--surface-2)', paddingBottom: '0.75rem' }}>
        <button
          onClick={() => setActiveTab('pendentes')}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '0.75rem',
            fontWeight: 700,
            fontSize: '0.75rem',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: activeTab === 'pendentes' ? '#db2777' : 'var(--surface-1)',
            color: activeTab === 'pendentes' ? 'var(--text-primary)' : 'var(--text-secondary)',
          }}
        >
          <Clock aria-hidden="true" style={{ width: '1rem', height: '1rem' }} />
          Malinhas em Aberto ({condicionais.length})
        </button>

        <button
          onClick={() => setActiveTab('nova')}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '0.75rem',
            fontWeight: 700,
            fontSize: '0.75rem',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: activeTab === 'nova' ? '#db2777' : 'var(--surface-1)',
            color: activeTab === 'nova' ? 'var(--text-primary)' : 'var(--text-secondary)',
          }}
        >
          <Plus aria-hidden="true" style={{ width: '1rem', height: '1rem' }} />
          Nova Venda Condicional
        </button>

        <button
          onClick={() => setActiveTab('vale_troca')}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '0.75rem',
            fontWeight: 700,
            fontSize: '0.75rem',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: activeTab === 'vale_troca' ? '#db2777' : 'var(--surface-1)',
            color: activeTab === 'vale_troca' ? 'var(--text-primary)' : 'var(--text-secondary)',
          }}
        >
          <Gift aria-hidden="true" style={{ width: '1rem', height: '1rem' }} />
          Gerar Vale-Troca com Bônus
        </button>
      </div>

      {/* Aba Pendentes */}
      {activeTab === 'pendentes' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {condicionais.map((c) => (
            <div
              className="coliseu-card"
              key={c.id}
              style={{
                border: c.prazo_vencido ? '1px solid var(--status-danger)' : '1px solid var(--surface-2)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '1rem',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem', fontFamily: 'monospace' }}>
                  <span style={{ fontSize: '0.75rem', color: '#f472b6', fontWeight: 700 }}>{c.numero_condicional}</span>
                  {c.prazo_vencido ? (
                    <Badge variant="danger" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <AlertTriangle aria-hidden="true" style={{ width: '0.75rem', height: '0.75rem' }} /> VENCIDO
                    </Badge>
                  ) : (
                    <Badge variant="success">
                      {c.dias_restantes} dias restantes
                    </Badge>
                  )}
                </div>

                <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0.25rem 0' }}>
                  {c.cliente_nome || 'Cliente Condicional'}
                </h3>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', display: 'block' }} className="tabular-nums">
                  Saída: {formatDate(c.data_saida)} | Limite: {formatDate(c.data_limite_devolucao)}
                </span>

                <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: 'var(--surface-app)', borderRadius: '0.75rem', border: '1px solid var(--surface-2)', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Enviado:</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }} className="tabular-nums">{formatCurrency(c.valor_total_enviado)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--status-success)' }}>
                    <span>Devolvido:</span>
                    <span className="tabular-nums" style={{ fontWeight: 600 }}>{formatCurrency(c.valor_total_devolvido)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f472b6', fontWeight: 700, paddingTop: '0.25rem', borderTop: '1px solid var(--surface-2)' }}>
                    <span>A Faturar:</span>
                    <span className="tabular-nums">{formatCurrency(c.valor_total_enviado - c.valor_total_devolvido)}</span>
                  </div>
                </div>
              </div>

              <Button
                variant="secondary"
                onClick={() => setSelectedCond(c)}
                style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Barcode aria-hidden="true" style={{ width: '1rem', height: '1rem', color: '#f472b6' }} />
                Acerto / Devolução de Peças
              </Button>
            </div>
          ))}

          {condicionais.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem 0', color: '#64748b', fontSize: '0.75rem' }}>
              Nenhuma venda condicional ("malinha") em aberto no momento.
            </div>
          )}
        </div>
      )}

      {/* Aba Nova Malinha */}
      {activeTab === 'nova' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ position: 'relative' }}>
              <Search aria-hidden="true" style={{ width: '1rem', height: '1rem', color: 'var(--text-muted)', position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)' }} />
              <Input
                type="text"
                placeholder="Buscar produto por descrição ou SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '2.5rem', width: '100%' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem', maxHeight: '500px', overflowY: 'auto', paddingRight: '0.25rem' }}>
              {filtered.map((p) => (
                <div
                  key={p.id}
                  onClick={() => handleAdicionarItemMalinha(p)}
                  style={{
                    backgroundColor: 'var(--surface-1)',
                    border: '1px solid var(--surface-2)',
                    borderRadius: '0.75rem',
                    padding: '1rem',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.6875rem', fontFamily: 'monospace', color: '#f472b6', fontWeight: 700, display: 'block' }}>
                      {p.codigo_sku}
                    </span>
                    <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0.25rem 0' }}>
                      {p.descricao}
                    </h3>
                    <span className="tabular-nums" style={{ fontSize: '0.875rem', color: 'var(--status-success)', fontWeight: 700 }}>
                      {formatCurrency(p.preco_venda)}
                    </span>
                  </div>
                  <button onClick={() => handleAdicionarItemMalinha(p)} style={{ backgroundColor: 'var(--surface-2)', border: 'none', color: '#f472b6', width: '2rem', height: '2rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <Plus aria-hidden="true" style={{ width: '1rem', height: '1rem' }} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="coliseu-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--surface-2)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShoppingBag aria-hidden="true" style={{ width: '1.25rem', height: '1.25rem', color: '#f472b6' }} />
                Resumo da Malinha
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Prazo de Retorno (Dias)</label>
                  <Input
                    type="number"
                    value={diasPrazo}
                    onChange={(e) => setDiasPrazo(parseInt(e.target.value) || 3)}
                    style={{ width: '100%' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '220px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                  {carrinho.map((item) => (
                    <div key={item.produto.id} style={{ backgroundColor: 'var(--surface-app)', padding: '0.625rem', borderRadius: '0.5rem', border: '1px solid var(--surface-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{item.produto.descricao}</span>
                      <span className="tabular-nums" style={{ color: 'var(--status-success)', fontWeight: 700 }}>
                        {item.quantidade}x {formatCurrency(item.produto.preco_venda)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--surface-2)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Total Enviado:</span>
                <span className="tabular-nums" style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f472b6' }}>{formatCurrency(totalMalinha)}</span>
              </div>

              <Button
                variant="primary"
                onClick={handleSalvarMalinha}
                disabled={loading || carrinho.length === 0}
                style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Check aria-hidden="true" style={{ width: '1rem', height: '1rem' }} />
                {loading ? 'Salvando...' : 'Confirmar Envio da Malinha'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Aba Vale-Troca */}
      {activeTab === 'vale_troca' && (
        <div className="coliseu-card" style={{ maxWidth: '560px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--surface-2)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Gift aria-hidden="true" style={{ width: '1.25rem', height: '1.25rem', color: '#f472b6' }} />
            Emissão de Vale-Troca com Bônus de Crédito
          </h2>

          <form onSubmit={handleGerarValeTroca} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Valor Devolvido (R$)</label>
              <Input
                type="text"
                required
                value={valorValeOriginal}
                onChange={(e) => setValorValeOriginal(parseNumber(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Bônus Promocional (%)</label>
              <Input
                type="text"
                required
                value={percentualBonus}
                onChange={(e) => setPercentualBonus(parseNumber(e.target.value))}
                style={{ width: '100%' }}
              />
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>Incentivo ao cliente para manter crédito na loja</span>
            </div>

            <Button type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Gift aria-hidden="true" style={{ width: '1rem', height: '1rem' }} />
              Gerar Crédito no Cadastro do Cliente
            </Button>
          </form>

          {valeGerado && (
            <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'var(--surface-app)', borderRadius: '0.75rem', border: '1px solid var(--surface-2)', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f472b6', fontWeight: 700 }}>
                <span>Código: {valeGerado.codigo_vale}</span>
                <span className="tabular-nums">Validade: {formatDate(valeGerado.data_validade)}</span>
              </div>
              <div style={{ color: 'var(--text-secondary)' }}>
                Valor Original: {formatCurrency(valeGerado.valor_original)} + Bônus: {formatCurrency(valeGerado.valor_bonus)}
              </div>
              <div className="tabular-nums" style={{ color: 'var(--status-success)', fontWeight: 700, fontSize: '0.875rem', paddingTop: '0.5rem', borderTop: '1px solid var(--surface-2)' }}>
                Saldo de Crédito Disponível: {formatCurrency(valeGerado.valor_total_credito)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal Acerto */}
      {selectedCond && (
        <div className="coliseu-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="coliseu-modal" role="dialog" aria-modal="true" style={{ maxWidth: '640px', width: '100%', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--surface-2)', paddingBottom: '0.75rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#f472b6', fontFamily: 'monospace', fontWeight: 700, display: 'block' }}>{selectedCond.numero_condicional}</span>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)' }}>Acerto de Peças — {selectedCond.cliente_nome}</h2>
              </div>
              <button onClick={() => setSelectedCond(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '1.25rem', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleDevolverItemBarcode} style={{ display: 'flex', gap: '0.5rem' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Barcode aria-hidden="true" style={{ width: '1rem', height: '1rem', color: 'var(--text-muted)', position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)' }} />
                <Input
                  type="text"
                  autoFocus
                  placeholder="Bipe o Código de Barras ou SKU..."
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  style={{ paddingLeft: '2.5rem', width: '100%' }}
                />
              </div>
              <Button type="submit">Devolver Item</Button>
            </form>

            <div style={{ maxHeight: '260px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '0.25rem' }}>
              {selectedCond.itens.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--surface-2)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.75rem',
                    backgroundColor: item.status === 'DEVOLVIDO' ? 'var(--status-success-bg)' : 'var(--surface-app)',
                    color: item.status === 'DEVOLVIDO' ? 'var(--text-secondary)' : 'var(--text-primary)',
                    textDecoration: item.status === 'DEVOLVIDO' ? 'line-through' : 'none',
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 700, display: 'block' }}>{item.descricao_produto}</span>
                    <span style={{ fontSize: '0.625rem', color: 'var(--text-secondary)' }}>SKU: {item.codigo_sku} | EAN: {item.codigo_barras || 'N/A'}</span>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span className="tabular-nums" style={{ fontWeight: 700, display: 'block' }}>{formatCurrency(item.preco_unitario)}</span>
                    <span style={{ fontSize: '0.625rem', fontWeight: 700, color: item.status === 'DEVOLVIDO' ? 'var(--status-success)' : 'var(--status-warning)' }}>
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--surface-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.75rem' }}>
                <span style={{ color: 'var(--text-secondary)', display: 'block' }}>Total a Faturar:</span>
                <span className="tabular-nums" style={{ fontSize: '1.125rem', fontWeight: 700, color: '#f472b6' }}>
                  {formatCurrency(selectedCond.valor_total_enviado - selectedCond.valor_total_devolvido)}
                </span>
              </div>

              <Button
                variant="success"
                onClick={() => handleFaturarCondicional(selectedCond.id)}
                disabled={loading}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <FileCheck aria-hidden="true" style={{ width: '1rem', height: '1rem' }} />
                Faturar Restantes & Lançar Débito
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
