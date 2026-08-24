//! Módulo de Motor de Promoções, Desconto por Atacado/Qtd & Leve X Pague Y no PDV
//!
//! Avalia dinamicamente o carrinho de compras do caixa e aplica precificação promocional automatizada.

use chrono::Utc;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use tracing::info;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Promocao {
    pub id: String,
    pub empresa_id: String,
    pub nome: String,
    pub tipo_promocao: String, // 'ATACADO_QTD', 'LEVE_X_PAGUE_Y', 'DESCONTO_PERCENTUAL'
    pub produto_id: Option<String>,
    pub quantidade_minima: f64,
    pub preco_promocional: Option<f64>,
    pub percentual_desconto: Option<f64>,
    pub quantidade_pague: Option<f64>,
    pub ativo: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ItemCarrinhoInput {
    pub produto_id: String,
    pub quantidade: f64,
    pub preco_unitario_original: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ItemCarrinhoCalculado {
    pub produto_id: String,
    pub quantidade: f64,
    pub preco_unitario_original: f64,
    pub preco_unitario_final: f64,
    pub valor_subtotal_bruto: f64,
    pub valor_desconto_promocional: f64,
    pub valor_total_final: f64,
    pub promocao_aplicada_nome: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResultadoCarrinhoPromocional {
    pub total_bruto: f64,
    pub total_desconto_promocional: f64,
    pub total_liquido: f64,
    pub itens: Vec<ItemCarrinhoCalculado>,
}

/// Salva ou atualiza uma promoção
pub fn salvar_promocao(
    conn: &Connection,
    device_id: &str,
    empresa_id: &str,
    nome: &str,
    tipo_promocao: &str,
    produto_id: Option<&str>,
    quantidade_minima: f64,
    preco_promocional: Option<f64>,
    percentual_desconto: Option<f64>,
    quantidade_pague: Option<f64>,
) -> Result<String, String> {
    let now = Utc::now().to_rfc3339();
    let id = Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO promocoes (
            id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
            empresa_id, nome, tipo_promocao, produto_id, quantidade_minima, preco_promocional, percentual_desconto, quantidade_pague, ativo
        ) VALUES (?1, ?2, ?3, ?3, 'pending', 1, 0, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, 1)",
        params![
            id,
            device_id,
            now,
            empresa_id,
            nome,
            tipo_promocao,
            produto_id,
            quantidade_minima,
            preco_promocional,
            percentual_desconto,
            quantidade_pague
        ],
    )
    .map_err(|e| format!("Erro ao salvar promoção: {}", e))?;

    info!("Promoção '{}' ({}) cadastrada com sucesso", nome, tipo_promocao);
    Ok(id)
}

/// Lista promoções ativas na empresa
pub fn listar_promocoes_ativas(conn: &Connection, empresa_id: &str) -> Result<Vec<Promocao>, String> {
    let mut stmt = conn
        .prepare("SELECT id, empresa_id, nome, tipo_promocao, produto_id, quantidade_minima, preco_promocional, percentual_desconto, quantidade_pague, ativo FROM promocoes WHERE empresa_id = ?1 AND ativo = 1 AND is_deleted = 0 ORDER BY nome ASC")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([empresa_id], |r| {
            Ok(Promocao {
                id: r.get(0)?,
                empresa_id: r.get(1)?,
                nome: r.get(2)?,
                tipo_promocao: r.get(3)?,
                produto_id: r.get(4)?,
                quantidade_minima: r.get(5)?,
                preco_promocional: r.get(6)?,
                percentual_desconto: r.get(7)?,
                quantidade_pague: r.get(8)?,
                ativo: r.get(9)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut list = Vec::new();
    for r in rows {
        list.push(r.map_err(|e| e.to_string())?);
    }
    Ok(list)
}

/// Calcula o carrinho de compras do PDV aplicando descontos promocionais em tempo real
pub fn calcular_promocoes_carrinho(
    conn: &Connection,
    empresa_id: &str,
    itens_carrinho: Vec<ItemCarrinhoInput>,
) -> Result<ResultadoCarrinhoPromocional, String> {
    let promocoes = listar_promocoes_ativas(conn, empresa_id)?;
    let mut itens_resultado = Vec::new();

    let mut total_bruto = 0.0;
    let mut total_desconto = 0.0;

    for item in itens_carrinho {
        let bruto_item = item.quantidade * item.preco_unitario_original;
        total_bruto += bruto_item;

        let mut melhor_preco_unit = item.preco_unitario_original;
        let mut desconto_item = 0.0;
        let mut nome_promocao: Option<String> = None;

        // Procura promoção aplicável ao produto
        for p in &promocoes {
            if let Some(ref p_pid) = p.produto_id {
                if p_pid == &item.produto_id && item.quantidade >= p.quantidade_minima {
                    match p.tipo_promocao.as_str() {
                        "ATACADO_QTD" => {
                            if let Some(preco_atc) = p.preco_promocional {
                                if preco_atc < melhor_preco_unit {
                                    melhor_preco_unit = preco_atc;
                                    desconto_item = (item.preco_unitario_original - preco_atc) * item.quantidade;
                                    nome_promocao = Some(p.nome.clone());
                                }
                            }
                        }
                        "LEVE_X_PAGUE_Y" => {
                            let q_pague = p.quantidade_pague.unwrap_or(p.quantidade_minima);
                            let vezes = (item.quantidade / p.quantidade_minima).floor();
                            let gratuítas = vezes * (p.quantidade_minima - q_pague);
                            let desc = gratuítas * item.preco_unitario_original;
                            if desc > desconto_item {
                                desconto_item = desc;
                                melhor_preco_unit = (bruto_item - desc) / item.quantidade;
                                nome_promocao = Some(p.nome.clone());
                            }
                        }
                        _ => {}
                    }
                }
            }
        }

        total_desconto += desconto_item;
        let final_item = bruto_item - desconto_item;

        itens_resultado.push(ItemCarrinhoCalculado {
            produto_id: item.produto_id,
            quantidade: item.quantidade,
            preco_unitario_original: item.preco_unitario_original,
            preco_unitario_final: (melhor_preco_unit * 100.0).round() / 100.0,
            valor_subtotal_bruto: (bruto_item * 100.0).round() / 100.0,
            valor_desconto_promocional: (desconto_item * 100.0).round() / 100.0,
            valor_total_final: (final_item * 100.0).round() / 100.0,
            promocao_aplicada_nome: nome_promocao,
        });
    }

    let total_liquido = total_bruto - total_desconto;

    Ok(ResultadoCarrinhoPromocional {
        total_bruto: (total_bruto * 100.0).round() / 100.0,
        total_desconto_promocional: (total_desconto * 100.0).round() / 100.0,
        total_liquido: (total_liquido * 100.0).round() / 100.0,
        itens: itens_resultado,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::schema::create_tables;

    #[test]
    fn test_promocao_atacado_quantidade() {
        let conn = Connection::open_in_memory().unwrap();
        create_tables(&conn).unwrap();
        conn.execute(
            "INSERT INTO empresas (id, device_id, created_at, updated_at, razao_social, cnpj) VALUES ('emp1', 'dev1', 'now', 'now', 'Empresa Teste', '12345678000195')",
            [],
        ).unwrap();
        conn.execute(
            "INSERT INTO produtos (id, device_id, created_at, updated_at, empresa_id, codigo_sku, descricao, preco_custo, preco_venda) VALUES ('p1', 'dev1', 'now', 'now', 'emp1', 'SKU-P1', 'Produto P1', 5.0, 10.0)",
            [],
        ).unwrap();

        // 1. Promoção Atacado: A partir de 6un, preço cai de R$ 10,00 para R$ 7,90
        salvar_promocao(
            &conn,
            "dev1",
            "emp1",
            "Atacado 6+ unidades",
            "ATACADO_QTD",
            Some("p1"),
            6.0,
            Some(7.90),
            None,
            None,
        )
        .unwrap();

        // 2. Compra de 10un a R$ 10,00 ➔ Preço final esperado R$ 7,90
        let item = ItemCarrinhoInput {
            produto_id: "p1".to_string(),
            quantidade: 10.0,
            preco_unitario_original: 10.00,
        };

        let res = calcular_promocoes_carrinho(&conn, "emp1", vec![item]).unwrap();
        assert_eq!(res.itens[0].preco_unitario_final, 7.90);
        assert_eq!(res.total_liquido, 79.00);
        assert_eq!(res.total_desconto_promocional, 21.00);
    }
}
