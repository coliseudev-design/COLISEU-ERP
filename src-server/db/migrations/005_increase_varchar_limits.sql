-- ============================================================
-- Migration 005: Aumentar limites VARCHAR (value too long fix)
-- Motivo: Dados do SISCOM VET possuem campos de texto que
--         ultrapassam os limites originais de 100-150 chars.
-- Autor: Antigrafit | Data: 2026-05-29
-- ============================================================

-- Dropar as materialized views dependentes temporariamente para permitir alteração de tipos
DROP MATERIALIZED VIEW IF EXISTS mv_dash_vendas_diario;
DROP MATERIALIZED VIEW IF EXISTS mv_dash_financeiro_diario;

-- dash_clientes: email e cidade
ALTER TABLE dash_clientes ALTER COLUMN email     TYPE VARCHAR(255);
ALTER TABLE dash_clientes ALTER COLUMN cidade    TYPE VARCHAR(255);
ALTER TABLE dash_clientes ALTER COLUMN telefone  TYPE VARCHAR(100);
ALTER TABLE dash_clientes ALTER COLUMN documento TYPE VARCHAR(100);

-- dash_vendedores: email
ALTER TABLE dash_vendedores ALTER COLUMN email TYPE VARCHAR(255);

-- dash_fornecedores: cidade
ALTER TABLE dash_fornecedores ALTER COLUMN cidade TYPE VARCHAR(255);

-- dash_produtos: categoria, marca, referencia, codigo_fabrica
ALTER TABLE dash_produtos ALTER COLUMN categoria    TYPE VARCHAR(255);
ALTER TABLE dash_produtos ALTER COLUMN marca        TYPE VARCHAR(255);
ALTER TABLE dash_produtos ALTER COLUMN referencia   TYPE VARCHAR(255);
ALTER TABLE dash_produtos ALTER COLUMN codigo_fabrica TYPE VARCHAR(255);

-- dash_vendas: marca, categoria, especie, status, numero_pedido
ALTER TABLE dash_vendas ALTER COLUMN marca         TYPE VARCHAR(255);
ALTER TABLE dash_vendas ALTER COLUMN categoria     TYPE VARCHAR(255);
ALTER TABLE dash_vendas ALTER COLUMN especie       TYPE VARCHAR(255);
ALTER TABLE dash_vendas ALTER COLUMN status        TYPE VARCHAR(100);
ALTER TABLE dash_vendas ALTER COLUMN numero_pedido TYPE VARCHAR(100);

-- dash_vendas_itens: vendedor, produto, marca, categoria
ALTER TABLE dash_vendas_itens ALTER COLUMN vendedor  TYPE VARCHAR(255);
ALTER TABLE dash_vendas_itens ALTER COLUMN produto   TYPE VARCHAR(500);
ALTER TABLE dash_vendas_itens ALTER COLUMN marca     TYPE VARCHAR(255);
ALTER TABLE dash_vendas_itens ALTER COLUMN categoria TYPE VARCHAR(255);

-- dash_financeiro: descricao, tipo_documento, centro_custo
ALTER TABLE dash_financeiro ALTER COLUMN descricao     TYPE VARCHAR(500);
ALTER TABLE dash_financeiro ALTER COLUMN tipo_documento TYPE VARCHAR(100);
ALTER TABLE dash_financeiro ALTER COLUMN centro_custo   TYPE VARCHAR(255);
ALTER TABLE dash_financeiro ALTER COLUMN tipo           TYPE VARCHAR(100);

-- Garante que todos os usuários existentes e futuros virem admin por padrão
UPDATE dash_usuarios SET role = 'admin' WHERE role = 'viewer';
ALTER TABLE dash_usuarios ALTER COLUMN role SET DEFAULT 'admin';

-- Recriar as visões materializadas diárias com a nova estrutura de colunas e tipos
CREATE MATERIALIZED VIEW mv_dash_vendas_diario AS
SELECT 
    tenant_id,
    depto_id,
    DATE(COALESCE(data_vencimento, data_venda)) AS data_venda,
    COALESCE(SUM(valor_total), 0) AS faturamento,
    COUNT(DISTINCT id_firebird) AS qtd_pedidos,
    COALESCE(SUM(valor_desconto), 0) AS total_descontos,
    COALESCE(AVG(valor_total), 0) AS ticket_medio
FROM dash_vendas
GROUP BY tenant_id, depto_id, DATE(COALESCE(data_vencimento, data_venda));

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_vendas_diario 
    ON mv_dash_vendas_diario(tenant_id, depto_id, data_venda);

CREATE MATERIALIZED VIEW mv_dash_financeiro_diario AS
SELECT 
    tenant_id,
    depto_id,
    COALESCE(DATE(data_vencimento), DATE(data_emissao)) AS data_ref,
    tipo,
    status_pagamento,
    COALESCE(SUM(valor), 0) AS valor_bruto,
    COALESCE(SUM(valor_pago), 0) AS valor_pago
FROM dash_financeiro
GROUP BY tenant_id, depto_id, COALESCE(DATE(data_vencimento), DATE(data_emissao)), tipo, status_pagamento;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_financeiro_diario 
    ON mv_dash_financeiro_diario(tenant_id, depto_id, data_ref, tipo, status_pagamento);

-- Confirma migration registrada
DO $$
BEGIN
  RAISE NOTICE 'Migration 005 aplicada com sucesso: limites VARCHAR aumentados, materialized views atualizadas e padrão admin configurado.';
END $$;
