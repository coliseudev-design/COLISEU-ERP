'use strict';

const express = require('express');
const router = express.Router();
const db = require('../db/postgres');
const { getPeriodRange, toSafeSqlString, parseDateString } = require('../utils/period');
const { getCache, setCache } = require('../config/cache');
const { buildDeptoFilter, buildVendedorFilter } = require('./filiais');
const cfopUtil = require('../utils/cfop');

/**
 * Calcula range de datas relativo à data máxima no banco (âncora real).
 * Garante que bases Firebird sincronizadas sempre apareçam nos filtros corretos,
 * independente da data atual do servidor.
 */
async function getAnchoredRange(tenantId, period, start_date, end_date) {
    const store = db.dbContext.getStore();
    const tzOffset = store ? store.tzOffset : -180;
    const anchor = new Date(Date.now() + (tzOffset * 60 * 1000));

    return getPeriodRange(period, start_date, end_date, anchor);
}


// GET /api/ranking/kpis (para a tela de comissoes)
router.get('/kpis', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const { start, end } = await getAnchoredRange(tenantId, req.query.period || 'last12m', req.query.start_date, req.query.end_date);
        const deptoId = req.query.depto_id;
        const df = buildDeptoFilter(deptoId, 4, 'v');
        const vf = buildVendedorFilter(null, 4 + df.params.length, 'v', req.user?.allowedSellers);
        const salesFilter = cfopUtil.getSalesFilterClause('v');

        const { rows } = await db.query(`
            SELECT 
                SUM(v.valor_total - COALESCE(v.valor_desconto, 0)) AS total_produzido,
                COUNT(DISTINCT v.id_firebird) AS qtd_vendas
            FROM dash_vendas v
            WHERE v.tenant_id = $1 AND v.data_hora_proc >= $2 AND v.data_hora_proc <= $3 ${salesFilter} ${df.clause} ${vf.clause}
        `, [tenantId, start, end, ...df.params, ...vf.params]);

        const { rows: grouped } = await db.query(`
            SELECT 
                v.vendedor_id_firebird, SUM(v.valor_total - COALESCE(v.valor_desconto, 0)) AS total
            FROM dash_vendas v
            WHERE v.tenant_id = $1 AND v.data_hora_proc >= $2 AND v.data_hora_proc <= $3 ${salesFilter} ${df.clause} ${vf.clause}
            GROUP BY v.vendedor_id_firebird
        `, [tenantId, start, end, ...df.params, ...vf.params]);

        let maior = 0;
        let menor = 0;
        if (grouped.length > 0) {
            maior = Math.max(...grouped.map(r => parseFloat(r.total))) * 0.05;
            menor = Math.min(...grouped.map(r => parseFloat(r.total))) * 0.05;
        }

        res.json({
            kpis: {
                total: parseFloat(rows[0].total_produzido || 0) * 0.05,
                menor,
                maior,
                qtd: parseInt(rows[0].qtd_vendas || 0)
            }
        });
    } catch (err) { next(err); }
});

// GET /api/ranking/vendedores
router.get('/vendedores', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const { start, end } = await getAnchoredRange(tenantId, req.query.period || 'last12m', req.query.start_date, req.query.end_date);
        const limit = parseInt(req.query.limit) || 10;
        const deptoId = req.query.depto_id;
        const df = buildDeptoFilter(deptoId, 4, 'v');
        const vf = buildVendedorFilter(null, 4 + df.params.length, 'v', req.user?.allowedSellers);
        const salesFilter = cfopUtil.getSalesFilterClause('v');

        const { rows } = await db.query(`
            SELECT 
                v.vendedor_id_firebird AS id,
                COALESCE(vd.nome, 'Vendedor ' || COALESCE(v.vendedor_id_firebird::text, '?')) AS nome,
                SUM(v.valor_total - COALESCE(v.valor_desconto, 0)) AS total,
                COUNT(DISTINCT v.id_firebird) AS qtd_pedidos,
                AVG(v.valor_total - COALESCE(v.valor_desconto, 0)) AS ticket_medio
            FROM dash_vendas v
            LEFT JOIN dash_vendedores vd ON vd.id_firebird = v.vendedor_id_firebird AND vd.tenant_id = v.tenant_id
            WHERE v.tenant_id = $1 AND v.data_hora_proc >= $2 AND v.data_hora_proc <= $3 ${salesFilter} ${df.clause} ${vf.clause}
            GROUP BY v.vendedor_id_firebird, vd.nome
            ORDER BY total DESC LIMIT $${4 + df.params.length + vf.params.length}
        `, [tenantId, start, end, ...df.params, ...vf.params, limit]);

        res.json({ data: rows.map(r => ({
            id: r.id, nome: r.nome,
            total: parseFloat(r.total || 0),
            qtd_pedidos: parseInt(r.qtd_pedidos),
            ticket_medio: parseFloat(r.ticket_medio || 0)
        })) });
    } catch (err) { next(err); }
});

