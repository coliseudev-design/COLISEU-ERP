import { gerarChaveAcessoNFe } from './nfeChaveAcesso';
import { syncService } from './syncService';

export type StatusPedidoVenda =
  | 'EM_ABERTO'        // ⬜ Branco: Orçamento em aberto (não baixa estoque, não gera financeiro)
  | 'A_FATURAR'         // 🟩 Verde Claro: Pedido aprovado pronto para faturamento/expedição
  | 'EM_FATURAMENTO'    // 🟨 Amarelo: NF-e/NFC-e emitida na SEFAZ aguardando processar venda (bloqueia alteração)
  | 'PROCESSADO'        // ⬛ Cinza: Venda finalizada (estoque baixado e financeiro gerado)
  | 'BLOQUEADO'         // 🟥 Vermelho: Bloqueio comercial/financeiro
  | 'CANCELADO'         // 🟦 Azul: Venda/Pedido cancelado com estorno
  | 'ORCAMENTO'         // Alias legado para EM_ABERTO
  | 'APROVADO'          // Alias legado para A_FATURAR
  | 'FATURADO';         // Alias legado para PROCESSADO

export interface StatusConfig {
  label: string;
  key: 'EM_ABERTO' | 'A_FATURAR' | 'EM_FATURAMENTO' | 'PROCESSADO' | 'BLOQUEADO' | 'CANCELADO';
  bg: string;
  border: string;
  text: string;
  tooltip: string;
}

export function normalizarStatusPedido(status?: string): 'EM_ABERTO' | 'A_FATURAR' | 'EM_FATURAMENTO' | 'PROCESSADO' | 'BLOQUEADO' | 'CANCELADO' {
  if (!status) return 'EM_ABERTO';
  const s = status.toUpperCase();
  if (s === 'ORCAMENTO' || s === 'EM_ABERTO' || s === 'ABERTO') return 'EM_ABERTO';
  if (s === 'APROVADO' || s === 'A_FATURAR' || s === 'LIBERADO') return 'A_FATURAR';
  if (s === 'EM_FATURAMENTO' || s === 'FATURANDO') return 'EM_FATURAMENTO';
  if (s === 'FATURADO' || s === 'PROCESSADO' || s === 'CONCLUIDO') return 'PROCESSADO';
  if (s === 'BLOQUEADO') return 'BLOQUEADO';
  if (s === 'CANCELADO') return 'CANCELADO';
  return 'EM_ABERTO';
}

export function getStatusConfig(status?: string): StatusConfig {
  const norm = normalizarStatusPedido(status);
  switch (norm) {
    case 'EM_ABERTO':
      return {
        key: 'EM_ABERTO',
        label: 'Em Aberto',
        bg: '#ffffff',
        border: '#94a3b8',
        text: '#334155',
        tooltip: 'Orçamento salvo em aberto. Não baixou estoque nem gerou financeiro. Edição livre.',
      };
    case 'A_FATURAR':
      return {
        key: 'A_FATURAR',
        label: 'A Faturar',
        bg: '#dcfce7',
        border: '#86efac',
        text: '#166534',
        tooltip: 'Pedido aprovado, pronto para emissão fiscal ou faturamento.',
      };
    case 'EM_FATURAMENTO':
      return {
        key: 'EM_FATURAMENTO',
        label: 'Em Faturamento',
        bg: '#fef08a',
        border: '#fde047',
        text: '#854d0e',
        tooltip: 'Nota fiscal (NF-e/NFC-e) já vinculada. Edição de dados bloqueada até processar a venda.',
      };
    case 'PROCESSADO':
      return {
        key: 'PROCESSADO',
        label: 'Processado',
        bg: '#64748b',
        border: '#475569',
        text: '#ffffff',
        tooltip: 'Venda finalizada (estoque baixado e financeiro gerado). Bloqueado para reprocessar.',
      };
    case 'BLOQUEADO':
      return {
        key: 'BLOQUEADO',
        label: 'Bloqueado',
        bg: '#f87171',
        border: '#ef4444',
        text: '#ffffff',
        tooltip: 'Pedido retido por limite de crédito ou pendência comercial.',
      };
    case 'CANCELADO':
      return {
        key: 'CANCELADO',
        label: 'Cancelado',
        bg: '#0070f3',
        border: '#2563eb',
        text: '#ffffff',
        tooltip: 'Venda cancelada no sistema (estoque e financeiro estornados).',
      };
  }
}

export type TipoMovimentoPedido = 'SAIDA' | 'ENTRADA';

export interface NaturezaOperacaoItem {
  cfop: string;
  descricao: string;
  tipo: 'SAIDA' | 'ENTRADA';
  geraFinanceiro: boolean;
  movimentaEstoque: boolean;
  destinacaoPadrao: 'ESTADUAL' | 'INTERESTADUAL' | 'EXTERIOR';
}

export interface ItemPedidoVenda {
  id: string;
  itemOrdem: number;
  produtoId: string;
  codigoInterno: string;
  codigoFabrica: string;        // Código original do fabricante / montadora
  referencia: string;           // Referência comercial
  codigoBarras: string;         // EAN-13 / GTIN
  descricao: string;
  unidadeMedida: string;
  quantidade: number;
  precoTabelaUnitario: number;
  descontoPercent: number;
  descontoValorUnitario: number;
  acrescimoValorUnitario: number;
  precoFinalUnitario: number;
  subtotalBruto: number;
  subtotalLiquido: number;
  
