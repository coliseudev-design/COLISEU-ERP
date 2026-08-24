import { safeInvoke as invoke } from "./ipc";

export interface RegraTributaria {
  id: string;
  empresa_id: string;
  ncm: string;
  uf_origem: string;
  uf_destino: string;
  crt: number;
  cfop_estado: string;
  cfop_interestado: string;
  csosn: string;
  cst_icms: string;
  aliquota_icms: number;
  aliquota_red_bc_icms: number;
  cst_pis: string;
  aliquota_pis: number;
  cst_cofins: string;
  aliquota_cofins: number;
  aliquota_ibpt_nacional: number;
  aliquota_ibpt_estadual: number;
}

export interface CalculoImpostoInput {
  ncm: string;
  valor_bruto_item: number;
  valor_desconto_item: number;
  quantidade: number;
  uf_origem: string;
  uf_destino: string;
  crt_empresa: number;
  regra_opt?: RegraTributaria | null;
}

export interface ResultadoTributarioItem {
  cfop: string;
  valor_liquido_item: number;
  csosn_ou_cst_icms: string;
  base_calculo_icms: number;
  aliquota_icms: number;
  valor_icms: number;
  cst_pis: string;
  aliquota_pis: number;
  valor_pis: number;
  cst_cofins: string;
  aliquota_cofins: number;
  valor_cofins: number;
  valor_ibpt_nacional: number;
  valor_ibpt_estadual: number;
  valor_total_tributos_ibpt: number;
}

export interface ItemNfeImportado {
  numero_item: number;
  codigo_fornecedor: string;
  descricao: string;
  ncm: string;
  cfop: string;
  unidade_compra: string;
  quantidade_compra: number;
  valor_unitario: number;
  valor_total: number;
}

export interface NfeEntradaParsed {
  chave_acesso: string;
  numero: string;
  serie: string;
  cnpj_emitente: string;
  nome_emitente: string;
  data_emissao: string;
  valor_total: number;
  itens: ItemNfeImportado[];
}

export const tributacaoService = {
  async salvarRegraTributaria(input: RegraTributaria): Promise<boolean> {
    return await invoke('salvar_regra_tributaria', { input });
  },

  async listarRegrasTributarias(empresaId: string): Promise<RegraTributaria[]> {
    return await invoke('listar_regras_tributarias', { empresaId });
  },

  async calcularTributacaoItem(input: CalculoImpostoInput): Promise<ResultadoTributarioItem> {
    return await invoke('calcular_tributacao_item', { input });
  },

  async importarXmlNfeFornecedor(filialId: string, xmlStr: string): Promise<NfeEntradaParsed> {
    return await invoke('importar_xml_nfe_fornecedor', { filialId, xmlStr });
  },

  async manifestarDestinatario(
    chaveAcesso: string,
    tipoEvento: string,
    cnpjDestinatario: string
  ): Promise<string> {
    return await invoke('manifestar_destinatario', {
      chaveAcesso,
      tipoEvento,
      cnpjDestinatario,
    });
  },

  async gerarArquivoSpedFiscal(
    filialId: string,
    dataInicio: string,
    dataFim: string
  ): Promise<string> {
    return await invoke('gerar_arquivo_sped_fiscal', {
      filialId,
      dataInicio,
      dataFim,
    });
  },
};
