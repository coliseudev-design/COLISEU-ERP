import { safeInvoke as invoke } from "./ipc";

export interface PixPayloadOutput {
  txid: string;
  valor: number;
  payload_emv: string;
  qr_code_svg: string;
}

export interface BoletoBancarioOutput {
  numero_documento: string;
  sacado_nome: string;
  valor: number;
  linha_digitavel: string;
  codigo_barras: string;
  data_vencimento: string;
}

export const pixBoletoService = {
  async gerarPixDinamicoVenda(
    chavePix: string,
    merchantName: string,
    merchantCity: string,
    valor: number,
    txid?: string
  ): Promise<PixPayloadOutput> {
    return await invoke<PixPayloadOutput>("gerar_pix_dinamico_venda", {
      chavePix,
      merchantName,
      merchantCity,
      valor,
      txid,
    });
  },

  async gerarBoletoBancario(
    bancoCodigo: string,
    nossoNumero: string,
    valor: number
  ): Promise<BoletoBancarioOutput> {
    return await invoke<BoletoBancarioOutput>("gerar_boleto_bancario", {
      bancoCodigo,
      nossoNumero,
      valor,
    });
  },
};
