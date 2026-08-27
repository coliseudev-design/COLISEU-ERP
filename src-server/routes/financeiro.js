'use strict';

const express = require('express');
const router = express.Router();
const db = require('../db/postgres');
const { getPeriodRange } = require('../utils/period');
const cfopUtil = require('../utils/cfop');

/**
 * Usa MAX(data_emissao) do financeiro como âncora para filtros de período.
 * Garante que dados antigos do Firebird sempre apareçam.
 */
async function getFinanceiroAnchor(tenantId, period, start_date, end_date) {
    let fakeNow = new Date();
    const { rows } = await db.query(
        `SELECT COALESCE(MAX(data_emissao), MAX(data_vencimento), NOW()) as anchor FROM dash_financeiro WHERE tenant_id = $1`,
        [tenantId]
    );
    if (rows.length > 0 && rows[0].anchor) {
        fakeNow = new Date(rows[0].anchor);
    }
    const { getPeriodRange, parseDateString } = require('../utils/period');
    const pr = getPeriodRange(period, start_date, end_date, fakeNow);
    return {
        start: parseDateString(pr.start),
        end: parseDateString(pr.end)
    };
}

// Helper: classifica conta 
const CAT_SQL = `
  CASE
    WHEN TRIM(status_pagamento) = 'PAGO' THEN 'PAGA'
    WHEN TRIM(status_pagamento) = 'CANCELADO' THEN 'CANCELADA'
    WHEN data_vencimento < NOW() THEN 'VENCIDA'
    WHEN data_vencimento <= NOW() + INTERVAL '30 days' THEN 'A_VENCER'
    ELSE 'FUTURA'
  END
`;

// GET /api/financeiro/contas-receber
router.get('/contas-receber', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const caixaId = req.query.caixa_id;
        const filterCaixa = caixaId ? ` AND caixa_id_firebird = ${parseInt(caixaId)}` : '';
        const { rows } = await db.query(`
            SELECT 
                ${CAT_SQL} AS status,
                COUNT(*) AS quantidade,
                SUM(valor) AS total
            FROM dash_financeiro
            WHERE tenant_id = $1 
              AND TRIM(tipo) = 'RECEBER'
              ${filterCaixa}
            GROUP BY 1
            ORDER BY 1
        `, [tenantId]);

        const formatted = rows.map(r => ({
            status: r.status,
            quantidade: parseInt(r.quantidade, 10),
            total: parseFloat(r.total || 0)
        }));

        res.json({ data: formatted });
    } catch (err) {
        next(err);
    }
});

// GET /api/financeiro/contas-pagar
router.get('/contas-pagar', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const caixaId = req.query.caixa_id;
        const filterCaixa = caixaId ? ` AND caixa_id_firebird = ${parseInt(caixaId)}` : '';
        const { rows } = await db.query(`
            SELECT 
                ${CAT_SQL} AS status,
                COUNT(*) AS quantidade,
                SUM(valor) AS total
            FROM dash_financeiro
            WHERE tenant_id = $1 
              AND TRIM(tipo) = 'PAGAR'
              ${filterCaixa}
            GROUP BY 1
            ORDER BY 1
        `, [tenantId]);

        const formatted = rows.map(r => ({
            status: r.status,
            quantidade: parseInt(r.quantidade, 10),
            total: parseFloat(r.total || 0)
        }));

        res.json({ data: formatted });
    } catch (err) {
        next(err);
    }
});

// GET /api/financeiro/fluxo-caixa
router.get('/fluxo-caixa', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const caixaId = req.query.caixa_id;
        const filterCaixa = caixaId ? ` AND caixa_id_firebird = ${parseInt(caixaId)}` : '';
        const period = req.query.period || 'last12m';
        const { start, end } = await getFinanceiroAnchor(tenantId, period, req.query.start_date, req.query.end_date);

        const { rows } = await db.query(`
            SELECT 
                TO_CHAR(COALESCE(data_pagamento, data_vencimento), 'YYYY-MM-DD') AS data,
                SUM(CASE WHEN TRIM(tipo) = 'RECEBER' AND TRIM(status_pagamento) = 'PAGO' THEN (CASE WHEN valor_pago = 0 THEN valor ELSE valor_pago END) ELSE 0 END) AS entradas,
                SUM(CASE WHEN TRIM(tipo) = 'PAGAR' AND TRIM(status_pagamento) = 'PAGO' THEN (CASE WHEN valor_pago = 0 THEN valor ELSE valor_pago END) ELSE 0 END) AS saidas
            FROM dash_financeiro
            WHERE tenant_id = $1
              AND COALESCE(data_pagamento, data_vencimento) >= $2
              AND COALESCE(data_pagamento, data_vencimento) <= $3
              ${filterCaixa}
            GROUP BY TO_CHAR(COALESCE(data_pagamento, data_vencimento), 'YYYY-MM-DD')
            ORDER BY data
        `, [tenantId, start, end]);

        let acc = 0;
        const data = rows.map((r) => {
            const entradas = parseFloat(r.entradas || 0);
            const saidas = parseFloat(r.saidas || 0);
            acc += entradas - saidas;
            return {
                data: r.data,
                entradas,
                saidas,
                saldo: acc
            };
        });

        res.json({ period: { start, end, label: period }, data });
    } catch (err) {
        next(err);
    }
});

