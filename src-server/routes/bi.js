'use strict';

const express = require('express');
const router = express.Router();
const db = require('../db/postgres');
const { getPeriodRange, toSafeSqlString, parseDateString } = require('../utils/period');
const { 
    buildDeptoFilter, 
    buildCentroCustoFilter, 
    buildVendedorFilter, 
    buildCidadeFilter, 
    buildGrupoFilter, 
    buildMarcaFilter 
} = require('./filiais');
const cfopUtil = require('../utils/cfop');

const getBiDateRange = async (req, tenantId) => {
    const period = req.query.period;
    const inicioParam = req.query.inicio || req.query.startDate || req.query.start_date;
    const fimParam = req.query.fim || req.query.endDate || req.query.end_date;
    
    const store = db.dbContext.getStore();
    const tzOffset = store ? store.tzOffset : -180;
    const anchorDate = new Date(Date.now() + (tzOffset * 60 * 1000));

    if (period && period !== 'custom') {
        const pr = getPeriodRange(period, null, null, anchorDate);
        return { 
            start: parseDateString(pr.start), 
            end: parseDateString(pr.end) 
        };
    }

    let start = new Date(Date.UTC(1970, 0, 1, 0, 0, 0, 0));
    let end = new Date(anchorDate);
    end.setUTCHours(23, 59, 59, 999);

    if (inicioParam) {
        start = parseDateString(inicioParam, 'T00:00:00Z');
    }
    
    if (fimParam) {
        end = parseDateString(fimParam, 'T23:59:59Z');
    }
    
    return { start, end };
};

// ==========================================
// MÓDULO: SALES INTELLIGENCE
// ==========================================// GET /api/bi/sales/executive-summary
router.get('/sales/executive-summary', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const { start, end } = await getBiDateRange(req, tenantId);
        const deptoId = req.query.depto_id;
        const vendedorId = req.query.vendedor_id;
        const cidade = req.query.cidade;

        const df = buildDeptoFilter(deptoId, 4, 'v');
        let nextParamIndex = 4 + df.params.length;

        const vf = buildVendedorFilter(vendedorId, nextParamIndex, 'v');
        nextParamIndex += vf.params.length;

        const cf = buildCidadeFilter(cidade, nextParamIndex, 'c');
        nextParamIndex += cf.params.length;
        
        const salesFilter = cfopUtil.getSalesFilterClause('v');

        const needsCidadeJoin = (cidade && cidade !== 'todas' && cidade !== 'all' && cidade !== 'TODOS');
        const cidadeJoin = needsCidadeJoin ? 'LEFT JOIN dash_clientes c ON c.id_firebird = v.cliente_id_firebird AND c.tenant_id = v.tenant_id' : '';
        
        // Calcular período anterior de mesmo tamanho
        const diffTime = Math.abs(end - start);
        const prevEnd = new Date(start.getTime() - 1);
        const prevStart = new Date(prevEnd.getTime() - diffTime);        // Define helper getDevQuery
        const getDevQuery = (startStr, endStr) => {
            let sql = `SELECT COALESCE(SUM(d.valor), 0) AS total FROM dash_devolucoes d`;
            let params = [tenantId, startStr, endStr];
            let nextIdx = 4;

            const needsVendedorJoin = (vendedorId && vendedorId !== 'todas' && vendedorId !== 'all' && vendedorId !== 'TODOS');
            const needsCidadeJoin = (cidade && cidade !== 'todas' && cidade !== 'all' && cidade !== 'TODOS');

            if (needsVendedorJoin || needsCidadeJoin || (deptoId && deptoId !== 'todas' && deptoId !== 'all')) {
                sql += ` LEFT JOIN dash_vendas v2 ON v2.id_firebird = d.venda_id_firebird AND v2.tenant_id = d.tenant_id`;
            }
            if (needsCidadeJoin) {
                sql += ` LEFT JOIN dash_clientes c2 ON c2.id_firebird = v2.cliente_id_firebird AND c2.tenant_id = v2.tenant_id`;
            }

            sql += ` WHERE d.tenant_id = $1 AND d.data_devolucao >= $2 AND d.data_devolucao <= $3`;

            if (deptoId && deptoId !== 'todas' && deptoId !== 'all') {
                const dfDev = buildDeptoFilter(deptoId, nextIdx, 'v2');
                sql += dfDev.clause;
                params.push(...dfDev.params);
                nextIdx += dfDev.params.length;
            }
            if (needsVendedorJoin) {
                const vfDev = buildVendedorFilter(vendedorId, nextIdx, 'v2');
                sql += vfDev.clause;
                params.push(...vfDev.params);
                nextIdx += vfDev.params.length;
            }
            if (needsCidadeJoin) {
                const cfDev = buildCidadeFilter(cidade, nextIdx, 'c2');
                sql += cfDev.clause;
                params.push(...cfDev.params);
                nextIdx += cfDev.params.length;
            }

            return { sql, params };
        };

        const devMes = getDevQuery(toSafeSqlString(start), toSafeSqlString(end));
        const devAnt = getDevQuery(toSafeSqlString(prevStart), toSafeSqlString(prevEnd));

        const baseParams = [tenantId, toSafeSqlString(start), toSafeSqlString(end), ...df.params, ...vf.params, ...cf.params];
        const prevParams = [tenantId, toSafeSqlString(prevStart), toSafeSqlString(prevEnd), ...df.params, ...vf.params, ...cf.params];

        // Prepare independent query strings
        const vQuery = `
            SELECT 
                COALESCE(SUM(v.valor_total - COALESCE(v.valor_desconto, 0)), 0) AS faturamento_total,
                COUNT(DISTINCT v.id_firebird) AS total_pedidos,
                (SELECT COALESCE(SUM(vi.quantidade * (CASE WHEN v2.valor_total < 0 THEN -1 ELSE 1 END)), 0) FROM dash_vendas_itens vi JOIN dash_vendas v2 ON v2.id_firebird = vi.venda_id_firebird AND v2.tenant_id = vi.tenant_id ${cidadeJoin.replace(/v\./g, 'v2.')} WHERE v2.tenant_id = $1 AND v2.data_hora_proc >= $2 AND v2.data_hora_proc <= $3 ${salesFilter.replace(/v\./g, 'v2.')} ${df.clause.replace(/v\./g, 'v2.')} ${vf.clause.replace(/v\./g, 'v2.')} ${cf.clause.replace(/v\./g, 'v2.')}) AS total_itens
            FROM dash_vendas v
            ${cidadeJoin}
            WHERE v.tenant_id = $1 AND v.data_hora_proc >= $2 AND v.data_hora_proc <= $3 
              ${salesFilter}
              ${df.clause}
              ${vf.clause}
              ${cf.clause}
        `;

        const vPrevQuery = `
            SELECT 
                COALESCE(SUM(v.valor_total - COALESCE(v.valor_desconto, 0)), 0) AS faturamento_total,
                COUNT(DISTINCT v.id_firebird) AS total_pedidos,
                (SELECT COALESCE(SUM(vi.quantidade * (CASE WHEN v2.valor_total < 0 THEN -1 ELSE 1 END)), 0) FROM dash_vendas_itens vi JOIN dash_vendas v2 ON v2.id_firebird = vi.venda_id_firebird AND v2.tenant_id = vi.tenant_id ${cidadeJoin.replace(/v\./g, 'v2.')} WHERE v2.tenant_id = $1 AND v2.data_hora_proc >= $2 AND v2.data_hora_proc <= $3 ${salesFilter.replace(/v\./g, 'v2.')} ${df.clause.replace(/v\./g, 'v2.')} ${vf.clause.replace(/v\./g, 'v2.')} ${cf.clause.replace(/v\./g, 'v2.')}) AS total_itens
            FROM dash_vendas v
            ${cidadeJoin}
            WHERE v.tenant_id = $1 AND v.data_hora_proc >= $2 AND v.data_hora_proc <= $3 
              ${salesFilter}
              ${df.clause}
              ${vf.clause}
              ${cf.clause}
        `;

        const sellersQuery = `
            SELECT COALESCE(vend.nome, 'Vendedor ' || COALESCE(v.vendedor_id_firebird::text, '?')) as nome, 
                   SUM(v.valor_total - COALESCE(v.valor_desconto, 0)) as vendas
            FROM dash_vendas v
            LEFT JOIN dash_vendedores vend ON vend.id_firebird = v.vendedor_id_firebird AND vend.tenant_id = v.tenant_id
            ${cidadeJoin}
            WHERE v.tenant_id = $1 AND v.data_hora_proc >= $2 AND v.data_hora_proc <= $3 
              ${salesFilter}
              ${df.clause}
              ${vf.clause}
              ${cf.clause}
            GROUP BY v.vendedor_id_firebird, vend.nome
            ORDER BY vendas DESC
            LIMIT 10
        `;

        const prodsQuery = `
            SELECT COALESCE(vi.produto, p.nome, 'Produto ' || COALESCE(vi.produto_id_firebird::text, '?')) AS nome, 
                   SUM(vi.valor_total) as vendas
            FROM dash_vendas_itens vi
            JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id
            LEFT JOIN dash_produtos p ON p.id_firebird = vi.produto_id_firebird AND p.tenant_id = vi.tenant_id
            ${cidadeJoin}
            WHERE vi.tenant_id = $1 AND v.data_hora_proc >= $2 AND v.data_hora_proc <= $3 
              ${salesFilter}
              AND COALESCE(vi.produto, p.nome, vi.produto_id_firebird::text) IS NOT NULL
              ${df.clause}
              ${vf.clause}
              ${cf.clause}
            GROUP BY 1
            ORDER BY vendas DESC
            LIMIT 10
        `;

        const brandsQuery = `
            SELECT COALESCE(vi.marca, v.marca, p.marca, 'S/ MARCA') as nome, 
                   SUM(vi.valor_total) as vendas
            FROM dash_vendas_itens vi
            JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id
            LEFT JOIN dash_produtos p ON p.id_firebird = vi.produto_id_firebird AND p.tenant_id = vi.tenant_id
            ${cidadeJoin}
            WHERE vi.tenant_id = $1 AND v.data_hora_proc >= $2 AND v.data_hora_proc <= $3 
              ${salesFilter}
              AND COALESCE(vi.marca, v.marca, p.marca) IS NOT NULL AND COALESCE(vi.marca, v.marca, p.marca) != ''
              ${df.clause}
              ${vf.clause}
              ${cf.clause}
            GROUP BY 1
            ORDER BY vendas DESC
            LIMIT 10
        `;

        const regionsQuery = `
            SELECT COALESCE(c.cidade, 'NÃO INFORMADA') as nome, 
                   SUM(v.valor_total - COALESCE(v.valor_desconto, 0)) as vendas
            FROM dash_vendas v
            LEFT JOIN dash_clientes c ON c.id_firebird = v.cliente_id_firebird AND c.tenant_id = v.tenant_id
            WHERE v.tenant_id = $1 AND v.data_hora_proc >= $2 AND v.data_hora_proc <= $3 
              ${salesFilter}
              ${df.clause}
              ${vf.clause}
              ${cf.clause}
            GROUP BY 1
            ORDER BY vendas DESC
            LIMIT 10
        `;

        const categoriesQuery = `
            SELECT COALESCE(vi.categoria, v.categoria, p.categoria, 'S/ GRUPO') as nome, 
                   SUM(vi.valor_total) as vendas
            FROM dash_vendas_itens vi
            JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id
            LEFT JOIN dash_produtos p ON p.id_firebird = vi.produto_id_firebird AND p.tenant_id = vi.tenant_id
            ${cidadeJoin}
            WHERE vi.tenant_id = $1 AND v.data_hora_proc >= $2 AND v.data_hora_proc <= $3 
              ${salesFilter}
              AND COALESCE(vi.categoria, v.categoria, p.categoria) IS NOT NULL AND COALESCE(vi.categoria, v.categoria, p.categoria) != ''
              ${df.clause}
              ${vf.clause}
              ${cf.clause}
            GROUP BY 1
            ORDER BY vendas DESC
            LIMIT 10
        `;

        // Execute all queries concurrently
        const [vRes, vPrevRes, devRes, devPrevRes, sellersRes, prodsRes, brandsRes, regionsRes, categoriesRes] = await Promise.all([
            db.query(vQuery, baseParams),
            db.query(vPrevQuery, prevParams),
            db.query(devMes.sql, devMes.params),
            db.query(devAnt.sql, devAnt.params),
            db.query(sellersQuery, baseParams),
            db.query(prodsQuery, baseParams),
            db.query(brandsQuery, baseParams),
            db.query(regionsQuery, baseParams),
            db.query(categoriesQuery, baseParams)
        ]);

        const v = vRes.rows;
        const vPrev = vPrevRes.rows;
        const devolucoes = parseFloat(devRes.rows[0].total);
        const devolucoes_anterior = parseFloat(devPrevRes.rows[0].total);

        const faturamento = parseFloat(v[0].faturamento_total) - devolucoes;
        const faturamento_anterior = parseFloat(vPrev[0].faturamento_total) - devolucoes_anterior;

        const crescimento_pct = faturamento_anterior > 0 ? ((faturamento - faturamento_anterior) / faturamento_anterior) * 100 : 0;

        const qtd = parseInt(v[0].total_pedidos, 10);
        const qtd_ant = parseInt(vPrev[0].total_pedidos, 10);
        const cresc_qtd_pct = qtd_ant > 0 ? ((qtd - qtd_ant) / qtd_ant) * 100 : 0;

        const tm = qtd > 0 ? faturamento / qtd : 0;
        const tm_ant = qtd_ant > 0 ? faturamento_anterior / qtd_ant : 0;
        const cresc_tm_pct = tm_ant > 0 ? ((tm - tm_ant) / tm_ant) * 100 : 0;

        const sellers = sellersRes.rows;
        const colors = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'];
        const top_sellers = sellers.map((s, i) => ({
            rank: i + 1,
            name: s.nome || 'N/A',
            value: parseFloat(s.vendas), // Map to value for UI
            metaPct: 100,
            metaStatus: 'Meta Alcançada',
            color: colors[i % colors.length]
        }));

        const prods = prodsRes.rows;
        const top_products = prods.map((p, i) => ({
            rank: i + 1,
            name: p.nome,
            current: parseFloat(p.vendas),
            prev: null,
            delta: null
        }));

        const brands = brandsRes.rows;
        const top_brands = brands.map((b, i) => ({
            rank: i + 1,
            name: b.nome,
            current: parseFloat(b.vendas),
            prev: null,
            delta: null
        }));

        const regions = regionsRes.rows;
        const top_regions = regions.map((r, i) => ({
            rank: i + 1,
            name: r.nome,
            current: parseFloat(r.vendas),
            share: faturamento > 0 ? ((parseFloat(r.vendas) / faturamento) * 100).toFixed(1) : 0
        }));

        const categories = categoriesRes.rows;
        const top_categories = categories.map((c, i) => ({
            rank: i + 1,
            name: c.nome,
            current: parseFloat(c.vendas),
            prev: null, // Removed fake mock
            delta: null // Removed fake mock
        }));

        // --- 7. Top Clientes ---
        const { rows: clients } = await db.query(`
            SELECT COALESCE(c.nome, 'Cliente ' || COALESCE(v.cliente_id_firebird::text, '?')) as nome, 
                   SUM(
                       v.valor_total - COALESCE(v.valor_desconto, 0)
                   ) as vendas
            FROM dash_vendas v
            LEFT JOIN dash_clientes c ON c.id_firebird = v.cliente_id_firebird AND c.tenant_id = v.tenant_id
            WHERE v.tenant_id = $1 AND v.data_hora_proc >= $2 AND v.data_hora_proc <= $3 
              ${salesFilter}
              ${df.clause}
              ${vf.clause}
              ${cf.clause}
            GROUP BY 1
            ORDER BY vendas DESC
            LIMIT 10
        `, [tenantId, toSafeSqlString(start), toSafeSqlString(end), ...df.params, ...vf.params, ...cf.params]);

        const top_clients = clients.map((c, i) => ({
            rank: i + 1,
            name: c.nome,
            value: parseFloat(c.vendas)
        }));

        // --- 8. Trajetória da Receita (Evolução Diária) ---
        const { rows: trajectory } = await db.query(`
            SELECT 
                TO_CHAR(v.data_hora_proc, 'YYYY-MM-DD') AS dia,
                SUM(v.valor_total - COALESCE(v.valor_desconto, 0)) AS valor
            FROM dash_vendas v
            ${cidadeJoin}
            WHERE v.tenant_id = $1 AND v.data_hora_proc >= $2 AND v.data_hora_proc <= $3
              ${salesFilter}
              ${df.clause}
              ${vf.clause}
              ${cf.clause}
            GROUP BY DATE_TRUNC('day', v.data_hora_proc), TO_CHAR(v.data_hora_proc, 'YYYY-MM-DD')
            ORDER BY DATE_TRUNC('day', v.data_hora_proc) ASC
        `, [tenantId, toSafeSqlString(start), toSafeSqlString(end), ...df.params, ...vf.params, ...cf.params]);

        const revenue_trajectory = trajectory.map(t => ({
            dia: t.dia,
            valor: parseFloat(t.valor)
        }));

        res.json({
            executive_summary: {
                faturamento, faturamento_anterior, crescimento_pct,
                quantidade_pedidos: qtd, quantidade_pedidos_anterior: qtd_ant, crescimento_pedidos_pct: cresc_qtd_pct,
                quantidade_itens: parseFloat(v[0].total_itens || 0),
                quantidade_itens_anterior: parseFloat(vPrev[0].total_itens || 0),
                ticket_medio: tm, ticket_medio_anterior: tm_ant, crescimento_ticket_pct: cresc_tm_pct
            },
            top_sellers,
            top_products,
            top_brands,
            top_regions,
            top_categories,
            top_clients,
            revenue_trajectory
        });
    } catch (err) { next(err); }
});

