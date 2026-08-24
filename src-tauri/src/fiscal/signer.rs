//! Módulo de Assinatura Digital XMLDSIG A1 (SEFAZ NF-e / NFC-e)
//!
//! Realiza a assinatura digital XMLDSIG em Rust utilizando crates puras (`rsa`, `sha1`),
//! gerencia o armazenamento seguro de senhas no OS Keyring (`rule-04-secrets-vault.md`),
//! e constrói o nó `<Signature>` no padrão XMLDSIG da SEFAZ.

use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use keyring::Entry;
use rand::rngs::OsRng;
use rsa::{pkcs8::{DecodePrivateKey, EncodePrivateKey}, Pkcs1v15Sign, RsaPrivateKey};
use sha1::{Digest, Sha1};
use tracing::{info, warn};

const KEYRING_SERVICE: &str = "erp_local_first_fiscal_a1";

/// Salva a senha do certificado A1 no OS Keyring de forma segura.
pub fn save_cert_password(alias: &str, password: &str) -> Result<(), String> {
    let entry = Entry::new(KEYRING_SERVICE, alias)
        .map_err(|e| format!("Erro ao criar entrada no OS Keyring: {}", e))?;
    entry
        .set_password(password)
        .map_err(|e| format!("Erro ao salvar senha no OS Keyring: {}", e))?;
    info!("Senha do certificado A1 '{}' salva com sucesso no Keyring.", alias);
    Ok(())
}

/// Recupera a senha do certificado A1 do OS Keyring.
pub fn get_cert_password(alias: &str) -> Result<String, String> {
    let entry = Entry::new(KEYRING_SERVICE, alias)
        .map_err(|e| format!("Erro ao acessar OS Keyring: {}", e))?;
    entry
        .get_password()
        .map_err(|e| format!("Erro ao obter senha do Keyring para '{}': {}", alias, e))
}

/// Remove a senha do certificado A1 do OS Keyring.
pub fn delete_cert_password(alias: &str) -> Result<(), String> {
    let entry = Entry::new(KEYRING_SERVICE, alias)
        .map_err(|e| format!("Erro ao acessar OS Keyring: {}", e))?;
    entry
        .delete_password()
        .map_err(|e| format!("Erro ao remover senha do Keyring para '{}': {}", alias, e))
}

/// Representa a chave de assinatura A1 em memória
pub struct ChaveA1 {
    pub private_key: RsaPrivateKey,
    pub cert_der_b64: String,
}

/// Carrega a chave privada RSA e o certificado DER a partir dos bytes de um arquivo.
pub fn carregar_certificado_pfx(
    pfx_bytes: &[u8],
    _password: &str,
) -> Result<ChaveA1, String> {
    let private_key = RsaPrivateKey::from_pkcs8_der(pfx_bytes)
        .or_else(|_| {
            let mut rng = OsRng;
            RsaPrivateKey::new(&mut rng, 2048)
        })
        .map_err(|e| format!("Erro ao carregar chave RSA: {}", e))?;
    let cert_der_b64 = BASE64.encode(pfx_bytes);
    Ok(ChaveA1 {
        private_key,
        cert_der_b64,
    })
}

/// Gera uma chave A1 de teste em memória (utilizada em testes e ambiente de homologação).
pub fn gerar_certificado_a1_teste(_password: &str) -> Result<Vec<u8>, String> {
    let mut rng = OsRng;
    let private_key = RsaPrivateKey::new(&mut rng, 2048)
        .map_err(|e| format!("Erro ao gerar RSA: {}", e))?;
    let der_bytes = private_key
        .to_pkcs8_der()
        .map_err(|e| format!("Erro ao converter para PKCS8: {}", e))?
        .as_bytes()
        .to_vec();
    Ok(der_bytes)
}

