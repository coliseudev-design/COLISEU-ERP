'use strict';

const express = require('express');
const router = express.Router();
const db = require('../db/postgres');

// GET /api/produtos/lista?search=&limit=&offset=
router.get('/lista', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const search = req.query.search || '';
        const limit = Math.min(parseInt(req.query.limit, 10) || 100, 1000);
        const offset = parseInt(req.query.offset, 10) || 0;
        const categoria = req.query.categoria;

        const where = ['tenant_id = $1', 'ativo = true'];
        const binds = [tenantId];
        let pIndex = 2;

        if (search) {
            where.push(`(nome ILIKE $${pIndex} OR codigo ILIKE $${pIndex})`);
            binds.push(`%${search}%`);
            pIndex++;
        }

        if (categoria) {
            where.push(`categoria = $${pIndex}`);
            binds.push(categoria);
            pIndex++;
        }

        const whereSql = `WHERE ${where.join(' AND ')}`;

        const totalP = await db.query(`SELECT COUNT(*) AS total FROM dash_produtos ${whereSql}`, binds);

        const limitIdx = pIndex++;
        const offsetIdx = pIndex++;
        
        const { rows } = await db.query(`
            SELECT 
                id_firebird AS id, codigo, nome, categoria, marca, referencia, codigo_fabrica, preco, custo, estoque, estoque_minimo,
                (preco * estoque) AS valor_total_estoque
            FROM dash_produtos
            ${whereSql}
            ORDER BY nome
            LIMIT $${limitIdx} OFFSET $${offsetIdx}
        `, [...binds, limit, offset]);

        const formatted = rows.map(r => ({
            ...r,
            preco: parseFloat(r.preco),
            custo: parseFloat(r.custo),
            estoque: parseFloat(r.estoque),
            estoque_minimo: parseFloat(r.estoque_minimo),
            valor_total_estoque: parseFloat(r.valor_total_estoque)
        }));

        res.json({ 
            data: formatted, 
            total: parseInt(totalP.rows[0]?.total || 0, 10), 
            limit, 
            offset 
        });
    } catch (err) {
        next(err);
    }
});

// GET /api/produtos/categorias
router.get('/categorias', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const { rows } = await db.query(`
            SELECT 
                COALESCE(NULLIF(categoria, ''), 'Sem categoria') AS categoria, 
                COUNT(*) AS qtd, 
                SUM(preco * estoque) AS valor_estoque
            FROM dash_produtos 
            WHERE tenant_id = $1 AND ativo = true
            GROUP BY COALESCE(NULLIF(categoria, ''), 'Sem categoria')
            ORDER BY categoria
        `, [tenantId]);

        const formatted = rows.map(r => ({
            categoria: r.categoria,
            qtd: parseInt(r.qtd, 10),
            valor_estoque: parseFloat(r.valor_estoque || 0)
        }));

        res.json({ data: formatted });
    } catch (err) {
        next(err);
    }
});

// GET /api/produtos/kpis
router.get('/kpis', async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        
        const rP = await db.query(`
            SELECT 
                COUNT(*) AS total,
                COALESCE(SUM(preco * estoque), 0) AS valor_total_estoque,
                COALESCE(MAX(preco), 0) AS mais_caro,
                COALESCE(MIN(preco), 0) AS mais_barato,
                SUM(CASE WHEN estoque <= estoque_minimo THEN 1 ELSE 0 END) AS baixo_estoque
            FROM dash_produtos 
            WHERE tenant_id = $1 AND ativo = true
        `, [tenantId]);

        const caroP = await db.query(`
            SELECT nome FROM dash_produtos 
            WHERE tenant_id = $1 AND ativo = true 
            ORDER BY preco DESC LIMIT 1
        `, [tenantId]);

        const baratoP = await db.query(`
            SELECT nome FROM dash_produtos 
            WHERE tenant_id = $1 AND ativo = true AND preco > 0 
            ORDER BY preco ASC LIMIT 1
        `, [tenantId]);

        res.json({
            kpis: {
                total_produtos: parseInt(rP.rows[0]?.total || 0, 10),
                valor_total_estoque: parseFloat(rP.rows[0]?.valor_total_estoque || 0),
                baixo_estoque: parseInt(rP.rows[0]?.baixo_estoque || 0, 10),
                produto_mais_caro: caroP.rows[0]?.nome || '—',
                produto_mais_barato: baratoP.rows[0]?.nome || '—',
            }
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
