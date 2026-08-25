import React, { useState, useMemo, useEffect } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { formatCurrency, formatDate } from '../lib/formatters';
import {
  Wrench,
  Plus,
  Search,
  Filter,
  Kanban,
  List,
  Printer,
  Edit2,
  CheckCircle2,
  Clock,
  Car,
  DollarSign,
  User,
  Phone,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  FileText,
  X,
  Share2,
} from 'lucide-react';
import {
  OrdemServicoItem,
  StatusOS,
  getOrdensServico,
  salvarOrdemServico,
} from '../lib/ordensServico';
import { ModalFichaOrdemServico } from '../components/servicos/ModalFichaOrdemServico';
import { ModalImpressaoOS } from '../components/servicos/ModalImpressaoOS';
import { syncService } from '../lib/syncService';

export const OrdensServicoPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<'KANBAN' | 'LISTA'>('KANBAN');
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('TODOS');
  const [filtroTecnico, setFiltroTecnico] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modais
  const [isModalFichaOpen, setIsModalFichaOpen] = useState(false);
  const [isModalImpressaoOpen, setIsModalImpressaoOpen] = useState(false);
  const [osSelecionada, setOsSelecionada] = useState<OrdemServicoItem | null>(null);

  const [ordens, setOrdens] = useState<OrdemServicoItem[]>(getOrdensServico);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    const handleUpdate = () => {
      setOrdens(getOrdensServico());
    };
    window.addEventListener('coliseu_os_updated', handleUpdate);

    // Carga inicial da Nuvem (PostgreSQL Central)
    const loadCloudOS = async () => {
      try {
        const cloudList = await syncService.fetchCloudOrdensServico();
        if (Array.isArray(cloudList) && cloudList.length > 0) {
          const local = getOrdensServico();
          const map = new Map<string, OrdemServicoItem>();
          local.forEach((o) => map.set(o.id, o));
          cloudList.forEach((co: any) => map.set(co.id, co));
          const unificadas = Array.from(map.values());
          localStorage.setItem('coliseu_ordens_servico', JSON.stringify(unificadas));
          setOrdens(unificadas);
        }
      } catch (err) {
        console.warn('[OS] Falha ao buscar OS da nuvem:', err);
      }
    };
    loadCloudOS();

    return () => window.removeEventListener('coliseu_os_updated', handleUpdate);
  }, []);

  // Abrir criação de nova O.S.
  const handleNovaOS = () => {
    setOsSelecionada(null);
    setIsModalFichaOpen(true);
  };

  // Abrir edição de O.S.
  const handleEditarOS = (os: OrdemServicoItem) => {
    setOsSelecionada(os);
    setIsModalFichaOpen(true);
  };

  // Abrir impressão de O.S.
  const handleImprimirOS = (os: OrdemServicoItem) => {
    setOsSelecionada(os);
    setIsModalImpressaoOpen(true);
  };

  // Avançar Status Rápido no Kanban
  const handleAvancarStatus = (os: OrdemServicoItem, novoStatus: StatusOS) => {
    const atualizada = { ...os, status: novoStatus };
    if (novoStatus === 'CONCLUIDO') {
      atualizada.dataConclusao = new Date().toLocaleDateString('pt-BR');
    }
    salvarOrdemServico(atualizada);
    showToast(`🔄 O.S. ${os.numeroOS} movida para ${novoStatus.replace('_', ' ')}!`);
  };

  // Filtragem 100% Blindada contra nulos
  const ordensFiltradas = useMemo(() => {
    return ordens.filter((os) => {
      if (!os) return false;
      if (filtroStatus !== 'TODOS' && os.status !== filtroStatus) return false;
      if (filtroTecnico && !String(os.tecnicoPrincipal || '').toUpperCase().includes(filtroTecnico.toUpperCase())) return false;
      if (busca) {
        const q = String(busca).toLowerCase().trim();
        const mNum = String(os.numeroOS || '').toLowerCase().includes(q);
        const mCli = String(os.clienteNome || '').toLowerCase().includes(q);
        const mObj = String(os.descricaoObjeto || '').toLowerCase().includes(q);
        const mPlaca = String(os.placaOuSerie || '').toLowerCase().includes(q);
        if (!mNum && !mCli && !mObj && !mPlaca) return false;
      }
      return true;
    });
  }, [ordens, filtroStatus, filtroTecnico, busca]);

  // Métricas
  const stats = useMemo(() => {
    const total = ordens.length;
    const emExecucao = ordens.filter((o) => o.status === 'EM_EXECUCAO' || o.status === 'AGUARDANDO_PECAS').length;
    const concluidas = ordens.filter((o) => o.status === 'CONCLUIDO' || o.status === 'FATURADO').length;
    const faturamentoTotal = ordens.reduce((acc, o) => acc + (o.status !== 'CANCELADO' ? o.valorTotalOS : 0), 0);
    const ticketMedio = total > 0 ? faturamentoTotal / total : 0;

    return {
      total,
      emExecucao,
      concluidas,
      faturamentoTotal,
      ticketMedio,
    };
  }, [ordens]);

  // Colunas do Kanban
  const colunasKanban: { status: StatusOS; label: string; cor: string; bg: string }[] = [
    { status: 'ORCAMENTO', label: '1. Orçamento / Entrada', cor: '#eab308', bg: 'rgba(234, 179, 8, 0.08)' },
    { status: 'APROVADO', label: '2. Aprovado / Fila', cor: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.08)' },
    { status: 'EM_EXECUCAO', label: '3. Em Execução', cor: '#3b82f6', bg: 'rgba(59, 130, 246, 0.08)' },
    { status: 'AGUARDANDO_PECAS', label: '4. Aguardando Peças', cor: '#f97316', bg: 'rgba(249, 115, 22, 0.08)' },
    { status: 'CONCLUIDO', label: '5. Pronto / Concluído', cor: '#10b981', bg: 'rgba(16, 185, 129, 0.08)' },
    { status: 'FATURADO', label: '6. Faturado / Entregue', cor: '#059669', bg: 'rgba(5, 150, 105, 0.08)' },
  ];

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

      {/* Header da Página */}
      <PageHeader
        title="Ordens de Serviço (O.S.) & Assistência Técnica"
        description="Gestão de serviços, orçamentos, laudos técnicos, aplicação de peças com baixa de estoque e faturamento integrado."
        breadcrumbItems={[
          { label: 'Comercial', active: false },
          { label: 'Ordens de Serviço', active: true },
        ]}
        primaryAction={{
          label: 'Nova O.S.',
          onClick: handleNovaOS,
          icon: <Plus size={15} aria-hidden="true" />,
        }}
      />

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
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Total de O.S. Ativas</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: '4px 0' }}>
            {stats.total} chamados
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Cadastradas na base</div>
        </div>

        <div className="coliseu-card" style={{ padding: '14px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Na Oficina / Em Execução</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#3b82f6', margin: '4px 0' }}>
            {stats.emExecucao} em andamento
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Mecânica e bancada</div>
        </div>

        <div className="coliseu-card" style={{ padding: '14px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Concluídas / Prontas</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#10b981', margin: '4px 0' }}>
            {stats.concluidas} serviços
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Prontas para retirada</div>
        </div>

        <div className="coliseu-card" style={{ padding: '14px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Volume Total em Serviços</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace', margin: '4px 0' }}>
            {formatCurrency(stats.faturamentoTotal)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Peças + Mão de Obra</div>
        </div>
      </div>

      {/* Barra de Filtros & Alternador Kanban / Lista */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flex: 1 }}>
          <div style={{ width: '280px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por O.S., cliente, placa ou modelo..."
                className="coliseu-input"
                style={{ paddingLeft: '30px', height: '34px', fontSize: '11px' }}
              />
            </div>
          </div>

          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="coliseu-input"
            style={{ height: '34px', fontSize: '11px', minWidth: '150px' }}
          >
            <option value="TODOS">Todos os Status</option>
            <option value="ORCAMENTO">Orçamento</option>
            <option value="APROVADO">Aprovado</option>
            <option value="EM_EXECUCAO">Em Execução</option>
            <option value="AGUARDANDO_PECAS">Aguardando Peças</option>
            <option value="CONCLUIDO">Concluído</option>
            <option value="FATURADO">Faturado</option>
          </select>

          <select
            value={filtroTecnico}
            onChange={(e) => setFiltroTecnico(e.target.value)}
            className="coliseu-input"
            style={{ height: '34px', fontSize: '11px', minWidth: '160px' }}
          >
            <option value="">Todos os Técnicos</option>
            <option value="CARLOS SILVA">CARLOS SILVA</option>
            <option value="RICARDO OLIVEIRA">RICARDO OLIVEIRA</option>
            <option value="FELIPE ANDRADE">FELIPE ANDRADE</option>
            <option value="MARCOS SOUZA">MARCOS SOUZA</option>
          </select>

          {(busca || filtroStatus !== 'TODOS' || filtroTecnico) && (
            <button
              type="button"
              onClick={() => {
                setBusca('');
                setFiltroStatus('TODOS');
                setFiltroTecnico('');
              }}
              style={{
                border: 'none',
                background: 'none',
                color: '#ef4444',
                fontSize: '11px',
                cursor: 'pointer',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px',
              }}
            >
              <X size={12} /> Limpar
            </button>
          )}
        </div>

        {/* Alternador Visualização */}
        <div style={{ display: 'flex', backgroundColor: 'var(--surface-3)', borderRadius: '6px', padding: '2px', gap: '2px' }}>
          <button
            type="button"
            onClick={() => setViewMode('KANBAN')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              border: 'none',
              background: viewMode === 'KANBAN' ? 'var(--surface-1)' : 'transparent',
              color: viewMode === 'KANBAN' ? '#3b82f6' : 'var(--text-muted)',
              fontSize: '11px',
              fontWeight: 700,
              padding: '5px 10px',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            <Kanban size={13} /> Quadro Kanban
          </button>
          <button
            type="button"
            onClick={() => setViewMode('LISTA')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              border: 'none',
              background: viewMode === 'LISTA' ? 'var(--surface-1)' : 'transparent',
              color: viewMode === 'LISTA' ? '#3b82f6' : 'var(--text-muted)',
              fontSize: '11px',
              fontWeight: 700,
              padding: '5px 10px',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            <List size={13} /> Tabela Detalhada
          </button>
        </div>
      </div>

      {/* MODO KANBAN (QUADRO ÁGIL) */}
      {viewMode === 'KANBAN' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, minmax(240px, 1fr))',
            gap: '12px',
            overflowX: 'auto',
            paddingBottom: '16px',
            alignItems: 'flex-start',
          }}
        >
          {colunasKanban.map((col) => {
            const itensColuna = ordensFiltradas.filter((o) => o.status === col.status);

            return (
              <div
                key={col.status}
                style={{
                  backgroundColor: 'var(--surface-2)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  minHeight: '400px',
                }}
              >
                {/* Header da Coluna */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingBottom: '8px',
                    borderBottom: `2px solid ${col.cor}`,
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {col.label}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: col.bg,
                      color: col.cor,
                      padding: '1px 6px',
                      borderRadius: '10px',
                    }}
                  >
                    {itensColuna.length}
                  </span>
                </div>

                {/* Cards da Coluna */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {itensColuna.map((os) => (
                    <div
                      key={os.id}
                      style={{
                        backgroundColor: 'var(--surface-1)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-link)' }}>
                          {os.numeroOS}
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }} className="tabular-nums">
                          {formatDate(os.dataAbertura)}
                        </span>
                      </div>

                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {os.clienteNome}
                      </div>

                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Car size={13} color="#3b82f6" />
                        <span>{os.descricaoObjeto}</span>
                      </div>

                      {os.placaOuSerie && (
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>
                          Placa/Série: {os.placaOuSerie}
                        </div>
                      )}

                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: '6px' }}>
                        Técnico: <strong>{os.tecnicoPrincipal}</strong>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#10b981', fontFamily: 'monospace' }}>
                          {formatCurrency(os.valorTotalOS)}
                        </span>

                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            type="button"
                            onClick={() => handleImprimirOS(os)}
                            className="coliseu-btn coliseu-btn-secondary"
                            style={{ padding: '0 6px', height: '26px' }}
                            title="Imprimir O.S."
                          >
                            <Printer size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditarOS(os)}
                            className="coliseu-btn coliseu-btn-secondary"
                            style={{ padding: '0 6px', height: '26px' }}
                            title="Editar O.S."
                          >
                            <Edit2 size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Botão de Avanço Rápido de Etapa */}
                      {col.status === 'ORCAMENTO' && (
                        <button
                          type="button"
                          onClick={() => handleAvancarStatus(os, 'APROVADO')}
                          className="coliseu-btn coliseu-btn-primary"
                          style={{ width: '100%', height: '26px', fontSize: '10px', fontWeight: 700, marginTop: '2px' }}
                        >
                          Aprovar O.S. ➔
                        </button>
                      )}
                      {col.status === 'APROVADO' && (
                        <button
                          type="button"
                          onClick={() => handleAvancarStatus(os, 'EM_EXECUCAO')}
                          className="coliseu-btn coliseu-btn-primary"
                          style={{ width: '100%', height: '26px', fontSize: '10px', fontWeight: 700, marginTop: '2px' }}
                        >
                          Iniciar Serviço ➔
                        </button>
                      )}
                      {col.status === 'EM_EXECUCAO' && (
                        <button
                          type="button"
                          onClick={() => handleAvancarStatus(os, 'CONCLUIDO')}
                          className="coliseu-btn coliseu-btn-primary"
                          style={{ width: '100%', height: '26px', fontSize: '10px', fontWeight: 700, marginTop: '2px', backgroundColor: '#10b981', borderColor: '#10b981' }}
                        >
                          Concluir Serviço ✓
                        </button>
                      )}
                      {col.status === 'CONCLUIDO' && !os.faturado && (
                        <button
                          type="button"
                          onClick={() => handleAvancarStatus(os, 'FATURADO')}
                          className="coliseu-btn coliseu-btn-primary"
                          style={{ width: '100%', height: '26px', fontSize: '10px', fontWeight: 700, marginTop: '2px', backgroundColor: '#059669', borderColor: '#059669' }}
                        >
                          Faturar & Entregar 💳
                        </button>
                      )}
                    </div>
                  ))}

                  {itensColuna.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '24px 8px', fontSize: '11px', color: 'var(--text-muted)' }}>
                      Nenhuma O.S. nesta etapa
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODO LISTA / TABELA DETALHADA */}
      {viewMode === 'LISTA' && (
        <div className="coliseu-card">
          <div className="coliseu-table-container">
            <table className="coliseu-table" style={{ fontSize: '12px' }}>
              <thead>
                <tr>
                  <th style={{ width: '100px' }}>Nº O.S.</th>
                  <th style={{ width: '100px' }}>Abertura</th>
                  <th>Cliente</th>
                  <th>Objeto / Veículo / Placa</th>
                  <th>Técnico</th>
                  <th style={{ width: '130px', textAlign: 'center' }}>Status</th>
                  <th style={{ width: '120px', textAlign: 'right' }}>Total (R$)</th>
                  <th style={{ width: '130px', textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {ordensFiltradas.map((os) => (
                  <tr key={os.id}>
                    <td style={{ fontWeight: 700, color: 'var(--text-link)', fontSize: '11px' }}>
                      {os.numeroOS}
                    </td>
                    <td style={{ color: 'var(--text-muted)' }} className="tabular-nums">{formatDate(os.dataAbertura)}</td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{os.clienteNome}</td>
                    <td>
                      <div>{os.descricaoObjeto}</div>
                      {os.placaOuSerie && (
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          Placa: {os.placaOuSerie}
                        </span>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{os.tecnicoPrincipal}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor:
                            os.status === 'ORCAMENTO'
                              ? 'rgba(234, 179, 8, 0.15)'
                              : os.status === 'EM_EXECUCAO'
                              ? 'rgba(59, 130, 246, 0.15)'
                              : os.status === 'CONCLUIDO' || os.status === 'FATURADO'
                              ? 'rgba(16, 185, 129, 0.15)'
                              : 'var(--surface-3)',
                          color:
                            os.status === 'ORCAMENTO'
                              ? '#eab308'
                              : os.status === 'EM_EXECUCAO'
                              ? '#3b82f6'
                              : os.status === 'CONCLUIDO' || os.status === 'FATURADO'
                              ? '#10b981'
                              : 'var(--text-secondary)',
                        }}
                      >
                        {os.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#10b981', fontFamily: 'monospace' }}>
                      {formatCurrency(os.valorTotalOS)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleEditarOS(os)}
                          className="coliseu-btn coliseu-btn-secondary"
                          style={{ padding: '0 8px', height: '28px', fontSize: '11px' }}
                          title="Editar"
                        >
                          <Edit2 size={12} /> Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleImprimirOS(os)}
                          className="coliseu-btn coliseu-btn-secondary"
                          style={{ padding: '0 8px', height: '28px', fontSize: '11px' }}
                          title="Imprimir"
                        >
                          <Printer size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {ordensFiltradas.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                      Nenhuma Ordem de Serviço encontrada para os filtros selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Ficha Completa de O.S. */}
      {isModalFichaOpen && (
        <ModalFichaOrdemServico
          isOpen={isModalFichaOpen}
          onClose={() => setIsModalFichaOpen(false)}
          ordemEdicao={osSelecionada}
          onSaveSuccess={(os) => {
            showToast(`✅ O.S. '${os.numeroOS}' salva com sucesso!`);
          }}
          onOpenImpressao={(os) => {
            setIsModalFichaOpen(false);
            setOsSelecionada(os);
            setIsModalImpressaoOpen(true);
          }}
        />
      )}

      {/* Modal Impressão Formal de O.S. */}
      {isModalImpressaoOpen && (
        <ModalImpressaoOS
          isOpen={isModalImpressaoOpen}
          onClose={() => setIsModalImpressaoOpen(false)}
          os={osSelecionada}
        />
      )}
    </div>
  );
};
