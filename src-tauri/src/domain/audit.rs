//! Módulo de Log de Auditoria Imutável (Audit Log)
//!
//! Registra ações críticas (login, desconto concedido, ajuste de estoque, quitação financeira) em log append-only.

use chrono::Utc;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use tracing::info;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditLogEntry {
    pub id: String,
    pub created_at: String,
    pub usuario_id: Option<String>,
    pub usuario_nome: Option<String>,
    pub acao: String,
    pub recurso: String,
    pub detalhes: Option<String>,
}

/// Grava um evento imutável na trilha de auditoria
pub fn registrar_audit_log(
    conn: &Connection,
    device_id: &str,
    usuario_id: Option<&str>,
    usuario_nome: Option<&str>,
    acao: &str,
    recurso: &str,
    detalhes: Option<&str>,
) -> Result<String, String> {
    let now = Utc::now().to_rfc3339();
    let id = Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO audit_logs (
            id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
            usuario_id, usuario_nome, acao, recurso, detalhes
        ) VALUES (?1, ?2, ?3, ?3, 'pending', 1, 0, ?4, ?5, ?6, ?7, ?8)",
        params![id, device_id, now, usuario_id, usuario_nome, acao, recurso, detalhes],
    )
    .map_err(|e| format!("Erro ao gravar audit log: {}", e))?;

    info!("Audit Log gravado: [{}] {} em {}", acao, recurso, usuario_nome.unwrap_or("SISTEMA"));

    Ok(id)
}

/// Consulta os últimos registros da trilha de auditoria
pub fn listar_audit_logs(conn: &Connection, limit: u32) -> Result<Vec<AuditLogEntry>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, created_at, usuario_id, usuario_nome, acao, recurso, detalhes
             FROM audit_logs
             ORDER BY created_at DESC
             LIMIT ?1",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([limit], |r| {
            Ok(AuditLogEntry {
                id: r.get(0)?,
                created_at: r.get(1)?,
                usuario_id: r.get(2)?,
                usuario_nome: r.get(3)?,
                acao: r.get(4)?,
                recurso: r.get(5)?,
                detalhes: r.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for r in rows {
        result.push(r.map_err(|e| e.to_string())?);
    }
    Ok(result)
}
