import React, { useState, useMemo } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { AIInsight } from '../components/ui/AIComponents';
import { formatCurrency } from '../lib/formatters';
import { Search, Boxes, ArrowRightLeft, ShieldAlert, Plus, CheckCircle2, X, Check, SlidersHorizontal } from 'lucide-react';

interface InventarioItem {
  id: string;
  dep: string;
  produto: string;
  sku: string;
  saldo: number;
  reservado: number;
  disponivel: number;
  valorEstoque: number;
}

const INITIAL_INVENTARIO: InventarioItem[] = [
  { id: 'DEP-01-1', dep: 'Depósito Central Dourados', sku: 'TINTA-NINJA-900', produto: 'TINTA AUTOMOTIVA POLIESTER PRETO NINJA 900ML', saldo: 42, reservado: 8, disponivel: 34, valorEstoque: 3775.80 },
  { id: 'DEP-01-2', dep: 'Depósito Central Dourados', sku: 'VERNIZ-PU-8100', produto: 'VERNIZ POLIURETANO ALTO SÓLIDOS 5:1 900ML', saldo: 4, reservado: 2, disponivel: 2, valorEstoque: 498.00 },
  { id: 'DEP-02-1', dep: 'Filial Campo Grande', sku: 'PRIMER-EP-310', produto: 'PRIMER EPÓXI CINZA AUTOMOTIVO 3.6L', saldo: 28, reservado: 4, disponivel: 24, valorEstoque: 4200.00 },
  { id: 'DEP-01-3', dep: 'Depósito Central Dourados', sku: 'MASSA-PLAST-1KG', produto: 'MASSA PLÁSTICA COM CATALISADOR 1KG', saldo: 110, reservado: 15, disponivel: 95, valorEstoque: 3850.00 },
  { id: 'DEP-03-1', dep: 'Depósito Ponta Porã', sku: 'DILUENTE-PU-500', produto: 'DILUENTE PARA POLIURETANO E POLIÉSTER 5L', saldo: 35, reservado: 5, disponivel: 30, valorEstoque: 3150.00 },
];

