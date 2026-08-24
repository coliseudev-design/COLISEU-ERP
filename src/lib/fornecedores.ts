// Gerenciador e Modelo de Dados de Fornecedores 360° e Contas a Pagar com Retenções Tributárias (IRRF, CSRF, ISSQN, INSS)

export type CategoriaFornecedor =
  | 'MATERIA_PRIMA'
  | 'REVENDA_MERCADORIAS'
  | 'SEMENTES_GRAOS'
  | 'QUIMICOS_DEFENSIVOS'
  | 'PRESTADOR_SERVICOS'
  | 'EMBALAGENS'
  | 'TRANSPORTADORA'
  | 'UTILIDADES_ENERGIA_AGUA_TELECOM';

export type StatusFornecedor = 'ATIVO' | 'HOMOLOGADO' | 'EM_ANALISE' | 'BLOQUEADO' | 'INATIVO';

export interface DadosBancariosFornecedor {
  banco: string;
  agencia: string;
  conta: string;
  tipoConta: 'CORRENTE' | 'POUPANCA' | 'PAGAMENTO';
  tipoChavePix?: 'CNPJ' | 'CPF' | 'EMAIL' | 'TELEFONE' | 'ALEATORIA';
  chavePix?: string;
  favorecidoNome: string;
}

export interface FornecedorItem {
  id: string;
  codigo: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpjCpf: string;
  inscricaoEstadual?: string;
  inscricaoMunicipal?: string;
  cnaePrincipal?: string;
  regimeTributario: 'SIMPLES_NACIONAL' | 'LUCRO_PRESUMIDO' | 'LUCRO_REAL';
  categoria: CategoriaFornecedor;
  status: StatusFornecedor;
  
  // Contato e Endereço
  email: string;
  telefone: string;
  contatoResponsavel: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;

  // Dados Bancários
  dadosBancarios: DadosBancariosFornecedor;

  // Score de Desempenho (Vendor Rating)
  scoreQualidade: number; // 0 a 100
  scorePontualidade: number; // 0 a 100
  scoreCompetitividade: number; // 0 a 100
  scoreGeral: number; // Média ponderada

  // Totais Históricos
  totalCompradoAcumulado: number;
  totalTitulosEmAberto: number;
  totalTitulosPagos: number;
  qtdPedidosRealizados: number;
}

export interface RetencoesTributarias {
  reterIrrf: boolean;
  aliquotaIrrf: number;
  valorIrrf: number;
  
  reterCsrf: boolean; // PIS 0.65% + COFINS 3.0% + CSLL 1.0% = 4.65%
  aliquotaCsrf: number;
  valorCsrf: number;
  
  reterIssqn: boolean;
  aliquotaIssqn: number;
  valorIssqn: number;
  
  reterInss: boolean;
  aliquotaInss: number;
  valorInss: number;
  
  valorTotalRetencoes: number;
  valorLiquidoPagar: number;
}

export interface TituloPagarItem {
  id: string;
  numeroDocumento: string;
  fornecedorId: string;
  fornecedorNome: string;
  fornecedorCnpj: string;
  dataEmissao: string;
  dataVencimento: string;
  dataPagamento?: string;
  
  categoriaDespesa: string; // Ex: Compra de Mercadorias, Frete, Serviços de Terceiros, Energia
  centroCusto: string; // Ex: Comercial, Logística, Administrativo, Oficina
  
  valorBruto: number;
  valorDesconto: number;
  valorJurosMulta: number;
  
  // Retenções
  retencoes: RetencoesTributarias;
  
  valorFinalPagar: number; // Valor líquido ajustado
  
  status: 'EM_ABERTO' | 'PAGO' | 'VENCIDO' | 'CANCELADO' | 'RENEGOCIADO';
  
  formaPagamentoUtilizada?: string;
  bancoOrigemId?: string;
  comprovanteTransacao?: string;
  observacoes?: string;
}

const STORAGE_KEY_FORNECEDORES = 'coliseu_fornecedores_360';
const STORAGE_KEY_TITULOS_PAGAR = 'coliseu_titulos_pagar';

