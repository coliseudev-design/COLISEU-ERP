//! Comandos IPC do Módulo de Venda Condicional ("Malinha"), Vale-Troca e Ficha Financeira do Cliente

use crate::db::DbState;
use crate::domain::condicional::{
    consultar_ficha_financeira as domain_consultar_ficha,
    criar_venda_condicional as domain_criar_condicional,
    devolver_item_por_codigo as domain_devolver_item,
    faturar_condicional as domain_faturar_condicional,
    gerar_vale_troca as domain_gerar_vale,
    listar_condicionais_pendentes as domain_listar_condicionais,
    CondicionalCompleta, ItemCondicionalInput, MovimentoFichaFinanceira, ValeTrocaOutput,
};
use tauri::State;

#[tauri::command]
pub async fn criar_venda_condicional(
    state: State<'_, DbState>,
    filial_id: String,
    cliente_id: String,
    vendedor_id: Option<String>,
    dias_prazo: Option<i64>,
    itens: Vec<ItemCondicionalInput>,
) -> Result<CondicionalCompleta, String> {
    let mut conn = state.conn.lock().unwrap();
    domain_criar_condicional(
        &mut conn,
        &state.device_id,
        &filial_id,
        &cliente_id,
        vendedor_id.as_deref(),
        dias_prazo,
        itens,
    )
}

#[tauri::command]
pub async fn listar_condicionais_pendentes(
    state: State<'_, DbState>,
    filial_id: String,
) -> Result<Vec<CondicionalCompleta>, String> {
    let conn = state.conn.lock().unwrap();
    domain_listar_condicionais(&conn, &filial_id)
}

#[tauri::command]
pub async fn devolver_item_por_codigo(
    state: State<'_, DbState>,
    condicional_id: String,
    codigo: String,
) -> Result<String, String> {
    let mut conn = state.conn.lock().unwrap();
    domain_devolver_item(&mut conn, &condicional_id, &codigo)
}

#[tauri::command]
pub async fn faturar_condicional(
    state: State<'_, DbState>,
    condicional_id: String,
) -> Result<f64, String> {
    let mut conn = state.conn.lock().unwrap();
    domain_faturar_condicional(&mut conn, &condicional_id)
}

#[tauri::command]
pub async fn gerar_vale_troca(
    state: State<'_, DbState>,
    cliente_id: String,
    valor_original: f64,
    percentual_bonus: f64,
    dias_validade: i64,
) -> Result<ValeTrocaOutput, String> {
    let mut conn = state.conn.lock().unwrap();
    domain_gerar_vale(
        &mut conn,
        &state.device_id,
        &cliente_id,
        valor_original,
        percentual_bonus,
        dias_validade,
    )
}

#[tauri::command]
pub async fn consultar_ficha_financeira(
    state: State<'_, DbState>,
    cliente_id: String,
) -> Result<Vec<MovimentoFichaFinanceira>, String> {
    let conn = state.conn.lock().unwrap();
    domain_consultar_ficha(&conn, &cliente_id)
}
