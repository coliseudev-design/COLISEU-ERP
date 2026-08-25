import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';
const { Pool } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '80', 10);

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Configuração do Pool PostgreSQL Central com alta tolerância e reconexão
const connectionString = process.env.DATABASE_URL || process.env.DB_URL;
const pool = new Pool(
  connectionString
    ? { connectionString, max: 20, idleTimeoutMillis: 60000, connectionTimeoutMillis: 10000 }
    : {
        host: process.env.VITE_DB_HOST || process.env.DB_HOST || 'postgres-central',
        port: parseInt(process.env.VITE_DB_PORT || process.env.DB_PORT || '5432', 10),
        user: process.env.POSTGRES_USER || process.env.DB_USER || 'coliseu_admin',
        password: process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD,
        database: process.env.POSTGRES_DB || process.env.DB_NAME || 'coliseu_erp',
        max: 20,
        idleTimeoutMillis: 60000,
        connectionTimeoutMillis: 10000,
      }
);

pool.on('error', (err) => {
  console.warn('[PostgreSQL Pool] Aviso de conexão inativa ou reconexão:', err.message);
});

// Criação / Migração Automática das Tabelas no PostgreSQL Central
async function initDb() {
  try {
    await pool.query(`
      -- 0. Garantir Empresa Matriz Padrão
      CREATE TABLE IF NOT EXISTS empresas (
        id VARCHAR(64) PRIMARY KEY,
        razao_social VARCHAR(255) NOT NULL,
        nome_fantasia VARCHAR(255),
        cnpj VARCHAR(20) NOT NULL UNIQUE,
        uf VARCHAR(2) NOT NULL DEFAULT 'MS',
        regime_tributario VARCHAR(30) NOT NULL DEFAULT 'SIMPLES_NACIONAL',
        ativo BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      INSERT INTO empresas (id, razao_social, nome_fantasia, cnpj, uf, regime_tributario)
      VALUES ('emp-matriz-001', 'COLISEU SISTEMAS LTDA', 'COLISEU MATRIZ', '05766577000122', 'MS', 'SIMPLES_NACIONAL')
      ON CONFLICT (id) DO NOTHING;

      -- 1. Tabela de Pedidos de Venda
      CREATE TABLE IF NOT EXISTS pedidos_venda (
        id TEXT PRIMARY KEY,
        filial_id TEXT,
        numero_pedido BIGINT,
        data_emissao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        cliente_id TEXT,
        cliente_nome TEXT,
        cliente_cpf_cnpj TEXT,
        cliente_cidade TEXT,
        cliente_uf TEXT,
        vendedor_nome TEXT,
        natureza_operacao TEXT,
        quantidade_itens INT DEFAULT 1,
        valor_total NUMERIC(15,2) DEFAULT 0,
        status TEXT DEFAULT 'APROVADO',
        device_id TEXT,
        payload_json JSONB,
        is_deleted BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      ALTER TABLE pedidos_venda ADD COLUMN IF NOT EXISTS payload_json JSONB;
      ALTER TABLE pedidos_venda ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

      -- 2. Tabela de Pessoas / Clientes / Fornecedores
      CREATE TABLE IF NOT EXISTS pessoas (
        id VARCHAR(64) PRIMARY KEY,
        device_id VARCHAR(64) NOT NULL DEFAULT 'server',
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
        empresa_id VARCHAR(64) NOT NULL DEFAULT 'emp-matriz-001',
        tipo_cadastro VARCHAR(30) NOT NULL DEFAULT 'CLIENTE',
        tipo_pessoa VARCHAR(10) NOT NULL DEFAULT 'FISICA',
        nome_razaosocial VARCHAR(255) NOT NULL,
        nome_fantasia VARCHAR(255),
        cpf_cnpj VARCHAR(20),
        codigo_interno VARCHAR(50),
        rg_ie VARCHAR(30),
        inscricao_municipal VARCHAR(30),
        cep VARCHAR(10),
        logradouro VARCHAR(255),
        numero VARCHAR(30),
        complemento VARCHAR(100),
        bairro VARCHAR(100),
        municipio VARCHAR(100),
        uf VARCHAR(2),
        email VARCHAR(150),
        email_financeiro VARCHAR(150),
        telefone VARCHAR(30),
        celular VARCHAR(30),
        limite_credito NUMERIC(15,2) DEFAULT 5000.00,
        score_credito INT DEFAULT 700,
        observacoes TEXT,
        ativo BOOLEAN NOT NULL DEFAULT TRUE,
        payload_json JSONB
      );
      ALTER TABLE pessoas ADD COLUMN IF NOT EXISTS payload_json JSONB;
      ALTER TABLE pessoas ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

      -- 3. Tabela de Produtos / Catálogo / Estoque
      CREATE TABLE IF NOT EXISTS produtos (
        id VARCHAR(64) PRIMARY KEY,
        device_id VARCHAR(64) NOT NULL DEFAULT 'server',
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
        empresa_id VARCHAR(64) NOT NULL DEFAULT 'emp-matriz-001',
        codigo_sku VARCHAR(50) NOT NULL,
        codigo_barras VARCHAR(50),
        descricao VARCHAR(255) NOT NULL,
        unidade_medida VARCHAR(10) NOT NULL DEFAULT 'UN',
        preco_custo NUMERIC(15,4) NOT NULL DEFAULT 0.0000,
        preco_venda NUMERIC(15,4) NOT NULL DEFAULT 0.0000,
        preco_minimo NUMERIC(15,4) DEFAULT 0.0000,
        ncm VARCHAR(10),
        estoque_minimo NUMERIC(15,4) DEFAULT 0.0000,
        ativo BOOLEAN NOT NULL DEFAULT TRUE,
        payload_json JSONB
      );
      ALTER TABLE produtos ADD COLUMN IF NOT EXISTS payload_json JSONB;
      ALTER TABLE produtos ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

      -- 4. Tabela de Ordens de Serviço
      CREATE TABLE IF NOT EXISTS ordens_servico (
        id TEXT PRIMARY KEY,
        numero_os TEXT,
        cliente_nome TEXT,
        veiculo_placa TEXT,
        status TEXT DEFAULT 'EM_ABERTO',
        valor_total NUMERIC(15,2) DEFAULT 0,
        payload_json JSONB,
        is_deleted BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 5. Tabela de Lançamentos Financeiros (Títulos)
      CREATE TABLE IF NOT EXISTS financeiro_titulos (
        id TEXT PRIMARY KEY,
        tipo TEXT,
        descricao TEXT,
        pessoa_nome TEXT,
        valor NUMERIC(15,2) DEFAULT 0,
        data_vencimento DATE,
        status TEXT DEFAULT 'ABERTO',
        payload_json JSONB,
        is_deleted BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 6. Tabela de Frotas / Transporte / CT-e / MDF-e
      CREATE TABLE IF NOT EXISTS transporte_cadastros (
        id TEXT PRIMARY KEY,
        tipo_registro TEXT,
        identificador TEXT,
        payload_json JSONB,
        is_deleted BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('[PostgreSQL Central] Schema Omni-Sync verificado com sucesso.');
  } catch (err) {
    console.warn('[PostgreSQL Central] Aviso na inicialização de tabelas:', err.message);
  }
}
initDb();

// Fallbacks e Caches em memória
let inMemoryPedidos = [];
let inMemoryPessoas = [];
let inMemoryProdutos = [];
let inMemoryOS = [];
let inMemoryFinanceiro = [];
let inMemoryTransporte = [];

// =========================================================================
// BARRAMENTO DE EVENTOS EM TEMPO REAL (SSE - SERVER-SENT EVENTS)
// =========================================================================

const sseClients = new Set();

export function broadcastMutation(event) {
  const payload = JSON.stringify({
    ...event,
    timestamp: new Date().toISOString(),
  });

  const msg = `event: mutation\ndata: ${payload}\n\n`;

  for (const res of sseClients) {
    try {
      res.write(msg);
    } catch {
      sseClients.delete(res);
    }
  }
}

app.get('/api/sync/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders?.();

  res.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected', clients_count: sseClients.size + 1 })}\n\n`);
  sseClients.add(res);

  const interval = setInterval(() => {
    try {
      res.write(`: heartbeat ${Date.now()}\n\n`);
    } catch {
      clearInterval(interval);
      sseClients.delete(res);
    }
  }, 15000);

  req.on('close', () => {
    clearInterval(interval);
    sseClients.delete(res);
  });
});

