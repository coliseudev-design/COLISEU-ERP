import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../lib/formatters';
import { Titulo, TitulosSelecionaveisGrid } from './TitulosSelecionaveisGrid';
import { LiquidacaoResumo } from './LiquidacaoResumo';
import { PaymentSplitPanel, Pagamento } from './PaymentSplitPanel';
import { RenegociacaoSimulador, RenegociacaoConfig } from './RenegociacaoSimulador';
import { X, CheckCircle2, RefreshCw } from 'lucide-react';

export interface LiquidacaoPayload {
  titulosIds: string[];
  desconto: number;
  juros: number;
  multa: number;
  subtotal: number;
  valorTotal: number;
  pagamentos: Pagamento[];
  caixaId: string;
  caixaNome: string;
  contaId: string;
  contaNome: string;
  imprimirRecibo: boolean;
  tipoLancamento: 'UNICO' | 'INDIVIDUAL' | 'PARCIAL';
}

export interface TitulosLiquidarModalProps {
  isOpen: boolean;
  onClose: () => void;
  titulos: Titulo[];
  clienteNome: string;
  clienteCnpj?: string;
  totalCliente: number;
  initialSelectedIds?: Set<string>;
  onConfirmarLiquidacao: (data: LiquidacaoPayload) => void;
  onConfirmarRenegociacao?: (data: RenegociacaoConfig) => void;
}

