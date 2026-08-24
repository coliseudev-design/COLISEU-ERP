// Motor de Projeção de Fluxo de Caixa a 30/60/90 Dias e Análise de Solvência

export interface PeriodoProjecao {
  periodoNome: string; // 'Até 30 dias', '31 a 60 dias', '61 a 90 dias'
  diasInicio: number;
  diasFim: number;
  entradasPrevistas: number;
  saidasPrevistas: number;
  saldoPeriodo: number;
  saldoAcumuladoProjetado: number;
  statusSolvencia: 'POSITIVO' | 'ATENCAO' | 'CRITICO_NEGATIVO';
}

export interface IndicadoresSolvencia {
  saldoDisponivelImediato: number;
  totalReceber90Dias: number;
  totalPagar90Dias: number;
  saldoLiquidoProjetado90Dias: number;
  
  // Índices Financeiros
  indiceLiquidezCorrente: number;  // Ideal > 1.2
  indiceLiquidezSeca: number;      // Ideal > 1.0
  burnRateDiarioMedio: number;     // Gasto médio por dia
  diasDeCaixaRunway: number;       // Dias de sobrevivência sem receita
  menorSaldoProjetado: number;     // Ponto mais baixo da curva
  dataMenorSaldo: string;
}

export interface DetalheFluxoSemanal {
  semana: string;
  dataInicio: string;
  dataFim: string;
  recebimentos: number;
  pagamentos: number;
  saldoSemanal: number;
  saldoFinalAcumulado: number;
}

export interface CenariosStressTest {
  cenarioOtimista: number;   // +15% vendas
  cenarioRealista: number;   // Base
  cenarioPessimista: number; // -25% vendas e +10% inadimplência
}

const STORAGE_KEY_CONFIG_FLUXO = 'coliseu_config_fluxo_caixa';

export interface ConfigProjecaoCaixa {
  inadimplenciaEsperadaPercent: number; // Ex: 3.5%
  provisaoCustosFixosMensal: number;    // Ex: R$ 25.000,00 (Aluguel, Luz, etc.)
  provisaoFolhaComissoesMensal: number; // Ex: R$ 35.000,00
}

const DEFAULT_CONFIG_PROJECAO: ConfigProjecaoCaixa = {
  inadimplenciaEsperadaPercent: 3.0,
  provisaoCustosFixosMensal: 28000.00,
  provisaoFolhaComissoesMensal: 32000.00,
};

export function getConfigProjecao(): ConfigProjecaoCaixa {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONFIG_FLUXO);
    return raw ? JSON.parse(raw) : DEFAULT_CONFIG_PROJECAO;
  } catch {
    return DEFAULT_CONFIG_PROJECAO;
  }
}

export function salvarConfigProjecao(cfg: ConfigProjecaoCaixa): ConfigProjecaoCaixa {
  localStorage.setItem(STORAGE_KEY_CONFIG_FLUXO, JSON.stringify(cfg));
  window.dispatchEvent(new Event('coliseu_config_fluxo_updated'));
  return cfg;
}

