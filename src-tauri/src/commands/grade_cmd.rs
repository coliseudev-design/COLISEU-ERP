//! Comandos IPC do Módulo de Grades e Variantes de Produtos (Tamanho × Cor)

use crate::db::DbState;
use crate::domain::grade::{
    criar_grade as domain_criar_grade,
    gerar_variantes_produto_pai as domain_gerar_variantes,
    listar_grades as domain_listar_grades,
    listar_variantes_produto as domain_listar_variantes,
    ProdutoGrade, ProdutoVariante,
};
use tauri::State;

#[tauri::command]
pub async fn criar_grade(
    state: State<'_, DbState>,
    empresa_id: String,
    nome: String,
    eixo1_nome: String,
    eixo2_nome: Option<String>,
    eixos_tamanho: Vec<String>,
    eixos_cor: Vec<String>,
) -> Result<String, String> {
    let conn = state.conn.lock().unwrap();
    domain_criar_grade(
        &conn,
        &state.device_id,
        &empresa_id,
        &nome,
        &eixo1_nome,
        eixo2_nome.as_deref(),
        eixos_tamanho,
        eixos_cor,
    )
}

#[tauri::command]
pub async fn listar_grades(
    state: State<'_, DbState>,
    empresa_id: String,
) -> Result<Vec<ProdutoGrade>, String> {
    let conn = state.conn.lock().unwrap();
    domain_listar_grades(&conn, &empresa_id)
}

#[tauri::command]
pub async fn gerar_variantes_produto(
    state: State<'_, DbState>,
    produto_pai_id: String,
    grade_id: String,
) -> Result<Vec<ProdutoVariante>, String> {
    let conn = state.conn.lock().unwrap();
    domain_gerar_variantes(&conn, &state.device_id, &produto_pai_id, &grade_id)
}

#[tauri::command]
pub async fn listar_variantes_produto(
    state: State<'_, DbState>,
    produto_pai_id: String,
) -> Result<Vec<ProdutoVariante>, String> {
    let conn = state.conn.lock().unwrap();
    domain_listar_variantes(&conn, &produto_pai_id)
}
