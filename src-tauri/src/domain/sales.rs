use chrono::{Duration, Utc};
use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SaleItemInput {
    pub produto_id: String,
    pub item_ordem: i64,
    pub quantidade: f64,
    pub preco_unitario: f64,
    pub desconto_unitario: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SalePaymentInput {
    pub forma_pagamento: String,
    pub valor: f64,
    pub troco: f64,
    pub nsu_autorizacao: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateSaleInput {
    pub filial_id: String,
    pub deposito_id: String,
    pub cliente_id: Option<String>,
    pub vendedor_id: Option<String>,
    pub valor_desconto_global: f64,
    pub observacoes: Option<String>,
    pub itens: Vec<SaleItemInput>,
    pub pagamentos: Vec<SalePaymentInput>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CalculatedSaleItem {
    pub id: String,
    pub produto_id: String,
    pub item_ordem: i64,
    pub quantidade: f64,
    pub preco_unitario: f64,
    pub desconto_unitario: f64,
    pub valor_total: f64,
    pub descricao_produto: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SaleHeader {
    pub id: String,
    pub device_id: String,
    pub created_at: String,
    pub updated_at: String,
    pub x_sync_status: String,
    pub x_version: i64,
    pub is_deleted: i64,
    pub filial_id: String,
    pub deposito_id: String,
    pub cliente_id: Option<String>,
    pub vendedor_id: Option<String>,
    pub numero_venda: i64,
    pub status: String,
    pub valor_subtotal: f64,
    pub valor_desconto: f64, // ALWAYS 0.00 per Rule-16
    pub valor_total: f64,
    pub observacoes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SaleDetails {
    pub header: SaleHeader,
    pub itens: Vec<CalculatedSaleItem>,
    pub pagamentos: Vec<SalePaymentInput>,
    pub chave_acesso_fiscal: Option<String>,
}

/// Core domain function to process an atomic sale with Rule-16 discount allocation
pub fn process_sale(
    conn: &mut Connection,
    device_id: &str,
    input: CreateSaleInput,
) -> Result<SaleHeader, String> {
    if input.itens.is_empty() {
        return Err("A venda deve conter pelo menos 1 item".to_string());
    }

    if input.pagamentos.is_empty() {
        return Err("A venda deve conter pelo menos 1 pagamento".to_string());
    }

    // 1. Calculate Gross Subtotal
    let mut gross_subtotal = 0.0;
    for item in &input.itens {
        if item.quantidade <= 0.0 {
            return Err("A quantidade do item deve ser maior que zero".to_string());
        }
        if item.preco_unitario < 0.0 {
            return Err("O preço unitário não pode ser negativo".to_string());
        }
        gross_subtotal += item.quantidade * item.preco_unitario;
    }

    // Sum explicit item-level discounts
    let item_discounts_total: f64 = input
        .itens
        .iter()
        .map(|i| i.quantidade * i.desconto_unitario)
        .sum();

    let total_discount_requested = input.valor_desconto_global + item_discounts_total;

    if total_discount_requested > gross_subtotal {
        return Err(format!(
            "O desconto total (R$ {:.2}) não pode ser maior que o subtotal bruto (R$ {:.2})",
            total_discount_requested, gross_subtotal
        ));
    }

    // 2. Rule-16 Discount Allocation per Item
    // Allocation formula: Item Allocated Discount = Total Discount * (Item Gross / Gross Subtotal)
    let mut calculated_items: Vec<CalculatedSaleItem> = Vec::new();
    let mut accumulated_discount = 0.0;

    let items_count = input.itens.len();
    for (idx, item) in input.itens.iter().enumerate() {
        let item_gross = item.quantidade * item.preco_unitario;
        let item_discount_share = if gross_subtotal > 0.0 {
            if idx == items_count - 1 {
                // Last item gets remaining discount to prevent rounding discrepancy
                (total_discount_requested - accumulated_discount * 100.0 / 100.0).max(0.0)
            } else {
                let share = (total_discount_requested * (item_gross / gross_subtotal) * 100.0).round() / 100.0;
                accumulated_discount += share;
                share
            }
        } else {
            0.0
        };

        let unit_discount = (item_discount_share / item.quantidade * 100.0).round() / 100.0;
        let item_net_total = (item_gross - item_discount_share).max(0.0);

        calculated_items.push(CalculatedSaleItem {
            id: Uuid::new_v4().to_string(),
            produto_id: item.produto_id.clone(),
            item_ordem: item.item_ordem,
            quantidade: item.quantidade,
            preco_unitario: item.preco_unitario,
            desconto_unitario: unit_discount,
            valor_total: item_net_total,
            descricao_produto: None,
        });
    }

    let net_total: f64 = calculated_items.iter().map(|i| i.valor_total).sum();

    // 3. Multi-payment validation
    let total_paid: f64 = input.pagamentos.iter().map(|p| p.valor).sum();
    let total_troco: f64 = input.pagamentos.iter().map(|p| p.troco).sum();
    let net_paid = total_paid - total_troco;

    if total_paid < net_total - 0.01 {
        return Err(format!(
            "Valor total pago (R$ {:.2}) é menor que o total líquido da venda (R$ {:.2})",
            total_paid, net_total
        ));
    }

    // Start SQLite Transaction
    let tx = conn
        .transaction()
        .map_err(|e| format!("Erro ao iniciar transação: {}", e))?;

    let sale_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let sync_status = "pending".to_string();
    let version = 1i64;
    let is_deleted = 0i64;

    // Next sale number for filial
    let numero_venda: i64 = {
        let mut stmt_seq = tx
            .prepare("SELECT COALESCE(MAX(numero_venda), 0) + 1 FROM vendas WHERE filial_id = ?1;")
            .map_err(|e| e.to_string())?;
        stmt_seq
            .query_row([&input.filial_id], |r| r.get(0))
            .map_err(|e| e.to_string())?
    };

    // RULE-16 ENFORCEMENT: Header valor_desconto MUST ALWAYS BE 0.00!
    let header_valor_desconto = 0.00;

    // Insert Venda Header
    tx.execute(
        "INSERT INTO vendas (
            id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
            filial_id, deposito_id, cliente_id, vendedor_id, numero_venda, status,
            valor_subtotal, valor_desconto, valor_total, observacoes
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, 'CONCLUIDA', ?13, ?14, ?15, ?16);",
        params![
            sale_id,
            device_id,
            now,
            now,
            sync_status,
            version,
            is_deleted,
            input.filial_id,
            input.deposito_id,
            input.cliente_id,
            input.vendedor_id,
            numero_venda,
            gross_subtotal,
            header_valor_desconto, // Always 0.00
            net_total,
            input.observacoes
        ],
    )
    .map_err(|e| format!("Erro ao gravar vendas: {}", e))?;

    // Insert Venda Itens & Update Stock
    for item in &calculated_items {
        tx.execute(
            "INSERT INTO vendas_itens (
                id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
                venda_id, produto_id, item_ordem, quantidade, preco_unitario, desconto_unitario, valor_total
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14);",
            params![
                item.id,
                device_id,
                now,
                now,
                sync_status,
                version,
                is_deleted,
                sale_id,
                item.produto_id,
                item.item_ordem,
                item.quantidade,
                item.preco_unitario,
                item.desconto_unitario,
                item.valor_total
            ],
        )
        .map_err(|e| format!("Erro ao gravar vendas_itens: {}", e))?;

        // Update Stock Balance in estoque_saldos
        let mut stmt_saldo = tx
            .prepare("SELECT quantidade_atual FROM estoque_saldos WHERE deposito_id = ?1 AND produto_id = ?2;")
            .map_err(|e| e.to_string())?;

        let saldo_atual: f64 = stmt_saldo
            .query_row(params![&input.deposito_id, &item.produto_id], |r| r.get(0))
            .unwrap_or(0.0);

        let saldo_novo = saldo_atual - item.quantidade;

        tx.execute(
            "INSERT INTO estoque_saldos (
                id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
                deposito_id, produto_id, quantidade_atual, quantidade_reservada
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 0.0)
            ON CONFLICT(deposito_id, produto_id) DO UPDATE SET
                quantidade_atual = ?10,
                updated_at = ?4,
                x_sync_status = 'pending';",
            params![
                Uuid::new_v4().to_string(),
                device_id,
                now,
                now,
                sync_status,
                version,
                is_deleted,
                input.deposito_id,
                item.produto_id,
                saldo_novo
            ],
        )
        .map_err(|e| format!("Erro ao atualizar estoque_saldos: {}", e))?;

        // Record stock movement (SAIDA)
        let mov_id = Uuid::new_v4().to_string();
        let obs_mov = format!("Venda #{}", numero_venda);
        tx.execute(
            "INSERT INTO estoque_movimentacoes (
                id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
                deposito_id, produto_id, tipo, quantidade, saldo_anterior, saldo_posterior, origem_documento, origem_id, observacao
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 'SAIDA', ?10, ?11, ?12, 'VENDA', ?13, ?14);",
            params![
                mov_id,
                device_id,
                now,
                now,
                sync_status,
                version,
                is_deleted,
                input.deposito_id,
                item.produto_id,
                item.quantidade,
                saldo_atual,
                saldo_novo,
                sale_id,
                obs_mov
            ],
        )
        .map_err(|e| format!("Erro ao gravar estoque_movimentacoes: {}", e))?;
    }

    // Insert Payments, Cash movements & Financial Entries
    for pag in &input.pagamentos {
        let pag_id = Uuid::new_v4().to_string();
        tx.execute(
            "INSERT INTO vendas_pagamentos (
                id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
                venda_id, forma_pagamento, valor, troco, nsu_autorizacao
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12);",
            params![
                pag_id,
                device_id,
                now,
                now,
                sync_status,
                version,
                is_deleted,
                sale_id,
                pag.forma_pagamento,
                pag.valor,
                pag.troco,
                pag.nsu_autorizacao
            ],
        )
        .map_err(|e| format!("Erro ao gravar vendas_pagamentos: {}", e))?;

        let valor_liquido_pagamento = (pag.valor - pag.troco).max(0.0);

        // Record cash movement
        let (tipo_caixa, obs_caixa) = match pag.forma_pagamento.as_str() {
            "DINHEIRO" => ("VENDA_DINHEIRO", format!("Venda #{} em Dinheiro", numero_venda)),
            _ => ("VENDA_OUTROS", format!("Venda #{} ({})", numero_venda, pag.forma_pagamento)),
        };

        if valor_liquido_pagamento > 0.0 {
            tx.execute(
                "INSERT INTO caixa_movimentacoes (
                    id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
                    filial_id, dispositivo_id, tipo, valor, observacao, usuario_id
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13);",
                params![
                    Uuid::new_v4().to_string(),
                    device_id,
                    now,
                    now,
                    sync_status,
                    version,
                    is_deleted,
                    input.filial_id,
                    device_id,
                    tipo_caixa,
                    valor_liquido_pagamento,
                    obs_caixa,
                    input.vendedor_id
                ],
            )
            .map_err(|e| format!("Erro ao gravar caixa_movimentacoes: {}", e))?;
        }

        // Automatic Financial Accounts Receivable / Payable (financeiro_lancamentos)
        let (status_fin, valor_pago_fin, data_pagamento_fin, data_venc_fin) =
            if ["DINHEIRO", "PIX", "CARTAO_CREDITO", "CARTAO_DEBITO"].contains(&pag.forma_pagamento.as_str()) {
                ("PAGO", valor_liquido_pagamento, Some(now.clone()), now.clone())
            } else {
                let due_date = (Utc::now() + Duration::days(30)).to_rfc3339();
                ("PENDENTE", 0.0, None, due_date)
            };

        if valor_liquido_pagamento > 0.0 {
            tx.execute(
                "INSERT INTO financeiro_lancamentos (
                    id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
                    filial_id, pessoa_id, venda_id, tipo, descricao, valor_total, valor_pago, data_vencimento, data_pagamento, status
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 'RECEBER', ?11, ?12, ?13, ?14, ?15, ?16);",
                params![
                    Uuid::new_v4().to_string(),
                    device_id,
                    now,
                    now,
                    sync_status,
                    version,
                    is_deleted,
                    input.filial_id,
                    input.cliente_id,
                    sale_id,
                    format!("Venda #{} - {}", numero_venda, pag.forma_pagamento),
                    valor_liquido_pagamento,
                    valor_pago_fin,
                    data_venc_fin,
                    data_pagamento_fin,
                    status_fin
                ],
            )
            .map_err(|e| format!("Erro ao gravar financeiro_lancamentos: {}", e))?;
        }
    }

    tx.commit()
        .map_err(|e| format!("Erro ao confirmar transação da venda: {}", e))?;

    Ok(SaleHeader {
        id: sale_id,
        device_id: device_id.to_string(),
        created_at: now.clone(),
        updated_at: now,
        x_sync_status: sync_status,
        x_version: version,
        is_deleted,
        filial_id: input.filial_id,
        deposito_id: input.deposito_id,
        cliente_id: input.cliente_id,
        vendedor_id: input.vendedor_id,
        numero_venda,
        status: "CONCLUIDA".to_string(),
        valor_subtotal: gross_subtotal,
        valor_desconto: header_valor_desconto,
        valor_total: net_total,
        observacoes: input.observacoes,
    })
}

