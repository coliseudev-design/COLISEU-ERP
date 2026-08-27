const express = require('express');
const router = express.Router();
const db = require('../db/postgres');

router.get('/vendas-17', async (req, res) => {
    try {
        const tenantId = req.tenant.id;
        const { rows } = await db.query(`
            SELECT id_firebird, data_venda, valor_total, status 
            FROM dash_vendas 
            WHERE tenant_id = $1 
              AND data_venda >= '2026-05-17 00:00:00' 
              AND data_venda <= '2026-05-17 23:59:59'
            ORDER BY data_venda ASC
        `, [tenantId]);
        res.json({ total_rows: rows.length, sum: rows.reduce((acc, curr) => acc + Number(curr.valor_total), 0), data: rows });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/db-summary', async (req, res) => {
    try {
        const tenantId = req.tenant.id;
        const salesRes = await db.query(`
            SELECT 
                COUNT(*) as total_sales,
                SUM(CASE WHEN cfop IS NULL THEN 1 ELSE 0 END) as cfop_null,
                SUM(CASE WHEN cfop IS NOT NULL THEN 1 ELSE 0 END) as cfop_not_null,
                MIN(data_venda) as min_date,
                MAX(data_venda) as max_date
            FROM dash_vendas
            WHERE tenant_id = $1
        `, [tenantId]);

        const distinctCfops = await db.query(`
            SELECT cfop, COUNT(*) as count, SUM(valor_total) as total_value
            FROM dash_vendas
            WHERE tenant_id = $1
            GROUP BY cfop
            ORDER BY count DESC
        `, [tenantId]);

        const devCount = await db.query(`
            SELECT COUNT(*) as count, SUM(valor) as total_value
            FROM dash_devolucoes
            WHERE tenant_id = $1
        `, [tenantId]);

        res.json({
            tenant_id: tenantId,
            sales: salesRes.rows[0],
            cfops: distinctCfops.rows,
            devolucoes: devCount.rows[0]
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/status-report', async (req, res) => {
    try {
        const tenantId = req.tenant.id;
        const { rows: statusRows } = await db.query(`
            SELECT 
                COALESCE(TRIM(status), '(NULL)') AS status_val,
                COUNT(*) AS count,
                SUM(valor_total) AS total_valor,
                MIN(data_venda) AS primeira_venda,
                MAX(data_venda) AS ultima_venda
            FROM dash_vendas
            WHERE tenant_id = $1
            GROUP BY COALESCE(TRIM(status), '(NULL)')
            ORDER BY count DESC
        `, [tenantId]);

        const { rows: mesRows } = await db.query(`
            SELECT 
                COALESCE(TRIM(status), '(NULL)') AS status_val,
                COUNT(*) AS count,
                SUM(valor_total) AS total_valor
            FROM dash_vendas
            WHERE tenant_id = $1
              AND data_venda >= date_trunc('month', NOW())
            GROUP BY COALESCE(TRIM(status), '(NULL)')
            ORDER BY count DESC
        `, [tenantId]);

        res.json({ tenant_id: tenantId, todos_status: statusRows, status_mes_atual: mesRows });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// GET /api/debug/vendas-dia?date=2026-06-01
// Mostra TODAS as vendas de um dia específico agrupadas por status,
// e o total com e sem o filtro FATURADO/FINALIZADO — para diagnosticar discrepância com ERP
router.get('/vendas-dia', async (req, res) => {
    try {
        const tenantId = req.tenant.id;
        const date = req.query.date || new Date().toISOString().slice(0, 10);

        // 1. Totais por status para o dia
        const { rows: byStatus } = await db.query(`
            SELECT 
                COALESCE(TRIM(status), '(NULL)') AS status_val,
                COUNT(*) AS count,
                SUM(valor_total) AS total_valor
            FROM dash_vendas
            WHERE tenant_id = $1
              AND DATE(data_venda) = $2::date
            GROUP BY COALESCE(TRIM(status), '(NULL)')
            ORDER BY total_valor DESC
        `, [tenantId, date]);

        // 2. Total geral do dia (sem filtro de status)
        const { rows: totalGeral } = await db.query(`
            SELECT COUNT(*) AS count, SUM(valor_total) AS total
            FROM dash_vendas
            WHERE tenant_id = $1 AND DATE(data_venda) = $2::date
        `, [tenantId, date]);

        // 3. Total do dia APENAS com FATURADO/FINALIZADO (filtro atual do Dash)
        const { rows: totalFiltrado } = await db.query(`
            SELECT COUNT(*) AS count, SUM(valor_total) AS total
            FROM dash_vendas
            WHERE tenant_id = $1
              AND DATE(data_venda) = $2::date
              AND UPPER(TRIM(status)) IN ('FATURADO', 'FINALIZADO', 'PROCESSADO')
        `, [tenantId, date]);

        // 4. Vendas do dia onde data_venda != data prevista (emissao em outro mês)
        const { rows: dataMismatch } = await db.query(`
            SELECT 
                id_firebird, numero_pedido, 
                data_venda, data_vencimento,
                valor_total, TRIM(status) AS status,
                TRIM(especie) AS especie
            FROM dash_vendas
            WHERE tenant_id = $1
              AND DATE(data_venda) = $2::date
            ORDER BY valor_total DESC
            LIMIT 30
        `, [tenantId, date]);

        res.json({
            date,
            total_geral: {
                count: parseInt(totalGeral[0].count),
                valor: parseFloat(totalGeral[0].total || 0)
            },
            total_dash_filtrado: {
                count: parseInt(totalFiltrado[0].count),
                valor: parseFloat(totalFiltrado[0].total || 0),
                filtro: "UPPER(TRIM(status)) IN ('FATURADO', 'FINALIZADO', 'PROCESSADO')"
            },
            diferenca: parseFloat(totalGeral[0].total || 0) - parseFloat(totalFiltrado[0].total || 0),
            por_status: byStatus.map(r => ({
                status: r.status_val,
                count: parseInt(r.count),
                total: parseFloat(r.total_valor || 0)
            })),
            amostra_vendas: dataMismatch.map(r => ({
                id: r.id_firebird,
                pedido: r.numero_pedido,
                data_venda: r.data_venda,
                data_vencimento: r.data_vencimento,
                status: r.status,
                especie: r.especie,
                valor: parseFloat(r.valor_total || 0)
            }))
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
