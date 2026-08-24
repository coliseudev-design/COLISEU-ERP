//! Módulo de Worker Background da Fila de Contingência SEFAZ
//!
//! Monitora a tabela `documentos_fiscais` procurando notas fiscais emitidas em modo de contingência (`status = 'contingencia'`).
//! Transmite os documentos pendentes com algoritmo de Exponential Backoff para tolerância a falhas de rede.

use crate::fiscal::sefaz_client::{transmitir_nfe, SefazConfig};
use chrono::Utc;
use rusqlite::{params, Connection};
use std::sync::{Arc, Mutex};
use tokio::time::{sleep, Duration};
use tracing::{error, info, warn};

/// Configuração do algoritmo de Exponential Backoff.
#[derive(Debug, Clone)]
pub struct BackoffConfig {
    pub initial_delay_secs: u64,
    pub max_delay_secs: u64,
    pub multiplier: f64,
}

impl Default for BackoffConfig {
    fn default() -> Self {
        Self {
            initial_delay_secs: 5,
            max_delay_secs: 3600, // Max 1 hora
            multiplier: 2.0,
        }
    }
}

pub struct ContingencyItem {
    pub id: String,
    pub chave: String,
    pub xml_envio: String,
}

/// Busca a lista de documentos em contingência sem reter conexões ou statements abertos.
pub fn fetch_contingency_items(conn: &Connection) -> Result<Vec<ContingencyItem>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, chave_acesso, xml_envio 
             FROM documentos_fiscais 
             WHERE status = 'contingencia' AND is_deleted = 0 AND chave_acesso IS NOT NULL AND xml_envio IS NOT NULL
             ORDER BY created_at ASC",
        )
        .map_err(|e| format!("Erro ao buscar fila de contingência: {}", e))?;

    let rows = stmt
        .query_map([], |row| {
            Ok(ContingencyItem {
                id: row.get(0)?,
                chave: row.get(1)?,
                xml_envio: row.get(2)?,
            })
        })
        .map_err(|e| format!("Erro ao mapear documentos em contingência: {}", e))?;

    let mut list = Vec::new();
    for r in rows {
        if let Ok(item) = r {
            list.push(item);
        }
    }
    Ok(list)
}

/// Atualiza o status de um documento fiscal transmitido.
pub fn update_contingency_result(
    conn: &Connection,
    doc_id: &str,
    novo_status: &str,
    xml_retorno: &str,
    x_motivo: &str,
    c_stat: u32,
    n_prot: Option<String>,
) -> Result<(), String> {
    let now_iso = Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE documentos_fiscais 
         SET status = ?1, xml_retorno = ?2, motivo_status = ?3, updated_at = ?4, x_version = x_version + 1, x_sync_status = 'pending'
         WHERE id = ?5",
        params![novo_status, xml_retorno, x_motivo, now_iso, doc_id],
    )
    .map_err(|e| format!("Erro ao atualizar status do documento: {}", e))?;

    let evento_id = uuid::Uuid::new_v4().to_string();
    let _ = conn.execute(
        "INSERT INTO documentos_fiscais_eventos (
            id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
            documento_fiscal_id, tipo_evento, sequencia, protocolo, xml_evento, status_retorno
        ) VALUES (?1, 'local-device', ?2, ?3, 'pending', 1, 0, ?4, 'TRANSMISSAO_CONTINGENCIA', 1, ?5, ?6, ?7)",
        params![
            evento_id,
            now_iso,
            now_iso,
            doc_id,
            n_prot.unwrap_or_default(),
            xml_retorno,
            c_stat as i32
        ],
    );

    Ok(())
}

