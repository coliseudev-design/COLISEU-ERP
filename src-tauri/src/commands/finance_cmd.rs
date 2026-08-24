use crate::db::DbState;
use crate::domain::dre::{gerar_dre_gerencial as domain_gerar_dre, DreGerencialReport};
use crate::domain::finance::{
    create_caixa_movimentacao as domain_create_caixa, create_lancamento, get_resumo_caixa as domain_get_resumo_caixa,
    list_caixa_movimentacoes as domain_list_caixa, list_lancamentos, quitar_lancamento as domain_quitar_lancamento,
    CaixaMovimentacao, CreateLancamentoInput, FinanceiroLancamento, RegistrarCaixaInput, ResumoCaixa,
};
use crate::domain::ofx::{importar_e_conciliar_ofx as domain_importar_ofx, ResultadoConciliacaoOfx};
use tauri::State;

#[tauri::command]
pub async fn list_financeiro_lancamentos(
    state: State<'_, DbState>,
    filial_id: String,
    tipo: Option<String>,
    status: Option<String>,
) -> Result<Vec<FinanceiroLancamento>, String> {
    let db_state = state.inner().clone();
    tokio::task::spawn_blocking(move || {
        let conn = db_state.conn.lock().map_err(|e| e.to_string())?;
        list_lancamentos(&conn, &filial_id, tipo, status)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn create_financeiro_lancamento(
    state: State<'_, DbState>,
    payload: CreateLancamentoInput,
) -> Result<FinanceiroLancamento, String> {
    let db_state = state.inner().clone();
    tokio::task::spawn_blocking(move || {
        let conn = db_state.conn.lock().map_err(|e| e.to_string())?;
        create_lancamento(&conn, &db_state.device_id, payload)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn quitar_financeiro_lancamento(
    state: State<'_, DbState>,
    lancamento_id: String,
    valor_pago: f64,
    data_pagamento: Option<String>,
) -> Result<FinanceiroLancamento, String> {
    let db_state = state.inner().clone();
    tokio::task::spawn_blocking(move || {
        let mut conn = db_state.conn.lock().map_err(|e| e.to_string())?;
        domain_quitar_lancamento(&mut conn, &db_state.device_id, &lancamento_id, valor_pago, data_pagamento)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn list_caixa_movimentacoes(
    state: State<'_, DbState>,
    filial_id: String,
) -> Result<Vec<CaixaMovimentacao>, String> {
    let db_state = state.inner().clone();
    tokio::task::spawn_blocking(move || {
        let conn = db_state.conn.lock().map_err(|e| e.to_string())?;
        domain_list_caixa(&conn, &filial_id)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn get_resumo_caixa(
    state: State<'_, DbState>,
    filial_id: String,
) -> Result<ResumoCaixa, String> {
    let db_state = state.inner().clone();
    tokio::task::spawn_blocking(move || {
        let conn = db_state.conn.lock().map_err(|e| e.to_string())?;
        domain_get_resumo_caixa(&conn, &filial_id)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn registrar_movimentacao_caixa(
    state: State<'_, DbState>,
    payload: RegistrarCaixaInput,
) -> Result<CaixaMovimentacao, String> {
    let db_state = state.inner().clone();
    tokio::task::spawn_blocking(move || {
        let conn = db_state.conn.lock().map_err(|e| e.to_string())?;
        domain_create_caixa(&conn, &db_state.device_id, payload)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn gerar_dre_gerencial(
    state: State<'_, DbState>,
    filial_id: String,
    data_inicio: String,
    data_fim: String,
) -> Result<DreGerencialReport, String> {
    let conn = state.conn.lock().unwrap();
    domain_gerar_dre(&conn, &filial_id, &data_inicio, &data_fim)
}

#[tauri::command]
pub async fn importar_extrato_ofx(
    state: State<'_, DbState>,
    filial_id: String,
    ofx_content: String,
) -> Result<ResultadoConciliacaoOfx, String> {
    let mut conn = state.conn.lock().unwrap();
    domain_importar_ofx(&mut conn, &state.device_id, &filial_id, &ofx_content)
}
