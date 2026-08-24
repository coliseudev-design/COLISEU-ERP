import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  TrendingUp,
  Percent,
  AlertCircle,
  HelpCircle,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  Info,
  Sliders,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { formatCurrency } from '../../lib/formatters';

export interface ParametrosPrecificacao {
  metodo: 'markup_divisor' | 'markup_multiplicador';
  impostosSaidaPercent: number;     // Ex: 12% (Simples ou ICMS+PIS+COFINS)
  comissaoPercent: number;          // Ex: 4% (Vendedores / Marketplaces)
  custosFixosPercent: number;       // Ex: 7% (Aluguel, salários, despesas operacionais)
  taxaCartaoPercent: number;        // Ex: 2.5% (Taxa média antecipação / cartão / boleto)
  margemLucroLiquidaPercent: number;// Ex: 20% (Lucro líquido desejado no bolso)
  markupMultiplicadorPercent: number; // Ex: 70% (Caso utilize método multiplicador)
  arredondamento: 'exato' | '0.10' | '0.50' | '0.90' | '0.99' | '1.00';
}

export const PARAMETROS_PRECIFICACAO_PADRAO: ParametrosPrecificacao = {
  metodo: 'markup_divisor',
  impostosSaidaPercent: 12.0,
  comissaoPercent: 4.0,
  custosFixosPercent: 6.0,
  taxaCartaoPercent: 2.5,
  margemLucroLiquidaPercent: 20.0,
  markupMultiplicadorPercent: 70.0,
  arredondamento: '0.90',
};

interface FormacaoPrecoPanelProps {
  custoRealAquisicao: number;
  precoVendaAtual?: number;
  initialParams?: Partial<ParametrosPrecificacao>;
  onPrecoCalculadoChange?: (
    novoPreco: number,
    margemEfetiva: number,
    precoMinimo: number,
    paramsUtilizados: ParametrosPrecificacao
  ) => void;
  compacto?: boolean;
  persistGlobal?: boolean;
}

