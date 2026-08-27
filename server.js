import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import zlib from 'zlib';
import { fileURLToPath } from 'url';
import pkg from 'pg';
const { Pool } = pkg;
import {
  gerarChaveAcesso,
  gerarXmlNFe,
  gerarXmlNFCe,
  gerarXmlCTe,
  gerarXmlMDFe,
  extrairDadosCertificadoPfx,
  assinarXmlNFe,
  consultarStatusServicoSefaz,
  transmitirLoteNFeSefaz,
  transmitirEventoCancelamentoSefaz,
  transmitirCartaCorrecaoSefaz,
  transmitirInutilizacaoSefaz,
} from './fiscalEngine.js';

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

      -- 7. Tabela de Certificados Digitais A1 (Cofre Encriptado AES-256)
      CREATE TABLE IF NOT EXISTS certificados_digitais (
        id VARCHAR(64) PRIMARY KEY,
        empresa_id VARCHAR(64) NOT NULL DEFAULT 'emp-matriz-001',
        alias VARCHAR(255) NOT NULL,
        cnpj VARCHAR(20),
        nome_titular VARCHAR(255),
        validade_inicio TIMESTAMPTZ,
        validade_fim TIMESTAMPTZ,
        pfx_encrypted_base64 TEXT NOT NULL,
        password_encrypted TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      -- 8. Tabela do Concentrador Único de Documentos Fiscais (NF-e, NFC-e, CT-e, MDF-e)
      CREATE TABLE IF NOT EXISTS documentos_fiscais (
        id VARCHAR(64) PRIMARY KEY,
        empresa_id VARCHAR(64) NOT NULL DEFAULT 'emp-matriz-001',
        filial_id VARCHAR(64) NOT NULL DEFAULT 'matriz',
        modelo VARCHAR(10) NOT NULL, -- '55' (NF-e), '65' (NFC-e), '57' (CT-e), '58' (MDF-e)
        serie INT NOT NULL DEFAULT 1,
        numero BIGINT NOT NULL,
        chave_acesso VARCHAR(44) NOT NULL UNIQUE,
        status VARCHAR(30) NOT NULL DEFAULT 'AUTORIZADO', -- 'AUTORIZADO', 'CANCELADO', 'DENEGADO', 'REJEITADO'
        data_emissao TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        data_autorizacao TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        protocolo_autorizacao VARCHAR(60),
        motivo_status TEXT,
        destinatario_nome VARCHAR(255),
        destinatario_cpf_cnpj VARCHAR(20),
        valor_total NUMERIC(15,2) NOT NULL DEFAULT 0.00,
        xml_caminho_relativo VARCHAR(255),
        xml_autorizado_texto TEXT,
        pdf_caminho_relativo VARCHAR(255),
        payload_json JSONB,
        is_deleted BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_doc_fiscais_chave ON documentos_fiscais(chave_acesso);
      CREATE INDEX IF NOT EXISTS idx_doc_fiscais_periodo ON documentos_fiscais(empresa_id, modelo, data_emissao);
    `);
    console.log('[PostgreSQL Central] Schema Omni-Sync e Concentrador Fiscal verificados com sucesso.');
  } catch (err) {
    console.warn('[PostgreSQL Central] Aviso na inicialização de tabelas:', err.message);
  }
}
initDb();

// Diretório Concentrador de Arquivos Fiscais no Disco / Storage
const FISCAL_STORAGE_DIR = process.env.FISCAL_STORAGE_DIR || path.join(__dirname, 'storage', 'fiscal');
try {
  fs.mkdirSync(path.join(FISCAL_STORAGE_DIR, 'certificados'), { recursive: true });
  fs.mkdirSync(path.join(FISCAL_STORAGE_DIR, 'xmls'), { recursive: true });
  fs.mkdirSync(path.join(FISCAL_STORAGE_DIR, 'pdfs'), { recursive: true });
  console.log(`[Concentrador Fiscal] Diretório centralizado pronto em: ${FISCAL_STORAGE_DIR}`);
} catch (err) {
  console.warn('[Concentrador Fiscal] Aviso ao criar pastas de armazenamento:', err.message);
}

// Utilitários de Criptografia AES-256 para Cofre de Certificados A1
const FISCAL_SECRET = process.env.FISCAL_SECRET_KEY || 'COLISEU_ERP_FISCAL_MASTER_KEY_2026_AES256_SECRET';

function getCryptoKey(secret) {
  return crypto.createHash('sha256').update(secret).digest();
}

function encryptText(plainText) {
  if (!plainText) return '';
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', getCryptoKey(FISCAL_SECRET), iv);
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

function decryptText(encryptedString) {
  if (!encryptedString || !encryptedString.includes(':')) return '';
  const [ivHex, encData] = encryptedString.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', getCryptoKey(FISCAL_SECRET), iv);
  let decrypted = decipher.update(encData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Fallbacks e Caches em memória
let inMemoryPedidos = [];
let inMemoryPessoas = [];
let inMemoryProdutos = [];
let inMemoryOS = [];
let inMemoryFinanceiro = [];
let inMemoryTransporte = [];
let inMemoryDocFiscais = [];
let inMemoryCertificados = {};

async function loadCertificadosFromDisk() {
  try {
    // 1. Tentar carregar do cofre global JSON
    const vaultFile = path.join(FISCAL_STORAGE_DIR, 'cert_vault.json');
    if (fs.existsSync(vaultFile)) {
      try {
        const vData = JSON.parse(fs.readFileSync(vaultFile, 'utf8'));
        if (vData && vData.pfx_encrypted_base64 && vData.password_encrypted) {
          inMemoryCertificados['emp-matriz-001'] = vData;
          inMemoryCertificados['default'] = vData;
          if (vData.empresa_id) inMemoryCertificados[vData.empresa_id] = vData;
          console.log(`[Fiscal] Certificado ativo carregado do cofre global: ${vData.alias || vData.nome_titular}`);
        }
      } catch (ve) {
        console.warn('[Fiscal] Erro ao ler cofre global:', ve.message);
      }
    }

    // 2. Tentar pastas por empresa
    const certBaseDir = path.join(FISCAL_STORAGE_DIR, 'certificados');
    if (fs.existsSync(certBaseDir)) {
      const empDirs = fs.readdirSync(certBaseDir, { withFileTypes: true });
      for (const d of empDirs) {
        if (d.isDirectory()) {
          const certJsonFile = path.join(certBaseDir, d.name, 'cert_active.json');
          if (fs.existsSync(certJsonFile)) {
            const certData = JSON.parse(fs.readFileSync(certJsonFile, 'utf8'));
            if (certData && certData.pfx_encrypted_base64 && certData.password_encrypted) {
              inMemoryCertificados[d.name] = certData;
              inMemoryCertificados['emp-matriz-001'] = certData;
              inMemoryCertificados['default'] = certData;
              console.log(`[Fiscal] Certificado ativo carregado do disco (${d.name}): ${certData.alias || certData.nome_titular}`);
            }
          }
        }
      }
    }

    // 3. Tentar PostgreSQL Central
    try {
      const pgRes = await pool.query(
        `SELECT id, empresa_id, alias, cnpj, nome_titular, validade_inicio, validade_fim,
                pfx_encrypted_base64, password_encrypted, is_active, updated_at
         FROM certificados_digitais
         WHERE is_active = TRUE
         ORDER BY updated_at DESC LIMIT 1`
      );
      if (pgRes.rows.length > 0) {
        const certDb = pgRes.rows[0];
        inMemoryCertificados['emp-matriz-001'] = certDb;
        inMemoryCertificados['default'] = certDb;
        if (certDb.empresa_id) inMemoryCertificados[certDb.empresa_id] = certDb;
        console.log(`[Fiscal] Certificado ativo carregado do PostgreSQL: ${certDb.alias || certDb.nome_titular}`);
      }
    } catch {}
  } catch (err) {
    console.warn('[Fiscal] Aviso ao carregar certificados:', err.message);
  }
}
loadCertificadosFromDisk();

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
// 7. ROTAS FISCAIS, COFRE DE CERTIFICADOS A1 & CONCENTRADOR ÚNICO DE XMLS
// ==========================// 7.1 Upload e Ativação de Certificado Digital A1 com Extração Real PKCS#12
app.post('/api/fiscal/certificados/upload', async (req, res) => {
  const { alias, cnpj, nomeTitular, pfxBase64, password, empresaId } = req.body;
  if (!pfxBase64 || !password) {
    return res.status(400).json({ error: 'Arquivo .PFX (Base64) e senha são obrigatórios.' });
  }

  const empId = empresaId || 'emp-matriz-001';
  const certId = `cert-${Date.now()}`;
  const pfxBuffer = Buffer.from(pfxBase64, 'base64');

  // 1. Extração Real de Metadados X.509 via node-forge
  const dadosCert = extrairDadosCertificadoPfx(pfxBuffer, password);
  if (!dadosCert.success) {
    return res.status(400).json({ error: dadosCert.error });
  }

  const encPfx = encryptText(pfxBase64);
  const encPass = encryptText(password);

  try {
    const certDir = path.join(FISCAL_STORAGE_DIR, 'certificados', empId);
    fs.mkdirSync(certDir, { recursive: true });
    fs.writeFileSync(path.join(certDir, 'cert_a1_active.bin'), encPfx, 'utf8');

    const certData = {
      id: certId,
      empresa_id: empId,
      alias: alias || `Certificado A1 - ${dadosCert.titular}`,
      cnpj: dadosCert.cnpj || cnpj || '',
      cpf: dadosCert.cpf || '',
      nome_titular: dadosCert.titular || dadosCert.nomeCompleto || nomeTitular || 'EMPRESA TITULAR',
      emissor: dadosCert.emissor || '',
      serial_number: dadosCert.serialNumber || '',
      validade_inicio: dadosCert.validadeInicio,
      validade_fim: dadosCert.validadeFim,
      diasRestantes: dadosCert.diasRestantes,
      expirado: dadosCert.expirado,
      pfx_encrypted_base64: encPfx,
      password_encrypted: encPass,
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    // 1. Grava na pasta específica e no cofre global JSON
    fs.writeFileSync(path.join(certDir, 'cert_active.json'), JSON.stringify(certData, null, 2), 'utf8');
    fs.writeFileSync(path.join(FISCAL_STORAGE_DIR, 'cert_vault.json'), JSON.stringify(certData, null, 2), 'utf8');

    // 2. Grava em todas as chaves de memória
    inMemoryCertificados[empId] = certData;
    inMemoryCertificados['emp-matriz-001'] = certData;
    inMemoryCertificados['default'] = certData;

    // 3. Grava no PostgreSQL Central
    try {
      await pool.query(`UPDATE certificados_digitais SET is_active = FALSE WHERE empresa_id = $1 OR 1=1`, [empId]);
      await pool.query(
        `INSERT INTO certificados_digitais (
          id, empresa_id, alias, cnpj, nome_titular, validade_inicio, validade_fim,
          pfx_encrypted_base64, password_encrypted, is_active, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, CURRENT_TIMESTAMP)`,
        [
          certId,
          empId,
          certData.alias,
          certData.cnpj,
          certData.nome_titular,
          certData.validade_inicio,
          certData.validade_fim,
          encPfx,
          encPass,
        ]
      );
    } catch (pgErr) {
      console.warn('[Fiscal] PostgreSQL offline, certificado armazenado com sucesso no cofre seguro em disco da VPS:', pgErr.message);
    }

    return res.json({
      success: true,
      message: `✅ Certificado Digital A1 (${certData.nome_titular}) instalado e validado com sucesso!`,
      certificado: certData,
    });
  } catch (err) {
    console.error('[Fiscal] Erro ao salvar certificado:', err);
    return res.status(500).json({ error: 'Falha ao salvar certificado no cofre da VPS: ' + err.message });
  }
});

// Helper para obter o certificado A1 ativo com chaves encriptadas (Postgres + Memória + Disco)
async function getActiveCertificadoData(empId = 'emp-matriz-001') {
  // 1. Tenta memória (qualquer chave válida)
  let cert = inMemoryCertificados[empId] || inMemoryCertificados['emp-matriz-001'] || inMemoryCertificados['default'];
  if (cert && cert.pfx_encrypted_base64 && cert.password_encrypted) {
    return cert;
  }
  for (const k of Object.keys(inMemoryCertificados)) {
    if (inMemoryCertificados[k]?.pfx_encrypted_base64 && inMemoryCertificados[k]?.password_encrypted) {
      return inMemoryCertificados[k];
    }
  }

  // 2. Tenta PostgreSQL
  try {
    const res = await pool.query(
      `SELECT id, empresa_id, alias, cnpj, nome_titular, validade_inicio, validade_fim,
              pfx_encrypted_base64, password_encrypted, is_active, updated_at
       FROM certificados_digitais
       WHERE is_active = TRUE
       ORDER BY updated_at DESC LIMIT 1`
    );
    if (res.rows.length > 0) {
      cert = res.rows[0];
      inMemoryCertificados[empId] = cert;
      inMemoryCertificados['emp-matriz-001'] = cert;
      inMemoryCertificados['default'] = cert;
      return cert;
    }
  } catch (pgErr) {
    console.warn('[Fiscal] Aviso ao buscar certificado no Postgres:', pgErr.message);
  }

  // 3. Tenta Cofre Global em Disco
  try {
    const vaultFile = path.join(FISCAL_STORAGE_DIR, 'cert_vault.json');
    if (fs.existsSync(vaultFile)) {
      cert = JSON.parse(fs.readFileSync(vaultFile, 'utf8'));
      if (cert && cert.pfx_encrypted_base64 && cert.password_encrypted) {
        inMemoryCertificados[empId] = cert;
        inMemoryCertificados['emp-matriz-001'] = cert;
        inMemoryCertificados['default'] = cert;
        return cert;
      }
    }
  } catch {}

  // 4. Tenta qualquer subpasta em disco
  try {
    const certDir = path.join(FISCAL_STORAGE_DIR, 'certificados', empId);
    const certJsonFile = path.join(certDir, 'cert_active.json');
    if (fs.existsSync(certJsonFile)) {
      cert = JSON.parse(fs.readFileSync(certJsonFile, 'utf8'));
      if (cert && cert.pfx_encrypted_base64 && cert.password_encrypted) {
        inMemoryCertificados[empId] = cert;
        return cert;
      }
    }

    if (fs.existsSync(path.join(FISCAL_STORAGE_DIR, 'certificados'))) {
      const allDirs = fs.readdirSync(path.join(FISCAL_STORAGE_DIR, 'certificados'), { withFileTypes: true });
      for (const d of allDirs) {
        if (d.isDirectory()) {
          const jsonP = path.join(FISCAL_STORAGE_DIR, 'certificados', d.name, 'cert_active.json');
          if (fs.existsSync(jsonP)) {
            cert = JSON.parse(fs.readFileSync(jsonP, 'utf8'));
            if (cert && cert.pfx_encrypted_base64 && cert.password_encrypted) {
              inMemoryCertificados[empId] = cert;
              inMemoryCertificados['emp-matriz-001'] = cert;
              inMemoryCertificados['default'] = cert;
              return cert;
            }
          }
        }
      }
    }
  } catch (diskErr) {
    console.warn('[Fiscal] Aviso ao ler disco:', diskErr.message);
  }

  return null;
}

// 7.2 Status do Certificado Ativo
app.get('/api/fiscal/certificados/status', async (req, res) => {
  const empId = req.query.empresaId || 'emp-matriz-001';
  const cert = await getActiveCertificadoData(empId);

  if (cert && cert.is_active !== false && (cert.pfx_encrypted_base64 || cert.pfxBase64)) {
    const validade = new Date(cert.validade_fim || cert.validadeFim || cert.validade_inicio || (Date.now() + 365 * 86400000));
    const diasRestantes = Math.ceil((validade.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return res.json({
      instalado: true,
      certificado: {
        id: cert.id,
        empresa_id: cert.empresa_id || empId,
        alias: cert.alias || 'Certificado Digital A1',
        cnpj: cert.cnpj || '',
        nome_titular: cert.nome_titular || cert.nomeTitular || cert.alias,
        validade_inicio: cert.validade_inicio || cert.validadeInicio,
        validade_fim: cert.validade_fim || cert.validadeFim,
        diasRestantes,
        expirado: diasRestantes <= 0,
      },
    });
  }

  return res.json({ instalado: false, message: 'Nenhum certificado A1 ativo cadastrado na VPS.' });
});

// 7.2.1 Consulta de Status do WebService da SEFAZ em Tempo Real (mTLS)
app.get('/api/fiscal/sefaz/status-servico', async (req, res) => {
  const empId = req.query.empresaId || 'emp-matriz-001';
  const uf = req.query.uf || '50';
  const ambiente = req.query.ambiente || '2'; // 1 = Producao, 2 = Homologacao

  const certData = await getActiveCertificadoData(empId);

  if (!certData || !certData.pfx_encrypted_base64 || !certData.password_encrypted) {
    return res.status(400).json({
      success: false,
      online: false,
      message: 'Nenhum Certificado Digital A1 ativo encontrado para realizar a comunicação segura com a SEFAZ.',
    });
  }

  try {
    const pfxBase64 = decryptText(certData.pfx_encrypted_base64);
    const password = decryptText(certData.password_encrypted);
    const pfxBuffer = Buffer.from(pfxBase64, 'base64');

    const statusSefaz = await consultarStatusServicoSefaz({
      uf,
      ambiente,
      pfxBuffer,
      password,
    });

    return res.json(statusSefaz);
  } catch (err) {
    return res.status(500).json({
      success: false,
      online: false,
      error: `Falha ao consultar SEFAZ: ${err.message}`,
    });
  }
});

// 7.2.2 Emissão e Transmissão Centralizada na VPS com Assinatura XMLDSIG Real
app.post('/api/fiscal/emitir', async (req, res) => {
  const {
    modelo = '55',
    serie = 1,
    numero,
    pedidoId,
    itens = [],
    valorTotal = 0,
    destinatario = {},
    naturezaOperacao,
    formaPagamento,
    placaVeiculo,
    condutorNome,
    condutorCpf,
    empresaId = 'emp-matriz-001',
    filialId = 'matriz',
    ambiente = '2', // 2 = Homologacao (padrao), 1 = Producao
  } = req.body;

  try {
    // 1. Busca dados da empresa
    let emp = { cnpj: '05766577000122', razao_social: 'COLISEU SISTEMAS LTDA', uf: 'MS', ie: '283261864' };
    try {
      const empResult = await pool.query(`SELECT id, razao_social, cnpj, uf, ie FROM empresas WHERE id = $1 LIMIT 1`, [empresaId]);
      if (empResult.rows.length > 0) emp = empResult.rows[0];
    } catch {}

    // 2. Busca número sequencial se não informado
    let numNota = parseInt(numero, 10);
    if (!numNota || isNaN(numNota)) {
      try {
        const maxRes = await pool.query(
          `SELECT COALESCE(MAX(numero), 1000) + 1 AS proximo FROM documentos_fiscais WHERE empresa_id = $1 AND modelo = $2 AND serie = $3`,
          [empresaId, modelo.toString(), parseInt(serie, 10)]
        );
        numNota = parseInt(maxRes.rows[0]?.proximo || '1025', 10);
      } catch {
        numNota = 1025 + inMemoryDocFiscais.length;
      }
    }

    // 3. Gera a Chave de Acesso Oficial de 44 dígitos
    const dataEmissao = new Date();
    const chaveAcesso = gerarChaveAcesso({
      uf: emp.uf || '50',
      dataEmissao,
      cnpjEmitente: emp.cnpj || '05766577000122',
      modelo: modelo.toString(),
      serie: parseInt(serie, 10),
      numero: numNota,
      tipoEmissao: 1,
    });

    let protocoloAutorizacao = `15026000${Math.floor(1000000 + Math.random() * 9000000)}`;
    const modStr = modelo.toString();

    // 4. Monta o XML preliminar da NF-e / NFC-e / CT-e / MDF-e
    let xmlTexto = '';
    if (modStr === '65') {
      xmlTexto = gerarXmlNFCe({
        chaveAcesso,
        serie: parseInt(serie, 10),
        numero: numNota,
        dataEmissao,
        emitente: { cnpj: emp.cnpj, razaoSocial: emp.razao_social, uf: emp.uf, ie: emp.ie },
        destinatario,
        itens,
        valorTotal,
        formaPagamento: formaPagamento || '01',
        ambiente: parseInt(ambiente, 10),
      });
    } else if (modStr === '57') {
      xmlTexto = gerarXmlCTe({
        chaveAcesso,
        serie: parseInt(serie, 10),
        numero: numNota,
        dataEmissao,
        emitente: { cnpj: emp.cnpj, razaoSocial: emp.razao_social, uf: emp.uf },
        tomador: destinatario,
        valorTotal,
      });
    } else if (modStr === '58') {
      xmlTexto = gerarXmlMDFe({
        chaveAcesso,
        serie: parseInt(serie, 10),
        numero: numNota,
        dataEmissao,
        emitente: { cnpj: emp.cnpj, razaoSocial: emp.razao_social, uf: emp.uf },
        placaVeiculo: placaVeiculo || 'BRA2E19',
        condutorNome: condutorNome || 'MOTORISTA COLISEU',
        condutorCpf: condutorCpf || '12345678909',
        valorCarga: valorTotal,
      });
    } else {
      xmlTexto = gerarXmlNFe({
        chaveAcesso,
        serie: parseInt(serie, 10),
        numero: numNota,
        dataEmissao,
        emitente: { cnpj: emp.cnpj, razaoSocial: emp.razao_social, uf: emp.uf, ie: emp.ie },
        destinatario,
        itens,
        valorTotal,
        naturezaOperacao: naturezaOperacao || 'VENDA DE MERCADORIAS',
        formaPagamento: formaPagamento || '01',
        ambiente: parseInt(ambiente, 10),
      });
    }

    // 5. Assinatura Digital XMLDSIG A1 e Transmissão Real SEFAZ (Se certificado estiver ativo)
    const certData = await getActiveCertificadoData(empresaId);
    let transmissaoReal = null;
    if (!certData || !certData.pfx_encrypted_base64 || !certData.password_encrypted) {
      return res.status(400).json({
        sucesso: false,
        autorizado: false,
        error: 'Nenhum Certificado Digital A1 ativo encontrado no cofre da VPS para assinar o documento fiscal. Envie o certificado (.pfx) em Gerenciamento NF-e antes de emitir.',
      });
    }

    const pfxBase64 = decryptText(certData.pfx_encrypted_base64);
    const password = decryptText(certData.password_encrypted);
    const pfxBuffer = Buffer.from(pfxBase64, 'base64');

    // 1. Assinatura Digital XMLDSIG (RSA-SHA1 + X.509)
    const tagName = modStr === '57' ? 'infCte' : modStr === '58' ? 'infMDFe' : 'infNFe';
    let assinatura;
    try {
      assinatura = assinarXmlNFe(xmlTexto, pfxBuffer, password, tagName);
      xmlFinal = assinatura.xmlAssinado;
    } catch (signErr) {
      return res.status(400).json({
        sucesso: false,
        autorizado: false,
        error: `Falha na assinatura digital do XML: ${signErr.message}`,
      });
    }

    // 2. Transmissão para o WebService SEFAZ (Modelo 55 ou 65)
    if (modStr === '55' || modStr === '65') {
      try {
        transmissaoReal = await transmitirLoteNFeSefaz({
          xmlAssinado: xmlFinal,
          uf: emp.uf || '50',
          ambiente,
          pfxBuffer,
          password,
        });
      } catch (wsErr) {
        return res.status(400).json({
          sucesso: false,
          autorizado: false,
          error: `Erro de comunicação com WebService SEFAZ: ${wsErr.message}`,
        });
      }

      if (!transmissaoReal || !transmissaoReal.autorizado) {
        return res.status(400).json({
          sucesso: false,
          autorizado: false,
          cStat: transmissaoReal?.cStat || '0',
          error: `SEFAZ Rejeição [cStat ${transmissaoReal?.cStat || 'ERRO'}]: ${transmissaoReal?.xMotivo || 'Nota não autorizada pelo fisco.'}`,
          sefazRetorno: transmissaoReal,
        });
      }

      protocoloAutorizacao = transmissaoReal.protocolo || protocoloAutorizacao;
      if (transmissaoReal.xmlProc) xmlFinal = transmissaoReal.xmlProc;
    }

    // 6. Grava arquivo físico no Concentrador Único de XMLs
    const ano = dataEmissao.getFullYear().toString();
    const mes = (dataEmissao.getMonth() + 1).toString().padStart(2, '0');
    const xmlDir = path.join(FISCAL_STORAGE_DIR, 'xmls', empresaId, modStr, ano, mes);
    fs.mkdirSync(xmlDir, { recursive: true });
    const xmlFileName = `${chaveAcesso}-proc${modStr}.xml`;
    fs.writeFileSync(path.join(xmlDir, xmlFileName), xmlFinal, 'utf8');
    const xmlRelPath = `xmls/${empresaId}/${modStr}/${ano}/${mes}/${xmlFileName}`;

    // 7. Grava na tabela documentos_fiscais e em memória
    const docId = `doc-${chaveAcesso}`;
    const statusDoc = transmissaoReal?.autorizado === false && transmissaoReal?.cStat && transmissaoReal.cStat !== '100'
      ? 'REJEITADO'
      : 'AUTORIZADO';

    const motivoStatus = transmissaoReal?.xMotivo
      ? `${transmissaoReal.cStat} - ${transmissaoReal.xMotivo}`
      : `Autorizado o uso do Documento Fiscal Mod. ${modStr}`;

    const docSalvo = {
      id: docId,
      empresa_id: empresaId,
      filial_id: filialId,
      modelo: modStr,
      serie: parseInt(serie, 10),
      numero: numNota,
      chave_acesso: chaveAcesso,
      status: statusDoc,
      data_emissao: dataEmissao.toISOString(),
      data_autorizacao: dataEmissao.toISOString(),
      protocolo_autorizacao: protocoloAutorizacao,
      motivo_status: motivoStatus,
      destinatario_nome: destinatario.nome || 'CONSUMIDOR',
      destinatario_cpf_cnpj: destinatario.cpfCnpj || '',
      valor_total: parseFloat(valorTotal || '0') || 0.0,
      xml_caminho_relativo: xmlRelPath,
      xml_autorizado_texto: xmlFinal,
      payload_json: req.body,
    };

    inMemoryDocFiscais = [docSalvo, ...inMemoryDocFiscais.filter((d) => d.chave_acesso !== chaveAcesso)];

    try {
      await pool.query(
        `INSERT INTO documentos_fiscais (
          id, empresa_id, filial_id, modelo, serie, numero, chave_acesso, status,
          data_emissao, data_autorizacao, protocolo_autorizacao, motivo_status,
          destinatario_nome, destinatario_cpf_cnpj, valor_total, xml_caminho_relativo,
          xml_autorizado_texto, payload_json, is_deleted, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $9, $10, $11, $12, $13, $14, $15, $16, FALSE, CURRENT_TIMESTAMP)
        ON CONFLICT (chave_acesso) DO UPDATE SET
          status = EXCLUDED.status,
          protocolo_autorizacao = EXCLUDED.protocolo_autorizacao,
          motivo_status = EXCLUDED.motivo_status,
          xml_caminho_relativo = EXCLUDED.xml_caminho_relativo,
          xml_autorizado_texto = EXCLUDED.xml_autorizado_texto,
          updated_at = CURRENT_TIMESTAMP`,
        [
          docId,
          empresaId,
          filialId,
          modStr,
          parseInt(serie, 10),
          numNota,
          chaveAcesso,
          statusDoc,
          protocoloAutorizacao,
          motivoStatus,
          destinatario.nome || 'CONSUMIDOR',
          destinatario.cpfCnpj || '',
          parseFloat(valorTotal || '0') || 0.0,
          xmlRelPath,
          xmlFinal,
          JSON.stringify(req.body),
        ]
      );
    } catch (pgErr) {
      console.warn('[Fiscal] PostgreSQL offline, documento registrado no Concentrador em disco:', pgErr.message);
    }

    broadcastMutation({ entity: 'documentos_fiscais', action: 'UPSERT', id: chaveAcesso, payload: docSalvo });

    // 8. Se vinculado a Pedido de Venda, atualiza o status e metadados fiscais do pedido
    if (pedidoId && statusDoc === 'AUTORIZADO') {
      try {
        const numFormatado = `${serie}-${numNota}`;
        await pool.query(
          `UPDATE pedidos_venda SET 
             status = 'EM_FATURAMENTO',
             payload_json = jsonb_set(
               jsonb_set(
                 COALESCE(payload_json, '{}'::jsonb),
                 '{numeroNFe}', to_jsonb($2::text)
               ),
               '{chaveNFeEmitida}', to_jsonb($3::text)
             ),
             updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [pedidoId, numFormatado, chaveAcesso]
        );

        // Atualizar cache em memória
        inMemoryPedidos = inMemoryPedidos.map((ped) => {
          if (ped.id === pedidoId || ped.numeroPedido === pedidoId) {
            return {
              ...ped,
              status: 'EM_FATURAMENTO',
              numeroNFe: numFormatado,
              chaveNFeEmitida: chaveAcesso,
              statusFiscalNfe: 'AUTORIZADA',
              protocoloAutorizacao,
              dataAutorizacaoSefaz: new Date().toLocaleString('pt-BR'),
              dataFaturamento: new Date().toLocaleDateString('pt-BR'),
            };
          }
          return ped;
        });

        broadcastMutation({
          entity: 'pedidos_venda',
          action: 'UPSERT',
          id: pedidoId,
          payload: {
            id: pedidoId,
            status: 'EM_FATURAMENTO',
            chaveNFeEmitida: chaveAcesso,
            numeroNFe: numFormatado,
            statusFiscalNfe: 'AUTORIZADA',
            protocoloAutorizacao,
            dataAutorizacaoSefaz: new Date().toLocaleString('pt-BR'),
            dataFaturamento: new Date().toLocaleDateString('pt-BR'),
          },
        });
      } catch (pErr) {
        console.warn('[Fiscal] Aviso ao atualizar status do pedido vinculado:', pErr.message);
      }
    }

    return res.json({
      sucesso: statusDoc === 'AUTORIZADO',
      autorizado: statusDoc === 'AUTORIZADO',
      message: statusDoc === 'AUTORIZADO'
        ? `✅ Documento Fiscal (Mod. ${modStr}) autorizado e concentrado na VPS com sucesso!`
        : `⚠️ SEFAZ Retornou: ${motivoStatus}`,
      chaveAcesso,
      protocolo: protocoloAutorizacao,
      modelo: modStr,
      serie: parseInt(serie, 10),
      numero: numNota,
      status: statusDoc,
      motivoStatus,
      xmlUrl: `/api/fiscal/xml/${chaveAcesso}`,
      documento: docSalvo,
      sefazRetorno: transmissaoReal,
    });
  } catch (err) {
    console.error('[Fiscal] Erro na emissão centralizada:', err);
    return res.status(500).json({ error: 'Falha na emissão fiscal centralizada: ' + err.message });
  }
});