// GET /api/bi/sales/commercial-kpis
router.get('/sales/commercial-kpis', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const { start, end } = await getBiDateRange(req, tenantId);
        const deptoId = req.query.depto_id;
        const vendedorId = req.query.vendedor_id;
        const cidade = req.query.cidade;
        const grupo = req.query.grupo;
        const marca = req.query.marca;

        const df = buildDeptoFilter(deptoId, 4, 'v');
        let nextParamIndex = 4 + df.params.length;

        const vf = buildVendedorFilter(vendedorId, nextParamIndex, 'v');
        nextParamIndex += vf.params.length;

        const cf = buildCidadeFilter(cidade, nextParamIndex, 'c');
        nextParamIndex += cf.params.length;

        const gf = buildGrupoFilter(grupo, nextParamIndex, 'vi', 'p');
        nextParamIndex += gf.params.length;

        const mf = buildMarcaFilter(marca, nextParamIndex, 'vi', 'p');
        nextParamIndex += mf.params.length;

        const salesFilter = cfopUtil.getSalesFilterClause('v');

        const hasItemFilter = (grupo && grupo !== 'todas' && grupo !== 'all' && grupo !== 'TODOS') || 
                              (marca && marca !== 'todas' && marca !== 'all' && marca !== 'TODOS');

        // Construir os parâmetros base para queries
        const baseParams = [tenantId, toSafeSqlString(start), toSafeSqlString(end), ...df.params, ...vf.params, ...cf.params];
        const allParams = [...baseParams];
        if (hasItemFilter) {
            allParams.push(...gf.params, ...mf.params);
        }

        // 1. Produtos vendidos (QTD)
        let itemsQuery;
        if (hasItemFilter) {
            itemsQuery = `
                SELECT COALESCE(SUM(vi.quantidade), 0) AS qtd
                FROM dash_vendas_itens vi
                JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id
                LEFT JOIN dash_produtos p ON p.id_firebird = vi.produto_id_firebird AND p.tenant_id = vi.tenant_id
                LEFT JOIN dash_clientes c ON c.id_firebird = v.cliente_id_firebird AND c.tenant_id = v.tenant_id
                WHERE vi.tenant_id = $1 AND v.data_hora_proc >= $2 AND v.data_hora_proc <= $3 
                  ${salesFilter}
                  ${df.clause}
                  ${vf.clause}
                  ${cf.clause}
                  ${gf.clause}
                  ${mf.clause}
            `;
        } else {
            itemsQuery = `
                SELECT COALESCE(SUM(vi.quantidade), 0) AS qtd
                FROM dash_vendas_itens vi
                JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id
                LEFT JOIN dash_clientes c ON c.id_firebird = v.cliente_id_firebird AND c.tenant_id = v.tenant_id
                WHERE vi.tenant_id = $1 AND v.data_hora_proc >= $2 AND v.data_hora_proc <= $3 
                  ${salesFilter}
                  ${df.clause}
                  ${vf.clause}
                  ${cf.clause}
            `;
        }
        const { rows: pItems } = await db.query(itemsQuery, allParams);

        // 2. Pedidos e Faturamento Total (Bruto)
        let salesQuery;
        if (hasItemFilter) {
            salesQuery = `
                SELECT 
                    COUNT(DISTINCT v.id_firebird) as pedidos,
                    COALESCE(SUM(v.valor_total - COALESCE(v.valor_desconto, 0)), 0) as faturamento_total
                FROM dash_vendas v
                INNER JOIN dash_vendas_itens vi ON vi.venda_id_firebird = v.id_firebird AND vi.tenant_id = v.tenant_id
                LEFT JOIN dash_produtos p ON p.id_firebird = vi.produto_id_firebird AND p.tenant_id = vi.tenant_id
                LEFT JOIN dash_clientes c ON c.id_firebird = v.cliente_id_firebird AND c.tenant_id = v.tenant_id
                WHERE v.tenant_id = $1 AND v.data_hora_proc >= $2 AND v.data_hora_proc <= $3 
                  ${salesFilter}
                  ${df.clause}
                  ${vf.clause}
                  ${cf.clause}
                  ${gf.clause}
                  ${mf.clause}
            `;
        } else {
            salesQuery = `
                SELECT 
                    COUNT(DISTINCT v.id_firebird) as pedidos,
                    COALESCE(SUM(v.valor_total - COALESCE(v.valor_desconto, 0)), 0) as faturamento_total
                FROM dash_vendas v
                LEFT JOIN dash_clientes c ON c.id_firebird = v.cliente_id_firebird AND c.tenant_id = v.tenant_id
                WHERE v.tenant_id = $1 AND v.data_hora_proc >= $2 AND v.data_hora_proc <= $3 
                  ${salesFilter}
                  ${df.clause}
                  ${vf.clause}
                  ${cf.clause}
            `;
        }
        const { rows: pVendas } = await db.query(salesQuery, allParams);

        // 3. Total descontos
        let discountQuery;
        if (hasItemFilter) {
            discountQuery = `
                SELECT COALESCE(SUM(v.valor_desconto), 0) AS descontos
                FROM dash_vendas v
                INNER JOIN dash_vendas_itens vi ON vi.venda_id_firebird = v.id_firebird AND vi.tenant_id = v.tenant_id
                LEFT JOIN dash_produtos p ON p.id_firebird = vi.produto_id_firebird AND p.tenant_id = vi.tenant_id
                LEFT JOIN dash_clientes c ON c.id_firebird = v.cliente_id_firebird AND c.tenant_id = v.tenant_id
                WHERE v.tenant_id = $1 AND v.data_hora_proc >= $2 AND v.data_hora_proc <= $3
                  ${salesFilter}
                  ${df.clause}
                  ${vf.clause}
                  ${cf.clause}
                  ${gf.clause}
                  ${mf.clause}
            `;
        } else {
            discountQuery = `
                SELECT COALESCE(SUM(v.valor_desconto), 0) AS descontos
                FROM dash_vendas v
                LEFT JOIN dash_clientes c ON c.id_firebird = v.cliente_id_firebird AND c.tenant_id = v.tenant_id
                WHERE v.tenant_id = $1 AND v.data_hora_proc >= $2 AND v.data_hora_proc <= $3
                  ${salesFilter}
                  ${df.clause}
                  ${vf.clause}
                  ${cf.clause}
            `;
        }
        const { rows: d } = await db.query(discountQuery, allParams);

        // 4. Vendedores
        let vendsQuery;
        if (hasItemFilter) {
            vendsQuery = `
                SELECT COALESCE(vend.nome, 'Vendedor ' || COALESCE(v.vendedor_id_firebird::text, '?')) as nome, 
                       SUM(v.valor_total - COALESCE(v.valor_desconto, 0)) as vendas
                FROM dash_vendas v
                INNER JOIN dash_vendas_itens vi ON vi.venda_id_firebird = v.id_firebird AND vi.tenant_id = v.tenant_id
                LEFT JOIN dash_produtos p ON p.id_firebird = vi.produto_id_firebird AND p.tenant_id = vi.tenant_id
                LEFT JOIN dash_vendedores vend ON vend.id_firebird = v.vendedor_id_firebird AND vend.tenant_id = v.tenant_id
                LEFT JOIN dash_clientes c ON c.id_firebird = v.cliente_id_firebird AND c.tenant_id = v.tenant_id
                WHERE v.tenant_id = $1 AND v.data_hora_proc >= $2 AND v.data_hora_proc <= $3 
                  ${salesFilter}
                  ${df.clause}
                  ${vf.clause}
                  ${cf.clause}
                  ${gf.clause}
                  ${mf.clause}
                GROUP BY v.vendedor_id_firebird, vend.nome
                ORDER BY vendas DESC
                LIMIT 10
            `;
        } else {
            vendsQuery = `
                SELECT COALESCE(vend.nome, 'Vendedor ' || COALESCE(v.vendedor_id_firebird::text, '?')) as nome, 
                       SUM(v.valor_total - COALESCE(v.valor_desconto, 0)) as vendas
                FROM dash_vendas v
                LEFT JOIN dash_vendedores vend ON vend.id_firebird = v.vendedor_id_firebird AND vend.tenant_id = v.tenant_id
                LEFT JOIN dash_clientes c ON c.id_firebird = v.cliente_id_firebird AND c.tenant_id = v.tenant_id
                WHERE v.tenant_id = $1 AND v.data_hora_proc >= $2 AND v.data_hora_proc <= $3 
                  ${salesFilter}
                  ${df.clause}
                  ${vf.clause}
                  ${cf.clause}
                GROUP BY v.vendedor_id_firebird, vend.nome
                ORDER BY vendas DESC
                LIMIT 10
            `;
        }
        const { rows: vends } = await db.query(vendsQuery, allParams);

        // 5. Devoluções
        const getDevQuery = (startStr, endStr) => {
            let sql = `SELECT COALESCE(SUM(d.valor), 0) AS total FROM dash_devolucoes d`;
            let params = [tenantId, startStr, endStr];
            let nextIdx = 4;

            const needsVendedorJoin = (vendedorId && vendedorId !== 'todas' && vendedorId !== 'all' && vendedorId !== 'TODOS');
            const needsCidadeJoin = (cidade && cidade !== 'todas' && cidade !== 'all' && cidade !== 'TODOS');
            const needsProdJoin = (grupo && grupo !== 'todas' && grupo !== 'all' && grupo !== 'TODOS') || 
                                  (marca && marca !== 'todas' && marca !== 'all' && marca !== 'TODOS');

            if (needsVendedorJoin || needsCidadeJoin || (deptoId && deptoId !== 'todas' && deptoId !== 'all')) {
                sql += ` LEFT JOIN dash_vendas v2 ON v2.id_firebird = d.venda_id_firebird AND v2.tenant_id = d.tenant_id`;
            }
            if (needsCidadeJoin) {
                sql += ` LEFT JOIN dash_clientes c2 ON c2.id_firebird = v2.cliente_id_firebird AND c2.tenant_id = v2.tenant_id`;
            }
            if (needsProdJoin) {
                sql += ` LEFT JOIN dash_produtos p2 ON p2.id_firebird = d.produto_id_firebird AND p2.tenant_id = d.tenant_id`;
            }

            sql += ` WHERE d.tenant_id = $1 AND d.data_devolucao >= $2 AND d.data_devolucao <= $3`;

            if (deptoId && deptoId !== 'todas' && deptoId !== 'all') {
                const dfDev = buildDeptoFilter(deptoId, nextIdx, 'v2');
                sql += dfDev.clause;
                params.push(...dfDev.params);
                nextIdx += dfDev.params.length;
            }
            if (needsVendedorJoin) {
                const vfDev = buildVendedorFilter(vendedorId, nextIdx, 'v2');
                sql += vfDev.clause;
                params.push(...vfDev.params);
                nextIdx += vfDev.params.length;
            }
            if (needsCidadeJoin) {
                const cfDev = buildCidadeFilter(cidade, nextIdx, 'c2');
                sql += cfDev.clause;
                params.push(...cfDev.params);
                nextIdx += cfDev.params.length;
            }
            if (grupo && grupo !== 'todas' && grupo !== 'all' && grupo !== 'TODOS') {
                const gfDev = buildGrupoFilter(grupo, nextIdx, 'p2', 'p2');
                sql += gfDev.clause;
                params.push(...gfDev.params);
                nextIdx += gfDev.params.length;
            }
            if (marca && marca !== 'todas' && marca !== 'all' && marca !== 'TODOS') {
                const mfDev = buildMarcaFilter(marca, nextIdx, 'p2', 'p2');
                sql += mfDev.clause;
                params.push(...mfDev.params);
                nextIdx += mfDev.params.length;
            }

            return { sql, params };
        };

        const devQuery = getDevQuery(toSafeSqlString(start), toSafeSqlString(end));
        const { rows: dev_rows } = await db.query(devQuery.sql, devQuery.params);
        const devolucoes = parseFloat(dev_rows[0].total);

        // Faturamento Líquido
        const totalFaturamento = parseFloat(pVendas[0].faturamento_total || 0) - devolucoes;

        const top_sellers = vends.map((v, i) => {
            const colors = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#14B8A6'];
            return {
                name: v.nome,
                value: parseFloat(v.vendas),
                share: totalFaturamento > 0 ? (parseFloat(v.vendas) / totalFaturamento) * 100 : 0,
                color: colors[i % colors.length]
            };
        });

        const totalPedidos = parseInt(pVendas[0].pedidos || 0);
        const ticketMedio = totalPedidos > 0 ? totalFaturamento / totalPedidos : 0;

        // 6. Pedidos recentes
        let recentQuery;
        if (hasItemFilter) {
            recentQuery = `
                SELECT 
                    v.id_firebird as id,
                    v.numero_pedido as numero_nota,
                    c.nome as cliente,
                    vend.nome as vendedor,
                    TO_CHAR(v.data_hora_proc, 'DD/MM/YYYY') as data,
                    v.valor_total - COALESCE(v.valor_desconto, 0) as valor,
                    v.status,
                    v.es,
                    v.processo
                FROM dash_vendas v
                LEFT JOIN dash_clientes c ON c.id_firebird = v.cliente_id_firebird AND c.tenant_id = v.tenant_id
                LEFT JOIN dash_vendedores vend ON vend.id_firebird = v.vendedor_id_firebird AND vend.tenant_id = v.tenant_id
                WHERE v.tenant_id = $1 AND v.data_hora_proc >= $2 AND v.data_hora_proc <= $3
                  ${salesFilter}
                  ${df.clause}
                  ${vf.clause}
                  ${cf.clause}
                  AND v.id_firebird IN (
                      SELECT vi.venda_id_firebird
                      FROM dash_vendas_itens vi
                      LEFT JOIN dash_produtos p ON p.id_firebird = vi.produto_id_firebird AND p.tenant_id = vi.tenant_id
                      WHERE vi.tenant_id = $1
                        ${gf.clause}
                        ${mf.clause}
                  )
                ORDER BY v.data_hora_proc DESC, v.id_firebird DESC
            `;
        } else {
            recentQuery = `
                SELECT 
                    v.id_firebird as id,
                    v.numero_pedido as numero_nota,
                    c.nome as cliente,
                    vend.nome as vendedor,
                    TO_CHAR(v.data_hora_proc, 'DD/MM/YYYY') as data,
                    v.valor_total - COALESCE(v.valor_desconto, 0) as valor,
                    v.status,
                    v.es,
                    v.processo
                FROM dash_vendas v
                LEFT JOIN dash_clientes c ON c.id_firebird = v.cliente_id_firebird AND c.tenant_id = v.tenant_id
                LEFT JOIN dash_vendedores vend ON vend.id_firebird = v.vendedor_id_firebird AND vend.tenant_id = v.tenant_id
                WHERE v.tenant_id = $1 AND v.data_hora_proc >= $2 AND v.data_hora_proc <= $3
                  ${salesFilter}
                  ${df.clause}
                  ${vf.clause}
                  ${cf.clause}
                ORDER BY v.data_hora_proc DESC, v.id_firebird DESC
            `;
        }
        const { rows: recent } = await db.query(recentQuery, allParams);

        res.json({
            produtos_vendidos: parseFloat(pItems[0].qtd),
            descontos_concedidos: parseFloat(d[0].descontos),
            faturamento_total: totalFaturamento,
            ticket_medio: ticketMedio,
            total_pedidos: totalPedidos,
            meta_atingida_pct: 0,
            projecao_fechamento: 0,
            top_sellers,
            recent_orders: recent.map(r => ({
                id: String(r.id),
                numero_nota: r.numero_nota || '-',
                cliente: r.cliente || 'Consumidor',
                vendedor: r.vendedor || 'Vendedor',
                data: r.data,
                valor: parseFloat(r.valor || 0),
                status: r.status,
                es: r.es,
                processo: r.processo
            }))
        });
    } catch (err) { next(err); }
});


