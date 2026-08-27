const express = require('express');
const router = express.Router();
const db = require('../db/postgres');
const logger = require('../config/logger');
const { getUserPermissions } = require('../utils/rbac');

// Administradores do tenant (ou master) ou usuários com permissão de grupos
const requireAdmin = async (req, res, next) => {
    try {
        const role = (req.user?.role || '').toLowerCase();
        if (role === 'admin' || role === 'master') {
            return next();
        }
        const permissions = await getUserPermissions(req.user?.id || req.user?.sub, req.tenant?.id);
        if (permissions.includes('usuarios_grupos') || permissions.includes('usuarios')) {
            return next();
        }
        return res.status(403).json({ error: 'Acesso restrito a administradores', code: 'FORBIDDEN' });
    } catch (err) {
        return res.status(500).json({ error: 'Erro ao verificar permissões' });
    }
};

/**
 * GET /api/grupos/vendedores
 * Lista todos os vendedores do tenant.
 */
router.get('/vendedores', requireAdmin, async (req, res, next) => {
    try {
        const tenantId = req.tenant.id;
        const { rows } = await db.query(
            'SELECT id_firebird AS id, nome FROM dash_vendedores WHERE tenant_id = $1 ORDER BY nome',
            [tenantId]
        );
        res.json(rows);
    } catch (err) { next(err); }
});

/**
 * GET /api/grupos
 * Lista todos os grupos de acesso do tenant e versao correspondente.
 */
router.get('/', requireAdmin, async (req, res) => {
    try {
        const tenantId = req.tenant.id;
        const layoutVersion = req.query.versao || req.query.layout_version;

        let query = `SELECT id, nome, versao 
                     FROM dash_grupos_acesso 
                     WHERE tenant_id = $1`;
        let params = [tenantId];

        if (layoutVersion && layoutVersion !== 'all') {
            query += ` AND versao = $2`;
            params.push(layoutVersion);
        } else if (!layoutVersion) {
            query += ` AND versao = $2`;
            params.push('Dash 1.0');
        }

        query += ` ORDER BY nome ASC`;

        const { rows } = await db.query(query, params);
        res.json(rows.map(r => ({
            id: r.id,
            nome: r.nome,
            versao: r.versao,
            layout_version: r.versao
        })));
    } catch (err) {
        logger.error('[Grupos] Erro ao listar grupos', err);
        res.status(500).json({ error: 'Erro ao listar grupos de acesso' });
    }
});

/**
 * GET /api/grupos/:id/permissions
 * Retorna as permissões de um grupo específico.
 */
router.get('/:id/permissions', requireAdmin, async (req, res) => {
    try {
        const tenantId = req.tenant.id;
        const groupId = req.params.id;

        // Verificar se o grupo pertence ao tenant
        const groupCheck = await db.query(
            'SELECT id FROM dash_grupos_acesso WHERE id = $1 AND tenant_id = $2',
            [groupId, tenantId]
        );

        if (groupCheck.rowCount === 0) {
            return res.status(404).json({ error: 'Grupo não encontrado', code: 'NOT_FOUND' });
        }

        const { rows: permissionRows } = await db.query(
            'SELECT recurso, pode_acessar FROM dash_permissoes WHERE grupo_id = $1',
            [groupId]
        );

        const { rows: groupRows } = await db.query(
            'SELECT vendedores_todos FROM dash_grupos_acesso WHERE id = $1',
            [groupId]
        );
        const vendedores_todos = groupRows.length > 0 ? (groupRows[0].vendedores_todos !== false) : true;

        const { rows: sellerRows } = await db.query(
            'SELECT vendedor_id FROM dash_grupo_vendedores WHERE grupo_id = $1',
            [groupId]
        );
        const vendedores = sellerRows.map(r => r.vendedor_id);

        res.json({
            permissions: permissionRows,
            vendedores_todos,
            vendedores
        });
    } catch (err) {
        logger.error('[Grupos] Erro ao buscar permissões', err);
        res.status(500).json({ error: 'Erro ao buscar permissões do grupo' });
    }
});

/**
 * POST /api/grupos
 * Cria um novo grupo para o tenant/versao.
 */
