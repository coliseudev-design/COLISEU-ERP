use rusqlite::{Connection, Result};
use tracing::info;

/// Array of all 79 tables managed by the ERP system for sync validation.
pub const ALL_TABLES: [&str; 79] = [
    "empresas",
    "filiais",
    "produtos",
    "depositos",
    "estoque_saldos",
    "estoque_movimentacoes",
    "pessoas",
    "vendas",
    "vendas_itens",
    "vendas_pagamentos",
    "documentos_fiscais",
    "documentos_fiscais_eventos",
    "financeiro_lancamentos",
    "caixa_movimentacoes",
    "dispositivos",
    "tributacao_regras",
    "nfe_entradas",
    "nfe_entradas_itens",
    "compras_pedidos",
    "compras_pedidos_itens",
    "estoque_transferencias",
    "estoque_transferencias_itens",
    "plano_contas",
    "centro_custos",
    "ofx_extratos",
    "boletos_emitidos",
    "usuarios",
    "usuarios_permissoes",
    "alcadas_desconto",
    "audit_logs",
    "relatorios_config",
    "curva_abc_historico",
    "produtos_variantes",
    "produtos_grades",
    "produtos_grades_eixos",
    "xml_entrada_pendentes",
    "xml_entrada_itens_grade",
    "etiquetas_modelos",
    "etiquetas_filas",
    "promocoes",
    "promocoes_itens",
    "pix_chaves",
    "pix_transacoes",
    "comandas",
    "comandas_itens",
    "condicionais",
    "condicionais_itens",
    "vale_trocas",
    "ficha_financeira_cliente",
    "pessoas_enderecos",
    "pessoas_contatos",
    "pessoas_referencias",
    "pessoas_veiculos",
    "configuracoes_sistema",
    "filiais_nfe_config",
    "filiais_nfce_config",
    "filiais_nfse_config",
    "nfse_documentos",
    "llm_providers",
    "whatsapp_config",
    "funcionarios",
    "funcionarios_filiais",
    "funcionarios_metas",
    "grupos_acesso",
    "grupos_acesso_permissoes",
    "veiculos",
    "veiculos_reboques",
    "motoristas",
    "seguradoras",
    "apolices_seguro",
    "tabelas_frete",
    "rotas_transporte",
    "pedagios_rota",
    "cte_documentos",
    "cte_documentos_nfe",
    "cte_componentes_valor",
    "cte_eventos",
    "operacoes_transporte",
    "operacoes_transporte_ctes",
];

/// Sync metadata columns required on EVERY table for local-first sync support.
pub const SYNC_METADATA_COLUMNS: [&str; 7] = [
    "id",
    "device_id",
    "created_at",
    "updated_at",
    "x_sync_status",
    "x_version",
    "is_deleted",
];

