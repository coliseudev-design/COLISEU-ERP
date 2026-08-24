//! Módulo de Parsing de Arquivos OFX & Conciliação Bancária
//!
//! Realiza a leitura de extratos bancários em formato OFX e o batimento automático com lançamentos financeiros.

use chrono::Utc;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use tracing::info;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransacaoOfx {
    pub fitid: String,
    pub data_transacao: String,
    pub valor: f64,
    pub tipo: String, // 'DEBIT' ou 'CREDIT'
    pub memo: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResultadoConciliacaoOfx {
    pub total_processados: usize,
    pub conciliados_automaticamente: usize,
    pub pendentes: usize,
}

/// Realiza o parsing de uma string de arquivo OFX (v1/v2)
pub fn parse_ofx_content(content: &str) -> Vec<TransacaoOfx> {
    let mut transacoes = Vec::new();

    let trn_blocks: Vec<&str> = content.split("<STMTTRN>").skip(1).collect();

    for block in trn_blocks {
        let block_clean = block.split("</STMTTRN>").next().unwrap_or(block);

        let get_tag_value = |tag: &str| -> String {
            if let Some(pos) = block_clean.find(tag) {
                let start = pos + tag.len();
                let rest = &block_clean[start..];
                let end = rest.find('<').unwrap_or_else(|| rest.find('\n').unwrap_or(rest.len()));
                return rest[..end].trim().to_string();
            }
            String::new()
        };

        let fitid = get_tag_value("<FITID>");
        let trntype = get_tag_value("<TRNTYPE>");
        let dtposted = get_tag_value("<DTPOSTED>");
        let trnamt_str = get_tag_value("<TRNAMT>");
        let memo = get_tag_value("<MEMO>");

        if !fitid.is_empty() && !trnamt_str.is_empty() {
            let valor: f64 = trnamt_str.parse().unwrap_or(0.0);
            let data_fmt = if dtposted.len() >= 8 {
                format!("{}-{}-{}", &dtposted[0..4], &dtposted[4..6], &dtposted[6..8])
            } else {
                dtposted
            };

            transacoes.push(TransacaoOfx {
                fitid,
                data_transacao: data_fmt,
                valor,
                tipo: trntype,
                memo,
            });
        }
    }

    transacoes
}

/// Importa e concilia automaticamente as transações de um arquivo OFX
pub fn importar_e_conciliar_ofx(
    conn: &mut Connection,
    device_id: &str,
    filial_id: &str,
    ofx_content: &str,
) -> Result<ResultadoConciliacaoOfx, String> {
    let transacoes = parse_ofx_content(ofx_content);
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();

    let mut conciliados = 0;
    let mut pendentes = 0;

    for trn in &transacoes {
        // 1. Tenta encontrar lançamento financeiro correspondente (mesmo valor aproximado e status pendente)
        let lancamento_id: Option<String> = tx
            .query_row(
                "SELECT id FROM financeiro_lancamentos
                 WHERE filial_id = ?1 AND abs(valor_total - ?2) < 0.01 AND status = 'PENDENTE'
                 LIMIT 1",
                params![filial_id, trn.valor.abs()],
                |r| r.get(0),
            )
            .ok();

        let status_conc = if lancamento_id.is_some() {
            conciliados += 1;
            "CONCILIADO"
        } else {
            pendentes += 1;
            "PENDENTE"
        };

        // If matched, mark financial record as PAGO
        if let Some(ref l_id) = lancamento_id {
            tx.execute(
                "UPDATE financeiro_lancamentos SET status = 'PAGO', valor_pago = valor_total, updated_at = ?1, x_version = x_version + 1, x_sync_status = 'pending' WHERE id = ?2",
                params![now, l_id],
            )
            .map_err(|e| format!("Erro ao dar baixa no lançamento conciliado: {}", e))?;
        }

        // 2. Registra na tabela ofx_extratos
        tx.execute(
            "INSERT INTO ofx_extratos (
                id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
                filial_id, fitid, data_transacao, valor, tipo_transacao, memo, status_conciliacao, financeiro_lancamento_id
            ) VALUES (?1, ?2, ?3, ?3, 'pending', 1, 0, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
            ON CONFLICT(fitid) DO UPDATE SET
                status_conciliacao = excluded.status_conciliacao,
                financeiro_lancamento_id = excluded.financeiro_lancamento_id,
                updated_at = excluded.updated_at, x_version = x_version + 1, x_sync_status = 'pending'",
            params![
                uuid::Uuid::new_v4().to_string(),
                device_id,
                now,
                filial_id,
                trn.fitid,
                trn.data_transacao,
                trn.valor,
                trn.tipo,
                trn.memo,
                status_conc,
                lancamento_id
            ],
        )
        .map_err(|e| format!("Erro ao gravar extrato OFX: {}", e))?;
    }

    tx.commit().map_err(|e| e.to_string())?;

    info!(
        "Extrato OFX importado. Total: {}, Conciliados Automáticos: {}, Pendentes: {}",
        transacoes.len(),
        conciliados,
        pendentes
    );

    Ok(ResultadoConciliacaoOfx {
        total_processados: transacoes.len(),
        conciliados_automaticamente: conciliados,
        pendentes,
    })
}
