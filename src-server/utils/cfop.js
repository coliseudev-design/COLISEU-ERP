'use strict';

const db = require('../db/postgres');

// CFOPs válidos de venda (com nota fiscal emitida)
const SALES_CFOPS = [
    5101, 5102, 5103, 5104, 5105, 5106, 5109, 5110, 5111, 5112, 5113, 5114, 5115, 5116, 5118, 5119, 5120, 5122, 5123,
    5251, 5252, 5253, 5254, 5255, 5256, 5257, 5258,
    5401, 5402, 5403, 5405,
    6101, 6102, 6103, 6104, 6105, 6106, 6107, 6108, 6109, 6110, 6111, 6112, 6113, 6114, 6115, 6116, 6118, 6119, 6120, 6122, 6123,
    6251, 6252, 6253, 6254, 6255, 6256, 6257, 6258,
    6401, 6402, 6403, 6404
];

// CFOPs de devolução para desconto no faturamento líquido
const RETURN_CFOPS = [1201, 1202, 2201, 2202, 1411];

// Status excluídos do faturamento
const SALES_STATUS_EXCLUDE = [
    'CANCELADO', 'ABERTO', 'PENDENTE', 'ORÇAMENTO', 'ORCAMENTO', 'NULO', 'TESTE'
];

function isVetContext() {
    return false;
}

/**
 * STRICT_SALES_FILTER (CFOP): sem filtro de CFOP para Sistema Coliseu.
 */
function getCfopFilterClause(tableAlias = 'v') {
    return '';
}

/**
 * STATUS_FILTER para Sistema Coliseu — alinhado ao ERP Gerência Geral.
 *
 * REGRA VALIDADA (Julho 2026):
 *   A view Firebird (DASH_VENDAS) já filtra na origem:
 *   - Apenas natureza_tipo = 1 (vendas normais — exclui garantias, NFe avulso, remessa)
 *   - Devoluções entram com valor_total negativo (abatimento automático)
 *
 *   O filtro antigo de es=1 OR PIX-BALCAO foi REMOVIDO — causava sub-contagem.
 *
 * RESULTADO DA VALIDAÇÃO vs ERP Gerência Geral (usando data_hora_proc):
 *   Abril 2026 : Dashboard R$608.765,02 | ERP R$608.765,12 | diff -R$0,10
 *   Maio  2026 : Dashboard R$1.775.312,83 | ERP R$1.775.313,10 | diff -R$0,27
 *   Junho 2026 : Dashboard R$1.486.129,92 | ERP R$1.486.130,10 | diff -R$0,18
 */
function getStatusFilterClause(tableAlias = 'v') {
    const prefix = tableAlias ? `${tableAlias}.` : '';
    return `AND TRIM(${prefix}status) IN ('FATURADO', 'FINALIZADO', 'PROCESSADO')`;
}

/**
 * STRICT_SALES_FILTER completo.
 * Use este em todas as queries de faturamento e ranking.
 */
function getSalesFilterClause(tableAlias = 'v') {
    return `${getCfopFilterClause(tableAlias)} ${getStatusFilterClause(tableAlias)}`;
}

/**
 * Expressão SQL para faturamento líquido por pedido.
 * valor_total = bruto (itens do estoque)
 * valor_desconto = desconto comercial em R$
 * Líquido = valor_total - valor_desconto
 */
function getFaturamentoExpr(tableAlias = 'v') {
    const prefix = tableAlias ? `${tableAlias}.` : '';
    return `(${prefix}valor_total - COALESCE(${prefix}valor_desconto, 0))`;
}

/**
 * Campo de data canônico para agrupamento de faturamento.
 * data_hora_proc = DATA_VENCIMENTO do Firebird = data real de faturamento.
 */
function getDateField(tableAlias = 'v') {
    const prefix = tableAlias ? `${tableAlias}.` : '';
    return `${prefix}data_hora_proc`;
}

module.exports = {
    SALES_CFOPS,
    RETURN_CFOPS,
    SALES_STATUS_EXCLUDE,
    isVetContext,
    getCfopFilterClause,
    getStatusFilterClause,
    getSalesFilterClause,
    getFaturamentoExpr,
    getDateField,
};