// GET /api/financeiro/kpis
router.get('/kpis', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const caixaId = req.query.caixa_id;
        const filterCaixa = caixaId ? ` AND caixa_id_firebird = ${parseInt(caixaId)}` : '';

        const [rReceber, rPagar, rVencidas, rGeral, rDmp] = await Promise.all([
            db.query(`SELECT COALESCE(SUM(valor - valor_pago), 0) AS v FROM dash_financeiro WHERE tenant_id = $1 AND TRIM(tipo) = 'RECEBER' AND TRIM(status_pagamento) = 'ABERTO' ${filterCaixa}`, [tenantId]),
            db.query(`SELECT COALESCE(SUM(valor - valor_pago), 0) AS v FROM dash_financeiro WHERE tenant_id = $1 AND TRIM(tipo) = 'PAGAR' AND TRIM(status_pagamento) = 'ABERTO' ${filterCaixa}`, [tenantId]),
            db.query(`SELECT COALESCE(SUM(valor - valor_pago), 0) AS vencidas_valor, COUNT(*) AS vencidas_qtd FROM dash_financeiro WHERE tenant_id = $1 AND TRIM(tipo) = 'RECEBER' AND TRIM(status_pagamento) = 'ABERTO' AND data_vencimento < NOW() ${filterCaixa}`, [tenantId]),
            db.query(`SELECT COALESCE(SUM(valor), 0) AS total_geral FROM dash_financeiro WHERE tenant_id = $1 AND TRIM(tipo) = 'RECEBER' ${filterCaixa}`, [tenantId]),
            db.query(`SELECT AVG(EXTRACT(EPOCH FROM (data_pagamento - data_emissao))/86400) AS dias FROM dash_financeiro WHERE tenant_id = $1 AND TRIM(tipo) = 'RECEBER' AND TRIM(status_pagamento) = 'PAGO' AND data_pagamento IS NOT NULL AND data_emissao IS NOT NULL ${filterCaixa}`, [tenantId])
        ]);

        const totalReceberGeral = parseFloat(rGeral.rows[0]?.total_geral || 0);
        const vencidasValor = parseFloat(rVencidas.rows[0]?.vencidas_valor || 0);
        const inadimp = totalReceberGeral > 0 ? (vencidasValor / totalReceberGeral) * 100 : 0;
        const totalReceber = parseFloat(rReceber.rows[0]?.v || 0);
        const totalPagar = parseFloat(rPagar.rows[0]?.v || 0);

        res.json({
            kpis: {
                total_receber: totalReceber,
                total_pagar: totalPagar,
                saldo_liquido: totalReceber - totalPagar,
                inadimplencia_pct: Number(inadimp.toFixed(2)),
                vencidas_qtd: parseInt(rVencidas.rows[0]?.vencidas_qtd || 0, 10),
                vencidas_valor: vencidasValor,
                dias_medio_recebimento: Number(parseFloat(rDmp.rows[0]?.dias || 0).toFixed(1)),
            }
        });
    } catch (err) {
        next(err);
    }
});

