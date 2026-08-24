// Configurações e Tabelas de Referência para CIOT e Piso Mínimo de Frete (ANTT)

export interface CiotIpefConfig {
  ipef: 'PAMCARD' | 'REPOM' | 'NDDCARGO' | 'SEMPARAR' | 'ANTT_DIRETO';
  nome: string;
  ativo: boolean;
  apiUrl: string;
  usuarioOuApiKey?: string;
  codigoContratante?: string;
}

export interface CiotConfiguracaoCompleta {
  ipefPadrao: 'PAMCARD' | 'REPOM' | 'NDDCARGO' | 'SEMPARAR' | 'ANTT_DIRETO';
  exigirCiotParaTac: boolean;
  bloquearAbaixoPisoMinimo: boolean;
  prazoPagamentoDias: number; // 30 dias padrão
  ipefs: CiotIpefConfig[];
}

export const CONFIG_CIOT_PADRAO: CiotConfiguracaoCompleta = {
  ipefPadrao: 'PAMCARD',
  exigirCiotParaTac: true,
  bloquearAbaixoPisoMinimo: false, // Avisa com alerta visual
  prazoPagamentoDias: 30,
  ipefs: [
    {
      ipef: 'PAMCARD',
      nome: 'Pamcard (Roadcard / CIOT)',
      ativo: true,
      apiUrl: 'https://api.roadcard.com.br/pef/v1',
      usuarioOuApiKey: 'COLISEU_DEMO_KEY_PAMCARD',
      codigoContratante: '68148349000109',
    },
    {
      ipef: 'REPOM',
      nome: 'Repom (Edenred Fretes)',
      ativo: true,
      apiUrl: 'https://api.repom.com.br/ciot/v2',
      usuarioOuApiKey: 'COLISEU_DEMO_KEY_REPOM',
      codigoContratante: '68148349000109',
    },
    {
      ipef: 'ANTT_DIRETO',
      nome: 'CIOT para Todos (API Oficial ANTT)',
      ativo: true,
      apiUrl: 'https://ciot.antt.gov.br/api/v1',
    },
  ],
};

const STORAGE_KEY_CIOT_CONFIG = 'coliseu_ciot_config';

export function getCiotConfig(): CiotConfiguracaoCompleta {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CIOT_CONFIG);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_CIOT_CONFIG, JSON.stringify(CONFIG_CIOT_PADRAO));
      return CONFIG_CIOT_PADRAO;
    }
    return { ...CONFIG_CIOT_PADRAO, ...JSON.parse(raw) };
  } catch {
    return CONFIG_CIOT_PADRAO;
  }
}

export function salvarCiotConfig(config: CiotConfiguracaoCompleta): CiotConfiguracaoCompleta {
  localStorage.setItem(STORAGE_KEY_CIOT_CONFIG, JSON.stringify(config));
  window.dispatchEvent(new Event('coliseu_ciot_config_updated'));
  return config;
}
