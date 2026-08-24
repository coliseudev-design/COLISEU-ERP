// Gerenciador e Modelo de Dados de Lotes, Validades, Rastreabilidade, Sementes (MAPA/RENASEM) & Químicos/Defensivos (PF, Exército, IBAMA, ANTT, FISPQ)

export type SegmentoLote = 'SEMENTES_GRAOS' | 'QUIMICO_TINTAS' | 'DEFENSIVO_AGRICOLA' | 'FARMACEUTICO' | 'ALIMENTICIO' | 'GERAL';

export type StatusLote = 'LIBERADO' | 'QUARENTENA' | 'REPROVADO' | 'VENCIDO' | 'ESGOTADO';

export type CategoriaSemente = 'GENETICA' | 'BASICA' | 'C1' | 'C2' | 'S1' | 'S2';

export type ClasseToxicolgica =
  | 'CAT1_EXTREMAMENTE_TOXICO_VERMELHA'
  | 'CAT2_ALTAMENTE_TOXICO_AMARELA'
  | 'CAT3_MODERADAMENTE_TOXICO_AZUL'
  | 'CAT4_POUCO_TOXICO_VERDE'
  | 'CAT5_IMPROVAVEL_DANO_VERDE';

export type ClasseAmbiental = 'CLASSE_I_ALTAMENTE_PERIGOSO' | 'CLASSE_II_MUITO_PERIGOSO' | 'CLASSE_III_PERIGOSO' | 'CLASSE_IV_POUCO_PERIGOSO';

export interface DadosQuimicoControlado {
  // Controle de Órgãos Reguladores
  controladoPoliciaFederal: boolean;
  licencaPoliciaFederal?: string;
  controladoExercito: boolean;
  certificadoRegistroExercito?: string;
  registroIbama?: string;
  registroMapaDefensivo?: string;
  registroAnvisa?: string;
  receituarioAgronomicoObrigatorio?: boolean;

  // Classificação ANTT de Transporte de Produtos Perigosos
  numeroOnu: string;                // Ex: 1263 (Tintas/Solventes) ou 2902 (Pesticidas)
  classeRisco: string;              // Ex: 3 (Líquidos Inflamáveis) ou 6.1 (Tóxico)
  numeroRisco: string;              // Ex: 33 (Altamente Inflamável) ou 60 (Tóxico)
  grupoEmbalagem: 'I' | 'II' | 'III'; // I = Alto risco, II = Médio, III = Baixo
  nomeApropriadoEmbarque: string;   // Ex: TINTA (incluindo tintas, lacas, esmaltes, tinturas...)

  // Especificação Química & Princípio Ativo
  principioAtivo?: string;          // Ex: GLIFOSATO, TOLUENO, RESINA POLIURETANO
  concentracao?: string;            // Ex: 480 G/L ou 99.5%
  grupoQuimico?: string;            // Ex: GLICINAS SUBSTITUIDAS, HIDROCARBONETO AROMATICO
  classeToxicologica?: ClasseToxicolgica;
  classeAmbiental?: ClasseAmbiental;

  // Laudo Laboratorial de Controle de Qualidade (CoA)
  densidadeGcm3?: number;           // Ex: 0.985 g/cm³ a 20°C
  viscosidadeSeg?: number;          // Ex: 22 seg Ford 4 a 25°C
  teorSolidosPercent?: number;      // Ex: 45.5%
  ph?: number;                      // Ex: 6.8
  pontoFulgorCelsius?: number;      // Ex: 27°C
  laudoCqNumero?: string;           // Ex: LAUDO-CQ-2026-8819
  responsavelTecnicoQuimico?: string; // Ex: QUÍMICO RESPONSÁVEL CRQ
  crqNumero?: string;               // Ex: CRQ IV REGIÃO 041892
}

