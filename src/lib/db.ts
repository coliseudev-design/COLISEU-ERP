import { safeInvoke as invoke } from "./ipc";
import type {
  DbStatus,
  SchemaValidationReport,
  Empresa,
  CreateEmpresaPayload,
  Filial,
  CreateFilialPayload,
  Produto,
  CreateProdutoPayload,
  VendaHeader,
  CreateVendaPayload,
  SaleDetails,
} from "./types";

/**
 * Service Layer / Wrapper para invocação segura de comandos IPC Rust ↔ React.
 * Adere estritamente à rule-01-security-isolation.md (sem SQL no frontend).
 */
export const dbService = {
  /**
   * Obtém status do banco de dados local criptografado.
   */
  async getDbStatus(): Promise<DbStatus> {
    return await invoke<DbStatus>("get_db_status");
  },

  /**
   * Executa a verificação do AUDIT GATE 1 validando colunas de sync em todas as 15 tabelas.
   */
  async validateSyncSchema(): Promise<SchemaValidationReport> {
    return await invoke<SchemaValidationReport>("validate_sync_schema");
  },

  /**
   * Cadastra uma nova Empresa.
   */
  async createEmpresa(payload: CreateEmpresaPayload): Promise<Empresa> {
    return await invoke<Empresa>("create_empresa", { payload });
  },

  /**
   * Lista todas as empresas cadastradas no dispositivo.
   */
  async listEmpresas(): Promise<Empresa[]> {
    return await invoke<Empresa[]>("list_empresas");
  },

  /**
   * Cadastra uma nova Filial.
   */
  async createFilial(payload: CreateFilialPayload): Promise<Filial> {
    return await invoke<Filial>("create_filial", { payload });
  },

  /**
   * Cadastra um novo Produto.
   */
  async createProduto(payload: CreateProdutoPayload): Promise<Produto> {
    return await invoke<Produto>("create_produto", { payload });
  },

  /**
   * Lista os produtos de uma empresa.
   */
  async listProdutos(empresaId: string): Promise<Produto[]> {
    return await invoke<Produto[]>("list_produtos", { empresaId });
  },

  /**
   * Registra uma nova venda (transação atômica).
   */
  async createVenda(payload: CreateVendaPayload): Promise<VendaHeader> {
    return await invoke<VendaHeader>("create_venda", { payload });
  },

  /**
   * Lista as vendas efetuadas em uma filial.
   */
  async listVendas(filialId: string): Promise<VendaHeader[]> {
    return await invoke<VendaHeader[]>("list_vendas", { filialId });
  },

  /**
   * Obtém detalhes completos de uma venda (itens, pagamentos, fiscal).
   */
  async getVendaDetails(vendaId: string): Promise<SaleDetails> {
    return await invoke<SaleDetails>("get_venda_details", { vendaId });
  },

  /**
   * Cancela uma venda com estorno de estoque e lançamentos.
   */
  async cancelarVenda(vendaId: string, motivo: string): Promise<VendaHeader> {
    return await invoke<VendaHeader>("cancelar_venda", { vendaId, motivo });
  },

  /**
   * Executa o benchmark do AUDIT GATE 6 (estresse de escrita, drenagem de fila, latência indexada).
   */
  async runAuditBenchmark(sampleSize?: number): Promise<import("./types").BenchmarkReport> {
    return await invoke<import("./types").BenchmarkReport>("run_audit_benchmark", { sampleSize });
  },
};

