use crate::db::DbState;
use crate::domain::transporte::{
    self, ApoliceSeguroInput, ApoliceSeguroItem, MotoristaInput, MotoristaItem,
    OperacaoTransporteInput, OperacaoTransporteItem, RotaTransporteInput, RotaTransporteItem,
    SeguradoraInput, SeguradoraItem, TabelaFreteInput, TabelaFreteItem, VeiculoInput, VeiculoItem,
};
use crate::domain::cte::{
    self, CalculoTributacaoCteResult, CteInput, CteItem,
};
use crate::domain::ciot::{
    self, CiotResult, GerarCiotInput, PisoMinimoInput, PisoMinimoResult,
};
use tauri::State;

// =========================================================================
// VEÍCULOS
// =========================================================================

#[tauri::command]
pub async fn salvar_veiculo_cmd(
    payload: VeiculoInput,
    state: State<'_, DbState>,
) -> Result<VeiculoItem, String> {
    let conn = state.conn.lock().unwrap();
    transporte::salvar_veiculo(&conn, payload, &state.device_id)
        .map_err(|e| format!("Erro ao salvar veículo: {}", e))
}

#[tauri::command]
pub async fn listar_veiculos_cmd(
    empresa_id: String,
    state: State<'_, DbState>,
) -> Result<Vec<VeiculoItem>, String> {
    let conn = state.conn.lock().unwrap();
    transporte::listar_veiculos(&conn, &empresa_id)
        .map_err(|e| format!("Erro ao listar veículos: {}", e))
}

// =========================================================================
// MOTORISTAS
// =========================================================================

#[tauri::command]
pub async fn salvar_motorista_cmd(
    payload: MotoristaInput,
    state: State<'_, DbState>,
) -> Result<MotoristaItem, String> {
    let conn = state.conn.lock().unwrap();
    transporte::salvar_motorista(&conn, payload, &state.device_id)
        .map_err(|e| format!("Erro ao salvar motorista: {}", e))
}

#[tauri::command]
pub async fn listar_motoristas_cmd(
    empresa_id: String,
    state: State<'_, DbState>,
) -> Result<Vec<MotoristaItem>, String> {
    let conn = state.conn.lock().unwrap();
    transporte::listar_motoristas(&conn, &empresa_id)
        .map_err(|e| format!("Erro ao listar motoristas: {}", e))
}

// =========================================================================
// SEGURADORAS & APÓLICES
// =========================================================================

#[tauri::command]
pub async fn salvar_seguradora_cmd(
    payload: SeguradoraInput,
    state: State<'_, DbState>,
) -> Result<SeguradoraItem, String> {
    let conn = state.conn.lock().unwrap();
    transporte::salvar_seguradora(&conn, payload, &state.device_id)
        .map_err(|e| format!("Erro ao salvar seguradora: {}", e))
}

#[tauri::command]
pub async fn listar_seguradoras_cmd(
    empresa_id: String,
    state: State<'_, DbState>,
) -> Result<Vec<SeguradoraItem>, String> {
    let conn = state.conn.lock().unwrap();
    transporte::listar_seguradoras(&conn, &empresa_id)
        .map_err(|e| format!("Erro ao listar seguradoras: {}", e))
}

#[tauri::command]
pub async fn salvar_apolice_cmd(
    payload: ApoliceSeguroInput,
    state: State<'_, DbState>,
) -> Result<ApoliceSeguroItem, String> {
    let conn = state.conn.lock().unwrap();
    transporte::salvar_apolice(&conn, payload, &state.device_id)
        .map_err(|e| format!("Erro ao salvar apólice: {}", e))
}

#[tauri::command]
pub async fn listar_apolices_cmd(
    empresa_id: String,
    state: State<'_, DbState>,
) -> Result<Vec<ApoliceSeguroItem>, String> {
    let conn = state.conn.lock().unwrap();
    transporte::listar_apolices(&conn, &empresa_id)
        .map_err(|e| format!("Erro ao listar apólices: {}", e))
}

// =========================================================================
// TABELAS DE FRETE & ROTAS
// =========================================================================

#[tauri::command]
pub async fn salvar_tabela_frete_cmd(
    payload: TabelaFreteInput,
    state: State<'_, DbState>,
) -> Result<TabelaFreteItem, String> {
    let conn = state.conn.lock().unwrap();
    transporte::salvar_tabela_frete(&conn, payload, &state.device_id)
        .map_err(|e| format!("Erro ao salvar tabela de frete: {}", e))
}

