//! Comandos IPC do Módulo de Impressão de Etiquetas de Varejo (Gôndola, Vestuário/Grade & ZPL)

use crate::db::DbState;
use crate::domain::etiquetas::{
    gerar_zpl_gondola as domain_zpl_gondola,
    gerar_zpl_vestuario as domain_zpl_vestuario,
    processar_lote_etiquetas_zpl as domain_lote_zpl,
    ItemEtiquetaInput, LoteEtiquetasOutput,
};
use tauri::State;

#[tauri::command]
pub async fn processar_lote_etiquetas_zpl(
    tipo_layout: String,
    itens: Vec<ItemEtiquetaInput>,
) -> Result<LoteEtiquetasOutput, String> {
    Ok(domain_lote_zpl(&tipo_layout, itens))
}

#[tauri::command]
pub async fn gerar_zpl_gondola(
    descricao: String,
    sku: String,
    ean: Option<String>,
    preco_venda: f64,
) -> Result<String, String> {
    Ok(domain_zpl_gondola(&descricao, &sku, ean.as_deref(), preco_venda))
}

#[tauri::command]
pub async fn gerar_zpl_vestuario(
    descricao: String,
    sku: String,
    tamanho: Option<String>,
    cor: Option<String>,
    ean: Option<String>,
    preco_venda: f64,
) -> Result<String, String> {
    Ok(domain_zpl_vestuario(
        &descricao,
        &sku,
        tamanho.as_deref(),
        cor.as_deref(),
        ean.as_deref(),
        preco_venda,
    ))
}
