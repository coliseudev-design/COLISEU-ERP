import React, { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { StatusBadge } from '../components/ui/StatusBadge';
import {
  Layers,
  Tag,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  X,
  Sparkles,
  Percent,
  Sliders,
  FolderTree,
  Building,
  Check,
} from 'lucide-react';
import {
  getCategorias,
  salvarCategoria,
  excluirCategoria,
  getMarcas,
  salvarMarca,
  excluirMarca,
  CategoriaItem,
  MarcaItem,
} from '../lib/classificacoes';
import { ModalCadastroRapidoMarca } from '../components/produtos/ModalCadastroRapidoMarca';
import { ModalCadastroRapidoCategoria } from '../components/produtos/ModalCadastroRapidoCategoria';

export const CategoriasMarcasPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'categorias' | 'marcas'>('categorias');
  const [categorias, setCategorias] = useState<CategoriaItem[]>(getCategorias);
  const [marcas, setMarcas] = useState<MarcaItem[]>(getMarcas);
  const [searchTerm, setSearchTerm] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modais de Criação Rápida
  const [isModalMarcaOpen, setIsModalMarcaOpen] = useState(false);
  const [isModalCatOpen, setIsModalCatOpen] = useState(false);
  const [catSelecionadaPrevia, setCatSelecionadaPrevia] = useState('');

  // Modal de Edição Completa Categoria
  const [categoriaEmEdicao, setCategoriaEmEdicao] = useState<CategoriaItem | null>(null);
  const [novaSubInput, setNovaSubInput] = useState('');

  // Modal de Edição Completa Marca
  const [marcaEmEdicao, setMarcaEmEdicao] = useState<MarcaItem | null>(null);

  const carregarDados = () => {
    setCategorias(getCategorias());
    setMarcas(getMarcas());
  };

  useEffect(() => {
    carregarDados();
    window.addEventListener('storage', carregarDados);
    window.addEventListener('coliseu_classificacoes_updated', carregarDados);
    return () => {
      window.removeEventListener('storage', carregarDados);
      window.removeEventListener('coliseu_classificacoes_updated', carregarDados);
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Filtros
  const categoriasFiltradas = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return categorias;
    return categorias.filter(
      (c) =>
        c.nome.toLowerCase().includes(q) ||
        c.subcategorias.some((s) => s.toLowerCase().includes(q))
    );
  }, [categorias, searchTerm]);

  const marcasFiltradas = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return marcas;
    return marcas.filter(
      (m) =>
        m.nome.toLowerCase().includes(q) ||
        (m.fabricante && m.fabricante.toLowerCase().includes(q))
    );
  }, [marcas, searchTerm]);

  // Handlers Categoria
  const handleSalvarEdicaoCategoria = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoriaEmEdicao) return;
    salvarCategoria(categoriaEmEdicao);
    setCategoriaEmEdicao(null);
    showToast(`✅ Categoria '${categoriaEmEdicao.nome}' atualizada com sucesso!`);
  };

  const handleExcluirCategoria = (id: string, nome: string) => {
    if (window.confirm(`Deseja realmente remover a categoria '${nome}'?`)) {
      excluirCategoria(id);
      showToast(`🗑️ Categoria '${nome}' removida.`);
    }
  };

  const handleAddSubcategoriaCard = (cat: CategoriaItem, subNome: string) => {
    if (!subNome.trim()) return;
    if (cat.subcategorias.includes(subNome.trim())) return;
    const updated = {
      ...cat,
      subcategorias: [...cat.subcategorias, subNome.trim()],
    };
    salvarCategoria(updated);
    showToast(`➕ Subcategoria adicionada a '${cat.nome}'.`);
  };

  // Handlers Marca
  const handleSalvarEdicaoMarca = (e: React.FormEvent) => {
    e.preventDefault();
    if (!marcaEmEdicao) return;
    salvarMarca(marcaEmEdicao);
    setMarcaEmEdicao(null);
    showToast(`✅ Marca '${marcaEmEdicao.nome}' atualizada!`);
  };

  const handleToggleStatusMarca = (marca: MarcaItem) => {
    const updated: MarcaItem = {
      ...marca,
      status: marca.status === 'Ativo' ? 'Inativo' : 'Ativo',
    };
    salvarMarca(updated);
    showToast(`Status da marca '${marca.nome}' alterado para ${updated.status}.`);
  };

  const handleExcluirMarca = (id: string, nome: string) => {
    if (window.confirm(`Deseja realmente excluir a marca '${nome}'?`)) {
      excluirMarca(id);
      showToast(`🗑️ Marca '${nome}' excluída.`);
    }
  };

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 10000,
            padding: '12px 20px',
            backgroundColor: 'var(--surface-1)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
            color: 'var(--text-primary)',
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        title="Gestão de Categorias, Subcategorias & Marcas"
        description="Estrutura mercadológica de produtos para relatórios, filtros e classificação ágil no catálogo."
        breadcrumbItems={[
          { label: 'Estoque', active: false },
          { label: 'Classificações', active: true },
        ]}
      >
        {activeTab === 'categorias' ? (
          <Button
            variant="primary"
            onClick={() => {
              setCatSelecionadaPrevia('');
              setIsModalCatOpen(true);
            }}
            style={{ display: 'inline-flex', gap: '6px' }}
          >
            <Plus size={16} /> + Nova Categoria
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={() => setIsModalMarcaOpen(true)}
            style={{ display: 'inline-flex', gap: '6px' }}
          >
            <Plus size={16} /> + Nova Marca
          </Button>
        )}
      </PageHeader>

      {/* Navegação por Abas Principais */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-default)', gap: '8px' }}>
        <button
          type="button"
          onClick={() => {
            setActiveTab('categorias');
            setSearchTerm('');
          }}
          style={{
            padding: '10px 20px',
            fontSize: '13px',
            fontWeight: 600,
            border: 'none',
            borderBottom: activeTab === 'categorias' ? '2px solid var(--primary)' : '2px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'categorias' ? 'var(--primary)' : 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Layers size={16} /> Categorias & Subcategorias ({categorias.length})
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('marcas');
            setSearchTerm('');
          }}
          style={{
            padding: '10px 20px',
            fontSize: '13px',
            fontWeight: 600,
            border: 'none',
            borderBottom: activeTab === 'marcas' ? '2px solid var(--primary)' : '2px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'marcas' ? 'var(--primary)' : 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Tag size={16} /> Marcas & Fabricantes ({marcas.length})
        </button>
      </div>

      {/* Barra de Busca */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <div style={{ position: 'relative', width: '380px' }}>
          <Search
            size={16}
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
          />
          <input
            type="text"
            placeholder={activeTab === 'categorias' ? 'Buscar por categoria ou subcategoria...' : 'Buscar marca ou fabricante...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="coliseu-input"
            style={{ paddingLeft: '36px', height: '38px', fontSize: '12px', width: '100%' }}
          />
        </div>
      </div>

      {/* ABA 1: CATEGORIAS & SUBCATEGORIAS */}
      {activeTab === 'categorias' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '16px' }}>
          {categoriasFiltradas.map((cat) => (
            <div
              key={cat.id}
              style={{
                backgroundColor: 'var(--surface-1)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-lg)',
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                transition: 'all 0.2s ease',
              }}
            >
              {/* Header do Card */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      backgroundColor: cat.cor || '#3b82f6',
                    }}
                  />
                  <div>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {cat.nome}
                    </h3>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {cat.subcategorias.length} subcategoria(s) vinculada(s)
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    type="button"
                    onClick={() => setCategoriaEmEdicao(cat)}
                    style={{
                      border: 'none',
                      background: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '4px',
                      borderRadius: '4px',
                    }}
                    title="Editar Categoria"
                  >
                    <Edit2 size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExcluirCategoria(cat.id, cat.nome)}
                    style={{
                      border: 'none',
                      background: 'none',
                      color: '#ef4444',
                      cursor: 'pointer',
                      padding: '4px',
                      borderRadius: '4px',
                    }}
                    title="Excluir Categoria"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* Subcategorias Tags */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Subcategorias:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {cat.subcategorias.map((sub, idx) => (
                    <span
                      key={idx}
                      style={{
                        fontSize: '11px',
                        padding: '3px 8px',
                        backgroundColor: 'var(--surface-3)',
                        borderRadius: '4px',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      {sub}
                    </span>
                  ))}

                  <button
                    type="button"
                    onClick={() => {
                      setCatSelecionadaPrevia(cat.nome);
                      setIsModalCatOpen(true);
                    }}
                    style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      backgroundColor: 'rgba(59, 130, 246, 0.08)',
                      borderRadius: '4px',
                      color: '#3b82f6',
                      border: '1px dashed rgba(59, 130, 246, 0.4)',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      fontWeight: 600,
                    }}
                  >
                    <Plus size={12} /> Adicionar
                  </button>
                </div>
              </div>

              {/* Badges de Parâmetros da Categoria */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderTop: '1px solid var(--border-subtle)',
                  paddingTop: '10px',
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                }}
              >
                <span>Margem Meta: <strong style={{ color: '#10b981' }}>{cat.margemPadrao || 20}%</strong></span>
                <span>Comissão: <strong>{cat.comissaoPadrao || 4}%</strong></span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ABA 2: MARCAS & FABRICANTES */}
      {activeTab === 'marcas' && (
        <div style={{ border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          <table className="coliseu-table" style={{ fontSize: '12px' }}>
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                <th style={{ width: '220px' }}>Nome da Marca</th>
                <th>Fabricante / Razão Social</th>
                <th style={{ width: '100px', textAlign: 'center' }}>Status</th>
                <th style={{ width: '120px', textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {marcasFiltradas.map((m, idx) => (
                <tr key={m.id}>
                  <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{idx + 1}</td>
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{m.nome}</div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{m.fabricante || '—'}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span
                      onClick={() => handleToggleStatusMarca(m)}
                      style={{ cursor: 'pointer' }}
                      title="Clique para alternar status"
                    >
                      <StatusBadge status={m.status === 'Ativo' ? 'Ativo' : 'Inativo'} label={m.status} />
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => setMarcaEmEdicao(m)}
                        style={{ border: 'none', background: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                        title="Editar Marca"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExcluirMarca(m.id, m.nome)}
                        style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                        title="Excluir Marca"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Edição Categoria */}
      {categoriaEmEdicao && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(3px)',
            zIndex: 11000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '540px',
              backgroundColor: 'var(--surface-1)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Editar Categoria: {categoriaEmEdicao.nome}
              </h3>
              <button
                type="button"
                onClick={() => setCategoriaEmEdicao(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSalvarEdicaoCategoria} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label className="coliseu-label" style={{ fontSize: '11px', marginBottom: '4px' }}>
                  Nome da Categoria
                </label>
                <input
                  type="text"
                  required
                  value={categoriaEmEdicao.nome}
                  onChange={(e) => setCategoriaEmEdicao({ ...categoriaEmEdicao, nome: e.target.value.toUpperCase() })}
                  className="coliseu-input"
                  style={{ height: '36px', fontSize: '13px', fontWeight: 600 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="coliseu-label" style={{ fontSize: '11px', marginBottom: '4px' }}>
                    Margem Meta (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={categoriaEmEdicao.margemPadrao || 20}
                    onChange={(e) => setCategoriaEmEdicao({ ...categoriaEmEdicao, margemPadrao: parseFloat(e.target.value) || 0 })}
                    className="coliseu-input"
                    style={{ height: '36px', fontSize: '12px' }}
                  />
                </div>
                <div>
                  <label className="coliseu-label" style={{ fontSize: '11px', marginBottom: '4px' }}>
                    Comissão (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={categoriaEmEdicao.comissaoPadrao || 4}
                    onChange={(e) => setCategoriaEmEdicao({ ...categoriaEmEdicao, comissaoPadrao: parseFloat(e.target.value) || 0 })}
                    className="coliseu-input"
                    style={{ height: '36px', fontSize: '12px' }}
                  />
                </div>
              </div>

              <div>
                <label className="coliseu-label" style={{ fontSize: '11px', marginBottom: '4px' }}>
                  Subcategorias Vinculadas
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                  {categoriaEmEdicao.subcategorias.map((sub, idx) => (
                    <span
                      key={idx}
                      style={{
                        fontSize: '11px',
                        padding: '3px 8px',
                        backgroundColor: 'var(--surface-3)',
                        borderRadius: '4px',
                        color: 'var(--text-primary)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      {sub}
                      <button
                        type="button"
                        onClick={() => {
                          const updatedSubs = categoriaEmEdicao.subcategorias.filter((_, i) => i !== idx);
                          setCategoriaEmEdicao({ ...categoriaEmEdicao, subcategorias: updatedSubs });
                        }}
                        style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type="text"
                    placeholder="Adicionar nova subcategoria..."
                    value={novaSubInput}
                    onChange={(e) => setNovaSubInput(e.target.value.toUpperCase())}
                    className="coliseu-input"
                    style={{ height: '32px', fontSize: '11px', flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!novaSubInput.trim()) return;
                      setCategoriaEmEdicao({
                        ...categoriaEmEdicao,
                        subcategorias: [...categoriaEmEdicao.subcategorias, novaSubInput.trim().toUpperCase()],
                      });
                      setNovaSubInput('');
                    }}
                    className="coliseu-btn coliseu-btn-secondary"
                    style={{ padding: '4px 12px', fontSize: '11px' }}
                  >
                    + Incluir
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setCategoriaEmEdicao(null)}
                  className="coliseu-btn coliseu-btn-secondary"
                  style={{ padding: '7px 14px', fontSize: '12px' }}
                >
                  Cancelar
                </button>
                <Button variant="primary" type="submit" style={{ padding: '7px 18px', fontSize: '12px' }}>
                  Salvar Alterações
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Edição Marca */}
      {marcaEmEdicao && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(3px)',
            zIndex: 11000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '480px',
              backgroundColor: 'var(--surface-1)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Editar Marca: {marcaEmEdicao.nome}
              </h3>
              <button
                type="button"
                onClick={() => setMarcaEmEdicao(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSalvarEdicaoMarca} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label className="coliseu-label" style={{ fontSize: '11px', marginBottom: '4px' }}>
                  Nome da Marca
                </label>
                <input
                  type="text"
                  required
                  value={marcaEmEdicao.nome}
                  onChange={(e) => setMarcaEmEdicao({ ...marcaEmEdicao, nome: e.target.value.toUpperCase() })}
                  className="coliseu-input"
                  style={{ height: '36px', fontSize: '13px', fontWeight: 600 }}
                />
              </div>

              <div>
                <label className="coliseu-label" style={{ fontSize: '11px', marginBottom: '4px' }}>
                  Fabricante / Razão Social
                </label>
                <input
                  type="text"
                  value={marcaEmEdicao.fabricante || ''}
                  onChange={(e) => setMarcaEmEdicao({ ...marcaEmEdicao, fabricante: e.target.value.toUpperCase() })}
                  className="coliseu-input"
                  style={{ height: '36px', fontSize: '12px' }}
                />
              </div>

              <div>
                <label className="coliseu-label" style={{ fontSize: '11px', marginBottom: '4px' }}>
                  Status
                </label>
                <select
                  value={marcaEmEdicao.status}
                  onChange={(e) => setMarcaEmEdicao({ ...marcaEmEdicao, status: e.target.value as any })}
                  className="coliseu-input"
                  style={{ height: '36px', fontSize: '12px' }}
                >
                  <option value="Ativo">Ativo</option>
                  <option value="Inativo">Inativo</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setMarcaEmEdicao(null)}
                  className="coliseu-btn coliseu-btn-secondary"
                  style={{ padding: '7px 14px', fontSize: '12px' }}
                >
                  Cancelar
                </button>
                <Button variant="primary" type="submit" style={{ padding: '7px 18px', fontSize: '12px' }}>
                  Salvar Alterações
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modais de Cadastro Rápido */}
      {isModalMarcaOpen && (
        <ModalCadastroRapidoMarca
          isOpen={isModalMarcaOpen}
          onClose={() => setIsModalMarcaOpen(false)}
          onMarcaCadastrada={(nova) => {
            carregarDados();
            showToast(`✅ Marca '${nova.nome}' cadastrada!`);
          }}
        />
      )}

      {isModalCatOpen && (
        <ModalCadastroRapidoCategoria
          isOpen={isModalCatOpen}
          onClose={() => setIsModalCatOpen(false)}
          categoriaSelecionadaPrevia={catSelecionadaPrevia}
          onCategoriaCadastrada={(novaCat, sub) => {
            carregarDados();
            showToast(`✅ Categoria '${novaCat.nome}' salva com sucesso!`);
          }}
        />
      )}
    </div>
  );
};
