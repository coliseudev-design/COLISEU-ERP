//! Construtor de Arquivo de Integração Padrão TX2 Oficial da TecnoSpeed para NF-e e NFC-e

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TecnoSpeedItem {
    pub codigo: String,
    pub descricao: String,
    pub ncm: String,
    pub cfop: String,
    pub unidade: String,
    pub quantidade: f64,
    pub valor_unitario: f64,
    pub valor_total: f64,
    pub valor_desconto: Option<f64>,
    pub cst_csosn: Option<String>,
    pub cest: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TecnoSpeedPagamento {
    pub meio_pagamento: String, // 01=Dinheiro, 03=Cartão Crédito, 04=Cartão Débito, 17=PIX, 99=Outros
    pub valor: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TecnoSpeedNfeDados {
    pub modelo: u32,       // 55 ou 65
    pub serie: u32,
    pub numero: u32,
    pub natureza_operacao: String,
    pub ambiente: String,  // "PRODUÇÃO" ou "HOMOLOGAÇÃO"

    pub emitente_cnpj: String,
    pub emitente_razao: String,
    pub emitente_fantasia: Option<String>,
    pub emitente_ie: String,
    pub emitente_uf: String,
    pub emitente_municipio_ibge: String, // Ex: "5003702" (Dourados/MS)

    pub dest_cpf_cnpj: Option<String>,
    pub dest_nome: Option<String>,
    pub dest_ie: Option<String>,
    pub dest_uf: Option<String>,
    pub dest_cidade: Option<String>,
    pub dest_logradouro: Option<String>,
    pub dest_numero: Option<String>,
    pub dest_bairro: Option<String>,
    pub dest_cep: Option<String>,

    pub itens: Vec<TecnoSpeedItem>,
    pub pagamentos: Vec<TecnoSpeedPagamento>,

    pub valor_total_produtos: f64,
    pub valor_total_nota: f64,
    pub valor_desconto: Option<f64>,
    pub informacoes_adicionais: Option<String>,
    pub chave_referenciada: Option<String>, // Chave da NFC-e/NF-e referenciada (ex: CFOP 5.929/6.929 Acobertamento)
}

fn sanitize_fiscal_ascii(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for c in s.chars() {
        match c {
            'á' | 'à' | 'ã' | 'â' | 'ä' => out.push('a'),
            'Á' | 'À' | 'Ã' | 'Â' | 'Ä' => out.push('A'),
            'é' | 'è' | 'ê' | 'ë' => out.push('e'),
            'É' | 'È' | 'Ê' | 'Ë' => out.push('E'),
            'í' | 'ì' | 'î' | 'ï' => out.push('i'),
            'Í' | 'Ì' | 'Î' | 'Ï' => out.push('I'),
            'ó' | 'ò' | 'õ' | 'ô' | 'ö' => out.push('o'),
            'Ó' | 'Ò' | 'Õ' | 'Ô' | 'Ö' => out.push('O'),
            'ú' | 'ù' | 'û' | 'ü' => out.push('u'),
            'Ú' | 'Ù' | 'Û' | 'Ü' => out.push('U'),
            'ç' => out.push('c'),
            'Ç' => out.push('C'),
            'ñ' => out.push('n'),
            'Ñ' => out.push('N'),
            '\'' | '"' | '<' | '>' | '&' | '|' => out.push(' '),
            _ if c.is_ascii() => out.push(c),
            _ => out.push(' '),
        }
    }
    out
}

pub fn gerar_arquivo_tx2(dados: &TecnoSpeedNfeDados) -> String {
    let mut tx2 = String::new();
    let agora = chrono::Local::now().format("%Y-%m-%dT%H:%M:%S-04:00").to_string();
    let tp_amb = if dados.ambiente.to_uppercase().contains("PROD") { "1" } else { "2" };
    let clean_cnpj_emit = dados.emitente_cnpj.chars().filter(|c| c.is_ascii_digit()).collect::<String>();
    let clean_dest_doc = dados.dest_cpf_cnpj.as_ref().map(|d| d.chars().filter(|c| c.is_ascii_digit()).collect::<String>());

    tx2.push_str("INCLUIR\n");
    tx2.push_str("Id_A03=0\n");
    tx2.push_str("versao_A02=4.00\n");

    // Identificação
    let c_uf = match dados.emitente_uf.to_uppercase().as_str() {
        "MS" => "50",
        "SP" => "35",
        "PR" => "41",
        _ => "50",
    };
    let nat_op_clean = sanitize_fiscal_ascii(&dados.natureza_operacao);
    let nat_op_sanitized = if nat_op_clean.len() > 60 {
        nat_op_clean.chars().take(60).collect::<String>()
    } else {
        nat_op_clean
    };

    // cNF deve ser um número pseudo-aleatório de 8 dígitos estritamente diferente de nNF para não acionar a Rejeição 897 da SEFAZ
    let c_nf = ((dados.numero as u64 * 7919 + 104729) % 89999999) + 10000000;

    tx2.push_str(&format!("cUF_B02={}\n", c_uf));
    tx2.push_str(&format!("cNF_B03={:08}\n", c_nf));
    tx2.push_str(&format!("natOp_B04={}\n", nat_op_sanitized));
    tx2.push_str(&format!("mod_B06={}\n", dados.modelo));
    tx2.push_str(&format!("serie_B07={}\n", dados.serie));
    tx2.push_str(&format!("nNF_B08={}\n", dados.numero));
    tx2.push_str(&format!("dhEmi_B09={}\n", agora));
    tx2.push_str("tpNF_B11=1\n");
    tx2.push_str("idDest_B11a=1\n");
    tx2.push_str(&format!("cMunFG_B12={}\n", if !dados.emitente_municipio_ibge.is_empty() { &dados.emitente_municipio_ibge } else { "5003702" }));
    tx2.push_str(&format!("tpImp_B21={}\n", if dados.modelo == 65 { "4" } else { "1" }));
    tx2.push_str("tpEmis_B22=1\n");
    tx2.push_str(&format!("tpAmb_B24={}\n", tp_amb));
    tx2.push_str("finNFe_B25=1\n");
    tx2.push_str("indFinal_B25a=1\n");
    tx2.push_str("indPres_B25b=1\n");
    tx2.push_str("procEmi_B26=0\n");
    tx2.push_str("verProc_B27=ColiseuERP_TecnoSpeed_4.00\n");

    // Documento Fiscal Referenciado (ex: Acobertamento de Cupom Fiscal NFC-e com CFOP 5.929 / 6.929)
    if let Some(ref ref_chave) = dados.chave_referenciada {
        let clean_ref = ref_chave.chars().filter(|c| c.is_ascii_digit()).collect::<String>();
        if clean_ref.len() == 44 {
            tx2.push_str("INCLUIRPARTE=BA02\n");
            tx2.push_str(&format!("refNFe_BA02={}\n", clean_ref));
            tx2.push_str("SALVARPARTE=BA02\n");
        }
    }

    // Emitente
    tx2.push_str(&format!("CNPJ_C02={}\n", clean_cnpj_emit));
    tx2.push_str(&format!("xNome_C03={}\n", sanitize_fiscal_ascii(&dados.emitente_razao)));
    if let Some(ref fant) = dados.emitente_fantasia {
        tx2.push_str(&format!("xFant_C04={}\n", sanitize_fiscal_ascii(fant)));
    }
    tx2.push_str(&format!("IE_C17={}\n", dados.emitente_ie.chars().filter(|c| c.is_ascii_digit()).collect::<String>()));
    tx2.push_str("CRT_C21=1\n"); // 1 = Simples Nacional
    tx2.push_str("xLgr_C06=AV. MARCELINO PIRES\n");
    tx2.push_str("nro_C07=1250\n");
    tx2.push_str("xBairro_C09=CENTRO\n");
    tx2.push_str(&format!("cMun_C10={}\n", if !dados.emitente_municipio_ibge.is_empty() { &dados.emitente_municipio_ibge } else { "5003702" }));
    tx2.push_str("xMun_C11=DOURADOS\n");
    tx2.push_str(&format!("UF_C12={}\n", dados.emitente_uf));
    tx2.push_str("CEP_C13=79800000\n");

    // Destinatário
    if dados.modelo == 65 {
        // NFC-e Mod. 65: Apenas CPF/CNPJ opcional e xNome (sem enderDest para evitar rejeições de esquema)
        if let Some(ref doc) = clean_dest_doc {
            if !doc.is_empty() && doc != "00000000000" {
                if doc.len() > 11 {
                    tx2.push_str(&format!("CNPJ_E02={}\n", doc));
                } else {
                    tx2.push_str(&format!("CPF_E03={}\n", doc));
                }
                let dest_nome = if tp_amb == "2" {
                    "NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL".to_string()
                } else {
                    let nm = sanitize_fiscal_ascii(dados.dest_nome.as_deref().unwrap_or("CONSUMIDOR FINAL"));
                    if nm.len() > 60 {
                        nm.chars().take(60).collect::<String>()
                    } else {
                        nm
                    }
                };
                tx2.push_str(&format!("xNome_E04={}\n", dest_nome));
                tx2.push_str("indIEDest_E16a=9\n");
            }
        }
    } else {
        // NF-e Mod. 55
        if let Some(ref doc) = clean_dest_doc {
            if doc.len() > 11 {
                tx2.push_str(&format!("CNPJ_E02={}\n", doc));
            } else if !doc.is_empty() && doc != "00000000000" {
                tx2.push_str(&format!("CPF_E03={}\n", doc));
            } else {
                tx2.push_str("CPF_E03=70503214191\n");
            }
            let dest_nome = if tp_amb == "2" {
                "NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL".to_string()
            } else {
                let nm = sanitize_fiscal_ascii(dados.dest_nome.as_deref().unwrap_or("CONSUMIDOR FINAL"));
                if nm.len() > 60 {
                    nm.chars().take(60).collect::<String>()
                } else {
                    nm
                }
            };
            tx2.push_str(&format!("xNome_E04={}\n", dest_nome));
            tx2.push_str("indIEDest_E16a=9\n"); // 9 = Não Contribuinte

            let lgr = sanitize_fiscal_ascii(dados.dest_logradouro.as_deref().filter(|s| !s.trim().is_empty()).unwrap_or("RUA FREI ANTONIO"));
            let nro = sanitize_fiscal_ascii(dados.dest_numero.as_deref().filter(|s| !s.trim().is_empty()).unwrap_or("1290"));
            let bairro = sanitize_fiscal_ascii(dados.dest_bairro.as_deref().filter(|s| !s.trim().is_empty()).unwrap_or("JD AGUA BOA"));
            let cmun = if !dados.emitente_municipio_ibge.is_empty() { &dados.emitente_municipio_ibge } else { "5003702" };
            let xmun = sanitize_fiscal_ascii(dados.dest_cidade.as_deref().filter(|s| !s.trim().is_empty()).unwrap_or("DOURADOS"));
            let uf = dados.dest_uf.as_deref().filter(|s| !s.trim().is_empty()).unwrap_or("MS");
            let cep_raw = dados.dest_cep.as_deref().map(|c| c.chars().filter(|ch| ch.is_ascii_digit()).collect::<String>()).filter(|s| s.len() == 8).unwrap_or_else(|| "79800000".to_string());

            tx2.push_str(&format!("xLgr_E06={}\n", lgr));
            tx2.push_str(&format!("nro_E07={}\n", nro));
            tx2.push_str(&format!("xBairro_E09={}\n", bairro));
            tx2.push_str(&format!("cMun_E10={}\n", cmun));
            tx2.push_str(&format!("xMun_E11={}\n", xmun));
            tx2.push_str(&format!("UF_E12={}\n", uf));
            tx2.push_str(&format!("CEP_E13={}\n", cep_raw));
        }
    }

    // Itens da Nota
    for (i, it) in dados.itens.iter().enumerate() {
        let n_item = i + 1;
        let x_prod = if tp_amb == "2" && i == 0 {
            "NOTA FISCAL EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL".to_string()
        } else {
            sanitize_fiscal_ascii(&it.descricao)
        };

        tx2.push_str("INCLUIRITEM\n");
        tx2.push_str(&format!("nItem_H02={}\n", n_item));
        tx2.push_str(&format!("cProd_I02={}\n", sanitize_fiscal_ascii(&it.codigo)));
        tx2.push_str(&format!("cEAN_I03={}\n", "SEM GTIN"));
        tx2.push_str(&format!("xProd_I04={}\n", x_prod));
        tx2.push_str(&format!("NCM_I05={}\n", it.ncm.chars().filter(|c| c.is_ascii_digit()).collect::<String>()));
        if let Some(ref cest) = it.cest {
            tx2.push_str(&format!("CEST_I05c={}\n", cest.chars().filter(|c| c.is_ascii_digit()).collect::<String>()));
        }
        tx2.push_str(&format!("CFOP_I08={}\n", it.cfop.chars().filter(|c| c.is_ascii_digit()).collect::<String>()));
        tx2.push_str(&format!("uCom_I09={}\n", sanitize_fiscal_ascii(&it.unidade)));
        tx2.push_str(&format!("qCom_I10={:.4}\n", it.quantidade));
        tx2.push_str(&format!("vUnCom_I10a={:.4}\n", it.valor_unitario));
        tx2.push_str(&format!("vProd_I11={:.2}\n", it.valor_total));
        tx2.push_str(&format!("cEANTrib_I12={}\n", "SEM GTIN"));
        tx2.push_str(&format!("uTrib_I13={}\n", sanitize_fiscal_ascii(&it.unidade)));
        tx2.push_str(&format!("qTrib_I14={:.4}\n", it.quantidade));
        tx2.push_str(&format!("vUnTrib_I14a={:.4}\n", it.valor_unitario));
        if let Some(desc) = it.valor_desconto {
            if desc > 0.0 {
                tx2.push_str(&format!("vDesc_I17={:.2}\n", desc));
            }
        }
        tx2.push_str("indTot_I17b=1\n");

        // ICMS Simples Nacional (CSOSN 102 ou 500)
        let csosn = it.cst_csosn.as_deref().unwrap_or("102");
        tx2.push_str("orig_N11=0\n");
        tx2.push_str(&format!("CSOSN_N12a={}\n", csosn));

        // PIS
        tx2.push_str("CST_Q06=07\n"); // 07 = Isenta

        // COFINS
        tx2.push_str("CST_S06=07\n"); // 07 = Isenta

        tx2.push_str("SALVARITEM\n");
    }

    // Totais da Nota (ICMSTot completo conforme NT NF-e 4.0)
    tx2.push_str("vBC_W03=0.00\n");
    tx2.push_str("vICMS_W04=0.00\n");
    tx2.push_str("vICMSDeson_W04a=0.00\n");
    tx2.push_str("vFCP_W04h=0.00\n");
    tx2.push_str("vBCST_W05=0.00\n");
    tx2.push_str("vST_W06=0.00\n");
    tx2.push_str("vFCPST_W06a=0.00\n");
    tx2.push_str("vFCPSTRet_W06b=0.00\n");
    tx2.push_str(&format!("vProd_W07={:.2}\n", dados.valor_total_produtos));
    tx2.push_str("vFrete_W08=0.00\n");
    tx2.push_str("vSeg_W09=0.00\n");
    tx2.push_str(&format!("vDesc_W10={:.2}\n", dados.valor_desconto.unwrap_or(0.0)));
    tx2.push_str("vII_W11=0.00\n");
    tx2.push_str("vIPI_W12=0.00\n");
    tx2.push_str("vIPIDevol_W12a=0.00\n");
    tx2.push_str("vPIS_W13=0.00\n");
    tx2.push_str("vCOFINS_W14=0.00\n");
    tx2.push_str("vOutro_W15=0.00\n");
    tx2.push_str(&format!("vNF_W16={:.2}\n", dados.valor_total_nota));
    tx2.push_str("vTotTrib_W16a=0.00\n");

    // Transporte (Em NFC-e mod 65 SEMPRE deve ser 9 - Sem Ocorrencia de Transporte)
    if dados.modelo == 65 {
        tx2.push_str("modFrete_X02=9\n");
    } else {
        tx2.push_str("modFrete_X02=0\n");
    }

    // Pagamentos
    if !dados.pagamentos.is_empty() {
        for pag in &dados.pagamentos {
            tx2.push_str("INCLUIRPARTE=YA\n");
            tx2.push_str(&format!("tPag_YA02={}\n", pag.meio_pagamento));
            tx2.push_str(&format!("vPag_YA03={:.2}\n", pag.valor));
            if pag.meio_pagamento != "01" && pag.meio_pagamento != "90" {
                tx2.push_str("tpIntegra_YA04a=2\n");
            }
            tx2.push_str("SALVARPARTE=YA\n");
        }
    } else {
        tx2.push_str("INCLUIRPARTE=YA\n");
        tx2.push_str("tPag_YA02=01\n");
        tx2.push_str(&format!("vPag_YA03={:.2}\n", dados.valor_total_nota));
        tx2.push_str("SALVARPARTE=YA\n");
    }

    // Informações Adicionais
    let inf_cpl_clean = sanitize_fiscal_ascii(dados.informacoes_adicionais.as_deref().unwrap_or("Documento emitido por ME ou EPP optante pelo Simples Nacional."));
    tx2.push_str(&format!("infCpl_Z03={}\n", inf_cpl_clean));

    // Responsável Técnico (Obrigatório em MS, PR, SC e outros estados)
    tx2.push_str("CNPJ_ZD02=03661869000175\n");
    tx2.push_str("xContato_ZD04=SILENUS SOFTWARE LTDA\n");
    tx2.push_str("email_ZD05=suporte@tecnospeed.com.br\n");
    tx2.push_str("fone_ZD06=4430379500\n");

    tx2.push_str("SALVAR\n");
    tx2
}
