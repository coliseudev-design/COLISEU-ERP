import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import DataTable from '../components/DataTable'
import { Shield, Plus, Check, X, ShieldAlert, Edit, Banknote } from 'lucide-react'
import { useAuthStore } from '../store/authStore'

interface GroupRow {
  id: number
  nome: string
  versao: string
  layout_version?: string
}

interface PermissionRow {
  recurso: string
  pode_acessar: boolean
}

interface PermissionModule {
  id: string
  label: string
  category: string
  description?: string
}

const DASH_1_0_MODULES: PermissionModule[] = [
  { id: 'inicio', label: 'Visão Estratégica (Início)', category: 'Módulos do Sistema' },
  { id: 'bi_sales', label: 'Visão Consolidada & Comercial', category: 'Módulos do Sistema' },
  { id: 'bi_finance', label: 'Financeiro', category: 'Módulos do Sistema' },
  { id: 'bi_abc', label: 'Gestão de Inventário', category: 'Módulos do Sistema' },
  
  // Ações de Usuários
  { id: 'usuarios', label: 'Acessar Tela de Usuários', category: 'Gestão de Usuários & Ações', description: 'Permite visualizar o menu e a lista de usuários' },
  { id: 'usuarios_criar', label: 'Ação: Novo Usuário', category: 'Gestão de Usuários & Ações', description: 'Permite cadastrar novos acessos no sistema' },
  { id: 'usuarios_grupos', label: 'Ação: Grupos de Acesso', category: 'Gestão de Usuários & Ações', description: 'Permite alterar os grupos de acesso dos usuários' },
  { id: 'usuarios_filiais', label: 'Ação: Filiais de Acesso', category: 'Gestão de Usuários & Ações', description: 'Permite definir filiais visíveis para o usuário' },
  { id: 'reset_senha', label: 'Ação: Resetar Senha', category: 'Gestão de Usuários & Ações', description: 'Permite redefinir a senha do usuário para 123456' },
  { id: 'usuarios_status', label: 'Ação: Inativar / Ativar', category: 'Gestão de Usuários & Ações', description: 'Permite inativar ou reativar contas de usuários' },
  { id: 'usuarios_versao', label: 'Ação: Alterar Versão Ativa', category: 'Gestão de Usuários & Ações', description: 'Permite trocar o layout (Dash 1.0 / B.I IA.) do usuário' }
]

const BI_IA_MODULES: PermissionModule[] = [
  { id: 'inicio', label: 'Visão Estratégica', category: 'Módulos do Sistema' },
  { id: 'bi_sales', label: 'Inteligência de Vendas', category: 'Módulos do Sistema' },
  { id: 'bi_hub', label: 'Hub de Vendas', category: 'Módulos do Sistema' },
  { id: 'bi_supplier', label: 'Hub do Fornecedor', category: 'Módulos do Sistema' },
  { id: 'bi_abc', label: 'Gestão de Inventário', category: 'Módulos do Sistema' },
  { id: 'bi_finance', label: 'Financeiro', category: 'Módulos do Sistema' },
  { id: 'bi_customer', label: 'Radar 360', category: 'Módulos do Sistema' },
  { id: 'bi_comparative', label: 'Lucratividade', category: 'Módulos do Sistema' },
  { id: 'bi_customer_analytics', label: 'Análise de Clientes', category: 'Módulos do Sistema' },
  { id: 'bi_goals', label: 'Análise de Metas', category: 'Módulos do Sistema' },
  { id: 'cadastro_metas', label: 'Cadastro de Metas', category: 'Módulos do Sistema' },
  { id: 'bi_heatmap', label: 'Mapa de Calor', category: 'Módulos do Sistema' },
  { id: 'bi_ai_insights', label: 'Coliseu AI', category: 'Módulos do Sistema' },

  // Ações de Usuários
  { id: 'usuarios', label: 'Acessar Tela de Usuários', category: 'Gestão de Usuários & Ações', description: 'Permite visualizar o menu e a lista de usuários' },
  { id: 'usuarios_criar', label: 'Ação: Novo Usuário', category: 'Gestão de Usuários & Ações', description: 'Permite cadastrar novos acessos no sistema' },
  { id: 'usuarios_grupos', label: 'Ação: Grupos de Acesso', category: 'Gestão de Usuários & Ações', description: 'Permite alterar os grupos de acesso dos usuários' },
  { id: 'usuarios_filiais', label: 'Ação: Filiais de Acesso', category: 'Gestão de Usuários & Ações', description: 'Permite definir filiais visíveis para o usuário' },
  { id: 'reset_senha', label: 'Ação: Resetar Senha', category: 'Gestão de Usuários & Ações', description: 'Permite redefinir a senha do usuário para 123456' },
  { id: 'usuarios_status', label: 'Ação: Inativar / Ativar', category: 'Gestão de Usuários & Ações', description: 'Permite inativar ou reativar contas de usuários' },
  { id: 'usuarios_versao', label: 'Ação: Alterar Versão Ativa', category: 'Gestão de Usuários & Ações', description: 'Permite trocar o layout (Dash 1.0 / B.I IA.) do usuário' }
]