// =========================================================================
// ROTAS DE DIAGNÓSTICO E SAÚDE
// =========================================================================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'Coliseu ERP - Omni-Sync Central',
    active_terminals: sseClients.size,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health/db', async (req, res) => {
  let dbStatus = 'disconnected';
  let totalDbPedidos = 0;
  let totalDbPessoas = 0;
  let totalDbProdutos = 0;

  try {
    const p1 = pool.query('SELECT count(*)::int as count FROM pedidos_venda WHERE is_deleted = FALSE');
    const p2 = pool.query('SELECT count(*)::int as count FROM pessoas WHERE is_deleted = FALSE');
    const p3 = pool.query('SELECT count(*)::int as count FROM produtos WHERE is_deleted = FALSE');
    const [r1, r2, r3] = await Promise.allSettled([p1, p2, p3]);

    dbStatus = 'connected';
    if (r1.status === 'fulfilled') totalDbPedidos = r1.value.rows[0]?.count || 0;
    if (r2.status === 'fulfilled') totalDbPessoas = r2.value.rows[0]?.count || 0;
    if (r3.status === 'fulfilled') totalDbProdutos = r3.value.rows[0]?.count || 0;
  } catch (e) {
    dbStatus = `error: ${e.message}`;
  }

  res.json({
    status: 'online',
    database: dbStatus,
    active_terminals: sseClients.size,
    total_db_pedidos: totalDbPedidos,
    total_db_pessoas: totalDbPessoas,
    total_db_produtos: totalDbProdutos,
    timestamp: new Date().toISOString(),
  });
});

