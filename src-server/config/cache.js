'use strict';

const logger = require('./logger');

// Limite máximo de entradas no cache em memória para evitar memory leak na Heap do Node.js
const MAX_CACHE_SIZE = 2500;
const cacheMap = new Map();

/**
 * Obtém os dados do cache se ainda não estiverem expirados.
 * @param {string} key 
 */
function getCache(key) {
    const entry = cacheMap.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiresAt) {
        cacheMap.delete(key);
        return null;
    }
    
    return entry.data;
}

/**
 * Salva os dados no cache com tempo de expiração (TTL).
 * Evita vazamento de memória expurgando a chave mais antiga caso ultrapasse MAX_CACHE_SIZE.
 * @param {string} key 
 * @param {any} data 
 * @param {number} ttlSeconds Padrão: 5 minutos (300s)
 */
function setCache(key, data, ttlSeconds = 300) {
    if (!key) return;

    // Evicção LRU simples para proteger a memória do servidor
    if (cacheMap.size >= MAX_CACHE_SIZE) {
        const firstKey = cacheMap.keys().next().value;
        if (firstKey) {
            cacheMap.delete(firstKey);
        }
    }

    cacheMap.set(key, {
        data,
        expiresAt: Date.now() + (ttlSeconds * 1000)
    });
}

/**
 * Invalida todo o cache associado a um tenant específico.
 * Suporta formatos de chave como `overview:tenantId:...`, `ranking:tenantId:...` e `tenantId:...`.
 * Chamado automaticamente pelo worker após sincronização.
 * @param {string} tenantId 
 */
function invalidateTenant(tenantId) {
    if (!tenantId) return;

    let count = 0;
    for (const key of cacheMap.keys()) {
        if (key.includes(tenantId)) {
            cacheMap.delete(key);
            count++;
        }
    }
    if (count > 0) {
        logger.info(`[Cache] Invalidou ${count} chaves para o tenant ${tenantId}`);
    }
}

/**
 * Limpa todo o cache em memória (útil para testes ou manutenção).
 */
function clearCache() {
    const size = cacheMap.size;
    cacheMap.clear();
    if (size > 0) {
        logger.info(`[Cache] Cache totalmente limpo (${size} chaves removidas).`);
    }
}

module.exports = {
    getCache,
    setCache,
    invalidateTenant,
    clearCache
};
