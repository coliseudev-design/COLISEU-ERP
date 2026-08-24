//! Comandos IPC do Módulo de Motor de Promoções & Desconto por Atacado no PDV

use crate::db::DbState;
use crate::domain::promotions::{
    calcular_promocoes_carrinho as domain_calcular_carrinho,
    listar_promocoes_ativas as domain_listar_promocoes,
    salvar_promocao as domain_salvar_promocao,
    ItemCarrinhoInput, Promocao, ResultadoCarrinhoPromocional,
};
use tauri::State;

#[tauri::command]
pub async fn salvar_promocao(
    state: State<'_, DbState>,
    empresa_id: String,
    nome: String,
    tipo_promocao: String,
    produto_id: Option<String>,
    quantidade_minima: f64,
    preco_promocional: Option<f64>,
    percentual_desconto: Option<f64>,
    quantidade_pague: Option<f64>,
) -> Result<String, String> {
    let conn = state.conn.lock().unwrap();
    domain_salvar_promocao(
        &conn,
        &state.device_id,
        &empresa_id,
        &nome,
        &tipo_promocao,
        produto_id.as_deref(),
        quantidade_minima,
        preco_promocional,
        percentual_desconto,
        quantidade_pague,
    )
}

#[tauri::command]
pub async fn listar_promocoes_ativas(
    state: State<'_, DbState>,
    empresa_id: String,
) -> Result<Vec<Promocao>, String> {
    let conn = state.conn.lock().unwrap();
    domain_listar_promocoes(&conn, &empresa_id)
}

#[tauri::command]
pub async fn calcular_promocoes_carrinho(
    state: State<'_, DbState>,
    empresa_id: String,
    itens_carrinho: Vec<ItemCarrinhoInput>,
) -> Result<ResultadoCarrinhoPromocional, String> {
    let conn = state.conn.lock().unwrap();
    domain_calcular_carrinho(&conn, &empresa_id, itens_carrinho)
}