// GET /api/bi/sales/sellers
router.get('/sales/sellers', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const { start, end } = await getBiDateRange(req, tenantId);
        const deptoId = req.query.depto_id;
        const df = buildDeptoFilter(deptoId, 4, 'v');
        
        const salesFilter = cfopUtil.getSalesFilterClause('v');

        const { rows } = await db.query(`
            SELECT 
                vend.nome as nome_vendedor, 
                SUM(v.valor_total - COALESCE(v.valor_desconto, 0)) as faturamento, 
                COUNT(v.id_firebird) as pedidos,
                COALESCE(AVG(v.valor_total - COALESCE(v.valor_desconto, 0)), 0) as ticket_medio,
                COALESCE(SUM(v.valor_total - COALESCE(v.valor_desconto, 0) - v.valor_custo), 0) as lucro,
                MAX(v.data_hora_proc) as ultima_venda
            FROM dash_vendas v
            JOIN dash_vendedores vend ON vend.id_firebird = v.vendedor_id_firebird AND vend.tenant_id = v.tenant_id
            WHERE v.tenant_id = $1 AND v.data_hora_proc >= $2 AND v.data_hora_proc <= $3
              ${salesFilter}
              ${df.clause}
            GROUP BY vend.id_firebird, vend.nome
            ORDER BY faturamento DESC
        `, [tenantId, toSafeSqlString(start), toSafeSqlString(end), ...df.params]);

        const mapped = rows.map(r => ({
            vendedor_id: r.vendedor_id_firebird || 0,
            nome_vendedor: r.nome_vendedor,
            faturamento: parseFloat(r.faturamento),
            pedidos: parseInt(r.pedidos, 10),
            ticket_medio: parseFloat(r.ticket_medio),
            margem_pct: parseFloat(r.faturamento) > 0 ? (parseFloat(r.lucro) / parseFloat(r.faturamento)) * 100 : 0,
            meta_pct: 100, // Mock for now
            status: 'Ativo',
            ultima_venda: r.ultima_venda
        }));

        res.json({ data: mapped });
    } catch (err) { next(err); }
});

// GET /api/bi/sales/abc-analysis
router.get('/sales/abc-analysis', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;

        // Inventory values from dash_produtos
        const { rows: inv } = await db.query(`
            SELECT 
                COALESCE(SUM(estoque * custo), 0) AS valor_estoque_custo,
                COALESCE(SUM(estoque * preco), 0) AS valor_estoque_venda,
                COALESCE(SUM(estoque), 0) AS total_volume,
                COUNT(CASE WHEN estoque > 0 THEN 1 END) AS skus_com_saldo,
                COUNT(id_firebird) AS total_skus
            FROM dash_produtos
            WHERE tenant_id = $1 AND ativo = true
        `, [tenantId]);

        const valor_estoque_custo = parseFloat(inv[0].valor_estoque_custo);
        const valor_estoque_venda = parseFloat(inv[0].valor_estoque_venda);
        const total_volume = parseInt(inv[0].total_volume, 10);
        const skus_com_saldo = parseInt(inv[0].skus_com_saldo, 10);
        const total_skus = parseInt(inv[0].total_skus, 10);
        const ruptura_pct = total_skus > 0 ? ((total_skus - skus_com_saldo) / total_skus) * 100 : 0;

        const salesFilter = cfopUtil.getSalesFilterClause('v');

        // Fetch product list and calculate ABC
        const { rows: prods } = await db.query(`
            SELECT 
                p.id_firebird, p.nome, COALESCE(p.marca, 'DIVERSAS') as marca, 
                COALESCE(p.categoria, 'OUTROS') as grupo, p.estoque, p.custo, p.preco,
                COALESCE(SUM(vi.valor_total), 0) as faturamento_historico
            FROM dash_produtos p
            LEFT JOIN dash_vendas_itens vi ON vi.produto_id_firebird = p.id_firebird AND vi.tenant_id = p.tenant_id
            LEFT JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id ${salesFilter}
            WHERE p.tenant_id = $1 AND p.ativo = true
            GROUP BY p.id_firebird, p.nome, p.marca, p.categoria, p.estoque, p.custo, p.preco
            ORDER BY faturamento_historico DESC
            LIMIT 500
        `, [tenantId]);

        let totalFaturamentoGeral = 0;
        prods.forEach(r => totalFaturamentoGeral += parseFloat(r.faturamento_historico));

        let acumulado = 0;
        const mapped = prods.map(p => {
            const fat = parseFloat(p.faturamento_historico);
            const pct = totalFaturamentoGeral > 0 ? (fat / totalFaturamentoGeral) * 100 : 0;
            acumulado += pct;
            
            let curva = 'C';
            if (acumulado <= 80) curva = 'A';
            else if (acumulado <= 95) curva = 'B';

            const estoque = parseFloat(p.estoque);
            let status = 'Ideal';
            let alert = false;
            if (estoque <= 0) { status = 'Sem Giro'; alert = true; }
            else if (estoque < 10) { status = 'Crítico'; alert = true; }
            else if (estoque < 20) { status = 'Atenção'; }

            return {
                cod: String(p.id_firebird),
                desc: p.nome,
                emb: 'UN',
                marca: p.marca,
                grupo: p.grupo,
                abc: curva,
                status: status,
                estoque: estoque,
                custo: parseFloat(p.custo),
                preco: parseFloat(p.preco),
                dias: 30, // Mock for now
                alert: alert,
                faturamento: fat
            };
        });

        // Distribution by Grupo
        const { rows: distGrupo } = await db.query(`
            SELECT COALESCE(categoria, 'OUTROS') as name, COUNT(id_firebird) as value
            FROM dash_produtos WHERE tenant_id = $1 AND ativo = true GROUP BY categoria ORDER BY value DESC LIMIT 10
        `, [tenantId]);

        // Distribution by Marca
        const { rows: distMarca } = await db.query(`
            SELECT COALESCE(marca, 'DIVERSAS') as name, COUNT(id_firebird) as value
            FROM dash_produtos WHERE tenant_id = $1 AND ativo = true GROUP BY marca ORDER BY value DESC LIMIT 10
        `, [tenantId]);

        // Bar Chart (Top 15 Marcas por Estoque)
        const { rows: barChart } = await db.query(`
            SELECT COALESCE(marca, 'DIVERSAS') as name, SUM(estoque * custo) as estoque
            FROM dash_produtos WHERE tenant_id = $1 AND ativo = true GROUP BY marca ORDER BY estoque DESC LIMIT 15
        `, [tenantId]);

        res.json({
            kpis: {
                valor_estoque_custo,
                valor_estoque_venda,
                total_volume,
                skus_com_saldo,
                ruptura_pct,
                curva_a_count: mapped.filter(x => x.abc === 'A').length,
                curva_b_count: mapped.filter(x => x.abc === 'B').length,
                curva_c_count: mapped.filter(x => x.abc === 'C').length
            },
            distGrupo: distGrupo.map(g => ({ name: g.name, value: parseInt(g.value) })),
            distMarca: distMarca.map(m => ({ name: m.name, value: parseInt(m.value) })),
            barChartData: barChart.map(b => ({ name: b.name, estoque: parseFloat(b.estoque), giro: '0x' })),
            tableData: mapped
        });
    } catch (err) { next(err); }
});

// ==========================================
// MÓDULO: FINANCIAL INTELLIGENCE
// ==========================================

