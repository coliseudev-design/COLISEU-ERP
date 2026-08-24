import { safeInvoke as invoke } from "./ipc";

// =========================================================================
// INTERFACES DO MÓDULO DE TRANSPORTE
// =========================================================================

export interface VeiculoItem {
  id: string;
  empresa_id: string;
  placa: string;
  uf_placa: string;
  renavam?: string;
  tipo_veiculo: string; // 'TOCO', 'TRUCK', 'CAVALO_MECANICO', 'UTILITARIO', 'VAN'
  tipo_carroceria: string; // 'ABERTA', 'BAU', 'SIDER', 'GRANELEIRO', 'TANQUE', 'FRIGORIFICO'
  tipo_rodado: string;
  tara_kg: number;
  capacidade_kg: number;
  capacidade_m3?: number;
  rntrc?: string;
  tipo_propriedade: string; // 'PROPRIO', 'TERCEIRO', 'ARRENDADO'
  proprietario_cpf_cnpj?: string;
  proprietario_nome?: string;
  proprietario_rntrc?: string;
  proprietario_ie?: string;
  proprietario_uf?: string;
  proprietario_tipo?: string;
  ano_fabricacao?: number;
  ano_modelo?: number;
  marca?: string;
  modelo?: string;
  cor?: string;
  chassi?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface MotoristaItem {
  id: string;
  empresa_id: string;
  cpf: string;
  nome: string;
  rg?: string;
  cnh_numero: string;
  cnh_categoria: string;
  cnh_validade: string;
  cnh_uf_emissao?: string;
  rntrc?: string;
  rntrc_validade?: string;
  telefone?: string;
  celular?: string;
  email?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  banco?: string;
  agencia?: string;
  conta?: string;
  tipo_conta?: string;
  chave_pix?: string;
  tipo_vinculo: string; // 'PROPRIO', 'TERCEIRO', 'AGREGADO'
  funcionario_id?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface SeguradoraItem {
  id: string;
  empresa_id: string;
  cnpj: string;
  razao_social: string;
  nome_fantasia?: string;
  telefone?: string;
  email?: string;
  ativo: boolean;
}

export interface ApoliceSeguroItem {
  id: string;
  seguradora_id: string;
  seguradora_nome?: string;
  empresa_id: string;
  tipo_seguro: string;
  numero_apolice: string;
  data_inicio_vigencia: string;
  data_fim_vigencia: string;
  valor_limite_cobertura: number;
  ativo: boolean;
}

export interface TabelaFreteItem {
  id: string;
  empresa_id: string;
  nome: string;
  tipo_calculo: string; // 'PESO', 'VALOR_NF', 'FIXO', 'POR_KM'
  valor_kg: number;
  valor_minimo: number;
  percentual_ad_valorem: number;
  percentual_gris: number;
  taxa_dificuldade_entrega: number;
  inclui_pedagio: boolean;
  ativo: boolean;
}

export interface RotaTransporteItem {
  id: string;
  empresa_id: string;
  nome: string;
  uf_origem: string;
  municipio_origem: string;
  cod_ibge_origem?: string;
  uf_destino: string;
  municipio_destino: string;
  cod_ibge_destino?: string;
  distancia_km: number;
  tempo_estimado_horas: number;
  valor_pedagio_estimado: number;
  ativo: boolean;
}

export interface CteComponenteItem {
  nome: string;
  valor: number;
}

export interface CteNfeItem {
  chave_nfe: string;
  pin_suframa?: string;
  data_prevista_entrega?: string;
}

export interface CteItem {
  id: string;
  filial_id: string;
  numero_cte: number;
  serie: number;
  chave_acesso?: string;
  cfop: string;
  natureza_operacao: string;
  tipo_cte: number; // 0-Normal, 1-Complementar, 3-Substituição
  tipo_servico: number; // 0-Normal, 1-Subcontratação, 2-Redespacho, 3-Redespacho Intermediário, 4-Multimodal
  modal: string; // '01'-Rodoviário
  data_emissao: string;
  hora_emissao: string;
  uf_inicio: string;
  municipio_inicio: string;
  cod_ibge_inicio?: string;
  uf_fim: string;
  municipio_fim: string;
  cod_ibge_fim?: string;

  remetente_id?: string;
  remetente_nome?: string;
  destinatario_id?: string;
  destinatario_nome?: string;
  tomador_tipo: number; // 0-Remetente, 1-Expedidor, 2-Recebedor, 3-Destinatário, 4-Outros
  tomador_id?: string;
  tomador_nome?: string;

  veiculo_id?: string;
  veiculo_placa?: string;
  motorista_id?: string;
  motorista_nome?: string;
  rntrc?: string;

  valor_total_prestacao: number;
  valor_receber: number;
  valor_carga: number;
  produto_predominante: string;
  peso_bruto_carga_kg: number;

  icms_cst: string;
  icms_base_calculo: number;
  icms_aliquota: number;
  icms_valor: number;
  icms_reducao_bc: number;
  crt_emitente: number;

  info_complementar?: string;
  ambiente: number;
  status_sefaz: string; // 'DIGITACAO', 'AUTORIZADO', 'CANCELADO', 'REJEITADO', 'CONTINGENCIA'
  mensagem_sefaz?: string;
  protocolo_autorizacao?: string;
  data_autorizacao?: string;
  xml_envio?: string;
  xml_retorno?: string;
  dacte_pdf_path?: string;

  total_nfes: number;
  chaves_nfes: string[];
  componentes: CteComponenteItem[];
  created_at: string;
  updated_at: string;
}

export interface OperacaoTransporteItem {
  id: string;
  filial_id: string;
  numero_viagem: number;
  data_saida: string;
  data_chegada_prevista?: string;
  data_chegada_real?: string;
  veiculo_id?: string;
  veiculo_placa?: string;
  motorista_id?: string;
  motorista_nome?: string;
  rota_id?: string;
  rota_nome?: string;
  uf_origem: string;
  municipio_origem: string;
  cod_ibge_origem?: string;
  uf_destino: string;
  municipio_destino: string;
  cod_ibge_destino?: string;
  peso_total_kg: number;
  valor_total_carga: number;
  valor_frete: number;
  valor_pedagio: number;
  ciot_numero?: string;
  ciot_status: string; // 'PENDENTE', 'EMITIDO', 'ENCERRADO', 'CANCELADO'
  ciot_ipef?: string;
  mdfe_id?: string;
  status_viagem: string; // 'PLANEJADA', 'EM_CARREGAMENTO', 'EM_TRANSITO', 'ENTREGUE', 'ENCERRADA', 'CANCELADA'
  tabela_frete_id?: string;
  apolice_seguro_id?: string;
  numero_averbacao?: string;
  observacoes?: string;
  total_ctes: number;
  created_at: string;
  updated_at: string;
}

export interface PisoMinimoResult {
  valor_piso_minimo: number;
  coeficiente_deslocamento_ccd: number;
  coeficiente_carga_descarga_cc: number;
  distancia_km: number;
  numero_eixos: number;
  tipo_carga: string;
  base_legal: string;
}

export interface CiotResult {
  ciot_numero: string;
  ciot_protocolo: string;
  ipef: string;
  status: string;
  data_emissao: string;
  valor_frete: number;
  valor_piso_minimo: number;
  piso_minimo_valido: boolean;
  mensagem: string;
}

export interface CalculoTributacaoCteResult {
  cfop: string;
  cst: string;
  base_calculo: number;
  aliquota: number;
  valor_icms: number;
  valor_reducao_bc: number;
}

export interface FinalizarViagemPayload {
  operacao_id: string;
  filial_id: string;
  data_chegada_real?: string;
  recebedor_nome?: string;
  recebedor_documento?: string;
  encerrar_ciot: boolean;
  encerrar_mdfe: boolean;
  uf_encerramento_mdfe?: string;
  municipio_ibge_mdfe?: string;
  valor_saldo_quitado?: number;
  observacoes?: string;
}

export interface FinalizarViagemResult {
  operacao_id: string;
  status_viagem: string;
  ciot_status: string;
  ciot_numero?: string;
  saldo_quitado: number;
  mdfe_encerrado: boolean;
  mensagem: string;
}

export interface AlertaTransporteItem {
  tipo: string;
  titulo: string;
  descricao: string;
  severidade: 'danger' | 'warning' | 'info';
  referencia_id?: string;
}

export interface TransporteKPIs {
  faturamento_frete_total: number;
  faturamento_frete_anterior: number;
  faturamento_variacao_percentual: number;
  ctes_autorizados_total: number;
  viagens_totais: number;
  viagens_em_transito: number;
  viagens_entregues_no_prazo: number;
  otd_percentual: number;
  custo_medio_viagem: number;
  custo_medio_anterior: number;
  custo_variacao_percentual: number;
  veiculos_ativos: number;
  veiculos_em_uso: number;
  utilizacao_frota_percentual: number;
  motoristas_ativos: number;
  ciots_ativos: number;
  ciots_homologados_total: number;
  alertas_pendentes: AlertaTransporteItem[];
}

export interface EvolucaoFreteDiario {
  dia: string;
  data: string;
  valor_real: number;
  valor_meta: number;
  quantidade_ctes: number;
}

export interface RankingRota {
  rota_nome: string;
  uf_origem: string;
  uf_destino: string;
  total_viagens: number;
  faturamento_frete: number;
  percentual: number;
  color: string;
}



// =========================================================================
// MOCK DATA PARA AMBIENTE WEB / DEMO
// =========================================================================

const MOCK_VEICULOS: VeiculoItem[] = [
  {
    id: 'veic-001',
    empresa_id: 'emp_matriz_01',
    placa: 'HQH-4490',
    uf_placa: 'MS',
    renavam: '00987654321',
    tipo_veiculo: 'TRUCK',
    tipo_carroceria: 'BAU',
    tipo_rodado: '01',
    tara_kg: 4500,
    capacidade_kg: 8500,
    capacidade_m3: 42.0,
    rntrc: '09812345',
    tipo_propriedade: 'PROPRIO',
    ano_fabricacao: 2022,
    ano_modelo: 2023,
    marca: 'VOLVO',
    modelo: 'VM 270 6X2R',
    cor: 'BRANCO',
    chassi: '9BV12345678901234',
    ativo: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'veic-002',
    empresa_id: 'emp_matriz_01',
    placa: 'RTE-8A99',
    uf_placa: 'MS',
    renavam: '01298371892',
    tipo_veiculo: 'CAVALO_MECANICO',
    tipo_carroceria: 'SIDER',
    tipo_rodado: '03',
    tara_kg: 8200,
    capacidade_kg: 27000,
    capacidade_m3: 90.0,
    rntrc: '09812345',
    tipo_propriedade: 'PROPRIO',
    ano_fabricacao: 2024,
    ano_modelo: 2024,
    marca: 'SCANIA',
    modelo: 'R 450 6X2',
    cor: 'AZUL',
    chassi: '9BS98765432109876',
    ativo: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const MOCK_MOTORISTAS: MotoristaItem[] = [
  {
    id: 'mot-001',
    empresa_id: 'emp_matriz_01',
    cpf: '450.890.120-44',
    nome: 'JOAO APARECIDO DE OLIVEIRA',
    rg: '1234567 SSP/MS',
    cnh_numero: '09182374650',
    cnh_categoria: 'E',
    cnh_validade: '2028-11-20',
    cnh_uf_emissao: 'MS',
    rntrc: '09812345',
    rntrc_validade: '2027-06-15',
    telefone: '(67) 3421-1122',
    celular: '(67) 99881-2233',
    email: 'joao.oliveira@coliseu.com.br',
    cep: '79800-000',
    endereco: 'Rua Marcelino Pires',
    numero: '1200',
    bairro: 'Centro',
    cidade: 'Dourados',
    uf: 'MS',
    banco: 'Banco do Brasil',
    agencia: '0123-4',
    conta: '56789-0',
    tipo_conta: 'CORRENTE',
    chave_pix: '45089012044',
    tipo_vinculo: 'PROPRIO',
    ativo: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'mot-002',
    empresa_id: 'emp_matriz_01',
    cpf: '123.456.789-00',
    nome: 'MARCOS ANTONIO SILVA',
    rg: '9876543 SSP/MS',
    cnh_numero: '04829103948',
    cnh_categoria: 'D',
    cnh_validade: '2027-04-10',
    cnh_uf_emissao: 'MS',
    celular: '(67) 99912-3456',
    tipo_vinculo: 'TERCEIRO',
    chave_pix: 'marcos.silva@email.com',
    ativo: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const MOCK_ROTAS: RotaTransporteItem[] = [
  {
    id: 'rota-001',
    empresa_id: 'emp_matriz_01',
    nome: 'Dourados (MS) ➔ Campo Grande (MS)',
    uf_origem: 'MS',
    municipio_origem: 'DOURADOS',
    cod_ibge_origem: '5003702',
    uf_destino: 'MS',
    municipio_destino: 'CAMPO GRANDE',
    cod_ibge_destino: '5002704',
    distancia_km: 230.0,
    tempo_estimado_horas: 3.5,
    valor_pedagio_estimado: 45.0,
    ativo: true,
  },
  {
    id: 'rota-002',
    empresa_id: 'emp_matriz_01',
    nome: 'Dourados (MS) ➔ São Paulo (SP)',
    uf_origem: 'MS',
    municipio_origem: 'DOURADOS',
    cod_ibge_origem: '5003702',
    uf_destino: 'SP',
    municipio_destino: 'SAO PAULO',
    cod_ibge_destino: '3550308',
    distancia_km: 980.0,
    tempo_estimado_horas: 14.0,
    valor_pedagio_estimado: 210.0,
    ativo: true,
  },
];

const MOCK_TABELAS_FRETE: TabelaFreteItem[] = [
  {
    id: 'tab-001',
    empresa_id: 'emp_matriz_01',
    nome: 'Tabela Padrão Carga Fracionada',
    tipo_calculo: 'PESO',
    valor_kg: 0.85,
    valor_minimo: 120.0,
    percentual_ad_valorem: 0.30,
    percentual_gris: 0.15,
    taxa_dificuldade_entrega: 0.0,
    inclui_pedagio: true,
    ativo: true,
  },
];

const MOCK_CTES: CteItem[] = [
  {
    id: 'cte-001',
    filial_id: 'fil_matriz_01',
    numero_cte: 101,
    serie: 1,
    chave_acesso: '50260868148349000109570010000001011082739182',
    cfop: '5353',
    natureza_operacao: 'PRESTACAO DE SERVICO DE TRANSPORTE',
    tipo_cte: 0,
    tipo_servico: 0,
    modal: '01',
    data_emissao: '2026-08-23',
    hora_emissao: '08:30:00',
    uf_inicio: 'MS',
    municipio_inicio: 'DOURADOS',
    cod_ibge_inicio: '5003702',
    uf_fim: 'MS',
    municipio_fim: 'CAMPO GRANDE',
    cod_ibge_fim: '5002704',
    remetente_nome: 'COLISEU MATERIAIS & DISTRIBUICAO LTDA',
    destinatario_nome: 'AGROPECUARIA PANTANEIRA LTDA',
    tomador_tipo: 3,
    tomador_nome: 'AGROPECUARIA PANTANEIRA LTDA',
    veiculo_placa: 'HQH-4490',
    motorista_nome: 'JOAO APARECIDO DE OLIVEIRA',
    rntrc: '09812345',
    valor_total_prestacao: 650.0,
    valor_receber: 650.0,
    valor_carga: 18500.0,
    produto_predominante: 'DEFENSIVOS & INSUMOS AGRICOLAS',
    peso_bruto_carga_kg: 2450.0,
    icms_cst: '00',
    icms_base_calculo: 650.0,
    icms_aliquota: 17.0,
    icms_valor: 110.50,
    icms_reducao_bc: 0.0,
    crt_emitente: 1,
    ambiente: 2,
    status_sefaz: 'AUTORIZADO',
    mensagem_sefaz: '100 - Autorizado o uso do CT-e',
    protocolo_autorizacao: '150260001928374',
    data_autorizacao: '2026-08-23 08:30:15',
    total_nfes: 2,
    chaves_nfes: [
      '50260868148349000109550010000003451000003450',
      '50260868148349000109550010000003461000003461',
    ],
    componentes: [
      { nome: 'FRETE_PESO', valor: 500.0 },
      { nome: 'PEDAGIO', valor: 45.0 },
      { nome: 'GRIS', valor: 27.75 },
      { nome: 'AD_VALOREM', valor: 55.50 },
      { nome: 'OUTROS', valor: 21.75 },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const MOCK_VIAGENS: OperacaoTransporteItem[] = [
  {
    id: 'viag-001',
    filial_id: 'fil_matriz_01',
    numero_viagem: 1,
    data_saida: '2026-08-23 09:00',
    data_chegada_prevista: '2026-08-23 13:00',
    veiculo_placa: 'HQH-4490',
    motorista_nome: 'JOAO APARECIDO DE OLIVEIRA',
    rota_nome: 'Dourados (MS) ➔ Campo Grande (MS)',
    uf_origem: 'MS',
    municipio_origem: 'DOURADOS',
    uf_destino: 'MS',
    municipio_destino: 'CAMPO GRANDE',
    peso_total_kg: 2450.0,
    valor_total_carga: 18500.0,
    valor_frete: 650.0,
    valor_pedagio: 45.0,
    ciot_numero: '202608230192',
    ciot_status: 'EMITIDO',
    ciot_ipef: 'PAMCARD',
    mdfe_id: 'MDFE-001',
    status_viagem: 'EM_TRANSITO',
    total_ctes: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// =========================================================================
// SERVICE LAYER
// =========================================================================

function isTauri(): boolean {
  return typeof window !== 'undefined' && Boolean((window as any).__TAURI_INTERNALS__);
}

export const transporteService = {
  // --- VEÍCULOS ---
  async salvarVeiculo(payload: Partial<VeiculoItem>): Promise<VeiculoItem> {
    if (isTauri()) {
      return await invoke<VeiculoItem>('salvar_veiculo_cmd', { payload });
    }
    const idx = MOCK_VEICULOS.findIndex((v) => v.id === payload.id);
    const novo: VeiculoItem = {
      ...(payload as VeiculoItem),
      id: payload.id || `veic-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (idx >= 0) MOCK_VEICULOS[idx] = novo;
    else MOCK_VEICULOS.push(novo);
    return novo;
  },

  async listarVeiculos(empresaId: string): Promise<VeiculoItem[]> {
    if (isTauri()) {
      return await invoke<VeiculoItem[]>('listar_veiculos_cmd', { empresaId });
    }
    return MOCK_VEICULOS;
  },

  // --- MOTORISTAS ---
  async salvarMotorista(payload: Partial<MotoristaItem>): Promise<MotoristaItem> {
    if (isTauri()) {
      return await invoke<MotoristaItem>('salvar_motorista_cmd', { payload });
    }
    const idx = MOCK_MOTORISTAS.findIndex((m) => m.id === payload.id);
    const novo: MotoristaItem = {
      ...(payload as MotoristaItem),
      id: payload.id || `mot-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (idx >= 0) MOCK_MOTORISTAS[idx] = novo;
    else MOCK_MOTORISTAS.push(novo);
    return novo;
  },

  async listarMotoristas(empresaId: string): Promise<MotoristaItem[]> {
    if (isTauri()) {
      return await invoke<MotoristaItem[]>('listar_motoristas_cmd', { empresaId });
    }
    return MOCK_MOTORISTAS;
  },

  // --- SEGURADORAS & APÓLICES ---
  async salvarSeguradora(payload: Partial<SeguradoraItem>): Promise<SeguradoraItem> {
    if (isTauri()) {
      return await invoke<SeguradoraItem>('salvar_seguradora_cmd', { payload });
    }
    return {
      id: payload.id || `seg-${Date.now()}`,
      empresa_id: payload.empresa_id || 'emp_matriz_01',
      cnpj: payload.cnpj || '',
      razao_social: payload.razao_social || '',
      ativo: true,
    };
  },

  async listarSeguradoras(empresaId: string): Promise<SeguradoraItem[]> {
    if (isTauri()) {
      return await invoke<SeguradoraItem[]>('listar_seguradoras_cmd', { empresaId });
    }
    return [
      {
        id: 'seg-01',
        empresa_id: empresaId,
        cnpj: '61.198.164/0001-60',
        razao_social: 'PORTO SEGURO COMPANHIA DE SEGUROS GERAIS',
        telefone: '(11) 3366-3000',
        ativo: true,
      },
    ];
  },

  async salvarApolice(payload: Partial<ApoliceSeguroItem>): Promise<ApoliceSeguroItem> {
    if (isTauri()) {
      return await invoke<ApoliceSeguroItem>('salvar_apolice_cmd', { payload });
    }
    return {
      id: payload.id || `apol-${Date.now()}`,
      seguradora_id: payload.seguradora_id || 'seg-01',
      empresa_id: payload.empresa_id || 'emp_matriz_01',
      tipo_seguro: payload.tipo_seguro || 'RCTR_C',
      numero_apolice: payload.numero_apolice || 'AP-2026-98102',
      data_inicio_vigencia: '2026-01-01',
      data_fim_vigencia: '2027-01-01',
      valor_limite_cobertura: payload.valor_limite_cobertura || 500000.0,
      ativo: true,
    };
  },

  async listarApolices(empresaId: string): Promise<ApoliceSeguroItem[]> {
    if (isTauri()) {
      return await invoke<ApoliceSeguroItem[]>('listar_apolices_cmd', { empresaId });
    }
    return [
      {
        id: 'apol-01',
        seguradora_id: 'seg-01',
        seguradora_nome: 'PORTO SEGURO',
        empresa_id: empresaId,
        tipo_seguro: 'RCTR_C (Responsabilidade Civil do Transportador Rodoviário)',
        numero_apolice: 'AP-2026-98102',
        data_inicio_vigencia: '2026-01-01',
        data_fim_vigencia: '2027-01-01',
        valor_limite_cobertura: 1000000.0,
        ativo: true,
      },
    ];
  },

  // --- ROTAS & TABELAS DE FRETE ---
  async salvarRota(payload: Partial<RotaTransporteItem>): Promise<RotaTransporteItem> {
    if (isTauri()) {
      return await invoke<RotaTransporteItem>('salvar_rota_cmd', { payload });
    }
    return {
      id: payload.id || `rota-${Date.now()}`,
      empresa_id: payload.empresa_id || 'emp_matriz_01',
      nome: payload.nome || '',
      uf_origem: payload.uf_origem || 'MS',
      municipio_origem: payload.municipio_origem || 'DOURADOS',
      uf_destino: payload.uf_destino || 'MS',
      municipio_destino: payload.municipio_destino || 'CAMPO GRANDE',
      distancia_km: payload.distancia_km || 0,
      tempo_estimado_horas: payload.tempo_estimado_horas || 0,
      valor_pedagio_estimado: payload.valor_pedagio_estimado || 0,
      ativo: true,
    };
  },

  async listarRotas(empresaId: string): Promise<RotaTransporteItem[]> {
    if (isTauri()) {
      return await invoke<RotaTransporteItem[]>('listar_rotas_cmd', { empresaId });
    }
    return MOCK_ROTAS;
  },

  async salvarTabelaFrete(payload: Partial<TabelaFreteItem>): Promise<TabelaFreteItem> {
    if (isTauri()) {
      return await invoke<TabelaFreteItem>('salvar_tabela_frete_cmd', { payload });
    }
    return {
      id: payload.id || `tab-${Date.now()}`,
      empresa_id: payload.empresa_id || 'emp_matriz_01',
      nome: payload.nome || '',
      tipo_calculo: payload.tipo_calculo || 'PESO',
      valor_kg: payload.valor_kg || 0.85,
      valor_minimo: payload.valor_minimo || 120.0,
      percentual_ad_valorem: payload.percentual_ad_valorem || 0.3,
      percentual_gris: payload.percentual_gris || 0.15,
      taxa_dificuldade_entrega: payload.taxa_dificuldade_entrega || 0.0,
      inclui_pedagio: true,
      ativo: true,
    };
  },

  async listarTabelasFrete(empresaId: string): Promise<TabelaFreteItem[]> {
    if (isTauri()) {
      return await invoke<TabelaFreteItem[]>('listar_tabelas_frete_cmd', { empresaId });
    }
    return MOCK_TABELAS_FRETE;
  },

  // --- CT-E ---
  async salvarCte(payload: any): Promise<CteItem> {
    if (isTauri()) {
      return await invoke<CteItem>('salvar_cte_cmd', { payload });
    }
    const novo: CteItem = {
      id: `cte-${Date.now()}`,
      filial_id: payload.filial_id || 'fil_matriz_01',
      numero_cte: Math.floor(100 + Math.random() * 900),
      serie: 1,
      chave_acesso: `5026086814834900010957001000000${Math.floor(100 + Math.random() * 900)}1${Math.floor(10000000 + Math.random() * 90000000)}`,
      cfop: payload.cfop || '5353',
      natureza_operacao: 'PRESTACAO DE SERVICO DE TRANSPORTE',
      tipo_cte: 0,
      tipo_servico: 0,
      modal: '01',
      data_emissao: new Date().toISOString().split('T')[0],
      hora_emissao: new Date().toLocaleTimeString(),
      uf_inicio: payload.uf_inicio || 'MS',
      municipio_inicio: payload.municipio_inicio || 'DOURADOS',
      uf_fim: payload.uf_fim || 'MS',
      municipio_fim: payload.municipio_fim || 'CAMPO GRANDE',
      remetente_nome: 'COLISEU MATERIAIS LTDA',
      destinatario_nome: 'CLIENTE DESTINO',
      tomador_tipo: 3,
      valor_total_prestacao: payload.valor_total_prestacao || 650.0,
      valor_receber: payload.valor_receber || 650.0,
      valor_carga: payload.valor_carga || 15000.0,
      produto_predominante: payload.produto_predominante || 'MERCADORIAS DIVERSAS',
      peso_bruto_carga_kg: payload.peso_bruto_carga_kg || 1500.0,
      icms_cst: payload.icms_cst || '00',
      icms_base_calculo: payload.valor_total_prestacao || 650.0,
      icms_aliquota: 17.0,
      icms_valor: ((payload.valor_total_prestacao || 650.0) * 0.17),
      icms_reducao_bc: 0.0,
      crt_emitente: 1,
      ambiente: 2,
      status_sefaz: 'AUTORIZADO',
      mensagem_sefaz: '100 - Autorizado o uso do CT-e',
      protocolo_autorizacao: `15026000${Math.floor(100000 + Math.random() * 900000)}`,
      data_autorizacao: new Date().toLocaleString(),
      total_nfes: (payload.nfes_vinculadas || []).length,
      chaves_nfes: (payload.nfes_vinculadas || []).map((n: any) => n.chave_nfe),
      componentes: payload.componentes || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    MOCK_CTES.unshift(novo);
    return novo;
  },

  async listarCtes(filialId: string): Promise<CteItem[]> {
    if (isTauri()) {
      return await invoke<CteItem[]>('listar_ctes_cmd', { filialId });
    }
    return MOCK_CTES;
  },

  async cancelarCte(id: string, justificativa: string): Promise<void> {
    if (isTauri()) {
      await invoke('cancelar_cte_cmd', { id, justificativa });
      return;
    }
    const cte = MOCK_CTES.find((c) => c.id === id);
    if (cte) {
      cte.status_sefaz = 'CANCELADO';
      cte.mensagem_sefaz = '135 - Cancelamento de CT-e Homologado';
    }
  },

  async calcularTributacaoCte(
    ufInicio: string,
    ufFim: string,
    valorPrestacao: number,
    crtEmitente: number = 1,
    optanteSimples: boolean = true
  ): Promise<CalculoTributacaoCteResult> {
    if (isTauri()) {
      return await invoke<CalculoTributacaoCteResult>('calcular_tributacao_cte_cmd', {
        ufInicio,
        ufFim,
        valorPrestacao,
        crtEmitente,
        optanteSimples,
      });
    }
    const isInterestadual = ufInicio.toUpperCase() !== ufFim.toUpperCase();
    return {
      cfop: isInterestadual ? '6353' : '5353',
      cst: optanteSimples ? '90' : '00',
      base_calculo: optanteSimples ? 0.0 : valorPrestacao,
      aliquota: optanteSimples ? 0.0 : (isInterestadual ? 12.0 : 17.0),
      valor_icms: optanteSimples ? 0.0 : valorPrestacao * (isInterestadual ? 0.12 : 0.17),
      valor_reducao_bc: 0.0,
    };
  },

  // --- CIOT & PISO MÍNIMO ---
  async calcularPisoMinimo(payload: {
    distancia_km: number;
    numero_eixos: number;
    tipo_carga: string;
    tipo_operacao: string;
  }): Promise<PisoMinimoResult> {
    if (isTauri()) {
      return await invoke<PisoMinimoResult>('calcular_piso_minimo_frete_cmd', { payload });
    }
    const ccd = 4.20;
    const cc = 280.00;
    const valor = (ccd * payload.distancia_km) + cc;
    return {
      valor_piso_minimo: Math.round(valor * 100) / 100,
      coeficiente_deslocamento_ccd: ccd,
      coeficiente_carga_descarga_cc: cc,
      distancia_km: payload.distancia_km,
      numero_eixos: payload.numero_eixos,
      tipo_carga: payload.tipo_carga,
      base_legal: 'Tabela Oficial ANTT (Lei 13.703/2018)',
    };
  },

  async gerarCiot(payload: any): Promise<CiotResult> {
    if (isTauri()) {
      return await invoke<CiotResult>('gerar_ciot_cmd', { payload });
    }
    const timestamp = Date.now().toString().slice(-8);
    return {
      ciot_numero: `2026${timestamp}`,
      ciot_protocolo: `PEF-${payload.ipef || 'PAMCARD'}-${timestamp.slice(0, 6)}`,
      ipef: payload.ipef || 'PAMCARD',
      status: 'EMITIDO',
      data_emissao: new Date().toISOString(),
      valor_frete: payload.valor_frete || 650.0,
      valor_piso_minimo: 610.0,
      piso_minimo_valido: true,
      mensagem: `CIOT gerado com sucesso via ${payload.ipef || 'PAMCARD'} e validado pela ANTT.`,
    };
  },

  async encerrarCiot(operacaoId: string): Promise<string> {
    if (isTauri()) {
      return await invoke<string>('encerrar_ciot_cmd', { operacaoId });
    }
    return 'CIOT encerrado com sucesso junto à IPEF/ANTT. Saldo liberado para quitação.';
  },

  // --- VIAGENS / OPERAÇÕES DE TRANSPORTE ---
  async salvarOperacaoTransporte(payload: any): Promise<OperacaoTransporteItem> {
    if (isTauri()) {
      return await invoke<OperacaoTransporteItem>('salvar_operacao_transporte_cmd', { payload });
    }
    const nova: OperacaoTransporteItem = {
      id: payload.id || `viag-${Date.now()}`,
      filial_id: payload.filial_id || 'fil_matriz_01',
      numero_viagem: MOCK_VIAGENS.length + 1,
      data_saida: payload.data_saida || new Date().toISOString(),
      data_chegada_prevista: payload.data_chegada_prevista,
      veiculo_placa: payload.veiculo_placa || 'HQH-4490',
      motorista_nome: payload.motorista_nome || 'JOAO APARECIDO DE OLIVEIRA',
      rota_nome: payload.rota_nome || 'Dourados ➔ Campo Grande',
      uf_origem: payload.uf_origem || 'MS',
      municipio_origem: payload.municipio_origem || 'DOURADOS',
      uf_destino: payload.uf_destino || 'MS',
      municipio_destino: payload.municipio_destino || 'CAMPO GRANDE',
      peso_total_kg: payload.peso_total_kg || 2450.0,
      valor_total_carga: payload.valor_total_carga || 18500.0,
      valor_frete: payload.valor_frete || 650.0,
      valor_pedagio: payload.valor_pedagio || 45.0,
      ciot_numero: payload.ciot_numero,
      ciot_status: payload.ciot_numero ? 'EMITIDO' : 'PENDENTE',
      status_viagem: 'PLANEJADA',
      total_ctes: (payload.cte_ids || []).length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    MOCK_VIAGENS.unshift(nova);
    return nova;
  },

  async listarOperacoesTransporte(filialId: string): Promise<OperacaoTransporteItem[]> {
    if (isTauri()) {
      return await invoke<OperacaoTransporteItem[]>('listar_operacoes_transporte_cmd', { filialId });
    }
    return MOCK_VIAGENS;
  },

  async alterarStatusViagem(id: string, novoStatus: string): Promise<void> {
    if (isTauri()) {
      await invoke('alterar_status_viagem_cmd', { id, novoStatus });
      return;
    }
    const viag = MOCK_VIAGENS.find((v) => v.id === id);
    if (viag) {
      viag.status_viagem = novoStatus;
      if (novoStatus === 'ENTREGUE' || novoStatus === 'ENCERRADA') {
        viag.data_chegada_real = new Date().toISOString();
      }
    }
  },

  async finalizarViagemCompleta(payload: FinalizarViagemPayload): Promise<FinalizarViagemResult> {
    if (isTauri()) {
      return await invoke<FinalizarViagemResult>('finalizar_viagem_completa_cmd', { payload });
    }
    const viag = MOCK_VIAGENS.find((v) => v.id === payload.operacao_id);
    if (viag) {
      viag.status_viagem = 'ENCERRADA';
      viag.data_chegada_real = payload.data_chegada_real || new Date().toISOString();
      if (payload.encerrar_ciot) {
        viag.ciot_status = 'ENCERRADO';
      }
    }
    return {
      operacao_id: payload.operacao_id,
      status_viagem: 'ENCERRADA',
      ciot_status: payload.encerrar_ciot ? 'ENCERRADO' : 'EMITIDO',
      ciot_numero: viag?.ciot_numero,
      saldo_quitado: payload.valor_saldo_quitado || 0,
      mdfe_encerrado: payload.encerrar_mdfe,
      mensagem: 'Viagem finalizada com sucesso! CIOT encerrado e frota liberada.',
    };
  },

  async listarNfesDisponiveisTransporte(): Promise<NfeDocumentoItem[]> {
    if (isTauri()) {
      try {
        const docs = await invoke<NfeDocumentoItem[]>('listar_nfes_disponiveis_transporte_cmd');
        if (Array.isArray(docs)) return docs;
      } catch (e) {
        console.error('Erro ao listar NFes do backend para transporte:', e);
      }
    }
    return [];
  },

  // --- ANALYTICS & KPIS EXECUTIVOS ---
  async calcularKpis(filialId: string = 'todas', periodo: string = 'mes'): Promise<TransporteKPIs> {
    if (isTauri()) {
      try {
        return await invoke<TransporteKPIs>('calcular_kpis_transporte_cmd', { filialId, periodo });
      } catch (e) {
        console.error('Erro ao calcular KPIs de transporte no backend:', e);
      }
    }
    return {
      faturamento_frete_total: 1246.0,
      faturamento_frete_anterior: 1150.0,
      faturamento_variacao_percentual: 8.3,
      ctes_autorizados_total: 1,
      viagens_totais: 1,
      viagens_em_transito: 0,
      viagens_entregues_no_prazo: 1,
      otd_percentual: 98.5,
      custo_medio_viagem: 645.0,
      custo_medio_anterior: 670.0,
      custo_variacao_percentual: -3.7,
      veiculos_ativos: 2,
      veiculos_em_uso: 1,
      utilizacao_frota_percentual: 50.0,
      motoristas_ativos: 2,
      ciots_ativos: 0,
      ciots_homologados_total: 1,
      alertas_pendentes: [],
    };
  },

  async listarEvolucaoFreteDiario(filialId: string = 'todas', dias: number = 7): Promise<EvolucaoFreteDiario[]> {
    if (isTauri()) {
      try {
        return await invoke<EvolucaoFreteDiario[]>('listar_evolucao_frete_diario_cmd', { filialId, dias });
      } catch (e) {
        console.error('Erro ao listar evolução diária de frete no backend:', e);
      }
    }
    return [
      { dia: '17/Ago', data: '2026-08-17', valor_real: 650, valor_meta: 1200, quantidade_ctes: 1 },
      { dia: '18/Ago', data: '2026-08-18', valor_real: 1240, valor_meta: 1200, quantidade_ctes: 2 },
      { dia: '19/Ago', data: '2026-08-19', valor_real: 890, valor_meta: 1300, quantidade_ctes: 1 },
      { dia: '20/Ago', data: '2026-08-20', valor_real: 1540, valor_meta: 1300, quantidade_ctes: 2 },
      { dia: '21/Ago', data: '2026-08-21', valor_real: 980, valor_meta: 1400, quantidade_ctes: 1 },
      { dia: '22/Ago', data: '2026-08-22', valor_real: 1820, valor_meta: 1400, quantidade_ctes: 3 },
      { dia: '23/Ago', data: '2026-08-23', valor_real: 1246, valor_meta: 1500, quantidade_ctes: 1 },
    ];
  },

  async listarRankingRotas(filialId: string = 'todas'): Promise<RankingRota[]> {
    if (isTauri()) {
      try {
        return await invoke<RankingRota[]>('listar_ranking_rotas_cmd', { filialId });
      } catch (e) {
        console.error('Erro ao listar ranking de rotas no backend:', e);
      }
    }
    return [
      { rota_nome: 'DOURADOS ➔ CAMPO GRANDE', uf_origem: 'MS', uf_destino: 'MS', total_viagens: 1, faturamento_frete: 1246.0, percentual: 100, color: 'var(--action-primary)' },
    ];
  },
};

export interface NfeDocumentoItem {
  id: string;
  modelo: string;
  numero: number;
  serie: number;
  chave_acesso: string;
  data_emissao: string;
  destinatario_nome: string;
  destinatario_cpf_cnpj: string;
  destinatario_cidade: string;
  destinatario_uf: string;
  valor_total: number;
  status: string;
  tipo_origem: string;
}

export const MOCK_DOCUMENTOS_FISCAIS_TRANSPORTE: NfeDocumentoItem[] = [];

export const TransporteService = transporteService;


