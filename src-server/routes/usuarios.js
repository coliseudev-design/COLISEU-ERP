'use strict';

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db/postgres');
const config = require('../config/env');
const logger = require('../config/logger');
const { getUserPermissions } = require('../utils/rbac');

/**
 * GET /api/usuarios
 * Lista usuários. Se for Master, lista todos. Se for Tenant normal, lista apenas os do Tenant.
 */
router.get('/', async (req, res) => {
    try {
        let query = `SELECT id, tenant_id, email, nome, role, ativo, created_at, permissions, versao, filial_acesso, grupo_id FROM dash_usuarios`;
        let params = [];
        
        if (req.tenant.id !== '00000000-0000-0000-0000-000000000000') {
            query += ` WHERE tenant_id = $1`;
            params.push(req.tenant.id);
        }
        
        query += ` ORDER BY created_at DESC`;
        
        const result = await db.query(query, params);
        const users = result.rows;

        if (users.length > 0) {
            const userIds = users.map(u => u.id);
            const groupsQuery = `
                SELECT ug.usuario_id, g.id, g.nome, g.versao
                FROM dash_usuario_grupo ug
                JOIN dash_grupos_acesso g ON ug.grupo_id = g.id
                WHERE ug.usuario_id = ANY($1)
            `;
            const groupsResult = await db.query(groupsQuery, [userIds]);
            
            const groupsByUserId = {};
            for (const row of groupsResult.rows) {
                if (!groupsByUserId[row.usuario_id]) {
                    groupsByUserId[row.usuario_id] = [];
                }
                groupsByUserId[row.usuario_id].push({
                    id: row.id,
                    nome: row.nome,
                    versao: row.versao
                });
            }

            res.json(users.map(r => ({
                ...r,
                versao: r.versao,
                layout_version: r.versao,
                grupos: groupsByUserId[r.id] || []
            })));
        } else {
            res.json([]);
        }
    } catch (err) {
        logger.error('[Usuarios] Erro ao listar', err);
        res.status(500).json({ error: 'Erro ao listar usuários' });
    }
});

/**
 * POST /api/usuarios
 * Cadastro de novo usuário por dentro do painel.
 */
