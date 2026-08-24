// Gerenciador e modelo de dados de Ordens de Serviço (O.S.) & Assistência Técnica

export type StatusOS =
  | 'ORCAMENTO'
  | 'APROVADO'
  | 'EM_EXECUCAO'
  | 'AGUARDANDO_PECAS'
  | 'TESTES_QUALIDADE'
  | 'CONCLUIDO'
  | 'FATURADO'
  | 'CANCELADO';

export interface ItemPecaOS {
  id: string;
  sku: string;
  descricao: string;
  quantidade: number;
  unidade: string;
  valorUnitario: number;
  subtotal: number;
  localizacaoWms?: string;
}

export interface ItemServicoOS {
  id: string;
  codigo: string;
  descricao: string;
  tempoHoras: number;
  valorUnitario: number;
  subtotal: number;
  tecnicoResponsavel: string;
}

export interface ChecklistItem {
  id: string;
  item: string;
  status: 'OK' | 'AVARIADO' | 'NAO_APLICA';
  observacao?: string;
}

export interface OrdemServicoItem {
  id: string;
  numeroOS: string;
  dataAbertura: string;
  horaAbertura: string;
  dataPrevisaoEntrega: string;
  dataConclusao?: string;
  
  // Cliente
  clienteId?: string;
  clienteNome: string;
  clienteCpfCnpj: string;
  clienteTelefone: string;
  clienteEmail?: string;
  
  // Objeto / Equipamento / Veículo
  tipoObjeto: 'VEICULO' | 'MAQUINA' | 'EQUIPAMENTO_TI' | 'ELETRODOMESTICO' | 'OUTROS';
  descricaoObjeto: string;
  marcaObjeto: string;
  modeloObjeto: string;
  placaOuSerie: string;
  corObjeto: string;
  kmOuHorimetro?: string;
  acessoriosDeixados?: string;
  
  // Relato & Laudo
  defeitoRelatado: string;
  laudoTecnico: string;
  solucaoExecutada: string;
  tecnicoPrincipal: string;
  
  // Status e Andamento
  status: StatusOS;
  prioridade: 'BAIXA' | 'NORMAL' | 'ALTA' | 'URGENTE';
  
  // Peças e Serviços
  pecas: ItemPecaOS[];
  servicos: ItemServicoOS[];
  checklist: ChecklistItem[];
  
  // Totais
  totalPecas: number;
  totalServicos: number;
  desconto: number;
  valorTotalOS: number;
  
  // Garantia & Condições
  garantiaDias: number;
  termoGarantia: string;
  observacoesInternas?: string;
  
  // Faturamento
  faturado: boolean;
  faturamentoData?: string;
  faturamentoForma?: string;
}

const STORAGE_KEY = 'coliseu_ordens_servico';

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { id: '1', item: 'Carcaça / Lataria e pintura externa sem amassados ou riscos', status: 'OK' },
  { id: '2', item: 'Tela / Vidros / Painel sem trincas', status: 'OK' },
  { id: '3', item: 'Cabos, fonte de alimentação e carregador inclusos', status: 'OK' },
  { id: '4', item: 'Nível de bateria / combustível adequado para testes', status: 'OK' },
  { id: '5', item: 'Aparelho liga e inicializa normalmente', status: 'OK' },
  { id: '6', item: 'Parafusos e travas de fixação originais presentes', status: 'OK' },
];

