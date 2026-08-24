// Modelo e Gerenciador de Configurações da NF-e (SEFAZ 4.00)

export type TipoImpressaoDanfe = 'RETRATO' | 'PAISAGEM' | 'SIMPLIFICADO';

export type FormaEmissaoNFe =
  | 'NORMAL'
  | 'CONTINGÊNCIA FS-DA'
  | 'CONTINGÊNCIA SCAN'
  | 'CONTINGÊNCIA DPEC'
  | 'CONTINGÊNCIA EPEC'
  | 'CONTINGÊNCIA OFFLINE NFC-E';

export type AmbienteSefaz = 'PRODUÇÃO' | 'HOMOLOGAÇÃO';
export type ModoOperacaoFiscal = 'TECNOSPEED' | 'ACBR' | 'NUVEM_FISCAL' | 'TREINAMENTO' | 'WEBSERVICE';

export interface NfeConfiguracaoCompleta {
  // --- MODO DE OPERAÇÃO FISCAL ---
  modoOperacao: ModoOperacaoFiscal; // 'TECNOSPEED' (Componente Desktop :8081 / TX2), 'ACBR', 'TREINAMENTO' ou 'WEBSERVICE'
  
  // --- TECNOSPEED COMPONENTE DESKTOP (COM / OCX & MANAGER) ---
  tecnoSpeedCnpjSoftwareHouse: string; // Ex: '03.661.869/0001-75' (Silenus Software)
  tecnoSpeedTokenSoftwareHouse: string; // Ex: '6f46553fc8fcf2e4263df17c11acafc0'
  tecnoSpeedDiretorioBase: string; // Padrão: 'C:\\ERPFULL\\NFE'
  tecnoSpeedHost: string; // Padrão: '127.0.0.1'
  tecnoSpeedPorta: number; // Padrão: 8081
  tecnoSpeedGrupo: string; // Padrão: 'DEFAULT'
  tecnoSpeedUsuario: string;
  tecnoSpeedSenha: string;
  tecnoSpeedPastaEntrada: string; // Padrão: 'C:\\TecnoSpeed\\NFe\\Entrada\\'
  tecnoSpeedPastaRetorno: string; // Padrão: 'C:\\TecnoSpeed\\NFe\\Retorno\\'

  // --- NUVEM FISCAL API ---
  nuvemFiscalClientId: string;
  nuvemFiscalClientSecret: string;
  nuvemFiscalAmbiente: 'SANDBOX' | 'PRODUÇÃO';

  // --- ACBR MONITOR ---
  hostAcbr: string; // Padrão: '127.0.0.1'
  portaAcbr: number; // Padrão: 3434

  // --- 1. DADOS PRINCIPAL & NUMERAÇÃO ---
  serieNfe: number; // Série padrão da NF-e (ex: 1)
  proximoNumeroNfe: number; // Próximo número a ser emitido (ex: 1025)
  ultimoNumeroAutorizadoNfe?: number;
  cnpjEmitente: string;
  nomeEmitente: string;
  inscricaoEstadualEmitente: string;
  certificadoDigital: string;
  caminhoArquivoPfx: string; // Caminho do arquivo .pfx / .p12 local
  senhaCertificadoA1: string; // Senha do certificado digital A1
  tipoImpressaoDanfe: TipoImpressaoDanfe;
  formaEmissao: FormaEmissaoNFe;
  caminhoLogotipo: string;
  pastaArmazenamentoNfe: string;
  ufWebService: string;
  versaoWebService: string;
  ambienteDestino: AmbienteSefaz;
  usarModoSincrono: boolean;

  // --- 2. OUTROS DADOS ---
  versaoEsquema: string; // Ex: 'pl_010b'
  versaoManual: string;  // Ex: 'vm60'
  fusoHorario: string;   // Ex: '-04:00', '-03:00'
  validarEsquema: boolean;
  enviarCodigoBarra: boolean;
  fazerUploadSieg: boolean;
  numeroSerieCertificado: string;
  subpastaDanfeDevolucao: string;
  pastaArmazenamentoXmlEntrada: string;

  // --- 3. RESPONSÁVEL TÉCNICO (SEFAZ NT 2018.005) ---
  cnpjResponsavelTecnico: string;
  contatoResponsavelTecnico: string;
  foneResponsavelTecnico: string;
  emailResponsavelTecnico: string;
  idCsrt: string;
  hashCsrt: string;
}

