//! Motor de Cálculo Tributário Brasileiro (SEFAZ BR)
//!
//! Realiza o cálculo de tributos (ICMS, PIS, COFINS, CFOP e IBPT) para operações internas
//! e interestaduais, suportando empresas do Simples Nacional (CRT=1) e Regime Normal (CRT=3).

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegraTributaria {
    pub id: String,
    pub empresa_id: String,
    pub ncm: String,
    pub uf_origem: String,
    pub uf_destino: String,
    pub crt: u32, // 1 = Simples Nacional, 3 = Regime Normal
    pub cfop_estado: String,
    pub cfop_interestado: String,
    pub csosn: String,
    pub cst_icms: String,
    pub aliquota_icms: f64,
    pub aliquota_red_bc_icms: f64,
    pub cst_pis: String,
    pub aliquota_pis: f64,
    pub cst_cofins: String,
    pub aliquota_cofins: f64,
    pub aliquota_ibpt_nacional: f64,
    pub aliquota_ibpt_estadual: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CalculoImpostoInput {
    pub ncm: String,
    pub valor_bruto_item: f64,
    pub valor_desconto_item: f64,
    pub quantidade: f64,
    pub uf_origem: String,
    pub uf_destino: String,
    pub crt_empresa: u32,
    pub regra_opt: Option<RegraTributaria>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResultadoTributarioItem {
    pub cfop: String,
    pub valor_liquido_item: f64,
    pub csosn_ou_cst_icms: String,
    pub base_calculo_icms: f64,
    pub aliquota_icms: f64,
    pub valor_icms: f64,
    pub cst_pis: String,
    pub aliquota_pis: f64,
    pub valor_pis: f64,
    pub cst_cofins: String,
    pub aliquota_cofins: f64,
    pub valor_cofins: f64,
    pub valor_ibpt_nacional: f64,
    pub valor_ibpt_estadual: f64,
    pub valor_total_tributos_ibpt: f64,
}

/// Calcula todos os tributos estaduais e federais de um item da venda.
pub fn calcular_tributos_item(input: &CalculoImpostoInput) -> ResultadoTributarioItem {
    let valor_liquido = (input.valor_bruto_item - input.valor_desconto_item).max(0.0);
    let is_operacao_interna = input.uf_origem.trim().to_uppercase() == input.uf_destino.trim().to_uppercase();

    let regra = input.regra_opt.clone().unwrap_or_else(|| RegraTributaria {
        id: "default".to_string(),
        empresa_id: "default".to_string(),
        ncm: input.ncm.clone(),
        uf_origem: input.uf_origem.clone(),
        uf_destino: input.uf_destino.clone(),
        crt: input.crt_empresa,
        cfop_estado: "5102".to_string(),
        cfop_interestado: "6102".to_string(),
        csosn: if input.crt_empresa == 1 { "102".to_string() } else { "00".to_string() },
        cst_icms: "00".to_string(),
        aliquota_icms: if input.crt_empresa == 1 { 0.0 } else { 18.0 },
        aliquota_red_bc_icms: 0.0,
        cst_pis: "07".to_string(),
        aliquota_pis: if input.crt_empresa == 1 { 0.0 } else { 1.65 },
        cst_cofins: "07".to_string(),
        aliquota_cofins: if input.crt_empresa == 1 { 0.0 } else { 7.60 },
        aliquota_ibpt_nacional: 4.20,
        aliquota_ibpt_estadual: 12.00,
    });

    let cfop = if is_operacao_interna {
        regra.cfop_estado
    } else {
        regra.cfop_interestado
    };

    // Redução de Base de Cálculo do ICMS
    let bc_icms = if regra.aliquota_red_bc_icms > 0.0 {
        valor_liquido * (1.0 - (regra.aliquota_red_bc_icms / 100.0))
    } else {
        valor_liquido
    };

    let valor_icms = bc_icms * (regra.aliquota_icms / 100.0);
    let valor_pis = valor_liquido * (regra.aliquota_pis / 100.0);
    let valor_cofins = valor_liquido * (regra.aliquota_cofins / 100.0);

    // Carga tributária aproximada IBPT (Lei 12.741/2012)
    let valor_ibpt_nac = valor_liquido * (regra.aliquota_ibpt_nacional / 100.0);
    let valor_ibpt_est = valor_liquido * (regra.aliquota_ibpt_estadual / 100.0);
    let valor_tot_trib = valor_ibpt_nac + valor_ibpt_est;

    ResultadoTributarioItem {
        cfop,
        valor_liquido_item: (valor_liquido * 100.0).round() / 100.0,
        csosn_ou_cst_icms: if input.crt_empresa == 1 { regra.csosn } else { regra.cst_icms },
        base_calculo_icms: (bc_icms * 100.0).round() / 100.0,
        aliquota_icms: regra.aliquota_icms,
        valor_icms: (valor_icms * 100.0).round() / 100.0,
        cst_pis: regra.cst_pis,
        aliquota_pis: regra.aliquota_pis,
        valor_pis: (valor_pis * 100.0).round() / 100.0,
        cst_cofins: regra.cst_cofins,
        aliquota_cofins: regra.aliquota_cofins,
        valor_cofins: (valor_cofins * 100.0).round() / 100.0,
        valor_ibpt_nacional: (valor_ibpt_nac * 100.0).round() / 100.0,
        valor_ibpt_estadual: (valor_ibpt_est * 100.0).round() / 100.0,
        valor_total_tributos_ibpt: (valor_tot_trib * 100.0).round() / 100.0,
    }
}

/// Gera as tags XML de imposto para o detalhe da nota fiscal (`<imposto>`)
pub fn gerar_xml_imposto_item(res: &ResultadoTributarioItem, crt: u32) -> String {
    let tag_icms = if crt == 1 {
        format!(
            r#"<ICMSSN102><orig>0</orig><CSOSN>{}</CSOSN></ICMSSN102>"#,
            res.csosn_ou_cst_icms
        )
    } else {
        format!(
            r#"<ICMS00><orig>0</orig><CST>{}</CST><modBC>3</modBC><vBC>{:.2}</vBC><pICMS>{:.2}</pICMS><vICMS>{:.2}</vICMS></ICMS00>"#,
            res.csosn_ou_cst_icms, res.base_calculo_icms, res.aliquota_icms, res.valor_icms
        )
    };

    format!(
        r#"<imposto><vTotTrib>{:.2}</vTotTrib><ICMS>{}</ICMS><PIS><PISOutr><CST>{}</CST><vBC>{:.2}</vBC><pPIS>{:.2}</pPIS><vPIS>{:.2}</vPIS></PISOutr></PIS><COFINS><COFINSOutr><CST>{}</CST><vBC>{:.2}</vBC><pCOFINS>{:.2}</pCOFINS><vCOFINS>{:.2}</vCOFINS></COFINSOutr></COFINS></imposto>"#,
        res.valor_total_tributos_ibpt, tag_icms, res.cst_pis, res.valor_liquido_item, res.aliquota_pis, res.valor_pis, res.cst_cofins, res.valor_liquido_item, res.aliquota_cofins, res.valor_cofins
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculo_tributario_simples_nacional() {
        let input = CalculoImpostoInput {
            ncm: "22021000".to_string(),
            valor_bruto_item: 100.0,
            valor_desconto_item: 10.0,
            quantidade: 1.0,
            uf_origem: "SP".to_string(),
            uf_destino: "SP".to_string(),
            crt_empresa: 1,
            regra_opt: None,
        };

        let res = calcular_tributos_item(&input);
        assert_eq!(res.cfop, "5102");
        assert_eq!(res.valor_liquido_item, 90.0);
        assert_eq!(res.csosn_ou_cst_icms, "102");
        assert!(res.valor_total_tributos_ibpt > 0.0);
    }

    #[test]
    fn test_calculo_tributario_interestadual_regime_normal() {
        let input = CalculoImpostoInput {
            ncm: "22021000".to_string(),
            valor_bruto_item: 200.0,
            valor_desconto_item: 0.0,
            quantidade: 2.0,
            uf_origem: "SP".to_string(),
            uf_destino: "RJ".to_string(),
            crt_empresa: 3,
            regra_opt: None,
        };

        let res = calcular_tributos_item(&input);
        assert_eq!(res.cfop, "6102");
        assert_eq!(res.valor_icms, 36.0); // 200 * 18%
    }
}
