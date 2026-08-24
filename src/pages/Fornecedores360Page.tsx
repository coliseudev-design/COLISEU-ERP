import React, { useState, useMemo, useEffect } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { formatCurrency } from '../lib/formatters';
import {
  Building,
  Plus,
  Search,
  Filter,
  Star,
  DollarSign,
  Phone,
  Mail,
  Edit2,
  CheckCircle2,
  X,
  CreditCard,
  Award,
  Layers,
  FileText,
} from 'lucide-react';
import {
  FornecedorItem,
  CategoriaFornecedor,
  getFornecedores,
} from '../lib/fornecedores';
import { ModalFichaFornecedor } from '../components/financeiro/ModalFichaFornecedor';

export const Fornecedores360Page: React.FC = () => {
  const [busca, setBusca] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('TODAS');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [isModalFichaOpen, setIsModalFichaOpen] = useState(false);
  const [fornecedorSelecionado, setFornecedorSelecionado] = useState<FornecedorItem | null>(null);

  const [fornecedores, setFornecedores] = useState<FornecedorItem[]>(getFornecedores);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    const handleUpdate = () => {
      setFornecedores(getFornecedores());
    };
    window.addEventListener('coliseu_fornecedores_updated', handleUpdate);
    return () => window.removeEventListener('coliseu_fornecedores_updated', handleUpdate);
  }, []);

  const handleNovo = () => {
    setFornecedorSelecionado(null);
    setIsModalFichaOpen(true);
  };

  const handleEditar = (forn: FornecedorItem) => {
    setFornecedorSelecionado(forn);
    setIsModalFichaOpen(true);
  };

  // Filtragem
  const fornecedoresFiltrados = useMemo(() => {
    return fornecedores.filter((f) => {
      if (filtroCategoria !== 'TODAS' && f.categoria !== filtroCategoria) return false;
      if (busca) {
        const q = busca.toLowerCase();
        const mRazao = f.razaoSocial.toLowerCase().includes(q);
        const mFant = f.nomeFantasia.toLowerCase().includes(q);
        const mCnpj = f.cnpjCpf.toLowerCase().includes(q);
        const mCidade = f.cidade.toLowerCase().includes(q);
        if (!mRazao && !mFant && !mCnpj && !mCidade) return false;
      }
      return true;
    });
  }, [fornecedores, filtroCategoria, busca]);

  // Estatísticas
  const stats = useMemo(() => {
    const total = fornecedores.length;
    const homologados = fornecedores.filter((f) => f.status === 'HOMOLOGADO').length;
    const totalComprado = fornecedores.reduce((acc, f) => acc + f.totalCompradoAcumulado, 0);
    const titulosAbertos = fornecedores.reduce((acc, f) => acc + f.totalTitulosEmAberto, 0);

    return {
      total,
      homologados,
      totalComprado,
      titulosAbertos,
    };
  }, [fornecedores]);

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
        title="Gestão de Fornecedores 360° & Vendor Rating"
        description="Qualificação de parceiros comerciais, dados bancários/PIX, avaliação de desempenho e histórico consolidado."
        breadcrumbItems={[
          { label: 'Compras', active: false },
          { label: 'Fornecedores 360°', active: true },
        ]}
        primaryAction={{
          label: 'Novo Fornecedor',
          onClick: handleNovo,
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
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Fornecedores Cadastrados</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: '4px 0' }}>
            {stats.total} parceiros
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Base de compras ativa</div>
        </div>

        <div className="coliseu-card" style={{ padding: '14px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Fornecedores Homologados</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#10b981', margin: '4px 0' }}>
            {stats.homologados} qualificados
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Vendor Rating aprovado</div>
        </div>

        <div className="coliseu-card" style={{ padding: '14px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Total Comprado Acumulado</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace', margin: '4px 0' }}>
            {formatCurrency(stats.totalComprado)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Volume histórico de compras</div>
        </div>

        <div className="coliseu-card" style={{ padding: '14px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Compromissos a Pagar</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#ef4444', fontFamily: 'monospace', margin: '4px 0' }}>
            {formatCurrency(stats.titulosAbertos)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Títulos em aberto</div>
        </div>
      </div>

      {/* Barra de Filtros */}
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
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: 1, flexWrap: 'wrap' }}>
          <div style={{ width: '320px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por razão social, nome fantasia ou CNPJ..."
                className="coliseu-input"
                style={{ paddingLeft: '30px', height: '34px', fontSize: '11px' }}
              />
            </div>
          </div>

          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            className="coliseu-input"
            style={{ height: '34px', fontSize: '11px', minWidth: '180px' }}
          >
            <option value="TODAS">Todas as Categorias</option>
            <option value="MATERIA_PRIMA">Matéria-Prima</option>
            <option value="REVENDA_MERCADORIAS">Revenda de Mercadorias</option>
            <option value="SEMENTES_GRAOS">🌱 Sementes & Grãos</option>
            <option value="QUIMICOS_DEFENSIVOS">🧪 Químicos & Defensivos</option>
            <option value="PRESTADOR_SERVICOS">Prestador de Serviços</option>
            <option value="TRANSPORTADORA">Transportadora</option>
          </select>
        </div>
      </div>

      {/* Tabela de Fornecedores */}
      <div className="coliseu-card">
        <div className="coliseu-table-container">
          <table className="coliseu-table" style={{ fontSize: '12px' }}>
            <thead>
              <tr>
                <th style={{ width: '80px' }}>Código</th>
                <th>Razão Social & Nome Fantasia</th>
                <th style={{ width: '150px' }}>CNPJ / Local</th>
                <th style={{ width: '130px' }}>Categoria</th>
                <th style={{ width: '110px', textAlign: 'center' }}>Vendor Rating</th>
                <th style={{ width: '130px', textAlign: 'right' }}>Total Comprado</th>
                <th style={{ width: '110px', textAlign: 'center' }}>Status</th>
                <th style={{ width: '110px', textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {fornecedoresFiltrados.map((forn) => (
                <tr key={forn.id}>
                  <td style={{ fontWeight: 700, color: 'var(--text-link)', fontSize: '11px' }}>
                    {forn.codigo}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {forn.razaoSocial}
                    </div>
                    {forn.nomeFantasia !== forn.razaoSocial && (
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        Fantasia: {forn.nomeFantasia}
                      </div>
                    )}
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      📞 {forn.telefone} • ✉️ {forn.email}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: '11px' }}>{forn.cnpjCpf}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      {forn.cidade}/{forn.uf}
                    </div>
                  </td>
                  <td>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 600,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: 'var(--surface-3)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {forn.categoria.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                      <Star size={12} fill="#eab308" color="#eab308" />
                      <strong style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                        {forn.scoreGeral}
                      </strong>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>/100</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>
                    {formatCurrency(forn.totalCompradoAcumulado)}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        backgroundColor:
                          forn.status === 'HOMOLOGADO'
                            ? 'rgba(16, 185, 129, 0.15)'
                            : 'var(--surface-3)',
                        color:
                          forn.status === 'HOMOLOGADO'
                            ? '#10b981'
                            : 'var(--text-secondary)',
                      }}
                    >
                      {forn.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => handleEditar(forn)}
                      className="coliseu-btn coliseu-btn-secondary"
                      style={{ padding: '0 8px', height: '28px', fontSize: '11px' }}
                      title="Editar Fornecedor"
                    >
                      <Edit2 size={12} /> Ficha 360°
                    </button>
                  </td>
                </tr>
              ))}
              {fornecedoresFiltrados.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    Nenhum fornecedor encontrado para os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Ficha 360° */}
      {isModalFichaOpen && (
        <ModalFichaFornecedor
          isOpen={isModalFichaOpen}
          onClose={() => setIsModalFichaOpen(false)}
          fornecedorEdicao={fornecedorSelecionado}
          onSaveSuccess={(forn) => {
            showToast(`✅ Fornecedor '${forn.razaoSocial}' salvo com sucesso!`);
          }}
        />
      )}
    </div>
  );
};
