'use strict';

const express = require('express');
const router = express.Router();
const db = require('../db/postgres');
const logger = require('../config/logger');
const { invalidateTenant } = require('../config/cache');

const TABELAS_MAP = {
    'dash_clientes': ['id_firebird', 'nome', 'documento', 'email', 'telefone', 'cidade', 'estado', 'classificacao', 'tipo', 'data_cadastro', 'ativo'],

    'dash_produtos': ['id_firebird', 'codigo', 'nome', 'descricao', 'categoria', 'marca', 'preco', 'custo', 'estoque', 'estoque_minimo', 'ativo', 'referencia', 'codigo_fabrica', 'marca_id', 'grupo_id'],
    'dash_vendedores': ['id_firebird', 'nome', 'email', 'ativo'],
    'dash_fornecedores': ['id_firebird', 'nome', 'documento', 'cidade', 'estado'],
    'dash_vendas': ['id_firebird', 'numero_pedido', 'data_venda', 'data_vencimento', 'cliente_id_firebird', 'vendedor_id_firebird', 'valor_total', 'valor_custo', 'valor_desconto', 'status', 'marca', 'categoria', 'especie', 'depto_id', 'cfop', 'numero_nota', 'data_hora_proc', 'data_fat', 'es', 'processo', 'chave_nfe', 'peso_bruto', 'peso_liquido', 'destinatario_nome', 'destinatario_doc', 'destinatario_cidade', 'destinatario_uf', 'cidade_ibge'],
    'dash_vendas_itens': ['id_firebird', 'venda_id_firebird', 'produto_id_firebird', 'quantidade', 'preco_unitario', 'custo_unitario', 'valor_total', 'vendedor', 'produto', 'marca', 'categoria', 'depto_id'],
    'dash_comissoes': ['id_firebird', 'vendedor_id_firebird', 'venda_id_firebird', 'periodo', 'valor_vendas', 'percentual', 'valor_comissao', 'data_referencia'],
    'dash_financeiro': ['id_firebird', 'tipo', 'tipo_documento', 'descricao', 'cliente_id_firebird', 'fornecedor_id_firebird', 'caixa_id_firebird', 'data_emissao', 'data_vencimento', 'data_pagamento', 'valor', 'valor_pago', 'status_pagamento', 'depto_id', 'centro_custo'],
    'dash_compras': ['id_firebird', 'numero_pedido', 'fornecedor_id_firebird', 'data_pedido', 'data_entrega', 'valor_total', 'status'],
    'dash_devolucoes': ['id_firebird', 'venda_id_firebird', 'produto_id_firebird', 'data_devolucao', 'motivo', 'quantidade', 'valor'],
    'dash_caixas': ['id_firebird', 'descricao'],
    'dash_filiais': ['empresa_erp', 'depto_id', 'centro_custo', 'nome', 'documento', 'is_default'],
    'dash_marcas': ['id_firebird', 'nome'],
    'dash_grupos': ['id_firebird', 'nome'],
    'dash_metas_dashboard': ['id_firebird', 'tipo', 'referencia_id', 'data_referencia', 'valor_meta', 'periodo'],
    'dash_metas_vendedor_marca': ['id_firebird', 'meta_vendedor_id', 'marca_id', 'valor_meta', 'mes', 'ano']
};

// Limites de tamanho para colunas VARCHAR — alinhado com migration 005
// Previne "value too long for type character varying" do PostgreSQL
const COL_MAX_LENGTH = {
    // dash_clientes
    nome: 255, documento: 100, email: 255, telefone: 100, cidade: 255,
    estado: 2, classificacao: 50, tipo: 50,

    // dash_vendas / dash_vendas_itens / dash_produtos
    categoria: 255, marca: 255, especie: 255, vendedor: 255,
    produto: 500, descricao: 500, motivo: 500,
    // dash_vendas
    status: 100, numero_pedido: 100, numero_nota: 50,
    // dash_financeiro
    tipo: 100, tipo_documento: 100, centro_custo: 255,
    // dash_produtos
    codigo: 50, referencia: 255, codigo_fabrica: 255,
    // dash_comissoes
    periodo: 50
};