const DEFAULT_ORDENS_SERVICO: OrdemServicoItem[] = [
  {
    id: 'OS-1001',
    numeroOS: 'OS-001001',
    dataAbertura: '18/08/2026',
    horaAbertura: '09:30',
    dataPrevisaoEntrega: '20/08/2026',
    clienteNome: 'AGROPECUARIA PANTANAL LTDA',
    clienteCpfCnpj: '12.345.678/0001-90',
    clienteTelefone: '(67) 99888-1122',
    clienteEmail: 'contato@agropantanal.com.br',
    tipoObjeto: 'VEICULO',
    descricaoObjeto: 'CAMINHONETE HILUX 2.8 DIESEL 4X4',
    marcaObjeto: 'TOYOTA',
    modeloObjeto: 'HILUX SRV',
    placaOuSerie: 'RTE-4B12',
    corObjeto: 'PRATA',
    kmOuHorimetro: '84.250 KM',
    acessoriosDeixados: 'CHAVE RESERVA, MANUAL E MACACO',
    defeitoRelatado: 'BARULHO METÁLICO NA SUSPENSÃO DIANTEIRA AO PASSAR EM DESNÍVEIS E PERDA DE EFICIÊNCIA DO FREIO.',
    laudoTecnico: 'CONSTATADO DESGASTE SEVERO DAS PASTILHAS DE FREIO DIANTEIRAS E FOLGA NA BIELETA ESQUERDA.',
    solucaoExecutada: 'SUBSTITUIÇÃO DO JOGO DE PASTILHAS CERÂMICAS, TROCA DO PAR DE BIELETAS E SANGRIA DO FLUIDO DOT4.',
    tecnicoPrincipal: 'CARLOS SILVA (MECÂNICA PESADA)',
    status: 'EM_EXECUCAO',
    prioridade: 'ALTA',
    pecas: [
      { id: 'P-1', sku: '00004', descricao: 'PASTILHA FREIO DIANT HILUX 2020+', quantidade: 1, unidade: 'JG', valorUnitario: 380.00, subtotal: 380.00, localizacaoWms: 'DEPÓSITO - RUA A - PRAT 01' },
      { id: 'P-2', sku: '00012', descricao: 'PAR BIELETA ESTABILIZADORA DIANT', quantidade: 1, unidade: 'PAR', valorUnitario: 190.00, subtotal: 190.00, localizacaoWms: 'DEPÓSITO - RUA B - PRAT 02' },
      { id: 'P-3', sku: '00030', descricao: 'FLUIDO DE FREIO DOT 4 500ML', quantidade: 2, unidade: 'UN', valorUnitario: 45.00, subtotal: 90.00, localizacaoWms: 'LOJA - FRENTE - GÔNDOLA 01' },
    ],
    servicos: [
      { id: 'S-1', codigo: 'SRV-01', descricao: 'MÃO DE OBRA SUSPENSÃO E FREIOS', tempoHoras: 3.5, valorUnitario: 120.00, subtotal: 420.00, tecnicoResponsavel: 'CARLOS SILVA' },
      { id: 'S-2', codigo: 'SRV-02', descricao: 'ALINHAMENTO 3D E BALANCEAMENTO', tempoHoras: 1.0, valorUnitario: 150.00, subtotal: 150.00, tecnicoResponsavel: 'MARCOS SOUZA' },
    ],
    checklist: DEFAULT_CHECKLIST,
    totalPecas: 660.00,
    totalServicos: 570.00,
    desconto: 30.00,
    valorTotalOS: 1200.00,
    garantiaDias: 90,
    termoGarantia: 'GARANTIA DE 90 DIAS SOBRE PEÇAS APLICADAS E SERVIÇOS EXECUTADOS, CONFORME ART. 26 DO CDC.',
    faturado: false,
  },
  {
    id: 'OS-1002',
    numeroOS: 'OS-001002',
    dataAbertura: '17/08/2026',
    horaAbertura: '14:15',
    dataPrevisaoEntrega: '18/08/2026',
    dataConclusao: '18/08/2026',
    clienteNome: 'CONSTRUTORA SUL MATOGROSSENSE',
    clienteCpfCnpj: '08.991.223/0001-44',
    clienteTelefone: '(67) 3421-9900',
    tipoObjeto: 'MAQUINA',
    descricaoObjeto: 'COMPRESSOR DE AR INDUSTRIAL 500L 10HP',
    marcaObjeto: 'SCHULZ',
    modeloObjeto: 'MAX MSV 40',
    placaOuSerie: 'SCH-9821334',
    corObjeto: 'AZUL',
    defeitoRelatado: 'NÃO ATINGE A PRESSÃO MÁXIMA DE TRABALHO E VAZAMENTO DE ÓLEO NO BLOCO.',
    laudoTecnico: 'RETENTORES RESSECADOS E VÁLVULAS DE PALHETA DESGASTADAS.',
    solucaoExecutada: 'DESMONTAGEM COMPLETA DO CABEÇOTE, DESCARBONIZAÇÃO, TROCA DO KIT DE REPARO E ÓLEO SINTÉTICO.',
    tecnicoPrincipal: 'RICARDO OLIVEIRA (PNEUMÁTICA)',
    status: 'CONCLUIDO',
    prioridade: 'NORMAL',
    pecas: [
      { id: 'P-10', sku: '00088', descricao: 'KIT REPARO VÁLVULAS SCHULZ MSV40', quantidade: 1, unidade: 'KT', valorUnitario: 450.00, subtotal: 450.00 },
      { id: 'P-11', sku: '00089', descricao: 'ÓLEO LUBRIFICANTE COMPRESSOR 1L', quantidade: 4, unidade: 'LT', valorUnitario: 55.00, subtotal: 220.00 },
    ],
    servicos: [
      { id: 'S-10', codigo: 'SRV-10', descricao: 'REVISÃO GERAL CABEÇOTE COMPRESSOR', tempoHoras: 4.0, valorUnitario: 140.00, subtotal: 560.00, tecnicoResponsavel: 'RICARDO OLIVEIRA' },
    ],
    checklist: DEFAULT_CHECKLIST,
    totalPecas: 670.00,
    totalServicos: 560.00,
    desconto: 0,
    valorTotalOS: 1230.00,
    garantiaDias: 90,
    termoGarantia: 'GARANTIA DE 90 DIAS CONFORME LEGISLAÇÃO VIGENTE.',
    faturado: false,
  },
  {
    id: 'OS-1003',
    numeroOS: 'OS-001003',
    dataAbertura: '15/08/2026',
    horaAbertura: '10:00',
    dataPrevisaoEntrega: '16/08/2026',
    dataConclusao: '16/08/2026',
    clienteNome: 'MARCOS ROBERTO PEREIRA',
    clienteCpfCnpj: '012.345.678-99',
    clienteTelefone: '(67) 99123-4567',
    tipoObjeto: 'EQUIPAMENTO_TI',
    descricaoObjeto: 'NOTEBOOK DELL INSPIRON 15 CORE I7',
    marcaObjeto: 'DELL',
    modeloObjeto: 'INSPIRON 5590',
    placaOuSerie: 'BR-TAG-8921',
    corObjeto: 'CHUMBO',
    acessoriosDeixados: 'FONTE ORIGINAL E BOLSA',
    defeitoRelatado: 'LENTIDÃO EXTREMA E AQUECIMENTO EXCESSIVO AO ABRIR SOFTWARES PESADOS.',
    laudoTecnico: 'PASTA TÉRMICA CRISTALIZADA E HD MECÂNICO 1TB COM SETORES DEFEITUOSOS (BAD BLOCKS).',
    solucaoExecutada: 'LIMPEZA INTERNA, APLICAÇÃO DE PASTA TÉRMICA ARTIC SILVER E INSTALAÇÃO DE SSD NVME 1TB.',
    tecnicoPrincipal: 'FELIPE ANDRADE (HARDWARE)',
    status: 'FATURADO',
    prioridade: 'NORMAL',
    pecas: [
      { id: 'P-20', sku: '00201', descricao: 'SSD NVME M.2 1TB KINGSTON KC3000', quantidade: 1, unidade: 'UN', valorUnitario: 490.00, subtotal: 490.00 },
    ],
    servicos: [
      { id: 'S-20', codigo: 'SRV-20', descricao: 'HIGIENIZAÇÃO TÉRMICA & INSTALAÇÃO SSD', tempoHoras: 2.0, valorUnitario: 110.00, subtotal: 220.00, tecnicoResponsavel: 'FELIPE ANDRADE' },
    ],
    checklist: DEFAULT_CHECKLIST,
    totalPecas: 490.00,
    totalServicos: 220.00,
    desconto: 10.00,
    valorTotalOS: 700.00,
    garantiaDias: 180,
    termoGarantia: 'GARANTIA DE 180 DIAS SOBRE O SSD E 90 DIAS SOBRE A MANUTENÇÃO.',
    faturado: true,
    faturamentoData: '16/08/2026',
    faturamentoForma: 'PIX',
  },
];

