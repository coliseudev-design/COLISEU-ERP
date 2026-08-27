'use strict';

const { Pool } = require('pg');
const { AsyncLocalStorage } = require('async_hooks');
const config = require('../config/env');
const logger = require('../config/logger');

// AsyncLocalStorage to maintain the active database context for requests/syncs
const dbContext = new AsyncLocalStorage();

// PostgreSQL Pool for Dashboard (Coliseu)
const pool = new Pool({
    host: config.postgres.host,
    port: config.postgres.port,
    database: config.postgres.database,
    user: config.postgres.user,
    password: config.postgres.password,
    ssl: config.postgres.ssl ? { rejectUnauthorized: false } : false,
    max: 50,
    min: 10,
    idleTimeoutMillis: 5000,
    connectionTimeoutMillis: 10000,
    statement_timeout: 30000,
    keepalives: true,
    keepalivesIdle: 30,
});

pool.on('error', (err) => {
    logger.error('[DB] Erro inesperado em cliente ocioso do PostgreSQL', err);
});


/**
 * Executa uma query no PostgreSQL.
 * @param {string} text - Query SQL
 * @param {any[]} params - Parâmetros
 * @returns {Promise<import('pg').QueryResult<any>>}
 */
async function query(text, params) {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        return res;
    } catch (err) {
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
        return pool;
    },
    poolMain: pool,
    checkConnection,
    dbContext
};