function parseDateForPg(dt) {
  if (!dt) return new Date().toISOString();
  if (typeof dt === 'string' && dt.includes('/')) {
    const parts = dt.split('/');
    if (parts.length === 3) {
      const [d, m, y] = parts;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T12:00:00.000Z`;
    }
  }
  try {
    const parsed = new Date(dt);
    return isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

// =========================================================================
// 1. ROTAS DE CLIENTES & PARCEIROS (PESSOAS)
// =========================================================================

app.get('/api/pessoas', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, empresa_id, codigo_interno, tipo_cadastro, tipo_pessoa,
              nome_razaosocial, nome_fantasia, cpf_cnpj, rg_ie,
              cep, logradouro, numero, bairro, municipio, uf,
              telefone, celular, email, limite_credito, ativo,
              payload_json, updated_at
       FROM pessoas
       WHERE is_deleted = FALSE
       ORDER BY updated_at DESC LIMIT 5000`
    );

    const lista = result.rows.map((r) => {
      if (r.payload_json && typeof r.payload_json === 'object') {
        return {
          ...r.payload_json,
          id: r.id,
          nome: r.nome_razaosocial || r.payload_json.nome,
          nomeAbrev: r.nome_fantasia || r.payload_json.nomeAbrev || r.nome_razaosocial,
          cpfCnpj: r.cpf_cnpj || r.payload_json.cpfCnpj,
          codigo: r.codigo_interno || r.payload_json.codigo || '001',
          status: r.ativo ? 'Ativo' : 'Bloqueado',
        };
      }
      return {
        id: r.id,
        codigo: r.codigo_interno || '001',
        tipo: r.tipo_cadastro || 'CLIENTE',
        tipoPessoa: r.tipo_pessoa === 'JURIDICA' ? 'JURÍDICA' : 'FÍSICA',
        nome: r.nome_razaosocial,
        nomeAbrev: r.nome_fantasia || r.nome_razaosocial,
        cpfCnpj: r.cpf_cnpj || '',
        rg: r.rg_ie || '',
        cep: r.cep || '',
        endereco: r.logradouro || '',
        numero: r.numero || '',
        bairro: r.bairro || '',
        municipio: r.municipio || 'DOURADOS',
        uf: r.uf || 'MS',
        foneRes: r.telefone || '',
        celularWhats: r.celular || '',
        emailPrincipal: r.email || '',
        limiteCredito: parseFloat(r.limite_credito || '0'),
        status: r.ativo ? 'Ativo' : 'Bloqueado',
      };
    });

    if (lista.length > 0) inMemoryPessoas = lista;
    return res.json(lista.length > 0 ? lista : inMemoryPessoas);
  } catch (err) {
    console.warn('[API] Falha ao consultar pessoas no PostgreSQL:', err.message);
    return res.json(inMemoryPessoas);
  }
});

app.post('/api/pessoas', async (req, res) => {
  const p = req.body;
  if (!p || !p.id) {
    return res.status(400).json({ error: 'Payload de pessoa inválido (id obrigatório)' });
  }

  const nome = (p.nome || p.nome_razaosocial || 'CLIENTE').toUpperCase();
  const nomeFantasia = (p.nomeAbrev || p.nome_fantasia || nome).toUpperCase();
  const cpfCnpj = (p.cpfCnpj || p.cpf_cnpj || '').replace(/\D/g, '') || null;

  try {
    await pool.query(
      `INSERT INTO pessoas (
        id, empresa_id, codigo_interno, tipo_cadastro, tipo_pessoa,
        nome_razaosocial, nome_fantasia, cpf_cnpj, rg_ie,
        cep, logradouro, numero, bairro, municipio, uf,
        telefone, celular, email, limite_credito, ativo,
        payload_json, is_deleted, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, FALSE, CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO UPDATE SET
        codigo_interno = EXCLUDED.codigo_interno,
        tipo_cadastro = EXCLUDED.tipo_cadastro,
        tipo_pessoa = EXCLUDED.tipo_pessoa,
        nome_razaosocial = EXCLUDED.nome_razaosocial,
        nome_fantasia = EXCLUDED.nome_fantasia,
        cpf_cnpj = EXCLUDED.cpf_cnpj,
        rg_ie = EXCLUDED.rg_ie,
        cep = EXCLUDED.cep,
        logradouro = EXCLUDED.logradouro,
        numero = EXCLUDED.numero,
        bairro = EXCLUDED.bairro,
        municipio = EXCLUDED.municipio,
        uf = EXCLUDED.uf,
        telefone = EXCLUDED.telefone,
        celular = EXCLUDED.celular,
        email = EXCLUDED.email,
        limite_credito = EXCLUDED.limite_credito,
        ativo = EXCLUDED.ativo,
        payload_json = EXCLUDED.payload_json,
        is_deleted = FALSE,
        updated_at = CURRENT_TIMESTAMP`,
      [
        p.id,
        p.empresa_id || 'emp-matriz-001',
        p.codigo || p.codigo_interno || '001',
        p.tipo || p.tipo_cadastro || 'CLIENTE',
        (p.tipoPessoa || p.tipo_pessoa || 'FISICA').toUpperCase().includes('JUR') ? 'JURIDICA' : 'FISICA',
        nome,
        nomeFantasia,
        cpfCnpj,
        p.rg || p.rg_ie || p.inscEstadual || null,
        p.cep || null,
        p.endereco || p.logradouro || null,
        p.numero || null,
        p.bairro || null,
        p.municipio || p.cidade || 'DOURADOS',
        p.uf || 'MS',
        p.foneRes || p.telefone || null,
        p.celularWhats || p.celular || null,
        p.emailPrincipal || p.email || null,
        parseFloat(p.limiteCredito || p.limite_credito || '0') || 0,
        p.status !== 'Bloqueado',
        JSON.stringify(p),
      ]
    );

    inMemoryPessoas = [p, ...inMemoryPessoas.filter((item) => item.id !== p.id)];

    broadcastMutation({
      entity: 'pessoas',
      action: 'UPSERT',
      id: p.id,
      payload: p,
    });

    return res.json({ success: true, pessoa: p });
  } catch (err) {
    console.warn('[API] Erro ao gravar pessoa no PostgreSQL:', err.message);
    const fallbackItem = { ...p, updated_at: new Date().toISOString() };
    inMemoryPessoas = [fallbackItem, ...inMemoryPessoas.filter((item) => item.id !== p.id)];
    broadcastMutation({ entity: 'pessoas', action: 'UPSERT', id: p.id, payload: fallbackItem });
    return res.json({ success: true, pessoa: fallbackItem, fallback: true, error: err.message });
  }
});

