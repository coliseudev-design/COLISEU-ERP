// Motor Inovador de Comissões de Vendas, Metas Comerciais e Gamification

export type TipoCalculoComissao =
  | 'PERCENTUAL_DIRETO'          // % Fixo sobre o faturamento
  | 'MARGEM_LUCRO'               // % Baseado na margem de lucro real da venda
  | 'POR_CATEGORIA_MARCA'        // % Diferenciado por categoria ou marca do produto
  | 'ESCALONADO_POR_META';       // Tabela progressiva com aceleradores

export type GatilhoLiberacaoComissao =
  | 'FATURAMENTO_VENDA'          // Libera na emissão da NF-e / Pedido
  | 'QUITACAO_FINANCEIRA';       // Libera somente após o cliente pagar a parcela

export interface FaixaMargemLucro {
  margemMinima: number; // Ex: 0%
  margemMaxima: number; // Ex: 15%
  percentualComissao: number; // Ex: 1.0%
}

export interface FaixaMetaAcelerador {
  percentualAtingimentoMin: number; // Ex: 100% da meta
  percentualAtingimentoMax: number; // Ex: 119%
  percentualComissao: number;       // Ex: 3.5%
  bonusFixoValor: number;           // Ex: R$ 500,00
}

export interface RegraComissaoCategoria {
  categoriaOuMarca: string;
  percentualComissao: number;
}

export interface PoliticaComissaoEmpresa {
  tipoCalculoPrincipal: TipoCalculoComissao;
  gatilhoLiberacao: GatilhoLiberacaoComissao;
  percentualPadraoDireto: number;
  
  // Regras por Faixa de Margem
  faixasMargem: FaixaMargemLucro[];
  
  // Regras por Faixa de Meta (Aceleradores)
  faixasMetas: FaixaMetaAcelerador[];
  
  // Regras por Categoria / Marca
  regrasPorCategoria: RegraComissaoCategoria[];
  
  estornarComissaoEmDevolucao: boolean;
  descontarFreteDaBase: boolean;
  descontarImpostosDaBase: boolean;
}

export interface VendedorItem {
  id: string;
  codigo: string;
  nome: string;
  email: string;
  telefone: string;
  cargo: 'VENDEDOR_INTERNO' | 'VENDEDOR_EXTERNO' | 'REPRESENTANTE' | 'GERENTE_CONTAS';
  ativo: boolean;
  
  // Metas do Mês
  metaFaturamentoMensal: number;
  metaMargemLucroMinima: number; // Ex: 22%
  
  // Performance no Mês Vigente
  totalVendidoMes: number;
  totalLucroGeradoMes: number;
  margemMediaObtida: number;
  qtdVendasRealizadas: number;
  percentualAtingimentoMeta: number;
  
  // Comissões Apuradas
  totalComissaoGerada: number;
  totalComissaoLiberada: number;
  totalComissaoPaga: number;
  totalComissaoPendente: number;
  
  // Dados Bancários / PIX
  chavePix?: string;
  bancoFavorecido?: string;
}

export interface ItemComissaoVenda {
  id: string;
  vendedorId: string;
  vendedorNome: string;
  numeroDocumentoVenda: string;
  dataVenda: string;
  clienteNome: string;
  valorTotalVenda: number;
  custoTotalVenda: number;
  lucroReal: number;
  margemLucroPercent: number;
  
  // Regra aplicada
  regraAplicada: string;
  aliquotaComissaoAplicada: number;
  valorComissaoCalculado: number;
  valorBonusAcelerador: number;
  valorTotalComissao: number;
  
  status: 'PENDENTE_RECEBIMENTO' | 'LIBERADO_PAGAMENTO' | 'PAGO' | 'ESTORNADO';
  dataLiberacao?: string;
  dataPagamento?: string;
}

const STORAGE_KEY_POLITICA_COMISSAO = 'coliseu_politica_comissao';
const STORAGE_KEY_VENDEDORES = 'coliseu_vendedores_comissao';
const STORAGE_KEY_HISTORICO_COMISSOES = 'coliseu_historico_comissoes';