  // Dados Fiscais por Item
  cfop: string;
  aliquotaIcms: number;
  valorIcms: number;
  aliquotaIpi?: number;
  valorIpi?: number;
  valorIcmsSt?: number;
  
  // Similaridade & Estoque
  produtosSimilaresDisponiveis?: string[];
  estoqueAtualDisponivel: number;
  observacoesItem?: string;
}

export interface ParcelaPedidoVenda {
  numeroParcela: number;
  dataVencimento: string;
  numeroDocumento: string;
  valorParcela: number;
  especiePagamento: string; // Ex: BOLETO BANCÁRIO, PIX, CARTÃO CRÉDITO, DUPLICATA MERCANTIL
  linhaDigitavelBoleto?: string;
  chavePixQrCode?: string;
}

export interface PedidoVendaItem {
  id: string;
  numeroPedido: string;          // Ex: 335223 ou 529859
  tipoMovimento: TipoMovimentoPedido;
  status: StatusPedidoVenda;
  dataEmissao: string;
  dataValidadeOrcamento?: string;
  dataFaturamento?: string;
  
  // Filial / Departamento
  filialDepto: string;
  
  // Cliente & Contato
  clienteId: string;
  clienteCodigo: string;
  clienteNome: string;
  clienteCnpjCpf: string;
  clienteInscricaoEstadual?: string;
  clienteEndereco: string;
  clienteBairro: string;
  clienteCidade: string;
  clienteUf: string;
  clienteTelefone: string;
  clienteEmail?: string;
  clienteLimiteCredito?: number;
  
  // Natureza de Operação & Fiscal
  naturezaOperacao: NaturezaOperacaoItem;
  
  // Vendedor & Comercial
  vendedorId: string;
  vendedorNome: string;
  tabelaPrecos: string;
  
  // Transporte & Logística
  transportadoraNome?: string;
  tipoFrete: 'CIF' | 'FOB' | 'SEM_FRETE';
  valorFrete: number;
  pesoLiquidoKg: number;
  pesoBrutoKg: number;
  quantidadeVolumes: number;
  veiculoPlaca?: string;
  motoristaNome?: string;
  
  // Itens do Pedido
  itens: ItemPedidoVenda[];
  
  // Totais Fiscais e Financeiros
  totalProdutos: number;
  totalDescontoGlobal: number;
  totalAcrescimos: number;
  totalIpi: number;
  totalIcms: number;
  totalIcmsSt: number;
  totalServicos: number;
  valorTotalFinal: number;
  
  // Condições de Pagamento & Parcelas
  formaPagamentoNome: string; // Ex: À VISTA, 30/60/90 DIAS, ENTRADA + 2X
  parcelas: ParcelaPedidoVenda[];
  
  // Documentos Fiscais Vinculados & Regras de Unicidade
  statusFiscalNfe?: 'NAO_EMITIDA' | 'AUTORIZADA' | 'CANCELADA' | 'REJEITADA';
  statusFiscalNfce?: 'NAO_EMITIDA' | 'AUTORIZADA' | 'CANCELADA' | 'REJEITADA';
  chaveNFeEmitida?: string;
  numeroNFe?: string;
  serieNFe?: number;
  chaveNFCeEmitida?: string;
  numeroNFCe?: string;
  serieNFCe?: number;
  chaveNFeAcobertamento?: string; // Para NF-e Mod. 55 de acobertamento (CFOP 5.929 / 6.929)
  numeroNFeAcobertamento?: string;
  reciboEmissao?: string;
  protocoloAutorizacao?: string;
  dataAutorizacaoSefaz?: string;
  
  observacoesGerais?: string;
}

