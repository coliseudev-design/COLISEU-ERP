'use strict';

const { Pool } = require('pg');
const { AsyncLocalStorage } = require('async_hooks');
const config = require('../config/env');
const logger = require('../config/logger');

// AsyncLocalStorage to maintain the active database context for requests/syncs
const dbContext = new AsyncLocalStorage();

const dns = require('dns').promises;

let currentPool = null;
let activeHost = null;

function createPoolForHost(host, pass) {
    const poolConfig = config.postgres.connectionString
        ? {
            connectionString: config.postgres.connectionString,
            ssl: config.postgres.ssl ? { rejectUnauthorized: false } : false,
            max: 50,
            idleTimeoutMillis: 10000,
            connectionTimeoutMillis: 10000,
        }
        : {
            host: host || config.postgres.host || 'postgres',
            port: config.postgres.port || 5432,
            database: config.postgres.database || 'coliseu_erp',
            user: config.postgres.user || 'postgres',
            password: pass !== undefined ? pass : (config.postgres.password || 'postgres123'),
            ssl: config.postgres.ssl ? { rejectUnauthorized: false } : false,
            max: 50,
            idleTimeoutMillis: 10000,
            connectionTimeoutMillis: 10000,
        };

    const p = new Pool(poolConfig);
    p.on('error', (err) => {
        logger.warn('[DB] Aviso em cliente ocioso do PostgreSQL:', err.message);
    });
    return p;
}

currentPool = createPoolForHost(config.postgres.host);

async function getWorkingPool() {
    if (activeHost && currentPool) {
        return currentPool;
    }

    const candidateHosts = [
        config.postgres.host,
        process.env.DB_HOST,
        process.env.DATABASE_HOST,
        process.env.POSTGRES_HOST,
        'postgres',
        'postgresql',
        'db',
        'coliseu-postgres',
        'localhost',
        '127.0.0.1'
    ].filter(Boolean);

    const candidatePasswords = [
        config.postgres.password,
        process.env.DB_PASSWORD,
        process.env.POSTGRES_PASSWORD,
        'postgres123',
        'coliseu_admin',
        'postgres',
        ''
    ].filter(p => p !== undefined);

    for (const h of candidateHosts) {
        try {
            await dns.lookup(h);
            for (const pass of candidatePasswords) {
                try {
                    const testPool = createPoolForHost(h, pass);
                    await testPool.query('SELECT 1');
                    activeHost = h;
                    currentPool = testPool;
                    logger.info(`[DB] Conexão ativa estabelecida com sucesso no host: ${h}`);
                    return currentPool;
                } catch {}
            }
        } catch {}
    }

    return currentPool || createPoolForHost('postgres');
}

/**
 * Executa uma query no PostgreSQL.
 * @param {string} text - Query SQL
 * @param {any[]} params - Parâmetros
 * @returns {Promise<import('pg').QueryResult<any>>}
 */
async function query(text, params) {
    try {
        const poolToUse = await getWorkingPool();
        const res = await poolToUse.query(text, params);
        return res;
    } catch (err) {
        if (err.message && (err.message.includes('getaddrinfo') || err.message.includes('ECONNREFUSED'))) {
            activeHost = null; // force rediscovery
            try {
                const retryPool = await getWorkingPool();
                return await retryPool.query(text, params);
            } catch (retryErr) {
                logger.error('[DB] Falha crítica após tentativa de reconexão', { error: retryErr.message });
                throw retryErr;
            }
        }
        logger.error('[DB] Falha ao executar query', { text: text.substring(0, 150), error: err.message });
        throw err;
    }
}

/**
 * Usado para inicialização e checagem de saúde.
 */
