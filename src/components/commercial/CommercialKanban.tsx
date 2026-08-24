import React, { useState } from 'react';
import { Plus, DollarSign, Calendar, AlertCircle, Sparkles, Building2, User, Check, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { parseNumber } from '../../lib/formatters';

interface Opportunity {
  id: string;
  cliente: string;
  contato: string;
  valor: number;
  probabilidade: number;
  estagio: 'PROSPECCAO' | 'QUALIFICACAO' | 'PROPOSTA' | 'NEGOCIACAO' | 'FECHADO_GANHO';
  dataPrevisao: string;
  iaScore: number;
  iaInsight: string;
}

export const CommercialKanban: React.FC = () => {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([
    {
      id: 'OPP-101',
      cliente: 'OFICINA E FUNILARIA DOURADOS',
      contato: 'Marcos Silva',
      valor: 24500.0,
      probabilidade: 80,
      estagio: 'NEGOCIACAO',
      dataPrevisao: '2026-08-20',
      iaScore: 88,
      iaInsight: 'Cliente com alto histórico de recompras. Alta probabilidade de fechar este mês.',
    },
    {
      id: 'OPP-102',
      cliente: 'FROTA LOGÍSTICA PANTANAL',
      contato: 'Roberto Lima',
      valor: 68000.0,
      probabilidade: 60,
      estagio: 'PROPOSTA',
      dataPrevisao: '2026-08-28',
      iaScore: 72,
      iaInsight: 'Proposta enviada. Recomendado contato via WhatsApp oferecendo 5% de desconto no PIX.',
    },
    {
      id: 'OPP-103',
      cliente: 'AUTO CENTER CENTRO-OESTE',
      contato: 'Carlos Eduardo',
      valor: 12300.0,
      probabilidade: 40,
      estagio: 'QUALIFICACAO',
      dataPrevisao: '2026-09-05',
      iaScore: 54,
      iaInsight: 'Aguardando validação de limite de crédito pelo financeiro.',
    },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State
  const [cliente, setCliente] = useState('');
  const [contato, setContato] = useState('');
  const [valor, setValor] = useState(15000.0);
  const [estagio, setEstagio] = useState<'PROSPECCAO' | 'QUALIFICACAO' | 'PROPOSTA' | 'NEGOCIACAO' | 'FECHADO_GANHO'>('PROSPECCAO');

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
      }
    };
    if (isModalOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleSalvarOportunidade = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cliente) return;

    const newOpp: Opportunity = {
      id: `OPP-${Date.now().toString().slice(-3)}`,
      cliente,
      contato: contato || 'Responsável Comercial',
      valor,
      probabilidade: 50,
      estagio,
      dataPrevisao: '2026-08-30',
      iaScore: 75,
      iaInsight: 'Nova oportunidade cadastrada no funil de vendas.',
    };

    setOpportunities((prev) => [newOpp, ...prev]);
    setIsModalOpen(false);
    setCliente('');
    setContato('');
    showToast(`✅ Oportunidade para ${cliente} criada no pipeline!`);
  };

  const stages = [
    { key: 'PROSPECCAO', label: 'Prospecção', color: '#94a3b8' },
    { key: 'QUALIFICACAO', label: 'Qualificação', color: '#38bdf8' },
    { key: 'PROPOSTA', label: 'Proposta Enviada', color: '#f59e0b' },
    { key: 'NEGOCIACAO', label: 'Negociação', color: '#c084fc' },
    { key: 'FECHADO_GANHO', label: 'Fechado / Ganho', color: '#10b981' },
  ];

  const totalPipeline = opportunities.reduce((acc, curr) => acc + curr.valor, 0);

  return (
    <div className="coliseu-page" style={{ minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {toastMessage && (
        <div className="coliseu-toast-container">
          <div className="coliseu-toast coliseu-toast--success" style={{
            backgroundColor: 'var(--surface-2)',
            border: '1px solid var(--status-success)',
            color: 'var(--text-primary)',
            padding: '0.75rem 1.25rem',
            borderRadius: '0.5rem',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}>
            <Check aria-hidden="true" style={{ width: '1.25rem', height: '1.25rem', color: 'var(--status-success)' }} />
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Funil Comercial & Pipeline de Oportunidades CRM</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            Acompanhe o funil de vendas em tempo real, probabilidade de fechamento e insights do Agente Comercial IA.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ backgroundColor: 'var(--surface-1)', border: '1px solid var(--surface-2)', borderRadius: '8px', padding: '8px 16px', textTransform: 'uppercase' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Total em Pipeline</div>
            <div className="tabular-nums" style={{ fontSize: '18px', fontWeight: 800, color: 'var(--status-success)', fontFamily: 'monospace' }}>
              R$ {totalPipeline.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <Button variant="primary" leftIcon={<Plus aria-hidden="true" size={16} />} onClick={() => setIsModalOpen(true)}>Nova Oportunidade</Button>
        </div>
      </div>

      {/* Kanban Board */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', overflowX: 'auto', paddingBottom: '16px' }}>
        {stages.map((stage) => {
          const stageOpps = opportunities.filter((o) => o.estagio === stage.key);
          const stageTotal = stageOpps.reduce((acc, curr) => acc + curr.valor, 0);

          return (
            <div
              key={stage.key}
              style={{
                backgroundColor: 'var(--surface-1)',
                border: '1px solid var(--surface-2)',
                borderRadius: '8px',
                padding: '12px',
                minHeight: '520px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ borderBottom: `2px solid ${stage.color}`, paddingBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{stage.label}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'monospace', fontWeight: 'bold' }}>({stageOpps.length})</span>
              </div>

              <div className="tabular-nums" style={{ fontSize: '11px', color: stage.color, fontWeight: 'bold', fontFamily: 'monospace' }}>
                R$ {stageTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                {stageOpps.map((opp) => (
                  <div
                    key={opp.id}
                    style={{
                      backgroundColor: 'var(--surface-app)',
                      border: '1px solid var(--surface-2)',
                      borderRadius: '6px',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-link)', fontFamily: 'monospace', fontWeight: 'bold' }}>{opp.id}</span>
                      <Badge variant="ai">{opp.iaScore} pts IA</Badge>
                    </div>

                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{opp.cliente}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <User aria-hidden="true" size={12} /> {opp.contato}
                    </div>

                    <div className="tabular-nums" style={{ fontSize: '15px', fontWeight: 800, color: 'var(--status-success)', fontFamily: 'monospace', marginTop: '4px' }}>
                      R$ {opp.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>

                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar aria-hidden="true" size={12} /> Previsão: {opp.dataPrevisao} ({opp.probabilidade}%)
                    </div>

                    <div style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)', padding: '6px', borderRadius: '4px', fontSize: '10px', color: 'var(--text-link)' }}>
                      <Sparkles aria-hidden="true" size={10} style={{ display: 'inline', marginRight: '4px' }} />
                      {opp.iaInsight}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Nova Oportunidade */}
      {isModalOpen && (
        <div className="coliseu-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="coliseu-modal" role="dialog" aria-modal="true" style={{ width: '100%', maxWidth: '480px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--surface-2)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Nova Oportunidade no Funil</h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X aria-hidden="true" style={{ width: '1.25rem', height: '1.25rem' }} />
              </button>
            </div>

            <form onSubmit={handleSalvarOportunidade} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Nome da Empresa / Cliente *</label>
                <Input
                  type="text"
                  required
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  placeholder="Ex: Auto Center São Paulo"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Nome do Contato</label>
                <Input
                  type="text"
                  value={contato}
                  onChange={(e) => setContato(e.target.value)}
                  placeholder="Ex: João Ferreira (Comprador)"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Valor Estimado (R$)</label>
                  <Input
                    type="text"
                    value={valor}
                    onChange={(e) => setValor(parseNumber(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Estágio Inicial</label>
                  <select
                    value={estagio}
                    onChange={(e) => setEstagio(e.target.value as any)}
                    style={{ width: '100%', backgroundColor: 'var(--surface-app)', border: '1px solid var(--surface-2)', borderRadius: '0.5rem', padding: '0.5rem', fontSize: '0.75rem', color: 'var(--text-primary)' }}
                  >
                    <option value="PROSPECCAO">Prospecção</option>
                    <option value="QUALIFICACAO">Qualificação</option>
                    <option value="PROPOSTA">Proposta Enviada</option>
                    <option value="NEGOCIACAO">Negociação</option>
                    <option value="FECHADO_GANHO">Fechado / Ganho</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid var(--surface-2)' }}>
                <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </Button>
                <Button variant="success" type="submit">
                  Criar Oportunidade
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