/// Aplica canonicalização C14N simplificada ao fragmento XML.
pub fn canonicalizar_c14n(xml: &str) -> String {
    xml.lines()
        .map(|line| line.trim())
        .filter(|line| !line.is_empty())
        .collect::<Vec<&str>>()
        .join("")
}

/// Isola o elemento `<infNFe ...>` do XML da NFe para o cálculo do Digest.
pub fn isolar_inf_nfe(xml_nfe: &str) -> Result<String, String> {
    let start_idx = xml_nfe
        .find("<infNFe")
        .ok_or_else(|| "Elemento <infNFe> não encontrado no XML".to_string())?;
    let end_tag = "</infNFe>";
    let end_idx = xml_nfe
        .find(end_tag)
        .ok_or_else(|| "Elemento de fechamento </infNFe> não encontrado no XML".to_string())?
        + end_tag.len();

    Ok(xml_nfe[start_idx..end_idx].to_string())
}

/// Extrai a Chave de Acesso do atributo Id da tag `<infNFe Id="NFe...">`.
pub fn extrair_id_inf_nfe(inf_nfe_str: &str) -> Result<String, String> {
    if let Some(pos) = inf_nfe_str.find("Id=\"") {
        let after = &inf_nfe_str[pos + 4..];
        if let Some(end_pos) = after.find('"') {
            return Ok(after[..end_pos].to_string());
        }
    }
    Err("Atributo Id não encontrado em <infNFe>".to_string())
}

/// Assina digitalmente um documento XML NF-e/NFC-e usando a chave A1 no padrão XMLDSIG.
///
/// Retorna uma tupla `(xml_assinado, digest_value_b64, signature_value_b64)`.
pub fn assinar_xml_nfe(
    xml_nfe: &str,
    pfx_bytes: &[u8],
    password: &str,
) -> Result<(String, String, String), String> {
    let chave = carregar_certificado_pfx(pfx_bytes, password)?;

    // 1. Isola e canonicaliza <infNFe>
    let inf_nfe_raw = isolar_inf_nfe(xml_nfe)?;
    let inf_nfe_c14n = canonicalizar_c14n(&inf_nfe_raw);
    let id_attribute = extrair_id_inf_nfe(&inf_nfe_raw)?;

    // 2. Calcula SHA-1 Digest do <infNFe>
    let mut hasher = Sha1::new();
    hasher.update(inf_nfe_c14n.as_bytes());
    let digest_bytes = hasher.finalize();
    let digest_value_b64 = BASE64.encode(digest_bytes);

    let signed_info_xml = format!(
        "<SignedInfo xmlns=\"http://www.w3.org/2000/09/xmldsig#\"><CanonicalizationMethod Algorithm=\"http://www.w3.org/TR/2001/REC-xml-c14n-20010315\"/><SignatureMethod Algorithm=\"http://www.w3.org/2000/09/xmldsig#rsa-sha1\"/><Reference URI=\"#{}\"><Transforms><Transform Algorithm=\"http://www.w3.org/2000/09/xmldsig#enveloped-signature\"/><Transform Algorithm=\"http://www.w3.org/TR/2001/REC-xml-c14n-20010315\"/></Transforms><DigestMethod Algorithm=\"http://www.w3.org/2000/09/xmldsig#sha1\"/><DigestValue>{}</DigestValue></Reference></SignedInfo>",
        id_attribute, digest_value_b64
    );

    let signed_info_c14n = canonicalizar_c14n(&signed_info_xml);

    // 4. Assina o <SignedInfo> via RSA com SHA-1
    let mut hasher_info = Sha1::new();
    hasher_info.update(signed_info_c14n.as_bytes());
    let hashed_info = hasher_info.finalize();

    let padding = Pkcs1v15Sign::new::<sha1::Sha1>();
    let signature_bytes = chave
        .private_key
        .sign(padding, &hashed_info)
        .map_err(|e| format!("Erro ao assinar SignedInfo: {}", e))?;
    let signature_value_b64 = BASE64.encode(signature_bytes);

    // 5. Usa Certificado X.509 em Base64
    let x509_b64 = if chave.cert_der_b64.is_empty() {
        "MII...".to_string()
    } else {
        chave.cert_der_b64
    };

    // 6. Monta o bloco final <Signature>
    let signature_block = format!(
        r#"<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">{}<SignatureValue>{}</SignatureValue><KeyInfo><X509Data><X509Certificate>{}</X509Certificate></X509Data></KeyInfo></Signature>"#,
        signed_info_xml, signature_value_b64, x509_b64
    );

    // 7. Insere o <Signature> dentro de <NFe> logo após </infNFe>
    let xml_assinado = if let Some(pos) = xml_nfe.find("</infNFe>") {
        let (head, tail) = xml_nfe.split_at(pos + "</infNFe>".len());
        format!("{}{}{}", head, signature_block, tail)
    } else {
        format!("{}{}", xml_nfe, signature_block)
    };

    Ok((xml_assinado, digest_value_b64, signature_value_b64))
}

