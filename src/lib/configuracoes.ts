import { safeInvoke as invoke } from "./ipc";

export interface EmpresaConfigInput {
  id: string;
  razao_social: string;
  nome_fantasia?: string;
  cnpj: string;
  inscricao_estadual?: string;
  inscricao_municipal?: string;
  cnae_principal?: string;
  cnae_secundarios?: string;
  crt: number; // 1=SN, 2=SN Excesso, 3=Regime Normal, 4=MEI
  regime_pis_cofins?: string;
  regime_apuracao?: string;
  aliquota_simples_anexo: number;
  p_cred_sn: number;
  suframa?: string;
  nire?: string;
  natureza_juridica?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
  cod_municipio_ibge?: string;
  pais?: string;
  cod_pais_bacen?: string;
  telefone_1?: string;
  telefone_2?: string;
  email?: string;
  email_fiscal?: string;
  site?: string;
  responsavel?: string;
  logo_base64?: string;
  certificado_a1_alias?: string;
  certificado_a1_validade?: string;
  nicho_empresa?: string;
  praca?: string;
}

export interface ConfigItem {
  id: string;
  empresa_id: string;
  chave: string;
  valor: string;
  grupo: string;
}

export interface FilialNfeConfigInput {
  filial_id: string;
  serie_nfe: number;
  proximo_numero_nfe: number;
  ambiente_nfe: number; // 1=Producao, 2=Homologacao
  tp_imp_danfe: number; // 1=Retrato, 2=Paisagem, 3=Simplificado
  tp_emis_nfe: number; // 1=Normal, 4=EPEC, 5=FS-DA, 6=SVC-AN, 7=SVC-RS
  ind_sinc: number; // 0=Assincrono, 1=Sincrono
  versao_xml: string;
  logo_danfe_path?: string;
  xml_storage_path?: string;
  resp_tec_cnpj?: string;
  resp_tec_contato?: string;
  resp_tec_email?: string;
  resp_tec_fone?: string;
  resp_tec_id_csrt?: string;
  resp_tec_csrt?: string;
}

export interface FilialNfceConfigInput {
  filial_id: string;
  serie_nfce: number;
  proximo_numero_nfce: number;
  ambiente_nfce: number; // 1=Producao, 2=Homologacao
  csc_id?: string;
  csc_token?: string;
  tp_emis_nfce: number; // 1=Normal, 9=Contingencia Offline
  modelo_danfe_nfce: string; // PADRAO, SIMPLIFICADO, ELETRONICO
  tp_imp_danfe_nfce: number;
  versao_qrcode: string;
  qrcode_contingencia: string;
  usar_tef: number;
  fuso_horario: string;
  mostrar_troco: number;
  enviar_codigo_barras: number;
  contingencia_timeout_ms: number;
  xml_storage_path?: string;
  logo_danfce_path?: string;
}

export interface FilialNfseConfigInput {
  filial_id: string;
  ambiente_nfse: number; // 1=Producao, 2=Homologacao
  provedor_nfse: string; // BETHA, IPM, GINFES, WEBISS, DSF, SIMPLISS, NACIONAL
  url_ws_producao?: string;
  url_ws_homologacao?: string;
  usuario_ws?: string;
  senha_ws?: string;
  token_ws?: string;
  serie_rps: string;
  proximo_numero_rps: number;
  tipo_rps: number;
  regime_especial_tributacao: number;
  natureza_operacao: number;
  item_lista_servico: string;
  cod_tributacao_municipio?: string;
  cnae_servico: string;
  aliquota_iss: number;
  iss_retido: number;
  responsavel_retencao: number;
  incentivador_cultural: number;
  optante_simples_nfse: number;
  xml_storage_path?: string;
  logo_danfse_path?: string;
  versao_abrasf: string;
  usar_nfse_nacional: number;
}

