import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Trash2, ChevronLeft, ChevronRight, Copy, RotateCcw, Shield, Layers, HelpCircle, Search, Target, Percent, TrendingUp, Sparkles, FolderTree, Edit2, Plus } from 'lucide-react';
import { BIService } from '../services/biApi';
import api from '../services/api';
import ModalMetasMarca from './ModalMetasMarca';
import { useAuthStore } from '../store/authStore';
import BulkReplicateModal from './BulkReplicateModal';
import ModalCadastroGrupo from './ModalCadastroGrupo';
import './GerenciadorMetas.css';

interface Goal {
  id: number;
  tipo: string;
  referencia_id: number;
  data_referencia: string;
  valor_meta: number;
  periodo: string;
  nome_referencia: string;
  detalhado_por_marca?: boolean;
}

export default function GerenciadorMetas() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s: any) => s.user);

  const permissions = useMemo(() => user?.permissions || [], [user]);
  const isMaster = user?.role === 'master';

  const canManageSeller = isMaster || permissions.includes('bi_goals') || permissions.includes('bi_goals_seller') || permissions.includes('cadastro_metas');
  const canManagePromoter = isMaster || permissions.includes('bi_goals') || permissions.includes('bi_goals_promoter') || permissions.includes('cadastro_metas');

  const allowedTabs = useMemo(() => {
    const tabs: ('vendedor' | 'promotora' | 'marca' | 'grupo')[] = [];
    if (canManageSeller) {
      tabs.push('vendedor');
      tabs.push('marca');
    }
    if (canManagePromoter) {
      tabs.push('promotora');
      tabs.push('grupo');
    }
    return tabs;
  }, [canManageSeller, canManagePromoter]);

  // Filters State
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [entityType, setEntityType] = useState<'vendedor' | 'promotora' | 'marca' | 'grupo'>('vendedor');

  useEffect(() => {
    if (allowedTabs.length > 0 && !allowedTabs.includes(entityType)) {
      setEntityType(allowedTabs[0]);
    }
  }, [allowedTabs, entityType]);

  const [metric, setMetric] = useState<'faturamento' | 'pedidos' | 'ticket'>('faturamento');

  // Modal States
  const [brandModalOpen, setBrandModalOpen] = useState(false);
  const [selectedEntityForBrands, setSelectedEntityForBrands] = useState<{ id: number; nome: string } | null>(null);
  
  const [replicateModalOpen, setReplicateModalOpen] = useState(false);
  const [replicateMode, setReplicateMode] = useState<'replicate' | 'zero'>('replicate');
  const [searchTerm, setSearchTerm] = useState('');

  // Product Groups management states
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<any>(null);

  // Master Lists Queries
  const { data: sellers = [] } = useQuery<any[]>({
    queryKey: ['goalsSellers'],
    queryFn: BIService.getSellersList
  });

  const { data: brandsList = [] } = useQuery<any[]>({
    queryKey: ['goalsBrands'],
    queryFn: BIService.getBrandsList
  });

  const { data: lojas = [] } = useQuery<any[]>({
    queryKey: ['goalsLojas'],
    queryFn: BIService.getLojasList
  });

  const { data: usersList = [] } = useQuery<any[]>({
    queryKey: ['goalsUsers'],
    queryFn: async () => {
      const res = await api.get('/usuarios');
      return res.data;
    }
  });

  // Extract promoters from users list
  const promoters = usersList.filter((u: any) => u.is_promotora === true && u.ativo === true);

  // Fetch Product Groups
  const { data: groupsList = [], refetch: refetchGroups } = useQuery<any[]>({
    queryKey: ['goalsGroupsList'],
    queryFn: BIService.getGroupsList,
    enabled: entityType === 'grupo'
  });

  const deleteGroupMutation = useMutation({
    mutationFn: BIService.deleteGroup,
    onSuccess: () => {
      refetchGroups();
      alert('Grupo de produtos excluído com sucesso.');
    },
    onError: (err: any) => {
      alert(`Erro ao excluir grupo: ${err.response?.data?.error || err.message}`);
    }
  });

  const handleDeleteGroup = (id: number) => {
    if (window.confirm('Tem certeza que deseja excluir este grupo de produtos?')) {
      deleteGroupMutation.mutate(id);
    }
  };

  // Fetch Goals List
  const { data: goalsData, isLoading } = useQuery<{ meta_total_empresa: number; metas: Goal[] }>({
    queryKey: ['goalsList', entityType, metric, month, year],
    queryFn: () => BIService.getGoalsList({
      tipo_entidade: entityType,
      metric,
      month,
      year
    }),
    enabled: entityType !== 'grupo'
  });

  const goalsList = goalsData?.metas || [];
  const metaTotalEmpresa = goalsData?.meta_total_empresa || 0;

  // Local grid values state
  const [localValues, setLocalValues] = useState<Record<number, string>>({});

  useEffect(() => {
    const map: Record<number, string> = {};
    if (goalsList && goalsList.length > 0) {
      goalsList.forEach(g => {
        map[g.referencia_id] = g.valor_meta.toString();
      });
    }
    // Pre-populate empty elements for other items in list
    let list: any[] = [];
    if (entityType === 'vendedor') list = sellers;
    else if (entityType === 'promotora') list = promoters;
    else if (entityType === 'marca') list = brandsList;
    else if (entityType === 'grupo') list = groupsList;

    list.forEach(item => {
      const refId = item.id_firebird || item.id;
      if (map[refId] === undefined) {
        map[refId] = '';
      }
    });

    setLocalValues(map);
  }, [goalsData, entityType, sellers, brandsList, groupsList, usersList]);

  // Mutations
  const saveBatchMutation = useMutation({
    mutationFn: BIService.batchUpsertGoals,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goalsList'] });
      alert('Metas em lote salvas com sucesso!');
    },
    onError: (err: any) => {
      alert(`Erro ao salvar metas: ${err.response?.data?.error || err.message}`);
    }
  });

  const saveSingleSellerGoalMutation = useMutation({
    mutationFn: BIService.saveSellerGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goalsList'] });
      setBrandModalOpen(false);
      setSelectedEntityForBrands(null);
      alert('Detalhamento de marcas salvo com sucesso!');
    },
    onError: (err: any) => {
      alert(`Erro ao salvar detalhamento: ${err.response?.data?.error || err.message}`);
    }
  });

  const saveSinglePromoterGoalMutation = useMutation({
    mutationFn: BIService.savePromotoraGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goalsList'] });
      setBrandModalOpen(false);
      setSelectedEntityForBrands(null);
      alert('Detalhamento de marcas da promotora salvo com sucesso!');
    },
    onError: (err: any) => {
      alert(`Erro ao salvar detalhamento: ${err.response?.data?.error || err.message}`);
    }
  });

  const deleteGoalMutation = useMutation({
    mutationFn: BIService.deleteGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goalsList'] });
      alert('Meta removida com sucesso.');
    },
    onError: (err: any) => {
      alert(`Erro ao excluir meta: ${err.response?.data?.error || err.message}`);
    }
  });

  const bulkReplicateMutation = useMutation({
    mutationFn: BIService.bulkReplicateGoals,
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['goalsList'] });
      setReplicateModalOpen(false);
      alert(data.message || 'Metas replicadas com sucesso!');
    },
    onError: (err: any) => {
      alert(`Erro na replicação: ${err.response?.data?.error || err.message}`);
    }
  });

  const zeroGoalsMutation = useMutation({
    mutationFn: BIService.zeroGoals,
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['goalsList'] });
      setReplicateModalOpen(false);
      alert(data.message || 'Metas zeradas com sucesso!');
    },
    onError: (err: any) => {
      alert(`Erro ao zerar: ${err.response?.data?.error || err.message}`);
    }
  });

  const copyBrandsMutation = useMutation({
    mutationFn: async (payload: { vendedor_id: number; mes: number; ano: number }) => {
      const res = await api.post('/goals/copy-brands-next-month', payload);
      return res.data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['goalsList'] });
      alert(data.message || 'Metas por marca copiadas com sucesso!');
    },
    onError: (err: any) => {
      alert(`Erro ao copiar metas: ${err.response?.data?.error || err.message}`);
    }
  });

  const handleCopyBrandsNextMonth = (vendedorId: number, nome: string) => {
    let nextM = month + 1;
    let nextY = year;
    if (nextM > 12) {
      nextM = 1;
      nextY += 1;
    }
    const confirmMsg = `Deseja copiar as metas de marcas do vendedor ${nome} de ${String(month).padStart(2, '0')}/${year} para o próximo mês (${String(nextM).padStart(2, '0')}/${nextY})?`;
    if (window.confirm(confirmMsg)) {
      copyBrandsMutation.mutate({
        vendedor_id: vendedorId,
        mes: month,
        ano: year
      });
    }
  };

  // Action Handlers
  const handleValueChange = (refId: number, val: string) => {
    setLocalValues(prev => ({
      ...prev,
      [refId]: val
    }));
  };

  const handleSaveGrid = () => {
    if (entityType === 'promotora') {
      alert('Para promotoras, o cadastro deve ser feito pelo detalhamento por marca clicando no botão "Marcas".');
      return;
    }

    const items: { referencia_id: number; valor: number }[] = [];
    let list: any[] = [];
    if (entityType === 'vendedor') list = sellers;
    else if (entityType === 'marca') list = brandsList;
    else if ((entityType as string) === 'loja') list = lojas;

    list.forEach(item => {
      const refId = item.id_firebird || item.id;
      const val = parseFloat(localValues[refId]);
      if (!isNaN(val) && val >= 0) {
        items.push({
          referencia_id: refId,
          valor: val
        });
      }
    });

    if (items.length === 0) {
      alert('Nenhum valor para salvar.');
      return;
    }

    const dateRef = `${year}-${String(month).padStart(2, '0')}-01`;
    saveBatchMutation.mutate({
      tipo_meta: metric,
      tipo_entidade: entityType,
      data_referencia: dateRef,
      periodo: 'mensal',
      metas: items
    });
  };

  const handleDeleteGoal = (goalId: number) => {
    if (window.confirm('Tem certeza que deseja remover esta meta?')) {
      deleteGoalMutation.mutate(goalId);
    }
  };

  const handleSaveBrandsDetail = (entityId: number, total: number, metasPorMarca: any[], metasPorGrupo?: any[]) => {
    if (entityType === 'promotora') {
      saveSinglePromoterGoalMutation.mutate({
        vendedor_id: entityId,
        mes: month,
        ano: year,
        valor_meta_total: total,
        metas_por_marca: metasPorMarca,
        metas_por_grupo: metasPorGrupo
      });
    } else {
      saveSingleSellerGoalMutation.mutate({
        vendedor_id: entityId,
        mes: month,
        ano: year,
        valor_meta_total: total,
        metas_por_marca: metasPorMarca,
        tipo_meta: metric
      });
    }
  };

  const handlePrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(y => y - 1);
    } else {
      setMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(y => y + 1);
    } else {
      setMonth(m => m + 1);
    }
  };

  // Compile entities matching tab
  const getEntitiesList = () => {
    let list: any[] = [];
    if (entityType === 'vendedor') {
      list = sellers.map(s => ({ id: s.id, nome: s.nome }));
    } else if (entityType === 'promotora') {
      list = promoters.map(p => ({ id: p.id, nome: p.nome }));
    } else if (entityType === 'marca') {
      list = brandsList.map(b => ({ id: b.id, nome: b.nome }));
    } else if ((entityType as string) === 'loja') {
      list = lojas.map(l => ({ id: l.id, nome: l.nome }));
    }
    return list;
  };

  const mergedList = () => {
    const entities = getEntitiesList();
    const filtered = entities.filter(ent => 
      ent.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return filtered.map(ent => {
      const existing = goalsList.find(g => g.referencia_id === ent.id);
      return {
        id: ent.id,
        nome: ent.nome,
        goal_id: existing?.id,
        detalhado: existing?.detalhado_por_marca || (entityType === 'promotora' && existing),
        valor: localValues[ent.id] !== undefined ? localValues[ent.id] : (existing?.valor_meta?.toString() || '')
      };
    });
  };

  // Statistics Calculations (based on the full list of entities, ignoring search filter for accuracy)
  const entities = getEntitiesList();
  const totalEntitiesCount = entities.length;
  
  const allMergedEntities = entities.map(ent => {
    const existing = goalsList.find(g => g.referencia_id === ent.id);
    return {
      valor: localValues[ent.id] !== undefined ? localValues[ent.id] : (existing?.valor_meta?.toString() || '')
    };
  });
  
  const filledEntitiesCount = allMergedEntities.filter(item => parseFloat(item.valor) > 0).length;
  const fillPercentage = totalEntitiesCount > 0 ? Math.round((filledEntitiesCount / totalEntitiesCount) * 100) : 0;
  
  const activeValues = allMergedEntities
    .map(item => parseFloat(item.valor) || 0)
    .filter(val => val > 0);
  const averageGoal = activeValues.length > 0 ? activeValues.reduce((acc, val) => acc + val, 0) / activeValues.length : 0;

  // Quick fill and auto distribute helper actions
  const handleDistributeEqually = () => {
    const totalInput = prompt("Digite o valor total a ser distribuído igualmente entre todas as entidades:");
    if (totalInput === null) return;
    const totalVal = parseFloat(totalInput);
    if (isNaN(totalVal) || totalVal <= 0) {
      alert("Por favor, digite um valor numérico válido maior que zero.");
      return;
    }
    const entities = getEntitiesList();
    if (entities.length === 0) return;
    const equalShare = (totalVal / entities.length).toFixed(2);
    
    const newValues = { ...localValues };
    entities.forEach(ent => {
      newValues[ent.id] = equalShare;
    });
    setLocalValues(newValues);
    alert(`R$ ${totalVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} foi distribuído igualmente (${entities.length} parcelas de R$ ${parseFloat(equalShare).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}). Clique em "Salvar Grid" para confirmar.`);
  };

  const handleApplyFixedValue = () => {
    const valueInput = prompt("Digite o valor fixo para aplicar a todas as entidades:");
    if (valueInput === null) return;
    const fixedVal = parseFloat(valueInput);
    if (isNaN(fixedVal) || fixedVal < 0) {
      alert("Por favor, digite um valor numérico válido.");
      return;
    }
    const entities = getEntitiesList();
    
    const newValues = { ...localValues };
    entities.forEach(ent => {
      newValues[ent.id] = fixedVal.toString();
    });
    setLocalValues(newValues);
    alert(`Valor de R$ ${fixedVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} aplicado a todas as entidades. Clique em "Salvar Grid" para confirmar.`);
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in text-text-primary">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-xl font-semibold">Gestão de Metas</h2>
          <p className="text-text-secondary text-sm">Defina e gerencie metas de vendedores, promotoras, marcas e lojas.</p>
        </div>
        {entityType !== 'grupo' && (
          <div className="flex gap-3">
            <button
              onClick={() => {
                setReplicateMode('replicate');
                setReplicateModalOpen(true);
              }}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-bg-primary hover:bg-bg-secondary border border-border rounded-xl text-sm font-medium transition-all"
            >
              <Copy size={16} />
              <span>Replicar Mês</span>
            </button>
            <button
              onClick={() => {
                setReplicateMode('zero');
                setReplicateModalOpen(true);
              }}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/15 dark:hover:bg-red-950/30 border border-red-200 dark:border-red-900/20 rounded-xl text-red-600 dark:text-red-400 text-sm font-medium transition-all"
            >
              <RotateCcw size={16} />
              <span>Zerar Período</span>
            </button>
            {entityType !== 'promotora' && (
              <button
                onClick={handleSaveGrid}
                disabled={saveBatchMutation.isPending}
                className="flex items-center justify-center gap-1.5 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-semibold shadow-sm transition-all"
              >
                <Save size={16} />
                <span>{saveBatchMutation.isPending ? 'Salvando...' : 'Salvar Grid'}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Dashboard of Summaries */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Total Planejado */}
        <div className="bg-gradient-to-br from-brand-500 to-brand-600 text-white rounded-2xl p-6 shadow-md border border-brand-400/20 relative overflow-hidden flex flex-col justify-between min-h-[140px]">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full translate-x-8 -translate-y-8 blur-xl pointer-events-none"></div>
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-white/80 block mb-1">Total de Metas Planejado</span>
              <span className="text-2xl font-bold font-mono tracking-tight block">
                {metric === 'pedidos' 
                  ? `${Math.round(metaTotalEmpresa)} Pedidos` 
                  : `R$ ${metaTotalEmpresa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              </span>
            </div>
            <div className="bg-white/10 p-2.5 rounded-xl border border-white/10 backdrop-blur-sm">
              <Target size={20} className="text-white" />
            </div>
          </div>
          <div className="text-[11px] text-white/70 mt-4 flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-lg w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
            <span>Mês de referência: {String(month).padStart(2, '0')}/{year}</span>
          </div>
        </div>

        {/* Card 2: Progresso das Entidades */}
        <div className="bg-bg-primary rounded-2xl p-6 shadow-sm border border-border flex flex-col justify-between min-h-[140px]">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-text-secondary block mb-1">Status de Cadastro</span>
              <span className="text-2xl font-bold text-text-primary block">
                {filledEntitiesCount} de {totalEntitiesCount} <span className="text-xs text-text-secondary font-medium font-sans">Cadastrados</span>
              </span>
            </div>
            <div className="bg-brand-50 text-brand-500 dark:bg-brand-950/20 dark:text-brand-400 p-2.5 rounded-xl border border-brand-100 dark:border-brand-900/10">
              <Percent size={20} />
            </div>
          </div>
          
          <div className="mt-4 space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-text-secondary">
              <span>Progresso</span>
              <span>{fillPercentage}%</span>
            </div>
            <div className="w-full h-2 bg-bg-secondary rounded-full overflow-hidden border border-border/40">
              <div 
                className="h-full bg-brand-500 rounded-full transition-all duration-500" 
                style={{ width: `${fillPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Card 3: Média Calculada */}
        <div className="bg-bg-primary rounded-2xl p-6 shadow-sm border border-border flex flex-col justify-between min-h-[140px]">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-text-secondary block mb-1">Média por Entidade</span>
              <span className="text-2xl font-bold font-mono tracking-tight text-text-primary block">
                {metric === 'pedidos'
                  ? `${Math.round(averageGoal)} Pedidos`
                  : `R$ ${averageGoal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              </span>
            </div>
            <div className="bg-green-50 text-green-500 dark:bg-green-950/20 dark:text-green-400 p-2.5 rounded-xl border border-green-100 dark:border-green-900/10">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="text-[11px] text-text-secondary mt-4">
            Calculado com base em {activeValues.length} entidades com metas ativas
          </div>
        </div>
      </div>

      {/* Filter & Actions Toolbar */}
      <div className="bg-bg-primary rounded-2xl border border-border p-5 shadow-sm space-y-4">
        {/* Row 1: Filters */}
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
          {/* Month Arrows */}
          <div className="flex items-center gap-3">
            <span className="text-text-secondary text-xs uppercase font-bold tracking-wider">Período:</span>
            <div className="flex items-center bg-bg-secondary border border-border rounded-xl p-1">
              <button onClick={handlePrevMonth} className="p-1.5 hover:bg-bg-primary rounded-lg text-text-secondary hover:text-text-primary transition-colors">
                <ChevronLeft size={16} />
              </button>
              <span className="font-mono text-sm font-bold min-w-[100px] text-center select-none">
                {String(month).padStart(2, '0')}/{year}
              </span>
              <button onClick={handleNextMonth} className="p-1.5 hover:bg-bg-primary rounded-lg text-text-secondary hover:text-text-primary transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Entity Tabs */}
          <div className="flex items-center gap-3">
            <span className="text-text-secondary text-xs uppercase font-bold tracking-wider">Módulo:</span>
            <div className="flex bg-bg-secondary border border-border rounded-xl p-1 gap-1 w-full sm:w-auto">
              {allowedTabs.map(type => (
                <button
                  key={type}
                  onClick={() => {
                    setEntityType(type);
                    setSearchTerm(''); // Clear search on tab switch
                  }}
                  className={`flex-1 sm:flex-initial px-4 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all ${
                    entityType === type
                      ? 'bg-bg-primary text-text-primary shadow-sm border border-border/60'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {type === 'grupo' ? 'Grupo' : type === 'promotora' ? 'Promotoras' : type === 'marca' ? 'Marcas' : 'Vendedores'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Separator */}
        <hr className="border-border/60" />

        {/* Row 2: Search & Quick Fill Tools */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
          {/* Quick Search */}
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input
              type="text"
              placeholder={`Pesquisar ${entityType === 'grupo' ? 'grupo' : entityType === 'promotora' ? 'promotora' : entityType === 'marca' ? 'marca' : 'vendedor'}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-bg-secondary border border-border hover:border-text-secondary/30 focus:border-brand-500 rounded-xl text-sm focus:outline-none transition-all"
            />
          </div>

          {/* Quick Fill Actions or New Group Button */}
          {entityType === 'grupo' && (
            <button
              onClick={() => {
                setEditingGroup(null);
                setGroupModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-semibold shadow-sm transition-all"
            >
              <Plus size={16} />
              <span>Novo Grupo</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid Table */}
      <div className="bg-bg-primary rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-bg-secondary/40 text-text-secondary text-xs uppercase font-semibold">
                <th className="p-4 pl-6">{entityType === 'grupo' ? 'Nome do Grupo' : `Nome (${entityType})`}</th>
                <th className="p-4 text-right w-[250px]">{entityType === 'grupo' ? 'Itens Vinculados' : `Meta (${metric === 'pedidos' ? 'Qtd' : 'R$'})`}</th>
                <th className="p-4 text-center w-[150px]">Status</th>
                <th className="p-4 text-right pr-6 w-[180px]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && entityType !== 'grupo' ? (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-text-secondary">
                    <div className="flex flex-col items-center gap-2 justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-brand-500 border-t-transparent"></div>
                      <span>Carregando metas...</span>
                    </div>
                  </td>
                </tr>
              ) : mergedList().length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-text-secondary text-sm">
                    {searchTerm 
                      ? 'Nenhum resultado encontrado para a pesquisa.'
                      : entityType === 'promotora' 
                        ? 'Nenhuma promotora cadastrada. Vá em "Gestão de Usuários" para marcar usuários como promotora.' 
                        : entityType === 'grupo'
                          ? 'Nenhum grupo de produtos cadastrado. Clique em "+ Novo Grupo" para criar.'
                          : `Nenhuma entidade (${entityType}) disponível.`}
                  </td>
                </tr>
              ) : (
                mergedList().map((item: any) => {
                  const isDefined = item.goal_id || (entityType === 'promotora' && item.valor && parseFloat(item.valor) > 0);
                  
                  // Item lists attributes if group type
                  const marcasCount = item.itens?.filter((i: any) => i.marca_id !== null).length || 0;
                  const produtosCount = item.itens?.filter((i: any) => i.produto_id_firebird !== null).length || 0;

                  return (
                    <tr 
                      key={item.id} 
                      className={`border-b border-border/40 hover:bg-bg-secondary/10 transition-colors animate-row ${isDefined ? 'row-defined' : ''}`}
                    >
                      <td className="p-4 pl-6 font-medium text-text-primary capitalize">{item.nome}</td>
                      <td className="p-4 text-right font-semibold">
                        {entityType === 'grupo' ? (
                          <div className="inline-flex items-center gap-1.5 justify-end text-xs font-semibold text-text-secondary">
                            {marcasCount > 0 && (
                              <span className="bg-bg-secondary border border-border px-2 py-0.5 rounded-md">
                                {marcasCount} Marca(s)
                              </span>
                            )}
                            {produtosCount > 0 && (
                              <span className="bg-bg-secondary border border-border px-2 py-0.5 rounded-md">
                                {produtosCount} Produto(s)
                              </span>
                            )}
                            {marcasCount === 0 && produtosCount === 0 && (
                              <span className="text-text-secondary opacity-60">Sem itens</span>
                            )}
                          </div>
                        ) : entityType === 'promotora' || item.detalhado ? (
                          <div className="inline-flex items-center gap-2 justify-end">
                            <span className="text-sm font-semibold font-mono text-brand-600 dark:text-brand-400">
                              {item.valor 
                                ? parseFloat(item.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
                                : '0,00'}
                            </span>
                            <span className="text-[10px] bg-brand-500/10 text-brand-600 dark:text-brand-400 font-bold px-1.5 py-0.5 rounded border border-brand-500/20">
                              Distribuído
                            </span>
                          </div>
                        ) : (
                          <div className="relative inline-flex items-center justify-end">
                            {metric !== 'pedidos' && (
                              <span className="absolute left-3 text-xs text-text-secondary font-mono pointer-events-none select-none">R$</span>
                            )}
                            <input
                              type="number"
                              placeholder="0,00"
                              value={item.valor}
                              onChange={(e) => handleValueChange(item.id, e.target.value)}
                              className={`metas-input-goal ${metric !== 'pedidos' ? '!pl-8' : ''} ${parseFloat(item.valor) > 0 ? 'filled' : ''} ${item.read_only ? 'opacity-70 bg-bg-secondary cursor-not-allowed' : ''}`}
                              step={metric === 'pedidos' ? '1' : '0.01'}
                              disabled={item.read_only}
                            />
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {entityType === 'grupo' ? (
                          <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 text-xs bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20 font-medium">
                            Ativo
                          </span>
                        ) : isDefined ? (
                          <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 text-xs bg-green-500/10 px-2.5 py-0.5 rounded-full border border-green-500/20 font-medium">
                            Definida
                          </span>
                        ) : (
                          <span className="text-text-secondary text-xs opacity-60">Não Definida</span>
                        )}
                      </td>
                      <td className="p-4 text-right pr-6">
                        <div className="flex items-center justify-end gap-2">
                          {entityType === 'grupo' ? (
                            <>
                              <button
                                onClick={() => {
                                  setEditingGroup(groupsList.find((g: any) => g.id === item.id));
                                  setGroupModalOpen(true);
                                }}
                                className="p-1.5 hover:bg-bg-secondary rounded-lg text-text-secondary hover:text-text-primary transition-colors"
                                title="Editar Grupo"
                              >
                                <Edit2 size={15} />
                              </button>
                              <button
                                onClick={() => handleDeleteGroup(item.id)}
                                className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
                                title="Excluir Grupo"
                              >
                                <Trash2 size={15} />
                              </button>
                            </>
                          ) : (
                            <>
                              {/* Brand detailing button */}
                              {(entityType === 'vendedor' || entityType === 'promotora') && (
                                <button
                                  onClick={() => {
                                    setSelectedEntityForBrands({ id: item.id, nome: item.nome });
                                    setBrandModalOpen(true);
                                  }}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-brand-600 hover:bg-brand-50 border border-brand-100 hover:border-brand-200 transition-colors"
                                  title={entityType === 'promotora' ? "Associar Marcas/Grupos" : "Editar Metas por Marca"}
                                >
                                  <Layers size={14} />
                                  <span>{entityType === 'promotora' ? 'Associar' : 'Marcas'}</span>
                                </button>
                              )}
                              
                              {/* Copy seller brand goals to next month */}
                              {entityType === 'vendedor' && item.goal_id && (
                                <button
                                  onClick={() => handleCopyBrandsNextMonth(item.id, item.nome)}
                                  className="p-1.5 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/20 rounded-lg transition-colors"
                                  title="Copiar marcas para o próximo mês"
                                >
                                  <Copy size={15} />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Instructions footer */}
      <div className="flex items-start gap-2 text-xs text-text-secondary bg-bg-secondary/40 p-4 border border-border rounded-xl">
        <HelpCircle size={16} className="text-brand-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-text-primary">Dicas de uso:</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>As metas das marcas são somadas e consolidadas automaticamente a partir do que for configurado por marca nos vendedores.</li>
            <li>Para detalhar metas por marca de um vendedor, clique no botão <strong>Marcas</strong> da linha correspondente.</li>
            <li>Para promotoras, você pode associar metas por marcas ou por grupos de produtos clicando no botão <strong>Associar</strong>.</li>
            <li>Utilize o botão <strong>Replicar Mês</strong> para copiar metas de um período para o outro aplicando taxas de reajustes.</li>
          </ul>
        </div>
      </div>

      {/* Brand Detailed Modal */}
      {brandModalOpen && selectedEntityForBrands && (
        <ModalMetasMarca
          isOpen={brandModalOpen}
          onClose={() => {
            setBrandModalOpen(false);
            setSelectedEntityForBrands(null);
          }}
          onSave={handleSaveBrandsDetail}
          vendedor={selectedEntityForBrands}
          month={month}
          year={year}
          tipoMeta={metric}
          isPromotora={entityType === 'promotora'}
          metaGeral={parseFloat(mergedList().find(item => item.id === selectedEntityForBrands.id)?.valor || '0') || 0}
        />
      )}

      {/* Bulk Replicate / Zero Modal */}
      {replicateModalOpen && (
        <BulkReplicateModal
          isOpen={replicateModalOpen}
          onClose={() => setReplicateModalOpen(false)}
          isLoading={bulkReplicateMutation.isPending || zeroGoalsMutation.isPending}
          tipoEntidade={entityType}
          metric={metric}
          currentMonth={month}
          currentYear={year}
          mode={replicateMode}
          onConfirm={(payload) => {
            if (replicateMode === 'replicate') {
              bulkReplicateMutation.mutate(payload);
            } else {
              zeroGoalsMutation.mutate(payload);
            }
          }}
        />
      )}

      {/* Product Group creation/edit modal */}
      {groupModalOpen && (
        <ModalCadastroGrupo
          isOpen={groupModalOpen}
          onClose={() => {
            setGroupModalOpen(false);
            setEditingGroup(null);
          }}
          onSave={() => {
            setGroupModalOpen(false);
            setEditingGroup(null);
            refetchGroups();
            alert('Grupo de produtos salvo com sucesso!');
          }}
          groupToEdit={editingGroup}
        />
      )}
    </div>
  );
}
