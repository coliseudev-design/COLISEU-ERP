import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';
import { condicionalService, MovimentoFichaFinanceira } from '../lib/condicional';
import { PageHeader } from '../components/ui/PageHeader';
import { KPICard } from '../components/ui/KPICard';
import { formatCurrency, formatDate } from '../lib/formatters';

export const FichaClientePage: React.FC = () => {
  const [clienteId, setClienteId] = useState('cli1');
  const [movimentos, setMovimentos] = useState<MovimentoFichaFinanceira[]>([]);
  const [limiteCredito, setLimiteCredito] = useState(5000.0);
  const [loading, setLoading] = useState(false);

  const carregarFicha = async () => {
    setLoading(true);
    try {
      const list = await condicionalService.consultarFichaFinanceira(clienteId);
      setMovimentos(list);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarFicha();
  }, [clienteId]);

  const totalDebito = movimentos
    .filter((m) => m.tipo_movimento === 'DEBITO')
    .reduce((acc, m) => acc + m.valor, 0);

  const totalCredito = movimentos
    .filter((m) => m.tipo_movimento === 'CREDITO')
    .reduce((acc, m) => acc + m.valor, 0);

  const saldoDevedorLiquido = totalDebito - totalCredito;
  const limiteDisponivel = limiteCredito - (saldoDevedorLiquido > 0 ? saldoDevedorLiquido : 0);

  return (
    <div className="coliseu-page">
      <PageHeader
        title="Ficha Financeira do Cliente & Limite de Crédito"
        subtitle="Extrato detalhado de débitos de condicionais faturadas, créditos de vale-troca e limite disponível"
        icon={<UserCheck style={{ color: 'var(--status-success)', width: '1.5rem', height: '1.5rem' }} />}
      />

      {/* Cards de Resumo Financeiro */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', margin: '1.5rem 0' }}>
        <KPICard
          title="Limite de Crédito Total"
          value={formatCurrency(limiteCredito)}
          change="Aprovado no cadastro"
          changeType="neutral"
        />

        <KPICard
          title="Débitos Pendentes"
          value={formatCurrency(totalDebito)}
          change="Condicionais a faturar"
          changeType="negative"
        />

        <KPICard
          title="Créditos / Vale-Troca"
          value={formatCurrency(totalCredito)}
          change="Saldo a favor do cliente"
          changeType="positive"
        />

        <KPICard
          title="Limite Disponível"
          value={formatCurrency(limiteDisponivel)}
          change="Disponível para novas retiradas"
          changeType="positive"
        />
      </div>

      {/* Tabela de Extrato da Ficha Financeira */}
      <div className="coliseu-card">
        <h2 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Clock style={{ width: '1rem', height: '1rem', color: 'var(--status-success)' }} />
          Extrato de Movimentações na Ficha do Cliente
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {movimentos.map((m) => (
            <div
              key={m.id}
              style={{
                backgroundColor: 'var(--surface-1)',
                border: '1px solid var(--border-default)',
                borderRadius: '0.75rem',
                padding: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {m.tipo_movimento === 'DEBITO' ? (
                  <div style={{ width: '2rem', height: '2rem', borderRadius: '0.5rem', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: 'var(--status-danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                    <ArrowUpRight style={{ width: '1rem', height: '1rem' }} />
                  </div>
                ) : (
                  <div style={{ width: '2rem', height: '2rem', borderRadius: '0.5rem', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--status-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                    <ArrowDownLeft style={{ width: '1rem', height: '1rem' }} />
                  </div>
                )}
                <div>
                  <h3 style={{ color: 'var(--text-primary)', fontWeight: 700, margin: 0 }}>{m.historico}</h3>
                  <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }} className="tabular-nums">
                    Origem: {m.origem} | Data: {formatDate(m.created_at)}
                  </span>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span
                  className="tabular-nums"
                  style={{
                    fontWeight: 700,
                    display: 'block',
                    fontSize: '0.875rem',
                    color: m.tipo_movimento === 'DEBITO' ? 'var(--status-danger)' : 'var(--status-success)',
                  }}
                >
                  {m.tipo_movimento === 'DEBITO' ? '-' : '+'} {formatCurrency(m.valor)}
                </span>
                <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>{m.tipo_movimento}</span>
              </div>
            </div>
          ))}

          {movimentos.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2.5rem 0', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
              Nenhuma movimentação registrada na ficha deste cliente.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