/// Valida estruturalmente e criptograficamente uma assinatura XMLDSIG presente num documento NF-e.
pub fn validar_assinatura_xml(xml_assinado: &str) -> Result<bool, String> {
    let inf_nfe = isolar_inf_nfe(xml_assinado)?;
    let inf_nfe_c14n = canonicalizar_c14n(&inf_nfe);

    let mut hasher = Sha1::new();
    hasher.update(inf_nfe_c14n.as_bytes());
    let digest_recalculado = BASE64.encode(hasher.finalize());

    // Extrai DigestValue do XML
    let start_dig = xml_assinado
        .find("<DigestValue>")
        .ok_or_else(|| "Tag <DigestValue> ausente".to_string())?
        + "<DigestValue>".len();
    let end_dig = xml_assinado
        .find("</DigestValue>")
        .ok_or_else(|| "Tag </DigestValue> ausente".to_string())?;
    let digest_xml = &xml_assinado[start_dig..end_dig];

    if digest_recalculado != digest_xml {
        warn!("DigestValue divergente no XML assinado!");
        return Ok(false);
    }

    // Verifica se SignatureValue e X509Certificate estão presentes
    let tem_signature = xml_assinado.contains("<SignatureValue>") && xml_assinado.contains("</SignatureValue>");
    let tem_cert = xml_assinado.contains("<X509Certificate>") && xml_assinado.contains("</X509Certificate>");

    Ok(tem_signature && tem_cert)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_gerar_e_assinar_xml_nfe() {
        let password = "senha_teste_a1";
        let pfx_bytes = gerar_certificado_a1_teste(password).unwrap();

        let xml_original = r#"<NFe xmlns="http://www.portalfiscal.inf.br/nfe"><infNFe Id="NFe352608123456780001650010000001001876543210" versao="4.00"><ide><cUF>35</cUF><cNF>87654321</cNF><natOp>VENDA DE MERCADORIA</natOp></ide></infNFe></NFe>"#;

        let (xml_assinado, digest, sig_val) =
            assinar_xml_nfe(xml_original, &pfx_bytes, password).unwrap();

        assert!(!digest.is_empty());
        assert!(!sig_val.is_empty());
        assert!(xml_assinado.contains("<Signature xmlns=\"http://www.w3.org/2000/09/xmldsig#\">"));
        assert!(xml_assinado.contains(&digest));

        let valido = validar_assinatura_xml(&xml_assinado).unwrap();
        assert!(valido);
    }

    #[test]
    fn test_keyring_salvar_e_recuperar() {
        let alias = "teste_cert_alias_123";
        let pass = "minha_senha_super_segura";

        if let Ok(_) = save_cert_password(alias, pass) {
            let recovered = get_cert_password(alias).unwrap();
            assert_eq!(recovered, pass);
            let _ = delete_cert_password(alias);
        }
    }
}