export const CONFIG_NFE_PADRAO: NfeConfiguracaoCompleta = {
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
  serieNfe: 1,
  proximoNumeroNfe: 1025,
  ultimoNumeroAutorizadoNfe: 1024,
  cnpjEmitente: '68.148.349/0001-09',
  nomeEmitente: 'LIVRARIA DAMASCO LTDA',
  inscricaoEstadualEmitente: '283261864',
  certificadoDigital: 'LIVRARIA DAMASCO LTDA:68148349000109',
  caminhoArquivoPfx: 'C:\\ERPFULL\\CERTDAMASCO 1234.PFX',
  senhaCertificadoA1: '1234',
  tipoImpressaoDanfe: 'RETRATO',
  formaEmissao: 'NORMAL',
  caminhoLogotipo: 'C:\\ERPFULL\\NFE\\LOGO.JPG',
  pastaArmazenamentoNfe: 'C:\\ERPFULL\\NFE\\XmlDestinatario\\',
  ufWebService: 'MATO GROSSO DO SUL',
  versaoWebService: '4.0',
  ambienteDestino: 'HOMOLOGAÇÃO',
  usarModoSincrono: true,

  versaoEsquema: 'pl_010b',
  versaoManual: 'vm60',
  fusoHorario: '-04:00',
  validarEsquema: true,
  enviarCodigoBarra: false,
  fazerUploadSieg: true,
  numeroSerieCertificado: '77F293243A24505C',
  subpastaDanfeDevolucao: 'NFe\\templates\\vm60\\Danfe\\retratoDevol.rtm',
  pastaArmazenamentoXmlEntrada: 'C:\\ERPFULL\\NFE\\Entrada\\',

  cnpjResponsavelTecnico: '12.345.678/0001-90',
  contatoResponsavelTecnico: 'COLISEU SISTEMAS - DEPARTAMENTO DE ENGENHARIA FISCAL',
  foneResponsavelTecnico: '(67) 3421-9000',
  emailResponsavelTecnico: 'fiscal@coliseusistemas.com.br',
  idCsrt: '00001',
  hashCsrt: 'A9B8C7D6E5F4G3H2I1J0K9L8M7N6O5P4',
};

const STORAGE_KEY_NFE_CONFIG = 'coliseu_nfe_configuracao_completa';

export function getNfeConfig(): NfeConfiguracaoCompleta {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_NFE_CONFIG);
    if (!raw) return CONFIG_NFE_PADRAO;
    const parsed = JSON.parse(raw);
    const merged = { ...CONFIG_NFE_PADRAO, ...parsed };
    if (!merged.modoOperacao || merged.modoOperacao === 'TREINAMENTO') {
      merged.modoOperacao = 'TECNOSPEED';
    }
    if (!merged.pastaArmazenamentoNfe || merged.pastaArmazenamentoNfe === 'C:\\ERPFULL\\NFE\\' || merged.pastaArmazenamentoNfe === 'C:\\ERPFULL\\NFE') {
      merged.pastaArmazenamentoNfe = 'C:\\ERPFULL\\NFE\\XmlDestinatario\\';
    }
    if (!merged.serieNfe || merged.serieNfe < 1) merged.serieNfe = 1;
    if (!merged.proximoNumeroNfe || merged.proximoNumeroNfe < 1) merged.proximoNumeroNfe = 1025;
    return merged;
  } catch {
    return CONFIG_NFE_PADRAO;
  }
}

export function salvarNfeConfig(config: NfeConfiguracaoCompleta): void {
  localStorage.setItem(STORAGE_KEY_NFE_CONFIG, JSON.stringify(config));
  window.dispatchEvent(new Event('coliseu_nfe_config_updated'));
}

export function obterProximoNumeroNFe(): { serie: number; proximoNumero: number } {
  const cfg = getNfeConfig();
  return {
    serie: Number(cfg.serieNfe) || 1,
    proximoNumero: Number(cfg.proximoNumeroNfe) || 1025,
  };
}

export function salvarProximoNumeroNFe(proximoNumero: number, serie?: number): void {
  const cfg = getNfeConfig();
  cfg.proximoNumeroNfe = Math.max(1, Number(proximoNumero) || 1);
  if (serie !== undefined) {
    cfg.serieNfe = Math.max(1, Number(serie) || 1);
  }
  salvarNfeConfig(cfg);
}

export function incrementarNumeroNFe(numeroAutorizado?: number): number {
  const cfg = getNfeConfig();
  const numAtual = numeroAutorizado || cfg.proximoNumeroNfe;
  cfg.ultimoNumeroAutorizadoNfe = numAtual;
  cfg.proximoNumeroNfe = numAtual + 1;
  salvarNfeConfig(cfg);
  return cfg.proximoNumeroNfe;
}
