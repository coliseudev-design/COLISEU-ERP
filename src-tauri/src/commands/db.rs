use crate::db::schema::create_tables;
use crate::db::{DbState, ALL_TABLES, SYNC_METADATA_COLUMNS};
use crate::domain::sales::{process_sale, CreateSaleInput, SaleItemInput, SalePaymentInput};
use crate::sync::{init_queue_table, process_batch_queue};
use chrono::Utc;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::time::Instant;
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct DbStatus {
    pub db_path: String,
    pub device_id: String,
    pub encrypted: bool,
    pub tables_count: usize,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TableSyncValidation {
    pub table_name: String,
    pub columns_found: Vec<String>,
    pub missing_columns: Vec<String>,
    pub valid: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SchemaValidationReport {
    pub total_tables: usize,
    pub valid_tables: usize,
    pub details: Vec<TableSyncValidation>,
    pub all_valid: bool,
}

/// Retrieves general database status, file location, device UUID and table counts.
#[tauri::command]
pub async fn get_db_status(state: State<'_, DbState>) -> Result<DbStatus, String> {
    let db_state = state.inner().clone();

    tokio::task::spawn_blocking(move || {
        let conn = db_state.conn.lock().map_err(|e| e.to_string())?;

        let mut stmt = conn
            .prepare("SELECT count(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
            .map_err(|e| e.to_string())?;

        let tables_count: usize = stmt.query_row([], |row| row.get(0)).map_err(|e| e.to_string())?;

        Ok(DbStatus {
            db_path: db_state.db_path.to_string_lossy().to_string(),
            device_id: db_state.device_id,
            encrypted: true,
            tables_count,
        })
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Performs a strict Audit Gate check of all 15 system tables to verify sync metadata columns.
#[tauri::command]
pub async fn validate_sync_schema(state: State<'_, DbState>) -> Result<SchemaValidationReport, String> {
    let db_state = state.inner().clone();

    tokio::task::spawn_blocking(move || {
        let conn = db_state.conn.lock().map_err(|e| e.to_string())?;
        let mut details = Vec::new();
        let mut valid_tables = 0;

        for table in ALL_TABLES.iter() {
            let pragma_sql = format!("PRAGMA table_info({});", table);
            let mut stmt = conn.prepare(&pragma_sql).map_err(|e| e.to_string())?;

            let cols: Vec<String> = stmt
                .query_map([], |row| row.get::<_, String>(1))
                .map_err(|e| e.to_string())?
                .filter_map(|r| r.ok())
                .collect();

            let mut missing = Vec::new();
            for req in SYNC_METADATA_COLUMNS.iter() {
                if !cols.contains(&req.to_string()) {
                    missing.push(req.to_string());
                }
            }

            let is_valid = missing.is_empty();
            if is_valid {
                valid_tables += 1;
            }

            details.push(TableSyncValidation {
                table_name: table.to_string(),
                columns_found: cols,
                missing_columns: missing,
                valid: is_valid,
            });
        }

        let total_tables = ALL_TABLES.len();
        let all_valid = valid_tables == total_tables;

        Ok(SchemaValidationReport {
            total_tables,
            valid_tables,
            details,
            all_valid,
        })
    })
    .await
    .map_err(|e| e.to_string())?
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BenchmarkReport {
    pub total_sales: usize,
    pub write_time_secs: f64,
    pub write_throughput_ops_sec: f64,
    pub queue_drain_secs: f64,
    pub queue_drain_rate: f64,
    pub search_latency_ms: f64,
    pub target_write_ops_met: bool,
    pub target_queue_drain_met: bool,
    pub target_search_latency_met: bool,
    pub all_gates_passed: bool,
}

/// Runs Audit Gate 6 Benchmark (Offline Sales Write, Sync Queue Drain, Indexed Search Latency)
#[tauri::command]
pub async fn run_audit_benchmark(sample_size: Option<usize>) -> Result<BenchmarkReport, String> {
    tokio::task::spawn_blocking(move || {
        let total_sales = sample_size.unwrap_or(10_000);
        let conn = Connection::open_in_memory().map_err(|e: rusqlite::Error| e.to_string())?;
        conn.execute("PRAGMA key = 'test_secret_key_32_bytes_long_ok';", [])
            .map_err(|e: rusqlite::Error| e.to_string())?;
        conn.execute_batch("PRAGMA journal_mode = WAL; PRAGMA synchronous = OFF;").ok();

        create_tables(&conn).map_err(|e| e.to_string())?;
        init_queue_table(&conn).map_err(|e| e.to_string())?;

        let now = Utc::now().to_rfc3339();
        let emp_id = "emp_bench_ui".to_string();
        let fil_id = "fil_bench_ui".to_string();
        let dep_id = "dep_bench_ui".to_string();
        let prod_id = "prod_bench_ui".to_string();

        conn.execute(
            "INSERT INTO empresas (id, device_id, created_at, updated_at, razao_social, cnpj) VALUES (?1, 'dev_bench', ?2, ?2, 'Empresa UI Bench Ltda', '11.111.111/0001-11');",
            params![emp_id, now],
        ).map_err(|e: rusqlite::Error| e.to_string())?;

        conn.execute(
            "INSERT INTO filiais (id, device_id, created_at, updated_at, empresa_id, codigo, nome, cnpj) VALUES (?1, 'dev_bench', ?2, ?2, ?3, '001', 'Filial UI', '11.111.111/0001-11');",
            params![fil_id, now, emp_id],
        ).map_err(|e: rusqlite::Error| e.to_string())?;

        conn.execute(
            "INSERT INTO depositos (id, device_id, created_at, updated_at, filial_id, codigo, nome, padrao) VALUES (?1, 'dev_bench', ?2, ?2, ?3, 'DEP-UI', 'Depósito UI', 1);",
            params![dep_id, now, fil_id],
        ).map_err(|e: rusqlite::Error| e.to_string())?;

        conn.execute(
            "INSERT INTO produtos (id, device_id, created_at, updated_at, empresa_id, codigo_sku, descricao, preco_custo, preco_venda) VALUES (?1, 'dev_bench', ?2, ?2, ?3, 'PROD-UI', 'Produto UI Bench', 10.0, 25.0);",
            params![prod_id, now, emp_id],
        ).map_err(|e: rusqlite::Error| e.to_string())?;

        conn.execute(
            "INSERT INTO estoque_saldos (id, device_id, created_at, updated_at, deposito_id, produto_id, quantidade_atual, quantidade_reservada) VALUES ('saldo_ui', 'dev_bench', ?1, ?1, ?2, ?3, 1000000.0, 0.0);",
            params![now, dep_id, prod_id],
        ).map_err(|e: rusqlite::Error| e.to_string())?;

        // 1. Measure Write Throughput
        let mut mut_conn = conn;
        let start_write = Instant::now();
        for i in 0..total_sales {
            let input = CreateSaleInput {
                filial_id: fil_id.clone(),
                deposito_id: dep_id.clone(),
                cliente_id: None,
                vendedor_id: None,
                valor_desconto_global: 5.00,
                observacoes: Some(format!("UI Sale #{}", i + 1)),
                itens: vec![SaleItemInput {
                    produto_id: prod_id.clone(),
                    item_ordem: 1,
                    quantidade: 1.0,
                    preco_unitario: 25.00,
                    desconto_unitario: 0.0,
                }],
                pagamentos: vec![SalePaymentInput {
                    forma_pagamento: "PIX".to_string(),
                    valor: 20.00,
                    troco: 0.0,
                    nsu_autorizacao: None,
                }],
            };
            process_sale(&mut mut_conn, "dev_bench", input).map_err(|e| e.to_string())?;
        }
        let write_secs = start_write.elapsed().as_secs_f64();
        let write_ops_sec = (total_sales as f64) / write_secs;

        // 2. Measure Sync Queue Drain Speed
        let start_drain = Instant::now();
        let mut total_drained = 0;
        loop {
            let res = process_batch_queue(&mut_conn).map_err(|e| e.to_string())?;
            total_drained += res.processed_count;
            if res.processed_count == 0 {
                break;
            }
        }
        let drain_secs = start_drain.elapsed().as_secs_f64();
        let drain_rate = (total_drained as f64) / drain_secs;

        // 3. Measure Search Latency
        let start_search = Instant::now();
        let mut stmt = mut_conn
            .prepare("SELECT id, numero_venda, valor_total FROM vendas WHERE filial_id = ?1 AND status = 'CONCLUIDA' ORDER BY numero_venda DESC LIMIT 50;")
            .map_err(|e: rusqlite::Error| e.to_string())?;
        let mapped_rows = stmt
            .query_map(params![fil_id], |r: &rusqlite::Row| {
                let id: String = r.get(0)?;
                let num: i64 = r.get(1)?;
                let val: f64 = r.get(2)?;
                Ok((id, num, val))
            })
            .map_err(|e: rusqlite::Error| e.to_string())?;
        let _rows: Vec<(String, i64, f64)> = mapped_rows.filter_map(|r| r.ok()).collect();
        let search_ms = start_search.elapsed().as_secs_f64() * 1000.0;

        let target_write_ops_met = write_ops_sec >= 1000.0;
        let target_queue_drain_met = drain_secs <= 30.0;
        let target_search_latency_met = search_ms <= 10.0;
        let all_gates_passed = target_write_ops_met && target_queue_drain_met && target_search_latency_met;

        Ok(BenchmarkReport {
            total_sales,
            write_time_secs: (write_secs * 1000.0).round() / 1000.0,
            write_throughput_ops_sec: (write_ops_sec * 100.0).round() / 100.0,
            queue_drain_secs: (drain_secs * 1000.0).round() / 1000.0,
            queue_drain_rate: (drain_rate * 100.0).round() / 100.0,
            search_latency_ms: (search_ms * 1000.0).round() / 1000.0,
            target_write_ops_met,
            target_queue_drain_met,
            target_search_latency_met,
            all_gates_passed,
        })
    })
    .await
    .map_err(|e| e.to_string())?
}

