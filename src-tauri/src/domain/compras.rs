//! Módulo de Domínio de Compras & Cálculo de Custo Médio Ponderado (CMP)
//!
//! Gerencia entradas de compras de fornecedores, conversão de embalagens (fator de conversão)
//! e recálculo automático do Custo Médio Ponderado (CMP) do produto no banco SQLCipher local.

use chrono::Utc;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use tracing::info;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ItemEntradaCompraInput {
    pub produto_id: String,
    pub quantidade_embalagem: f64,
    pub fator_conversao: f64, // Ex: Caixa c/ 12un => fator = 12.0
    pub preco_custo_embalagem: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EntradaCompraInput {
    pub filial_id: String,
    pub deposito_id: String,
    pub fornecedor_id: Option<String>,
    pub numero_nota: String,
    pub itens: Vec<ItemEntradaCompraInput>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResultadoEntradaCompra {
    pub pedido_id: String,
    pub numero_pedido: String,
    pub valor_total_compra: f64,
    pub novos_custos_medios: Vec<(String, f64, f64)>, // (produto_id, novo_cmp, novo_saldo)
}

/// Recalcula o Custo Médio Ponderado (CMP) com a fórmula oficial:
/// Novo CMP = [(Estoque Atual * Custo Atual) + (Qtd Convertida * Custo Unitário Entrada)] / (Estoque Atual + Qtd Convertida)
pub fn calcular_novo_custo_medio(
    estoque_atual: f64,
    custo_atual: f64,
    qtd_entrada_convertida: f64,
    custo_unitario_entrada: f64,
) -> f64 {
    let estoque_pos = estoque_atual + qtd_entrada_convertida;
    if estoque_pos <= 0.0 {
        return custo_unitario_entrada;
    }

    let valor_total_existente = (estoque_atual.max(0.0)) * custo_atual;
    let valor_total_novo = qtd_entrada_convertida * custo_unitario_entrada;
    let novo_cmp = (valor_total_existente + valor_total_novo) / estoque_pos;

    (novo_cmp * 100.0).round() / 100.0
}

/// Processa uma entrada de compra em transação atômica
pub fn processar_entrada_compra(
    conn: &mut Connection,
    device_id: &str,
    input: &EntradaCompraInput,
) -> Result<ResultadoEntradaCompra, String> {
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();
    let pedido_id = uuid::Uuid::new_v4().to_string();

    let mut valor_total_compra = 0.0;
    let mut novos_custos = Vec::new();

    for item in &input.itens {
        let qtd_convertida = item.quantidade_embalagem * item.fator_conversao;
        let custo_unitario = item.preco_custo_embalagem / item.fator_conversao;
        let item_valor_total = item.quantidade_embalagem * item.preco_custo_embalagem;
        valor_total_compra += item_valor_total;

        // 1. Busca saldo e preço de custo atual do produto
        let (custo_atual, estoque_atual): (f64, f64) = tx
            .query_row(
                "SELECT p.preco_custo, COALESCE((SELECT SUM(quantidade_atual) FROM estoque_saldos WHERE produto_id = p.id), 0.0)
                 FROM produtos p WHERE p.id = ?1",
                params![item.produto_id],
                |r| Ok((r.get(0)?, r.get(1)?)),
            )
            .map_err(|e| format!("Erro ao buscar dados do produto {}: {}", item.produto_id, e))?;

        // 2. Calcula novo Custo Médio Ponderado (CMP)
        let novo_cmp = calcular_novo_custo_medio(estoque_atual, custo_atual, qtd_convertida, custo_unitario);
        let novo_saldo = estoque_atual + qtd_convertida;

        // 3. Atualiza preço de custo no cadastro do produto
        tx.execute(
            "UPDATE produtos SET preco_custo = ?1, updated_at = ?2, x_version = x_version + 1, x_sync_status = 'pending' WHERE id = ?3",
            params![novo_cmp, now, item.produto_id],
        )
        .map_err(|e| format!("Erro ao atualizar CMP do produto: {}", e))?;

        // 4. Incrementa o saldo do produto no depósito
        tx.execute(
            "INSERT INTO estoque_saldos (
                id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
                deposito_id, produto_id, quantidade_atual, quantidade_reservada
            ) VALUES (?1, ?2, ?3, ?3, 'pending', 1, 0, ?4, ?5, ?6, 0.0)
            ON CONFLICT(deposito_id, produto_id) DO UPDATE SET
                quantidade_atual = quantidade_atual + excluded.quantidade_atual,
                updated_at = excluded.updated_at, x_version = x_version + 1, x_sync_status = 'pending'",
            params![
                uuid::Uuid::new_v4().to_string(),
                device_id,
                now,
                input.deposito_id,
                item.produto_id,
                qtd_convertida
            ],
        )
        .map_err(|e| format!("Erro ao atualizar saldo de estoque: {}", e))?;

        // 5. Grava movimentação de compra imutável
        tx.execute(
            "INSERT INTO estoque_movimentacoes (
                id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
                deposito_id, produto_id, tipo, quantidade, saldo_anterior, saldo_posterior, origem_documento, origem_id, observacao
            ) VALUES (?1, ?2, ?3, ?3, 'pending', 1, 0, ?4, ?5, 'COMPRA_ENTRADA', ?6, ?7, ?8, 'NOTA_COMPRA', ?9, ?10)",
            params![
                uuid::Uuid::new_v4().to_string(),
                device_id,
                now,
                input.deposito_id,
                item.produto_id,
                qtd_convertida,
                estoque_atual,
                novo_saldo,
                pedido_id,
                format!("Entrada Nota Compra nº {} (Fator: {})", input.numero_nota, item.fator_conversao)
            ],
        )
        .map_err(|e| format!("Erro ao gravar movimentação de estoque: {}", e))?;

        novos_custos.push((item.produto_id.clone(), novo_cmp, novo_saldo));
    }

    // 6. Grava Pedido de Compra
    tx.execute(
        "INSERT INTO compras_pedidos (
            id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
            filial_id, fornecedor_id, numero_pedido, status, valor_total, observacoes
        ) VALUES (?1, ?2, ?3, ?3, 'pending', 1, 0, ?4, ?5, ?6, 'CONCLUIDA', ?7, ?8)",
        params![
            pedido_id,
            device_id,
            now,
            input.filial_id,
            input.fornecedor_id,
            input.numero_nota,
            valor_total_compra,
            format!("Entrada efetuada com sucesso. Total: R$ {:.2}", valor_total_compra)
        ],
    )
    .map_err(|e| format!("Erro ao salvar pedido de compra: {}", e))?;

    tx.commit().map_err(|e| e.to_string())?;

    info!(
        "Entrada de compra nota nº {} concluída. Total: R$ {:.2}. {} produtos atualizados com novo CMP.",
        input.numero_nota,
        valor_total_compra,
        novos_custos.len()
    );

    Ok(ResultadoEntradaCompra {
        pedido_id,
        numero_pedido: input.numero_nota.clone(),
        valor_total_compra,
        novos_custos_medios: novos_custos,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculo_novo_custo_medio_ponderado() {
        // Exemplo: Estoque 10un a R$ 3,00 (Total = R$ 30)
        // Entrada: 10un a R$ 5,00 (Total = R$ 50)
        // Novo CMP esperado = (30 + 50) / 20 = R$ 4,00
        let novo_cmp = calcular_novo_custo_medio(10.0, 3.00, 10.0, 5.00);
        assert_eq!(novo_cmp, 4.00);
    }

    #[test]
    fn test_calculo_cmp_com_fator_conversao_caixa() {
        // Produto de estoque atual 0.
        // Compra de 1 Caixa (CX) com 12un por R$ 24,00 => custo unitário R$ 2,00.
        let novo_cmp = calcular_novo_custo_medio(0.0, 0.0, 12.0, 2.00);
        assert_eq!(novo_cmp, 2.00);
    }
}
