import React, { useState, useMemo, useEffect } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import {
  FileText,
  Plus,
  Search,
  CheckCircle2,
  Edit2,
  Trash2,
  Copy,
  Layers,
  Sparkles,
  ShieldCheck,
  Building,
  CheckSquare,
  Square,
} from 'lucide-react';
import {
  NaturezaOperacaoCompleta,
  getNaturezasOperacao,
  alternarCheckboxNatureza,
  clonarNaturezaOperacao,
  excluirNaturezaOperacao,
} from '../lib/naturezasOperacao';
import { ModalEditarNaturezaOperacao } from '../components/fiscal/ModalEditarNaturezaOperacao';

export const NaturezasOperacaoPage: React.FC = () => {
  const [naturezas, setNaturezas] = useState<NaturezaOperacaoCompleta[]>(getNaturezasOperacao);
  const [tabFiltro, setTabFiltro] = useState<'TODAS' | 'VENDAS' | 'COMPRAS' | 'ESTADUAL' | 'INTERESTADUAL'>('TODAS');
  const [busca, setBusca] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modais
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [naturezaSelecionada, setNaturezaSelecionada] = useState<NaturezaOperacaoCompleta | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    const handleUpdate = () => {
      setNaturezas(getNaturezasOperacao());
    };
    window.addEventListener('coliseu_naturezas_operacao_updated', handleUpdate);
    return () => window.removeEventListener('coliseu_naturezas_operacao_updated', handleUpdate);
  }, []);

  const handleNova = () => {
    setNaturezaSelecionada(null);
    setIsModalOpen(true);
  };

  const handleEditar = (n: NaturezaOperacaoCompleta) => {
    setNaturezaSelecionada(n);
    setIsModalOpen(true);
  };

  const handleClonar = (id: string) => {
    const c = clonarNaturezaOperacao(id);
    if (c) {
      showToast(`✅ Natureza clonada com sucesso! Código: ${c.codigo}`);
    }
  };

  const handleExcluir = (id: string, cfop: string) => {
    if (confirm(`Deseja realmente excluir a Natureza CFOP ${cfop}?`)) {
      excluirNaturezaOperacao(id);
      showToast(`Natureza CFOP ${cfop} excluída com sucesso.`);
    }
  };

  const handleToggleCheckbox = (id: string, campo: 'utilizarEmVendas' | 'utilizarEmCompras' | 'utilizarEmMobile') => {
    const n = alternarCheckboxNatureza(id, campo);
    if (n) {
      showToast(`Atualizado: ${n.cfop} - ${campo === 'utilizarEmVendas' ? 'Vendas' : campo === 'utilizarEmCompras' ? 'Compras' : 'Mobile'} = ${n[campo] ? 'SIM' : 'NÃO'}`);
    }
  };

  // Filtragem
  const naturezasFiltradas = useMemo(() => {
    return naturezas.filter((n) => {
      if (tabFiltro === 'VENDAS' && !n.utilizarEmVendas) return false;
      if (tabFiltro === 'COMPRAS' && !n.utilizarEmCompras) return false;
      if (tabFiltro === 'ESTADUAL' && n.destino !== 'DENTRO DO ESTADO') return false;
      if (tabFiltro === 'INTERESTADUAL' && n.destino !== 'FORA DO ESTADO') return false;

      if (busca) {
        const q = busca.toLowerCase();
        const mCfop = n.cfop.includes(q);
        const mDesc = n.descricao.toLowerCase().includes(q);
        const mDescNota = n.descricaoNota.toLowerCase().includes(q);
        const mCod = n.codigo.includes(q);
        if (!mCfop && !mDesc && !mDescNota && !mCod) return false;
      }

      return true;
    });
  }, [naturezas, tabFiltro, busca]);

  // Estatísticas
  const stats = useMemo(() => {
    const total = naturezas.length;
    const ativasVendas = naturezas.filter((n) => n.utilizarEmVendas && n.status === 'ATIVA').length;
    const ativasCompras = naturezas.filter((n) => n.utilizarEmCompras && n.status === 'ATIVA').length;
    const saidas = naturezas.filter((n) => n.tipoMovimento === 'SAIDA').length;
    const entradas = naturezas.filter((n) => n.tipoMovimento === 'ENTRADA').length;

    return {
      total,
      ativasVendas,
      ativasCompras,
      saidas,
      entradas,
    };
  }, [naturezas]);

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
        title="Catálogo Nacional de Naturezas de Operação (CFOP)"
        description="Gestão de regras fiscais, movimentação de estoque, geração financeira e seleção de naturezas ativas para Vendas e Compras."
        breadcrumbItems={[
          { label: 'Fiscal', active: false },
          { label: 'Naturezas de Operação (CFOP)', active: true },
        ]}
      >
        <Button
          variant="primary"
          onClick={handleNova}
          style={{ display: 'inline-flex', gap: '6px', fontSize: '12px' }}
          leftIcon={<Plus size={15} />}
        >
          Nova Natureza de Operação (F3)
        </Button>
      </PageHeader>

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
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Catálogo SEFAZ Cadastrado</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: '4px 0' }}>
            {stats.total} naturezas
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Saídas: {stats.saidas} • Entradas: {stats.entradas}</div>
        </div>

        <div className="coliseu-card" style={{ padding: '14px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Habilitadas em Vendas / Balcão</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#3b82f6', margin: '4px 0' }}>
            {stats.ativasVendas} ativas
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Disponíveis no Pedido & PDV</div>
        </div>

        <div className="coliseu-card" style={{ padding: '14px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Habilitadas em Compras / XML</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#10b981', margin: '4px 0' }}>
            {stats.ativasCompras} ativas
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Entrada de mercadorias</div>
        </div>

        <div className="coliseu-card" style={{ padding: '14px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Conformidade Fiscal</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#f59e0b', margin: '4px 0' }}>
            100% SEFAZ
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ICMS / ST / IPI / PIS / COFINS</div>
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
        <div style={{ display: 'flex', backgroundColor: 'var(--surface-3)', borderRadius: '6px', padding: '2px', gap: '2px', flexWrap: 'wrap' }}>
          {[
            { key: 'TODAS', label: 'Todas as Naturezas' },
            { key: 'VENDAS', label: '🛒 Habilitadas em Vendas' },
            { key: 'COMPRAS', label: '📦 Habilitadas em Compras' },
            { key: 'ESTADUAL', label: '📍 Estadual (Dentro do Estado)' },
            { key: 'INTERESTADUAL', label: '🗺️ Interestadual (Fora do Estado)' },
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

        <div style={{ width: '320px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por CFOP ou Descrição..."
              className="coliseu-input"
              style={{ paddingLeft: '30px', height: '34px', fontSize: '11px' }}
            />
          </div>
        </div>
      </div>

      {/* Tabela de Naturezas de Operação com Caixas de Seleção */}
      <div className="coliseu-card">
        <div className="coliseu-table-container">
          <table className="coliseu-table" style={{ fontSize: '11px' }}>
            <thead>
              <tr>
                <th style={{ width: '45px', textAlign: 'center' }}>Cód</th>
                <th style={{ width: '65px', textAlign: 'center' }}>CFOP</th>
                <th>Descrição da Natureza de Operação & Regras Fiscais</th>
                <th style={{ width: '70px', textAlign: 'center' }}>Tipo</th>
                <th style={{ width: '130px' }}>Destino</th>
                <th style={{ width: '60px', textAlign: 'center' }}>Estoque</th>
                <th style={{ width: '60px', textAlign: 'center' }}>Finan.</th>
                <th style={{ width: '90px', textAlign: 'center', backgroundColor: 'rgba(59, 130, 246, 0.08)' }}>🛒 Em Vendas</th>
                <th style={{ width: '90px', textAlign: 'center', backgroundColor: 'rgba(16, 185, 129, 0.08)' }}>📦 Em Compras</th>
                <th style={{ width: '75px', textAlign: 'center' }}>📱 Mobile</th>
                <th style={{ width: '70px', textAlign: 'center' }}>Status</th>
                <th style={{ width: '130px', textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {naturezasFiltradas.map((n) => (
                <tr key={n.id}>
                  <td style={{ textAlign: 'center', fontWeight: 700 }}>{n.codigo}</td>
                  <td style={{ textAlign: 'center', fontWeight: 800, color: 'var(--text-link)', fontFamily: 'monospace', fontSize: '12px' }}>
                    {n.cfop}
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{n.descricao}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      DANFE: {n.descricaoNota} • CST/CSOSN: {n.impostos.cstIcms || n.impostos.csosn} • ICMS: {n.impostos.aliquotaIcms}% • PIS: {n.impostos.aliquotaPis}%
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span
                      style={{
                        fontSize: '9px',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '3px',
                        backgroundColor: n.tipoMovimento === 'SAIDA' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                        color: n.tipoMovimento === 'SAIDA' ? '#3b82f6' : '#10b981',
                      }}
                    >
                      {n.tipoMovimento}
                    </span>
                  </td>
                  <td style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{n.destino}</td>
                  <td style={{ textAlign: 'center', fontWeight: 700, color: n.operacional.movimentaEstoqueReal ? '#10b981' : 'var(--text-muted)' }}>
                    {n.operacional.movimentaEstoqueReal ? 'SIM' : 'NÃO'}
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 700, color: n.operacional.geraFinanceiro ? '#10b981' : 'var(--text-muted)' }}>
                    {n.operacional.geraFinanceiro ? 'SIM' : 'NÃO'}
                  </td>

                  {/* Checkbox Vendas */}
                  <td style={{ textAlign: 'center', backgroundColor: 'rgba(59, 130, 246, 0.04)' }}>
                    <input
                      type="checkbox"
                      checked={n.utilizarEmVendas}
                      onChange={() => handleToggleCheckbox(n.id, 'utilizarEmVendas')}
                      style={{ cursor: 'pointer', transform: 'scale(1.1)' }}
                      title="Marcar para usar na tela de Pedidos, Orçamentos e PDV"
                    />
                  </td>

                  {/* Checkbox Compras */}
                  <td style={{ textAlign: 'center', backgroundColor: 'rgba(16, 185, 129, 0.04)' }}>
                    <input
                      type="checkbox"
                      checked={n.utilizarEmCompras}
                      onChange={() => handleToggleCheckbox(n.id, 'utilizarEmCompras')}
                      style={{ cursor: 'pointer', transform: 'scale(1.1)' }}
                      title="Marcar para usar no módulo de Compras e Entrada de XML"
                    />
                  </td>

                  {/* Checkbox Mobile */}
                  <td style={{ textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={n.utilizarEmMobile}
                      onChange={() => handleToggleCheckbox(n.id, 'utilizarEmMobile')}
                      style={{ cursor: 'pointer' }}
                      title="Sincronizar com força de vendas mobile"
                    />
                  </td>

                  <td style={{ textAlign: 'center' }}>
                    <span
                      style={{
                        fontSize: '9px',
                        fontWeight: 700,
                        padding: '1px 5px',
                        borderRadius: '3px',
                        backgroundColor: n.status === 'ATIVA' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: n.status === 'ATIVA' ? '#10b981' : '#ef4444',
                      }}
                    >
                      {n.status}
                    </span>
                  </td>

                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleClonar(n.id)}
                        className="coliseu-btn coliseu-btn-secondary"
                        style={{ padding: '0 5px', height: '24px', fontSize: '10px' }}
                        title="Clonar Natureza"
                      >
                        <Copy size={11} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleEditar(n)}
                        className="coliseu-btn coliseu-btn-secondary"
                        style={{ padding: '0 5px', height: '24px', fontSize: '10px' }}
                        title="Editar Regras e Impostos"
                      >
                        <Edit2 size={11} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleExcluir(n.id, n.cfop)}
                        className="coliseu-btn coliseu-btn-secondary"
                        style={{ padding: '0 5px', height: '24px', fontSize: '10px', color: '#ef4444' }}
                        title="Excluir"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {naturezasFiltradas.length === 0 && (
                <tr>
                  <td colSpan={12} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    Nenhuma natureza de operação encontrada para os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Editar / Criar Natureza de Operação */}
      {isModalOpen && (
        <ModalEditarNaturezaOperacao
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          naturezaEdicao={naturezaSelecionada}
          onSaveSuccess={(n) => {
            showToast(`✅ Natureza ${n.cfop} - ${n.descricao} salva com sucesso!`);
          }}
        />
      )}
    </div>
  );
};
