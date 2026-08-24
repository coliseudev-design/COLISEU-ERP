//! Comandos IPC do Módulo de Segurança RBAC, Alçadas & Audit Logs
//!
//! Exposição de rotas IPC para login, validação de alçada de desconto e consulta de audit log.

use crate::db::DbState;
use crate::domain::audit::{self, AuditLogEntry};
use crate::domain::rbac::{self, Usuario, ValidacaoAlcadaResult, Funcionario, GrupoAcesso, GrupoAcessoPermissao, FuncionarioMeta, FuncionarioFilial, LoginResult};
use tauri::State;
use tracing::info;

#[tauri::command]
pub async fn autenticar_usuario(
    state: State<'_, DbState>,
    username: String,
    password_hash: String,
) -> Result<Usuario, String> {
    let conn = state.conn.lock().unwrap();
    let user = rbac::autenticar_usuario(&conn, &username, &password_hash)?;
    audit::registrar_audit_log(
        &conn,
        &state.device_id,
        Some(&user.id),
        Some(&user.nome),
        "LOGIN_EFETUADO",
        "AUTENTICACAO",
        Some("Login realizado com sucesso"),
    )?;
    Ok(user)
}

#[tauri::command]
pub async fn validar_alcada_desconto(
    state: State<'_, DbState>,
    usuario_id: String,
    percentual_solicitado: f64,
) -> Result<ValidacaoAlcadaResult, String> {
    let conn = state.conn.lock().unwrap();
    let res = rbac::validar_alcada_desconto(&conn, &usuario_id, percentual_solicitado)?;
    audit::registrar_audit_log(
        &conn,
        &state.device_id,
        Some(&usuario_id),
        None,
        "VALIDACAO_ALCADA_DESCONTO",
        "PDV",
        Some(&res.mensagem),
    )?;
    Ok(res)
}

#[tauri::command]
pub async fn salvar_usuario(
    state: State<'_, DbState>,
    empresa_id: String,
    nome: String,
    username: String,
    password_hash: String,
    perfil: String,
) -> Result<Usuario, String> {
    let conn = state.conn.lock().unwrap();
    let user = rbac::salvar_usuario(
        &conn,
        &state.device_id,
        &empresa_id,
        &nome,
        &username,
        &password_hash,
        &perfil,
    )?;
    audit::registrar_audit_log(
        &conn,
        &state.device_id,
        Some(&user.id),
        Some(&user.nome),
        "USUARIO_SALVO",
        "SEGURANCA",
        Some(&format!("Perfil: {}", perfil)),
    )?;
    Ok(user)
}

#[tauri::command]
pub async fn listar_usuarios(
    state: State<'_, DbState>,
    empresa_id: String,
) -> Result<Vec<Usuario>, String> {
    let conn = state.conn.lock().unwrap();
    rbac::listar_usuarios(&conn, &empresa_id)
}

#[tauri::command]
pub async fn listar_audit_logs(
    state: State<'_, DbState>,
    limit: Option<u32>,
) -> Result<Vec<AuditLogEntry>, String> {
    let conn = state.conn.lock().unwrap();
    audit::listar_audit_logs(&conn, limit.unwrap_or(100))
}

#[tauri::command]
pub async fn autenticar_funcionario(state: State<'_, DbState>, username: String, senha: String) -> Result<LoginResult, String> {
    let conn = state.conn.lock().unwrap();
    let res = rbac::autenticar_funcionario(&conn, &username, &senha)?;
    audit::registrar_audit_log(
        &conn,
        &state.device_id,
        Some(&res.funcionario.id),
        Some(&res.funcionario.nome),
        "LOGIN_EFETUADO",
        "AUTENTICACAO",
        Some("Login de funcionário realizado com sucesso"),
    )?;
    Ok(res)
}

#[tauri::command]
pub async fn salvar_funcionario(state: State<'_, DbState>, funcionario: Funcionario, senha_plain: Option<String>) -> Result<Funcionario, String> {
    let conn = state.conn.lock().unwrap();
    let func = rbac::salvar_funcionario(&conn, &state.device_id, &funcionario, senha_plain.as_deref())?;
    audit::registrar_audit_log(
        &conn,
        &state.device_id,
        Some(&func.id),
        Some(&func.nome),
        "FUNCIONARIO_SALVO",
        "RH",
        Some(&format!("Funcionário {}", func.nome)),
    )?;
    Ok(func)
}

#[tauri::command]
pub async fn listar_funcionarios(state: State<'_, DbState>, empresa_id: String) -> Result<Vec<Funcionario>, String> {
    let conn = state.conn.lock().unwrap();
    rbac::listar_funcionarios(&conn, &empresa_id)
}

