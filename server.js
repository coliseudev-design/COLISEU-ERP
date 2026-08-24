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
app.use(express.json({ limit: '15mb' }));

// Configuração do Pool PostgreSQL
const connectionString = process.env.DATABASE_URL || process.env.DB_URL;
const pool = new Pool(
  connectionString
    ? { connectionString, max: 10, idleTimeoutMillis: 30000, connectionTimeoutMillis: 4000 }
    : {
        host: process.env.VITE_DB_HOST || process.env.DB_HOST || 'postgres-central',
        port: parseInt(process.env.VITE_DB_PORT || process.env.DB_PORT || '5432', 10),
        user: process.env.POSTGRES_USER || process.env.DB_USER || 'coliseu_admin',
        password: process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD,
        database: process.env.POSTGRES_DB || process.env.DB_NAME || 'coliseu_erp',
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 4000,
      }
);

// Cache em memória para fallback se o banco oscilar
let inMemoryPedidos = [];

// ==================== ROTAS DE API ====================

// Healthcheck com diagnóstico do PostgreSQL
app.get('/api/health', async (req, res) => {
  let dbStatus = 'disconnected';
  let totalDbPedidos = 0;
  try {
    const test = await pool.query('SELECT count(*)::int as count FROM pedidos_venda');
    dbStatus = 'connected';
    totalDbPedidos = test.rows[0]?.count || 0;
  } catch (e) {
    dbStatus = `error: ${e.message}`;
  }

  res.json({
    status: 'online',
    system: 'Coliseu ERP - Cloud Concentrator',
    database: dbStatus,
    total_db_pedidos: totalDbPedidos,
    in_memory_pedidos: inMemoryPedidos.length,
    timestamp: new Date().toISOString(),
  });
});

// Reset / Limpar todos os pedidos da nuvem
app.all('/api/pedidos/reset', async (req, res) => {
  try {
    await pool.query('TRUNCATE TABLE pedidos_venda_itens, pedidos_venda CASCADE;');
    inMemoryPedidos = [];
    return res.json({ success: true, message: 'BANCO DE VENDAS DA NUVEM LIMPO COM SUCESSO!' });
  } catch (err) {
    inMemoryPedidos = [];
    return res.json({ success: true, message: 'Memória limpa, erro no banco: ' + err.message });
  }
});

// Listar Pedidos de Venda (Postgres)
app.get('/api/pedidos', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, filial_id, numero_pedido, data_emissao, cliente_id, cliente_nome,
              cliente_cpf_cnpj, cliente_cidade, cliente_uf, vendedor_nome,
              natureza_operacao, quantidade_itens, valor_total, status, device_id,
              created_at, updated_at
       FROM pedidos_venda
       ORDER BY data_emissao DESC, created_at DESC
       LIMIT 200`
    );
    if (result.rows.length > 0) {
      inMemoryPedidos = result.rows;
    }
    return res.json(result.rows);
  } catch (err) {
    console.warn('[API] Falha ao consultar PostgreSQL, usando cache em memória:', err.message);
    return res.json(inMemoryPedidos);
  }
});

// Salvar / Sincronizar Pedido Individual
app.post('/api/pedidos', async (req, res) => {
  const p = req.body;
  if (!p || !p.id) {
    return res.status(400).json({ error: 'Payload de pedido inválido (id obrigatório)' });
  }

  try {
    const numeroLimpo = parseInt(String(p.numero_pedido || p.numeroPedido || '0').replace(/\D/g, ''), 10) || 0;
    const valorFinal = parseFloat(p.valor_total || p.valorTotalFinal || '0') || 0;
    const qtdItens = parseInt(p.quantidade_itens || (p.itens ? p.itens.length : 1), 10) || 1;

    const query = `
      INSERT INTO pedidos_venda (
        id, filial_id, numero_pedido, data_emissao, cliente_id, cliente_nome,
        cliente_cpf_cnpj, cliente_cidade, cliente_uf, vendedor_nome,
        natureza_operacao, quantidade_itens, valor_total, status, device_id, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO UPDATE SET
        numero_pedido = EXCLUDED.numero_pedido,
        cliente_nome = EXCLUDED.cliente_nome,
        valor_total = EXCLUDED.valor_total,
        status = EXCLUDED.status,
        quantidade_itens = EXCLUDED.quantidade_itens,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;

    const values = [
      p.id,
      p.filial_id || p.filialDepto || 'fil-matriz-001',
      numeroLimpo,
      p.data_emissao || p.dataEmissao || new Date().toISOString(),
      p.cliente_id || p.clienteId || null,
      p.cliente_nome || p.clienteNome || 'CLIENTE NÃO INFORMADO',
      p.cliente_cpf_cnpj || p.clienteCnpjCpf || null,
      p.cliente_cidade || p.clienteCidade || 'DOURADOS',
      p.cliente_uf || p.clienteUf || 'MS',
      p.vendedor_nome || p.vendedorNome || 'VENDEDOR',
      p.natureza_operacao || (typeof p.naturezaOperacao === 'object' ? p.naturezaOperacao?.descricao : p.naturezaOperacao) || '5102 - VENDA',
      qtdItens,
      valorFinal,
      p.status || 'APROVADO',
      p.device_id || 'DESKTOP-LOCAL',
    ];

    const result = await pool.query(query, values);
    
    // Atualizar cache em memória
    inMemoryPedidos = [result.rows[0], ...inMemoryPedidos.filter(item => item.id !== p.id)];

    return res.json({ success: true, pedido: result.rows[0] });
  } catch (err) {
    console.error('[API] Erro ao gravar pedido no PostgreSQL:', err.message);
    // Salva ao menos em memória
    inMemoryPedidos = [{ ...p, updated_at: new Date().toISOString() }, ...inMemoryPedidos.filter(item => item.id !== p.id)];
    return res.json({ success: true, warning: 'Salvo em cache (banco reconectando)', pedido: p });
  }
});

