use chrono::Utc;
use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Deposito {
    pub id: String,
    pub device_id: String,
    pub created_at: String,
    pub updated_at: String,
    pub x_sync_status: String,
    pub x_version: i64,
    pub is_deleted: i64,
    pub filial_id: String,
    pub codigo: String,
    pub nome: String,
    pub padrao: i64,
    pub ativo: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateDepositoInput {
    pub filial_id: String,
    pub codigo: String,
    pub nome: String,
    pub padrao: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EstoqueSaldo {
    pub id: String,
    pub device_id: String,
    pub created_at: String,
    pub updated_at: String,
    pub x_sync_status: String,
    pub x_version: i64,
    pub is_deleted: i64,
    pub deposito_id: String,
    pub produto_id: String,
    pub quantidade_atual: f64,
    pub quantidade_reservada: f64,
    pub codigo_sku: Option<String>,
    pub descricao_produto: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EstoqueMovimentacao {
    pub id: String,
    pub device_id: String,
    pub created_at: String,
    pub updated_at: String,
    pub x_sync_status: String,
    pub x_version: i64,
    pub is_deleted: i64,
    pub deposito_id: String,
    pub produto_id: String,
    pub tipo: String,
    pub quantidade: f64,
    pub saldo_anterior: f64,
    pub saldo_posterior: f64,
    pub origem_documento: Option<String>,
    pub origem_id: Option<String>,
    pub observacao: Option<String>,
    pub codigo_sku: Option<String>,
    pub descricao_produto: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AjusteEstoqueInput {
    pub deposito_id: String,
    pub produto_id: String,
    pub tipo: String, // 'ENTRADA', 'SAIDA', 'AJUSTE'
    pub quantidade: f64,
    pub observacao: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransferenciaItemInput {
    pub produto_id: String,
    pub quantidade: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransferenciaEstoqueInput {
    pub deposito_origem_id: String,
    pub deposito_destino_id: String,
    pub itens: Vec<TransferenciaItemInput>,
    pub observacao: Option<String>,
}

pub fn list_depositos(conn: &Connection, filial_id: &str) -> Result<Vec<Deposito>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
                    filial_id, codigo, nome, padrao, ativo
             FROM depositos
             WHERE filial_id = ?1 AND is_deleted = 0
             ORDER BY padrao DESC, nome ASC;",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([filial_id], |r| {
            Ok(Deposito {
                id: r.get(0)?,
                device_id: r.get(1)?,
                created_at: r.get(2)?,
                updated_at: r.get(3)?,
                x_sync_status: r.get(4)?,
                x_version: r.get(5)?,
                is_deleted: r.get(6)?,
                filial_id: r.get(7)?,
                codigo: r.get(8)?,
                nome: r.get(9)?,
                padrao: r.get(10)?,
                ativo: r.get(11)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for r in rows {
        result.push(r.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

pub fn create_deposito(
    conn: &Connection,
    device_id: &str,
    input: CreateDepositoInput,
) -> Result<Deposito, String> {
    let now = Utc::now().to_rfc3339();
    let id = Uuid::new_v4().to_string();
    let padrao_val = if input.padrao { 1i64 } else { 0i64 };

    if input.padrao {
        conn.execute(
            "UPDATE depositos SET padrao = 0 WHERE filial_id = ?1;",
            params![input.filial_id],
        )
        .map_err(|e| e.to_string())?;
    }

    conn.execute(
        "INSERT INTO depositos (
            id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
            filial_id, codigo, nome, padrao, ativo
        ) VALUES (?1, ?2, ?3, ?4, 'pending', 1, 0, ?5, ?6, ?7, ?8, 1);",
        params![
            id,
            device_id,
            now,
            now,
            input.filial_id,
            input.codigo,
            input.nome,
            padrao_val
        ],
    )
    .map_err(|e| format!("Erro ao criar depósito: {}", e))?;

    Ok(Deposito {
        id,
        device_id: device_id.to_string(),
        created_at: now.clone(),
        updated_at: now,
        x_sync_status: "pending".to_string(),
        x_version: 1,
        is_deleted: 0,
        filial_id: input.filial_id,
        codigo: input.codigo,
        nome: input.nome,
        padrao: padrao_val,
        ativo: 1,
    })
}

pub fn list_saldos(conn: &Connection, deposito_id: &str) -> Result<Vec<EstoqueSaldo>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT s.id, s.device_id, s.created_at, s.updated_at, s.x_sync_status, s.x_version, s.is_deleted,
                    s.deposito_id, s.produto_id, s.quantidade_atual, s.quantidade_reservada,
                    p.codigo_sku, p.descricao
             FROM estoque_saldos s
             JOIN produtos p ON p.id = s.produto_id
             WHERE s.deposito_id = ?1 AND s.is_deleted = 0
             ORDER BY p.descricao ASC;",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([deposito_id], |r| {
            Ok(EstoqueSaldo {
                id: r.get(0)?,
                device_id: r.get(1)?,
                created_at: r.get(2)?,
                updated_at: r.get(3)?,
                x_sync_status: r.get(4)?,
                x_version: r.get(5)?,
                is_deleted: r.get(6)?,
                deposito_id: r.get(7)?,
                produto_id: r.get(8)?,
                quantidade_atual: r.get(9)?,
                quantidade_reservada: r.get(10)?,
                codigo_sku: r.get(11)?,
                descricao_produto: r.get(12)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for r in rows {
        result.push(r.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

pub fn get_saldo_produto(
    conn: &Connection,
    deposito_id: &str,
    produto_id: &str,
) -> Result<EstoqueSaldo, String> {
    conn.query_row(
        "SELECT s.id, s.device_id, s.created_at, s.updated_at, s.x_sync_status, s.x_version, s.is_deleted,
                s.deposito_id, s.produto_id, s.quantidade_atual, s.quantidade_reservada,
                p.codigo_sku, p.descricao
         FROM estoque_saldos s
         JOIN produtos p ON p.id = s.produto_id
         WHERE s.deposito_id = ?1 AND s.produto_id = ?2;",
        params![deposito_id, produto_id],
        |r| {
            Ok(EstoqueSaldo {
                id: r.get(0)?,
                device_id: r.get(1)?,
                created_at: r.get(2)?,
                updated_at: r.get(3)?,
                x_sync_status: r.get(4)?,
                x_version: r.get(5)?,
                is_deleted: r.get(6)?,
                deposito_id: r.get(7)?,
                produto_id: r.get(8)?,
                quantidade_atual: r.get(9)?,
                quantidade_reservada: r.get(10)?,
                codigo_sku: r.get(11)?,
                descricao_produto: r.get(12)?,
            })
        },
    )
    .map_err(|e| format!("Saldo não encontrado para o produto no depósito: {}", e))
}
pub fn reserve_stock(
    conn: &mut Connection,
    device_id: &str,
    deposito_id: &str,
    produto_id: &str,
    quantidade: f64,
    origem_id: Option<String>,
) -> Result<EstoqueSaldo, String> {
    if quantidade <= 0.0 {
        return Err("A quantidade a reservar deve ser maior que zero".to_string());
    }

    let tx = conn
        .transaction()
        .map_err(|e| format!("Erro ao iniciar transação de reserva: {}", e))?;

    let now = Utc::now().to_rfc3339();

    let (saldo_atual, res_atual): (f64, f64) = tx
        .query_row(
            "SELECT quantidade_atual, quantidade_reservada FROM estoque_saldos WHERE deposito_id = ?1 AND produto_id = ?2;",
            params![deposito_id, produto_id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .unwrap_or((0.0, 0.0));

    let disponivel = saldo_atual - res_atual;
    if disponivel < quantidade {
        return Err(format!(
            "Saldo disponível insuficiente para reserva (Disponível: {:.2}, Solicitado: {:.2})",
            disponivel, quantidade
        ));
    }

    let nova_reserva = res_atual + quantidade;

    tx.execute(
        "INSERT INTO estoque_saldos (
            id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
            deposito_id, produto_id, quantidade_atual, quantidade_reservada
        ) VALUES (?1, ?2, ?3, ?4, 'pending', 1, 0, ?5, ?6, ?7, ?8)
        ON CONFLICT(deposito_id, produto_id) DO UPDATE SET
            quantidade_reservada = ?8,
            updated_at = ?4,
            x_sync_status = 'pending';",
        params![
            Uuid::new_v4().to_string(),
            device_id,
            now,
            now,
            deposito_id,
            produto_id,
            saldo_atual,
            nova_reserva
        ],
    )
    .map_err(|e| format!("Erro ao reservar estoque: {}", e))?;

    tx.execute(
        "INSERT INTO estoque_movimentacoes (
            id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
            deposito_id, produto_id, tipo, quantidade, saldo_anterior, saldo_posterior, origem_documento, origem_id, observacao
        ) VALUES (?1, ?2, ?3, ?4, 'pending', 1, 0, ?5, ?6, 'RESERVA', ?7, ?8, ?8, 'RESERVA_OFFLINE', ?9, 'Reserva de estoque offline');",
        params![
            Uuid::new_v4().to_string(),
            device_id,
            now,
            now,
            deposito_id,
            produto_id,
            quantidade,
            saldo_atual,
            origem_id
        ],
    )
    .map_err(|e| format!("Erro ao gravar movimentação de reserva: {}", e))?;

    tx.commit()
        .map_err(|e| format!("Erro ao confirmar transação de reserva: {}", e))?;

    get_saldo_produto(conn, deposito_id, produto_id)
}

pub fn transferir_estoque_entre_depositos(
    conn: &mut Connection,
    device_id: &str,
    input: &TransferenciaEstoqueInput,
) -> Result<String, String> {
    if input.deposito_origem_id == input.deposito_destino_id {
        return Err("O depósito de origem e destino devem ser diferentes".to_string());
    }

    let tx = conn
        .transaction()
        .map_err(|e| format!("Erro ao iniciar transação de transferência: {}", e))?;

    let now = Utc::now().to_rfc3339();
    let transf_id = Uuid::new_v4().to_string();

    for item in &input.itens {
        if item.quantidade <= 0.0 {
            return Err("A quantidade a transferir deve ser maior que zero".to_string());
        }

        let saldo_origem: f64 = tx
            .query_row(
                "SELECT quantidade_atual FROM estoque_saldos WHERE deposito_id = ?1 AND produto_id = ?2",
                params![input.deposito_origem_id, item.produto_id],
                |r| r.get(0),
            )
            .unwrap_or(0.0);

        if saldo_origem < item.quantidade {
            return Err(format!(
                "Saldo insuficiente no depósito de origem (Atual: {:.2}, Solicitado: {:.2})",
                saldo_origem, item.quantidade
            ));
        }

        let novo_saldo_origem = saldo_origem - item.quantidade;
        tx.execute(
            "UPDATE estoque_saldos SET quantidade_atual = ?1, updated_at = ?2, x_sync_status = 'pending' WHERE deposito_id = ?3 AND produto_id = ?4",
            params![novo_saldo_origem, now, input.deposito_origem_id, item.produto_id],
        )
        .map_err(|e| format!("Erro ao debitar depósito origem: {}", e))?;

        let saldo_destino: f64 = tx
            .query_row(
                "SELECT quantidade_atual FROM estoque_saldos WHERE deposito_id = ?1 AND produto_id = ?2",
                params![input.deposito_destino_id, item.produto_id],
                |r| r.get(0),
            )
            .unwrap_or(0.0);

        let novo_saldo_destino = saldo_destino + item.quantidade;
        tx.execute(
            "INSERT INTO estoque_saldos (
                id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
                deposito_id, produto_id, quantidade_atual, quantidade_reservada
            ) VALUES (?1, ?2, ?3, ?3, 'pending', 1, 0, ?4, ?5, ?6, 0.0)
            ON CONFLICT(deposito_id, produto_id) DO UPDATE SET
                quantidade_atual = ?6, updated_at = ?3, x_sync_status = 'pending'",
            params![
                Uuid::new_v4().to_string(),
                device_id,
                now,
                input.deposito_destino_id,
                item.produto_id,
                novo_saldo_destino
            ],
        )
        .map_err(|e| format!("Erro ao creditar depósito destino: {}", e))?;

        tx.execute(
            "INSERT INTO estoque_movimentacoes (
                id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
                deposito_id, produto_id, tipo, quantidade, saldo_anterior, saldo_posterior, origem_documento, origem_id, observacao
            ) VALUES (?1, ?2, ?3, ?3, 'pending', 1, 0, ?4, ?5, 'TRANSFERENCIA_SAIDA', ?6, ?7, ?8, 'TRANSFERENCIA', ?9, ?10)",
            params![
                Uuid::new_v4().to_string(),
                device_id,
                now,
                input.deposito_origem_id,
                item.produto_id,
                item.quantidade,
                saldo_origem,
                novo_saldo_origem,
                transf_id,
                format!("Transferência Saída para Depósito ID {}", input.deposito_destino_id)
            ],
        ).map_err(|e| format!("Erro ao gravar extrato de saída da transferência: {}", e))?;

        tx.execute(
            "INSERT INTO estoque_movimentacoes (
                id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
                deposito_id, produto_id, tipo, quantidade, saldo_anterior, saldo_posterior, origem_documento, origem_id, observacao
            ) VALUES (?1, ?2, ?3, ?3, 'pending', 1, 0, ?4, ?5, 'TRANSFERENCIA_ENTRADA', ?6, ?7, ?8, 'TRANSFERENCIA', ?9, ?10)",
            params![
                Uuid::new_v4().to_string(),
                device_id,
                now,
                input.deposito_destino_id,
                item.produto_id,
                item.quantidade,
                saldo_destino,
                novo_saldo_destino,
                transf_id,
                format!("Transferência Entrada do Depósito ID {}", input.deposito_origem_id)
            ],
        ).map_err(|e| format!("Erro ao gravar extrato de entrada da transferência: {}", e))?;
    }

    tx.execute(
        "INSERT INTO estoque_transferencias (
            id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
            deposito_origem_id, deposito_destino_id, numero_transferencia, status, observacao
        ) VALUES (?1, ?2, ?3, ?3, 'pending', 1, 0, ?4, ?5, 1, 'CONCLUIDA', ?6)",
        params![
            transf_id,
            device_id,
            now,
            input.deposito_origem_id,
            input.deposito_destino_id,
            input.observacao.clone().unwrap_or_else(|| "Transferência entre depósitos".to_string())
        ],
    ).map_err(|e| format!("Erro ao registrar transferência: {}", e))?;

    tx.commit().map_err(|e| e.to_string())?;

    Ok(transf_id)
}

pub fn adjust_stock(
    conn: &mut Connection,
    device_id: &str,
    input: AjusteEstoqueInput,
) -> Result<EstoqueSaldo, String> {
    if input.quantidade <= 0.0 {
        return Err("A quantidade do ajuste deve ser maior que zero".to_string());
    }

    let tx = conn
        .transaction()
        .map_err(|e| format!("Erro ao iniciar transação de ajuste: {}", e))?;

    let now = Utc::now().to_rfc3339();

    let (saldo_atual, res_atual): (f64, f64) = tx
        .query_row(
            "SELECT quantidade_atual, quantidade_reservada FROM estoque_saldos WHERE deposito_id = ?1 AND produto_id = ?2;",
            params![&input.deposito_id, &input.produto_id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .unwrap_or((0.0, 0.0));

    let saldo_novo = match input.tipo.to_uppercase().as_str() {
        "ENTRADA" => saldo_atual + input.quantidade,
        "SAIDA" => {
            if saldo_atual < input.quantidade {
                return Err(format!(
                    "Saldo atual em estoque ( {:.2} ) é menor que a quantidade de saída solicitada ( {:.2} )",
                    saldo_atual, input.quantidade
                ));
            }
            saldo_atual - input.quantidade
        }
        "AJUSTE" => input.quantidade,
        _ => return Err(format!("Tipo de movimentação inválido: {}", input.tipo)),
    };

    tx.execute(
        "INSERT INTO estoque_saldos (
            id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
            deposito_id, produto_id, quantidade_atual, quantidade_reservada
        ) VALUES (?1, ?2, ?3, ?4, 'pending', 1, 0, ?5, ?6, ?7, ?8)
        ON CONFLICT(deposito_id, produto_id) DO UPDATE SET
            quantidade_atual = ?7,
            updated_at = ?4,
            x_sync_status = 'pending';",
        params![
            Uuid::new_v4().to_string(),
            device_id,
            now,
            now,
            input.deposito_id,
            input.produto_id,
            saldo_novo,
            res_atual
        ],
    )
    .map_err(|e| format!("Erro ao atualizar saldo de estoque: {}", e))?;

    tx.execute(
        "INSERT INTO estoque_movimentacoes (
            id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
            deposito_id, produto_id, tipo, quantidade, saldo_anterior, saldo_posterior, origem_documento, origem_id, observacao
        ) VALUES (?1, ?2, ?3, ?4, 'pending', 1, 0, ?5, ?6, ?7, ?8, ?9, ?10, 'AJUSTE_MANUAL', ?1, ?11);",
        params![
            Uuid::new_v4().to_string(),
            device_id,
            now,
            now,
            input.deposito_id,
            input.produto_id,
            input.tipo.to_uppercase(),
            input.quantidade,
            saldo_atual,
            saldo_novo,
            input.observacao.unwrap_or_else(|| "Ajuste manual de estoque".to_string())
        ],
    )
    .map_err(|e| format!("Erro ao gravar estoque_movimentacoes: {}", e))?;

    tx.commit()
        .map_err(|e| format!("Erro ao confirmar transação de ajuste: {}", e))?;

    get_saldo_produto(conn, &input.deposito_id, &input.produto_id)
}

pub fn list_movimentacoes(
    conn: &Connection,
    deposito_id: &str,
    produto_id_filter: Option<String>,
) -> Result<Vec<EstoqueMovimentacao>, String> {
    let (sql, params_vec): (String, Vec<String>) = match produto_id_filter {
        Some(p_id) => (
            "SELECT m.id, m.device_id, m.created_at, m.updated_at, m.x_sync_status, m.x_version, m.is_deleted,
                    m.deposito_id, m.produto_id, m.tipo, m.quantidade, m.saldo_anterior, m.saldo_posterior,
                    m.origem_documento, m.origem_id, m.observacao, p.codigo_sku, p.descricao
             FROM estoque_movimentacoes m
             JOIN produtos p ON p.id = m.produto_id
             WHERE m.deposito_id = ?1 AND m.produto_id = ?2
             ORDER BY m.created_at DESC
             LIMIT 100;".to_string(),
            vec![deposito_id.to_string(), p_id],
        ),
        None => (
            "SELECT m.id, m.device_id, m.created_at, m.updated_at, m.x_sync_status, m.x_version, m.is_deleted,
                    m.deposito_id, m.produto_id, m.tipo, m.quantidade, m.saldo_anterior, m.saldo_posterior,
                    m.origem_documento, m.origem_id, m.observacao, p.codigo_sku, p.descricao
             FROM estoque_movimentacoes m
             JOIN produtos p ON p.id = m.produto_id
             WHERE m.deposito_id = ?1
             ORDER BY m.created_at DESC
             LIMIT 100;".to_string(),
            vec![deposito_id.to_string()],
        ),
    };

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(rusqlite::params_from_iter(params_vec.iter()), |r| {
            Ok(EstoqueMovimentacao {
                id: r.get(0)?,
                device_id: r.get(1)?,
                created_at: r.get(2)?,
                updated_at: r.get(3)?,
                x_sync_status: r.get(4)?,
                x_version: r.get(5)?,
                is_deleted: r.get(6)?,
                deposito_id: r.get(7)?,
                produto_id: r.get(8)?,
                tipo: r.get(9)?,
                quantidade: r.get(10)?,
                saldo_anterior: r.get(11)?,
                saldo_posterior: r.get(12)?,
                origem_documento: r.get(13)?,
                origem_id: r.get(14)?,
                observacao: r.get(15)?,
                codigo_sku: r.get(16)?,
                descricao_produto: r.get(17)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for r in rows {
        result.push(r.map_err(|e| e.to_string())?);
    }
    Ok(result)
}
