// Gerenciador e Modelo de Configurações da NFC-e (SEFAZ Modelo 65 - Varejo / PDV)

export type TipoImpressaoDanfeNfce = 'BOBINA_80MM' | 'BOBINA_58MM' | 'A4_COMPACTO';
export type FormaEmissaoNfce = 'NORMAL' | 'CONTINGÊNCIA OFFLINE NFC-E';
export type AmbienteSefazNfce = 'PRODUÇÃO' | 'HOMOLOGAÇÃO';
export type ModoOperacaoFiscalNfce = 'TECNOSPEED' | 'ACBR' | 'NUVEM_FISCAL' | 'TREINAMENTO' | 'WEBSERVICE';

export interface NfceConfiguracaoCompleta {
  // --- MODO DE OPERAÇÃO FISCAL ---
  modoOperacao: ModoOperacaoFiscalNfce; // 'TECNOSPEED' (Componente Desktop :8081 / TX2), 'ACBR', 'TREINAMENTO' ou 'WEBSERVICE'
  
  // --- TECNOSPEED COMPONENTE DESKTOP (COM / OCX & MANAGER) ---
  tecnoSpeedCnpjSoftwareHouse: string; // Ex: '03.661.869/0001-75' (Silenus Software)
  tecnoSpeedTokenSoftwareHouse: string; // Ex: '6f46553fc8fcf2e4263df17c11acafc0'
  tecnoSpeedDiretorioBase: string; // Padrão: 'C:\\ERPFULL\\NFE'
  tecnoSpeedHost: string;
  tecnoSpeedPorta: number;
  tecnoSpeedGrupo: string;
  tecnoSpeedUsuario: string;
  tecnoSpeedSenha: string;
  tecnoSpeedPastaEntrada: string;
  tecnoSpeedPastaRetorno: string;

  // --- NUVEM FISCAL API ---
  nuvemFiscalClientId: string;
  nuvemFiscalClientSecret: string;
  nuvemFiscalAmbiente: 'SANDBOX' | 'PRODUÇÃO';

  // --- ACBR MONITOR ---
  hostAcbr: string;
  portaAcbr: number;

  // --- 1. DADOS PRINCIPAL & TOKENS SEFAZ (CSC) & NUMERAÇÃO ---
  serieNfce: number; // Série padrão da NFC-e (ex: 1)
  proximoNumeroNfce: number; // Próximo número da NFC-e a ser emitido (ex: 120)
  ultimoNumeroAutorizadoNfce?: number;
  cnpjEmitente: string;
  nomeEmitente: string;
  inscricaoEstadualEmitente?: string;
  certificadoDigital: string;
  caminhoArquivoPfx: string;
  senhaCertificadoA1: string;
  idCsc: string; // Ex: '000001'
  codigoCsc: string; // Token CSC alfanumérico fornecido pela SEFAZ
  tipoImpressaoDanfe: TipoImpressaoDanfeNfce;
  modeloDanfce?: string;
  cortarPapelAutomatico: boolean;
  formaEmissao: FormaEmissaoNfce;
  caminhoLogotipo: string;
  pastaArmazenamentoNfce: string;
  ufWebService: string;
  versaoWebService: string;
  ambienteDestino: AmbienteSefazNfce;
  usarModoSincrono: boolean;

  // --- 2. OUTROS DADOS & CUPOM FISCAL ---
  versaoEsquema: string; // Ex: 'pl_009o'
  versaoManual: string;  // Ex: 'vm60'
  fusoHorario: string;   // Ex: '-04:00'
  validarEsquema: boolean;
  enviarCodigoBarra: boolean;
  fazerUploadSieg: boolean;
  mensagemPromocionalRodape: string;
  pastaArmazenamentoXmlCancelados: string;
  pastaArmazenamentoXmlEntrada: string;

  // --- 3. RESPONSÁVEL TÉCNICO (SEFAZ NT 2018.005) ---
  cnpjResponsavelTecnico: string;
  contatoResponsavelTecnico: string;
  foneResponsavelTecnico: string;
  emailResponsavelTecnico: string;
  idCsrt: string;
  hashCsrt: string;
}

