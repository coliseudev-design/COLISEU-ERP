//! Construtor de Arquivo de Integração Padrão TX2 Oficial da TecnoSpeed para CT-e 4.00 (Modelo 57)

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TecnoSpeedCteComponenteValor {
    pub nome: String,     // FRETE_PESO, PEDAGIO, GRIS, AD_VALOREM, OUTROS
    pub valor: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TecnoSpeedCteNfeVinculada {
    pub chave_nfe: String,
    pub valor_total: Option<f64>,
    pub peso_kg: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TecnoSpeedCteDados {
    pub serie: u32,
    pub numero: u32,
    pub natureza_operacao: String,
    pub cfop: String,
    pub ambiente: String, // "PRODUÇÃO" ou "HOMOLOGAÇÃO"
    pub tipo_servico: u32, // 0 = Normal, 1 = Subcontratacao, 2 = Redespacho, 3 = Redespacho Intermediario, 4 = Servico Vinculado a Multimodal
    pub tipo_cte: u32,     // 0 = Normal, 1 = Complemento, 2 = Anulacao, 3 = Substituto

    // Origem & Destino
    pub uf_inicio: String,
    pub municipio_inicio_ibge: String,
    pub municipio_inicio_nome: String,
    pub uf_fim: String,
    pub municipio_fim_ibge: String,
    pub municipio_fim_nome: String,

    // Tomador do Serviço: 0=Remetente, 1=Expedidor, 2=Recebedor, 3=Destinatário, 4=Outros
    pub tomador_tipo: u32,

    // Emitente
    pub emitente_cnpj: String,
    pub emitente_razao: String,
    pub emitente_ie: String,
    pub emitente_uf: String,
    pub emitente_municipio_ibge: String,

    // Remetente
    pub remetente_cnpj_cpf: String,
    pub remetente_razao: String,
    pub remetente_ie: Option<String>,
    pub remetente_uf: String,
    pub remetente_municipio_ibge: String,
    pub remetente_municipio_nome: String,
    pub remetente_logradouro: Option<String>,
    pub remetente_numero: Option<String>,
    pub remetente_bairro: Option<String>,
    pub remetente_cep: Option<String>,

    // Destinatário
    pub destinatario_cnpj_cpf: String,
    pub destinatario_razao: String,
    pub destinatario_ie: Option<String>,
    pub destinatario_uf: String,
    pub destinatario_municipio_ibge: String,
    pub destinatario_municipio_nome: String,
    pub destinatario_logradouro: Option<String>,
    pub destinatario_numero: Option<String>,
    pub destinatario_bairro: Option<String>,
    pub destinatario_cep: Option<String>,

    // Valores da Prestação
    pub valor_total_prestacao: f64,
    pub valor_a_receber: f64,
    pub componentes: Vec<TecnoSpeedCteComponenteValor>,

    // Tributação ICMS
    pub cst_icms: String, // "00", "20", "40", "60", "90", "SN"
    pub base_calculo_icms: f64,
    pub aliquota_icms: f64,
    pub valor_icms: f64,

    // Informações da Carga
    pub valor_total_carga: f64,
    pub produto_predominante: String,
    pub outras_caracteristicas_carga: Option<String>,
    pub peso_bruto_kg: f64,
    pub peso_liquido_kg: Option<f64>,
    pub metro_cubico: Option<f64>,
    pub quantidade_volumes: Option<f64>,

    // Documentos Vinculados (NF-es)
    pub nfes_vinculadas: Vec<TecnoSpeedCteNfeVinculada>,

    // Dados do Modal Rodoviário
    pub rntrc: String,
    pub veiculo_placa: String,
    pub veiculo_renavam: Option<String>,
    pub veiculo_tara_kg: Option<u32>,
    pub veiculo_capacidade_kg: Option<u32>,
    pub veiculo_capacidade_m3: Option<u32>,
    pub veiculo_tipo_propriedade: Option<String>, // "P" (Proprio) ou "T" (Terceiro)
    pub veiculo_tipo_veiculo: Option<String>,     // "0"=Tracao, "1"=Reboque
    pub veiculo_tipo_rodado: Option<String>,      // "00"=Nao aplicavel, "01"=Truck, "02"=Toco, "03"=Cavalo
    pub veiculo_tipo_carroceria: Option<String>,  // "00"=Nao aplicavel, "01"=Aberta, "02"=Fechada/Bau
    pub veiculo_uf: String,

    // Motorista / Condutor
    pub motorista_nome: String,
    pub motorista_cpf: String,

    // Seguro da Carga (Obrigatório RCTR-C / SUSEP)
    pub seguradora_responsavel: Option<u32>, // 0=Remetente, 1=Expedidor, 2=Recebedor, 3=Destinatário, 4=Emitente, 5=Tomador
    pub seguradora_nome: Option<String>,
    pub seguradora_apolice: Option<String>,
    pub seguradora_averbacao: Option<String>,

    // Dados de Cobrança / Fatura
    pub cobranca_numero_fatura: Option<String>,
    pub cobranca_valor_original: Option<f64>,
    pub cobranca_valor_liquido: Option<f64>,
    pub cobranca_vencimento: Option<String>,

    // Informações Adicionais
    pub observacoes: Option<String>,
}

/// Gera o conteúdo TX2 oficial para emissão de CT-e 4.00 compatível com TecnoSpeed spdCTeX e Manager
pub fn gerar_arquivo_tx2_cte(dados: &TecnoSpeedCteDados) -> String {
    let mut tx2 = String::new();

    let tp_amb = if dados.ambiente.to_uppercase().contains("PROD") { "1" } else { "2" };
    let data_hora_emissao = chrono::Local::now().format("%Y-%m-%dT%H:%M:%S%:z").to_string();
    let codigo_aleatorio = format!("{:08}", rand::random::<u32>() % 100000000);

    // Bloco Principal de Identificação do CT-e 4.00
    tx2.push_str("INCLUIRCTE\n");
    tx2.push_str(&format!("versao_A02=4.00\n"));
    tx2.push_str(&format!("cCT_B03={}\n", codigo_aleatorio));
    tx2.push_str(&format!("CFOP_B04={}\n", dados.cfop.replace(".", "")));
    tx2.push_str(&format!("natOp_B05={}\n", dados.natureza_operacao));
    tx2.push_str("mod_B06=57\n");
    tx2.push_str(&format!("serie_B07={}\n", dados.serie));
    tx2.push_str(&format!("nCT_B08={}\n", dados.numero));
    tx2.push_str(&format!("dhEmi_B09={}\n", data_hora_emissao));
    tx2.push_str("tpImp_B10=1\n"); // 1 = Retrato
    tx2.push_str("tpEmis_B11=1\n"); // 1 = Normal
    tx2.push_str(&format!("tpAmb_B13={}\n", tp_amb));
    tx2.push_str(&format!("tpCTe_B14={}\n", dados.tipo_cte));
    tx2.push_str("procEmi_B15=0\n"); // 0 = Emissao de CT-e com aplicativo do contribuinte
    tx2.push_str("verProc_B16=Coliseu_ERP_v2.0\n");
    tx2.push_str(&format!("tpServ_B22={}\n", dados.tipo_servico));

    // Percurso de Transporte (Origem e Destino)
    tx2.push_str(&format!("cMunIni_B18={}\n", dados.municipio_inicio_ibge));
    tx2.push_str(&format!("xMunIni_B19={}\n", dados.municipio_inicio_nome));
    tx2.push_str(&format!("UFIni_B20={}\n", dados.uf_inicio));
    tx2.push_str(&format!("cMunFim_B21={}\n", dados.municipio_fim_ibge));
    tx2.push_str(&format!("xMunFim_B22={}\n", dados.municipio_fim_nome));
    tx2.push_str(&format!("UFFim_B23={}\n", dados.uf_fim));
    tx2.push_str("retira_B24=1\n"); // 1 = Não retira pelo tomador
    tx2.push_str("indIEToma_B26=1\n"); // 1 = Contribuinte ICMS

    // Tomador do Serviço
    tx2.push_str(&format!("toma_B28={}\n", dados.tomador_tipo));

    // Bloco Emitente
    tx2.push_str(&format!("CNPJ_C02={}\n", dados.emitente_cnpj.replace(&['.', '-', '/'][..], "")));
    tx2.push_str(&format!("IE_C03={}\n", dados.emitente_ie.replace(&['.', '-'][..], "")));
    tx2.push_str(&format!("xNome_C04={}\n", dados.emitente_razao));
    tx2.push_str(&format!("cMun_C11={}\n", dados.emitente_municipio_ibge));
    tx2.push_str(&format!("UF_C13={}\n", dados.emitente_uf));

    // Bloco Remetente
    let rem_doc = dados.remetente_cnpj_cpf.replace(&['.', '-', '/'][..], "");
    if rem_doc.len() == 14 {
        tx2.push_str(&format!("CNPJ_E02={}\n", rem_doc));
    } else {
        tx2.push_str(&format!("CPF_E03={}\n", rem_doc));
    }
    tx2.push_str(&format!("IE_E04={}\n", dados.remetente_ie.as_deref().unwrap_or("ISENTO")));
    tx2.push_str(&format!("xNome_E05={}\n", dados.remetente_razao));
    tx2.push_str(&format!("xLgr_E07={}\n", dados.remetente_logradouro.as_deref().unwrap_or("RUA PRINCIPAL")));
    tx2.push_str(&format!("nro_E08={}\n", dados.remetente_numero.as_deref().unwrap_or("S/N")));
    tx2.push_str(&format!("xBairro_E10={}\n", dados.remetente_bairro.as_deref().unwrap_or("CENTRO")));
    tx2.push_str(&format!("cMun_E11={}\n", dados.remetente_municipio_ibge));
    tx2.push_str(&format!("xMun_E12={}\n", dados.remetente_municipio_nome));
    tx2.push_str(&format!("CEP_E13={}\n", dados.remetente_cep.as_deref().unwrap_or("79800000").replace("-", "")));
    tx2.push_str(&format!("UF_E14={}\n", dados.remetente_uf));

    // Bloco Destinatário
    let dest_doc = dados.destinatario_cnpj_cpf.replace(&['.', '-', '/'][..], "");
    if dest_doc.len() == 14 {
        tx2.push_str(&format!("CNPJ_F02={}\n", dest_doc));
    } else {
        tx2.push_str(&format!("CPF_F03={}\n", dest_doc));
    }
    tx2.push_str(&format!("IE_F04={}\n", dados.destinatario_ie.as_deref().unwrap_or("ISENTO")));
    tx2.push_str(&format!("xNome_F05={}\n", dados.destinatario_razao));
    tx2.push_str(&format!("xLgr_F07={}\n", dados.destinatario_logradouro.as_deref().unwrap_or("AVENIDA CENTRAL")));
    tx2.push_str(&format!("nro_F08={}\n", dados.destinatario_numero.as_deref().unwrap_or("100")));
    tx2.push_str(&format!("xBairro_F10={}\n", dados.destinatario_bairro.as_deref().unwrap_or("CENTRO")));
    tx2.push_str(&format!("cMun_F11={}\n", dados.destinatario_municipio_ibge));
    tx2.push_str(&format!("xMun_F12={}\n", dados.destinatario_municipio_nome));
    tx2.push_str(&format!("CEP_F13={}\n", dados.destinatario_cep.as_deref().unwrap_or("79000000").replace("-", "")));
    tx2.push_str(&format!("UF_F14={}\n", dados.destinatario_uf));

    // Valores da Prestação do Serviço
    tx2.push_str(&format!("vTPrest_J02={:.2}\n", dados.valor_total_prestacao));
    tx2.push_str(&format!("vRec_J03={:.2}\n", dados.valor_a_receber));

    // Componentes do Frete (TecnoSpeed INCLUIRCOMPONENTE_J04)
    if dados.componentes.is_empty() {
        tx2.push_str("INCLUIRCOMPONENTE_J04\n");
        tx2.push_str("xNome_J05=FRETE VALOR\n");
        tx2.push_str(&format!("vComp_J06={:.2}\n", dados.valor_total_prestacao));
        tx2.push_str("SALVARCOMPONENTE_J04\n");
    } else {
        for comp in &dados.componentes {
            tx2.push_str("INCLUIRCOMPONENTE_J04\n");
            tx2.push_str(&format!("xNome_J05={}\n", comp.nome));
            tx2.push_str(&format!("vComp_J06={:.2}\n", comp.valor));
            tx2.push_str("SALVARCOMPONENTE_J04\n");
        }
    }

    // Tributação ICMS do CT-e
    if dados.cst_icms.contains("SN") || dados.cst_icms == "SIMPLES" {
        tx2.push_str("CST_M02=SN\n");
        tx2.push_str("indSN_M03=1\n");
    } else if dados.cst_icms == "00" {
        tx2.push_str("CST_M02=00\n");
        tx2.push_str(&format!("vBC_M03={:.2}\n", dados.base_calculo_icms));
        tx2.push_str(&format!("pICMS_M04={:.2}\n", dados.aliquota_icms));
        tx2.push_str(&format!("vICMS_M05={:.2}\n", dados.valor_icms));
    } else if dados.cst_icms == "20" {
        tx2.push_str("CST_M02=20\n");
        tx2.push_str(&format!("pRedBC_M03=20.00\n"));
        tx2.push_str(&format!("vBC_M04={:.2}\n", dados.base_calculo_icms));
        tx2.push_str(&format!("pICMS_M05={:.2}\n", dados.aliquota_icms));
        tx2.push_str(&format!("vICMS_M06={:.2}\n", dados.valor_icms));
    } else {
        tx2.push_str(&format!("CST_M02={}\n", dados.cst_icms));
        tx2.push_str(&format!("vBC_M03={:.2}\n", dados.base_calculo_icms));
        tx2.push_str(&format!("pICMS_M04={:.2}\n", dados.aliquota_icms));
        tx2.push_str(&format!("vICMS_M05={:.2}\n", dados.valor_icms));
    }

    // Informações da Carga (Grupo L)
    tx2.push_str(&format!("vCarga_L02={:.2}\n", dados.valor_total_carga));
    tx2.push_str(&format!("proPred_L03={}\n", dados.produto_predominante));
    if let Some(ref carac) = dados.outras_caracteristicas_carga {
        tx2.push_str(&format!("xOutCat_L04={}\n", carac));
    }

    // Quantidades de Carga (01 = Peso Bruto em Kg, 02 = Peso Liquido, 00 = Metro Cubico, 03 = Volumes)
    tx2.push_str("INCLUIRINFQ_L05\n");
    tx2.push_str("cUnid_L06=01\n");
    tx2.push_str("tpMed_L07=PESO BRUTO\n");
    tx2.push_str(&format!("qCarga_L08={:.4}\n", dados.peso_bruto_kg));
    tx2.push_str("SALVARINFQ_L05\n");

    if let Some(peso_liq) = dados.peso_liquido_kg {
        tx2.push_str("INCLUIRINFQ_L05\n");
        tx2.push_str("cUnid_L06=01\n");
        tx2.push_str("tpMed_L07=PESO LIQUIDO\n");
        tx2.push_str(&format!("qCarga_L08={:.4}\n", peso_liq));
        tx2.push_str("SALVARINFQ_L05\n");
    }

    if let Some(m3) = dados.metro_cubico {
        tx2.push_str("INCLUIRINFQ_L05\n");
        tx2.push_str("cUnid_L06=00\n");
        tx2.push_str("tpMed_L07=METRO CUBICO\n");
        tx2.push_str(&format!("qCarga_L08={:.4}\n", m3));
        tx2.push_str("SALVARINFQ_L05\n");
    }

    if let Some(vol) = dados.quantidade_volumes {
        tx2.push_str("INCLUIRINFQ_L05\n");
        tx2.push_str("cUnid_L06=03\n");
        tx2.push_str("tpMed_L07=VOLUMES\n");
        tx2.push_str(&format!("qCarga_L08={:.4}\n", vol));
        tx2.push_str("SALVARINFQ_L05\n");
    }

    // Documentos Originários (NF-es Vinculadas)
    for nfe in &dados.nfes_vinculadas {
        tx2.push_str("INCLUIRINFNFE_K01\n");
        tx2.push_str(&format!("chave_K02={}\n", nfe.chave_nfe.trim()));
        tx2.push_str("SALVARINFNFE_K01\n");
    }

    // Seguro da Carga (Grupo M - seg / SUSEP)
    if let Some(ref seg_nome) = dados.seguradora_nome {
        if !seg_nome.trim().is_empty() {
            tx2.push_str("INCLUIRSEG_M01\n");
            tx2.push_str(&format!("respSeg_M02={}\n", dados.seguradora_responsavel.unwrap_or(4))); // 4 = Emitente
            tx2.push_str(&format!("xSeg_M03={}\n", seg_nome));
            if let Some(ref apol) = dados.seguradora_apolice {
                tx2.push_str(&format!("nApol_M04={}\n", apol));
            }
            if let Some(ref averb) = dados.seguradora_averbacao {
                tx2.push_str(&format!("nAver_M05={}\n", averb));
            }
            tx2.push_str("SALVARSEG_M01\n");
        }
    }

    // Modal Rodoviário (Grupo R - infModal / rodo)
    tx2.push_str(&format!("RNTRC_R02={}\n", dados.rntrc.replace("-", "")));
    tx2.push_str("INCLUIRVEIC_R03\n");
    tx2.push_str(&format!("placa_R04={}\n", dados.veiculo_placa.replace("-", "").to_uppercase()));
    if let Some(ref ren) = dados.veiculo_renavam {
        tx2.push_str(&format!("RENAVAM_R05={}\n", ren));
    }
    tx2.push_str(&format!("tara_R06={}\n", dados.veiculo_tara_kg.unwrap_or(7500)));
    tx2.push_str(&format!("capKG_R07={}\n", dados.veiculo_capacidade_kg.unwrap_or(15000)));
    tx2.push_str(&format!("capM3_R08={}\n", dados.veiculo_capacidade_m3.unwrap_or(45)));
    tx2.push_str(&format!("tpProp_R09={}\n", dados.veiculo_tipo_propriedade.as_deref().unwrap_or("P")));
    tx2.push_str(&format!("tpVeic_R10={}\n", dados.veiculo_tipo_veiculo.as_deref().unwrap_or("0")));
    tx2.push_str(&format!("tpRod_R11={}\n", dados.veiculo_tipo_rodado.as_deref().unwrap_or("01")));
    tx2.push_str(&format!("tpCar_R12={}\n", dados.veiculo_tipo_carroceria.as_deref().unwrap_or("02")));
    tx2.push_str(&format!("UF_R13={}\n", dados.veiculo_uf));
    tx2.push_str("SALVARVEIC_R03\n");

    // Motorista
    tx2.push_str("INCLUIRMOTO_R14\n");
    tx2.push_str(&format!("xNome_R15={}\n", dados.motorista_nome.to_uppercase()));
    tx2.push_str(&format!("CPF_R16={}\n", dados.motorista_cpf.replace(&['.', '-'][..], "")));
    tx2.push_str("SALVARMOTO_R14\n");

    // Dados de Cobrança / Fatura (Grupo N - cobr / fat)
    if let Some(ref nfat) = dados.cobranca_numero_fatura {
        tx2.push_str("INCLUIRCOBR_N01\n");
        tx2.push_str(&format!("nFat_N02={}\n", nfat));
        tx2.push_str(&format!("vOrig_N03={:.2}\n", dados.cobranca_valor_original.unwrap_or(dados.valor_total_prestacao)));
        tx2.push_str(&format!("vLiq_N05={:.2}\n", dados.cobranca_valor_liquido.unwrap_or(dados.valor_a_receber)));
        tx2.push_str("SALVARCOBR_N01\n");

        if let Some(ref venc) = dados.cobranca_vencimento {
            tx2.push_str("INCLUIRDUP_N08\n");
            tx2.push_str(&format!("nDup_N09=001\n"));
            tx2.push_str(&format!("dVenc_N10={}\n", venc));
            tx2.push_str(&format!("vDup_N11={:.2}\n", dados.cobranca_valor_liquido.unwrap_or(dados.valor_a_receber)));
            tx2.push_str("SALVARDUP_N08\n");
        }
    }

    // Responsável Técnico do Software (infRespTec)
    tx2.push_str("CNPJ_RESP_TEC=03661869000175\n");
    tx2.push_str("xContato_RESP_TEC=SUPORTE TECNICO COLISEU ERP\n");
    tx2.push_str("email_RESP_TEC=suporte@coliseuerp.com.br\n");
    tx2.push_str("fone_RESP_TEC=6734200000\n");

    if let Some(ref obs) = dados.observacoes {
        tx2.push_str(&format!("xObs_Z02={}\n", obs));
    }

    tx2.push_str("SALVARCTE\n");

    tx2
}
