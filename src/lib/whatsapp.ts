import { safeInvoke as invoke } from "./ipc";

export interface WhatsAppConfigInfo {
  id: string;
  filial_id: string;
  session_name: string;
  status: string;
  api_url?: string;
  has_api_key: boolean;
  phone_number?: string;
  auto_reply_enabled: boolean;
}

export interface WhatsAppSendResult {
  success: boolean;
  message_id?: string;
  reason: string;
}

export async function getWhatsAppConfig(filialId: string): Promise<WhatsAppConfigInfo | null> {
  try {
    return await invoke<WhatsAppConfigInfo | null>('get_whatsapp_config', { filialId });
  } catch (error) {
    console.error('Erro ao buscar configuração WhatsApp:', error);
    return null;
  }
}

export async function salvarWhatsAppConfig(
  filialId: string,
  sessionName: string,
  apiUrl?: string,
  apiKey?: string,
  phoneNumber?: string,
  autoReplyEnabled: boolean = false
): Promise<string> {
  return await invoke<string>('salvar_whatsapp_config', {
    filialId,
    sessionName,
    apiUrl,
    apiKey,
    phoneNumber,
    autoReplyEnabled,
  });
}

export async function enviarMensagemWhatsApp(
  filialId: string,
  phoneNumber: string,
  message: string
): Promise<WhatsAppSendResult> {
  return await invoke<WhatsAppSendResult>('enviar_mensagem_whatsapp', {
    filialId,
    phoneNumber,
    message,
  });
}
