-- ================================================================
-- MIGRAÇÃO 006: Adicionar data_hora_proc em dash_vendas
-- ================================================================

ALTER TABLE dash_vendas ADD COLUMN IF NOT EXISTS data_hora_proc TIMESTAMPTZ DEFAULT NULL;

-- Dropar e recriar visão materializada diária agrupando por data de processamento/faturamento se faturado
DROP MATERIALIZED VIEW IF EXISTS mv_dash_vendas_diario;

CREATE MATERIALIZED VIEW mv_dash_vendas_diario AS
SELECT 
    tenant_id,
    depto_id,
    DATE(COALESCE(
        CASE WHEN TRIM(status) IN ('FATURADO', 'FINALIZADO') THEN data_hora_proc ELSE NULL END,
        data_venda
    )) AS data_venda,
    COALESCE(SUM(valor_total), 0) AS faturamento,
    COUNT(DISTINCT id_firebird) AS qtd_pedidos,
    COALESCE(SUM(valor_desconto), 0) AS total_descontos,
    COALESCE(AVG(valor_total), 0) AS ticket_medio
FROM dash_vendas
GROUP BY 
    tenant_id, 
    depto_id, 
    DATE(COALESCE(
        CASE WHEN TRIM(status) IN ('FATURADO', 'FINALIZADO') THEN data_hora_proc ELSE NULL END,
        data_venda
    ));

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_vendas_diario 
    ON mv_dash_vendas_diario(tenant_id, depto_id, data_venda);