export interface DadosSementeMAPA {
  renasemProdutor: string;         // Registro Nacional de Sementes e Mudas (Ex: MS-01234/2026)
  especieCultivar: string;         // Espécie e Cultivar (Ex: SOJA - BRASMAX COMPASSO IPRO)
  categoria: CategoriaSemente;     // Categoria C1, C2, S1, S2, Básica
  safra: string;                   // Safra (Ex: 2025/2026)
  peneira: string;                 // Peneira / Calibre (Ex: 6.0mm Redonda, 6.5mm, 5.5mm)
  germinacaoPercent: number;       // % de Germinação (Ex: 92.0%)
  purezaPercent: number;           // % de Pureza Física (Ex: 99.8%)
  vigorPercent?: number;           // % de Vigor (Tetrazólio) (Ex: 88.0%)
  pmsGramas?: number;              // Peso de Mil Sementes em gramas (Ex: 165.50g)
  tratamentoTSI?: string;          // Tratamento Industrial de Sementes (Ex: STANDAK TOP + FORTENZA)
  numeroBAS?: string;              // Boletim de Análise de Sementes (Laudo Laboratório MAPA)
  dataAnaliseGerminacao: string;   // Data do teste em laboratório
  validadeTesteGerminacao: string; // Data limite da validade do teste (Ex: 12 meses)
  campoProducao?: string;          // Identificação da Gleba/Campo de Produção
  termoConformidadeNum?: string;   // Nº do Termo de Conformidade emitido pelo Responsável Técnico
  responsavelTecnicoNome?: string; // Nome do Engenheiro Agrônomo RT
  responsavelTecnicoCrea?: string; // CREA do RT
}

export interface MovimentacaoLote {
  id: string;
  dataHora: string;
  tipo: 'ENTRADA_COMPRA' | 'SAIDA_VENDA' | 'AJUSTE_BALANCO' | 'TRANSFERENCIA';
  documentoRef: string; // NF-e, Pedido ou O.S.
  entidadeNome: string; // Fornecedor ou Cliente
  quantidade: number;
  unidade: string;
  saldoApos: number;
}

export interface LoteItem {
  id: string;
  numeroLote: string;
  produtoSku: string;
  produtoDescricao: string;
  segmento: SegmentoLote;
  
  // Datas
  dataFabricacao: string;
  dataValidade: string;
  diasParaVencer: number;
  
  // Saldos e Localização
  quantidadeInicial: number;
  quantidadeAtual: number;
  unidadeMedida: string;
  localizacaoWms: string;
  
  // Status e Controle
  status: StatusLote;
  registroAnvisaMapa?: string;
  custoUnitario: number;
  precoVendaUnitario: number;
  
  // Dados Específicos para Sementes
  dadosSementes?: DadosSementeMAPA;

  // Dados Específicos para Químicos, Defensivos & Tintas
  dadosQuimicos?: DadosQuimicoControlado;
  
  // Histórico de Rastreabilidade (Cadeia de Custódia)
  historicoMovimentacoes: MovimentacaoLote[];
}

const STORAGE_KEY_LOTES = 'coliseu_lotes_rastreabilidade';

