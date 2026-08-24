import React, { useState, useMemo, useEffect } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { formatCurrency } from '../lib/formatters';
import {
  Award,
  Target,
  Plus,
  Settings,
  Search,
  CheckCircle2,
  TrendingUp,
  DollarSign,
  Users,
  Printer,
  Edit2,
  Trophy,
  Zap,
  Sparkles,
} from 'lucide-react';
import {
  VendedorItem,
  getVendedores,
  getPoliticaComissao,
} from '../lib/comissoes';
import { ModalConfigRegrasComissao } from '../components/comercial/ModalConfigRegrasComissao';
import { ModalFichaVendedorMeta } from '../components/comercial/ModalFichaVendedorMeta';
import { ModalExtratoComissaoVendedor } from '../components/comercial/ModalExtratoComissaoVendedor';
import { ModalPagarComissao } from '../components/comercial/ModalPagarComissao';

export const ComissoesMetasPage: React.FC = () => {
  const [busca, setBusca] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modais
  const [isModalConfigOpen, setIsModalConfigOpen] = useState(false);
  const [isModalFichaOpen, setIsModalFichaOpen] = useState(false);
  const [isModalExtratoOpen, setIsModalExtratoOpen] = useState(false);
  const [isModalPagarOpen, setIsModalPagarOpen] = useState(false);

  const [vendedorSelecionado, setVendedorSelecionado] = useState<VendedorItem | null>(null);
  const [vendedores, setVendedores] = useState<VendedorItem[]>(getVendedores);
  const [politica, setPolitica] = useState(getPoliticaComissao);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    const handleUpdate = () => {
      setVendedores(getVendedores());
      setPolitica(getPoliticaComissao());
    };
    window.addEventListener('coliseu_vendedores_updated', handleUpdate);
    window.addEventListener('coliseu_comissao_politica_updated', handleUpdate);
    return () => {
      window.removeEventListener('coliseu_vendedores_updated', handleUpdate);
      window.removeEventListener('coliseu_comissao_politica_updated', handleUpdate);
    };
  }, []);

  // Ranking ordenado por faturamento
  const rankingVendedores = useMemo(() => {
    return [...vendedores].sort((a, b) => b.totalVendidoMes - a.totalVendidoMes);
  }, [vendedores]);

  // Vendedores filtrados pela busca
  const vendedoresFiltrados = useMemo(() => {
    return vendedores.filter((v) => {
      if (busca) {
        const q = busca.toLowerCase();
        const mNome = v.nome.toLowerCase().includes(q);
        const mCargo = v.cargo.toLowerCase().includes(q);
        if (!mNome && !mCargo) return false;
      }
      return true;
    });
  }, [vendedores, busca]);

  // Métricas Globais
  const stats = useMemo(() => {
    const metaGlobal = vendedores.reduce((acc, v) => acc + v.metaFaturamentoMensal, 0);
    const realizadoGlobal = vendedores.reduce((acc, v) => acc + v.totalVendidoMes, 0);
    const atingimentoGlobal = metaGlobal > 0 ? Math.round((realizadoGlobal / metaGlobal) * 1000) / 10 : 0;
    const margemMediaGlobal = vendedores.length > 0
      ? Math.round((vendedores.reduce((acc, v) => acc + v.margemMediaObtida, 0) / vendedores.length) * 10) / 10
      : 0;
    const comissaoTotal = vendedores.reduce((acc, v) => acc + v.totalComissaoGerada, 0);
    const comissaoPendente = vendedores.reduce((acc, v) => acc + v.totalComissaoPendente, 0);

    return {
      metaGlobal,
      realizadoGlobal,
      atingimentoGlobal,
      margemMediaGlobal,
      comissaoTotal,
      comissaoPendente,
    };
  }, [vendedores]);

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

      {/* Header */}
      <PageHeader
        title="Motor de Comissões, Metas Comerciais & Gamification"
        description="Remuneração variável por margem de lucro real, tabela progressiva com aceleradores, ranking de vendas e fechamento."
        breadcrumbItems={[
          { label: 'Comercial', active: false },
          { label: 'Comissões & Metas', active: true },
        ]}
      >
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            variant="secondary"
            onClick={() => setIsModalConfigOpen(true)}
            style={{ display: 'inline-flex', gap: '6px', fontSize: '12px' }}
          >
            <Settings size={15} /> Regras de Comissão
          </Button>

          <Button
            variant="primary"
            onClick={() => {
              setVendedorSelecionado(null);
              setIsModalFichaOpen(true);
            }}
            style={{ display: 'inline-flex', gap: '6px', fontSize: '12px' }}
          >
            <Plus size={15} /> Novo Vendedor / Meta
          </Button>
        </div>
      </PageHeader>

      {/* Cockpit de Gamification & Pódio da Equipe */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 2fr',
          gap: '14px',
          marginBottom: '16px',
        }}
      >
        {/* Termômetro Geral da Meta da Empresa */}
        <div className="coliseu-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Target size={16} color="#3b82f6" /> Meta Global da Empresa (Agosto/2026)
              </span>
              <span style={{ fontSize: '16px', fontWeight: 800, color: stats.atingimentoGlobal >= 100 ? '#10b981' : '#3b82f6' }}>
                {stats.atingimentoGlobal}%
              </span>
            </div>

            <div style={{ margin: '12px 0' }}>
              <div style={{ height: '10px', backgroundColor: 'var(--surface-3)', borderRadius: '5px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${Math.min(100, stats.atingimentoGlobal)}%`,
                    backgroundColor: stats.atingimentoGlobal >= 100 ? '#10b981' : '#3b82f6',
                    borderRadius: '5px',
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
              <span>Realizado: <strong style={{ color: 'var(--text-primary)' }}>{formatCurrency(stats.realizadoGlobal)}</strong></span>
              <span>Alvo: <strong>{formatCurrency(stats.metaGlobal)}</strong></span>
            </div>
          </div>

          <div style={{ marginTop: '12px', padding: '8px 12px', backgroundColor: 'var(--surface-2)', borderRadius: '6px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Política Vigente:</span>
            <strong style={{ color: '#3b82f6' }}>
              {politica.tipoCalculoPrincipal === 'MARGEM_LUCRO' ? '📈 Margem de Lucro Real' : '🎯 Escalonado por Meta'}
            </strong>
          </div>
        </div>

        {/* Pódio Comercial 🥇🥈🥉 */}
        <div className="coliseu-card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
            <Trophy size={16} color="#eab308" /> Ranking de Vendas da Equipe (Pódio Comercial)
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            {rankingVendedores.slice(0, 3).map((v, index) => {
              const medal = index === 0 ? '🥇 1º Lugar' : index === 1 ? '🥈 2º Lugar' : '🥉 3º Lugar';
              const borderCol = index === 0 ? '#eab308' : index === 1 ? '#94a3b8' : '#cd7f32';

              return (
                <div
                  key={v.id}
                  style={{
                    backgroundColor: 'var(--surface-2)',
                    padding: '10px',
                    borderRadius: '8px',
                    border: `1px solid ${borderCol}`,
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: borderCol }}>{medal}</div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                      {v.nome}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{v.cargo.replace('_', ' ')}</div>
                  </div>

                  <div style={{ marginTop: '8px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#10b981', fontFamily: 'monospace' }}>
                      {formatCurrency(v.totalVendidoMes)}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      {v.percentualAtingimentoMeta}% da Meta • Margem {v.margemMediaObtida}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '14px',
          marginBottom: '16px',
        }}
      >
        <div className="coliseu-card" style={{ padding: '14px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Total Faturado pela Equipe</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace', margin: '4px 0' }}>
            {formatCurrency(stats.realizadoGlobal)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Vendas realizadas no mês</div>
        </div>

        <div className="coliseu-card" style={{ padding: '14px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Margem Média da Empresa</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#3b82f6', margin: '4px 0' }}>
            {stats.margemMediaGlobal}%
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Rentabilidade ponderada</div>
        </div>

        <div className="coliseu-card" style={{ padding: '14px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Total Comissões Geradas</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#10b981', fontFamily: 'monospace', margin: '4px 0' }}>
            {formatCurrency(stats.comissaoTotal)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Remuneração variável apurada</div>
        </div>

        <div className="coliseu-card" style={{ padding: '14px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Saldo Pendente a Pagar</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#ef4444', fontFamily: 'monospace', margin: '4px 0' }}>
            {formatCurrency(stats.comissaoPendente)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Comissões prontas para PIX</div>
        </div>
      </div>

      {/* Tabela de Vendedores & Performance */}
      <div className="coliseu-card">
        <div className="coliseu-table-container">
          <table className="coliseu-table" style={{ fontSize: '12px' }}>
            <thead>
              <tr>
                <th style={{ width: '60px' }}>Rank</th>
                <th>Vendedor & Função</th>
                <th style={{ width: '110px', textAlign: 'right' }}>Meta Mensal</th>
                <th style={{ width: '120px', textAlign: 'right' }}>Realizado</th>
                <th style={{ width: '90px', textAlign: 'center' }}>% Atingido</th>
                <th style={{ width: '90px', textAlign: 'center' }}>Margem %</th>
                <th style={{ width: '120px', textAlign: 'right' }}>Comissão Total</th>
                <th style={{ width: '120px', textAlign: 'right' }}>Pendente PIX</th>
                <th style={{ width: '180px', textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {vendedoresFiltrados.map((v, idx) => (
                <tr key={v.id}>
                  <td style={{ textAlign: 'center', fontWeight: 700 }}>
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}º`}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{v.nome}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      {v.cargo.replace('_', ' ')} • {v.qtdVendasRealizadas} vendas
                    </div>
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                    {formatCurrency(v.metaFaturamentoMensal)}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>
                    {formatCurrency(v.totalVendidoMes)}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: '11px',
                        color: v.percentualAtingimentoMeta >= 100 ? '#10b981' : '#d97706',
                      }}
                    >
                      {v.percentualAtingimentoMeta}%
                    </span>
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 600, color: '#3b82f6' }}>
                    {v.margemMediaObtida}%
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: '#10b981', fontFamily: 'monospace' }}>
                    {formatCurrency(v.totalComissaoGerada)}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: v.totalComissaoPendente > 0 ? '#ef4444' : '#10b981', fontFamily: 'monospace' }}>
                    {formatCurrency(v.totalComissaoPendente)}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                      {/* Extrato */}
                      <button
                        type="button"
                        onClick={() => {
                          setVendedorSelecionado(v);
                          setIsModalExtratoOpen(true);
                        }}
                        className="coliseu-btn coliseu-btn-secondary"
                        style={{ padding: '0 6px', height: '26px', fontSize: '11px' }}
                        title="Ver Extrato de Comissões"
                      >
                        <Printer size={12} /> Extrato
                      </button>

                      {/* Pagar PIX */}
                      {v.totalComissaoPendente > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setVendedorSelecionado(v);
                            setIsModalPagarOpen(true);
                          }}
                          className="coliseu-btn coliseu-btn-primary"
                          style={{ padding: '0 6px', height: '26px', fontSize: '11px', backgroundColor: '#10b981', borderColor: '#10b981' }}
                          title="Pagar Comissão Pendente"
                        >
                          <DollarSign size={12} /> Pagar
                        </button>
                      )}

                      {/* Editar */}
                      <button
                        type="button"
                        onClick={() => {
                          setVendedorSelecionado(v);
                          setIsModalFichaOpen(true);
                        }}
                        className="coliseu-btn coliseu-btn-secondary"
                        style={{ padding: '0 6px', height: '26px', fontSize: '11px' }}
                        title="Editar Metas"
                      >
                        <Edit2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Configuração de Regras */}
      {isModalConfigOpen && (
        <ModalConfigRegrasComissao
          isOpen={isModalConfigOpen}
          onClose={() => setIsModalConfigOpen(false)}
          onSuccess={() => {
            showToast('✅ Regras de comissão atualizadas com sucesso!');
          }}
        />
      )}

      {/* Modal Ficha do Vendedor */}
      {isModalFichaOpen && (
        <ModalFichaVendedorMeta
          isOpen={isModalFichaOpen}
          onClose={() => setIsModalFichaOpen(false)}
          vendedorEdicao={vendedorSelecionado}
          onSuccess={(v) => {
            showToast(`✅ Vendedor '${v.nome}' salvo com sucesso!`);
          }}
        />
      )}

      {/* Modal Extrato Analítico */}
      {isModalExtratoOpen && (
        <ModalExtratoComissaoVendedor
          isOpen={isModalExtratoOpen}
          onClose={() => setIsModalExtratoOpen(false)}
          vendedor={vendedorSelecionado}
        />
      )}

      {/* Modal Pagamento de Comissão */}
      {isModalPagarOpen && (
        <ModalPagarComissao
          isOpen={isModalPagarOpen}
          onClose={() => setIsModalPagarOpen(false)}
          vendedor={vendedorSelecionado}
          onSuccess={(v) => {
            showToast(`✅ Comissão do vendedor '${v.nome}' paga com sucesso via PIX!`);
          }}
        />
      )}
    </div>
  );
};