const DEFAULT_POLITICA: PoliticaComissaoEmpresa = {
  tipoCalculoPrincipal: 'MARGEM_LUCRO',
  gatilhoLiberacao: 'FATURAMENTO_VENDA',
  percentualPadraoDireto: 2.5,
  faixasMargem: [
    { margemMinima: 0, margemMaxima: 15, percentualComissao: 1.0 },
    { margemMinima: 15.01, margemMaxima: 25, percentualComissao: 2.5 },
    { margemMinima: 25.01, margemMaxima: 35, percentualComissao: 4.0 },
    { margemMinima: 35.01, margemMaxima: 100, percentualComissao: 6.0 },
  ],
  faixasMetas: [
    { percentualAtingimentoMin: 0, percentualAtingimentoMax: 79.9, percentualComissao: 2.0, bonusFixoValor: 0 },
    { percentualAtingimentoMin: 80, percentualAtingimentoMax: 99.9, percentualComissao: 2.5, bonusFixoValor: 0 },
    { percentualAtingimentoMin: 100, percentualAtingimentoMax: 119.9, percentualComissao: 3.5, bonusFixoValor: 500 },
    { percentualAtingimentoMin: 120, percentualAtingimentoMax: 999, percentualComissao: 5.0, bonusFixoValor: 1500 },
  ],
  regrasPorCategoria: [
    { categoriaOuMarca: 'TINTAS & AUTOMOTIVO', percentualComissao: 5.0 },
    { categoriaOuMarca: 'SEMENTES & GRÃOS', percentualComissao: 2.5 },
    { categoriaOuMarca: 'QUÍMICOS & DEFENSIVOS', percentualComissao: 3.0 },
    { categoriaOuMarca: 'SERVIÇOS & MÃO DE OBRA', percentualComissao: 10.0 },
  ],
  estornarComissaoEmDevolucao: true,
  descontarFreteDaBase: true,
  descontarImpostosDaBase: false,
};

const DEFAULT_VENDEDORES: VendedorItem[] = [
  {
    id: 'VEND-001',
    codigo: '001',
    nome: 'CARLOS SILVA',
    email: 'carlos.silva@coliseuerp.com.br',
    telefone: '(67) 99912-3456',
    cargo: 'VENDEDOR_INTERNO',
    ativo: true,
    metaFaturamentoMensal: 80000.00,
    metaMargemLucroMinima: 25.0,
    totalVendidoMes: 94500.00,
    totalLucroGeradoMes: 28350.00,
    margemMediaObtida: 30.0,
    qtdVendasRealizadas: 24,
    percentualAtingimentoMeta: 118.1,
    totalComissaoGerada: 3780.00,
    totalComissaoLiberada: 3780.00,
    totalComissaoPaga: 2200.00,
    totalComissaoPendente: 1580.00,
    chavePix: 'carlos.silva@coliseuerp.com.br',
    bancoFavorecido: '748 - SICREDI',
  },
  {
    id: 'VEND-002',
    codigo: '002',
    nome: 'RICARDO OLIVEIRA',
    email: 'ricardo.oliveira@coliseuerp.com.br',
    telefone: '(67) 99988-7766',
    cargo: 'VENDEDOR_EXTERNO',
    ativo: true,
    metaFaturamentoMensal: 120000.00,
    metaMargemLucroMinima: 22.0,
    totalVendidoMes: 148000.00,
    totalLucroGeradoMes: 39960.00,
    margemMediaObtida: 27.0,
    qtdVendasRealizadas: 18,
    percentualAtingimentoMeta: 123.3, // Bateu Super Meta com Acelerador
    totalComissaoGerada: 7400.00,
    totalComissaoLiberada: 7400.00,
    totalComissaoPaga: 4000.00,
    totalComissaoPendente: 3400.00,
    chavePix: '123.456.789-00',
    bancoFavorecido: '001 - BANCO DO BRASIL',
  },
  {
    id: 'VEND-003',
    codigo: '003',
    nome: 'FELIPE ANDRADE',
    email: 'felipe.andrade@coliseuerp.com.br',
    telefone: '(67) 99811-2233',
    cargo: 'REPRESENTANTE',
    ativo: true,
    metaFaturamentoMensal: 60000.00,
    metaMargemLucroMinima: 20.0,
    totalVendidoMes: 45000.00,
    totalLucroGeradoMes: 10350.00,
    margemMediaObtida: 23.0,
    qtdVendasRealizadas: 12,
    percentualAtingimentoMeta: 75.0,
    totalComissaoGerada: 1125.00,
    totalComissaoLiberada: 1125.00,
    totalComissaoPaga: 1125.00,
    totalComissaoPendente: 0,
    chavePix: '(67) 99811-2233',
    bancoFavorecido: '104 - CAIXA ECONOMICA',
  },
];