#[tauri::command]
pub async fn listar_tabelas_frete_cmd(
    empresa_id: String,
    state: State<'_, DbState>,
) -> Result<Vec<TabelaFreteItem>, String> {
    let conn = state.conn.lock().unwrap();
    transporte::listar_tabelas_frete(&conn, &empresa_id)
        .map_err(|e| format!("Erro ao listar tabelas de frete: {}", e))
}

#[tauri::command]
pub async fn salvar_rota_cmd(
    payload: RotaTransporteInput,
    state: State<'_, DbState>,
) -> Result<RotaTransporteItem, String> {
    let conn = state.conn.lock().unwrap();
    transporte::salvar_rota(&conn, payload, &state.device_id)
        .map_err(|e| format!("Erro ao salvar rota: {}", e))
}

#[tauri::command]
pub async fn listar_rotas_cmd(
    empresa_id: String,
    state: State<'_, DbState>,
) -> Result<Vec<RotaTransporteItem>, String> {
    let conn = state.conn.lock().unwrap();
    transporte::listar_rotas(&conn, &empresa_id)
        .map_err(|e| format!("Erro ao listar rotas: {}", e))
}

// =========================================================================
// OPERAÇÕES DE TRANSPORTE (VIAGENS)
// =========================================================================

#[tauri::command]
pub async fn salvar_operacao_transporte_cmd(
    payload: OperacaoTransporteInput,
    state: State<'_, DbState>,
) -> Result<OperacaoTransporteItem, String> {
    let conn = state.conn.lock().unwrap();
    transporte::salvar_operacao_transporte(&conn, payload, &state.device_id)
        .map_err(|e| format!("Erro ao salvar operação de transporte: {}", e))
}

#[tauri::command]
pub async fn listar_operacoes_transporte_cmd(
    filial_id: String,
    state: State<'_, DbState>,
) -> Result<Vec<OperacaoTransporteItem>, String> {
    let conn = state.conn.lock().unwrap();
    transporte::listar_operacoes_transporte(&conn, &filial_id)
        .map_err(|e| format!("Erro ao listar operações de transporte: {}", e))
}

#[tauri::command]
pub async fn get_operacao_transporte_detalhes_cmd(
    id: String,
    state: State<'_, DbState>,
) -> Result<OperacaoTransporteItem, String> {
    let conn = state.conn.lock().unwrap();
    transporte::get_operacao_por_id(&conn, &id)
        .map_err(|e| format!("Erro ao obter detalhes da operação: {}", e))
}

#[tauri::command]
pub async fn alterar_status_viagem_cmd(
    id: String,
    novo_status: String,
    state: State<'_, DbState>,
) -> Result<(), String> {
    let conn = state.conn.lock().unwrap();
    transporte::alterar_status_viagem(&conn, &id, &novo_status, &state.device_id)
        .map_err(|e| format!("Erro ao alterar status da viagem: {}", e))
}

// =========================================================================
// CT-E (CONHECIMENTO DE TRANSPORTE ELETRÔNICO MOD. 57)
// =========================================================================

#[tauri::command]
pub async fn salvar_cte_cmd(
    payload: CteInput,
    state: State<'_, DbState>,
) -> Result<CteItem, String> {
    let conn = state.conn.lock().unwrap();
    cte::salvar_cte(&conn, payload, &state.device_id)
        .map_err(|e| format!("Erro ao salvar CT-e: {}", e))
}

#[tauri::command]
pub async fn get_cte_detalhes_cmd(
    id: String,
    state: State<'_, DbState>,
) -> Result<CteItem, String> {
    let conn = state.conn.lock().unwrap();
    cte::get_cte_por_id(&conn, &id)
        .map_err(|e| format!("Erro ao obter detalhes do CT-e: {}", e))
}

#[tauri::command]
pub async fn listar_ctes_cmd(
    filial_id: String,
    state: State<'_, DbState>,
) -> Result<Vec<CteItem>, String> {
    let conn = state.conn.lock().unwrap();
    cte::listar_ctes(&conn, &filial_id)
        .map_err(|e| format!("Erro ao listar CT-es: {}", e))
}

#[tauri::command]
pub async fn cancelar_cte_cmd(
    id: String,
    justificativa: String,
    state: State<'_, DbState>,
) -> Result<(), String> {
    let conn = state.conn.lock().unwrap();
    cte::cancelar_cte(&conn, &id, &justificativa, &state.device_id)
        .map_err(|e| format!("Erro ao cancelar CT-e: {}", e))
}