/// Cancels an existing sale, reversing stock and creating financial reversal records
pub fn cancel_sale(
    conn: &mut Connection,
    device_id: &str,
    venda_id: &str,
    motivo: &str,
) -> Result<SaleHeader, String> {
    let now = Utc::now().to_rfc3339();

    // 1. Fetch sale header
    let header = get_venda_header(conn, venda_id)?;
    if header.status == "CANCELADA" {
        return Err("Esta venda já foi cancelada anteriormente".to_string());
    }

    let tx = conn
        .transaction()
        .map_err(|e| format!("Erro ao iniciar transação de cancelamento: {}", e))?;

    // Update sale status
    tx.execute(
        "UPDATE vendas SET status = 'CANCELADA', updated_at = ?1, x_sync_status = 'pending' WHERE id = ?2;",
        params![now, venda_id],
    )
    .map_err(|e| format!("Erro ao atualizar status da venda: {}", e))?;

    let items: Vec<(String, f64)> = {
        let mut stmt_itens = tx
            .prepare("SELECT produto_id, quantidade FROM vendas_itens WHERE venda_id = ?1;")
            .map_err(|e| e.to_string())?;

        let mapped = stmt_itens
            .query_map([venda_id], |r| Ok((r.get::<_, String>(0)?, r.get::<_, f64>(1)?)))
            .map_err(|e| e.to_string())?;

        let mut res = Vec::new();
        for item in mapped {
            if let Ok(pair) = item {
                res.push(pair);
            }
        }
        res
    };

    for (produto_id, quantidade) in items {
        // Fetch current stock
        let saldo_atual: f64 = tx
            .query_row(
                "SELECT quantidade_atual FROM estoque_saldos WHERE deposito_id = ?1 AND produto_id = ?2;",
                params![header.deposito_id, produto_id],
                |r| r.get(0),
            )
            .unwrap_or(0.0);

        let saldo_novo = saldo_atual + quantidade;

        tx.execute(
            "UPDATE estoque_saldos SET quantidade_atual = ?1, updated_at = ?2, x_sync_status = 'pending' WHERE deposito_id = ?3 AND produto_id = ?4;",
            params![saldo_novo, now, header.deposito_id, produto_id],
        )
        .map_err(|e| format!("Erro ao estornar estoque_saldos: {}", e))?;

        // Record stock movement (CANCELAMENTO)
        tx.execute(
            "INSERT INTO estoque_movimentacoes (
                id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
                deposito_id, produto_id, tipo, quantidade, saldo_anterior, saldo_posterior, origem_documento, origem_id, observacao
            ) VALUES (?1, ?2, ?3, ?4, 'pending', 1, 0, ?5, ?6, 'CANCELAMENTO', ?7, ?8, ?9, 'CANCELAMENTO_VENDA', ?10, ?11);",
            params![
                Uuid::new_v4().to_string(),
                device_id,
                now,
                now,
                header.deposito_id,
                produto_id,
                quantidade,
                saldo_atual,
                saldo_novo,
                venda_id,
                format!("Cancelamento Venda #{}: {}", header.numero_venda, motivo)
            ],
        )
        .map_err(|e| format!("Erro ao gravar estorno no estoque_movimentacoes: {}", e))?;
    }

    // Cancel financial entries
    tx.execute(
        "UPDATE financeiro_lancamentos SET status = 'CANCELADO', updated_at = ?1, x_sync_status = 'pending' WHERE venda_id = ?2;",
        params![now, venda_id],
    )
    .map_err(|e| format!("Erro ao cancelar financeiro_lancamentos: {}", e))?;

    // Record cash cancellation movement
    tx.execute(
        "INSERT INTO caixa_movimentacoes (
            id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
            filial_id, dispositivo_id, tipo, valor, observacao, usuario_id
        ) VALUES (?1, ?2, ?3, ?4, 'pending', 1, 0, ?5, ?6, 'CANCELAMENTO_VENDA', ?7, ?8, ?9);",
        params![
            Uuid::new_v4().to_string(),
            device_id,
            now,
            now,
            header.filial_id,
            device_id,
            header.valor_total,
            format!("Cancelamento Venda #{}: {}", header.numero_venda, motivo),
            header.vendedor_id
        ],
    )
    .map_err(|e| format!("Erro ao registrar cancelamento em caixa_movimentacoes: {}", e))?;

    tx.commit()
        .map_err(|e| format!("Erro ao confirmar transação de cancelamento: {}", e))?;

    let mut updated_header = header;
    updated_header.status = "CANCELADA".to_string();
    updated_header.updated_at = now;
    Ok(updated_header)
}

