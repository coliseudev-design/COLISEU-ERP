//! Módulo de Pré-Venda & Atendimento de Balcão Móvel (Comanda com QR Code)
//!
//! Permite que vendedores montem pré-vendas no balcão e gerem comandas
//! para liquidação e emissão de NFC-e ultra-rápida na frente de caixa (PDV).

use chrono::Utc;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use tracing::info;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ItemComandaInput {
    pub produto_id: String,
    pub variante_id: Option<String>,
    pub quantidade: f64,
    pub preco_unitario: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComandaItemDet {
    pub id: String,
    pub produto_id: String,
    pub variante_id: Option<String>,
    pub quantidade: f64,
    pub preco_unitario: f64,
    pub codigo_sku: Option<String>,
    pub descricao_produto: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComandaCompleta {
    pub id: String,
    pub filial_id: String,
    pub numero_comanda: String,
    pub cliente_nome: String,
    pub vendedor_id: Option<String>,
    pub valor_total: f64,
    pub status: String,
    pub itens: Vec<ComandaItemDet>,
}

/// Cria uma ordem de pré-venda / comanda no balcão
pub fn criar_pre_venda_comanda(
    conn: &mut Connection,
    device_id: &str,
    filial_id: &str,
    cliente_nome: &str,
    vendedor_id: Option<&str>,
    itens: Vec<ItemComandaInput>,
) -> Result<ComandaCompleta, String> {
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();
    let comanda_id = Uuid::new_v4().to_string();

    let seq: i64 = tx
        .query_row("SELECT COALESCE(MAX(rowid), 0) + 1 FROM comandas", [], |r| r.get(0))
        .unwrap_or(1);
    let numero_comanda = format!("CMD-{:04}", seq);

    let mut valor_total = 0.0;
    for item in &itens {
        valor_total += item.quantidade * item.preco_unitario;
    }

    // 1. Insere a cabeçalho da Comanda primeiro (parent FK)
    tx.execute(
        "INSERT INTO comandas (
            id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
            filial_id, numero_comanda, cliente_nome, vendedor_id, valor_total, status
        ) VALUES (?1, ?2, ?3, ?3, 'pending', 1, 0, ?4, ?5, ?6, ?7, ?8, 'ABERTA')",
        params![
            comanda_id,
            device_id,
            now,
            filial_id,
            numero_comanda,
            cliente_nome,
            vendedor_id,
            valor_total
        ],
    )
    .map_err(|e| format!("Erro ao salvar comanda: {}", e))?;

    // 2. Insere os itens da comanda
    let mut itens_det = Vec::new();
    for item in &itens {
        let item_id = Uuid::new_v4().to_string();

        tx.execute(
            "INSERT INTO comandas_itens (
                id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
                comanda_id, produto_id, variante_id, quantidade, preco_unitario
            ) VALUES (?1, ?2, ?3, ?3, 'pending', 1, 0, ?4, ?5, ?6, ?7, ?8)",
            params![
                item_id,
                device_id,
                now,
                comanda_id,
                item.produto_id,
                item.variante_id,
                item.quantidade,
                item.preco_unitario
            ],
        )
        .map_err(|e| format!("Erro ao inserir item da comanda: {}", e))?;

        // Busca dados de descrição para retorno
        let (sku, desc): (String, String) = tx
            .query_row(
                "SELECT codigo_sku, descricao FROM produtos WHERE id = ?1",
                params![item.produto_id],
                |r| Ok((r.get(0)?, r.get(1)?)),
            )
            .unwrap_or_else(|_| ("SKU".to_string(), "PRODUTO".to_string()));

        itens_det.push(ComandaItemDet {
            id: item_id,
            produto_id: item.produto_id.clone(),
            variante_id: item.variante_id.clone(),
            quantidade: item.quantidade,
            preco_unitario: item.preco_unitario,
            codigo_sku: Some(sku),
            descricao_produto: Some(desc),
        });
    }

    tx.commit().map_err(|e| e.to_string())?;

    info!(
        "Comanda {} criada no balcão com sucesso. Total: R$ {:.2}",
        numero_comanda, valor_total
    );

    Ok(ComandaCompleta {
        id: comanda_id,
        filial_id: filial_id.to_string(),
        numero_comanda,
        cliente_nome: cliente_nome.to_string(),
        vendedor_id: vendedor_id.map(|s| s.to_string()),
        valor_total,
        status: "ABERTA".to_string(),
        itens: itens_det,
    })
}