// Sincronização em Lote (Batch Sync do Desktop)
app.post('/api/pedidos/batch', async (req, res) => {
  const { pedidos } = req.body;
  if (!Array.isArray(pedidos)) {
    return res.status(400).json({ error: 'Array de pedidos esperado' });
  }

  let inseridos = 0;
  for (const p of pedidos) {
    try {
      const numeroLimpo = parseInt(String(p.numero_pedido || p.numeroPedido || '0').replace(/\D/g, ''), 10) || 0;
      const valorFinal = parseFloat(p.valor_total || p.valorTotalFinal || '0') || 0;
      const qtdItens = parseInt(p.quantidade_itens || (p.itens ? p.itens.length : 1), 10) || 1;

      await pool.query(
        `INSERT INTO pedidos_venda (
          id, filial_id, numero_pedido, data_emissao, cliente_id, cliente_nome,
          cliente_cpf_cnpj, cliente_cidade, cliente_uf, vendedor_nome,
          natureza_operacao, quantidade_itens, valor_total, status, device_id, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO UPDATE SET
          numero_pedido = EXCLUDED.numero_pedido,
          cliente_nome = EXCLUDED.cliente_nome,
          valor_total = EXCLUDED.valor_total,
          status = EXCLUDED.status,
          quantidade_itens = EXCLUDED.quantidade_itens,
          updated_at = CURRENT_TIMESTAMP`,
        [
          p.id,
          p.filial_id || p.filialDepto || 'fil-matriz-001',
          numeroLimpo,
          p.data_emissao || p.dataEmissao || new Date().toISOString(),
          p.cliente_id || p.clienteId || null,
          p.cliente_nome || p.clienteNome || 'CLIENTE NÃO INFORMADO',
          p.cliente_cpf_cnpj || p.clienteCnpjCpf || null,
          p.cliente_cidade || p.clienteCidade || 'DOURADOS',
          p.cliente_uf || p.clienteUf || 'MS',
          p.vendedor_nome || p.vendedorNome || 'VENDEDOR',
          p.natureza_operacao || (typeof p.naturezaOperacao === 'object' ? p.naturezaOperacao?.descricao : p.naturezaOperacao) || '5102 - VENDA',
          qtdItens,
          valorFinal,
          p.status || 'APROVADO',
          p.device_id || 'DESKTOP-LOCAL',
        ]
      );
      inseridos++;
    } catch (e) {
      console.warn('[Batch] Erro no item', p.id, e.message);
    }
  }

  res.json({ success: true, processados: pedidos.length, inseridos });
});

// ==================== SERVIR FRONTEND SPA ====================
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// Fallback do React Router (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`[Coliseu ERP Server] Rodando na porta ${port} conectado ao Postgres Central.`);
});
