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
app.use(express.json({ limit: '20mb' }));

// Configuração do Pool PostgreSQL Central
const connectionString = process.env.DATABASE_URL || process.env.DB_URL;
const pool = new Pool(
  connectionString
    ? { connectionString, max: 20, idleTimeoutMillis: 30000, connectionTimeoutMillis: 4000 }
    : {
        host: process.env.VITE_DB_HOST || process.env.DB_HOST || 'postgres-central',
        port: parseInt(process.env.VITE_DB_PORT || process.env.DB_PORT || '5432', 10),
        user: process.env.POSTGRES_USER || process.env.DB_USER || 'coliseu_admin',
        password: process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD,
        database: process.env.POSTGRES_DB || process.env.DB_NAME || 'coliseu_erp',
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 4000,
      }
);

// Fallbacks e Caches em memória
let inMemoryPedidos = [];
let inMemoryProdutos = [];
let inMemoryPessoas = [];

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

// Endpoint de Stream de Eventos em Tempo Real para todos os terminais
app.get('/api/sync/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders?.();

  // Envia evento de boas-vindas
  res.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected', clients_count: sseClients.size + 1 })}\n\n`);

  sseClients.add(res);

  // Heartbeat a cada 15s para manter túnel aberto através de proxies/Cloudflare/Traefik
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

// Healthcheck ultra-rápido para Docker / Coolify
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'Coliseu ERP - Omni-Sync Central',
    active_terminals: sseClients.size,
    timestamp: new Date().toISOString(),
  });
});

// Diagnóstico do PostgreSQL
app.get('/api/health/db', async (req, res) => {
  let dbStatus = 'disconnected';
  let totalDbPedidos = 0;
  let totalDbProdutos = 0;
  let totalDbPessoas = 0;

  try {
    const p1 = pool.query('SELECT count(*)::int as count FROM pedidos_venda');
    const p2 = pool.query('SELECT count(*)::int as count FROM produtos');
    const p3 = pool.query('SELECT count(*)::int as count FROM pessoas');
    const [r1, r2, r3] = await Promise.allSettled([p1, p2, p3]);

    dbStatus = 'connected';
    if (r1.status === 'fulfilled') totalDbPedidos = r1.value.rows[0]?.count || 0;
    if (r2.status === 'fulfilled') totalDbProdutos = r2.value.rows[0]?.count || 0;
    if (r3.status === 'fulfilled') totalDbPessoas = r3.value.rows[0]?.count || 0;
  } catch (e) {
    dbStatus = `error: ${e.message}`;
  }

  res.json({
    status: 'online',
    database: dbStatus,
    active_terminals: sseClients.size,
    total_db_pedidos: totalDbPedidos,
    total_db_produtos: totalDbProdutos,
    total_db_pessoas: totalDbPessoas,
    timestamp: new Date().toISOString(),
  });
});

// =========================================================================
// ROTAS UNIVERSAIS DE MUTAÇÃO E SINCRONIZAÇÃO EM TEMPO REAL
// =========================================================================

// Reset / Limpar todos os pedidos da nuvem
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