app.delete('/api/pessoas/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('UPDATE pessoas SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);
    inMemoryPessoas = inMemoryPessoas.filter((p) => p.id !== id);
    broadcastMutation({ entity: 'pessoas', action: 'DELETE', id, payload: { id } });
    return res.json({ success: true, id });
  } catch (err) {
    inMemoryPessoas = inMemoryPessoas.filter((p) => p.id !== id);
    broadcastMutation({ entity: 'pessoas', action: 'DELETE', id, payload: { id } });
    return res.json({ success: true, id, fallback: true });
  }
});

app.post('/api/pessoas/batch', async (req, res) => {
  const { pessoas } = req.body;
  if (!Array.isArray(pessoas) || pessoas.length === 0) {
    return res.status(400).json({ error: 'Array de pessoas obrigatório' });
  }

  let count = 0;
  for (const p of pessoas) {
    const nome = (p.nome || p.nome_razaosocial || 'CLIENTE').toUpperCase();
    const nomeFantasia = (p.nomeAbrev || p.nome_fantasia || nome).toUpperCase();
    const cpfCnpj = (p.cpfCnpj || p.cpf_cnpj || '').replace(/\D/g, '') || null;

    try {
      await pool.query(
        `INSERT INTO pessoas (
          id, empresa_id, codigo_interno, tipo_cadastro, tipo_pessoa,
          nome_razaosocial, nome_fantasia, cpf_cnpj, rg_ie,
          cep, logradouro, numero, bairro, municipio, uf,
          telefone, celular, email, limite_credito, ativo,
          payload_json, is_deleted, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, FALSE, CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO UPDATE SET
          codigo_interno = EXCLUDED.codigo_interno,
          tipo_cadastro = EXCLUDED.tipo_cadastro,
          nome_razaosocial = EXCLUDED.nome_razaosocial,
          nome_fantasia = EXCLUDED.nome_fantasia,
          cpf_cnpj = EXCLUDED.cpf_cnpj,
          limite_credito = EXCLUDED.limite_credito,
          payload_json = EXCLUDED.payload_json,
          is_deleted = FALSE,
          updated_at = CURRENT_TIMESTAMP`,
        [
          p.id,
          p.empresa_id || 'emp-matriz-001',
          p.codigo || p.codigo_interno || '001',
          p.tipo || p.tipo_cadastro || 'CLIENTE',
          (p.tipoPessoa || p.tipo_pessoa || 'FISICA').toUpperCase().includes('JUR') ? 'JURIDICA' : 'FISICA',
          nome,
          nomeFantasia,
          cpfCnpj,
          p.rg || p.rg_ie || p.inscEstadual || null,
          p.cep || null,
          p.endereco || p.logradouro || null,
          p.numero || null,
          p.bairro || null,
          p.municipio || p.cidade || 'DOURADOS',
          p.uf || 'MS',
          p.foneRes || p.telefone || null,
          p.celularWhats || p.celular || null,
          p.emailPrincipal || p.email || null,
          parseFloat(p.limiteCredito || p.limite_credito || '0') || 0,
          p.status !== 'Bloqueado',
          JSON.stringify(p),
        ]
      );
      count++;
    } catch (e) {
      // ignore item error
    }
  }

  broadcastMutation({ entity: 'pessoas', action: 'BATCH_SYNC', payload: { total: count } });
  res.json({ success: true, processados: pessoas.length, inseridos: count });
});

// =========================================================================
// 2. ROTAS DE PRODUTOS & CATÁLOGO & ESTOQUE
// =========================================================================

