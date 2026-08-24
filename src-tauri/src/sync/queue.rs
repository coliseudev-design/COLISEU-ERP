use chrono::Utc;
use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};
use tracing::{info, warn};
use uuid::Uuid;

/// Item individual da Fila de Write-Back Local (ps_crud)
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct QueueItem {
    pub id: String,
    pub table_name: String,
    pub record_id: String,
    pub op_type: String, // 'INSERT', 'UPDATE', 'DELETE'
    pub payload: String,
    pub status: String, // 'pending_upload', 'synced', 'error'
    pub retry_count: i32,
    pub created_at: String,
    pub updated_at: String,
    pub error_message: Option<String>,
}

/// Estatísticas Consolidadas da Fila de Sincronização
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct QueueStats {
    pub total_pending: i64,
    pub total_synced: i64,
    pub total_error: i64,
}

/// Resultado do Processamento em Lote da Fila
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ProcessBatchResult {
    pub processed_count: usize,
    pub success_count: usize,
    pub failed_count: usize,
}

/// Inicializa a tabela ps_crud no banco de dados SQLite local
pub fn init_queue_table(conn: &Connection) -> Result<()> {
    info!("Inicializando tabela ps_crud para fila de write-back offline...");
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS ps_crud (
            id TEXT PRIMARY KEY NOT NULL,
            table_name TEXT NOT NULL,
            record_id TEXT NOT NULL,
            op_type TEXT NOT NULL,
            payload TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending_upload',
            retry_count INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            error_message TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_ps_crud_status ON ps_crud(status, created_at);
        ",
    )?;
    Ok(())
}

/// Enfileira uma operação de mutação para envio posterior ao servidor
pub fn enqueue_operation(
    conn: &Connection,
    table_name: &str,
    record_id: &str,
    op_type: &str,
    payload: &str,
) -> Result<String> {
    init_queue_table(conn)?;
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO ps_crud (id, table_name, record_id, op_type, payload, status, retry_count, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, 'pending_upload', 0, ?6, ?6)",
        params![id, table_name, record_id, op_type, payload, now],
    )?;

    // Atualiza x_sync_status na tabela de origem para 'pending_upload' se aplicável
    let update_sql = format!(
        "UPDATE {} SET x_sync_status = 'pending_upload', updated_at = ?1 WHERE id = ?2",
        table_name
    );
    let _ = conn.execute(&update_sql, params![now, record_id]);

    info!(
        "Operação enfileirada com sucesso em ps_crud [ID: {}, Tabela: {}, Op: {}]",
        id, table_name, op_type
    );
    Ok(id)
}

/// Busca operações pendentes de upload
pub fn get_pending_operations(conn: &Connection, limit: usize) -> Result<Vec<QueueItem>> {
    init_queue_table(conn)?;
    let mut stmt = conn.prepare(
        "SELECT id, table_name, record_id, op_type, payload, status, retry_count, created_at, updated_at, error_message
         FROM ps_crud
         WHERE status = 'pending_upload'
         ORDER BY created_at ASC
         LIMIT ?1",
    )?;

    let rows = stmt.query_map(params![limit as i64], |row| {
        Ok(QueueItem {
            id: row.get(0)?,
            table_name: row.get(1)?,
            record_id: row.get(2)?,
            op_type: row.get(3)?,
            payload: row.get(4)?,
            status: row.get(5)?,
            retry_count: row.get(6)?,
            created_at: row.get(7)?,
            updated_at: row.get(8)?,
            error_message: row.get(9)?,
        })
    })?;

    let mut items = Vec::new();
    for item in rows {
        items.push(item?);
    }
    Ok(items)
}

