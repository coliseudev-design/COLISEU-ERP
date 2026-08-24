import { invoke } from "@tauri-apps/api/core";

export interface DocumentoFiscalResult {
  id: string;
  chave_acesso: string;
  status: 'autorizado' | 'contingencia' | 'rejeitado' | 'digitacao';
  modelo: number;
  serie: number;
  numero: number;
  xml_envio: string;
  xml_retorno?: string;
  qrcode_url: string;
  motivo_status?: string;
  protocolo?: string;
}

export interface SefazStatusResult {
  c_stat: number;
  x_motivo: string;
  uf: string;
  ambiente: number;
  dh_rec_bto: string;
  t_med: number;
  ver_aplic: string;
}

export interface NfseDocumentoResult {
  id: string;
  numero_nfse?: number;
  numero_rps: number;
  serie_rps: string;
  dps_id: string;
  chave_acesso_nacional?: string;
  tomador_cpf_cnpj: string;
  tomador_nome: string;
  valor_servicos: number;
  valor_iss: number;
  aliquota_iss: number;
  status: string;
  xml_dps: string;
  xml_nfse?: string;
  pdf_url?: string;
  xml_path?: string;
  motivo: string;
}

export interface CertificadoInstaladoInfo {
  alias: string;
  subject_name: string;
  cnpj?: string;
  validade: string;
  emissor: string;
  serial_number: string;
  is_file: boolean;
  file_path?: string;
}

/**
 * Service Layer para Operações Fiscais e Impressão Térmica DANFE NFC-e.
 * Adere rigorosamente à rule-01-security-isolation.md e rule-04-secrets-vault.md.
 */
export const fiscalService = {
  /**
   * Armazena a senha do certificado A1 com segurança no OS Keyring.
   */
  async salvarCertificadoA1(alias: string, password: string): Promise<string> {
    return await invoke<string>("salvar_certificado_a1", {
      input: { alias, password, pfx_base64: undefined, file_path: undefined },
    });
  },

  /**
   * Lista certificados digitais A1 (.pfx / .p12) instalados no Windows/Terminal local.
   */
  async listarCertificadosInstaladosTerminal(): Promise<CertificadoInstaladoInfo[]> {
    return await invoke<CertificadoInstaladoInfo[]>("listar_certificados_instalados_terminal");
  },

  /**
   * Valida a senha do certificado A1 e vincula os dados à Empresa.
   */
  async validarEVincularCertificadoA1(
    alias: string,
    password: string,
    pfxBase64?: string,
    filePath?: string
  ): Promise<string> {
    return await invoke<string>("validar_e_vincular_certificado_a1", {
      input: {
        alias,
        password,
        pfx_base64: pfxBase64,
        file_path: filePath,
      },
    });
  },

  /**
   * Emite uma NFC-e (modelo 65) ou NF-e (modelo 55) síncrona ou em contingência offline.
   */
  async emitirNFCe(
    vendaId: string,
    modeloOpt?: number,
    tpEmisOpt?: number
  ): Promise<DocumentoFiscalResult> {
    return await invoke<DocumentoFiscalResult>("emitir_nfce", {
      vendaId,
      modeloOpt,
      tpEmisOpt,
    });
  },

  /**
   * Consulta um documento fiscal local pelo ID ou pela Chave de Acesso de 44 dígitos.
   */
  async consultarDocumentoFiscal(chaveOuId: string): Promise<DocumentoFiscalResult> {
    return await invoke<DocumentoFiscalResult>("consultar_documento_fiscal", {
      chaveOuId,
    });
  },

  /**
   * Força a retransmissão manual dos documentos fiscais em contingência offline.
   */
  async retransmitirContingencia(): Promise<number> {
    return await invoke<number>("retransmitir_contingencia");
  },

  /**
   * Gera os bytes ESC/POS para impressão do DANFE NFC-e (80mm ou 58mm).
   */
  async imprimirDanfeNFCe(
    documentoId: string,
    larguraMmOpt?: number
  ): Promise<Uint8Array> {
    const rawBytes = await invoke<number[]>("imprimir_danfe_nfce", {
      documentoId,
      larguraMmOpt,
    });
    return new Uint8Array(rawBytes);
  },

  /**
   * Consulta/Baixa o XML da NF-e v4.00 diretamente da SEFAZ utilizando a Chave de Acesso de 44 dígitos.
   */
  async consultarXmlSefazPorChave(chave: string): Promise<string> {
    return await invoke<string>("consultar_xml_sefaz_por_chave", { chave });
  },

  /**
   * Consulta o Status do Serviço da SEFAZ (NfeStatusServico v4.00)
   */
  async consultarStatusServicoSefaz(
    ufOpt?: string,
    ambienteOpt?: number
  ): Promise<SefazStatusResult> {
    return await invoke<SefazStatusResult>("consultar_status_servico_sefaz", {
      ufOpt,
      ambienteOpt,
    });
  },

  /**
   * Emite uma NFS-e no padrão Padrão Nacional ADN (Declaração de Prestação de Serviços - DPS)
   */
  async emitirNfseNacional(
    filialId: string,
    tomadorCpfCnpj: string,
    tomadorNome: string,
    valorServicos: number,
    descricaoServico: string
  ): Promise<NfseDocumentoResult> {
    return await invoke<NfseDocumentoResult>("emitir_nfse_nacional", {
      filialId,
      tomadorCpfCnpj,
      tomadorNome,
      valorServicos,
      descricaoServico,
    });
  },

  /**
   * Consulta a disponibilidade do WebService da NFS-e Nacional (Serpro / Receita Federal).
   */
  async consultarStatusNfseNacional(filialId: string): Promise<SefazStatusResult> {
    return await invoke<SefazStatusResult>("consultar_status_nfse_nacional", { filialId });
  },

  /**
   * Emite uma Carta de Correção Eletrônica (CC-e) para NF-e (Modelo 55)
   */
  async cartaCorrecaoNfe(
    chaveAcesso: string,
    correcaoTexto: string,
    sequenciaEvento?: number
  ): Promise<string> {
    return await invoke<string>("carta_correcao_nfe", {
      chaveAcesso,
      correcaoTexto,
      sequenciaEvento,
    });
  },

  /**
   * Inutiliza uma faixa de numeração de NF-e (Modelo 55)
   */
  async inutilizarNfe(
    serie: number,
    numeroInicial: number,
    numeroFinal: number,
    justificativa: string
  ): Promise<string> {
    return await invoke<string>("inutilizar_nfe", {
      serie,
      numeroInicial,
      numeroFinal,
      justificativa,
    });
  },

  /**
   * Inutiliza uma faixa de numeração de NFC-e (Modelo 65)
   */
  async inutilizarNfce(
    serie: number,
    numeroInicial: number,
    numeroFinal: number,
    justificativa: string
  ): Promise<string> {
    return await invoke<string>("inutilizar_nfce", {
      serie,
      numeroInicial,
      numeroFinal,
      justificativa,
    });
  },

  /**
   * Cancela uma NFS-e no Portal da Prefeitura / ADN Nacional
   */
  async cancelarNfse(idOuChave: string, motivo: string): Promise<string> {
    return await invoke<string>("cancelar_nfse", { idOuChave, motivo });
  },
};