app.get('/api/produtos', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, empresa_id, codigo_sku, codigo_barras, descricao, unidade_medida, ncm,
              preco_custo, preco_venda, estoque_minimo, ativo,
              payload_json, updated_at
       FROM produtos
       WHERE is_deleted = FALSE
       ORDER BY updated_at DESC LIMIT 5000`
    );
    const lista = result.rows.map((r) => {
      if (r.payload_json && typeof r.payload_json === 'object') {
        return {
          ...r.payload_json,
          id: r.id,
          precoVenda: parseFloat(r.preco_venda || r.payload_json.precoVenda || 0),
          precoCusto: parseFloat(r.preco_custo || r.payload_json.precoCusto || 0),
        };
      }
      return {
        id: r.id,
        sku: r.codigo_sku,
        codigo: r.codigo_sku,
        codigoBarras: r.codigo_barras || '',
        descricao: r.descricao,
        unidade: r.unidade_medida || 'UN',
        ncm: r.ncm || '',
        precoCusto: parseFloat(r.preco_custo || '0'),
        precoVenda: parseFloat(r.preco_venda || '0'),
        estoqueMinimo: parseFloat(r.estoque_minimo || '0'),
      };
    });
    if (lista.length > 0) inMemoryProdutos = lista;
    return res.json(lista.length > 0 ? lista : inMemoryProdutos);
  } catch (err) {
    console.warn('[API] Falha ao consultar produtos no PostgreSQL:', err.message);
    return res.json(inMemoryProdutos);
  }
});

app.post('/api/produtos', async (req, res) => {
  const p = req.body;
  if (!p || !p.id) {
    return res.status(400).json({ error: 'Payload de produto inválido (id obrigatório)' });
  }

  const sku = p.sku || p.codigo_sku || p.codigo || `SKU-${Date.now().toString().slice(-5)}`;
  const desc = (p.descricao || 'PRODUTO').toUpperCase();

  try {
    await pool.query(
      `INSERT INTO produtos (
        id, empresa_id, codigo_sku, codigo_barras, descricao, unidade_medida, ncm,
        preco_custo, preco_venda, estoque_minimo, ativo,
        payload_json, is_deleted, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, FALSE, CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO UPDATE SET
        codigo_sku = EXCLUDED.codigo_sku,
        codigo_barras = EXCLUDED.codigo_barras,
        descricao = EXCLUDED.descricao,
        unidade_medida = EXCLUDED.unidade_medida,
        ncm = EXCLUDED.ncm,
        preco_custo = EXCLUDED.preco_custo,
        preco_venda = EXCLUDED.preco_venda,
        estoque_minimo = EXCLUDED.estoque_minimo,
        ativo = EXCLUDED.ativo,
        payload_json = EXCLUDED.payload_json,
        is_deleted = FALSE,
        updated_at = CURRENT_TIMESTAMP`,
      [
        p.id,
        p.empresa_id || 'emp-matriz-001',
        sku,
        p.codigoBarras || p.codigo_barras || null,
        desc,
        p.unidade || p.unidade_medida || 'UN',
        p.ncm || null,
        parseFloat(p.precoCusto || p.preco_custo || '0') || 0,
        parseFloat(p.precoVenda || p.preco_venda || '0') || 0,
        parseFloat(p.estoqueMinimo || p.estoque_minimo || '0') || 0,
        p.ativo !== false,
        JSON.stringify(p),
      ]
    );

    inMemoryProdutos = [p, ...inMemoryProdutos.filter((item) => item.id !== p.id)];

    broadcastMutation({
      entity: 'produtos',
      action: 'UPSERT',
      id: p.id,
      payload: p,
    });

    return res.json({ success: true, produto: p });
  } catch (err) {
    console.warn('[API] Erro ao gravar produto no PostgreSQL:', err.message);
    const fallbackItem = { ...p, updated_at: new Date().toISOString() };
    inMemoryProdutos = [fallbackItem, ...inMemoryProdutos.filter((item) => item.id !== p.id)];
    broadcastMutation({ entity: 'produtos', action: 'UPSERT', id: p.id, payload: fallbackItem });
    return res.json({ success: true, produto: fallbackItem, fallback: true, error: err.message });
  }
});

// Delta Atômico de Estoque
app.post('/api/produtos/:id/estoque-delta', async (req, res) => {
  const { id } = req.params;
  const { delta_quantidade, motivo } = req.body;
  const delta = parseFloat(delta_quantidade) || 0;

  broadcastMutation({
    entity: 'produtos',
    action: 'STOCK_DELTA',
    id,
    payload: { id, delta_quantidade: delta, motivo },
  });

  return res.json({ success: true, id, delta_quantidade: delta });
});

app.delete('/api/produtos/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('UPDATE produtos SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);
    inMemoryProdutos = inMemoryProdutos.filter((p) => p.id !== id);
    broadcastMutation({ entity: 'produtos', action: 'DELETE', id, payload: { id } });
    return res.json({ success: true, id });
  } catch (err) {
    inMemoryProdutos = inMemoryProdutos.filter((p) => p.id !== id);
    broadcastMutation({ entity: 'produtos', action: 'DELETE', id, payload: { id } });
    return res.json({ success: true, id, fallback: true });
  }
});

// =========================================================================
// 3. ROTAS DE PEDIDOS DE VENDA
// =========================================================================

app.all('/api/pedidos/reset', async (req, res) => {
  try {
    await pool.query('TRUNCATE TABLE pedidos_venda CASCADE;');
    inMemoryPedidos = [];
    broadcastMutation({ entity: 'pedidos_venda', action: 'RESET', payload: {} });
    return res.json({ success: true, message: 'BANCO DE VENDAS DA NUVEM LIMPO COM SUCESSO!' });
  } catch (err) {
    inMemoryPedidos = [];
    broadcastMutation({ entity: 'pedidos_venda', action: 'RESET', payload: {} });
    return res.json({ success: true, message: 'Memória limpa, erro no banco: ' + err.message });
  }
});

app.get('/api/pedidos', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, filial_id, numero_pedido, data_emissao, cliente_id, cliente_nome,
              cliente_cpf_cnpj, cliente_cidade, cliente_uf, vendedor_nome,
              natureza_operacao, quantidade_itens, valor_total, status, device_id,
              payload_json, created_at, updated_at
       FROM pedidos_venda
       WHERE is_deleted = FALSE
       ORDER BY data_emissao DESC, created_at DESC
       LIMIT 300`
    );

    const pedidos = result.rows.map((r) => {
      if (r.payload_json && typeof r.payload_json === 'object') {
        return {
          ...r.payload_json,
          id: r.id,
          numeroPedido: String(r.numero_pedido || r.payload_json.numeroPedido || '0'),
          clienteNome: r.cliente_nome || r.payload_json.clienteNome || 'CLIENTE',
          status: r.status || r.payload_json.status || 'APROVADO',
          valorTotalFinal: parseFloat(r.valor_total || r.payload_json.valorTotalFinal || '0'),
          dataEmissao: r.payload_json.dataEmissao || (r.data_emissao ? new Date(r.data_emissao).toLocaleDateString('pt-BR') : ''),
        };
      }
      return {
        id: r.id,
        numeroPedido: String(r.numero_pedido || '0'),
        tipoMovimento: 'SAIDA',
        status: r.status || 'APROVADO',
        dataEmissao: r.data_emissao ? new Date(r.data_emissao).toLocaleDateString('pt-BR') : '',
        filialDepto: r.filial_id || 'MATRIZ - DOURADOS/MS',
        clienteId: r.cliente_id || '',
        clienteCodigo: '1',
        clienteNome: r.cliente_nome || 'CLIENTE NÃO INFORMADO',
        clienteCnpjCpf: r.cliente_cpf_cnpj || '',
        clienteCidade: r.cliente_cidade || 'DOURADOS',
        clienteUf: r.cliente_uf || 'MS',
        naturezaOperacao: {
          cfop: '5102',
          descricao: r.natureza_operacao || '5102 - VENDA DE MERCADORIAS',
          tipo: 'SAIDA',
          geraFinanceiro: true,
          movimentaEstoque: true,
          destinacaoPadrao: 'ESTADUAL',
        },
        vendedorNome: r.vendedor_nome || 'CARLOS SILVA (INTERNO)',
        totalProdutos: parseFloat(r.valor_total || '0'),
        valorTotalFinal: parseFloat(r.valor_total || '0'),
        itens: [],
      };
    });

    if (pedidos.length > 0) inMemoryPedidos = pedidos;
    return res.json(pedidos.length > 0 ? pedidos : inMemoryPedidos);
  } catch (err) {
    console.warn('[API] Falha ao consultar PostgreSQL, usando fallback:', err.message);
    return res.json(inMemoryPedidos);
  }
});

