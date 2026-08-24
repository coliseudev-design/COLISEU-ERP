use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct PessoaDanfse {
    pub cnpj_cpf_nif: String,
    pub im: Option<String>,
    pub telefone: Option<String>,
    pub nome_razao_social: String,
    pub municipio_uf: String,
    pub ibge_cep: String,
    pub endereco: String,
    pub email: Option<String>,
    pub simples_nacional: Option<String>,
    pub regime_sn: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct TribIssqnDanfse {
    pub tipo_tributacao: String,
    pub municipio_incidencia: String,
    pub regime_especial: Option<String>,
    pub tipo_imunidade: Option<String>,
    pub suspensao_exigibilidade: Option<String>,
    pub num_processo_suspensao: Option<String>,
    pub beneficio_municipal: Option<String>,
    pub calculo_bm: Option<String>,
    pub total_deducoes_reducoes: Option<String>,
    pub desconto_incondicionado: Option<String>,
    pub bc_issqn: f64,
    pub aliquota: f64,
    pub retencao_issqn: String,
    pub issqn_apurado: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct TribFederalDanfse {
    pub irrf: Option<f64>,
    pub inss: Option<f64>,
    pub csll: Option<f64>,
    pub pis: Option<f64>,
    pub cofins: Option<f64>,
    pub desc_contrib_sociais: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct TribIbsCbsDanfse {
    pub cst_cclasstrib: Option<String>,
    pub ind_operacao_municipio: Option<String>,
    pub exclusoes_reducoes_bc: Option<f64>,
    pub bc_apos_exclusoes: Option<f64>,
    pub red_aliq_ibs_cbs: Option<String>,
    pub aliq_ibs_uf_mun: Option<String>,
    pub aliq_efetiva_ibs_mun: Option<f64>,
    pub val_apurado_ibs_mun: Option<f64>,
    pub aliq_efetiva_ibs_uf: Option<f64>,
    pub val_apurado_ibs_uf: Option<f64>,
    pub val_total_ibs: Option<f64>,
    pub aliq_cbs: Option<f64>,
    pub aliq_efetiva_cbs: Option<f64>,
    pub val_total_cbs: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct TotaisDanfse {
    pub valor_servico: f64,
    pub desconto_incondicionado: f64,
    pub desconto_condicionado: f64,
    pub total_retencoes: f64,
    pub valor_liquido_nfse: f64,
    pub total_ibs_cbs: f64,
    pub valor_liquido_total: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct DanfseData {
    // Cabeçalho
    pub tp_amb: u8,                          // 1=Produção, 2=Homologação
    pub amb_ger: String,                     // Ambiente Gerador (ex: "Sistema Nacional NFS-e")
    pub municipio_emitente: String,          // Município / UF
    
    // Identificação da NFS-e
    pub chave_acesso: String,                // 50 dígitos
    pub numero_nfse: String,                 // Número NFS-e (ou RPS)
    pub competencia: String,                 // DD/MM/AAAA
    pub data_hora_emissao_nfse: String,      // DD/MM/AAAA hh:mm:ss
    pub numero_dps: String,                  // Nº DPS
    pub serie_dps: String,                   // Série DPS
    pub data_hora_emissao_dps: String,       // DD/MM/AAAA hh:mm:ss
    pub emitente: String,                    // Descrição (ex: "Prestador")
    pub situacao: String,                    // Descrição cStat (ex: "NFS-e Regular")
    pub finalidade: String,                  // Descrição finNFSe (ex: "NFS-e Regular")
    
    // Sujeitos da Operação
    pub prestador: PessoaDanfse,
    pub tomador: Option<PessoaDanfse>,
    pub destinatario: Option<PessoaDanfse>,
    pub dest_eh_tomador: bool,
    pub intermediario: Option<PessoaDanfse>,
    
    // Serviço Prestado
    pub cod_trib_nac_mun: String,            // nn.nn.nn / nnn
    pub cod_nbs: String,                     // n.nnnn.nn.nn
    pub local_prestacao: String,             // Município / UF / País
    pub desc_cod_trib: String,               // Descrição do código de tributação
    pub desc_servico: String,                // Discriminação dos serviços
    
    // Tributações
    pub trib_issqn: Option<TribIssqnDanfse>,
    pub trib_federal: TribFederalDanfse,
    pub trib_ibs_cbs: TribIbsCbsDanfse,
    
    // Totais
    pub totais: TotaisDanfse,
    
    // Informações Complementares & Tributos Aproximados
    pub info_complementares: String,
    pub totais_aprox_tributos: String,       // Lei 12.741/2012
    
    // Flags
    pub cancelada: bool,
    pub substituida: bool,
    pub incluir_canhoto: bool,
}
