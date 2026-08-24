// Serviço Centralizado de Gestão de Marcas, Categorias e Subcategorias

export interface CategoriaItem {
  id: string;
  nome: string;
  subcategorias: string[];
  margemPadrao?: number;    // Margem líquida sugerida para esta categoria (%)
  comissaoPadrao?: number;  // Comissão sugerida (%)
  cor?: string;
  ativo: boolean;
}

export interface MarcaItem {
  id: string;
  nome: string;
  fabricante?: string;
  cnpjFabricante?: string;
  status: 'Ativo' | 'Inativo';
}

const STORAGE_KEY_CATEGORIAS = 'coliseu_categorias_produtos';
const STORAGE_KEY_MARCAS = 'coliseu_marcas_produtos';

export const CATEGORIAS_PADRAO: CategoriaItem[] = [
  {
    id: 'CAT-01',
    nome: 'TINTAS & QUÍMICOS',
    subcategorias: ['VERNIZES & SELADORES', 'PRIMERS & FUNDOS', 'ESMALTES SINTÉTICOS', 'SOLVENTES & DILUENTES', 'MASSAS & COMPLEMENTOS', 'TINTAS LÁTEX & ACRÍLICAS'],
    margemPadrao: 25.0,
    comissaoPadrao: 4.0,
    cor: '#3b82f6',
    ativo: true,
  },
  {
    id: 'CAT-02',
    nome: 'MATERIAL BÁSICO & CONSTRUÇÃO',
    subcategorias: ['CIMENTOS & ARGAMASSAS', 'TELHAS & COBERTURAS', 'TIJOLOS & BLOCOS', 'AREIA & PEDRA', 'IMPERMEABILIZANTES', 'LAJES & VIGAS'],
    margemPadrao: 18.0,
    comissaoPadrao: 3.0,
    cor: '#f59e0b',
    ativo: true,
  },
  {
    id: 'CAT-03',
    nome: 'ELÉTRICA & ILUMINAÇÃO',
    subcategorias: ['FIOS & CABOS', 'TOMADAS & INTERRUPTORES', 'LÂMPADAS & PAINÉIS LED', 'DISJUNTORES & QUADROS', 'ELETRODUTOS & CONEXÕES', 'FITAS ISOLANTES'],
    margemPadrao: 30.0,
    comissaoPadrao: 5.0,
    cor: '#eab308',
    ativo: true,
  },
  {
    id: 'CAT-04',
    nome: 'HIDRÁULICA & CONEXÕES',
    subcategorias: ['TUBOS & CONEXÕES PVC', 'REGISTROS & VÁLVULAS', 'CAIXAS D\'ÁGUA & TANQUES', 'METAIS SANITÁRIOS', 'SIFÕES & RALOS', 'TORNEIRAS'],
    margemPadrao: 28.0,
    comissaoPadrao: 4.5,
    cor: '#06b6d4',
    ativo: true,
  },
  {
    id: 'CAT-05',
    nome: 'FERRAMENTAS & ACESSÓRIOS',
    subcategorias: ['FERRAMENTAS MANUAIS', 'FERRAMENTAS ELÉTRICAS', 'DISCOS & ABRASIVOS', 'EQUIPAMENTOS DE PINTURA', 'EPIS & SEGURANÇA', 'MEDIÇÃO'],
    margemPadrao: 35.0,
    comissaoPadrao: 5.0,
    cor: '#8b5cf6',
    ativo: true,
  },
  {
    id: 'CAT-06',
    nome: 'FIXAÇÃO & PARAFUSOS',
    subcategorias: ['PARAFUSOS & PORCAS', 'BUCHAS & CHUMBADORES', 'PREGOS & GRAMPOS', 'FITAS & ADESIVOS', 'REBITES'],
    margemPadrao: 40.0,
    comissaoPadrao: 5.0,
    cor: '#ec4899',
    ativo: true,
  },
  {
    id: 'CAT-07',
    nome: 'ACABAMENTO & PISOS',
    subcategorias: ['PISOS & REVESTIMENTOS', 'ARGAMASSAS & REJUNTES', 'PORTAS & JANELAS', 'RODAPÉS & FORROS'],
    margemPadrao: 22.0,
    comissaoPadrao: 3.5,
    cor: '#10b981',
    ativo: true,
  },
];

