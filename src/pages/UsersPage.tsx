import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Search, UserPlus, Edit2, Lock, Unlock, KeyRound, Users, UserCheck, UserX, ChevronDown, CheckCircle2 } from 'lucide-react';
import { Funcionario, funcionariosService } from '../lib/funcionarios';
import { useAuth } from '../contexts/AuthContext';
import { ModalCadastroFuncionario } from '../components/admin/ModalCadastroFuncionario';

export const UsersPage: React.FC = () => {
  const { funcionario: authFunc } = useAuth();
  const empresaId = authFunc?.empresa_id || 'default';

  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [grupos, setGrupos] = useState<Array<{ id: string; nome: string }>>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState('Todos');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFuncionario, setSelectedFuncionario] = useState<Funcionario | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadFuncionarios = useCallback(async () => {
    try {
      const data = await funcionariosService.listar(empresaId);
      setFuncionarios(data);
    } catch (error) {
      console.error("Erro ao carregar funcionários:", error);
      setFuncionarios([]);
    }

    try {
      const grps = await funcionariosService.listarGrupos();
      if (grps) {
        setGrupos(grps.map(g => ({ id: g.id, nome: g.nome })));
      }
    } catch (error) {
      console.error("Erro ao carregar grupos:", error);
    }
  }, [empresaId]);

  useEffect(() => {
    loadFuncionarios();
  }, [loadFuncionarios]);

  const handleNovo = () => {
    setSelectedFuncionario(null);
    setIsModalOpen(true);
  };

  const handleEditar = (func: Funcionario) => {
    setSelectedFuncionario(func);
    setIsModalOpen(true);
  };

  const handleToggleBlock = async (func: Funcionario) => {
    try {
      if (func.status === 'BLOQUEADO') {
        await funcionariosService.desbloquear(func.id);
        showToast(`✅ Funcionário ${func.nome} desbloqueado.`);
      } else {
        await funcionariosService.bloquear(func.id);
        showToast(`🔒 Funcionário ${func.nome} bloqueado.`);
      }
      loadFuncionarios();
    } catch (error) {
      console.error("Erro ao alterar status:", error);
      alert("Erro ao alterar status do funcionário.");
    }
  };

  const handleResetPassword = async (func: Funcionario) => {
    const newPass = prompt(`Digite a nova senha para ${func.nome}:`);
    if (!newPass) return;
    
    try {
      await funcionariosService.resetarSenha(func.id, newPass);
      showToast(`🔑 Senha de ${func.nome} redefinida com sucesso.`);
    } catch (error) {
      console.error("Erro ao resetar senha:", error);
      alert("Erro ao resetar senha.");
    }
  };

  const handleModalSaved = () => {
    showToast("✅ Funcionário salvo com sucesso!");
    loadFuncionarios();
  };

  const filteredFuncionarios = useMemo(() => {
    return funcionarios.filter(f => {
      const matchSearch = searchTerm === '' || 
        f.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (f.email || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchTipo = tipoFilter === 'Todos' || f.tipo_funcionario === tipoFilter;
      const matchStatus = statusFilter === 'Todos' || f.status === statusFilter;

      return matchSearch && matchTipo && matchStatus;
    });
  }, [funcionarios, searchTerm, tipoFilter, statusFilter]);

  // KPIs
  const totalFuncionarios = funcionarios.length;
  const ativos = funcionarios.filter(f => f.status === 'ATIVO').length;
  const inativosBloqueados = funcionarios.filter(f => f.status !== 'ATIVO').length;
  const vendedores = funcionarios.filter(f => f.tipo_funcionario.includes('VENDEDOR') || f.tipo_funcionario.includes('REPRESENTANTE')).length;

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
        title="Gestão de Funcionários & Operadores"
        description="Cadastro completo de funcionários, vendedores, motoristas e operadores do sistema."
        breadcrumbItems={[
          { label: 'Administração', active: false },
          { label: 'Funcionários', active: true },
        ]}
        primaryAction={{
          label: 'Novo Funcionário',
          onClick: handleNovo,
          icon: <UserPlus size={14} />,
        }}
      />

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--spacing-4)', marginBottom: 'var(--spacing-4)' }}>
        <div className="coliseu-card" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-4)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}><Users size={14}/> Total Funcionários</div>
          <div style={{ fontSize: '28px', fontWeight: 600, color: 'var(--text-primary)' }}>{totalFuncionarios}</div>
        </div>
        <div className="coliseu-card" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-4)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}><UserCheck size={14}/> Ativos</div>
          <div style={{ fontSize: '28px', fontWeight: 600, color: 'var(--text-primary)' }}>{ativos}</div>
        </div>
        <div className="coliseu-card" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-4)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}><UserX size={14}/> Inativos/Bloqueados</div>
          <div style={{ fontSize: '28px', fontWeight: 600, color: 'var(--text-primary)' }}>{inativosBloqueados}</div>
        </div>
        <div className="coliseu-card" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-4)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}><Users size={14}/> Vendedores</div>
          <div style={{ fontSize: '28px', fontWeight: 600, color: 'var(--text-primary)' }}>{vendedores}</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="coliseu-card" style={{ display: 'flex', gap: '16px', marginBottom: 'var(--spacing-4)', alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <Input
            placeholder="Buscar por nome, código ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search size={14} />}
          />
        </div>
        <div style={{ width: '200px' }}>
          <select className="coliseu-input" value={tipoFilter} onChange={e => setTipoFilter(e.target.value)}>
            <option value="Todos">Todos os Tipos</option>
            <option value="USUARIO">USUARIO</option>
            <option value="FUNCIONARIO">FUNCIONARIO</option>
            <option value="VENDEDOR">VENDEDOR</option>
            <option value="MOTORISTA">MOTORISTA</option>
            <option value="RESP_TECNICO">RESP_TECNICO</option>
            <option value="ENCARREGADO">ENCARREGADO</option>
            <option value="REPRESENTANTE">REPRESENTANTE</option>
          </select>
        </div>
        <div style={{ width: '200px' }}>
          <select className="coliseu-input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="Todos">Todos os Status</option>
            <option value="ATIVO">ATIVO</option>
            <option value="INATIVO">INATIVO</option>
            <option value="BLOQUEADO">BLOQUEADO</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="coliseu-card">
        <div className="coliseu-table-container">
          <table className="coliseu-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Nome</th>
                <th>Tipo</th>
                <th>Grupo de Acesso</th>
                <th style={{ textAlign: 'center' }}>Status</th>
                <th>Último Login</th>
                <th style={{ textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredFuncionarios.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '24px' }}>
                    Nenhum funcionário encontrado.
                  </td>
                </tr>
              ) : (
                filteredFuncionarios.map(f => (
                  <tr key={f.id}>
                    <td style={{ fontFamily: 'var(--font-family-mono)', fontSize: '11px', fontWeight: 600, color: 'var(--action-primary)' }}>
                      {f.codigo}
                    </td>
                    <td>{f.nome}</td>
                    <td>{f.tipo_funcionario}</td>
                    <td>{f.grupo_acesso_nome || '-'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <StatusBadge status={f.status} />
                    </td>
                    <td>
                      {f.ultimo_login ? new Date(f.ultimo_login).toLocaleString() : 'Nunca'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button
                          className="coliseu-btn coliseu-btn-secondary coliseu-btn--sm"
                          onClick={() => handleEditar(f)}
                          title="Editar"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="coliseu-btn coliseu-btn-secondary coliseu-btn--sm"
                          onClick={() => handleToggleBlock(f)}
                          title={f.status === 'BLOQUEADO' ? 'Desbloquear' : 'Bloquear'}
                        >
                          {f.status === 'BLOQUEADO' ? <Unlock size={14} /> : <Lock size={14} />}
                        </button>
                        <button
                          className="coliseu-btn coliseu-btn-secondary coliseu-btn--sm"
                          onClick={() => handleResetPassword(f)}
                          title="Resetar Senha"
                        >
                          <KeyRound size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ModalCadastroFuncionario
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        funcionario={selectedFuncionario}
        onSaved={handleModalSaved}
        gruposAcesso={grupos}
      />
    </div>
  );
};