const DEFAULT_FORNECEDORES: FornecedorItem[] = [
  {
    id: 'FORN-001',
    codigo: '00001',
    razaoSocial: 'SEMENTES AGROESTE LTDA',
    nomeFantasia: 'AGROESTE SEMENTES',
    cnpjCpf: '01.234.567/0001-88',
    inscricaoEstadual: '28.910.123-4',
    regimeTributario: 'LUCRO_REAL',
    categoria: 'SEMENTES_GRAOS',
    status: 'HOMOLOGADO',
    email: 'vendas@agroeste.com.br',
    telefone: '(67) 3422-9000',
    contatoResponsavel: 'MARCOS VINICIUS',
    logradouro: 'RODOVIA BR 163, KM 250',
    numero: 'S/N',
    bairro: 'DISTRITO INDUSTRIAL',
    cidade: 'DOURADOS',
    uf: 'MS',
    cep: '79800-970',
    dadosBancarios: {
      banco: '748 - SICREDI',
      agencia: '0718',
      conta: '88912-4',
      tipoConta: 'CORRENTE',
      tipoChavePix: 'CNPJ',
      chavePix: '01.234.567/0001-88',
      favorecidoNome: 'SEMENTES AGROESTE LTDA',
    },
    scoreQualidade: 98,
    scorePontualidade: 95,
    scoreCompetitividade: 92,
    scoreGeral: 95,
    totalCompradoAcumulado: 485000.00,
    totalTitulosEmAberto: 45000.00,
    totalTitulosPagos: 440000.00,
    qtdPedidosRealizados: 18,
  },
  {
    id: 'FORN-002',
    codigo: '00002',
    razaoSocial: 'BRASKEM PETROQUIMICA S.A.',
    nomeFantasia: 'BRASKEM',
    cnpjCpf: '42.150.391/0001-70',
    inscricaoEstadual: '10.982.341-0',
    regimeTributario: 'LUCRO_REAL',
    categoria: 'QUIMICOS_DEFENSIVOS',
    status: 'HOMOLOGADO',
    email: 'contato.comercial@braskem.com',
    telefone: '(11) 3443-8000',
    contatoResponsavel: 'JULIANA ALBUQUERQUE',
    logradouro: 'AV. DAS NAÇÕES UNIDAS',
    numero: '8501',
    bairro: 'PINHEIROS',
    cidade: 'SÃO PAULO',
    uf: 'SP',
    cep: '05425-070',
    dadosBancarios: {
      banco: '001 - BANCO DO BRASIL',
      agencia: '3507',
      conta: '99214-0',
      tipoConta: 'CORRENTE',
      tipoChavePix: 'CNPJ',
      chavePix: '42.150.391/0001-70',
      favorecidoNome: 'BRASKEM PETROQUIMICA S.A.',
    },
    scoreQualidade: 99,
    scorePontualidade: 90,
    scoreCompetitividade: 88,
    scoreGeral: 93,
    totalCompradoAcumulado: 210000.00,
    totalTitulosEmAberto: 22000.00,
    totalTitulosPagos: 188000.00,
    qtdPedidosRealizados: 12,
  },
  {
    id: 'FORN-003',
    codigo: '00003',
    razaoSocial: 'CONSULTORIA & ENGENHARIA AGRONOMICA DO SUL LTDA',
    nomeFantasia: 'AGROTECH ENGENHARIA',
    cnpjCpf: '18.991.234/0001-09',
    inscricaoMunicipal: '98124-1',
    regimeTributario: 'LUCRO_PRESUMIDO',
    categoria: 'PRESTADOR_SERVICOS',
    status: 'ATIVO',
    email: 'financeiro@agrotechengenharia.com.br',
    telefone: '(67) 3421-5500',
    contatoResponsavel: 'ENG. EDUARDO COSTA',
    logradouro: 'RUA HAYEL BON FAKER',
    numero: '1420',
    bairro: 'JARDIM AMERICA',
    cidade: 'DOURADOS',
    uf: 'MS',
    cep: '79803-000',
    dadosBancarios: {
      banco: '748 - SICREDI',
      agencia: '0718',
      conta: '12450-9',
      tipoConta: 'CORRENTE',
      tipoChavePix: 'EMAIL',
      chavePix: 'financeiro@agrotechengenharia.com.br',
      favorecidoNome: 'CONSULTORIA & ENGENHARIA AGRONOMICA',
    },
    scoreQualidade: 96,
    scorePontualidade: 100,
    scoreCompetitividade: 90,
    scoreGeral: 95,
    totalCompradoAcumulado: 75000.00,
    totalTitulosEmAberto: 10000.00,
    totalTitulosPagos: 65000.00,
    qtdPedidosRealizados: 8,
  },
];

