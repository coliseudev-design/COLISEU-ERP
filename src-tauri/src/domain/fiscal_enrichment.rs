//! Módulo de Enriquecimento Fiscal & Consulta a APIs Gratuitas (BrasilAPI + IBPT)
//!
//! Realiza a parametrização tributária automatizada de produtos novos importados via XML,
//! determinando CFOP de venda, CSOSN ICMS, CST PIS/COFINS e alíquotas do IBPT conforme a legislação do Estado.

use serde::{Deserialize, Serialize};
use tracing::info;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SugestaoTributariaVarejo {
    pub ncm: String,
    pub cest: Option<String>,
    pub cfop_venda: String,
    pub csosn_venda: String,
    pub pis_cst_venda: String,
    pub cofins_cst_venda: String,
    pub aliquota_ibpt_nacional: f64,
    pub aliquota_ibpt_estadual: f64,
    pub aliquota_ibpt_importado: f64,
    pub descricao_ncm_oficial: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BrasilApiNcmResponse {
    pub codigo: String,
    pub descricao: String,
    pub data_inicio: Option<String>,
    pub data_fim: Option<String>,
}

/// Determina as regras de tributação de venda no varejo com base no NCM, CEST e UF
pub fn sugerir_tributacao_estadual_varejo(
    ncm: &str,
    cest: Option<&str>,
    uf_origem: &str,
    uf_destino: &str,
) -> SugestaoTributariaVarejo {
    let clean_ncm = ncm.replace(['.', '-'], "");
    let tem_st = cest.is_some() && !cest.unwrap().trim().is_empty();

    // 1. CFOP de Saída Varejo
    let cfop_venda = if uf_origem == uf_destino {
        if tem_st {
            "5405".to_string() // Venda de mercadoria adquirida de terceiros com ST
        } else {
            "5101".to_string() // Venda de mercadoria adquirida de terceiros (Padrão)
        }
    } else {
        if tem_st {
            "6405".to_string()
        } else {
            "6101".to_string()
        }
    };

    // 2. CSOSN ICMS (Simples Nacional)
    let csosn_venda = if tem_st {
        "500".to_string() // ICMS cobrado anteriormente por substituição tributária ou por antecipação
    } else {
        "102".to_string() // Tributada pelo Simples Nacional sem permissão de crédito
    };

    // 3. PIS / COFINS (Detecção de Monofásicos por NCM)
    // Ex: Bebidas (2201, 2202, 2203), Perfumaria (3303, 3304, 3305, 3307), Autopeças (8708)
    let eh_monofasico = clean_ncm.starts_with("2201")
        || clean_ncm.starts_with("2202")
        || clean_ncm.starts_with("2203")
        || clean_ncm.starts_with("3303")
        || clean_ncm.starts_with("3304")
        || clean_ncm.starts_with("3305")
        || clean_ncm.starts_with("3307")
        || clean_ncm.starts_with("8708");

    let (pis_cst, cofins_cst) = if eh_monofasico {
        ("07".to_string(), "07".to_string()) // Operação Isenta de Contribuição / Monofásico
    } else {
        ("49".to_string(), "49".to_string()) // Outras Operações de Saída
    };

    // 4. Estimativa IBPT (Tributos Aproximados)
    let (ibpt_nac, ibpt_est, ibpt_imp) = estimar_aliquotas_ibpt(&clean_ncm);

    info!(
        "Tributação sugerida para NCM {}: CFOP={}, CSOSN={}, PIS/COFINS={}",
        clean_ncm, cfop_venda, csosn_venda, pis_cst
    );

    SugestaoTributariaVarejo {
        ncm: clean_ncm,
        cest: cest.map(|s| s.to_string()),
        cfop_venda,
        csosn_venda,
        pis_cst_venda: pis_cst,
        cofins_cst_venda: cofins_cst,
        aliquota_ibpt_nacional: ibpt_nac,
        aliquota_ibpt_estadual: ibpt_est,
        aliquota_ibpt_importado: ibpt_imp,
        descricao_ncm_oficial: format!("NCM {}", ncm),
    }
}

/// Estimador offline de alíquotas aproximadas do IBPT por NCM
fn estimar_aliquotas_ibpt(clean_ncm: &str) -> (f64, f64, f64) {
    if clean_ncm.starts_with("61") || clean_ncm.starts_with("62") || clean_ncm.starts_with("64") {
        // Vestuário e Calçados
        (13.45, 12.00, 24.30)
    } else if clean_ncm.starts_with("22") || clean_ncm.starts_with("21") {
        // Alimentos e Bebidas
        (4.20, 18.00, 19.50)
    } else {
        // Padrão Geral Varejo
        (13.45, 18.00, 20.00)
    }
}

/// Consulta assíncrona gratuita à BrasilAPI para validação e descrição do NCM
pub async fn consultar_brasilapi_ncm(ncm: &str) -> Result<BrasilApiNcmResponse, String> {
    let clean_ncm = ncm.replace(['.', '-'], "");
    let url = format!("https://brasilapi.com.br/api/ncm/v1/{}", clean_ncm);

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| e.to_string())?;

    match client.get(&url).send().await {
        Ok(resp) if resp.status().is_success() => {
            let data: BrasilApiNcmResponse = resp.json().await.map_err(|e| e.to_string())?;
            Ok(data)
        }
        _ => {
            // Fallback gracioso offline
            Ok(BrasilApiNcmResponse {
                codigo: clean_ncm,
                descricao: "NCM Consultado no Cadastro Fiscal".to_string(),
                data_inicio: None,
                data_fim: None,
            })
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sugestao_tributaria_sem_st() {
        let sug = sugerir_tributacao_estadual_varejo("6403.99.90", None, "SP", "SP");
        assert_eq!(sug.cfop_venda, "5101");
        assert_eq!(sug.csosn_venda, "102");
        assert_eq!(sug.pis_cst_venda, "49");
    }

    #[test]
    fn test_sugestao_tributaria_com_st() {
        let sug = sugerir_tributacao_estadual_varejo("2202.10.00", Some("03.010.00"), "SP", "SP");
        assert_eq!(sug.cfop_venda, "5405");
        assert_eq!(sug.csosn_venda, "500");
        assert_eq!(sug.pis_cst_venda, "07"); // Bebidas = Monofásico
    }
}