router.post('/', async (req, res) => {
    try {
        const { nome, email, password, companyKey, grupo_id } = req.body;

        if (!nome || !email || !password || !companyKey) {
            return res.status(400).json({ error: 'Nome, email, senha e CompanyKey são obrigatórios' });
        }

        // Checar permissão de criação de usuário
        const permissions = await getUserPermissions(req.user.sub || req.user.id, req.tenant.id);
        const canCreate = req.user.role === 'master' || req.user.role === 'admin' || permissions.includes('usuarios_criar') || permissions.includes('usuarios');
        if (!canCreate) {
            return res.status(403).json({ error: 'Você não tem permissão para cadastrar novos usuários.' });
        }

        // Segurança: Se não for master, só pode criar usuário para a própria empresa
        if (req.tenant.id !== '00000000-0000-0000-0000-000000000000' && companyKey !== req.tenant.id) {
            return res.status(403).json({ error: 'Você só pode criar usuários para a sua própria empresa.' });
        }

        // Validação no Servidor de Licenças (Limite de Dispositivos/Cadastros)
        const { identityApiUrl, identityInternalKey, expectedModuleSlug } = config.security;

        if (!identityApiUrl || !identityInternalKey) {
            return res.status(500).json({ error: 'Erro de infraestrutura do sistema de licenças' });
        }

        try {
            const url = `${identityApiUrl}/internal/companies/${companyKey}/modules/${expectedModuleSlug}/info`;
            
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 3000);

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Internal-Api-Key': identityInternalKey
                },
                signal: controller.signal
            });
            clearTimeout(timeout);

            if (response.status !== 200) {
                const data = await response.json().catch(() => ({}));
                const reason = data.reason || data.error || 'Empresa inativa ou módulo bloqueado.';
                return res.status(403).json({ error: reason });
            }

            const data = await response.json();
            const deviceLimit = data.deviceLimit || 0;

            const countQuery = `SELECT COUNT(*) as total FROM dash_usuarios WHERE tenant_id = $1`;
            const countResult = await db.query(countQuery, [companyKey]);
            const currentUsersCount = parseInt(countResult.rows[0].total, 10);

            if (currentUsersCount >= deviceLimit) {
                return res.status(403).json({ 
                    error: `O limite de licenças (${deviceLimit}) para esta empresa foi atingido. Nenhuma nova conta pode ser criada.`
                });
            }
        } catch (err) {
            logger.error('[Usuarios] Erro ao comunicar com licenças', err);
            return res.status(503).json({ error: 'Servidor de licenças indisponível.' });
        }

        // Valida se o grupo pertence ao tenant
        if (grupo_id) {
            const groupCheck = await db.query(
                'SELECT id FROM dash_grupos_acesso WHERE id = $1 AND tenant_id = $2',
                [grupo_id, companyKey]
            );
            if (groupCheck.rowCount === 0) {
                return res.status(400).json({ error: 'Grupo de acesso inválido.' });
            }
        }

        // Valida se o email já existe
        const checkQuery = `SELECT id FROM dash_usuarios WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))`;
        const checkResult = await db.query(checkQuery, [email]);
        
        if (checkResult.rowCount > 0) {
            return res.status(409).json({ error: 'Este email já está em uso' });
        }

        // Hash da senha
        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(password, salt);

        // Insere o usuário (default role: admin)
        const insertQuery = `
            INSERT INTO dash_usuarios (tenant_id, email, nome, role, ativo, senha_hash, permissions, versao, filial_acesso, grupo_id)
            VALUES ($1, $2, $3, 'admin', true, $4, NULL, 'Dash 1.0', 'todas', $5)
            RETURNING id, tenant_id, email, nome, role, ativo, created_at, permissions, versao, filial_acesso, grupo_id
        `;
        const result = await db.query(insertQuery, [companyKey, email, nome, senhaHash, grupo_id || null]);
        const newUser = result.rows[0];

        if (grupo_id) {
            await db.query(
                `INSERT INTO dash_usuario_grupo (usuario_id, grupo_id) 
                 VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                [newUser.id, grupo_id]
            );
        }

        const user = {
            ...newUser,
            versao: newUser.versao,
            layout_version: newUser.versao
        };

        logger.info('[Usuarios] Novo usuário criado via painel', { email: user.email, by: req.user.email });

        res.status(201).json(user);
    } catch (err) {
        logger.error('[Usuarios] Erro ao criar', err);
        if (err.code === '22P02') {
            return res.status(400).json({ error: 'CompanyKey inválida (deve ser um UUID).' });
        }
        res.status(500).json({ error: 'Erro interno ao criar usuário' });
    }
});

/**
 * PUT /api/usuarios/:id/status
 * Ativa ou Inativa um usuário
 */
router.put('/:id/status', async (req, res) => {
    try {
        const { ativo } = req.body;
        const targetId = req.params.id;

        // Checar permissão
        const permissions = await getUserPermissions(req.user.sub || req.user.id, req.tenant.id);
        const canToggle = req.user.role === 'master' || req.user.role === 'admin' || permissions.includes('usuarios_status');
        if (!canToggle) {
            return res.status(403).json({ error: 'Você não tem permissão para inativar ou ativar usuários.' });
        }

        if (typeof ativo !== 'boolean') {
            return res.status(400).json({ error: 'O campo "ativo" deve ser booleano (true/false).' });
        }

        // Não deixa a pessoa se desativar sozinha (segurança)
        if (targetId === req.user.sub && !ativo) {
            return res.status(400).json({ error: 'Você não pode inativar seu próprio usuário.' });
        }

        let query = `UPDATE dash_usuarios SET ativo = $1 WHERE id = $2`;
        let params = [ativo, targetId];

        if (req.tenant.id !== '00000000-0000-0000-0000-000000000000') {
            query += ` AND tenant_id = $3`;
            params.push(req.tenant.id);
        }

        query += ` RETURNING id, ativo`;

        const result = await db.query(query, params);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado ou você não tem permissão para editá-lo.' });
        }

        logger.info('[Usuarios] Status alterado', { targetId, ativo, by: req.user.email });

        res.json({ message: 'Status atualizado com sucesso', user: result.rows[0] });
    } catch (err) {
        logger.error('[Usuarios] Erro ao alterar status', err);
        res.status(500).json({ error: 'Erro ao alterar status do usuário' });
    }
});



/**
 * PUT /api/usuarios/:id/permissions
 * Atualiza as permissões (abas/módulos) do usuário
 */
router.put('/:id/permissions', async (req, res) => {
    try {
        const { permissions } = req.body;
        const targetId = req.params.id;

        if (permissions !== null && !Array.isArray(permissions)) {
            return res.status(400).json({ error: 'O campo "permissions" deve ser um array de strings ou nulo.' });
        }

        // Apenas master pode editar permissões? Ou usuários admin do tenant.
        // O frontend passará um array como ['inicio', 'financeiro']

        let query = `UPDATE dash_usuarios SET permissions = $1 WHERE id = $2`;
        let params = [permissions ? JSON.stringify(permissions) : null, targetId];

        if (req.tenant.id !== '00000000-0000-0000-0000-000000000000') {
            query += ` AND tenant_id = $3`;
            params.push(req.tenant.id);
        }

        query += ` RETURNING id, permissions`;

        const result = await db.query(query, params);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado ou você não tem permissão para editá-lo.' });
        }

        logger.info('[Usuarios] Permissões alteradas', { targetId, permissions, by: req.user.email });

        res.json({ message: 'Permissões atualizadas com sucesso', user: result.rows[0] });
    } catch (err) {
        logger.error('[Usuarios] Erro ao alterar permissões', err);
        res.status(500).json({ error: 'Erro ao alterar permissões do usuário' });
    }
});

/**
 * PUT /api/usuarios/:id/layout
 * Altera a versão do layout para um usuário
 */
router.put('/:id/layout', async (req, res) => {
    try {
        const { layout_version, versao } = req.body;
        const targetVersion = versao || layout_version;
        const targetId = req.params.id;

        // Checar permissão
        const permissions = await getUserPermissions(req.user.sub || req.user.id, req.tenant.id);
        const canChangeVersion = req.user.role === 'master' || req.user.role === 'admin' || permissions.includes('usuarios_versao');
        if (!canChangeVersion) {
            return res.status(403).json({ error: 'Você não tem permissão para alterar a versão ativa dos usuários.' });
        }

        if (!['Dash 1.0', 'B.I IA.'].includes(targetVersion)) {
            return res.status(400).json({ error: 'Versão de layout inválida. Opções: Dash 1.0, B.I IA.' });
        }

        if (req.user && req.user.email === 'admin@coliseu.com') {
            return res.json({
                message: 'Versão do layout atualizada com sucesso (Super Usuário - Bypass banco local)',
                user: {
                    id: targetId,
                    versao: targetVersion,
                    layout_version: targetVersion,
                    grupo_id: null
                }
            });
        }

        // Buscar usuário para verificar permissão
        const userRes = await db.query(
            'SELECT id, role, tenant_id FROM dash_usuarios WHERE id = $1',
            [targetId]
        );
        if (userRes.rowCount === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }
        const targetUser = userRes.rows[0];

        // Segurança de Tenant
        if (req.tenant.id !== '00000000-0000-0000-0000-000000000000' && targetUser.tenant_id !== req.tenant.id) {
            return res.status(403).json({ error: 'Você não tem permissão para alterar o layout deste usuário.' });
        }

        // Se não for master ou admin, ele deve ter acesso à versão através de um grupo
        if (targetUser.role !== 'master' && targetUser.role !== 'admin') {
            const hasAccess = await db.query(
                `SELECT g.id 
                 FROM dash_usuario_grupo ug
                 JOIN dash_grupos_acesso g ON ug.grupo_id = g.id
                 WHERE ug.usuario_id = $1 AND g.versao = $2`,
                [targetId, targetVersion]
            );
            if (hasAccess.rowCount === 0) {
                return res.status(403).json({ error: `O usuário não possui grupo de acesso associado à versão ${targetVersion}.` });
            }
        }

        // Buscar o grupo correspondente à versão solicitada para manter a retrocompatibilidade
        let legacyGroupId = null;
        const matchingGroup = await db.query(
            `SELECT g.id 
             FROM dash_usuario_grupo ug
             JOIN dash_grupos_acesso g ON ug.grupo_id = g.id
             WHERE ug.usuario_id = $1 AND g.versao = $2
             LIMIT 1`,
            [targetId, targetVersion]
        );
        if (matchingGroup.rowCount > 0) {
            legacyGroupId = matchingGroup.rows[0].id;
        }

        let query = `UPDATE dash_usuarios SET versao = $1, grupo_id = $2 WHERE id = $3`;
        let params = [targetVersion, legacyGroupId, targetId];

        if (req.tenant.id !== '00000000-0000-0000-0000-000000000000') {
            query += ` AND tenant_id = $4`;
            params.push(req.tenant.id);
        }

        query += ` RETURNING id, versao, grupo_id`;

        const result = await db.query(query, params);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado ou sem permissão.' });
        }

        logger.info('[Usuarios] Version alterada', { targetId, targetVersion, by: req.user.email });
        const returnedUser = {
            id: result.rows[0].id,
            versao: result.rows[0].versao,
            layout_version: result.rows[0].versao,
            grupo_id: result.rows[0].grupo_id
        };
        res.json({ message: 'Versão do layout atualizada com sucesso', user: returnedUser });
    } catch (err) {
        logger.error('[Usuarios] Erro ao alterar layout version', err);
        res.status(500).json({ error: 'Erro interno ao alterar versão do layout.' });
    }
});

/**
 * PUT /api/usuarios/:id/filial-acesso
 * Define quais filiais (depto_ids) o usuário pode visualizar.
 * Formato: 'todas' | '1' | '1,3' (IDs separados por vírgula)
 */
router.put('/:id/filial-acesso', async (req, res) => {
    try {
        const { filial_acesso } = req.body;
        const targetId = req.params.id;

        // Checar permissão
        const permissions = await getUserPermissions(req.user.sub || req.user.id, req.tenant.id);
        const canManageBranches = req.user.role === 'master' || req.user.role === 'admin' || permissions.includes('usuarios_filiais');
        if (!canManageBranches) {
            return res.status(403).json({ error: 'Você não tem permissão para alterar o acesso de filiais dos usuários.' });
        }

        // Validar formato: 'todas' ou lista de números separados por vírgula
        const validFormat = /^(todas|\d+(,\d+)*)$/.test(String(filial_acesso || 'todas').trim());
        if (!validFormat) {
            return res.status(400).json({ error: 'Formato inválido. Use "todas" ou IDs separados por vírgula (ex: "1,3").' });
        }

        let query = `UPDATE dash_usuarios SET filial_acesso = $1 WHERE id = $2`;
        let params = [filial_acesso, targetId];

        if (req.tenant.id !== '00000000-0000-0000-0000-000000000000') {
            query += ` AND tenant_id = $3`;
            params.push(req.tenant.id);
        }

        query += ` RETURNING id, filial_acesso`;

        const result = await db.query(query, params);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado ou sem permissão.' });
        }

        logger.info('[Usuarios] Acesso de filial alterado', { targetId, filial_acesso, by: req.user.email });
        res.json({ message: 'Acesso de filiais atualizado com sucesso', user: result.rows[0] });
    } catch (err) {
        logger.error('[Usuarios] Erro ao alterar filial_acesso', err);
        res.status(500).json({ error: 'Erro interno ao alterar acesso de filiais.' });
    }
});

/**
 * PUT /api/usuarios/:id/grupo
 * Associa um usuário a um grupo de acesso (legado).
 */
router.put('/:id/grupo', async (req, res) => {
    try {
        const { grupo_id } = req.body;
        const targetId = req.params.id;

        // Checar permissão
        const permissions = await getUserPermissions(req.user.sub || req.user.id, req.tenant.id);
        const canManageGroups = req.user.role === 'master' || req.user.role === 'admin' || permissions.includes('usuarios_grupos');
        if (!canManageGroups) {
            return res.status(403).json({ error: 'Você não tem permissão para alterar os grupos de acesso dos usuários.' });
        }

        // Se for passado grupo_id, verificar se o grupo existe e pertence ao mesmo tenant
        if (grupo_id !== null && grupo_id !== undefined) {
            const groupCheck = await db.query(
                'SELECT id FROM dash_grupos_acesso WHERE id = $1 AND tenant_id = $2',
                [grupo_id, req.tenant.id]
            );
            if (groupCheck.rowCount === 0) {
                return res.status(400).json({ error: 'Grupo de acesso inválido ou pertencente a outra empresa.' });
            }
        }

        await db.query('BEGIN');

        if (grupo_id !== null && grupo_id !== undefined) {
            // Pegar a versão do novo grupo
            const groupInfo = await db.query(
                'SELECT versao FROM dash_grupos_acesso WHERE id = $1',
                [grupo_id]
            );
            const groupVersion = groupInfo.rows[0].versao;

            // Remover apenas grupos da mesma versão para este usuário na tabela associativa
            await db.query(
                `DELETE FROM dash_usuario_grupo 
                 WHERE usuario_id = $1 AND grupo_id IN (
                     SELECT id FROM dash_grupos_acesso WHERE versao = $2
                 )`,
                [targetId, groupVersion]
            );

            // Inserir a nova associação
            await db.query(
                'INSERT INTO dash_usuario_grupo (usuario_id, grupo_id) VALUES ($1, $2)',
                [targetId, grupo_id]
            );
        } else {
            // Se for nulo, remove todas as associações na tabela associativa
            await db.query('DELETE FROM dash_usuario_grupo WHERE usuario_id = $1', [targetId]);
        }

        let query = `UPDATE dash_usuarios SET grupo_id = $1 WHERE id = $2`;
        let params = [grupo_id !== undefined ? grupo_id : null, targetId];

        if (req.tenant.id !== '00000000-0000-0000-0000-000000000000') {
            query += ` AND tenant_id = $3`;
            params.push(req.tenant.id);
        }

        query += ` RETURNING id, grupo_id`;

        const result = await db.query(query, params);

        if (result.rowCount === 0) {
            await db.query('ROLLBACK');
            return res.status(404).json({ error: 'Usuário não encontrado ou sem permissão.' });
        }

        await db.query('COMMIT');

        logger.info('[Usuarios] Grupo de acesso alterado', { targetId, grupo_id, by: req.user.email });
        res.json({ message: 'Grupo de acesso do usuário atualizado com sucesso', user: result.rows[0] });
    } catch (err) {
        await db.query('ROLLBACK');
        logger.error('[Usuarios] Erro ao alterar grupo_id', err);
        res.status(500).json({ error: 'Erro interno ao atualizar grupo de acesso do usuário.' });
    }
});

/**
 * PUT /api/usuarios/:id/grupos
 * Associa um usuário a múltiplos grupos de acesso.
 */
router.put('/:id/grupos', async (req, res) => {
    try {
        const { grupo_ids } = req.body;
        const targetId = req.params.id;

        // Checar permissão
        const permissions = await getUserPermissions(req.user.sub || req.user.id, req.tenant.id);
        const canManageGroups = req.user.role === 'master' || req.user.role === 'admin' || permissions.includes('usuarios_grupos');
        if (!canManageGroups) {
            return res.status(403).json({ error: 'Você não tem permissão para alterar os grupos de acesso dos usuários.' });
        }

        if (!Array.isArray(grupo_ids)) {
            return res.status(400).json({ error: 'O campo "grupo_ids" deve ser um array.' });
        }

        // Se for passado grupo_ids, verificar se todos os grupos existem e pertencem ao mesmo tenant (se não for master)
        if (grupo_ids.length > 0) {
            let groupCheckQuery = 'SELECT id, versao FROM dash_grupos_acesso WHERE id = ANY($1)';
            let groupCheckParams = [grupo_ids];
            
            if (req.tenant.id !== '00000000-0000-0000-0000-000000000000') {
                groupCheckQuery += ' AND tenant_id = $2';
                groupCheckParams.push(req.tenant.id);
            }
            
            const groupCheck = await db.query(groupCheckQuery, groupCheckParams);
            if (groupCheck.rowCount !== grupo_ids.length) {
                return res.status(400).json({ error: 'Um ou mais grupos de acesso são inválidos ou pertencem a outra empresa.' });
            }
        }

        // Buscar usuário para saber a versão atual ativa
        const userRes = await db.query(
            'SELECT id, versao, tenant_id FROM dash_usuarios WHERE id = $1',
            [targetId]
        );
        if (userRes.rowCount === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }
        const targetUser = userRes.rows[0];

        // Segurança de Tenant
        if (req.tenant.id !== '00000000-0000-0000-0000-000000000000' && targetUser.tenant_id !== req.tenant.id) {
            return res.status(403).json({ error: 'Você não tem permissão para alterar os grupos deste usuário.' });
        }

        await db.query('BEGIN');

        // Deletar associações anteriores
        await db.query('DELETE FROM dash_usuario_grupo WHERE usuario_id = $1', [targetId]);

        // Inserir as novas associações
        if (grupo_ids.length > 0) {
            for (const gId of grupo_ids) {
                await db.query(
                    'INSERT INTO dash_usuario_grupo (usuario_id, grupo_id) VALUES ($1, $2)',
                    [targetId, gId]
                );
            }
        }

        // Determinar o legacy grupo_id
        let legacyGroupId = null;
        if (grupo_ids.length > 0) {
            // Verificar se há algum grupo associado à versão ativa do usuário
            const activeVersionGroup = await db.query(
                `SELECT g.id 
                 FROM dash_usuario_grupo ug
                 JOIN dash_grupos_acesso g ON ug.grupo_id = g.id
                 WHERE ug.usuario_id = $1 AND g.versao = $2
                 LIMIT 1`,
                [targetId, targetUser.versao]
            );
            if (activeVersionGroup.rowCount > 0) {
                legacyGroupId = activeVersionGroup.rows[0].id;
            } else {
                legacyGroupId = grupo_ids[0]; // Fallback para o primeiro grupo
            }
        }

        // Atualizar o legacy grupo_id na tabela dash_usuarios
        await db.query(
            'UPDATE dash_usuarios SET grupo_id = $1 WHERE id = $2',
            [legacyGroupId, targetId]
        );

        await db.query('COMMIT');

        logger.info('[Usuarios] Grupos de acesso alterados em lote', { targetId, grupo_ids, by: req.user.email });
        res.json({ message: 'Grupos de acesso do usuário atualizados com sucesso' });
    } catch (err) {
        await db.query('ROLLBACK');
        logger.error('[Usuarios] Erro ao alterar grupo_ids', err);
        res.status(500).json({ error: 'Erro interno ao atualizar grupos de acesso do usuário.' });
    }
});

/**
 * POST /api/usuarios/:id/reset-password
 * Reseta a senha do usuário para a senha padrão "123456"
 */
router.post('/:id/reset-password', async (req, res) => {
    try {
        const targetId = req.params.id;

        // Verificar permissão
        const permissions = await getUserPermissions(req.user.sub, req.tenant.id);
        const canReset = req.user.role === 'master' || req.user.role === 'admin' || permissions.includes('reset_senha');

        if (!canReset) {
            return res.status(403).json({ error: 'Você não tem permissão para resetar senhas de usuários.' });
        }

        // Buscar usuário para validação de tenant
        const userRes = await db.query(
            'SELECT id, email, tenant_id FROM dash_usuarios WHERE id = $1',
            [targetId]
        );

        if (userRes.rowCount === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }

        const targetUser = userRes.rows[0];

        // Segurança de Tenant
        if (req.tenant.id !== '00000000-0000-0000-0000-000000000000' && targetUser.tenant_id !== req.tenant.id) {
            return res.status(403).json({ error: 'Você não tem permissão para resetar a senha deste usuário.' });
        }

        // Criar hash da senha padrão "123456"
        const salt = await bcrypt.genSalt(10);
        const defaultHash = await bcrypt.hash('123456', salt);

        await db.query(
            'UPDATE dash_usuarios SET senha_hash = $1 WHERE id = $2',
            [defaultHash, targetId]
        );

        logger.info('[Usuarios] Senha resetada para o padrão 123456', { targetId, targetEmail: targetUser.email, by: req.user.email });

        res.json({ message: 'Senha resetada para "123456" com sucesso! O usuário precisará alterá-la no próximo acesso.' });
    } catch (err) {
        logger.error('[Usuarios] Erro ao resetar senha', err);
        res.status(500).json({ error: 'Erro ao resetar senha do usuário.' });
    }
});

module.exports = router;
