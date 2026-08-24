//! Módulo de Geração de URL e QR Code para NFC-e v2.0
//!
//! Implementa a especificação do Manual de Padrões Técnicos do QR Code da NFC-e Versão 2.0 (SEFAZ).
//! Suporta emissão Online (tpEmis=1) e Contingência Offline (tpEmis=9).

use sha1::{Digest, Sha1};

/// Gera a URL do QR Code da NFC-e v2.0 de acordo com as regras da SEFAZ.
///
/// # Modos de Emissão:
/// - **Online (`tpEmis = 1`)**:
///   - String base: `{chave}|2|{tpAmb}|{cIdToken}`
///   - Hash SHA-1: `SHA1(String base + csc_token)` em hexadecimal MAIÚSCULO.
///   - URL Final: `{url_base}?p={String base}|{cHashQRCode}`
///
/// - **Contingência Offline (`tpEmis = 9`)**:
///   - String base: `{chave}|2|{tpAmb}|{dhEmiHex}|{vNF:.2}|{vICMS:.2}|{digValHex}|{cIdToken}`
///   - Hash SHA-1: `SHA1(String base + csc_token)` em hexadecimal MAIÚSCULO.
///   - URL Final: `{url_base}?p={String base}|{cHashQRCode}`
pub fn gerar_qrcode_url(
    url_base: &str,
    chave: &str,
    tp_amb: u32,
    tp_emis: u32,
    dh_emi: &str,
    v_nf: f64,
    v_icms: f64,
    dig_val: &str,
    csc_id: &str,
    csc_token: &str,
) -> Result<String, String> {
    if chave.len() != 44 {
        return Err(format!("Chave de acesso deve ter 44 dígitos, possui {}", chave.len()));
    }

    let c_id_token = csc_id.trim_start_matches('0');
    let c_id_token = if c_id_token.is_empty() { "1" } else { c_id_token };

    let params_str = if tp_emis == 9 {
        // Contingência Offline
        let dh_emi_hex = hex::encode(dh_emi.as_bytes()).to_uppercase();
        let dig_val_hex = hex::encode(dig_val.as_bytes()).to_uppercase();
        format!(
            "{}|2|{}|{}|{:.2}|{:.2}|{}|{}",
            chave,
            tp_amb,
            dh_emi_hex,
            v_nf,
            v_icms,
            dig_val_hex,
            c_id_token
        )
    } else {
        // Online (tpEmis = 1 ou outros)
        format!("{}|2|{}|{}", chave, tp_amb, c_id_token)
    };

    // Concatena com o CSC Token para gerar o hash SHA-1
    let string_para_hash = format!("{}{}", params_str, csc_token);

    let mut hasher = Sha1::new();
    hasher.update(string_para_hash.as_bytes());
    let hash_result = hasher.finalize();
    let c_hash_qr_code = hex::encode(hash_result).to_uppercase();

    let clean_url_base = url_base.trim_end_matches('?').trim_end_matches('&');
    let separator = if clean_url_base.contains('?') { "&" } else { "?" };

    let url_completa = format!("{}{}p={}|{}", clean_url_base, separator, params_str, c_hash_qr_code);
    Ok(url_completa)
}

/// Valida o hash SHA-1 do QR Code de uma NFC-e v2.0.
pub fn validar_hash_qrcode(
    params_str: &str,
    csc_token: &str,
    hash_esperado: &str,
) -> bool {
    let string_para_hash = format!("{}{}", params_str, csc_token);
    let mut hasher = Sha1::new();
    hasher.update(string_para_hash.as_bytes());
    let hash_result = hasher.finalize();
    let hash_calculado = hex::encode(hash_result).to_uppercase();

    hash_calculado == hash_esperado.to_uppercase()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_gerar_qrcode_online() {
        let chave = "35260812345678000195650010000001001876543210";
        let url = gerar_qrcode_url(
            "https://www.sefaz.rs.gov.br/NFCE/NFCE-COM.aspx",
            chave,
            2,
            1,
            "2026-08-13T14:00:00-03:00",
            100.50,
            0.00,
            "DigestVal123",
            "000001",
            "TOKEN_CSC_123",
        )
        .unwrap();

        assert!(url.contains("https://www.sefaz.rs.gov.br/NFCE/NFCE-COM.aspx?p="));
        assert!(url.contains(chave));
        assert!(url.contains("|2|2|1|"));
    }

    #[test]
    fn test_gerar_qrcode_contingencia_offline() {
        let chave = "35260812345678000195650010000001009876543210";
        let url = gerar_qrcode_url(
            "https://www.sefaz.rs.gov.br/NFCE/NFCE-COM.aspx",
            chave,
            2,
            9,
            "2026-08-13T14:00:00-03:00",
            250.75,
            12.50,
            "DigestValOffline456",
            "000001",
            "TOKEN_CSC_SECRET",
        )
        .unwrap();

        assert!(url.contains("?p="));
        assert!(url.contains(chave));
        assert!(url.contains("250.75"));
        assert!(url.contains("12.50"));
    }
}