export const configuracoesService = {
  async salvarDadosEmpresa(input: EmpresaConfigInput): Promise<string> {
    return await invoke<string>('salvar_dados_empresa', { input });
  },

  async carregarDadosEmpresa(empresaId: string): Promise<EmpresaConfigInput | null> {
    return await invoke<EmpresaConfigInput | null>('carregar_dados_empresa', { empresaId });
  },

  async salvarConfiguracao(
    empresaId: string,
    chave: string,
    valor: string,
    grupo: string
  ): Promise<void> {
    return await invoke<void>('salvar_configuracao', { empresaId, chave, valor, grupo });
  },

  async carregarConfiguracoes(
    empresaId: string,
    grupoOpt?: string
  ): Promise<ConfigItem[]> {
    return await invoke<ConfigItem[]>('carregar_configuracoes', { empresaId, grupoOpt });
  },

  async salvarConfigFiscalFilial(input: FilialNfeConfigInput): Promise<void> {
    return await invoke<void>('salvar_config_fiscal_filial', { input });
  },

  async carregarConfigFiscalFilial(filialId: string): Promise<FilialNfeConfigInput | null> {
    return await invoke<FilialNfeConfigInput | null>('carregar_config_fiscal_filial', { filialId });
  },

  async salvarConfigNfeFilial(input: FilialNfeConfigInput): Promise<void> {
    return await invoke<void>('salvar_config_nfe_filial', { input });
  },

  async carregarConfigNfeFilial(filialId: string): Promise<FilialNfeConfigInput | null> {
    return await invoke<FilialNfeConfigInput | null>('carregar_config_nfe_filial', { filialId });
  },

  async salvarConfigNfceFilial(input: FilialNfceConfigInput): Promise<void> {
    return await invoke<void>('salvar_config_nfce_filial', { input });
  },

  async carregarConfigNfceFilial(filialId: string): Promise<FilialNfceConfigInput | null> {
    return await invoke<FilialNfceConfigInput | null>('carregar_config_nfce_filial', { filialId });
  },

  async salvarConfigNfseFilial(input: FilialNfseConfigInput): Promise<void> {
    return await invoke<void>('salvar_config_nfse_filial', { input });
  },

  async carregarConfigNfseFilial(filialId: string): Promise<FilialNfseConfigInput | null> {
    return await invoke<FilialNfseConfigInput | null>('carregar_config_nfse_filial', { filialId });
  },

  // =========================================================================
  // GESTÃO DO MODO DE OPERAÇÃO (NUVEM AUTÔNOMA VS HÍBRIDO FIREBIRD)
  // =========================================================================
  async getModoOperacao(): Promise<{ modo_operacao: 'standalone' | 'firebird_worker'; descricao: string }> {
    try {
      const res = await fetch('/api/sync/modo-operacao');
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // ignore
    }
    const saved = localStorage.getItem('coliseu_modo_operacao');
    return {
      modo_operacao: (saved === 'firebird_worker' ? 'firebird_worker' : 'standalone'),
      descricao: saved === 'firebird_worker' ? 'Híbrido Integrado Firebird (Worker)' : 'Nuvem Autônoma (Banco Próprio)'
    };
  },

  async setModoOperacao(modo: 'standalone' | 'firebird_worker'): Promise<{ success: boolean; modo_operacao: string }> {
    localStorage.setItem('coliseu_modo_operacao', modo);
    try {
      const res = await fetch('/api/sync/modo-operacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modo_operacao: modo }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // ignore
    }
    return { success: true, modo_operacao: modo };
  },

  async getWorkerSyncStatus(): Promise<any> {
    try {
      const res = await fetch('/api/sync/status');
      if (res.ok) {
        return await res.json();
      }
    } catch (err: any) {
      return { error: err.message, status: [] };
    }
    return { status: [] };
  },

  async forcarSyncWorker(): Promise<any> {
    try {
      const res = await fetch('/api/sync/force', { method: 'POST' });
      return await res.json();
    } catch (err: any) {
      return { error: err.message };
    }
  }
};
