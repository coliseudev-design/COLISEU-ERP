/**
 * Coliseu ERP — Tipos TypeScript do Módulo Financeiro
 * Tipagem completa para liquidação, renegociação e pagamentos
 */

/** Título financeiro (conta a pagar ou receber) */
export interface TituloFinanceiro {
  codigo: string;
  emissao: string;
  parcela: string;
  tipo: 'R' | 'P'; // Receber ou Pagar
  vencimento: string;
  valorTitulo: number;
  valorAtual: number;
  valorPago: number;
  saldoDevedor: number;
  especie: string;
  status: 'Em Aberto' | 'Vencido' | 'Pago' | 'Parcial' | 'Renegociado' | 'Cancelado' | 'Protestado';
  pedido?: string;
  nf?: string;
  nfSerie?: string;
  portador?: string;
  planoContas?: string;
  centroCusto?: string;
  isVencido: boolean;
  diasAtraso: number;
  dataQuitacao?: string;
  idLancamento?: string; // ID no SQLite (UUID)
}

/** Pagamento individual em uma liquidação (suporte a multi-espécie) */
export interface PagamentoLiquidacao {
  especie: EspeciePagamento;
  valor: number;
  troco: number;
  nsuAutorizacao?: string;
  numeroCheque?: string;
  bancoOrigem?: string;
  dataCompensacao?: string;
  codigoDocumento?: string;
}

/** Espécies de pagamento suportadas */
export type EspeciePagamento =
  | 'DINHEIRO'
  | 'PIX'
  | 'CARTAO_CREDITO'
  | 'CARTAO_DEBITO'
  | 'CHEQUE_VISTA'
  | 'CHEQUE_PRE'
  | 'BOLETO'
  | 'DEPOSITO_TED'
  | 'CREDIARIO'
  | 'VALE_TROCA';

/** Payload enviado ao backend para liquidar títulos */
export interface LiquidacaoPayload {
  tituloIds: string[];
  pagamentos: PagamentoLiquidacao[];
  caixaId: string;
  contaBancariaId?: string;
  modoLiquidacao: ModoLiquidacao;
  desconto: number;
  juros: number;
  multa: number;
  valorTotal: number;
  dataLiquidacao: string;
  imprimirRecibo: boolean;
  observacao?: string;
  usuarioId?: string;
}

/** Modos de liquidação disponíveis */
export type ModoLiquidacao =
  | 'UNICO_LANCAMENTO'   // Liquidar todos em um único lançamento
  | 'INDIVIDUAL'          // Liquidar cada título individualmente
  | 'PARCIAL';            // Liquidar parcialmente (amortização)

/** Configuração de renegociação */
export interface RenegociacaoConfig {
  tituloIds: string[];
  descontoPercent: number;
  acrescimoPercent: number;
  numParcelas: number;
  intervaloDias: number;
  dataPrimeiraParcela: string;
  especieNovasParcelas: string;
  valorOriginal: number;
  valorDescontoCalculado: number;
  valorAcrescimoCalculado: number;
  valorFinalAcordo: number;
}

/** Parcela gerada na simulação de renegociação */
export interface ParcelaSimulada {
  numero: number;
  totalParcelas: number;
  vencimento: string;
  valor: number;
  label: string; // ex: "1/6"
}

/** Caixa do sistema */
export interface Caixa {
  id: string;
  nome: string;
  filial: string;
  ativo: boolean;
}

/** Conta Bancária */
export interface ContaBancaria {
  id: string;
  banco: string;
  codigoBanco: string;
  agencia: string;
  conta: string;
  digito: string;
  tipo: 'Conta Corrente' | 'Poupança' | 'Investimento';
  convenio?: string;
  carteira?: string;
  chavePix?: string;
  ativo: boolean;
}

/** Configurações financeiras da empresa */
export interface ConfigFinanceira {
  taxaMultaAtraso: number;      // % (default 2.00)
  taxaJurosMoraMensal: number;  // % a.m. (default 1.00)
  diasTolerancia: number;       // dias de carência (default 0)
  percentMaxDesconto: number;   // % máximo de desconto permitido (default 10.00)
  mensagemBoleto: string;
  instrucaoProtesto: string;
  boletoHibridoPix: boolean;
}

/** Grupo de acesso / perfil de permissões */
export interface GrupoAcesso {
  id: string;
  nome: string;
  descricao: string;
  ativo: boolean;
  usuarios: number;
  permissoes: PermissaoModulo[];
}

/** Permissão de um módulo específico */
export interface PermissaoModulo {
  modulo: string;
  visualizar: boolean;
  criar: boolean;
  editar: boolean;
  excluir: boolean;
  especial: boolean;
}

/** Módulos do sistema para controle de acesso */
export const MODULOS_SISTEMA = [
  'Painel Executivo',
  'Clientes & Parceiros',
  'Catálogo de Produtos',
  'Caixa PDV',
  'Vendas',
  'Compras & Fornecedores',
  'Estoque',
  'Financeiro',
  'Liquidação de Títulos',
  'Renegociação',
  'Contas Bancárias',
  'DRE & Relatórios',
  'Configurações',
  'Usuários & Permissões',
] as const;

/** Lista de espécies de pagamento com labels */
export const ESPECIES_PAGAMENTO: Array<{ value: EspeciePagamento; label: string; icon: string }> = [
  { value: 'DINHEIRO', label: 'Dinheiro', icon: 'Banknote' },
  { value: 'PIX', label: 'PIX', icon: 'QrCode' },
  { value: 'CARTAO_CREDITO', label: 'Cartão Crédito', icon: 'CreditCard' },
  { value: 'CARTAO_DEBITO', label: 'Cartão Débito', icon: 'CreditCard' },
  { value: 'CHEQUE_VISTA', label: 'Cheque à Vista', icon: 'FileText' },
  { value: 'CHEQUE_PRE', label: 'Cheque Pré', icon: 'FileText' },
  { value: 'BOLETO', label: 'Boleto', icon: 'FileText' },
  { value: 'DEPOSITO_TED', label: 'Depósito/TED', icon: 'Building' },
  { value: 'CREDIARIO', label: 'Crediário', icon: 'Wallet' },
  { value: 'VALE_TROCA', label: 'Vale-Troca', icon: 'Gift' },
];

/** Lista de bancos brasileiros comuns */
export const BANCOS_BRASILEIROS = [
  { codigo: '001', nome: 'BANCO DO BRASIL' },
  { codigo: '033', nome: 'SANTANDER' },
  { codigo: '104', nome: 'CAIXA ECONOMICA' },
  { codigo: '237', nome: 'BRADESCO' },
  { codigo: '341', nome: 'ITAÚ UNIBANCO' },
  { codigo: '748', nome: 'SICREDI' },
  { codigo: '756', nome: 'SICOOB' },
  { codigo: '077', nome: 'INTER' },
  { codigo: '260', nome: 'NUBANK' },
  { codigo: '336', nome: 'C6 BANK' },
] as const;