// GET /api/ranking/produtos
router.get('/produtos', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const { start, end } = await getAnchoredRange(tenantId, req.query.period || 'last12m', req.query.start_date, req.query.end_date);
        const limit = parseInt(req.query.limit) || 10;
        const deptoId = req.query.depto_id;
        const vendedorId = req.query.vendedor_id;
        const df = buildDeptoFilter(deptoId, 4, 'v');
        const vf = buildVendedorFilter(vendedorId, 4 + df.params.length, 'v', req.user?.allowedSellers);
        const salesFilter = cfopUtil.getSalesFilterClause('v');

        // CTE pré-filtra vendas pelo período e depto usando índice, depois faz JOIN com itens
        const { rows } = await db.query(`
            WITH vendas_filtradas AS NOT MATERIALIZED (
                SELECT v.id_firebird, v.tenant_id, v.valor_total, v.valor_desconto
                FROM dash_vendas v
                WHERE v.tenant_id = $1
                  AND v.data_hora_proc >= $2 AND v.data_hora_proc <= $3
                  ${salesFilter} ${df.clause} ${vf.clause}
            )
            SELECT 
                COALESCE(vi.produto, p.nome, 'Produto ' || COALESCE(vi.produto_id_firebird::text, '?')) AS nome,
                SUM(COALESCE(vi.valor_total * (1 - COALESCE(vf.valor_desconto, 0) / NULLIF(vf.valor_total, 0)) * (CASE WHEN vf.valor_total < 0 THEN -1 ELSE 1 END), 0)) AS total,
                SUM(vi.quantidade * (CASE WHEN vf.valor_total < 0 THEN -1 ELSE 1 END)) AS qtd_vendida,
                AVG(vi.preco_unitario) AS preco_medio
            FROM dash_vendas_itens vi
            JOIN vendas_filtradas vf ON vf.id_firebird = vi.venda_id_firebird AND vf.tenant_id = vi.tenant_id
            LEFT JOIN dash_produtos p ON p.id_firebird = vi.produto_id_firebird AND p.tenant_id = vi.tenant_id
            WHERE vi.tenant_id = $1
              AND COALESCE(vi.produto, p.nome, vi.produto_id_firebird::text) IS NOT NULL
            GROUP BY 1
            ORDER BY total DESC LIMIT $${4 + df.params.length + vf.params.length}
        `, [tenantId, start, end, ...df.params, ...vf.params, limit]);

        res.json({ data: rows.map(r => ({
            nome: r.nome,
            name: r.nome,
            produto: r.nome,
            total: parseFloat(r.total || 0),
            qtd_vendida: parseFloat(r.qtd_vendida || 0),
            preco_medio: parseFloat(r.preco_medio || 0)
        })) });
    } catch (err) { next(err); }
});

