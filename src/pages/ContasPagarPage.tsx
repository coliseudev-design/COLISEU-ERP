import React, { useState, useMemo, useEffect } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { formatCurrency, formatDate } from '../lib/formatters';
import {
  DollarSign,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Calendar,
  Layers,
  FileSpreadsheet,
  X,
  CreditCard,
  Building,
  ShieldCheck,
} from 'lucide-react';
import {
  TituloPagarItem,
  getTitulosPagar,
} from '../lib/fornecedores';
import { ModalNovoTituloPagar } from '../components/financeiro/ModalNovoTituloPagar';
import { ModalLiquidacaoPagar } from '../components/financeiro/ModalLiquidacaoPagar';
import { ModalRelatorioRetencoes } from '../components/financeiro/ModalRelatorioRetencoes';

export const ContasPagarPage: React.FC = () => {
  const [tabStatus, setTabStatus] = useState<'TODOS' | 'EM_ABERTO' | 'VENCIDOS' | 'PAGOS' | 'RETENCOES'>('TODOS');
  const [busca, setBusca] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modais
  const [isModalNovoOpen, setIsModalNovoOpen] = useState(false);
  const [isModalBaixaOpen, setIsModalBaixaOpen] = useState(false);
  const [isModalRetencoesOpen, setIsModalRetencoesOpen] = useState(false);
  const [tituloSelecionado, setTituloSelecionado] = useState<TituloPagarItem | null>(null);

  const [titulos, setTitulos] = useState<TituloPagarItem[]>(getTitulosPagar);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    const handleUpdate = () => {
      setTitulos(getTitulosPagar());
    };
    window.addEventListener('coliseu_titulos_pagar_updated', handleUpdate);
    return () => window.removeEventListener('coliseu_titulos_pagar_updated', handleUpdate);
  }, []);

  // Filtragem
  const titulosFiltrados = useMemo(() => {
    return titulos.filter((t) => {
      if (tabStatus === 'EM_ABERTO' && t.status !== 'EM_ABERTO') return false;
      if (tabStatus === 'VENCIDOS' && t.status !== 'VENCIDO') return false;
      if (tabStatus === 'PAGOS' && t.status !== 'PAGO') return false;
      if (tabStatus === 'RETENCOES' && t.retencoes.valorTotalRetencoes <= 0) return false;

      if (busca) {
        const q = busca.toLowerCase();
        const mNum = t.numeroDocumento.toLowerCase().includes(q);
        const mForn = t.fornecedorNome.toLowerCase().includes(q);
        const mCnpj = t.fornecedorCnpj.toLowerCase().includes(q);
        if (!mNum && !mForn && !mCnpj) return false;
      }

      return true;
    });
  }, [titulos, tabStatus, busca]);

  // Estatísticas
  const stats = useMemo(() => {
    const totalAberto = titulos
      .filter((t) => t.status === 'EM_ABERTO')
      .reduce((acc, t) => acc + t.valorFinalPagar, 0);

    const totalVencido = titulos
      .filter((t) => t.status === 'VENCIDO')
      .reduce((acc, t) => acc + t.valorFinalPagar, 0);

    const totalPago = titulos
      .filter((t) => t.status === 'PAGO')
      .reduce((acc, t) => acc + t.valorFinalPagar, 0);

    const totalRetencoes = titulos
      .filter((t) => t.status === 'EM_ABERTO' || t.status === 'PAGO')
      .reduce((acc, t) => acc + t.retencoes.valorTotalRetencoes, 0);

    return {
      totalAberto,
      totalVencido,
      totalPago,
      totalRetencoes,
    };
  }, [titulos]);

  return (
    <div className="coliseu-page" style={{ minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {toastMessage && (
        <div className="coliseu-toast-container">
          <div className="coliseu-toast coliseu-toast--success">
            <CheckCircle2 size={18} color="#10b981" />
            <span style={{ fontSize: '12px', fontWeight: 600 }}>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Header com Ações */}
      <PageHeader
        title="Gestão de Contas a Pagar & Retenções Tributárias"
        description="Controle de compromissos com fornecedores, cálculo automático de retenções na fonte (IRRF, CSRF, ISSQN, INSS) e liquidação bancária."
        breadcrumbItems={[
          { label: 'Financeiro', active: false },
          { label: 'Contas a Pagar', active: true },
        ]}
      >
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            variant="secondary"
            onClick={() => setIsModalRetencoesOpen(true)}
            style={{ display: 'inline-flex', gap: '6px', fontSize: '12px' }}
          >
            <FileSpreadsheet size={15} /> Extrato de Retenções (DARF)
          </Button>

          <Button
            variant="primary"
            onClick={() => setIsModalNovoOpen(true)}
            style={{ display: 'inline-flex', gap: '6px', fontSize: '12px' }}
          >
            <Plus size={15} /> Novo Título a Pagar
          </Button>
        </div>
      </PageHeader>

      {/* Cards de Métricas Financeiras */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '14px',
          marginBottom: '16px',
        }}
      >
        <div className="coliseu-card" style={{ padding: '14px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Total em Aberto a Pagar</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#ef4444', fontFamily: 'monospace', margin: '4px 0' }}>
            {formatCurrency(stats.totalAberto)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Compromissos futuros</div>
        </div>

        <div className="coliseu-card" style={{ padding: '14px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Total Vencido em Atraso</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: stats.totalVencido > 0 ? '#ef4444' : '#10b981', fontFamily: 'monospace', margin: '4px 0' }}>
            {formatCurrency(stats.totalVencido)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Atrasos / Negociação</div>
        </div>

        <div className="coliseu-card" style={{ padding: '14px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Total Pago / Liquidado</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#10b981', fontFamily: 'monospace', margin: '4px 0' }}>
            {formatCurrency(stats.totalPago)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Saídas de caixa efetuadas</div>
        </div>

        <div className="coliseu-card" style={{ padding: '14px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Retenções Tributárias (WHT)</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#3b82f6', fontFamily: 'monospace', margin: '4px 0' }}>
            {formatCurrency(stats.totalRetencoes)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>IRRF, CSRF, ISSQN a recolher</div>
        </div>
      </div>

      {/* Abas e Busca */}
      <div
        className="coliseu-card"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', backgroundColor: 'var(--surface-3)', borderRadius: '6px', padding: '2px', gap: '2px' }}>
          {[
            { key: 'TODOS', label: 'Todos os Títulos' },
            { key: 'EM_ABERTO', label: 'Em Aberto (A Pagar)' },
            { key: 'PAGOS', label: 'Pagos / Quitados' },
            { key: 'RETENCOES', label: 'Com Retenção Tributária' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setTabStatus(tab.key as any)}
              style={{
                border: 'none',
                background: tabStatus === tab.key ? 'var(--surface-1)' : 'transparent',
                color: tabStatus === tab.key ? '#3b82f6' : 'var(--text-muted)',
                fontSize: '11px',
                fontWeight: 700,
                padding: '6px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ width: '320px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por documento, fornecedor ou CNPJ..."
              className="coliseu-input"
              style={{ paddingLeft: '30px', height: '34px', fontSize: '11px' }}
            />
          </div>
        </div>
      </div>

      {/* Tabela de Contas a Pagar */}
      <div className="coliseu-card">
        <div className="coliseu-table-container">
          <table className="coliseu-table" style={{ fontSize: '12px' }}>
            <thead>
              <tr>
                <th style={{ width: '110px' }}>Documento</th>
                <th>Fornecedor / Favorecido</th>
                <th style={{ width: '100px' }}>Vencimento</th>
                <th style={{ width: '110px', textAlign: 'right' }}>Valor Bruto</th>
                <th style={{ width: '120px', textAlign: 'right' }}>Retenções na Fonte</th>
                <th style={{ width: '120px', textAlign: 'right' }}>Líquido a Pagar</th>
                <th style={{ width: '100px', textAlign: 'center' }}>Status</th>
                <th style={{ width: '120px', textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {titulosFiltrados.map((t) => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 700, color: 'var(--text-link)', fontSize: '11px' }}>
                    {t.numeroDocumento}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {t.fornecedorNome}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      CNPJ: {t.fornecedorCnpj} • {t.categoriaDespesa}
                    </div>
                  </td>
                  <td style={{ fontWeight: 600 }}>
                    <div className="tabular-nums">{formatDate(t.dataVencimento)}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }} className="tabular-nums">Emissão: {formatDate(t.dataEmissao)}</div>
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                    {formatCurrency(t.valorBruto)}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                    {t.retencoes.valorTotalRetencoes > 0 ? (
                      <div>
                        <span style={{ color: '#ef4444', fontWeight: 700 }}>
                          - {formatCurrency(t.retencoes.valorTotalRetencoes)}
                        </span>
                        <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                          {t.retencoes.reterIrrf ? 'IRRF ' : ''}
                          {t.retencoes.reterCsrf ? 'CSRF ' : ''}
                          {t.retencoes.reterIssqn ? 'ISSQN' : ''}
                        </div>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>-</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: '#10b981', fontFamily: 'monospace' }}>
                    {formatCurrency(t.valorFinalPagar)}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        backgroundColor:
                          t.status === 'PAGO'
                            ? 'rgba(16, 185, 129, 0.15)'
                            : t.status === 'VENCIDO'
                            ? 'rgba(239, 68, 68, 0.15)'
                            : 'rgba(234, 179, 8, 0.15)',
                        color:
                          t.status === 'PAGO'
                            ? '#10b981'
                            : t.status === 'VENCIDO'
                            ? '#ef4444'
                            : '#eab308',
                      }}
                    >
                      {t.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {t.status === 'EM_ABERTO' ? (
                      <button
                        type="button"
                        onClick={() => {
                          setTituloSelecionado(t);
                          setIsModalBaixaOpen(true);
                        }}
                        className="coliseu-btn coliseu-btn-primary"
                        style={{ padding: '0 8px', height: '26px', fontSize: '11px', backgroundColor: '#10b981', borderColor: '#10b981' }}
                      >
                        <CreditCard size={12} /> Pagar (Baixa)
                      </button>
                    ) : (
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>
                        Quitado em {t.dataPagamento}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {titulosFiltrados.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    Nenhum título a pagar encontrado para os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Novo Título */}
      {isModalNovoOpen && (
        <ModalNovoTituloPagar
          isOpen={isModalNovoOpen}
          onClose={() => setIsModalNovoOpen(false)}
          onSuccess={(titulo) => {
            showToast(`✅ Título '${titulo.numeroDocumento}' lançado com sucesso!`);
          }}
        />
      )}

      {/* Modal Baixa/Liquidação */}
      {isModalBaixaOpen && (
        <ModalLiquidacaoPagar
          isOpen={isModalBaixaOpen}
          onClose={() => setIsModalBaixaOpen(false)}
          titulo={tituloSelecionado}
          onSuccess={(titulo) => {
            showToast(`✅ Título '${titulo.numeroDocumento}' liquidado com sucesso!`);
          }}
        />
      )}

      {/* Modal Extrato de Retenções */}
      {isModalRetencoesOpen && (
        <ModalRelatorioRetencoes
          isOpen={isModalRetencoesOpen}
          onClose={() => setIsModalRetencoesOpen(false)}
        />
      )}
    </div>
  );
};
