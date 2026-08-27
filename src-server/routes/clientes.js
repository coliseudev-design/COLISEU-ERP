'use strict';

const express = require('express');
const router = express.Router();
const db = require('../db/postgres');
const { getPeriodRange, toSafeSqlString } = require('../utils/period');
const cfopUtil = require('../utils/cfop');

// GET /api/clientes/lista?search=&limit=&offset=&tempo_inativo=&ordenacao=&vendedor_id=&cidade=&depto_id=
router.get('/lista', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const search = req.query.search || '';
        const limit = Math.min(parseInt(req.query.limit, 10) || 50, 1000);
        const offset = parseInt(req.query.offset, 10) || 0;
        const tempoInativo = req.query.tempo_inativo || 'Qualquer Inatividade';
        const ordenacao = req.query.ordenacao || 'Mais inativos primeiro (Alerta)';
        const vendedorId = req.query.vendedor_id;
        const cidade = req.query.cidade;
        const deptoId = req.query.depto_id;

        const salesFilter = cfopUtil.getSalesFilterClause('v');

        let binds = [tenantId];
        let bIdx = 2;

        let statsWhere = ['v.tenant_id = $1'];
        if (deptoId && deptoId !== 'todas' && deptoId !== 'all') {
            statsWhere.push(`v.depto_id = $${bIdx}`);
            binds.push(parseInt(deptoId, 10));
            bIdx++;
        }
        if (vendedorId && vendedorId !== 'todas' && vendedorId !== 'all' && vendedorId !== 'TODOS') {
            statsWhere.push(`v.vendedor_id_firebird = $${bIdx}`);
            binds.push(vendedorId);
            bIdx++;
        }

        const filterClause = statsWhere.length > 1 ? 'AND ' + statsWhere.slice(1).join(' AND ') : '';

        // Subquery/CTE de estatísticas agregadas de vendas
        const statsQuery = `
            SELECT 
                v.cliente_id_firebird,
                COUNT(v.id_firebird) as qtd_pedidos,
                MAX(v.data_venda) as ultimo_pedido,
                SUM(v.valor_total - COALESCE(v.valor_desconto, 0)) as total_gasto,
                (
                    SELECT vend.nome 
                    FROM dash_vendas v2
                    LEFT JOIN dash_vendedores vend ON vend.id_firebird = v2.vendedor_id_firebird AND vend.tenant_id = v2.tenant_id
                    WHERE v2.cliente_id_firebird = v.cliente_id_firebird AND v2.tenant_id = $1
                    ORDER BY v2.data_venda DESC LIMIT 1
                ) as vendedor_resp
            FROM dash_vendas v
            WHERE v.tenant_id = $1 ${salesFilter} ${filterClause}
            GROUP BY v.cliente_id_firebird, v.tenant_id
        `;

        // Agora construímos a query principal dos clientes
        let mainWhere = ['c.tenant_id = $1', 'c.ativo = true'];

        // Excluir fornecedores puros — tipo FORNECEDOR (quando sincronizado) ou sem pedidos e sem títulos
        mainWhere.push(`(c.tipo IS NULL OR UPPER(TRIM(c.tipo)) NOT IN ('FORNECEDOR', 'FORNECEDORES', 'FORNEC'))`);
        // Somente clientes com ao menos 1 pedido vinculado
        mainWhere.push(`EXISTS (SELECT 1 FROM dash_vendas vx WHERE vx.cliente_id_firebird = c.id_firebird AND vx.tenant_id = c.tenant_id)`);
        // Somente clientes com ao menos 1 título financeiro vinculado
        mainWhere.push(`EXISTS (SELECT 1 FROM dash_financeiro fx WHERE fx.cliente_id_firebird = c.id_firebird AND fx.tenant_id = c.tenant_id)`);

        if (search) {
            mainWhere.push(`(c.nome ILIKE $${bIdx} OR c.documento ILIKE $${bIdx})`);
            binds.push(`%${search}%`);
            bIdx++;
        }
        if (cidade && cidade !== 'todas' && cidade !== 'all' && cidade !== 'TODOS') {
            mainWhere.push(`c.cidade = $${bIdx}`);
            binds.push(cidade);
            bIdx++;
        }

        let querySql = `
            WITH sales_stats AS (${statsQuery}),
            filtered_clients AS (
                SELECT 
                    c.id_firebird AS id, c.nome, c.documento, c.cidade, c.estado,
                    COALESCE(s.qtd_pedidos, 0) as qtd_pedidos,
                    s.ultimo_pedido,
                    COALESCE(s.total_gasto, 0) as total_gasto,
                    COALESCE(s.vendedor_resp, 'Sem Vendedor') as vendedor_resp,
                    COALESCE(EXTRACT(DAY FROM (NOW() - s.ultimo_pedido)), 999) as dias_inativo
                FROM dash_clientes c
                LEFT JOIN sales_stats s ON s.cliente_id_firebird = c.id_firebird
                WHERE ${mainWhere.join(' AND ')}
            )
            SELECT * FROM filtered_clients
        `;

        // Filtro de tempo inativo
        let havingClauses = [];
        if (tempoInativo === 'Ativos (Comprou no mês)') {
            havingClauses.push('dias_inativo <= 30');
        } else if (tempoInativo === 'Inativo > 30 dias') {
            havingClauses.push('dias_inativo > 30');
        } else if (tempoInativo === 'Inativo > 60 dias') {
            havingClauses.push('dias_inativo > 60');
        } else if (tempoInativo === 'Inativo > 90 dias') {
            havingClauses.push('dias_inativo > 90');
        } else if (tempoInativo === 'Sem compras / Churn') {
            havingClauses.push('(ultimo_pedido IS NULL OR dias_inativo > 180)');
        }

        let whereHaving = '';
        if (havingClauses.length > 0) {
            whereHaving = ` WHERE ${havingClauses.join(' AND ')}`;
        }

        // Ordenação
        let orderBy = ' ORDER BY dias_inativo DESC, total_gasto DESC';
        if (ordenacao === 'Mais ativos primeiro') {
            orderBy = ' ORDER BY dias_inativo ASC, total_gasto DESC';
        } else if (ordenacao === 'Maior faturamento') {
            orderBy = ' ORDER BY total_gasto DESC';
        } else if (ordenacao === 'Menor faturamento') {
            orderBy = ' ORDER BY total_gasto ASC';
        } else if (ordenacao === 'Ordem alfabética') {
            orderBy = ' ORDER BY nome ASC';
        }

        const totalQuery = `SELECT COUNT(*) AS total FROM (${querySql}${whereHaving}) t`;
        const totalP = await db.query(totalQuery, binds);

        const limitIdx = bIdx++;
        const offsetIdx = bIdx++;
        const finalQuery = `${querySql}${whereHaving}${orderBy} LIMIT $${limitIdx} OFFSET $${offsetIdx}`;
        
        const finalParams = [...binds, limit, offset];
        const { rows } = await db.query(finalQuery, finalParams);

        res.json({
            data: rows.map(r => ({
                id: r.id,
                nome: r.nome,
                documento: r.documento,
                cidade: r.cidade,
                estado: r.estado,
                vendedor_resp: r.vendedor_resp,
                qtd_pedidos: parseInt(r.qtd_pedidos, 10),
                ultimo_pedido: r.ultimo_pedido,
                total_gasto: parseFloat(r.total_gasto || 0),
                dias_inativo: parseInt(r.dias_inativo || 0, 10)
            })),
            total: parseInt(totalP.rows[0]?.total || 0, 10),
            limit,
            offset
        });
    } catch (err) {
        next(err);
    }
});

