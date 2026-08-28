'use strict';

require('dotenv').config();

function required(key) {
    const val = process.env[key];
    if (!val) throw new Error(`[Config] Variável de ambiente obrigatória ausente: ${key}`);
    return val;
}

function optional(key, defaultValue = '') {
    const val = process.env[key];
    if (val === undefined || val === null || val === '' || val === 'undefined' || val === 'null') {
        return defaultValue;
    }
    return val;
}

const config = {
    server: {
        port: parseInt(optional('PORT', '3200'), 10),
        nodeEnv: optional('NODE_ENV', 'development'),
        isProduction: optional('NODE_ENV', 'development') === 'production',
    },

    security: {
        jwtDeviceKey: optional('JWT_DEVICE_KEY', 'aQbY3eqVz2xd8PSr0AUKtfwFRo7n1IickE6sMGWTNCpXhZ95'),
        expectedModuleSlug: optional('EXPECTED_MODULE_SLUG', 'coliseu-dash'),
        internalApiKey: optional('INTERNAL_API_KEY', 'Coliseu2026!IdentitySuperSecretKeyOauth20'),
        identityApiUrl: optional('IDENTITY_API_URL', 'https://adminlicencas.coliseusistemas.com.br'),
        identityInternalKey: (() => {
            const envKey = optional('IDENTITY_INTERNAL_KEY', '');
            if (envKey && envKey !== optional('JWT_DEVICE_KEY', 'aQbY3eqVz2xd8PSr0AUKtfwFRo7n1IickE6sMGWTNCpXhZ95')) {
                return envKey;
            }
            return 'Coliseu2026!IdentitySuperSecretKeyOauth20';
        })(),
        allowedOrigins: optional('ALLOWED_ORIGINS', '')
            .split(',')
            .map(s => s.trim())
            .filter(Boolean),
        rateLimitWindowMs: parseInt(optional('RATE_LIMIT_WINDOW_MS', '60000'), 10),
        rateLimitMax: parseInt(optional('RATE_LIMIT_MAX', '200'), 10),
    },

    postgres: {
        connectionString: optional('DATABASE_URL') || optional('DB_URL') || '',
        host: optional('DATABASE_HOST') || optional('DB_HOST') || optional('VITE_DB_HOST') || optional('POSTGRES_HOST') || optional('PG_HOST', 'postgres-central'),
        port: parseInt(optional('DATABASE_PORT') || optional('DB_PORT') || optional('VITE_DB_PORT') || optional('POSTGRES_PORT') || optional('PG_PORT', '5432'), 10),
        database: optional('DATABASE_NAME') || optional('DB_NAME') || optional('POSTGRES_DB') || optional('PG_DATABASE', 'coliseu_erp'),
        user: optional('DATABASE_USER') || optional('DB_USER') || optional('POSTGRES_USER') || optional('PG_USER', 'coliseu_admin'),
        password: optional('DATABASE_PASSWORD') || optional('DB_PASSWORD') || optional('POSTGRES_PASSWORD') || optional('PG_PASSWORD', ''),
        ssl: optional('PG_SSL', 'false') === 'true' || optional('DB_SSL', 'false') === 'true',
    },
};

module.exports = config;