// Catálogo Padrão de Naturezas de Operação SEFAZ
export const NATUREZAS_OPERACAO_PADRAO: NaturezaOperacaoItem[] = [
  { cfop: '5102', descricao: 'VENDA DE MERCADORIAS DENTRO DO ESTADO (COMÉRCIO)', tipo: 'SAIDA', geraFinanceiro: true, movimentaEstoque: true, destinacaoPadrao: 'ESTADUAL' },
  { cfop: '6102', descricao: 'VENDA DE MERCADORIAS FORA DO ESTADO (INTERESTADUAL)', tipo: 'SAIDA', geraFinanceiro: true, movimentaEstoque: true, destinacaoPadrao: 'INTERESTADUAL' },
  { cfop: '5101', descricao: 'VENDA DE PRODUÇÃO DO ESTABELECIMENTO (INDÚSTRIA)', tipo: 'SAIDA', geraFinanceiro: true, movimentaEstoque: true, destinacaoPadrao: 'ESTADUAL' },
  { cfop: '6101', descricao: 'VENDA DE PRODUÇÃO PARA FORA DO ESTADO', tipo: 'SAIDA', geraFinanceiro: true, movimentaEstoque: true, destinacaoPadrao: 'INTERESTADUAL' },
  { cfop: '5405', descricao: 'VENDA DE MERCADORIA COM SUBSTITUIÇÃO TRIBUTÁRIA (ICMS-ST)', tipo: 'SAIDA', geraFinanceiro: true, movimentaEstoque: true, destinacaoPadrao: 'ESTADUAL' },
  { cfop: '6403', descricao: 'VENDA INTERESTADUAL COM SUBSTITUIÇÃO TRIBUTÁRIA', tipo: 'SAIDA', geraFinanceiro: true, movimentaEstoque: true, destinacaoPadrao: 'INTERESTADUAL' },
  { cfop: '5929', descricao: 'LANÇAMENTO DECORRENTE DE CUPOM FISCAL / NFC-E (ACOBERTAMENTO DENTRO DO ESTADO)', tipo: 'SAIDA', geraFinanceiro: false, movimentaEstoque: false, destinacaoPadrao: 'ESTADUAL' },
  { cfop: '6929', descricao: 'LANÇAMENTO DECORRENTE DE CUPOM FISCAL / NFC-E (ACOBERTAMENTO FORA DO ESTADO)', tipo: 'SAIDA', geraFinanceiro: false, movimentaEstoque: false, destinacaoPadrao: 'INTERESTADUAL' },
  { cfop: '5910', descricao: 'REMESSA EM BONIFICAÇÃO, DOAÇÃO OU BRINDE', tipo: 'SAIDA', geraFinanceiro: false, movimentaEstoque: true, destinacaoPadrao: 'ESTADUAL' },
  { cfop: '6910', descricao: 'REMESSA EM BONIFICAÇÃO/BRINDE FORA DO ESTADO', tipo: 'SAIDA', geraFinanceiro: false, movimentaEstoque: true, destinacaoPadrao: 'INTERESTADUAL' },
  { cfop: '5915', descricao: 'REMESSA DE MERCADORIA OU BEM PARA CONSERTO/REPARO', tipo: 'SAIDA', geraFinanceiro: false, movimentaEstoque: false, destinacaoPadrao: 'ESTADUAL' },
  { cfop: '6915', descricao: 'REMESSA PARA CONSERTO/REPARO FORA DO ESTADO', tipo: 'SAIDA', geraFinanceiro: false, movimentaEstoque: false, destinacaoPadrao: 'INTERESTADUAL' },
  { cfop: '5912', descricao: 'REMESSA PARA DEMONSTRAÇÃO / MOSTRUÁRIO', tipo: 'SAIDA', geraFinanceiro: false, movimentaEstoque: true, destinacaoPadrao: 'ESTADUAL' },
  { cfop: '5114', descricao: 'VENDA DE MERCADORIA EM CONSIGNAÇÃO MERCANTIL', tipo: 'SAIDA', geraFinanceiro: true, movimentaEstoque: true, destinacaoPadrao: 'ESTADUAL' },
  { cfop: '5949', descricao: 'OUTRA SAÍDA DE MERCADORIA OU PRESTAÇÃO DE SERVIÇO', tipo: 'SAIDA', geraFinanceiro: false, movimentaEstoque: true, destinacaoPadrao: 'ESTADUAL' },
];

export const MOCK_PRODUTOS_BUSCA_UNIVERSAL = [
  {
    id: 'prod-001',
    codigoInterno: '001042',
    codigoSku: 'VERNIZ-PU-8100',
    codigoFabrica: 'PU-8100-5L',
    referencia: 'CORAL-8100',
    codigoBarras: '7891991000803',
    descricao: 'VERNIZ POLIURETANO ALTO SÓLIDOS 5L',
    unidadeMedida: 'UN',
    precoVenda: 200.00,
    precoCusto: 120.00,
    aliquotaIcms: 17.0,
    aliquotaIpi: 5.0,
    estoqueDisponivel: 48,
    similares: ['VERNIZ PU LAZZURIL 8000', 'VERNIZ PU W-CAR 5000'],
  },
  {
    id: 'prod-002',
    codigoInterno: '001043',
    codigoSku: 'PRIMER-EP-310',
    codigoFabrica: 'EP-310-36',
    referencia: 'CORAL-310',
    codigoBarras: '7896006700018',
    descricao: 'PRIMER EPÓXI CINZA AUTOMOTIVO 3.6L',
    unidadeMedida: 'UN',
    precoVenda: 150.00,
    precoCusto: 85.00,
    aliquotaIcms: 17.0,
    aliquotaIpi: 0.0,
    estoqueDisponivel: 32,
    similares: ['PRIMER PU LAZZURIL CINZA', 'PRIMER UNIVERSAL 3.6L'],
  },
  {
    id: 'prod-003',
    codigoInterno: '001044',
    codigoSku: 'TINTA-BASE-POL',
    codigoFabrica: 'POL-PRATA-900',
    referencia: 'LAZZ-PRATA-LUNAR',
    codigoBarras: '7896006700025',
    descricao: 'TINTA BASE POLIÉSTER PRATA LUNAR 900ML',
    unidadeMedida: 'UN',
    precoVenda: 130.00,
    precoCusto: 72.00,
    aliquotaIcms: 17.0,
    aliquotaIpi: 5.0,
    estoqueDisponivel: 20,
    similares: ['TINTA POLIESTER PRATA BARI', 'TINTA POLIESTER PRATA SIRIUS'],
  },
  {
    id: 'prod-004',
    codigoInterno: '001045',
    codigoSku: 'DILUENTE-PU-500',
    codigoFabrica: 'DIL-PU-5000',
    referencia: 'CORAL-DIL500',
    codigoBarras: '7891000240105',
    descricao: 'DILUENTE PARA POLIURETANO E POLIÉSTER 5L',
    unidadeMedida: 'UN',
    precoVenda: 90.00,
    precoCusto: 48.00,
    aliquotaIcms: 17.0,
    aliquotaIpi: 0.0,
    estoqueDisponivel: 65,
    similares: ['THINNER PU LAZZURIL 5L', 'SOLVENTE PU AUTOMOTIVO 5L'],
  },
  {
    id: 'prod-005',
    codigoInterno: '001046',
    codigoSku: 'MASSA-PLAST-1KG',
    codigoFabrica: 'MP-IBERE-1000',
    referencia: 'IBERE-MP1',
    codigoBarras: '7891000300052',
    descricao: 'MASSA PLÁSTICA COM CATALISADOR 1KG',
    unidadeMedida: 'UN',
    precoVenda: 35.00,
    precoCusto: 18.00,
    aliquotaIcms: 17.0,
    aliquotaIpi: 0.0,
    estoqueDisponivel: 110,
    similares: ['MASSA POLIESTER LIGHT 1KG', 'MASSA RAPIDA CINZA 1KG'],
  },
  {
    id: 'prod-006',
    codigoInterno: '001047',
    codigoSku: 'LIXA-AGUA-600',
    codigoFabrica: '3M-734-P600',
    referencia: '3M-P600-AGUA',
    codigoBarras: '7896006700100',
    descricao: 'LIXA D ÁGUA GRÃO 600 FOLHA',
    unidadeMedida: 'UN',
    precoVenda: 5.50,
    precoCusto: 2.20,
    aliquotaIcms: 17.0,
    aliquotaIpi: 0.0,
    estoqueDisponivel: 450,
    similares: ['LIXA D AGUA NORTON P600', 'LIXA SECA P600 3M'],
  },
];