async function checkConnection() {
    let mainOk = false;
    let vetOk = false;

    // Check main database connection and run auto-migrations
    try {
        await pool.query('SELECT 1 AS ok', []);
        logger.info(`[DB] Conectado ao PostgreSQL (${config.postgres.database})`);
        mainOk = true;
        
        // Auto-migration: Garante que as novas tabelas e colunas existam em produção
        try {
            await pool.query(`
                CREATE TABLE IF NOT EXISTS dash_caixas (
                    id SERIAL PRIMARY KEY,
                    tenant_id UUID NOT NULL,
                    id_firebird INTEGER NOT NULL,
                    descricao VARCHAR(150),
                    sincronizado_em TIMESTAMPTZ DEFAULT NOW(),
                    UNIQUE(tenant_id, id_firebird)
                );
            `, []);
            
            await pool.query(`
                ALTER TABLE dash_vendas ADD COLUMN IF NOT EXISTS especie VARCHAR(100);
            `, []);
            
            await pool.query(`ALTER TABLE dash_vendas ADD COLUMN IF NOT EXISTS depto_id INTEGER;`, []);
            await pool.query(`ALTER TABLE dash_vendas_itens ADD COLUMN IF NOT EXISTS depto_id INTEGER;`, []);
            
            logger.info('[DB] Auto-migration (dash_caixas e especie) verificada/aplicada com sucesso.');
        } catch (migErr1) {
            logger.warn('[DB] Base tables not found yet, skipping initial auto-migration.', { erro: migErr1.message });
        }
        
        // Mini-migrator silencioso para garantir colunas recém-adicionadas na v2.4.0
        try {
            await pool.query(`ALTER TABLE dash_produtos ADD COLUMN IF NOT EXISTS preco DECIMAL(15,2) DEFAULT 0;`, []);
            await pool.query(`ALTER TABLE dash_produtos ADD COLUMN IF NOT EXISTS custo DECIMAL(15,2) DEFAULT 0;`, []);
            await pool.query(`ALTER TABLE dash_produtos ADD COLUMN IF NOT EXISTS estoque DECIMAL(15,3) DEFAULT 0;`, []);
            await pool.query(`ALTER TABLE dash_produtos ADD COLUMN IF NOT EXISTS estoque_minimo DECIMAL(15,3) DEFAULT 0;`, []);
            await pool.query(`ALTER TABLE dash_produtos ADD COLUMN IF NOT EXISTS marca_id INTEGER DEFAULT NULL;`, []);
            await pool.query(`ALTER TABLE dash_produtos ADD COLUMN IF NOT EXISTS grupo_id INTEGER DEFAULT NULL;`, []);
            
            // Tabela de Caixas
            await pool.query(`
                CREATE TABLE IF NOT EXISTS dash_caixas (
                    id SERIAL PRIMARY KEY,
                    tenant_id UUID NOT NULL,
                    id_firebird INTEGER NOT NULL,
                    descricao TEXT NOT NULL,
                    sincronizado_em TIMESTAMPTZ DEFAULT NOW(),
                    UNIQUE(tenant_id, id_firebird)
                );
            `, []);
            
            // Tabelas de Marcas e Grupos
            await pool.query(`
                CREATE TABLE IF NOT EXISTS dash_marcas (
                    id SERIAL PRIMARY KEY,
                    tenant_id UUID NOT NULL,
                    id_firebird INTEGER NOT NULL,
                    nome VARCHAR(255) NOT NULL,
                    sincronizado_em TIMESTAMPTZ DEFAULT NOW(),
                    UNIQUE(tenant_id, id_firebird)
                );
            `, []);
            
            await pool.query(`
                CREATE TABLE IF NOT EXISTS dash_grupos (
                    id SERIAL PRIMARY KEY,
                    tenant_id UUID NOT NULL,
                    id_firebird INTEGER NOT NULL,
                    nome VARCHAR(255) NOT NULL,
                    sincronizado_em TIMESTAMPTZ DEFAULT NOW(),
                    UNIQUE(tenant_id, id_firebird)
                );
            `, []);

            await pool.query(`ALTER TABLE dash_financeiro ADD COLUMN IF NOT EXISTS caixa_id_firebird INTEGER;`, []);
            await pool.query(`ALTER TABLE dash_financeiro ADD COLUMN IF NOT EXISTS depto_id INTEGER;`, []);
            await pool.query(`ALTER TABLE dash_financeiro ADD COLUMN IF NOT EXISTS centro_custo INTEGER;`, []);
            await pool.query(`ALTER TABLE dash_financeiro ADD COLUMN IF NOT EXISTS tipo_documento VARCHAR(50);`, []);
            
            // Colunas de CFOP e numero_nota nas vendas
            await pool.query(`ALTER TABLE dash_vendas ADD COLUMN IF NOT EXISTS cfop INTEGER DEFAULT NULL;`, []);
            await pool.query(`ALTER TABLE dash_vendas ADD COLUMN IF NOT EXISTS numero_nota INTEGER DEFAULT NULL;`, []);
            await pool.query(`ALTER TABLE dash_vendas ADD COLUMN IF NOT EXISTS es INTEGER DEFAULT NULL;`, []);
            await pool.query(`ALTER TABLE dash_vendas ADD COLUMN IF NOT EXISTS processo INTEGER DEFAULT NULL;`, []);
            await pool.query(`ALTER TABLE dash_usuarios ADD COLUMN IF NOT EXISTS use_vet_db BOOLEAN DEFAULT false;`, []);
        } catch (migErr) {
            logger.warn('[DB] Migração silenciosa falhou ou já executada', { erro: migErr.message });
        }

    } catch (err) {
        logger.error('[DB] Falha ao conectar ao PostgreSQL principal', { error: err.message });
    }



    return mainOk; // Retorna status da principal para não quebrar fluxo original do health check do Docker
}

module.exports = {
    query,
    get pool() {
        return currentPool;
    },
    poolMain: pool,
    checkConnection,
    dbContext
};
