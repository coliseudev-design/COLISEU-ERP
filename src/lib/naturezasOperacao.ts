// Gerenciador e Catálogo Oficial de Naturezas de Operação da SEFAZ & Legislação Brasileira

export type TipoMovimentoNatureza = 'SAIDA' | 'ENTRADA';
export type DestinoOperacao = 'DENTRO DO ESTADO' | 'FORA DO ESTADO' | 'EXTERIOR';
export type CategoriaOperacao = 'MOVIMENTAÇÃO' | 'FATURAMENTO' | 'REMESSA' | 'DEVOLUÇÃO' | 'TRANSFERÊNCIA' | 'RETORNO' | 'BONIFICAÇÃO';

export interface RegrasOperacionaisNatureza {
  movimentaEstoqueReal: boolean;
  movimentaEstoqueFiscal: boolean;
  geraFinanceiro: boolean;
  calculaIcms: boolean;
  calculaIpi: boolean;
  calculaIss: boolean;
  calculaComissao: boolean;
  calculaPisCofins: boolean;
  permiteTransferencia: boolean;
  desconsiderarChaveReferenciada: boolean;
  opcaoVendaConsumidorFinal: boolean;
  cfopAtivaPelaNatureza: boolean;
  acobertamento: string; // Ex: NÃO APLICÁVEL, CUPOM FISCAL, NOTA FISCAL
}

export interface RegrasImpostosNatureza {
  tributacaoAtiva: boolean;
  origemMercadoria: string; // Ex: '0 - NACIONAL', '1 - ESTRANGEIRA IMPORTAÇÃO DIRETA', '2 - ESTRANGEIRA ADQUIRIDA NO MERCADO INTERNO'
  cstIcms: string;          // Ex: '00', '10', '20', '30', '40', '41', '50', '51', '60', '70', '90'
  csosn: string;            // Ex: '101', '102', '201', '202', '400', '500', '900'
  aliquotaIcms: number;
  reducaoBaseIcms: number;
  forcarUsoReducao: boolean;
  aliquotaIcmsSt: number;
  reducaoBaseIcmsSt: number;
  mvaPercentual: number;
  diferimentoPercentual: number;
  calculoDesoneracao: boolean;
  motivoDesoneracaoIcms?: string;
  codigoBeneficioFiscal?: string; // cBenef
  mensagemAuxiliarFisco?: string;

  // IPI
  cstIpi: string;
  aliquotaIpi: number;
  enquadramentoLegalIpi?: string;

  // PIS / COFINS
  cstPis: string;
  aliquotaPis: number;
  cstCofins: string;
  aliquotaCofins: number;
}

export interface NaturezaOperacaoCompleta {
  id: string;
  codigo: string;             // Ex: '1', '2', '3'
  cfop: string;               // Ex: '5102', '6102', '1102'
  descricao: string;          // Ex: 'VENDA DE MERCADORIAS DENTRO DO ESTADO'
  descricaoNota: string;      // Texto oficial no DANFE
  tipoMovimento: TipoMovimentoNatureza;
  destino: DestinoOperacao;
  categoria: CategoriaOperacao;
  status: 'ATIVA' | 'INATIVA';

  // Caixas de Seleção de Habilitação Rápida
  utilizarEmVendas: boolean;    // Disponível na tela de Vendas, Orçamentos, PDV e Balcão
  utilizarEmCompras: boolean;   // Disponível no módulo de Compras e Entrada de Notas/XML
  utilizarEmMobile: boolean;    // Disponível no app de Vendas Externas / Força de Vendas

  // Multi-Empresa
  empresasVinculadas: string[]; // ['<< TODAS >>'] ou IDs das filiais

  operacional: RegrasOperacionaisNatureza;
  impostos: RegrasImpostosNatureza;
}

const STORAGE_KEY_NATUREZAS_OPERACAO = 'coliseu_naturezas_operacao_completa';

