import React, { useState } from 'react';
import {
  ArrowRightLeft,
  Warehouse,
  Send,
  CheckCircle,
  RefreshCw,
  Boxes,
} from 'lucide-react';
import { inventoryService, TransferenciaEstoqueInput } from '../lib/inventory';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { parseNumber } from '../lib/formatters';

export const StockTransferPage: React.FC = () => {
  const [depositoOrigem, setDepositoOrigem] = useState('dep1');
  const [depositoDestino, setDepositoDestino] = useState('dep2');
  const [produtoId, setProdutoId] = useState('prod1');
  const [quantidade, setQuantidade] = useState<number>(5);
  const [observacao, setObservacao] = useState('Transferência para reabastecimento de loja');
  const [loading, setLoading] = useState(false);
  const [lastTransfId, setLastTransfId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleExecutarTransferencia = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const input: TransferenciaEstoqueInput = {
        deposito_origem_id: depositoOrigem,
        deposito_destino_id: depositoDestino,
        itens: [
          {
            produto_id: produtoId,
            quantidade,
          },
        ],
        observacao,
      };

      const transfId = await inventoryService.executarTransferenciaEstoque(input);
      setLastTransfId(transfId);
      showToast(`✅ Transferência atômica ID ${transfId.substring(0, 8)} concluída!`);
    } catch (err: any) {
      showToast(`❌ Erro na transferência: ${err?.message || 'Falha IPC'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="coliseu-page">
      {toastMessage && (
        <div className="coliseu-toast-container">
          <div className="coliseu-toast coliseu-toast--success">
            <CheckCircle style={{ width: '1.25rem', height: '1.25rem', color: 'var(--status-success)' }} />
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>{toastMessage}</span>
          </div>
        </div>
      )}

      <PageHeader
        title="Transferência de Estoque entre Depósitos & Filiais"
        subtitle="Movimentação atômica de saldo com preservação da regra de conservação total de inventário"
        icon={<ArrowRightLeft style={{ color: 'var(--action-primary)', width: '1.5rem', height: '1.5rem' }} />}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '1.5rem', marginTop: '1rem' }}>
        {/* Formulário de Transferência */}
        <div className="coliseu-card">
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Send style={{ width: '1.25rem', height: '1.25rem', color: 'var(--action-primary)' }} />
            Nova Transferência Entre Locais
          </h2>

          <form onSubmit={handleExecutarTransferencia} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Depósito de Origem (Débito)</label>
                <select
                  value={depositoOrigem}
                  onChange={(e) => setDepositoOrigem(e.target.value)}
                  style={{ width: '100%', backgroundColor: 'var(--surface-1)', border: '1px solid var(--border-default)', borderRadius: '0.5rem', padding: '0.5rem', fontSize: '0.75rem', color: 'var(--text-primary)' }}
                >
                  <option value="dep1">Depósito Central (CD Principal)</option>
                  <option value="dep2">Depósito Filial 1 (Loja Centro)</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Depósito de Destino (Crédito)</label>
                <select
                  value={depositoDestino}
                  onChange={(e) => setDepositoDestino(e.target.value)}
                  style={{ width: '100%', backgroundColor: 'var(--surface-1)', border: '1px solid var(--border-default)', borderRadius: '0.5rem', padding: '0.5rem', fontSize: '0.75rem', color: 'var(--text-primary)' }}
                >
                  <option value="dep2">Depósito Filial 1 (Loja Centro)</option>
                  <option value="dep1">Depósito Central (CD Principal)</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>ID do Produto</label>
                <Input
                  type="text"
                  required
                  value={produtoId}
                  onChange={(e) => setProdutoId(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Quantidade a Transferir</label>
                <Input
                  type="text"
                  required
                  value={quantidade}
                  onChange={(e) => setQuantidade(parseNumber(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Observação / Justificativa</label>
              <Input
                type="text"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', marginTop: '0.5rem' }}
            >
              <RefreshCw style={{ width: '1rem', height: '1rem' }} />
              {loading ? 'Executando Transferência...' : 'Executar Transferência Atômica'}
            </Button>
          </form>
        </div>

        {/* Resumo da Operação */}
        <div className="coliseu-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Boxes style={{ width: '1.25rem', height: '1.25rem', color: 'var(--action-primary)' }} />
              Garantia de Integridade
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
              <div style={{ backgroundColor: 'var(--surface-1)', border: '1px solid var(--border-default)', borderRadius: '0.75rem', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <p style={{ color: 'var(--status-success)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                  <CheckCircle style={{ width: '1rem', height: '1rem' }} /> Transação Atômica ACID (SQLite)
                </p>
                <p style={{ color: 'var(--text-muted)', lineHeight: 1.5, fontFamily: 'Inter, system-ui, sans-serif', margin: 0 }}>
                  A transferência debita o saldo na origem e credita no destino em uma única instrução atômica. Caso ocorra qualquer falha, a operação é revertida via Rollback automático.
                </p>
              </div>

              {lastTransfId && (
                <div style={{ backgroundColor: 'rgba(var(--action-primary-rgb), 0.1)', border: '1px solid var(--action-primary)', borderRadius: '0.75rem', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <span style={{ color: 'var(--action-primary)', fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 600 }}>Última Transferência Registrada:</span>
                  <span style={{ color: 'var(--text-primary)', fontSize: '0.75rem', fontFamily: 'monospace' }}>{lastTransfId}</span>
                  <span style={{ color: 'var(--status-success)', fontSize: '0.6875rem', marginTop: '0.25rem' }}>Status: CONCLUIDA (Extrato imutável gerado)</span>
                </div>
              )}
            </div>
          </div>

          <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-default)', fontSize: '0.6875rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
            Movimentação gravada nas tabelas `estoque_transferencias` e `estoque_movimentacoes`.
          </div>
        </div>
      </div>
    </div>
  );
};
