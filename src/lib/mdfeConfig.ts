// Gerenciador e Modelo de Configurações do MDF-e (SEFAZ Modelo 58 & TecnoSpeed spdMDFeX)

export type TipoEmitenteMdfe = '1 - PRESTADOR DE SERVIÇO DE TRANSPORTE' | '2 - TRANSPORTADOR DE CARGA PRÓPRIA';
export type TipoTransportadorMdfe = 'ETC (EMPRESA)' | 'TAC (AUTÔNOMO)' | 'CTC (COOPERATIVA)';
export type ModalTransporteMdfe = 'RODOVIÁRIO' | 'AÉREO' | 'AQUAVIÁRIO' | 'FERROVIÁRIO';
export type FormaEmissaoMdfe = 'NORMAL' | 'CONTINGÊNCIA';
export type TipoImpressaoDamdfe = 'RETRATO' | 'PAISAGEM';
export type AmbienteSefazMdfe = 'PRODUÇÃO' | 'HOMOLOGAÇÃO';

export interface MdfeConfiguracaoCompleta {
  // --- 1. DADOS PRINCIPAL & MODAL DE TRANSPORTE ---
  cnpjEmitente: string;
  nomeEmitente: string;
  certificadoDigital: string;
  caminhoCertificadoPfx?: string;
  senhaCertificado?: string;
  tipoEmitente: TipoEmitenteMdfe;
  tipoTransportador: TipoTransportadorMdfe;
  modalTransporte: ModalTransporteMdfe;
  formaEmissao: FormaEmissaoMdfe;
  tipoImpressaoDamdfe: TipoImpressaoDamdfe;
  caminhoLogotipo: string;
  ufWebService: string;
  versaoWebService: string;
  ambienteDestino: AmbienteSefazMdfe;

  // --- 2. DIRETÓRIOS E PASTAS OPERACIONAIS (TECNOSPEED spdMDFeX) ---
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
  arquivoServidoresHom: string;
  arquivoServidoresProd: string;

  // Credenciais Software House (TecnoSpeed)
  cnpjSoftwareHouse: string;
  tokenSoftwareHouse: string;

  // --- 3. FROTA, CONDUTORES & SEGURO DE CARGA ---
  placaVeiculoTracao: string;
  ufVeiculoTracao: string;
  renavamVeiculo: string;
  taraKg: number;
  capacidadeKg: number;
  tipoRodado: string;
  tipoCarroceria: string;
  nomeMotoristaPadrao: string;
  cpfMotoristaPadrao: string;
  responsavelSeguro: 'EMITENTE' | 'CONTRATANTE';
  nomeSeguradora: string;
  cnpjSeguradora: string;
  numeroApolice: string;
  numeroAverbacao: string;
  cnpjFornecedorPedagio: string;
  codigoCiot: string;

  // --- 4. RESPONSÁVEL TÉCNICO (SEFAZ NT 2018.005) ---
  cnpjResponsavelTecnico: string;
  contatoResponsavelTecnico: string;
  foneResponsavelTecnico: string;
  emailResponsavelTecnico: string;
  idCsrt: string;
  hashCsrt: string;
}

