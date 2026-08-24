import React, { useState, useMemo, useEffect } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { formatCurrency } from '../lib/formatters';
import {
  Boxes,
  Sprout,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  FileText,
  History,
  Calendar,
  CheckCircle2,
  X,
  Edit2,
  MapPin,
  TrendingDown,
  Layers,
  FlaskConical,
  Flame,
  ShieldAlert,
} from 'lucide-react';
import {
  LoteItem,
  SegmentoLote,
  getLotes,
} from '../lib/lotes';
import { ModalCadastroLote } from '../components/estoque/ModalCadastroLote';
import { ModalTermoConformidadeSementes } from '../components/estoque/ModalTermoConformidadeSementes';
import { ModalFispqLaudoQuimico } from '../components/estoque/ModalFispqLaudoQuimico';
import { ModalRastreabilidadeReversa } from '../components/estoque/ModalRastreabilidadeReversa';

export const LotesRastreabilidadePage: React.FC = () => {
  const [tabFiltro, setTabFiltro] = useState<'TODOS' | 'SEMENTES_GRAOS' | 'QUIMICOS' | 'A_VENCER'>('TODOS');
  const [busca, setBusca] = useState('');
  const [filtroPeneira, setFiltroPeneira] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modais
  const [isModalCadastroOpen, setIsModalCadastroOpen] = useState(false);
  const [isModalTermoOpen, setIsModalTermoOpen] = useState(false);
  const [isModalFispqOpen, setIsModalFispqOpen] = useState(false);
  const [isModalRastreioOpen, setIsModalRastreioOpen] = useState(false);

  const [loteSelecionado, setLoteSelecionado] = useState<LoteItem | null>(null);
  const [lotes, setLotes] = useState<LoteItem[]>(getLotes);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    const handleUpdate = () => {
      setLotes(getLotes());
    };
    window.addEventListener('coliseu_lotes_updated', handleUpdate);
    return () => window.removeEventListener('coliseu_lotes_updated', handleUpdate);
  }, []);

  // Filtragem
  const lotesFiltrados = useMemo(() => {
    return lotes.filter((lote) => {
      if (tabFiltro === 'SEMENTES_GRAOS' && lote.segmento !== 'SEMENTES_GRAOS') return false;
      if (tabFiltro === 'QUIMICOS' && lote.segmento !== 'QUIMICO_TINTAS' && lote.segmento !== 'DEFENSIVO_AGRICOLA') return false;
      if (tabFiltro === 'A_VENCER' && lote.diasParaVencer > 60) return false;

      if (filtroPeneira && lote.dadosSementes && !lote.dadosSementes.peneira.toUpperCase().includes(filtroPeneira.toUpperCase())) {
        return false;
      }

      if (busca) {
        const q = busca.toLowerCase();
        const mNum = lote.numeroLote.toLowerCase().includes(q);
        const mProd = lote.produtoDescricao.toLowerCase().includes(q);
        const mRenasem = lote.dadosSementes?.renasemProdutor.toLowerCase().includes(q);
        const mCult = lote.dadosSementes?.especieCultivar.toLowerCase().includes(q);
        const mPeneira = lote.dadosSementes?.peneira.toLowerCase().includes(q);
        const mOnu = lote.dadosQuimicos?.numeroOnu.includes(q);
        const mAtivo = lote.dadosQuimicos?.principioAtivo?.toLowerCase().includes(q);
        if (!mNum && !mProd && !mRenasem && !mCult && !mPeneira && !mOnu && !mAtivo) return false;
      }

      return true;
    });
  }, [lotes, tabFiltro, filtroPeneira, busca]);

  // Estatísticas
  const stats = useMemo(() => {
    const totalLotes = lotes.length;
    const lotesSementes = lotes.filter((l) => l.segmento === 'SEMENTES_GRAOS').length;
    const lotesQuimicos = lotes.filter((l) => l.segmento === 'QUIMICO_TINTAS' || l.segmento === 'DEFENSIVO_AGRICOLA').length;
    const lotesAVencer = lotes.filter((l) => l.diasParaVencer <= 60).length;
    const valorTotalEstoque = lotes.reduce((acc, l) => acc + l.quantidadeAtual * l.precoVendaUnitario, 0);

    return {
      totalLotes,
      lotesSementes,
      lotesQuimicos,
      lotesAVencer,
      valorTotalEstoque,
    };
  }, [lotes]);

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
        title="Controle de Lotes, Sementes (RENASEM), Químicos (ANTT/PF) & Rastreabilidade"
        description="Gestão de lotes com controle de peneiras, germinação MAPA, químicos controlados PF/Exército, transporte perigoso ANTT, FISPQ e FEFO."
        breadcrumbItems={[
          { label: 'Estoque', active: false },
          { label: 'Lotes, Sementes & Químicos', active: true },
        ]}
        primaryAction={{
          label: 'Novo Lote / Entrada',
          onClick: () => {
            setLoteSelecionado(null);
            setIsModalCadastroOpen(true);
          },
          icon: <Plus size={15} aria-hidden="true" />,
        }}
      />

      {/* Métricas */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '14px',
          marginBottom: '16px',
        }}
      >
        <div className="coliseu-card" style={{ padding: '14px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Lotes Ativos no Armazém</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: '4px 0' }}>
            {stats.totalLotes} lotes
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>WMS e depósitos</div>
        </div>

        <div className="coliseu-card" style={{ padding: '14px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Sementes Certificadas (MAPA)</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#10b981', margin: '4px 0' }}>
            {stats.lotesSementes} lotes
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Soja, Milho, Braquiária</div>
        </div>

        <div className="coliseu-card" style={{ padding: '14px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Químicos & Defensivos (ANTT/PF)</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#f97316', margin: '4px 0' }}>
            {stats.lotesQuimicos} controlados
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Solventes, Tintas, Herbicidas</div>
        </div>

        <div className="coliseu-card" style={{ padding: '14px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Alertas de Validade (FEFO)</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: stats.lotesAVencer > 0 ? '#ef4444' : '#10b981', margin: '4px 0' }}>
            {stats.lotesAVencer} a vencer (&lt; 60 dias)
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Prioridade máxima de expedição</div>
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
            { key: 'TODOS', label: 'Todos os Lotes' },
            { key: 'SEMENTES_GRAOS', label: '🌱 Sementes & Grãos (RENASEM)' },
            { key: 'QUIMICOS', label: '🧪 Químicos & Defensivos (ANTT/PF)' },
            { key: 'A_VENCER', label: '🚨 Próximos do Vencimento' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setTabFiltro(tab.key as any)}
              style={{
                border: 'none',
                background: tabFiltro === tab.key ? 'var(--surface-1)' : 'transparent',
                color: tabFiltro === tab.key ? '#3b82f6' : 'var(--text-muted)',
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

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {tabFiltro === 'SEMENTES_GRAOS' && (
            <select
              value={filtroPeneira}
              onChange={(e) => setFiltroPeneira(e.target.value)}
              className="coliseu-input"
              style={{ height: '34px', fontSize: '11px', minWidth: '150px' }}
            >
              <option value="">Todas as Peneiras</option>
              <option value="6.0">Peneira 6.0mm</option>
              <option value="6.5">Peneira 6.5mm</option>
              <option value="5.5">Peneira 5.5mm</option>
              <option value="Chata">Peneira Chata (C2M)</option>
            </select>
          )}

          <div style={{ width: '320px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por lote, cultivar, ONU, princípio ativo..."
                className="coliseu-input"
                style={{ paddingLeft: '30px', height: '34px', fontSize: '11px' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabela de Lotes */}
      <div className="coliseu-card">
        <div className="coliseu-table-container">
          <table className="coliseu-table" style={{ fontSize: '12px' }}>
            <thead>
              <tr>
                <th style={{ width: '130px' }}>Nº do Lote</th>
                <th>Produto & Classificação / Especificação</th>
                <th style={{ width: '140px' }}>Peneira / ONU (ANTT)</th>
                <th style={{ width: '110px', textAlign: 'center' }}>Qualidade / CQ</th>
                <th style={{ width: '110px', textAlign: 'right' }}>Saldo Estoque</th>
                <th style={{ width: '100px', textAlign: 'center' }}>Validade</th>
                <th style={{ width: '110px', textAlign: 'center' }}>Status</th>
                <th style={{ width: '220px', textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {lotesFiltrados.map((lote) => {
                const isSemente = lote.segmento === 'SEMENTES_GRAOS';
                const isQuimico = lote.segmento === 'QUIMICO_TINTAS' || lote.segmento === 'DEFENSIVO_AGRICOLA';
                const isCritico = lote.diasParaVencer <= 60;

                return (
                  <tr key={lote.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text-link)', fontSize: '11px' }}>
                        {lote.numeroLote}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        {isSemente ? '🌱 Semente' : isQuimico ? '🧪 Químico' : '📦 Geral'}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {lote.produtoDescricao}
                      </div>
                      {lote.dadosSementes && (
                        <div style={{ fontSize: '10px', color: '#10b981' }}>
                          RENASEM: {lote.dadosSementes.renasemProdutor} • Cat: {lote.dadosSementes.categoria} • Safra: {lote.dadosSementes.safra}
                        </div>
                      )}
                      {lote.dadosQuimicos && (
                        <div style={{ fontSize: '10px', color: '#f97316', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <span>Ativo: {lote.dadosQuimicos.principioAtivo || lote.dadosQuimicos.nomeApropriadoEmbarque}</span>
                          {lote.dadosQuimicos.controladoPoliciaFederal && (
                            <span style={{ color: '#ef4444', fontWeight: 700 }}>🚨 POLÍCIA FEDERAL</span>
                          )}
                          {lote.dadosQuimicos.controladoExercito && (
                            <span style={{ color: '#d97706', fontWeight: 700 }}>🛡️ EXÉRCITO</span>
                          )}
                          {lote.dadosQuimicos.receituarioAgronomicoObrigatorio && (
                            <span style={{ color: '#10b981', fontWeight: 700 }}>🌾 RECEITUÁRIO</span>
                          )}
                        </div>
                      )}
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        📍 {lote.localizacaoWms}
                      </div>
                    </td>
                    <td>
                      {lote.dadosSementes?.peneira ? (
                        <span style={{ fontWeight: 700, color: '#d97706', fontSize: '11px' }}>
                          {lote.dadosSementes.peneira}
                        </span>
                      ) : lote.dadosQuimicos?.numeroOnu ? (
                        <div>
                          <span style={{ fontWeight: 700, color: '#ea580c', fontSize: '11px', backgroundColor: '#fff7ed', padding: '1px 4px', borderRadius: '3px', border: '1px solid #f97316' }}>
                            ONU {lote.dadosQuimicos.numeroOnu}
                          </span>
                          <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Classe {lote.dadosQuimicos.classeRisco.split('-')[0]}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>-</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {lote.dadosSementes?.germinacaoPercent ? (
                        <div>
                          <strong style={{ color: '#10b981', fontSize: '12px' }}>
                            {lote.dadosSementes.germinacaoPercent}%
                          </strong>
                          <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                            Pur: {lote.dadosSementes.purezaPercent}%
                          </div>
                        </div>
                      ) : lote.dadosQuimicos?.densidadeGcm3 ? (
                        <div>
                          <strong style={{ color: '#3b82f6', fontSize: '11px' }}>
                            {lote.dadosQuimicos.densidadeGcm3} g/cm³
                          </strong>
                          <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                            pH: {lote.dadosQuimicos.ph || '7.0'}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>-</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>
                      {lote.quantidadeAtual} {lote.unidadeMedida}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: 600, color: isCritico ? '#ef4444' : 'var(--text-primary)' }}>
                        {lote.dataValidade}
                      </div>
                      <div style={{ fontSize: '10px', color: isCritico ? '#ef4444' : '#10b981' }}>
                        {lote.diasParaVencer} dias
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor:
                            lote.status === 'LIBERADO'
                              ? 'rgba(16, 185, 129, 0.15)'
                              : lote.status === 'QUARENTENA'
                              ? 'rgba(234, 179, 8, 0.15)'
                              : 'rgba(239, 68, 68, 0.15)',
                          color:
                            lote.status === 'LIBERADO'
                              ? '#10b981'
                              : lote.status === 'QUARENTENA'
                              ? '#eab308'
                              : '#ef4444',
                        }}
                      >
                        {lote.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                        {/* Botão Atestado MAPA (se sementes) */}
                        {isSemente && (
                          <button
                            type="button"
                            onClick={() => {
                              setLoteSelecionado(lote);
                              setIsModalTermoOpen(true);
                            }}
                            className="coliseu-btn coliseu-btn-secondary"
                            style={{ padding: '0 6px', height: '28px', fontSize: '11px', color: '#10b981' }}
                            title="Imprimir Termo de Conformidade / Atestado MAPA"
                          >
                            <FileText size={12} /> Atestado
                          </button>
                        )}

                        {/* Botão FISPQ / Laudo Químico (se químicos) */}
                        {isQuimico && (
                          <button
                            type="button"
                            onClick={() => {
                              setLoteSelecionado(lote);
                              setIsModalFispqOpen(true);
                            }}
                            className="coliseu-btn coliseu-btn-secondary"
                            style={{ padding: '0 6px', height: '28px', fontSize: '11px', color: '#f97316' }}
                            title="Imprimir FISPQ / FDS e Laudo de Análise Química ANTT"
                          >
                            <FlaskConical size={12} /> FISPQ
                          </button>
                        )}

                        {/* Botão Rastreabilidade Reversa */}
                        <button
                          type="button"
                          onClick={() => {
                            setLoteSelecionado(lote);
                            setIsModalRastreioOpen(true);
                          }}
                          className="coliseu-btn coliseu-btn-secondary"
                          style={{ padding: '0 6px', height: '28px', fontSize: '11px', color: '#3b82f6' }}
                          title="Visualizar Cadeia de Custódia e Rastreabilidade 360°"
                        >
                          <History size={12} /> Rastreio
                        </button>

                        {/* Botão Editar */}
                        <button
                          type="button"
                          onClick={() => {
                            setLoteSelecionado(lote);
                            setIsModalCadastroOpen(true);
                          }}
                          className="coliseu-btn coliseu-btn-secondary"
                          style={{ padding: '0 6px', height: '28px', fontSize: '11px' }}
                          title="Editar Lote"
                        >
                          <Edit2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {lotesFiltrados.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    Nenhum lote encontrado para os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Cadastro/Edição de Lote */}
      {isModalCadastroOpen && (
        <ModalCadastroLote
          isOpen={isModalCadastroOpen}
          onClose={() => setIsModalCadastroOpen(false)}
          loteEdicao={loteSelecionado}
          onSaveSuccess={(lote) => {
            showToast(`✅ Lote '${lote.numeroLote}' salvo com sucesso!`);
          }}
        />
      )}

      {/* Modal Termo de Conformidade de Sementes */}
      {isModalTermoOpen && (
        <ModalTermoConformidadeSementes
          isOpen={isModalTermoOpen}
          onClose={() => setIsModalTermoOpen(false)}
          lote={loteSelecionado}
        />
      )}

      {/* Modal FISPQ / Laudo Químico */}
      {isModalFispqOpen && (
        <ModalFispqLaudoQuimico
          isOpen={isModalFispqOpen}
          onClose={() => setIsModalFispqOpen(false)}
          lote={loteSelecionado}
        />
      )}

      {/* Modal Rastreabilidade Reversa */}
      {isModalRastreioOpen && (
        <ModalRastreabilidadeReversa
          isOpen={isModalRastreioOpen}
          onClose={() => setIsModalRastreioOpen(false)}
          lote={loteSelecionado}
        />
      )}
    </div>
  );
};
