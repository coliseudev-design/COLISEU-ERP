import { useState, useEffect } from 'react';
import { X, Save, Loader2, Search, Check, AlertTriangle } from 'lucide-react';
import { BIService } from '../services/biApi';

interface ModalCadastroGrupoProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  groupToEdit?: any;
}

export default function ModalCadastroGrupo({
  isOpen,
  onClose,
  onSave,
  groupToEdit = null
}: ModalCadastroGrupoProps) {
  const [nome, setNome] = useState('');
  const [marcaId, setMarcaId] = useState<number | ''>('');
  const [selectAll, setSelectAll] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [marcas, setMarcas] = useState<any[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [selectedProdutos, setSelectedProdutos] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setNome(groupToEdit?.nome || '');
      setMarcaId('');
      setSelectAll(true);
      setProdutos([]);
      setSelectedProdutos([]);
      setSearchTerm('');
      setError(null);
      loadMarcas();
      
      if (groupToEdit) {
        // If editing, map loaded items
        const marcasItem = groupToEdit.itens?.filter((i: any) => i.marca_id !== null) || [];
        const produtosItem = groupToEdit.itens?.filter((i: any) => i.produto_id_firebird !== null) || [];
        
        if (marcasItem.length > 0) {
          setMarcaId(marcasItem[0].marca_id);
          setSelectAll(true);
        } else if (produtosItem.length > 0) {
          setSelectAll(false);
          // We will select the brand based on the first product's brand (requires products loaded)
          // For simplicity we will let the user pick the brand and products
          setSelectedProdutos(produtosItem.map((p: any) => p.produto_id_firebird));
        }
      }
    }
  }, [isOpen, groupToEdit]);

  // Load products when brand selection changes
  useEffect(() => {
    if (marcaId) {
      loadProdutos(marcaId);
    } else {
      setProdutos([]);
    }
  }, [marcaId]);

  const loadMarcas = async () => {
    setLoading(true);
    try {
      const data = await BIService.getBrandsList();
      setMarcas(data || []);
    } catch (err) {
      console.error("Error loading brands", err);
    } finally {
      setLoading(false);
    }
  };

  const loadProdutos = async (id: number) => {
    setLoading(true);
    try {
      const data = await BIService.getProductsByBrand(id);
      setProdutos(data || []);
    } catch (err) {
      console.error("Error loading products", err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleProduct = (prodId: string) => {
    setSelectedProdutos(prev => 
      prev.includes(prodId)
        ? prev.filter(id => id !== prodId)
        : [...prev, prodId]
    );
  };

  const handleSave = async () => {
    if (!nome.trim()) {
      alert('Por favor, informe o nome do grupo.');
      return;
    }
    if (!marcaId) {
      alert('Por favor, selecione uma marca.');
      return;
    }
    if (!selectAll && selectedProdutos.length === 0) {
      alert('Por favor, selecione pelo menos um produto ou marque "Todos os produtos".');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        id: groupToEdit?.id,
        nome: nome.trim(),
        marcas_ids: selectAll ? [Number(marcaId)] : [],
        produtos_ids: selectAll ? [] : selectedProdutos
      };
      
      await BIService.saveGroup(payload);
      onSave();
    } catch (err: any) {
      console.error("Error saving group", err);
      setError(err.response?.data?.error || err.message || 'Erro ao salvar grupo de produtos.');
    } finally {
      setSaving(false);
    }
  };

  const filteredProdutos = produtos.filter(p => 
    p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.codigo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
      <div className="bg-bg-primary rounded-2xl shadow-xl border border-border w-full max-w-xl flex flex-col max-h-[90vh] overflow-hidden animate-fade-in text-text-primary">
        <div className="p-5 border-b border-border flex justify-between items-center bg-bg-secondary/50">
          <div>
            <h3 className="font-semibold text-lg">{groupToEdit ? 'Editar Grupo' : 'Novo Grupo de Produtos'}</h3>
            <span className="text-xs text-text-secondary">Defina produtos ou marcas pertencentes ao grupo</span>
          </div>
          <button className="text-text-secondary hover:text-text-primary transition-colors" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm flex gap-2 items-center">
              <AlertTriangle size={18} />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
              Nome do Grupo
            </label>
            <input
              type="text"
              placeholder="Ex: Grupo Pet, Suplementos, etc."
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-border bg-bg-primary text-text-primary outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm"
              disabled={saving}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
                Marca de Referência
              </label>
              <select
                value={marcaId}
                onChange={(e) => setMarcaId(e.target.value ? Number(e.target.value) : '')}
                className="w-full p-2.5 rounded-xl border border-border bg-bg-primary text-text-primary outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm"
                disabled={saving || loading}
              >
                <option value="">Selecione uma marca...</option>
                {marcas.map(m => (
                  <option key={m.id} value={m.id}>{m.nome}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col justify-end pb-1">
              <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer py-2">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={(e) => setSelectAll(e.target.checked)}
                  className="rounded text-brand-500 focus:ring-brand-500 border-border bg-bg-primary h-4 w-4"
                  disabled={saving || !marcaId}
                />
                <span className="text-text-primary">Vincular todos os produtos desta marca</span>
              </label>
            </div>
          </div>

          {!selectAll && marcaId && (
            <div className="space-y-2 pt-2 border-t border-border/60">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary">
                  Selecionar Produtos ({selectedProdutos.length} selecionados)
                </label>
              </div>
              
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                <input
                  type="text"
                  placeholder="Pesquisar produtos da marca..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-border bg-bg-primary text-text-primary outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm"
                />
              </div>

              <div className="border border-border rounded-xl max-h-60 overflow-y-auto divide-y divide-border bg-bg-secondary/20">
                {loading ? (
                  <div className="p-8 flex justify-center items-center gap-2 text-text-secondary text-sm">
                    <Loader2 className="animate-spin text-brand-500" size={18} />
                    <span>Carregando produtos...</span>
                  </div>
                ) : filteredProdutos.length === 0 ? (
                  <div className="p-8 text-center text-text-secondary text-sm">
                    Nenhum produto encontrado.
                  </div>
                ) : (
                  filteredProdutos.map(prod => {
                    const isSelected = selectedProdutos.includes(prod.id);
                    return (
                      <div
                        key={prod.id}
                        onClick={() => handleToggleProduct(prod.id)}
                        className="p-3 flex items-center justify-between cursor-pointer hover:bg-bg-secondary/40 transition-colors"
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-text-primary">{prod.nome}</span>
                          <span className="text-xs text-text-secondary">Cód: {prod.codigo}</span>
                        </div>
                        <div className={`h-5 w-5 rounded-md border flex items-center justify-center transition-all ${
                          isSelected 
                            ? 'bg-brand-500 border-brand-500 text-white' 
                            : 'border-border bg-bg-primary'
                        }`}>
                          {isSelected && <Check size={14} />}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-border bg-bg-secondary/30 flex gap-3 justify-end">
          <button 
            className="px-4 py-2 border border-border rounded-xl text-text-secondary hover:bg-bg-secondary transition-colors text-sm font-medium" 
            onClick={onClose}
            disabled={saving}
          >
            Cancelar
          </button>
          <button 
            className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl flex items-center gap-1.5 transition-colors text-sm font-semibold shadow-sm"
            onClick={handleSave}
            disabled={saving || loading}
          >
            {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
            <span>{groupToEdit ? 'Atualizar Grupo' : 'Salvar Grupo'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