// GET /api/ranking/clientes
router.get('/clientes', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const { start, end } = await getAnchoredRange(tenantId, req.query.period || 'last12m', req.query.start_date, req.query.end_date);
        const limit = parseInt(req.query.limit) || 10;
        const deptoId = req.query.depto_id;
        const vendedorId = req.query.vendedor_id;
        const df = buildDeptoFilter(deptoId, 4, 'v');
        const vf = buildVendedorFilter(vendedorId, 4 + df.params.length, 'v', req.user?.allowedSellers);
        const salesFilter = cfopUtil.getSalesFilterClause('v');

        const { rows } = await db.query(`
            SELECT 
                MAX(v.cliente_id_firebird) AS id,
                COALESCE(c.nome, 'Cliente ' || COALESCE(v.cliente_id_firebird::text, '?')) AS nome,
                SUM(v.valor_total - COALESCE(v.valor_desconto, 0)) AS total,
                COUNT(DISTINCT v.id_firebird) AS qtd_pedidos
            FROM dash_vendas v
            LEFT JOIN dash_clientes c ON c.id_firebird = v.cliente_id_firebird AND c.tenant_id = v.tenant_id
            WHERE v.tenant_id = $1 AND v.data_hora_proc >= $2 AND v.data_hora_proc <= $3 ${salesFilter} ${df.clause} ${vf.clause}
            GROUP BY COALESCE(c.nome, 'Cliente ' || COALESCE(v.cliente_id_firebird::text, '?'))
            ORDER BY total DESC LIMIT $${4 + df.params.length + vf.params.length}
        `, [tenantId, start, end, ...df.params, ...vf.params, limit]);

        res.json({ data: rows.map(r => ({
            id: r.id, nome: r.nome,
            total: parseFloat(r.total || 0),
            qtd_pedidos: parseInt(r.qtd_pedidos)
        })) });
    } catch (err) { next(err); }
});

// GET /api/ranking/marcas
router.get('/marcas', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const { start, end } = await getAnchoredRange(tenantId, req.query.period || 'last12m', req.query.start_date, req.query.end_date);
        const limit = parseInt(req.query.limit) || 10;
        const deptoId = req.query.depto_id;
        const vendedorId = req.query.vendedor_id;
        const df = buildDeptoFilter(deptoId, 4, 'v');
        const vf = buildVendedorFilter(vendedorId, 4 + df.params.length, 'v', req.user?.allowedSellers);
        const salesFilter = cfopUtil.getSalesFilterClause('v');

        // CTE MATERIALIZED: força PG a executar a subquery de vendas ANTES do JOIN com itens
        const { rows } = await db.query(`
            WITH vendas_filtradas AS NOT MATERIALIZED (
                SELECT v.id_firebird, v.tenant_id, v.marca, v.valor_total, v.valor_desconto
                FROM dash_vendas v
                WHERE v.tenant_id = $1
                  AND v.data_hora_proc >= $2 AND v.data_hora_proc <= $3
                  ${salesFilter} ${df.clause} ${vf.clause}
            )
            SELECT 
                COALESCE(vi.marca, vf.marca, p.marca) AS marca,
                SUM(COALESCE(vi.valor_total * (1 - COALESCE(vf.valor_desconto, 0) / NULLIF(vf.valor_total, 0)) * (CASE WHEN vf.valor_total < 0 THEN -1 ELSE 1 END), 0)) AS total,
                COUNT(*) AS qtd_itens
            FROM dash_vendas_itens vi
            JOIN vendas_filtradas vf ON vf.id_firebird = vi.venda_id_firebird AND vf.tenant_id = vi.tenant_id
            LEFT JOIN dash_produtos p ON p.id_firebird = vi.produto_id_firebird AND p.tenant_id = vi.tenant_id
            WHERE vi.tenant_id = $1
              AND COALESCE(vi.marca, vf.marca, p.marca) IS NOT NULL
              AND COALESCE(vi.marca, vf.marca, p.marca) != ''
            GROUP BY 1
            ORDER BY total DESC LIMIT $${4 + df.params.length + vf.params.length}
        `, [tenantId, start, end, ...df.params, ...vf.params, limit]);

        res.json({ data: rows.map(r => ({
            nome: r.marca, total: parseFloat(r.total || 0),
            qtd_itens: parseInt(r.qtd_itens)
        })) });
    } catch (err) { next(err); }
});

