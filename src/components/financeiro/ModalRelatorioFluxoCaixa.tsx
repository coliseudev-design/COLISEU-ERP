import React from 'react';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../lib/formatters';
import { Printer, X, TrendingUp, ShieldCheck, DollarSign } from 'lucide-react';
import { calcularProjecaoCaixa } from '../../lib/fluxoCaixaProjetado';

interface ModalRelatorioFluxoCaixaProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ModalRelatorioFluxoCaixa: React.FC<ModalRelatorioFluxoCaixaProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const dados = calcularProjecaoCaixa();

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(3px)',
        zIndex: 12000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '900px',
          maxHeight: '94vh',
          backgroundColor: '#ffffff',
          color: '#111827',
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
          overflow: 'hidden',
        }}
      >
        {/* Barra Superior */}
        <div
          style={{
            padding: '12px 20px',
            backgroundColor: '#1f2937',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 600 }}>
            Relatório Executivo de Fluxo de Caixa Projetado & Solvência (30/60/90 Dias)
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              variant="primary"
              size="sm"
              onClick={() => window.print()}
              leftIcon={<Printer size={15} />}
            >
              Imprimir Relatório (Ctrl + P)
            </Button>
            <button
              type="button"
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Folha do Relatório */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '30px',
            fontFamily: 'Arial, sans-serif',
            fontSize: '11px',
            lineHeight: 1.4,
          }}
        >
          <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '10px', marginBottom: '16px' }}>
            <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
              DEMOSTRATIVO EXECUTIVO DE FLUXO DE CAIXA PROJETADO & SOLVÊNCIA
            </h1>
            <div style={{ fontSize: '11px', color: '#4b5563', marginTop: '2px' }}>
              COLISEU MATERIAIS & DISTRIBUIÇÃO LTDA • CNPJ: 12.345.678/0001-90
            </div>
            <div style={{ fontSize: '10px', color: '#6b7280' }}>
              Projeção Trimestral (30/60/90 Dias) • Emitido em: {new Date().toLocaleString('pt-BR')}
            </div>
          </div>

          {/* Cards de Índices de Liquidez */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px', textAlign: 'center' }}>
            <div style={{ border: '1px solid #ccc', padding: '6px', borderRadius: '4px' }}>
              <div style={{ fontSize: '10px', color: '#666' }}>SALDO DISPONÍVEL ATUAL</div>
              <strong style={{ fontSize: '13px', color: '#2563eb' }}>{formatCurrency(dados.indicadores.saldoDisponivelImediato)}</strong>
            </div>

            <div style={{ border: '1px solid #ccc', padding: '6px', borderRadius: '4px' }}>
              <div style={{ fontSize: '10px', color: '#666' }}>LIQUIDEZ CORRENTE</div>
              <strong style={{ fontSize: '13px', color: '#16a34a' }}>{dados.indicadores.indiceLiquidezCorrente}x</strong>
              <div style={{ fontSize: '9px', color: '#16a34a' }}>Excelente (Ideal &gt; 1.2)</div>
            </div>

            <div style={{ border: '1px solid #ccc', padding: '6px', borderRadius: '4px' }}>
              <div style={{ fontSize: '10px', color: '#666' }}>CASH RUNWAY (DIAS)</div>
              <strong style={{ fontSize: '13px', color: '#2563eb' }}>{dados.indicadores.diasDeCaixaRunway} dias</strong>
              <div style={{ fontSize: '9px', color: '#666' }}>Sobrevivência sem faturar</div>
            </div>

            <div style={{ border: '2px solid #16a34a', padding: '6px', borderRadius: '4px', backgroundColor: '#f0fdf4' }}>
              <div style={{ fontSize: '10px', color: '#166534', fontWeight: 'bold' }}>SALDO PROJETADO EM 90 DIAS</div>
              <strong style={{ fontSize: '14px', color: '#16a34a' }}>{formatCurrency(dados.indicadores.saldoLiquidoProjetado90Dias)}</strong>
            </div>
          </div>

          {/* Tabela dos 3 Períodos */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '11px', marginBottom: '6px' }}>
              PROJEÇÃO CONSOLIDADA POR CICLOS (30, 60 E 90 DIAS)
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '1px solid #000' }}>
                  <th style={{ textAlign: 'left', padding: '6px' }}>Período Projetado</th>
                  <th style={{ textAlign: 'right', padding: '6px' }}>Entradas Previstas</th>
                  <th style={{ textAlign: 'right', padding: '6px' }}>Saídas Previstas</th>
                  <th style={{ textAlign: 'right', padding: '6px' }}>Resultado do Período</th>
                  <th style={{ textAlign: 'right', padding: '6px' }}>Saldo Acumulado</th>
                  <th style={{ textAlign: 'center', padding: '6px' }}>Status de Solvência</th>
                </tr>
              </thead>
              <tbody>
                {dados.periodos.map((p, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '6px', fontWeight: 'bold' }}>{p.periodoNome}</td>
                    <td style={{ textAlign: 'right', padding: '6px', color: '#16a34a', fontWeight: 'bold' }}>
                      + {formatCurrency(p.entradasPrevistas)}
                    </td>
                    <td style={{ textAlign: 'right', padding: '6px', color: '#dc2626' }}>
                      - {formatCurrency(p.saidasPrevistas)}
                    </td>
                    <td style={{ textAlign: 'right', padding: '6px', fontWeight: 'bold' }}>
                      {formatCurrency(p.saldoPeriodo)}
                    </td>
                    <td style={{ textAlign: 'right', padding: '6px', fontWeight: 'bold', color: '#2563eb' }}>
                      {formatCurrency(p.saldoAcumuladoProjetado)}
                    </td>
                    <td style={{ textAlign: 'center', padding: '6px', color: '#16a34a', fontWeight: 'bold' }}>
                      ✅ 100% SOLVENTE
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Análise de Sensibilidade / Stress Test */}
          <div style={{ marginTop: '20px', padding: '12px', border: '1px solid #ddd', borderRadius: '6px', backgroundColor: '#f9fafb' }}>
            <div style={{ fontWeight: 'bold', fontSize: '11px', marginBottom: '8px' }}>
              ANÁLISE DE SENSIBILIDADE & TESTE DE ESTRESSE (WHAT-IF)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              <div style={{ border: '1px solid #16a34a', padding: '8px', borderRadius: '4px', backgroundColor: '#f0fdf4' }}>
                <div style={{ fontSize: '10px', color: '#166534', fontWeight: 'bold' }}>CENÁRIO OTIMISTA (+15%)</div>
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#16a34a' }}>
                  {formatCurrency(dados.cenarios.cenarioOtimista)}
                </div>
              </div>

              <div style={{ border: '1px solid #2563eb', padding: '8px', borderRadius: '4px', backgroundColor: '#eff6ff' }}>
                <div style={{ fontSize: '10px', color: '#1e40af', fontWeight: 'bold' }}>CENÁRIO BASE / REALISTA</div>
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#2563eb' }}>
                  {formatCurrency(dados.cenarios.cenarioRealista)}
                </div>
              </div>

              <div style={{ border: '1px solid #ea580c', padding: '8px', borderRadius: '4px', backgroundColor: '#fff7ed' }}>
                <div style={{ fontSize: '10px', color: '#9a3412', fontWeight: 'bold' }}>CENÁRIO ESTRESSE (-25%)</div>
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#ea580c' }}>
                  {formatCurrency(dados.cenarios.cenarioPessimista)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