// Catálogo Oficial Pré-Configurado da Legislação Brasileira
export const CATALOGO_OFICIAL_NATUREZAS: NaturezaOperacaoCompleta[] = [
  // --- 1. SAÍDAS / VENDAS ESTADUAIS (5.xxx) ---
  {
    id: 'NAT-5102',
    codigo: '1',
    cfop: '5102',
    descricao: 'VENDA DE MERCADORIAS ADQUIRIDAS DE TERCEIROS DENTRO DO ESTADO',
    descricaoNota: 'VENDA DE MERCADORIAS DENTRO DO ESTADO',
    tipoMovimento: 'SAIDA',
    destino: 'DENTRO DO ESTADO',
    categoria: 'MOVIMENTAÇÃO',
    status: 'ATIVA',
    utilizarEmVendas: true,
    utilizarEmCompras: false,
    utilizarEmMobile: true,
    empresasVinculadas: ['<< TODAS >>'],
    operacional: {
      movimentaEstoqueReal: true,
      movimentaEstoqueFiscal: true,
      geraFinanceiro: true,
      calculaIcms: true,
      calculaIpi: false,
      calculaIss: false,
      calculaComissao: true,
      calculaPisCofins: true,
      permiteTransferencia: false,
      desconsiderarChaveReferenciada: false,
      opcaoVendaConsumidorFinal: true,
      cfopAtivaPelaNatureza: true,
      acobertamento: 'NÃO APLICÁVEL',
    },
    impostos: {
      tributacaoAtiva: true,
      origemMercadoria: '0 - NACIONAL',
      cstIcms: '00',
      csosn: '102',
      aliquotaIcms: 17.0,
      reducaoBaseIcms: 0,
      forcarUsoReducao: false,
      aliquotaIcmsSt: 0,
      reducaoBaseIcmsSt: 0,
      mvaPercentual: 0,
      diferimentoPercentual: 0,
      calculoDesoneracao: false,
      cstIpi: '52',
      aliquotaIpi: 0,
      cstPis: '01',
      aliquotaPis: 1.65,
      cstCofins: '01',
      aliquotaCofins: 7.60,
    },
  },
  {
    id: 'NAT-5101',
    codigo: '2',
    cfop: '5101',
    descricao: 'VENDA DE PRODUÇÃO DO ESTABELECIMENTO DENTRO DO ESTADO (INDÚSTRIA)',
    descricaoNota: 'VENDA DE PRODUÇÃO DO ESTABELECIMENTO',
    tipoMovimento: 'SAIDA',
    destino: 'DENTRO DO ESTADO',
    categoria: 'FATURAMENTO',
    status: 'ATIVA',
    utilizarEmVendas: true,
    utilizarEmCompras: false,
    utilizarEmMobile: true,
    empresasVinculadas: ['<< TODAS >>'],
    operacional: {
      movimentaEstoqueReal: true,
      movimentaEstoqueFiscal: true,
      geraFinanceiro: true,
      calculaIcms: true,
      calculaIpi: true,
      calculaIss: false,
      calculaComissao: true,
      calculaPisCofins: true,
      permiteTransferencia: false,
      desconsiderarChaveReferenciada: false,
      opcaoVendaConsumidorFinal: true,
      cfopAtivaPelaNatureza: true,
      acobertamento: 'NÃO APLICÁVEL',
    },
    impostos: {
      tributacaoAtiva: true,
      origemMercadoria: '0 - NACIONAL',
      cstIcms: '00',
      csosn: '101',
      aliquotaIcms: 17.0,
      reducaoBaseIcms: 0,
      forcarUsoReducao: false,
      aliquotaIcmsSt: 0,
      reducaoBaseIcmsSt: 0,
      mvaPercentual: 0,
      diferimentoPercentual: 0,
      calculoDesoneracao: false,
      cstIpi: '50',
      aliquotaIpi: 5.0,
      cstPis: '01',
      aliquotaPis: 1.65,
      cstCofins: '01',
      aliquotaCofins: 7.60,
    },
  },
  {
    id: 'NAT-5405',
    codigo: '3',
    cfop: '5405',
    descricao: 'VENDA DE MERCADORIA COM ICMS COBRADO ANTERIORMENTE POR ST',
    descricaoNota: 'VENDA DE MERCADORIA SUJEITA A ICMS ST',
    tipoMovimento: 'SAIDA',
    destino: 'DENTRO DO ESTADO',
    categoria: 'MOVIMENTAÇÃO',
    status: 'ATIVA',
    utilizarEmVendas: true,
    utilizarEmCompras: false,
    utilizarEmMobile: true,
    empresasVinculadas: ['<< TODAS >>'],
    operacional: {
      movimentaEstoqueReal: true,
      movimentaEstoqueFiscal: true,
      geraFinanceiro: true,
      calculaIcms: false,
      calculaIpi: false,
      calculaIss: false,
      calculaComissao: true,
      calculaPisCofins: true,
      permiteTransferencia: false,
      desconsiderarChaveReferenciada: false,
      opcaoVendaConsumidorFinal: true,
      cfopAtivaPelaNatureza: true,
      acobertamento: 'NÃO APLICÁVEL',
    },
    impostos: {
      tributacaoAtiva: true,
      origemMercadoria: '0 - NACIONAL',
      cstIcms: '60',
      csosn: '500',
      aliquotaIcms: 0,
      reducaoBaseIcms: 0,
      forcarUsoReducao: false,
      aliquotaIcmsSt: 0,
      reducaoBaseIcmsSt: 0,
      mvaPercentual: 0,
      diferimentoPercentual: 0,
      calculoDesoneracao: false,
      cstIpi: '52',
      aliquotaIpi: 0,
      cstPis: '04',
      aliquotaPis: 0,
      cstCofins: '04',
      aliquotaCofins: 0,
    },
  },
  {
    id: 'NAT-5910',
    codigo: '4',
    cfop: '5910',
    descricao: 'REMESSA EM BONIFICAÇÃO, DOAÇÃO OU BRINDE DENTRO DO ESTADO',
    descricaoNota: 'REMESSA EM BONIFICACAO/BRINDE',
    tipoMovimento: 'SAIDA',
    destino: 'DENTRO DO ESTADO',
    categoria: 'BONIFICAÇÃO',
    status: 'ATIVA',
    utilizarEmVendas: true,
    utilizarEmCompras: false,
    utilizarEmMobile: false,
    empresasVinculadas: ['<< TODAS >>'],
    operacional: {
      movimentaEstoqueReal: true,
      movimentaEstoqueFiscal: true,
      geraFinanceiro: false,
      calculaIcms: true,
      calculaIpi: false,
      calculaIss: false,
      calculaComissao: false,
      calculaPisCofins: false,
      permiteTransferencia: false,
      desconsiderarChaveReferenciada: false,
      opcaoVendaConsumidorFinal: false,
      cfopAtivaPelaNatureza: true,
      acobertamento: 'NÃO APLICÁVEL',
    },
    impostos: {
      tributacaoAtiva: true,
      origemMercadoria: '0 - NACIONAL',
      cstIcms: '00',
      csosn: '400',
      aliquotaIcms: 17.0,
      reducaoBaseIcms: 0,
      forcarUsoReducao: false,
      aliquotaIcmsSt: 0,
      reducaoBaseIcmsSt: 0,
      mvaPercentual: 0,
      diferimentoPercentual: 0,
      calculoDesoneracao: false,
      cstIpi: '52',
      aliquotaIpi: 0,
      cstPis: '08',
      aliquotaPis: 0,
      cstCofins: '08',
      aliquotaCofins: 0,
    },
  },
  {
    id: 'NAT-5915',
    codigo: '5',
    cfop: '5915',
    descricao: 'REMESSA DE MERCADORIA OU BEM PARA CONSERTO OU REPARO',
    descricaoNota: 'REMESSA PARA CONSERTO/REPARO',
    tipoMovimento: 'SAIDA',
    destino: 'DENTRO DO ESTADO',
    categoria: 'REMESSA',
    status: 'ATIVA',
    utilizarEmVendas: true,
    utilizarEmCompras: false,
    utilizarEmMobile: false,
    empresasVinculadas: ['<< TODAS >>'],
    operacional: {
      movimentaEstoqueReal: false,
      movimentaEstoqueFiscal: true,
      geraFinanceiro: false,
      calculaIcms: false,
      calculaIpi: false,
      calculaIss: false,
      calculaComissao: false,
      calculaPisCofins: false,
      permiteTransferencia: false,
      desconsiderarChaveReferenciada: false,
      opcaoVendaConsumidorFinal: false,
      cfopAtivaPelaNatureza: true,
      acobertamento: 'NÃO APLICÁVEL',
    },
    impostos: {
      tributacaoAtiva: true,
      origemMercadoria: '0 - NACIONAL',
      cstIcms: '41',
      csosn: '400',
      aliquotaIcms: 0,
      reducaoBaseIcms: 0,
      forcarUsoReducao: false,
      aliquotaIcmsSt: 0,
      reducaoBaseIcmsSt: 0,
      mvaPercentual: 0,
      diferimentoPercentual: 0,
      calculoDesoneracao: false,
      cstIpi: '52',
      aliquotaIpi: 0,
      cstPis: '08',
      aliquotaPis: 0,
      cstCofins: '08',
      aliquotaCofins: 0,
    },
  },
  {
    id: 'NAT-5912',
    codigo: '6',
    cfop: '5912',
    descricao: 'REMESSA PARA DEMONSTRAÇÃO OU MOSTRUÁRIO DENTRO DO ESTADO',
    descricaoNota: 'REMESSA PARA DEMONSTRACAO',
    tipoMovimento: 'SAIDA',
    destino: 'DENTRO DO ESTADO',
    categoria: 'REMESSA',
    status: 'ATIVA',
    utilizarEmVendas: true,
    utilizarEmCompras: false,
    utilizarEmMobile: true,
    empresasVinculadas: ['<< TODAS >>'],
    operacional: {
      movimentaEstoqueReal: true,
      movimentaEstoqueFiscal: true,
      geraFinanceiro: false,
      calculaIcms: false,
      calculaIpi: false,
      calculaIss: false,
      calculaComissao: false,
      calculaPisCofins: false,
      permiteTransferencia: false,
      desconsiderarChaveReferenciada: false,
      opcaoVendaConsumidorFinal: false,
      cfopAtivaPelaNatureza: true,
      acobertamento: 'NÃO APLICÁVEL',
    },
    impostos: {
      tributacaoAtiva: true,
      origemMercadoria: '0 - NACIONAL',
      cstIcms: '41',
      csosn: '400',
      aliquotaIcms: 0,
      reducaoBaseIcms: 0,
      forcarUsoReducao: false,
      aliquotaIcmsSt: 0,
      reducaoBaseIcmsSt: 0,
      mvaPercentual: 0,
      diferimentoPercentual: 0,
      calculoDesoneracao: false,
      cstIpi: '52',
      aliquotaIpi: 0,
      cstPis: '08',
      aliquotaPis: 0,
      cstCofins: '08',
      aliquotaCofins: 0,
    },
  },
  {
    id: 'NAT-5152',
    codigo: '7',
    cfop: '5152',
    descricao: 'TRANSFERÊNCIA DE MERCADORIA ADQUIRIDA DE TERCEIROS ENTRE FILIAIS',
    descricaoNota: 'TRANSFERENCIA ENTRE FILIAIS',
    tipoMovimento: 'SAIDA',
    destino: 'DENTRO DO ESTADO',
    categoria: 'TRANSFERÊNCIA',
    status: 'ATIVA',
    utilizarEmVendas: false,
    utilizarEmCompras: false,
    utilizarEmMobile: false,
    empresasVinculadas: ['<< TODAS >>'],
    operacional: {
      movimentaEstoqueReal: true,
      movimentaEstoqueFiscal: true,
      geraFinanceiro: false,
      calculaIcms: false,
      calculaIpi: false,
      calculaIss: false,
      calculaComissao: false,
      calculaPisCofins: false,
      permiteTransferencia: true,
      desconsiderarChaveReferenciada: false,
      opcaoVendaConsumidorFinal: false,
      cfopAtivaPelaNatureza: true,
      acobertamento: 'NÃO APLICÁVEL',
    },
    impostos: {
      tributacaoAtiva: true,
      origemMercadoria: '0 - NACIONAL',
      cstIcms: '41',
      csosn: '400',
      aliquotaIcms: 0,
      reducaoBaseIcms: 0,
      forcarUsoReducao: false,
      aliquotaIcmsSt: 0,
      reducaoBaseIcmsSt: 0,
      mvaPercentual: 0,
      diferimentoPercentual: 0,
      calculoDesoneracao: false,
      cstIpi: '52',
      aliquotaIpi: 0,
      cstPis: '08',
      aliquotaPis: 0,
      cstCofins: '08',
      aliquotaCofins: 0,
    },
  },
  {
    id: 'NAT-5202',
    codigo: '8',
    cfop: '5202',
    descricao: 'DEVOLUÇÃO DE COMPRA PARA COMERCIALIZAÇÃO AO FORNECEDOR',
    descricaoNota: 'DEVOLUCAO DE COMPRA DE FORNECEDOR',
    tipoMovimento: 'SAIDA',
    destino: 'DENTRO DO ESTADO',
    categoria: 'DEVOLUÇÃO',
    status: 'ATIVA',
    utilizarEmVendas: true,
    utilizarEmCompras: false,
    utilizarEmMobile: false,
    empresasVinculadas: ['<< TODAS >>'],
    operacional: {
      movimentaEstoqueReal: true,
      movimentaEstoqueFiscal: true,
      geraFinanceiro: true,
      calculaIcms: true,
      calculaIpi: true,
      calculaIss: false,
      calculaComissao: false,
      calculaPisCofins: true,
      permiteTransferencia: false,
      desconsiderarChaveReferenciada: false,
      opcaoVendaConsumidorFinal: false,
      cfopAtivaPelaNatureza: true,
      acobertamento: 'NÃO APLICÁVEL',
    },
    impostos: {
      tributacaoAtiva: true,
      origemMercadoria: '0 - NACIONAL',
      cstIcms: '00',
      csosn: '900',
      aliquotaIcms: 17.0,
      reducaoBaseIcms: 0,
      forcarUsoReducao: false,
      aliquotaIcmsSt: 0,
      reducaoBaseIcmsSt: 0,
      mvaPercentual: 0,
      diferimentoPercentual: 0,
      calculoDesoneracao: false,
      cstIpi: '99',
      aliquotaIpi: 0,
      cstPis: '49',
      aliquotaPis: 0,
      cstCofins: '49',
      aliquotaCofins: 0,
    },
  },

  // --- 2. SAÍDAS INTERESTADUAIS (6.xxx) ---
  {
    id: 'NAT-6102',
    codigo: '9',
    cfop: '6102',
    descricao: 'VENDA DE MERCADORIAS ADQUIRIDAS DE TERCEIROS PARA FORA DO ESTADO',
    descricaoNota: 'VENDA INTERESTADUAL DE MERCADORIAS',
    tipoMovimento: 'SAIDA',
    destino: 'FORA DO ESTADO',
    categoria: 'MOVIMENTAÇÃO',
    status: 'ATIVA',
    utilizarEmVendas: true,
    utilizarEmCompras: false,
    utilizarEmMobile: true,
    empresasVinculadas: ['<< TODAS >>'],
    operacional: {
      movimentaEstoqueReal: true,
      movimentaEstoqueFiscal: true,
      geraFinanceiro: true,
      calculaIcms: true,
      calculaIpi: false,
      calculaIss: false,
      calculaComissao: true,
      calculaPisCofins: true,
      permiteTransferencia: false,
      desconsiderarChaveReferenciada: false,
      opcaoVendaConsumidorFinal: false,
      cfopAtivaPelaNatureza: true,
      acobertamento: 'NÃO APLICÁVEL',
    },
    impostos: {
      tributacaoAtiva: true,
      origemMercadoria: '0 - NACIONAL',
      cstIcms: '00',
      csosn: '102',
      aliquotaIcms: 12.0,
      reducaoBaseIcms: 0,
      forcarUsoReducao: false,
      aliquotaIcmsSt: 0,
      reducaoBaseIcmsSt: 0,
      mvaPercentual: 0,
      diferimentoPercentual: 0,
      calculoDesoneracao: false,
      cstIpi: '52',
      aliquotaIpi: 0,
      cstPis: '01',
      aliquotaPis: 1.65,
      cstCofins: '01',
      aliquotaCofins: 7.60,
    },
  },
  {
    id: 'NAT-6403',
    codigo: '10',
    cfop: '6403',
    descricao: 'VENDA INTERESTADUAL COM SUBSTITUIÇÃO TRIBUTÁRIA',
    descricaoNota: 'VENDA INTERESTADUAL COM ICMS ST',
    tipoMovimento: 'SAIDA',
    destino: 'FORA DO ESTADO',
    categoria: 'MOVIMENTAÇÃO',
    status: 'ATIVA',
    utilizarEmVendas: true,
    utilizarEmCompras: false,
    utilizarEmMobile: true,
    empresasVinculadas: ['<< TODAS >>'],
    operacional: {
      movimentaEstoqueReal: true,
      movimentaEstoqueFiscal: true,
      geraFinanceiro: true,
      calculaIcms: true,
      calculaIpi: false,
      calculaIss: false,
      calculaComissao: true,
      calculaPisCofins: true,
      permiteTransferencia: false,
      desconsiderarChaveReferenciada: false,
      opcaoVendaConsumidorFinal: false,
      cfopAtivaPelaNatureza: true,
      acobertamento: 'NÃO APLICÁVEL',
    },
    impostos: {
      tributacaoAtiva: true,
      origemMercadoria: '0 - NACIONAL',
      cstIcms: '10',
      csosn: '201',
      aliquotaIcms: 12.0,
      reducaoBaseIcms: 0,
      forcarUsoReducao: false,
      aliquotaIcmsSt: 18.0,
      reducaoBaseIcmsSt: 0,
      mvaPercentual: 40.0,
      diferimentoPercentual: 0,
      calculoDesoneracao: false,
      cstIpi: '52',
      aliquotaIpi: 0,
      cstPis: '01',
      aliquotaPis: 1.65,
      cstCofins: '01',
      aliquotaCofins: 7.60,
    },
  },

  // --- 3. ENTRADAS / COMPRAS ESTADUAIS (1.xxx) ---
  {
    id: 'NAT-1102',
    codigo: '11',
    cfop: '1102',
    descricao: 'COMPRA PARA COMERCIALIZAÇÃO DENTRO DO ESTADO',
    descricaoNota: 'COMPRA DE MERCADORIA PARA REVENDA',
    tipoMovimento: 'ENTRADA',
    destino: 'DENTRO DO ESTADO',
    categoria: 'MOVIMENTAÇÃO',
    status: 'ATIVA',
    utilizarEmVendas: false,
    utilizarEmCompras: true,
    utilizarEmMobile: false,
    empresasVinculadas: ['<< TODAS >>'],
    operacional: {
      movimentaEstoqueReal: true,
      movimentaEstoqueFiscal: true,
      geraFinanceiro: true,
      calculaIcms: true,
      calculaIpi: false,
      calculaIss: false,
      calculaComissao: false,
      calculaPisCofins: true,
      permiteTransferencia: false,
      desconsiderarChaveReferenciada: false,
      opcaoVendaConsumidorFinal: false,
      cfopAtivaPelaNatureza: true,
      acobertamento: 'NÃO APLICÁVEL',
    },
    impostos: {
      tributacaoAtiva: true,
      origemMercadoria: '0 - NACIONAL',
      cstIcms: '00',
      csosn: '102',
      aliquotaIcms: 17.0,
      reducaoBaseIcms: 0,
      forcarUsoReducao: false,
      aliquotaIcmsSt: 0,
      reducaoBaseIcmsSt: 0,
      mvaPercentual: 0,
      diferimentoPercentual: 0,
      calculoDesoneracao: false,
      cstIpi: '00',
      aliquotaIpi: 0,
      cstPis: '50',
      aliquotaPis: 1.65,
      cstCofins: '50',
      aliquotaCofins: 7.60,
    },
  },
  {
    id: 'NAT-1403',
    codigo: '12',
    cfop: '1403',
    descricao: 'COMPRA PARA COMERCIALIZAÇÃO COM MERCADORIA SUJEITA A ICMS ST',
    descricaoNota: 'COMPRA DE MERCADORIA COM ICMS ST',
    tipoMovimento: 'ENTRADA',
    destino: 'DENTRO DO ESTADO',
    categoria: 'MOVIMENTAÇÃO',
    status: 'ATIVA',
    utilizarEmVendas: false,
    utilizarEmCompras: true,
    utilizarEmMobile: false,
    empresasVinculadas: ['<< TODAS >>'],
    operacional: {
      movimentaEstoqueReal: true,
      movimentaEstoqueFiscal: true,
      geraFinanceiro: true,
      calculaIcms: false,
      calculaIpi: false,
      calculaIss: false,
      calculaComissao: false,
      calculaPisCofins: true,
      permiteTransferencia: false,
      desconsiderarChaveReferenciada: false,
      opcaoVendaConsumidorFinal: false,
      cfopAtivaPelaNatureza: true,
      acobertamento: 'NÃO APLICÁVEL',
    },
    impostos: {
      tributacaoAtiva: true,
      origemMercadoria: '0 - NACIONAL',
      cstIcms: '60',
      csosn: '500',
      aliquotaIcms: 0,
      reducaoBaseIcms: 0,
      forcarUsoReducao: false,
      aliquotaIcmsSt: 0,
      reducaoBaseIcmsSt: 0,
      mvaPercentual: 0,
      diferimentoPercentual: 0,
      calculoDesoneracao: false,
      cstIpi: '49',
      aliquotaIpi: 0,
      cstPis: '70',
      aliquotaPis: 0,
      cstCofins: '70',
      aliquotaCofins: 0,
    },
  },
  {
    id: 'NAT-1202',
    codigo: '13',
    cfop: '1202',
    descricao: 'DEVOLUÇÃO DE VENDA DE MERCADORIA ADQUIRIDA DE TERCEIROS',
    descricaoNota: 'DEVOLUCAO DE VENDA DE CLIENTE',
    tipoMovimento: 'ENTRADA',
    destino: 'DENTRO DO ESTADO',
    categoria: 'DEVOLUÇÃO',
    status: 'ATIVA',
    utilizarEmVendas: false,
    utilizarEmCompras: true,
    utilizarEmMobile: false,
    empresasVinculadas: ['<< TODAS >>'],
    operacional: {
      movimentaEstoqueReal: true,
      movimentaEstoqueFiscal: true,
      geraFinanceiro: true,
      calculaIcms: true,
      calculaIpi: false,
      calculaIss: false,
      calculaComissao: true,
      calculaPisCofins: true,
      permiteTransferencia: false,
      desconsiderarChaveReferenciada: false,
      opcaoVendaConsumidorFinal: false,
      cfopAtivaPelaNatureza: true,
      acobertamento: 'NÃO APLICÁVEL',
    },
    impostos: {
      tributacaoAtiva: true,
      origemMercadoria: '0 - NACIONAL',
      cstIcms: '00',
      csosn: '900',
      aliquotaIcms: 17.0,
      reducaoBaseIcms: 0,
      forcarUsoReducao: false,
      aliquotaIcmsSt: 0,
      reducaoBaseIcmsSt: 0,
      mvaPercentual: 0,
      diferimentoPercentual: 0,
      calculoDesoneracao: false,
      cstIpi: '49',
      aliquotaIpi: 0,
      cstPis: '50',
      aliquotaPis: 1.65,
      cstCofins: '50',
      aliquotaCofins: 7.60,
    },
  },
  {
    id: 'NAT-1556',
    codigo: '14',
    cfop: '1556',
    descricao: 'COMPRA DE MATERIAL PARA USO OU CONSUMO DENTRO DO ESTADO',
    descricaoNota: 'COMPRA DE USO E CONSUMO',
    tipoMovimento: 'ENTRADA',
    destino: 'DENTRO DO ESTADO',
    categoria: 'MOVIMENTAÇÃO',
    status: 'ATIVA',
    utilizarEmVendas: false,
    utilizarEmCompras: true,
    utilizarEmMobile: false,
    empresasVinculadas: ['<< TODAS >>'],
    operacional: {
      movimentaEstoqueReal: true,
      movimentaEstoqueFiscal: true,
      geraFinanceiro: true,
      calculaIcms: false,
      calculaIpi: false,
      calculaIss: false,
      calculaComissao: false,
      calculaPisCofins: false,
      permiteTransferencia: false,
      desconsiderarChaveReferenciada: false,
      opcaoVendaConsumidorFinal: false,
      cfopAtivaPelaNatureza: true,
      acobertamento: 'NÃO APLICÁVEL',
    },
    impostos: {
      tributacaoAtiva: true,
      origemMercadoria: '0 - NACIONAL',
      cstIcms: '90',
      csosn: '900',
      aliquotaIcms: 0,
      reducaoBaseIcms: 0,
      forcarUsoReducao: false,
      aliquotaIcmsSt: 0,
      reducaoBaseIcmsSt: 0,
      mvaPercentual: 0,
      diferimentoPercentual: 0,
      calculoDesoneracao: false,
      cstIpi: '49',
      aliquotaIpi: 0,
      cstPis: '70',
      aliquotaPis: 0,
      cstCofins: '70',
      aliquotaCofins: 0,
    },
  },

  // --- 4. ENTRADAS INTERESTADUAIS (2.xxx) ---
  {
    id: 'NAT-2102',
    codigo: '15',
    cfop: '2102',
    descricao: 'COMPRA PARA COMERCIALIZAÇÃO DE OUTRO ESTADO (INTERESTADUAL)',
    descricaoNota: 'COMPRA INTERESTADUAL PARA REVENDA',
    tipoMovimento: 'ENTRADA',
    destino: 'FORA DO ESTADO',
    categoria: 'MOVIMENTAÇÃO',
    status: 'ATIVA',
    utilizarEmVendas: false,
    utilizarEmCompras: true,
    utilizarEmMobile: false,
    empresasVinculadas: ['<< TODAS >>'],
    operacional: {
      movimentaEstoqueReal: true,
      movimentaEstoqueFiscal: true,
      geraFinanceiro: true,
      calculaIcms: true,
      calculaIpi: false,
      calculaIss: false,
      calculaComissao: false,
      calculaPisCofins: true,
      permiteTransferencia: false,
      desconsiderarChaveReferenciada: false,
      opcaoVendaConsumidorFinal: false,
      cfopAtivaPelaNatureza: true,
      acobertamento: 'NÃO APLICÁVEL',
    },
    impostos: {
      tributacaoAtiva: true,
      origemMercadoria: '0 - NACIONAL',
      cstIcms: '00',
      csosn: '102',
      aliquotaIcms: 12.0,
      reducaoBaseIcms: 0,
      forcarUsoReducao: false,
      aliquotaIcmsSt: 0,
      reducaoBaseIcmsSt: 0,
      mvaPercentual: 0,
      diferimentoPercentual: 0,
      calculoDesoneracao: false,
      cstIpi: '00',
      aliquotaIpi: 0,
      cstPis: '50',
      aliquotaPis: 1.65,
      cstCofins: '50',
      aliquotaCofins: 7.60,
    },
  },
  {
    id: 'NAT-2403',
    codigo: '16',
    cfop: '2403',
    descricao: 'COMPRA INTERESTADUAL COM SUBSTITUIÇÃO TRIBUTÁRIA',
    descricaoNota: 'COMPRA INTERESTADUAL COM ICMS ST',
    tipoMovimento: 'ENTRADA',
    destino: 'FORA DO ESTADO',
    categoria: 'MOVIMENTAÇÃO',
    status: 'ATIVA',
    utilizarEmVendas: false,
    utilizarEmCompras: true,
    utilizarEmMobile: false,
    empresasVinculadas: ['<< TODAS >>'],
    operacional: {
      movimentaEstoqueReal: true,
      movimentaEstoqueFiscal: true,
      geraFinanceiro: true,
      calculaIcms: false,
      calculaIpi: false,
      calculaIss: false,
      calculaComissao: false,
      calculaPisCofins: true,
      permiteTransferencia: false,
      desconsiderarChaveReferenciada: false,
      opcaoVendaConsumidorFinal: false,
      cfopAtivaPelaNatureza: true,
      acobertamento: 'NÃO APLICÁVEL',
    },
    impostos: {
      tributacaoAtiva: true,
      origemMercadoria: '0 - NACIONAL',
      cstIcms: '60',
      csosn: '500',
      aliquotaIcms: 0,
      reducaoBaseIcms: 0,
      forcarUsoReducao: false,
      aliquotaIcmsSt: 0,
      reducaoBaseIcmsSt: 0,
      mvaPercentual: 0,
      diferimentoPercentual: 0,
      calculoDesoneracao: false,
      cstIpi: '49',
      aliquotaIpi: 0,
      cstPis: '70',
      aliquotaPis: 0,
      cstCofins: '70',
      aliquotaCofins: 0,
    },
  },
];