app.post('/api/pedidos', async (req, res) => {
  const p = req.body;
  if (!p || !p.id) {
    return res.status(400).json({ error: 'Payload inválido (id obrigatório)' });
  }

  const numeroLimpo = parseInt(String(p.numeroPedido || p.numero_pedido || '0').replace(/\D/g, ''), 10) || 0;
  const valorFinal = parseFloat(p.valorTotalFinal || p.valor_total || '0');
  const qtdItens = Array.isArray(p.itens) ? p.itens.length : (p.quantidade_itens || 1);
  const dataEmissaoPg = parseDateForPg(p.data_emissao || p.dataEmissao);

  try {
    await pool.query(
      `INSERT INTO pedidos_venda (
        id, filial_id, numero_pedido, data_emissao, cliente_id, cliente_nome,
        cliente_cpf_cnpj, cliente_cidade, cliente_uf, vendedor_nome,
        natureza_operacao, quantidade_itens, valor_total, status, device_id,
        payload_json, is_deleted, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, FALSE, CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO UPDATE SET
        numero_pedido = EXCLUDED.numero_pedido,
        cliente_nome = EXCLUDED.cliente_nome,
        cliente_cpf_cnpj = EXCLUDED.cliente_cpf_cnpj,
        cliente_cidade = EXCLUDED.cliente_cidade,
        cliente_uf = EXCLUDED.cliente_uf,
        vendedor_nome = EXCLUDED.vendedor_nome,
        natureza_operacao = EXCLUDED.natureza_operacao,
        quantidade_itens = EXCLUDED.quantidade_itens,
        valor_total = EXCLUDED.valor_total,
        status = EXCLUDED.status,
        payload_json = EXCLUDED.payload_json,
        is_deleted = FALSE,
        updated_at = CURRENT_TIMESTAMP`,
      [
        p.id,
        p.filial_id || p.filialDepto || 'fil-matriz-001',
        numeroLimpo,
        dataEmissaoPg,
        p.cliente_id || p.clienteId || null,
        p.cliente_nome || p.clienteNome || 'CLIENTE NÃO INFORMADO',
        p.cliente_cpf_cnpj || p.clienteCnpjCpf || null,
        p.cliente_cidade || p.clienteCidade || 'DOURADOS',
        p.cliente_uf || p.clienteUf || 'MS',
        p.vendedor_nome || p.vendedorNome || 'CARLOS SILVA (INTERNO)',
        p.natureza_operacao || (typeof p.naturezaOperacao === 'object' ? p.naturezaOperacao?.descricao : p.naturezaOperacao) || '5102 - VENDA',
        qtdItens,
        valorFinal,
        p.status || 'APROVADO',
        p.device_id || 'DESKTOP-LOCAL',
        JSON.stringify(p),
      ]
    );

    inMemoryPedidos = [p, ...inMemoryPedidos.filter((item) => item.id !== p.id)];
    
    broadcastMutation({
      entity: 'pedidos_venda',
      action: 'UPSERT',
      id: p.id,
      payload: p,
    });

    return res.json({ success: true, pedido: p });
  } catch (err) {
    console.warn('[API] Erro ao gravar pedido no PostgreSQL:', err.message);
    const fallbackItem = { ...p, updated_at: new Date().toISOString() };
    inMemoryPedidos = [fallbackItem, ...inMemoryPedidos.filter((item) => item.id !== p.id)];
    broadcastMutation({ entity: 'pedidos_venda', action: 'UPSERT', id: p.id, payload: fallbackItem });
    return res.json({ success: true, pedido: fallbackItem, fallback: true });
  }
});

