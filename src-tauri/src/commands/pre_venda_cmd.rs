//! Comandos IPC do Módulo de Pré-Venda & Atendimento de Balcão Móvel (Comanda)

use crate::db::DbState;
use crate::domain::pre_venda::{
    criar_pre_venda_comanda as domain_criar_comanda,
    puxar_comanda_para_pdv as domain_puxar_comanda,
    ComandaCompleta, ItemComandaInput,
};
use tauri::State;

#[tauri::command]
pub async fn criar_pre_venda_comanda(
    state: State<'_, DbState>,
    filial_id: String,
    cliente_nome: String,
    vendedor_id: Option<String>,
    itens: Vec<ItemComandaInput>,
) -> Result<ComandaCompleta, String> {
    let mut conn = state.conn.lock().unwrap();
    domain_criar_comanda(
        &mut conn,
        &state.device_id,
        &filial_id,
        &cliente_nome,
        vendedor_id.as_deref(),
        itens,
    )
}

#[tauri::command]
pub async fn puxar_comanda_para_pdv(
    state: State<'_, DbState>,
    numero_comanda: String,
) -> Result<ComandaCompleta, String> {
    let conn = state.conn.lock().unwrap();
    domain_puxar_comanda(&conn, &numero_comanda)
}