const DEFAULT_LOTES: LoteItem[] = [
  {
    id: 'LOTE-SEM-001',
    numeroLote: 'LT-SOJA-2026-BMX01',
    produtoSku: 'SEM-001',
    produtoDescricao: 'SEMENTE DE SOJA BRASMAX COMPASSO IPRO - BIG BAG 5M SEMENTES',
    segmento: 'SEMENTES_GRAOS',
    dataFabricacao: '10/05/2026',
    dataValidade: '10/05/2027',
    diasParaVencer: 265,
    quantidadeInicial: 200,
    quantidadeAtual: 145,
    unidadeMedida: 'BAG',
    localizacaoWms: 'DEPÓSITO SEMENTES - BARRACÃO CLIMATIZADO 01 - QUADRA A',
    status: 'LIBERADO',
    registroAnvisaMapa: 'MAPA MS-08812/2026',
    custoUnitario: 1850.00,
    precoVendaUnitario: 2450.00,
    dadosSementes: {
      renasemProdutor: 'MS-04123/2026',
      especieCultivar: 'SOJA (Glycine max) - BRASMAX COMPASSO IPRO',
      categoria: 'C1',
      safra: '2025/2026',
      peneira: '6.0mm Redonda (P6.0R)',
      germinacaoPercent: 93.0,
      purezaPercent: 99.8,
      vigorPercent: 89.0,
      pmsGramas: 168.40,
      tratamentoTSI: 'CRUISER 350 FS + MAXIM ADVANCED + POLÍMERO VERDE',
      numeroBAS: 'BAS-LAB-2026-98124',
      dataAnaliseGerminacao: '15/05/2026',
      validadeTesteGerminacao: '15/05/2027',
      campoProducao: 'FAZENDA SANTA MARIA - TALHÃO 04 (DOURADOS/MS)',
      termoConformidadeNum: 'TC-2026/00451',
      responsavelTecnicoNome: 'ENG. AGR. RODRIGO MENDES',
      responsavelTecnicoCrea: 'CREA-MS 14892/D',
    },
    historicoMovimentacoes: [
      { id: 'M-1', dataHora: '12/05/2026 08:30', tipo: 'ENTRADA_COMPRA', documentoRef: 'NF-e 49120', entidadeNome: 'SEMENTES AGROESTE LTDA', quantidade: 200, unidade: 'BAG', saldoApos: 200 },
      { id: 'M-2', dataHora: '14/06/2026 14:00', tipo: 'SAIDA_VENDA', documentoRef: 'NF-e 1042', entidadeNome: 'AGROPECUARIA PANTANAL LTDA', quantidade: 35, unidade: 'BAG', saldoApos: 165 },
      { id: 'M-3', dataHora: '10/08/2026 09:15', tipo: 'SAIDA_VENDA', documentoRef: 'NF-e 1055', entidadeNome: 'FAZENDA BOA ESPERANCA', quantidade: 20, unidade: 'BAG', saldoApos: 145 },
    ],
  },
  {
    id: 'LOTE-QUI-001',
    numeroLote: 'LT-SOLV-TOL-2026-X8',
    produtoSku: 'QUI-008',
    produtoDescricao: 'TOLUENO PURO GRAU INDUSTRIAL (PRECURSOR POLÍCIA FEDERAL) - TAMBOR 200L',
    segmento: 'QUIMICO_TINTAS',
    dataFabricacao: '15/02/2026',
    dataValidade: '15/02/2028',
    diasParaVencer: 546,
    quantidadeInicial: 40,
    quantidadeAtual: 22,
    unidadeMedida: 'UN',
    localizacaoWms: 'ALMOXARIFADO QUÍMICO - BARRACÃO À PROVA DE EXPLOSÃO - BOX 02',
    status: 'LIBERADO',
    custoUnitario: 920.00,
    precoVendaUnitario: 1450.00,
    dadosQuimicos: {
      controladoPoliciaFederal: true,
      licencaPoliciaFederal: 'DPF/MS-098812/2026',
      controladoExercito: true,
      certificadoRegistroExercito: 'CR-EB-239912',
      registroIbama: 'CTF-IBAMA 781290',
      receituarioAgronomicoObrigatorio: false,
      numeroOnu: '1294',
      classeRisco: '3 - Líquidos Inflamáveis',
      numeroRisco: '33 - Líquido Altamente Inflamável',
      grupoEmbalagem: 'II',
      nomeApropriadoEmbarque: 'TOLUENO (METILBENZENO)',
      principioAtivo: 'TOLUENO (C7H8)',
      concentracao: '99.8% P.A.',
      grupoQuimico: 'HIDROCARBONETOS AROMÁTICOS',
      densidadeGcm3: 0.867,
      viscosidadeSeg: 14.2,
      teorSolidosPercent: 0.0,
      ph: 7.0,
      pontoFulgorCelsius: 4.4,
      laudoCqNumero: 'CQ-LAB-2026-5512',
      responsavelTecnicoQuimico: 'DR. MARCELO NOGUEIRA (CRQ IV 042918)',
      crqNumero: 'CRQ-MS 042918',
    },
    historicoMovimentacoes: [
      { id: 'MQ-1', dataHora: '18/02/2026 10:00', tipo: 'ENTRADA_COMPRA', documentoRef: 'NF-e 88120', entidadeNome: 'BRASKEM PETROQUÍMICA S.A.', quantidade: 40, unidade: 'UN', saldoApos: 40 },
      { id: 'MQ-2', dataHora: '04/05/2026 15:30', tipo: 'SAIDA_VENDA', documentoRef: 'NF-e 1018', entidadeNome: 'INDÚSTRIA DE TINTAS ALVORADA LTDA', quantidade: 18, unidade: 'UN', saldoApos: 22 },
    ],
  },
  {
    id: 'LOTE-DEF-002',
    numeroLote: 'LT-GLIFO-2026-B9',
    produtoSku: 'DEF-001',
    produtoDescricao: 'HERBICIDA SISTÊMICO GLIFOSATO 480 SL - BOMBONA 20 LITROS',
    segmento: 'DEFENSIVO_AGRICOLA',
    dataFabricacao: '01/03/2026',
    dataValidade: '01/03/2028',
    diasParaVencer: 560,
    quantidadeInicial: 250,
    quantidadeAtual: 180,
    unidadeMedida: 'UN',
    localizacaoWms: 'DEPÓSITO DE AGROTÓXICOS & DEFENSIVOS - BACIA DE CONTENÇÃO 03',
    status: 'LIBERADO',
    registroAnvisaMapa: 'MAPA Nº 004395',
    custoUnitario: 380.00,
    precoVendaUnitario: 520.00,
    dadosQuimicos: {
      controladoPoliciaFederal: false,
      controladoExercito: false,
      registroIbama: 'IBAMA 004395-9',
      registroMapaDefensivo: 'MAPA Nº 004395',
      receituarioAgronomicoObrigatorio: true,
      numeroOnu: '3082',
      classeRisco: '9 - Substâncias Perigosas Diversas',
      numeroRisco: '90 - Substância Perigosa para o Meio Ambiente',
      grupoEmbalagem: 'III',
      nomeApropriadoEmbarque: 'SUBSTÂNCIA QUE APRESENTA RISCO PARA O MEIO AMBIENTE, LÍQUIDA, N.E. (GLIFOSATO)',
      principioAtivo: 'GLIFOSATO - SAL DE ISOPROPILAMINA',
      concentracao: '480 G/L (360 G/L EQUIVALENTE ÁCIDO)',
      grupoQuimico: 'GLICINAS SUBSTITUÍDAS',
      classeToxicologica: 'CAT4_POUCO_TOXICO_VERDE',
      classeAmbiental: 'CLASSE_III_PERIGOSO',
      densidadeGcm3: 1.165,
      ph: 4.8,
      laudoCqNumero: 'CQ-DEF-2026-9921',
      responsavelTecnicoQuimico: 'ENG. AGR. RODRIGO MENDES (CREA-MS 14892/D)',
      crqNumero: 'CREA-MS 14892/D',
    },
    historicoMovimentacoes: [
      { id: 'MD-1', dataHora: '10/03/2026 08:00', tipo: 'ENTRADA_COMPRA', documentoRef: 'NF-e 11980', entidadeNome: 'CORTEVA AGRISCIENCE DO BRASIL', quantidade: 250, unidade: 'UN', saldoApos: 250 },
      { id: 'MD-2', dataHora: '20/06/2026 11:20', tipo: 'SAIDA_VENDA', documentoRef: 'NF-e 1039', entidadeNome: 'AGROPECUARIA PANTANAL LTDA', quantidade: 70, unidade: 'UN', saldoApos: 180 },
    ],
  },
  {
    id: 'LOTE-QUI-003',
    numeroLote: 'LT-VERNIZ-PU-2026-A1',
    produtoSku: '00002',
    produtoDescricao: 'VERNIZ POLIURETANO ALTO SÓLIDOS 5:1 900ML',
    segmento: 'QUIMICO_TINTAS',
    dataFabricacao: '10/01/2026',
    dataValidade: '10/01/2028',
    diasParaVencer: 510,
    quantidadeInicial: 60,
    quantidadeAtual: 34,
    unidadeMedida: 'UN',
    localizacaoWms: 'DEPÓSITO - RUA A - PRATELEIRA 02',
    status: 'LIBERADO',
    custoUnitario: 85.00,
    precoVendaUnitario: 145.00,
    dadosQuimicos: {
      controladoPoliciaFederal: false,
      controladoExercito: false,
      numeroOnu: '1263',
      classeRisco: '3 - Líquidos Inflamáveis',
      numeroRisco: '30 - Líquido Inflamável',
      grupoEmbalagem: 'III',
      nomeApropriadoEmbarque: 'TINTA OU MATERIAL RELACIONADO COM TINTAS',
      principioAtivo: 'RESINA POLIÉSTER HIDROXILADA + ISOCIANATO ALIFÁTICO',
      densidadeGcm3: 0.98,
      viscosidadeSeg: 18.0,
      teorSolidosPercent: 48.0,
      pontoFulgorCelsius: 28.0,
    },
    historicoMovimentacoes: [
      { id: 'M-20', dataHora: '15/01/2026 09:00', tipo: 'ENTRADA_COMPRA', documentoRef: 'NF-e 19783', entidadeNome: 'PPG INDUSTRIES BRASIL LTDA', quantidade: 60, unidade: 'UN', saldoApos: 60 },
      { id: 'M-21', dataHora: '08/02/2026 16:20', tipo: 'SAIDA_VENDA', documentoRef: 'NF-e 1011', entidadeNome: 'FUNILARIA & PINTURA SAO JORGE', quantidade: 26, unidade: 'UN', saldoApos: 34 },
    ],
  },
];

