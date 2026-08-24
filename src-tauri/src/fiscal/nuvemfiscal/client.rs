//! Cliente HTTP REST para API Nuvem Fiscal (OAuth2 + NF-e / NFC-e)

use serde::{Deserialize, Serialize};
use std::time::Duration;
use tracing::{error, info};

const AUTH_URL: &str = "https://auth.nuvemfiscal.com.br/oauth/token";
const BASE_URL_PROD: &str = "https://api.nuvemfiscal.com.br";
const BASE_URL_SANDBOX: &str = "https://api.sandbox.nuvemfiscal.com.br";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OAuthTokenResponse {
    pub access_token: String,
    pub token_type: String,
    pub expires_in: u64,
    pub scope: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SefazStatusResponse {
    pub status: Option<String>,
    pub codigo_status: Option<u32>,
    pub motivo_status: Option<String>,
    pub data_hora_consulta: Option<String>,
    pub ambiente: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NuvemFiscalNfeResponse {
    pub id: Option<String>,
    pub status: Option<String>,
    pub motivo_status: Option<String>,
    pub codigo_status: Option<u32>,
    pub chave: Option<String>,
    pub numero_protocolo: Option<String>,
    pub data_emissao: Option<String>,
    pub data_autorizacao: Option<String>,
    pub xml_url: Option<String>,
    pub pdf_url: Option<String>,
}

/// 1. Obtém o Token de Acesso via OAuth 2.0 (Client Credentials)
pub async fn obter_access_token(
    client_id: &str,
    client_secret: &str,
) -> Result<String, String> {
    info!("Autenticando na Nuvem Fiscal via OAuth2...");

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .build()
        .map_err(|e| format!("Erro ao criar cliente HTTP: {}", e))?;

    let params = [
        ("grant_type", "client_credentials"),
        ("client_id", client_id),
        ("client_secret", client_secret),
        ("scope", "empresa nfe nfce conta"),
    ];

    let resp = client
        .post(AUTH_URL)
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("Falha ao conectar no servidor de autenticação da Nuvem Fiscal: {}", e))?;

    if !resp.status().is_success() {
        let status_code = resp.status();
        let error_body = resp.text().await.unwrap_or_default();
        return Err(format!(
            "Erro de autenticação Nuvem Fiscal (HTTP {}): {}. Verifique se o Client ID e Client Secret estão corretos.",
            status_code, error_body
        ));
    }

    let token_data: OAuthTokenResponse = resp
        .json()
        .await
        .map_err(|e| format!("Erro ao decodificar token OAuth2 da Nuvem Fiscal: {}", e))?;

    info!("Token OAuth2 obtido com sucesso. Expira em {}s", token_data.expires_in);
    Ok(token_data.access_token)
}

fn get_base_url(sandbox: bool) -> &'static str {
    if sandbox {
        BASE_URL_SANDBOX
    } else {
        BASE_URL_PROD
    }
}

/// 2. Consulta o Status da SEFAZ para a empresa/UF via Nuvem Fiscal
pub async fn consultar_status_sefaz(
    token: &str,
    cpf_cnpj: &str,
    sandbox: bool,
) -> Result<SefazStatusResponse, String> {
    let clean_cnpj = cpf_cnpj.chars().filter(|c| c.is_ascii_digit()).collect::<String>();
    let base_url = get_base_url(sandbox);
    let url = if !clean_cnpj.is_empty() {
        format!("{}/nfe/sefaz/status?cpf_cnpj={}", base_url, clean_cnpj)
    } else {
        format!("{}/nfe/sefaz/status", base_url)
    };

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(12))
        .build()
        .map_err(|e| format!("Erro ao criar cliente HTTP: {}", e))?;

    let resp = client
        .get(&url)
        .bearer_auth(token)
        .header("Accept", "application/json")
        .send()
        .await
        .map_err(|e| format!("Falha ao consultar status da SEFAZ na Nuvem Fiscal: {}", e))?;

    if !resp.status().is_success() {
        let status_code = resp.status();
        let error_body = resp.text().await.unwrap_or_default();
        return Err(format!(
            "Nuvem Fiscal SEFAZ Status (HTTP {}): {}",
            status_code, error_body
        ));
    }

    let status_data: SefazStatusResponse = resp
        .json()
        .await
        .map_err(|e| format!("Erro ao interpretar retorno da SEFAZ: {}", e))?;

    Ok(status_data)
}

/// 3. Emite uma NF-e enviando o payload JSON para a Nuvem Fiscal
pub async fn emitir_nfe(
    token: &str,
    payload: &serde_json::Value,
    sandbox: bool,
) -> Result<NuvemFiscalNfeResponse, String> {
    let base_url = get_base_url(sandbox);
    let url = format!("{}/nfe", base_url);

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(20))
        .build()
        .map_err(|e| format!("Erro ao criar cliente HTTP: {}", e))?;

    let resp = client
        .post(&url)
        .bearer_auth(token)
        .header("Content-Type", "application/json")
        .header("Accept", "application/json")
        .json(payload)
        .send()
        .await
        .map_err(|e| format!("Falha ao transmitir NF-e para a Nuvem Fiscal: {}", e))?;

    if !resp.status().is_success() {
        let status_code = resp.status();
        let error_body = resp.text().await.unwrap_or_default();
        return Err(format!(
            "Erro ao emitir NF-e na Nuvem Fiscal (HTTP {}): {}",
            status_code, error_body
        ));
    }

    let nfe_res: NuvemFiscalNfeResponse = resp
        .json()
        .await
        .map_err(|e| format!("Erro ao ler dados da NF-e emitida: {}", e))?;

    Ok(nfe_res)
}