// GET /api/ranking/especies
router.get('/especies', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const { start, end } = await getAnchoredRange(tenantId, req.query.period || 'last12m', req.query.start_date, req.query.end_date);
        const limit = parseInt(req.query.limit) || 10;
        const deptoId = req.query.depto_id;
        const vendedorId = req.query.vendedor_id;
        const df = buildDeptoFilter(deptoId, 4, 'v');
        const vf = buildVendedorFilter(vendedorId, 4 + df.params.length, 'v', req.user?.allowedSellers);
        const salesFilter = cfopUtil.getSalesFilterClause('v');

        const { rows } = await db.query(`
            SELECT 
                COALESCE(NULLIF(TRIM(UPPER(split_part(s.item, ':', 1))), ''), 'Não Informada') AS nome,
                SUM(
                    CASE 
                        WHEN s.item LIKE '%:%' THEN 
                            CAST(split_part(s.item, ':', 2) AS NUMERIC) * (CASE WHEN v.valor_total < 0 THEN -1 ELSE 1 END)
                        ELSE 
                            (v.valor_total - COALESCE(v.valor_desconto, 0))
                    END
                ) AS total,
                COUNT(DISTINCT v.id_firebird) AS qtd
            FROM dash_vendas v
            CROSS JOIN LATERAL regexp_split_to_table(COALESCE(v.especie, 'Não Informada'), '\\|') AS s(item)
            WHERE v.tenant_id = $1
              AND v.data_hora_proc >= $2
              AND v.data_hora_proc <= $3
              ${salesFilter} ${df.clause} ${vf.clause}
            GROUP BY 1 
            ORDER BY total DESC 
            LIMIT $${4 + df.params.length + vf.params.length}
        `, [tenantId, start, end, ...df.params, ...vf.params, limit]);

        res.json({ data: rows.map(r => ({
            nome: r.nome, total: parseFloat(r.total || 0), qtd: parseInt(r.qtd)
        })) });
    } catch (err) { next(err); }
});

