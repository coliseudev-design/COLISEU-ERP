import { invoke } from "@tauri-apps/api/core";

export interface Promocao {
  id: string;
  empresa_id: string;
  nome: string;
  tipo_promocao: 'ATACADO_QTD' | 'LEVE_X_PAGUE_Y' | 'DESCONTO_PERCENTUAL';
  produto_id?: string;
  quantidade_minima: number;
  preco_promocional?: number;
  percentual_desconto?: number;
  quantidade_pague?: number;
  ativo: number;
}

export interface ItemCarrinhoInput {
  produto_id: string;
  quantidade: number;
  preco_unitario_original: number;
}

export interface ItemCarrinhoCalculado {
  produto_id: string;
  quantidade: number;
  preco_unitario_original: number;
  preco_unitario_final: number;
  valor_subtotal_bruto: number;
  valor_desconto_promocional: number;
  valor_total_final: number;
  promocao_aplicada_nome?: string;
}

export interface ResultadoCarrinhoPromocional {
  total_bruto: number;
  total_desconto_promocional: number;
  total_liquido: number;
  itens: ItemCarrinhoCalculado[];
}

export const promotionsService = {
  async salvarPromocao(
    empresaId: string,
    nome: string,
    tipoPromocao: string,
    produtoId: string | undefined,
    quantidadeMinima: number,
    precoPromocional?: number,
    percentualDesconto?: number,
    quantidadePague?: number
  ): Promise<string> {
    return await invoke<string>("salvar_promocao", {
      empresaId,
      nome,
      tipoPromocao,
      produtoId,
      quantidadeMinima,
      precoPromocional,
      percentualDesconto,
      quantidadePague,
    });
  },

  async listarPromocoesAtivas(empresaId: string): Promise<Promocao[]> {
    return await invoke<Promocao[]>("listar_promocoes_ativas", { empresaId });
  },

  async calcularPromocoesCarrinho(
    empresaId: string,
    itensCarrinho: ItemCarrinhoInput[]
  ): Promise<ResultadoCarrinhoPromocional> {
    return await invoke<ResultadoCarrinhoPromocional>("calcular_promocoes_carrinho", {
      empresaId,
      itensCarrinho,
    });
  },
};
