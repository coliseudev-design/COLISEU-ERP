/**
 * Coliseu ERP — Funções Utilitárias do Módulo de Liquidação Financeira
 * Cálculos de juros, multa, simulação de renegociação e geração de parcelas
 */

import type { ParcelaSimulada, RenegociacaoConfig, PagamentoLiquidacao } from './types-financeiro';

/**
 * Calcula o número de dias entre duas datas (strings ISO ou 'YYYY-MM-DD')
 */
export function calcularDiasAtraso(dataVencimento: string, dataReferencia?: string): number {
  const venc = new Date(dataVencimento + 'T00:00:00');
  const ref = dataReferencia ? new Date(dataReferencia + 'T00:00:00') : new Date();
  ref.setHours(0, 0, 0, 0);
  const diff = ref.getTime() - venc.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

/**
 * Calcula a multa por atraso sobre um valor original
 * @param valorOriginal - Valor original do título
 * @param percentualMulta - Percentual de multa (default 2%)
 * @param diasAtraso - Dias em atraso (multa só incide se > 0)
 * @returns Valor da multa calculada
 */
export function calcularMulta(
  valorOriginal: number,
  percentualMulta: number = 2.0,
  diasAtraso: number = 0
): number {
  if (diasAtraso <= 0) return 0;
  return Math.round((valorOriginal * percentualMulta) / 100 * 100) / 100;
}

/**
 * Calcula juros de mora (simples) sobre um valor original
 * @param valorOriginal - Valor original do título
 * @param taxaMensal - Taxa de juros mensal em % (default 1%)
 * @param diasAtraso - Número de dias em atraso
 * @param diasTolerancia - Dias de carência antes da incidência de juros
 * @returns Valor dos juros calculados
 */
export function calcularJurosMora(
  valorOriginal: number,
  taxaMensal: number = 1.0,
  diasAtraso: number = 0,
  diasTolerancia: number = 0
): number {
  const diasEfetivos = Math.max(0, diasAtraso - diasTolerancia);
  if (diasEfetivos <= 0) return 0;

  // Juros simples: valor * (taxa_mensal / 30) * dias
  const taxaDiaria = taxaMensal / 100 / 30;
  const juros = valorOriginal * taxaDiaria * diasEfetivos;

  return Math.round(juros * 100) / 100;
}

/**
 * Calcula o valor atualizado de um título (valor + juros + multa)
 */
export function calcularValorAtualizado(
  valorOriginal: number,
  dataVencimento: string,
  taxaMulta: number = 2.0,
  taxaJurosMensal: number = 1.0,
  diasTolerancia: number = 0,
  dataReferencia?: string
): { valorAtualizado: number; juros: number; multa: number; diasAtraso: number } {
  const diasAtraso = calcularDiasAtraso(dataVencimento, dataReferencia);
  const multa = calcularMulta(valorOriginal, taxaMulta, diasAtraso);
  const juros = calcularJurosMora(valorOriginal, taxaJurosMensal, diasAtraso, diasTolerancia);
  const valorAtualizado = Math.round((valorOriginal + juros + multa) * 100) / 100;

  return { valorAtualizado, juros, multa, diasAtraso };
}

/**
 * Gera parcelas para renegociação com distribuição correta de centavos
 * A última parcela absorve a diferença para garantir soma exata
 */
export function gerarParcelas(
  valorTotal: number,
  numParcelas: number,
  intervaloDias: number,
  dataInicio: string,
  especie?: string
): ParcelaSimulada[] {
  if (numParcelas <= 0 || valorTotal <= 0) return [];

  const valorParcelaBase = Math.floor((valorTotal / numParcelas) * 100) / 100;
  const parcelas: ParcelaSimulada[] = [];
  let somaAcumulada = 0;

  for (let i = 0; i < numParcelas; i++) {
    const isUltima = i === numParcelas - 1;
    const valor = isUltima
      ? Math.round((valorTotal - somaAcumulada) * 100) / 100
      : valorParcelaBase;

    somaAcumulada += valor;

    // Calcular vencimento
    const dataBase = new Date(dataInicio + 'T00:00:00');
    dataBase.setDate(dataBase.getDate() + intervaloDias * i);
    const vencimento = dataBase.toISOString().split('T')[0];

    parcelas.push({
      numero: i + 1,
      totalParcelas: numParcelas,
      vencimento,
      valor,
      label: `${i + 1}/${numParcelas}`,
    });
  }

  return parcelas;
}

/**
 * Simula uma renegociação completa
 * @returns Configuração calculada com valores e parcelas
 */
export function simularRenegociacao(
  valorOriginalDivida: number,
  descontoPercent: number,
  acrescimoPercent: number,
  numParcelas: number,
  intervaloDias: number,
  dataPrimeiraParcela: string,
  especieNovasParcelas: string = 'BOLETO'
): { config: Omit<RenegociacaoConfig, 'tituloIds'>; parcelas: ParcelaSimulada[] } {
  const valorDesconto = Math.round((valorOriginalDivida * descontoPercent) / 100 * 100) / 100;
  const valorAcrescimo = Math.round((valorOriginalDivida * acrescimoPercent) / 100 * 100) / 100;
  const valorFinal = Math.round((valorOriginalDivida - valorDesconto + valorAcrescimo) * 100) / 100;

  const parcelas = gerarParcelas(valorFinal, numParcelas, intervaloDias, dataPrimeiraParcela, especieNovasParcelas);

  return {
    config: {
      descontoPercent,
      acrescimoPercent,
      numParcelas,
      intervaloDias,
      dataPrimeiraParcela,
      especieNovasParcelas,
      valorOriginal: valorOriginalDivida,
      valorDescontoCalculado: valorDesconto,
      valorAcrescimoCalculado: valorAcrescimo,
      valorFinalAcordo: valorFinal,
    },
    parcelas,
  };
}

/**
 * Valida se os pagamentos cobrem o valor total a liquidar
 */
export function validarPagamento(
  pagamentos: PagamentoLiquidacao[],
  totalLiquidar: number
): { valido: boolean; totalPago: number; saldoRestante: number; troco: number } {
  const totalPago = pagamentos.reduce((acc, p) => acc + p.valor, 0);
  const saldoRestante = Math.max(0, Math.round((totalLiquidar - totalPago) * 100) / 100);
  const troco = Math.max(0, Math.round((totalPago - totalLiquidar) * 100) / 100);

  return {
    valido: totalPago >= totalLiquidar,
    totalPago: Math.round(totalPago * 100) / 100,
    saldoRestante,
    troco,
  };
}

/**
 * Calcula o resumo de uma seleção de títulos para liquidação
 */
export function calcularResumoSelecao(
  titulos: Array<{ valorAtual: number; valorTitulo: number; isVencido: boolean; vencimento: string }>,
  taxaMulta: number = 2.0,
  taxaJurosMensal: number = 1.0,
  diasTolerancia: number = 0
): { subtotal: number; juros: number; multa: number; total: number; qtdVencidos: number } {
  let subtotal = 0;
  let juros = 0;
  let multa = 0;
  let qtdVencidos = 0;

  titulos.forEach((t) => {
    subtotal += t.valorTitulo;
    if (t.isVencido) {
      qtdVencidos++;
      const atualizado = calcularValorAtualizado(
        t.valorTitulo,
        t.vencimento,
        taxaMulta,
        taxaJurosMensal,
        diasTolerancia
      );
      juros += atualizado.juros;
      multa += atualizado.multa;
    }
  });

  subtotal = Math.round(subtotal * 100) / 100;
  juros = Math.round(juros * 100) / 100;
  multa = Math.round(multa * 100) / 100;
  const total = Math.round((subtotal + juros + multa) * 100) / 100;

  return { subtotal, juros, multa, total, qtdVencidos };
}

/**
 * Formata uma data ISO para o formato brasileiro DD/MM/YYYY
 */
export function formatDateBR(dateStr: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

/**
 * Retorna a data atual no formato ISO (YYYY-MM-DD)
 */
export function getHoje(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Adiciona dias a uma data e retorna no formato ISO
 */
export function adicionarDias(dataBase: string, dias: number): string {
  const d = new Date(dataBase + 'T00:00:00');
  d.setDate(d.getDate() + dias);
  return d.toISOString().split('T')[0];
}

/**
 * Carrega as configurações financeiras do localStorage
 */
export function getConfigFinanceira(): {
  taxaMulta: number;
  taxaJurosMensal: number;
  diasTolerancia: number;
  percentMaxDesconto: number;
} {
  try {
    const raw = localStorage.getItem('coliseu_erp_config');
    if (raw) {
      const config = JSON.parse(raw);
      return {
        taxaMulta: config.taxaMultaAtraso ?? 2.0,
        taxaJurosMensal: config.taxaJurosMoraMensal ?? 1.0,
        diasTolerancia: config.diasTolerancia ?? 0,
        percentMaxDesconto: config.percentMaxDesconto ?? 10.0,
      };
    }
  } catch { /* fallback */ }

  return {
    taxaMulta: 2.0,
    taxaJurosMensal: 1.0,
    diasTolerancia: 0,
    percentMaxDesconto: 10.0,
  };
}