// GET /api/financeiro/caixa?period=
router.get('/caixa', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const caixaId = req.query.caixa_id;
        const filterCaixa = caixaId ? ` AND f.caixa_id_firebird = ${parseInt(caixaId)}` : '';
        const period = req.query.period || 'last12m';
        const { start, end } = await getFinanceiroAnchor(tenantId, period, req.query.start_date, req.query.end_date);

        const totP = await db.query(`
            SELECT
                COALESCE(SUM(CASE WHEN TRIM(f.tipo) = 'RECEBER' AND TRIM(f.status_pagamento) = 'PAGO' AND COALESCE(f.data_pagamento, f.data_vencimento) >= $2 AND COALESCE(f.data_pagamento, f.data_vencimento) <= $3 THEN (CASE WHEN f.valor_pago = 0 THEN f.valor ELSE f.valor_pago END) ELSE 0 END), 0) AS entradas,
                COALESCE(SUM(CASE WHEN TRIM(f.tipo) = 'PAGAR' AND TRIM(f.status_pagamento) = 'PAGO' AND COALESCE(f.data_pagamento, f.data_vencimento) >= $2 AND COALESCE(f.data_pagamento, f.data_vencimento) <= $3 THEN (CASE WHEN f.valor_pago = 0 THEN f.valor ELSE f.valor_pago END) ELSE 0 END), 0) AS saidas,
                COUNT(DISTINCT CASE WHEN TRIM(f.tipo) = 'RECEBER' AND TRIM(f.status_pagamento) = 'PAGO' AND COALESCE(f.data_pagamento, f.data_vencimento) >= $2 AND COALESCE(f.data_pagamento, f.data_vencimento) <= $3 THEN f.id END) AS qtd_entradas,
                COUNT(DISTINCT CASE WHEN TRIM(f.tipo) = 'PAGAR' AND TRIM(f.status_pagamento) = 'PAGO' AND COALESCE(f.data_pagamento, f.data_vencimento) >= $2 AND COALESCE(f.data_pagamento, f.data_vencimento) <= $3 THEN f.id END) AS qtd_saidas
            FROM dash_financeiro f
            WHERE f.tenant_id = $1
              ${filterCaixa}
        `, [tenantId, start, end]);

        // Entradas em espécie (DINHEIRO) do caixa (por junção com vendas)
        const totDinP = await db.query(`
            SELECT
                COALESCE(SUM(CASE WHEN TRIM(f.tipo) = 'RECEBER' AND TRIM(f.status_pagamento) = 'PAGO' AND COALESCE(f.data_pagamento, f.data_vencimento) >= $2 AND COALESCE(f.data_pagamento, f.data_vencimento) <= $3 AND TRIM(UPPER(COALESCE(v.especie, 'DINHEIRO'))) = 'DINHEIRO' THEN (CASE WHEN f.valor_pago = 0 THEN f.valor ELSE f.valor_pago END) ELSE 0 END), 0) AS entradas_dinheiro
            FROM dash_financeiro f
            LEFT JOIN dash_vendas v ON v.tenant_id = f.tenant_id
              AND v.id_firebird = f.venda_id_firebird
            WHERE f.tenant_id = $1
              ${filterCaixa}
        `, [tenantId, start, end]);

        const movP = await db.query(`
            SELECT 
                TO_CHAR(COALESCE(f.data_pagamento, f.data_vencimento), 'YYYY-MM-DD') AS data,
                SUM(CASE WHEN TRIM(f.tipo) = 'RECEBER' THEN (CASE WHEN f.valor_pago = 0 THEN f.valor ELSE f.valor_pago END) ELSE 0 END) AS entradas,
                SUM(CASE WHEN TRIM(f.tipo) = 'PAGAR' THEN (CASE WHEN f.valor_pago = 0 THEN f.valor ELSE f.valor_pago END) ELSE 0 END) AS saidas
            FROM dash_financeiro f
            WHERE f.tenant_id = $1 
              AND TRIM(f.status_pagamento) = 'PAGO'
              AND COALESCE(f.data_pagamento, f.data_vencimento) >= $2 
              AND COALESCE(f.data_pagamento, f.data_vencimento) <= $3
              ${filterCaixa}
            GROUP BY TO_CHAR(COALESCE(f.data_pagamento, f.data_vencimento), 'YYYY-MM-DD')
            ORDER BY data
        `, [tenantId, start, end]);

        const showEspecies = true;

        let especieP = { rows: [] };
        if (showEspecies) {
            especieP = await db.query(`
                SELECT TRIM(UPPER(COALESCE(v.especie, 'DINHEIRO'))) as nome_especie, 
                       COALESCE(SUM(CASE WHEN TRIM(f.tipo) = 'RECEBER' THEN COALESCE(f.valor_pago, f.valor) ELSE -COALESCE(f.valor_pago, f.valor) END), 0) AS total_especie
                FROM dash_financeiro f
                LEFT JOIN dash_vendas v ON v.tenant_id = f.tenant_id
                  AND v.id_firebird = f.venda_id_firebird
                WHERE f.tenant_id = $1
                  AND TRIM(f.status_pagamento) = 'PAGO'
                  AND COALESCE(f.data_pagamento, f.data_vencimento) >= $2 
                  AND COALESCE(f.data_pagamento, f.data_vencimento) <= $3
                  ${filterCaixa}
                GROUP BY TRIM(UPPER(COALESCE(v.especie, 'DINHEIRO')))
                ORDER BY total_especie DESC
            `, [tenantId, start, end]);
        }

        let acc = 0;
        const movimentacoes = movP.rows.map(m => {
            const entradas = parseFloat(m.entradas || 0);
            const saidas = parseFloat(m.saidas || 0);
            acc += entradas - saidas;
            return {
                data: m.data,
                entradas,
                saidas,
                saldo_acumulado: acc
            };
        });

        const entradas = parseFloat(totP.rows[0].entradas || 0);
        const saidas = parseFloat(totP.rows[0].saidas || 0);
        const entradas_dinheiro = parseFloat(totDinP.rows[0].entradas_dinheiro || 0);
        const qtd_entradas = parseInt(totP.rows[0].qtd_entradas || 0, 10);
        const qtd_saidas = parseInt(totP.rows[0].qtd_saidas || 0, 10);
        const especies = especieP.rows.map(r => ({
            nome: r.nome_especie,
            total: parseFloat(r.total_especie || 0)
        }));

        res.json({
            period: { start, end, label: period },
            kpis: {
                entradas,
                saidas,
                saldo: entradas - saidas,
                entradas_dinheiro,
                qtd_entradas,
                qtd_saidas,
                especies,
                ticket_medio_entrada: qtd_entradas > 0 ? (entradas / qtd_entradas) : 0
            },
            movimentacoes
        });
    } catch (err) {
        next(err);
    }
});