export function getOrdensServico(): OrdemServicoItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_ORDENS_SERVICO));
      return DEFAULT_ORDENS_SERVICO;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_ORDENS_SERVICO;
  } catch {
    return DEFAULT_ORDENS_SERVICO;
  }
}

export function salvarOrdemServico(os: OrdemServicoItem): OrdemServicoItem[] {
  const lista = getOrdensServico();
  const index = lista.findIndex((item) => item.id === os.id);
  let atualizada: OrdemServicoItem[];

  if (index >= 0) {
    atualizada = [...lista];
    atualizada[index] = os;
  } else {
    atualizada = [os, ...lista];
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(atualizada));
  window.dispatchEvent(new Event('coliseu_os_updated'));
  return atualizada;
}

export function excluirOrdemServico(id: string): OrdemServicoItem[] {
  const lista = getOrdensServico();
  const atualizada = lista.filter((item) => item.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(atualizada));
  window.dispatchEvent(new Event('coliseu_os_updated'));
  return atualizada;
}

export function gerarProximoNumeroOS(): { id: string; numeroOS: string } {
  const lista = getOrdensServico();
  const nextNum = lista.length + 1001;
  return {
    id: `OS-${nextNum}`,
    numeroOS: `OS-${String(nextNum).padStart(6, '0')}`,
  };
}

export function getDefaultChecklist(): ChecklistItem[] {
  return JSON.parse(JSON.stringify(DEFAULT_CHECKLIST));
}