// GET /api/ranking/ranking (usado por /comissoes/ranking e pela Vendas.tsx)
router.get('/ranking', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const { start, end } = await getAnchoredRange(tenantId, req.query.period || 'last12m', req.query.start_date, req.query.end_date);
        const limit = parseInt(req.query.limit) || 10;
        const deptoId = req.query.depto_id;
        const df = buildDeptoFilter(deptoId, 4, 'v');
        const vf = buildVendedorFilter(null, 4 + df.params.length, 'v', req.user?.allowedSellers);
        const salesFilter = cfopUtil.getSalesFilterClause('v');

        // Query principal: ranking de vendedores
        const { rows } = await db.query(`
            SELECT 
                v.vendedor_id_firebird AS id,
                COALESCE(vd.nome, 'Vendedor ' || COALESCE(v.vendedor_id_firebird::text, '?')) AS nome,
                SUM(v.valor_total - COALESCE(v.valor_desconto, 0)) AS faturamento,
                COUNT(DISTINCT v.id_firebird) AS qtd_pedidos,
                AVG(v.valor_total - COALESCE(v.valor_desconto, 0)) AS ticket_medio,
                SUM(COALESCE(v.valor_desconto, 0)) AS total_desconto,
                SUM(CASE WHEN COALESCE(v.valor_desconto, 0) > 0 THEN 1 ELSE 0 END) AS qtd_descontos
            FROM dash_vendas v
            LEFT JOIN dash_vendedores vd ON vd.id_firebird = v.vendedor_id_firebird AND vd.tenant_id = v.tenant_id
            WHERE v.tenant_id = $1 AND v.data_hora_proc >= $2 AND v.data_hora_proc <= $3 ${salesFilter} ${df.clause} ${vf.clause}
            GROUP BY v.vendedor_id_firebird, vd.nome
            ORDER BY faturamento DESC LIMIT $${4 + df.params.length + vf.params.length}
        `, [tenantId, start, end, ...df.params, ...vf.params, limit]);

        if (rows.length === 0) {
            return res.json({ data: [] });
        }

        const sellerIds = rows.map(r => r.id).filter(Boolean);
        const sellerIdList = sellerIds.map((_, i) => `$${i + 5}`).join(',');
        const baseParams = [tenantId, start, end, sellerIds.length > 0 ? sellerIds : [-1]];

        // Maior venda por vendedor (1 query só)
        const { rows: maxSales } = await db.query(`
            SELECT DISTINCT ON (v.vendedor_id_firebird)
                v.vendedor_id_firebird,
                (v.valor_total - COALESCE(v.valor_desconto, 0)) AS valor_total,
                COALESCE(c.nome, 'Consumidor Final') AS cliente_nome
            FROM dash_vendas v
            LEFT JOIN dash_clientes c ON c.id_firebird = v.cliente_id_firebird AND c.tenant_id = v.tenant_id
            WHERE v.tenant_id = $1 AND v.data_hora_proc >= $2 AND v.data_hora_proc <= $3
              AND v.vendedor_id_firebird = ANY($4) ${salesFilter}
            ORDER BY v.vendedor_id_firebird, valor_total DESC
        `, [tenantId, start, end, sellerIds]);

        // Melhor produto por vendedor (1 query só, com window function)
        const { rows: bestProducts } = await db.query(`
            WITH ranked AS (
                SELECT v.vendedor_id_firebird,
                    COALESCE(vi.produto, p.nome, 'Sem nome') AS produto_nome,
                    SUM(COALESCE(vi.valor_total * (1 - COALESCE(v.valor_desconto, 0) / NULLIF(v.valor_total, 0)) * (CASE WHEN v.valor_total < 0 THEN -1 ELSE 1 END), 0)) AS total,
                    ROW_NUMBER() OVER (PARTITION BY v.vendedor_id_firebird ORDER BY SUM(COALESCE(vi.valor_total * (1 - COALESCE(v.valor_desconto, 0) / NULLIF(v.valor_total, 0)) * (CASE WHEN v.valor_total < 0 THEN -1 ELSE 1 END), 0)) DESC) AS rn
                FROM dash_vendas_itens vi
                JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id
                LEFT JOIN dash_produtos p ON p.id_firebird = vi.produto_id_firebird AND p.tenant_id = vi.tenant_id
                WHERE v.tenant_id = $1 AND v.data_hora_proc >= $2 AND v.data_hora_proc <= $3
                  AND v.vendedor_id_firebird = ANY($4)
                  AND COALESCE(vi.produto, p.nome) IS NOT NULL ${salesFilter}
                GROUP BY v.vendedor_id_firebird, COALESCE(vi.produto, p.nome, 'Sem nome')
            )
            SELECT vendedor_id_firebird, produto_nome FROM ranked WHERE rn = 1
        `, [tenantId, start, end, sellerIds]);

        const maxSaleMap = Object.fromEntries(maxSales.map(r => [r.vendedor_id_firebird, r]));
        const bestProductMap = Object.fromEntries(bestProducts.map(r => [r.vendedor_id_firebird, r.produto_nome]));

        const result = rows.map(seller => ({
            vendedor_id: seller.id,
            vendedor: seller.nome,
            total_vendas: parseFloat(seller.faturamento || 0),
            qtd_vendas: parseInt(seller.qtd_pedidos),
            ticket_medio: parseFloat(seller.ticket_medio || 0),
            total_desconto: parseFloat(seller.total_desconto || 0),
            qtd_descontos: parseInt(seller.qtd_descontos || 0),
            maior_venda: maxSaleMap[seller.id] ? parseFloat(maxSaleMap[seller.id].valor_total || 0) : 0,
            cliente_maior_venda: maxSaleMap[seller.id]?.cliente_nome || '-',
            melhor_produto: bestProductMap[seller.id] || '-'
        }));

        res.json({ data: result });
    } catch (err) { next(err); }
});

