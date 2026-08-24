//! Comandos IPC do Módulo de Entrada Inteligente via XML NF-e & Autocadastro Fiscal

use crate::db::DbState;
use crate::domain::fiscal_enrichment::{
    consultar_brasilapi_ncm as domain_consultar_ncm,
    sugerir_tributacao_estadual_varejo as domain_sugerir_tributacao,
    BrasilApiNcmResponse, SugestaoTributariaVarejo,
};
use crate::domain::xml_import::{
    analisar_xml_nfe_entrada as domain_analisar_xml,
    confirmar_entrada_xml_nfe as domain_confirmar_xml,
    ConfirmarEntradaXmlInput, XmlEntradaAnalise,
};
use tauri::State;

#[tauri::command]
pub async fn analisar_xml_nfe_entrada(
    state: State<'_, DbState>,
    empresa_id: String,
    xml_conteudo: String,
) -> Result<XmlEntradaAnalise, String> {
    let conn = state.conn.lock().unwrap();
    domain_analisar_xml(&conn, &empresa_id, &xml_conteudo)
}

#[tauri::command]
pub async fn confirmar_entrada_xml_nfe(
    state: State<'_, DbState>,
    empresa_id: String,
    analise: XmlEntradaAnalise,
    input: ConfirmarEntradaXmlInput,
) -> Result<usize, String> {
    let mut conn = state.conn.lock().unwrap();
    domain_confirmar_xml(&mut conn, &state.device_id, &empresa_id, &analise, &input)
}

#[tauri::command]
pub async fn sugerir_tributacao_estadual(
    ncm: String,
    cest: Option<String>,
    uf_origem: String,
    uf_destino: String,
) -> Result<SugestaoTributariaVarejo, String> {
    Ok(domain_sugerir_tributacao(&ncm, cest.as_deref(), &uf_origem, &uf_destino))
}

#[tauri::command]
pub async fn consultar_brasilapi_ncm(ncm: String) -> Result<BrasilApiNcmResponse, String> {
    domain_consultar_ncm(&ncm).await
}

#[tauri::command]
pub async fn consultar_xml_sefaz_por_chave(chave: String) -> Result<String, String> {
    crate::domain::xml_import::buscar_xml_sefaz_por_chave(&chave)
}
