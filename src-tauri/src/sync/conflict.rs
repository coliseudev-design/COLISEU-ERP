use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Estratégias de Resolução de Conflito por Tipo de Tabela
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum ConflictStrategy {
    /// Cadastros: Last-Write-Wins por campo/registro via x_version + updated_at
    LastWriteWins,
    /// Saldos de Estoque: Delta CRDT PN-Counter (soma de deltas relativos)
    DeltaCrdtPN,
    /// Transações e Documentos Fiscais: Imutável Append-Only (UUID v7)
    AppendOnly,
}

/// Registro Genérico para comparação Last-Write-Wins
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct LwwRecord {
    pub id: String,
    pub x_version: i64,
    pub updated_at: String, // ISO 8601
    pub payload: serde_json::Value,
}

/// Estado Atual do Saldo de Estoque
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct StockBalanceRecord {
    pub deposito_id: String,
    pub produto_id: String,
    pub quantidade_atual: f64,
    pub quantidade_reservada: f64,
    pub updated_at: String,
}

/// Ajuste Delta de Movimentação de Estoque (PN-Counter CRDT)
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct StockDelta {
    pub deposito_id: String,
    pub produto_id: String,
    pub delta_quantidade: f64,
    pub delta_reservada: f64,
}

/// Motor de Resolução de Conflitos
pub struct ConflictResolver;

impl ConflictResolver {
    /// Define a estratégia adequada baseada na tabela
    pub fn strategy_for_table(table_name: &str) -> ConflictStrategy {
        match table_name {
            "estoque_saldos" => ConflictStrategy::DeltaCrdtPN,
            "vendas"
            | "vendas_itens"
            | "vendas_pagamentos"
            | "documentos_fiscais"
            | "documentos_fiscais_eventos"
            | "caixa_movimentacoes"
            | "financeiro_lancamentos"
            | "estoque_movimentacoes" => ConflictStrategy::AppendOnly,
            _ => ConflictStrategy::LastWriteWins,
        }
    }

    /// Executa fusão Last-Write-Wins (LWW) entre versão local e remota.
    /// Prioridade 1: Maior x_version ganha.
    /// Prioridade 2: Em empate de x_version, maior timestamp ISO (updated_at) ganha.
    pub fn resolve_lww(local: &LwwRecord, remote: &LwwRecord) -> LwwRecord {
        if local.x_version > remote.x_version {
            local.clone()
        } else if local.x_version < remote.x_version {
            remote.clone()
        } else {
            let local_dt = DateTime::parse_from_rfc3339(&local.updated_at)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now());
            let remote_dt = DateTime::parse_from_rfc3339(&remote.updated_at)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now());

            if local_dt >= remote_dt {
                local.clone()
            } else {
                remote.clone()
            }
        }
    }

    /// Executa fusão PN-Counter Delta CRDT para Saldos de Estoque.
    /// Aplica movimentações relativas acumulando deltas sem sobrescrever valor absoluto.
    pub fn resolve_stock_delta(
        current: &StockBalanceRecord,
        delta: &StockDelta,
    ) -> StockBalanceRecord {
        let new_atual = current.quantidade_atual + delta.delta_quantidade;
        let new_reservada = current.quantidade_reservada + delta.delta_reservada;

        StockBalanceRecord {
            deposito_id: current.deposito_id.clone(),
            produto_id: current.produto_id.clone(),
            quantidade_atual: (new_atual * 10000.0).round() / 10000.0,
            quantidade_reservada: (new_reservada * 10000.0).round() / 10000.0,
            updated_at: Utc::now().to_rfc3339(),
        }
    }

    /// Valida fusão Append-Only para Vendas e Documentos Fiscais.
    /// Registros são imutáveis e idempotentes. Se local existir, mantém a integridade.
    pub fn resolve_append_only(
        local_exists: bool,
        record: serde_json::Value,
    ) -> (bool, serde_json::Value) {
        // (should_write, record_to_keep)
        if local_exists {
            (false, record)
        } else {
            (true, record)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_strategy_mapping() {
        assert_eq!(
            ConflictResolver::strategy_for_table("produtos"),
            ConflictStrategy::LastWriteWins
        );
        assert_eq!(
            ConflictResolver::strategy_for_table("estoque_saldos"),
            ConflictStrategy::DeltaCrdtPN
        );
        assert_eq!(
            ConflictResolver::strategy_for_table("vendas"),
            ConflictStrategy::AppendOnly
        );
        assert_eq!(
            ConflictResolver::strategy_for_table("documentos_fiscais"),
            ConflictStrategy::AppendOnly
        );
    }

    #[test]
    fn test_lww_version_conflict() {
        let local = LwwRecord {
            id: "prod-1".to_string(),
            x_version: 2,
            updated_at: "2026-08-13T10:00:00Z".to_string(),
            payload: json!({"nome": "Local Wins"}),
        };

        let remote = LwwRecord {
            id: "prod-1".to_string(),
            x_version: 1,
            updated_at: "2026-08-13T12:00:00Z".to_string(),
            payload: json!({"nome": "Remote Old Version"}),
        };

        let winner = ConflictResolver::resolve_lww(&local, &remote);
        assert_eq!(winner.x_version, 2);
        assert_eq!(winner.payload["nome"], "Local Wins");
    }

    #[test]
    fn test_lww_timestamp_conflict_same_version() {
        let local = LwwRecord {
            id: "prod-1".to_string(),
            x_version: 3,
            updated_at: "2026-08-13T10:00:00Z".to_string(),
            payload: json!({"nome": "Older Local"}),
        };

        let remote = LwwRecord {
            id: "prod-1".to_string(),
            x_version: 3,
            updated_at: "2026-08-13T14:30:00Z".to_string(),
            payload: json!({"nome": "Newer Remote"}),
        };

        let winner = ConflictResolver::resolve_lww(&local, &remote);
        assert_eq!(winner.x_version, 3);
        assert_eq!(winner.payload["nome"], "Newer Remote");
    }

    #[test]
    fn test_stock_crdt_pn_counter_delta() {
        let current = StockBalanceRecord {
            deposito_id: "dep-01".to_string(),
            produto_id: "prod-01".to_string(),
            quantidade_atual: 100.0,
            quantidade_reservada: 10.0,
            updated_at: "2026-08-13T10:00:00Z".to_string(),
        };

        // Delta 1: Venda de 5 unidades (-5.0)
        let delta1 = StockDelta {
            deposito_id: "dep-01".to_string(),
            produto_id: "prod-01".to_string(),
            delta_quantidade: -5.0,
            delta_reservada: 0.0,
        };

        let after1 = ConflictResolver::resolve_stock_delta(&current, &delta1);
        assert_eq!(after1.quantidade_atual, 95.0);

        // Delta 2: Entrada de mercadoria de 20 unidades (+20.0)
        let delta2 = StockDelta {
            deposito_id: "dep-01".to_string(),
            produto_id: "prod-01".to_string(),
            delta_quantidade: 20.0,
            delta_reservada: 5.0,
        };

        let after2 = ConflictResolver::resolve_stock_delta(&after1, &delta2);
        assert_eq!(after2.quantidade_atual, 115.0);
        assert_eq!(after2.quantidade_reservada, 15.0);
    }
}
