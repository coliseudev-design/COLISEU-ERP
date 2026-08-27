import { useState, useEffect } from 'react';
import { X, Save, Loader2, AlertTriangle, Search } from 'lucide-react';
import { BIService } from '../services/biApi';

interface Brand {
  id: number;
  nome: string;
}

interface ModalMetasMarcaProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    vendedorId: number,
    total: number,
    metasPorMarca: { marca_id: number; valor_meta: number }[],
    metasPorGrupo?: { grupo_id: number; valor_meta: number }[]
  ) => void;
  vendedor: { id: number; nome: string } | null;
  month: number;
  year: number;
  tipoMeta?: string;
  isPromotora?: boolean;
  metaGeral?: number;
}

export default function ModalMetasMarca({
  isOpen,
  onClose,
  onSave,
  vendedor,
  month,
  year,
  tipoMeta = 'faturamento',
  isPromotora = false,
  metaGeral = 0
}: ModalMetasMarcaProps) {
  const [marcas, setMarcas] = useState<Brand[]>([]);
  const [metas, setMetas] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Product groups goals states for promoters
  const [metasType, setMetasType] = useState<'marcas' | 'grupos'>('marcas');
  const [gruposList, setGruposList] = useState<any[]>([]);
  const [metasGrupo, setMetasGrupo] = useState<Record<string, number>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [onlyWithGoals, setOnlyWithGoals] = useState(false);

  useEffect(() => {
    if (isOpen && vendedor) {
      setError(null);
      if (isPromotora && metasType === 'grupos') {
        loadGrupos();
        loadExistingGroupGoals();
      } else {
        loadMarcas();
        loadExistingGoals();
      }
    }
  }, [isOpen, vendedor, month, year, metasType]);

  const loadExistingGoals = async () => {
    if (!vendedor) return;
    setLoadingData(true);
    try {
      const data = isPromotora
        ? await BIService.getPromotoraBrandGoals(vendedor.id, { mes: month, ano: year })
        : await BIService.getSellerBrandGoals(vendedor.id, { mes: month, ano: year, tipo_meta: tipoMeta });
      
      const metasList = data.metas_por_marca || [];
      const metasMap: Record<string, number> = {};
      
      metasList.forEach((m: any) => {
        metasMap[String(m.marca_id)] = parseFloat(m.valor_meta || 0);
      });
      setMetas(metasMap);
    } catch (err) {
      console.error("Error loading existing brand goals", err);
      setMetas({});
    } finally {
      setLoadingData(false);
    }
  };

  const loadExistingGroupGoals = async () => {
    if (!vendedor) return;
    setLoadingData(true);
    try {
      const data = await BIService.getPromotoraGroupGoals(vendedor.id, { mes: month, ano: year });
      const metasMap: Record<string, number> = {};
      
      data.forEach((m: any) => {
        metasMap[String(m.grupo_id)] = parseFloat(m.valor_meta || 0);
      });
      setMetasGrupo(metasMap);
    } catch (err) {
      console.error("Error loading existing group goals", err);
      setMetasGrupo({});
    } finally {
      setLoadingData(false);
    }
  };

  const loadMarcas = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await BIService.getBrandsList();
      if (!data || data.length === 0) {
        setError('Nenhuma marca encontrada. Verifique a sincronização de marcas.');
      }
      setMarcas(data || []);
    } catch (err: any) {
      console.error("Error loading brands", err);
      setError('Erro ao carregar marcas: ' + err.message);
      setMarcas([]);
    } finally {
      setLoading(false);
    }
  };

  const loadGrupos = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await BIService.getGroupsList();
      if (!data || data.length === 0) {
        setError('Nenhum grupo de produtos encontrado. Crie um grupo na aba correspondente.');
      }
      setGruposList(data || []);
    } catch (err: any) {
      console.error("Error loading groups", err);
      setError('Erro ao carregar grupos: ' + err.message);
      setGruposList([]);
    } finally {
      setLoading(false);
    }
  };

  const handleValueChange = (id: number, val: string) => {
    const key = String(id);
    if (isPromotora && metasType === 'grupos') {
      setMetasGrupo(prev => ({
        ...prev,
        [key]: parseFloat(val) || 0
      }));
    } else {
      setMetas(prev => ({
        ...prev,
        [key]: parseFloat(val) || 0
      }));
    }
  };

  const handleSave = () => {
    if (!vendedor) return;
    
    if (isPromotora && metasType === 'grupos') {
      const metasPorGrupo = Object.keys(metasGrupo)
        .map(grupoId => ({
          grupo_id: parseInt(grupoId, 10),
          valor_meta: parseFloat(metasGrupo[grupoId] as any) || 0
        }))
        .filter(m => m.valor_meta > 0);
      
      const totalCalculado = metasPorGrupo.reduce((acc, m) => acc + m.valor_meta, 0);
      onSave(vendedor.id, totalCalculado, [], metasPorGrupo);
    } else {
      const metasPorMarca = Object.keys(metas)
        .map(marcaId => ({
          marca_id: parseInt(marcaId, 10),
          valor_meta: parseFloat(metas[marcaId] as any) || 0
        }))
        .filter(m => m.valor_meta > 0);

      const totalCalculado = metasPorMarca.reduce((acc, m) => acc + m.valor_meta, 0);
      onSave(vendedor.id, totalCalculado, metasPorMarca);
    }
  };

  const calculateTotal = () => {
    const activeMetas = isPromotora && metasType === 'grupos' ? metasGrupo : metas;
    return Object.values(activeMetas).reduce((acc, val) => acc + (parseFloat(val as any) || 0), 0);
  };

  const hasExistingBrandGoals = Object.values(metas).some(val => val > 0) || Object.values(metasGrupo).some(val => val > 0);
  const isLockedByGeneralGoal = !isPromotora && metaGeral > 0 && !hasExistingBrandGoals;

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setOnlyWithGoals(false);
    }
  }, [isOpen]);

  const filteredMarcas = marcas.filter(m => {
    const matchesSearch = m.nome.toLowerCase().includes(searchTerm.toLowerCase());
    if (onlyWithGoals) {
      const val = metas[String(m.id)] || 0;
      return matchesSearch && val > 0;
    }
    return matchesSearch;
  });

  const filteredGrupos = gruposList.filter(g => {
    const matchesSearch = g.nome.toLowerCase().includes(searchTerm.toLowerCase());
    if (onlyWithGoals) {
      const val = metasGrupo[String(g.id)] || 0;
      return matchesSearch && val > 0;
    }
    return matchesSearch;
  });

  if (!isOpen || !vendedor) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
      <div className="bg-bg-primary rounded-2xl shadow-xl border border-border w-full max-w-xl flex flex-col max-h-[90vh] overflow-hidden animate-fade-in text-text-primary">
        <div className="p-5 border-b border-border flex justify-between items-center bg-bg-secondary/50">
          <div>
            <h3 className="font-semibold text-lg">Metas por Marca ou Grupo</h3>
            <span className="text-xs text-text-secondary">
              {vendedor.nome} - Mês {String(month).padStart(2, '0')}/{year} {isPromotora ? '(Promotora)' : ''}
            </span>
          </div>
          <button className="text-text-secondary hover:text-text-primary transition-colors" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Lock Warning Banner */}
        {isLockedByGeneralGoal && (
          <div className="p-4 bg-amber-500/10 border-b border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs flex gap-2.5 items-start">
            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-sm">Trava de Meta Geral Ativa</p>
              <p className="leading-relaxed">
                Este vendedor já possui uma meta geral de <strong>{metaGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong> definida no grid principal. Para habilitar o detalhamento de metas por marca, você deve primeiro zerar a meta dele no grid e salvar.
              </p>
            </div>
          </div>
        )}

        {/* Type selector for Promoters */}
        {isPromotora && (
          <div className="px-5 py-3 bg-bg-secondary/35 border-b border-border flex gap-3 items-center">
            <span className="text-xs font-bold text-text-secondary uppercase">Definir por:</span>
            <div className="flex bg-bg-secondary border border-border rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setMetasType('marcas')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  metasType === 'marcas'
                    ? 'bg-bg-primary text-text-primary shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Marcas
              </button>
              <button
                type="button"
                onClick={() => setMetasType('grupos')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  metasType === 'grupos'
                    ? 'bg-bg-primary text-text-primary shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Grupos de Produtos
              </button>
            </div>
          </div>
        )}

        {/* Search and filter bar */}
        <div className="px-5 py-3 border-b border-border flex items-center gap-3 bg-bg-secondary/20 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
            <input
              type="text"
              placeholder="Pesquisar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-bg-primary border border-border focus:border-brand-500 rounded-xl text-xs focus:outline-none transition-all"
            />
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-text-secondary cursor-pointer hover:text-text-primary transition-all">
            <input
              type="checkbox"
              checked={onlyWithGoals}
              onChange={(e) => setOnlyWithGoals(e.target.checked)}
              className="rounded border-border text-brand-500 focus:ring-brand-500"
            />
            <span>Somente Marcas com Metas</span>
          </label>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading || loadingData ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-text-secondary">
              <Loader2 className="animate-spin text-brand-500" size={32} />
              <span>Carregando dados...</span>
            </div>
          ) : error ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-red-500">
              <AlertTriangle size={32} />
              <span>{error}</span>
              <button 
                onClick={metasType === 'grupos' ? loadGrupos : loadMarcas} 
                className="mt-2 px-4 py-2 bg-bg-secondary border border-border rounded-xl text-text-primary hover:bg-bg-primary transition-all text-sm font-medium"
              >
                Tentar novamente
              </button>
            </div>
          ) : (
            <div className="overflow-hidden border border-border rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-bg-secondary/40 text-text-secondary text-xs uppercase font-semibold">
                    <th className="p-3">{metasType === 'grupos' ? 'Grupo de Produtos' : 'Marca'}</th>
                    <th className="p-3 text-right">Valor da Meta (R$)</th>
                  </tr>
                </thead>
                <tbody>
                  {metasType === 'grupos' ? (
                    filteredGrupos.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="p-8 text-center text-text-secondary text-sm">
                          Nenhum grupo de produtos disponível.
                        </td>
                      </tr>
                    ) : (
                      filteredGrupos.map(grupo => {
                        const key = String(grupo.id);
                        const hasValue = (metasGrupo[key] || 0) > 0;
                        return (
                          <tr key={grupo.id} className="border-b border-border/50 hover:bg-bg-secondary/20 transition-colors">
                            <td className="p-3 text-sm font-medium">{grupo.nome}</td>
                            <td className="p-3 text-right">
                              <input
                                type="number"
                                placeholder="0,00"
                                value={metasGrupo[key] || ''}
                                onChange={(e) => handleValueChange(grupo.id, e.target.value)}
                                className={`w-36 p-2 rounded-lg border outline-none text-right text-sm transition-all focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-bg-primary text-text-primary ${
                                  hasValue 
                                    ? 'border-brand-500 bg-brand-500/5 font-semibold text-brand-600 dark:text-brand-400' 
                                    : 'border-border'
                                }`}
                                step="0.01"
                                disabled={isLockedByGeneralGoal}
                              />
                            </td>
                          </tr>
                        );
                      })
                    )
                  ) : (
                    filteredMarcas.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="p-8 text-center text-text-secondary text-sm">
                          Nenhuma marca disponível.
                        </td>
                      </tr>
                    ) : (
                      filteredMarcas.map(marca => {
                        const key = String(marca.id);
                        const hasValue = (metas[key] || 0) > 0;
                        return (
                          <tr key={marca.id} className="border-b border-border/50 hover:bg-bg-secondary/20 transition-colors">
                            <td className="p-3 text-sm font-medium">{marca.nome}</td>
                            <td className="p-3 text-right">
                              <input
                                type="number"
                                placeholder="0,00"
                                value={metas[key] || ''}
                                onChange={(e) => handleValueChange(marca.id, e.target.value)}
                                className={`w-36 p-2 rounded-lg border outline-none text-right text-sm transition-all focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-bg-primary text-text-primary ${
                                  hasValue 
                                    ? 'border-brand-500 bg-brand-500/5 font-semibold text-brand-600 dark:text-brand-400' 
                                    : 'border-border'
                                }`}
                                step="0.01"
                                disabled={isLockedByGeneralGoal}
                              />
                            </td>
                          </tr>
                        );
                      })
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-border bg-bg-secondary/30 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="font-semibold text-text-primary text-sm sm:text-base">
            Total Distribuído: <span className="text-brand-500">R$ {calculateTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <button 
              className="flex-1 sm:flex-initial px-4 py-2 border border-border rounded-xl text-text-secondary hover:bg-bg-secondary transition-colors text-sm font-medium" 
              onClick={onClose}
            >
              Cancelar
            </button>
            <button 
              className={`flex-1 sm:flex-initial px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl flex items-center justify-center gap-1.5 transition-colors text-sm font-semibold shadow-sm ${
                isLockedByGeneralGoal ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              onClick={handleSave}
              disabled={isLockedByGeneralGoal}
            >
              <Save size={16} /> 
              <span>Salvar Detalhes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