/** Trunca uma string ao limite da coluna, sem lançar erro */
function truncateCol(col, val) {
    if (typeof val !== 'string') return val;
    const max = COL_MAX_LENGTH[col];
    if (max && val.length > max) return val.substring(0, max);
    return val;
}

/**
 * Endpoint para forçar início da sincronização.
 * Como o worker roda independente, por enquanto apenas retornamos 200.
 */
router.post('/start', async (req, res) => {
    // Aqui no futuro podemos avisar o worker (ex: Redis PubSub)
    // Por enquanto, apenas retornamos sucesso para o frontend não dar erro 400
    return res.status(200).json({ message: 'Sync start requested' });
});

/**
 * Heartbeat do Worker C#.
 * Atualiza o status de sincronização e o ping de pulso de vida.
 */
router.post('/heartbeat', async (req, res) => {
    const { id: tenantId } = req.tenant;
    const { status } = req.body || {};
    const finalStatus = status || 'OK';

    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS dash_sync_metadata (
                id SERIAL PRIMARY KEY,
                tenant_id UUID NOT NULL,
                tabela VARCHAR(100) NOT NULL,
                ultima_sincronizacao TIMESTAMPTZ,
                registros_sincronizados INTEGER DEFAULT 0,
                status VARCHAR(50) DEFAULT 'OK',
                erro_mensagem TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(tenant_id, tabela)
            );
            INSERT INTO dash_sync_metadata (tenant_id, tabela, ultima_sincronizacao, registros_sincronizados, status, erro_mensagem)
            VALUES ($1, $2, NOW(), 0, $3, NULL)
            ON CONFLICT (tenant_id, tabela) DO UPDATE SET 
                ultima_sincronizacao = NOW(),
                registros_sincronizados = 0,
                status = $3
        `, [tenantId, '__heartbeat__', finalStatus]);
        
        return res.status(200).json({ status: 'OK' });
    } catch (err) {
        logger.error('[Sync] Heartbeat query error', err);
        return res.status(500).json({ error: err.message });
    }
});

/**
 * Endpoint primário de ingestão (Usado pelo Worker .NET).
 * Payload: { tabela: "dash_clientes", rows: [...] }
 * Header obriga: X-Internal-Key e X-Tenant-Id
 */
router.post('/:tabela', async (req, res) => {
    const { tabela } = req.params;
    const body = req.body || [];
    // Assume que rows pode vir direto no body (array) ou dentro de { rows: [] } para manter retrocompatibilidade
    const rows = Array.isArray(body) ? body : (Array.isArray(body.rows) ? body.rows : []);

    if (!TABELAS_MAP[tabela]) {
        return res.status(400).json({ error: `Tabela inválida ou não suportada: ${tabela}` });
    }

    if (!Array.isArray(rows)) {
        return res.status(400).json({ error: 'Payload rows deve ser um array' });
    }

    const { id: tenantId } = req.tenant;
    if (tabela === 'dash_vendas' || tabela === 'dash_vendas_itens' || tabela === 'dash_financeiro') {
        logger.info(`[SyncDebug] Recebido sync para tabela ${tabela} com ${rows.length} linhas. Tenant: ${tenantId}`);
        if (rows.length > 0) {
            logger.info(`[SyncDebug] Primeira linha: ${JSON.stringify(rows[0])}`);
        }
    }
    const allowedColumns = TABELAS_MAP[tabela];
    let inserted = 0;
    const errors = [];

    // Pegamos um client único para aproveitar mesma conexão para o loop/batch
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        for (const rawRow of rows) {
            let row = {};
            try {
                // Normalize keys to lowercase to handle Firebird UPPERCASE aliases
                for (const key in rawRow) {
                    row[key.toLowerCase()] = rawRow[key];
                }

                // Mapeia os campos de natureza vindos do worker (.NET/C#) para as colunas do banco (es, processo)
                if (row['natureza_tipo'] !== undefined && row['es'] === undefined) {
                    row['es'] = row['natureza_tipo'];
                }
                if (row['natureza_processo'] !== undefined && row['processo'] === undefined) {
                    row['processo'] = row['natureza_processo'];
                }


                // Guarda: valida chave primária obrigatória
                const conflictKeyCheck = tabela === 'dash_filiais' ? 'depto_id' : 'id_firebird';
                const pkVal = row[conflictKeyCheck];
                if (pkVal === null || pkVal === undefined || pkVal === '') {
                    errors.push(`Row sem ${conflictKeyCheck}: dados inválidos ignorados`);
                    continue;
                }

                if (tabela === 'dash_vendas') {
                    const status = row['status'] ? String(row['status']).trim().toUpperCase() : '';
                    const dataHoraProc = row['data_hora_proc'];
                    const dataVencimento = row['data_vencimento'];
                    // data_fat = DT_FAT do Firebird ("Data Faturamento" visível no ERP admin)
                    // Tem prioridade sobre data_hora_proc que pode ser o timestamp de confirmação
                    // do sistema no dia seguinte (ex: pedido 3135 entrada 14:19 dia 27,
                    // confirmado sistema 07:56 dia 28 → data_fat=27, data_hora_proc=28)
                    const dataFat = row['data_fat'];
                    
                    const isFaturado = ['FATURADO', 'FINALIZADO', 'PROCESSADO'].includes(status);
                    // Prioridade: data_fat (DT_FAT real) > data_hora_proc > data_vencimento > data_venda
                    const faturamentoDate = (dataFat && dataFat !== '') ? dataFat :
                                           (dataHoraProc && dataHoraProc !== '') ? dataHoraProc :
                                           (dataVencimento && dataVencimento !== '' ? dataVencimento : row['data_venda']);
                    const hasFaturamentoDate = faturamentoDate !== undefined && faturamentoDate !== null && faturamentoDate !== '';
                    
                    if (status === 'CANCELADO' || !isFaturado || !hasFaturamentoDate) {
                        // Deleta a venda e seus itens associados se não for válida ou for cancelada
                        await client.query(`SAVEPOINT delete_save`);
                        try {
                            await client.query(
                                `DELETE FROM dash_vendas_itens WHERE tenant_id = $1 AND venda_id_firebird = $2`,
                                [tenantId, pkVal]
                            );
                            await client.query(
                                `DELETE FROM dash_vendas WHERE tenant_id = $1 AND id_firebird = $2`,
                                [tenantId, pkVal]
                            );
                            await client.query(`RELEASE SAVEPOINT delete_save`);
                        } catch (delErr) {
                            await client.query(`ROLLBACK TO SAVEPOINT delete_save`);
                            logger.error('[Sync] Falha ao deletar venda invalida/cancelada', { error: delErr.message, tenantId, vendaId: pkVal });
                        }
                        // Não insere/atualiza este registro
                        continue;
                    }
                    
                    // Alinhamento de Faturamento: usa data_fat (DT_FAT Firebird) como data_venda principal
                    // Fallback: data_hora_proc > data_vencimento > data_venda original
                    row['data_venda'] = faturamentoDate;
                    row['data_vencimento'] = faturamentoDate;

                    // Ajustar valor_total no Postgres para ser bruto (total + desconto)
                    // para manter a consistência com as consultas do dashboard que subtraem valor_desconto.
                    if (row['valor_total'] !== undefined && row['valor_total'] !== null) {
                        let total = parseFloat(row['valor_total']) || 0;
                        let desc = parseFloat(row['valor_desconto']) || 0;
                        let custo = parseFloat(row['valor_custo']) || 0;

                        const isDevolucao = parseInt(row['es']) === 2 || (parseInt(row['processo']) === 2 && ['DEVOLUCAO DE CLIENTE', 'GARANTIA'].includes(String(row['especie']).toUpperCase().trim()));
                        if (isDevolucao) {
                            total = -Math.abs(total);
                            desc = -Math.abs(desc);
                            custo = -Math.abs(custo);
                        }

                        row['valor_total'] = total + desc;
                        row['valor_desconto'] = desc;
                        row['valor_custo'] = custo;
                    }
                }

                if (tabela === 'dash_vendas_itens') {
                    const parentVendaId = row['venda_id_firebird'];
                    const saleCheck = await client.query(
                        `SELECT id_firebird FROM dash_vendas WHERE tenant_id = $1 AND id_firebird = $2`,
                        [tenantId, parentVendaId]
                    );
                    if (saleCheck.rowCount === 0) {
                        // Descarte de itens de vendas sem cabeçalho faturado correspondente
                        continue;
                    }
                }

                // Filtra apenas colunas mapeadas e presentes
                const usedCols = allowedColumns.filter(c => Object.prototype.hasOwnProperty.call(row, c) && row[c] !== undefined);
                if (usedCols.length === 0) continue;

                // Adiciona o tenantId nas colunas a inserir
                const insertCols = ['tenant_id', ...usedCols];
                const insertValues = [tenantId, ...usedCols.map(c => {
                    let val = row[c];
                    if (val === '') {
                        // Campos NOT NULL com string vazia: usar fallbacks específicos
                        if (c === 'nome' && (tabela === 'dash_clientes' || tabela === 'dash_produtos' || tabela === 'dash_vendedores' || tabela === 'dash_fornecedores')) {
                            return `(sem nome - ID ${row['id_firebird'] || '?'})`;
                        }
                        return null;
                    }
                    if (val === null || val === undefined) {
                        // Campos NOT NULL obrigatórios: usar fallback
                        if (c === 'nome' && (tabela === 'dash_clientes' || tabela === 'dash_produtos' || tabela === 'dash_vendedores' || tabela === 'dash_fornecedores')) {
                            return `(sem nome - ID ${row['id_firebird'] || '?'})`;
                        }
                        return null;
                    }
                    if (c === 'ativo') return val == 1 || String(val).toLowerCase() === 'true';
                    // Trunca strings que excedem o limite da coluna (previne "value too long")
                    return truncateCol(c, val);
                })];
                
                // Geração posicional para o Pg (ex: $1, $2, $3)
                const placeholders = insertCols.map((_, i) => `$${i + 1}`).join(', ');

                const conflictKey = tabela === 'dash_filiais' ? 'depto_id' : 'id_firebird';

                // Regra de conflito: Atualiza todos os campos menos conflictKey e tenant_id
                let updateSet = '';
                if (tabela === 'dash_vendas') {
                    updateSet = usedCols
                        .filter(c => c !== conflictKey)
                        .map(c => {
                            if (c === 'data_vencimento') {
                                return `data_vencimento = EXCLUDED.data_vencimento`;
                            }
                            if (c === 'data_venda') {
                                return `data_venda = EXCLUDED.data_venda`;
                            }
                            return `${c} = EXCLUDED.${c}`;
                        })
                        .join(', ');
                } else {
                    updateSet = usedCols
                        .filter(c => c !== conflictKey)
                        .map(c => `${c} = EXCLUDED.${c}`)
                        .join(', ');
                }

                let sql = `
                    INSERT INTO ${tabela} (${insertCols.join(', ')}, sincronizado_em)
                    VALUES (${placeholders}, NOW())
                `;

                if (updateSet.length > 0) {
                    sql += ` ON CONFLICT (tenant_id, ${conflictKey}) DO UPDATE SET ${updateSet}, sincronizado_em = NOW()`;
                } else {
                    sql += ` ON CONFLICT (tenant_id, ${conflictKey}) DO NOTHING`;
                }

                await client.query(`SAVEPOINT row_save`);
                try {
                    await client.query(sql, insertValues);
                    await client.query(`RELEASE SAVEPOINT row_save`);
                    inserted++;
                } catch (rowErr) {
                    await client.query(`ROLLBACK TO SAVEPOINT row_save`);
                    throw rowErr; // re-lança para o catch externo da linha
                }
            } catch (err) {
                const conflictKey = tabela === 'dash_filiais' ? 'depto_id' : 'id_firebird';
                const idVal = row[conflictKey] || rawRow[conflictKey] || rawRow[conflictKey.toUpperCase()] || rawRow.ID_FIREBIRD || 'Unknown';
                errors.push(`Row ID ${idVal}: ${err.message}`);
                logger.error('[Sync] Falha em linha', { error: err.message, tenantId, rowId: idVal });
            }
        }

        // Registrar no metadata_sync
        await client.query(`
            INSERT INTO dash_sync_metadata (tenant_id, tabela, ultima_sincronizacao, registros_sincronizados, status, erro_mensagem)
            VALUES ($1, $2, NOW(), $3, $4, $5)
            ON CONFLICT (tenant_id, tabela) DO UPDATE SET 
                ultima_sincronizacao = NOW(),
                registros_sincronizados = $3,
                status = $4,
                erro_mensagem = $5
        `, [
            tenantId, 
            tabela, 
            inserted, 
            errors.length > 0 ? 'PARCIAL' : 'OK', 
            errors.length > 0 ? errors.slice(0, 3).join(' | ') : null
        ]);

        // O valor_total enviado pelo ERP já é o valor final líquido correto (produtos + frete + acréscimo + outras_despesas - desconto).
        // Não recalculamos a partir dos itens para não perder o frete, acréscimos, outras despesas e descontos de cabeçalho.

        await client.query('COMMIT');

        // Pós-Processamento: Atualizar Cache e Materialized Views
        if (['dash_vendas', 'dash_vendas_itens', 'dash_financeiro', 'dash_devolucoes'].includes(tabela)) {
            invalidateTenant(tenantId);
            
            // Atualiza as estatísticas do otimizador do Postgres para evitar tabelas lentas por falta de estatísticas atualizadas
            db.query(`ANALYZE ${tabela}`)
                .then(() => logger.info(`[Sync] Estatísticas da tabela ${tabela} analisadas com sucesso.`))
                .catch(err => logger.error(`[Sync] Erro ao executar ANALYZE na tabela ${tabela}:`, err.message));

            // Tenta dar refresh na visão de forma assíncrona para não prender o Worker
            const viewName = tabela === 'dash_financeiro' ? 'mv_dash_financeiro_diario' : 'mv_dash_vendas_diario';
            db.query(`REFRESH MATERIALIZED VIEW CONCURRENTLY ${viewName}`)
                .then(() => logger.info(`[Sync] Visão materializada ${viewName} atualizada com sucesso.`))
                .catch(err => {
                    // Se falhar por não ter índice único ainda ou tabela vazia, ignora graciosamente
                    if (err.code !== '42P01') {
                        logger.error(`[Sync] Erro ao atualizar visão ${viewName}:`, err.message);
                    }
                });
        }

    } catch (globalErr) {
        await client.query('ROLLBACK');
        logger.error('[Sync] Rollback batch sync', { error: globalErr.message, tenantId });
        return res.status(500).json({ error: 'Falha letal ao sincronizar batch', details: globalErr.message });
    } finally {
        client.release();
    }

    return res.status(200).json({
        tabela,
        recebidos: rows.length,
        aplicados: inserted,
        erros: errors.length,
        detalhes: errors.slice(0, 5)
    });
});

/**
 * Consulta a última data de sync do tenant
 */
router.get('/status', async (req, res) => {
    const { id: tenantId } = req.tenant;
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS dash_sync_metadata (
                id SERIAL PRIMARY KEY,
                tenant_id UUID NOT NULL,
                tabela VARCHAR(100) NOT NULL,
                ultima_sincronizacao TIMESTAMPTZ,
                registros_sincronizados INTEGER DEFAULT 0,
                status VARCHAR(50) DEFAULT 'OK',
                erro_mensagem TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(tenant_id, tabela)
            );
        `);
        const { rows } = await db.query(`
            SELECT tabela, ultima_sincronizacao as ultima, status, registros_sincronizados as registros
            FROM dash_sync_metadata
            WHERE tenant_id = $1 AND tabela != '__heartbeat__'
            ORDER BY tabela
        `, [tenantId]);
        
        const { rows: hbRows } = await db.query(`
            SELECT ultima_sincronizacao as ultima, status
            FROM dash_sync_metadata
            WHERE tenant_id = $1 AND tabela = '__heartbeat__'
        `, [tenantId]);

        let heartbeatStatus = 'OFFLINE';
        let ultimaHeartbeat = null;

        if (hbRows.length > 0) {
            const lastPing = new Date(hbRows[0].ultima);
            ultimaHeartbeat = lastPing.toISOString();
            // Se o último ping do worker foi nos últimos 10 minutos, o agente está OK
            if (Date.now() - lastPing.getTime() < 10 * 60 * 1000) {
                heartbeatStatus = hbRows[0].status === 'OK' ? 'OK' : 'FIREBIRD_OFFLINE';
            }
        } else if (rows.length > 0) {
            // Fallback para o comportamento antigo caso o worker novo ainda não tenha enviado ping
            const lastSyncDate = new Date(Math.max(...rows.map(r => new Date(r.ultima).getTime())));
            ultimaHeartbeat = lastSyncDate.toISOString();
            if (Date.now() - lastSyncDate.getTime() < 30 * 60 * 1000) {
                heartbeatStatus = 'OK';
            }
        }
        
        rows.push({
            tabela: '__heartbeat__',
            ultima: ultimaHeartbeat,
            status: heartbeatStatus,
            registros: 0
        });

        return res.json({ status: rows, timestamp: new Date().toISOString() });
    } catch (err) {
        return res.status(500).json({ error: 'Erro ao consultar status' });
    }
});

