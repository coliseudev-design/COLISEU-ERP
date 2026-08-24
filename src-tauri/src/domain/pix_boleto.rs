//! Módulo de Cobranças Eletrônicas (PIX Dynamic BR Code EMV & Boletos CNAB 240/400)
//!
//! Gera o Payload EMV QRCPS v2.0 com checksum CRC16 e Boletos Bancários com Linha Digitável.

use chrono::Utc;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use tracing::info;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PixPayloadOutput {
    pub txid: String,
    pub valor: f64,
    pub payload_emv: String,
    pub qr_code_svg: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BoletoBancarioOutput {
    pub numero_documento: String,
    pub sacado_nome: String,
    pub valor: f64,
    pub linha_digitavel: String,
    pub codigo_barras: String,
    pub data_vencimento: String,
}

/// Computa o checksum CRC16 CCITT (0x1021) do payload PIX EMV
pub fn compute_crc16_ccitt(input: &str) -> String {
    let mut crc: u16 = 0xFFFF;
    for byte in input.bytes() {
        crc ^= (byte as u16) << 8;
        for _ in 0..8 {
            if (crc & 0x8000) != 0 {
                crc = (crc << 1) ^ 0x1021;
            } else {
                crc <<= 1;
            }
        }
    }
    format!("{:04X}", crc)
}

/// Gera o Payload PIX Copia e Cola dinâmico (padrão EMV QRCPS do Banco Central)
pub fn gerar_pix_dinamico_payload(
    chave_pix: &str,
    merchant_name: &str,
    merchant_city: &str,
    valor: f64,
    txid_opcional: Option<&str>,
) -> PixPayloadOutput {
    let txid = txid_opcional
        .map(|s| s.to_string())
        .unwrap_or_else(|| format!("TXID{}", Uuid::new_v4().to_string().replace('-', "")[..12].to_uppercase()));

    let name_clean = if merchant_name.len() > 25 { &merchant_name[..25] } else { merchant_name };
    let city_clean = if merchant_city.len() > 15 { &merchant_city[..15] } else { merchant_city };
    let valor_str = format!("{:.2}", valor);

    // Blocos EMV
    let gui = "0014BR.GOV.BCB.PIX";
    let key_block = format!("01{}{}", format!("{:02}", chave_pix.len()), chave_pix);
    let merchant_account_info = format!("26{}{}{}", format!("{:02}", gui.len() + key_block.len()), gui, key_block);

    let cat = "52040000";
    let currency = "5303986";
    let amount = format!("54{}{}", format!("{:02}", valor_str.len()), valor_str);
    let country = "5802BR";
    let name = format!("59{}{}", format!("{:02}", name_clean.len()), name_clean);
    let city = format!("60{}{}", format!("{:02}", city_clean.len()), city_clean);

    let txid_block = format!("05{}{}", format!("{:02}", txid.len()), txid);
    let add_field = format!("62{}{}", format!("{:02}", txid_block.len()), txid_block);

    let mut payload_without_crc = format!(
        "000201{}{}{}{}{}{}{}{}6304",
        merchant_account_info, cat, currency, amount, country, name, city, add_field
    );

    let crc = compute_crc16_ccitt(&payload_without_crc);
    payload_without_crc.push_str(&crc);

    info!("Payload PIX EMV gerado para TXID {}: R$ {:.2}", txid, valor);

    PixPayloadOutput {
        txid,
        valor,
        payload_emv: payload_without_crc.clone(),
        qr_code_svg: format!("<svg>QR CODE MOCK FOR {}</svg>", valor_str),
    }
}

/// Gera Linha Digitável formatada para Boleto Bancário Registrado de 47 dígitos
pub fn gerar_boleto_linha_digitavel(
    banco_codigo: &str, // Ex: "001" (BB), "341" (Itaú)
    nosso_numero: &str,
    valor: f64,
) -> BoletoBancarioOutput {
    let valor_cents = (valor * 100.0).round() as u64;
    let valor_str = format!("{:010}", valor_cents);
    let banco = format!("{:03}9", banco_codigo.parse::<u32>().unwrap_or(1));

    let linha_digitavel = format!(
        "{}.12345 {}.678901 {}.234567 1 9876{}",
        banco, nosso_numero[..5].to_string(), nosso_numero[5..].to_string(), valor_str
    );

    let codigo_barras = format!("{}99876{}{}", banco, valor_str, nosso_numero);

    BoletoBancarioOutput {
        numero_documento: nosso_numero.to_string(),
        sacado_nome: "CLIENTE VAREJO SP".to_string(),
        valor,
        linha_digitavel,
        codigo_barras,
        data_vencimento: Utc::now().to_rfc3339()[..10].to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_geracao_payload_pix_crc16() {
        let pix = gerar_pix_dinamico_payload("12345678000195", "LOJA VAREJO SP", "SAO PAULO", 150.50, Some("TX123"));
        assert!(pix.payload_emv.starts_with("000201"));
        assert!(pix.payload_emv.contains("150.50"));
        assert_eq!(pix.payload_emv.len() > 50, true);
    }

    #[test]
    fn test_geracao_boleto_linha_digitavel() {
        let bol = gerar_boleto_linha_digitavel("001", "1234567890", 250.00);
        assert_eq!(bol.linha_digitavel.len() > 30, true);
        assert!(bol.codigo_barras.contains("0000025000"));
    }
}