// GET /api/bi/financial/summary
router.get('/financial/summary', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const { start, end } = await getBiDateRange(req, tenantId);
        const centroCusto = req.query.centro_custo;
        const deptoId = req.query.depto_id;
        
        let cf = { clause: '', params: [] };
        if (centroCusto && centroCusto !== 'todas') {
            cf = buildCentroCustoFilter(centroCusto, 4, 'f');
        } else if (deptoId && deptoId !== 'todas') {
            cf = buildDeptoFilter(deptoId, 4, 'f');
        }

        const { rows: f } = await db.query(`
            SELECT 
                COALESCE(SUM(CASE WHEN TRIM(f.tipo) = 'RECEBER' AND TRIM(f.status_pagamento) = 'ABERTO' THEN f.valor - (CASE WHEN f.valor_pago = 0 THEN 0 ELSE f.valor_pago END) ELSE 0 END), 0) AS contas_receber,
                COALESCE(SUM(CASE WHEN TRIM(f.tipo) = 'PAGAR' AND TRIM(f.status_pagamento) = 'ABERTO' THEN f.valor - (CASE WHEN f.valor_pago = 0 THEN 0 ELSE f.valor_pago END) ELSE 0 END), 0) AS contas_pagar,
                COALESCE(SUM(CASE WHEN TRIM(f.tipo) = 'RECEBER' AND TRIM(f.status_pagamento) = 'ABERTO' AND f.data_vencimento < NOW() THEN f.valor - (CASE WHEN f.valor_pago = 0 THEN 0 ELSE f.valor_pago END) ELSE 0 END), 0) AS receber_vencido,
                COALESCE(SUM(CASE WHEN TRIM(f.tipo) = 'PAGAR' AND TRIM(f.status_pagamento) = 'ABERTO' AND f.data_vencimento < NOW() THEN f.valor - (CASE WHEN f.valor_pago = 0 THEN 0 ELSE f.valor_pago END) ELSE 0 END), 0) AS pagar_vencido,
                COALESCE(SUM(CASE WHEN TRIM(f.tipo) = 'RECEBER' AND TRIM(f.status_pagamento) = 'PAGO' AND COALESCE(f.data_pagamento, f.data_vencimento, NOW()) >= $2 AND COALESCE(f.data_pagamento, f.data_vencimento, NOW()) <= $3 THEN (CASE WHEN f.valor_pago = 0 THEN f.valor ELSE f.valor_pago END) ELSE 0 END), 0) AS recebimentos_realizados,
                COALESCE(SUM(CASE WHEN TRIM(f.tipo) = 'PAGAR' AND TRIM(f.status_pagamento) = 'PAGO' AND COALESCE(f.data_pagamento, f.data_vencimento, NOW()) >= $2 AND COALESCE(f.data_pagamento, f.data_vencimento, NOW()) <= $3 THEN (CASE WHEN f.valor_pago = 0 THEN f.valor ELSE f.valor_pago END) ELSE 0 END), 0) AS pagamentos_realizados
            FROM dash_financeiro f
            WHERE f.tenant_id = $1
            ${cf.clause}
        `, [tenantId, toSafeSqlString(start), toSafeSqlString(end), ...cf.params]);

        const a_receber = parseFloat(f[0].contas_receber);
        const a_pagar = parseFloat(f[0].contas_pagar);
        const receber_vencido = parseFloat(f[0].receber_vencido);
        const pagar_vencido = parseFloat(f[0].pagar_vencido);
        const recebidos = parseFloat(f[0].recebimentos_realizados);
        const pagos = parseFloat(f[0].pagamentos_realizados);
        const inadimplencia_pct = a_receber > 0 ? (receber_vencido / a_receber) * 100 : 0;

        let cfList = { clause: '', params: [] };
        if (centroCusto && centroCusto !== 'todas') {
            cfList = buildCentroCustoFilter(centroCusto, 2, 'f');
        } else if (deptoId && deptoId !== 'todas') {
            cfList = buildDeptoFilter(deptoId, 2, 'f');
        }

        const { rows: ultimasPagas } = await db.query(`
            SELECT 
                f.descricao,
                COALESCE(f.data_pagamento, f.data_vencimento)::text AS data_pagamento,
                (CASE WHEN f.valor_pago = 0 THEN f.valor ELSE f.valor_pago END) AS valor
            FROM dash_financeiro f
            WHERE f.tenant_id = $1 
              AND TRIM(f.tipo) = 'PAGAR' 
              AND TRIM(f.status_pagamento) = 'PAGO'
              ${cfList.clause}
            ORDER BY COALESCE(f.data_pagamento, f.data_vencimento) DESC, f.id DESC
            LIMIT 10
        `, [tenantId, ...cfList.params]);

        const { rows: ultimasRecebidas } = await db.query(`
            SELECT 
                f.descricao,
                COALESCE(f.data_pagamento, f.data_vencimento)::text AS data_pagamento,
                (CASE WHEN f.valor_pago = 0 THEN f.valor ELSE f.valor_pago END) AS valor
            FROM dash_financeiro f
            WHERE f.tenant_id = $1 
              AND TRIM(f.tipo) = 'RECEBER' 
              AND TRIM(f.status_pagamento) = 'PAGO'
              ${cfList.clause}
            ORDER BY COALESCE(f.data_pagamento, f.data_vencimento) DESC, f.id DESC
            LIMIT 10
        `, [tenantId, ...cfList.params]);

        res.json({
            saldo_atual: recebidos - pagos,
            contas_receber: a_receber,
            contas_pagar: a_pagar,
            receber_vencido: receber_vencido,
            pagar_vencido: pagar_vencido,
            recebimentos_realizados: recebidos,
            pagamentos_realizados: pagos,
            inadimplencia_pct: Number(inadimplencia_pct.toFixed(1)),
            ultimas_pagas: ultimasPagas,
            ultimas_recebidas: ultimasRecebidas
        });
    } catch (err) { next(err); }
});

// GET /api/bi/financial/cash-flow (Mocked placeholder pending complex daily group by)
router.get('/financial/cash-flow', async (req, res, next) => {
    try {
        // Return an empty array for now to let frontend use the placeholder or show empty state
        res.json({
            dre_resumo: {
                receita_operacional: 0,
                custos_operacionais: 0,
                despesas_fixas: 0,
                ebitda: 0,
                lucro_liquido: 0,
                margem_liquida_pct: 0
            },
            fluxo_caixa: []
        });
    } catch (err) { next(err); }
});

// ==========================================
// MÓDULO: CUSTOMER ANALYTICS & RADAR 360
// ==========================================

// GET /api/bi/customer/analytics
router.get('/customer/analytics', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const { start, end } = await getBiDateRange(req, tenantId);
        const deptoId = req.query.depto_id;
        const df = buildDeptoFilter(deptoId, 4, 'v');
        
        const salesFilter = cfopUtil.getSalesFilterClause('v');

        // Clientes ativos vs Novos
        const { rows: atv } = await db.query(`
            SELECT COUNT(DISTINCT v.cliente_id_firebird) AS ativos
            FROM dash_vendas v
            WHERE v.tenant_id = $1 AND v.data_hora_proc >= $2 AND v.data_hora_proc <= $3 
              ${salesFilter}
              ${df.clause}
        `, [tenantId, toSafeSqlString(start), toSafeSqlString(end), ...df.params]);

        const { rows: tot } = await db.query(`
            SELECT 
                COUNT(*) AS totais,
                SUM(CASE WHEN c.data_cadastro >= $2 AND c.data_cadastro <= $3 THEN 1 ELSE 0 END) AS novos
            FROM dash_clientes c
            WHERE c.tenant_id = $1 AND c.ativo = true
              AND (c.tipo IS NULL OR UPPER(TRIM(c.tipo)) NOT IN ('FORNECEDOR', 'FORNECEDORES', 'FORNEC'))
              AND EXISTS (SELECT 1 FROM dash_vendas vx WHERE vx.cliente_id_firebird = c.id_firebird AND vx.tenant_id = c.tenant_id)
              AND EXISTS (SELECT 1 FROM dash_financeiro fx WHERE fx.cliente_id_firebird = c.id_firebird AND fx.tenant_id = c.tenant_id)
        `, [tenantId, toSafeSqlString(start), toSafeSqlString(end)]);

        // Top 50 clientes em risco (compraram antes do inicio, mas nao no periodo atual)
        const { rows: risco } = await db.query(`
            SELECT c.id_firebird, c.nome, MAX(v.data_hora_proc) as ultima_compra, SUM(v.valor_total - COALESCE(v.valor_desconto, 0)) as LTV
            FROM dash_clientes c
            JOIN dash_vendas v ON v.cliente_id_firebird = c.id_firebird AND v.tenant_id = c.tenant_id
            WHERE c.tenant_id = $1 AND v.data_hora_proc < $2 AND c.ativo = true
              AND (c.tipo IS NULL OR UPPER(TRIM(c.tipo)) NOT IN ('FORNECEDOR', 'FORNECEDORES', 'FORNEC'))
              AND EXISTS (SELECT 1 FROM dash_financeiro fx WHERE fx.cliente_id_firebird = c.id_firebird AND fx.tenant_id = c.tenant_id)
              ${salesFilter}
              AND c.id_firebird NOT IN (
                  SELECT DISTINCT cliente_id_firebird FROM dash_vendas v
                  WHERE tenant_id = $1 AND COALESCE(data_vencimento, data_venda) >= $2 AND COALESCE(data_vencimento, data_venda) <= $3
                    ${salesFilter}
              )
              ${df.clause}
            GROUP BY c.id_firebird, c.nome
            ORDER BY ultima_compra DESC, LTV DESC
            LIMIT 50
        `, [tenantId, toSafeSqlString(start), toSafeSqlString(end), ...df.params]);

        const total_clientes = parseInt(tot[0].totais || 0);
        const clientes_ativos = parseInt(atv[0].ativos || 0);
        const retencao_pct = total_clientes > 0 ? (clientes_ativos / total_clientes) * 100 : 0;
        const novos = parseInt(tot[0].novos || 0);

        res.json({
            customer_overview: {
                total_clientes,
                clientes_ativos,
                clientes_novos: novos,
                clientes_em_crescimento: 0, // Mock
                clientes_em_queda: 0, // Mock
                clientes_inativos: total_clientes - clientes_ativos,
                taxa_retencao_pct: retencao_pct,
                valor_medio_cliente: 0 // Mock
            },
            top_clientes: [], // Mock array to fulfill interface, can add a heavy query later
            clientes_sem_comprar: risco.map(r => ({
                cliente_id: r.id_firebird,
                nome: r.nome,
                ultima_compra: r.ultima_compra,
                dias_sem_comprar: Math.floor((new Date() - new Date(r.ultima_compra)) / (1000 * 60 * 60 * 24)),
                faturamento_historico: parseFloat(r.ltv),
                frequencia_dias: 30, // Mock for now
                risco_churn_pct: 50.0 // Mock for now
            }))
        });
    } catch (err) { next(err); }
});

// GET /api/bi/customer/search
router.get('/customer/search', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const query = req.query.q?.toUpperCase() || '';
        
        if (!query || query.length < 3) {
            return res.json([]);
        }

        const salesFilter = cfopUtil.getSalesFilterClause('v');

        const { rows } = await db.query(`
            WITH matched_clientes AS (
                SELECT id_firebird, nome, documento, tenant_id
                FROM dash_clientes
                WHERE tenant_id = $1 
                  AND (UPPER(nome) LIKE $2 OR documento LIKE $2)
                  AND ativo = true
                  -- Excluir fornecedores puros (campo tipo sincronizado do ERP)
                  AND (tipo IS NULL OR UPPER(TRIM(tipo)) NOT IN ('FORNECEDOR', 'FORNECEDORES', 'FORNEC'))
                  -- Somente quem tem ao menos 1 pedido de venda vinculado
                  AND EXISTS (SELECT 1 FROM dash_vendas vx WHERE vx.cliente_id_firebird = id_firebird AND vx.tenant_id = tenant_id)
                ORDER BY nome ASC
                LIMIT 10
            )
            SELECT 
                c.id_firebird as id, 
                c.nome, 
                c.documento as cnpj,
                COALESCE((
                    SELECT SUM(v.valor_total - COALESCE(v.valor_desconto, 0)) 
                    FROM dash_vendas v 
                    WHERE v.cliente_id_firebird = c.id_firebird AND v.tenant_id = c.tenant_id
                      ${salesFilter}
                ), 0) as ltv,
                (
                    SELECT MAX(COALESCE(data_vencimento, data_venda)) 
                    FROM dash_vendas v 
                    WHERE v.cliente_id_firebird = c.id_firebird AND v.tenant_id = c.tenant_id
                      ${salesFilter}
                ) as ultima_compra
            FROM matched_clientes c
            ORDER BY c.nome ASC
        `, [tenantId, `%${query}%`]);

        // Calcula risco_churn basico no runtime para o Mini-Card
        const now = new Date();
        const results = rows.map(r => {
            let churnRisk = 0;
            if (r.ultima_compra) {
                const diffTime = Math.abs(now.getTime() - new Date(r.ultima_compra).getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays > 90) churnRisk = 95;
                else if (diffDays > 60) churnRisk = 75;
                else if (diffDays > 30) churnRisk = 40;
                else churnRisk = 10;
            } else {
                churnRisk = 100; // Nunca comprou
            }
            return { ...r, ltv: parseFloat(r.ltv), risco_churn_pct: churnRisk };
        });

        res.json(results);
    } catch (err) { next(err); }
});