/**
 * GET /api/sync/nfes-emitidas
 * Retorna as NF-es faturadas no Firebird sincronizadas via Worker
 * para serem selecionadas e agregadas diretamente na emissão de MDF-e
 */
router.get('/nfes-emitidas', async (req, res) => {
    try {
        const tenantId = req.tenant?.id || '00000000-0000-0000-0000-000000000001';
        const { data_inicio, data_fim, cidade, uf, limit = 200 } = req.query;

        let query = `
            SELECT 
                v.id_firebird,
                COALESCE(v.numero_nota, v.numero_pedido, v.id_firebird::text) as numero_nota,
                v.numero_pedido,
                COALESCE(v.chave_nfe, '') as chave_nfe,
                v.data_venda,
                v.data_fat,
                v.valor_total,
                v.status,
                COALESCE(v.peso_bruto, 0) as peso_bruto,
                COALESCE(v.peso_liquido, 0) as peso_liquido,
                COALESCE(v.destinatario_nome, c.nome, 'CONSUMIDOR') as destinatario_nome,
                COALESCE(v.destinatario_doc, c.documento, '') as destinatario_documento,
                COALESCE(v.destinatario_cidade, c.cidade, 'DOURADOS') as destinatario_cidade,
                COALESCE(v.destinatario_uf, c.estado, 'MS') as destinatario_uf,
                COALESCE(v.cidade_ibge, '5003702') as cod_municipio_ibge
            FROM dash_vendas v
            LEFT JOIN dash_clientes c ON c.id_firebird = v.cliente_id_firebird AND c.tenant_id = v.tenant_id
            WHERE v.tenant_id = $1
        `;
        const params = [tenantId];

        if (data_inicio) {
            params.push(data_inicio);
            query += ` AND (v.data_fat >= $${params.length} OR v.data_venda >= $${params.length})`;
        }
        if (data_fim) {
            params.push(data_fim);
            query += ` AND (v.data_fat <= $${params.length} OR v.data_venda <= $${params.length})`;
        }
        if (cidade && cidade !== 'todas' && cidade !== 'all') {
            params.push(`%${cidade}%`);
            query += ` AND (v.destinatario_cidade ILIKE $${params.length} OR c.cidade ILIKE $${params.length})`;
        }
        if (uf && uf !== 'todas' && uf !== 'all') {
            params.push(uf);
            query += ` AND (v.destinatario_uf = $${params.length} OR c.estado = $${params.length})`;
        }

        query += ` ORDER BY v.data_venda DESC, v.id_firebird DESC LIMIT $${params.length + 1}`;
        params.push(parseInt(limit, 10));

        const result = await db.query(query, params);

        const nfes = (result.rows || []).map(row => {
            const num = parseInt(row.numero_nota, 10) || row.id_firebird;
            const chave = row.chave_nfe && row.chave_nfe.length === 44 
                ? row.chave_nfe 
                : `5026080576657700012255001${String(num).padStart(9, '0')}1000000010`;
            const valorTotal = parseFloat(row.valor_total || 0);
            const peso = parseFloat(row.peso_bruto || 0) || Math.max(10, Math.round(valorTotal * 0.12));

            return {
                id: `FB-${row.id_firebird}`,
                numero: num,
                serie: 1,
                chave_acesso: chave,
                data_emissao: row.data_fat || row.data_venda,
                destinatario_nome: row.destinatario_nome,
                destinatario_documento: row.destinatario_documento,
                destinatario_cidade: row.destinatario_cidade,
                destinatario_uf: row.destinatario_uf,
                cod_municipio_ibge: row.cod_municipio_ibge || '5003702',
                valor_total: valorTotal,
                peso_bruto_kg: peso,
                origem: 'FIREBIRD_WORKER'
            };
        });

        return res.json({
            success: true,
            total: nfes.length,
            data: nfes
        });
    } catch (err) {
        logger.error('[Sync API] Erro ao buscar NF-es:', err);
        return res.status(500).json({ error: 'Erro ao buscar NF-es do Firebird: ' + err.message });
    }
});