app.delete('/api/pedidos/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('UPDATE pedidos_venda SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);
    inMemoryPedidos = inMemoryPedidos.filter((p) => p.id !== id);
    broadcastMutation({ entity: 'pedidos_venda', action: 'DELETE', id, payload: { id } });
    return res.json({ success: true, id });
  } catch (err) {
    inMemoryPedidos = inMemoryPedidos.filter((p) => p.id !== id);
    broadcastMutation({ entity: 'pedidos_venda', action: 'DELETE', id, payload: { id } });
    return res.json({ success: true, id, fallback: true });
  }
});

app.post('/api/pedidos/batch', async (req, res) => {
  const { pedidos } = req.body;
  if (!Array.isArray(pedidos) || pedidos.length === 0) {
    return res.status(400).json({ error: 'Array de pedidos é obrigatório' });
  }

  let inseridos = 0;
  for (const p of pedidos) {
    const numeroLimpo = parseInt(String(p.numeroPedido || p.numero_pedido || '0').replace(/\D/g, ''), 10) || 0;
    const valorFinal = parseFloat(p.valorTotalFinal || p.valor_total || '0');
    const qtdItens = Array.isArray(p.itens) ? p.itens.length : (p.quantidade_itens || 1);
    const dataEmissaoPg = parseDateForPg(p.data_emissao || p.dataEmissao);

    try {
      await pool.query(
        `INSERT INTO pedidos_venda (
          id, filial_id, numero_pedido, data_emissao, cliente_id, cliente_nome,
          cliente_cpf_cnpj, cliente_cidade, cliente_uf, vendedor_nome,
          natureza_operacao, quantidade_itens, valor_total, status, device_id,
          payload_json, is_deleted, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, FALSE, CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO UPDATE SET
          numero_pedido = EXCLUDED.numero_pedido,
          cliente_nome = EXCLUDED.cliente_nome,
          valor_total = EXCLUDED.valor_total,
          status = EXCLUDED.status,
          quantidade_itens = EXCLUDED.quantidade_itens,
          payload_json = EXCLUDED.payload_json,
          is_deleted = FALSE,
          updated_at = CURRENT_TIMESTAMP`,
        [
          p.id,
          p.filial_id || p.filialDepto || 'fil-matriz-001',
          numeroLimpo,
          dataEmissaoPg,
          p.cliente_id || p.clienteId || null,
          p.cliente_nome || p.clienteNome || 'CLIENTE NÃO INFORMADO',
          p.cliente_cpf_cnpj || p.clienteCnpjCpf || null,
          p.cliente_cidade || p.clienteCidade || 'DOURADOS',
          p.cliente_uf || p.clienteUf || 'MS',
          p.vendedor_nome || p.vendedorNome || 'CARLOS SILVA (INTERNO)',
          p.natureza_operacao || (typeof p.naturezaOperacao === 'object' ? p.naturezaOperacao?.descricao : p.naturezaOperacao) || '5102 - VENDA',
          qtdItens,
          valorFinal,
          p.status || 'APROVADO',
          p.device_id || 'DESKTOP-LOCAL',
          JSON.stringify(p),
        ]
      );
      inseridos++;
    } catch (e) {
      console.warn('[Batch] Erro no item', p.id, e.message);
    }
  }

  broadcastMutation({
    entity: 'pedidos_venda',
    action: 'BATCH_SYNC',
    payload: { total: inseridos },
  });

  res.json({ success: true, processados: pedidos.length, inseridos });
});

// =========================================================================
// 4. ROTAS DE ORDENS DE SERVIÇO (OS)
// =========================================================================

app.get('/api/ordens_servico', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, numero_os, cliente_nome, veiculo_placa, status, valor_total, payload_json, updated_at
       FROM ordens_servico WHERE is_deleted = FALSE ORDER BY updated_at DESC LIMIT 500`
    );
    const lista = result.rows.map((r) => r.payload_json || r);
    if (lista.length > 0) inMemoryOS = lista;
    return res.json(lista.length > 0 ? lista : inMemoryOS);
  } catch (err) {
    return res.json(inMemoryOS);
  }
});

app.post('/api/ordens_servico', async (req, res) => {
  const os = req.body;
  if (!os || !os.id) return res.status(400).json({ error: 'Payload de OS inválido' });

  try {
    await pool.query(
      `INSERT INTO ordens_servico (id, numero_os, cliente_nome, veiculo_placa, status, valor_total, payload_json, is_deleted, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO UPDATE SET
         numero_os = EXCLUDED.numero_os,
         cliente_nome = EXCLUDED.cliente_nome,
         status = EXCLUDED.status,
         valor_total = EXCLUDED.valor_total,
         payload_json = EXCLUDED.payload_json,
         is_deleted = FALSE,
         updated_at = CURRENT_TIMESTAMP`,
      [
        os.id,
        os.numeroOS || os.numero_os || '',
        os.clienteNome || os.cliente_nome || '',
        os.veiculoPlaca || os.veiculo_placa || '',
        os.status || 'EM_ABERTO',
        parseFloat(os.valorTotal || os.valor_total || '0') || 0,
        JSON.stringify(os),
      ]
    );

    inMemoryOS = [os, ...inMemoryOS.filter((item) => item.id !== os.id)];
    broadcastMutation({ entity: 'ordens_servico', action: 'UPSERT', id: os.id, payload: os });
    return res.json({ success: true, os });
  } catch (err) {
    inMemoryOS = [os, ...inMemoryOS.filter((item) => item.id !== os.id)];
    broadcastMutation({ entity: 'ordens_servico', action: 'UPSERT', id: os.id, payload: os });
    return res.json({ success: true, os, fallback: true });
  }
});

app.delete('/api/ordens_servico/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('UPDATE ordens_servico SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);
    inMemoryOS = inMemoryOS.filter((o) => o.id !== id);
    broadcastMutation({ entity: 'ordens_servico', action: 'DELETE', id, payload: { id } });
    return res.json({ success: true, id });
  } catch (err) {
    inMemoryOS = inMemoryOS.filter((o) => o.id !== id);
    broadcastMutation({ entity: 'ordens_servico', action: 'DELETE', id, payload: { id } });
    return res.json({ success: true, id, fallback: true });
  }
});

// =========================================================================
// 5. ROTAS DE FINANCEIRO
// =========================================================================

app.get('/api/financeiro', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, tipo, descricao, pessoa_nome, valor, data_vencimento, status, payload_json, updated_at
       FROM financeiro_titulos WHERE is_deleted = FALSE ORDER BY updated_at DESC LIMIT 1000`
    );
    const lista = result.rows.map((r) => r.payload_json || r);
    if (lista.length > 0) inMemoryFinanceiro = lista;
    return res.json(lista.length > 0 ? lista : inMemoryFinanceiro);
  } catch (err) {
    return res.json(inMemoryFinanceiro);
  }
});

