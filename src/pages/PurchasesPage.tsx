import React, { useState, useMemo } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { AIInsight } from '../components/ui/AIComponents';
import { formatCurrency, formatDate, parseNumber } from '../lib/formatters';
import { Search, Plus, Truck, FileText, CheckCircle2, X, Check, Eye } from 'lucide-react';

interface CotacaoItem {
  id: string;
  fornecedor: string;
  data: string;
  produto: string;
  quantidade: number;
  valorTotal: number;
  status: 'Aprovado' | 'Concluído' | 'Em Análise' | 'Cancelado';
}

const INITIAL_COMPRAS: CotacaoItem[] = [
  { id: 'COT-891', fornecedor: 'TINTAS BRASIL S.A.', data: '2026-08-12', produto: 'VERNIZ POLIURETANO ALTO SÓLIDOS 5L', quantidade: 50, valorTotal: 18450.0, status: 'Aprovado' },
  { id: 'COT-890', fornecedor: 'CHEMICAL COATINGS LTDA', data: '2026-08-10', produto: 'PRIMER EPÓXI CINZA 3.6L', quantidade: 30, valorTotal: 9200.0, status: 'Concluído' },
  { id: 'COT-892', fornecedor: 'POLIURETANOS DO BRASIL', data: '2026-08-16', produto: 'DILUENTE PU 5L', quantidade: 40, valorTotal: 7600.0, status: 'Em Análise' },
];

export const PurchasesPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [compras, setCompras] = useState<CotacaoItem[]>(INITIAL_COMPRAS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State
  const [novoFornecedor, setNovoFornecedor] = useState('');
  const [novoProduto, setNovoProduto] = useState('');
  const [novaQuantidade, setNovaQuantidade] = useState('10');
  const [novoPrecoUnit, setNovoPrecoUnit] = useState('120.00');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSalvarCotacao = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(novaQuantidade, 10);
    const preco = parseNumber(novoPrecoUnit);
    if (!novoFornecedor.trim() || !novoProduto.trim() || isNaN(qty) || isNaN(preco)) {
      showToast('⚠️ Preencha todos os campos da cotação.');
      return;
    }

    const nova: CotacaoItem = {
      id: `COT-${Math.floor(Math.random() * 900) + 100}`,
      fornecedor: novoFornecedor.toUpperCase(),
      data: new Date().toISOString().split('T')[0],
      produto: novoProduto.toUpperCase(),
      quantidade: qty,
      valorTotal: qty * preco,
      status: 'Em Análise',
    };

    setCompras((prev) => [nova, ...prev]);
    setIsModalOpen(false);
    setNovoFornecedor('');
    setNovoProduto('');
    showToast(`✅ Cotação ${nova.id} registrada com sucesso!`);
  };

  const handleAprovar = (id: string) => {
    setCompras((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: 'Aprovado' } : c))
    );
    showToast(`📦 Cotação ${id} aprovada e pedido gerado!`);
  };

  const filteredCompras = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return compras;
    return compras.filter(
      (c) =>
        c.fornecedor.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.produto.toLowerCase().includes(q)
    );
  }, [compras, searchTerm]);

  return (
    <div className="coliseu-page">
      {toastMessage && (
        <div className="coliseu-toast-container">
          <div className="coliseu-toast coliseu-toast--success">
            <CheckCircle2 size={16} style={{ color: 'var(--status-success)' }} />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      <PageHeader
        title="Gestão de Compras, Cotações & Suprimentos CMP"
        description="Solicitações de compra, cotação com múltiplos fornecedores e matriz Custo Médio Ponderado."
        breadcrumbItems={[
          { label: 'Compras', active: false },
          { label: 'Cotações & Compras', active: true },
        ]}
        primaryAction={{
          label: 'Nova Cotação',
          onClick: () => setIsModalOpen(true),
          icon: <Plus size={14} />,
        }}
      />

      <div className="coliseu-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ width: '360px' }}>
          <Input
            placeholder="Buscar por número, fornecedor ou item..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search size={14} />}
          />
        </div>

        <div className="coliseu-table-container">
          <table className="coliseu-table">
            <thead>
              <tr>
                <th>Número Cotação</th>
                <th>Fornecedor / Razão Social</th>
                <th>Item Solicitado</th>
                <th>Data Emissão</th>
                <th style={{ textAlign: 'right' }}>Qtd</th>
                <th style={{ textAlign: 'right' }}>Valor Total R$</th>
                <th style={{ textAlign: 'center' }}>Status</th>
                <th style={{ textAlign: 'center', width: '120px' }}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {filteredCompras.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600, color: 'var(--text-link)', fontFamily: 'var(--font-family-mono)', fontSize: '11px' }}>
                    {c.id}
                  </td>
                  <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{c.fornecedor}</td>
                  <td style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{c.produto}</td>
                  <td style={{ fontSize: '11px' }} className="tabular-nums">{formatDate(c.data)}</td>
                  <td style={{ textAlign: 'right' }} className="tabular-nums">{c.quantidade} Un.</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }} className="tabular-nums">
                    {formatCurrency(c.valorTotal)}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <StatusBadge status={c.status} />
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {c.status === 'Em Análise' && (
                      <button
                        type="button"
                        onClick={() => handleAprovar(c.id)}
                        className="coliseu-btn coliseu-btn--success coliseu-btn--sm"
                        style={{ padding: '2px 6px', fontSize: '10px' }}
                      >
                        <Check size={11} /> Aprovar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AIInsight
        title="Inteligência de Suprimentos & Matriz CMP"
        message="A fornecedora TINTAS BRASIL apresentou variação de preço +4.2% em relação ao último pedido do item VERNIZ PU. Recomenda-se negociar desconto por volume ou avaliar cotação com CHEMICAL COATINGS."
      />

      {/* Modal Nova Cotação */}
      {isModalOpen && (
        <>
          <div className="coliseu-overlay" onClick={() => setIsModalOpen(false)} />
          <div className="coliseu-modal coliseu-modal--md" style={{ padding: 'var(--spacing-4)' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid var(--border-subtle)',
                paddingBottom: 'var(--spacing-2)',
                marginBottom: 'var(--spacing-3)',
              }}
            >
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                Nova Cotação de Compra
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSalvarCotacao} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label className="coliseu-label">Fornecedor / Razão Social *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: TINTAS BRASIL S.A."
                  value={novoFornecedor}
                  onChange={(e) => setNovoFornecedor(e.target.value)}
                  className="coliseu-input"
                />
              </div>

              <div>
                <label className="coliseu-label">Produto / Descrição do Item *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: VERNIZ POLIURETANO ALTO SÓLIDOS 5L"
                  value={novoProduto}
                  onChange={(e) => setNovoProduto(e.target.value)}
                  className="coliseu-input"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="coliseu-label">Quantidade *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={novaQuantidade}
                    onChange={(e) => setNovaQuantidade(e.target.value)}
                    className="coliseu-input"
                  />
                </div>
                <div>
                  <label className="coliseu-label">Preço Unitário Estimado (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={novoPrecoUnit}
                    onChange={(e) => setNovoPrecoUnit(e.target.value)}
                    className="coliseu-input"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="coliseu-btn coliseu-btn-secondary"
                >
                  Cancelar
                </button>
                <button type="submit" className="coliseu-btn coliseu-btn-primary">
                  <Check size={14} />
                  Salvar Cotação
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
};
