'use strict';

const express = require('express');
const router = express.Router();
const db = require('../db/postgres');
const config = require('../config/env');
const logger = require('../config/logger');

// Validador de UUID
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Middleware de Autenticação Administrativa
function requireAdminApiKey(req, res, next) {
    const adminKey = req.headers['admin-api-key'] || req.headers['x-internal-key'];
    const expectedKeys = [
        config.security.internalApiKey,
        config.security.identityInternalKey
    ].filter(Boolean);

    if (expectedKeys.length === 0) {
        logger.error('[AdminApi] Nenhuma chave de API configurada para autenticação administrativa.');
        return res.status(500).json({ error: 'Erro de configuração interna do servidor.' });
    }

    if (!adminKey || !expectedKeys.includes(adminKey)) {
        logger.warn('[AdminApi] Chave administrativa inválida ou ausente', { ip: req.ip, path: req.path });
        return res.status(401).json({ error: 'Não autorizado. Chave de API inválida ou ausente.', code: 'INVALID_ADMIN_KEY' });
    }
    next();
}

router.use(requireAdminApiKey);

/**
 * DELETE /api/admin/companies/by-external/:tenantId
 * Exclui todos os dados atrelados a um tenant no banco de dados da VPS.
 */
router.delete('/companies/by-external/:tenantId', async (req, res) => {
    const { tenantId } = req.params;

    if (!tenantId) {
        return res.status(400).json({ error: 'tenantId é obrigatório' });
    }

    if (!uuidRegex.test(tenantId)) {
        return res.status(400).json({ error: 'tenantId deve ser um UUID válido' });
    }

    logger.info(`[AdminApi] Iniciando exclusão em lote do tenant ${tenantId}`);

    try {
        // Busca todas as tabelas públicas que possuem a coluna tenant_id
        const tablesQuery = `
            SELECT table_name 
            FROM information_schema.columns 
            WHERE column_name = 'tenant_id' 
              AND table_schema = 'public'
        `;
        const tablesResult = await db.query(tablesQuery, []);
        const tables = tablesResult.rows.map(row => row.table_name);

        logger.info(`[AdminApi] Tabelas identificadas para limpeza: ${tables.join(', ')}`);

        // Deleta dados de todas as tabelas de forma sequencial para evitar deadlocks
        const results = [];
        for (const table of tables) {
            const deleteQuery = `DELETE FROM ${table} WHERE tenant_id = $1`;
            const result = await db.query(deleteQuery, [tenantId]);
            logger.info(`[AdminApi] Tabela ${table}: deletados ${result.rowCount} registros.`);
            results.push({ table, deleted: result.rowCount });
        }

        res.json({
            message: 'Tenant e todos os dados vinculados excluídos com sucesso.',
            tenantId,
            details: results
        });
    } catch (err) {
        logger.error(`[AdminApi] Falha crítica ao excluir dados do tenant ${tenantId}`, err);
        res.status(500).json({ error: 'Erro interno ao processar a exclusão do tenant.', details: err.message });
    }
});

module.exports = router;