/// Executa uma rodada de retransmissão de todos os documentos fiscais em status 'contingencia'.
pub async fn process_contingency_queue(
    db_conn: Arc<Mutex<Connection>>,
    sefaz_config: &SefazConfig,
) -> Result<u32, String> {
    let items = {
        let conn = db_conn.lock().unwrap();
        fetch_contingency_items(&conn)?
    };

    if items.is_empty() {
        return Ok(0);
    }

    info!(
        "Worker de Contingência SEFAZ: {} documentos pendentes para envio.",
        items.len()
    );

    let mut cont_sucesso = 0;

    for item in items {
        info!("Retransmitindo documento em contingência ID {} (Chave {})", item.id, item.chave);

        let res = transmitir_nfe(sefaz_config, &item.xml_envio, &item.chave).await;

        match res {
            Ok(sefaz_res) => {
                let novo_status = match sefaz_res.c_stat {
                    100 | 204 | 205 => "autorizado",
                    _ => "rejeitado",
                };

                let conn = db_conn.lock().unwrap();
                let _ = update_contingency_result(
                    &conn,
                    &item.id,
                    novo_status,
                    &sefaz_res.xml_retorno,
                    &sefaz_res.x_motivo,
                    sefaz_res.c_stat,
                    sefaz_res.n_prot,
                );

                if novo_status == "autorizado" {
                    cont_sucesso += 1;
                }
            }
            Err(err_msg) => {
                warn!(
                    "Falha ao transmitir contingência para documento ID {} (permanece em contingência): {}",
                    item.id, err_msg
                );
            }
        }
    }

    Ok(cont_sucesso)
}

/// Inicia o loop continuo de transmissão da fila de contingência em background com Exponential Backoff.
pub fn start_contingency_worker_loop(
    db_conn: Arc<Mutex<Connection>>,
    sefaz_config: SefazConfig,
    backoff: BackoffConfig,
) {
    tauri::async_runtime::spawn(async move {
        let mut current_delay = backoff.initial_delay_secs;

        loop {
            sleep(Duration::from_secs(current_delay)).await;

            let process_res = process_contingency_queue(db_conn.clone(), &sefaz_config).await;

            match process_res {
                Ok(sucessos) => {
                    if sucessos > 0 {
                        current_delay = backoff.initial_delay_secs;
                    } else {
                        current_delay = ((current_delay as f64) * backoff.multiplier) as u64;
                        if current_delay > backoff.max_delay_secs {
                            current_delay = backoff.max_delay_secs;
                        }
                    }
                }
                Err(e) => {
                    error!("Erro no worker de contingência: {}", e);
                    current_delay = ((current_delay as f64) * backoff.multiplier) as u64;
                    if current_delay > backoff.max_delay_secs {
                        current_delay = backoff.max_delay_secs;
                    }
                }
            }
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    fn setup_test_db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        crate::db::schema::create_tables(&conn).unwrap();

        let now = Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO empresas (id, device_id, created_at, updated_at, razao_social, cnpj) VALUES ('emp1', 'dev1', ?1, ?1, 'Empresa Teste', '12345678000195')",
            params![now],
        ).unwrap();
        conn.execute(
            "INSERT INTO filiais (id, device_id, created_at, updated_at, empresa_id, codigo, nome, cnpj) VALUES ('fil1', 'dev1', ?1, ?1, 'emp1', '001', 'Filial 1', '12345678000195')",
            params![now],
        ).unwrap();

        conn
    }

    #[tokio::test]
    async fn test_process_contingency_queue_transicao_para_autorizado() {
        let conn = setup_test_db();
        let now = Utc::now().to_rfc3339();

        let doc_id = "doc_cont_1";
        let chave = "352608123456780001650010000001009876543210";
        conn.execute(
            "INSERT INTO documentos_fiscais (
                id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
                filial_id, modelo, serie, numero, chave_acesso, status, xml_envio
            ) VALUES (?1, 'dev1', ?2, ?2, 'pending', 1, 0, 'fil1', '65', 1, 100, ?3, 'contingencia', '<xml></xml>')",
            params![doc_id, now, chave],
        ).unwrap();

        let mut config = SefazConfig::default();
        config.force_mock = true;

        let db_arc = Arc::new(Mutex::new(conn));
        let sucessos = process_contingency_queue(db_arc.clone(), &config).await.unwrap();
        assert_eq!(sucessos, 1);

        let conn_guard = db_arc.lock().unwrap();
        let status: String = conn_guard
            .query_row(
                "SELECT status FROM documentos_fiscais WHERE id = ?1",
                params![doc_id],
                |r| r.get(0),
            )
            .unwrap();

        assert_eq!(status, "autorizado");
    }
}