/// Processa em lote as operações pendentes e transita x_sync_status para 'synced'
pub fn process_batch_queue(conn: &Connection) -> Result<ProcessBatchResult> {
    init_queue_table(conn)?;
    let pending_items = get_pending_operations(conn, 100)?;
    let mut success_count = 0;
    let mut failed_count = 0;
    let now = Utc::now().to_rfc3339();

    for item in &pending_items {
        // Inicia transação por item para garantir atomicidade
        let tx = conn.unchecked_transaction()?;

        // 1. Marca ps_crud como 'synced'
        tx.execute(
            "UPDATE ps_crud SET status = 'synced', updated_at = ?1 WHERE id = ?2",
            params![now, item.id],
        )?;

        // 2. Atualiza x_sync_status na tabela alvo do registro para 'synced'
        let target_sql = format!(
            "UPDATE {} SET x_sync_status = 'synced', updated_at = ?1 WHERE id = ?2",
            item.table_name
        );
        match tx.execute(&target_sql, params![now, item.record_id]) {
            Ok(_) => {
                if let Err(e) = tx.commit() {
                    warn!("Falha ao efetivar commit da transição de sync: {}", e);
                    failed_count += 1;
                } else {
                    success_count += 1;
                }
            }
            Err(e) => {
                warn!("Erro ao atualizar x_sync_status na tabela {}: {}", item.table_name, e);
                let _ = tx.rollback();
                // Marca ps_crud com status de erro
                let _ = conn.execute(
                    "UPDATE ps_crud SET status = 'error', error_message = ?1, updated_at = ?2 WHERE id = ?3",
                    params![e.to_string(), now, item.id],
                );
                failed_count += 1;
            }
        }
    }

    info!(
        "Lote de sincronização concluído. Processados: {}, Sucessos: {}, Falhas: {}",
        pending_items.len(),
        success_count,
        failed_count
    );

    Ok(ProcessBatchResult {
        processed_count: pending_items.len(),
        success_count,
        failed_count,
    })
}

/// Retorna estatísticas consolidadas da fila ps_crud
pub fn get_queue_stats(conn: &Connection) -> Result<QueueStats> {
    init_queue_table(conn)?;
    let total_pending: i64 = conn.query_row(
        "SELECT COUNT(*) FROM ps_crud WHERE status = 'pending_upload'",
        [],
        |r| r.get(0),
    )?;

    let total_synced: i64 = conn.query_row(
        "SELECT COUNT(*) FROM ps_crud WHERE status = 'synced'",
        [],
        |r| r.get(0),
    )?;

    let total_error: i64 = conn.query_row(
        "SELECT COUNT(*) FROM ps_crud WHERE status = 'error'",
        [],
        |r| r.get(0),
    )?;

    Ok(QueueStats {
        total_pending,
        total_synced,
        total_error,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn setup_test_db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        crate::db::schema::create_tables(&conn).unwrap();
        init_queue_table(&conn).unwrap();
        conn.execute(
            "INSERT INTO empresas (id, device_id, created_at, updated_at, razao_social, cnpj) VALUES ('emp-1', 'dev-1', 'now', 'now', 'Empresa Teste', '12345678000195')",
            [],
        ).unwrap();
        conn
    }

    #[test]
    fn test_enqueue_and_process_queue() {
        let conn = setup_test_db();

        // Insere produto de teste
        conn.execute(
            "INSERT INTO produtos (id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted, empresa_id, codigo_sku, descricao, unidade_medida, preco_custo, preco_venda, ativo)
             VALUES ('prod-q1', 'dev-1', '2026-08-13T10:00:00Z', '2026-08-13T10:00:00Z', 'pending', 1, 0, 'emp-1', 'SKU1', 'Produto Teste Queue', 'UN', 10.0, 20.0, 1)",
            [],
        ).unwrap();

        // Enfileira alteração
        let qid = enqueue_operation(
            &conn,
            "produtos",
            "prod-q1",
            "INSERT",
            r#"{"descricao":"Produto Teste Queue"}"#,
        )
        .unwrap();

        assert!(!qid.is_empty());

        // Verifica estatísticas antes do processamento
        let stats_before = get_queue_stats(&conn).unwrap();
        assert_eq!(stats_before.total_pending, 1);
        assert_eq!(stats_before.total_synced, 0);

        // Processa a fila
        let batch_res = process_batch_queue(&conn).unwrap();
        assert_eq!(batch_res.processed_count, 1);
        assert_eq!(batch_res.success_count, 1);
        assert_eq!(batch_res.failed_count, 0);

        // Verifica transição do x_sync_status no produto
        let status: String = conn
            .query_row(
                "SELECT x_sync_status FROM produtos WHERE id = 'prod-q1'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(status, "synced");

        // Verifica estatísticas após processamento
        let stats_after = get_queue_stats(&conn).unwrap();
        assert_eq!(stats_after.total_pending, 0);
        assert_eq!(stats_after.total_synced, 1);
    }
}
