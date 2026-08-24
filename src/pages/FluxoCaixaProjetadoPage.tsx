import React, { useState, useMemo, useEffect } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { formatCurrency } from '../lib/formatters';
import {
  TrendingUp,
  Sliders,
  Printer,
  Calendar,
  DollarSign,
  ShieldCheck,
  AlertTriangle,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import {
  calcularProjecaoCaixa,
  getConfigProjecao,
} from '../lib/fluxoCaixaProjetado';
import { ModalSimuladorCenariosCaixa } from '../components/financeiro/ModalSimuladorCenariosCaixa';
import { ModalRelatorioFluxoCaixa } from '../components/financeiro/ModalRelatorioFluxoCaixa';

export const FluxoCaixaProjetadoPage: React.FC = () => {
  const [isModalSimuladorOpen, setIsModalSimuladorOpen] = useState(false);
  const [isModalRelatorioOpen, setIsModalRelatorioOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [dados, setDados] = useState(calcularProjecaoCaixa);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    const handleUpdate = () => {
      setDados(calcularProjecaoCaixa());
    };
    window.addEventListener('coliseu_config_fluxo_updated', handleUpdate);
    return () => window.removeEventListener('coliseu_config_fluxo_updated', handleUpdate);
  }, []);

  return (
    <div className="coliseu-page" style={{ minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {toastMessage && (
        <div className="coliseu-toast-container">
          <div className="coliseu-toast coliseu-toast--success">
            <CheckCircle2 size={18} color="#10b981" />
            <span style={{ fontSize: '12px', fontWeight: 600 }}>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <PageHeader
        title="Fluxo de Caixa Projetado a 30/60/90 Dias & Análise de Solvência"
        description="Previsão trimestral de entradas e saídas, índices de liquidez corrente/seca, cash runway e testes de estresse."
        breadcrumbItems={[
          { label: 'Financeiro', active: false },
          { label: 'Fluxo de Caixa Projetado', active: true },
        ]}
      >
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            variant="secondary"
            onClick={() => setIsModalSimuladorOpen(true)}
            style={{ display: 'inline-flex', gap: '6px', fontSize: '12px' }}
          >
            <Sliders size={15} /> Premissas & Stress Test
          </Button>

          <Button
            variant="primary"
            onClick={() => setIsModalRelatorioOpen(true)}
            style={{ display: 'inline-flex', gap: '6px', fontSize: '12px' }}
          >
            <Printer size={15} /> Relatório Executivo (A4)
          </Button>
        </div>
      </PageHeader>

      {/* Cards dos 4 Marcos Financeiros */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '14px',
          marginBottom: '16px',
        }}
      >
        <div className="coliseu-card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Saldo Disponível Imediato</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#3b82f6', fontFamily: 'monospace', margin: '4px 0' }}>
            {formatCurrency(dados.indicadores.saldoDisponivelImediato)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Caixas + Contas Bancárias</div>
        </div>

        <div className="coliseu-card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Saldo Projetado em 30 Dias</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#10b981', fontFamily: 'monospace', margin: '4px 0' }}>
            {formatCurrency(dados.periodos[0].saldoAcumuladoProjetado)}
          </div>
          <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>
            + {formatCurrency(dados.periodos[0].saldoPeriodo)} no mês
          </div>
        </div>

        <div className="coliseu-card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Saldo Projetado em 60 Dias</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#10b981', fontFamily: 'monospace', margin: '4px 0' }}>
            {formatCurrency(dados.periodos[1].saldoAcumuladoProjetado)}
          </div>
          <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>
            + {formatCurrency(dados.periodos[1].saldoPeriodo)} no 2º mês
          </div>
        </div>

        <div className="coliseu-card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Saldo Projetado em 90 Dias</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#10b981', fontFamily: 'monospace', margin: '4px 0' }}>
            {formatCurrency(dados.periodos[2].saldoAcumuladoProjetado)}
          </div>
          <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>
            + {formatCurrency(dados.periodos[2].saldoPeriodo)} no 3º mês
          </div>
        </div>
      </div>

      {/* Painel de Indicadores de Solvência & Liquidez */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '14px',
          marginBottom: '16px',
        }}
      >
        <div className="coliseu-card" style={{ padding: '14px', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Índice de Liquidez Corrente</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#10b981', margin: '4px 0' }}>
            {dados.indicadores.indiceLiquidezCorrente}x
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Ativo Circ. / Passivo Circ. (Ideal &gt; 1.2)</div>
        </div>

        <div className="coliseu-card" style={{ padding: '14px', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Índice de Liquidez Seca</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#3b82f6', margin: '4px 0' }}>
            {dados.indicadores.indiceLiquidezSeca}x
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Sem depender da venda do estoque</div>
        </div>

        <div className="coliseu-card" style={{ padding: '14px', borderLeft: '4px solid #f97316' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Burn Rate Médio Diário</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace', margin: '4px 0' }}>
            {formatCurrency(dados.indicadores.burnRateDiarioMedio)}/dia
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Desembolso diário projetado</div>
        </div>

        <div className="coliseu-card" style={{ padding: '14px', borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Cash Runway (Sobrevivência)</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#8b5cf6', margin: '4px 0' }}>
            {dados.indicadores.diasDeCaixaRunway} dias
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Tempo de caixa sem novas vendas</div>
        </div>
      </div>

      {/* Gráfico Visual da Curva de Caixa em 12 Semanas */}
      <div className="coliseu-card" style={{ padding: '20px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Activity size={16} color="#3b82f6" /> Curva de Evolução Semanal do Saldo Acumulado (12 Semanas)
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Semana 1 (18/08) até Semana 12 (16/11)
          </div>
        </div>

        {/* Barras Semanais */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '8px', alignItems: 'flex-end', height: '140px', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
          {dados.semanas.map((s, idx) => {
            const heightPercent = Math.round((s.saldoFinalAcumulado / 240000) * 100);

            return (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: '4px' }}>
                <div style={{ fontSize: '9px', fontWeight: 700, color: '#10b981' }}>
                  {(s.saldoFinalAcumulado / 1000).toFixed(0)}k
                </div>
                <div
                  style={{
                    width: '100%',
                    maxWidth: '32px',
                    height: `${heightPercent}%`,
                    backgroundColor: 'rgba(59, 130, 246, 0.7)',
                    borderRadius: '4px 4px 0 0',
                    border: '1px solid #3b82f6',
                  }}
                  title={`${s.semana}: Saldo Final ${formatCurrency(s.saldoFinalAcumulado)}`}
                />
                <div style={{ fontSize: '9px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {s.dataInicio}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabela Analítica Semanal */}
      <div className="coliseu-card">
        <div className="coliseu-table-container">
          <table className="coliseu-table" style={{ fontSize: '12px' }}>
            <thead>
              <tr>
                <th style={{ width: '100px' }}>Semana</th>
                <th style={{ width: '130px' }}>Período</th>
                <th style={{ width: '130px', textAlign: 'right' }}>Entradas Previstas</th>
                <th style={{ width: '130px', textAlign: 'right' }}>Saídas Previstas</th>
                <th style={{ width: '130px', textAlign: 'right' }}>Resultado Semanal</th>
                <th style={{ width: '140px', textAlign: 'right' }}>Saldo Acumulado</th>
                <th style={{ width: '120px', textAlign: 'center' }}>Solvência</th>
              </tr>
            </thead>
            <tbody>
              {dados.semanas.map((s, idx) => (
                <tr key={idx}>
                  <td style={{ fontWeight: 700, color: 'var(--text-link)', fontSize: '11px' }}>
                    {s.semana}
                  </td>
                  <td>
                    {s.dataInicio} até {s.dataFim}
                  </td>
                  <td style={{ textAlign: 'right', color: '#10b981', fontWeight: 600, fontFamily: 'monospace' }}>
                    + {formatCurrency(s.recebimentos)}
                  </td>
                  <td style={{ textAlign: 'right', color: '#ef4444', fontFamily: 'monospace' }}>
                    - {formatCurrency(s.pagamentos)}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: s.saldoSemanal >= 0 ? '#10b981' : '#ef4444', fontFamily: 'monospace' }}>
                    {formatCurrency(s.saldoSemanal)}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 800, color: '#3b82f6', fontFamily: 'monospace' }}>
                    {formatCurrency(s.saldoFinalAcumulado)}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(16, 185, 129, 0.15)',
                        color: '#10b981',
                      }}
                    >
                      SOLVENTE
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Simulador de Premissas */}
      {isModalSimuladorOpen && (
        <ModalSimuladorCenariosCaixa
          isOpen={isModalSimuladorOpen}
          onClose={() => setIsModalSimuladorOpen(false)}
          onSuccess={() => {
            showToast('✅ Premissas de projeção recalculadas com sucesso!');
          }}
        />
      )}

      {/* Modal Relatório Executivo */}
      {isModalRelatorioOpen && (
        <ModalRelatorioFluxoCaixa
          isOpen={isModalRelatorioOpen}
          onClose={() => setIsModalRelatorioOpen(false)}
        />
      )}
    </div>
  );
};