const DEFAULT_HISTORICO_COMISSOES: ItemComissaoVenda[] = [
  {
    id: 'COM-001',
    vendedorId: 'VEND-002',
    vendedorNome: 'RICARDO OLIVEIRA',
    numeroDocumentoVenda: 'NF-e 1042',
    dataVenda: '18/08/2026',
    clienteNome: 'AGROPECUARIA PANTANAL LTDA',
    valorTotalVenda: 4000.00,
    custoTotalVenda: 2800.00,
    lucroReal: 1200.00,
    margemLucroPercent: 30.0,
    regime: 'MARGEM_LUCRO',
    regraAplicada: 'Faixa Margem 25-35% (4.0%)',
    aliquotaComissaoAplicada: 4.0,
    valorComissaoCalculado: 160.00,
    valorBonusAcelerador: 0,
    valorTotalComissao: 160.00,
    status: 'LIBERADO_PAGAMENTO',
    dataLiberacao: '18/08/2026',
  } as any,
  {
    id: 'COM-002',
    vendedorId: 'VEND-001',
    vendedorNome: 'CARLOS SILVA',
    numeroDocumentoVenda: 'NFC-e 3820',
    dataVenda: '18/08/2026',
    clienteNome: 'CONSUMIDOR FINAL',
    valorTotalVenda: 180.00,
    custoTotalVenda: 100.00,
    lucroReal: 80.00,
    margemLucroPercent: 44.4,
    regraAplicada: 'Faixa Super Margem > 35% (6.0%)',
    aliquotaComissaoAplicada: 6.0,
    valorComissaoCalculado: 10.80,
    valorBonusAcelerador: 0,
    valorTotalComissao: 10.80,
    status: 'LIBERADO_PAGAMENTO',
    dataLiberacao: '18/08/2026',
  },
];

export function getPoliticaComissao(): PoliticaComissaoEmpresa {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_POLITICA_COMISSAO);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_POLITICA_COMISSAO, JSON.stringify(DEFAULT_POLITICA));
      return DEFAULT_POLITICA;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_POLITICA;
  }
}

export function salvarPoliticaComissao(politica: PoliticaComissaoEmpresa): PoliticaComissaoEmpresa {
  localStorage.setItem(STORAGE_KEY_POLITICA_COMISSAO, JSON.stringify(politica));
  window.dispatchEvent(new Event('coliseu_comissao_politica_updated'));
  return politica;
}

export function getVendedores(): VendedorItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_VENDEDORES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_VENDEDORES, JSON.stringify(DEFAULT_VENDEDORES));
      return DEFAULT_VENDEDORES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_VENDEDORES;
  } catch {
    return DEFAULT_VENDEDORES;
  }
}

export function salvarVendedor(vendedor: VendedorItem): VendedorItem[] {
  const lista = getVendedores();
  const index = lista.findIndex((item) => item.id === vendedor.id);
  let atualizada: VendedorItem[];

  if (index >= 0) {
    atualizada = [...lista];
    atualizada[index] = vendedor;
  } else {
    atualizada = [vendedor, ...lista];
  }

  localStorage.setItem(STORAGE_KEY_VENDEDORES, JSON.stringify(atualizada));
  window.dispatchEvent(new Event('coliseu_vendedores_updated'));
  return atualizada;
}

export function getHistoricoComissoes(): ItemComissaoVenda[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HISTORICO_COMISSOES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_HISTORICO_COMISSOES, JSON.stringify(DEFAULT_HISTORICO_COMISSOES));
      return DEFAULT_HISTORICO_COMISSOES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_HISTORICO_COMISSOES;
  } catch {
    return DEFAULT_HISTORICO_COMISSOES;
  }
}

export function salvarItemComissao(item: ItemComissaoVenda): ItemComissaoVenda[] {
  const lista = getHistoricoComissoes();
  const atualizada = [item, ...lista];
  localStorage.setItem(STORAGE_KEY_HISTORICO_COMISSOES, JSON.stringify(atualizada));
  window.dispatchEvent(new Event('coliseu_historico_comissoes_updated'));
  return atualizada;
}

export function pagarComissaoVendedor(vendedorId: string, valorPagar: number): VendedorItem | null {
  const vendedores = getVendedores();
  const index = vendedores.findIndex((v) => v.id === vendedorId);
  if (index < 0) return null;

  const v = vendedores[index];
  v.totalComissaoPaga += valorPagar;
  v.totalComissaoPendente = Math.max(0, v.totalComissaoPendente - valorPagar);

  salvarVendedor(v);
  return v;
}
