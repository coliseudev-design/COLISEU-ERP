use crate::db::DbState;
use crate::domain::sales::{
    cancel_sale, get_venda_details as domain_get_venda_details, list_vendas_filial, process_sale,
    CreateSaleInput, SaleDetails, SaleHeader,
};
use tauri::State;

#[tauri::command]
pub async fn create_venda(
    state: State<'_, DbState>,
    payload: CreateSaleInput,
) -> Result<SaleHeader, String> {
    let db_state = state.inner().clone();

    tokio::task::spawn_blocking(move || {
        let mut conn = db_state.conn.lock().map_err(|e| e.to_string())?;
        process_sale(&mut conn, &db_state.device_id, payload)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn cancelar_venda(
    state: State<'_, DbState>,
    venda_id: String,
    motivo: String,
) -> Result<SaleHeader, String> {
    let db_state = state.inner().clone();

    tokio::task::spawn_blocking(move || {
        let mut conn = db_state.conn.lock().map_err(|e| e.to_string())?;
        cancel_sale(&mut conn, &db_state.device_id, &venda_id, &motivo)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn get_venda_details(
    state: State<'_, DbState>,
    venda_id: String,
) -> Result<SaleDetails, String> {
    let db_state = state.inner().clone();

    tokio::task::spawn_blocking(move || {
        let conn = db_state.conn.lock().map_err(|e| e.to_string())?;
        domain_get_venda_details(&conn, &venda_id)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn list_vendas(
    state: State<'_, DbState>,
    filial_id: String,
) -> Result<Vec<SaleHeader>, String> {
    let db_state = state.inner().clone();

    tokio::task::spawn_blocking(move || {
        let conn = db_state.conn.lock().map_err(|e| e.to_string())?;
        list_vendas_filial(&conn, &filial_id)
    })
    .await
    .map_err(|e| e.to_string())?
}