// GET /api/clientes/analytics-full
router.get('/analytics-full', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const period = req.query.period || 'thisMonth';
        const { start_date, end_date } = req.query;
        const deptoId = req.query.depto_id;
        const vendedorId = req.query.vendedor_id;
        const cidade = req.query.cidade;

        const store = db.dbContext.getStore();
        const tzOffset = store ? store.tzOffset : -180;
        const anchorDate = new Date(Date.now() + (tzOffset * 60 * 1000));
        const { start, end } = getPeriodRange(period, start_date, end_date, anchorDate);

        // Período anterior
        const startDateObj = new Date(start);
        const endDateObj = new Date(end);
        const diffMs = endDateObj.getTime() - startDateObj.getTime();
        const prevStart = new Date(startDateObj.getTime() - diffMs - 1);
        const prevEnd = new Date(startDateObj.getTime() - 1);

        const salesFilter = cfopUtil.getSalesFilterClause('v');

        // Filtros dinâmicos
        let salesWhere = ['v.tenant_id = $1'];
        let salesParams = [tenantId];
        let pIdx = 2;

        if (deptoId && deptoId !== 'todas' && deptoId !== 'all') {
            salesWhere.push(`v.depto_id = $${pIdx}`);
            salesParams.push(parseInt(deptoId, 10));
            pIdx++;
        }
        if (vendedorId && vendedorId !== 'todas' && vendedorId !== 'all' && vendedorId !== 'TODOS') {
            salesWhere.push(`v.vendedor_id_firebird = $${pIdx}`);
            salesParams.push(vendedorId);
            pIdx++;
        }
        if (cidade && cidade !== 'todas' && cidade !== 'all' && cidade !== 'TODOS') {
            salesWhere.push(`c.cidade = $${pIdx}`);
            salesParams.push(cidade);
            pIdx++;
        }

        const salesJoins = ' LEFT JOIN dash_clientes c ON c.id_firebird = v.cliente_id_firebird AND c.tenant_id = v.tenant_id';
        const filterClause = salesWhere.length > 1 ? 'AND ' + salesWhere.slice(1).join(' AND ') : '';

        // 1. Total Clientes
        let totalClientsQuery = `
            SELECT COUNT(*) AS total FROM dash_clientes c 
            WHERE c.tenant_id = $1 AND c.ativo = true
              AND (c.tipo IS NULL OR UPPER(TRIM(c.tipo)) NOT IN ('FORNECEDOR', 'FORNECEDORES', 'FORNEC'))
              AND EXISTS (SELECT 1 FROM dash_vendas vx WHERE vx.cliente_id_firebird = c.id_firebird AND vx.tenant_id = c.tenant_id)
              AND EXISTS (SELECT 1 FROM dash_financeiro fx WHERE fx.cliente_id_firebird = c.id_firebird AND fx.tenant_id = c.tenant_id)
        `;
        let totalClientsParams = [tenantId];
        if (cidade && cidade !== 'todas' && cidade !== 'all' && cidade !== 'TODOS') {
            totalClientsQuery += ` AND c.cidade = $2`;
            totalClientsParams.push(cidade);
        }
        const totalClientsRes = await db.query(totalClientsQuery, totalClientsParams);
        const total_clientes = parseInt(totalClientsRes.rows[0]?.total || 0, 10);

        // 2. Mês Atual
        const currentSalesParams = [...salesParams];
        const startIdx = pIdx++;
        const endIdx = pIdx++;
        currentSalesParams.push(start, end);

        const currentActiveRes = await db.query(`
            SELECT COUNT(DISTINCT v.cliente_id_firebird) AS total
            FROM dash_vendas v
            ${salesJoins}
            WHERE v.tenant_id = $1 AND v.data_venda >= $${startIdx} AND v.data_venda <= $${endIdx}
              ${salesFilter}
              ${filterClause}
        `, currentSalesParams);
        const mes_atual = parseInt(currentActiveRes.rows[0]?.total || 0, 10);

        // 3. Mês Anterior
        const prevSalesParams = [...salesParams];
        prevSalesParams.push(toSafeSqlString(prevStart), toSafeSqlString(prevEnd));
        const prevActiveRes = await db.query(`
            SELECT COUNT(DISTINCT v.cliente_id_firebird) AS total
            FROM dash_vendas v
            ${salesJoins}
            WHERE v.tenant_id = $1 AND v.data_venda >= $${startIdx} AND v.data_venda <= $${endIdx}
              ${salesFilter}
              ${filterClause}
        `, prevSalesParams);
        const mes_anterior = parseInt(prevActiveRes.rows[0]?.total || 0, 10);

        // 4. Novos Clientes
        let newClientsQuery = `
            SELECT COUNT(*) AS total FROM dash_clientes c 
            WHERE c.tenant_id = $1 AND c.ativo = true 
              AND c.data_cadastro >= $2 AND c.data_cadastro <= $3
              AND (c.tipo IS NULL OR UPPER(TRIM(c.tipo)) NOT IN ('FORNECEDOR', 'FORNECEDORES', 'FORNEC'))
              AND EXISTS (SELECT 1 FROM dash_vendas vx WHERE vx.cliente_id_firebird = c.id_firebird AND vx.tenant_id = c.tenant_id)
              AND EXISTS (SELECT 1 FROM dash_financeiro fx WHERE fx.cliente_id_firebird = c.id_firebird AND fx.tenant_id = c.tenant_id)
        `;
        let newClientsParams = [tenantId, start, end];
        if (cidade && cidade !== 'todas' && cidade !== 'all' && cidade !== 'TODOS') {
            newClientsQuery += ` AND c.cidade = $4`;
            newClientsParams.push(cidade);
        }
        const newClientsRes = await db.query(newClientsQuery, newClientsParams);
        const novos_clientes = parseInt(newClientsRes.rows[0]?.total || 0, 10);

        const subqueryFilterClause = filterClause.replace(/v\./g, 'v2.');

        // 5. Clientes com Maior Recorrência (Top 10)
        const topRecurrentRes = await db.query(`
            SELECT 
                c.id_firebird as id, 
                c.nome, 
                COUNT(DISTINCT v.id_firebird) as qtd_pedidos,
                SUM(v.valor_total - COALESCE(v.valor_desconto, 0)) as total_gasto,
                MAX(v.data_venda) as ultimo_pedido
            FROM dash_vendas v
            JOIN dash_clientes c ON c.id_firebird = v.cliente_id_firebird AND c.tenant_id = v.tenant_id
            WHERE v.tenant_id = $1 AND v.data_venda >= $${startIdx} AND v.data_venda <= $${endIdx}
              ${salesFilter}
              ${filterClause}
            GROUP BY c.id_firebird, c.nome
            ORDER BY qtd_pedidos DESC, total_gasto DESC
            LIMIT 10
        `, currentSalesParams);

        // 6. Clientes com Menos Recorrência (Top 10)
        const topChurnRes = await db.query(`
            SELECT 
                c.id_firebird as id, 
                c.nome, 
                COUNT(DISTINCT v.id_firebird) as qtd_pedidos,
                MAX(v.data_venda) as ultimo_pedido,
                COALESCE(EXTRACT(DAY FROM (NOW() - MAX(v.data_venda))), 999) as dias_inativo
            FROM dash_clientes c
            JOIN dash_vendas v ON v.cliente_id_firebird = c.id_firebird AND v.tenant_id = c.tenant_id
            WHERE c.tenant_id = $1 AND c.ativo = true AND v.data_venda < $${startIdx}
              ${salesFilter}
              ${filterClause}
              ${cidade && cidade !== 'todas' ? `AND c.cidade = '${cidade.replace(/'/g, "''")}'` : ''}
              ${vendedorId && vendedorId !== 'todas' ? `AND v.vendedor_id_firebird = '${vendedorId.replace(/'/g, "''")}'` : ''}
              AND c.id_firebird NOT IN (
                SELECT DISTINCT cliente_id_firebird FROM dash_vendas v2
                WHERE v2.tenant_id = $1 AND v2.data_venda >= $${startIdx} AND v2.data_venda <= $${endIdx}
                  ${salesFilter}
                  ${subqueryFilterClause}
              )
            GROUP BY c.id_firebird, c.nome
            ORDER BY ultimo_pedido ASC
            LIMIT 10
        `, currentSalesParams);

        res.json({
            kpis: {
                total_clientes,
                mes_atual,
                mes_anterior,
                novos_clientes,
                sem_vendas_atual: Math.max(0, total_clientes - mes_atual),
                sem_vendas_anterior: Math.max(0, total_clientes - mes_anterior),
            },
            recorrentes: topRecurrentRes.rows.map((r, i) => ({
                rank: i + 1,
                id: r.id,
                name: r.nome,
                pedidos: parseInt(r.qtd_pedidos, 10),
                ultimo_pedido: r.ultimo_pedido,
                total_gasto: parseFloat(r.total_gasto || 0)
            })),
            churn: topChurnRes.rows.map((r, i) => ({
                rank: i + 1,
                id: r.id,
                name: r.nome,
                pedidos: parseInt(r.qtd_pedidos, 10),
                ultimo_pedido: r.ultimo_pedido,
                dias_inativo: parseInt(r.dias_inativo || 0, 10)
            }))
        });
    } catch (err) {
        next(err);
    }
});

// GET /api/clientes/kpis
router.get('/kpis', async (req, res, next) => {
    try {
        const period = req.query.period || '30d';
        const tenantId = req.tenant.id;
        const { start_date, end_date } = req.query;
        
        const store = db.dbContext.getStore();
        const tzOffset = store ? store.tzOffset : -180;
        const anchorDate = new Date(Date.now() + (tzOffset * 60 * 1000));
        const { start, end } = getPeriodRange(period, start_date, end_date, anchorDate);

        const salesFilter = cfopUtil.getSalesFilterClause('v');

        const totalP = await db.query(
            `SELECT COUNT(*) AS total FROM dash_clientes c
             WHERE c.tenant_id = $1 AND c.ativo = true
               AND (c.tipo IS NULL OR UPPER(TRIM(c.tipo)) NOT IN ('FORNECEDOR', 'FORNECEDORES', 'FORNEC'))
               AND EXISTS (SELECT 1 FROM dash_vendas vx WHERE vx.cliente_id_firebird = c.id_firebird AND vx.tenant_id = c.tenant_id)
               AND EXISTS (SELECT 1 FROM dash_financeiro fx WHERE fx.cliente_id_firebird = c.id_firebird AND fx.tenant_id = c.tenant_id)`,
            [tenantId]
        );

        const ativosP = await db.query(`
            SELECT COUNT(DISTINCT v.cliente_id_firebird) AS total
            FROM dash_vendas v
            WHERE v.tenant_id = $1 
              AND v.data_venda >= $2 AND v.data_venda <= $3
              ${salesFilter}
        `, [tenantId, start, end]);

        const topP = await db.query(`
            SELECT c.nome, SUM(v.valor_total) AS total
            FROM dash_vendas v
            JOIN dash_clientes c ON c.id_firebird = v.cliente_id_firebird AND c.tenant_id = v.tenant_id
            WHERE v.tenant_id = $1
              AND v.data_venda >= $2 AND v.data_venda <= $3
              ${salesFilter}
            GROUP BY c.id, c.nome
            ORDER BY total DESC LIMIT 1
        `, [tenantId, start, end]);

        const ticketP = await db.query(`
            SELECT COALESCE(AVG(totais.total), 0) AS ticket
            FROM (
                SELECT v.cliente_id_firebird, SUM(v.valor_total) AS total
                FROM dash_vendas v
                WHERE v.tenant_id = $1
                  AND v.data_venda >= $2 AND v.data_venda <= $3
                  ${salesFilter}
                GROUP BY v.cliente_id_firebird
            ) totais
        `, [tenantId, start, end]);

        res.json({
            period: { start, end, label: period },
            kpis: {
                total_clientes: parseInt(totalP.rows[0]?.total || 0, 10),
                clientes_ativos: parseInt(ativosP.rows[0]?.total || 0, 10),
                top_cliente: topP.rows[0]?.nome || '—',
                top_cliente_valor: parseFloat(topP.rows[0]?.total || 0),
                ticket_medio_por_cliente: parseFloat(ticketP.rows[0]?.ticket || 0)
            }
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