// Listar Pedidos de Venda
app.get('/api/pedidos', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, filial_id, numero_pedido, data_emissao, cliente_id, cliente_nome,
              cliente_cpf_cnpj, cliente_cidade, cliente_uf, vendedor_nome,
              natureza_operacao, quantidade_itens, valor_total, status, device_id,
              created_at, updated_at
       FROM pedidos_venda
       ORDER BY data_emissao DESC, created_at DESC
       LIMIT 300`
    );
    if (result.rows.length > 0) {
      inMemoryPedidos = result.rows;
    }
    return res.json(result.rows);
  } catch (err) {
    console.warn('[API] Falha ao consultar PostgreSQL, usando fallback:', err.message);
    return res.json(inMemoryPedidos);
  }
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

// Salvar / Atualizar Pedido Individual (Com Broadcast Imediato)
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
    const result = await pool.query(
      `INSERT INTO pedidos_venda (
        id, filial_id, numero_pedido, data_emissao, cliente_id, cliente_nome,
        cliente_cpf_cnpj, cliente_cidade, cliente_uf, vendedor_nome,
        natureza_operacao, quantidade_itens, valor_total, status, device_id, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP)
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
        updated_at = CURRENT_TIMESTAMP
      RETURNING *`,
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
      ]
    );

    const saved = result.rows[0];
    inMemoryPedidos = [saved, ...inMemoryPedidos.filter((item) => item.id !== saved.id)];
    
    // Broadcast em tempo real para todos os outros terminais
    broadcastMutation({
      entity: 'pedidos_venda',
      action: 'UPSERT',
      id: saved.id,
      payload: saved,
    });

    return res.json({ success: true, pedido: saved });
  } catch (err) {
    console.warn('[API] Erro ao gravar pedido no PostgreSQL:', err.message);
    const fallbackItem = { ...p, updated_at: new Date().toISOString() };
    inMemoryPedidos = [fallbackItem, ...inMemoryPedidos.filter((item) => item.id !== p.id)];
    
    broadcastMutation({
      entity: 'pedidos_venda',
      action: 'UPSERT',
      id: p.id,
      payload: fallbackItem,
    });

    return res.json({ success: true, pedido: fallbackItem, fallback: true });
  }
});

// Excluir Pedido (Com Broadcast Imediato)
app.delete('/api/pedidos/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM pedidos_venda WHERE id = $1', [id]);
    inMemoryPedidos = inMemoryPedidos.filter((p) => p.id !== id);

    broadcastMutation({
      entity: 'pedidos_venda',
      action: 'DELETE',
      id,
      payload: { id },
    });

    return res.json({ success: true, id });
  } catch (err) {
    inMemoryPedidos = inMemoryPedidos.filter((p) => p.id !== id);
    broadcastMutation({
      entity: 'pedidos_venda',
      action: 'DELETE',
      id,
      payload: { id },
    });
    return res.json({ success: true, id, fallback: true });
  }
});

// Sincronizar Lote de Pedidos
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

    try {
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
          p.vendedor_nome || p.vendedorNome || 'CARLOS SILVA (INTERNO)',
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

  // Notificar todos os terminais para atualizar a lista
  broadcastMutation({
    entity: 'pedidos_venda',
    action: 'BATCH_SYNC',
    payload: { total: inseridos },
  });

  res.json({ success: true, processados: pedidos.length, inseridos });
});

// =========================================================================
// PRODUTOS & BAIXA ATÔMICA DE ESTOQUE (MULTI-TERMINAL)
// =========================================================================

// Alteração de Estoque Delta (Zero Race Condition)
app.post('/api/produtos/:id/estoque-delta', async (req, res) => {
  const { id } = req.params;
  const { delta_quantidade, motivo } = req.body;
  const delta = parseFloat(delta_quantidade || '0');

  try {
    const result = await pool.query(
      `UPDATE produtos
       SET saldo_fisico = COALESCE(saldo_fisico, 0) + $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, descricao, saldo_fisico, preco_venda, updated_at`,
      [delta, id]
    );

    const updated = result.rows[0];
    if (updated) {
      broadcastMutation({
        entity: 'produtos',
        action: 'STOCK_DELTA',
        id: updated.id,
        payload: { ...updated, motivo },
      });
      return res.json({ success: true, produto: updated });
    }
    return res.status(404).json({ error: 'Produto não encontrado' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Alteração de Preço de Produto
app.post('/api/produtos/:id/preco', async (req, res) => {
  const { id } = req.params;
  const { preco_venda, preco_custo } = req.body;

  try {
    const result = await pool.query(
      `UPDATE produtos
       SET preco_venda = COALESCE($1, preco_venda),
           preco_custo = COALESCE($2, preco_custo),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING id, descricao, preco_venda, preco_custo, saldo_fisico, updated_at`,
      [preco_venda, preco_custo, id]
    );

    const updated = result.rows[0];
    if (updated) {
      broadcastMutation({
        entity: 'produtos',
        action: 'PRICE_UPDATE',
        id: updated.id,
        payload: updated,
      });
      return res.json({ success: true, produto: updated });
    }
    return res.status(404).json({ error: 'Produto não encontrado' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// =========================================================================
// SERVIR FRONTEND SPA (VITE / REACT)
// =========================================================================
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// Fallback do React Router (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`[Coliseu ERP Server] Rodando na porta ${port} conectado ao Postgres Central.`);
});
