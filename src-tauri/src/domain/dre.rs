//! Módulo de Apuração de DRE Gerencial (Demonstrativo do Resultado do Exercício)
//!
//! Apura vendas, impostos retidos, custo das mercadorias vendidas (CMV) e despesas por plano de contas.

use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use tracing::info;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LinhaDre {
    pub codigo_conta: String,
    pub descricao: String,
    pub valor: f64,
    pub percentual_sobre_receita: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DreGerencialReport {
    pub periodo_inicio: String,
    pub periodo_fim: String,
    pub receita_bruta: f64,
    pub deducoes_impostos: f64,
    pub receita_liquida: f64,
    pub custo_mercadorias_vendidas_cmv: f64,
    pub lucro_bruto: f64,
    pub margem_bruta_percentual: f64,
    pub despesas_operacionais_fixas: f64,
    pub despesas_operacionais_variaveis: f64,
    pub lucro_liquido_ebitda: f64,
    pub margem_liquida_percentual: f64,
    pub detalhamento_linhas: Vec<LinhaDre>,
}

pub fn gerar_dre_gerencial(
    conn: &Connection,
    filial_id: &str,
    data_inicio: &str,
    data_fim: &str,
) -> Result<DreGerencialReport, String> {
    // 1. Receita Bruta (Soma das Vendas concluídas)
    let receita_bruta: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(valor_total), 0.0)
             FROM vendas
             WHERE filial_id = ?1 AND status = 'CONCLUIDA'
               AND strftime('%Y-%m-%d', created_at) >= ?2
               AND strftime('%Y-%m-%d', created_at) <= ?3",
            params![filial_id, data_inicio, data_fim],
            |r| r.get(0),
        )
        .unwrap_or(0.0);

    // 2. Deduções / Impostos sobre Vendas (Simulados como 10% da receita para Simples/Regime Normal)
    let deducoes_impostos = (receita_bruta * 0.06).round() / 100.0 * 100.0;
    let receita_liquida = (receita_bruta - deducoes_impostos).max(0.0);

    // 3. Custo das Mercadorias Vendidas (CMV)
    let cmv: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(vi.quantidade * p.preco_custo), 0.0)
             FROM vendas_itens vi
             JOIN vendas v ON v.id = vi.venda_id
             JOIN produtos p ON p.id = vi.produto_id
             WHERE v.filial_id = ?1 AND v.status = 'CONCLUIDA'
               AND strftime('%Y-%m-%d', v.created_at) >= ?2
               AND strftime('%Y-%m-%d', v.created_at) <= ?3",
            params![filial_id, data_inicio, data_fim],
            |r| r.get(0),
        )
        .unwrap_or(0.0);

    let lucro_bruto = receita_liquida - cmv;
    let margem_bruta_percentual = if receita_bruta > 0.0 {
        (lucro_bruto / receita_bruta) * 100.0
    } else {
        0.0
    };

    // 4. Despesas Operacionais Fixas (Lançamentos a Pagar pagos no período)
    let despesas_fixas: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(valor_pago), 0.0)
             FROM financeiro_lancamentos
             WHERE filial_id = ?1 AND tipo = 'PAGAR' AND status = 'PAGO'
               AND strftime('%Y-%m-%d', data_vencimento) >= ?2
               AND strftime('%Y-%m-%d', data_vencimento) <= ?3",
            params![filial_id, data_inicio, data_fim],
            |r| r.get(0),
        )
        .unwrap_or(0.0);

    let despesas_variaveis = 0.0;
    let lucro_liquido_ebitda = lucro_bruto - (despesas_fixas + despesas_variaveis);
    let margem_liquida_percentual = if receita_bruta > 0.0 {
        (lucro_liquido_ebitda / receita_bruta) * 100.0
    } else {
        0.0
    };

    let mut detalhamento = Vec::new();
    detalhamento.push(LinhaDre {
        codigo_conta: "3.01".to_string(),
        descricao: "Receita Bruta de Vendas".to_string(),
        valor: receita_bruta,
        percentual_sobre_receita: 100.0,
    });
    detalhamento.push(LinhaDre {
        codigo_conta: "3.02".to_string(),
        descricao: "(-) Deduções e Impostos sobre Vendas".to_string(),
        valor: deducoes_impostos,
        percentual_sobre_receita: if receita_bruta > 0.0 { (deducoes_impostos / receita_bruta) * 100.0 } else { 0.0 },
    });
    detalhamento.push(LinhaDre {
        codigo_conta: "3.03".to_string(),
        descricao: "(=) Receita Líquida".to_string(),
        valor: receita_liquida,
        percentual_sobre_receita: if receita_bruta > 0.0 { (receita_liquida / receita_bruta) * 100.0 } else { 0.0 },
    });
    detalhamento.push(LinhaDre {
        codigo_conta: "3.04".to_string(),
        descricao: "(-) Custo das Mercadorias Vendidas (CMV)".to_string(),
        valor: cmv,
        percentual_sobre_receita: if receita_bruta > 0.0 { (cmv / receita_bruta) * 100.0 } else { 0.0 },
    });
    detalhamento.push(LinhaDre {
        codigo_conta: "3.05".to_string(),
        descricao: "(=) Lucro Bruto".to_string(),
        valor: lucro_bruto,
        percentual_sobre_receita: margem_bruta_percentual,
    });
    detalhamento.push(LinhaDre {
        codigo_conta: "4.01".to_string(),
        descricao: "(-) Despesas Operacionais".to_string(),
        valor: despesas_fixas,
        percentual_sobre_receita: if receita_bruta > 0.0 { (despesas_fixas / receita_bruta) * 100.0 } else { 0.0 },
    });
    detalhamento.push(LinhaDre {
        codigo_conta: "5.01".to_string(),
        descricao: "(=) Resultado Líquido do Exercício (EBITDA)".to_string(),
        valor: lucro_liquido_ebitda,
        percentual_sobre_receita: margem_liquida_percentual,
    });

    info!(
        "DRE Gerencial apurada para filial {}: Receita R$ {:.2}, Lucro Líquido R$ {:.2}",
        filial_id, receita_bruta, lucro_liquido_ebitda
    );

    Ok(DreGerencialReport {
        periodo_inicio: data_inicio.to_string(),
        periodo_fim: data_fim.to_string(),
        receita_bruta,
        deducoes_impostos,
        receita_liquida,
        custo_mercadorias_vendidas_cmv: cmv,
        lucro_bruto,
        margem_bruta_percentual,
        despesas_operacionais_fixas: despesas_fixas,
        despesas_operacionais_variaveis: despesas_variaveis,
        lucro_liquido_ebitda,
        margem_liquida_percentual,
        detalhamento_linhas: detalhamento,
    })
}