export const MARCAS_PADRAO: MarcaItem[] = [
  { id: 'MARC-01', nome: 'PPG / DELTRON', fabricante: 'PPG INDUSTRIES', status: 'Ativo' },
  { id: 'MARC-02', nome: 'COLISEU', fabricante: 'COLISEU INDÚSTRIA', status: 'Ativo' },
  { id: 'MARC-03', nome: 'TRAMONTINA', fabricante: 'TRAMONTINA S/A', status: 'Ativo' },
  { id: 'MARC-04', nome: 'TIGRE', fabricante: 'TIGRE TUBOS E CONEXOES', status: 'Ativo' },
  { id: 'MARC-05', nome: 'AMANCO WAVIN', fabricante: 'WAVIN BRASIL', status: 'Ativo' },
  { id: 'MARC-06', nome: 'SUVINIL', fabricante: 'BASF BRASIL', status: 'Ativo' },
  { id: 'MARC-07', nome: 'CORAL', fabricante: 'AKZONOBEL BRASIL', status: 'Ativo' },
  { id: 'MARC-08', nome: 'VOTORAN', fabricante: 'VOTORANTIM CIMENTOS', status: 'Ativo' },
  { id: 'MARC-09', nome: 'CAUÊ', fabricante: 'INTERCEMENT BRASIL', status: 'Ativo' },
  { id: 'MARC-10', nome: 'BRASILIT', fabricante: 'SAINT-GOBAIN BRASIL', status: 'Ativo' },
  { id: 'MARC-11', nome: 'QUARTZOLIT', fabricante: 'SAINT-GOBAIN WEBER', status: 'Ativo' },
  { id: 'MARC-12', nome: 'BOSCH', fabricante: 'ROBERT BOSCH LTDA', status: 'Ativo' },
  { id: 'MARC-13', nome: 'MAKITA', fabricante: 'MAKITA DO BRASIL', status: 'Ativo' },
  { id: 'MARC-14', nome: 'SIEMENS', fabricante: 'SIEMENS INFRAESTRUTURA', status: 'Ativo' },
  { id: 'MARC-15', nome: 'LORENZETTI', fabricante: 'LORENZETTI S.A.', status: 'Ativo' },
  { id: 'MARC-16', nome: 'VEDACIT', fabricante: 'OTTO BAUMGART S.A.', status: 'Ativo' },
  { id: 'MARC-17', nome: '3M', fabricante: '3M DO BRASIL', status: 'Ativo' },
  { id: 'MARC-18', nome: 'NORTON', fabricante: 'SAINT-GOBAIN ABRASIVOS', status: 'Ativo' },
  { id: 'MARC-19', nome: 'CISER', fabricante: 'CISER PARAFUSOS E PORCAS', status: 'Ativo' },
];

export function getCategorias(): CategoriaItem[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_CATEGORIAS);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Erro ao ler categorias:', e);
  }
  return CATEGORIAS_PADRAO;
}

export function salvarCategoria(categoria: CategoriaItem): void {
  try {
    const cats = getCategorias();
    const idx = cats.findIndex((c) => c.id === categoria.id || c.nome.toUpperCase() === categoria.nome.toUpperCase());
    let updated: CategoriaItem[];
    if (idx !== -1) {
      updated = [...cats];
      updated[idx] = { ...updated[idx], ...categoria };
    } else {
      updated = [categoria, ...cats];
    }
    localStorage.setItem(STORAGE_KEY_CATEGORIAS, JSON.stringify(updated));
    window.dispatchEvent(new Event('coliseu_classificacoes_updated'));
  } catch (e) {
    console.error('Erro ao salvar categoria:', e);
  }
}

export function excluirCategoria(id: string): void {
  try {
    const cats = getCategorias();
    const updated = cats.filter((c) => c.id !== id);
    localStorage.setItem(STORAGE_KEY_CATEGORIAS, JSON.stringify(updated));
    window.dispatchEvent(new Event('coliseu_classificacoes_updated'));
  } catch (e) {
    console.error('Erro ao excluir categoria:', e);
  }
}

export function getMarcas(): MarcaItem[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_MARCAS);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Erro ao ler marcas:', e);
  }
  return MARCAS_PADRAO;
}

export function salvarMarca(marca: MarcaItem): void {
  try {
    const marcas = getMarcas();
    const idx = marcas.findIndex((m) => m.id === marca.id || m.nome.toUpperCase() === marca.nome.toUpperCase());
    let updated: MarcaItem[];
    if (idx !== -1) {
      updated = [...marcas];
      updated[idx] = { ...updated[idx], ...marca };
    } else {
      updated = [marca, ...marcas];
    }
    localStorage.setItem(STORAGE_KEY_MARCAS, JSON.stringify(updated));
    window.dispatchEvent(new Event('coliseu_classificacoes_updated'));
  } catch (e) {
    console.error('Erro ao salvar marca:', e);
  }
}

export function excluirMarca(id: string): void {
  try {
    const marcas = getMarcas();
    const updated = marcas.filter((m) => m.id !== id);
    localStorage.setItem(STORAGE_KEY_MARCAS, JSON.stringify(updated));
    window.dispatchEvent(new Event('coliseu_classificacoes_updated'));
  } catch (e) {
    console.error('Erro ao excluir marca:', e);
  }
}

export function adicionarMarcaRapida(nome: string, fabricante?: string): MarcaItem {
  const cleanNome = nome.toUpperCase().trim();
  const marcas = getMarcas();
  const existing = marcas.find((m) => m.nome.toUpperCase() === cleanNome);
  if (existing) return existing;

  const novaMarca: MarcaItem = {
    id: `MARC-${Date.now()}`,
    nome: cleanNome,
    fabricante: fabricante ? fabricante.toUpperCase().trim() : cleanNome,
    status: 'Ativo',
  };

  salvarMarca(novaMarca);
  return novaMarca;
}

export function adicionarCategoriaRapida(nomeCategoria: string, subcategoria?: string): CategoriaItem {
  const cleanCat = nomeCategoria.trim().toUpperCase();
  const cats = getCategorias();
  const existing = cats.find((c) => c.nome.toUpperCase() === cleanCat);

  if (existing) {
    if (subcategoria && subcategoria.trim()) {
      const cleanSub = subcategoria.trim().toUpperCase();
      if (!existing.subcategorias.includes(cleanSub)) {
        const updatedCat = {
          ...existing,
          subcategorias: [...existing.subcategorias, cleanSub],
        };
        salvarCategoria(updatedCat);
        return updatedCat;
      }
    }
    return existing;
  }

  const novaCat: CategoriaItem = {
    id: `CAT-${Date.now()}`,
    nome: cleanCat,
    subcategorias: subcategoria && subcategoria.trim() ? [subcategoria.trim().toUpperCase()] : [],
    margemPadrao: 20.0,
    comissaoPadrao: 4.0,
    cor: '#3b82f6',
    ativo: true,
  };

  salvarCategoria(novaCat);
  return novaCat;
}