/// Busca uma comanda pelo número para carregar no caixa PDV
pub fn puxar_comanda_para_pdv(
    conn: &Connection,
    numero_comanda: &str,
) -> Result<ComandaCompleta, String> {
    let clean_num = numero_comanda.trim().to_uppercase();

    let (id, filial_id, num, cliente, vendedor, total, status): (
        String,
        String,
        String,
        String,
        Option<String>,
        f64,
        String,
    ) = conn
        .query_row(
            "SELECT id, filial_id, numero_comanda, cliente_nome, vendedor_id, valor_total, status FROM comandas WHERE numero_comanda = ?1 AND is_deleted = 0",
            params![clean_num],
            |r| {
                Ok((
                    r.get(0)?,
                    r.get(1)?,
                    r.get(2)?,
                    r.get(3)?,
                    r.get(4)?,
                    r.get(5)?,
                    r.get(6)?,
                ))
            },
        )
        .map_err(|_| format!("Comanda '{}' não encontrada", clean_num))?;

    let mut stmt = conn
        .prepare(
            "SELECT ci.id, ci.produto_id, ci.variante_id, ci.quantidade, ci.preco_unitario, p.codigo_sku, p.descricao
             FROM comandas_itens ci
             JOIN produtos p ON p.id = ci.produto_id
             WHERE ci.comanda_id = ?1 AND ci.is_deleted = 0",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([&id], |r| {
            Ok(ComandaItemDet {
                id: r.get(0)?,
                produto_id: r.get(1)?,
                variante_id: r.get(2)?,
                quantidade: r.get(3)?,
                preco_unitario: r.get(4)?,
                codigo_sku: r.get(5)?,
                descricao_produto: r.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut itens = Vec::new();
    for r in rows {
        itens.push(r.map_err(|e| e.to_string())?);
    }

    Ok(ComandaCompleta {
        id,
        filial_id,
        numero_comanda: num,
        cliente_nome: cliente,
        vendedor_id: vendedor,
        valor_total: total,
        status,
        itens,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::schema::create_tables;

    #[test]
    fn test_fluxo_pre_venda_comanda() {
        let mut conn = Connection::open_in_memory().unwrap();
        create_tables(&conn).unwrap();

        conn.execute(
            "INSERT INTO empresas (id, device_id, created_at, updated_at, razao_social, cnpj) VALUES ('emp1', 'dev1', 'now', 'now', 'Empresa SP', '12345678000195')",
            [],
        ).unwrap();

        conn.execute(
            "INSERT INTO filiais (id, device_id, created_at, updated_at, empresa_id, codigo, nome, cnpj, uf) VALUES ('fil1', 'dev1', 'now', 'now', 'emp1', '001', 'Filial SP', '12345678000195', 'SP')",
            [],
        ).unwrap();

        conn.execute(
            "INSERT INTO produtos (id, device_id, created_at, updated_at, empresa_id, codigo_sku, descricao, preco_custo, preco_venda) VALUES ('p1', 'dev1', 'now', 'now', 'emp1', 'SKU-01', 'Sapato Couro', 50.0, 120.0)",
            [],
        ).unwrap();

        let item = ItemComandaInput {
            produto_id: "p1".to_string(),
            variante_id: None,
            quantidade: 2.0,
            preco_unitario: 120.0,
        };

        let cmd = criar_pre_venda_comanda(&mut conn, "dev1", "fil1", "JOAO DA SILVA", None, vec![item]).unwrap();
        assert_eq!(cmd.valor_total, 240.0);
        assert_eq!(cmd.status, "ABERTA");

        let fetched = puxar_comanda_para_pdv(&conn, &cmd.numero_comanda).unwrap();
        assert_eq!(fetched.itens.len(), 1);
        assert_eq!(fetched.valor_total, 240.0);
    }
}
