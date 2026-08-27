'use strict';

const express = require('express');
const router = express.Router();
const config = require('../config/env');
const logger = require('../config/logger');

/**
 * @route GET /api/configuracoes/empresa
 * @desc Retorna dados da empresa logada a partir do Identity Server.
 */
router.get('/empresa', async (req, res) => {
    try {
        const tenantId = req.tenant?.id;
        if (!tenantId) {
            return res.json({ name: 'Coliseu Dash' });
        }

        const { identityApiUrl, identityInternalKey, expectedModuleSlug } = config.security;

        if (!identityApiUrl || !identityInternalKey) {
            return res.json({ name: 'Coliseu Dash' });
        }

        const url = `${identityApiUrl}/internal/companies/${tenantId}/modules/${expectedModuleSlug}/info`;
        
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000); // Timeout rápido para não travar a UI

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Internal-Api-Key': identityInternalKey
            },
            signal: controller.signal
        });
        clearTimeout(timeout);

        if (response.status === 200) {
            const data = await response.json();
            // Retorna todo o payload (ex: valid, deviceLimit, nomeDaEmpresa) ou pelo menos a estrutura básica
            return res.json({
                name: data.nomeDaEmpresa || 'Coliseu Dash',
                ...data
            });
        }

        logger.warn('[Configuracoes] Falha ao consultar Identity Server', { status: response.status, tenantId });
        return res.json({ name: 'Coliseu Dash' });

    } catch (err) {
        logger.error('[Configuracoes] Erro na rota de busca da empresa', { err: err.message });
        // Fallback genérico para não quebrar a UI
        return res.json({ name: 'Coliseu Dash' });
    }
});

module.exports = router;
