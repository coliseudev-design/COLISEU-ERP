import { safeInvoke as invoke } from "./ipc";
import type {
  Deposito,
  CreateDepositoPayload,
  EstoqueSaldo,
  EstoqueMovimentacao,
  AjusteEstoquePayload,
} from "./types";

export interface ItemEntradaCompraInput {
  produto_id: string;
  quantidade_embalagem: number;
  fator_conversao: number;
  preco_custo_embalagem: number;
}

export interface EntradaCompraInput {
  filial_id: string;
  deposito_id: string;
  fornecedor_id?: string;
  numero_nota: string;
  itens: ItemEntradaCompraInput[];
}

export interface ResultadoEntradaCompra {
  pedido_id: string;
  numero_pedido: string;
  valor_total_compra: number;
  novos_custos_medios: Array<[string, number, number]>;
}

export interface TransferenciaItemInput {
  produto_id: string;
  quantidade: number;
}

export interface TransferenciaEstoqueInput {
  deposito_origem_id: string;
  deposito_destino_id: string;
  itens: TransferenciaItemInput[];
  observacao?: string;
}

/**
 * Service Layer / Wrapper para Gestão de Estoque Multi-depósito & Compras.
 */
export const inventoryService = {
  async listDepositos(filialId: string): Promise<Deposito[]> {
    return await invoke<Deposito[]>("list_depositos", { filialId });
  },

  async createDeposito(payload: CreateDepositoPayload): Promise<Deposito> {
    return await invoke<Deposito>("create_deposito", { payload });
  },

  async listEstoqueSaldos(depositoId: string): Promise<EstoqueSaldo[]> {
    return await invoke<EstoqueSaldo[]>("list_estoque_saldos", { depositoId });
  },

  async listEstoqueMovimentacoes(
    depositoId: string,
    produtoId?: string
  ): Promise<EstoqueMovimentacao[]> {
    return await invoke<EstoqueMovimentacao[]>("list_estoque_movimentacoes", {
      depositoId,
      produtoId,
    });
  },

  async ajustarEstoque(payload: AjusteEstoquePayload): Promise<EstoqueSaldo> {
    return await invoke<EstoqueSaldo>("ajustar_estoque", { payload });
  },

  async reservarEstoque(
    depositoId: string,
    produtoId: string,
    quantidade: number,
    origemId?: string
  ): Promise<EstoqueSaldo> {
    return await invoke<EstoqueSaldo>("reservar_estoque", {
      depositoId,
      produtoId,
      quantidade,
      origemId,
    });
  },

  async processarEntradaCompra(input: EntradaCompraInput): Promise<ResultadoEntradaCompra> {
    return await invoke<ResultadoEntradaCompra>("processar_entrada_compra", { input });
  },

  async executarTransferenciaEstoque(input: TransferenciaEstoqueInput): Promise<string> {
    return await invoke<string>("executar_transferencia_estoque", { input });
  },
};
