import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Calendar,
  CheckCircle,
  RefreshCw,
  Boxes,
  Award,
} from 'lucide-react';
import { reportsService, CurvaAbcReport, RelatorioGiroEstoqueReport } from '../lib/reports';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { KPICard } from '../components/ui/KPICard';
import { Badge } from '../components/ui/Badge';

export const ReportsPage: React.FC = () => {
  const [dataInicio, setDataInicio] = useState('2026-08-01');
  const [dataFim, setDataFim] = useState('2026-08-31');
  const [abcReport, setAbcReport] = useState<CurvaAbcReport | null>(null);
  const [giroReport, setGiroReport] = useState<RelatorioGiroEstoqueReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleCarregarRelatorios = async () => {
    setLoading(true);
    try {
      const [abc, giro] = await Promise.all([
        reportsService.gerarCurvaAbcProdutos('fil1', dataInicio, dataFim),
        reportsService.gerarRelatorioGiroEstoque('fil1', 30),
      ]);
      setAbcReport(abc);
      setGiroReport(giro);
      showToast('✅ Curva ABC e Relatórios Gerenciais atualizados!');
    } catch (err: any) {
      showToast(`❌ Erro ao apurar relatórios: ${err?.message || 'Falha IPC'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleCarregarRelatorios();
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
          title="Curva ABC & Relatórios Gerenciais (Pareto 80/20)"
          subtitle="Classificação estratégica de estoque (Classes A/B/C) e indicadores de giro e cobertura em dias"
          icon={<BarChart3 style={{ color: 'var(--status-success)', width: '1.5rem', height: '1.5rem' }} />}
        />

        <div className="coliseu-card" style={{ padding: '0.5rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
            <Calendar style={{ width: '1rem', height: '1rem', color: 'var(--status-success)' }} />
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
            onClick={handleCarregarRelatorios}
            disabled={loading}
            style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
          >
            <RefreshCw style={{ width: '0.875rem', height: '0.875rem' }} />
            Processar
          </Button>
        </div>
      </div>

      {abcReport && (
        <>
          {/* Dashboard Cards da Curva ABC */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
            <KPICard
              title="Faturamento Total do Período"
              value={`R$ ${(abcReport.faturamento_total_periodo || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              change={`${abcReport.total_produtos_analisados || 0} produtos analisados`}
              changeType="neutral"
            />

            <KPICard
              title="Classe A (Primeiros 80%)"
              value={`${abcReport.total_classe_a || 0} Itens`}
              change="Alta relevância estratégica (80% receita)"
              changeType="positive"
            />

            <KPICard
              title="Classe B (Próximos 15%)"
              value={`${abcReport.total_classe_b || 0} Itens`}
              change="Médio impacto financeiro (15% receita)"
              changeType="neutral"
            />

            <KPICard
              title="Classe C (Últimos 5%)"
              value={`${abcReport.total_classe_c || 0} Itens`}
              change="Cauda longa de produtos (5% receita)"
              changeType="neutral"
            />
          </div>

          {/* Tabela de Classificação Curva ABC */}
          <div className="coliseu-card" style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Award style={{ width: '1.25rem', height: '1.25rem', color: 'var(--status-warning)' }} />
              Ranking de Produtos pela Curva ABC
            </h2>

            <div className="coliseu-table-container">
              <table className="coliseu-table">
                <thead>
                  <tr>
                    <th>Classe</th>
                    <th>SKU</th>
                    <th>Descrição do Produto</th>
                    <th style={{ textAlign: 'right' }}>Faturamento Total</th>
                    <th style={{ textAlign: 'right' }}>% Relativo</th>
                    <th style={{ textAlign: 'right' }}>% Acumulado</th>
                  </tr>
                </thead>
                <tbody>
                  {(abcReport.itens || []).map((item) => (
                    <tr key={item.produto_id}>
                      <td>
                        <Badge variant={item.classe === 'A' ? 'success' : item.classe === 'B' ? 'info' : 'default'}>
                          Classe {item.classe}
                        </Badge>
                      </td>
                      <td style={{ color: 'var(--action-primary)', fontWeight: 700 }}>{item.codigo_sku}</td>
                      <td style={{ fontFamily: 'Inter, system-ui, sans-serif', color: 'var(--text-primary)' }}>{item.descricao}</td>
                      <td className="tabular-nums" style={{ textAlign: 'right', color: 'var(--status-success)', fontWeight: 700 }}>
                        R$ {(item.faturamento_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="tabular-nums" style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{(item.percentual_relativo || 0).toFixed(2)}%</td>
                      <td className="tabular-nums" style={{ textAlign: 'right', color: 'var(--text-muted)', fontWeight: 700 }}>{(item.percentual_acumulado || 0).toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Relatório de Giro de Estoque */}
      {giroReport && (
        <div className="coliseu-card">
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Boxes style={{ width: '1.25rem', height: '1.25rem', color: 'var(--action-primary)' }} />
            Análise de Giro de Estoque & Cobertura em Dias
          </h2>

          <div className="coliseu-table-container">
            <table className="coliseu-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Descrição</th>
                  <th style={{ textAlign: 'right' }}>Estoque Atual</th>
                  <th style={{ textAlign: 'right' }}>Vendas (30d)</th>
                  <th style={{ textAlign: 'right' }}>Giro Estoque</th>
                  <th style={{ textAlign: 'right' }}>Cobertura em Dias</th>
                </tr>
              </thead>
              <tbody>
                {giroReport.itens.map((g) => (
                  <tr key={g.produto_id}>
                    <td style={{ color: 'var(--action-primary)', fontWeight: 700 }}>{g.codigo_sku}</td>
                    <td style={{ fontFamily: 'Inter, system-ui, sans-serif', color: 'var(--text-primary)' }}>{g.descricao}</td>
                    <td className="tabular-nums" style={{ textAlign: 'right', color: 'var(--text-primary)', fontWeight: 700 }}>{g.estoque_atual} un</td>
                    <td className="tabular-nums" style={{ textAlign: 'right', color: 'var(--status-success)' }}>{g.quantidade_vendida_periodo} un</td>
                    <td className="tabular-nums" style={{ textAlign: 'right', color: 'var(--status-warning)', fontWeight: 700 }}>{g.giro_estoque}×</td>
                    <td className="tabular-nums" style={{ textAlign: 'right', color: 'var(--action-primary)' }}>{g.cobertura_dias} dias</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