app.post('/api/financeiro', async (req, res) => {
  const tit = req.body;
  if (!tit || !tit.id) return res.status(400).json({ error: 'Payload de financeiro inválido' });

  try {
    await pool.query(
      `INSERT INTO financeiro_titulos (id, tipo, descricao, pessoa_nome, valor, data_vencimento, status, payload_json, is_deleted, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, FALSE, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO UPDATE SET
         descricao = EXCLUDED.descricao,
         pessoa_nome = EXCLUDED.pessoa_nome,
         valor = EXCLUDED.valor,
         status = EXCLUDED.status,
         payload_json = EXCLUDED.payload_json,
         is_deleted = FALSE,
         updated_at = CURRENT_TIMESTAMP`,
      [
        tit.id,
        tit.tipo || 'RECEBER',
        tit.descricao || 'LANÇAMENTO FINANCEIRO',
        tit.pessoaNome || tit.clienteNome || tit.fornecedorNome || '',
        parseFloat(tit.valor || '0') || 0,
        tit.dataVencimento ? parseDateForPg(tit.dataVencimento).split('T')[0] : null,
        tit.status || 'ABERTO',
        JSON.stringify(tit),
      ]
    );

    inMemoryFinanceiro = [tit, ...inMemoryFinanceiro.filter((item) => item.id !== tit.id)];
    broadcastMutation({ entity: 'financeiro', action: 'UPSERT', id: tit.id, payload: tit });
    return res.json({ success: true, titulo: tit });
  } catch (err) {
    inMemoryFinanceiro = [tit, ...inMemoryFinanceiro.filter((item) => item.id !== tit.id)];
    broadcastMutation({ entity: 'financeiro', action: 'UPSERT', id: tit.id, payload: tit });
    return res.json({ success: true, titulo: tit, fallback: true });
  }
});

// =========================================================================
// 6. ROTAS DE TRANSPORTE (VEÍCULOS, MOTORISTAS, CT-E, MDF-E)
// =========================================================================

app.get('/api/transporte', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, tipo_registro, identificador, payload_json, updated_at
       FROM transporte_cadastros WHERE is_deleted = FALSE ORDER BY updated_at DESC LIMIT 1000`
    );
    const lista = result.rows.map((r) => r.payload_json || r);
    if (lista.length > 0) inMemoryTransporte = lista;
    return res.json(lista.length > 0 ? lista : inMemoryTransporte);
  } catch (err) {
    return res.json(inMemoryTransporte);
  }
});

app.post('/api/transporte', async (req, res) => {
  const item = req.body;
  if (!item || !item.id) return res.status(400).json({ error: 'Payload de transporte inválido' });

  try {
    await pool.query(
      `INSERT INTO transporte_cadastros (id, tipo_registro, identificador, payload_json, is_deleted, updated_at)
       VALUES ($1, $2, $3, $4, FALSE, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO UPDATE SET
         tipo_registro = EXCLUDED.tipo_registro,
         identificador = EXCLUDED.identificador,
         payload_json = EXCLUDED.payload_json,
         is_deleted = FALSE,
         updated_at = CURRENT_TIMESTAMP`,
      [
        item.id,
        item.tipo_registro || item.tipoRegistro || 'CADASTRO',
        item.placa || item.cpf || item.numero || item.id,
        JSON.stringify(item),
      ]
    );

    inMemoryTransporte = [item, ...inMemoryTransporte.filter((t) => t.id !== item.id)];
    broadcastMutation({ entity: 'transporte', action: 'UPSERT', id: item.id, payload: item });
    return res.json({ success: true, transporte: item });
  } catch (err) {
    inMemoryTransporte = [item, ...inMemoryTransporte.filter((t) => t.id !== item.id)];
    broadcastMutation({ entity: 'transporte', action: 'UPSERT', id: item.id, payload: item });
    return res.json({ success: true, transporte: item, fallback: true });
  }
});

// =========================================================================
// SERVIR FRONTEND SPA (VITE / REACT)
// =========================================================================
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`[Coliseu ERP Server] Omni-Sync Central ativo na porta ${port} conectado ao Postgres.`);
});
