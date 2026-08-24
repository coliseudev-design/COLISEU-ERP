//! Módulo da Curva ABC de Produtos (Princípio de Pareto 80/20)
//!
//! Classifica o inventário e vendas em Classe A (80% da receita), Classe B (15%) e Classe C (5%).

use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use tracing::info;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ItemCurvaAbc {
    pub produto_id: String,
    pub codigo_sku: String,
    pub descricao: String,
    pub faturamento_total: f64,
    pub percentual_relativo: f64,
    pub percentual_acumulado: f64,
    pub classe: String, // 'A', 'B', 'C'
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CurvaAbcReport {
    pub total_produtos_analisados: usize,
    pub faturamento_total_periodo: f64,
    pub total_classe_a: usize,
    pub total_classe_b: usize,
    pub total_classe_c: usize,
    pub itens: Vec<ItemCurvaAbc>,
}

/// Calcula a Curva ABC de Produtos com base nos itens vendidos no período
pub fn calcular_curva_abc_produtos(
    conn: &Connection,
    filial_id: &str,
    data_inicio: &str,
    data_fim: &str,
) -> Result<CurvaAbcReport, String> {
    // 1. Busca total faturado por produto no período
    let mut stmt = conn
        .prepare(
            "SELECT p.id, p.codigo_sku, p.descricao, COALESCE(SUM(vi.valor_total), 0.0) as total_fat
             FROM produtos p
             JOIN vendas_itens vi ON vi.produto_id = p.id
             JOIN vendas v ON v.id = vi.venda_id
             WHERE v.filial_id = ?1 AND v.status = 'CONCLUIDA'
               AND strftime('%Y-%m-%d', v.created_at) >= ?2
               AND strftime('%Y-%m-%d', v.created_at) <= ?3
             GROUP BY p.id, p.codigo_sku, p.descricao
             ORDER BY total_fat DESC",
        )
        .map_err(|e| e.to_string())?;

    struct RawItem {
        id: String,
        sku: String,
        desc: String,
        faturamento: f64,
    }

    let rows = stmt
        .query_map(params![filial_id, data_inicio, data_fim], |r| {
            Ok(RawItem {
                id: r.get(0)?,
                sku: r.get(1)?,
                desc: r.get(2)?,
                faturamento: r.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut raw_list = Vec::new();
    let mut total_faturamento_geral = 0.0;

    for r in rows {
        let item = r.map_err(|e| e.to_string())?;
        total_faturamento_geral += item.faturamento;
        raw_list.push(item);
    }

    let mut result_items = Vec::new();
    let mut acumulado_valor = 0.0;
    let mut cnt_a = 0;
    let mut cnt_b = 0;
    let mut cnt_c = 0;

    for item in raw_list {
        acumulado_valor += item.faturamento;
        let percent_rel = if total_faturamento_geral > 0.0 {
            (item.faturamento / total_faturamento_geral) * 100.0
        } else {
            0.0
        };

        let percent_acum = if total_faturamento_geral > 0.0 {
            (acumulado_valor / total_faturamento_geral) * 100.0
        } else {
            0.0
        };

        let classe = if percent_acum <= 80.0001 {
            cnt_a += 1;
            "A"
        } else if percent_acum <= 95.0001 {
            cnt_b += 1;
            "B"
        } else {
            cnt_c += 1;
            "C"
        };

        result_items.push(ItemCurvaAbc {
            produto_id: item.id,
            codigo_sku: item.sku,
            descricao: item.desc,
            faturamento_total: item.faturamento,
            percentual_relativo: (percent_rel * 100.0).round() / 100.0,
            percentual_acumulado: (percent_acum * 100.0).round() / 100.0,
            classe: classe.to_string(),
        });
    }

    info!(
        "Curva ABC processada. Total faturado: R$ {:.2}. Classe A: {}, Classe B: {}, Classe C: {}",
        total_faturamento_geral, cnt_a, cnt_b, cnt_c
    );

    Ok(CurvaAbcReport {
        total_produtos_analisados: result_items.len(),
        faturamento_total_periodo: total_faturamento_geral,
        total_classe_a: cnt_a,
        total_classe_b: cnt_b,
        total_classe_c: cnt_c,
        itens: result_items,
    })
}