#[tauri::command]
pub async fn calcular_tributacao_cte_cmd(
    uf_inicio: String,
    uf_fim: String,
    valor_prestacao: f64,
    crt_emitente: i32,
    optante_simples: bool,
) -> Result<CalculoTributacaoCteResult, String> {
    Ok(cte::calcular_tributacao_cte(
        &uf_inicio,
        &uf_fim,
        valor_prestacao,
        crt_emitente,
        optante_simples,
    ))
}

// =========================================================================
// CIOT (ANTT & IPEFS)
// =========================================================================

#[tauri::command]
pub async fn calcular_piso_minimo_frete_cmd(
    payload: PisoMinimoInput,
) -> Result<PisoMinimoResult, String> {
    Ok(ciot::calcular_piso_minimo_frete(&payload))
}

#[tauri::command]
pub async fn gerar_ciot_cmd(
    payload: GerarCiotInput,
    state: State<'_, DbState>,
) -> Result<CiotResult, String> {
    let conn = state.conn.lock().unwrap();
    ciot::gerar_ciot_operacao(&conn, payload, &state.device_id)
        .map_err(|e| format!("Erro ao gerar CIOT: {}", e))
}

#[tauri::command]
pub async fn encerrar_ciot_cmd(
    operacao_id: String,
    state: State<'_, DbState>,
) -> Result<String, String> {
    let conn = state.conn.lock().unwrap();
    ciot::encerrar_ciot_operacao(&conn, &operacao_id, &state.device_id)
        .map_err(|e| format!("Erro ao encerrar CIOT: {}", e))
}

#[tauri::command]
pub async fn cancelar_ciot_cmd(
    operacao_id: String,
    motivo: String,
    state: State<'_, DbState>,
) -> Result<String, String> {
    let conn = state.conn.lock().unwrap();
    ciot::cancelar_ciot_operacao(&conn, &operacao_id, &motivo, &state.device_id)
        .map_err(|e| format!("Erro ao cancelar CIOT: {}", e))
}

#[tauri::command]
pub async fn finalizar_viagem_completa_cmd(
    payload: ciot::FinalizarViagemInput,
    state: State<'_, DbState>,
) -> Result<ciot::FinalizarViagemResult, String> {
    let conn = state.conn.lock().unwrap();
    ciot::finalizar_viagem_completa(&conn, payload, &state.device_id)
        .map_err(|e| format!("Erro ao finalizar viagem: {}", e))
}

// =========================================================================
// DOCUMENTOS FISCAIS DISPONÍVEIS PARA MANIFESTO (MDF-E / CT-E)
// =========================================================================

#[tauri::command]
pub async fn listar_nfes_disponiveis_transporte_cmd(
    state: State<'_, DbState>,
) -> Result<Vec<transporte::NfeDocumentoItem>, String> {
    let conn = state.conn.lock().unwrap();
    transporte::listar_nfes_para_transporte(&conn)
        .map_err(|e| format!("Erro ao listar documentos fiscais para transporte: {}", e))
}

// =========================================================================
// ANALYTICS & KPIS EXECUTIVOS
// =========================================================================

#[tauri::command]
pub async fn calcular_kpis_transporte_cmd(
    filial_id: String,
    periodo: String,
    state: State<'_, DbState>,
) -> Result<transporte::TransporteKPIs, String> {
    let conn = state.conn.lock().unwrap();
    transporte::calcular_kpis_transporte(&conn, &filial_id, &periodo)
        .map_err(|e| format!("Erro ao calcular KPIs de transporte: {}", e))
}

#[tauri::command]
pub async fn listar_evolucao_frete_diario_cmd(
    filial_id: String,
    dias: i64,
    state: State<'_, DbState>,
) -> Result<Vec<transporte::EvolucaoFreteDiario>, String> {
    let conn = state.conn.lock().unwrap();
    transporte::listar_evolucao_frete_diario(&conn, &filial_id, dias)
        .map_err(|e| format!("Erro ao listar evolução do frete diário: {}", e))
}

#[tauri::command]
pub async fn listar_ranking_rotas_cmd(
    filial_id: String,
    state: State<'_, DbState>,
) -> Result<Vec<transporte::RankingRota>, String> {
    let conn = state.conn.lock().unwrap();
    transporte::listar_ranking_rotas(&conn, &filial_id)
        .map_err(|e| format!("Erro ao listar ranking de rotas: {}", e))
}


