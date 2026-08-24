pub mod ai;
pub mod commands;
pub mod db;
pub mod domain;
pub mod events;
pub mod fiscal;
pub mod printing;
pub mod sync;
pub mod danfse;

use db::connection::{get_default_db_path, get_or_create_device_id, init_encrypted_database, DbState};
use std::sync::{Arc, Mutex};
use tauri::Manager;
use tracing::info;
use tracing_subscriber::{fmt, EnvFilter};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize tracing logger
    let _ = fmt()
        .with_env_filter(EnvFilter::from_default_env().add_directive("erp_local_first=info".parse().unwrap()))
        .try_init();

    info!("Iniciando aplicação ERP Híbrido Local-First com Módulos Fiscais e Domínios da Fase 5...");

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let app_handle = app.handle();
            let app_dir = app_handle
                .path()
                .app_data_dir()
                .unwrap_or_else(|_| get_default_db_path().parent().unwrap().to_path_buf());

            let db_path = app_dir.join("erp_local.db");
            info!("Caminho do Banco de Dados: {:?}", db_path);

            let device_id = get_or_create_device_id(&app_dir);
            info!("ID do Dispositivo Local: {}", device_id);

            let conn = init_encrypted_database(&db_path)
                .map_err(|e| Box::<dyn std::error::Error>::from(e))?;

            let db_conn = Arc::new(Mutex::new(conn));

            let db_state = DbState {
                conn: db_conn.clone(),
                db_path,
                device_id,
            };

            // Inicializa o worker em background da fila de contingência SEFAZ
            let mut sefaz_config = fiscal::sefaz_client::SefazConfig::default();
            sefaz_config.force_mock = true;
            fiscal::worker::start_contingency_worker_loop(
                db_conn,
                sefaz_config,
                fiscal::worker::BackoffConfig::default(),
            );

            app.manage(db_state);
            info!("Banco de dados SQLCipher e Contingency Worker inicializados pelo Tauri State.");

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::db::get_db_status,
            commands::db::validate_sync_schema,
            commands::db::run_audit_benchmark,
            commands::empresas::create_empresa,
            commands::empresas::list_empresas,
            commands::empresas::create_filial,
            commands::products::create_produto,
            commands::products::list_produtos,
            commands::sales::create_venda,
            commands::sales::list_vendas,
            commands::sales::cancelar_venda,
            commands::sales::get_venda_details,
            commands::inventory_cmd::list_depositos,
            commands::inventory_cmd::create_deposito,
            commands::inventory_cmd::list_estoque_saldos,
            commands::inventory_cmd::list_estoque_movimentacoes,
            commands::inventory_cmd::ajustar_estoque,
            commands::inventory_cmd::reservar_estoque,
            commands::finance_cmd::list_financeiro_lancamentos,
            commands::finance_cmd::create_financeiro_lancamento,
            commands::finance_cmd::quitar_financeiro_lancamento,
            commands::finance_cmd::list_caixa_movimentacoes,
            commands::finance_cmd::get_resumo_caixa,
            commands::finance_cmd::registrar_movimentacao_caixa,
            commands::sync::get_sync_status,
            commands::sync::process_sync_queue,
            commands::sync::get_sync_queue_stats,
            commands::sync::enqueue_sync_operation,
            commands::sync::resolve_stock_crdt_delta,
            commands::fiscal::salvar_certificado_a1,
            commands::fiscal::emitir_nfce,
            commands::fiscal::consultar_documento_fiscal,
            commands::fiscal::retransmitir_contingencia,
            commands::fiscal::imprimir_danfe_nfce,
            commands::fiscal::consultar_status_servico_sefaz,
            commands::tributacao::salvar_regra_tributaria,
            commands::tributacao::listar_regras_tributarias,
            commands::tributacao::calcular_tributacao_item,
            commands::tributacao::importar_xml_nfe_fornecedor,
            commands::tributacao::manifestar_destinatario,
            commands::tributacao::gerar_arquivo_sped_fiscal,
            commands::compras_cmd::processar_entrada_compra,
            commands::compras_cmd::executar_transferencia_estoque,
            commands::finance_cmd::gerar_dre_gerencial,
            commands::finance_cmd::importar_extrato_ofx,
            commands::rbac_cmd::autenticar_usuario,
            commands::rbac_cmd::validar_alcada_desconto,
            commands::rbac_cmd::salvar_usuario,
            commands::rbac_cmd::listar_usuarios,
            commands::rbac_cmd::listar_audit_logs,
            commands::rbac_cmd::autenticar_funcionario,
            commands::rbac_cmd::salvar_funcionario,
            commands::rbac_cmd::listar_funcionarios,
            commands::rbac_cmd::bloquear_funcionario,
            commands::rbac_cmd::desbloquear_funcionario,
            commands::rbac_cmd::resetar_senha_funcionario,
            commands::rbac_cmd::listar_grupos_acesso,
            commands::rbac_cmd::salvar_grupo_acesso,
            commands::rbac_cmd::excluir_grupo_acesso,
            commands::rbac_cmd::listar_permissoes_grupo,
            commands::rbac_cmd::verificar_permissao,
            commands::rbac_cmd::listar_funcionario_metas,
            commands::rbac_cmd::salvar_funcionario_meta,
            commands::rbac_cmd::listar_funcionario_filiais,
            commands::rbac_cmd::salvar_funcionario_filial,
            commands::reports_cmd::gerar_curva_abc_produtos,
            commands::reports_cmd::gerar_relatorio_giro_estoque,
            commands::reports_cmd::calcular_cockpit_executivo_cmd,
            commands::reports_cmd::gerar_bi_executivo_cmd,
            commands::xml_import_cmd::analisar_xml_nfe_entrada,
            commands::xml_import_cmd::confirmar_entrada_xml_nfe,
            commands::xml_import_cmd::sugerir_tributacao_estadual,
            commands::xml_import_cmd::consultar_brasilapi_ncm,
            commands::xml_import_cmd::consultar_xml_sefaz_por_chave,
            commands::grade_cmd::criar_grade,
            commands::grade_cmd::listar_grades,
            commands::grade_cmd::gerar_variantes_produto,
            commands::grade_cmd::listar_variantes_produto,
            commands::etiquetas_cmd::processar_lote_etiquetas_zpl,
            commands::etiquetas_cmd::gerar_zpl_gondola,
            commands::etiquetas_cmd::gerar_zpl_vestuario,
            commands::promotions_cmd::salvar_promocao,
            commands::promotions_cmd::listar_promocoes_ativas,
            commands::promotions_cmd::calcular_promocoes_carrinho,
            commands::pix_boleto_cmd::gerar_pix_dinamico_venda,
            commands::pix_boleto_cmd::gerar_boleto_bancario,
            commands::pre_venda_cmd::criar_pre_venda_comanda,
            commands::pre_venda_cmd::puxar_comanda_para_pdv,
            commands::condicional_cmd::criar_venda_condicional,
            commands::condicional_cmd::listar_condicionais_pendentes,
            commands::condicional_cmd::devolver_item_por_codigo,
            commands::condicional_cmd::faturar_condicional,
            commands::condicional_cmd::gerar_vale_troca,
            commands::condicional_cmd::consultar_ficha_financeira,
            commands::pessoas_cmd::salvar_pessoa,
            commands::pessoas_cmd::listar_pessoas,
            commands::pessoas_cmd::salvar_veiculo_pessoa,
            commands::pessoas_cmd::listar_veiculos_pessoa,
            commands::configuracoes_cmd::salvar_dados_empresa,
            commands::configuracoes_cmd::carregar_dados_empresa,
            commands::configuracoes_cmd::salvar_configuracao,
            commands::configuracoes_cmd::carregar_configuracoes,
            commands::configuracoes_cmd::salvar_config_fiscal_filial,
            commands::configuracoes_cmd::carregar_config_fiscal_filial,
            commands::configuracoes_cmd::salvar_config_nfe_filial,
            commands::configuracoes_cmd::carregar_config_nfe_filial,
            commands::configuracoes_cmd::salvar_config_nfce_filial,
            commands::configuracoes_cmd::carregar_config_nfce_filial,
            commands::configuracoes_cmd::salvar_config_nfse_filial,
            commands::configuracoes_cmd::carregar_config_nfse_filial,
            commands::fiscal::emitir_nfse_nacional,
            commands::fiscal::consultar_status_nfse_nacional,
            commands::fiscal::gerar_danfse_pdf,
            commands::fiscal::abrir_arquivo_pdf,
            commands::fiscal::imprimir_danfe_simplificado_tipo2,

            commands::fiscal::carta_correcao_nfe,
            commands::fiscal::inutilizar_nfe,
            commands::fiscal::inutilizar_nfce,
            commands::fiscal::cancelar_nfse,
            commands::fiscal::listar_certificados_instalados_terminal,
            commands::fiscal::validar_e_vincular_certificado_a1,

            commands::ai_cmd::list_llm_providers,
            commands::ai_cmd::set_llm_provider_key,
            commands::ai_cmd::ping_llm_provider,
            commands::ai_cmd::analisar_bi_com_ia_cmd,

            commands::whatsapp_cmd::get_whatsapp_config,
            commands::whatsapp_cmd::salvar_whatsapp_config,
            commands::whatsapp_cmd::enviar_mensagem_whatsapp,

            commands::dialog_cmd::selecionar_pasta,
            commands::dialog_cmd::selecionar_arquivo_imagem,
            commands::dialog_cmd::selecionar_arquivo_certificado,
            commands::dialog_cmd::salvar_arquivo_em_disco,
            commands::dialog_cmd::salvar_arquivo_com_dialogo,
            commands::dialog_cmd::ler_xml_destinatario_cmd,

            commands::fiscal::consultar_status_sefaz_cmd,
            commands::fiscal::transmitir_nfe_sefaz_cmd,
            commands::fiscal::consultar_chave_sefaz_cmd,

            commands::fiscal::acbr_testar_conexao_cmd,
            commands::fiscal::acbr_status_servico_cmd,
            commands::fiscal::acbr_transmitir_nfe_cmd,
            commands::fiscal::acbr_consultar_chave_cmd,
            commands::fiscal::acbr_cancelar_nfe_cmd,
            commands::fiscal::acbr_inutilizar_nfe_cmd,
            commands::fiscal::acbr_carta_correcao_cmd,
            commands::fiscal::acbr_obter_certificados_cmd,
            commands::fiscal::acbr_imprimir_danfe_pdf_cmd,

            commands::fiscal::nuvemfiscal_testar_conexao_cmd,
            commands::fiscal::nuvemfiscal_status_sefaz_cmd,
            commands::fiscal::nuvemfiscal_emitir_nfe_cmd,
            commands::fiscal::nuvemfiscal_consultar_nfe_cmd,
            commands::fiscal::nuvemfiscal_cancelar_nfe_cmd,
            commands::fiscal::nuvemfiscal_inutilizar_nfe_cmd,
            commands::fiscal::nuvemfiscal_carta_correcao_cmd,

            commands::fiscal::tecnospeed_testar_conexao_cmd,
            commands::fiscal::tecnospeed_status_sefaz_cmd,
            commands::fiscal::tecnospeed_transmitir_tx2_cmd,
            commands::fiscal::tecnospeed_cancelar_nfe_cmd,
            commands::fiscal::tecnospeed_inutilizar_nfe_cmd,
            commands::fiscal::tecnospeed_carta_correcao_cmd,
            commands::fiscal::tecnospeed_imprimir_danfe_pdf_cmd,
            commands::fiscal::tecnospeed_listar_certificados_cmd,

            // TecnoSpeed NFC-e (Mod. 65)
            commands::fiscal::tecnospeed_status_sefaz_nfce_cmd,
            commands::fiscal::tecnospeed_transmitir_nfce_tx2_cmd,
            commands::fiscal::tecnospeed_consultar_nfce_cmd,
            commands::fiscal::tecnospeed_cancelar_nfce_cmd,
            commands::fiscal::tecnospeed_inutilizar_nfce_cmd,
            commands::fiscal::tecnospeed_imprimir_danfce_cmd,
            commands::fiscal::tecnospeed_exportar_danfce_pdf_cmd,
            commands::fiscal::tecnospeed_editar_modelo_danfce_cmd,

            // TecnoSpeed CT-e (Mod. 57)
            commands::fiscal::tecnospeed_status_sefaz_cte_cmd,
            commands::fiscal::tecnospeed_transmitir_cte_tx2_cmd,
            commands::fiscal::tecnospeed_consultar_cte_cmd,
            commands::fiscal::tecnospeed_cancelar_cte_cmd,
            commands::fiscal::tecnospeed_carta_correcao_cte_cmd,
            commands::fiscal::tecnospeed_inutilizar_cte_cmd,
            commands::fiscal::tecnospeed_imprimir_dacte_cmd,
            commands::fiscal::tecnospeed_exportar_dacte_pdf_cmd,
            commands::fiscal::tecnospeed_editar_modelo_dacte_cmd,

            // TecnoSpeed MDF-e (Mod. 58)
            commands::fiscal::tecnospeed_status_sefaz_mdfe_cmd,
            commands::fiscal::tecnospeed_transmitir_mdfe_tx2_cmd,
            commands::fiscal::tecnospeed_encerrar_mdfe_cmd,
            commands::fiscal::tecnospeed_incluir_condutor_mdfe_cmd,
            commands::fiscal::tecnospeed_cancelar_mdfe_cmd,
            commands::fiscal::tecnospeed_consultar_nao_encerrados_mdfe_cmd,
            commands::fiscal::tecnospeed_imprimir_damdfe_cmd,
            commands::fiscal::tecnospeed_exportar_damdfe_pdf_cmd,
            commands::fiscal::tecnospeed_editar_modelo_damdfe_cmd,

            // Módulo de Transporte & Logística (CT-e, Frota, Motoristas, CIOT, Viagens)
            commands::transporte_cmd::salvar_veiculo_cmd,
            commands::transporte_cmd::listar_veiculos_cmd,
            commands::transporte_cmd::salvar_motorista_cmd,
            commands::transporte_cmd::listar_motoristas_cmd,
            commands::transporte_cmd::salvar_seguradora_cmd,
            commands::transporte_cmd::listar_seguradoras_cmd,
            commands::transporte_cmd::salvar_apolice_cmd,
            commands::transporte_cmd::listar_apolices_cmd,
            commands::transporte_cmd::salvar_tabela_frete_cmd,
            commands::transporte_cmd::listar_tabelas_frete_cmd,
            commands::transporte_cmd::salvar_rota_cmd,
            commands::transporte_cmd::listar_rotas_cmd,
            commands::transporte_cmd::salvar_operacao_transporte_cmd,
            commands::transporte_cmd::listar_operacoes_transporte_cmd,
            commands::transporte_cmd::get_operacao_transporte_detalhes_cmd,
            commands::transporte_cmd::alterar_status_viagem_cmd,
            commands::transporte_cmd::salvar_cte_cmd,
            commands::transporte_cmd::get_cte_detalhes_cmd,
            commands::transporte_cmd::listar_ctes_cmd,
            commands::transporte_cmd::cancelar_cte_cmd,
            commands::transporte_cmd::calcular_tributacao_cte_cmd,
            commands::transporte_cmd::calcular_piso_minimo_frete_cmd,
            commands::transporte_cmd::gerar_ciot_cmd,
            commands::transporte_cmd::encerrar_ciot_cmd,
            commands::transporte_cmd::cancelar_ciot_cmd,
            commands::transporte_cmd::finalizar_viagem_completa_cmd,
            commands::transporte_cmd::listar_nfes_disponiveis_transporte_cmd,
            commands::transporte_cmd::calcular_kpis_transporte_cmd,
            commands::transporte_cmd::listar_evolucao_frete_diario_cmd,
            commands::transporte_cmd::listar_ranking_rotas_cmd,
        ])
        .run(tauri::generate_context!())
        .expect("Erro ao executar aplicação Tauri");
}