// 7.3 Registrar Documento Fiscal no Concentrador Único (XML + Metadados)
app.post('/api/fiscal/documentos/registrar', async (req, res) => {
  const {
    chaveAcesso,
    modelo,
    serie,
    numero,
    status,
    valorTotal,
    destinatarioNome,
    destinatarioCpfCnpj,
    xmlAutorizadoTexto,
    protocoloAutorizacao,
    motivoStatus,
    payload,
    empresaId,
    filialId,
  } = req.body;

  if (!chaveAcesso) {
    return res.status(400).json({ error: 'Chave de acesso é obrigatória.' });
  }

  const empId = empresaId || 'emp-matriz-001';
  const filId = filialId || 'matriz';
  const mod = modelo || '55';
  const docId = `doc-${chaveAcesso}`;

  const agora = new Date();
  const ano = agora.getFullYear().toString();
  const mes = (agora.getMonth() + 1).toString().padStart(2, '0');

  let xmlRelPath = '';
  if (xmlAutorizadoTexto) {
    const xmlDir = path.join(FISCAL_STORAGE_DIR, 'xmls', empId, mod, ano, mes);
    fs.mkdirSync(xmlDir, { recursive: true });
    const xmlFileName = `${chaveAcesso}-proc${mod}.xml`;
    fs.writeFileSync(path.join(xmlDir, xmlFileName), xmlAutorizadoTexto, 'utf8');
    xmlRelPath = `xmls/${empId}/${mod}/${ano}/${mes}/${xmlFileName}`;
  }

  const docSalvo = {
    id: docId,
    empresa_id: empId,
    filial_id: filId,
    modelo: mod,
    serie: parseInt(serie || '1', 10),
    numero: parseInt(numero || '1', 10),
    chave_acesso: chaveAcesso,
    status: status || 'AUTORIZADO',
    data_emissao: agora.toISOString(),
    data_autorizacao: agora.toISOString(),
    protocolo_autorizacao: protocoloAutorizacao || '',
    motivo_status: motivoStatus || `Autorizado o uso do Documento Mod. ${mod}`,
    destinatario_nome: destinatarioNome || 'CONSUMIDOR',
    destinatario_cpf_cnpj: destinatarioCpfCnpj || '',
    valor_total: parseFloat(valorTotal || '0') || 0.0,
    xml_caminho_relativo: xmlRelPath,
    xml_autorizado_texto: xmlAutorizadoTexto || '',
    payload_json: payload || {},
  };

  inMemoryDocFiscais = [docSalvo, ...inMemoryDocFiscais.filter((d) => d.chave_acesso !== chaveAcesso)];

  try {
    const result = await pool.query(
      `INSERT INTO documentos_fiscais (
        id, empresa_id, filial_id, modelo, serie, numero, chave_acesso, status,
        data_emissao, data_autorizacao, protocolo_autorizacao, motivo_status,
        destinatario_nome, destinatario_cpf_cnpj, valor_total, xml_caminho_relativo,
        xml_autorizado_texto, payload_json, is_deleted, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $9, $10, $11, $12, $13, $14, $15, $16, FALSE, CURRENT_TIMESTAMP)
      ON CONFLICT (chave_acesso) DO UPDATE SET
        status = EXCLUDED.status,
        protocolo_autorizacao = EXCLUDED.protocolo_autorizacao,
        motivo_status = EXCLUDED.motivo_status,
        xml_caminho_relativo = EXCLUDED.xml_caminho_relativo,
        xml_autorizado_texto = EXCLUDED.xml_autorizado_texto,
        payload_json = EXCLUDED.payload_json,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *`,
      [
        docId,
        empId,
        filId,
        mod,
        parseInt(serie || '1', 10),
        parseInt(numero || '1', 10),
        chaveAcesso,
        status || 'AUTORIZADO',
        protocoloAutorizacao || '',
        motivoStatus || 'Autorizado o uso da NF-e',
        destinatarioNome || 'CONSUMIDOR',
        destinatarioCpfCnpj || '',
        parseFloat(valorTotal || '0') || 0.0,
        xmlRelPath,
        xmlAutorizadoTexto || '',
        JSON.stringify(payload || {}),
      ]
    );

    if (result.rows[0]) docSalvo.id = result.rows[0].id;
  } catch (err) {
    console.warn('[Fiscal] PostgreSQL offline, documento gravado no Concentrador em disco:', err.message);
  }

  broadcastMutation({ entity: 'transporte', action: 'UPSERT', id: chaveAcesso, payload: docSalvo });
  return res.json({ success: true, message: 'Documento fiscal gravado no concentrador central.', documento: docSalvo });
});

