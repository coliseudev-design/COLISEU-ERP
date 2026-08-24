use crate::db::connection::DbState;
use crate::sync::conflict::{ConflictResolver, StockBalanceRecord, StockDelta};
use crate::sync::queue::{
    enqueue_operation, get_queue_stats, process_batch_queue, ProcessBatchResult, QueueStats,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use tauri::State;
use tracing::{error, info};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncStatusResponse {
    pub is_online: bool,
    pub status_text: String,
    pub queue_stats: QueueStats,
    pub last_synced_at: String,
}

/// Obtém o status consolidado de sincronização do dispositivo local
#[tauri::command]
pub fn get_sync_status(state: State<'_, DbState>) -> Result<SyncStatusResponse, String> {
    let conn = state
        .conn
        .lock()
        .map_err(|e| format!("Erro ao obter conexão do banco: {}", e))?;

    let queue_stats =
        get_queue_stats(&conn).map_err(|e| format!("Erro ao ler estatísticas de sync: {}", e))?;

    let is_online = true; // Em modo local-first híbrido com fallback
    let status_text = if queue_stats.total_pending > 0 {
        format!("Pendentes de envio: {} alterações", queue_stats.total_pending)
    } else {
        "Sincronizado e Atualizado".to_string()
    };

    Ok(SyncStatusResponse {
        is_online,
        status_text,
        queue_stats,
        last_synced_at: Utc::now().to_rfc3339(),
    })
}

/// Executa o processamento manual ou periódico da fila de write-back offline
#[tauri::command]
pub fn process_sync_queue(state: State<'_, DbState>) -> Result<ProcessBatchResult, String> {
    let conn = state
        .conn
        .lock()
        .map_err(|e| format!("Erro ao obter conexão do banco: {}", e))?;

    info!("Iniciando envio em lote da fila de write-back local...");
    let result = process_batch_queue(&conn)
        .map_err(|e| format!("Erro no processamento da fila de sync: {}", e))?;

    Ok(result)
}

/// Retorna estatísticas de quantificação da fila (pendentes, sincronizados, erro)
#[tauri::command]
pub fn get_sync_queue_stats(state: State<'_, DbState>) -> Result<QueueStats, String> {
    let conn = state
        .conn
        .lock()
        .map_err(|e| format!("Erro ao obter conexão do banco: {}", e))?;

    let stats =
        get_queue_stats(&conn).map_err(|e| format!("Erro ao obter estatísticas da fila: {}", e))?;

    Ok(stats)
}

/// Enfileira uma mutação offline manualmente via IPC
#[tauri::command]
pub fn enqueue_sync_operation(
    state: State<'_, DbState>,
    table_name: String,
    record_id: String,
    op_type: String,
    payload: String,
) -> Result<String, String> {
    let conn = state
        .conn
        .lock()
        .map_err(|e| format!("Erro ao obter conexão do banco: {}", e))?;

    let queue_id = enqueue_operation(&conn, &table_name, &record_id, &op_type, &payload)
        .map_err(|e| format!("Erro ao enfileirar operação de sync: {}", e))?;

    Ok(queue_id)
}

/// Executa a fusão Delta CRDT PN-Counter no estoque de forma atômica
#[tauri::command]
pub fn resolve_stock_crdt_delta(
    state: State<'_, DbState>,
    deposito_id: String,
    produto_id: String,
    delta_quantidade: f64,
    delta_reservada: f64,
) -> Result<StockBalanceRecord, String> {
    let conn = state
        .conn
        .lock()
        .map_err(|e| format!("Erro ao obter conexão do banco: {}", e))?;

    let now = Utc::now().to_rfc3339();

    // Busca saldo atual ou cria se não existir
    let current_row: Result<(f64, f64), rusqlite::Error> = conn.query_row(
        "SELECT quantidade_atual, quantidade_reservada FROM estoque_saldos WHERE deposito_id = ?1 AND produto_id = ?2",
        rusqlite::params![deposito_id, produto_id],
        |r| Ok((r.get(0)?, r.get(1)?)),
    );

    let (current_atual, current_reservada) = match current_row {
        Ok(vals) => vals,
        Err(_) => {
            // Cria saldo inicial zerado
            let stock_id = uuid::Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO estoque_saldos (id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted, deposito_id, produto_id, quantidade_atual, quantidade_reservada)
                 VALUES (?1, ?2, ?3, ?3, 'pending', 1, 0, ?4, ?5, 0.0, 0.0)",
                rusqlite::params![stock_id, state.device_id, now, deposito_id, produto_id],
            ).map_err(|e| format!("Erro ao criar saldo inicial de estoque: {}", e))?;
            (0.0, 0.0)
        }
    };

    let current_record = StockBalanceRecord {
        deposito_id: deposito_id.clone(),
        produto_id: produto_id.clone(),
        quantidade_atual: current_atual,
        quantidade_reservada: current_reservada,
        updated_at: now.clone(),
    };

    let delta = StockDelta {
        deposito_id: deposito_id.clone(),
        produto_id: produto_id.clone(),
        delta_quantidade,
        delta_reservada,
    };

    let merged = ConflictResolver::resolve_stock_delta(&current_record, &delta);

    // Atualiza saldo com valor delta relativo sem sobrescrever cegamente
    conn.execute(
        "UPDATE estoque_saldos
         SET quantidade_atual = ?1, quantidade_reservada = ?2, updated_at = ?3, x_sync_status = 'pending_upload', x_version = x_version + 1
         WHERE deposito_id = ?4 AND produto_id = ?5",
        rusqlite::params![
            merged.quantidade_atual,
            merged.quantidade_reservada,
            merged.updated_at,
            deposito_id,
            produto_id
        ],
    ).map_err(|e| format!("Erro ao atualizar saldo via CRDT: {}", e))?;

    info!(
        "CRDT Delta aplicado com sucesso [Depósito: {}, Produto: {}, Novo Saldo: {}]",
        deposito_id, produto_id, merged.quantidade_atual
    );

    Ok(merged)
}