export const InventoryPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [inventarios, setInventarios] = useState<InventarioItem[]>(INITIAL_INVENTARIO);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'transfer' | 'adjust'>('transfer');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State
  const [selectedSku, setSelectedSku] = useState(INITIAL_INVENTARIO[0].sku);
  const [depOrigem, setDepOrigem] = useState('Depósito Central Dourados');
  const [depDestino, setDepDestino] = useState('Filial Campo Grande');
  const [qtdOperacao, setQtdOperacao] = useState('5');
  const [motivoAjuste, setMotivoAjuste] = useState('Transferência de reposição entre filiais');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleExecutarOperacao = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(qtdOperacao, 10);
    if (isNaN(qty) || qty <= 0) {
      showToast('⚠️ Informe uma quantidade válida.');
      return;
    }

    if (modalMode === 'transfer') {
      if (depOrigem === depDestino) {
        showToast('⚠️ O depósito de origem deve ser diferente do depósito de destino.');
        return;
      }
      setInventarios((prev) =>
        prev.map((item) => {
          if (item.sku === selectedSku && item.dep === depOrigem) {
            const newSaldo = Math.max(0, item.saldo - qty);
            return { ...item, saldo: newSaldo, disponivel: Math.max(0, newSaldo - item.reservado) };
          }
          if (item.sku === selectedSku && item.dep === depDestino) {
            const newSaldo = item.saldo + qty;
            return { ...item, saldo: newSaldo, disponivel: newSaldo - item.reservado };
          }
          return item;
        })
      );
      showToast(`📦 Transferência de ${qty} Un. realizada de '${depOrigem}' para '${depDestino}'.`);
    } else {
      // Ajuste
      setInventarios((prev) =>
        prev.map((item) => {
          if (item.sku === selectedSku && item.dep === depOrigem) {
            return { ...item, saldo: qty, disponivel: Math.max(0, qty - item.reservado) };
          }
          return item;
        })
      );
      showToast(`⚖️ Saldo do item ajustado para ${qty} Un. com sucesso.`);
    }

    setIsModalOpen(false);
  };

  const filteredInventarios = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return inventarios;
    return inventarios.filter(
      (i) =>
        i.produto.toLowerCase().includes(q) ||
        i.dep.toLowerCase().includes(q) ||
        i.sku.toLowerCase().includes(q)
    );
  }, [inventarios, searchTerm]);

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
        title="Gestão de Saldos & Reservas de Estoque"
        description="Saldo por depósito, reserva para pedidos em carteira e extrato de movimentações imutáveis."
        breadcrumbItems={[
          { label: 'Estoque', active: false },
          { label: 'Saldos de Estoque', active: true },
        ]}
        primaryAction={{
          label: 'Transferir Estoque',
          onClick: () => {
            setModalMode('transfer');
            setIsModalOpen(true);
          },
          icon: <ArrowRightLeft size={14} />,
        }}
      />

      <div className="coliseu-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ width: '360px' }}>
            <Input
              placeholder="Buscar por produto, SKU ou depósito..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Search size={14} />}
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setModalMode('adjust');
              setIsModalOpen(true);
            }}
            className="coliseu-btn coliseu-btn-secondary"
          >
            <SlidersHorizontal size={13} />
            Ajuste Manual / Inventário
          </button>
        </div>

        <div className="coliseu-table-container">
          <table className="coliseu-table">
            <thead>
              <tr>
                <th>Depósito</th>
                <th>SKU / Código</th>
                <th>Produto / Descrição</th>
                <th style={{ textAlign: 'right' }}>Saldo Físico</th>
                <th style={{ textAlign: 'right' }}>Reservado</th>
                <th style={{ textAlign: 'right' }}>Disponível</th>
                <th style={{ textAlign: 'right' }}>Valor Total Est.</th>
                <th style={{ textAlign: 'center', width: '100px' }}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {filteredInventarios.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 600, color: 'var(--text-link)', fontSize: '11px' }}>{item.dep}</td>
                  <td className="text-mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.sku}</td>
                  <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{item.produto}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }} className="tabular-nums">{item.saldo} Un.</td>
                  <td style={{ textAlign: 'right', color: 'var(--status-warning)' }} className="tabular-nums">{item.reservado} Un.</td>
                  <td style={{ textAlign: 'right', color: 'var(--status-success)', fontWeight: 700 }} className="tabular-nums">{item.disponivel} Un.</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }} className="tabular-nums">{formatCurrency(item.valorEstoque)}</td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSku(item.sku);
                        setDepOrigem(item.dep);
                        setModalMode('transfer');
                        setIsModalOpen(true);
                      }}
                      className="coliseu-btn coliseu-btn-secondary coliseu-btn--sm"
                      style={{ padding: '2px 6px', fontSize: '10px' }}
                    >
                      <ArrowRightLeft size={10} /> Mover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AIInsight
        title="Auditoria Preditiva de Ruptura & Acurácia"
        message="A taxa de acurácia do inventário físico em relação ao banco de dados SQLite local está em 99,8%. Nenhuma divergência grave detectada nas últimas 24h."
      />

      {/* Modal Transferência / Ajuste */}
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
                {modalMode === 'transfer' ? 'Transferência de Estoque entre Depósitos' : 'Ajuste Manual de Saldo de Estoque'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleExecutarOperacao} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label className="coliseu-label">Produto *</label>
                <select
                  value={selectedSku}
                  onChange={(e) => setSelectedSku(e.target.value)}
                  className="coliseu-input"
                >
                  {inventarios.map((i) => (
                    <option key={i.id} value={i.sku}>
                      {i.sku} — {i.produto}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="coliseu-label">Depósito Origem *</label>
                  <select
                    value={depOrigem}
                    onChange={(e) => setDepOrigem(e.target.value)}
                    className="coliseu-input"
                  >
                    <option value="Depósito Central Dourados">Depósito Central Dourados</option>
                    <option value="Filial Campo Grande">Filial Campo Grande</option>
                    <option value="Depósito Ponta Porã">Depósito Ponta Porã</option>
                  </select>
                </div>

                {modalMode === 'transfer' && (
                  <div>
                    <label className="coliseu-label">Depósito Destino *</label>
                    <select
                      value={depDestino}
                      onChange={(e) => setDepDestino(e.target.value)}
                      className="coliseu-input"
                    >
                      <option value="Filial Campo Grande">Filial Campo Grande</option>
                      <option value="Depósito Central Dourados">Depósito Central Dourados</option>
                      <option value="Depósito Ponta Porã">Depósito Ponta Porã</option>
                    </select>
                  </div>
                )}

                {modalMode === 'adjust' && (
                  <div>
                    <label className="coliseu-label">Novo Saldo Total Físico *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={qtdOperacao}
                      onChange={(e) => setQtdOperacao(e.target.value)}
                      className="coliseu-input"
                    />
                  </div>
                )}
              </div>

              {modalMode === 'transfer' && (
                <div>
                  <label className="coliseu-label">Quantidade a Transferir *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={qtdOperacao}
                    onChange={(e) => setQtdOperacao(e.target.value)}
                    className="coliseu-input"
                  />
                </div>
              )}

              <div>
                <label className="coliseu-label">Motivo / Justificativa</label>
                <input
                  type="text"
                  value={motivoAjuste}
                  onChange={(e) => setMotivoAjuste(e.target.value)}
                  className="coliseu-input"
                />
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
                  Confirmar Movimentação
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
};
