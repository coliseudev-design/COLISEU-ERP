//! Comandos IPC Tauri para Gestão de Configurações do Sistema

use crate::db::DbState;
use crate::domain::configuracoes::{
    carregar_config_fiscal_filial as domain_carregar_config_fiscal_filial,
    carregar_config_nfce_filial as domain_carregar_config_nfce_filial,
    carregar_config_nfe_filial as domain_carregar_config_nfe_filial,
    carregar_config_nfse_filial as domain_carregar_config_nfse_filial,
    carregar_configuracoes as domain_carregar_configuracoes,
    carregar_dados_empresa as domain_carregar_dados_empresa,
    salvar_config_fiscal_filial as domain_salvar_config_fiscal_filial,
    salvar_config_nfce_filial as domain_salvar_config_nfce_filial,
    salvar_config_nfe_filial as domain_salvar_config_nfe_filial,
    salvar_config_nfse_filial as domain_salvar_config_nfse_filial,
    salvar_configuracao as domain_salvar_configuracao,
    salvar_dados_empresa as domain_salvar_dados_empresa,
    ConfigItem, EmpresaConfigInput, FilialNfceConfigInput, FilialNfeConfigInput,
    FilialNfseConfigInput,
};
use tauri::State;

#[tauri::command]
pub async fn salvar_dados_empresa(
    state: State<'_, DbState>,
    input: EmpresaConfigInput,
) -> Result<String, String> {
    let conn = state.conn.lock().unwrap();
    domain_salvar_dados_empresa(&conn, &state.device_id, &input)
}

#[tauri::command]
pub async fn carregar_dados_empresa(
    state: State<'_, DbState>,
    empresa_id: String,
) -> Result<Option<EmpresaConfigInput>, String> {
    let conn = state.conn.lock().unwrap();
    domain_carregar_dados_empresa(&conn, &empresa_id)
}

#[tauri::command]
pub async fn salvar_configuracao(
    state: State<'_, DbState>,
    empresa_id: String,
    chave: String,
    valor: String,
    grupo: String,
) -> Result<(), String> {
    let conn = state.conn.lock().unwrap();
    domain_salvar_configuracao(&conn, &state.device_id, &empresa_id, &chave, &valor, &grupo)
}

#[tauri::command]
pub async fn carregar_configuracoes(
    state: State<'_, DbState>,
    empresa_id: String,
    grupo_opt: Option<String>,
) -> Result<Vec<ConfigItem>, String> {
    let conn = state.conn.lock().unwrap();
    domain_carregar_configuracoes(&conn, &empresa_id, grupo_opt.as_deref())
}

#[tauri::command]
pub async fn salvar_config_fiscal_filial(
    state: State<'_, DbState>,
    input: FilialNfeConfigInput,
) -> Result<(), String> {
    let conn = state.conn.lock().unwrap();
    domain_salvar_config_fiscal_filial(&conn, &state.device_id, &input)
}

#[tauri::command]
pub async fn carregar_config_fiscal_filial(
    state: State<'_, DbState>,
    filial_id: String,
) -> Result<Option<FilialNfeConfigInput>, String> {
    let conn = state.conn.lock().unwrap();
    domain_carregar_config_fiscal_filial(&conn, &filial_id)
}

#[tauri::command]
pub async fn salvar_config_nfe_filial(
    state: State<'_, DbState>,
    input: FilialNfeConfigInput,
) -> Result<(), String> {
    let conn = state.conn.lock().unwrap();
    domain_salvar_config_nfe_filial(&conn, &state.device_id, &input)
}

#[tauri::command]
pub async fn carregar_config_nfe_filial(
    state: State<'_, DbState>,
    filial_id: String,
) -> Result<Option<FilialNfeConfigInput>, String> {
    let conn = state.conn.lock().unwrap();
    domain_carregar_config_nfe_filial(&conn, &filial_id)
}

#[tauri::command]
pub async fn salvar_config_nfce_filial(
    state: State<'_, DbState>,
    input: FilialNfceConfigInput,
) -> Result<(), String> {
    let conn = state.conn.lock().unwrap();
    domain_salvar_config_nfce_filial(&conn, &state.device_id, &input)
}

#[tauri::command]
pub async fn carregar_config_nfce_filial(
    state: State<'_, DbState>,
    filial_id: String,
) -> Result<Option<FilialNfceConfigInput>, String> {
    let conn = state.conn.lock().unwrap();
    domain_carregar_config_nfce_filial(&conn, &filial_id)
}

#[tauri::command]
pub async fn salvar_config_nfse_filial(
    state: State<'_, DbState>,
    input: FilialNfseConfigInput,
) -> Result<(), String> {
    let conn = state.conn.lock().unwrap();
    domain_salvar_config_nfse_filial(&conn, &state.device_id, &input)
}

#[tauri::command]
pub async fn carregar_config_nfse_filial(
    state: State<'_, DbState>,
    filial_id: String,
) -> Result<Option<FilialNfseConfigInput>, String> {
    let conn = state.conn.lock().unwrap();
    domain_carregar_config_nfse_filial(&conn, &filial_id)
}