function getAvailableModules(version: string): PermissionModule[] {
  if (version === 'Dash 1.0') return DASH_1_0_MODULES
  return BI_IA_MODULES
}

export default function Grupos() {
  const queryClient = useQueryClient()
  const activeUser = useAuthStore((s: any) => s.user) as any

  const ALL_VERSIONS = ['Dash 1.0', 'B.I IA.']
  const availableVersions = ALL_VERSIONS.filter(v => activeUser?.available_versions?.includes(v))
  const displayVersions = availableVersions.length > 0 ? availableVersions : ['Dash 1.0']

  const [activeTab, setActiveTab] = useState(() => {
    const currentLayout = activeUser?.versao || activeUser?.layout_version || 'Dash 1.0'
    return displayVersions.includes(currentLayout) ? currentLayout : displayVersions[0]
  })

  const [modalOpen, setModalOpen] = useState(false)
  const [permissionsModalOpen, setPermissionsModalOpen] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<GroupRow | null>(null)
  
  const [nome, setNome] = useState('')
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])
  const [errorMsg, setErrorMsg] = useState('')

  const [vendedoresTodos, setVendedoresTodos] = useState(true)
  const [selectedVendedores, setSelectedVendedores] = useState<number[]>([])
  const [allVendedores, setAllVendedores] = useState<{ id: number; nome: string }[]>([])

  useEffect(() => {
    if (permissionsModalOpen) {
      api.get('/grupos/vendedores')
        .then(res => setAllVendedores(res.data || []))
        .catch(err => console.error('Erro ao buscar vendedores', err))
    }
  }, [permissionsModalOpen])

  const availableModules = getAvailableModules(activeTab)

  const { data: groups, isLoading } = useQuery<GroupRow[]>({
    queryKey: ['grupos', activeTab],
    queryFn: async () => {
      const res = await api.get(`/grupos?versao=${activeTab}`)
      return res.data
    }
  })

  const createGroup = useMutation({
    mutationFn: async () => {
      const layoutPerm = activeTab === 'Dash 1.0' ? 'layout_1' : 'layout_3'
      const perms = [...selectedPermissions]
      if (!perms.includes(layoutPerm)) {
        perms.push(layoutPerm)
      }
      const res = await api.post('/grupos', {
        nome,
        versao: activeTab,
        permissions: perms
      })
      return res.data
    },
    onSuccess: () => {
      setModalOpen(false)
      setNome('')
      setSelectedPermissions([])
      queryClient.invalidateQueries({ queryKey: ['grupos', activeTab] })
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error || 'Erro ao criar grupo')
    }
  })

  const deleteGroup = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.delete(`/grupos/${id}`)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grupos', activeTab] })
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || 'Erro ao remover grupo')
    }
  })

  const updatePermissions = useMutation({
    mutationFn: async ({ id, permissions, vendedores_todos, vendedores }: { id: number, permissions: string[], vendedores_todos: boolean, vendedores: number[] }) => {
      const layoutPerm = selectedGroup?.versao === 'Dash 1.0' ? 'layout_1' : 'layout_3'
      const perms = [...permissions]
      if (!perms.includes(layoutPerm)) {
        perms.push(layoutPerm)
      }
      const res = await api.put(`/grupos/${id}/permissions`, { 
        permissions: perms,
        vendedores_todos,
        vendedores
      })
      return res.data
    },
    onSuccess: () => {
      setPermissionsModalOpen(false)
      setSelectedGroup(null)
      queryClient.invalidateQueries({ queryKey: ['grupos', activeTab] })
      alert('Permissões do grupo atualizadas com sucesso!')
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || 'Erro ao salvar permissões')
    }
  })

  const openPermissionsModal = async (group: GroupRow) => {
    setSelectedGroup(group)
    const groupModules = getAvailableModules(group.versao || activeTab)
    try {
      const res = await api.get(`/grupos/${group.id}/permissions`)
      const data = res.data
      const perms: PermissionRow[] = data.permissions || []
      let activeRecursos = perms
        .filter(p => p.pode_acessar && !['layout_1', 'layout_2', 'layout_3'].includes(p.recurso))
        .map(p => p.recurso)

      // Se for o grupo Administrador e não tiver registros salvos ainda, marcar tudo por padrão
      if (group.nome.toLowerCase() === 'administrador' && activeRecursos.length === 0) {
        activeRecursos = groupModules.map(m => m.id)
      }

      setSelectedPermissions(activeRecursos)
      setVendedoresTodos(data.vendedores_todos !== false)
      setSelectedVendedores(data.vendedores || [])
      setPermissionsModalOpen(true)
    } catch (err) {
      console.warn('Falha ao obter permissões do grupo, abrindo modal com valores padrão', err)
      if (group.nome.toLowerCase() === 'administrador') {
        setSelectedPermissions(groupModules.map(m => m.id))
      } else {
        setSelectedPermissions([])
      }
      setVendedoresTodos(true)
      setSelectedVendedores([])
      setPermissionsModalOpen(true)
    }
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    createGroup.mutate()
  }

  const handleSavePermissions = () => {
    if (!selectedGroup) return
    updatePermissions.mutate({ 
      id: selectedGroup.id, 
      permissions: selectedPermissions,
      vendedores_todos: vendedoresTodos,
      vendedores: selectedVendedores
    })
  }

  const togglePermission = (id: string) => {
    setSelectedPermissions(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-xl font-semibold text-text-primary">Gestão de Grupos de Acesso</h2>
          <p className="text-text-secondary text-sm">Configure perfis de acesso e permissões para a versão {activeTab}.</p>
        </div>
        <button
          onClick={() => {
            setSelectedPermissions(availableModules.map(m => m.id))
            setModalOpen(true)
          }}
          className="btn-primary flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl shadow-sm hover:shadow-md transition-all font-semibold"
        >
          <Plus size={18} />
          <span>Novo Grupo</span>
        </button>
      </div>

      {/* Abas de Versão */}
      {displayVersions.length > 1 && (
        <div className="flex border-b border-border gap-2">
          {displayVersions.map((version) => {
            const isActive = activeTab === version;
            return (
              <button
                key={version}
                onClick={() => setActiveTab(version)}
                className={`py-3 px-6 font-semibold text-sm transition-all border-b-2 -mb-[2px] ${
                  isActive
                    ? 'border-brand-500 text-brand-600'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}
              >
                {version}
              </button>
            );
          })}
        </div>
      )}

      <div className="bg-bg-primary rounded-2xl shadow-sm border border-border overflow-hidden">
        <DataTable
          loading={isLoading}
          data={groups || []}
          empty="Nenhum grupo cadastrado para esta versão."
          columns={[
            {
              key: 'nome',
              label: 'NOME DO GRUPO',
              render: (r: GroupRow) => (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-brand-50 text-brand-500 rounded-xl">
                    <Shield size={20} />
                  </div>
                  <span className="font-semibold text-text-primary text-base">{r.nome}</span>
                </div>
              )
            },
            {
              key: 'versao',
              label: 'VERSÃO',
              render: (r: GroupRow) => (
                <span className="text-xs font-bold font-mono bg-bg-secondary text-text-secondary px-2.5 py-1 rounded-md border border-divider">
                  {r.versao || r.layout_version}
                </span>
              )
            },
            {
              key: 'actions',
              label: 'AÇÕES',
              align: 'right',
              render: (r: GroupRow) => (
                <div className="flex items-end justify-end gap-2">
                  <button
                    onClick={() => openPermissionsModal(r)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-brand-600 hover:bg-brand-50 transition-colors"
                  >
                    <Edit size={16} />
                    <span>Permissões</span>
                  </button>
                  <button
                    onClick={() => {
                      if (r.nome === 'Administrador') {
                        alert('O grupo Administrador padrão não pode ser removido.')
                        return
                      }
                      if (confirm('Tem certeza que deseja remover este grupo?')) {
                        deleteGroup.mutate(r.id)
                      }
                    }}
                    disabled={deleteGroup.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-danger hover:bg-danger/10 transition-colors"
                  >
                    <X size={16} />
                    <span>Excluir</span>
                  </button>
                </div>
              )
            }
          ]}
        />
      </div>

      {/* Modal de Criação */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg-primary rounded-2xl shadow-xl border border-border w-full max-w-md overflow-hidden animate-fade-in">
            <div className="p-5 border-b border-border flex justify-between items-center bg-bg-secondary/50">
              <h3 className="font-semibold text-lg text-text-primary">Novo Grupo de Acesso</h3>
              <button onClick={() => setModalOpen(false)} className="text-text-secondary hover:text-text-primary">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-lg bg-danger/10 text-danger text-sm font-medium border border-danger/25">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Nome do Grupo</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Vendedores, Consultores..."
                  className="w-full px-4 py-2 border border-border rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-shadow outline-none bg-bg-primary text-text-primary"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                />
              </div>

              <div className="pt-2">
                <label className="block text-sm font-medium text-text-primary mb-2">Permissões Iniciais</label>
                <div className="space-y-4 max-h-60 overflow-y-auto border border-divider rounded-xl p-3 bg-bg-secondary/10">
                  {Array.from(new Set(availableModules.map(m => m.category))).map(category => (
                    <div key={category} className="space-y-1.5">
                      <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider px-1 border-b border-border/40 pb-1">
                        {category}
                      </div>
                      <div className="space-y-1 pl-1">
                        {availableModules.filter(m => m.category === category).map(mod => (
                          <label key={mod.id} className="flex items-start gap-2.5 cursor-pointer py-1.5 px-1 hover:bg-bg-secondary/40 rounded-lg transition-colors">
                            <input
                              type="checkbox"
                              checked={selectedPermissions.includes(mod.id)}
                              onChange={() => togglePermission(mod.id)}
                              className="rounded border-gray-300 text-brand-500 focus:ring-brand-500 w-4 h-4 mt-0.5"
                            />
                            <div className="flex flex-col">
                              <span className="text-xs font-semibold text-text-primary">{mod.label}</span>
                              {mod.description && (
                                <span className="text-[11px] text-text-muted leading-tight">{mod.description}</span>
                              )}
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-border text-text-secondary font-medium hover:bg-bg-secondary transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createGroup.isPending}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-medium transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  {createGroup.isPending ? 'Salvando...' : 'Criar Grupo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Permissões */}
      {permissionsModalOpen && selectedGroup && (() => {
        const modalModules = getAvailableModules(selectedGroup.versao || activeTab);
        return (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-bg-primary rounded-2xl shadow-xl border border-border w-full max-w-md overflow-hidden animate-fade-in">
              <div className="p-5 border-b border-border flex justify-between items-center bg-bg-secondary/50">
                <h3 className="font-semibold text-lg text-text-primary flex items-center gap-2">
                  <Shield className="text-brand-500" />
                  Permissões: <span className="font-bold text-text-primary">{selectedGroup.nome}</span>
                </h3>
                <button onClick={() => setPermissionsModalOpen(false)} className="text-text-secondary hover:text-text-primary">
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <p className="text-sm text-text-secondary">
                  Configure os recursos, páginas e ações permitidas para os membros deste grupo ({selectedGroup.versao}).
                </p>

                <div className="space-y-4 max-h-80 overflow-y-auto border border-divider rounded-xl p-3 bg-bg-secondary/10">
                  {Array.from(new Set(modalModules.map(m => m.category))).map(category => (
                    <div key={category} className="space-y-1.5">
                      <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider px-1 border-b border-border/40 pb-1">
                        {category}
                      </div>
                      <div className="space-y-1 pl-1">
                        {modalModules.filter(m => m.category === category).map(mod => (
                          <label key={mod.id} className="flex items-start gap-2.5 p-1.5 hover:bg-bg-secondary rounded-lg cursor-pointer transition-colors">
                            <input
                              type="checkbox"
                              checked={selectedPermissions.includes(mod.id)}
                              onChange={() => togglePermission(mod.id)}
                              className="w-4 h-4 mt-0.5 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                            />
                            <div className="flex flex-col">
                              <span className="text-xs font-semibold text-text-primary">{mod.label}</span>
                              {mod.description && (
                                <span className="text-[11px] text-text-muted leading-tight">{mod.description}</span>
                              )}
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

              <div className="border-t border-border pt-4">
                <h4 className="font-semibold text-sm text-text-primary mb-2">Controle de Acesso de Vendedores</h4>
                <label className="flex items-center gap-2 cursor-pointer py-1.5">
                  <input
                    type="checkbox"
                    checked={vendedoresTodos}
                    onChange={(e) => setVendedoresTodos(e.target.checked)}
                    className="rounded border-gray-300 text-brand-500 focus:ring-brand-500 w-4.5 h-4.5"
                  />
                  <span className="text-sm font-semibold text-text-primary">Todos os Vendedores</span>
                </label>
                
                {!vendedoresTodos && (
                  <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto border border-divider rounded-xl p-3 bg-bg-secondary/20">
                    {allVendedores.map(v => {
                      const isChecked = selectedVendedores.includes(v.id);
                      return (
                        <label key={v.id} className="flex items-center gap-2 cursor-pointer py-1">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              setSelectedVendedores(prev =>
                                isChecked ? prev.filter(id => id !== v.id) : [...prev, v.id]
                              );
                            }}
                            className="rounded border-gray-300 text-brand-500 focus:ring-brand-500 w-4 h-4"
                          />
                          <span className="text-xs text-text-secondary">{v.nome}</span>
                        </label>
                      );
                    })}
                    {allVendedores.length === 0 && (
                      <span className="text-xs text-text-muted italic">Nenhum vendedor cadastrado</span>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setPermissionsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-border text-text-secondary font-medium hover:bg-bg-secondary transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSavePermissions}
                  disabled={updatePermissions.isPending}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-medium transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  {updatePermissions.isPending ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    })()}
  </div>
)
}