export function getNaturezasOperacao(): NaturezaOperacaoCompleta[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_NATUREZAS_OPERACAO);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_NATUREZAS_OPERACAO, JSON.stringify(CATALOGO_OFICIAL_NATUREZAS));
      return CATALOGO_OFICIAL_NATUREZAS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : CATALOGO_OFICIAL_NATUREZAS;
  } catch {
    return CATALOGO_OFICIAL_NATUREZAS;
  }
}

export function salvarNaturezaOperacao(natureza: NaturezaOperacaoCompleta): NaturezaOperacaoCompleta[] {
  const lista = getNaturezasOperacao();
  const index = lista.findIndex((item) => item.id === natureza.id);
  let atualizada: NaturezaOperacaoCompleta[];

  if (index >= 0) {
    atualizada = [...lista];
    atualizada[index] = natureza;
  } else {
    atualizada = [natureza, ...lista];
  }

  localStorage.setItem(STORAGE_KEY_NATUREZAS_OPERACAO, JSON.stringify(atualizada));
  window.dispatchEvent(new Event('coliseu_naturezas_operacao_updated'));
  return atualizada;
}

export function alternarCheckboxNatureza(
  naturezaId: string,
  campo: 'utilizarEmVendas' | 'utilizarEmCompras' | 'utilizarEmMobile'
): NaturezaOperacaoCompleta | null {
  const lista = getNaturezasOperacao();
  const index = lista.findIndex((item) => item.id === naturezaId);
  if (index < 0) return null;

  const n = lista[index];
  n[campo] = !n[campo];
  salvarNaturezaOperacao(n);
  return n;
}

