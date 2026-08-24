use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::broadcast;
use tracing::info;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemEvent {
    pub event_id: String,
    pub event_type: String,
    pub domain: String,
    pub payload_json: String,
    pub timestamp: String,
    pub user_id: Option<String>,
    pub filial_id: Option<String>,
}

#[derive(Clone)]
pub struct EventBus {
    sender: broadcast::Sender<SystemEvent>,
}

impl EventBus {
    pub fn new(capacity: usize) -> Self {
        let (sender, _) = broadcast::channel(capacity);
        Self { sender }
    }

    pub fn publish(&self, event: SystemEvent) -> Result<usize, String> {
        info!("📢 [EventBus] Publicando evento: [{}] {}", event.domain, event.event_type);
        self.sender
            .send(event)
            .map_err(|e| format!("Falha ao enviar evento no EventBus: {}", e))
    }

    pub fn subscribe(&self) -> broadcast::Receiver<SystemEvent> {
        self.sender.subscribe()
    }
}

pub type SharedEventBus = Arc<EventBus>;