/// Initializes the database schema with DDL for all 15 tables and sync indexes.
pub fn create_tables(conn: &Connection) -> Result<()> {
    info!("Executando DDL de criação de tabelas do ERP...");

    conn.execute_batch(
        "
        PRAGMA foreign_keys = ON;

        -- 1. EMPRESAS
        CREATE TABLE IF NOT EXISTS empresas (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            razao_social TEXT NOT NULL,
            nome_fantasia TEXT,
            cnpj TEXT UNIQUE NOT NULL,
            inscricao_estadual TEXT,
            ativo INTEGER NOT NULL DEFAULT 1
        );
        CREATE INDEX IF NOT EXISTS idx_empresas_sync ON empresas(x_sync_status, updated_at);

        -- 2. FILIAIS
        CREATE TABLE IF NOT EXISTS filiais (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            empresa_id TEXT NOT NULL REFERENCES empresas(id),
            codigo TEXT NOT NULL,
            nome TEXT NOT NULL,
            cnpj TEXT NOT NULL,
            inscricao_estadual TEXT,
            endereco TEXT,
            cidade TEXT,
            uf TEXT,
            ativo INTEGER NOT NULL DEFAULT 1
        );
        CREATE INDEX IF NOT EXISTS idx_filiais_sync ON filiais(x_sync_status, updated_at);
        CREATE INDEX IF NOT EXISTS idx_filiais_empresa ON filiais(empresa_id);

        -- 3. PRODUTOS
        CREATE TABLE IF NOT EXISTS produtos (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            empresa_id TEXT NOT NULL REFERENCES empresas(id),
            codigo_sku TEXT NOT NULL,
            codigo_barras TEXT,
            descricao TEXT NOT NULL,
            unidade_medida TEXT NOT NULL DEFAULT 'UN',
            preco_custo REAL NOT NULL DEFAULT 0.0,
            preco_venda REAL NOT NULL DEFAULT 0.0,
            ncm TEXT,
            cest TEXT,
            tipo_produto TEXT DEFAULT 'SIMPLES',
            unidade_compra TEXT DEFAULT 'UN',
            fator_conversao REAL DEFAULT 1.0,
            markup_sugerido REAL DEFAULT 50.0,
            cfop_venda TEXT DEFAULT '5101',
            csosn_venda TEXT DEFAULT '102',
            pis_cst_venda TEXT DEFAULT '49',
            cofins_cst_venda TEXT DEFAULT '49',
            aliquota_ibpt_nacional REAL DEFAULT 0.0,
            aliquota_ibpt_estadual REAL DEFAULT 0.0,
            grade_id TEXT,
            ativo INTEGER NOT NULL DEFAULT 1
        );
        CREATE INDEX IF NOT EXISTS idx_produtos_sync ON produtos(x_sync_status, updated_at);
        CREATE INDEX IF NOT EXISTS idx_produtos_empresa ON produtos(empresa_id);
        CREATE INDEX IF NOT EXISTS idx_produtos_sku ON produtos(codigo_sku);
        CREATE INDEX IF NOT EXISTS idx_produtos_barras ON produtos(codigo_barras);

        -- 4. DEPOSITOS
        CREATE TABLE IF NOT EXISTS depositos (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            filial_id TEXT NOT NULL REFERENCES filiais(id),
            codigo TEXT NOT NULL,
            nome TEXT NOT NULL,
            padrao INTEGER NOT NULL DEFAULT 0,
            ativo INTEGER NOT NULL DEFAULT 1
        );
        CREATE INDEX IF NOT EXISTS idx_depositos_sync ON depositos(x_sync_status, updated_at);
        CREATE INDEX IF NOT EXISTS idx_depositos_filial ON depositos(filial_id);

        -- 5. ESTOQUE_SALDOS
        CREATE TABLE IF NOT EXISTS estoque_saldos (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            deposito_id TEXT NOT NULL REFERENCES depositos(id),
            produto_id TEXT NOT NULL REFERENCES produtos(id),
            quantidade_atual REAL NOT NULL DEFAULT 0.0,
            quantidade_reservada REAL NOT NULL DEFAULT 0.0,
            UNIQUE(deposito_id, produto_id)
        );
        CREATE INDEX IF NOT EXISTS idx_estoque_saldos_sync ON estoque_saldos(x_sync_status, updated_at);
        CREATE INDEX IF NOT EXISTS idx_estoque_saldos_produto ON estoque_saldos(produto_id);

        -- 6. ESTOQUE_MOVIMENTACOES
        CREATE TABLE IF NOT EXISTS estoque_movimentacoes (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            deposito_id TEXT NOT NULL REFERENCES depositos(id),
            produto_id TEXT NOT NULL REFERENCES produtos(id),
            tipo TEXT NOT NULL,
            quantidade REAL NOT NULL,
            saldo_anterior REAL NOT NULL,
            saldo_posterior REAL NOT NULL,
            origem_documento TEXT,
            origem_id TEXT,
            observacao TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_estoque_mov_sync ON estoque_movimentacoes(x_sync_status, updated_at);
        CREATE INDEX IF NOT EXISTS idx_estoque_mov_produto ON estoque_movimentacoes(produto_id);

        -- 7. PESSOAS
        CREATE TABLE IF NOT EXISTS pessoas (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            empresa_id TEXT NOT NULL REFERENCES empresas(id),
            tipo_cadastro TEXT NOT NULL DEFAULT 'CLIENTE', -- 'CLIENTE', 'FORNECEDOR', 'PRODUTOR', 'REVENDEDOR', 'FUNCIONARIO', 'PORTADOR', 'TRANSPORTADOR', 'CLIENTE_FORNECEDOR'
            tipo TEXT NOT NULL DEFAULT 'FISICA', -- 'FISICA', 'JURIDICA'
            nome_razaosocial TEXT NOT NULL,
            nome_fantasia TEXT,
            cpf_cnpj TEXT,
            foto_base64 TEXT,
            codigo_interno TEXT,

            -- Pessoa Física
            sexo TEXT,
            rg TEXT,
            rg_orgao_emissor TEXT,
            rg_data_emissao TEXT,
            data_nascimento TEXT,
            naturalidade TEXT,
            estado_civil TEXT,
            nome_mae TEXT,
            profissao TEXT,

            -- Pessoa Jurídica
            inscricao_estadual TEXT,
            inscricao_municipal TEXT,
            inscricao_suframa TEXT,
            cnae_principal TEXT,
            data_fundacao TEXT,
            optante_simples INTEGER DEFAULT 0,

            -- Endereço Principal
            cep TEXT,
            logradouro TEXT,
            numero TEXT,
            complemento TEXT,
            bairro TEXT,
            municipio TEXT,
            uf TEXT,
            codigo_ibge TEXT,
            pais TEXT DEFAULT 'BRASIL',

            -- Contato
            email TEXT,
            email_principal TEXT,
            email_financeiro TEXT,
            telefone TEXT,
            telefone_fixo TEXT,
            celular TEXT,
            whatsapp TEXT,
            site TEXT,

            -- Crédito & Financeiro
            is_cliente INTEGER NOT NULL DEFAULT 1,
            is_fornecedor INTEGER NOT NULL DEFAULT 0,
            limite_credito REAL DEFAULT 5000.0,
            limite_credito_validade TEXT,
            classificacao_credito TEXT DEFAULT 'NAO_DEFINIDO',
            dia_vencimento_preferencial INTEGER,
            dias_aviso_antes_vencimento INTEGER,
            data_ultima_compra TEXT,
            score_credito INTEGER DEFAULT 700,

            -- Comercial
            vendedor_id TEXT REFERENCES usuarios(id),
            regiao TEXT,
            convenio TEXT,
            classe TEXT,
            tabela_preco_id TEXT,
            condicao_pgto_padrao TEXT,

            -- Fiscal
            contribuinte_icms TEXT DEFAULT 'NAO_CONTRIBUINTE',
            substituto_tributario INTEGER DEFAULT 0,
            consumidor_final INTEGER DEFAULT 1,

            -- Observações
            observacoes TEXT,
            observacoes_internas TEXT,

            -- Controle
            ativo INTEGER NOT NULL DEFAULT 1,
            bloqueado INTEGER NOT NULL DEFAULT 0,
            motivo_bloqueio TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_pessoas_sync ON pessoas(x_sync_status, updated_at);
        CREATE INDEX IF NOT EXISTS idx_pessoas_cpf_cnpj ON pessoas(cpf_cnpj);

        -- 8. VENDAS
        CREATE TABLE IF NOT EXISTS vendas (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            filial_id TEXT NOT NULL REFERENCES filiais(id),
            deposito_id TEXT NOT NULL REFERENCES depositos(id),
            cliente_id TEXT REFERENCES pessoas(id),
            vendedor_id TEXT,
            numero_venda INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'ABERTA',
            valor_subtotal REAL NOT NULL DEFAULT 0.0,
            valor_desconto REAL NOT NULL DEFAULT 0.0,
            valor_total REAL NOT NULL DEFAULT 0.0,
            observacoes TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_vendas_sync ON vendas(x_sync_status, updated_at);
        CREATE INDEX IF NOT EXISTS idx_vendas_filial ON vendas(filial_id);
        CREATE INDEX IF NOT EXISTS idx_vendas_cliente ON vendas(cliente_id);

        -- 9. VENDAS_ITENS
        CREATE TABLE IF NOT EXISTS vendas_itens (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            venda_id TEXT NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
            produto_id TEXT NOT NULL REFERENCES produtos(id),
            item_ordem INTEGER NOT NULL,
            quantidade REAL NOT NULL,
            preco_unitario REAL NOT NULL,
            desconto_unitario REAL NOT NULL DEFAULT 0.0,
            valor_total REAL NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_vendas_itens_sync ON vendas_itens(x_sync_status, updated_at);
        CREATE INDEX IF NOT EXISTS idx_vendas_itens_venda ON vendas_itens(venda_id);

        -- 10. VENDAS_PAGAMENTOS
        CREATE TABLE IF NOT EXISTS vendas_pagamentos (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            venda_id TEXT NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
            forma_pagamento TEXT NOT NULL,
            valor REAL NOT NULL,
            troco REAL NOT NULL DEFAULT 0.0,
            nsu_autorizacao TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_vendas_pag_sync ON vendas_pagamentos(x_sync_status, updated_at);
        CREATE INDEX IF NOT EXISTS idx_vendas_pag_venda ON vendas_pagamentos(venda_id);

        -- 11. DOCUMENTOS_FISCAIS
        CREATE TABLE IF NOT EXISTS documentos_fiscais (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            filial_id TEXT NOT NULL REFERENCES filiais(id),
            venda_id TEXT REFERENCES vendas(id),
            modelo TEXT NOT NULL,
            serie INTEGER NOT NULL DEFAULT 1,
            numero INTEGER NOT NULL,
            chave_acesso TEXT UNIQUE,
            status TEXT NOT NULL DEFAULT 'DIGITACAO',
            xml_envio TEXT,
            xml_retorno TEXT,
            motivo_status TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_doc_fiscais_sync ON documentos_fiscais(x_sync_status, updated_at);
        CREATE INDEX IF NOT EXISTS idx_doc_fiscais_venda ON documentos_fiscais(venda_id);

        -- 12. DOCUMENTOS_FISCAIS_EVENTOS
        CREATE TABLE IF NOT EXISTS documentos_fiscais_eventos (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            documento_fiscal_id TEXT NOT NULL REFERENCES documentos_fiscais(id),
            tipo_evento TEXT NOT NULL,
            sequencia INTEGER NOT NULL DEFAULT 1,
            protocolo TEXT,
            xml_evento TEXT,
            status_retorno INTEGER
        );
        CREATE INDEX IF NOT EXISTS idx_doc_eventos_sync ON documentos_fiscais_eventos(x_sync_status, updated_at);

        -- 13. FINANCEIRO_LANCAMENTOS
        CREATE TABLE IF NOT EXISTS financeiro_lancamentos (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            filial_id TEXT NOT NULL REFERENCES filiais(id),
            pessoa_id TEXT REFERENCES pessoas(id),
            venda_id TEXT REFERENCES vendas(id),
            tipo TEXT NOT NULL,
            descricao TEXT NOT NULL,
            valor_total REAL NOT NULL,
            valor_pago REAL NOT NULL DEFAULT 0.0,
            data_vencimento TEXT NOT NULL,
            data_pagamento TEXT,
            status TEXT NOT NULL DEFAULT 'PENDENTE'
        );
        CREATE INDEX IF NOT EXISTS idx_fin_lanc_sync ON financeiro_lancamentos(x_sync_status, updated_at);

        -- 14. CAIXA_MOVIMENTACOES
        CREATE TABLE IF NOT EXISTS caixa_movimentacoes (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            filial_id TEXT NOT NULL REFERENCES filiais(id),
            dispositivo_id TEXT REFERENCES dispositivos(id),
            tipo TEXT NOT NULL,
            valor REAL NOT NULL,
            observacao TEXT,
            usuario_id TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_caixa_mov_sync ON caixa_movimentacoes(x_sync_status, updated_at);

        -- 15. DISPOSITIVOS
        CREATE TABLE IF NOT EXISTS dispositivos (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            filial_id TEXT NOT NULL REFERENCES filiais(id),
            nome_dispositivo TEXT NOT NULL,
            identificador_hardware TEXT NOT NULL,
            chave_publica TEXT,
            ultimo_visto_em TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_dispositivos_sync ON dispositivos(x_sync_status, updated_at);

        -- 16. TRIBUTACAO_REGRAS
        CREATE TABLE IF NOT EXISTS tributacao_regras (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            empresa_id TEXT NOT NULL REFERENCES empresas(id),
            ncm TEXT NOT NULL,
            uf_origem TEXT NOT NULL DEFAULT 'SP',
            uf_destino TEXT NOT NULL DEFAULT 'SP',
            crt INTEGER NOT NULL DEFAULT 1,
            cfop_estado TEXT NOT NULL DEFAULT '5102',
            cfop_interestado TEXT NOT NULL DEFAULT '6102',
            csosn TEXT DEFAULT '102',
            cst_icms TEXT DEFAULT '00',
            aliquota_icms REAL NOT NULL DEFAULT 0.0,
            aliquota_red_bc_icms REAL NOT NULL DEFAULT 0.0,
            cst_pis TEXT DEFAULT '07',
            aliquota_pis REAL NOT NULL DEFAULT 0.0,
            cst_cofins TEXT DEFAULT '07',
            aliquota_cofins REAL NOT NULL DEFAULT 0.0,
            aliquota_ibpt_nacional REAL NOT NULL DEFAULT 4.20,
            aliquota_ibpt_estadual REAL NOT NULL DEFAULT 12.00
        );
        CREATE INDEX IF NOT EXISTS idx_trib_regras_sync ON tributacao_regras(x_sync_status, updated_at);
        CREATE INDEX IF NOT EXISTS idx_trib_regras_ncm ON tributacao_regras(ncm);

        -- 17. NFE_ENTRADAS
        CREATE TABLE IF NOT EXISTS nfe_entradas (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            filial_id TEXT NOT NULL REFERENCES filiais(id),
            fornecedor_id TEXT REFERENCES pessoas(id),
            chave_acesso TEXT UNIQUE NOT NULL,
            numero TEXT NOT NULL,
            serie TEXT NOT NULL,
            cnpj_emitente TEXT NOT NULL,
            nome_emitente TEXT NOT NULL,
            data_emissao TEXT NOT NULL,
            valor_total REAL NOT NULL DEFAULT 0.0,
            status_manifestacao TEXT NOT NULL DEFAULT 'SEM_MANIFESTO',
            xml_conteudo TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_nfe_entradas_sync ON nfe_entradas(x_sync_status, updated_at);
        CREATE INDEX IF NOT EXISTS idx_nfe_entradas_chave ON nfe_entradas(chave_acesso);

        -- 18. NFE_ENTRADAS_ITENS
        CREATE TABLE IF NOT EXISTS nfe_entradas_itens (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            nfe_entrada_id TEXT NOT NULL REFERENCES nfe_entradas(id) ON DELETE CASCADE,
            produto_id TEXT REFERENCES produtos(id),
            numero_item INTEGER NOT NULL,
            codigo_fornecedor TEXT NOT NULL,
            descricao TEXT NOT NULL,
            ncm TEXT,
            cfop TEXT NOT NULL,
            unidade_compra TEXT NOT NULL,
            quantidade_compra REAL NOT NULL,
            valor_unitario REAL NOT NULL,
            valor_total REAL NOT NULL,
            fator_conversao REAL NOT NULL DEFAULT 1.0
        );
        CREATE INDEX IF NOT EXISTS idx_nfe_entradas_itens_sync ON nfe_entradas_itens(x_sync_status, updated_at);

        -- 19. COMPRAS_PEDIDOS
        CREATE TABLE IF NOT EXISTS compras_pedidos (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            filial_id TEXT NOT NULL REFERENCES filiais(id),
            fornecedor_id TEXT REFERENCES pessoas(id),
            numero_pedido TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'RASCUNHO',
            valor_total REAL NOT NULL DEFAULT 0.0,
            observacoes TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_compras_ped_sync ON compras_pedidos(x_sync_status, updated_at);

        -- 20. COMPRAS_PEDIDOS_ITENS
        CREATE TABLE IF NOT EXISTS compras_pedidos_itens (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            pedido_compra_id TEXT NOT NULL REFERENCES compras_pedidos(id) ON DELETE CASCADE,
            produto_id TEXT NOT NULL REFERENCES produtos(id),
            quantidade REAL NOT NULL,
            fator_conversao REAL NOT NULL DEFAULT 1.0,
            preco_custo_unitario REAL NOT NULL,
            valor_total REAL NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_compras_ped_itens_sync ON compras_pedidos_itens(x_sync_status, updated_at);

        -- 21. ESTOQUE_TRANSFERENCIAS
        CREATE TABLE IF NOT EXISTS estoque_transferencias (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            deposito_origem_id TEXT NOT NULL REFERENCES depositos(id),
            deposito_destino_id TEXT NOT NULL REFERENCES depositos(id),
            numero_transferencia INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'CONCLUIDA',
            observacao TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_est_transf_sync ON estoque_transferencias(x_sync_status, updated_at);

        -- 22. ESTOQUE_TRANSFERENCIAS_ITENS
        CREATE TABLE IF NOT EXISTS estoque_transferencias_itens (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            transferencia_id TEXT NOT NULL REFERENCES estoque_transferencias(id) ON DELETE CASCADE,
            produto_id TEXT NOT NULL REFERENCES produtos(id),
            quantidade REAL NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_est_transf_itens_sync ON estoque_transferencias_itens(x_sync_status, updated_at);

        -- 23. PLANO_CONTAS
        CREATE TABLE IF NOT EXISTS plano_contas (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            empresa_id TEXT NOT NULL REFERENCES empresas(id),
            codigo TEXT NOT NULL,
            descricao TEXT NOT NULL,
            tipo TEXT NOT NULL, -- 'RECEITA', 'DESPESA_VARIAVEL', 'DESPESA_FIXA', 'IMPOSTO'
            nivel INTEGER NOT NULL DEFAULT 1,
            pai_id TEXT REFERENCES plano_contas(id)
        );
        CREATE INDEX IF NOT EXISTS idx_plano_contas_sync ON plano_contas(x_sync_status, updated_at);

        -- 24. CENTRO_CUSTOS
        CREATE TABLE IF NOT EXISTS centro_custos (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            empresa_id TEXT NOT NULL REFERENCES empresas(id),
            codigo TEXT NOT NULL,
            nome TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_centro_custos_sync ON centro_custos(x_sync_status, updated_at);

        -- 25. OFX_EXTRATOS
        CREATE TABLE IF NOT EXISTS ofx_extratos (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            filial_id TEXT NOT NULL REFERENCES filiais(id),
            fitid TEXT UNIQUE NOT NULL,
            data_transacao TEXT NOT NULL,
            valor REAL NOT NULL,
            tipo_transacao TEXT NOT NULL,
            memo TEXT,
            status_conciliacao TEXT NOT NULL DEFAULT 'PENDENTE',
            financeiro_lancamento_id TEXT REFERENCES financeiro_lancamentos(id)
        );
        CREATE INDEX IF NOT EXISTS idx_ofx_extratos_sync ON ofx_extratos(x_sync_status, updated_at);

        -- 26. BOLETOS_EMITIDOS
        CREATE TABLE IF NOT EXISTS boletos_emitidos (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            financeiro_lancamento_id TEXT NOT NULL REFERENCES financeiro_lancamentos(id),
            nosso_numero TEXT NOT NULL,
            linha_digitavel TEXT NOT NULL,
            codigo_barras TEXT NOT NULL,
            pix_qrcode_url TEXT,
            valor REAL NOT NULL,
            data_vencimento TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'EMITIDO'
        );
        CREATE INDEX IF NOT EXISTS idx_boletos_sync ON boletos_emitidos(x_sync_status, updated_at);

        -- 27. USUARIOS
        CREATE TABLE IF NOT EXISTS usuarios (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            empresa_id TEXT NOT NULL REFERENCES empresas(id),
            nome TEXT NOT NULL,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            perfil TEXT NOT NULL DEFAULT 'OPERADOR', -- 'OPERADOR', 'GERENTE', 'ADMIN'
            ativo INTEGER NOT NULL DEFAULT 1
        );
        CREATE INDEX IF NOT EXISTS idx_usuarios_sync ON usuarios(x_sync_status, updated_at);

        -- 28. USUARIOS_PERMISSOES
        CREATE TABLE IF NOT EXISTS usuarios_permissoes (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
            permissao TEXT NOT NULL,
            concedida INTEGER NOT NULL DEFAULT 1
        );
        CREATE INDEX IF NOT EXISTS idx_usuarios_perm_sync ON usuarios_permissoes(x_sync_status, updated_at);

        -- 29. ALCADAS_DESCONTO
        CREATE TABLE IF NOT EXISTS alcadas_desconto (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            perfil TEXT UNIQUE NOT NULL, -- 'OPERADOR', 'GERENTE', 'ADMIN'
            percentual_max_desconto REAL NOT NULL DEFAULT 5.0
        );
        CREATE INDEX IF NOT EXISTS idx_alcadas_sync ON alcadas_desconto(x_sync_status, updated_at);

        -- 30. AUDIT_LOGS
        CREATE TABLE IF NOT EXISTS audit_logs (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            usuario_id TEXT,
            usuario_nome TEXT,
            acao TEXT NOT NULL,
            recurso TEXT NOT NULL,
            detalhes TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_audit_logs_sync ON audit_logs(x_sync_status, updated_at);

        -- 31. RELATORIOS_CONFIG
        CREATE TABLE IF NOT EXISTS relatorios_config (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            nome TEXT NOT NULL,
            tipo_relatorio TEXT NOT NULL,
            parametros_json TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_relatorios_sync ON relatorios_config(x_sync_status, updated_at);

        -- 32. CURVA_ABC_HISTORICO
        CREATE TABLE IF NOT EXISTS curva_abc_historico (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            filial_id TEXT NOT NULL REFERENCES filiais(id),
            produto_id TEXT NOT NULL REFERENCES produtos(id),
            faturamento_acumulado REAL NOT NULL,
            percentual_acumulado REAL NOT NULL,
            classe TEXT NOT NULL -- 'A', 'B', 'C'
        );
        CREATE INDEX IF NOT EXISTS idx_curva_abc_sync ON curva_abc_historico(x_sync_status, updated_at);

        -- 33. PRODUTOS_GRADES
        CREATE TABLE IF NOT EXISTS produtos_grades (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            empresa_id TEXT NOT NULL REFERENCES empresas(id),
            nome TEXT NOT NULL,
            eixo1_nome TEXT NOT NULL DEFAULT 'Tamanho',
            eixo2_nome TEXT DEFAULT 'Cor'
        );
        CREATE INDEX IF NOT EXISTS idx_grades_sync ON produtos_grades(x_sync_status, updated_at);

        -- 34. PRODUTOS_GRADES_EIXOS
        CREATE TABLE IF NOT EXISTS produtos_grades_eixos (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            grade_id TEXT NOT NULL REFERENCES produtos_grades(id) ON DELETE CASCADE,
            tipo_eixo INTEGER NOT NULL DEFAULT 1,
            valor TEXT NOT NULL,
            ordem INTEGER NOT NULL DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS idx_grades_eixos_sync ON produtos_grades_eixos(x_sync_status, updated_at);

        -- 35. PRODUTOS_VARIANTES (SKU-filhos da Grade)
        CREATE TABLE IF NOT EXISTS produtos_variantes (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            produto_pai_id TEXT NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
            codigo_sku TEXT UNIQUE NOT NULL,
            codigo_barras TEXT,
            tamanho TEXT,
            cor TEXT,
            preco_venda REAL,
            ativo INTEGER NOT NULL DEFAULT 1
        );
        CREATE INDEX IF NOT EXISTS idx_variantes_sync ON produtos_variantes(x_sync_status, updated_at);
        CREATE INDEX IF NOT EXISTS idx_variantes_pai ON produtos_variantes(produto_pai_id);

        -- 36. XML_ENTRADA_PENDENTES
        CREATE TABLE IF NOT EXISTS xml_entrada_pendentes (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            filial_id TEXT NOT NULL REFERENCES filiais(id),
            chave_nfe TEXT UNIQUE NOT NULL,
            numero_nota TEXT NOT NULL,
            fornecedor_cnpj TEXT NOT NULL,
            fornecedor_nome TEXT NOT NULL,
            xml_conteudo TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'PENDENTE'
        );
        CREATE INDEX IF NOT EXISTS idx_xml_pend_sync ON xml_entrada_pendentes(x_sync_status, updated_at);

        -- 37. XML_ENTRADA_ITENS_GRADE
        CREATE TABLE IF NOT EXISTS xml_entrada_itens_grade (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            xml_pendente_id TEXT NOT NULL REFERENCES xml_entrada_pendentes(id) ON DELETE CASCADE,
            item_seq INTEGER NOT NULL,
            variante_id TEXT NOT NULL REFERENCES produtos_variantes(id),
            quantidade REAL NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_xml_itens_grade_sync ON xml_entrada_itens_grade(x_sync_status, updated_at);

        -- 38. ETIQUETAS_MODELOS
        CREATE TABLE IF NOT EXISTS etiquetas_modelos (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            empresa_id TEXT NOT NULL REFERENCES empresas(id),
            nome TEXT NOT NULL,
            tipo_impressora TEXT NOT NULL DEFAULT 'ZEBRA_ZPL', -- 'ZEBRA_ZPL', 'ARGOX_PPLB', 'PIMACO_A4'
            largura_mm REAL NOT NULL DEFAULT 100.0,
            altura_mm REAL NOT NULL DEFAULT 30.0,
            colunas INTEGER NOT NULL DEFAULT 1,
            zpl_template TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_etq_modelos_sync ON etiquetas_modelos(x_sync_status, updated_at);

        -- 39. ETIQUETAS_FILAS
        CREATE TABLE IF NOT EXISTS etiquetas_filas (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            empresa_id TEXT NOT NULL REFERENCES empresas(id),
            modelo_id TEXT REFERENCES etiquetas_modelos(id),
            produto_id TEXT REFERENCES produtos(id),
            variante_id TEXT REFERENCES produtos_variantes(id),
            quantidade INTEGER NOT NULL DEFAULT 1,
            status TEXT NOT NULL DEFAULT 'PENDENTE'
        );
        CREATE INDEX IF NOT EXISTS idx_etq_filas_sync ON etiquetas_filas(x_sync_status, updated_at);

        -- 40. PROMOCOES
        CREATE TABLE IF NOT EXISTS promocoes (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            empresa_id TEXT NOT NULL REFERENCES empresas(id),
            nome TEXT NOT NULL,
            tipo_promocao TEXT NOT NULL, -- 'ATACADO_QTD', 'LEVE_X_PAGUE_Y', 'DESCONTO_PERCENTUAL'
            produto_id TEXT REFERENCES produtos(id),
            quantidade_minima REAL NOT NULL DEFAULT 1.0,
            preco_promocional REAL,
            percentual_desconto REAL,
            quantidade_pague REAL,
            ativo INTEGER NOT NULL DEFAULT 1
        );
        CREATE INDEX IF NOT EXISTS idx_promocoes_sync ON promocoes(x_sync_status, updated_at);

        -- 41. PROMOCOES_ITENS
        CREATE TABLE IF NOT EXISTS promocoes_itens (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            promocao_id TEXT NOT NULL REFERENCES promocoes(id) ON DELETE CASCADE,
            produto_id TEXT NOT NULL REFERENCES produtos(id),
            quantidade REAL NOT NULL DEFAULT 1.0
        );
        CREATE INDEX IF NOT EXISTS idx_promocoes_itens_sync ON promocoes_itens(x_sync_status, updated_at);

        -- 42. PIX_CHAVES
        CREATE TABLE IF NOT EXISTS pix_chaves (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            empresa_id TEXT NOT NULL REFERENCES empresas(id),
            tipo_chave TEXT NOT NULL, -- 'CNPJ', 'CPF', 'EMAIL', 'TELEFONE', 'EVP'
            chave TEXT NOT NULL,
            merchant_name TEXT NOT NULL,
            merchant_city TEXT NOT NULL,
            padrao INTEGER NOT NULL DEFAULT 1
        );
        CREATE INDEX IF NOT EXISTS idx_pix_chaves_sync ON pix_chaves(x_sync_status, updated_at);

        -- 43. PIX_TRANSACOES
        CREATE TABLE IF NOT EXISTS pix_transacoes (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            venda_id TEXT REFERENCES vendas(id),
            txid TEXT UNIQUE NOT NULL,
            valor REAL NOT NULL,
            payload_emv TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'PENDENTE' -- 'PENDENTE', 'CONCLUIDO', 'CANCELADO'
        );
        CREATE INDEX IF NOT EXISTS idx_pix_tx_sync ON pix_transacoes(x_sync_status, updated_at);

        -- 44. COMANDAS
        CREATE TABLE IF NOT EXISTS comandas (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            filial_id TEXT NOT NULL REFERENCES filiais(id),
            numero_comanda TEXT UNIQUE NOT NULL,
            cliente_nome TEXT DEFAULT 'CLIENTE BALCAO',
            vendedor_id TEXT REFERENCES usuarios(id),
            valor_total REAL NOT NULL DEFAULT 0.0,
            status TEXT NOT NULL DEFAULT 'ABERTA' -- 'ABERTA', 'AGUARDANDO_PAGAMENTO', 'FATURADA', 'CANCELADA'
        );
        CREATE INDEX IF NOT EXISTS idx_comandas_sync ON comandas(x_sync_status, updated_at);

        -- 45. COMANDAS_ITENS
        CREATE TABLE IF NOT EXISTS comandas_itens (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            comanda_id TEXT NOT NULL REFERENCES comandas(id) ON DELETE CASCADE,
            produto_id TEXT NOT NULL REFERENCES produtos(id),
            variante_id TEXT REFERENCES produtos_variantes(id),
            quantidade REAL NOT NULL,
            preco_unitario REAL NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_comandas_itens_sync ON comandas_itens(x_sync_status, updated_at);

        -- 46. CONDICIONAIS
        CREATE TABLE IF NOT EXISTS condicionais (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            filial_id TEXT NOT NULL REFERENCES filiais(id),
            numero_condicional TEXT UNIQUE NOT NULL,
            cliente_id TEXT NOT NULL REFERENCES pessoas(id),
            vendedor_id TEXT REFERENCES usuarios(id),
            data_saida TEXT NOT NULL,
            data_limite_devolucao TEXT NOT NULL,
            valor_total_enviado REAL NOT NULL DEFAULT 0.0,
            valor_total_devolvido REAL NOT NULL DEFAULT 0.0,
            valor_total_faturado REAL NOT NULL DEFAULT 0.0,
            status TEXT NOT NULL DEFAULT 'EM_ABERTO' -- 'EM_ABERTO', 'FINALIZADO_PARCIAL', 'FINALIZADO_TOTAL', 'CANCELADO'
        );
        CREATE INDEX IF NOT EXISTS idx_condicionais_sync ON condicionais(x_sync_status, updated_at);

        -- 47. CONDICIONAIS_ITENS
        CREATE TABLE IF NOT EXISTS condicionais_itens (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            condicional_id TEXT NOT NULL REFERENCES condicionais(id) ON DELETE CASCADE,
            produto_id TEXT NOT NULL REFERENCES produtos(id),
            variante_id TEXT REFERENCES produtos_variantes(id),
            codigo_barras TEXT,
            quantidade_enviada REAL NOT NULL,
            quantidade_devolvida REAL NOT NULL DEFAULT 0.0,
            quantidade_faturada REAL NOT NULL DEFAULT 0.0,
            preco_unitario REAL NOT NULL,
            status TEXT NOT NULL DEFAULT 'ENVIADO' -- 'ENVIADO', 'DEVOLVIDO', 'FATURADO'
        );
        CREATE INDEX IF NOT EXISTS idx_condicionais_itens_sync ON condicionais_itens(x_sync_status, updated_at);

        -- 48. VALE_TROCAS
        CREATE TABLE IF NOT EXISTS vale_trocas (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            codigo_vale TEXT UNIQUE NOT NULL,
            cliente_id TEXT NOT NULL REFERENCES pessoas(id),
            valor_original REAL NOT NULL,
            valor_bonus REAL NOT NULL DEFAULT 0.0,
            valor_total_credito REAL NOT NULL,
            saldo_disponivel REAL NOT NULL,
            data_validade TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'ATIVO' -- 'ATIVO', 'UTILIZADO_PARCIAL', 'UTILIZADO_TOTAL', 'EXPIRADO'
        );
        CREATE INDEX IF NOT EXISTS idx_vale_trocas_sync ON vale_trocas(x_sync_status, updated_at);

        -- 49. FICHA_FINANCEIRA_CLIENTE
        CREATE TABLE IF NOT EXISTS ficha_financeira_cliente (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            cliente_id TEXT NOT NULL REFERENCES pessoas(id),
            origem TEXT NOT NULL, -- 'CONDICIONAL_FATURADA', 'VALE_TROCA', 'PAGAMENTO_RECEBIDO'
            referencia_id TEXT,
            tipo_movimento TEXT NOT NULL, -- 'DEBITO', 'CREDITO'
            valor REAL NOT NULL,
            historico TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_ficha_fin_sync ON ficha_financeira_cliente(x_sync_status, updated_at);

        -- 50. PESSOAS_ENDERECOS (Múltiplos Endereços)
        CREATE TABLE IF NOT EXISTS pessoas_enderecos (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            pessoa_id TEXT NOT NULL REFERENCES pessoas(id) ON DELETE CASCADE,
            tipo_endereco TEXT NOT NULL DEFAULT 'ENTREGA', -- 'PRINCIPAL', 'ENTREGA', 'COBRANCA', 'COMERCIAL'
            cep TEXT NOT NULL,
            logradouro TEXT NOT NULL,
            numero TEXT NOT NULL,
            complemento TEXT,
            bairro TEXT NOT NULL,
            municipio TEXT NOT NULL,
            uf TEXT NOT NULL,
            codigo_ibge TEXT,
            pais TEXT DEFAULT 'BRASIL'
        );
        CREATE INDEX IF NOT EXISTS idx_pessoas_end_sync ON pessoas_enderecos(x_sync_status, updated_at);

        -- 51. PESSOAS_CONTATOS (Múltiplos Contatos)
        CREATE TABLE IF NOT EXISTS pessoas_contatos (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            pessoa_id TEXT NOT NULL REFERENCES pessoas(id) ON DELETE CASCADE,
            tipo_contato TEXT NOT NULL DEFAULT 'COMERCIAL', -- 'COMERCIAL', 'FINANCEIRO', 'COMPRAS', 'REPRESENTANTE'
            nome TEXT NOT NULL,
            cargo TEXT,
            telefone TEXT,
            celular TEXT,
            email TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_pessoas_cont_sync ON pessoas_contatos(x_sync_status, updated_at);

        -- 52. PESSOAS_REFERENCIAS (Referências Comerciais)
        CREATE TABLE IF NOT EXISTS pessoas_referencias (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            pessoa_id TEXT NOT NULL REFERENCES pessoas(id) ON DELETE CASCADE,
            nome_empresa TEXT NOT NULL,
            cnpj TEXT,
            telefone TEXT,
            contato TEXT,
            limite_concedido REAL DEFAULT 0.0,
            tempo_relacionamento TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_pessoas_ref_sync ON pessoas_referencias(x_sync_status, updated_at);

        -- 53. PESSOAS_VEICULOS (Veículos vinculados a clientes/oficina/transportadora)
        CREATE TABLE IF NOT EXISTS pessoas_veiculos (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            pessoa_id TEXT NOT NULL REFERENCES pessoas(id) ON DELETE CASCADE,
            placa TEXT NOT NULL,
            modelo TEXT NOT NULL,
            marca TEXT NOT NULL,
            ano_fabricacao INTEGER,
            ano_modelo INTEGER,
            renavam TEXT,
            cor TEXT,
            km_atual INTEGER DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS idx_pessoas_veic_placa ON pessoas_veiculos(placa);

        -- 54. CONFIGURACOES_SISTEMA
        CREATE TABLE IF NOT EXISTS configuracoes_sistema (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            empresa_id TEXT NOT NULL REFERENCES empresas(id),
            chave TEXT NOT NULL,
            valor TEXT NOT NULL,
            grupo TEXT NOT NULL DEFAULT 'GERAL',
            UNIQUE(empresa_id, chave)
        );
        CREATE INDEX IF NOT EXISTS idx_config_sistema_empresa ON configuracoes_sistema(empresa_id, grupo);

        -- 55. FILIAIS_NFE_CONFIG (NF-e Modelo 55)
        CREATE TABLE IF NOT EXISTS filiais_nfe_config (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            filial_id TEXT UNIQUE NOT NULL REFERENCES filiais(id),
            serie_nfe INTEGER NOT NULL DEFAULT 1,
            proximo_numero_nfe INTEGER NOT NULL DEFAULT 1,
            ambiente_nfe INTEGER NOT NULL DEFAULT 2,
            tp_imp_danfe INTEGER NOT NULL DEFAULT 1,
            tp_emis_nfe INTEGER NOT NULL DEFAULT 1,
            ind_sinc INTEGER NOT NULL DEFAULT 1,
            versao_xml TEXT NOT NULL DEFAULT '4.00',
            logo_danfe_path TEXT,
            xml_storage_path TEXT,
            resp_tec_cnpj TEXT,
            resp_tec_contato TEXT,
            resp_tec_email TEXT,
            resp_tec_fone TEXT,
            resp_tec_id_csrt TEXT,
            resp_tec_csrt TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_filiais_nfe_config_filial ON filiais_nfe_config(filial_id);

        -- 56. FILIAIS_NFCE_CONFIG (NFC-e Modelo 65)
        CREATE TABLE IF NOT EXISTS filiais_nfce_config (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            filial_id TEXT UNIQUE NOT NULL REFERENCES filiais(id),
            serie_nfce INTEGER NOT NULL DEFAULT 1,
            proximo_numero_nfce INTEGER NOT NULL DEFAULT 1,
            ambiente_nfce INTEGER NOT NULL DEFAULT 2,
            csc_id TEXT,
            csc_token TEXT,
            tp_emis_nfce INTEGER NOT NULL DEFAULT 1,
            modelo_danfe_nfce TEXT NOT NULL DEFAULT 'PADRAO',
            tp_imp_danfe_nfce INTEGER NOT NULL DEFAULT 1,
            versao_qrcode TEXT NOT NULL DEFAULT '2.00',
            qrcode_contingencia TEXT NOT NULL DEFAULT '2.00',
            usar_tef INTEGER NOT NULL DEFAULT 0,
            fuso_horario TEXT NOT NULL DEFAULT '-03:00',
            mostrar_troco INTEGER NOT NULL DEFAULT 1,
            enviar_codigo_barras INTEGER NOT NULL DEFAULT 1,
            contingencia_timeout_ms INTEGER NOT NULL DEFAULT 5000,
            xml_storage_path TEXT,
            logo_danfce_path TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_filiais_nfce_config_filial ON filiais_nfce_config(filial_id);

        -- 57. FILIAIS_NFSE_CONFIG (NFS-e Nota Fiscal de Serviço Eletrônica)
        CREATE TABLE IF NOT EXISTS filiais_nfse_config (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            filial_id TEXT UNIQUE NOT NULL REFERENCES filiais(id),
            ambiente_nfse INTEGER NOT NULL DEFAULT 2,
            provedor_nfse TEXT NOT NULL DEFAULT 'NACIONAL',
            url_ws_producao TEXT,
            url_ws_homologacao TEXT,
            usuario_ws TEXT,
            senha_ws TEXT,
            token_ws TEXT,
            serie_rps TEXT NOT NULL DEFAULT '1',
            proximo_numero_rps INTEGER NOT NULL DEFAULT 1,
            tipo_rps INTEGER NOT NULL DEFAULT 1,
            regime_especial_tributacao INTEGER NOT NULL DEFAULT 1,
            natureza_operacao INTEGER NOT NULL DEFAULT 1,
            item_lista_servico TEXT NOT NULL DEFAULT '14.01',
            cod_tributacao_municipio TEXT,
            cnae_servico TEXT NOT NULL DEFAULT '6201501',
            aliquota_iss REAL NOT NULL DEFAULT 2.00,
            iss_retido INTEGER NOT NULL DEFAULT 2,
            responsavel_retencao INTEGER NOT NULL DEFAULT 1,
            incentivador_cultural INTEGER NOT NULL DEFAULT 2,
            optante_simples_nfse INTEGER NOT NULL DEFAULT 1,
            xml_storage_path TEXT,
            versao_abrasf TEXT NOT NULL DEFAULT '2.04',
            usar_nfse_nacional INTEGER NOT NULL DEFAULT 1
        );
        CREATE INDEX IF NOT EXISTS idx_filiais_nfse_config_filial ON filiais_nfse_config(filial_id);

        -- 58. NFSE_DOCUMENTOS (Notas Fiscais de Serviço Emitidas)
        CREATE TABLE IF NOT EXISTS nfse_documentos (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            filial_id TEXT NOT NULL REFERENCES filiais(id),
            numero_nfse INTEGER,
            numero_rps INTEGER NOT NULL,
            serie_rps TEXT NOT NULL,
            dps_id TEXT NOT NULL,
            chave_acesso_nacional TEXT,
            tomador_cpf_cnpj TEXT NOT NULL,
            tomador_nome TEXT NOT NULL,
            valor_servicos REAL NOT NULL,
            valor_iss REAL NOT NULL,
            aliquota_iss REAL NOT NULL,
            status TEXT NOT NULL DEFAULT 'autorizado',
            xml_dps TEXT,
            xml_nfse TEXT,
            pdf_url TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_nfse_docs_filial ON nfse_documentos(filial_id);
        CREATE INDEX IF NOT EXISTS idx_nfse_docs_status ON nfse_documentos(status);

        -- 59. LLM_PROVIDERS
        CREATE TABLE IF NOT EXISTS llm_providers (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            provider_type TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            api_key_encrypted TEXT,
            api_url TEXT,
            is_active INTEGER NOT NULL DEFAULT 1,
            default_model TEXT,
            config_json TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_llm_prov_type ON llm_providers(provider_type);

        -- 60. WHATSAPP_CONFIG
        CREATE TABLE IF NOT EXISTS whatsapp_config (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            filial_id TEXT NOT NULL REFERENCES filiais(id),
            session_name TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'DISCONNECTED',
            api_url TEXT,
            api_key_encrypted TEXT,
            phone_number TEXT,
            auto_reply_enabled INTEGER NOT NULL DEFAULT 0,
            webhook_secret TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_wa_config_filial ON whatsapp_config(filial_id);

        -- 61. FUNCIONARIOS
        CREATE TABLE IF NOT EXISTS funcionarios (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,
            -- Dados Pessoais
            codigo TEXT NOT NULL UNIQUE,
            nome TEXT NOT NULL,
            apelido TEXT,
            tipo_pessoa TEXT NOT NULL DEFAULT 'FISICA',
            cpf_cnpj TEXT,
            rg TEXT,
            cnh TEXT,
            data_nascimento TEXT,
            estado_civil TEXT,
            genero TEXT,
            email TEXT,
            telefone TEXT,
            celular TEXT,
            cep TEXT,
            endereco TEXT,
            numero TEXT,
            complemento TEXT,
            bairro TEXT,
            cidade TEXT,
            uf TEXT DEFAULT 'MS',
            observacoes TEXT,
            -- Profissional & RH
            tipo_funcionario TEXT NOT NULL DEFAULT 'FUNCIONARIO',
            cargo TEXT,
            departamento TEXT,
            salario REAL DEFAULT 0.00,
            data_admissao TEXT,
            data_demissao TEXT,
            formacao TEXT,
            pis_pasep TEXT,
            ctps_numero TEXT,
            ctps_serie TEXT,
            -- Acesso ao Sistema
            username TEXT UNIQUE,
            password_hash TEXT,
            grupo_acesso_id TEXT,
            tem_acesso_sistema INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'ATIVO',
            forcar_troca_senha INTEGER DEFAULT 0,
            data_validade_acesso TEXT,
            ultimo_login TEXT,
            tentativas_login_falhas INTEGER DEFAULT 0,
            -- Comissões
            vendedor_codigo TEXT,
            tipo_vendedor TEXT,
            comissao_percentual REAL DEFAULT 0.00,
            comissao_tipo_calculo TEXT DEFAULT 'PERCENTUAL_DIRETO',
            comissao_libera_emissao_pct REAL DEFAULT 0.00,
            comissao_libera_baixa_pct REAL DEFAULT 100.00,
            comissao_desconta_icms INTEGER DEFAULT 1,
            comissao_desconta_pis_cofins INTEGER DEFAULT 1,
            comissao_inclui_ipi INTEGER DEFAULT 0,
            comissao_dia_pagamento INTEGER DEFAULT 10,
            supervisor_id TEXT,
            gerente_id TEXT,
            desconto_maximo_permitido REAL DEFAULT 0.00,
            banco_favorecido TEXT,
            agencia TEXT,
            conta_corrente TEXT,
            chave_pix TEXT,
            -- Multi-filial
            empresa_id TEXT NOT NULL,
            filial_padrao_id TEXT,
            acesso_todas_empresas INTEGER DEFAULT 0,
            caixa_pdv_vinculado TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_funcionarios_sync ON funcionarios(x_sync_status, updated_at);
        CREATE INDEX IF NOT EXISTS idx_funcionarios_empresa ON funcionarios(empresa_id);
        CREATE INDEX IF NOT EXISTS idx_funcionarios_username ON funcionarios(username);
        CREATE INDEX IF NOT EXISTS idx_funcionarios_status ON funcionarios(status);

        -- 62. FUNCIONARIOS_FILIAIS
        CREATE TABLE IF NOT EXISTS funcionarios_filiais (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,
            funcionario_id TEXT NOT NULL,
            empresa_id TEXT NOT NULL,
            filial_id TEXT,
            is_default INTEGER DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS idx_func_filiais_sync ON funcionarios_filiais(x_sync_status, updated_at);
        CREATE INDEX IF NOT EXISTS idx_func_filiais_func ON funcionarios_filiais(funcionario_id);

        -- 63. FUNCIONARIOS_METAS
        CREATE TABLE IF NOT EXISTS funcionarios_metas (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,
            funcionario_id TEXT NOT NULL,
            tipo_periodo TEXT NOT NULL DEFAULT 'MENSAL',
            ano INTEGER NOT NULL,
            periodo INTEGER NOT NULL,
            meta_faturamento REAL DEFAULT 0.00,
            meta_quantidade INTEGER DEFAULT 0,
            meta_margem_minima REAL DEFAULT 0.00,
            meta_novos_clientes INTEGER DEFAULT 0,
            categoria_produto_id TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_func_metas_sync ON funcionarios_metas(x_sync_status, updated_at);
        CREATE INDEX IF NOT EXISTS idx_func_metas_func ON funcionarios_metas(funcionario_id);

        -- 64. GRUPOS_ACESSO
        CREATE TABLE IF NOT EXISTS grupos_acesso (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,
            nome TEXT NOT NULL UNIQUE,
            descricao TEXT,
            is_sistema INTEGER DEFAULT 0,
            ativo INTEGER DEFAULT 1,
            percentual_max_desconto REAL DEFAULT 5.0
        );
        CREATE INDEX IF NOT EXISTS idx_grupos_acesso_sync ON grupos_acesso(x_sync_status, updated_at);

        -- 65. GRUPOS_ACESSO_PERMISSOES
        CREATE TABLE IF NOT EXISTS grupos_acesso_permissoes (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,
            grupo_id TEXT NOT NULL,
            permissao_key TEXT NOT NULL,
            concedida INTEGER NOT NULL DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS idx_grupos_perm_sync ON grupos_acesso_permissoes(x_sync_status, updated_at);
        CREATE INDEX IF NOT EXISTS idx_grupos_perm_grupo ON grupos_acesso_permissoes(grupo_id);

        -- 66. VEICULOS
        CREATE TABLE IF NOT EXISTS veiculos (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            empresa_id TEXT NOT NULL REFERENCES empresas(id),
            placa TEXT NOT NULL,
            uf_placa TEXT NOT NULL DEFAULT 'MS',
            renavam TEXT,
            tipo_veiculo TEXT NOT NULL DEFAULT 'TRUCK', -- 'TOCO', 'TRUCK', 'CAVALO_MECANICO', 'UTILITARIO', 'VAN'
            tipo_carroceria TEXT NOT NULL DEFAULT 'BAU', -- 'ABERTA', 'BAU', 'SIDER', 'GRANELEIRO', 'TANQUE', 'FRIGORIFICO'
            tipo_rodado TEXT NOT NULL DEFAULT '01', -- '01' Truck, '02' Toco, '03' Cavalo Mecanico, '04' Van, '05' Utilitario
            tara_kg REAL NOT NULL DEFAULT 0.0,
            capacidade_kg REAL NOT NULL DEFAULT 0.0,
            capacidade_m3 REAL DEFAULT 0.0,
            rntrc TEXT,
            tipo_propriedade TEXT NOT NULL DEFAULT 'PROPRIO', -- 'PROPRIO', 'TERCEIRO', 'ARRENDADO'
            proprietario_cpf_cnpj TEXT,
            proprietario_nome TEXT,
            proprietario_rntrc TEXT,
            proprietario_ie TEXT,
            proprietario_uf TEXT,
            proprietario_tipo TEXT DEFAULT 'TAC', -- 'TAC', 'ETC', 'CTC'
            ano_fabricacao INTEGER,
            ano_modelo INTEGER,
            marca TEXT,
            modelo TEXT,
            cor TEXT,
            chassi TEXT,
            ativo INTEGER NOT NULL DEFAULT 1
        );
        CREATE INDEX IF NOT EXISTS idx_veiculos_sync ON veiculos(x_sync_status, updated_at);
        CREATE INDEX IF NOT EXISTS idx_veiculos_placa ON veiculos(placa);
        CREATE INDEX IF NOT EXISTS idx_veiculos_empresa ON veiculos(empresa_id);

        -- 67. VEICULOS_REBOQUES
        CREATE TABLE IF NOT EXISTS veiculos_reboques (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            veiculo_trator_id TEXT NOT NULL REFERENCES veiculos(id) ON DELETE CASCADE,
            placa TEXT NOT NULL,
            uf_placa TEXT NOT NULL DEFAULT 'MS',
            renavam TEXT,
            tara_kg REAL NOT NULL DEFAULT 0.0,
            capacidade_kg REAL NOT NULL DEFAULT 0.0,
            tipo_carroceria TEXT NOT NULL DEFAULT 'BAU',
            proprietario_cpf_cnpj TEXT,
            proprietario_nome TEXT,
            proprietario_rntrc TEXT,
            proprietario_ie TEXT,
            proprietario_uf TEXT,
            proprietario_tipo TEXT DEFAULT 'TAC'
        );
        CREATE INDEX IF NOT EXISTS idx_veiculos_reboques_sync ON veiculos_reboques(x_sync_status, updated_at);
        CREATE INDEX IF NOT EXISTS idx_veiculos_reboques_trator ON veiculos_reboques(veiculo_trator_id);

        -- 68. MOTORISTAS
        CREATE TABLE IF NOT EXISTS motoristas (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            empresa_id TEXT NOT NULL REFERENCES empresas(id),
            cpf TEXT NOT NULL,
            nome TEXT NOT NULL,
            rg TEXT,
            cnh_numero TEXT NOT NULL,
            cnh_categoria TEXT NOT NULL DEFAULT 'E', -- 'A', 'B', 'C', 'D', 'E', 'AB', 'AC', 'AD', 'AE'
            cnh_validade TEXT NOT NULL,
            cnh_uf_emissao TEXT DEFAULT 'MS',
            rntrc TEXT,
            rntrc_validade TEXT,
            telefone TEXT,
            celular TEXT,
            email TEXT,
            cep TEXT,
            endereco TEXT,
            numero TEXT,
            bairro TEXT,
            cidade TEXT,
            uf TEXT DEFAULT 'MS',
            banco TEXT,
            agencia TEXT,
            conta TEXT,
            tipo_conta TEXT DEFAULT 'CORRENTE',
            chave_pix TEXT,
            tipo_vinculo TEXT NOT NULL DEFAULT 'PROPRIO', -- 'PROPRIO', 'TERCEIRO', 'AGREGADO'
            funcionario_id TEXT REFERENCES funcionarios(id),
            ativo INTEGER NOT NULL DEFAULT 1
        );
        CREATE INDEX IF NOT EXISTS idx_motoristas_sync ON motoristas(x_sync_status, updated_at);
        CREATE INDEX IF NOT EXISTS idx_motoristas_cpf ON motoristas(cpf);
        CREATE INDEX IF NOT EXISTS idx_motoristas_empresa ON motoristas(empresa_id);

        -- 69. SEGURADORAS
        CREATE TABLE IF NOT EXISTS seguradoras (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            empresa_id TEXT NOT NULL REFERENCES empresas(id),
            cnpj TEXT NOT NULL,
            razao_social TEXT NOT NULL,
            nome_fantasia TEXT,
            telefone TEXT,
            email TEXT,
            ativo INTEGER NOT NULL DEFAULT 1
        );
        CREATE INDEX IF NOT EXISTS idx_seguradoras_sync ON seguradoras(x_sync_status, updated_at);

        -- 70. APOLICES_SEGURO
        CREATE TABLE IF NOT EXISTS apolices_seguro (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            seguradora_id TEXT NOT NULL REFERENCES seguradoras(id),
            empresa_id TEXT NOT NULL REFERENCES empresas(id),
            tipo_seguro TEXT NOT NULL DEFAULT 'RCTR_C', -- 'RCTR_C', 'RCF_DC', 'RCTV_C'
            numero_apolice TEXT NOT NULL,
            data_inicio_vigencia TEXT NOT NULL,
            data_fim_vigencia TEXT NOT NULL,
            valor_limite_cobertura REAL DEFAULT 0.0,
            ativo INTEGER NOT NULL DEFAULT 1
        );
        CREATE INDEX IF NOT EXISTS idx_apolices_sync ON apolices_seguro(x_sync_status, updated_at);

        -- 71. TABELAS_FRETE
        CREATE TABLE IF NOT EXISTS tabelas_frete (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            empresa_id TEXT NOT NULL REFERENCES empresas(id),
            nome TEXT NOT NULL,
            tipo_calculo TEXT NOT NULL DEFAULT 'PESO', -- 'PESO', 'VALOR_NF', 'FIXO', 'POR_KM'
            valor_kg REAL DEFAULT 0.0,
            valor_minimo REAL DEFAULT 0.0,
            percentual_ad_valorem REAL DEFAULT 0.0,
            percentual_gris REAL DEFAULT 0.0,
            taxa_dificuldade_entrega REAL DEFAULT 0.0,
            inclui_pedagio INTEGER DEFAULT 1,
            ativo INTEGER NOT NULL DEFAULT 1
        );
        CREATE INDEX IF NOT EXISTS idx_tabelas_frete_sync ON tabelas_frete(x_sync_status, updated_at);

        -- 72. ROTAS_TRANSPORTE
        CREATE TABLE IF NOT EXISTS rotas_transporte (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            empresa_id TEXT NOT NULL REFERENCES empresas(id),
            nome TEXT NOT NULL,
            uf_origem TEXT NOT NULL,
            municipio_origem TEXT NOT NULL,
            cod_ibge_origem TEXT,
            uf_destino TEXT NOT NULL,
            municipio_destino TEXT NOT NULL,
            cod_ibge_destino TEXT,
            distancia_km REAL DEFAULT 0.0,
            tempo_estimado_horas REAL DEFAULT 0.0,
            valor_pedagio_estimado REAL DEFAULT 0.0,
            ativo INTEGER NOT NULL DEFAULT 1
        );
        CREATE INDEX IF NOT EXISTS idx_rotas_transporte_sync ON rotas_transporte(x_sync_status, updated_at);

        -- 73. PEDAGIOS_ROTA
        CREATE TABLE IF NOT EXISTS pedagios_rota (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            rota_id TEXT NOT NULL REFERENCES rotas_transporte(id) ON DELETE CASCADE,
            concessionaria_cnpj TEXT NOT NULL,
            concessionaria_nome TEXT NOT NULL,
            nome_praca TEXT NOT NULL,
            valor_eixo REAL NOT NULL DEFAULT 0.0,
            ativo INTEGER NOT NULL DEFAULT 1
        );
        CREATE INDEX IF NOT EXISTS idx_pedagios_rota_sync ON pedagios_rota(x_sync_status, updated_at);

        -- 74. CTE_DOCUMENTOS (Conhecimento de Transporte Eletrônico Mod. 57)
        CREATE TABLE IF NOT EXISTS cte_documentos (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            filial_id TEXT NOT NULL REFERENCES filiais(id),
            numero_cte INTEGER NOT NULL,
            serie INTEGER NOT NULL DEFAULT 1,
            chave_acesso TEXT UNIQUE,
            cfop TEXT NOT NULL DEFAULT '5353',
            natureza_operacao TEXT NOT NULL DEFAULT 'PRESTACAO DE SERVICO DE TRANSPORTE',
            tipo_cte INTEGER NOT NULL DEFAULT 0, -- 0-Normal, 1-Complementar, 3-Substituição
            tipo_servico INTEGER NOT NULL DEFAULT 0, -- 0-Normal, 1-Subcontratação, 2-Redespacho, 3-Redespacho Intermediário, 4-Multimodal
            modal TEXT NOT NULL DEFAULT '01', -- 01-Rodoviário, 02-Aéreo, 03-Aquaviário, 04-Ferroviário, 05-Dutoviário, 06-Multimodal
            data_emissao TEXT NOT NULL,
            hora_emissao TEXT NOT NULL,
            uf_inicio TEXT NOT NULL,
            municipio_inicio TEXT NOT NULL,
            cod_ibge_inicio TEXT,
            uf_fim TEXT NOT NULL,
            municipio_fim TEXT NOT NULL,
            cod_ibge_fim TEXT,

            remetente_id TEXT REFERENCES pessoas(id),
            destinatario_id TEXT REFERENCES pessoas(id),
            expedidor_id TEXT REFERENCES pessoas(id),
            recebedor_id TEXT REFERENCES pessoas(id),
            tomador_tipo INTEGER NOT NULL DEFAULT 3, -- 0-Remetente, 1-Expedidor, 2-Recebedor, 3-Destinatário, 4-Outros
            tomador_id TEXT REFERENCES pessoas(id),

            veiculo_id TEXT REFERENCES veiculos(id),
            motorista_id TEXT REFERENCES motoristas(id),
            rntrc TEXT,

            valor_total_prestacao REAL NOT NULL DEFAULT 0.0,
            valor_receber REAL NOT NULL DEFAULT 0.0,
            valor_carga REAL NOT NULL DEFAULT 0.0,
            produto_predominante TEXT NOT NULL DEFAULT 'MERCADORIAS DIVERSAS',
            peso_bruto_carga_kg REAL NOT NULL DEFAULT 0.0,

            icms_cst TEXT NOT NULL DEFAULT '00',
            icms_base_calculo REAL DEFAULT 0.0,
            icms_aliquota REAL DEFAULT 0.0,
            icms_valor REAL DEFAULT 0.0,
            icms_reducao_bc REAL DEFAULT 0.0,
            crt_emitente INTEGER NOT NULL DEFAULT 1,

            info_complementar TEXT,
            ambiente INTEGER NOT NULL DEFAULT 2, -- 1-Produção, 2-Homologação
            status_sefaz TEXT NOT NULL DEFAULT 'DIGITACAO', -- 'DIGITACAO', 'AUTORIZADO', 'CANCELADO', 'REJEITADO', 'CONTINGENCIA'
            mensagem_sefaz TEXT,
            protocolo_autorizacao TEXT,
            data_autorizacao TEXT,
            xml_envio TEXT,
            xml_retorno TEXT,
            dacte_pdf_path TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_cte_docs_sync ON cte_documentos(x_sync_status, updated_at);
        CREATE INDEX IF NOT EXISTS idx_cte_docs_filial ON cte_documentos(filial_id);
        CREATE INDEX IF NOT EXISTS idx_cte_docs_chave ON cte_documentos(chave_acesso);
        CREATE INDEX IF NOT EXISTS idx_cte_docs_status ON cte_documentos(status_sefaz);

        -- 75. CTE_DOCUMENTOS_NFE
        CREATE TABLE IF NOT EXISTS cte_documentos_nfe (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            cte_id TEXT NOT NULL REFERENCES cte_documentos(id) ON DELETE CASCADE,
            chave_nfe TEXT NOT NULL,
            pin_suframa TEXT,
            data_prevista_entrega TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_cte_nfe_sync ON cte_documentos_nfe(x_sync_status, updated_at);
        CREATE INDEX IF NOT EXISTS idx_cte_nfe_cte ON cte_documentos_nfe(cte_id);
        CREATE INDEX IF NOT EXISTS idx_cte_nfe_chave ON cte_documentos_nfe(chave_nfe);

        -- 76. CTE_COMPONENTES_VALOR
        CREATE TABLE IF NOT EXISTS cte_componentes_valor (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            cte_id TEXT NOT NULL REFERENCES cte_documentos(id) ON DELETE CASCADE,
            nome TEXT NOT NULL, -- 'FRETE_PESO', 'FRETE_VALOR', 'PEDAGIO', 'GRIS', 'AD_VALOREM', 'OUTROS'
            valor REAL NOT NULL DEFAULT 0.0
        );
        CREATE INDEX IF NOT EXISTS idx_cte_comp_sync ON cte_componentes_valor(x_sync_status, updated_at);
        CREATE INDEX IF NOT EXISTS idx_cte_comp_cte ON cte_componentes_valor(cte_id);

        -- 77. CTE_EVENTOS
        CREATE TABLE IF NOT EXISTS cte_eventos (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            cte_id TEXT NOT NULL REFERENCES cte_documentos(id) ON DELETE CASCADE,
            tipo_evento TEXT NOT NULL, -- 'CANCELAMENTO', 'CARTA_CORRECAO', 'EPEC', 'DESACORDO', 'COMPROVANTE_ENTREGA'
            sequencia INTEGER NOT NULL DEFAULT 1,
            data_evento TEXT NOT NULL,
            protocolo TEXT,
            justificativa TEXT,
            xml_evento TEXT,
            xml_retorno TEXT,
            status_retorno INTEGER
        );
        CREATE INDEX IF NOT EXISTS idx_cte_eventos_sync ON cte_eventos(x_sync_status, updated_at);
        CREATE INDEX IF NOT EXISTS idx_cte_eventos_cte ON cte_eventos(cte_id);

        -- 78. OPERACOES_TRANSPORTE (Viagens que consolidam CT-e + MDF-e + CIOT)
        CREATE TABLE IF NOT EXISTS operacoes_transporte (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            filial_id TEXT NOT NULL REFERENCES filiais(id),
            numero_viagem INTEGER NOT NULL,
            data_saida TEXT NOT NULL,
            data_chegada_prevista TEXT,
            data_chegada_real TEXT,
            veiculo_id TEXT REFERENCES veiculos(id),
            motorista_id TEXT REFERENCES motoristas(id),
            rota_id TEXT REFERENCES rotas_transporte(id),
            uf_origem TEXT NOT NULL,
            municipio_origem TEXT NOT NULL,
            cod_ibge_origem TEXT,
            uf_destino TEXT NOT NULL,
            municipio_destino TEXT NOT NULL,
            cod_ibge_destino TEXT,
            peso_total_kg REAL NOT NULL DEFAULT 0.0,
            valor_total_carga REAL NOT NULL DEFAULT 0.0,
            valor_frete REAL NOT NULL DEFAULT 0.0,
            valor_pedagio REAL DEFAULT 0.0,
            ciot_numero TEXT,
            ciot_status TEXT NOT NULL DEFAULT 'PENDENTE', -- 'PENDENTE', 'EMITIDO', 'ENCERRADO', 'CANCELADO'
            ciot_ipef TEXT DEFAULT 'PAMCARD', -- 'PAMCARD', 'REPOM', 'NDDCARGO', 'SEMPARAR', 'ANTT_DIRETO'
            mdfe_id TEXT,
            status_viagem TEXT NOT NULL DEFAULT 'PLANEJADA', -- 'PLANEJADA', 'EM_CARREGAMENTO', 'EM_TRANSITO', 'ENTREGUE', 'ENCERRADA', 'CANCELADA'
            tabela_frete_id TEXT REFERENCES tabelas_frete(id),
            apolice_seguro_id TEXT REFERENCES apolices_seguro(id),
            numero_averbacao TEXT,
            observacoes TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_op_transp_sync ON operacoes_transporte(x_sync_status, updated_at);
        CREATE INDEX IF NOT EXISTS idx_op_transp_filial ON operacoes_transporte(filial_id);
        CREATE INDEX IF NOT EXISTS idx_op_transp_status ON operacoes_transporte(status_viagem);
        CREATE INDEX IF NOT EXISTS idx_op_transp_ciot ON operacoes_transporte(ciot_numero);

        -- 79. OPERACOES_TRANSPORTE_CTES
        CREATE TABLE IF NOT EXISTS operacoes_transporte_ctes (
            id TEXT PRIMARY KEY NOT NULL,
            device_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            x_sync_status TEXT NOT NULL DEFAULT 'pending',
            x_version INTEGER NOT NULL DEFAULT 1,
            is_deleted INTEGER NOT NULL DEFAULT 0,

            operacao_id TEXT NOT NULL REFERENCES operacoes_transporte(id) ON DELETE CASCADE,
            cte_id TEXT NOT NULL REFERENCES cte_documentos(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_op_ctes_sync ON operacoes_transporte_ctes(x_sync_status, updated_at);
        CREATE INDEX IF NOT EXISTS idx_op_ctes_op ON operacoes_transporte_ctes(operacao_id);
        ",
    )?;

    // Executa migração de colunas dinamicamente para bancos de dados que já existiam no disco
    migrate_pessoas_columns(conn)?;
    migrate_empresas_columns(conn)?;
    migrate_filiais_nfe_config_columns(conn)?;
    migrate_filiais_nfce_config_columns(conn)?;
    migrate_filiais_nfse_config_columns(conn)?;
    migrate_audit_logs_remove_fk(conn)?;
    migrate_grupos_permissoes_granular(conn)?;

    info!("Schema DDL executado com sucesso. Todas as 79 tabelas criadas e migradas.");

    if let Err(e) = seed_default_enterprise_and_foundations(conn) {
        tracing::error!("Erro ao seedar dados mestres de empresa e transportes: {}", e);
    }

    if let Err(e) = seed_admin_user(conn) {
        tracing::error!("Erro ao seedar usuário admin: {}", e);
    }

    Ok(())
}

fn migrate_empresas_columns(conn: &Connection) -> Result<()> {
    let mut stmt = conn.prepare("PRAGMA table_info(empresas)")?;
    let existing_cols: Vec<String> = stmt
        .query_map([], |r| r.get(1))?
        .filter_map(|r| r.ok())
        .collect();

    let new_columns = vec![
        ("inscricao_municipal", "TEXT"),
        ("cnae_principal", "TEXT"),
        ("cnae_secundarios", "TEXT"),
        ("crt", "INTEGER DEFAULT 1"),
        ("regime_pis_cofins", "TEXT DEFAULT 'CUMULATIVO'"),
        ("regime_apuracao", "TEXT DEFAULT 'LUCRO_PRESUMIDO'"),
        ("aliquota_simples_anexo", "REAL DEFAULT 4.0"),
        ("p_cred_sn", "REAL DEFAULT 1.25"),
        ("suframa", "TEXT"),
        ("nire", "TEXT"),
        ("natureza_juridica", "TEXT"),
        ("logradouro", "TEXT"),
        ("numero", "TEXT"),
        ("complemento", "TEXT"),
        ("bairro", "TEXT"),
        ("cidade", "TEXT"),
        ("uf", "TEXT"),
        ("cep", "TEXT"),
        ("cod_municipio_ibge", "TEXT"),
        ("pais", "TEXT DEFAULT 'BRASIL'"),
        ("cod_pais_bacen", "TEXT DEFAULT '1058'"),
        ("telefone_1", "TEXT"),
        ("telefone_2", "TEXT"),
        ("email", "TEXT"),
        ("email_fiscal", "TEXT"),
        ("site", "TEXT"),
        ("responsavel", "TEXT"),
        ("logo_base64", "TEXT"),
        ("certificado_a1_alias", "TEXT"),
        ("certificado_a1_validade", "TEXT"),
        ("nicho_empresa", "TEXT DEFAULT 'VAREJO'"),
        ("praca", "TEXT"),
    ];

    for (col_name, col_def) in new_columns {
        if !existing_cols.contains(&col_name.to_string()) {
            let alter_sql = format!("ALTER TABLE empresas ADD COLUMN {} {};", col_name, col_def);
            let _ = conn.execute(&alter_sql, []);
        }
    }

    Ok(())
}

fn migrate_pessoas_columns(conn: &Connection) -> Result<()> {
    let mut stmt = conn.prepare("PRAGMA table_info(pessoas)")?;
    let existing_cols: Vec<String> = stmt
        .query_map([], |r| r.get(1))?
        .filter_map(|r| r.ok())
        .collect();

    let new_columns = vec![
        ("tipo_cadastro", "TEXT DEFAULT 'CLIENTE'"),
        ("nome_fantasia", "TEXT"),
        ("foto_base64", "TEXT"),
        ("codigo_interno", "TEXT"),
        ("sexo", "TEXT"),
        ("rg", "TEXT"),
        ("rg_orgao_emissor", "TEXT"),
        ("rg_data_emissao", "TEXT"),
        ("data_nascimento", "TEXT"),
        ("naturalidade", "TEXT"),
        ("estado_civil", "TEXT"),
        ("nome_mae", "TEXT"),
        ("profissao", "TEXT"),
        ("inscricao_estadual", "TEXT"),
        ("inscricao_municipal", "TEXT"),
        ("inscricao_suframa", "TEXT"),
        ("cnae_principal", "TEXT"),
        ("data_fundacao", "TEXT"),
        ("optante_simples", "INTEGER DEFAULT 0"),
        ("cep", "TEXT"),
        ("logradouro", "TEXT"),
        ("numero", "TEXT"),
        ("complemento", "TEXT"),
        ("bairro", "TEXT"),
        ("municipio", "TEXT"),
        ("uf", "TEXT"),
        ("codigo_ibge", "TEXT"),
        ("pais", "TEXT DEFAULT 'BRASIL'"),
        ("email_principal", "TEXT"),
        ("email_financeiro", "TEXT"),
        ("telefone_fixo", "TEXT"),
        ("celular", "TEXT"),
        ("whatsapp", "TEXT"),
        ("site", "TEXT"),
        ("limite_credito", "REAL DEFAULT 5000.0"),
        ("limite_credito_validade", "TEXT"),
        ("classificacao_credito", "TEXT DEFAULT 'NAO_DEFINIDO'"),
        ("dia_vencimento_preferencial", "INTEGER"),
        ("dias_aviso_antes_vencimento", "INTEGER"),
        ("data_ultima_compra", "TEXT"),
        ("score_credito", "INTEGER DEFAULT 700"),
        ("vendedor_id", "TEXT"),
        ("regiao", "TEXT"),
        ("convenio", "TEXT"),
        ("classe", "TEXT"),
        ("tabela_preco_id", "TEXT"),
        ("condicao_pgto_padrao", "TEXT"),
        ("contribuinte_icms", "TEXT DEFAULT 'NAO_CONTRIBUINTE'"),
        ("substituto_tributario", "INTEGER DEFAULT 0"),
        ("consumidor_final", "INTEGER DEFAULT 1"),
        ("observacoes", "TEXT"),
        ("observacoes_internas", "TEXT"),
        ("bloqueado", "INTEGER DEFAULT 0"),
        ("motivo_bloqueio", "TEXT"),
    ];

    for (col_name, col_def) in new_columns {
        if !existing_cols.contains(&col_name.to_string()) {
            let alter_sql = format!("ALTER TABLE pessoas ADD COLUMN {} {};", col_name, col_def);
            let _ = conn.execute(&alter_sql, []);
        }
    }

    let _ = conn.execute("CREATE INDEX IF NOT EXISTS idx_pessoas_tipo_cad ON pessoas(tipo_cadastro);", []);

    Ok(())
}

fn migrate_filiais_nfe_config_columns(conn: &Connection) -> Result<()> {
    let mut stmt = conn.prepare("PRAGMA table_info(filiais_nfe_config)")?;
    let existing_cols: Vec<String> = stmt
        .query_map([], |r| r.get(1))?
        .filter_map(|r| r.ok())
        .collect();

    let new_columns = vec![
        ("tp_imp_danfe", "INTEGER DEFAULT 1"),
        ("tp_emis_nfe", "INTEGER DEFAULT 1"),
        ("ind_sinc", "INTEGER DEFAULT 1"),
        ("versao_xml", "TEXT DEFAULT '4.00'"),
        ("logo_danfe_path", "TEXT"),
        ("xml_storage_path", "TEXT"),
        ("resp_tec_cnpj", "TEXT"),
        ("resp_tec_contato", "TEXT"),
        ("resp_tec_email", "TEXT"),
        ("resp_tec_fone", "TEXT"),
        ("resp_tec_id_csrt", "TEXT"),
        ("resp_tec_csrt", "TEXT"),
    ];

    for (col_name, col_def) in new_columns {
        if !existing_cols.contains(&col_name.to_string()) {
            let alter_sql = format!("ALTER TABLE filiais_nfe_config ADD COLUMN {} {};", col_name, col_def);
            let _ = conn.execute(&alter_sql, []);
        }
    }

    Ok(())
}

fn migrate_filiais_nfce_config_columns(conn: &Connection) -> Result<()> {
    let mut stmt = conn.prepare("PRAGMA table_info(filiais_nfce_config)")?;
    let existing_cols: Vec<String> = stmt
        .query_map([], |r| r.get(1))?
        .filter_map(|r| r.ok())
        .collect();

    let new_columns = vec![
        ("csc_id", "TEXT"),
        ("csc_token", "TEXT"),
        ("tp_emis_nfce", "INTEGER DEFAULT 1"),
        ("modelo_danfe_nfce", "TEXT DEFAULT 'PADRAO'"),
        ("tp_imp_danfe_nfce", "INTEGER DEFAULT 1"),
        ("versao_qrcode", "TEXT DEFAULT '2.00'"),
        ("qrcode_contingencia", "TEXT DEFAULT '2.00'"),
        ("usar_tef", "INTEGER DEFAULT 0"),
        ("fuso_horario", "TEXT DEFAULT '-03:00'"),
        ("mostrar_troco", "INTEGER DEFAULT 1"),
        ("enviar_codigo_barras", "INTEGER DEFAULT 1"),
        ("contingencia_timeout_ms", "INTEGER DEFAULT 5000"),
        ("xml_storage_path", "TEXT"),
        ("logo_danfce_path", "TEXT"),
    ];

    for (col_name, col_def) in new_columns {
        if !existing_cols.contains(&col_name.to_string()) {
            let alter_sql = format!("ALTER TABLE filiais_nfce_config ADD COLUMN {} {};", col_name, col_def);
            let _ = conn.execute(&alter_sql, []);
        }
    }

    Ok(())
}

fn migrate_filiais_nfse_config_columns(conn: &Connection) -> Result<()> {
    let mut stmt = conn.prepare("PRAGMA table_info(filiais_nfse_config)")?;
    let existing_cols: Vec<String> = stmt
        .query_map([], |r| r.get(1))?
        .filter_map(|r| r.ok())
        .collect();

    let new_columns = vec![
        ("ambiente_nfse", "INTEGER DEFAULT 2"),
        ("provedor_nfse", "TEXT DEFAULT 'NACIONAL'"),
        ("url_ws_producao", "TEXT"),
        ("url_ws_homologacao", "TEXT"),
        ("usuario_ws", "TEXT"),
        ("senha_ws", "TEXT"),
        ("token_ws", "TEXT"),
        ("serie_rps", "TEXT DEFAULT '1'"),
        ("proximo_numero_rps", "INTEGER DEFAULT 1"),
        ("tipo_rps", "INTEGER DEFAULT 1"),
        ("regime_especial_tributacao", "INTEGER DEFAULT 1"),
        ("natureza_operacao", "INTEGER DEFAULT 1"),
        ("item_lista_servico", "TEXT DEFAULT '14.01'"),
        ("cod_tributacao_municipio", "TEXT"),
        ("cnae_servico", "TEXT DEFAULT '6201501'"),
        ("aliquota_iss", "REAL DEFAULT 2.00"),
        ("iss_retido", "INTEGER DEFAULT 2"),
        ("responsavel_retencao", "INTEGER DEFAULT 1"),
        ("incentivador_cultural", "INTEGER DEFAULT 2"),
        ("optante_simples_nfse", "INTEGER DEFAULT 1"),
        ("xml_storage_path", "TEXT"),
        ("logo_danfse_path", "TEXT"),
        ("versao_abrasf", "TEXT DEFAULT '2.04'"),
        ("usar_nfse_nacional", "INTEGER DEFAULT 1"),
    ];

    for (col_name, col_def) in new_columns {
        if !existing_cols.contains(&col_name.to_string()) {
            let alter_sql = format!("ALTER TABLE filiais_nfse_config ADD COLUMN {} {};", col_name, col_def);
            let _ = conn.execute(&alter_sql, []);
        }
    }

    Ok(())
}

fn migrate_audit_logs_remove_fk(conn: &Connection) -> Result<()> {
    // Verifica se a tabela audit_logs tem FK para usuarios checando a SQL de criação
    let table_sql: String = conn
        .query_row(
            "SELECT sql FROM sqlite_master WHERE type='table' AND name='audit_logs'",
            [],
            |r| r.get(0),
        )
        .unwrap_or_default();

    if table_sql.contains("REFERENCES usuarios") {
        info!("Migrando audit_logs: removendo FK para usuarios...");
        conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS audit_logs_new (
                id TEXT PRIMARY KEY NOT NULL,
                device_id TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                x_sync_status TEXT NOT NULL DEFAULT 'pending',
                x_version INTEGER NOT NULL DEFAULT 1,
                is_deleted INTEGER NOT NULL DEFAULT 0,
                usuario_id TEXT,
                usuario_nome TEXT,
                acao TEXT NOT NULL,
                recurso TEXT NOT NULL,
                detalhes TEXT
            );
            INSERT INTO audit_logs_new SELECT * FROM audit_logs;
            DROP TABLE audit_logs;
            ALTER TABLE audit_logs_new RENAME TO audit_logs;
            CREATE INDEX IF NOT EXISTS idx_audit_logs_sync ON audit_logs(x_sync_status, updated_at);
            "
        )?;
        info!("Migração audit_logs concluída.");
    }

    Ok(())
}

fn migrate_grupos_permissoes_granular(conn: &Connection) -> Result<()> {
    let table_sql: String = conn
        .query_row(
            "SELECT sql FROM sqlite_master WHERE type='table' AND name='grupos_acesso_permissoes'",
            [],
            |r| r.get(0),
        )
        .unwrap_or_default();

    if table_sql.contains("modulo") || !table_sql.contains("permissao_key") {
        info!("Migrando grupos_acesso_permissoes para estrutura granular...");
        conn.execute_batch(
            "
            DROP TABLE IF EXISTS grupos_acesso_permissoes;
            CREATE TABLE IF NOT EXISTS grupos_acesso_permissoes (
                id TEXT PRIMARY KEY NOT NULL,
                device_id TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                x_sync_status TEXT NOT NULL DEFAULT 'pending',
                x_version INTEGER NOT NULL DEFAULT 1,
                is_deleted INTEGER NOT NULL DEFAULT 0,
                grupo_id TEXT NOT NULL,
                permissao_key TEXT NOT NULL,
                concedida INTEGER NOT NULL DEFAULT 0
            );
            CREATE INDEX IF NOT EXISTS idx_grupos_perm_sync ON grupos_acesso_permissoes(x_sync_status, updated_at);
            CREATE INDEX IF NOT EXISTS idx_grupos_perm_grupo ON grupos_acesso_permissoes(grupo_id);
            CREATE INDEX IF NOT EXISTS idx_grupos_perm_key ON grupos_acesso_permissoes(grupo_id, permissao_key);
            "
        )?;

        // Re-seeda as permissões para o grupo Administrador
        let now = chrono::Utc::now().to_rfc3339();
        let device_id = "migration-system";
        seed_granular_permissions_for_group(conn, "grupo-admin-001", device_id, &now)?;
        info!("Migração granular de permissões concluída com sucesso.");
    } else {
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_grupos_perm_key ON grupos_acesso_permissoes(grupo_id, permissao_key)",
            [],
        )?;
    }

    Ok(())
}

pub const ALL_PERMISSOES_CATALOG: &[&str] = &[
    // PDV
    "pdv.abrir_caixa",
    "pdv.fechar_caixa",
    "pdv.vender",
    "pdv.cancelar_venda",
    "pdv.aplicar_desconto",
    "pdv.permitir_desconto_acima_alcada",
    "pdv.sangria",
    "pdv.suprimento",
    "pdv.venda_contingencia",
    "pdv.retransmitir_contingencia",
    "pdv.venda_crediario",
    // Vendas & Pedidos
    "vendas.criar_pedido",
    "vendas.editar_pedido",
    "vendas.excluir_pedido",
    "vendas.aprovar_pedido",
    "vendas.faturar_nfe",
    "vendas.emitir_acobertamento",
    "vendas.alterar_preco_venda",
    "vendas.alterar_vendedor",
    "vendas.permitir_desconto_acima_alcada",
    "vendas.reimprimir_danfe",
    // Pré-Venda & Condicional
    "prevenda.emitir_comanda",
    "condicional.emitir_malinha",
    "condicional.faturar",
    "condicional.gerar_vale",
    "condicional.devolver",
    // Clientes & Parceiros
    "clientes.cadastrar",
    "clientes.editar",
    "clientes.excluir",
    "clientes.alterar_limite_credito",
    "clientes.bloquear",
    "clientes.alterar_tipo",
    "clientes.consultar_receita",
    // Catálogo & Produtos
    "produtos.cadastrar",
    "produtos.editar",
    "produtos.excluir",
    "produtos.ver_custo",
    "produtos.alterar_preco",
    "produtos.alterar_preco_lote",
    "produtos.alterar_tributacao",
    "produtos.gerar_etiquetas",
    // Estoque & Depósitos
    "estoque.ver_saldos",
    "estoque.ajustar",
    "estoque.ajustar_lote",
    "estoque.transferir",
    "estoque.balanco_executar",
    "estoque.balanco_ajustar",
    "estoque.entrada_mercadoria",
    "estoque.categorias_marcas",
    // Financeiro Receber
    "fin_receber.visualizar",
    "fin_receber.lancar",
    "fin_receber.liquidar",
    "fin_receber.estornar",
    "fin_receber.renegociar",
    "fin_receber.excluir",
    "fin_receber.emitir_recibo",
    // Financeiro Pagar
    "fin_pagar.visualizar",
    "fin_pagar.lancar",
    "fin_pagar.liquidar",
    "fin_pagar.retencoes",
    "fin_pagar.excluir",
    // Financeiro Geral
    "fin.caixas_gerir",
    "fin.bancos_gerir",
    "fin.ofx_importar",
    "fin.dre_visualizar",
    "fin.fluxo_caixa",
    "fin.pix_boleto",
    // Fiscal NF-e
    "fiscal.nfe_emitir",
    "fiscal.nfe_cancelar",
    "fiscal.nfe_cce",
    "fiscal.nfe_inutilizar",
    "fiscal.nfe_configurar",
    "fiscal.xml_exportar",
    // Fiscal NFC-e
    "fiscal.nfce_cancelar",
    "fiscal.nfce_inutilizar",
    "fiscal.nfce_sync_contingencia",
    "fiscal.nfce_configurar",
    // Fiscal MDF-e
    "fiscal.mdfe_emitir",
    "fiscal.mdfe_encerrar",
    "fiscal.mdfe_cancelar",
    "fiscal.mdfe_condutor",
    // Fiscal Matriz & SPED
    "fiscal.regras_tributarias",
    "fiscal.cfop_gerir",
    "fiscal.sped_gerar",
    // Compras & Fornecedores
    "compras.criar_cotacao",
    "compras.aprovar_pedido",
    "compras.xml_entrada",
    "compras.mde_manifestar",
    "compras.alterar_preco_compra",
    // Ordens de Serviço
    "os.criar",
    "os.editar",
    "os.concluir",
    "os.faturar",
    // Comissões & Metas
    "comissoes.configurar_regras",
    "comissoes.pagar",
    "comissoes.editar_metas",
    // Administração
    "admin.configuracoes_gerais",
    "admin.usuarios_gerir",
    "admin.grupos_gerir",
    "admin.alterar_senha",
    "admin.audit_visualizar",
    "admin.ia_configurar",
    "admin.whatsapp_configurar",
    "admin.backup",
    "admin.series_fiscais",
];

fn seed_granular_permissions_for_group(conn: &Connection, grupo_id: &str, device_id: &str, now: &str) -> Result<()> {
    for perm_key in ALL_PERMISSOES_CATALOG {
        let perm_id = uuid::Uuid::new_v4().to_string();
        conn.execute(
            "INSERT OR IGNORE INTO grupos_acesso_permissoes (
                id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
                grupo_id, permissao_key, concedida
            ) VALUES (?1, ?2, ?3, ?3, 'pending', 1, 0, ?4, ?5, 1)",
            rusqlite::params![perm_id, device_id, now, grupo_id, perm_key],
        )?;
    }
    Ok(())
}

fn seed_admin_user(conn: &Connection) -> Result<()> {
    // Verifica se já existe algum funcionário
    let count: i64 = conn.query_row("SELECT COUNT(*) FROM funcionarios", [], |row| row.get(0)).unwrap_or(0);
    if count > 0 {
        return Ok(());
    }

    info!("Seeding grupo de acesso e usuário admin padrão com permissões granulares...");
    let now = chrono::Utc::now().to_rfc3339();
    let device_id = "seed-system";

    // 1. Criar grupo_acesso admin
    let grupo_id = "grupo-admin-001";
    conn.execute(
        "INSERT OR IGNORE INTO grupos_acesso (
            id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
            nome, descricao, is_sistema, ativo, percentual_max_desconto
        ) VALUES (?1, ?2, ?3, ?3, 'pending', 1, 0, ?4, ?5, 1, 1, 100.0)",
        rusqlite::params![grupo_id, device_id, now, "Administrador", "Acesso total ao sistema"],
    )?;

    // 2. Seeda todas as permissões granulares
    seed_granular_permissions_for_group(conn, grupo_id, device_id, &now)?;

    // 3. Criar senha hash argon2
    use argon2::{Argon2, PasswordHasher, password_hash::{SaltString, rand_core::OsRng}};
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let hash = argon2.hash_password(b"98683818", &salt)
        .map_err(|e| rusqlite::Error::InvalidParameterName(e.to_string()))?.to_string();

    // 4. Pegar a primeira empresa ou usar default
    let empresa_id: String = conn.query_row("SELECT id FROM empresas LIMIT 1", [], |row| row.get(0)).unwrap_or_else(|_| "default".to_string());
    
    // 5. Criar funcionario admin
    let func_id = uuid::Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO funcionarios (
            id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
            codigo, nome, tipo_pessoa, tipo_funcionario, username, password_hash, grupo_acesso_id,
            tem_acesso_sistema, status, empresa_id, desconto_maximo_permitido, acesso_todas_empresas
        ) VALUES (?1, ?2, ?3, ?3, 'pending', 1, 0,
            ?4, ?5, 'FISICA', 'USUARIO', ?6, ?7, ?8, 1, 'ATIVO', ?9, 100.0, 1
        )",
        rusqlite::params![func_id, device_id, now, "001", "Administrador Master", "admin", hash, grupo_id, empresa_id],
    )?;

    Ok(())
}

fn seed_default_enterprise_and_foundations(conn: &Connection) -> Result<()> {
    let now = chrono::Utc::now().to_rfc3339();
    let device_id = "seed-system";

    // 1. Seed Empresas padrão (evita FOREIGN KEY constraint em qualquer tabela)
    let empresas_seeds = vec![
        ("emp_matriz_01", "05.766.577/0001-22", "COLISEU MATERIAIS & DISTRIBUICAO LTDA", "COLISEU MATERIAIS", "283749182"),
        ("default", "05.766.577/0001-22", "EMPRESA PADRAO LTDA", "COLISEU MATERIAIS", "283749182"),
        ("emp-01", "05.766.577/0001-22", "COLISEU MATERIAIS FILIAL 01", "COLISEU MATERIAIS 01", "283749182"),
        ("emp1", "05.766.577/0001-22", "EMPRESA MATRIZ COLISEU", "COLISEU MATRIZ", "283749182"),
        ("emp_default", "05.766.577/0001-22", "EMPRESA PRINCIPAL LTDA", "COLISEU PRINCIPAL", "283749182"),
    ];

    for (emp_id, cnpj, razao, fantasia, ie) in empresas_seeds {
        conn.execute(
            "INSERT OR IGNORE INTO empresas (
                id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
                razao_social, nome_fantasia, cnpj, inscricao_estadual, ativo
            ) VALUES (?1, ?2, ?3, ?3, 'pending', 1, 0, ?4, ?5, ?6, ?7, 1)",
            rusqlite::params![emp_id, device_id, now, razao, fantasia, cnpj, ie],
        )?;
    }

    // 2. Seed Filiais padrão
    let filiais_seeds = vec![
        ("filial_matriz_01", "emp_matriz_01", "MATRIZ DOURADOS", "05.766.577/0001-22"),
        ("fil_matriz_01", "emp_matriz_01", "MATRIZ DOURADOS", "05.766.577/0001-22"),
        ("default", "default", "FILIAL PADRAO", "05.766.577/0001-22"),
        ("filial-01", "emp-01", "FILIAL 01", "05.766.577/0001-22"),
        ("filial_default", "emp_default", "FILIAL PRINCIPAL", "05.766.577/0001-22"),
    ];

    for (fil_id, emp_id, nome, cnpj) in filiais_seeds {
        conn.execute(
            "INSERT OR IGNORE INTO filiais (
                id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
                empresa_id, codigo, nome, cnpj, inscricao_estadual, uf, cidade, ativo
            ) VALUES (?1, ?2, ?3, ?3, 'pending', 1, 0, ?4, '001', ?5, ?6, '283749182', 'MS', 'DOURADOS', 1)",
            rusqlite::params![fil_id, device_id, now, emp_id, nome, cnpj],
        )?;
    }

    // 3. Seed Pessoas básicas (Remetente / Destinatário)
    let pessoas_seeds = vec![
        ("pes_matriz_01", "emp_matriz_01", "PIVETA DIST. DE TINTAS AUTOMOTIVA LTDA", "COLISEU DISTRIBUIDORA", "05.766.577/0001-22", "JURIDICA", "MS", "DOURADOS"),
        ("pes_dest_01", "emp_matriz_01", "AUTO MECANICA & PINTURAS BRASIL LTDA", "AUTO CAR BRASIL", "12.345.678/0001-90", "JURIDICA", "SP", "SAO PAULO"),
    ];

    for (pes_id, emp_id, razao, fantasia, doc, tipo, uf, cidade) in pessoas_seeds {
        conn.execute(
            "INSERT OR IGNORE INTO pessoas (
                id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
                empresa_id, tipo, nome_razaosocial, nome_fantasia, cpf_cnpj, uf, municipio, ativo
            ) VALUES (?1, ?2, ?3, ?3, 'pending', 1, 0, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 1)",
            rusqlite::params![pes_id, device_id, now, emp_id, tipo, razao, fantasia, doc, uf, cidade],
        )?;
    }

    // 4. Seed Seguradoras & Apólices
    conn.execute(
        "INSERT OR IGNORE INTO seguradoras (
            id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
            empresa_id, cnpj, razao_social, nome_fantasia, telefone, email, ativo
        ) VALUES ('seg_porto_01', ?1, ?2, ?2, 'pending', 1, 0, 'emp_matriz_01', '61.198.164/0001-60', 'PORTO SEGURO CIA DE SEGUROS GERAIS', 'PORTO SEGURO', '(67) 3421-9000', 'seguros@portoseguro.com.br', 1)",
        rusqlite::params![device_id, now],
    )?;

    conn.execute(
        "INSERT OR IGNORE INTO seguradoras (
            id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
            empresa_id, cnpj, razao_social, nome_fantasia, telefone, email, ativo
        ) VALUES ('seg_tokio_01', ?1, ?2, ?2, 'pending', 1, 0, 'emp_matriz_01', '33.164.021/0001-00', 'TOKIO MARINE SEGURADORA S.A.', 'TOKIO MARINE', '(11) 3000-4000', 'atendimento@tokiomarine.com.br', 1)",
        rusqlite::params![device_id, now],
    )?;

    conn.execute(
        "INSERT OR IGNORE INTO apolices_seguro (
            id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
            seguradora_id, empresa_id, tipo_seguro, numero_apolice, data_inicio_vigencia, data_fim_vigencia, valor_limite_cobertura, ativo
        ) VALUES ('apol_rctrc_01', ?1, ?2, ?2, 'pending', 1, 0, 'seg_porto_01', 'emp_matriz_01', 'RCTR_C', 'AP-2026-98102', '2026-01-01', '2027-01-01', 500000.0, 1)",
        rusqlite::params![device_id, now],
    )?;

    // 5. Seed Rotas de Transporte
    conn.execute(
        "INSERT OR IGNORE INTO rotas_transporte (
            id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
            empresa_id, nome, uf_origem, municipio_origem, cod_ibge_origem, uf_destino, municipio_destino, cod_ibge_destino, distancia_km, tempo_estimado_horas, valor_pedagio_estimado, ativo
        ) VALUES ('rota_ms_sp_01', ?1, ?2, ?2, 'pending', 1, 0, 'emp_matriz_01', 'ROTA SUL/SUDESTE: DOURADOS/MS -> SAO PAULO/SP', 'MS', 'DOURADOS', '5003702', 'SP', 'SAO PAULO', '3550308', 980.0, 14.0, 185.50, 1)",
        rusqlite::params![device_id, now],
    )?;

    conn.execute(
        "INSERT OR IGNORE INTO rotas_transporte (
            id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
            empresa_id, nome, uf_origem, municipio_origem, cod_ibge_origem, uf_destino, municipio_destino, cod_ibge_destino, distancia_km, tempo_estimado_horas, valor_pedagio_estimado, ativo
        ) VALUES ('rota_ms_pr_01', ?1, ?2, ?2, 'pending', 1, 0, 'emp_matriz_01', 'ROTA CO/SUL: DOURADOS/MS -> CURITIBA/PR', 'MS', 'DOURADOS', '5003702', 'PR', 'CURITIBA', '4106902', 820.0, 11.5, 140.00, 1)",
        rusqlite::params![device_id, now],
    )?;

    // 6. Seed Tabelas de Frete
    conn.execute(
        "INSERT OR IGNORE INTO tabelas_frete (
            id, device_id, created_at, updated_at, x_sync_status, x_version, is_deleted,
            empresa_id, nome, tipo_calculo, valor_kg, valor_minimo, percentual_ad_valorem, percentual_gris, taxa_dificuldade_entrega, inclui_pedagio, ativo
        ) VALUES ('tab_frete_padrao_01', ?1, ?2, ?2, 'pending', 1, 0, 'emp_matriz_01', 'TABELA DE FRETE PESO GERAL 2026', 'PESO', 0.48, 250.0, 0.30, 0.15, 0.0, 1, 1)",
        rusqlite::params![device_id, now],
    )?;

    Ok(())
}