const STORAGE_KEY_PEDIDOS_VENDA = 'coliseu_pedidos_vendas_b2b';

const DEFAULT_PEDIDOS_VENDA: PedidoVendaItem[] = [
  {
    id: 'PED-001',
    numeroPedido: '335223',
    tipoMovimento: 'SAIDA',
    status: 'APROVADO',
    dataEmissao: '18/08/2026',
    dataValidadeOrcamento: '25/08/2026',
    filialDepto: 'MATRIZ - DOURADOS/MS',
    clienteId: 'CLI-001',
    clienteCodigo: '1',
    clienteNome: 'AGROPECUARIA PANTANAL LTDA',
    clienteCnpjCpf: '12.345.678/0001-90',
    clienteInscricaoEstadual: '28.910.123-4',
    clienteEndereco: 'RODOVIA BR 163, KM 250, DISTRITO INDUSTRIAL',
    clienteBairro: 'ZONA RURAL',
    clienteCidade: 'DOURADOS',
    clienteUf: 'MS',
    clienteTelefone: '(67) 3422-9000',
    clienteEmail: 'compras@agropantanal.com.br',
    clienteLimiteCredito: 50000.00,
    naturezaOperacao: NATUREZAS_OPERACAO_PADRAO[0], // 5102
    vendedorId: 'VEND-001',
    vendedorNome: 'CARLOS SILVA',
    tabelaPrecos: 'TABELA PADRÃO VAREJO',
    tipoFrete: 'CIF',
    valorFrete: 0,
    pesoLiquidoKg: 45.0,
    pesoBrutoKg: 48.5,
    quantidadeVolumes: 6,
    veiculoPlaca: 'RWW-4A20',
    motoristaNome: 'MARCOS TRANSPORTES',
    itens: [
      {
        id: 'IT-001',
        itemOrdem: 1,
        produtoId: 'prod-001',
        codigoInterno: '001042',
        codigoFabrica: 'PU-8100-5L',
        referencia: 'CORAL-8100',
        codigoBarras: '7891991000803',
        descricao: 'VERNIZ POLIURETANO ALTO SÓLIDOS 5L',
        unidadeMedida: 'UN',
        quantidade: 4,
        precoTabelaUnitario: 200.00,
        descontoPercent: 5.0,
        descontoValorUnitario: 10.00,
        acrescimoValorUnitario: 0,
        precoFinalUnitario: 190.00,
        subtotalBruto: 800.00,
        subtotalLiquido: 760.00,
        cfop: '5102',
        aliquotaIcms: 17.0,
        valorIcms: 129.20,
        aliquotaIpi: 5.0,
        valorIpi: 38.00,
        estoqueAtualDisponivel: 48,
      },
      {
        id: 'IT-002',
        itemOrdem: 2,
        produtoId: 'prod-004',
        codigoInterno: '001045',
        codigoFabrica: 'DIL-PU-5000',
        referencia: 'CORAL-DIL500',
        codigoBarras: '7891000240105',
        descricao: 'DILUENTE PARA POLIURETANO E POLIÉSTER 5L',
        unidadeMedida: 'UN',
        quantidade: 2,
        precoTabelaUnitario: 90.00,
        descontoPercent: 0,
        descontoValorUnitario: 0,
        acrescimoValorUnitario: 0,
        precoFinalUnitario: 90.00,
        subtotalBruto: 180.00,
        subtotalLiquido: 180.00,
        cfop: '5102',
        aliquotaIcms: 17.0,
        valorIcms: 30.60,
        aliquotaIpi: 0,
        valorIpi: 0,
        estoqueAtualDisponivel: 65,
      },
    ],
    totalProdutos: 980.00,
    totalDescontoGlobal: 40.00,
    totalAcrescimos: 0,
    totalIpi: 38.00,
    totalIcms: 159.80,
    totalIcmsSt: 0,
    totalServicos: 0,
    valorTotalFinal: 940.00,
    formaPagamentoNome: '30/60 DIAS (BOLETO BANCÁRIO)',
    parcelas: [
      {
        numeroParcela: 1,
        dataVencimento: '17/09/2026',
        numeroDocumento: '335223/01',
        valorParcela: 470.00,
        especiePagamento: 'BOLETO BANCÁRIO',
        linhaDigitavelBoleto: '74891.12345 67890.123456 78901.234567 1 98760000047000',
        chavePixQrCode: '00020126580014br.gov.bcb.pix...',
      },
      {
        numeroParcela: 2,
        dataVencimento: '17/10/2026',
        numeroDocumento: '335223/02',
        valorParcela: 470.00,
        especiePagamento: 'BOLETO BANCÁRIO',
        linhaDigitavelBoleto: '74891.12345 67890.123456 78901.234567 1 98760000047000',
        chavePixQrCode: '00020126580014br.gov.bcb.pix...',
      },
    ],
    observacoesGerais: 'ENTREGA DIRETA NO ARMAZÉM CENTRAL. PAGAMENTO FATURADO.',
  },
  {
    id: 'PED-002',
    numeroPedido: '529859',
    tipoMovimento: 'SAIDA',
    status: 'ORCAMENTO',
    dataEmissao: '18/08/2026',
    dataValidadeOrcamento: '23/08/2026',
    filialDepto: 'MATRIZ - DOURADOS/MS',
    clienteId: 'CLI-002',
    clienteCodigo: '2',
    clienteNome: 'AUTO LATAS & PINTURAS SÃO PAULO',
    clienteCnpjCpf: '98.765.432/0001-11',
    clienteEndereco: 'AV. PAULISTA, 1000',
    clienteBairro: 'BELA VISTA',
    clienteCidade: 'SÃO PAULO',
    clienteUf: 'SP',
    clienteTelefone: '(11) 3210-4400',
    clienteEmail: 'financeiro@autolatas.com.br',
    naturezaOperacao: NATUREZAS_OPERACAO_PADRAO[1], // 6102 Interestadual
    vendedorId: 'VEND-002',
    vendedorNome: 'RICARDO OLIVEIRA',
    tabelaPrecos: 'TABELA ATACADO / DISTRIBUIDOR',
    tipoFrete: 'FOB',
    valorFrete: 120.00,
    pesoLiquidoKg: 85.0,
    pesoBrutoKg: 92.0,
    quantidadeVolumes: 12,
    itens: [
      {
        id: 'IT-003',
        itemOrdem: 1,
        produtoId: 'prod-003',
        codigoInterno: '001044',
        codigoFabrica: 'POL-PRATA-900',
        referencia: 'LAZZ-PRATA-LUNAR',
        codigoBarras: '789600670025',
        descricao: 'TINTA BASE POLIÉSTER PRATA LUNAR 900ML',
        unidadeMedida: 'UN',
        quantidade: 10,
        precoTabelaUnitario: 130.00,
        descontoPercent: 10.0,
        descontoValorUnitario: 13.00,
        acrescimoValorUnitario: 0,
        precoFinalUnitario: 117.00,
        subtotalBruto: 1300.00,
        subtotalLiquido: 1170.00,
        cfop: '6102',
        aliquotaIcms: 12.0,
        valorIcms: 140.40,
        aliquotaIpi: 5.0,
        valorIpi: 58.50,
        estoqueAtualDisponivel: 20,
      },
    ],
    totalProdutos: 1300.00,
    totalDescontoGlobal: 130.00,
    totalAcrescimos: 0,
    totalIpi: 58.50,
    totalIcms: 140.40,
    totalIcmsSt: 0,
    totalServicos: 0,
    valorTotalFinal: 1290.00, // 1170 + 120 frete
    formaPagamentoNome: 'À VISTA (PIX CORPORATIVO COM 5% OFF)',
    parcelas: [
      {
        numeroParcela: 1,
        dataVencimento: '18/08/2026',
        numeroDocumento: '529859/01',
        valorParcela: 1290.00,
        especiePagamento: 'PIX IMEDIATO',
      },
    ],
    observacoesGerais: 'ORÇAMENTO VÁLIDO POR 5 DIAS. FRETE POR CONTA DO DESTINATÁRIO (FOB).',
  },
];

