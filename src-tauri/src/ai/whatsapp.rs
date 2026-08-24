use serde::{Deserialize, Serialize};
use tracing::info;
use crate::ai::encryption::{encrypt_key, decrypt_key};

const SECRET_SALT: &str = "COLISEU_ERP_SECRET_SALT_2026_AI_KEY";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WhatsAppConfigInfo {
    pub id: String,
    pub filial_id: String,
    pub session_name: String,
    pub status: String,
    pub api_url: Option<String>,
    pub has_api_key: bool,
    pub phone_number: Option<String>,
    pub auto_reply_enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WhatsAppSendResult {
    pub success: bool,
    pub message_id: Option<String>,
    pub reason: String,
}

pub struct WhatsAppGateway;

impl WhatsAppGateway {
    /// Envia mensagem de texto via gateway WhatsApp (Evolution API / Meta Cloud)
    pub async fn send_text_message(
        api_url: &str,
        api_key: &str,
        phone_number: &str,
        message: &str,
    ) -> WhatsAppSendResult {
        if api_url.is_empty() {
            return WhatsAppSendResult {
                success: false,
                message_id: None,
                reason: "URL da API do WhatsApp não configurada".into(),
            };
        }

        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(10))
            .build();

        let client = match client {
            Ok(c) => c,
            Err(e) => return WhatsAppSendResult {
                success: false,
                message_id: None,
                reason: format!("Erro ao criar cliente HTTP: {}", e),
            },
        };

        let clean_phone = phone_number.replace(|c: char| !c.is_numeric(), "");

        let payload = serde_json::json!({
            "number": clean_phone,
            "text": message
        });

        let mut req = client.post(api_url).json(&payload);

        if !api_key.is_empty() {
            req = req.header("apikey", api_key).header("Authorization", format!("Bearer {}", api_key));
        }

        match req.send().await {
            Ok(res) if res.status().is_success() => {
                info!("📱 [WhatsApp] Mensagem enviada com sucesso para {}", clean_phone);
                WhatsAppSendResult {
                    success: true,
                    message_id: Some(format!("msg_{}", uuid::Uuid::new_v4())),
                    reason: "Mensagem enviada com sucesso".into(),
                }
            }
            Ok(res) => {
                let err_msg = format!("Erro HTTP {}", res.status());
                WhatsAppSendResult {
                    success: false,
                    message_id: None,
                    reason: err_msg,
                }
            }
            Err(e) => WhatsAppSendResult {
                success: false,
                message_id: None,
                reason: format!("Falha de conexão com gateway WhatsApp: {}", e),
            },
        }
    }
}
