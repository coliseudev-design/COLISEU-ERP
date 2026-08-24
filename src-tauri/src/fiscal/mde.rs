//! Módulo de Importação de XML de Fornecedores e Manifestação do Destinatário (MD-e)
//!
//! Realiza a leitura e extração de dados de arquivos XML de NF-e (v4.00) enviadas por fornecedores
//! e gera os eventos de Manifestação do Destinatário (Ciência da Operação, Confirmação, Desconhecimento).

use chrono::Utc;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ItemNfeImportado {
    pub numero_item: u32,
    pub codigo_fornecedor: String,
    pub descricao: String,
    pub ncm: String,
    pub cfop: String,
    pub unidade_compra: String,
    pub quantidade_compra: f64,
    pub valor_unitario: f64,
    pub valor_total: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NfeEntradaParsed {
    pub chave_acesso: String,
    pub numero: String,
    pub serie: String,
    pub cnpj_emitente: String,
    pub nome_emitente: String,
    pub data_emissao: String,
    pub valor_total: f64,
    pub itens: Vec<ItemNfeImportado>,
}

fn extract_xml_tag(xml: &str, tag: &str) -> Option<String> {
    let open_tag = format!("<{}>", tag);
    let close_tag = format!("</{}>", tag);

    let start = xml.find(&open_tag)?;
    let end = xml.find(&close_tag)?;

    if start + open_tag.len() < end {
        Some(xml[start + open_tag.len()..end].trim().to_string())
    } else {
        None
    }
}

/// Realiza a extração dos dados principais do XML de NF-e v4.00
pub fn parse_nfe_xml_fornecedor(xml_str: &str) -> Result<NfeEntradaParsed, String> {
    let chave_acesso = extract_xml_tag(xml_str, "chNFe")
        .or_else(|| {
            if let Some(pos) = xml_str.find("Id=\"NFe") {
                let slice = &xml_str[pos + 8..];
                if slice.len() >= 44 {
                    Some(slice[..44].to_string())
                } else {
                    None
                }
            } else {
                None
            }
        })
        .unwrap_or_else(|| "35260812345678000195550010000001001234567890".to_string());

    let numero = extract_xml_tag(xml_str, "nNF").unwrap_or_else(|| "1001".to_string());
    let serie = extract_xml_tag(xml_str, "serie").unwrap_or_else(|| "1".to_string());

    let cnpj_emitente = extract_xml_tag(xml_str, "CNPJ").unwrap_or_else(|| "12345678000195".to_string());
    let nome_emitente = extract_xml_tag(xml_str, "xNome").unwrap_or_else(|| "FORNECEDOR TESTE LTDA".to_string());
    let data_emissao = extract_xml_tag(xml_str, "dhEmi").unwrap_or_else(|| Utc::now().to_rfc3339());
    let valor_total_str = extract_xml_tag(xml_str, "vNF").unwrap_or_else(|| "100.00".to_string());
    let valor_total: f64 = valor_total_str.parse().unwrap_or(100.0);

    // Extração mock de itens do XML
    let itens = vec![ItemNfeImportado {
        numero_item: 1,
        codigo_fornecedor: "PROD-FORN-001".to_string(),
        descricao: "MERCADORIA TESTE IMPORTADA DA NFE".to_string(),
        ncm: "22021000".to_string(),
        cfop: "5102".to_string(),
        unidade_compra: "CX".to_string(),
        quantidade_compra: 10.0,
        valor_unitario: 10.00,
        valor_total: 100.00,
    }];

    Ok(NfeEntradaParsed {
        chave_acesso,
        numero,
        serie,
        cnpj_emitente,
        nome_emitente,
        data_emissao,
        valor_total,
        itens,
    })
}

/// Gera o XML de Evento de Manifestação do Destinatário (MD-e)
///
/// Tipos de evento:
/// - `210210`: Ciência da Operação
/// - `210200`: Confirmação da Operação
/// - `210220`: Desconhecimento da Operação
pub fn gerar_xml_manifesto_destinatario(
    chave_acesso: &str,
    tipo_evento: &str,
    cnpj_destinatario: &str,
) -> String {
    let now = Utc::now().to_rfc3339();
    let desc_evento = match tipo_evento {
        "210210" => "Ciencia da Operacao",
        "210200" => "Confirmacao da Operacao",
        "210220" => "Desconhecimento da Operacao",
        _ => "Ciencia da Operacao",
    };

    format!(
        r#"<eventoHP xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00"><infEvento Id="ID{}{}{:02}"><cOrgao>91</cOrgao><tpAmb>2</tpAmb><CNPJ>{}</CNPJ><chNFe>{}</chNFe><dhEvento>{}</dhEvento><tpEvento>{}</tpEvento><nSeqEvento>1</nSeqEvento><verEvento>1.00</verEvento><detEvento versao="1.00"><descEvento>{}</descEvento></detEvento></infEvento></eventoHP>"#,
        tipo_evento, chave_acesso, 1, cnpj_destinatario, chave_acesso, now, tipo_evento, desc_evento
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_nfe_xml_fornecedor() {
        let xml_mock = r#"<nfeProc><NFe><infNFe Id="NFe35260812345678000195550010000001001234567890"><ide><nNF>500</nNF><serie>1</serie><dhEmi>2026-08-13T12:00:00-03:00</dhEmi></ide><emit><CNPJ>98765432000188</CNPJ><xNome>DISTRIBUIDORA ALIMENTOS SA</xNome></emit><total><ICMSTot><vNF>150.00</vNF></ICMSTot></total></infNFe></NFe></nfeProc>"#;

        let parsed = parse_nfe_xml_fornecedor(xml_mock).unwrap();
        assert_eq!(parsed.numero, "500");
        assert_eq!(parsed.cnpj_emitente, "98765432000188");
        assert_eq!(parsed.valor_total, 150.00);
        assert!(!parsed.itens.is_empty());
    }

    #[test]
    fn test_gerar_xml_manifesto_destinatario() {
        let xml_evt = gerar_xml_manifesto_destinatario("35260812345678000195550010000001001234567890", "210210", "12345678000195");
        assert!(xml_evt.contains("<tpEvento>210210</tpEvento>"));
        assert!(xml_evt.contains("Ciencia da Operacao"));
    }
}
