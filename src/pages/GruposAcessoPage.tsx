import React, { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { 
  Edit2, Plus, Power, PowerOff, CheckCircle2, X, Trash2, Search, 
  CheckSquare, Square, ChevronDown, ChevronRight, ShieldCheck, Check
} from 'lucide-react';
import { 
  funcionariosService, 
  GrupoAcesso as GrupoAcessoType, 
  GrupoAcessoPermissao,
  CATALOGO_PERMISSOES,
  CategoriaPermissao
} from '../lib/funcionarios';

export const GruposAcessoPage: React.FC = () => {
  const [grupos, setGrupos] = useState<GrupoAcessoType[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGrupo, setEditingGrupo] = useState<GrupoAcessoType | null>(null);

  // Form State
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [permissoesMap, setPermissoesMap] = useState<Record<string, boolean>>({});
  
  // Search & UI in Modal
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadGrupos = async () => {
    try {
      const data = await funcionariosService.listarGrupos();
      setGrupos(data || []);
    } catch (e) {
      console.error("Erro ao listar grupos:", e);
      showToast("Erro ao carregar grupos do backend.");
    }
  };

  useEffect(() => {
    loadGrupos();
  }, []);

  // Total de permissões no catálogo
  const totalPermissoesCatalogo = useMemo(() => {
    return CATALOGO_PERMISSOES.reduce((acc, cat) => acc + cat.permissoes.length, 0);
  }, []);

  // Contagem de permissões marcadas no formulário
  const totalPermissoesMarcadas = useMemo(() => {
    return Object.values(permissoesMap).filter(Boolean).length;
  }, [permissoesMap]);

  // Filtragem de categorias com base no termo de busca
  const categoriasFiltradas = useMemo(() => {
    if (!searchTerm.trim()) {
      return CATALOGO_PERMISSOES;
    }
    const term = searchTerm.toLowerCase();
    return CATALOGO_PERMISSOES.map(cat => {
      const permsFiltradas = cat.permissoes.filter(
        p => p.label.toLowerCase().includes(term) || p.key.toLowerCase().includes(term)
      );
      return {
        ...cat,
        permissoes: permsFiltradas
      };
    }).filter(cat => cat.permissoes.length > 0 || cat.nome.toLowerCase().includes(term));
  }, [searchTerm]);

  const handleOpenModal = async (g?: GrupoAcessoType) => {
    setSearchTerm('');
    // Expande todas as categorias por padrão
    const allExp: Record<string, boolean> = {};
    CATALOGO_PERMISSOES.forEach(c => { allExp[c.id] = true; });
    setExpandedCategories(allExp);

    if (g) {
      setEditingGrupo(g);
      setNome(g.nome);
      setDescricao(g.descricao || '');
      setAtivo(g.ativo === 1);

      try {
        const perms = await funcionariosService.listarPermissoesGrupo(g.id);
        const map: Record<string, boolean> = {};
        if (perms && perms.length > 0) {
          perms.forEach(p => {
            map[p.permissao_key] = p.concedida === 1;
          });
        }
        setPermissoesMap(map);
      } catch (e) {
        console.error("Erro ao listar permissões do grupo:", e);
        showToast("Erro ao carregar permissões do grupo.");
        setPermissoesMap({});
      }
    } else {
      setEditingGrupo(null);
      setNome('');
      setDescricao('');
      setAtivo(true);
      setPermissoesMap({});
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingGrupo(null);
  };

  const toggleCategory = (catId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [catId]: !prev[catId]
    }));
  };

  const handleTogglePermissao = (key: string) => {
    setPermissoesMap(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleMarcarTodos = () => {
    const map: Record<string, boolean> = {};
    CATALOGO_PERMISSOES.forEach(cat => {
      cat.permissoes.forEach(p => {
        map[p.key] = true;
      });
    });
    setPermissoesMap(map);
  };

  const handleDesmarcarTodos = () => {
    setPermissoesMap({});
  };

  const handleMarcarCategoria = (cat: CategoriaPermissao) => {
    setPermissoesMap(prev => {
      const next = { ...prev };
      cat.permissoes.forEach(p => {
        next[p.key] = true;
      });
      return next;
    });
  };

  const handleDesmarcarCategoria = (cat: CategoriaPermissao) => {
    setPermissoesMap(prev => {
      const next = { ...prev };
      cat.permissoes.forEach(p => {
        next[p.key] = false;
      });
      return next;
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      alert("O nome do grupo é obrigatório!");
      return;
    }

    const grupoData: GrupoAcessoType = {
      id: editingGrupo ? editingGrupo.id : '',
      nome: nome.trim(),
      descricao: descricao.trim() || undefined,
      is_sistema: editingGrupo ? editingGrupo.is_sistema : 0,
      ativo: ativo ? 1 : 0,
      percentual_max_desconto: 0,
      total_usuarios: editingGrupo ? editingGrupo.total_usuarios : 0
    };

    // Monta array de GrupoAcessoPermissao
    const permsPayload: GrupoAcessoPermissao[] = [];
    CATALOGO_PERMISSOES.forEach(cat => {
      cat.permissoes.forEach(p => {
        permsPayload.push({
          grupo_id: grupoData.id,
          permissao_key: p.key,
          concedida: permissoesMap[p.key] ? 1 : 0
        });
      });
    });

    try {
      await funcionariosService.salvarGrupo(grupoData, permsPayload);
      showToast(`Grupo '${nome}' salvo com sucesso!`);
      await loadGrupos();
      handleCloseModal();
    } catch (err: any) {
      console.error("Erro ao salvar grupo:", err);
      const msg = typeof err === 'string' ? err : err?.message || 'Erro ao salvar grupo';
      alert(`Erro: ${msg}`);
    }
  };

  const handleToggleStatus = async (g: GrupoAcessoType) => {
    const novoAtivo = g.ativo === 1 ? 0 : 1;
    const updatedG = { ...g, ativo: novoAtivo };

    try {
      const perms = await funcionariosService.listarPermissoesGrupo(g.id);
      await funcionariosService.salvarGrupo(updatedG, perms);
      setGrupos(prev => prev.map(x => x.id === g.id ? updatedG : x));
      showToast(`Status do grupo '${g.nome}' alterado com sucesso!`);
    } catch (e: any) {
      console.error(e);
      showToast("Erro ao alterar status do grupo.");
    }
  };

  const handleExcluir = async (g: GrupoAcessoType) => {
    if (g.is_sistema === 1) {
      alert("Grupos do sistema não podem ser excluídos!");
      return;
    }
    if (!confirm(`Deseja realmente excluir o grupo '${g.nome}'?`)) return;

    try {
      await funcionariosService.excluirGrupo(g.id);
      setGrupos(prev => prev.filter(x => x.id !== g.id));
      showToast(`Grupo '${g.nome}' excluído com sucesso!`);
    } catch (e: any) {
      console.error(e);
      const msg = typeof e === 'string' ? e : e?.message || 'Erro ao excluir grupo';
      alert(`Erro: ${msg}`);
    }
  };

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
        title="Grupos de Acesso & Permissões"
        description="Configuração de perfis de acesso e permissões granulares por recurso do sistema."
        breadcrumbItems={[
          { label: 'Administração', active: false },
          { label: 'Grupos de Acesso', active: true },
        ]}
        primaryAction={{
          label: 'Novo Grupo',
          onClick: () => handleOpenModal(),
          icon: <Plus size={14} aria-hidden="true" />,
        }}
      />

      <div className="coliseu-card">
        <div className="coliseu-table-container">
          <table className="coliseu-table">
            <thead>
              <tr>
                <th>Nome do Grupo</th>
                <th>Descrição</th>
                <th style={{ textAlign: 'center' }}>Nº Usuários</th>
                <th>Status</th>
                <th style={{ width: '130px', textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {grupos.map(g => (
                <tr 
                  key={g.id}
                  style={{ cursor: 'pointer' }}
                  onDoubleClick={() => handleOpenModal(g)}
                  title="Dê um duplo clique para editar este grupo"
                >
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <ShieldCheck size={16} style={{ color: 'var(--action-primary)' }} />
                      <span>{g.nome}</span>
                      {g.is_sistema === 1 && (
                        <span style={{ 
                          fontSize: '10px', 
                          padding: '1px 6px', 
                          borderRadius: '4px', 
                          backgroundColor: 'rgba(59, 130, 246, 0.1)', 
                          color: 'var(--action-primary)',
                          fontWeight: 600
                        }}>
                          SISTEMA
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{g.descricao || '—'}</td>
                  <td style={{ textAlign: 'center', fontWeight: 500 }}>{g.total_usuarios}</td>
                  <td>
                    <StatusBadge 
                      status={g.ativo === 1 ? 'success' : 'muted'} 
                      label={g.ativo === 1 ? 'Ativo' : 'Inativo'} 
                    />
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleOpenModal(g); }}
                        className="coliseu-btn coliseu-btn--secondary coliseu-btn--sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', height: '30px', padding: '0 10px', fontSize: '12px' }}
                        title="Editar Grupo e Permissões"
                      >
                        <Edit2 size={13} style={{ color: 'var(--action-primary)' }} />
                        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Editar</span>
                      </button>
                      <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleToggleStatus(g); }} 
                        className="coliseu-btn coliseu-btn--secondary coliseu-btn--sm"
                        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', padding: 0 }}
                        title={g.ativo === 1 ? 'Desativar Grupo' : 'Ativar Grupo'}
                        disabled={g.is_sistema === 1}
                      >
                        {g.ativo === 1 ? <PowerOff size={13} style={{ color: 'var(--action-danger)' }} /> : <Power size={13} style={{ color: 'var(--status-success)' }} />}
                      </button>
                      <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleExcluir(g); }} 
                        className="coliseu-btn coliseu-btn--secondary coliseu-btn--sm"
                        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', padding: 0 }}
                        title="Excluir Grupo"
                        disabled={g.is_sistema === 1}
                      >
                        <Trash2 size={13} style={{ color: g.is_sistema === 1 ? 'var(--text-muted)' : 'var(--action-danger)' }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {grupos.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    Nenhum grupo de acesso cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Cadastro / Edição com Permissões Granulares */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'var(--surface-overlay-heavy)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 'var(--z-modal)',
          padding: '16px'
        }}>
          <div style={{
            background: 'var(--surface-1)',
            borderRadius: 'var(--radius-lg)',
            width: '100%',
            maxWidth: '1020px',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
            border: '1px solid var(--border-subtle)'
          }}>
            {/* Header do Modal */}
            <div style={{ 
              padding: '16px 24px', 
              borderBottom: '1px solid var(--border-subtle)', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              backgroundColor: 'var(--surface-2)',
              borderTopLeftRadius: 'var(--radius-lg)',
              borderTopRightRadius: 'var(--radius-lg)'
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {editingGrupo ? `Editar Grupo: ${editingGrupo.nome}` : 'Novo Grupo de Acesso'}
                </h2>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Defina o nome do grupo e selecione as permissões granulares permitidas.
                </span>
              </div>
              <button 
                onClick={handleCloseModal} 
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  cursor: 'pointer', 
                  color: 'var(--text-muted)',
                  padding: '4px',
                  borderRadius: '4px'
                }}
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Conteúdo com Scroll */}
            <div style={{ overflowY: 'auto', padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <form id="grupo-form" onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Seção 1: Dados do Grupo */}
                <div style={{ 
                  padding: '16px', 
                  border: '1px solid var(--border-subtle)', 
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--surface-sunken)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
                    <div>
                      <label className="coliseu-label" style={{ fontWeight: 600 }}>Nome do Grupo *</label>
                      <input 
                        type="text" 
                        className="coliseu-input" 
                        value={nome} 
                        onChange={e => setNome(e.target.value)} 
                        placeholder="Ex: Vendedores, Operadores PDV, Financeiro"
                        required 
                        style={{ height: '38px', width: '100%' }}
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="coliseu-label">Descrição</label>
                      <input 
                        type="text" 
                        className="coliseu-input" 
                        value={descricao} 
                        onChange={e => setDescricao(e.target.value)} 
                        placeholder="Breve resumo das atribuições deste grupo de acesso"
                        style={{ height: '38px', width: '100%' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input 
                      type="checkbox" 
                      id="ativo-checkbox"
                      checked={ativo}
                      onChange={e => setAtivo(e.target.checked)}
                      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                    />
                    <label htmlFor="ativo-checkbox" style={{ fontSize: '13px', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 500 }}>
                      Grupo Ativo (usuários vinculados poderão acessar as telas liberadas)
                    </label>
                  </div>
                </div>

                {/* Seção 2: Permissões Granulares */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}>
                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                        Módulos de Acesso e Permissões Granulares
                      </h3>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        <strong>{totalPermissoesMarcadas}</strong> de <strong>{totalPermissoesCatalogo}</strong> permissões concedidas neste grupo
                      </span>
                    </div>

                    {/* Botões Globais de Marcar/Desmarcar */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Button 
                        type="button" 
                        variant="secondary" 
                        onClick={handleMarcarTodos} 
                        style={{ height: '32px', fontSize: '12px', padding: '0 10px' }}
                      >
                        <CheckSquare size={14} style={{ marginRight: '4px' }} />
                        Marcar Todos
                      </Button>
                      <Button 
                        type="button" 
                        variant="secondary" 
                        onClick={handleDesmarcarTodos} 
                        style={{ height: '32px', fontSize: '12px', padding: '0 10px' }}
                      >
                        <Square size={14} style={{ marginRight: '4px' }} />
                        Desmarcar Todos
                      </Button>
                    </div>
                  </div>

                  {/* Barra de Busca por Palavra-Chave */}
                  <div style={{ position: 'relative', width: '100%' }}>
                    <Search 
                      size={16} 
                      style={{ 
                        position: 'absolute', 
                        left: '12px', 
                        top: '50%', 
                        transform: 'translateY(-50%)', 
                        color: 'var(--text-muted)' 
                      }} 
                    />
                    <input 
                      type="text"
                      className="coliseu-input"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      placeholder="Buscar permissão por palavra-chave... (ex: cancelar venda, desconto, estoque, cupom, preço)"
                      style={{ 
                        width: '100%', 
                        height: '40px', 
                        paddingLeft: '38px',
                        paddingRight: searchTerm ? '36px' : '12px',
                        fontSize: '13px'
                      }}
                    />
                    {searchTerm && (
                      <button
                        type="button"
                        onClick={() => setSearchTerm('')}
                        style={{
                          position: 'absolute',
                          right: '10px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--text-muted)'
                        }}
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>

                  {/* Lista de Categorias e Checkboxes */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' }}>
                    {categoriasFiltradas.map(cat => {
                      const isExpanded = expandedCategories[cat.id] ?? true;
                      const marcadasNaCat = cat.permissoes.filter(p => permissoesMap[p.key]).length;

                      return (
                        <div 
                          key={cat.id}
                          style={{
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-md)',
                            overflow: 'hidden',
                            backgroundColor: 'var(--surface-1)'
                          }}
                        >
                          {/* Header da Categoria */}
                          <div 
                            style={{
                              padding: '10px 16px',
                              backgroundColor: 'var(--surface-2)',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              cursor: 'pointer',
                              userSelect: 'none',
                              borderBottom: isExpanded ? '1px solid var(--border-subtle)' : 'none'
                            }}
                            onClick={() => toggleCategory(cat.id)}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                              <span style={{ fontSize: '15px' }}>{cat.icone}</span>
                              <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
                                {cat.nome}
                              </span>
                              <span style={{ 
                                fontSize: '11px', 
                                padding: '2px 8px', 
                                borderRadius: '12px', 
                                backgroundColor: marcadasNaCat > 0 ? 'rgba(59, 130, 246, 0.15)' : 'var(--surface-sunken)',
                                color: marcadasNaCat > 0 ? 'var(--action-primary)' : 'var(--text-muted)',
                                fontWeight: 600
                              }}>
                                {marcadasNaCat} / {cat.permissoes.length}
                              </span>
                            </div>

                            {/* Ações Rápidas por Categoria */}
                            <div style={{ display: 'flex', gap: '6px' }} onClick={e => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => handleMarcarCategoria(cat)}
                                style={{
                                  background: 'none',
                                  border: '1px solid var(--border-subtle)',
                                  borderRadius: '4px',
                                  padding: '2px 8px',
                                  fontSize: '11px',
                                  cursor: 'pointer',
                                  color: 'var(--text-secondary)',
                                  backgroundColor: 'var(--surface-1)'
                                }}
                                title="Marcar todas desta categoria"
                              >
                                Marcar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDesmarcarCategoria(cat)}
                                style={{
                                  background: 'none',
                                  border: '1px solid var(--border-subtle)',
                                  borderRadius: '4px',
                                  padding: '2px 8px',
                                  fontSize: '11px',
                                  cursor: 'pointer',
                                  color: 'var(--text-secondary)',
                                  backgroundColor: 'var(--surface-1)'
                                }}
                                title="Desmarcar todas desta categoria"
                              >
                                Desmarcar
                              </button>
                            </div>
                          </div>

                          {/* Grid de Checkboxes da Categoria */}
                          {isExpanded && (
                            <div style={{ 
                              padding: '14px 16px', 
                              display: 'grid', 
                              gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', 
                              gap: '10px 20px',
                              backgroundColor: 'var(--surface-1)'
                            }}>
                              {cat.permissoes.map(p => {
                                const isChecked = !!permissoesMap[p.key];
                                return (
                                  <label 
                                    key={p.key}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'flex-start',
                                      gap: '10px',
                                      cursor: 'pointer',
                                      padding: '6px 8px',
                                      borderRadius: 'var(--radius-sm)',
                                      backgroundColor: isChecked ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
                                      transition: 'background-color 0.15s ease'
                                    }}
                                  >
                                    <input 
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => handleTogglePermissao(p.key)}
                                      style={{ 
                                        marginTop: '2px', 
                                        cursor: 'pointer',
                                        width: '16px',
                                        height: '16px',
                                        accentColor: 'var(--action-primary)'
                                      }}
                                    />
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                      <span style={{ 
                                        fontSize: '13px', 
                                        fontWeight: isChecked ? 600 : 400,
                                        color: isChecked ? 'var(--text-primary)' : 'var(--text-secondary)'
                                      }}>
                                        {p.label}
                                      </span>
                                      <span style={{ 
                                        fontSize: '10px', 
                                        color: 'var(--text-muted)', 
                                        fontFamily: 'var(--font-family-mono)' 
                                      }}>
                                        {p.key}
                                      </span>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {categoriasFiltradas.length === 0 && (
                      <div style={{ 
                        textAlign: 'center', 
                        padding: '32px', 
                        color: 'var(--text-muted)',
                        backgroundColor: 'var(--surface-sunken)',
                        borderRadius: 'var(--radius-md)'
                      }}>
                        Nenhuma permissão encontrada para o termo "{searchTerm}".
                      </div>
                    )}
                  </div>
                </div>
              </form>
            </div>
            
            {/* Footer do Modal */}
            <div style={{ 
              padding: '16px 24px', 
              borderTop: '1px solid var(--border-subtle)', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              backgroundColor: 'var(--surface-2)', 
              borderBottomLeftRadius: 'var(--radius-lg)', 
              borderBottomRightRadius: 'var(--radius-lg)' 
            }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Total selecionado: <strong>{totalPermissoesMarcadas}</strong> permissões
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button variant="secondary" type="button" onClick={handleCloseModal}>
                  Cancelar
                </Button>
                <Button variant="primary" type="submit" form="grupo-form">
                  <Check size={16} style={{ marginRight: '6px' }} />
                  Salvar Grupo
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