export const CONFIG_NFCE_PADRAO: NfceConfiguracaoCompleta = {
  modoOperacao: 'TECNOSPEED',
  tecnoSpeedCnpjSoftwareHouse: '03.661.869/0001-75',
  tecnoSpeedTokenSoftwareHouse: '6f46553fc8fcf2e4263df17c11acafc0',
  tecnoSpeedDiretorioBase: 'C:\\ERPFULL\\NFE',
  tecnoSpeedHost: '127.0.0.1',
  tecnoSpeedPorta: 8081,
  tecnoSpeedGrupo: 'DEFAULT',
  tecnoSpeedUsuario: '',
  tecnoSpeedSenha: '',
  tecnoSpeedPastaEntrada: 'C:\\TecnoSpeed\\NFe\\Entrada\\',
  tecnoSpeedPastaRetorno: 'C:\\TecnoSpeed\\NFe\\Retorno\\',
  nuvemFiscalClientId: '',
  nuvemFiscalClientSecret: '',
  nuvemFiscalAmbiente: 'SANDBOX',
  hostAcbr: '127.0.0.1',
  portaAcbr: 3434,
  serieNfce: 1,
  proximoNumeroNfce: 120,
  ultimoNumeroAutorizadoNfce: 119,
  cnpjEmitente: '68.148.349/0001-09',
  nomeEmitente: 'LIVRARIA DAMASCO LTDA',
  inscricaoEstadualEmitente: '500361673',
  certificadoDigital: 'LIVRARIA DAMASCO LTDA:68148349000109',
  caminhoArquivoPfx: 'C:\\ERPFULL\\CERTDAMASCO 1234.PFX',
  senhaCertificadoA1: '1234',
  idCsc: '000001',
  codigoCsc: '1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P',
  tipoImpressaoDanfe: 'BOBINA_80MM',
  modeloDanfce: 'C:\\ERPFULL\\NFE\\NFCe\\Templates\\vm60\\Danfce\\retrato.rtm',
  cortarPapelAutomatico: true,
  formaEmissao: 'NORMAL',
  caminhoLogotipo: 'C:\\ERPFULL\\NFCE\\logo_cupom.jpg',
  pastaArmazenamentoNfce: 'C:\\ERPFULL\\NFE\\XmlDestinatario\\',
  ufWebService: 'MATO GROSSO DO SUL',
  versaoWebService: '4.0',
  ambienteDestino: 'HOMOLOGAÇÃO',
  usarModoSincrono: true,

  versaoEsquema: 'pl_009o',
  versaoManual: 'vm60',
  fusoHorario: '-04:00',
  validarEsquema: true,
  enviarCodigoBarra: false,
  fazerUploadSieg: true,
  mensagemPromocionalRodape: 'OBRIGADO PELA PREFERENCIA! VOLTE SEMPRE.',
  pastaArmazenamentoXmlCancelados: 'C:\\ERPFULL\\NFCE\\Cancelados',
  pastaArmazenamentoXmlEntrada: 'C:\\ERPFULL\\NFE\\Entrada\\',

  cnpjResponsavelTecnico: '03.661.869/0001-75',
  contatoResponsavelTecnico: 'SILENUS SOFTWARE LTDA',
  foneResponsavelTecnico: '(44) 3037-9500',
  emailResponsavelTecnico: 'suporte@tecnospeed.com.br',
  idCsrt: '',
  hashCsrt: '',
};

const STORAGE_KEY_NFCE_CONFIG = 'coliseu_nfce_configuracao_completa';

export function getNfceConfig(): NfceConfiguracaoCompleta {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_NFCE_CONFIG);
    if (!raw) return CONFIG_NFCE_PADRAO;
    const parsed = JSON.parse(raw);
    const merged = { ...CONFIG_NFCE_PADRAO, ...parsed };
    if (!merged.modoOperacao || merged.modoOperacao === 'TREINAMENTO') {
      merged.modoOperacao = 'TECNOSPEED';
    }
    if (!merged.versaoEsquema || merged.versaoEsquema.startsWith('pl_010') || merged.versaoEsquema === 'vm60') {
      merged.versaoEsquema = 'pl_009o';
    }
    if (!merged.modeloDanfce || merged.modeloDanfce === 'C:\\ERPFULL\\NFE\\NFCe\\Templates\\Danfce.rtm') {
      merged.modeloDanfce = 'C:\\ERPFULL\\NFE\\NFCe\\Templates\\vm60\\Danfce\\retrato.rtm';
    }
    if (!merged.inscricaoEstadualEmitente || merged.inscricaoEstadualEmitente === '283490001' || merged.inscricaoEstadualEmitente === '283261064' || merged.inscricaoEstadualEmitente === '283261864') {
      merged.inscricaoEstadualEmitente = '500361673';
    }
    if (!merged.cnpjEmitente || merged.cnpjEmitente === '05.766.577/0001-22') {
      merged.cnpjEmitente = '68.148.349/0001-09';
      merged.nomeEmitente = 'LIVRARIA DAMASCO LTDA';
      merged.certificadoDigital = 'LIVRARIA DAMASCO LTDA:68148349000109';
      merged.caminhoArquivoPfx = 'C:\\ERPFULL\\CERTDAMASCO 1234.PFX';
      merged.senhaCertificadoA1 = '1234';
    }
    if (!merged.pastaArmazenamentoNfce || merged.pastaArmazenamentoNfce === 'C:\\ERPFULL\\NFCE\\' || merged.pastaArmazenamentoNfce === 'C:\\ERPFULL\\NFE\\') {
      merged.pastaArmazenamentoNfce = 'C:\\ERPFULL\\NFE\\XmlDestinatario\\';
    }
    if (!merged.serieNfce || merged.serieNfce < 1) merged.serieNfce = 1;
    if (!merged.proximoNumeroNfce || merged.proximoNumeroNfce < 1) merged.proximoNumeroNfce = 120;
    return merged;
  } catch {
    return CONFIG_NFCE_PADRAO;
  }
}

export function salvarNfceConfig(config: NfceConfiguracaoCompleta): void {
  localStorage.setItem(STORAGE_KEY_NFCE_CONFIG, JSON.stringify(config));
  window.dispatchEvent(new Event('coliseu_nfce_config_updated'));
}

export function obterProximoNumeroNFCe(): { serie: number; proximoNumero: number } {
  const cfg = getNfceConfig();
  return {
    serie: Number(cfg.serieNfce) || 1,
    proximoNumero: Number(cfg.proximoNumeroNfce) || 120,
  };
}

export function salvarProximoNumeroNFCe(proximoNumero: number, serie?: number): void {
  const cfg = getNfceConfig();
  cfg.proximoNumeroNfce = Math.max(1, Number(proximoNumero) || 1);
  if (serie !== undefined) {
    cfg.serieNfce = Math.max(1, Number(serie) || 1);
  }
  salvarNfceConfig(cfg);
}

export function incrementarNumeroNFCe(numeroAutorizado?: number): number {
  const cfg = getNfceConfig();
  const numAtual = numeroAutorizado || cfg.proximoNumeroNfce;
  cfg.ultimoNumeroAutorizadoNfce = numAtual;
  cfg.proximoNumeroNfce = numAtual + 1;
  salvarNfceConfig(cfg);
  return cfg.proximoNumeroNfce;
}
