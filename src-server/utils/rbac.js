'use strict';

const db = require('../db/postgres');

/**
 * Recupera a lista de permissões ativa para o usuário do tenant correspondente.
 * @param {number|string} userId
 * @param {string} tenantId
 * @returns {Promise<string[]>}
 */
async function getUserPermissions(userId, tenantId) {
    const userRes = await db.query(
        'SELECT id, role, grupo_id, versao, permissions FROM dash_usuarios WHERE id = $1 AND tenant_id = $2',
        [userId, tenantId]
    );

    if (userRes.rowCount === 0) return [];

    const user = userRes.rows[0];

    const allAdminPermissions = [
        'inicio', 'financeiro', 'fluxo-caixa', 'estoque', 'comissoes', 
        'ranking', 'estatisticas', 'inteligencia', 'produtos', 
        'clientes', 'vendas', 'usuarios', 
        'usuarios_criar', 'usuarios_grupos', 'usuarios_filiais', 'usuarios_status', 'usuarios_versao',
        'reset_senha', 'cadastro_metas', 'layout_1', 'layout_2', 'layout_3',
        'bi_sales', 'bi_hub', 'bi_supplier', 'bi_abc', 'bi_finance', 'bi_customer', 
        'bi_comparative', 'bi_customer_analytics', 'bi_goals', 'bi_heatmap', 'bi_ai_insights'
    ];

    // Se for master, tem acesso irrestrito a todos os layouts e abas
    if (user.role === 'master') {
        return allAdminPermissions;
    }

    // Buscar permissões do grupo correspondente à versão ativa na tabela associativa
    const permRes = await db.query(
        `SELECT p.recurso 
         FROM dash_permissoes p
         JOIN dash_grupos_acesso g ON p.grupo_id = g.id
         JOIN dash_usuario_grupo ug ON ug.grupo_id = g.id
         WHERE ug.usuario_id = $1 AND g.versao = $2 AND p.pode_acessar = true`,
        [userId, user.versao]
    );

    if (permRes.rowCount > 0) {
        return permRes.rows.map(r => r.recurso);
    }

    // Fallback: se não achar na tabela associativa, mas tiver o grupo_id no usuário
    if (user.grupo_id) {
        const legacyPermRes = await db.query(
            'SELECT recurso FROM dash_permissoes WHERE grupo_id = $1 AND pode_acessar = true',
            [user.grupo_id]
        );
        return legacyPermRes.rows.map(r => r.recurso);
    }

    // Se for administrador do tenant e não tiver grupo associado, libera todos os acessos do layout dele por padrão
    if (user.role === 'admin') {
        return allAdminPermissions;
    }

    // Fallback: permissões estáticas do campo antigo
    if (user.permissions) {
        try {
            return typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions;
        } catch (e) {
            return [];
        }
    }

    return [];
}

/**
 * Recupera os IDs dos vendedores permitidos para o usuário do tenant correspondente.
 * Se retornar null, o usuário pode ver todos os vendedores (sem restrição).
 * @param {number|string} userId
 * @param {string} tenantId
 * @returns {Promise<number[]|null>}
 */
async function getUserAllowedSellers(userId, tenantId) {
    const userRes = await db.query(
        'SELECT id, role, grupo_id, versao FROM dash_usuarios WHERE id = $1 AND tenant_id = $2',
        [userId, tenantId]
    );

    if (userRes.rowCount === 0) return [];

    const user = userRes.rows[0];

    // Se for master, tem acesso a todos os vendedores
    if (user.role === 'master') {
        return null;
    }

    // Buscar no grupo associado do usuário
    const groupsRes = await db.query(
        `SELECT g.id, g.vendedores_todos 
         FROM dash_grupos_acesso g
         JOIN dash_usuario_grupo ug ON ug.grupo_id = g.id
         WHERE ug.usuario_id = $1 AND g.versao = $2`,
        [userId, user.versao]
    );

    let checkGroups = groupsRes.rows;

    // Fallback legado: se não houver registros em dash_usuario_grupo, tenta o grupo_id direto no usuário
    if (checkGroups.length === 0 && user.grupo_id) {
        const legacyGroupRes = await db.query(
            'SELECT id, vendedores_todos FROM dash_grupos_acesso WHERE id = $1',
            [user.grupo_id]
        );
        checkGroups = legacyGroupRes.rows;
    }

    // Se o usuário não tiver grupo cadastrado, e for admin, vê todos
    if (checkGroups.length === 0) {
        if (user.role === 'admin') {
            return null;
        }
        return []; // Se não for admin e não tiver grupo, restringe tudo
    }

    // Se qualquer um dos grupos permitir todos os vendedores, retorna null
    const permitAll = checkGroups.some(g => g.vendedores_todos === true || g.vendedores_todos === null);
    if (permitAll) {
        return null;
    }

    // Caso contrário, busca os vendedores associados a cada um dos grupos do usuário
    const groupIds = checkGroups.map(g => g.id);
    const sellersRes = await db.query(
        `SELECT DISTINCT vendedor_id FROM dash_grupo_vendedores WHERE grupo_id = ANY($1)`,
        [groupIds]
    );

    return sellersRes.rows.map(r => r.vendedor_id);
}

module.exports = {
    getUserPermissions,
    getUserAllowedSellers
};