router.post('/', requireAdmin, async (req, res) => {
    try {
        const tenantId = req.tenant.id;
        const { nome, versao, layout_version, permissions, vendedores_todos, vendedores } = req.body;
        const targetVersion = versao || layout_version;

        if (!nome || !targetVersion) {
            return res.status(400).json({ error: 'Nome e versao são obrigatórios' });
        }

        // Criar o grupo
        const groupRes = await db.query(
            `INSERT INTO dash_grupos_acesso (tenant_id, versao, nome, vendedores_todos)
             VALUES ($1, $2, $3, $4)
             RETURNING id, nome, versao`,
            [tenantId, targetVersion, nome, vendedores_todos !== false]
        );

        const groupId = groupRes.rows[0].id;

        // Se passadas permissões, insere
        if (Array.isArray(permissions)) {
            for (const recurso of permissions) {
                await db.query(
                    `INSERT INTO dash_permissoes (grupo_id, recurso, pode_acessar)
                     VALUES ($1, $2, true)
                     ON CONFLICT (grupo_id, recurso) DO UPDATE SET pode_acessar = true`,
                    [groupId, recurso]
                );
            }
        }

        // Se passados vendedores, insere
        if (Array.isArray(vendedores)) {
            for (const vendedorId of vendedores) {
                await db.query(
                    `INSERT INTO dash_grupo_vendedores (grupo_id, vendedor_id)
                     VALUES ($1, $2)`,
                    [groupId, vendedorId]
                );
            }
        }

        res.status(201).json({
            id: groupRes.rows[0].id,
            nome: groupRes.rows[0].nome,
            versao: groupRes.rows[0].versao,
            layout_version: groupRes.rows[0].versao
        });
    } catch (err) {
        logger.error('[Grupos] Erro ao criar grupo', err);
        if (err.code === '23505') {
            return res.status(409).json({ error: 'Já existe um grupo com este nome para este layout.' });
        }
        res.status(500).json({ error: 'Erro ao criar grupo de acesso' });
    }
});

/**
 * PUT /api/grupos/:id/permissions
 * Atualiza todas as permissões de um grupo.
 */
router.put('/:id/permissions', requireAdmin, async (req, res) => {
    try {
        const tenantId = req.tenant.id;
        const groupId = req.params.id;
        const { permissions, vendedores_todos, vendedores } = req.body;

        if (!Array.isArray(permissions)) {
            return res.status(400).json({ error: 'Permissions deve ser um array de strings contendo os recursos autorizados.' });
        }

        // Verificar se o grupo pertence ao tenant
        const groupCheck = await db.query(
            'SELECT id FROM dash_grupos_acesso WHERE id = $1 AND tenant_id = $2',
            [groupId, tenantId]
        );

        if (groupCheck.rowCount === 0) {
            return res.status(404).json({ error: 'Grupo não encontrado', code: 'NOT_FOUND' });
        }

        // Limpar permissões anteriores e inserir as novas
        await db.query('DELETE FROM dash_permissoes WHERE grupo_id = $1', [groupId]);

        for (const recurso of permissions) {
            await db.query(
                `INSERT INTO dash_permissoes (grupo_id, recurso, pode_acessar)
                 VALUES ($1, $2, true)`,
                [groupId, recurso]
            );
        }

        // Atualizar vendedores_todos se enviado
        if (vendedores_todos !== undefined) {
            await db.query(
                'UPDATE dash_grupos_acesso SET vendedores_todos = $1 WHERE id = $2 AND tenant_id = $3',
                [vendedores_todos === true, groupId, tenantId]
            );
        }

        // Atualizar lista de vendedores se enviada
        if (Array.isArray(vendedores)) {
            await db.query('DELETE FROM dash_grupo_vendedores WHERE grupo_id = $1', [groupId]);
            for (const vendedorId of vendedores) {
                await db.query(
                    'INSERT INTO dash_grupo_vendedores (grupo_id, vendedor_id) VALUES ($1, $2)',
                    [groupId, vendedorId]
                );
            }
        }

        res.json({ message: 'Permissões atualizadas com sucesso' });
    } catch (err) {
        logger.error('[Grupos] Erro ao atualizar permissões', err);
        res.status(500).json({ error: 'Erro ao atualizar permissões do grupo' });
    }
});

/**
 * DELETE /api/grupos/:id
 * Remove um grupo.
 */
router.delete('/:id', requireAdmin, async (req, res) => {
    try {
        const tenantId = req.tenant.id;
        const groupId = req.params.id;

        // Verificar se o grupo pertence ao tenant
        const groupCheck = await db.query(
            'SELECT id FROM dash_grupos_acesso WHERE id = $1 AND tenant_id = $2',
            [groupId, tenantId]
        );

        if (groupCheck.rowCount === 0) {
            return res.status(404).json({ error: 'Grupo não encontrado', code: 'NOT_FOUND' });
        }

        await db.query('DELETE FROM dash_grupos_acesso WHERE id = $1', [groupId]);

        res.json({ message: 'Grupo removido com sucesso' });
    } catch (err) {
        logger.error('[Grupos] Erro ao remover grupo', err);
        res.status(500).json({ error: 'Erro ao remover grupo de acesso' });
    }
});

module.exports = router;
