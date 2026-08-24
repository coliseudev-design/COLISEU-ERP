use crate::db::DbState;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct Produto {
    pub id: String,
    pub device_id: String,
    pub created_at: String,
    pub updated_at: String,
    pub x_sync_status: String,
    pub x_version: i64,
    pub is_deleted: i64,
    pub empresa_id: String,
    pub codigo_sku: String,
    pub codigo_barras: Option<String>,
    pub descricao: String,
    pub unidade_medida: String,
    pub preco_custo: f64,
    pub preco_venda: f64,
    pub ncm: Option<String>,
    pub cest: Option<String>,
    pub ativo: bool,
}

#[derive(Debug, Deserialize)]
pub struct CreateProdutoPayload {
    pub empresa_id: String,
    pub codigo_sku: String,
    pub codigo_barras: Option<String>,
    pub descricao: String,
    pub unidade_medida: String,
    pub preco_custo: f64,
    pub preco_venda: f64,
    pub ncm: Option<String>,
    pub cest: Option<String>,
}

#[tauri::command]
pub async fn create_produto(
    state: State<'_, DbState>,
    payload: CreateProdutoPayload,
) -> Result<Produto, String> {
    let db_state = state.inner().clone();

    tokio::task::spawn_blocking(move || {
        let conn = db_state.conn.lock().map_err(|e| e.to_string())?;

        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();
        let sync_status = "pending".to_string();
        let version = 1i64;
        let is_deleted = 0i64;

        conn.execute(
            "INSERT INTO produtos (
                id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
                empresa_id, codigo_sku, codigo_barras, descricao, unidade_medida,
                preco_custo, preco_venda, ncm, cest, ativo
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, 1);",
            rusqlite::params![
                id,
                db_state.device_id,
                now,
                now,
                sync_status,
                version,
                is_deleted,
                payload.empresa_id,
                payload.codigo_sku,
                payload.codigo_barras,
                payload.descricao,
                payload.unidade_medida,
                payload.preco_custo,
                payload.preco_venda,
                payload.ncm,
                payload.cest
            ],
        )
        .map_err(|e| format!("Erro ao inserir produto: {}", e))?;

        Ok(Produto {
            id,
            device_id: db_state.device_id,
            created_at: now.clone(),
            updated_at: now,
            x_sync_status: sync_status,
            x_version: version,
            is_deleted,
            empresa_id: payload.empresa_id,
            codigo_sku: payload.codigo_sku,
            codigo_barras: payload.codigo_barras,
            descricao: payload.descricao,
            unidade_medida: payload.unidade_medida,
            preco_custo: payload.preco_custo,
            preco_venda: payload.preco_venda,
            ncm: payload.ncm,
            cest: payload.cest,
            ativo: true,
        })
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn list_produtos(
    state: State<'_, DbState>,
    empresa_id: String,
) -> Result<Vec<Produto>, String> {
    let db_state = state.inner().clone();

    tokio::task::spawn_blocking(move || {
        let conn = db_state.conn.lock().map_err(|e| e.to_string())?;

        let mut stmt = conn
            .prepare(
                "SELECT id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
                        empresa_id, codigo_sku, codigo_barras, descricao, unidade_medida,
                        preco_custo, preco_venda, ncm, cest, ativo
                 FROM produtos
                 WHERE empresa_id = ?1 AND is_deleted = 0
                 ORDER BY descricao ASC;",
            )
            .map_err(|e| e.to_string())?;

        let rows = stmt
            .query_map([empresa_id], |row| {
                let ativo_int: i64 = row.get(16)?;
                Ok(Produto {
                    id: row.get(0)?,
                    device_id: row.get(1)?,
                    created_at: row.get(2)?,
                    updated_at: row.get(3)?,
                    x_sync_status: row.get(4)?,
                    x_version: row.get(5)?,
                    is_deleted: row.get(6)?,
                    empresa_id: row.get(7)?,
                    codigo_sku: row.get(8)?,
                    codigo_barras: row.get(9)?,
                    descricao: row.get(10)?,
                    unidade_medida: row.get(11)?,
                    preco_custo: row.get(12)?,
                    preco_venda: row.get(13)?,
                    ncm: row.get(14)?,
                    cest: row.get(15)?,
                    ativo: ativo_int == 1,
                })
            })
            .map_err(|e| e.to_string())?;

        let mut result = Vec::new();
        for r in rows {
            result.push(r.map_err(|e| e.to_string())?);
        }
        Ok(result)
    })
    .await
    .map_err(|e| e.to_string())?
}