export function clonarNaturezaOperacao(naturezaId: string): NaturezaOperacaoCompleta | null {
  const lista = getNaturezasOperacao();
  const original = lista.find((item) => item.id === naturezaId);
  if (!original) return null;

  const clonada: NaturezaOperacaoCompleta = {
    ...JSON.parse(JSON.stringify(original)),
    id: `NAT-${Date.now()}`,
    codigo: `${lista.length + 1}`,
    descricao: `${original.descricao} (CÓPIA)`,
    descricaoNota: `${original.descricaoNota} (COPIA)`,
  };

  salvarNaturezaOperacao(clonada);
  return clonada;
}

export function excluirNaturezaOperacao(naturezaId: string): NaturezaOperacaoCompleta[] {
  const lista = getNaturezasOperacao();
  const atualizada = lista.filter((item) => item.id !== naturezaId);
  localStorage.setItem(STORAGE_KEY_NATUREZAS_OPERACAO, JSON.stringify(atualizada));
  window.dispatchEvent(new Event('coliseu_naturezas_operacao_updated'));
  return atualizada;
}

// Retorna somente as naturezas ativas para o Módulo de Vendas
export function getNaturezasAtivasParaVenda(): NaturezaOperacaoCompleta[] {
  return getNaturezasOperacao().filter((n) => n.status === 'ATIVA' && n.utilizarEmVendas);
}

// Retorna somente as naturezas ativas para o Módulo de Compras / Entrada de XML
export function getNaturezasAtivasParaCompras(): NaturezaOperacaoCompleta[] {
  return getNaturezasOperacao().filter((n) => n.status === 'ATIVA' && n.utilizarEmCompras);
}
