use chrono::Utc;
use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FinanceiroLancamento {
    pub id: String,
    pub device_id: String,
    pub created_at: String,
    pub updated_at: String,
    pub x_sync_status: String,
    pub x_version: i64,
    pub is_deleted: i64,
    pub filial_id: String,
    pub pessoa_id: Option<String>,
    pub venda_id: Option<String>,
    pub tipo: String, // 'RECEBER', 'PAGAR'
    pub descricao: String,
    pub valor_total: f64,
    pub valor_pago: f64,
    pub data_vencimento: String,
    pub data_pagamento: Option<String>,
    pub status: String, // 'PENDENTE', 'PAGO', 'CANCELADO'
    pub nome_pessoa: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateLancamentoInput {
    pub filial_id: String,
    pub pessoa_id: Option<String>,
    pub venda_id: Option<String>,
    pub tipo: String,
    pub descricao: String,
    pub valor_total: f64,
    pub data_vencimento: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CaixaMovimentacao {
    pub id: String,
    pub device_id: String,
    pub created_at: String,
    pub updated_at: String,
    pub x_sync_status: String,
    pub x_version: i64,
    pub is_deleted: i64,
    pub filial_id: String,
    pub dispositivo_id: Option<String>,
    pub tipo: String, // 'SUPRIMENTO', 'SANGRIA', 'VENDA_DINHEIRO', 'VENDA_OUTROS', 'PAGAMENTO_TITULO', 'CANCELAMENTO_VENDA'
    pub valor: f64,
    pub observacao: Option<String>,
    pub usuario_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegistrarCaixaInput {
    pub filial_id: String,
    pub tipo: String, // 'SUPRIMENTO', 'SANGRIA'
    pub valor: f64,
    pub observacao: Option<String>,
    pub usuario_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResumoCaixa {
    pub total_suprimentos: f64,
    pub total_sangrias: f64,
    pub total_vendas_dinheiro: f64,
    pub total_vendas_outros: f64,
    pub total_recebimentos_titulos: f64,
    pub total_cancelamentos: f64,
    pub saldo_dinheiro_caixa: f64,
}

pub fn create_lancamento(
    conn: &Connection,
    device_id: &str,
    input: CreateLancamentoInput,
) -> Result<FinanceiroLancamento, String> {
    if input.valor_total <= 0.0 {
        return Err("O valor total do lançamento deve ser maior que zero".to_string());
    }

    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let tipo_upper = input.tipo.to_uppercase();

    if !["RECEBER", "PAGAR"].contains(&tipo_upper.as_str()) {
        return Err(format!("Tipo de lançamento inválido: {}", input.tipo));
    }

    conn.execute(
        "INSERT INTO financeiro_lancamentos (
            id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
            filial_id, pessoa_id, venda_id, tipo, descricao, valor_total, valor_pago, data_vencimento, data_pagamento, status
        ) VALUES (?1, ?2, ?3, ?4, 'pending', 1, 0, ?5, ?6, ?7, ?8, ?9, ?10, 0.0, ?11, NULL, 'PENDENTE');",
        params![
            id,
            device_id,
            now,
            now,
            input.filial_id,
            input.pessoa_id,
            input.venda_id,
            tipo_upper,
            input.descricao,
            input.valor_total,
            input.data_vencimento
        ],
    )
    .map_err(|e| format!("Erro ao criar lançamento financeiro: {}", e))?;

    let nome_pessoa: Option<String> = if let Some(ref p_id) = input.pessoa_id {
        conn.query_row("SELECT nome_razaosocial FROM pessoas WHERE id = ?1;", [p_id], |r| r.get(0)).ok()
    } else {
        None
    };

    Ok(FinanceiroLancamento {
        id,
        device_id: device_id.to_string(),
        created_at: now.clone(),
        updated_at: now,
        x_sync_status: "pending".to_string(),
        x_version: 1,
        is_deleted: 0,
        filial_id: input.filial_id,
        pessoa_id: input.pessoa_id,
        venda_id: input.venda_id,
        tipo: tipo_upper,
        descricao: input.descricao,
        valor_total: input.valor_total,
        valor_pago: 0.0,
        data_vencimento: input.data_vencimento,
        data_pagamento: None,
        status: "PENDENTE".to_string(),
        nome_pessoa,
    })
}

pub fn list_lancamentos(
    conn: &Connection,
    filial_id: &str,
    tipo_filter: Option<String>,
    status_filter: Option<String>,
) -> Result<Vec<FinanceiroLancamento>, String> {
    let mut sql = "SELECT l.id, l.device_id, l.created_at, l.updated_at, l.x_sync_status, l.x_version, l.is_deleted,
                          l.filial_id, l.pessoa_id, l.venda_id, l.tipo, l.descricao, l.valor_total, l.valor_pago,
                          l.data_vencimento, l.data_pagamento, l.status, p.nome_razaosocial
                   FROM financeiro_lancamentos l
                   LEFT JOIN pessoas p ON p.id = l.pessoa_id
                   WHERE l.filial_id = ?1 AND l.is_deleted = 0".to_string();

    let mut params_vec: Vec<String> = vec![filial_id.to_string()];

    if let Some(t) = tipo_filter {
        sql.push_str(&format!(" AND l.tipo = ?{}", params_vec.len() + 1));
        params_vec.push(t.to_uppercase());
    }

    if let Some(s) = status_filter {
        sql.push_str(&format!(" AND l.status = ?{}", params_vec.len() + 1));
        params_vec.push(s.to_uppercase());
    }

    sql.push_str(" ORDER BY l.data_vencimento ASC;");

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(rusqlite::params_from_iter(params_vec.iter()), |r| {
            Ok(FinanceiroLancamento {
                id: r.get(0)?,
                device_id: r.get(1)?,
                created_at: r.get(2)?,
                updated_at: r.get(3)?,
                x_sync_status: r.get(4)?,
                x_version: r.get(5)?,
                is_deleted: r.get(6)?,
                filial_id: r.get(7)?,
                pessoa_id: r.get(8)?,
                venda_id: r.get(9)?,
                tipo: r.get(10)?,
                descricao: r.get(11)?,
                valor_total: r.get(12)?,
                valor_pago: r.get(13)?,
                data_vencimento: r.get(14)?,
                data_pagamento: r.get(15)?,
                status: r.get(16)?,
                nome_pessoa: r.get(17)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for r in rows {
        result.push(r.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

pub fn quitar_lancamento(
    conn: &mut Connection,
    device_id: &str,
    lancamento_id: &str,
    valor_pago: f64,
    data_pagamento: Option<String>,
) -> Result<FinanceiroLancamento, String> {
    if valor_pago <= 0.0 {
        return Err("O valor pago deve ser maior que zero".to_string());
    }

    let now = data_pagamento.unwrap_or_else(|| Utc::now().to_rfc3339());

    let tx = conn
        .transaction()
        .map_err(|e| format!("Erro ao iniciar transação: {}", e))?;

    let (filial_id, descricao, valor_total): (String, String, f64) = tx
        .query_row(
            "SELECT filial_id, descricao, valor_total FROM financeiro_lancamentos WHERE id = ?1 AND is_deleted = 0;",
            [lancamento_id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
        )
        .map_err(|e| format!("Lançamento financeiro não encontrado: {}", e))?;

    let novo_status = if valor_pago >= valor_total - 0.01 {
        "PAGO"
    } else {
        "PARCIAL"
    };

    tx.execute(
        "UPDATE financeiro_lancamentos SET status = ?1, valor_pago = ?2, data_pagamento = ?3, updated_at = ?4, x_sync_status = 'pending' WHERE id = ?5;",
        params![novo_status, valor_pago, now, now, lancamento_id],
    )
    .map_err(|e| format!("Erro ao quitar lançamento: {}", e))?;

    // Record cash entry for settlement
    tx.execute(
        "INSERT INTO caixa_movimentacoes (
            id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
            filial_id, dispositivo_id, tipo, valor, observacao, usuario_id
        ) VALUES (?1, ?2, ?3, ?4, 'pending', 1, 0, ?5, ?6, 'PAGAMENTO_TITULO', ?7, ?8, NULL);",
        params![
            Uuid::new_v4().to_string(),
            device_id,
            now,
            now,
            filial_id,
            device_id,
            valor_pago,
            format!("Quitação de título: {}", descricao)
        ],
    )
    .map_err(|e| format!("Erro ao registrar quitação em caixa_movimentacoes: {}", e))?;

    tx.commit()
        .map_err(|e| format!("Erro ao confirmar quitação: {}", e))?;

    let mut stmt = conn
        .prepare(
            "SELECT l.id, l.device_id, l.created_at, l.updated_at, l.x_sync_status, l.x_version, l.is_deleted,
                    l.filial_id, l.pessoa_id, l.venda_id, l.tipo, l.descricao, l.valor_total, l.valor_pago,
                    l.data_vencimento, l.data_pagamento, l.status, p.nome_razaosocial
             FROM financeiro_lancamentos l
             LEFT JOIN pessoas p ON p.id = l.pessoa_id
             WHERE l.id = ?1;",
        )
        .map_err(|e| e.to_string())?;

    stmt.query_row([lancamento_id], |r| {
        Ok(FinanceiroLancamento {
            id: r.get(0)?,
            device_id: r.get(1)?,
            created_at: r.get(2)?,
            updated_at: r.get(3)?,
            x_sync_status: r.get(4)?,
            x_version: r.get(5)?,
            is_deleted: r.get(6)?,
            filial_id: r.get(7)?,
            pessoa_id: r.get(8)?,
            venda_id: r.get(9)?,
            tipo: r.get(10)?,
            descricao: r.get(11)?,
            valor_total: r.get(12)?,
            valor_pago: r.get(13)?,
            data_vencimento: r.get(14)?,
            data_pagamento: r.get(15)?,
            status: r.get(16)?,
            nome_pessoa: r.get(17)?,
        })
    })
    .map_err(|e| e.to_string())
}

pub fn create_caixa_movimentacao(
    conn: &Connection,
    device_id: &str,
    input: RegistrarCaixaInput,
) -> Result<CaixaMovimentacao, String> {
    if input.valor <= 0.0 {
        return Err("O valor da movimentação de caixa deve ser maior que zero".to_string());
    }

    let tipo_upper = input.tipo.to_uppercase();
    if !["SUPRIMENTO", "SANGRIA"].contains(&tipo_upper.as_str()) {
        return Err(format!("Tipo de movimentação manual de caixa inválido: {}", input.tipo));
    }

    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO caixa_movimentacoes (
            id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
            filial_id, dispositivo_id, tipo, valor, observacao, usuario_id
        ) VALUES (?1, ?2, ?3, ?4, 'pending', 1, 0, ?5, ?6, ?7, ?8, ?9, ?10);",
        params![
            id,
            device_id,
            now,
            now,
            input.filial_id,
            device_id,
            tipo_upper,
            input.valor,
            input.observacao,
            input.usuario_id
        ],
    )
    .map_err(|e| format!("Erro ao registrar caixa_movimentacoes: {}", e))?;

    Ok(CaixaMovimentacao {
        id,
        device_id: device_id.to_string(),
        created_at: now.clone(),
        updated_at: now,
        x_sync_status: "pending".to_string(),
        x_version: 1,
        is_deleted: 0,
        filial_id: input.filial_id,
        dispositivo_id: Some(device_id.to_string()),
        tipo: tipo_upper,
        valor: input.valor,
        observacao: input.observacao,
        usuario_id: input.usuario_id,
    })
}

pub fn list_caixa_movimentacoes(
    conn: &Connection,
    filial_id: &str,
) -> Result<Vec<CaixaMovimentacao>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
                    filial_id, dispositivo_id, tipo, valor, observacao, usuario_id
             FROM caixa_movimentacoes
             WHERE filial_id = ?1 AND is_deleted = 0
             ORDER BY created_at DESC
             LIMIT 100;",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([filial_id], |r| {
            Ok(CaixaMovimentacao {
                id: r.get(0)?,
                device_id: r.get(1)?,
                created_at: r.get(2)?,
                updated_at: r.get(3)?,
                x_sync_status: r.get(4)?,
                x_version: r.get(5)?,
                is_deleted: r.get(6)?,
                filial_id: r.get(7)?,
                dispositivo_id: r.get(8)?,
                tipo: r.get(9)?,
                valor: r.get(10)?,
                observacao: r.get(11)?,
                usuario_id: r.get(12)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for r in rows {
        result.push(r.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

pub fn get_resumo_caixa(conn: &Connection, filial_id: &str) -> Result<ResumoCaixa, String> {
    let mut stmt = conn
        .prepare("SELECT tipo, COALESCE(SUM(valor), 0.0) FROM caixa_movimentacoes WHERE filial_id = ?1 AND is_deleted = 0 GROUP BY tipo;")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([filial_id], |r| Ok((r.get::<_, String>(0)?, r.get::<_, f64>(1)?)))
        .map_err(|e| e.to_string())?;

    let mut total_suprimentos = 0.0;
    let mut total_sangrias = 0.0;
    let mut total_vendas_dinheiro = 0.0;
    let mut total_vendas_outros = 0.0;
    let mut total_recebimentos_titulos = 0.0;
    let mut total_cancelamentos = 0.0;

    for r in rows {
        let (tipo, valor) = r.map_err(|e| e.to_string())?;
        match tipo.as_str() {
            "SUPRIMENTO" => total_suprimentos += valor,
            "SANGRIA" => total_sangrias += valor,
            "VENDA_DINHEIRO" => total_vendas_dinheiro += valor,
            "VENDA_OUTROS" => total_vendas_outros += valor,
            "PAGAMENTO_TITULO" => total_recebimentos_titulos += valor,
            "CANCELAMENTO_VENDA" => total_cancelamentos += valor,
            _ => {}
        }
    }

    let saldo_dinheiro_caixa = total_suprimentos + total_vendas_dinheiro + total_recebimentos_titulos
        - total_sangrias
        - total_cancelamentos;

    Ok(ResumoCaixa {
        total_suprimentos,
        total_sangrias,
        total_vendas_dinheiro,
        total_vendas_outros,
        total_recebimentos_titulos,
        total_cancelamentos,
        saldo_dinheiro_caixa,
    })
}
