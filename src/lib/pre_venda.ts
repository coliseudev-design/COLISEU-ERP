import { safeInvoke as invoke } from "./ipc";

export interface ItemComandaInput {
  produto_id: string;
  variante_id?: string;
  quantidade: number;
  preco_unitario: number;
}

export interface ComandaItemDet {
  id: string;
  produto_id: string;
  variante_id?: string;
  quantidade: number;
  preco_unitario: number;
  codigo_sku?: string;
  descricao_produto?: string;
}

export interface ComandaCompleta {
  id: string;
  filial_id: string;
  numero_comanda: string;
  cliente_nome: string;
  vendedor_id?: string;
  valor_total: number;
  status: string;
  itens: ComandaItemDet[];
}

export const preVendaService = {
  async criarPreVendaComanda(
    filialId: string,
    clienteNome: string,
    vendedorId: string | undefined,
    itens: ItemComandaInput[]
  ): Promise<ComandaCompleta> {
    return await invoke<ComandaCompleta>("criar_pre_venda_comanda", {
      filialId,
      clienteNome,
      vendedorId,
      itens,
    });
  },

  async puxarComandaParaPdv(numeroComanda: string): Promise<ComandaCompleta> {
    return await invoke<ComandaCompleta>("puxar_comanda_para_pdv", { numeroComanda });
  },
};
