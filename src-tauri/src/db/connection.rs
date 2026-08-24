use keyring::Entry;
use rand::RngCore;
use rusqlite::Connection;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use tracing::{info, warn};

pub const KEYRING_SERVICE: &str = "antigravity_erp_sqlcipher";
pub const KEYRING_USER: &str = "master_db_key";

pub type DbConnection = Arc<Mutex<Connection>>;

#[derive(Clone)]
pub struct DbState {
    pub conn: DbConnection,
    pub db_path: PathBuf,
    pub device_id: String,
}

/// Retrieves or generates a 256-bit encryption key stored in the OS Keyring.
pub fn get_or_create_db_key() -> Result<String, String> {
    match Entry::new(KEYRING_SERVICE, KEYRING_USER) {
        Ok(entry) => match entry.get_password() {
            Ok(pwd) if !pwd.is_empty() => {
                info!("Chave de criptografia obtida do OS Keyring com sucesso.");
                Ok(pwd)
            }
            _ => {
                info!("Gerando nova chave de criptografia de 256-bits para SQLCipher...");
                let mut bytes = [0u8; 32];
                rand::thread_rng().fill_bytes(&mut bytes);
                let hex_key = hex::encode(bytes);

                if let Err(err) = entry.set_password(&hex_key) {
                    warn!(
                        "Aviso: Não foi possível gravar no Keyring do OS ({:?}). Usando fallback de memória.",
                        err
                    );
                } else {
                    info!("Nova chave de criptografia salva no OS Keyring.");
                }
                Ok(hex_key)
            }
        },
        Err(e) => {
            warn!("Keyring indisponível ({:?}). Usando fallback local.", e);
            // Secure dev/test fallback key
            let fallback_key = hex::encode(b"AntigravityLocalERPDevEncryptionKey32B!");
            Ok(fallback_key)
        }
    }
}

/// Retrieves or creates persistent device UUID stored in local app folder.
pub fn get_or_create_device_id(app_dir: &Path) -> String {
    let device_file = app_dir.join("device_id.txt");
    if device_file.exists() {
        if let Ok(id) = fs::read_to_string(&device_file) {
            let trimmed = id.trim().to_string();
            if !trimmed.is_empty() {
                return trimmed;
            }
        }
    }

    let new_id = uuid::Uuid::new_v4().to_string();
    let _ = fs::write(&device_file, &new_id);
    new_id
}

/// Initializes an encrypted SQLCipher database connection and applies DDL schema migrations.
pub fn init_encrypted_database(db_path: &Path) -> Result<Connection, String> {
    if let Some(parent) = db_path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Falha ao criar diretório do banco de dados: {}", e))?;
    }

    info!("Abrindo conexão SQLCipher em {:?}", db_path);
    let conn = Connection::open(db_path).map_err(|e| format!("Erro ao abrir SQLite: {}", e))?;

    let encryption_key = get_or_create_db_key()?;

    // Apply SQLCipher PRAGMA key
    conn.execute(&format!("PRAGMA key = '{}';", encryption_key), [])
        .map_err(|e| format!("Falha ao aplicar PRAGMA key SQLCipher: {}", e))?;

    // Performance and integrity PRAGMAs
    conn.execute_batch(
        "
        PRAGMA journal_mode = WAL;
        PRAGMA synchronous = NORMAL;
        PRAGMA foreign_keys = ON;
        PRAGMA temp_store = MEMORY;
        ",
    )
    .map_err(|e| format!("Falha ao configurar PRAGMAs do SQLite: {}", e))?;

    // Execute DDL Schema Creation
    crate::db::schema::create_tables(&conn)
        .map_err(|e| format!("Falha ao executar schema de tabelas: {}", e))?;

    Ok(conn)
}

/// Helper function to locate standard application database path.
pub fn get_default_db_path() -> PathBuf {
    if let Some(base_dirs) = dirs::data_dir() {
        base_dirs.join("antigravity_erp").join("erp_local.db")
    } else {
        PathBuf::from("erp_local.db")
    }
}