router.get('/customer/radar-360', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const searchId = req.query.id; // Expecting a customer ID

        if (!searchId) {
            return res.json({
                dna: { cliente_id: 0, nome: "Busque um cliente", documento: "-", cidade: "-", estado: "-", data_cadastro: new Date(), status: "INATIVO", ltv: 0, qtd_pedidos: 0 },
                behavior: { produto_favorito: "-", marca_favorita: "-", ticket_medio_historico: 0, frequencia_dias: 0 },
                risk_assessment: { risco_churn_pct: 0, tendencia: "ESTAVEL", ultima_compra: null, dias_sem_comprar: 0 },
                order_history: []
            });
        }

        const { rows: c } = await db.query(`SELECT * FROM dash_clientes WHERE tenant_id = $1 AND id_firebird = $2`, [tenantId, searchId]);
        
        if (c.length === 0) return res.status(404).json({ error: 'Cliente não encontrado' });

        const cliente = c[0];
        const salesFilter = cfopUtil.getSalesFilterClause('v');
        const { start, end } = await getBiDateRange(req, tenantId);

        // LTV e Ticket Medio Histórico (Lifetime)
        const { rows: vInfo } = await db.query(`
            SELECT 
                COALESCE(SUM(v.valor_total - COALESCE(v.valor_desconto, 0)), 0) as ltv,
                COUNT(DISTINCT v.id_firebird) as total_pedidos,
                MAX(v.data_venda) as ultima_compra
            FROM dash_vendas v
            WHERE v.tenant_id = $1 AND v.cliente_id_firebird = $2 
              ${salesFilter}
        `, [tenantId, searchId]);

        const ltv = parseFloat(vInfo[0].ltv);
        const qtd_pedidos = parseInt(vInfo[0].total_pedidos);
        const ticket_medio_historico = qtd_pedidos > 0 ? ltv / qtd_pedidos : 0;
        const ultima_compra = vInfo[0].ultima_compra;
        const now = new Date();
        const dias_sem_comprar = ultima_compra ? Math.floor((now - new Date(ultima_compra)) / (1000 * 60 * 60 * 24)) : 999;

        // Risco Churn básico (baseado nos 45 dias médios do varejo)
        let risco_churn_pct = 0;
        if (dias_sem_comprar > 90) risco_churn_pct = 95;
        else if (dias_sem_comprar > 45) risco_churn_pct = 60;
        else if (dias_sem_comprar > 30) risco_churn_pct = 30;

        // Vendedor Estrela e todos os vendedores vinculados (Filtrado por data)
        const { rows: allSellers } = await db.query(`
            SELECT vend.nome AS vendedor, SUM(v.valor_total - COALESCE(v.valor_desconto, 0)) as total_vendido
            FROM dash_vendas v
            LEFT JOIN dash_vendedores vend ON vend.id_firebird = v.vendedor_id_firebird AND vend.tenant_id = v.tenant_id
            WHERE v.tenant_id = $1 AND v.cliente_id_firebird = $2 AND vend.nome IS NOT NULL AND vend.nome != ''
              AND v.data_venda >= $3 AND v.data_venda <= $4
              ${salesFilter}
            GROUP BY vend.nome
            ORDER BY total_vendido DESC
        `, [tenantId, searchId, toSafeSqlString(start), toSafeSqlString(end)]);
        const vendedor_estrela = allSellers.length > 0 ? allSellers[0].vendedor : 'N/A';

        // Melhor Horário (Densidade)
        const { rows: heatmap } = await db.query(`
            SELECT EXTRACT(HOUR FROM v.data_hora_proc) as hora, COUNT(*) as qtd
            FROM dash_vendas v
            WHERE v.tenant_id = $1 AND v.cliente_id_firebird = $2 AND v.data_hora_proc IS NOT NULL
              ${salesFilter}
            GROUP BY hora
            ORDER BY qtd DESC
            LIMIT 1
        `, [tenantId, searchId]);
        const melhor_horario = heatmap.length > 0 ? `${String(heatmap[0].hora).padStart(2, '0')}:00` : 'N/A';

        // Sazonalidade de Compras (Distribuição Mensal - Histórico)
        const { rows: monthlySales } = await db.query(`
            SELECT 
                EXTRACT(MONTH FROM v.data_venda) as mes, 
                SUM(v.valor_total - COALESCE(v.valor_desconto, 0)) as total
            FROM dash_vendas v
            WHERE v.tenant_id = $1 AND v.cliente_id_firebird = $2
              ${salesFilter}
            GROUP BY mes
            ORDER BY mes ASC
        `, [tenantId, searchId]);

        const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const sazonalidade = Array.from({ length: 12 }, (_, i) => {
            const mNum = i + 1;
            const match = monthlySales.find(m => parseInt(m.mes, 10) === mNum);
            return {
                mes: mesesNomes[i],
                total: match ? parseFloat(match.total || 0) : 0
            };
        });

        let mesMaior = 'N/A';
        let mesMenor = 'N/A';
        if (monthlySales.length > 0) {
            const sorted = [...monthlySales].sort((a, b) => parseFloat(b.total) - parseFloat(a.total));
            mesMaior = mesesNomes[parseInt(sorted[0].mes, 10) - 1];
            mesMenor = mesesNomes[parseInt(sorted[sorted.length - 1].mes, 10) - 1];
        }

        // Top 5 Produtos (Filtrado por data)
        const { rows: topProdutos } = await db.query(`
            SELECT 
                vi.produto as nome, 
                SUM(vi.quantidade) as qtd, 
                SUM(vi.valor_total) as total
            FROM dash_vendas_itens vi
            JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id
            WHERE v.tenant_id = $1 AND v.cliente_id_firebird = $2
              AND v.data_venda >= $3 AND v.data_venda <= $4
              ${salesFilter}
            GROUP BY vi.produto
            ORDER BY total DESC
            LIMIT 5
        `, [tenantId, searchId, toSafeSqlString(start), toSafeSqlString(end)]);

        const productsShare = topProdutos.map(p => ({
            nome: p.nome || 'Desconhecido',
            qtd: parseInt(p.qtd || 0, 10),
            total: parseFloat(p.total || 0),
            pct: ltv > 0 ? (parseFloat(p.total) / ltv) * 100 : 0
        }));

        // Top 5 Grupos (Categoria - Filtrado por data)
        const { rows: topGrupos } = await db.query(`
            SELECT 
                vi.categoria as nome, 
                SUM(vi.quantidade) as qtd, 
                SUM(vi.valor_total) as total
            FROM dash_vendas_itens vi
            JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id
            WHERE v.tenant_id = $1 AND v.cliente_id_firebird = $2
              AND v.data_venda >= $3 AND v.data_venda <= $4
              ${salesFilter}
            GROUP BY vi.categoria
            ORDER BY total DESC
            LIMIT 5
        `, [tenantId, searchId, toSafeSqlString(start), toSafeSqlString(end)]);

        const groupsShare = topGrupos.map(g => ({
            nome: g.nome || 'Desconhecido',
            qtd: parseInt(g.qtd || 0, 10),
            total: parseFloat(g.total || 0),
            pct: ltv > 0 ? (parseFloat(g.total) / ltv) * 100 : 0
        }));

        // Top 5 Marcas (Filtrado por data)
        const { rows: topMarcas } = await db.query(`
            SELECT 
                vi.marca as nome, 
                SUM(vi.quantidade) as qtd, 
                SUM(vi.valor_total) as total
            FROM dash_vendas_itens vi
            JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id
            WHERE v.tenant_id = $1 AND v.cliente_id_firebird = $2
              AND v.data_venda >= $3 AND v.data_venda <= $4
              ${salesFilter}
            GROUP BY vi.marca
            ORDER BY total DESC
            LIMIT 5
        `, [tenantId, searchId, toSafeSqlString(start), toSafeSqlString(end)]);

        const brandsShare = topMarcas.map(m => ({
            nome: m.nome || 'Desconhecido',
            qtd: parseInt(m.qtd || 0, 10),
            total: parseFloat(m.total || 0),
            pct: ltv > 0 ? (parseFloat(m.total) / ltv) * 100 : 0
        }));

        // Upsell Opportunities (Categorias que mais faturam na empresa mas o cliente nunca comprou)
        const { rows: upsellRows } = await db.query(`
            SELECT DISTINCT vi.categoria as nome, SUM(vi.valor_total) as total_cat
            FROM dash_vendas_itens vi
            JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id
            WHERE v.tenant_id = $1 
              AND vi.categoria IS NOT NULL AND vi.categoria != ''
              AND vi.categoria NOT IN (
                  SELECT DISTINCT vi2.categoria 
                  FROM dash_vendas_itens vi2
                  JOIN dash_vendas v2 ON v2.id_firebird = vi2.venda_id_firebird AND v2.tenant_id = vi2.tenant_id
                  WHERE v2.tenant_id = $1 AND v2.cliente_id_firebird = $2
              )
            GROUP BY vi.categoria
            ORDER BY total_cat DESC
            LIMIT 3
        `, [tenantId, searchId]);
        const upsell_oportunidades = upsellRows.map(u => u.nome);

        // Tempo de Cliente
        const dataCadastro = cliente.data_cadastro ? new Date(cliente.data_cadastro) : new Date();
        const diffYears = now.getFullYear() - dataCadastro.getFullYear();
        let diffMonths = now.getMonth() - dataCadastro.getMonth();
        let totalMonths = diffYears * 12 + diffMonths;
        let tempo_cliente = '';
        if (totalMonths >= 12) {
            const yrs = Math.floor(totalMonths / 12);
            const mths = totalMonths % 12;
            tempo_cliente = `${yrs} ${yrs > 1 ? 'anos' : 'ano'}${mths > 0 ? ` e ${mths} ${mths > 1 ? 'meses' : 'mês'}` : ''}`;
        } else {
            tempo_cliente = `${totalMonths} ${totalMonths > 1 ? 'meses' : 'mês'}`;
        }

        // Order History
        const { rows: history } = await db.query(`
            SELECT 
                v.id_firebird as id, 
                v.numero_pedido as numero_nota, 
                v.data_venda as data_emissao, 
                COALESCE(vend.nome, 'Sem Vendedor') as vendedor_nome, 
                (v.valor_total - COALESCE(v.valor_desconto, 0)) as valor_total, 
                v.status 
            FROM dash_vendas v
            LEFT JOIN dash_vendedores vend ON vend.id_firebird = v.vendedor_id_firebird AND vend.tenant_id = v.tenant_id
            WHERE v.tenant_id = $1 AND v.cliente_id_firebird = $2
              ${salesFilter}
            ORDER BY v.data_venda DESC
            LIMIT 200
        `, [tenantId, searchId]);

        res.json({
            dna: {
                cliente_id: cliente.id_firebird,
                nome: cliente.nome,
                documento: cliente.documento,
                cidade: cliente.cidade,
                estado: cliente.estado,
                data_cadastro: cliente.data_cadastro,
                status: cliente.ativo ? "ATIVO" : "INATIVO",
                ltv,
                qtd_pedidos,
                telefone: cliente.telefone,
                email: cliente.email,
                tempo_cliente,
                dias_sem_comprar,
                ultima_compra
            },
            behavior: {
                produto_favorito: productsShare[0]?.nome || "Sem histórico",
                marca_favorita: brandsShare[0]?.nome || "Sem histórico",
                ticket_medio_historico,
                frequencia_dias: 25,
                melhor_horario,
                sazonalidade,
                mes_maior_volume: mesMaior,
                mes_menor_volume: mesMenor
            },
            rfm: {
                recencia: dias_sem_comprar <= 15 ? 5 : dias_sem_comprar <= 30 ? 4 : dias_sem_comprar <= 60 ? 3 : dias_sem_comprar <= 90 ? 2 : 1,
                frequencia: qtd_pedidos >= 20 ? 5 : qtd_pedidos >= 10 ? 4 : qtd_pedidos >= 5 ? 3 : qtd_pedidos >= 2 ? 2 : 1,
                monetario: ltv >= 10000 ? 5 : ltv >= 5000 ? 4 : ltv >= 2000 ? 3 : ltv >= 500 ? 2 : 1
            },
            affinity: {
                vendedor_estrela,
                vendedores: allSellers.map(s => ({
                    nome: s.vendedor,
                    total: parseFloat(s.total_vendido || 0),
                    pct: ltv > 0 ? (parseFloat(s.total_vendido) / ltv) * 100 : 0
                }))
            },
            upsell: {
                oportunidades: upsell_oportunidades
            },
            top_lists: {
                produtos: productsShare,
                grupos: groupsShare,
                marcas: brandsShare
            },
            risk_assessment: {
                risco_churn_pct,
                tendencia: risco_churn_pct > 50 ? "QUEDA" : "CRESCIMENTO",
                ultima_compra,
                dias_sem_comprar
            },
            order_history: history.map(h => ({
                id: h.id,
                numero_nota: h.numero_nota,
                data_emissao: h.data_emissao ? new Date(h.data_emissao).toLocaleDateString('pt-BR') : '',
                vendedor_nome: h.vendedor_nome,
                valor_total: parseFloat(h.valor_total),
                status: h.status
            }))
        });

    } catch (err) { next(err); }
});

// ==========================================
// MÓDULO: COMPARATIVE ANALYSIS
// ==========================================

// GET /api/bi/comparative/summary
router.get('/comparative/summary', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const { start, end } = await getBiDateRange(req, tenantId);
        const deptoId = req.query.depto_id;
        const vendedorId = req.query.vendedor_id;
        const cidade = req.query.cidade;

        const salesFilter = cfopUtil.getSalesFilterClause('v');

        // Construção dinâmica de filtros de vendas e joins
        let whereClause = `v.tenant_id = $1 AND v.data_venda >= $2 AND v.data_venda <= $3`;
        let params = [tenantId, toSafeSqlString(start), toSafeSqlString(end)];
        let pIdx = 4;

        if (deptoId && deptoId !== 'todas' && deptoId !== 'all') {
            whereClause += ` AND v.depto_id = $${pIdx}`;
            params.push(parseInt(deptoId, 10));
            pIdx++;
        }

        let joinClause = '';
        if (cidade && cidade !== 'todas' && cidade !== 'all' && cidade !== 'TODOS') {
            joinClause += ` JOIN dash_clientes c ON c.id_firebird = v.cliente_id_firebird AND c.tenant_id = v.tenant_id`;
            whereClause += ` AND c.cidade = $${pIdx}`;
            params.push(cidade);
            pIdx++;
        }

        if (vendedorId && vendedorId !== 'todas' && vendedorId !== 'all' && vendedorId !== 'TODOS') {
            whereClause += ` AND v.vendedor_id_firebird = $${pIdx}`;
            params.push(vendedorId);
            pIdx++;
        }

        // --- KPI Overview ---
        const { rows: kpis } = await db.query(`
            SELECT 
                COALESCE(SUM(v.valor_total - COALESCE(v.valor_desconto, 0)), 0) AS faturamento,
                COALESCE(SUM(v.valor_custo), 0) AS custo
            FROM dash_vendas v
            ${joinClause}
            WHERE ${whereClause}
              ${salesFilter}
        `, params);

        const faturamento = parseFloat(kpis[0].faturamento);
        const custo = parseFloat(kpis[0].custo);
        const lucro = faturamento - custo;
        const margem_pct = faturamento > 0 ? (lucro / faturamento) * 100 : 0;

        // --- Marcas ---
        const { rows: marcas } = await db.query(`
            SELECT COALESCE(vi.marca, v.marca, p.marca, 'S/ MARCA') as nome, 
                   SUM(vi.valor_total) as vendas,
                   SUM(vi.custo_unitario * vi.quantidade) as custo
            FROM dash_vendas_itens vi
            JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id
            LEFT JOIN dash_produtos p ON p.id_firebird = vi.produto_id_firebird AND p.tenant_id = vi.tenant_id
            ${joinClause}
            WHERE ${whereClause}
              ${salesFilter}
              AND COALESCE(vi.marca, v.marca, p.marca) IS NOT NULL AND COALESCE(vi.marca, v.marca, p.marca) != ''
            GROUP BY COALESCE(vi.marca, v.marca, p.marca, 'S/ MARCA')
            ORDER BY vendas DESC
            LIMIT 15
        `, params);

        const colors = ['#0EA5E9', '#10B981', '#3B82F6', '#14B8A6', '#06B6D4', '#22C55E', '#84CC16', '#F59E0B', '#EAB308', '#F97316', '#EF4444', '#F43F5E', '#F472B6'];

        const marcaData = marcas.map((m, i) => {
            const m_vendas = parseFloat(m.vendas || 0);
            const m_custo = parseFloat(m.custo || 0);
            const m_lucro = m_vendas - m_custo;
            return {
                rank: i + 1,
                name: m.nome,
                vendas: m_vendas,
                custo: m_custo,
                lucro: m_lucro,
                luc_pct: m_vendas > 0 ? (m_lucro / m_vendas) * 100 : 0,
                color: colors[i % colors.length]
            };
        });

        // --- Grupos/Categorias ---
        const { rows: grupos } = await db.query(`
            SELECT COALESCE(vi.categoria, v.categoria, p.categoria, 'S/ GRUPO') as nome, 
                   SUM(vi.valor_total) as vendas,
                   SUM(vi.custo_unitario * vi.quantidade) as custo
            FROM dash_vendas_itens vi
            JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id
            LEFT JOIN dash_produtos p ON p.id_firebird = vi.produto_id_firebird AND p.tenant_id = vi.tenant_id
            ${joinClause}
            WHERE ${whereClause}
              ${salesFilter}
              AND COALESCE(vi.categoria, v.categoria, p.categoria) IS NOT NULL AND COALESCE(vi.categoria, v.categoria, p.categoria) != ''
            GROUP BY COALESCE(vi.categoria, v.categoria, p.categoria, 'S/ GRUPO')
            ORDER BY vendas DESC
            LIMIT 15
        `, params);

        const grupoData = grupos.map((g, i) => {
            const g_vendas = parseFloat(g.vendas || 0);
            const g_custo = parseFloat(g.custo || 0);
            const g_lucro = g_vendas - g_custo;
            return {
                rank: i + 1,
                name: g.nome,
                vendas: g_vendas,
                custo: g_custo,
                lucro: g_lucro,
                luc_pct: g_vendas > 0 ? (g_lucro / g_vendas) * 100 : 0
            };
        });

        // --- Vendedores ---
        const { rows: vends } = await db.query(`
            SELECT COALESCE(vend.nome, 'Vendedor ' || COALESCE(v.vendedor_id_firebird::text, '?')) as nome, 
                   SUM(v.valor_total - COALESCE(v.valor_desconto, 0)) as vendas,
                   SUM(v.valor_custo) as custo
            FROM dash_vendas v
            LEFT JOIN dash_vendedores vend ON vend.id_firebird = v.vendedor_id_firebird AND vend.tenant_id = v.tenant_id
            ${joinClause}
            WHERE ${whereClause}
              ${salesFilter}
            GROUP BY v.vendedor_id_firebird, vend.nome
            ORDER BY vendas DESC
            LIMIT 15
        `, params);

        const vendedorData = vends.map((vd, i) => {
            const vd_vendas = parseFloat(vd.vendas || 0);
            const vd_custo = parseFloat(vd.custo || 0);
            const vd_lucro = vd_vendas - vd_custo;
            return {
                rank: i + 1,
                name: vd.nome,
                vendas: vd_vendas,
                custo: vd_custo,
                lucro: vd_lucro,
                luc_pct: vd_vendas > 0 ? (vd_lucro / vd_vendas) * 100 : 0,
                color: colors[i % colors.length]
            };
        });

        // --- Cidades ---
        let cityWhere = `v.tenant_id = $1 AND v.data_venda >= $2 AND v.data_venda <= $3`;
        let cityParams = [tenantId, toSafeSqlString(start), toSafeSqlString(end)];
        let cIdx = 4;
        if (deptoId && deptoId !== 'todas' && deptoId !== 'all') {
            cityWhere += ` AND v.depto_id = $${cIdx}`;
            cityParams.push(parseInt(deptoId, 10));
            cIdx++;
        }
        if (cidade && cidade !== 'todas' && cidade !== 'all' && cidade !== 'TODOS') {
            cityWhere += ` AND c.cidade = $${cIdx}`;
            cityParams.push(cidade);
            cIdx++;
        }
        if (vendedorId && vendedorId !== 'todas' && vendedorId !== 'all' && vendedorId !== 'TODOS') {
            cityWhere += ` AND v.vendedor_id_firebird = $${cIdx}`;
            cityParams.push(vendedorId);
            cIdx++;
        }

        const { rows: cids } = await db.query(`
            SELECT COALESCE(c.cidade, 'S/ CIDADE') as nome, 
                   SUM(v.valor_total - COALESCE(v.valor_desconto, 0)) as vendas,
                   SUM(v.valor_custo) as custo
            FROM dash_vendas v
            JOIN dash_clientes c ON c.id_firebird = v.cliente_id_firebird AND c.tenant_id = v.tenant_id
            WHERE ${cityWhere}
              ${salesFilter}
            GROUP BY c.cidade
            ORDER BY vendas DESC
            LIMIT 15
        `, cityParams);

        const cidadeData = cids.map((cid, i) => {
            const cid_vendas = parseFloat(cid.vendas || 0);
            const cid_custo = parseFloat(cid.custo || 0);
            const cid_lucro = cid_vendas - cid_custo;
            return {
                rank: i + 1,
                name: cid.nome,
                vendas: cid_vendas,
                custo: cid_custo,
                lucro: cid_lucro,
                luc_pct: cid_vendas > 0 ? (cid_lucro / cid_vendas) * 100 : 0,
                color: colors[i % colors.length]
            };
        });

        res.json({
            overview: {
                faturamento,
                custo,
                lucro,
                margem_pct
            },
            marcaData,
            grupoData,
            vendedorData,
            cidadeData
        });
    } catch (err) { next(err); }
});