pub fn get_venda_header(conn: &Connection, venda_id: &str) -> Result<SaleHeader, String> {
    conn.query_row(
        "SELECT id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
                filial_id, deposito_id, cliente_id, vendedor_id, numero_venda, status,
                valor_subtotal, valor_desconto, valor_total, observacoes
         FROM vendas WHERE id = ?1;",
        [venda_id],
        |r| {
            Ok(SaleHeader {
                id: r.get(0)?,
                device_id: r.get(1)?,
                created_at: r.get(2)?,
                updated_at: r.get(3)?,
                x_sync_status: r.get(4)?,
                x_version: r.get(5)?,
                is_deleted: r.get(6)?,
                filial_id: r.get(7)?,
                deposito_id: r.get(8)?,
                cliente_id: r.get(9)?,
                vendedor_id: r.get(10)?,
                numero_venda: r.get(11)?,
                status: r.get(12)?,
                valor_subtotal: r.get(13)?,
                valor_desconto: r.get(14)?,
                valor_total: r.get(15)?,
                observacoes: r.get(16)?,
            })
        },
    )
    .map_err(|e| format!("Venda não encontrada: {}", e))
}

pub fn get_venda_details(conn: &Connection, venda_id: &str) -> Result<SaleDetails, String> {
    let header = get_venda_header(conn, venda_id)?;

    let mut stmt_itens = conn
        .prepare(
            "SELECT i.id, i.produto_id, i.item_ordem, i.quantidade, i.preco_unitario, i.desconto_unitario, i.valor_total, p.descricao
             FROM vendas_itens i
             LEFT JOIN produtos p ON p.id = i.produto_id
             WHERE i.venda_id = ?1 ORDER BY i.item_ordem ASC;",
        )
        .map_err(|e| e.to_string())?;

    let itens = stmt_itens
        .query_map([venda_id], |r| {
            Ok(CalculatedSaleItem {
                id: r.get(0)?,
                produto_id: r.get(1)?,
                item_ordem: r.get(2)?,
                quantidade: r.get(3)?,
                preco_unitario: r.get(4)?,
                desconto_unitario: r.get(5)?,
                valor_total: r.get(6)?,
                descricao_produto: r.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let mut stmt_pag = conn
        .prepare("SELECT forma_pagamento, valor, troco, nsu_autorizacao FROM vendas_pagamentos WHERE venda_id = ?1;")
        .map_err(|e| e.to_string())?;

    let pagamentos = stmt_pag
        .query_map([venda_id], |r| {
            Ok(SalePaymentInput {
                forma_pagamento: r.get(0)?,
                valor: r.get(1)?,
                troco: r.get(2)?,
                nsu_autorizacao: r.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let chave_fiscal: Option<String> = conn
        .query_row(
            "SELECT chave_acesso FROM documentos_fiscais WHERE venda_id = ?1 LIMIT 1;",
            [venda_id],
            |r| r.get(0),
        )
        .ok();

    Ok(SaleDetails {
        header,
        itens,
        pagamentos,
        chave_acesso_fiscal: chave_fiscal,
    })
}

pub fn list_vendas_filial(conn: &Connection, filial_id: &str) -> Result<Vec<SaleHeader>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
                    filial_id, deposito_id, cliente_id, vendedor_id, numero_venda, status,
                    valor_subtotal, valor_desconto, valor_total, observacoes
             FROM vendas WHERE filial_id = ?1 AND is_deleted = 0
             ORDER BY numero_venda DESC;",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([filial_id], |r| {
            Ok(SaleHeader {
                id: r.get(0)?,
                device_id: r.get(1)?,
                created_at: r.get(2)?,
                updated_at: r.get(3)?,
                x_sync_status: r.get(4)?,
                x_version: r.get(5)?,
                is_deleted: r.get(6)?,
                filial_id: r.get(7)?,
                deposito_id: r.get(8)?,
                cliente_id: r.get(9)?,
                vendedor_id: r.get(10)?,
                numero_venda: r.get(11)?,
                status: r.get(12)?,
                valor_subtotal: r.get(13)?,
                valor_desconto: r.get(14)?,
                valor_total: r.get(15)?,
                observacoes: r.get(16)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for r in rows {
        result.push(r.map_err(|e| e.to_string())?);
    }
    Ok(result)
}
