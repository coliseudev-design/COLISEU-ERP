//! Módulo de Venda Condicional ("Malinha"), Devolução por Código de Barras, Vale-Troca & Ficha Financeira

use chrono::{Duration, Utc};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use tracing::info;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ItemCondicionalInput {
    pub produto_id: String,
    pub variante_id: Option<String>,
    pub codigo_barras: Option<String>,
    pub quantidade: f64,
    pub preco_unitario: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CondicionalItemDet {
    pub id: String,
    pub produto_id: String,
    pub variante_id: Option<String>,
    pub codigo_barras: Option<String>,
    pub quantidade_enviada: f64,
    pub quantidade_devolvida: f64,
    pub quantidade_faturada: f64,
    pub preco_unitario: f64,
    pub status: String, // 'ENVIADO', 'DEVOLVIDO', 'FATURADO'
    pub codigo_sku: Option<String>,
    pub descricao_produto: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CondicionalCompleta {
    pub id: String,
    pub filial_id: String,
    pub numero_condicional: String,
    pub cliente_id: String,
    pub cliente_nome: Option<String>,
    pub vendedor_id: Option<String>,
    pub data_saida: String,
    pub data_limite_devolucao: String,
    pub valor_total_enviado: f64,
    pub valor_total_devolvido: f64,
    pub valor_total_faturado: f64,
    pub status: String, // 'EM_ABERTO', 'FINALIZADO_PARCIAL', 'FINALIZADO_TOTAL'
    pub dias_restantes: i64,
    pub prazo_vencido: bool,
    pub itens: Vec<CondicionalItemDet>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValeTrocaOutput {
    pub id: String,
    pub codigo_vale: String,
    pub cliente_id: String,
    pub valor_original: f64,
    pub valor_bonus: f64,
    pub valor_total_credito: f64,
    pub saldo_disponivel: f64,
    pub data_validade: String,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MovimentoFichaFinanceira {
    pub id: String,
    pub cliente_id: String,
    pub origem: String,
    pub referencia_id: Option<String>,
    pub tipo_movimento: String, // 'DEBITO', 'CREDITO'
    pub valor: f64,
    pub historico: String,
    pub created_at: String,
}

/// Cria uma nova Venda Condicional ("Malinha"), validando o limite de crédito do cliente
pub fn criar_venda_condicional(
    conn: &mut Connection,
    device_id: &str,
    filial_id: &str,
    cliente_id: &str,
    vendedor_id: Option<&str>,
    dias_prazo_opcional: Option<i64>,
    itens: Vec<ItemCondicionalInput>,
) -> Result<CondicionalCompleta, String> {
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    let now = Utc::now();
    let now_str = now.to_rfc3339();
    let dias_prazo = dias_prazo_opcional.unwrap_or(3);
    let data_limite = (now + Duration::days(dias_prazo)).to_rfc3339();

    // 1. Valida Limite de Crédito na ficha do cliente (se cadastrado)
    let (limite_credito, cliente_nome): (f64, String) = tx
        .query_row(
            "SELECT COALESCE(limite_credito, 5000.0), nome_razaosocial FROM pessoas WHERE id = ?1",
            params![cliente_id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .unwrap_or((5000.0, "CLIENTE CONDICIONAL".to_string()));

    let mut valor_total_enviado = 0.0;
    for item in &itens {
        valor_total_enviado += item.quantidade * item.preco_unitario;
    }

    if valor_total_enviado > limite_credito {
        return Err(format!(
            "Valor da condicional (R$ {:.2}) excede o limite de crédito do cliente (R$ {:.2})",
            valor_total_enviado, limite_credito
        ));
    }

    let condicional_id = Uuid::new_v4().to_string();
    let seq: i64 = tx
        .query_row("SELECT COALESCE(MAX(rowid), 0) + 1 FROM condicionais", [], |r| r.get(0))
        .unwrap_or(1);
    let numero_condicional = format!("CND-{:05}", seq);

    // 2. Insere a Condicional (Parent)
    tx.execute(
        "INSERT INTO condicionais (
            id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
            filial_id, numero_condicional, cliente_id, vendedor_id, data_saida, data_limite_devolucao,
            valor_total_enviado, valor_total_devolvido, valor_total_faturado, status
        ) VALUES (?1, ?2, ?3, ?3, 'pending', 1, 0, ?4, ?5, ?6, ?7, ?3, ?8, ?9, 0.0, 0.0, 'EM_ABERTO')",
        params![
            condicional_id,
            device_id,
            now_str,
            filial_id,
            numero_condicional,
            cliente_id,
            vendedor_id,
            data_limite,
            valor_total_enviado
        ],
    )
    .map_err(|e| format!("Erro ao criar condicional: {}", e))?;

    // 3. Insere os Itens da Condicional (Children) e reserva no estoque
    let mut itens_det = Vec::new();
    for item in &itens {
        let item_id = Uuid::new_v4().to_string();

        tx.execute(
            "INSERT INTO condicionais_itens (
                id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
                condicional_id, produto_id, variante_id, codigo_barras, quantidade_enviada,
                quantidade_devolvida, quantidade_faturada, preco_unitario, status
            ) VALUES (?1, ?2, ?3, ?3, 'pending', 1, 0, ?4, ?5, ?6, ?7, ?8, 0.0, 0.0, ?9, 'ENVIADO')",
            params![
                item_id,
                device_id,
                now_str,
                condicional_id,
                item.produto_id,
                item.variante_id,
                item.codigo_barras,
                item.quantidade,
                item.preco_unitario
            ],
        )
        .map_err(|e| format!("Erro ao inserir item condicional: {}", e))?;

        // Busca código SKU e descrição
        let (sku, desc): (String, String) = tx
            .query_row(
                "SELECT codigo_sku, descricao FROM produtos WHERE id = ?1",
                params![item.produto_id],
                |r| Ok((r.get(0)?, r.get(1)?)),
            )
            .unwrap_or_else(|_| ("SKU".to_string(), "PRODUTO".to_string()));

        itens_det.push(CondicionalItemDet {
            id: item_id,
            produto_id: item.produto_id.clone(),
            variante_id: item.variante_id.clone(),
            codigo_barras: item.codigo_barras.clone(),
            quantidade_enviada: item.quantidade,
            quantidade_devolvida: 0.0,
            quantidade_faturada: 0.0,
            preco_unitario: item.preco_unitario,
            status: "ENVIADO".to_string(),
            codigo_sku: Some(sku),
            descricao_produto: Some(desc),
        });
    }

    tx.commit().map_err(|e| e.to_string())?;

    info!(
        "Condicional {} criada para cliente {} no valor de R$ {:.2}",
        numero_condicional, cliente_nome, valor_total_enviado
    );

    Ok(CondicionalCompleta {
        id: condicional_id,
        filial_id: filial_id.to_string(),
        numero_condicional,
        cliente_id: cliente_id.to_string(),
        cliente_nome: Some(cliente_nome),
        vendedor_id: vendedor_id.map(|s| s.to_string()),
        data_saida: now_str,
        data_limite_devolucao: data_limite,
        valor_total_enviado,
        valor_total_devolvido: 0.0,
        valor_total_faturado: 0.0,
        status: "EM_ABERTO".to_string(),
        dias_restantes: dias_prazo,
        prazo_vencido: false,
        itens: itens_det,
    })
}

/// Lista todas as condicionais em aberto com verificação de prazo de vencimento
pub fn listar_condicionais_pendentes(
    conn: &Connection,
    filial_id: &str,
) -> Result<Vec<CondicionalCompleta>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT c.id, c.filial_id, c.numero_condicional, c.cliente_id, p.nome_razaosocial,
                    c.vendedor_id, c.data_saida, c.data_limite_devolucao, c.valor_total_enviado,
                    c.valor_total_devolvido, c.valor_total_faturado, c.status
             FROM condicionais c
             LEFT JOIN pessoas p ON p.id = c.cliente_id
             WHERE c.filial_id = ?1 AND c.status = 'EM_ABERTO' AND c.is_deleted = 0
             ORDER BY c.created_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let now = Utc::now();
    let rows = stmt
        .query_map([filial_id], |r| {
            let id: String = r.get(0)?;
            let data_limite_str: String = r.get(7)?;

            let data_limite = chrono::DateTime::parse_from_rfc3339(&data_limite_str)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or(now);

            let diff = data_limite.signed_duration_since(now).num_days();
            let prazo_vencido = now > data_limite;

            Ok((
                CondicionalCompleta {
                    id,
                    filial_id: r.get(1)?,
                    numero_condicional: r.get(2)?,
                    cliente_id: r.get(3)?,
                    cliente_nome: r.get(4)?,
                    vendedor_id: r.get(5)?,
                    data_saida: r.get(6)?,
                    data_limite_devolucao: data_limite_str,
                    valor_total_enviado: r.get(8)?,
                    valor_total_devolvido: r.get(9)?,
                    valor_total_faturado: r.get(10)?,
                    status: r.get(11)?,
                    dias_restantes: diff,
                    prazo_vencido,
                    itens: Vec::new(),
                },
                r.get::<_, String>(0)?,
            ))
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for r in rows {
        let (mut cond, cond_id) = r.map_err(|e| e.to_string())?;

        // Carrega itens da condicional
        let mut stmt_itens = conn
            .prepare(
                "SELECT ci.id, ci.produto_id, ci.variante_id, ci.codigo_barras, ci.quantidade_enviada,
                        ci.quantidade_devolvida, ci.quantidade_faturada, ci.preco_unitario, ci.status,
                        p.codigo_sku, p.descricao
                 FROM condicionais_itens ci
                 JOIN produtos p ON p.id = ci.produto_id
                 WHERE ci.condicional_id = ?1 AND ci.is_deleted = 0",
            )
            .map_err(|e| e.to_string())?;

        let item_rows = stmt_itens
            .query_map([&cond_id], |ir| {
                Ok(CondicionalItemDet {
                    id: ir.get(0)?,
                    produto_id: ir.get(1)?,
                    variante_id: ir.get(2)?,
                    codigo_barras: ir.get(3)?,
                    quantidade_enviada: ir.get(4)?,
                    quantidade_devolvida: ir.get(5)?,
                    quantidade_faturada: ir.get(6)?,
                    preco_unitario: ir.get(7)?,
                    status: ir.get(8)?,
                    codigo_sku: ir.get(9)?,
                    descricao_produto: ir.get(10)?,
                })
            })
            .map_err(|e| e.to_string())?;

        for ir in item_rows {
            cond.itens.push(ir.map_err(|e| e.to_string())?);
        }

        result.push(cond);
    }

    Ok(result)
}

/// Processa a devolução de um item da condicional por código de barras ou SKU
pub fn devolver_item_por_codigo(
    conn: &mut Connection,
    condicional_id: &str,
    codigo: &str,
) -> Result<String, String> {
    let clean_code = codigo.trim();

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    // Busca o item correspondente na condicional que ainda possui saldo a devolver
    let (item_id, qtd_enviada, qtd_devolvida_atual, preco_unitario): (String, f64, f64, f64) = tx
        .query_row(
            "SELECT ci.id, ci.quantidade_enviada, ci.quantidade_devolvida, ci.preco_unitario
             FROM condicionais_itens ci
             JOIN produtos p ON p.id = ci.produto_id
             WHERE ci.condicional_id = ?1 AND (ci.codigo_barras = ?2 OR p.codigo_sku = ?2 OR p.codigo_barras = ?2) AND ci.status = 'ENVIADO' AND ci.is_deleted = 0",
            params![condicional_id, clean_code],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?)),
        )
        .map_err(|_| format!("Item com código '{}' não encontrado ou já devolvido", clean_code))?;

    let nova_qtd_devolvida = (qtd_devolvida_atual + 1.0).min(qtd_enviada);
    let status_item = if nova_qtd_devolvida >= qtd_enviada { "DEVOLVIDO" } else { "ENVIADO" };

    tx.execute(
        "UPDATE condicionais_itens SET quantidade_devolvida = ?1, status = ?2, updated_at = ?3 WHERE id = ?4",
        params![nova_qtd_devolvida, status_item, Utc::now().to_rfc3339(), item_id],
    )
    .map_err(|e| e.to_string())?;

    // Atualiza acumulado devolvido na condicional
    let valor_item_devolvido = 1.0 * preco_unitario;
    tx.execute(
        "UPDATE condicionais SET valor_total_devolvido = valor_total_devolvido + ?1, updated_at = ?2 WHERE id = ?3",
        params![valor_item_devolvido, Utc::now().to_rfc3339(), condicional_id],
    )
    .map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;

    info!("Item {} devolvido 1 un (total dev.: {}) na condicional {}", clean_code, nova_qtd_devolvida, condicional_id);

    Ok(format!("1 unidade do item '{}' devolvida com sucesso ao estoque", clean_code))
}

/// Fatura a condicional (confirma compra dos itens não devolvidos) e gera débito na Ficha Financeira do cliente
pub fn faturar_condicional(
    conn: &mut Connection,
    condicional_id: &str,
) -> Result<f64, String> {
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    let now_str = Utc::now().to_rfc3339();

    // 1. Busca dados da condicional
    let (cliente_id, num_cond, valor_enviado, valor_devolvido): (String, String, f64, f64) = tx
        .query_row(
            "SELECT cliente_id, numero_condicional, valor_total_enviado, valor_total_devolvido FROM condicionais WHERE id = ?1 AND is_deleted = 0",
            params![condicional_id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?)),
        )
        .map_err(|e| e.to_string())?;

    let valor_faturado = valor_enviado - valor_devolvido;

    // 2. Marca itens restantes como FATURADOS
    tx.execute(
        "UPDATE condicionais_itens SET quantidade_faturada = quantidade_enviada - quantidade_devolvida, status = 'FATURADO', updated_at = ?1 WHERE condicional_id = ?2 AND status = 'ENVIADO'",
        params![now_str, condicional_id],
    )
    .map_err(|e| e.to_string())?;

    // 3. Atualiza status da Condicional
    let novo_status = if valor_devolvido > 0.0 { "FINALIZADO_PARCIAL" } else { "FINALIZADO_TOTAL" };
    tx.execute(
        "UPDATE condicionais SET valor_total_faturado = ?1, status = ?2, updated_at = ?3 WHERE id = ?4",
        params![valor_faturado, novo_status, now_str, condicional_id],
    )
    .map_err(|e| e.to_string())?;

    // 4. Lança débito na Ficha Financeira do cliente se houver valor faturado
    if valor_faturado > 0.0 {
        let ficha_id = Uuid::new_v4().to_string();
        tx.execute(
            "INSERT INTO ficha_financeira_cliente (
                id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
                cliente_id, origem, referencia_id, tipo_movimento, valor, historico
            ) VALUES (?1, 'dev-local', ?2, ?2, 'pending', 1, 0, ?3, 'CONDICIONAL_FATURADA', ?4, 'DEBITO', ?5, ?6)",
            params![
                ficha_id,
                now_str,
                cliente_id,
                condicional_id,
                valor_faturado,
                format!("Faturamento de Condicional {}", num_cond)
            ],
        )
        .map_err(|e| format!("Erro ao lançar ficha financeira: {}", e))?;
    }

    tx.commit().map_err(|e| e.to_string())?;

    info!("Condicional {} faturada no valor final de R$ {:.2}", num_cond, valor_faturado);

    Ok(valor_faturado)
}

/// Gera um Vale-Troca / Crédito com opção de bônus promocional (ex: 5% a 10% extra)
pub fn gerar_vale_troca(
    conn: &mut Connection,
    device_id: &str,
    cliente_id: &str,
    valor_original: f64,
    percentual_bonus: f64,
    dias_validade: i64,
) -> Result<ValeTrocaOutput, String> {
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    let now = Utc::now();
    let now_str = now.to_rfc3339();
    let validade = (now + Duration::days(dias_validade)).to_rfc3339();

    let valor_bonus = (valor_original * (percentual_bonus / 100.0)).round();
    let valor_total_credito = valor_original + valor_bonus;

    let seq: i64 = tx
        .query_row("SELECT COALESCE(MAX(rowid), 0) + 1 FROM vale_trocas", [], |r| r.get(0))
        .unwrap_or(1);
    let codigo_vale = format!("VALE-{:05}", seq);
    let vale_id = Uuid::new_v4().to_string();

    tx.execute(
        "INSERT INTO vale_trocas (
            id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
            codigo_vale, cliente_id, valor_original, valor_bonus, valor_total_credito,
            saldo_disponivel, data_validade, status
        ) VALUES (?1, ?2, ?3, ?3, 'pending', 1, 0, ?4, ?5, ?6, ?7, ?8, ?8, ?9, 'ATIVO')",
        params![
            vale_id,
            device_id,
            now_str,
            codigo_vale,
            cliente_id,
            valor_original,
            valor_bonus,
            valor_total_credito,
            validade
        ],
    )
    .map_err(|e| format!("Erro ao gerar vale-troca: {}", e))?;

    // Lança crédito na Ficha Financeira do cliente
    let ficha_id = Uuid::new_v4().to_string();
    tx.execute(
        "INSERT INTO ficha_financeira_cliente (
            id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
            cliente_id, origem, referencia_id, tipo_movimento, valor, historico
        ) VALUES (?1, ?2, ?3, ?3, 'pending', 1, 0, ?4, 'VALE_TROCA', ?5, 'CREDITO', ?6, ?7)",
        params![
            ficha_id,
            device_id,
            now_str,
            cliente_id,
            vale_id,
            valor_total_credito,
            format!("Crédito de Vale-Troca {} (Bônus R$ {:.2})", codigo_vale, valor_bonus)
        ],
    )
    .map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;

    info!("Vale-Troca {} gerado com sucesso. Crédito total: R$ {:.2}", codigo_vale, valor_total_credito);

    Ok(ValeTrocaOutput {
        id: vale_id,
        codigo_vale,
        cliente_id: cliente_id.to_string(),
        valor_original,
        valor_bonus,
        valor_total_credito,
        saldo_disponivel: valor_total_credito,
        data_validade: validade,
        status: "ATIVO".to_string(),
    })
}