export const TitulosLiquidarModal: React.FC<TitulosLiquidarModalProps> = ({
  isOpen,
  onClose,
  titulos,
  clienteNome,
  clienteCnpj,
  totalCliente,
  initialSelectedIds = new Set(),
  onConfirmarLiquidacao,
  onConfirmarRenegociacao,
}) => {
  const [activeTab, setActiveTab] = useState<'LIQUIDAR' | 'RENEGOCIAR'>('LIQUIDAR');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(initialSelectedIds));

  // Resumo state
  const [desconto, setDesconto] = useState(0);
  const [juros, setJuros] = useState(0);
  const [multa, setMulta] = useState(0);

  // Payment state
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [caixaSelecionado, setCaixaSelecionado] = useState('1');
  const [contaSelecionada, setContaSelecionada] = useState('1');
  const [imprimirRecibo, setImprimirRecibo] = useState(true);
  const [tipoLancamento, setTipoLancamento] = useState<'UNICO' | 'INDIVIDUAL' | 'PARCIAL'>('UNICO');

  // Carregar caixas e contas do localStorage se existirem
  const caixas = useMemo(() => {
    try {
      const saved = localStorage.getItem('coliseu_caixas');
      if (saved) return JSON.parse(saved).filter((c: any) => c.ativo);
    } catch { /* fallback */ }
    return [{ id: '1', nome: 'CAIXA PADRÃO' }, { id: '2', nome: 'CAIXA 02' }];
  }, [isOpen]);

  const contas = useMemo(() => {
    try {
      const saved = localStorage.getItem('coliseu_contas_bancarias');
      if (saved) return JSON.parse(saved).filter((c: any) => c.ativo).map((c: any) => ({ id: c.id, nome: `${c.banco} - Ag ${c.agencia} C/C ${c.conta}` }));
    } catch { /* fallback */ }
    return [{ id: '1', nome: 'CONTA DA EMPRESA' }, { id: '2', nome: '748 - SICREDI (PRINCIPAL)' }];
  }, [isOpen]);

  // Sempre sincronizar a seleção quando o modal abrir ou a seleção inicial mudar
  useEffect(() => {
    if (isOpen) {
      const currentSelection = initialSelectedIds && initialSelectedIds.size > 0 
        ? new Set(initialSelectedIds) 
        : new Set(titulos.filter(t => t.isVencido).map(t => t.codigo));

      setSelectedIds(currentSelection);

      // Calcular juros e multa automáticos para os títulos selecionados
      const selectedTitulos = titulos.filter(t => currentSelection.has(t.codigo));
      let calculatedJuros = 0;
      selectedTitulos.forEach(t => {
        if (t.isVencido) {
          const diff = (t.valorAtual || t.valorTitulo) - t.valorTitulo;
          calculatedJuros += diff > 0 ? diff : Math.round(t.valorTitulo * 0.02 * 100) / 100;
        }
      });

      setJuros(Math.round(calculatedJuros * 100) / 100);
      setMulta(0);
      setDesconto(0);
      setPagamentos([]);
    }
  }, [isOpen, initialSelectedIds, titulos]);

  // Recalcular juros quando a seleção interna do modal for alterada
  const handleSelectionChange = (newSelected: Set<string>) => {
    setSelectedIds(newSelected);
    const selectedTitulos = titulos.filter(t => newSelected.has(t.codigo));
    let calculatedJuros = 0;
    selectedTitulos.forEach(t => {
      if (t.isVencido) {
        const diff = (t.valorAtual || t.valorTitulo) - t.valorTitulo;
        calculatedJuros += diff > 0 ? diff : Math.round(t.valorTitulo * 0.02 * 100) / 100;
      }
    });
    setJuros(Math.round(calculatedJuros * 100) / 100);
  };

  const titulosSelecionados = useMemo(() => titulos.filter(t => selectedIds.has(t.codigo)), [titulos, selectedIds]);
  const subtotal = useMemo(() => titulosSelecionados.reduce((acc, t) => acc + (t.valorTitulo || 0), 0), [titulosSelecionados]);
  const valorLiquidar = useMemo(() => Math.max(0, Math.round((subtotal - desconto + juros + multa) * 100) / 100), [subtotal, desconto, juros, multa]);

  const handleConfirmarLiquidacao = () => {
    if (selectedIds.size === 0) {
      alert('Selecione ao menos um título para liquidar.');
      return;
    }

    const finalPagamentos = pagamentos.length > 0 ? pagamentos : [{
      especie: 'DINHEIRO',
      valor: valorLiquidar,
    }];

    const caixaObj = caixas.find((c: any) => c.id === caixaSelecionado);
    const contaObj = contas.find((c: any) => c.id === contaSelecionada);

    onConfirmarLiquidacao({
      titulosIds: Array.from(selectedIds),
      desconto,
      juros,
      multa,
      subtotal,
      valorTotal: valorLiquidar,
      pagamentos: finalPagamentos,
      caixaId: caixaSelecionado,
      caixaNome: caixaObj ? caixaObj.nome : 'CAIXA PADRÃO',
      contaId: contaSelecionada,
      contaNome: contaObj ? contaObj.nome : 'CONTA DA EMPRESA',
      imprimirRecibo,
      tipoLancamento,
    });
  };

  const handleConfirmarRenegociacao = (config: RenegociacaoConfig) => {
    if (onConfirmarRenegociacao) {
      onConfirmarRenegociacao(config);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'F10') {
        e.preventDefault();
        if (activeTab === 'LIQUIDAR') {
          handleConfirmarLiquidacao();
        }
      } else if (e.ctrlKey && e.key === 'a') {
        e.preventDefault();
        handleSelectionChange(new Set(titulos.map(t => t.codigo)));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeTab, titulos, selectedIds, desconto, juros, multa, pagamentos, caixaSelecionado, contaSelecionada, imprimirRecibo, tipoLancamento]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 'var(--z-modal)',
        backgroundColor: 'var(--surface-overlay-heavy)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        className="coliseu-card"
        style={{
          width: '96vw',
          maxWidth: '1440px',
          height: '92vh',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--surface-1)',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--surface-2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--action-primary)' }} />
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Recebimento / Pagamento — Central de Liquidação de Títulos
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar Modal"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px',
              borderRadius: 'var(--radius-xs)',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Client Info Bar */}
        <div
          style={{
            padding: '10px 20px',
            backgroundColor: 'var(--surface-sunken)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid var(--border-subtle)',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div style={{ fontSize: '13px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <strong>Cliente/Parceiro:</strong>
            <span style={{ fontWeight: 600, color: 'var(--text-link)' }}>{clienteNome}</span>
            {clienteCnpj && <span style={{ color: 'var(--text-muted)' }}>• CPF/CNPJ: {clienteCnpj}</span>}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Total Global em Aberto: <strong className="tabular-nums" style={{ color: 'var(--text-primary)', fontSize: '14px' }}>{formatCurrency(totalCliente)}</strong>
          </div>
        </div>

        {/* Tabs */}
        <div
          className="coliseu-tabs"
          style={{
            display: 'flex',
            padding: '0 20px',
            borderBottom: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--surface-1)',
          }}
        >
          <button
            className={`coliseu-tab ${activeTab === 'LIQUIDAR' ? 'coliseu-tab--active' : ''}`}
            onClick={() => setActiveTab('LIQUIDAR')}
            style={{
              padding: '10px 20px',
              borderBottom: activeTab === 'LIQUIDAR' ? '2px solid var(--action-primary)' : '2px solid transparent',
              background: 'none',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            Liquidação de Títulos ({selectedIds.size} selecionados)
          </button>
          <button
            className={`coliseu-tab ${activeTab === 'RENEGOCIAR' ? 'coliseu-tab--active' : ''}`}
            onClick={() => setActiveTab('RENEGOCIAR')}
            style={{
              padding: '10px 20px',
              borderBottom: activeTab === 'RENEGOCIAR' ? '2px solid var(--action-primary)' : '2px solid transparent',
              background: 'none',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            Renegociação & Parcelamento de Dívida
          </button>
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column' }}>
          {activeTab === 'LIQUIDAR' && (
            <div style={{ display: 'grid', gridTemplateColumns: '480px 1fr', gap: '20px', height: '100%', minHeight: 0 }}>
              {/* Coluna Esquerda: Resumo de Valores, Ação e Split de Pagamento */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', paddingRight: '4px' }}>
                <LiquidacaoResumo
                  subtotal={subtotal}
                  desconto={desconto}
                  juros={juros}
                  multa={multa}
                  valorLiquidar={valorLiquidar}
                  qtdTitulos={selectedIds.size}
                  onDescontoChange={setDesconto}
                  onJurosChange={setJuros}
                  onMultaChange={setMulta}
                />

                <div>
                  <label className="coliseu-label">Tipo de Lançamento / Destino</label>
                  <select
                    className="coliseu-input"
                    style={{ height: '38px', width: '100%' }}
                    value={tipoLancamento}
                    onChange={(e: any) => setTipoLancamento(e.target.value)}
                  >
                    <option value="UNICO">Liquidar todos os títulos selecionados em um único lançamento</option>
                    <option value="INDIVIDUAL">Liquidar cada título com lançamento financeiro individual</option>
                    <option value="PARCIAL">Liquidar parcialmente (Amortização de saldo)</option>
                  </select>
                </div>

                <PaymentSplitPanel
                  totalAPagar={valorLiquidar}
                  pagamentos={pagamentos}
                  onPagamentosChange={setPagamentos}
                  caixas={caixas}
                  contasBancarias={contas}
                  caixaSelecionado={caixaSelecionado}
                  contaSelecionada={contaSelecionada}
                  onCaixaChange={setCaixaSelecionado}
                  onContaChange={setContaSelecionada}
                />

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
                  <input
                    type="checkbox"
                    id="imprimirReciboModal"
                    checked={imprimirRecibo}
                    onChange={(e) => setImprimirRecibo(e.target.checked)}
                    style={{ cursor: 'pointer', accentColor: 'var(--action-primary)', width: '16px', height: '16px' }}
                  />
                  <label htmlFor="imprimirReciboModal" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}>
                    Imprimir Recibo de Quitação após confirmação
                  </label>
                </div>
              </div>

              {/* Coluna Direita: Grid Ampla de Títulos Selecionáveis */}
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '12px', backgroundColor: 'var(--surface-sunken)' }}>
                <TitulosSelecionaveisGrid
                  titulos={titulos}
                  selectedIds={selectedIds}
                  onSelectionChange={handleSelectionChange}
                />
              </div>
            </div>
          )}

          {activeTab === 'RENEGOCIAR' && (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <RenegociacaoSimulador
                titulosSelecionados={titulosSelecionados}
                onConfirmar={handleConfirmarRenegociacao}
                onCancelar={onClose}
              />
            </div>
          )}
        </div>

        {/* Impact Bar */}
        {activeTab === 'LIQUIDAR' && (
          <div
            style={{
              padding: '10px 20px',
              backgroundColor: 'var(--surface-sunken)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: '1px solid var(--border-subtle)',
              fontSize: '13px',
            }}
          >
            <div>
              Impacto de Crédito: Saldo Devido Atual <strong>{formatCurrency(totalCliente)}</strong> &rarr; Após Quitação:{' '}
              <strong style={{ color: 'var(--status-success)' }} className="tabular-nums">
                {formatCurrency(Math.max(0, totalCliente - subtotal))}
              </strong>
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
              Pressione <kbd style={{ padding: '2px 6px', backgroundColor: 'var(--surface-2)', borderRadius: '3px', border: '1px solid var(--border-subtle)' }}>F10</kbd> para Confirmar ou <kbd style={{ padding: '2px 6px', backgroundColor: 'var(--surface-2)', borderRadius: '3px', border: '1px solid var(--border-subtle)' }}>ESC</kbd> para Cancelar
            </div>
          </div>
        )}

        {/* Footer com Botões Padronizados */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            backgroundColor: 'var(--surface-2)',
          }}
        >
          <Button variant="ghost" onClick={onClose}>
            Cancelar (ESC)
          </Button>
          {activeTab === 'LIQUIDAR' && (
            <Button
              variant="success"
              onClick={handleConfirmarLiquidacao}
              disabled={selectedIds.size === 0}
            >
              <CheckCircle2 size={15} /> Confirmar Quitação ({selectedIds.size}) — [F10]
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