// ==========================================
// MÓDULO: METAS E FORNECEDORES
// ==========================================

router.get('/goals/summary', async (req, res, next) => {
    try {
        res.json({
            meta_geral: {
                meta_total: 500000.00,
                realizado: 345000.00,
                atingimento_pct: 69.0,
                diferenca: -155000.00,
                projecao: 480000.00,
                projecao_atingimento_pct: 96.0,
                dias_uteis: 22,
                media_diaria: 15681.82,
                meta_diaria: 22727.27,
                dias_restantes: 5
            },
            metas_por_vendedor: [],
            metas_por_marca: [],
            metas_por_grupo: []
        });
    } catch (err) { next(err); }
});

// GET /api/bi/supplier/analytics
router.get('/supplier/analytics', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const { start, end } = await getBiDateRange(req, tenantId);
        const deptoId = req.query.depto_id;
        const df = buildDeptoFilter(deptoId, 4, 'v');
        let marca = req.query.marca;
        if (!marca || marca === 'all' || marca === 'undefined' || marca === 'null') {
            marca = null;
        }

        const salesFilter = cfopUtil.getSalesFilterClause('v');

        // Monta params base: $1=tenant, $2=start, $3=end, $4=depto(opcional)
        let baseParams = [tenantId, toSafeSqlString(start), toSafeSqlString(end), ...df.params];

        // Índice do próximo parâmetro — calculado dinamicamente para evitar conflito
        let marcaIdx = baseParams.length + 1; // 4 sem depto, 5 com depto
        let marcaClause = '';
        let paramsWithMarca = [...baseParams];
        if (marca) {
            marcaClause = ` AND COALESCE(vi.marca, p.marca) = $${marcaIdx}`;
            paramsWithMarca = [...baseParams, marca];
        }

        // ── KPIs gerais ───────────────────────────────────────────
        const kpiQuery = `
            SELECT 
                SUM(vi.valor_total) as receita,
                SUM(vi.custo_unitario * vi.quantidade) as custo,
                COUNT(DISTINCT v.id_firebird) as pedidos,
                COUNT(DISTINCT v.cliente_id_firebird) as clientes
            FROM dash_vendas_itens vi
            JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id
            LEFT JOIN dash_produtos p ON p.id_firebird = vi.produto_id_firebird AND p.tenant_id = vi.tenant_id
            WHERE vi.tenant_id = $1
              AND COALESCE(v.data_hora_proc, v.data_venda) >= $2
              AND COALESCE(v.data_hora_proc, v.data_venda) <= $3
              ${salesFilter}
              ${df.clause}
              ${marcaClause}
        `;
        const { rows: kpis } = await db.query(kpiQuery, paramsWithMarca);

        // ── Top 30 Produtos ───────────────────────────────────────
        const prodQuery = `
            SELECT COALESCE(vi.produto, p.nome, 'S/ NOME') as nome,
                   SUM(vi.quantidade) as qtde,
                   SUM(vi.valor_total) as receita
            FROM dash_vendas_itens vi
            JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id
            LEFT JOIN dash_produtos p ON p.id_firebird = vi.produto_id_firebird AND p.tenant_id = vi.tenant_id
            WHERE vi.tenant_id = $1
              AND COALESCE(v.data_hora_proc, v.data_venda) >= $2
              AND COALESCE(v.data_hora_proc, v.data_venda) <= $3
              ${salesFilter}
              ${df.clause}
              ${marcaClause}
            GROUP BY COALESCE(vi.produto, p.nome, 'S/ NOME')
            ORDER BY receita DESC
            LIMIT 30
        `;
        const { rows: top_products } = await db.query(prodQuery, paramsWithMarca);

        // ── Ranking de Marcas (sem filtro de marca — visão geral) ─
        const brandQuery = `
            SELECT 
                COALESCE(vi.marca, p.marca, 'S/ MARCA') as nome,
                SUM(vi.quantidade) as qtde,
                SUM(vi.valor_total) as receita,
                RANK() OVER (ORDER BY SUM(vi.valor_total) DESC) as rank
            FROM dash_vendas_itens vi
            JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id
            LEFT JOIN dash_produtos p ON p.id_firebird = vi.produto_id_firebird AND p.tenant_id = vi.tenant_id
            WHERE vi.tenant_id = $1
              AND COALESCE(v.data_hora_proc, v.data_venda) >= $2
              AND COALESCE(v.data_hora_proc, v.data_venda) <= $3
              ${salesFilter}
              ${df.clause}
            GROUP BY COALESCE(vi.marca, p.marca, 'S/ MARCA')
            ORDER BY receita DESC
        `;
        const { rows: all_brands_ranked } = await db.query(brandQuery, baseParams);
        const total_company_revenue = all_brands_ranked.reduce((sum, b) => sum + parseFloat(b.receita || 0), 0);

        let top_brands = all_brands_ranked.slice(0, 10).map(b => ({
            rank: parseInt(b.rank),
            name: b.nome,
            volume: parseFloat(b.qtde || 0),
            receita: parseFloat(b.receita || 0)
        }));

        if (marca) {
            const selectedBrandData = all_brands_ranked.find(b => b.nome === marca);
            if (selectedBrandData && parseInt(selectedBrandData.rank) > 10) {
                top_brands.push({
                    rank: parseInt(selectedBrandData.rank),
                    name: selectedBrandData.nome,
                    volume: parseFloat(selectedBrandData.qtde || 0),
                    receita: parseFloat(selectedBrandData.receita || 0)
                });
            }
        }

        // ── Evolução Mensal ───────────────────────────────────────
        const monthlyQuery = `
            SELECT 
                TO_CHAR(COALESCE(v.data_hora_proc, v.data_venda), 'MM/YYYY') as mes_ano,
                DATE_TRUNC('month', COALESCE(v.data_hora_proc, v.data_venda)) as mes_trunc,
                SUM(vi.valor_total) as receita,
                SUM(vi.quantidade) as qtde
            FROM dash_vendas_itens vi
            JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id
            LEFT JOIN dash_produtos p ON p.id_firebird = vi.produto_id_firebird AND p.tenant_id = vi.tenant_id
            WHERE vi.tenant_id = $1
              AND COALESCE(v.data_hora_proc, v.data_venda) >= $2
              AND COALESCE(v.data_hora_proc, v.data_venda) <= $3
              ${salesFilter}
              ${df.clause}
              ${marcaClause}
            GROUP BY mes_trunc, mes_ano
            ORDER BY mes_trunc ASC
        `;
        const { rows: monthly } = await db.query(monthlyQuery, paramsWithMarca);

        // ── Lista de marcas disponíveis para o dropdown ───────────
        const { rows: allBrands } = await db.query(`
            SELECT DISTINCT COALESCE(vi.marca, p.marca) as marca 
            FROM dash_vendas_itens vi
            LEFT JOIN dash_produtos p ON p.id_firebird = vi.produto_id_firebird AND p.tenant_id = vi.tenant_id
            WHERE vi.tenant_id = $1
              AND COALESCE(vi.marca, p.marca) IS NOT NULL
              AND COALESCE(vi.marca, p.marca) <> ''
            ORDER BY marca ASC
        `, [tenantId]);

        // ── KPIs de Estoque do Fornecedor/Marca ────────────────────
        let stockKpiQuery = `
            SELECT 
                COALESCE(SUM(p.estoque * p.custo), 0) as custo_total,
                COALESCE(SUM(p.estoque * p.preco), 0) as venda_total,
                COALESCE(SUM(p.estoque), 0) as volume_total
            FROM dash_produtos p
            WHERE p.tenant_id = $1 AND p.ativo = true
        `;
        let stockKpiParams = [tenantId];
        if (marca) {
            stockKpiQuery += ` AND UPPER(p.marca) = UPPER($2)`;
            stockKpiParams.push(marca);
        } else {
            stockKpiQuery += ` AND p.marca IS NOT NULL AND p.marca <> ''`;
        }
        const { rows: stockKpisRes } = await db.query(stockKpiQuery, stockKpiParams);
        const stock_kpis = {
            custo_total: parseFloat(stockKpisRes[0]?.custo_total || 0),
            venda_total: parseFloat(stockKpisRes[0]?.venda_total || 0),
            volume_total: parseFloat(stockKpisRes[0]?.volume_total || 0)
        };

        // ── Lista de Estoque (Produtos da Marca/Fornecedor) ───────
        let inventoryQuery = `
            SELECT 
                COALESCE(NULLIF(p.referencia, ''), NULLIF(p.codigo_fabrica, ''), p.id_firebird::text, NULLIF(p.codigo, '')) as cod,
                p.nome as desc,
                'UN' as un,
                COALESCE(p.marca, 'S/ MARCA') as marca,
                p.estoque,
                p.custo,
                p.preco,
                (p.estoque * p.custo) as valor_total,
                p.estoque_minimo
            FROM dash_produtos p
            WHERE p.tenant_id = $1
              AND p.ativo = true
        `;
        let invParams = [tenantId];
        if (marca) {
            inventoryQuery += ` AND UPPER(p.marca) = UPPER($2)`;
            invParams.push(marca);
        } else {
            inventoryQuery += ` AND p.marca IS NOT NULL AND p.marca <> ''`;
        }
        inventoryQuery += ` ORDER BY p.estoque DESC LIMIT 150`;
        const { rows: inventory } = await db.query(inventoryQuery, invParams);

        res.json({
            overview: {
                receita: parseFloat(kpis[0]?.receita || 0),
                custo:   parseFloat(kpis[0]?.custo   || 0),
                pedidos: parseInt(kpis[0]?.pedidos   || 0),
                clientes: parseInt(kpis[0]?.clientes || 0)
            },
            total_company_revenue,
            top_products: top_products.map((p, i) => ({
                rank: i + 1,
                name: p.nome,
                volume: parseFloat(p.qtde || 0),
                receita: parseFloat(p.receita || 0)
            })),
            top_brands,
            monthly_performance: monthly.map(m => ({
                mes: m.mes_ano,
                valor: parseFloat(m.receita || 0),
                qtde: parseFloat(m.qtde || 0),
                margem: 30
            })),
            available_brands: allBrands.map(b => b.marca),
            stock_kpis,
            inventory: inventory.map(item => {
                const est = parseFloat(item.estoque || 0);
                const min = parseFloat(item.estoque_minimo || 0);
                let status = 'Ideal';
                if (est <= 0) status = 'Ruptura';
                else if (est < min) status = 'Critico';
                return {
                    cod: item.cod || '—',
                    desc: item.desc || 'Sem descrição',
                    un: item.un || 'UN',
                    marca: item.marca || '—',
                    estoque: est,
                    custo: parseFloat(item.custo || 0),
                    preco: parseFloat(item.preco || 0),
                    valor_total: parseFloat(item.valor_total || 0),
                    status
                };
            })
        });
    } catch (err) { next(err); }
});

