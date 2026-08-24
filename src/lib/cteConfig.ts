// Configurações do CT-e (SEFAZ Modelo 57 - Conhecimento de Transporte Eletrônico & TecnoSpeed spdCTeX)

export interface CteConfiguracaoCompleta {
  cnpjEmitente: string;
  nomeEmitente: string;
  inscricaoEstadual: string;
  rntrc: string;
  serieCte: number;
  proximoNumeroCte: number;
  ambienteDestino: 'PRODUÇÃO' | 'HOMOLOGAÇÃO';
  tipoEmissao: 'NORMAL' | 'CONTINGÊNCIA_EPEC' | 'CONTINGÊNCIA_FSDA';
  crtEmitente: number; // 1-Simples Nacional, 2-Simples c/ excesso, 3-Regime Normal, 4-MEI
  ufWebService: string;
  versaoManual: string; // '4.00'
  tpImpDacte: 'RETRATO' | 'PAISAGEM';
  motorFiscalPreferido: 'TECNOSPEED' | 'NUVEM_FISCAL' | 'ACBR' | 'SEFAZ_DIRETA';

  // Certificado Digital (Windows CryptoAPI / PFX)
  certificadoDigital?: string;
  caminhoCertificadoPfx?: string;
  senhaCertificado?: string;

  // Diretórios e Pastas do Componente TecnoSpeed spdCTeX & Manager
  diretorioBaseTecnospeed: string;
  diretorioEsquemas: string;
  diretorioTemplates: string;
  diretorioLog: string;
  diretorioLogErro: string;
  diretorioTemporario: string;
  diretorioEntradaTx2: string;
  diretorioSaidaTx2: string;
  diretorioXmlDestinatario: string;
  diretorioPdf: string;
  caminhoLogotipoDacte?: string;
  arquivoServidoresHom: string;
  arquivoServidoresProd: string;

  // Credenciais Software House (TecnoSpeed)
  cnpjSoftwareHouse: string;
  tokenSoftwareHouse: string;

  // Responsável Técnico (CSRT)
  cnpjRespTecnico?: string;
  contatoRespTecnico?: string;
  emailRespTecnico?: string;
  foneRespTecnico?: string;
  idCsrt?: string;
  hashCsrt?: string;
}

export const CONFIG_CTE_PADRAO: CteConfiguracaoCompleta = {
  cnpjEmitente: '05.766.577/0001-22',
  nomeEmitente: 'PIVETA DIST. DE TINTAS AUTOMOTIVA LTDA',
  inscricaoEstadual: '28.326.186-4',
  rntrc: '09812345',
  serieCte: 1,
  proximoNumeroCte: 101,
  ambienteDestino: 'HOMOLOGAÇÃO',
  tipoEmissao: 'NORMAL',
  crtEmitente: 1,
  ufWebService: 'MATO GROSSO DO SUL',
  versaoManual: '4.00',
  tpImpDacte: 'RETRATO',
  motorFiscalPreferido: 'TECNOSPEED',

  certificadoDigital: '',
  caminhoCertificadoPfx: '',
  senhaCertificado: '',

  diretorioBaseTecnospeed: 'C:\\ERPFULL\\CTE',
  diretorioEsquemas: 'C:\\Program Files\\TecnoSpeed\\CTe\\arquivos\\Esquemas\\',
  diretorioTemplates: 'C:\\Program Files\\TecnoSpeed\\CTe\\arquivos\\Templates\\',
  diretorioLog: 'C:\\ERPFULL\\CTE\\Log\\',
  diretorioLogErro: 'C:\\ERPFULL\\CTE\\LogErro\\',
  diretorioTemporario: 'C:\\ERPFULL\\CTE\\Temporario\\',
  diretorioEntradaTx2: 'C:\\ERPFULL\\CTE\\Entrada\\',
  diretorioSaidaTx2: 'C:\\ERPFULL\\CTE\\Saida\\',
  diretorioXmlDestinatario: 'C:\\ERPFULL\\CTE\\XmlDestinatario\\',
  diretorioPdf: 'C:\\ERPFULL\\CTE\\PDF\\',
  caminhoLogotipoDacte: 'C:\\ERPFULL\\CTE\\logo_dacte.png',
  arquivoServidoresHom: 'C:\\ERPFULL\\CTE\\cteServidoresHom.ini',
  arquivoServidoresProd: 'C:\\ERPFULL\\CTE\\cteServidoresProd.ini',

  cnpjSoftwareHouse: '03661869000175',
  tokenSoftwareHouse: '6f46553fc8fcf2e4263df17c11acafc0',

  cnpjRespTecnico: '12.345.678/0001-90',
  contatoRespTecnico: 'COLISEU SISTEMAS FISCAIS',
  emailRespTecnico: 'fiscal@coliseusistemas.com.br',
  foneRespTecnico: '(67) 3421-9000',
  idCsrt: '01',
  hashCsrt: 'A9B8C7D6E5F4G3H2I1J0K9L8M7N6O5P4Q3R2S1T0',
};

const STORAGE_KEY_CTE_CONFIG = 'coliseu_cte_config';

export function getCteConfig(): CteConfiguracaoCompleta {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CTE_CONFIG);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_CTE_CONFIG, JSON.stringify(CONFIG_CTE_PADRAO));
      return CONFIG_CTE_PADRAO;
    }
    return { ...CONFIG_CTE_PADRAO, ...JSON.parse(raw) };
  } catch {
    return CONFIG_CTE_PADRAO;
  }
}

export function salvarCteConfig(config: CteConfiguracaoCompleta): CteConfiguracaoCompleta {
  localStorage.setItem(STORAGE_KEY_CTE_CONFIG, JSON.stringify(config));
  window.dispatchEvent(new Event('coliseu_cte_config_updated'));
  return config;
}
