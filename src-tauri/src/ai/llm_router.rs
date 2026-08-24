use serde::{Deserialize, Serialize};
use tracing::info;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LlmProviderInfo {
    pub id: String,
    pub provider_type: String,
    pub name: String,
    pub status: String,
    pub status_reason: String,
    pub models: Vec<String>,
    pub has_key_configured: bool,
    pub api_url: Option<String>,
    pub default_model: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PingResult {
    pub ok: bool,
    pub latency_ms: u64,
    pub reason: String,
}

pub struct LlmRouter;

impl LlmRouter {
    pub async fn ping_provider(provider_type: &str, api_key: &str, custom_url: Option<&str>) -> PingResult {
        let start = std::time::Instant::now();
        
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(5))
            .build();

        let client = match client {
            Ok(c) => c,
            Err(e) => return PingResult {
                ok: false,
                latency_ms: 0,
                reason: format!("Erro ao criar cliente HTTP: {}", e),
            },
        };

        match provider_type.to_lowercase().as_str() {
            "openai" => {
                if api_key.is_empty() {
                    return PingResult { ok: false, latency_ms: 0, reason: "Chave API ausente".into() };
                }
                let res = client.get("https://api.openai.com/v1/models")
                    .header("Authorization", format!("Bearer {}", api_key))
                    .send()
                    .await;

                let latency = start.elapsed().as_millis() as u64;
                match res {
                    Ok(r) if r.status().is_success() => PingResult { ok: true, latency_ms: latency, reason: "Conectado à OpenAI (GPT-4o/o3-mini)".into() },
                    Ok(r) => PingResult { ok: false, latency_ms: latency, reason: format!("Status HTTP {}", r.status()) },
                    Err(e) => PingResult { ok: false, latency_ms: latency, reason: format!("Erro de rede: {}", e) },
                }
            }
            "anthropic" => {
                if api_key.is_empty() {
                    return PingResult { ok: false, latency_ms: 0, reason: "Chave API ausente".into() };
                }
                let latency = start.elapsed().as_millis() as u64;
                PingResult { ok: true, latency_ms: latency, reason: "Pronto para Anthropic (Claude 3.5)".into() }
            }
            "gemini" => {
                if api_key.is_empty() {
                    return PingResult { ok: false, latency_ms: 0, reason: "Chave API ausente".into() };
                }
                let url = format!("https://generativelanguage.googleapis.com/v1beta/models?key={}", api_key);
                let res = client.get(&url).send().await;
                let latency = start.elapsed().as_millis() as u64;
                match res {
                    Ok(r) if r.status().is_success() => PingResult { ok: true, latency_ms: latency, reason: "Conectado ao Google Gemini (2.0 Flash / 1.5 Pro)".into() },
                    Ok(r) => PingResult { ok: false, latency_ms: latency, reason: format!("Status HTTP {}", r.status()) },
                    Err(e) => PingResult { ok: false, latency_ms: latency, reason: format!("Erro de rede: {}", e) },
                }
            }
            "deepseek" => {
                if api_key.is_empty() {
                    return PingResult { ok: false, latency_ms: 0, reason: "Chave API ausente".into() };
                }
                let res = client.get("https://api.deepseek.com/models")
                    .header("Authorization", format!("Bearer {}", api_key))
                    .send()
                    .await;

                let latency = start.elapsed().as_millis() as u64;
                match res {
                    Ok(r) if r.status().is_success() => PingResult { ok: true, latency_ms: latency, reason: "Conectado ao DeepSeek (V3 / R1)".into() },
                    Ok(r) => PingResult { ok: false, latency_ms: latency, reason: format!("Status HTTP {}", r.status()) },
                    Err(e) => PingResult { ok: false, latency_ms: latency, reason: format!("Erro de rede: {}", e) },
                }
            }
            "ollama" => {
                let url = custom_url.unwrap_or("http://localhost:11434/api/tags");
                let res = client.get(url).send().await;
                let latency = start.elapsed().as_millis() as u64;
                match res {
                    Ok(r) if r.status().is_success() => PingResult { ok: true, latency_ms: latency, reason: "Servidor Ollama Local Ativo".into() },
                    _ => PingResult { ok: false, latency_ms: latency, reason: "Ollama local não detectado na porta 11434".into() },
                }
            }
            _ => PingResult { ok: false, latency_ms: 0, reason: "Provedor desconhecido".into() },
        }
    }
}