export const CONFIG_MDFE_PADRAO: MdfeConfiguracaoCompleta = {
  cnpjEmitente: '05.766.577/0001-22',
  nomeEmitente: 'PIVETA DIST. DE TINTAS AUTOMOTIVA LTDA',
  certificadoDigital: '',
  caminhoCertificadoPfx: '',
  senhaCertificado: '',
  tipoEmitente: '2 - TRANSPORTADOR DE CARGA PRÓPRIA',
  tipoTransportador: 'ETC (EMPRESA)',
  modalTransporte: 'RODOVIÁRIO',
  formaEmissao: 'NORMAL',
  tipoImpressaoDamdfe: 'RETRATO',
  caminhoLogotipo: 'C:\\ERPFULL\\MDFE\\logo_damdfe.png',
  ufWebService: 'MATO GROSSO DO SUL',
  versaoWebService: '3.00',
  ambienteDestino: 'HOMOLOGAÇÃO',

  diretorioBaseTecnospeed: 'C:\\ERPFULL\\MDFE',
  diretorioEsquemas: 'C:\\Program Files\\TecnoSpeed\\MDFe\\arquivos\\Esquemas\\',
  diretorioTemplates: 'C:\\Program Files\\TecnoSpeed\\MDFe\\arquivos\\Templates\\',
  diretorioLog: 'C:\\ERPFULL\\MDFE\\Log\\',
  diretorioLogErro: 'C:\\ERPFULL\\MDFE\\LogErro\\',
  diretorioTemporario: 'C:\\ERPFULL\\MDFE\\Temporario\\',
  diretorioEntradaTx2: 'C:\\ERPFULL\\MDFE\\Entrada\\',
  diretorioSaidaTx2: 'C:\\ERPFULL\\MDFE\\Saida\\',
  diretorioXmlDestinatario: 'C:\\ERPFULL\\MDFE\\XmlDestinatario\\',
  diretorioPdf: 'C:\\ERPFULL\\MDFE\\PDF\\',
  arquivoServidoresHom: 'C:\\ERPFULL\\MDFE\\mdfeServidoresHom.ini',
  arquivoServidoresProd: 'C:\\ERPFULL\\MDFE\\mdfeServidoresProd.ini',

  cnpjSoftwareHouse: '03661869000175',
  tokenSoftwareHouse: '6f46553fc8fcf2e4263df17c11acafc0',

  placaVeiculoTracao: 'HQH-4490',
  ufVeiculoTracao: 'MS',
  renavamVeiculo: '00987654321',
  taraKg: 4500,
  capacidadeKg: 8500,
  tipoRodado: 'TRUCK',
  tipoCarroceria: 'BAÚ',
  nomeMotoristaPadrao: 'JOÃO APARECIDO DE OLIVEIRA',
  cpfMotoristaPadrao: '450.890.120-44',
  responsavelSeguro: 'EMITENTE',
  nomeSeguradora: 'PORTO SEGURO COMPANHIA DE SEGUROS GERAIS',
  cnpjSeguradora: '61.198.164/0001-60',
  numeroApolice: 'AP-2026-98102',
  numeroAverbacao: 'AVB-88192039120',
  cnpjFornecedorPedagio: '04.088.208/0001-65',
  codigoCiot: '123456789012',

  cnpjResponsavelTecnico: '12.345.678/0001-90',
  contatoResponsavelTecnico: 'COLISEU SISTEMAS - ENGENHARIA FISCAL',
  foneResponsavelTecnico: '(67) 3421-9000',
  emailResponsavelTecnico: 'fiscal@coliseusistemas.com.br',
  idCsrt: '01',
  hashCsrt: 'A9B8C7D6E5F4G3H2I1J0K9L8M7N6O5P4Q3R2S1T0',
};

const STORAGE_KEY_MDFE_CONFIG = 'coliseu_mdfe_gerenciamento_config';

export function getMdfeConfig(): MdfeConfiguracaoCompleta {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MDFE_CONFIG);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_MDFE_CONFIG, JSON.stringify(CONFIG_MDFE_PADRAO));
      return CONFIG_MDFE_PADRAO;
    }
    const parsed = JSON.parse(raw);
    return { ...CONFIG_MDFE_PADRAO, ...parsed };
  } catch {
    return CONFIG_MDFE_PADRAO;
  }
}

export function salvarMdfeConfig(config: MdfeConfiguracaoCompleta): MdfeConfiguracaoCompleta {
  localStorage.setItem(STORAGE_KEY_MDFE_CONFIG, JSON.stringify(config));
  window.dispatchEvent(new Event('coliseu_mdfe_config_updated'));
  return config;
}