// GET /api/financeiro/especies-vendidas
router.get('/especies-vendidas', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const period = req.query.period || '30d';
        const { start, end } = await getFinanceiroAnchor(tenantId, period, req.query.start_date, req.query.end_date);
        const limit = parseInt(req.query.limit, 10) || 15;

        const prodP = await db.query(`
            SELECT 
                p.id_firebird AS id,
                p.codigo,
                p.nome,
                p.categoria,
                SUM(i.quantidade) AS quantidade_vendida,
                SUM(i.valor_total) AS total_vendido,
                COUNT(DISTINCT i.venda_id_firebird) AS qtd_vendas,
                AVG(i.preco_unitario) AS preco_medio
            FROM dash_vendas_itens i
            INNER JOIN dash_vendas v ON v.id_firebird = i.venda_id_firebird AND v.tenant_id = i.tenant_id
            INNER JOIN dash_produtos p ON p.id_firebird = i.produto_id_firebird AND p.tenant_id = i.tenant_id
            WHERE i.tenant_id = $1
              AND COALESCE(v.data_vencimento, v.data_venda) >= $2 AND COALESCE(v.data_vencimento, v.data_venda) <= $3
              ${cfopUtil.getSalesFilterClause('v')}
            GROUP BY p.id_firebird, p.codigo, p.nome, p.categoria
            ORDER BY total_vendido DESC
            LIMIT $4
        `, [tenantId, start, end, limit]);

        const catP = await db.query(`
            SELECT 
                COALESCE(NULLIF(p.categoria, ''), 'Sem categoria') AS categoria,
                SUM(i.quantidade) AS quantidade,
                SUM(i.valor_total) AS total
            FROM dash_vendas_itens i
            INNER JOIN dash_vendas v ON v.id_firebird = i.venda_id_firebird AND v.tenant_id = i.tenant_id
            INNER JOIN dash_produtos p ON p.id_firebird = i.produto_id_firebird AND p.tenant_id = i.tenant_id
            WHERE i.tenant_id = $1
              AND COALESCE(v.data_vencimento, v.data_venda) >= $2 AND COALESCE(v.data_vencimento, v.data_venda) <= $3
              ${cfopUtil.getSalesFilterClause('v')}
            GROUP BY COALESCE(NULLIF(p.categoria, ''), 'Sem categoria')
            ORDER BY total DESC
        `, [tenantId, start, end]);

        const totP = await db.query(`
            SELECT SUM(i.valor_total) AS total, SUM(i.quantidade) AS quantidade
            FROM dash_vendas_itens i
            INNER JOIN dash_vendas v ON v.id_firebird = i.venda_id_firebird AND v.tenant_id = i.tenant_id
            WHERE i.tenant_id = $1
              AND COALESCE(v.data_vencimento, v.data_venda) >= $2 AND COALESCE(v.data_vencimento, v.data_venda) <= $3
              ${cfopUtil.getSalesFilterClause('v')}
        `, [tenantId, start, end]);

        res.json({
            period: { start, end, label: period },
            total: {
                valor: parseFloat(totP.rows[0]?.total || 0),
                quantidade: parseFloat(totP.rows[0]?.quantidade || 0)
            },
            produtos: prodP.rows.map(r => ({ ...r, total_vendido: parseFloat(r.total_vendido), quantidade_vendida: parseFloat(r.quantidade_vendida) })),
            categorias: catP.rows.map(r => ({ ...r, total: parseFloat(r.total), quantidade: parseFloat(r.quantidade) }))
        });

    } catch (err) {
        next(err);
    }
});