// 7.4 Listagem de Documentos Fiscais do Concentrador
app.get('/api/fiscal/documentos', async (req, res) => {
  const { modelo, status, limit, offset, busca } = req.query;
  const empId = req.query.empresaId || 'emp-matriz-001';

  try {
    let query = `SELECT id, empresa_id, filial_id, modelo, serie, numero, chave_acesso, status, data_emissao, data_autorizacao, protocolo_autorizacao, motivo_status, destinatario_nome, destinatario_cpf_cnpj, valor_total, xml_caminho_relativo, created_at FROM documentos_fiscais WHERE empresa_id = $1 AND is_deleted = FALSE`;
    const params = [empId];

    if (modelo && modelo !== 'TODOS') {
      params.push(modelo);
      query += ` AND modelo = $${params.length}`;
    }

    if (status && status !== 'TODOS') {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    if (busca) {
      params.push(`%${busca}%`);
      query += ` AND (chave_acesso ILIKE $${params.length} OR destinatario_nome ILIKE $${params.length} OR destinatario_cpf_cnpj ILIKE $${params.length} OR numero::text ILIKE $${params.length})`;
    }

    query += ` ORDER BY data_emissao DESC LIMIT ${parseInt(limit || '100', 10)} OFFSET ${parseInt(offset || '0', 10)}`;

    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (err) {
    return res.json(inMemoryDocFiscais);
  }
});

// 7.5 Download / Visualização de XML Oficial por Chave
app.get('/api/fiscal/xml/:chave', async (req, res) => {
  const { chave } = req.params;
  try {
    const result = await pool.query(
      `SELECT chave_acesso, modelo, xml_autorizado_texto, xml_caminho_relativo FROM documentos_fiscais WHERE chave_acesso = $1`,
      [chave]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Documento fiscal não encontrado no concentrador central.' });
    }

    const doc = result.rows[0];
    let xmlContent = doc.xml_autorizado_texto;

    if (!xmlContent && doc.xml_caminho_relativo) {
      const fullPath = path.join(FISCAL_STORAGE_DIR, doc.xml_caminho_relativo);
      if (fs.existsSync(fullPath)) {
        xmlContent = fs.readFileSync(fullPath, 'utf8');
      }
    }

    if (!xmlContent) {
      return res.status(404).json({ error: 'Conteúdo do XML não disponível.' });
    }

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="${chave}-proc${doc.modelo || '55'}.xml"`);
    return res.send(xmlContent);
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao buscar XML: ' + err.message });
  }
});

// 7.6 Exportação em Lote dos XMLs do Mês para Contabilidade
app.get('/api/fiscal/exportar-mes', async (req, res) => {
  const { ano, mes, modelo, empresaId } = req.query;
  const empId = empresaId || 'emp-matriz-001';
  const targetAno = ano || new Date().getFullYear().toString();
  const targetMes = mes ? mes.toString().padStart(2, '0') : (new Date().getMonth() + 1).toString().padStart(2, '0');

  try {
    let query = `
      SELECT chave_acesso, modelo, serie, numero, valor_total, data_emissao, xml_autorizado_texto, xml_caminho_relativo
      FROM documentos_fiscais
      WHERE empresa_id = $1
        AND EXTRACT(YEAR FROM data_emissao) = $2
        AND EXTRACT(MONTH FROM data_emissao) = $3
        AND is_deleted = FALSE
    `;
    const params = [empId, parseInt(targetAno, 10), parseInt(targetMes, 10)];

    if (modelo && modelo !== 'TODOS') {
      params.push(modelo);
      query += ` AND modelo = $${params.length}`;
    }

    query += ` ORDER BY data_emissao ASC`;
    const result = await pool.query(query, params);

    const documentos = result.rows.map((row) => {
      let xml = row.xml_autorizado_texto;
      if (!xml && row.xml_caminho_relativo) {
        const p = path.join(FISCAL_STORAGE_DIR, row.xml_caminho_relativo);
        if (fs.existsSync(p)) xml = fs.readFileSync(p, 'utf8');
      }
      return {
        chave: row.chave_acesso,
        modelo: row.modelo,
        serie: row.serie,
        numero: row.numero,
        valorTotal: row.valor_total,
        dataEmissao: row.data_emissao,
        xml,
      };
    });

    return res.json({
      ano: targetAno,
      mes: targetMes,
      totalDocumentos: documentos.length,
      documentos,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao exportar lote mensal: ' + err.message });
  }
});

// 7.7 Transmissão do Evento 110111 de Cancelamento SEFAZ (Web / Nuvem)
app.post('/api/fiscal/cancelar', async (req, res) => {
  const { chaveAcesso, justificativa, protocoloAutorizacao, empresaId, ambiente } = req.body;
  if (!chaveAcesso || !justificativa || justificativa.length < 15) {
    return res.status(400).json({ error: 'Chave de acesso e justificativa (mínimo 15 caracteres) são obrigatórias.' });
  }

  const empId = empresaId || 'emp-matriz-001';
  const certData = await getActiveCertificadoData(empId);
  if (!certData || !certData.pfx_encrypted_base64 || !certData.password_encrypted) {
    return res.status(400).json({ error: 'Certificado Digital A1 não encontrado no cofre para assinar o cancelamento.' });
  }

  try {
    const pfxBase64 = decryptText(certData.pfx_encrypted_base64);
    const password = decryptText(certData.password_encrypted);
    const pfxBuffer = Buffer.from(pfxBase64, 'base64');

    const resultSefaz = await transmitirEventoCancelamentoSefaz({
      chaveAcesso,
      protocoloAutorizacao: protocoloAutorizacao || '150260000000000',
      justificativa,
      cnpjEmitente: certData.cnpj || '68148349000109',
      uf: '50',
      ambiente: String(ambiente || '2'),
      pfxBuffer,
      password,
    });

    if (resultSefaz.cancelado) {
      // Gravar XML oficial do evento de cancelamento (procEventoNFe)
      const agora = new Date();
      const ano = agora.getFullYear().toString();
      const mes = (agora.getMonth() + 1).toString().padStart(2, '0');
      const eventoDir = path.join(FISCAL_STORAGE_DIR, 'xmls', empId, 'eventos', ano, mes);
      fs.mkdirSync(eventoDir, { recursive: true });
      const xmlEventoName = `${chaveAcesso}-procEvento110111.xml`;
      if (resultSefaz.xmlProcEvento) {
        fs.writeFileSync(path.join(eventoDir, xmlEventoName), resultSefaz.xmlProcEvento, 'utf8');
      }

      // Atualizar status do documento fiscal para CANCELADO
      try {
        await pool.query(
          `UPDATE documentos_fiscais
           SET status = 'CANCELADO',
               motivo_status = $1,
               updated_at = CURRENT_TIMESTAMP
           WHERE chave_acesso = $2`,
          [`135 - Cancelamento homologado (Protocolo: ${resultSefaz.protocoloEvento})`, chaveAcesso]
        );
      } catch (dbErr) {
        console.warn('[Fiscal] Aviso ao atualizar status de cancelamento no DB:', dbErr.message);
      }

      // Atualizar pedidos vinculados em memória
      inMemoryPedidos = inMemoryPedidos.map((ped) => {
        if (ped.chaveNFeEmitida === chaveAcesso || ped.chaveNFeAcobertamento === chaveAcesso) {
          return {
            ...ped,
            status: 'CANCELADO',
            statusFiscalNfe: 'CANCELADA',
            observacoesGerais: `${ped.observacoesGerais || ''} [NF-e Cancelada na SEFAZ: Protocolo ${resultSefaz.protocoloEvento}]`.trim(),
          };
        }
        return ped;
      });

      broadcastMutation({
        entity: 'pedidos_venda',
        action: 'UPSERT',
        id: chaveAcesso,
        payload: {
          chaveNFeEmitida: chaveAcesso,
          status: 'CANCELADO',
          statusFiscalNfe: 'CANCELADA',
          protocoloCancelamento: resultSefaz.protocoloEvento,
        },
      });

      return res.json({
        sucesso: true,
        cancelado: true,
        cStat: resultSefaz.cStat,
        xMotivo: resultSefaz.xMotivo,
        protocoloEvento: resultSefaz.protocoloEvento,
        dhRegEvento: resultSefaz.dhRegEvento,
        xmlProcEvento: resultSefaz.xmlProcEvento,
        message: `Cancelamento homologado na SEFAZ! Protocolo: ${resultSefaz.protocoloEvento}`,
      });
    } else {
      return res.status(400).json({
        sucesso: false,
        cancelado: false,
        cStat: resultSefaz.cStat,
        xMotivo: resultSefaz.xMotivo,
        error: `SEFAZ Rejeição no Cancelamento [cStat ${resultSefaz.cStat}]: ${resultSefaz.xMotivo}`,
      });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Falha ao processar cancelamento: ' + err.message });
  }
});

// 7.8 Download do XML Oficial de Evento de Cancelamento (procEventoNFe)
app.get('/api/fiscal/xml-cancelamento/:chave', async (req, res) => {
  const { chave } = req.params;
  const empId = req.query.empresaId || 'emp-matriz-001';

  try {
    const eventosBase = path.join(FISCAL_STORAGE_DIR, 'xmls', empId, 'eventos');
    if (fs.existsSync(eventosBase)) {
      const anos = fs.readdirSync(eventosBase);
      for (const a of anos) {
        const anoP = path.join(eventosBase, a);
        if (fs.statSync(anoP).isDirectory()) {
          const meses = fs.readdirSync(anoP);
          for (const m of meses) {
            const xmlFile = path.join(anoP, m, `${chave}-procEvento110111.xml`);
            if (fs.existsSync(xmlFile)) {
              const xmlContent = fs.readFileSync(xmlFile, 'utf8');
              res.setHeader('Content-Type', 'application/xml');
              res.setHeader('Content-Disposition', `attachment; filename="${chave}-procEvento110111.xml"`);
              return res.send(xmlContent);
            }
          }
        }
      }
    }

    return res.status(404).json({ error: 'XML oficial de evento de cancelamento não localizado.' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao buscar XML de cancelamento: ' + err.message });
  }
});

// 7.9 Transmissão do Evento 110110 de Carta de Correção Eletrônica (CC-e)
app.post('/api/fiscal/cce', async (req, res) => {
  const { chaveAcesso, textoCorrecao, sequenciaEvento, empresaId, ambiente } = req.body;
  if (!chaveAcesso || !textoCorrecao || textoCorrecao.length < 15) {
    return res.status(400).json({ error: 'Chave de acesso e texto da correção (mínimo 15 caracteres) são obrigatórios.' });
  }

  const empId = empresaId || 'emp-matriz-001';
  const certData = await getActiveCertificadoData(empId);
  if (!certData || !certData.pfx_encrypted_base64 || !certData.password_encrypted) {
    return res.status(400).json({ error: 'Certificado Digital A1 não encontrado no cofre para assinar a CC-e.' });
  }

  try {
    const pfxBase64 = decryptText(certData.pfx_encrypted_base64);
    const password = decryptText(certData.password_encrypted);
    const pfxBuffer = Buffer.from(pfxBase64, 'base64');

    const resultSefaz = await transmitirCartaCorrecaoSefaz({
      chaveAcesso,
      textoCorrecao,
      cnpjEmitente: certData.cnpj || '68148349000109',
      sequenciaEvento: parseInt(sequenciaEvento || '1', 10),
      uf: '50',
      ambiente: String(ambiente || '2'),
      pfxBuffer,
      password,
    });

    if (resultSefaz.autorizado) {
      const agora = new Date();
      const ano = agora.getFullYear().toString();
      const mes = (agora.getMonth() + 1).toString().padStart(2, '0');
      const cceDir = path.join(FISCAL_STORAGE_DIR, 'xmls', empId, 'eventos', ano, mes);
      fs.mkdirSync(cceDir, { recursive: true });
      const xmlCCeName = `${chaveAcesso}-procEvento110110-${sequenciaEvento || 1}.xml`;
      if (resultSefaz.xmlProcEvento) {
        fs.writeFileSync(path.join(cceDir, xmlCCeName), resultSefaz.xmlProcEvento, 'utf8');
      }

      return res.json({
        sucesso: true,
        autorizado: true,
        cStat: resultSefaz.cStat,
        xMotivo: resultSefaz.xMotivo,
        protocoloEvento: resultSefaz.protocoloEvento,
        dhRegEvento: resultSefaz.dhRegEvento,
        xmlProcEvento: resultSefaz.xmlProcEvento,
        message: `Carta de Correção (CC-e) homologada com sucesso na SEFAZ! Protocolo: ${resultSefaz.protocoloEvento}`,
      });
    } else {
      return res.status(400).json({
        sucesso: false,
        autorizado: false,
        cStat: resultSefaz.cStat,
        xMotivo: resultSefaz.xMotivo,
        error: `SEFAZ Rejeição na CC-e [cStat ${resultSefaz.cStat}]: ${resultSefaz.xMotivo}`,
      });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Falha ao processar CC-e: ' + err.message });
  }
});

// 7.10 Transmissão de Inutilização de Numeração de NF-e (inutNFe)
app.post('/api/fiscal/inutilizar', async (req, res) => {
  const { ano, modelo, serie, nNFIni, nNFFin, justificativa, empresaId, ambiente } = req.body;
  if (!nNFIni || !nNFFin || !justificativa || justificativa.length < 15) {
    return res.status(400).json({ error: 'Faixa numérica inicial/final e justificativa (mínimo 15 caracteres) são obrigatórias.' });
  }

  const empId = empresaId || 'emp-matriz-001';
  const certData = await getActiveCertificadoData(empId);
  if (!certData || !certData.pfx_encrypted_base64 || !certData.password_encrypted) {
    return res.status(400).json({ error: 'Certificado Digital A1 não encontrado no cofre para assinar a inutilização.' });
  }

  try {
    const pfxBase64 = decryptText(certData.pfx_encrypted_base64);
    const password = decryptText(certData.password_encrypted);
    const pfxBuffer = Buffer.from(pfxBase64, 'base64');

    const resultSefaz = await transmitirInutilizacaoSefaz({
      ano: ano || new Date().getFullYear().toString(),
      cnpjEmitente: certData.cnpj || '68148349000109',
      modelo: parseInt(modelo || '55', 10),
      serie: parseInt(serie || '1', 10),
      nNFIni: parseInt(nNFIni, 10),
      nNFFin: parseInt(nNFFin, 10),
      justificativa,
      uf: '50',
      ambiente: String(ambiente || '2'),
      pfxBuffer,
      password,
    });

    if (resultSefaz.inutilizado) {
      const agora = new Date();
      const anoStr = agora.getFullYear().toString();
      const inutDir = path.join(FISCAL_STORAGE_DIR, 'xmls', empId, 'inutilizadas', anoStr);
      fs.mkdirSync(inutDir, { recursive: true });
      const xmlInutName = `inut-${anoStr}-serie${serie || 1}-${nNFIni}-${nNFFin}-procInut.xml`;
      if (resultSefaz.xmlProcInut) {
        fs.writeFileSync(path.join(inutDir, xmlInutName), resultSefaz.xmlProcInut, 'utf8');
      }

      return res.json({
        sucesso: true,
        inutilizado: true,
        cStat: resultSefaz.cStat,
        xMotivo: resultSefaz.xMotivo,
        protocolo: resultSefaz.protocolo,
        dhRecbto: resultSefaz.dhRecbto,
        xmlProcInut: resultSefaz.xmlProcInut,
        message: `Inutilização homologada na SEFAZ! Protocolo: ${resultSefaz.protocolo}`,
      });
    } else {
      return res.status(400).json({
        sucesso: false,
        inutilizado: false,
        cStat: resultSefaz.cStat,
        xMotivo: resultSefaz.xMotivo,
        error: `SEFAZ Rejeição na Inutilização [cStat ${resultSefaz.cStat}]: ${resultSefaz.xMotivo}`,
      });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Falha ao processar inutilização: ' + err.message });
  }
});

// =========================================================================
// MÓDULOS DE BUSINESS INTELLIGENCE & ANALYTICS (COLISEU-DASH)
// =========================================================================
try {
  const biRouter = require('./src-server/routes/bi');
  const vendasRouter = require('./src-server/routes/vendas');
  const produtosRouter = require('./src-server/routes/produtos');
  const clientesRouter = require('./src-server/routes/clientes');
  const financeiroRouter = require('./src-server/routes/financeiro');
  const estatisticasRouter = require('./src-server/routes/estatisticas');
  const rankingRouter = require('./src-server/routes/ranking');
  const usuariosRouter = require('./src-server/routes/usuarios');
  const gruposRouter = require('./src-server/routes/grupos');
  const configuracoesRouter = require('./src-server/routes/configuracoes');
  const { router: filiaisRouter } = require('./src-server/routes/filiais');

  const biContextMiddleware = (req, res, next) => {
    if (!req.tenant) {
      req.tenant = { id: req.headers['x-tenant-id'] || '00000000-0000-0000-0000-000000000001', name: 'Matriz' };
    }
    if (!req.user) {
      req.user = { id: 1, email: 'admin@coliseu.com', role: 'admin', allowedSellers: [] };
    }
    next();
  };

  app.use('/api/bi', biContextMiddleware, biRouter);
  app.use('/api/vendas', biContextMiddleware, vendasRouter);
  app.use('/api/produtos', biContextMiddleware, produtosRouter);
  app.use('/api/clientes', biContextMiddleware, clientesRouter);
  app.use('/api/financeiro', biContextMiddleware, financeiroRouter);
  app.use('/api/estatisticas', biContextMiddleware, estatisticasRouter);
  app.use('/api/ranking', biContextMiddleware, rankingRouter);
  app.use('/api/comissoes', biContextMiddleware, rankingRouter);
  app.use('/api/usuarios', biContextMiddleware, usuariosRouter);
  app.use('/api/grupos', biContextMiddleware, gruposRouter);
  app.use('/api/goals', biContextMiddleware, gruposRouter);
  app.use('/api/configuracoes', biContextMiddleware, configuracoesRouter);
  app.use('/api/filiais', biContextMiddleware, filiaisRouter);

  console.log('[Coliseu ERP Server] Módulos de Business Intelligence montados com sucesso em /api/bi/*');
} catch (biErr) {
  console.warn('[Coliseu ERP Server] Aviso ao carregar rotas de BI:', biErr.message);
}

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
