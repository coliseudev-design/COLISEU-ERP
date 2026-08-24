import { safeInvoke as invoke } from "./ipc";

export interface LlmProviderInfo {
  id: string;
  provider_type: string;
  name: string;
  status: 'CONECTADO' | 'DESCONECTADO';
  status_reason: string;
  models: string[];
  has_key_configured: boolean;
  api_url?: string;
  default_model?: string;
}

export interface PingResult {
  ok: boolean;
  latency_ms: number;
  reason: string;
}

export async function listLlmProviders(): Promise<LlmProviderInfo[]> {
  try {
    return await invoke<LlmProviderInfo[]>('list_llm_providers');
  } catch (error) {
    console.error('Erro ao listar provedores de IA:', error);
    return [];
  }
}

export async function setLlmProviderKey(
  providerType: string,
  apiKey: string,
  apiUrl?: string
): Promise<PingResult> {
  return await invoke<PingResult>('set_llm_provider_key', {
    providerType,
    apiKey,
    apiUrl,
  });
}

export async function pingLlmProvider(providerType: string): Promise<PingResult> {
  return await invoke<PingResult>('ping_llm_provider', { providerType });
}
