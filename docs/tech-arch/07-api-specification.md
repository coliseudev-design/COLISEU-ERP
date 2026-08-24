# 07 — API SPECIFICATION

## Registro de Comandos IPC Tauri React ↔ Rust

| Comando IPC | Domínio | Parâmetros | Descrição |
| :--- | :--- | :--- | :--- |
| `get_db_status` | Organization | N/A | Retorna status de encriptação e caminho do banco. |
| `validate_sync_schema` | Audit | N/A | Executa auditoria DDL das 60 tabelas. |
| `emitir_nfce_offline` | Fiscal | `venda_id, contingencia_reason` | Emite NFC-e em modo contingencial tpEmis=9. |
| `gerar_efd_icms_ipi` | Fiscal | `periodo_inicio, periodo_fim` | Gera arquivo texto do SPED Fiscal ICMS-IPI. |
| `processar_venda_pdv` | Sales | `venda_payload` | Processa venda no PDV com rateio de desconto. |
| `enviar_mensagem_whatsapp` | Notification | `destinatario, mensagem` | Envia mensagem pelo WhatsApp Gateway em Rust. |