export const FormacaoPrecoPanel: React.FC<FormacaoPrecoPanelProps> = ({
  custoRealAquisicao,
  precoVendaAtual = 0,
  initialParams,
  onPrecoCalculadoChange,
  compacto = false,
  persistGlobal = false,
}) => {
  const [params, setParams] = useState<ParametrosPrecificacao>(() => {
    let base = PARAMETROS_PRECIFICACAO_PADRAO;
    try {
      const saved = localStorage.getItem('coliseu_config_precificacao');
      if (saved) base = { ...base, ...JSON.parse(saved) };
    } catch { /* fallback */ }
    return initialParams ? { ...base, ...initialParams } : base;
  });

  const updateParam = (field: keyof ParametrosPrecificacao, value: any) => {
    const updated = { ...params, [field]: value };
    setParams(updated);
    if (persistGlobal) {
      try {
        localStorage.setItem('coliseu_config_precificacao', JSON.stringify(updated));
      } catch { /* fallback */ }
    }
  };

  // Cálculo Detalhado de Formação de Preço
  const calculo = useMemo(() => {
    const custo = Math.max(0, custoRealAquisicao);
    const somaDeducoes =
      params.impostosSaidaPercent +
      params.comissaoPercent +
      params.custosFixosPercent +
      params.taxaCartaoPercent;

    let precoSugeridoBruto = 0;
    let precoMinimoBruto = 0;

    if (params.metodo === 'markup_divisor') {
      // Markup Divisor / Margem por Dentro
      const indiceDivisor = Math.max(0.05, 1 - (somaDeducoes + params.margemLucroLiquidaPercent) / 100);
      const indiceMinimo = Math.max(0.05, 1 - somaDeducoes / 100);

      precoSugeridoBruto = custo / indiceDivisor;
      precoMinimoBruto = custo / indiceMinimo;
    } else {
      // Markup Multiplicador Simples
      precoSugeridoBruto = custo * (1 + params.markupMultiplicadorPercent / 100);
      precoMinimoBruto = custo * (1 + somaDeducoes / 100);
    }

    // Aplicação da regra de arredondamento comercial
    const aplicarArredondamento = (valor: number): number => {
      if (valor <= 0) return 0;
      switch (params.arredondamento) {
        case '0.10':
          return Math.round(valor * 10) / 10;
        case '0.50':
          return Math.round(valor * 2) / 2;
        case '0.90': {
          const base = Math.floor(valor);
          return valor - base < 0.45 ? Math.max(0.9, base - 0.1) : base + 0.9;
        }
        case '0.99': {
          const base = Math.floor(valor);
          return base + 0.99;
        }
        case '1.00':
          return Math.round(valor);
        default:
          return Math.round(valor * 100) / 100;
      }
    };

    const precoSugerido = aplicarArredondamento(precoSugeridoBruto);
    const precoMinimo = aplicarArredondamento(precoMinimoBruto);
    const precoTeto = Math.round(precoSugerido * 1.25 * 100) / 100;

    // Decomposição dos Valores em Reais (Waterfall no Preço Sugerido)
    const valorImpostos = (precoSugerido * params.impostosSaidaPercent) / 100;
    const valorComissao = (precoSugerido * params.comissaoPercent) / 100;
    const valorCustosFixos = (precoSugerido * params.custosFixosPercent) / 100;
    const valorTaxaCartao = (precoSugerido * params.taxaCartaoPercent) / 100;
    const totalDeducoes = valorImpostos + valorComissao + valorCustosFixos + valorTaxaCartao;

    const lucroLiquidoReal = precoSugerido - custo - totalDeducoes;
    const margemLiquidaEfetiva = precoSugerido > 0 ? (lucroLiquidoReal / precoSugerido) * 100 : 0;
    const markupEfetivo = custo > 0 ? ((precoSugerido - custo) / custo) * 100 : 0;

    return {
      custo,
      somaDeducoes,
      precoSugerido,
      precoMinimo,
      precoTeto,
      valorImpostos,
      valorComissao,
      valorCustosFixos,
      valorTaxaCartao,
      totalDeducoes,
      lucroLiquidoReal,
      margemLiquidaEfetiva,
      markupEfetivo,
    };
  }, [custoRealAquisicao, params]);

  // Notificar pai quando o preço calculado mudar
  React.useEffect(() => {
    if (onPrecoCalculadoChange) {
      onPrecoCalculadoChange(calculo.precoSugerido, calculo.margemLiquidaEfetiva, calculo.precoMinimo, params);
    }
  }, [calculo.precoSugerido, calculo.margemLiquidaEfetiva, calculo.precoMinimo, params, onPrecoCalculadoChange]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        fontSize: '12px',
      }}
    >
      {/* 1. SEÇÃO SUPERIOR: Título & Seletor de Metodologia */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          backgroundColor: 'var(--surface-2)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-md)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TrendingUp size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '13px' }}>
              Motor de Precificação & Formação de Custos
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
              Metodologia avançada de formação de custos e margem por dentro
            </div>
          </div>
        </div>

        {/* Segmented Control com Alto Contraste */}
        <div
          style={{
            display: 'inline-flex',
            backgroundColor: 'var(--surface-3)',
            border: '1px solid var(--border-default)',
            padding: '3px',
            borderRadius: '8px',
            gap: '2px',
          }}
        >
          <button
            type="button"
            onClick={() => updateParam('metodo', 'markup_divisor')}
            style={{
              padding: '6px 14px',
              fontSize: '11px',
              fontWeight: params.metodo === 'markup_divisor' ? 700 : 500,
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: params.metodo === 'markup_divisor' ? '#2563eb' : 'transparent',
              color: params.metodo === 'markup_divisor' ? '#ffffff' : 'var(--text-primary)',
              boxShadow: params.metodo === 'markup_divisor' ? '0 2px 4px rgba(37, 99, 235, 0.3)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            Markup Divisor (Margem Real)
          </button>
          <button
            type="button"
            onClick={() => updateParam('metodo', 'markup_multiplicador')}
            style={{
              padding: '6px 14px',
              fontSize: '11px',
              fontWeight: params.metodo === 'markup_multiplicador' ? 700 : 500,
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: params.metodo === 'markup_multiplicador' ? '#2563eb' : 'transparent',
              color: params.metodo === 'markup_multiplicador' ? '#ffffff' : 'var(--text-primary)',
              boxShadow: params.metodo === 'markup_multiplicador' ? '0 2px 4px rgba(37, 99, 235, 0.3)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            Multiplicador Direto
          </button>
        </div>
      </div>

      {/* 2. GRID DE PARÂMETROS COM LINHAS ESTRUTURADAS */}
      <div
        style={{
          padding: '14px 16px',
          backgroundColor: 'var(--surface-1)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {/* Linha 1: Deduções Variáveis & Custos Operacionais */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
            Deduções Incidentes sobre a Venda:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Impostos Venda (%)
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="40"
                value={params.impostosSaidaPercent}
                onChange={(e) => updateParam('impostosSaidaPercent', parseFloat(e.target.value) || 0)}
                className="coliseu-input"
                style={{ height: '34px', fontSize: '12px', textAlign: 'right', fontWeight: 600 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Comissão (%)
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="30"
                value={params.comissaoPercent}
                onChange={(e) => updateParam('comissaoPercent', parseFloat(e.target.value) || 0)}
                className="coliseu-input"
                style={{ height: '34px', fontSize: '12px', textAlign: 'right', fontWeight: 600 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Custos Fixos / Adm (%)
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="30"
                value={params.custosFixosPercent}
                onChange={(e) => updateParam('custosFixosPercent', parseFloat(e.target.value) || 0)}
                className="coliseu-input"
                style={{ height: '34px', fontSize: '12px', textAlign: 'right', fontWeight: 600 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Taxa Cartão / PIX (%)
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="15"
                value={params.taxaCartaoPercent}
                onChange={(e) => updateParam('taxaCartaoPercent', parseFloat(e.target.value) || 0)}
                className="coliseu-input"
                style={{ height: '34px', fontSize: '12px', textAlign: 'right', fontWeight: 600 }}
              />
            </div>
          </div>
        </div>

        {/* Linha 2: Meta de Lucro & Regra de Arredondamento */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#10b981', fontWeight: 700, marginBottom: '4px' }}>
                {params.metodo === 'markup_divisor' ? '🎯 Margem de Lucro Líquida Meta (%)' : '📈 Markup Multiplicador Direto (%)'}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  step="1"
                  min="1"
                  max="200"
                  value={
                    params.metodo === 'markup_divisor'
                      ? params.margemLucroLiquidaPercent
                      : params.markupMultiplicadorPercent
                  }
                  onChange={(e) =>
                    updateParam(
                      params.metodo === 'markup_divisor' ? 'margemLucroLiquidaPercent' : 'markupMultiplicadorPercent',
                      parseFloat(e.target.value) || 0
                    )
                  }
                  className="coliseu-input"
                  style={{
                    height: '34px',
                    fontSize: '13px',
                    textAlign: 'right',
                    fontWeight: 700,
                    color: '#10b981',
                    borderColor: 'rgba(16, 185, 129, 0.5)',
                    backgroundColor: 'rgba(16, 185, 129, 0.04)',
                    paddingRight: '28px',
                  }}
                />
                <span style={{ position: 'absolute', right: '10px', top: '9px', color: '#10b981', fontWeight: 700 }}>%</span>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Regra de Arredondamento Comercial
              </label>
              <select
                value={params.arredondamento}
                onChange={(e) => updateParam('arredondamento', e.target.value)}
                className="coliseu-input"
                style={{ height: '34px', fontSize: '12px', fontWeight: 500 }}
              >
                <option value="exato">Exato (Centavos Naturais)</option>
                <option value="0.10">R$ 0,10 mais próximo</option>
                <option value="0.50">R$ 0,50 mais próximo</option>
                <option value="0.90">Final R$ X,90 (Comercial Padrão)</option>
                <option value="0.99">Final R$ X,99 (Psicológico Varejo)</option>
                <option value="1.00">R$ 1,00 Inteiro</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 3. SEÇÃO PRINCIPAL: WATERFALL + 3 NÍVEIS DE PREÇO */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: compacto ? '1fr' : '1.2fr 1fr',
          gap: '14px',
          alignItems: 'stretch',
        }}
      >
        {/* Lado Esquerdo: Decomposição do Preço em Reais */}
        <div
          style={{
            backgroundColor: 'var(--surface-1)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Decomposição do Preço de Venda
              </span>
              <span style={{ fontSize: '13px', fontWeight: 800, fontFamily: 'monospace', color: '#10b981' }}>
                {formatCurrency(calculo.precoSugerido)}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {/* Custo de Aquisição */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>📦 Custo Real de Aquisição:</span>
                <span style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                  {formatCurrency(calculo.custo)} ({calculo.precoSugerido > 0 ? Math.round((calculo.custo / calculo.precoSugerido) * 100) : 0}%)
                </span>
              </div>

              {/* Impostos */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
                <span style={{ color: 'var(--text-muted)' }}>🏛️ Impostos sobre Venda ({params.impostosSaidaPercent}%):</span>
                <span style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                  {formatCurrency(calculo.valorImpostos)}
                </span>
              </div>

              {/* Comissão */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
                <span style={{ color: 'var(--text-muted)' }}>🤝 Comissão de Vendas / MKP ({params.comissaoPercent}%):</span>
                <span style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                  {formatCurrency(calculo.valorComissao)}
                </span>
              </div>

              {/* Custos Fixos & Taxa */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
                <span style={{ color: 'var(--text-muted)' }}>🏢 Custos Fixos & Cartão ({params.custosFixosPercent + params.taxaCartaoPercent}%):</span>
                <span style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                  {formatCurrency(calculo.valorCustosFixos + calculo.valorTaxaCartao)}
                </span>
              </div>

              {/* Barra Visual de Composição Segmentada */}
              <div
                style={{
                  height: '10px',
                  borderRadius: '5px',
                  backgroundColor: '#374151',
                  display: 'flex',
                  overflow: 'hidden',
                  marginTop: '8px',
                  marginBottom: '8px',
                }}
              >
                <div
                  title="Custo Mercadoria"
                  style={{
                    width: `${Math.min(100, calculo.precoSugerido > 0 ? (calculo.custo / calculo.precoSugerido) * 100 : 0)}%`,
                    backgroundColor: '#3b82f6',
                  }}
                />
                <div
                  title="Impostos & Deduções"
                  style={{
                    width: `${Math.min(100, calculo.precoSugerido > 0 ? (calculo.totalDeducoes / calculo.precoSugerido) * 100 : 0)}%`,
                    backgroundColor: '#f59e0b',
                  }}
                />
                <div
                  title="Lucro Líquido"
                  style={{
                    width: `${Math.max(0, Math.min(100, calculo.precoSugerido > 0 ? (calculo.lucroLiquidoReal / calculo.precoSugerido) * 100 : 0))}%`,
                    backgroundColor: '#10b981',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Lucro Líquido Efetivo no Bolso */}
          <div
            style={{
              marginTop: '10px',
              padding: '8px 10px',
              backgroundColor: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12px',
            }}
          >
            <span style={{ fontWeight: 700, color: '#10b981' }}>💰 Lucro Líquido Efetivo:</span>
            <span style={{ fontWeight: 800, fontFamily: 'monospace', color: '#10b981', fontSize: '13px' }}>
              {formatCurrency(calculo.lucroLiquidoReal)} ({calculo.margemLiquidaEfetiva.toFixed(1)}%)
            </span>
          </div>
        </div>

        {/* Lado Direito: Três Camadas de Preço */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '10px',
          }}
        >
          {/* Preço Piso Mínimo */}
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: 'rgba(239, 68, 68, 0.06)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                🛑 PREÇO MÍNIMO (Piso):
              </span>
              <span style={{ fontSize: '14px', fontWeight: 800, color: '#ef4444', fontFamily: 'monospace' }}>
                {formatCurrency(calculo.precoMinimo)}
              </span>
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Margem 0% (bloqueia descontos que gerem prejuízo)
            </div>
          </div>

          {/* Preço Sugerido (Ideal Meta) */}
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              border: '2px solid #10b981',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.15)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                ⭐ PREÇO SUGERIDO (Meta):
              </span>
              <span style={{ fontSize: '18px', fontWeight: 900, color: '#10b981', fontFamily: 'monospace' }}>
                {formatCurrency(calculo.precoSugerido)}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', fontWeight: 500 }}>
              Markup sobre custo: <strong>+{calculo.markupEfetivo.toFixed(1)}%</strong> | Margem: <strong>{calculo.margemLiquidaEfetiva.toFixed(1)}%</strong>
            </div>
          </div>

          {/* Preço Teto Concorrência */}
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: 'rgba(59, 130, 246, 0.06)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: '#3b82f6', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                📈 PREÇO TETO / BALCÃO:
              </span>
              <span style={{ fontSize: '14px', fontWeight: 800, color: '#3b82f6', fontFamily: 'monospace' }}>
                {formatCurrency(calculo.precoTeto)}
              </span>
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Margem expandida para negociações e balcão
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