// GET /api/bi/supplier/product-detail
router.get('/supplier/product-detail', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const { codigo } = req.query; // product code/barcode
        if (!codigo) {
            return res.status(400).json({ error: 'Código do produto é obrigatório' });
        }

        // 1. Buscar informações cadastrais e de estoque do produto
        const prodQuery = `
            SELECT 
                p.id_firebird,
                p.codigo as cod,
                p.nome as desc,
                p.categoria,
                p.marca,
                p.estoque,
                p.custo,
                p.preco,
                p.estoque_minimo
            FROM dash_produtos p
            WHERE p.tenant_id = $1 AND (p.codigo = $2 OR p.referencia = $2 OR p.codigo_fabrica = $2 OR p.id_firebird::text = $2)
            LIMIT 1
        `;
        const { rows: prodRows } = await db.query(prodQuery, [tenantId, codigo]);
        if (prodRows.length === 0) {
            return res.status(404).json({ error: 'Produto não encontrado' });
        }
        const product = prodRows[0];

        // 2. Calcular KPIs de Vendas nos últimos 6 meses
        const salesFilter = cfopUtil.getSalesFilterClause('v');
        const salesQuery = `
            SELECT 
                SUM(vi.valor_total) as receita,
                SUM(vi.quantidade) as qtde
            FROM dash_vendas_itens vi
            JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id
            WHERE vi.tenant_id = $1
              AND vi.produto_id_firebird = $2
              AND COALESCE(v.data_hora_proc, v.data_venda) >= NOW() - INTERVAL '6 months'
              ${salesFilter}
        `;
        const { rows: salesKpis } = await db.query(salesQuery, [tenantId, product.id_firebird]);
        const faturamento = parseFloat(salesKpis[0]?.receita || 0);
        const qtd_vendida = parseFloat(salesKpis[0]?.qtde || 0);
        const preco_unit = qtd_vendida > 0 ? faturamento / qtd_vendida : parseFloat(product.preco || 0);

        // 3. Porcentagem do faturamento do produto em relação ao faturamento total da sua marca nos últimos 6 meses
        let pct_marca = 0;
        if (product.marca) {
            const brandSalesQuery = `
                SELECT SUM(vi.valor_total) as receita
                FROM dash_vendas_itens vi
                JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id
                LEFT JOIN dash_produtos p ON p.id_firebird = vi.produto_id_firebird AND p.tenant_id = vi.tenant_id
                WHERE vi.tenant_id = $1
                  AND UPPER(COALESCE(vi.marca, p.marca)) = UPPER($2)
                  AND COALESCE(v.data_hora_proc, v.data_venda) >= NOW() - INTERVAL '6 months'
                  ${salesFilter}
            `;
            const { rows: brandSales } = await db.query(brandSalesQuery, [tenantId, product.marca]);
            const brandRevenue = parseFloat(brandSales[0]?.receita || 0);
            if (brandRevenue > 0) {
                pct_marca = (faturamento / brandRevenue) * 100;
            }
        }

        // 4. Evolução mensal do faturamento nos últimos 6 meses (para o gráfico)
        const monthlyQuery = `
            SELECT 
                TO_CHAR(COALESCE(v.data_hora_proc, v.data_venda), 'MM/YYYY') as mes_ano,
                DATE_TRUNC('month', COALESCE(v.data_hora_proc, v.data_venda)) as mes_trunc,
                SUM(vi.valor_total) as receita,
                SUM(vi.quantidade) as qtde
            FROM dash_vendas_itens vi
            JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id
            WHERE vi.tenant_id = $1
              AND vi.produto_id_firebird = $2
              AND COALESCE(v.data_hora_proc, v.data_venda) >= NOW() - INTERVAL '6 months'
              ${salesFilter}
            GROUP BY mes_trunc, mes_ano
            ORDER BY mes_trunc ASC
        `;
        const { rows: monthlyRows } = await db.query(monthlyQuery, [tenantId, product.id_firebird]);

        // 5. Preencher meses vazios nos últimos 6 meses
        const monthly_performance = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const label = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
            const match = monthlyRows.find(r => r.mes_ano === label);
            monthly_performance.push({
                mes: label,
                valor: match ? parseFloat(match.receita || 0) : 0,
                qtde: match ? parseInt(match.qtde || 0) : 0
            });
        }

        res.json({
            product: {
                id_firebird: product.id_firebird,
                cod: product.cod || '—',
                desc: product.desc,
                categoria: product.categoria || 'Geral',
                marca: product.marca || 'Sem Marca',
                estoque: parseFloat(product.estoque || 0),
                custo: parseFloat(product.custo || 0),
                preco: parseFloat(product.preco || 0),
                estoque_minimo: parseFloat(product.estoque_minimo || 0)
            },
            kpis: {
                faturamento,
                qtd_vendida,
                pct_marca,
                preco_unit
            },
            monthly_performance
        });
    } catch (err) { next(err); }
});

// ==========================================
// MÓDULO: AI INSIGHTS
// ==========================================

router.get('/ai-insights', async (req, res, next) => {
    try {
        // AI Rules engine simulated via Node.js logic
        res.json({
            precision_score: 95.5,
            patterns_found: 8,
            last_analysis: new Date(),
            insights: [
                { type: "opportunity", title: "Aumento de Ticket Médio Possível", description: "Vendas casadas de produto X e Y aumentaram 15% na região Sul. Ofereça combos." },
                { type: "risk", title: "Possível quebra de estoque", description: "O item Z tem giro alto e estoque baixo." }
            ]
        });
    } catch (err) { next(err); }
});

// ==========================================
// MÓDULO: SELLER HUB
// ==========================================

