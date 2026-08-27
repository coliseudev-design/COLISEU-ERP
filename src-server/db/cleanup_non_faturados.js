'use strict';

const db = require('./postgres');
const logger = require('../config/logger');

async function runCleanup() {
    console.log('=== Iniciando Limpeza de Vendas Não Faturadas e Canceladas ===');
    const client = await db.poolMain.connect();

    try {
        await client.query('BEGIN');

        // 1. Contar registros antes da limpeza
        const countBeforeVendas = await client.query('SELECT COUNT(*) FROM dash_vendas');
        const countBeforeItens = await client.query('SELECT COUNT(*) FROM dash_vendas_itens');
        console.log(`Registros iniciais: Vendas = ${countBeforeVendas.rows[0].count}, Itens = ${countBeforeItens.rows[0].count}`);

        // 2. Deletar itens órfãos e itens de vendas que não estão faturadas
        // (Status faturados aceitos: FATURADO, FINALIZADO, PROCESSADO)
        console.log('Purga de itens de vendas inválidas, canceladas ou órfãs...');
        const deleteItensRes = await client.query(`
            DELETE FROM dash_vendas_itens vi
            USING dash_vendas v
            WHERE vi.tenant_id = v.tenant_id
              AND vi.venda_id_firebird = v.id_firebird
              AND (
                (v.data_vencimento IS NULL AND v.data_hora_proc IS NULL)
                OR UPPER(TRIM(v.status)) NOT IN ('FATURADO', 'FINALIZADO', 'PROCESSADO')
              )
        `);
        console.log(`Itens de venda inválida deletados: ${deleteItensRes.rowCount}`);

        const deleteOrphansRes = await client.query(`
            DELETE FROM dash_vendas_itens vi
            WHERE NOT EXISTS (
                SELECT 1 
                FROM dash_vendas v 
                WHERE v.tenant_id = vi.tenant_id 
                  AND v.id_firebird = vi.venda_id_firebird
            )
        `);
        console.log(`Itens de venda órfãos deletados: ${deleteOrphansRes.rowCount}`);

        // 3. Deletar vendas inválidas ou canceladas
        console.log('Purga de vendas inválidas, canceladas ou sem data de faturamento...');
        const deleteVendasRes = await client.query(`
            DELETE FROM dash_vendas 
            WHERE (data_vencimento IS NULL AND data_hora_proc IS NULL)
               OR UPPER(TRIM(status)) NOT IN ('FATURADO', 'FINALIZADO', 'PROCESSADO')
        `);
        console.log(`Vendas deletadas: ${deleteVendasRes.rowCount}`);

        // 4. Contar registros após a limpeza
        const countAfterVendas = await client.query('SELECT COUNT(*) FROM dash_vendas');
        const countAfterItens = await client.query('SELECT COUNT(*) FROM dash_vendas_itens');
        console.log(`Registros remanescentes: Vendas = ${countAfterVendas.rows[0].count}, Itens = ${countAfterItens.rows[0].count}`);

        await client.query('COMMIT');
        console.log('✓ Limpeza concluída e transação confirmada com sucesso.');

        // 5. Atualizar Visões Materializadas
        console.log('Atualizando visões materializadas...');
        try {
            await client.query('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dash_vendas_diario');
            console.log('✓ Visão mv_dash_vendas_diario atualizada.');
        } catch (vErr) {
            console.log('Aviso ao atualizar mv_dash_vendas_diario:', vErr.message);
        }

        try {
            await client.query('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dash_financeiro_diario');
            console.log('✓ Visão mv_dash_financeiro_diario atualizada.');
        } catch (fErr) {
            console.log('Aviso ao atualizar mv_dash_financeiro_diario:', fErr.message);
        }

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Erro fatal durante a limpeza de dados:', err.message);
    } finally {
        client.release();
        // Terminar a conexão para encerrar o script graciosamente
        await db.poolMain.end();
    }
}

runCleanup().catch(err => {
    console.error('Falha ao rodar script:', err);
    process.exit(1);
});
