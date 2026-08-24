//! Comandos IPC do Módulo de Pessoas (Ficha Cadastral Unificada Clientes/Fornecedores & Veículos)

use crate::db::DbState;
use crate::domain::pessoas::{
    listar_pessoas as domain_listar_pessoas,
    listar_veiculos_pessoa as domain_listar_veiculos,
    salvar_pessoa as domain_salvar_pessoa,
    salvar_veiculo_pessoa as domain_salvar_veiculo,
    PessoaInput, VeiculoPessoa,
};
use tauri::State;

#[tauri::command]
pub async fn salvar_pessoa(
    state: State<'_, DbState>,
    input: PessoaInput,
) -> Result<String, String> {
    let mut conn = state.conn.lock().unwrap();
    domain_salvar_pessoa(&mut conn, &state.device_id, input)
}

#[tauri::command]
pub async fn listar_pessoas(
    state: State<'_, DbState>,
    empresa_id: String,
    filtro_tipo: Option<String>,
) -> Result<Vec<PessoaInput>, String> {
    let conn = state.conn.lock().unwrap();
    domain_listar_pessoas(&conn, &empresa_id, filtro_tipo.as_deref())
}

#[tauri::command]
pub async fn salvar_veiculo_pessoa(
    state: State<'_, DbState>,
    pessoa_id: String,
    placa: String,
    modelo: String,
    marca: String,
    ano_fabricacao: Option<i64>,
    renavam: Option<String>,
    cor: Option<String>,
) -> Result<String, String> {
    let conn = state.conn.lock().unwrap();
    domain_salvar_veiculo(
        &conn,
        &state.device_id,
        &pessoa_id,
        &placa,
        &modelo,
        &marca,
        ano_fabricacao,
        renavam.as_deref(),
        cor.as_deref(),
    )
}

#[tauri::command]
pub async fn listar_veiculos_pessoa(
    state: State<'_, DbState>,
    pessoa_id: String,
) -> Result<Vec<VeiculoPessoa>, String> {
    let conn = state.conn.lock().unwrap();
    domain_listar_veiculos(&conn, &pessoa_id)
}
