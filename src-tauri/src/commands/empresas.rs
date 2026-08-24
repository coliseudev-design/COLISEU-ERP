use crate::db::DbState;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct Empresa {
    pub id: String,
    pub device_id: String,
    pub created_at: String,
    pub updated_at: String,
    pub x_sync_status: String,
    pub x_version: i64,
    pub is_deleted: i64,
    pub razao_social: String,
    pub nome_fantasia: Option<String>,
    pub cnpj: String,
    pub inscricao_estadual: Option<String>,
    pub ativo: bool,
}

#[derive(Debug, Deserialize)]
pub struct CreateEmpresaPayload {
    pub razao_social: String,
    pub nome_fantasia: Option<String>,
    pub cnpj: String,
    pub inscricao_estadual: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Filial {
    pub id: String,
    pub device_id: String,
    pub created_at: String,
    pub updated_at: String,
    pub x_sync_status: String,
    pub x_version: i64,
    pub is_deleted: i64,
    pub empresa_id: String,
    pub codigo: String,
    pub nome: String,
    pub cnpj: String,
    pub inscricao_estadual: Option<String>,
    pub endereco: Option<String>,
    pub cidade: Option<String>,
    pub uf: Option<String>,
    pub ativo: bool,
}

#[derive(Debug, Deserialize)]
pub struct CreateFilialPayload {
    pub empresa_id: String,
    pub codigo: String,
    pub nome: String,
    pub cnpj: String,
    pub inscricao_estadual: Option<String>,
    pub endereco: Option<String>,
    pub cidade: Option<String>,
    pub uf: Option<String>,
}

#[tauri::command]
pub async fn create_empresa(
    state: State<'_, DbState>,
    payload: CreateEmpresaPayload,
) -> Result<Empresa, String> {
    let db_state = state.inner().clone();

    tokio::task::spawn_blocking(move || {
        let conn = db_state.conn.lock().map_err(|e| e.to_string())?;

        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();
        let sync_status = "pending".to_string();
        let version = 1i64;
        let is_deleted = 0i64;

        conn.execute(
            "INSERT INTO empresas (
                id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
                razao_social, nome_fantasia, cnpj, inscricao_estadual, ativo
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, 1);",
            rusqlite::params![
                id,
                db_state.device_id,
                now,
                now,
                sync_status,
                version,
                is_deleted,
                payload.razao_social,
                payload.nome_fantasia,
                payload.cnpj,
                payload.inscricao_estadual
            ],
        )
        .map_err(|e| format!("Erro ao inserir empresa: {}", e))?;

        Ok(Empresa {
            id,
            device_id: db_state.device_id,
            created_at: now.clone(),
            updated_at: now,
            x_sync_status: sync_status,
            x_version: version,
            is_deleted,
            razao_social: payload.razao_social,
            nome_fantasia: payload.nome_fantasia,
            cnpj: payload.cnpj,
            inscricao_estadual: payload.inscricao_estadual,
            ativo: true,
        })
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn list_empresas(state: State<'_, DbState>) -> Result<Vec<Empresa>, String> {
    let db_state = state.inner().clone();

    tokio::task::spawn_blocking(move || {
        let conn = db_state.conn.lock().map_err(|e| e.to_string())?;

        let mut stmt = conn
            .prepare(
                "SELECT id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
                        razao_social, nome_fantasia, cnpj, inscricao_estadual, ativo
                 FROM empresas
                 WHERE is_deleted = 0
                 ORDER BY razao_social ASC;",
            )
            .map_err(|e| e.to_string())?;

        let rows = stmt
            .query_map([], |row| {
                let ativo_int: i64 = row.get(11)?;
                Ok(Empresa {
                    id: row.get(0)?,
                    device_id: row.get(1)?,
                    created_at: row.get(2)?,
                    updated_at: row.get(3)?,
                    x_sync_status: row.get(4)?,
                    x_version: row.get(5)?,
                    is_deleted: row.get(6)?,
                    razao_social: row.get(7)?,
                    nome_fantasia: row.get(8)?,
                    cnpj: row.get(9)?,
                    inscricao_estadual: row.get(10)?,
                    ativo: ativo_int == 1,
                })
            })
            .map_err(|e| e.to_string())?;

        let mut result = Vec::new();
        for r in rows {
            result.push(r.map_err(|e| e.to_string())?);
        }
        Ok(result)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn create_filial(
    state: State<'_, DbState>,
    payload: CreateFilialPayload,
) -> Result<Filial, String> {
    let db_state = state.inner().clone();

    tokio::task::spawn_blocking(move || {
        let conn = db_state.conn.lock().map_err(|e| e.to_string())?;

        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();
        let sync_status = "pending".to_string();
        let version = 1i64;
        let is_deleted = 0i64;

        conn.execute(
            "INSERT INTO filiais (
                id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
                empresa_id, codigo, nome, cnpj, inscricao_estadual, endereco, cidade, uf, ativo
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, 1);",
            rusqlite::params![
                id,
                db_state.device_id,
                now,
                now,
                sync_status,
                version,
                is_deleted,
                payload.empresa_id,
                payload.codigo,
                payload.nome,
                payload.cnpj,
                payload.inscricao_estadual,
                payload.endereco,
                payload.cidade,
                payload.uf
            ],
        )
        .map_err(|e| format!("Erro ao inserir filial: {}", e))?;

        // Standard default warehouse (depósito principal) creation for this filial
        let deposito_id = Uuid::new_v4().to_string();
        let _ = conn.execute(
            "INSERT INTO depositos (
                id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
                filial_id, codigo, nome, padrao, ativo
            ) VALUES (?1, ?2, ?3, ?4, ?5, 1, 0, ?6, 'DEP-01', 'Depósito Central', 1, 1);",
            rusqlite::params![
                deposito_id,
                db_state.device_id,
                now,
                now,
                sync_status,
                id
            ],
        );

        Ok(Filial {
            id,
            device_id: db_state.device_id,
            created_at: now.clone(),
            updated_at: now,
            x_sync_status: sync_status,
            x_version: version,
            is_deleted,
            empresa_id: payload.empresa_id,
            codigo: payload.codigo,
            nome: payload.nome,
            cnpj: payload.cnpj,
            inscricao_estadual: payload.inscricao_estadual,
            endereco: payload.endereco,
            cidade: payload.cidade,
            uf: payload.uf,
            ativo: true,
        })
    })
    .await
    .map_err(|e| e.to_string())?
}