/**
 * GET & POST /api/sync/modo-operacao
 * Gerencia a chave de alternância entre Modo Nuvem Autônoma e Modo Híbrido Firebird
 */
router.get('/modo-operacao', async (req, res) => {
    try {
        const tenantId = req.tenant?.id || '00000000-0000-0000-0000-000000000001';
        const { rows } = await db.query(`
            SELECT valor FROM configuracoes 
            WHERE chave = 'MODO_OPERACAO_SISTEMA' AND (empresa_id = $1 OR empresa_id = 'GLOBAL')
            LIMIT 1
        `, [tenantId]).catch(() => ({ rows: [] }));

        const modo = rows.length > 0 ? rows[0].valor : 'standalone';
        return res.json({
            modo_operacao: modo,
            descricao: modo === 'firebird_worker' ? 'Híbrido Integrado Firebird (Worker)' : 'Nuvem Autônoma (Banco Próprio)'
        });
    } catch (err) {
        return res.json({ modo_operacao: 'standalone' });
    }
});

router.post('/modo-operacao', async (req, res) => {
    try {
        const tenantId = req.tenant?.id || '00000000-0000-0000-0000-000000000001';
        const { modo_operacao } = req.body;

        const val = modo_operacao === 'firebird_worker' ? 'firebird_worker' : 'standalone';
        await db.query(`
            INSERT INTO configuracoes (id, empresa_id, chave, valor, grupo, atualizado_em)
            VALUES (gen_random_uuid(), $1, 'MODO_OPERACAO_SISTEMA', $2, 'INTEGRACAO', NOW())
            ON CONFLICT (empresa_id, chave) 
            DO UPDATE SET valor = EXCLUDED.valor, atualizado_em = NOW()
        `, [tenantId, val]).catch(async () => {
            await db.query(`
                UPDATE configuracoes SET valor = $1 WHERE chave = 'MODO_OPERACAO_SISTEMA'
            `, [val]).catch(() => {});
        });

        invalidateTenant(tenantId);

        return res.json({
            success: true,
            modo_operacao: val,
            message: `Modo de operação alterado para: ${val === 'firebird_worker' ? 'Híbrido Firebird (Worker)' : 'Nuvem Autônoma'}`
        });
    } catch (err) {
        return res.status(500).json({ error: 'Erro ao salvar modo de operação: ' + err.message });
    }
});

/**
 * POST /internal/sync/heartbeat
 * Endpoint chamado pelo Worker em C# para registrar presença e saúde da porta 3050
 */
router.post('/heartbeat', async (req, res) => {
    try {
        const tenantId = req.tenant?.id || req.body.tenant_id || '00000000-0000-0000-0000-000000000001';
        const status = req.body.status || 'OK';
        const fbHost = req.body.firebird_host || 'localhost';
        const fbDb = req.body.firebird_database || 'PIVETA.FDB';

        await db.query(`
            INSERT INTO dash_sync_metadata (tenant_id, tabela, ultima_sincronizacao, status, total_registros)
            VALUES ($1, '__heartbeat__', NOW(), $2, 1)
            ON CONFLICT (tenant_id, tabela)
            DO UPDATE SET 
                ultima_sincronizacao = NOW(),
                status = EXCLUDED.status,
                total_registros = EXCLUDED.total_registros
        `, [tenantId, status]);

        return res.json({ success: true, timestamp: new Date().toISOString() });
    } catch (err) {
        logger.error('[Sync Heartbeat] Erro ao registrar heartbeat:', err);
        return res.status(500).json({ error: 'Erro ao registrar heartbeat: ' + err.message });
    }
});

module.exports = router;
