use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};

/// Encriptação/descriptografia simples e robusta para chaves API em repouso
pub fn encrypt_key(plain_text: &str, secret_salt: &str) -> String {
    if plain_text.is_empty() {
        return String::new();
    }
    let combined = format!("{}:{}", secret_salt, plain_text);
    let xored: Vec<u8> = combined
        .bytes()
        .zip(secret_salt.bytes().cycle())
        .map(|(b, k)| b ^ k)
        .collect();
    BASE64.encode(xored)
}

pub fn decrypt_key(encrypted_base64: &str, secret_salt: &str) -> Result<String, String> {
    if encrypted_base64.is_empty() {
        return Ok(String::new());
    }
    let decoded = BASE64
        .decode(encrypted_base64)
        .map_err(|e| format!("Falha na decodificação Base64: {}", e))?;
    let dexored: Vec<u8> = decoded
        .iter()
        .zip(secret_salt.bytes().cycle())
        .map(|(b, k)| b ^ k)
        .collect();
    let text = String::from_utf8(dexored)
        .map_err(|e| format!("Falha na conversão UTF-8: {}", e))?;

    let prefix = format!("{}:", secret_salt);
    if text.starts_with(&prefix) {
        Ok(text[prefix.len()..].to_string())
    } else {
        Err("Salt de decodificação inválido".to_string())
    }
}
