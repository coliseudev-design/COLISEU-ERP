export interface SyncMetadata {
  id: string;
  device_id: string;
  created_at: string;
  updated_at: string;
  x_sync_status: 'pending' | 'synced' | 'conflict';
  x_version: number;
  is_deleted: number;
}

export interface Empresa extends SyncMetadata {
  razao_social: string;
  nome_fantasia?: string;
  cnpj: string;
  inscricao_estadual?: string;
  ativo: boolean;
}

export interface CreateEmpresaPayload {
  razao_social: string;
  nome_fantasia?: string;
  cnpj: string;
  inscricao_estadual?: string;
}

export interface Filial extends SyncMetadata {
  empresa_id: string;
  codigo: string;
  nome: string;
  cnpj: string;
  inscricao_estadual?: string;
  endereco?: string;
  cidade?: string;
  uf?: string;
  ativo: boolean;
}

export interface CreateFilialPayload {
  empresa_id: string;
  codigo: string;
  nome: string;
  cnpj: string;
  inscricao_estadual?: string;
  endereco?: string;
  cidade?: string;
  uf?: string;
}

export interface Produto extends SyncMetadata {
  empresa_id: string;
  codigo_sku: string;
  codigo_barras?: string;
  descricao: string;
  unidade_medida: string;
  preco_custo: number;
  preco_venda: number;
  ncm?: string;
  cest?: string;
  ativo: boolean;
}

export interface CreateProdutoPayload {
  empresa_id: string;
  codigo_sku: string;
  codigo_barras?: string;
  descricao: string;
  unidade_medida: string;
  preco_custo: number;
  preco_venda: number;
  ncm?: string;
  cest?: string;
}

// INVENTORY TYPES
export interface Deposito extends SyncMetadata {
  filial_id: string;
  codigo: string;
  nome: string;
  padrao: number;
  ativo: number;
}

export interface CreateDepositoPayload {
  filial_id: string;
  codigo: string;
  nome: string;
  padrao: boolean;
}

export interface EstoqueSaldo extends SyncMetadata {
  deposito_id: string;
  produto_id: string;
  quantidade_atual: number;
  quantidade_reservada: number;
  codigo_sku?: string;
  descricao_produto?: string;
}

export interface EstoqueMovimentacao extends SyncMetadata {
  deposito_id: string;
  produto_id: string;
  tipo: 'ENTRADA' | 'SAIDA' | 'AJUSTE' | 'RESERVA' | 'CANCELAMENTO';
  quantidade: number;
  saldo_anterior: number;
  saldo_posterior: number;
  origem_documento?: string;
  origem_id?: string;
  observacao?: string;
  codigo_sku?: string;
  descricao_produto?: string;
}

export interface AjusteEstoquePayload {
  deposito_id: string;
  produto_id: string;
  tipo: 'ENTRADA' | 'SAIDA' | 'AJUSTE';
  quantidade: number;
  observacao?: string;
}

// FINANCIAL TYPES
export interface FinanceiroLancamento extends SyncMetadata {
  filial_id: string;
  pessoa_id?: string;
  venda_id?: string;
  tipo: 'RECEBER' | 'PAGAR';
  descricao: string;
  valor_total: number;
  valor_pago: number;
  data_vencimento: string;
  data_pagamento?: string;
  status: 'PENDENTE' | 'PAGO' | 'CANCELADO' | 'PARCIAL';
  nome_pessoa?: string;
}

export interface CreateLancamentoPayload {
  filial_id: string;
  pessoa_id?: string;
  venda_id?: string;
  tipo: 'RECEBER' | 'PAGAR';
  descricao: string;
  valor_total: number;
  data_vencimento: string;
}

export interface CaixaMovimentacao extends SyncMetadata {
  filial_id: string;
  dispositivo_id?: string;
  tipo: 'SUPRIMENTO' | 'SANGRIA' | 'VENDA_DINHEIRO' | 'VENDA_OUTROS' | 'PAGAMENTO_TITULO' | 'CANCELAMENTO_VENDA';
  valor: number;
  observacao?: string;
  usuario_id?: string;
}

export interface RegistrarCaixaPayload {
  filial_id: string;
  tipo: 'SUPRIMENTO' | 'SANGRIA';
  valor: number;
  observacao?: string;
  usuario_id?: string;
}

export interface ResumoCaixa {
  total_suprimentos: number;
  total_sangrias: number;
  total_vendas_dinheiro: number;
  total_vendas_outros: number;
  total_recebimentos_titulos: number;
  total_cancelamentos: number;
  saldo_dinheiro_caixa: number;
}

// SALES TYPES
export interface VendaItemPayload {
  produto_id: string;
  item_ordem: number;
  quantidade: number;
  preco_unitario: number;
  desconto_unitario: number;
  valor_total?: number;
}

export interface VendaPagamentoPayload {
  forma_pagamento: 'DINHEIRO' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'PIX' | 'BOLETO' | 'CREDIARIO';
  valor: number;
  troco: number;
  nsu_autorizacao?: string;
}

export interface CreateVendaPayload {
  filial_id: string;
  deposito_id: string;
  cliente_id?: string;
  vendedor_id?: string;
  valor_subtotal?: number;
  valor_desconto?: number;
  valor_desconto_global?: number;
  valor_total?: number;
  observacoes?: string;
  itens: VendaItemPayload[];
  pagamentos: VendaPagamentoPayload[];
}

export interface VendaHeader extends SyncMetadata {
  filial_id: string;
  deposito_id: string;
  cliente_id?: string;
  vendedor_id?: string;
  numero_venda: number;
  status: 'ABERTA' | 'CONCLUIDA' | 'CANCELADA';
  valor_subtotal: number;
  valor_desconto: number;
  valor_total: number;
  observacoes?: string;
}

export interface CalculatedSaleItem {
  id: string;
  produto_id: string;
  item_ordem: number;
  quantidade: number;
  preco_unitario: number;
  desconto_unitario: number;
  valor_total: number;
  descricao_produto?: string;
}

export interface SaleDetails {
  header: VendaHeader;
  itens: CalculatedSaleItem[];
  pagamentos: VendaPagamentoPayload[];
  chave_acesso_fiscal?: string;
}

export interface DbStatus {
  db_path: string;
  device_id: string;
  encrypted: boolean;
  tables_count: number;
}

export interface TableSyncValidation {
  table_name: string;
  columns_found: string[];
  missing_columns: string[];
  valid: boolean;
}

export interface SchemaValidationReport {
  total_tables: number;
  valid_tables: number;
  details: TableSyncValidation[];
  all_valid: boolean;
}

export interface BenchmarkReport {
  total_sales: number;
  write_time_secs: number;
  write_throughput_ops_sec: number;
  queue_drain_secs: number;
  queue_drain_rate: number;
  search_latency_ms: number;
  target_write_ops_met: boolean;
  target_queue_drain_met: boolean;
  target_search_latency_met: boolean;
  all_gates_passed: boolean;
}

