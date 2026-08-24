import { safeInvoke as invoke } from "./ipc";

export interface ItemCurvaAbc {
  produto_id: string;
  codigo_sku: string;
  descricao: string;
  faturamento_total: number;
  percentual_relativo: number;
  percentual_acumulado: number;
  classe: 'A' | 'B' | 'C';
}

export interface CurvaAbcReport {
  total_produtos_analisados: number;
  faturamento_total_periodo: number;
  total_classe_a: number;
  total_classe_b: number;
  total_classe_c: number;
  itens: ItemCurvaAbc[];
}

export interface ItemGiroEstoque {
  produto_id: string;
  codigo_sku: string;
  descricao: string;
  estoque_atual: number;
  quantidade_vendida_periodo: number;
  giro_estoque: number;
  cobertura_dias: number;
}

export interface RelatorioGiroEstoqueReport {
  total_itens: number;
  itens: ItemGiroEstoque[];
}

export interface CockpitKPICardData {
  title: string;
  value_str: string;
  is_currency: boolean;
  change: number;
  period_label: string;
  subtitle: string;
  action_text: string;
  action_target: string;
}

export interface CockpitEvolucaoDia {
  day: string;
  data: string;
  real: number;
  meta: number;
}

export interface CockpitCategoriaData {
  nome: string;
  valor: number;
  percent: number;
  color: string;
}

export interface CockpitAlertaItem {
  id: string;
  titulo: string;
  subtitulo: string;
  severidade: 'danger' | 'warning' | 'info';
  action_text: string;
  action_target: string;
}

export interface CockpitVendaRecente {
  id: string;
  cliente: string;
  canal: string;
  valor: number;
  status: string;
  data: string;
}

export interface CockpitExecutivoData {
  kpis: CockpitKPICardData[];
  evolucao_faturamento: CockpitEvolucaoDia[];
  distribuicao_categorias: CockpitCategoriaData[];
  alertas_operacionais: CockpitAlertaItem[];
  insight_titulo: string;
  insight_corpo: string;
  insight_action_text: string;
  insight_action_target: string;
  vendas_recentes: CockpitVendaRecente[];
}

export interface BIKpisMacro {
  faturamento_bruto: number;
  faturamento_liquido: number;
  faturamento_meta: number;
  percent_atingimento_meta: number;
  cmv_total: number;
  lucro_operacional: number;
  margem_efetiva: number;
  ticket_medio: number;
  total_pedidos: number;
  total_clientes_unicos: number;
  contas_receber_total: number;
  contas_receber_hoje: number;
  contas_pagar_total: number;
  contas_pagar_3dias: number;
  saldo_projetado: number;
  ponto_equilibrio_estimado: number;
  valor_total_estoque: number;
  total_skus_ativos: number;
  itens_ruptura_iminente: number;
  giro_medio_dias: number;
  total_nfes_emitidas: number;
  total_nfces_emitidas: number;
  total_ctes_emitidos: number;
  valor_faturado_fiscal: number;
}

export interface BIEvolucaoTemporal {
  label: string;
  data: string;
  faturamento: number;
  lucro: number;
  meta: number;
  pedidos_qtd: number;
}

export interface BICurvaAbcItem {
  produto_id: string;
  sku: string;
  descricao: string;
  quantidade_vendida: number;
  faturamento_total: number;
  margem_lucro_percent: number;
  percentual_relativo: number;
  percentual_acumulado: number;
  classe: 'A' | 'B' | 'C';
}

export interface BIRankingVendedor {
  vendedor_id: string;
  nome: string;
  faturamento: number;
  total_pedidos: number;
  ticket_medio: number;
  meta_faturamento: number;
  percent_meta: number;
  comissao_estimada: number;
}

export interface BICanalVenda {
  canal: string;
  faturamento: number;
  pedidos_qtd: number;
  percentual: number;
}

export interface BIHorarioPico {
  faixa_horario: string;
  total_pedidos: number;
  faturamento: number;
}

export interface BIFluxoCaixaDia {
  data: string;
  label: string;
  entradas_previstas: number;
  saidas_previstas: number;
  saldo_dia: number;
  saldo_acumulado: number;
}

export interface BIEstoqueRisco {
  produto_id: string;
  sku: string;
  descricao: string;
  saldo_atual: number;
  consumo_diario: number;
  cobertura_dias: number;
  status_risco: 'CRITICO' | 'ALERTA' | 'NORMAL';
  sugestao_compra: number;
}

export interface BIAlertaEstrategico {
  id: string;
  categoria: 'FINANCEIRO' | 'COMERCIAL' | 'ESTOQUE' | 'FISCAL';
  severidade: 'danger' | 'warning' | 'info';
  titulo: string;
  descricao: string;
  valor_impacto?: number;
  acao_recomendada: string;
  action_target: string;
}

export interface BIExecutivoData {
  data_inicio: string;
  data_fim: string;
  filial_id: string;
  kpis: BIKpisMacro;
  evolucao_temporal: BIEvolucaoTemporal[];
  curva_abc_produtos: BICurvaAbcItem[];
  ranking_vendedores: BIRankingVendedor[];
  canais_venda: BICanalVenda[];
  horarios_pico: BIHorarioPico[];
  fluxo_caixa_projetado: BIFluxoCaixaDia[];
  estoque_risco: BIEstoqueRisco[];
  alertas_estrategicos: BIAlertaEstrategico[];
  resumo_ia_diagnostico: string;
}

/**
 * Service Layer / Wrapper para Relatórios Gerenciais & Curva ABC & BI 360.
 */
export const reportsService = {
  async gerarCurvaAbcProdutos(
    filialId: string,
    dataInicio: string,
    dataFim: string
  ): Promise<CurvaAbcReport> {
    return await invoke<CurvaAbcReport>("gerar_curva_abc_produtos", {
      filialId,
      dataInicio,
      dataFim,
    });
  },

  async gerarRelatorioGiroEstoque(
    filialId: string,
    diasPeriodo: number
  ): Promise<RelatorioGiroEstoqueReport> {
    return await invoke<RelatorioGiroEstoqueReport>("gerar_relatorio_giro_estoque", {
      filialId,
      diasPeriodo,
    });
  },

  async calcularCockpitExecutivo(
    filialId: string = 'todas',
    periodo: string = 'mes',
    perfil: string = 'diretor'
  ): Promise<CockpitExecutivoData> {
    return await invoke<CockpitExecutivoData>("calcular_cockpit_executivo_cmd", {
      filialId,
      periodo,
      perfil,
    });
  },

  async gerarBiExecutivo(
    dataInicio: string,
    dataFim: string,
    filialId: string = 'todas'
  ): Promise<BIExecutivoData> {
    return await invoke<BIExecutivoData>("gerar_bi_executivo_cmd", {
      dataInicio,
      dataFim,
      filialId,
    });
  },

  async analisarBiComIa(
    dadosResumoJson: string,
    perguntaUsuario?: string
  ): Promise<string> {
    return await invoke<string>("analisar_bi_com_ia_cmd", {
      dadosResumoJson,
      perguntaUsuario,
    });
  },
};


