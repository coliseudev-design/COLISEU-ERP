import { safeInvoke as invoke } from "./ipc";
import type {
  FinanceiroLancamento,
  CreateLancamentoPayload,
  CaixaMovimentacao,
  RegistrarCaixaPayload,
  ResumoCaixa,
} from "./types";

export interface LinhaDre {
  codigo_conta: string;
  descricao: string;
  valor: number;
  percentual_sobre_receita: number;
}

export interface DreGerencialReport {
  periodo_inicio: string;
  periodo_fim: string;
  receita_bruta: number;
  deducoes_impostos: number;
  receita_liquida: number;
  custo_mercadorias_vendidas_cmv: number;
  lucro_bruto: number;
  margem_bruta_percentual: number;
  despesas_operacionais_fixas: number;
  despesas_operacionais_variaveis: number;
  lucro_liquido_ebitda: number;
  margem_liquida_percentual: number;
  detalhamento_linhas: LinhaDre[];
}

export interface ResultadoConciliacaoOfx {
  total_processados: number;
  conciliados_automaticamente: number;
  pendentes: number;
}

/**
 * Service Layer / Wrapper para Gestão Financeira, DRE e Conciliação OFX.
 */
export const financeService = {
  async listLancamentos(
    filialId: string,
    tipo?: 'RECEBER' | 'PAGAR',
    status?: 'PENDENTE' | 'PAGO' | 'CANCELADO'
  ): Promise<FinanceiroLancamento[]> {
    return await invoke<FinanceiroLancamento[]>("list_financeiro_lancamentos", {
      filialId,
      tipo,
      status,
    });
  },

  async createLancamento(
    payload: CreateLancamentoPayload
  ): Promise<FinanceiroLancamento> {
    return await invoke<FinanceiroLancamento>("create_financeiro_lancamento", {
      payload,
    });
  },

  async quitarLancamento(
    lancamentoId: string,
    valorPago: number,
    dataPagamento?: string
  ): Promise<FinanceiroLancamento> {
    return await invoke<FinanceiroLancamento>("quitar_financeiro_lancamento", {
      lancamentoId,
      valorPago,
      dataPagamento,
    });
  },

  async listCaixaMovimentacoes(filialId: string): Promise<CaixaMovimentacao[]> {
    return await invoke<CaixaMovimentacao[]>("list_caixa_movimentacoes", {
      filialId,
    });
  },

  async getResumoCaixa(filialId: string): Promise<ResumoCaixa> {
    return await invoke<ResumoCaixa>("get_resumo_caixa", { filialId });
  },

  async registrarMovimentacaoCaixa(
    payload: RegistrarCaixaPayload
  ): Promise<CaixaMovimentacao> {
    return await invoke<CaixaMovimentacao>("registrar_movimentacao_caixa", {
      payload,
    });
  },

  async gerarDreGerencial(
    filialId: string,
    dataInicio: string,
    dataFim: string
  ): Promise<DreGerencialReport> {
    return await invoke<DreGerencialReport>("gerar_dre_gerencial", {
      filialId,
      dataInicio,
      dataFim,
    });
  },

  async importarExtratoOfx(
    filialId: string,
    ofxContent: string
  ): Promise<ResultadoConciliacaoOfx> {
    return await invoke<ResultadoConciliacaoOfx>("importar_extrato_ofx", {
      filialId,
      ofxContent,
    });
  },
};
