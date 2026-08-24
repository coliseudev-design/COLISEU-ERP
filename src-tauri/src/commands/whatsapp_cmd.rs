use tauri::State;
use crate::db::DbState;
use crate::ai::whatsapp::{WhatsAppGateway, WhatsAppConfigInfo, WhatsAppSendResult};
use crate::ai::encryption::{encrypt_key, decrypt_key};
use uuid::Uuid;
use chrono::Local;

const SECRET_SALT: &str = "COLISEU_ERP_SECRET_SALT_2026_AI_KEY";

#[tauri::command]
pub async fn get_whatsapp_config(
    state: State<'_, DbState>,
    filial_id: String,
) -> Result<Option<WhatsAppConfigInfo>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare("SELECT id, session_name, status, api_url, api_key_encrypted, phone_number, auto_reply_enabled FROM whatsapp_config WHERE filial_id = ?1")
        .map_err(|e: rusqlite::Error| e.to_string())?;

    let row = stmt.query_row([&filial_id], |r| {
        Ok((
            r.get::<_, String>(0)?,
            r.get::<_, String>(1)?,
            r.get::<_, String>(2)?,
            r.get::<_, Option<String>>(3)?,
            r.get::<_, Option<String>>(4)?,
            r.get::<_, Option<String>>(5)?,
            r.get::<_, i32>(6)?,
        ))
    }).ok();

    match row {
        Some((id, session_name, status, api_url, key_enc, phone_number, auto_reply)) => {
            let has_key = key_enc.as_deref().map(|k| !k.is_empty()).unwrap_or(false);
            Ok(Some(WhatsAppConfigInfo {
                id,
                filial_id,
                session_name,
                status,
                api_url,
                has_api_key: has_key,
                phone_number,
                auto_reply_enabled: auto_reply == 1,
            }))
        }
        None => Ok(None),
    }
}

#[tauri::command]
pub async fn salvar_whatsapp_config(
    state: State<'_, DbState>,
    filial_id: String,
    session_name: String,
    api_url: Option<String>,
    api_key: Option<String>,
    phone_number: Option<String>,
    auto_reply_enabled: bool,
) -> Result<String, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let now = Local::now().to_rfc3339();

    let encrypted_key = api_key.as_deref().map(|k| encrypt_key(k, SECRET_SALT));

    let mut stmt = conn.prepare("SELECT id FROM whatsapp_config WHERE filial_id = ?1")
        .map_err(|e: rusqlite::Error| e.to_string())?;

    let existing_id: Option<String> = stmt.query_row([&filial_id], |r| r.get(0)).ok();

    if let Some(id) = existing_id {
        conn.execute(
            "UPDATE whatsapp_config SET session_name = ?1, api_url = ?2, api_key_encrypted = ?3, phone_number = ?4, auto_reply_enabled = ?5, updated_at = ?6 WHERE id = ?7",
            rusqlite::params![session_name, api_url, encrypted_key, phone_number, if auto_reply_enabled { 1 } else { 0 }, now, id],
        ).map_err(|e: rusqlite::Error| e.to_string())?;
        Ok(id)
    } else {
        let new_id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO whatsapp_config (id, device_id, created_at, updated_at, filial_id, session_name, status, api_url, api_key_encrypted, phone_number, auto_reply_enabled)
             VALUES (?1, 'local', ?2, ?2, ?3, ?4, 'DISCONNECTED', ?5, ?6, ?7, ?8)",
            rusqlite::params![new_id, now, filial_id, session_name, api_url, encrypted_key, phone_number, if auto_reply_enabled { 1 } else { 0 }],
        ).map_err(|e: rusqlite::Error| e.to_string())?;
        Ok(new_id)
    }
}

#[tauri::command]
pub async fn enviar_mensagem_whatsapp(
    state: State<'_, DbState>,
    filial_id: String,
    phone_number: String,
    message: String,
) -> Result<WhatsAppSendResult, String> {
    let (url, key) = {
        let conn = state.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn.prepare("SELECT api_url, api_key_encrypted FROM whatsapp_config WHERE filial_id = ?1")
            .map_err(|e: rusqlite::Error| e.to_string())?;

        let row = stmt.query_row([&filial_id], |r| {
            Ok((r.get::<_, Option<String>>(0)?, r.get::<_, Option<String>>(1)?))
        }).ok();

        match row {
            Some((Some(u), Some(k))) => (u, decrypt_key(&k, SECRET_SALT).unwrap_or_default()),
            Some((Some(u), None)) => (u, String::new()),
            _ => (String::new(), String::new()),
        }
    };

    Ok(WhatsAppGateway::send_text_message(&url, &key, &phone_number, &message).await)
}
