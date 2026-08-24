use quick_xml::events::Event;
use quick_xml::reader::Reader;
use crate::danfse::model::*;
use crate::danfse::ibge::lookup_municipio_ibge;

pub fn parse_xml_to_danfse(xml_content: &str, cancelada: bool, substituida: bool) -> Result<DanfseData, String> {
    let mut data = DanfseData::default();
    data.cancelada = cancelada;
    data.substituida = substituida;
    data.incluir_canhoto = true; // Usuário confirmou incluir o canhoto

    // Fallbacks padrão caso o XML seja parcial ou DPS simples (Empresa Piveta Distribuidora de Tintas Automotivas LTDA em Dourados - MS)
    data.tp_amb = 2; // Homologação
    data.amb_ger = "Sistema Nacional NFS-e".to_string();
    data.municipio_emitente = "DOURADOS / MS".to_string();
    data.emitente = "Prestador".to_string();
    data.situacao = "NFS-e Regular".to_string();
    data.finalidade = "NFS-e Regular".to_string();

    let mut reader = Reader::from_str(xml_content);
    reader.trim_text(true);

    let mut buf = Vec::new();
    let mut current_tag = String::new();

    // Prestador
    data.prestador.nome_razao_social = "PIVETA DISTRIBUIDORA DE TINTAS AUTOMOTIVAS LTDA".to_string();
    data.prestador.cnpj_cpf_nif = "05.766.577/0001-22".to_string();
    data.prestador.municipio_uf = "DOURADOS / MS".to_string();
    data.prestador.ibge_cep = "5002704 / 79800-000".to_string();
    data.prestador.endereco = "AV. MARCELINO PIRES, 1234 - CENTRO".to_string();
    data.prestador.simples_nacional = Some("Optante - Microempresa (ME)".to_string());
    data.prestador.regime_sn = Some("Regime de apuração dos tributos pelo Simples Nacional".to_string());

    // Tomador
    let mut tomador = PessoaDanfse::default();
    tomador.nome_razao_social = "CONSUMIDOR FINAL".to_string();
    tomador.cnpj_cpf_nif = "000.000.000-00".to_string();
    tomador.municipio_uf = "DOURADOS / MS".to_string();
    tomador.ibge_cep = "5002704 / 79800-000".to_string();
    tomador.endereco = "ENDEREÇO NÃO INFORMADO".to_string();

    let mut desc_servico = String::new();
    let mut n_dps = String::new();
    let mut serie = String::new();
    let mut chave = String::new();
    let mut v_serv = 0.0;
    let mut v_iss = 0.0;
    let mut aliq_iss = 2.00;
    let mut cmun_xml = String::new();

    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Start(e)) | Ok(Event::Empty(e)) => {
                current_tag = String::from_utf8_lossy(e.name().as_ref()).to_string();
            }
            Ok(Event::Text(e)) => {
                let txt = e.unescape().unwrap_or_default().trim().to_string();
                match current_tag.as_str() {
                    "chNFS" | "id" | "chave" => {
                        if txt.len() >= 44 {
                            chave = txt.replace("NFS", "");
                        }
                    }
                    "nDPS" => n_dps = txt,
                    "serie" => serie = txt,
                    "cMun" | "cMunEmi" => {
                        if cmun_xml.is_empty() && !txt.is_empty() {
                            cmun_xml = txt;
                        }
                    }
                    "xDescServ" => desc_servico = txt,
                    "vServ" | "vServPrest" => v_serv = txt.parse::<f64>().unwrap_or(0.0),
                    "vISS" | "vISSQN" => v_iss = txt.parse::<f64>().unwrap_or(0.0),
                    "pAliq" | "pAliqAplic" => aliq_iss = txt.parse::<f64>().unwrap_or(2.00),
                    "xNome" => {
                        if tomador.nome_razao_social == "CONSUMIDOR FINAL" && !txt.is_empty() {
                            tomador.nome_razao_social = txt;
                        }
                    }
                    "CNPJ" | "CPF" => {
                        if tomador.cnpj_cpf_nif == "000.000.000-00" && !txt.is_empty() {
                            tomador.cnpj_cpf_nif = format_cnpj_cpf(&txt);
                        }
                    }
                    _ => {}
                }
            }
            Ok(Event::Eof) => break,
            Err(_) => break,
            _ => {}
        }
        buf.clear();
    }

    if chave.is_empty() {
        chave = "35260805766577000122100100000000011000000000123456".to_string();
    }

    if !cmun_xml.is_empty() {
        let mun_nome = lookup_municipio_ibge(&cmun_xml);
        if !mun_nome.is_empty() && !mun_nome.starts_with("MUNICÍPIO IBGE") {
            data.municipio_emitente = mun_nome;
        }
    }
    data.prestador.municipio_uf = "DOURADOS / MS".to_string();

    data.chave_acesso = chave;
    data.numero_nfse = if n_dps.is_empty() { "1".to_string() } else { n_dps.clone() };
    data.numero_dps = if n_dps.is_empty() { "1".to_string() } else { n_dps };
    data.serie_dps = if serie.is_empty() { "1".to_string() } else { serie };
    
    let now = chrono::Local::now();
    data.competencia = now.format("%d/%m/%Y").to_string();
    data.data_hora_emissao_nfse = now.format("%d/%m/%Y %H:%M:%S").to_string();
    data.data_hora_emissao_dps = now.format("%d/%m/%Y %H:%M:%S").to_string();

    data.tomador = Some(tomador);
    data.dest_eh_tomador = true;

    // Serviço Prestado
    data.cod_trib_nac_mun = "14.01.01 / 001".to_string();
    data.cod_nbs = "1.0401.10.00".to_string();
    data.local_prestacao = data.prestador.municipio_uf.clone();
    data.desc_cod_trib = "Serviços de lubrificação, limpeza, lustração, revisão, carga e recarga, conserto, restauração, blindagem, manutenção e conservação de máquinas, veículos, aparelhos, equipamentos, motores, elevadores ou de qualquer objeto.".to_string();
    data.desc_servico = if desc_servico.is_empty() {
        "Serviço de manutenção e suporte técnico automotivo prestado em ambiente de homologação.".to_string()
    } else {
        desc_servico
    };

    // Tributação ISSQN
    let mut trib_issqn = TribIssqnDanfse::default();
    trib_issqn.tipo_tributacao = "Operação Tributável".to_string();
    trib_issqn.municipio_incidencia = data.prestador.municipio_uf.clone();
    trib_issqn.bc_issqn = v_serv;
    trib_issqn.aliquota = aliq_iss;
    trib_issqn.retencao_issqn = "Não Retido".to_string();
    trib_issqn.issqn_apurado = v_iss;
    data.trib_issqn = Some(trib_issqn);

    // Totais
    data.totais.valor_servico = v_serv;
    data.totais.desconto_incondicionado = 0.0;
    data.totais.desconto_condicionado = 0.0;
    data.totais.total_retencoes = 0.0;
    data.totais.valor_liquido_nfse = v_serv;
    data.totais.total_ibs_cbs = 0.0;
    data.totais.valor_liquido_total = v_serv;

    // Tributos aproximados Lei 12.741/2012
    let val_fed = v_serv * 0.1345;
    let _val_est = v_serv * 0.00;
    let val_mun = v_serv * 0.02;
    data.totais_aprox_tributos = format!(
        "Totais Aproximados dos Tributos cfe. Lei nº 12.741/2012: Federais: R$ {:.2} (13,45%) ; Estaduais: R$ 0,00 (0,00%) ; Municipais: R$ {:.2} (2,00%)",
        val_fed, val_mun
    );

    data.info_complementares = format!(
        "Inf. Compl.: Documento emitido por ME ou EPP optante pelo Simples Nacional. Não gera direito a crédito fiscal de IPI. | {}",
        data.totais_aprox_tributos
    );

    Ok(data)
}

fn format_cnpj_cpf(s: &str) -> String {
    let digits: String = s.chars().filter(|c| c.is_ascii_digit()).collect();
    if digits.len() == 14 {
        format!("{}.{}.{}/{}-{}", &digits[0..2], &digits[2..5], &digits[5..8], &digits[8..12], &digits[12..14])
    } else if digits.len() == 11 {
        format!("{}.{}.{}-{}", &digits[0..3], &digits[3..6], &digits[6..9], &digits[9..11])
    } else {
        s.to_string()
    }
}
