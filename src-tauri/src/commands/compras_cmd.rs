//! Comandos IPC do Módulo de Compras, Custo Médio Ponderado (CMP) e Transferências
//!
//! Exposição de rotas IPC para processamento de entrada de compras, recálculo de CMP
//! e transferência atômica de saldo entre depósitos da empresa/filiais.

use crate::db::DbState;
use crate::domain::compras::{
    self, EntradaCompraInput, ResultadoEntradaCompra,
};
use crate::domain::inventory::{
    self, TransferenciaEstoqueInput,
};
use tauri::State;
use tracing::info;

#[tauri::command]
pub async fn processar_entrada_compra(
    state: State<'_, DbState>,
    input: EntradaCompraInput,
) -> Result<ResultadoEntradaCompra, String> {
    let mut conn = state.conn.lock().unwrap();
    let res = compras::processar_entrada_compra(&mut conn, &state.device_id, &input)?;
    info!("Entrada de compra processada com sucesso: ID {}", res.pedido_id);
    Ok(res)
}

#[tauri::command]
pub async fn executar_transferencia_estoque(
    state: State<'_, DbState>,
    input: TransferenciaEstoqueInput,
) -> Result<String, String> {
    let mut conn = state.conn.lock().unwrap();
    let transf_id = inventory::transferir_estoque_entre_depositos(&mut conn, &state.device_id, &input)?;
    info!("Transferência de estoque concluída com sucesso: ID {}", transf_id);
    Ok(transf_id)
}
