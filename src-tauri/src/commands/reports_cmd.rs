//! Comandos IPC de Relatórios Gerenciais & Curva ABC (Pareto 80/20)

use crate::db::DbState;
use crate::domain::curva_abc::{calcular_curva_abc_produtos, CurvaAbcReport};
use crate::domain::reports::{gerar_relatorio_giro_estoque as domain_gerar_giro, RelatorioGiroEstoqueReport};
use tauri::State;

#[tauri::command]
pub async fn gerar_curva_abc_produtos(
    state: State<'_, DbState>,
    filial_id: String,
    data_inicio: String,
    data_fim: String,
) -> Result<CurvaAbcReport, String> {
    let conn = state.conn.lock().unwrap();
    calcular_curva_abc_produtos(&conn, &filial_id, &data_inicio, &data_fim)
}

#[tauri::command]
pub async fn gerar_relatorio_giro_estoque(
    state: State<'_, DbState>,
    filial_id: String,
    dias_periodo: u32,
) -> Result<RelatorioGiroEstoqueReport, String> {
    let conn = state.conn.lock().unwrap();
    domain_gerar_giro(&conn, &filial_id, dias_periodo)
}

#[tauri::command]
pub async fn calcular_cockpit_executivo_cmd(
    filial_id: String,
    periodo: String,
    perfil: String,
    state: State<'_, DbState>,
) -> Result<crate::domain::reports::CockpitExecutivoData, String> {
    let conn = state.conn.lock().unwrap();
    crate::domain::reports::calcular_cockpit_executivo(&conn, &filial_id, &periodo, &perfil)
}

#[tauri::command]
pub async fn gerar_bi_executivo_cmd(
    data_inicio: String,
    data_fim: String,
    filial_id: String,
    state: State<'_, DbState>,
) -> Result<crate::domain::reports::BIExecutivoData, String> {
    let conn = state.conn.lock().unwrap();
    crate::domain::reports::gerar_bi_executivo_completo(&conn, &data_inicio, &data_fim, &filial_id)
}