// GET /api/financeiro/contas
router.get('/contas', async (req, res, next) => {
    try {
        const tipo = req.query.tipo;
        const statusPg = req.query.status;
        const limit = parseInt(req.query.limit, 10) || 100;
        const tenantId = req.tenant.id;

        // Resolve período (period=hoje/semana/mes/custom + start_date/end_date)
        const { start, end } = await getFinanceiroAnchor(
            tenantId,
            req.query.period,
            req.query.start_date,
            req.query.end_date
        );

        const where = ['f.tenant_id = $1'];
        const binds = [tenantId];
        let pIndex = 2;

        if (tipo) {
            where.push(`TRIM(f.tipo) = $${pIndex++}`);
            binds.push(tipo.trim());
        }

        if (req.query.caixa_id) {
            where.push(`f.caixa_id_firebird = $${pIndex++}`);
            binds.push(parseInt(req.query.caixa_id));
        }

        if (statusPg === 'VENCIDA') {
            where.push(`TRIM(f.status_pagamento) = 'ABERTO' AND f.data_vencimento < NOW()`);
        } else if (statusPg) {
            where.push(`TRIM(f.status_pagamento) = $${pIndex++}`);
            binds.push(statusPg.trim());
        }

        // Filtro de período resolvido (sempre aplicado)
        where.push(`COALESCE(f.data_pagamento, f.data_vencimento) >= $${pIndex++}`);
        binds.push(start);
        where.push(`COALESCE(f.data_pagamento, f.data_vencimento) <= $${pIndex++}`);
        binds.push(end);

        binds.push(limit);
        const limitIdx = pIndex;

        const sql = `
            SELECT 
                f.id_firebird AS id, f.tipo, f.descricao, f.data_emissao, f.data_vencimento, f.data_pagamento,
                f.valor, f.valor_pago, f.status_pagamento,
                c.nome AS cliente,
                TRIM(UPPER(COALESCE(v.especie, 'DINHEIRO'))) AS especie
            FROM dash_financeiro f
            LEFT JOIN dash_clientes c ON c.id_firebird = f.cliente_id_firebird AND c.tenant_id = f.tenant_id
            LEFT JOIN dash_vendas v ON v.tenant_id = f.tenant_id
              AND v.cliente_id_firebird = f.cliente_id_firebird
              AND ABS(v.valor_total - COALESCE(v.valor_desconto, 0) - f.valor) < 0.01
            WHERE ${where.join(' AND ')}
            ORDER BY COALESCE(f.data_pagamento, f.data_vencimento) DESC, f.id_firebird DESC
            LIMIT $${limitIdx}
        `;

        const { rows } = await db.query(sql, binds);

        const formatted = rows.map(r => ({
            ...r,
            valor: parseFloat(r.valor),
            valor_pago: parseFloat(r.valor_pago)
        }));

        res.json({ data: formatted });
    } catch (err) {
        next(err);
    }
});


// GET /api/financeiro/caixas
router.get('/caixas', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const { rows } = await db.query(`
            SELECT id_firebird AS id, descricao AS nome
            FROM dash_caixas
            WHERE tenant_id = $1
            ORDER BY descricao ASC
        `, [tenantId]);
        res.json({ data: rows });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