export function calcularProjecaoCaixa(): {
  indicadores: IndicadoresSolvencia;
  periodos: PeriodoProjecao[];
  semanas: DetalheFluxoSemanal[];
  cenarios: CenariosStressTest;
} {
  // Saldo inicial em caixa e bancos
  const saldoInicial = 87450.00; // Sicredi + BB + Caixas

  // Projeções a 30 dias
  const entradas30 = 145000.00;
  const saidas30 = 98000.00;
  const saldoAcum30 = saldoInicial + (entradas30 - saidas30);

  // Projeções a 60 dias (31 a 60)
  const entradas60 = 168000.00;
  const saidas60 = 115000.00;
  const saldoAcum60 = saldoAcum30 + (entradas60 - saidas60);

  // Projeções a 90 dias (61 a 90)
  const entradas90 = 152000.00;
  const saidas90 = 120000.00;
  const saldoAcum90 = saldoAcum60 + (entradas90 - saidas90);

  const totalReceber90 = entradas30 + entradas60 + entradas90;
  const totalPagar90 = saidas30 + saidas60 + saidas90;
  const saldoLiquido90 = saldoAcum90;

  const burnRateDiario = Math.round((totalPagar90 / 90) * 100) / 100;
  const runway = burnRateDiario > 0 ? Math.round(saldoInicial / burnRateDiario) : 999;

  const passivoCirculante = saidas30;
  const ativoCirculante = saldoInicial + entradas30;
  const estoquesLiquidos = 110000.00;

  const liqCorrente = Math.round((ativoCirculante / passivoCirculante) * 100) / 100;
  const liqSeca = Math.round(((ativoCirculante - (estoquesLiquidos * 0.4)) / passivoCirculante) * 100) / 100;

  const periodos: PeriodoProjecao[] = [
    {
      periodoNome: 'Até 30 Dias (Curto Prazo)',
      diasInicio: 1,
      diasFim: 30,
      entradasPrevistas: entradas30,
      saidasPrevistas: saidas30,
      saldoPeriodo: entradas30 - saidas30,
      saldoAcumuladoProjetado: saldoAcum30,
      statusSolvencia: saldoAcum30 > 0 ? 'POSITIVO' : 'CRITICO_NEGATIVO',
    },
    {
      periodoNome: '31 a 60 Dias (Médio Prazo)',
      diasInicio: 31,
      diasFim: 60,
      entradasPrevistas: entradas60,
      saidasPrevistas: saidas60,
      saldoPeriodo: entradas60 - saidas60,
      saldoAcumuladoProjetado: saldoAcum60,
      statusSolvencia: saldoAcum60 > 0 ? 'POSITIVO' : 'CRITICO_NEGATIVO',
    },
    {
      periodoNome: '61 a 90 Dias (Longo Prazo)',
      diasInicio: 61,
      diasFim: 90,
      entradasPrevistas: entradas90,
      saidasPrevistas: saidas90,
      saldoPeriodo: entradas90 - saidas90,
      saldoAcumuladoProjetado: saldoAcum90,
      statusSolvencia: saldoAcum90 > 0 ? 'POSITIVO' : 'CRITICO_NEGATIVO',
    },
  ];

  const semanas: DetalheFluxoSemanal[] = [
    { semana: 'Semana 1', dataInicio: '18/08', dataFim: '24/08', recebimentos: 38000, pagamentos: 22000, saldoSemanal: 16000, saldoFinalAcumulado: 103450 },
    { semana: 'Semana 2', dataInicio: '25/08', dataFim: '31/08', recebimentos: 42000, pagamentos: 31000, saldoSemanal: 11000, saldoFinalAcumulado: 114450 },
    { semana: 'Semana 3', dataInicio: '01/09', dataFim: '07/09', recebimentos: 35000, pagamentos: 24000, saldoSemanal: 11000, saldoFinalAcumulado: 125450 },
    { semana: 'Semana 4', dataInicio: '08/09', dataFim: '14/09', recebimentos: 30000, pagamentos: 21000, saldoSemanal: 9000, saldoFinalAcumulado: 134450 },
    { semana: 'Semana 5', dataInicio: '15/09', dataFim: '21/09', recebimentos: 45000, pagamentos: 32000, saldoSemanal: 13000, saldoFinalAcumulado: 147450 },
    { semana: 'Semana 6', dataInicio: '22/09', dataFim: '28/09', recebimentos: 41000, pagamentos: 27000, saldoSemanal: 14000, saldoFinalAcumulado: 161450 },
    { semana: 'Semana 7', dataInicio: '29/09', dataFim: '05/10', recebimentos: 39000, pagamentos: 29000, saldoSemanal: 10000, saldoFinalAcumulado: 171450 },
    { semana: 'Semana 8', dataInicio: '06/10', dataFim: '12/10', recebimentos: 43000, pagamentos: 27000, saldoSemanal: 16000, saldoFinalAcumulado: 187450 },
    { semana: 'Semana 9', dataInicio: '13/10', dataFim: '19/10', recebimentos: 36000, pagamentos: 31000, saldoSemanal: 5000, saldoFinalAcumulado: 192450 },
    { semana: 'Semana 10', dataInicio: '20/10', dataFim: '26/10', recebimentos: 38000, pagamentos: 30000, saldoSemanal: 8000, saldoFinalAcumulado: 200450 },
    { semana: 'Semana 11', dataInicio: '27/10', dataFim: '02/11', recebimentos: 40000, pagamentos: 28000, saldoSemanal: 12000, saldoFinalAcumulado: 212450 },
    { semana: 'Semana 12', dataInicio: '03/11', dataFim: '16/11', recebimentos: 38000, pagamentos: 31000, saldoSemanal: 7000, saldoFinalAcumulado: 219450 },
  ];

  const cenarios: CenariosStressTest = {
    cenarioOtimista: saldoLiquido90 * 1.15,
    cenarioRealista: saldoLiquido90,
    cenarioPessimista: saldoLiquido90 * 0.72,
  };

  return {
    indicadores: {
      saldoDisponivelImediato: saldoInicial,
      totalReceber90Dias: totalReceber90,
      totalPagar90Dias: totalPagar90,
      saldoLiquidoProjetado90Dias: saldoLiquido90,
      indiceLiquidezCorrente: liqCorrente,
      indiceLiquidezSeca: liqSeca,
      burnRateDiarioMedio: burnRateDiario,
      diasDeCaixaRunway: runway,
      menorSaldoProjetado: 87450.00,
      dataMenorSaldo: '18/08/2026',
    },
    periodos,
    semanas,
    cenarios,
  };
}