export function getLotes(): LoteItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOTES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_LOTES, JSON.stringify(DEFAULT_LOTES));
      return DEFAULT_LOTES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_LOTES;
  } catch {
    return DEFAULT_LOTES;
  }
}

export function salvarLote(lote: LoteItem): LoteItem[] {
  const lista = getLotes();
  const index = lista.findIndex((item) => item.id === lote.id);
  let atualizada: LoteItem[];

  if (index >= 0) {
    atualizada = [...lista];
    atualizada[index] = lote;
  } else {
    atualizada = [lote, ...lista];
  }

  localStorage.setItem(STORAGE_KEY_LOTES, JSON.stringify(atualizada));
  window.dispatchEvent(new Event('coliseu_lotes_updated'));
  return atualizada;
}

export function excluirLote(id: string): LoteItem[] {
  const lista = getLotes();
  const atualizada = lista.filter((item) => item.id !== id);
  localStorage.setItem(STORAGE_KEY_LOTES, JSON.stringify(atualizada));
  window.dispatchEvent(new Event('coliseu_lotes_updated'));
  return atualizada;
}

export function getLotesFEFO(sku: string): LoteItem[] {
  const lotes = getLotes().filter(
    (l) => l.produtoSku === sku && l.quantidadeAtual > 0 && l.status === 'LIBERADO'
  );

  return lotes.sort((a, b) => {
    const dataA = new Date(a.dataValidade.split('/').reverse().join('-')).getTime();
    const dataB = new Date(b.dataValidade.split('/').reverse().join('-')).getTime();
    return dataA - dataB;
  });
}
