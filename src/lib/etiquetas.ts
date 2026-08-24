import { invoke } from "@tauri-apps/api/core";

export interface ItemEtiquetaInput {
  produto_id?: string;
  variante_id?: string;
  codigo_sku: string;
  codigo_barras?: string;
  descricao: string;
  tamanho?: string;
  cor?: string;
  preco_venda: number;
  quantidade: number;
}

export interface LoteEtiquetasOutput {
  total_etiquetas: number;
  zpl_raw: string;
  itens: ItemEtiquetaInput[];
}

export const etiquetasService = {
  async processarLoteEtiquetasZpl(
    tipoLayout: "GONDOLA" | "VESTUARIO",
    itens: ItemEtiquetaInput[]
  ): Promise<LoteEtiquetasOutput> {
    return await invoke<LoteEtiquetasOutput>("processar_lote_etiquetas_zpl", {
      tipoLayout,
      itens,
    });
  },

  async gerarZplGondola(
    descricao: string,
    sku: string,
    ean?: string,
    precoVenda: number = 0.0
  ): Promise<string> {
    return await invoke<string>("gerar_zpl_gondola", {
      descricao,
      sku,
      ean,
      precoVenda,
    });
  },

  async gerarZplVestuario(
    descricao: string,
    sku: string,
    tamanho?: string,
    cor?: string,
    ean?: string,
    precoVenda: number = 0.0
  ): Promise<string> {
    return await invoke<string>("gerar_zpl_vestuario", {
      descricao,
      sku,
      tamanho,
      cor,
      ean,
      precoVenda,
    });
  },
};
