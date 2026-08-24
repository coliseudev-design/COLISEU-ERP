use crate::db::DbState;
use crate::domain::inventory::{
    adjust_stock, create_deposito as domain_create_deposito, list_depositos as domain_list_depositos,
    list_movimentacoes, list_saldos, reserve_stock as domain_reserve_stock, AjusteEstoqueInput,
    CreateDepositoInput, Deposito, EstoqueMovimentacao, EstoqueSaldo,
};
use tauri::State;

#[tauri::command]
pub async fn list_depositos(
    state: State<'_, DbState>,
    filial_id: String,
) -> Result<Vec<Deposito>, String> {
    let db_state = state.inner().clone();
    tokio::task::spawn_blocking(move || {
        let conn = db_state.conn.lock().map_err(|e| e.to_string())?;
        domain_list_depositos(&conn, &filial_id)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn create_deposito(
    state: State<'_, DbState>,
    payload: CreateDepositoInput,
) -> Result<Deposito, String> {
    let db_state = state.inner().clone();
    tokio::task::spawn_blocking(move || {
        let conn = db_state.conn.lock().map_err(|e| e.to_string())?;
        domain_create_deposito(&conn, &db_state.device_id, payload)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn list_estoque_saldos(
    state: State<'_, DbState>,
    deposito_id: String,
) -> Result<Vec<EstoqueSaldo>, String> {
    let db_state = state.inner().clone();
    tokio::task::spawn_blocking(move || {
        let conn = db_state.conn.lock().map_err(|e| e.to_string())?;
        list_saldos(&conn, &deposito_id)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn list_estoque_movimentacoes(
    state: State<'_, DbState>,
    deposito_id: String,
    produto_id: Option<String>,
) -> Result<Vec<EstoqueMovimentacao>, String> {
    let db_state = state.inner().clone();
    tokio::task::spawn_blocking(move || {
        let conn = db_state.conn.lock().map_err(|e| e.to_string())?;
        list_movimentacoes(&conn, &deposito_id, produto_id)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn ajustar_estoque(
    state: State<'_, DbState>,
    payload: AjusteEstoqueInput,
) -> Result<EstoqueSaldo, String> {
    let db_state = state.inner().clone();
    tokio::task::spawn_blocking(move || {
        let mut conn = db_state.conn.lock().map_err(|e| e.to_string())?;
        adjust_stock(&mut conn, &db_state.device_id, payload)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn reservar_estoque(
    state: State<'_, DbState>,
    deposito_id: String,
    produto_id: String,
    quantidade: f64,
    origem_id: Option<String>,
) -> Result<EstoqueSaldo, String> {
    let db_state = state.inner().clone();
    tokio::task::spawn_blocking(move || {
        let mut conn = db_state.conn.lock().map_err(|e| e.to_string())?;
        domain_reserve_stock(&mut conn, &db_state.device_id, &deposito_id, &produto_id, quantidade, origem_id)
    })
    .await
    .map_err(|e| e.to_string())?
}
