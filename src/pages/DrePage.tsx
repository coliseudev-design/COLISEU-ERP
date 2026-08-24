import React, { useState, useEffect } from 'react';
import {
  PieChart,
  Calendar,
  CheckCircle,
  RefreshCw,
  FileSpreadsheet,
  ArrowUpRight,
  Percent,
} from 'lucide-react';
import { financeService, DreGerencialReport } from '../lib/finance';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { KPICard } from '../components/ui/KPICard';
import { formatCurrency, formatPercent } from '../lib/formatters';

export const DrePage: React.FC = () => {
  const [dataInicio, setDataInicio] = useState('2026-08-01');
  const [dataFim, setDataFim] = useState('2026-08-31');
  const [report, setReport] = useState<DreGerencialReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleCarregarDre = async () => {
    setLoading(true);
    try {
      const res = await financeService.gerarDreGerencial('fil1', dataInicio, dataFim);
      setReport(res);
      showToast('✅ DRE Gerencial apurado com sucesso!');
    } catch (err: any) {
      showToast(`❌ Erro ao apurar DRE: ${err?.message || 'Falha IPC'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleCarregarDre();
  }, []);

  return (
    <div className="coliseu-page">
      {toastMessage && (
        <div className="coliseu-toast-container">
          <div className={`coliseu-toast coliseu-toast--${toastMessage.includes('❌') ? 'danger' : 'success'}`}>
            <CheckCircle style={{ width: '1.25rem', height: '1.25rem' }} />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Header com Filtro de Período */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <PageHeader
          title="DRE Gerencial (Demonstrativo do Resultado)"
          subtitle="Apuração contábil em tempo real de Receitas, CMV, Margem Bruta e Resultado Líquido (EBITDA)"
          icon={<PieChart style={{ color: 'var(--action-primary)', width: '1.5rem', height: '1.5rem' }} />}
        />

        <div className="coliseu-card" style={{ padding: '0.5rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
            <Calendar style={{ width: '1rem', height: '1rem', color: 'var(--action-primary)' }} />
            <span>Período:</span>
          </div>
          <Input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
          />
          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>até</span>
          <Input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
          />
          <Button
            onClick={handleCarregarDre}
            disabled={loading}
            style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
          >
            <RefreshCw style={{ width: '0.875rem', height: '0.875rem' }} />
            Recalcular
          </Button>
        </div>
      </div>

      {report && (
        <>
          {/* Top KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
            <KPICard
              title="Receita Bruta Vendas"
              value={formatCurrency(report.receita_bruta)}
              change="100% da Receita Operacional"
              changeType="positive"
            />

            <KPICard
              title="Custo Mercadorias (CMV)"
              value={formatCurrency(report.custo_mercadorias_vendidas_cmv)}
              change={`${formatPercent((report.custo_mercadorias_vendidas_cmv / (report.receita_bruta || 1)) * 100)} da Receita`}
              changeType="neutral"
            />

            <KPICard
              title="Lucro Bruto"
              value={formatCurrency(report.lucro_bruto)}
              change={`Margem Bruta: ${formatPercent(report.margem_bruta_percentual)}`}
              changeType="positive"
            />

            <KPICard
              title="Resultado Líquido (EBITDA)"
              value={formatCurrency(report.lucro_liquido_ebitda)}
              change={`Margem Líquida: ${formatPercent(report.margem_liquida_percentual)}`}
              changeType="positive"
            />
          </div>

          {/* Tabela Estruturada de DRE */}
          <div className="coliseu-card">
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileSpreadsheet style={{ width: '1.25rem', height: '1.25rem', color: 'var(--action-primary)' }} />
              Demonstração Estruturada do Resultado
            </h2>

            <div className="coliseu-table-container">
              <table className="coliseu-table">
                <thead>
                  <tr>
                    <th>Conta</th>
                    <th>Descrição da Operação</th>
                    <th style={{ textAlign: 'right' }}>Valor (R$)</th>
                    <th style={{ textAlign: 'right' }}>% Receita</th>
                  </tr>
                </thead>
                <tbody>
                  {report.detalhamento_linhas.map((row) => {
                    const isTotal = row.codigo_conta.startsWith('(=)');
                    return (
                      <tr
                        key={row.codigo_conta}
                        style={{
                          fontWeight: isTotal ? 700 : 400,
                          color: isTotal ? 'var(--text-primary)' : 'var(--text-secondary)',
                          backgroundColor: isTotal ? 'var(--surface-1)' : 'transparent',
                        }}
                      >
                        <td style={{ color: 'var(--text-secondary)' }}>{row.codigo_conta}</td>
                        <td style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>{row.descricao}</td>
                        <td
                          className="tabular-nums"
                          style={{
                            textAlign: 'right',
                            color: row.valor < 0 ? 'var(--status-danger)' : 'var(--status-success)',
                          }}
                        >
                          {formatCurrency(row.valor)}
                        </td>
                        <td className="tabular-nums" style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                          {formatPercent(row.percentual_sobre_receita)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