// GET /api/ranking/categorias
router.get('/categorias', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const { start, end } = await getAnchoredRange(tenantId, req.query.period || 'last12m', req.query.start_date, req.query.end_date);
        const limit = parseInt(req.query.limit) || 10;
        const deptoId = req.query.depto_id;
        const vendedorId = req.query.vendedor_id;
        const df = buildDeptoFilter(deptoId, 4, 'v');
        const vf = buildVendedorFilter(vendedorId, 4 + df.params.length, 'v', req.user?.allowedSellers);
        const salesFilter = cfopUtil.getSalesFilterClause('v');

        // CTE pré-filtra vendas usando índice, depois agrega itens
        const { rows } = await db.query(`
            WITH vendas_filtradas AS NOT MATERIALIZED (
                SELECT v.id_firebird, v.tenant_id, v.categoria, v.valor_total, v.valor_desconto
                FROM dash_vendas v
                WHERE v.tenant_id = $1
                  AND v.data_hora_proc >= $2 AND v.data_hora_proc <= $3
                  ${salesFilter} ${df.clause} ${vf.clause}
            )
            SELECT COALESCE(vi.categoria, vf.categoria, p.categoria) AS categoria, 
                   SUM(COALESCE(vi.valor_total * (1 - COALESCE(vf.valor_desconto, 0) / NULLIF(vf.valor_total, 0)) * (CASE WHEN vf.valor_total < 0 THEN -1 ELSE 1 END), 0)) AS total
            FROM dash_vendas_itens vi
            JOIN vendas_filtradas vf ON vf.id_firebird = vi.venda_id_firebird AND vf.tenant_id = vi.tenant_id
            LEFT JOIN dash_produtos p ON p.id_firebird = vi.produto_id_firebird AND p.tenant_id = vi.tenant_id
            WHERE vi.tenant_id = $1
              AND COALESCE(vi.categoria, vf.categoria, p.categoria) IS NOT NULL
              AND COALESCE(vi.categoria, vf.categoria, p.categoria) != ''
            GROUP BY 1
            ORDER BY total DESC LIMIT $${4 + df.params.length + vf.params.length}
        `, [tenantId, start, end, ...df.params, ...vf.params, limit]);

        res.json({ data: rows.map(r => ({
            nome: r.categoria, total: parseFloat(r.total || 0)
        })) });
    } catch (err) { next(err); }
});

// GET /api/ranking/cidades
router.get('/cidades', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const { start, end } = await getAnchoredRange(tenantId, req.query.period || 'last12m', req.query.start_date, req.query.end_date);
        const limit = parseInt(req.query.limit) || 10;
        const deptoId = req.query.depto_id;
        const vendedorId = req.query.vendedor_id;
        const df = buildDeptoFilter(deptoId, 4, 'v');
        const vf = buildVendedorFilter(vendedorId, 4 + df.params.length, 'v', req.user?.allowedSellers);
        const salesFilter = cfopUtil.getSalesFilterClause('v');

        const { rows } = await db.query(`
            SELECT 
                COALESCE(c.cidade, 'NÃO INFORMADA') AS nome,
                SUM(v.valor_total - COALESCE(v.valor_desconto, 0)) AS total,
                COUNT(DISTINCT v.id_firebird) AS qtd_pedidos
            FROM dash_vendas v
            LEFT JOIN dash_clientes c ON c.id_firebird = v.cliente_id_firebird AND c.tenant_id = v.tenant_id
            WHERE v.tenant_id = $1 AND v.data_hora_proc >= $2 AND v.data_hora_proc <= $3 ${salesFilter} ${df.clause} ${vf.clause}
            GROUP BY 1
            ORDER BY total DESC LIMIT $${4 + df.params.length + vf.params.length}
        `, [tenantId, start, end, ...df.params, ...vf.params, limit]);

        res.json({ data: rows.map(r => ({
            nome: r.nome,
            total: parseFloat(r.total || 0),
            qtd_pedidos: parseInt(r.qtd_pedidos)
        })) });
    } catch (err) { next(err); }
});

module.exports = router;