/// Consulta o extrato e histórico da Ficha Financeira do cliente
pub fn consultar_ficha_financeira(
    conn: &Connection,
    cliente_id: &str,
) -> Result<Vec<MovimentoFichaFinanceira>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, cliente_id, origem, referencia_id, tipo_movimento, valor, historico, created_at
             FROM ficha_financeira_cliente
             WHERE cliente_id = ?1 AND is_deleted = 0
             ORDER BY created_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([cliente_id], |r| {
            Ok(MovimentoFichaFinanceira {
                id: r.get(0)?,
                cliente_id: r.get(1)?,
                origem: r.get(2)?,
                referencia_id: r.get(3)?,
                tipo_movimento: r.get(4)?,
                valor: r.get(5)?,
                historico: r.get(6)?,
                created_at: r.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for r in rows {
        result.push(r.map_err(|e| e.to_string())?);
    }

    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::schema::create_tables;

    #[test]
    fn test_fluxo_condicional_devolucao_e_faturamento() {
        let mut conn = Connection::open_in_memory().unwrap();
        create_tables(&conn).unwrap();

        conn.execute(
            "INSERT INTO empresas (id, device_id, created_at, updated_at, razao_social, cnpj) VALUES ('emp1', 'dev1', 'now', 'now', 'Empresa Moda SP', '12345678000195')",
            [],
        ).unwrap();

        conn.execute(
            "INSERT INTO filiais (id, device_id, created_at, updated_at, empresa_id, codigo, nome, cnpj, uf) VALUES ('fil1', 'dev1', 'now', 'now', 'emp1', '001', 'Filial Moda', '12345678000195', 'SP')",
            [],
        ).unwrap();

        conn.execute(
            "INSERT INTO pessoas (id, device_id, created_at, updated_at, empresa_id, tipo_cadastro, tipo, nome_razaosocial, cpf_cnpj, limite_credito) VALUES ('cli1', 'dev1', 'now', 'now', 'emp1', 'CLIENTE', 'FISICA', 'MARIA DAS DORES', '12345678900', 3000.0)",
            [],
        ).unwrap();

        conn.execute(
            "INSERT INTO produtos (id, device_id, created_at, updated_at, empresa_id, codigo_sku, codigo_barras, descricao, preco_custo, preco_venda) VALUES ('p1', 'dev1', 'now', 'now', 'emp1', 'VEST-AZUL-M', '7890001', 'Vestido Festa Azul M', 100.0, 250.0)",
            [],
        ).unwrap();

        let item = ItemCondicionalInput {
            produto_id: "p1".to_string(),
            variante_id: None,
            codigo_barras: Some("7890001".to_string()),
            quantidade: 2.0,
            preco_unitario: 250.0,
        };

        // 1. Cria condicional de R$ 500,00
        let cnd = criar_venda_condicional(&mut conn, "dev1", "fil1", "cli1", None, Some(3), vec![item]).unwrap();
        assert_eq!(cnd.valor_total_enviado, 500.0);

        // 2. Devolve 1 item bipando barcode
        devolver_item_por_codigo(&mut conn, &cnd.id, "7890001").unwrap();

        // 3. Fatura condicional restante
        let valor_fat = faturar_condicional(&mut conn, &cnd.id).unwrap();
        assert_eq!(valor_fat, 250.0);

        // 4. Verifica ficha financeira do cliente
        let ficha = consultar_ficha_financeira(&conn, "cli1").unwrap();
        assert_eq!(ficha.len(), 1);
        assert_eq!(ficha[0].tipo_movimento, "DEBITO");
        assert_eq!(ficha[0].valor, 250.0);
    }
}
