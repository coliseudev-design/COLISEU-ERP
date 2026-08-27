'use strict';

const { getUserPermissions } = require('../utils/rbac');

/**
 * Middleware para validar permissão de acesso a recursos específicos (RBAC).
 * @param {string} recurso - Nome do recurso/aba (ex: 'bi_sales', 'bi_finance', 'layout_4')
 */
function authorize(recurso) {
    return async (req, res, next) => {
        try {
            if (!req.user || !req.tenant) {
                return res.status(401).json({ error: 'Não autorizado', code: 'UNAUTHORIZED' });
            }

            const permissions = await getUserPermissions(req.user.id, req.tenant.id);

            // Permite acesso se a lista incluir o recurso requerido
            if (permissions.includes(recurso)) {
                return next();
            }

            return res.status(403).json({ 
                error: `Acesso negado: Você não tem permissão para acessar o recurso '${recurso}'.`, 
                code: 'FORBIDDEN' 
            });
        } catch (err) {
            next(err);
        }
    };
}

module.exports = authorize;
