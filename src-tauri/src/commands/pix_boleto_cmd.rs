//! Comandos IPC do Módulo de Pagamentos Eletrônicos (PIX Dynamic QR Code & Boletos)

use crate::db::DbState;
use crate::domain::pix_boleto::{
    gerar_boleto_linha_digitavel as domain_gerar_boleto,
    gerar_pix_dinamico_payload as domain_gerar_pix,
    BoletoBancarioOutput, PixPayloadOutput,
};
use tauri::State;

#[tauri::command]
pub async fn gerar_pix_dinamico_venda(
    chave_pix: String,
    merchant_name: String,
    merchant_city: String,
    valor: f64,
    txid: Option<String>,
) -> Result<PixPayloadOutput, String> {
    Ok(domain_gerar_pix(
        &chave_pix,
        &merchant_name,
        &merchant_city,
        valor,
        txid.as_deref(),
    ))
}

#[tauri::command]
pub async fn gerar_boleto_bancario(
    banco_codigo: String,
    nosso_numero: String,
    valor: f64,
) -> Result<BoletoBancarioOutput, String> {
    Ok(domain_gerar_boleto(&banco_codigo, &nosso_numero, valor))
}
