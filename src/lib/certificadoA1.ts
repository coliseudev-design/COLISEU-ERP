// Gerenciador de Certificado Digital A1, Configurações de DF-e e Séries (NFC-e 65, NF-e 55, MDF-e 58)

export interface CertificadoA1Config {
  instalado: boolean;
  nomeTitular: string;
  cnpjTitular: string;
  emissor: string;
  validadeInicio: string;
  validadeFim: string;
  diasRestantes: number;
  senhaSalva: boolean;
  ambiente: 'HOMOLOGACAO' | 'PRODUCAO';
  
  // Séries e Numerações
  nfeSerie: number;
  nfeNumeroAtual: number;
  
  nfceSerie: number;
  nfceNumeroAtual: number;
  nfceIdCsc: string;
  nfceCscToken: string;
  
  mdfeSerie: number;
  mdfeNumeroAtual: number;
  rntrcEmpresa?: string;
  
  // Regras de Emissão
  contingenciaOfflineAtiva: boolean;
  enviarEmailAutomatico: boolean;
}

const STORAGE_KEY_CERT = 'coliseu_config_certificado_dfe';

const DEFAULT_CONFIG: CertificadoA1Config = {
  instalado: true,
  nomeTitular: 'COLISEU MATERIAIS & DISTRIBUICAO LTDA',
  cnpjTitular: '12.345.678/0001-90',
  emissor: 'AC SERASA RFB v5 (ICP-BRASIL)',
  validadeInicio: '01/01/2026',
  validadeFim: '01/01/2027',
  diasRestantes: 136,
  senhaSalva: true,
  ambiente: 'HOMOLOGACAO',
  
  nfeSerie: 1,
  nfeNumeroAtual: 1042,
  
  nfceSerie: 1,
  nfceNumeroAtual: 3820,
  nfceIdCsc: '000001',
  nfceCscToken: '9B8A7C6D5E4F3A2B1C0D9E8F7A6B5C4D',
  
  mdfeSerie: 1,
  mdfeNumeroAtual: 128,
  rntrcEmpresa: '09812345',
  
  contingenciaOfflineAtiva: false,
  enviarEmailAutomatico: true,
};

export function getCertificadoConfig(): CertificadoA1Config {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CERT);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_CERT, JSON.stringify(DEFAULT_CONFIG));
      return DEFAULT_CONFIG;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function salvarCertificadoConfig(config: CertificadoA1Config): CertificadoA1Config {
  localStorage.setItem(STORAGE_KEY_CERT, JSON.stringify(config));
  window.dispatchEvent(new Event('coliseu_cert_updated'));
  return config;
}
