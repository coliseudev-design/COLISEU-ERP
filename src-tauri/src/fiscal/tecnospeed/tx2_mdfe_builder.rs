//! Construtor de Arquivo de Integração Padrão TX2 Oficial da TecnoSpeed para MDF-e 3.00 (Modelo 58)

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TecnoSpeedMdfeDocumentoVinculado {
    pub tipo: String, // "NFE" ou "CTE"
    pub chave: String,
    pub municipio_descarga_ibge: String,
    pub municipio_descarga_nome: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TecnoSpeedMdfeCondutor {
    pub nome: String,
    pub cpf: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TecnoSpeedMdfeDados {
    pub serie: u32,
    pub numero: u32,
    pub ambiente: String, // "PRODUÇÃO" ou "HOMOLOGAÇÃO"
    pub tipo_emitente: u32, // 1 = Prestador de Servico de Transporte, 2 = Transportador de Carga Propria
    pub tipo_transportador: Option<u32>, // 1 = ETC, 2 = TAC, 3 = CTC

    // Percurso
    pub uf_carregamento: String,
    pub municipio_carregamento_ibge: String,
    pub municipio_carregamento_nome: String,
    pub uf_descarregamento: String,

    // Emitente
    pub emitente_cnpj: String,
    pub emitente_razao: String,
    pub emitente_ie: String,

    // Modal Rodoviário
    pub rntrc: String,
    pub ciot: Option<String>,
    pub veiculo_placa: String,
    pub veiculo_renavam: Option<String>,
    pub veiculo_tara_kg: u32,
    pub veiculo_capacidade_kg: u32,
    pub veiculo_capacidade_m3: Option<u32>,
    pub veiculo_tipo_carroceria: Option<String>, // "00"=Nao aplicavel, "01"=Aberta, "02"=Fechada
    pub veiculo_uf: String,

    // Condutores
    pub condutores: Vec<TecnoSpeedMdfeCondutor>,

    // Seguro de Carga (Obrigatório RCTR-C)
    pub seguradora_nome: Option<String>,
    pub seguradora_cnpj: Option<String>,
    pub numero_apolice: Option<String>,
    pub numero_averbacao: Option<String>,

    // Carga & Documentos
    pub valor_total_carga: f64,
    pub peso_bruto_total_kg: f64,
    pub documentos_vinculados: Vec<TecnoSpeedMdfeDocumentoVinculado>,

    pub informacoes_adicionais: Option<String>,
}

/// Gera o conteúdo TX2 oficial para emissão de MDF-e 3.00 compatível com TecnoSpeed spdMDFeX e Manager
pub fn gerar_arquivo_tx2_mdfe(dados: &TecnoSpeedMdfeDados) -> String {
    let mut tx2 = String::new();

    let tp_amb = if dados.ambiente.to_uppercase().contains("PROD") { "1" } else { "2" };
    let data_hora_emissao = chrono::Local::now().format("%Y-%m-%dT%H:%M:%S%:z").to_string();
    let codigo_aleatorio = format!("{:08}", rand::random::<u32>() % 100000000);

    // Bloco Principal MDF-e
    tx2.push_str("INCLUIRMDFE\n");
    tx2.push_str("versao_A02=3.00\n");
    tx2.push_str(&format!("tpAmb_B03={}\n", tp_amb));
    tx2.push_str(&format!("tpEmit_B04={}\n", dados.tipo_emitente));
    if let Some(tp_transp) = dados.tipo_transportador {
        tx2.push_str(&format!("tpTransp_B05={}\n", tp_transp));
    }
    tx2.push_str("mod_B06=58\n");
    tx2.push_str(&format!("serie_B07={}\n", dados.serie));
    tx2.push_str(&format!("nMDF_B08={}\n", dados.numero));
    tx2.push_str(&format!("cMDF_B09={}\n", codigo_aleatorio));
    tx2.push_str("modal_B11=1\n"); // 1 = Rodoviario
    tx2.push_str(&format!("dhEmi_B12={}\n", data_hora_emissao));
    tx2.push_str("tpEmis_B13=1\n"); // 1 = Normal
    tx2.push_str("procEmi_B14=0\n");
    tx2.push_str("verProc_B15=Coliseu_ERP_v2.0\n");
    tx2.push_str(&format!("UFIni_B16={}\n", dados.uf_carregamento));
    tx2.push_str(&format!("UFFim_B17={}\n", dados.uf_descarregamento));

    // Carregamento
    tx2.push_str("INCLUIRMUNCARREGA_B18\n");
    tx2.push_str(&format!("cMunCarrega_B19={}\n", dados.municipio_carregamento_ibge));
    tx2.push_str(&format!("xMunCarrega_B20={}\n", dados.municipio_carregamento_nome));
    tx2.push_str("SALVARMUNCARREGA_B18\n");

    // Emitente
    tx2.push_str(&format!("CNPJ_C02={}\n", dados.emitente_cnpj.replace(&['.', '-', '/'][..], "")));
    tx2.push_str(&format!("IE_C03={}\n", dados.emitente_ie.replace(&['.', '-'][..], "")));
    tx2.push_str(&format!("xNome_C04={}\n", dados.emitente_razao));

    // Modal Rodoviário (Grupo Rodo)
    tx2.push_str(&format!("RNTRC_D02={}\n", dados.rntrc.replace("-", "")));
    if let Some(ref ciot_num) = dados.ciot {
        tx2.push_str(&format!("CIOT_D03={}\n", ciot_num.replace("-", "")));
    }

    // Veículo de Tração
    tx2.push_str("INCLUIRVEICTRACAO_D04\n");
    tx2.push_str(&format!("placa_D05={}\n", dados.veiculo_placa.replace("-", "").to_uppercase()));
    if let Some(ref ren) = dados.veiculo_renavam {
        tx2.push_str(&format!("RENAVAM_D06={}\n", ren));
    }
    tx2.push_str(&format!("tara_D07={}\n", dados.veiculo_tara_kg));
    tx2.push_str(&format!("capKG_D08={}\n", dados.veiculo_capacidade_kg));
    tx2.push_str(&format!("capM3_D09={}\n", dados.veiculo_capacidade_m3.unwrap_or(40)));
    tx2.push_str(&format!("tpCar_D11={}\n", dados.veiculo_tipo_carroceria.as_deref().unwrap_or("02")));
    tx2.push_str(&format!("UF_D12={}\n", dados.veiculo_uf));

    // Condutores vinculados ao veículo
    for condutor in &dados.condutores {
        tx2.push_str("INCLUIRCONDUTOR_D13\n");
        tx2.push_str(&format!("xNome_D14={}\n", condutor.nome.to_uppercase()));
        tx2.push_str(&format!("CPF_D15={}\n", condutor.cpf.replace(&['.', '-'][..], "")));
        tx2.push_str("SALVARCONDUTOR_D13\n");
    }
    tx2.push_str("SALVARVEICTRACAO_D04\n");

    // Seguros de Carga (se houver)
    if let (Some(seg_nome), Some(seg_apolice)) = (&dados.seguradora_nome, &dados.numero_apolice) {
        tx2.push_str("INCLUIRSEG_D17\n");
        tx2.push_str("respSeg_D18=1\n"); // 1 = Emitente do MDF-e
        tx2.push_str(&format!("xSeg_D19={}\n", seg_nome));
        if let Some(ref cnpj_seg) = dados.seguradora_cnpj {
            tx2.push_str(&format!("CNPJ_D20={}\n", cnpj_seg.replace(&['.', '-', '/'][..], "")));
        }
        tx2.push_str(&format!("nApol_D21={}\n", seg_apolice));
        if let Some(ref averb) = dados.numero_averbacao {
            tx2.push_str(&format!("nAver_D22={}\n", averb));
        }
        tx2.push_str("SALVARSEG_D17\n");
    }

    // Agrupamento de Municípios de Descarga e Documentos
    let mut cidades_descarga: Vec<String> = Vec::new();
    for doc in &dados.documentos_vinculados {
        if !cidades_descarga.contains(&doc.municipio_descarga_ibge) {
            cidades_descarga.push(doc.municipio_descarga_ibge.clone());
        }
    }

    for cod_mun in cidades_descarga {
        let docs_cidade: Vec<&TecnoSpeedMdfeDocumentoVinculado> = dados
            .documentos_vinculados
            .iter()
            .filter(|d| d.municipio_descarga_ibge == cod_mun)
            .collect();

        if let Some(primeiro) = docs_cidade.first() {
            tx2.push_str("INCLUIRINFMDL_E01\n");
            tx2.push_str(&format!("cMunDescarga_E02={}\n", primeiro.municipio_descarga_ibge));
            tx2.push_str(&format!("xMunDescarga_E03={}\n", primeiro.municipio_descarga_nome));

            for doc in docs_cidade {
                if doc.tipo.to_uppercase() == "CTE" {
                    tx2.push_str("INCLUIRINFCTE_E04\n");
                    tx2.push_str(&format!("chCTe_E05={}\n", doc.chave.trim()));
                    tx2.push_str("SALVARINFCTE_E04\n");
                } else {
                    tx2.push_str("INCLUIRINFNFE_E06\n");
                    tx2.push_str(&format!("chNFe_E07={}\n", doc.chave.trim()));
                    tx2.push_str("SALVARINFNFE_E06\n");
                }
            }
            tx2.push_str("SALVARINFMDL_E01\n");
        }
    }

    // Totais do Manifesto
    tx2.push_str(&format!("vCarga_F02={:.2}\n", dados.valor_total_carga));
    tx2.push_str("cUnid_F03=01\n"); // 01 = KG
    tx2.push_str(&format!("qCarga_F04={:.4}\n", dados.peso_bruto_total_kg));

    if let Some(ref obs) = dados.informacoes_adicionais {
        tx2.push_str(&format!("infAdic_G01={}\n", obs));
    }

    tx2.push_str("SALVARMDFE\n");

    tx2
}
