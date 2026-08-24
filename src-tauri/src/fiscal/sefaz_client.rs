//! Módulo Completo de Comunicação SOAP 1.2 mTLS com WebServices SEFAZ 4.00 (NF-e / NFC-e)
//!
//! Suporta comunicação real mTLS (Certificado Digital A1 PKCS#12) com os servidores da SEFAZ
//! de Mato Grosso do Sul (MS), São Paulo (SP), SVRS e SVAN, bem como modo mock simulado para treinamento.

use serde::{Deserialize, Serialize};
use tracing::{info, warn};

/// Configuração de conexão com a SEFAZ do Estado do emitente.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SefazConfig {
    pub uf: u32,
    pub ambiente: u32, // 1 = Produção, 2 = Homologação
    pub modelo: u32,   // 55 = NF-e, 65 = NFC-e
    pub url_autorizacao: String,
    pub cert_pfx_bytes: Option<Vec<u8>>,
    pub cert_password: Option<String>,
    pub force_mock: bool,
}

impl Default for SefazConfig {
    fn default() -> Self {
        Self {
            uf: 50, // MS
            ambiente: 2, // Homologação
            modelo: 55, // NF-e
            url_autorizacao: "https://hom.nfe.sefaz.ms.gov.br/ws/NFeAutorizacao4".to_string(),
            cert_pfx_bytes: None,
            cert_password: None,
            force_mock: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SefazEndpoints {
    pub status_servico: String,
    pub autorizacao: String,
    pub ret_autorizacao: String,
    pub consulta_protocolo: String,
    pub recepcao_evento: String,
    pub inutilizacao: String,
}

/// Obtém as URLs oficiais dos Web Services SEFAZ 4.00 por UF e Ambiente
pub fn obter_endpoints_sefaz(uf: u32, ambiente: u32) -> SefazEndpoints {
    let is_producao = ambiente == 1;

    match uf {
        // 50 - MATO GROSSO DO SUL (SEFAZ-MS)
        50 => {
            if is_producao {
                SefazEndpoints {
                    status_servico: "https://nfe.sefaz.ms.gov.br/ws/NFeStatusServico4".to_string(),
                    autorizacao: "https://nfe.sefaz.ms.gov.br/ws/NFeAutorizacao4".to_string(),
                    ret_autorizacao: "https://nfe.sefaz.ms.gov.br/ws/NFeRetAutorizacao4".to_string(),
                    consulta_protocolo: "https://nfe.sefaz.ms.gov.br/ws/NFeConsultaProtocolo4".to_string(),
                    recepcao_evento: "https://nfe.sefaz.ms.gov.br/ws/NFeRecepcaoEvento4".to_string(),
                    inutilizacao: "https://nfe.sefaz.ms.gov.br/ws/NFeInutilizacao4".to_string(),
                }
            } else {
                SefazEndpoints {
                    status_servico: "https://hom.nfe.sefaz.ms.gov.br/ws/NFeStatusServico4".to_string(),
                    autorizacao: "https://hom.nfe.sefaz.ms.gov.br/ws/NFeAutorizacao4".to_string(),
                    ret_autorizacao: "https://hom.nfe.sefaz.ms.gov.br/ws/NFeRetAutorizacao4".to_string(),
                    consulta_protocolo: "https://hom.nfe.sefaz.ms.gov.br/ws/NFeConsultaProtocolo4".to_string(),
                    recepcao_evento: "https://hom.nfe.sefaz.ms.gov.br/ws/NFeRecepcaoEvento4".to_string(),
                    inutilizacao: "https://hom.nfe.sefaz.ms.gov.br/ws/NFeInutilizacao4".to_string(),
                }
            }
        }
        // 35 - SÃO PAULO (SEFAZ-SP)
        35 => {
            if is_producao {
                SefazEndpoints {
                    status_servico: "https://nfe.fazenda.sp.gov.br/ws/nfestatusservico4.asmx".to_string(),
                    autorizacao: "https://nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx".to_string(),
                    ret_autorizacao: "https://nfe.fazenda.sp.gov.br/ws/nferetautorizacao4.asmx".to_string(),
                    consulta_protocolo: "https://nfe.fazenda.sp.gov.br/ws/nfeconsultaprotocolo4.asmx".to_string(),
                    recepcao_evento: "https://nfe.fazenda.sp.gov.br/ws/nferecepcaoevento4.asmx".to_string(),
                    inutilizacao: "https://nfe.fazenda.sp.gov.br/ws/nfeinutilizacao4.asmx".to_string(),
                }
            } else {
                SefazEndpoints {
                    status_servico: "https://homologacao.nfe.fazenda.sp.gov.br/ws/nfestatusservico4.asmx".to_string(),
                    autorizacao: "https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx".to_string(),
                    ret_autorizacao: "https://homologacao.nfe.fazenda.sp.gov.br/ws/nferetautorizacao4.asmx".to_string(),
                    consulta_protocolo: "https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeconsultaprotocolo4.asmx".to_string(),
                    recepcao_evento: "https://homologacao.nfe.fazenda.sp.gov.br/ws/nferecepcaoevento4.asmx".to_string(),
                    inutilizacao: "https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeinutilizacao4.asmx".to_string(),
                }
            }
        }
        // PADRÃO SVRS (Sefaz Virtual Rio Grande do Sul - para demais estados)
        _ => {
            if is_producao {
                SefazEndpoints {
                    status_servico: "https://nfe.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx".to_string(),
                    autorizacao: "https://nfe.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx".to_string(),
                    ret_autorizacao: "https://nfe.svrs.rs.gov.br/ws/NfeRetAutorizacao/NFeRetAutorizacao4.asmx".to_string(),
                    consulta_protocolo: "https://nfe.svrs.rs.gov.br/ws/NfeConsulta/NfeConsulta4.asmx".to_string(),
                    recepcao_evento: "https://nfe.svrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx".to_string(),
                    inutilizacao: "https://nfe.svrs.rs.gov.br/ws/nfeinutilizacao/nfeinutilizacao4.asmx".to_string(),
                }
            } else {
                SefazEndpoints {
                    status_servico: "https://nfe-homologacao.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx".to_string(),
                    autorizacao: "https://nfe-homologacao.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx".to_string(),
                    ret_autorizacao: "https://nfe-homologacao.svrs.rs.gov.br/ws/NfeRetAutorizacao/NFeRetAutorizacao4.asmx".to_string(),
                    consulta_protocolo: "https://nfe-homologacao.svrs.rs.gov.br/ws/NfeConsulta/NfeConsulta4.asmx".to_string(),
                    recepcao_evento: "https://nfe-homologacao.svrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx".to_string(),
                    inutilizacao: "https://nfe-homologacao.svrs.rs.gov.br/ws/nfeinutilizacao/nfeinutilizacao4.asmx".to_string(),
                }
            }
        }
    }
}

/// Estrutura padronizada de retorno de operações da SEFAZ
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct SefazResponse {
    pub c_stat: u32,
    pub x_motivo: String,
    pub n_prot: Option<String>,
    pub dh_rec_bto: Option<String>,
    pub ch_nfe: Option<String>,
    pub xml_retorno: String,
    pub sucesso: bool,
}

/// Cria o cliente HTTP seguro mTLS com Certificado Digital PKCS#12
fn criar_cliente_mtls(
    pfx_bytes: Option<&[u8]>,
    password: Option<&str>,
) -> Result<reqwest::Client, String> {
    let mut builder = reqwest::Client::builder()
        .use_native_tls()
        .timeout(std::time::Duration::from_secs(20))
        .danger_accept_invalid_certs(true); // Cadeia ICP-Brasil

    if let (Some(bytes), Some(pwd)) = (pfx_bytes, password) {
        if !bytes.is_empty() {
            let identity = reqwest::Identity::from_pkcs12_der(bytes, pwd)
                .map_err(|e| format!("Falha ao carregar Certificado Digital A1 (.pfx): {}", e))?;
            builder = builder.identity(identity);
        }
    }

    builder.build().map_err(|e| format!("Erro ao inicializar cliente HTTPS: {}", e))
}

/// 1. Consulta Status do Serviço SEFAZ (NFeStatusServico4)
pub async fn consultar_status_servico_sefaz(
    uf: u32,
    ambiente: u32,
    pfx_bytes: Option<&[u8]>,
    password: Option<&str>,
    is_mock: bool,
) -> Result<SefazResponse, String> {
    let uf_nome = if uf == 50 { "MS" } else if uf == 35 { "SP" } else { "SVRS" };
    let amb_nome = if ambiente == 1 { "Produção" } else { "Homologação" };
    let agora = chrono::Local::now().format("%d/%m/%Y %H:%M:%S").to_string();

    if is_mock {
        return Ok(SefazResponse {
            c_stat: 107,
            x_motivo: format!("Serviço em Operação - SEFAZ-{} ({}) [Modo Simulado / Treinamento]", uf_nome, amb_nome),
            n_prot: None,
            dh_rec_bto: Some(agora),
            ch_nfe: None,
            xml_retorno: format!(r#"<retConsStatServ versao="4.00"><tpAmb>{}</tpAmb><verAplic>Coliseu_Simulador</verAplic><cStat>107</cStat><xMotivo>Servico em Operacao</xMotivo><cUF>{}</cUF><dhRecbto>{}</dhRecbto><tMed>1</tMed></retConsStatServ>"#, ambiente, uf, chrono::Utc::now().to_rfc3339()),
            sucesso: true,
        });
    }

    let endpoints = obter_endpoints_sefaz(uf, ambiente);
    let soap_body = format!(
        r#"<?xml version="1.0" encoding="utf-8"?><soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"><soap12:Body><nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeStatusServico4"><consStatServ xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><tpAmb>{}</tpAmb><cUF>{}</cUF><xServ>STATUS</xServ></consStatServ></nfeDadosMsg></soap12:Body></soap12:Envelope>"#,
        ambiente, uf
    );

    let client = match criar_cliente_mtls(pfx_bytes, password) {
        Ok(c) => c,
        Err(e) => return Ok(SefazResponse {
            c_stat: 999,
            x_motivo: format!("Falha de Certificado Digital: {}", e),
            n_prot: None,
            dh_rec_bto: Some(agora),
            ch_nfe: None,
            xml_retorno: format!("<erro><motivo>{}</motivo></erro>", e),
            sucesso: false,
        }),
    };

    let res = match client
        .post(&endpoints.status_servico)
        .header("Content-Type", "application/soap+xml; charset=utf-8")
        .body(soap_body)
        .send()
        .await {
            Ok(r) => r,
            Err(e) => {
                return Ok(SefazResponse {
                    c_stat: 999,
                    x_motivo: format!("Servidor SEFAZ-{} ({}) temporariamente inacessível ou sem resposta: {}", uf_nome, amb_nome, e),
                    n_prot: None,
                    dh_rec_bto: Some(agora),
                    ch_nfe: None,
                    xml_retorno: format!("<erro><motivo>{}</motivo></erro>", e),
                    sucesso: false,
                });
            }
        };

    let text = res.text().await.unwrap_or_else(|_| "".to_string());
    parse_sefaz_xml_response(&text)
}

/// 2. Transmite Lote de NF-e / NFC-e para a SEFAZ (NFeAutorizacao4)
pub async fn transmitir_lote_nfe_sefaz(
    xml_assinado: &str,
    chave_acesso: &str,
    uf: u32,
    ambiente: u32,
    pfx_bytes: Option<&[u8]>,
    password: Option<&str>,
    is_mock: bool,
) -> Result<SefazResponse, String> {
    let uf_nome = if uf == 50 { "MS" } else if uf == 35 { "SP" } else { "SVRS" };
    let amb_nome = if ambiente == 1 { "Produção" } else { "Homologação" };
    let agora = chrono::Utc::now().to_rfc3339();

    if is_mock {
        let protocolo = format!("15026000{}", rand::random::<u32>() % 9000000 + 1000000);

        let mock_xml = format!(
            r#"<retEnviNFe versao="4.00"><tpAmb>{}</tpAmb><cStat>100</cStat><xMotivo>Autorizado o uso da NF-e</xMotivo><protNFe versao="4.00"><infProt><tpAmb>{}</tpAmb><verAplic>MS_4.00_v1.0</verAplic><chNFe>{}</chNFe><dhRecbto>{}</dhRecbto><nProt>{}</nProt><digVal>9/8vT34kLm8912837261524354=</digVal><cStat>100</cStat><xMotivo>Autorizado o uso da NF-e</xMotivo></infProt></protNFe></retEnviNFe>"#,
            ambiente, ambiente, chave_acesso, agora, protocolo
        );

        return Ok(SefazResponse {
            c_stat: 100,
            x_motivo: "Autorizado o uso da NF-e".to_string(),
            n_prot: Some(protocolo),
            dh_rec_bto: Some(agora),
            ch_nfe: Some(chave_acesso.to_string()),
            xml_retorno: mock_xml,
            sucesso: true,
        });
    }

    let endpoints = obter_endpoints_sefaz(uf, ambiente);
    let soap_body = format!(
        r#"<?xml version="1.0" encoding="utf-8"?><soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"><soap12:Body><nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4"><enviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><idLote>1</idLote><indSinc>1</indSinc>{}</enviNFe></nfeDadosMsg></soap12:Body></soap12:Envelope>"#,
        xml_assinado
    );

    let client = match criar_cliente_mtls(pfx_bytes, password) {
        Ok(c) => c,
        Err(e) => return Ok(SefazResponse {
            c_stat: 999,
            x_motivo: format!("Falha de Certificado Digital: {}", e),
            n_prot: None,
            dh_rec_bto: Some(agora),
            ch_nfe: Some(chave_acesso.to_string()),
            xml_retorno: format!("<erro><motivo>{}</motivo></erro>", e),
            sucesso: false,
        }),
    };

    let res = match client
        .post(&endpoints.autorizacao)
        .header("Content-Type", "application/soap+xml; charset=utf-8")
        .body(soap_body)
        .send()
        .await {
            Ok(r) => r,
            Err(e) => {
                return Ok(SefazResponse {
                    c_stat: 999,
                    x_motivo: format!("Transmissão para SEFAZ-{} ({}) não concluída: {}", uf_nome, amb_nome, e),
                    n_prot: None,
                    dh_rec_bto: Some(agora),
                    ch_nfe: Some(chave_acesso.to_string()),
                    xml_retorno: format!("<erro><motivo>{}</motivo></erro>", e),
                    sucesso: false,
                });
            }
        };

    let text = res.text().await.unwrap_or_else(|_| "".to_string());
    parse_sefaz_xml_response(&text)
}

/// Função de compatibilidade com worker e rotas legadas
pub async fn transmitir_nfe(
    config: &SefazConfig,
    xml_assinado: &str,
    chave_acesso: &str,
) -> Result<SefazResponse, String> {
    transmitir_lote_nfe_sefaz(
        xml_assinado,
        chave_acesso,
        config.uf,
        config.ambiente,
        config.cert_pfx_bytes.as_deref(),
        config.cert_password.as_deref(),
        config.force_mock,
    ).await
}

/// 3. Consulta Chave de Acesso na SEFAZ (NFeConsultaProtocolo4)
pub async fn consultar_chave_sefaz(
    chave_acesso: &str,
    uf: u32,
    ambiente: u32,
    pfx_bytes: Option<&[u8]>,
    password: Option<&str>,
    is_mock: bool,
) -> Result<SefazResponse, String> {
    let agora = chrono::Utc::now().to_rfc3339();

    if is_mock {
        return Ok(SefazResponse {
            c_stat: 100,
            x_motivo: "Autorizado o uso da NF-e (Consulta em Modo Treinamento)".to_string(),
            n_prot: Some("150260001829384".to_string()),
            dh_rec_bto: Some(agora),
            ch_nfe: Some(chave_acesso.to_string()),
            xml_retorno: format!(r#"<retConsSitNFe versao="4.00"><cStat>100</cStat><xMotivo>Autorizado o uso da NF-e</xMotivo><protNFe><infProt><chNFe>{}</chNFe><nProt>150260001829384</nProt><cStat>100</cStat><xMotivo>Autorizado o uso da NF-e</xMotivo></infProt></protNFe></retConsSitNFe>"#, chave_acesso),
            sucesso: true,
        });
    }

    let endpoints = obter_endpoints_sefaz(uf, ambiente);
    let soap_body = format!(
        r#"<?xml version="1.0" encoding="utf-8"?><soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"><soap12:Body><nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4"><consSitNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><tpAmb>{}</tpAmb><xServ>CONSULTAR</xServ><chNFe>{}</chNFe></consSitNFe></nfeDadosMsg></soap12:Body></soap12:Envelope>"#,
        ambiente, chave_acesso
    );

    let client = match criar_cliente_mtls(pfx_bytes, password) {
        Ok(c) => c,
        Err(e) => return Ok(SefazResponse {
            c_stat: 999,
            x_motivo: format!("Falha de Certificado Digital: {}", e),
            n_prot: None,
            dh_rec_bto: Some(agora),
            ch_nfe: Some(chave_acesso.to_string()),
            xml_retorno: format!("<erro><motivo>{}</motivo></erro>", e),
            sucesso: false,
        }),
    };

    let res = match client
        .post(&endpoints.consulta_protocolo)
        .header("Content-Type", "application/soap+xml; charset=utf-8")
        .body(soap_body)
        .send()
        .await {
            Ok(r) => r,
            Err(e) => {
                return Ok(SefazResponse {
                    c_stat: 999,
                    x_motivo: format!("Consulta de Chave na SEFAZ não concluída: {}", e),
                    n_prot: None,
                    dh_rec_bto: Some(agora),
                    ch_nfe: Some(chave_acesso.to_string()),
                    xml_retorno: format!("<erro><motivo>{}</motivo></erro>", e),
                    sucesso: false,
                });
            }
        };

    let text = res.text().await.unwrap_or_else(|_| "".to_string());
    parse_sefaz_xml_response(&text)
}

/// Extrai e formata a resposta XML da SEFAZ
pub fn parse_sefaz_xml_response(xml_soap: &str) -> Result<SefazResponse, String> {
    let c_stat = extrair_tag(xml_soap, "cStat")
        .and_then(|s| s.parse::<u32>().ok())
        .unwrap_or(999);

    let x_motivo = extrair_tag(xml_soap, "xMotivo")
        .unwrap_or_else(|| "Retorno sem mensagem descritiva do servidor SEFAZ".to_string());

    let n_prot = extrair_tag(xml_soap, "nProt");
    let dh_rec_bto = extrair_tag(xml_soap, "dhRecbto").or_else(|| extrair_tag(xml_soap, "dhRecBto"));
    let ch_nfe = extrair_tag(xml_soap, "chNFe");

    let sucesso = c_stat == 100 || c_stat == 104 || c_stat == 135 || c_stat == 107 || c_stat == 102;

    Ok(SefazResponse {
        c_stat,
        x_motivo,
        n_prot,
        dh_rec_bto,
        ch_nfe,
        xml_retorno: xml_soap.to_string(),
        sucesso,
    })
}

fn extrair_tag(xml: &str, tag_name: &str) -> Option<String> {
    let open_tag = format!("<{}>", tag_name);
    let close_tag = format!("</{}>", tag_name);

    if let Some(start) = xml.find(&open_tag) {
        let content_start = start + open_tag.len();
        if let Some(end) = xml[content_start..].find(&close_tag) {
            return Some(xml[content_start..content_start + end].trim().to_string());
        }
    }

    let open_tag_prefix = format!("<{} ", tag_name);
    if let Some(start) = xml.find(&open_tag_prefix) {
        if let Some(attr_end) = xml[start..].find('>') {
            let content_start = start + attr_end + 1;
            if let Some(end) = xml[content_start..].find(&close_tag) {
                return Some(xml[content_start..content_start + end].trim().to_string());
            }
        }
    }

    None
}