/// 4. Consulta NF-e por ID na Nuvem Fiscal
pub async fn consultar_nfe_por_id(
    token: &str,
    id_nfe: &str,
    sandbox: bool,
) -> Result<NuvemFiscalNfeResponse, String> {
    let base_url = get_base_url(sandbox);
    let url = format!("{}/nfe/{}", base_url, id_nfe);

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .build()
        .map_err(|e| format!("Erro ao criar cliente HTTP: {}", e))?;

    let resp = client
        .get(&url)
        .bearer_auth(token)
        .header("Accept", "application/json")
        .send()
        .await
        .map_err(|e| format!("Falha ao consultar NF-e: {}", e))?;

    if !resp.status().is_success() {
        let status_code = resp.status();
        let error_body = resp.text().await.unwrap_or_default();
        return Err(format!(
            "Erro ao consultar NF-e (HTTP {}): {}",
            status_code, error_body
        ));
    }

    let nfe_res: NuvemFiscalNfeResponse = resp
        .json()
        .await
        .map_err(|e| format!("Erro ao decodificar consulta da NF-e: {}", e))?;

    Ok(nfe_res)
}

/// 5. Cancela uma NF-e na Nuvem Fiscal
pub async fn cancelar_nfe(
    token: &str,
    id_nfe: &str,
    justificativa: &str,
    sandbox: bool,
) -> Result<String, String> {
    let base_url = get_base_url(sandbox);
    let url = format!("{}/nfe/{}/cancelamento", base_url, id_nfe);

    let body = serde_json::json!({
        "justificativa": justificativa
    });

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(15))
        .build()
        .map_err(|e| format!("Erro ao criar cliente HTTP: {}", e))?;

    let resp = client
        .post(&url)
        .bearer_auth(token)
        .header("Content-Type", "application/json")
        .header("Accept", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Falha ao solicitar cancelamento na Nuvem Fiscal: {}", e))?;

    if !resp.status().is_success() {
        let status_code = resp.status();
        let error_body = resp.text().await.unwrap_or_default();
        return Err(format!(
            "Erro ao cancelar NF-e na Nuvem Fiscal (HTTP {}): {}",
            status_code, error_body
        ));
    }

    let result_text = resp.text().await.unwrap_or_default();
    Ok(result_text)
}

/// 6. Registra Carta de Correção (CC-e)
pub async fn carta_correcao_nfe(
    token: &str,
    id_nfe: &str,
    correcao: &str,
    sandbox: bool,
) -> Result<String, String> {
    let base_url = get_base_url(sandbox);
    let url = format!("{}/nfe/{}/carta-correcao", base_url, id_nfe);

    let body = serde_json::json!({
        "correcao": correcao
    });

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(15))
        .build()
        .map_err(|e| format!("Erro ao criar cliente HTTP: {}", e))?;

    let resp = client
        .post(&url)
        .bearer_auth(token)
        .header("Content-Type", "application/json")
        .header("Accept", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Falha ao enviar CC-e na Nuvem Fiscal: {}", e))?;

    if !resp.status().is_success() {
        let status_code = resp.status();
        let error_body = resp.text().await.unwrap_or_default();
        return Err(format!(
            "Erro ao registrar Carta de Correção (HTTP {}): {}",
            status_code, error_body
        ));
    }

    let result_text = resp.text().await.unwrap_or_default();
    Ok(result_text)
}

/// 7. Inutilização de Faixa Numérica
pub async fn inutilizar_numeracao_nfe(
    token: &str,
    cnpj: &str,
    ano: u32,
    serie: u32,
    numero_inicial: u32,
    numero_final: u32,
    justificativa: &str,
    sandbox: bool,
) -> Result<String, String> {
    let base_url = get_base_url(sandbox);
    let url = format!("{}/nfe/inutilizacoes", base_url);

    let clean_cnpj = cnpj.chars().filter(|c| c.is_ascii_digit()).collect::<String>();
    let body = serde_json::json!({
        "cnpj": clean_cnpj,
        "ano": ano,
        "serie": serie,
        "numero_inicial": numero_inicial,
        "numero_final": numero_final,
        "justificativa": justificativa
    });

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(15))
        .build()
        .map_err(|e| format!("Erro ao criar cliente HTTP: {}", e))?;

    let resp = client
        .post(&url)
        .bearer_auth(token)
        .header("Content-Type", "application/json")
        .header("Accept", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Falha ao inutilizar numeração na Nuvem Fiscal: {}", e))?;

    if !resp.status().is_success() {
        let status_code = resp.status();
        let error_body = resp.text().await.unwrap_or_default();
        return Err(format!(
            "Erro ao inutilizar numeração (HTTP {}): {}",
            status_code, error_body
        ));
    }

    let result_text = resp.text().await.unwrap_or_default();
    Ok(result_text)
}
