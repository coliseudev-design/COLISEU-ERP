import { safeInvoke as invoke } from "./ipc";

export interface SugestaoTributariaVarejo {
  ncm: string;
  cest?: string;
  cfop_venda: string;
  csosn_venda: string;
  pis_cst_venda: string;
  cofins_cst_venda: string;
  aliquota_ibpt_nacional: number;
  aliquota_ibpt_estadual: number;
  aliquota_ibpt_importado: number;
  descricao_ncm_oficial: string;
}

export interface ItemXmlParsed {
  item_seq: number;
  c_prod: string;
  c_ean?: string;
  x_prod: string;
  ncm: string;
  cest?: string;
  u_com: string;
  q_com: number;
  v_un_com: number;
  v_prod: number;
  cfop_entrada_sugerido: string;
  produto_id?: string;
  produto_sku?: string;
  eh_novo: boolean;
  fator_conversao: number;
  quantidade_fracionada: number;
  custo_unitario_fracionado: number;
  preco_venda_sugerido: number;
  divergencia_custo_percentual?: number;
  tributacao_sugerida: SugestaoTributariaVarejo;
  tem_grade: boolean;
}

export interface XmlEntradaAnalise {
  chave_nfe: string;
  numero_nota: string;
  emitente_cnpj: string;
  emitente_nome: string;
  valor_total_nfe: number;
  itens: ItemXmlParsed[];
}

export interface DistribuiçãoGradeInput {
  item_seq: number;
  variante_id: string;
  quantidade: number;
}

export interface ConfirmarEntradaXmlInput {
  filial_id: string;
  deposito_id: string;
  chave_nfe: string;
  distribuiçoes_grade: DistribuiçãoGradeInput[];
}

export interface BrasilApiNcmResponse {
  codigo: string;
  descricao: string;
  data_inicio?: string;
  data_fim?: string;
}

export const xmlImportService = {
  async analisarXmlNfeEntrada(empresaId: string, xmlConteudo: string): Promise<XmlEntradaAnalise> {
    return await invoke<XmlEntradaAnalise>("analisar_xml_nfe_entrada", { empresaId, xmlConteudo });
  },

  async confirmarEntradaXmlNfe(
    empresaId: string,
    analise: XmlEntradaAnalise,
    input: ConfirmarEntradaXmlInput
  ): Promise<number> {
    return await invoke<number>("confirmar_entrada_xml_nfe", { empresaId, analise, input });
  },

  async sugerirTributacaoEstadual(
    ncm: string,
    cest?: string,
    ufOrigem: string = "SP",
    ufDestino: string = "SP"
  ): Promise<SugestaoTributariaVarejo> {
    return await invoke<SugestaoTributariaVarejo>("sugerir_tributacao_estadual", {
      ncm,
      cest,
      ufOrigem,
      ufDestino,
    });
  },

  async consultarBrasilApiNcm(ncm: string): Promise<BrasilApiNcmResponse> {
    return await invoke<BrasilApiNcmResponse>("consultar_brasilapi_ncm", { ncm });
  },
};