router.get('/seller/summary', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        let mes = parseInt(req.query.mes);
        let ano = parseInt(req.query.ano);
        let vendedorId = req.query.vendedor_id;
        const deptoId = req.query.depto_id;
        const cidade = req.query.cidade;
        const marca = req.query.marca;

        if (vendedorId === 'undefined' || vendedorId === 'null') {
            vendedorId = null;
        }

        // Se não vier mes/ano, busca a data máxima das vendas do tenant
        if (!mes || !ano) {
            const maxRes = await db.query(
                'SELECT MAX(COALESCE(data_vencimento, data_venda)) AS max_date FROM dash_vendas WHERE tenant_id = $1',
                [tenantId]
            );
            const anchor = maxRes.rows[0].max_date ? new Date(maxRes.rows[0].max_date) : new Date();
            mes = anchor.getMonth() + 1;
            ano = anchor.getFullYear();
        }

        if (!vendedorId) {
            // Tenta pegar o primeiro vendedor ativo com vendas no período, ou qualquer vendedor ativo
            const sellerRes = await db.query(`
                SELECT v.vendedor_id_firebird AS id
                FROM dash_vendas v
                WHERE v.tenant_id = $1 AND v.vendedor_id_firebird IS NOT NULL
                GROUP BY 1 ORDER BY COUNT(*) DESC LIMIT 1
            `, [tenantId]);
            if (sellerRes.rowCount > 0) {
                vendedorId = sellerRes.rows[0].id;
            } else {
                const altRes = await db.query(`
                    SELECT id_firebird AS id FROM dash_vendedores WHERE tenant_id = $1 LIMIT 1
                `, [tenantId]);
                vendedorId = altRes.rowCount > 0 ? altRes.rows[0].id : null;
            }
        }

        if (!vendedorId) {
            return res.json({
                faturamento: 0,
                ticket_medio: 0,
                notas_emitidas: 0,
                clientes_novos: 0,
                novos_pct: 0,
                antigos_pct: 0,
                cidade_top: 'N/A',
                cidade_top_valor: 0,
                crescimento_pct: 0,
                meta_vendedor: 0,
                faturamento_anterior: 0,
                top_marcas: [],
                top_clientes: [],
                top_grupos: [],
                top_produtos: [],
                historico_vendas: [],
                vendas_por_dia_semana: [],
                heatmap_dados: [],
                notas_fiscais: [],
                melhor_mes_12m: { mes: 'N/A', valor: 0 }
            });
        }

        // Obter start e end baseado no date range padrão (com suporte a mes/ano legado)
        let start, end;
        if (mes && ano && !req.query.period && !req.query.startDate && !req.query.start_date) {
            start = new Date(ano, mes - 1, 1, 0, 0, 0, 0);
            end = new Date(ano, mes, 0, 23, 59, 59, 999);
        } else {
            const range = await getBiDateRange(req, tenantId);
            start = range.start;
            end = range.end;
        }

        // Para faturamento anterior (mês anterior relativo ao período atual)
        let prevStart, prevEnd;
        if (mes && ano && !req.query.period && !req.query.startDate && !req.query.start_date) {
            prevStart = new Date(ano, mes - 2, 1, 0, 0, 0, 0);
            prevEnd = new Date(ano, mes - 1, 0, 23, 59, 59, 999);
        } else {
            const diffMs = end.getTime() - start.getTime();
            prevStart = new Date(start.getTime() - diffMs - 1);
            prevEnd = new Date(start.getTime() - 1);
        }

        const salesFilter = cfopUtil.getSalesFilterClause('v');

        // Dynamic filters builder
        const df = buildDeptoFilter(deptoId, 5, 'v');
        let nextIdx = 5 + df.params.length;

        const cf = buildCidadeFilter(cidade, nextIdx, 'c');
        nextIdx += cf.params.length;

        const mf = buildMarcaFilter(marca, nextIdx, 'vi', 'p');
        nextIdx += mf.params.length;

        const hasItemFilter = (marca && marca !== 'todas' && marca !== 'all' && marca !== 'TODOS');
        const needsCidadeJoin = (cidade && cidade !== 'todas' && cidade !== 'all' && cidade !== 'TODOS');
        const needsItemJoin = hasItemFilter;

        const baseParams = [tenantId, null, null, vendedorId, ...df.params, ...cf.params];
        if (hasItemFilter) {
            baseParams.push(...mf.params);
        }

        const getQueryParams = (startVal, endVal) => {
            const arr = [...baseParams];
            arr[1] = toSafeSqlString(startVal);
            arr[2] = toSafeSqlString(endVal);
            return arr;
        };

        let salesJoins = '';
        if (needsCidadeJoin) {
            salesJoins += ' LEFT JOIN dash_clientes c ON c.id_firebird = v.cliente_id_firebird AND c.tenant_id = v.tenant_id';
        }
        if (needsItemJoin) {
            salesJoins += ' INNER JOIN dash_vendas_itens vi ON vi.venda_id_firebird = v.id_firebird AND vi.tenant_id = v.tenant_id';
            salesJoins += ' LEFT JOIN dash_produtos p ON p.id_firebird = vi.produto_id_firebird AND p.tenant_id = vi.tenant_id';
        }

        const salesClauses = `${salesFilter} ${df.clause} ${cf.clause} ${mf.clause}`;

        let devJoins = ' LEFT JOIN dash_vendas v ON v.id_firebird = d.venda_id_firebird AND v.tenant_id = d.tenant_id';
        if (needsCidadeJoin) {
            devJoins += ' LEFT JOIN dash_clientes c ON c.id_firebird = v.cliente_id_firebird AND c.tenant_id = v.tenant_id';
        }
        if (needsItemJoin) {
            devJoins += ' INNER JOIN dash_vendas_itens vi ON vi.venda_id_firebird = v.id_firebird AND vi.tenant_id = v.tenant_id';
            devJoins += ' LEFT JOIN dash_produtos p ON p.id_firebird = vi.produto_id_firebird AND p.tenant_id = vi.tenant_id';
        }

        // 1. Faturamento Mês Atual (Bruto)
        const salesRes = await db.query(`
            SELECT 
                COALESCE(SUM(v.valor_total - COALESCE(v.valor_desconto, 0)), 0) AS total_bruto,
                COUNT(DISTINCT v.id_firebird) AS total_pedidos
            FROM dash_vendas v
            ${salesJoins}
            WHERE v.tenant_id = $1 AND v.data_hora_proc >= $2 AND v.data_hora_proc <= $3 AND v.vendedor_id_firebird = $4
              ${salesClauses}
        `, getQueryParams(start, end));

        const devRes = await db.query(`
            SELECT COALESCE(SUM(d.valor), 0) AS total
            FROM dash_devolucoes d
            ${devJoins}
            WHERE d.tenant_id = $1 AND d.data_devolucao >= $2 AND d.data_devolucao <= $3 AND v.vendedor_id_firebird = $4
              ${df.clause} ${cf.clause} ${mf.clause}
        `, getQueryParams(start, end));

        const faturamento = parseFloat(salesRes.rows[0].total_bruto || 0) - parseFloat(devRes.rows[0].total || 0);
        const total_pedidos = parseInt(salesRes.rows[0].total_pedidos || 0, 10);
        const ticket_medio = total_pedidos > 0 ? faturamento / total_pedidos : 0;

        // 2. Faturamento Anterior (Mês Anterior)
        const salesPrevRes = await db.query(`
            SELECT 
                COALESCE(SUM(v.valor_total - COALESCE(v.valor_desconto, 0)), 0) AS total_bruto
            FROM dash_vendas v
            ${salesJoins}
            WHERE v.tenant_id = $1 AND v.data_hora_proc >= $2 AND v.data_hora_proc <= $3 AND v.vendedor_id_firebird = $4
              ${salesClauses}
        `, getQueryParams(prevStart, prevEnd));

        const devPrevRes = await db.query(`
            SELECT COALESCE(SUM(d.valor), 0) AS total
            FROM dash_devolucoes d
            ${devJoins}
            WHERE d.tenant_id = $1 AND d.data_devolucao >= $2 AND d.data_devolucao <= $3 AND v.vendedor_id_firebird = $4
              ${df.clause} ${cf.clause} ${mf.clause}
        `, getQueryParams(prevStart, prevEnd));

        const faturamento_anterior = parseFloat(salesPrevRes.rows[0].total_bruto || 0) - parseFloat(devPrevRes.rows[0].total || 0);
        const crescimento_pct = faturamento_anterior > 0 ? ((faturamento - faturamento_anterior) / faturamento_anterior) * 100 : 0;

        // 3. Clientes Novos
        const newClientsRes = await db.query(`
            SELECT COUNT(DISTINCT c.id_firebird) AS total
            FROM dash_clientes c
            JOIN dash_vendas v ON v.cliente_id_firebird = c.id_firebird AND v.tenant_id = c.tenant_id
            ${needsItemJoin ? 'INNER JOIN dash_vendas_itens vi ON vi.venda_id_firebird = v.id_firebird AND vi.tenant_id = v.tenant_id LEFT JOIN dash_produtos p ON p.id_firebird = vi.produto_id_firebird AND p.tenant_id = vi.tenant_id' : ''}
            WHERE c.tenant_id = $1 
              AND c.data_cadastro >= $2 AND c.data_cadastro <= $3
              AND v.vendedor_id_firebird = $4
              ${salesFilter} ${df.clause} ${cf.clause} ${mf.clause}
        `, getQueryParams(start, end));

        const activeClientsRes = await db.query(`
            SELECT COUNT(DISTINCT v.cliente_id_firebird) AS total
            FROM dash_vendas v
            ${salesJoins}
            WHERE v.tenant_id = $1 
              AND v.data_hora_proc >= $2 AND v.data_hora_proc <= $3
              AND v.vendedor_id_firebird = $4
              ${salesClauses}
        `, getQueryParams(start, end));

        const clientes_novos = parseInt(newClientsRes.rows[0].total || 0, 10);
        const clientes_ativos = parseInt(activeClientsRes.rows[0].total || 0, 10);
        const novos_pct = clientes_ativos > 0 ? (clientes_novos / clientes_ativos) * 100 : 0;
        const antigos_pct = 100 - novos_pct;

        // 4. Cidade Top
        const topCityRes = await db.query(`
            SELECT COALESCE(c.cidade, 'Não Informada') AS cidade, SUM(v.valor_total - COALESCE(v.valor_desconto, 0)) AS total
            FROM dash_vendas v
            LEFT JOIN dash_clientes c ON c.id_firebird = v.cliente_id_firebird AND c.tenant_id = v.tenant_id
            ${needsItemJoin ? 'INNER JOIN dash_vendas_itens vi ON vi.venda_id_firebird = v.id_firebird AND vi.tenant_id = v.tenant_id LEFT JOIN dash_produtos p ON p.id_firebird = vi.produto_id_firebird AND p.tenant_id = vi.tenant_id' : ''}
            WHERE v.tenant_id = $1 
              AND v.data_hora_proc >= $2 AND v.data_hora_proc <= $3
              AND v.vendedor_id_firebird = $4
              ${salesClauses}
            GROUP BY 1 ORDER BY total DESC LIMIT 1
        `, getQueryParams(start, end));
        const cidade_top = topCityRes.rowCount > 0 ? topCityRes.rows[0].cidade : 'N/A';
        const cidade_top_valor = topCityRes.rowCount > 0 ? parseFloat(topCityRes.rows[0].total || 0) : 0;

        // 5. Top Lists
        const topBrandsRes = await db.query(`
            SELECT COALESCE(vi.marca, v.marca, p.marca, 'S/ MARCA') AS nome, SUM(vi.valor_total) AS total
            FROM dash_vendas_itens vi
            JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id
            LEFT JOIN dash_produtos p ON p.id_firebird = vi.produto_id_firebird AND p.tenant_id = vi.tenant_id
            ${needsCidadeJoin ? 'LEFT JOIN dash_clientes c ON c.id_firebird = v.cliente_id_firebird AND c.tenant_id = v.tenant_id' : ''}
            WHERE vi.tenant_id = $1 
              AND v.data_hora_proc >= $2 AND v.data_hora_proc <= $3
              AND v.vendedor_id_firebird = $4
              ${salesFilter} ${df.clause} ${cf.clause} ${mf.clause}
            GROUP BY 1 ORDER BY total DESC LIMIT 15
        `, getQueryParams(start, end));
        const top_marcas = topBrandsRes.rows.map((r, i) => ({ rank: i + 1, name: r.nome, value: parseFloat(r.total || 0) }));

        const topClientsRes = await db.query(`
            SELECT COALESCE(c.nome, 'Cliente ' || COALESCE(v.cliente_id_firebird::text, '?')) AS nome, SUM(v.valor_total - COALESCE(v.valor_desconto, 0)) AS total
            FROM dash_vendas v
            LEFT JOIN dash_clientes c ON c.id_firebird = v.cliente_id_firebird AND c.tenant_id = v.tenant_id
            ${needsItemJoin ? 'INNER JOIN dash_vendas_itens vi ON vi.venda_id_firebird = v.id_firebird AND vi.tenant_id = v.tenant_id LEFT JOIN dash_produtos p ON p.id_firebird = vi.produto_id_firebird AND p.tenant_id = vi.tenant_id' : ''}
            WHERE v.tenant_id = $1 
              AND v.data_hora_proc >= $2 AND v.data_hora_proc <= $3
              AND v.vendedor_id_firebird = $4
              ${salesClauses}
            GROUP BY 1 ORDER BY total DESC LIMIT 10
        `, getQueryParams(start, end));
        const top_clientes = topClientsRes.rows.map((r, i) => ({ rank: i + 1, name: r.nome, value: parseFloat(r.total || 0) }));

        const topGroupsRes = await db.query(`
            SELECT COALESCE(vi.categoria, v.categoria, p.categoria, 'S/ GRUPO') AS nome, SUM(vi.valor_total) AS total
            FROM dash_vendas_itens vi
            JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id
            LEFT JOIN dash_produtos p ON p.id_firebird = vi.produto_id_firebird AND p.tenant_id = vi.tenant_id
            ${needsCidadeJoin ? 'LEFT JOIN dash_clientes c ON c.id_firebird = v.cliente_id_firebird AND c.tenant_id = v.tenant_id' : ''}
            WHERE vi.tenant_id = $1 
              AND v.data_hora_proc >= $2 AND v.data_hora_proc <= $3
              AND v.vendedor_id_firebird = $4
              ${salesFilter} ${df.clause} ${cf.clause} ${mf.clause}
            GROUP BY 1 ORDER BY total DESC LIMIT 10
        `, getQueryParams(start, end));
        const top_grupos = topGroupsRes.rows.map((r, i) => ({ rank: i + 1, name: r.nome, value: parseFloat(r.total || 0) }));

        const topProductsRes = await db.query(`
            SELECT COALESCE(vi.produto, p.nome, 'Produto ' || COALESCE(vi.produto_id_firebird::text, '?')) AS nome, SUM(vi.valor_total) AS total
            FROM dash_vendas_itens vi
            JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id
            LEFT JOIN dash_produtos p ON p.id_firebird = vi.produto_id_firebird AND p.tenant_id = vi.tenant_id
            ${needsCidadeJoin ? 'LEFT JOIN dash_clientes c ON c.id_firebird = v.cliente_id_firebird AND c.tenant_id = v.tenant_id' : ''}
            WHERE vi.tenant_id = $1 
              AND v.data_hora_proc >= $2 AND v.data_hora_proc <= $3
              AND v.vendedor_id_firebird = $4
              ${salesFilter} ${df.clause} ${cf.clause} ${mf.clause}
            GROUP BY 1 ORDER BY total DESC LIMIT 10
        `, getQueryParams(start, end));
        const top_produtos = topProductsRes.rows.map((r, i) => ({ rank: i + 1, name: r.nome, value: parseFloat(r.total || 0) }));

        // 6. Histórico de Vendas (Evolução Diária)
        const trajectoryRes = await db.query(`
            SELECT 
                TO_CHAR(v.data_hora_proc, 'DD/MM') AS dia,
                SUM(v.valor_total - COALESCE(v.valor_desconto, 0)) AS total
            FROM dash_vendas v
            ${salesJoins}
            WHERE v.tenant_id = $1 
              AND v.data_hora_proc >= $2 AND v.data_hora_proc <= $3
              AND v.vendedor_id_firebird = $4
              ${salesClauses}
            GROUP BY DATE_TRUNC('day', v.data_hora_proc), TO_CHAR(v.data_hora_proc, 'DD/MM')
            ORDER BY DATE_TRUNC('day', v.data_hora_proc) ASC
        `, getQueryParams(start, end));
        const historico_vendas = trajectoryRes.rows.map(t => ({ dia: t.dia, valor: parseFloat(t.total || 0) }));

        // 7. Vendas por Dia da Semana
        const dowRes = await db.query(`
            SELECT 
                EXTRACT(ISODOW FROM v.data_hora_proc) AS dow_num,
                SUM(v.valor_total - COALESCE(v.valor_desconto, 0)) AS total
            FROM dash_vendas v
            ${salesJoins}
            WHERE v.tenant_id = $1 
              AND v.data_hora_proc >= $2 AND v.data_hora_proc <= $3
              AND v.vendedor_id_firebird = $4
              ${salesClauses}
            GROUP BY 1 ORDER BY 1 ASC
        `, getQueryParams(start, end));
        
        const dowNames = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
        const vendas_por_dia_semana = Array.from({ length: 7 }, (_, i) => {
            const row = dowRes.rows.find(r => parseInt(r.dow_num) === i + 1);
            return {
                dia: dowNames[i],
                valor: row ? parseFloat(row.total || 0) : 0
            };
        });

        // 8. Mapa de Calor (Dia vs Semana do Mês)
        const heatmapRes = await db.query(`
            SELECT 
                EXTRACT(ISODOW FROM v.data_hora_proc) AS dow,
                CEIL(EXTRACT(DAY FROM v.data_hora_proc) / 7.0) AS week,
                SUM(v.valor_total - COALESCE(v.valor_desconto, 0)) AS total
            FROM dash_vendas v
            ${salesJoins}
            WHERE v.tenant_id = $1 
              AND v.data_hora_proc >= $2 AND v.data_hora_proc <= $3
              AND v.vendedor_id_firebird = $4
              ${salesClauses}
            GROUP BY 1, 2
        `, getQueryParams(start, end));
        
        const heatmap_dados = [];
        for (let dow = 1; dow <= 7; dow++) {
            const diaNome = dowNames[dow - 1];
            for (let week = 1; week <= 5; week++) {
                const match = heatmapRes.rows.find(r => parseInt(r.dow) === dow && parseInt(r.week) === week);
                heatmap_dados.push({
                    dia: diaNome,
                    semana: `S${week}`,
                    valor: match ? parseFloat(match.total || 0) : 0
                });
            }
        }

        // 9. Notas Fiscais do Vendedor
        const invoicesRes = await db.query(`
            SELECT 
                v.id_firebird as id,
                v.numero_pedido as numero_nota,
                c.nome as cliente,
                TO_CHAR(v.data_hora_proc, 'DD/MM/YYYY') as data,
                (v.valor_total - COALESCE(v.valor_desconto, 0)) as valor,
                v.status
            FROM dash_vendas v
            LEFT JOIN dash_clientes c ON c.id_firebird = v.cliente_id_firebird AND c.tenant_id = v.tenant_id
            ${needsItemJoin ? 'INNER JOIN dash_vendas_itens vi ON vi.venda_id_firebird = v.id_firebird AND vi.tenant_id = v.tenant_id LEFT JOIN dash_produtos p ON p.id_firebird = vi.produto_id_firebird AND p.tenant_id = vi.tenant_id' : ''}
            WHERE v.tenant_id = $1 
              AND v.data_hora_proc >= $2 AND v.data_hora_proc <= $3
              AND v.vendedor_id_firebird = $4
              ${salesClauses}
            ORDER BY v.data_hora_proc DESC, v.id_firebird DESC
            LIMIT 30
        `, getQueryParams(start, end));
        
        const notas_fiscais = invoicesRes.rows.map(r => ({
            cod: String(r.id),
            numero_nota: r.numero_nota || '-',
            cliente: r.cliente || 'Consumidor',
            data: r.data,
            valor: parseFloat(r.valor || 0),
            status: r.status
        }));

        // 10. Melhor Mês dos últimos 12 meses
        const start12m = new Date(end);
        start12m.setFullYear(start12m.getFullYear() - 1);
        
        const bestMonthRes = await db.query(`
            SELECT 
                TO_CHAR(v.data_hora_proc, 'MM/YYYY') AS mes_ano,
                SUM(v.valor_total - COALESCE(v.valor_desconto, 0)) AS total
            FROM dash_vendas v
            WHERE v.tenant_id = $1 
              AND v.data_hora_proc >= $2 AND v.data_hora_proc <= $3
              AND v.vendedor_id_firebird = $4
              ${salesFilter}
            GROUP BY 1
            ORDER BY total DESC
            LIMIT 1
        `, [tenantId, toSafeSqlString(start12m), toSafeSqlString(end), vendedorId]);
        
        const melhor_mes_12m = bestMonthRes.rowCount > 0 ? {
            mes: bestMonthRes.rows[0].mes_ano,
            valor: parseFloat(bestMonthRes.rows[0].total || 0)
        } : { mes: 'N/A', valor: 0 };

        // 11. Evolução nos últimos 12 meses (Faturamento Líquido: Vendas - Devoluções)
        const evol12mSales = await db.query(`
            SELECT 
                TO_CHAR(v.data_hora_proc, 'MM/YYYY') AS mes_ano,
                DATE_TRUNC('month', v.data_hora_proc) AS mes_trunc,
                COALESCE(SUM(v.valor_total - COALESCE(v.valor_desconto, 0)), 0) AS total
            FROM dash_vendas v
            WHERE v.tenant_id = $1 
              AND v.data_hora_proc >= $2 AND v.data_hora_proc <= $3
              AND v.vendedor_id_firebird = $4
              ${salesFilter}
            GROUP BY 1, 2
            ORDER BY mes_trunc ASC
        `, [tenantId, toSafeSqlString(start12m), toSafeSqlString(end), vendedorId]);

        const evol12mDev = await db.query(`
            SELECT 
                TO_CHAR(d.data_devolucao, 'MM/YYYY') AS mes_ano,
                COALESCE(SUM(d.valor), 0) AS total
            FROM dash_devolucoes d
            LEFT JOIN dash_vendas v2 ON v2.id_firebird = d.venda_id_firebird AND v2.tenant_id = d.tenant_id
            WHERE d.tenant_id = $1 
              AND d.data_devolucao >= $2 AND d.data_devolucao <= $3
              AND v2.vendedor_id_firebird = $4
            GROUP BY 1
        `, [tenantId, toSafeSqlString(start12m), toSafeSqlString(end), vendedorId]);

        const evolucao_12m = evol12mSales.rows.map(s => {
            const dev = evol12mDev.rows.find(d => d.mes_ano === s.mes_ano);
            const devVal = dev ? parseFloat(dev.total || 0) : 0;
            return {
                mes: s.mes_ano,
                valor: parseFloat(s.total || 0) - devVal
            };
        });

        const padDate = (n) => String(n).padStart(2, '0');
        const formatDateStr = (d) => `${padDate(d.getDate())}/${padDate(d.getMonth() + 1)}/${d.getFullYear()}`;
        const start_date = formatDateStr(start);
        const end_date = formatDateStr(end);

        res.json({
            faturamento,
            ticket_medio,
            notas_emitidas: total_pedidos,
            clientes_novos,
            clientes_ativos,
            novos_pct,
            antigos_pct,
            cidade_top,
            cidade_top_valor,
            crescimento_pct,
            meta_vendedor: 0, // Sem meta por padrão
            faturamento_anterior,
            top_marcas,
            top_clientes,
            top_grupos,
            top_produtos,
            historico_vendas,
            vendas_por_dia_semana,
            heatmap_dados,
            notas_fiscais,
            melhor_mes_12m,
            evolucao_12m,
            start_date,
            end_date
        });
    } catch (err) { next(err); }
});

module.exports = router;