const DEFAULT_TITULOS_PAGAR: TituloPagarItem[] = [
  {
    id: 'TIT-PAG-001',
    numeroDocumento: 'NF-e 49120',
    fornecedorId: 'FORN-001',
    fornecedorNome: 'SEMENTES AGROESTE LTDA',
    fornecedorCnpj: '01.234.567/0001-88',
    dataEmissao: '12/08/2026',
    dataVencimento: '12/09/2026',
    categoriaDespesa: 'Compra de Mercadorias para Revenda',
    centroCusto: 'Comercial & Estoque',
    valorBruto: 45000.00,
    valorDesconto: 0,
    valorJurosMulta: 0,
    retencoes: {
      reterIrrf: false,
      aliquotaIrrf: 0,
      valorIrrf: 0,
      reterCsrf: false,
      aliquotaCsrf: 0,
      valorCsrf: 0,
      reterIssqn: false,
      aliquotaIssqn: 0,
      valorIssqn: 0,
      reterInss: false,
      aliquotaInss: 0,
      valorInss: 0,
      valorTotalRetencoes: 0,
      valorLiquidoPagar: 45000.00,
    },
    valorFinalPagar: 45000.00,
    status: 'EM_ABERTO',
  },
  {
    id: 'TIT-PAG-002',
    numeroDocumento: 'NFS-e 881',
    fornecedorId: 'FORN-003',
    fornecedorNome: 'CONSULTORIA & ENGENHARIA AGRONOMICA DO SUL LTDA',
    fornecedorCnpj: '18.991.234/0001-09',
    dataEmissao: '01/08/2026',
    dataVencimento: '30/08/2026',
    categoriaDespesa: 'Serviços Técnicos e Laudos de RT Agronômico',
    centroCusto: 'Técnico & Controle de Qualidade',
    valorBruto: 10000.00,
    valorDesconto: 0,
    valorJurosMulta: 0,
    retencoes: {
      reterIrrf: true,
      aliquotaIrrf: 1.5,
      valorIrrf: 150.00,
      reterCsrf: true,
      aliquotaCsrf: 4.65,
      valorCsrf: 465.00,
      reterIssqn: true,
      aliquotaIssqn: 3.0,
      valorIssqn: 300.00,
      reterInss: false,
      aliquotaInss: 0,
      valorInss: 0,
      valorTotalRetencoes: 915.00,
      valorLiquidoPagar: 9085.00,
    },
    valorFinalPagar: 9085.00,
    status: 'EM_ABERTO',
  },
  {
    id: 'TIT-PAG-003',
    numeroDocumento: 'NF-e 88120',
    fornecedorId: 'FORN-002',
    fornecedorNome: 'BRASKEM PETROQUIMICA S.A.',
    fornecedorCnpj: '42.150.391/0001-70',
    dataEmissao: '18/07/2026',
    dataVencimento: '18/08/2026',
    dataPagamento: '18/08/2026',
    categoriaDespesa: 'Matéria-Prima e Solventes Industriais',
    centroCusto: 'Produção & Tintas',
    valorBruto: 22000.00,
    valorDesconto: 200.00,
    valorJurosMulta: 0,
    retencoes: {
      reterIrrf: false,
      aliquotaIrrf: 0,
      valorIrrf: 0,
      reterCsrf: false,
      aliquotaCsrf: 0,
      valorCsrf: 0,
      reterIssqn: false,
      aliquotaIssqn: 0,
      valorIssqn: 0,
      reterInss: false,
      aliquotaInss: 0,
      valorInss: 0,
      valorTotalRetencoes: 0,
      valorLiquidoPagar: 21800.00,
    },
    valorFinalPagar: 21800.00,
    status: 'PAGO',
    formaPagamentoUtilizada: 'PIX CORPORATIVO',
    bancoOrigemId: '748 - SICREDI',
    comprovanteTransacao: 'E01234567202608181045A9B8C7D6E5',
  },
];

export function getFornecedores(): FornecedorItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FORNECEDORES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_FORNECEDORES, JSON.stringify(DEFAULT_FORNECEDORES));
      return DEFAULT_FORNECEDORES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_FORNECEDORES;
  } catch {
    return DEFAULT_FORNECEDORES;
  }
}

export function salvarFornecedor(fornecedor: FornecedorItem): FornecedorItem[] {
  const lista = getFornecedores();
  const index = lista.findIndex((item) => item.id === fornecedor.id);
  let atualizada: FornecedorItem[];

  if (index >= 0) {
    atualizada = [...lista];
    atualizada[index] = fornecedor;
  } else {
    atualizada = [fornecedor, ...lista];
  }

  localStorage.setItem(STORAGE_KEY_FORNECEDORES, JSON.stringify(atualizada));
  window.dispatchEvent(new Event('coliseu_fornecedores_updated'));
  return atualizada;
}

export function getTitulosPagar(): TituloPagarItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TITULOS_PAGAR);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_TITULOS_PAGAR, JSON.stringify(DEFAULT_TITULOS_PAGAR));
      return DEFAULT_TITULOS_PAGAR;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_TITULOS_PAGAR;
  } catch {
    return DEFAULT_TITULOS_PAGAR;
  }
}

export function salvarTituloPagar(titulo: TituloPagarItem): TituloPagarItem[] {
  const lista = getTitulosPagar();
  const index = lista.findIndex((item) => item.id === titulo.id);
  let atualizada: TituloPagarItem[];

  if (index >= 0) {
    atualizada = [...lista];
    atualizada[index] = titulo;
  } else {
    atualizada = [titulo, ...lista];
  }

  localStorage.setItem(STORAGE_KEY_TITULOS_PAGAR, JSON.stringify(atualizada));
  window.dispatchEvent(new Event('coliseu_titulos_pagar_updated'));
  return atualizada;
}

export function liquidarTituloPagar(
  tituloId: string,
  formaPagamento: string,
  bancoOrigem: string,
  comprovante?: string
): TituloPagarItem | null {
  const lista = getTitulosPagar();
  const index = lista.findIndex((item) => item.id === tituloId);
  if (index < 0) return null;

  const doc = lista[index];
  doc.status = 'PAGO';
  doc.dataPagamento = new Date().toLocaleDateString('pt-BR');
  doc.formaPagamentoUtilizada = formaPagamento;
  doc.bancoOrigemId = bancoOrigem;
  doc.comprovanteTransacao = comprovante || `PAG-${Date.now()}`;

  salvarTituloPagar(doc);
  return doc;
}