#[tauri::command]
pub async fn bloquear_funcionario(state: State<'_, DbState>, funcionario_id: String) -> Result<(), String> {
    let conn = state.conn.lock().unwrap();
    rbac::bloquear_funcionario(&conn, &state.device_id, &funcionario_id)?;
    audit::registrar_audit_log(
        &conn,
        &state.device_id,
        Some(&funcionario_id),
        None,
        "FUNCIONARIO_BLOQUEADO",
        "RH",
        None,
    )?;
    Ok(())
}

#[tauri::command]
pub async fn desbloquear_funcionario(state: State<'_, DbState>, funcionario_id: String) -> Result<(), String> {
    let conn = state.conn.lock().unwrap();
    rbac::desbloquear_funcionario(&conn, &state.device_id, &funcionario_id)?;
    audit::registrar_audit_log(
        &conn,
        &state.device_id,
        Some(&funcionario_id),
        None,
        "FUNCIONARIO_DESBLOQUEADO",
        "RH",
        None,
    )?;
    Ok(())
}

#[tauri::command]
pub async fn resetar_senha_funcionario(state: State<'_, DbState>, funcionario_id: String, nova_senha: String) -> Result<(), String> {
    let conn = state.conn.lock().unwrap();
    rbac::resetar_senha_funcionario(&conn, &state.device_id, &funcionario_id, &nova_senha)?;
    audit::registrar_audit_log(
        &conn,
        &state.device_id,
        Some(&funcionario_id),
        None,
        "SENHA_RESETADA",
        "SEGURANCA",
        None,
    )?;
    Ok(())
}

#[tauri::command]
pub async fn listar_grupos_acesso(state: State<'_, DbState>) -> Result<Vec<GrupoAcesso>, String> {
    let conn = state.conn.lock().unwrap();
    rbac::listar_grupos_acesso(&conn)
}

#[tauri::command]
pub async fn salvar_grupo_acesso(state: State<'_, DbState>, grupo: GrupoAcesso, permissoes: Vec<GrupoAcessoPermissao>) -> Result<GrupoAcesso, String> {
    let conn = state.conn.lock().unwrap();
    let grp = rbac::salvar_grupo_acesso(&conn, &state.device_id, &grupo, &permissoes)?;
    audit::registrar_audit_log(
        &conn,
        &state.device_id,
        None,
        None,
        "GRUPO_ACESSO_SALVO",
        "SEGURANCA",
        Some(&format!("Grupo {}", grp.nome)),
    )?;
    Ok(grp)
}

#[tauri::command]
pub async fn excluir_grupo_acesso(state: State<'_, DbState>, grupo_id: String) -> Result<(), String> {
    let conn = state.conn.lock().unwrap();
    rbac::excluir_grupo_acesso(&conn, &grupo_id)?;
    audit::registrar_audit_log(
        &conn,
        &state.device_id,
        None,
        None,
        "GRUPO_ACESSO_EXCLUIDO",
        "SEGURANCA",
        Some(&grupo_id),
    )?;
    Ok(())
}

#[tauri::command]
pub async fn listar_permissoes_grupo(state: State<'_, DbState>, grupo_id: String) -> Result<Vec<GrupoAcessoPermissao>, String> {
    let conn = state.conn.lock().unwrap();
    rbac::listar_permissoes_grupo(&conn, &grupo_id)
}

#[tauri::command]
pub async fn verificar_permissao(state: State<'_, DbState>, funcionario_id: String, permissao_key: String) -> Result<bool, String> {
    let conn = state.conn.lock().unwrap();
    rbac::verificar_permissao(&conn, &funcionario_id, &permissao_key)
}

#[tauri::command]
pub async fn listar_funcionario_metas(state: State<'_, DbState>, funcionario_id: String, ano: i64) -> Result<Vec<FuncionarioMeta>, String> {
    let conn = state.conn.lock().unwrap();
    rbac::listar_funcionario_metas(&conn, &funcionario_id, ano)
}

#[tauri::command]
pub async fn salvar_funcionario_meta(state: State<'_, DbState>, meta: FuncionarioMeta) -> Result<FuncionarioMeta, String> {
    let conn = state.conn.lock().unwrap();
    let res = rbac::salvar_funcionario_meta(&conn, &state.device_id, &meta)?;
    audit::registrar_audit_log(
        &conn,
        &state.device_id,
        Some(&res.funcionario_id),
        None,
        "META_SALVA",
        "RH",
        None,
    )?;
    Ok(res)
}

#[tauri::command]
pub async fn listar_funcionario_filiais(state: State<'_, DbState>, funcionario_id: String) -> Result<Vec<FuncionarioFilial>, String> {
    let conn = state.conn.lock().unwrap();
    rbac::listar_funcionario_filiais(&conn, &funcionario_id)
}

#[tauri::command]
pub async fn salvar_funcionario_filial(state: State<'_, DbState>, filial: FuncionarioFilial) -> Result<FuncionarioFilial, String> {
    let conn = state.conn.lock().unwrap();
    rbac::salvar_funcionario_filial(&conn, &state.device_id, &filial)
}