export function getPedidosVenda(): PedidoVendaItem[] {
  try {
    let raw = localStorage.getItem(STORAGE_KEY_PEDIDOS_VENDA);
    if (!raw) {
      raw = localStorage.getItem('coliseu_pedidos_venda_list');
    }
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function salvarPedidoVenda(pedido: PedidoVendaItem): PedidoVendaItem[] {
  const lista = getPedidosVenda();
  const index = lista.findIndex((item) => item.id === pedido.id);
  let atualizada: PedidoVendaItem[];

  if (index >= 0) {
    atualizada = [...lista];
    atualizada[index] = pedido;
  } else {
    atualizada = [pedido, ...lista];
  }

  localStorage.setItem(STORAGE_KEY_PEDIDOS_VENDA, JSON.stringify(atualizada));
  window.dispatchEvent(new Event('coliseu_pedidos_vendas_updated'));

  // Disparar envio em background para a VPS (PostgreSQL Central)
  syncService.syncPedido(pedido).catch((err) => console.warn('[Sync] Falha no push assíncrono:', err));

  return atualizada;
}

export function faturarPedidoDireto(pedidoId: string): PedidoVendaItem | null {
  const lista = getPedidosVenda();
  const index = lista.findIndex((item) => item.id === pedidoId);
  if (index < 0) return null;

  const ped = lista[index];
  const numeroLimpo = (ped.numeroPedido || '475660').replace(/\D/g, '') || '475660';
  const chaveObj = gerarChaveAcessoNFe({
    uf: '50',
    dataEmissao: new Date(),
    cnpjEmitente: '05766577000122',
    modelo: '55',
    serie: 1,
    numeroDocumento: numeroLimpo,
    tipoEmissao: 1,
  });

  ped.status = 'FATURADO';
  ped.dataFaturamento = new Date().toLocaleDateString('pt-BR');
  ped.numeroNFe = `55-${numeroLimpo}`;
  ped.chaveNFeEmitida = chaveObj.chave;
  ped.reciboEmissao = `SEFAZ-MS-AUT-${Date.now()}`;

  salvarPedidoVenda(ped);
  return ped;
}

export function excluirPedidoVenda(pedidoId: string): PedidoVendaItem[] {
  const lista = getPedidosVenda();
  const atualizada = lista.filter((item) => item.id !== pedidoId);
  localStorage.setItem(STORAGE_KEY_PEDIDOS_VENDA, JSON.stringify(atualizada));
  window.dispatchEvent(new Event('coliseu_pedidos_vendas_updated'));

  // Notificar imediatamente a Nuvem (PostgreSQL Central) para excluir
  syncService.deletePedido(pedidoId).catch((err) => console.warn('[Sync] Falha ao excluir na nuvem:', err));

  return atualizada;
}

/**
 * Validação rigorosa de Unicidade Fiscal:
 * 1. Se o pedido já possui NF-e AUTORIZADA, bloqueia nova emissão de NF-e (apenas visualização, carta de correção ou cancelamento).
 * 2. Se a NF-e anterior foi CANCELADA, o pedido é liberado para novo faturamento.
 * 3. Se o pedido possui apenas NFC-e AUTORIZADA, libera exclusivamente a emissão de NF-e de Acobertamento (CFOP 5.929 / 6.929).
 */
export function podeFaturarPedidoNFe(pedido: PedidoVendaItem): {
  permitido: boolean;
  motivo?: string;
  acaoRecomendada: 'EMISSAO_NORMAL' | 'ACOBERTAMENTO' | 'BLOQUEADO';
} {
  // Caso 1: NF-e já emitida e autorizada
  if (pedido.statusFiscalNfe === 'AUTORIZADA' || (pedido.chaveNFeEmitida && pedido.statusFiscalNfe !== 'CANCELADA')) {
    return {
      permitido: false,
      motivo: `Este pedido já possui a NF-e Nº ${pedido.numeroNFe || 'Autorizada'} vinculada. Não é permitido emitir mais de uma nota para o mesmo pedido.`,
      acaoRecomendada: 'BLOQUEADO',
    };
  }

  // Caso 2: Possui NFC-e ativa -> Permitido apenas Acobertamento de Cupom Fiscal (CFOP 5.929 / 6.929)
  if (pedido.statusFiscalNfce === 'AUTORIZADA' || (pedido.chaveNFCeEmitida && pedido.statusFiscalNfce !== 'CANCELADA')) {
    if (pedido.chaveNFeAcobertamento) {
      return {
        permitido: false,
        motivo: `Este pedido já possui Cupom Fiscal NFC-e Nº ${pedido.numeroNFCe} e NF-e de Acobertamento Nº ${pedido.numeroNFeAcobertamento} emitidos.`,
        acaoRecomendada: 'BLOQUEADO',
      };
    }
    return {
      permitido: true,
      motivo: `Pedido faturado com Cupom Fiscal NFC-e Nº ${pedido.numeroNFCe || ''}. Permitida a emissão de NF-e de Acobertamento (CFOP 5.929 / 6.929).`,
      acaoRecomendada: 'ACOBERTAMENTO',
    };
  }

  // Caso 3: Pedido livre (novo, orçamento ou nota anterior cancelada)
  return {
    permitido: true,
    acaoRecomendada: 'EMISSAO_NORMAL',
  };
}

export function podeEmitirAcobertamento(pedido: PedidoVendaItem): boolean {
  const check = podeFaturarPedidoNFe(pedido);
  return check.acaoRecomendada === 'ACOBERTAMENTO';
}

export function podeFaturarPedidoNFCe(pedido: PedidoVendaItem): {
  permitido: boolean;
  motivo?: string;
  acaoRecomendada: 'EMISSAO_NORMAL' | 'BLOQUEADO';
} {
  if (pedido.statusFiscalNfce === 'AUTORIZADA' || (pedido.chaveNFCeEmitida && pedido.statusFiscalNfce !== 'CANCELADA')) {
    return {
      permitido: false,
      motivo: `Este pedido já possui a NFC-e Nº ${pedido.numeroNFCe || 'Autorizada'} vinculada.`,
      acaoRecomendada: 'BLOQUEADO',
    };
  }
  if (pedido.statusFiscalNfe === 'AUTORIZADA' && !pedido.chaveNFCeEmitida) {
    return {
      permitido: false,
      motivo: `Este pedido já foi faturado como NF-e (Mod. 55) Nº ${pedido.numeroNFe}. Não é permitido emitir NFC-e após emissão de NF-e.`,
      acaoRecomendada: 'BLOQUEADO',
    };
  }
  return {
    permitido: true,
    acaoRecomendada: 'EMISSAO_NORMAL',
  };
}

export function atualizarStatusFiscalPedido(
  pedidoId: string,
  updates: Partial<PedidoVendaItem>
): PedidoVendaItem | null {
  const lista = getPedidosVenda();
  const index = lista.findIndex((p) => p.id === pedidoId || p.numeroPedido === pedidoId);
  if (index < 0) return null;

  const atual = { ...lista[index], ...updates };
  salvarPedidoVenda(atual);
  return atual;
}

export function cancelarNotaFiscalPedido(
  pedidoId: string,
  tipo: 'NFE' | 'NFCE',
  motivoCancelamento?: string
): PedidoVendaItem | null {
  const lista = getPedidosVenda();
  const index = lista.findIndex((p) => p.id === pedidoId || p.numeroPedido === pedidoId);
  if (index < 0) return null;

  const ped = { ...lista[index] };
  if (tipo === 'NFE') {
    ped.statusFiscalNfe = 'CANCELADA';
    ped.observacoesGerais = `${ped.observacoesGerais || ''} [NF-e ${ped.numeroNFe || ''} Cancelada na SEFAZ: ${motivoCancelamento || 'Cancelamento homologado'}]`.trim();
    // Destrava o pedido para voltar a APROVADO se não houver outra nota ativa
    if (ped.statusFiscalNfce !== 'AUTORIZADA') {
      ped.status = 'APROVADO';
    }
  } else {
    ped.statusFiscalNfce = 'CANCELADA';
    ped.observacoesGerais = `${ped.observacoesGerais || ''} [NFC-e ${ped.numeroNFCe || ''} Cancelada na SEFAZ: ${motivoCancelamento || 'Cancelamento homologado'}]`.trim();
    if (ped.statusFiscalNfe !== 'AUTORIZADA') {
      ped.status = 'APROVADO';
    }
  }

  salvarPedidoVenda(ped);
  return ped;
}

/**
 * Salva o pedido como Orçamento Comercial (Status EM_ABERTO - ⬜ Branco)
 */
export function salvarOrcamento(pedido: PedidoVendaItem): PedidoVendaItem {
  pedido.status = 'EM_ABERTO';
  salvarPedidoVenda(pedido);
  return pedido;
}

/**
 * Aprova o pedido comercialmente (Status A_FATURAR - 🟩 Verde Claro)
 */
export function aprovarPedidoComercial(pedidoId: string): PedidoVendaItem | null {
  const lista = getPedidosVenda();
  const index = lista.findIndex((p) => p.id === pedidoId || p.numeroPedido === pedidoId);
  if (index < 0) return null;

  const ped = { ...lista[index] };
  ped.status = 'A_FATURAR';
  salvarPedidoVenda(ped);
  return ped;
}

/**
 * Processamento Completo da Venda (Status PROCESSADO - ⬛ Cinza)
 * 1. Baixa estoque
 * 2. Lança contas a receber no financeiro
 * 3. Registra data de faturamento
 * 4. Bloqueia reprocessamento acidental
 */
export function processarVendaCompleta(pedidoId: string): {
  success: boolean;
  message: string;
  pedido?: PedidoVendaItem;
} {
  const lista = getPedidosVenda();
  const index = lista.findIndex((p) => p.id === pedidoId || p.numeroPedido === pedidoId);
  if (index < 0) {
    return { success: false, message: 'Pedido não encontrado.' };
  }

  const ped = { ...lista[index] };
  if (ped.status === 'PROCESSADO' || ped.status === 'FATURADO') {
    return {
      success: false,
      message: 'Esta venda já foi processada e finalizada. Cancele a venda para permitir alterações.',
      pedido: ped,
    };
  }

  // 1. Baixa de estoque dos itens
  try {
    const rawEstoque = localStorage.getItem('coliseu_produtos_estoque_v1');
    if (rawEstoque) {
      const produtos = JSON.parse(rawEstoque);
      if (Array.isArray(produtos)) {
        ped.itens.forEach((it) => {
          const prod = produtos.find((pr: any) => pr.id === it.produtoId || pr.codigo === it.codigoInterno);
          if (prod) {
            prod.estoque = Math.max(0, (prod.estoque || 0) - it.quantidade);
          }
        });
        localStorage.setItem('coliseu_produtos_estoque_v1', JSON.stringify(produtos));
      }
    }
  } catch (err) {
    console.warn('[Estoque] Aviso ao baixar estoque:', err);
  }

  // 2. Lançamento no Contas a Receber (Financeiro)
  try {
    const rawFin = localStorage.getItem('coliseu_titulos_receber_v1');
    const titulos = rawFin ? JSON.parse(rawFin) : [];
    if (Array.isArray(titulos)) {
      if (ped.parcelas && ped.parcelas.length > 0) {
        ped.parcelas.forEach((parc, pIdx) => {
          titulos.push({
            id: `rec-${ped.numeroPedido}-${pIdx + 1}`,
            pedidoId: ped.id,
            numeroDocumento: parc.numeroDocumento || `${ped.numeroPedido}/${pIdx + 1}`,
            clienteNome: ped.clienteNome,
            clienteCnpjCpf: ped.clienteCnpjCpf,
            dataEmissao: ped.dataEmissao,
            dataVencimento: parc.dataVencimento,
            valor: parc.valorParcela,
            especie: parc.especiePagamento,
            status: 'PENDENTE',
          });
        });
      } else {
        titulos.push({
          id: `rec-${ped.numeroPedido}-1`,
          pedidoId: ped.id,
          numeroDocumento: `${ped.numeroPedido}/01`,
          clienteNome: ped.clienteNome,
          clienteCnpjCpf: ped.clienteCnpjCpf,
          dataEmissao: ped.dataEmissao,
          dataVencimento: new Date().toLocaleDateString('pt-BR'),
          valor: ped.valorTotalFinal,
          especie: ped.formaPagamentoNome || 'BOLETO BANCARIO',
          status: 'PENDENTE',
        });
      }
      localStorage.setItem('coliseu_titulos_receber_v1', JSON.stringify(titulos));
    }
  } catch (err) {
    console.warn('[Financeiro] Aviso ao lançar títulos:', err);
  }

  // 3. Atualizar estado do Pedido
  ped.status = 'PROCESSADO';
  ped.dataFaturamento = new Date().toLocaleDateString('pt-BR');
  salvarPedidoVenda(ped);

  return {
    success: true,
    message: `Venda Nº ${ped.numeroPedido} processada com sucesso! Estoque e financeiro lançados.`,
    pedido: ped,
  };
}

/**
 * Cancelamento de Venda / Pedido (Status CANCELADO - 🟦 Azul Vivo)
 * 1. Estorna estoque dos itens
 * 2. Cancela títulos a receber no módulo financeiro
 * 3. Registra motivo do cancelamento
 */
export function cancelarPedidoVenda(
  pedidoId: string,
  motivo = 'Cancelamento solicitado pelo operador'
): {
  success: boolean;
  message: string;
  pedido?: PedidoVendaItem;
} {
  const lista = getPedidosVenda();
  const index = lista.findIndex((p) => p.id === pedidoId || p.numeroPedido === pedidoId);
  if (index < 0) {
    return { success: false, message: 'Pedido não encontrado.' };
  }

  const ped = { ...lista[index] };

  // 1. Estorno de Estoque
  try {
    const rawEstoque = localStorage.getItem('coliseu_produtos_estoque_v1');
    if (rawEstoque) {
      const produtos = JSON.parse(rawEstoque);
      if (Array.isArray(produtos)) {
        ped.itens.forEach((it) => {
          const prod = produtos.find((pr: any) => pr.id === it.produtoId || pr.codigo === it.codigoInterno);
          if (prod) {
            prod.estoque = (prod.estoque || 0) + it.quantidade;
          }
        });
        localStorage.setItem('coliseu_produtos_estoque_v1', JSON.stringify(produtos));
      }
    }
  } catch (err) {
    console.warn('[Estoque] Aviso ao estornar estoque:', err);
  }

  // 2. Cancelamento de Títulos no Financeiro
  try {
    const rawFin = localStorage.getItem('coliseu_titulos_receber_v1');
    if (rawFin) {
      const titulos = JSON.parse(rawFin);
      if (Array.isArray(titulos)) {
        const atualizados = titulos.map((t: any) => {
          if (t.pedidoId === ped.id || (typeof t.id === 'string' && t.id.startsWith(`rec-${ped.numeroPedido}`))) {
            return { ...t, status: 'CANCELADO', motivoCancelamento: motivo };
          }
          return t;
        });
        localStorage.setItem('coliseu_titulos_receber_v1', JSON.stringify(atualizados));
      }
    }
  } catch (err) {
    console.warn('[Financeiro] Aviso ao cancelar títulos:', err);
  }

  // 3. Atualizar status
  ped.status = 'CANCELADO';
  ped.observacoesGerais = `${ped.observacoesGerais || ''} [Venda Cancelada em ${new Date().toLocaleString('pt-BR')}: ${motivo}]`.trim();
  salvarPedidoVenda(ped);

  return {
    success: true,
    message: `Venda Nº ${ped.numeroPedido} cancelada com sucesso! Estoque e financeiro estornados.`,
    pedido: ped,
  };
}

/**
 * Reabre um pedido cancelado ou processado para o estado EM_ABERTO (⬜ Branco)
 * permitindo ao operador corrigir dados e reprocessar.
 */
export function reabrirPedidoParaEdicao(pedidoId: string): {
  success: boolean;
  message: string;
  pedido?: PedidoVendaItem;
} {
  const lista = getPedidosVenda();
  const index = lista.findIndex((p) => p.id === pedidoId || p.numeroPedido === pedidoId);
  if (index < 0) {
    return { success: false, message: 'Pedido não encontrado.' };
  }

  const ped = { ...lista[index] };
  ped.status = 'EM_ABERTO';
  ped.observacoesGerais = `${ped.observacoesGerais || ''} [Reaberto para Edição em ${new Date().toLocaleString('pt-BR')}]`.trim();
  salvarPedidoVenda(ped);

  return {
    success: true,
    message: `Pedido Nº ${ped.numeroPedido} reaberto com sucesso como Orçamento em Aberto!`,
    pedido: ped,
  };
}
