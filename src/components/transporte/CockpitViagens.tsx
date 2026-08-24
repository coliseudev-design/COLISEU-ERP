import React from 'react';
import { Truck, MapPin, User, CheckCircle2, Clock, ShieldCheck, FileText, ChevronRight } from 'lucide-react';
import { formatCurrency } from '../../lib/formatters';
import { OperacaoTransporteItem } from '../../lib/transporte';

interface CockpitViagensProps {
  viagens: OperacaoTransporteItem[];
  onAlterarStatus: (id: string, novoStatus: string) => void;
  onSelecionarViagem: (viagem: OperacaoTransporteItem) => void;
  onAbrirEncerramento?: (viagem: OperacaoTransporteItem) => void;
}

export const CockpitViagens: React.FC<CockpitViagensProps> = ({
  viagens,
  onAlterarStatus,
  onSelecionarViagem,
  onAbrirEncerramento,
}) => {
  const colunas = [
    { id: 'PLANEJADA', titulo: '1. Planejada / Roteirizada', cor: '#64748b' },
    { id: 'EM_CARREGAMENTO', titulo: '2. Em Carregamento', cor: '#f59e0b' },
    { id: 'EM_TRANSITO', titulo: '3. Em Trânsito / Viagem', cor: '#3b82f6' },
    { id: 'ENTREGUE', titulo: '4. Entregue no Destino', cor: '#8b5cf6' },
    { id: 'ENCERRADA', titulo: '5. Encerrada & Quitada', cor: '#10b981' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', minHeight: '380px' }}>
      {colunas.map((col) => {
        const viagensNaColuna = viagens.filter((v) => v.status_viagem === col.id);

        return (
          <div
            key={col.id}
            style={{
              backgroundColor: 'var(--surface-2)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-default)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Cabeçalho da Coluna */}
            <div
              style={{
                padding: '10px 12px',
                borderBottom: '2px solid ' + col.cor,
                backgroundColor: 'var(--surface-1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-primary)' }}>
                {col.titulo}
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '1px 6px',
                  borderRadius: '10px',
                  backgroundColor: col.cor,
                  color: '#fff',
                }}
              >
                {viagensNaColuna.length}
              </span>
            </div>

            {/* Cards da Coluna */}
            <div style={{ flex: 1, padding: '10px', display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
              {viagensNaColuna.map((viagem) => (
                <div
                  key={viagem.id}
                  onClick={() => onSelecionarViagem(viagem)}
                  style={{
                    backgroundColor: 'var(--surface-1)',
                    border: '1px solid var(--border-default)',
                    borderRadius: '6px',
                    padding: '10px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#3b82f6' }}>
                      Viagem #{viagem.numero_viagem}
                    </span>
                    <span
                      style={{
                        fontSize: '9px',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: viagem.ciot_status === 'EMITIDO' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                        color: viagem.ciot_status === 'EMITIDO' ? '#10b981' : '#eab308',
                      }}
                    >
                      {viagem.ciot_numero ? `CIOT: ${viagem.ciot_numero.slice(-6)}` : 'CIOT Pend.'}
                    </span>
                  </div>

                  <div style={{ fontSize: '10px', color: 'var(--text-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={12} color="#f59e0b" />
                    {viagem.uf_origem} ➔ {viagem.uf_destino} ({viagem.municipio_destino})
                  </div>

                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Truck size={12} />
                    {viagem.veiculo_placa || 'Sem Veículo'} • {viagem.motorista_nome?.split(' ')[0] || 'Motorista'}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', borderTop: '1px solid var(--border-subtle)', paddingTop: '4px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#10b981', fontFamily: 'monospace' }}>
                      {formatCurrency(viagem.valor_frete)}
                    </span>
                    <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                      {viagem.total_ctes} CT-e(s)
                    </span>
                  </div>

                  {/* Ação rápida de avanço de status */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2px' }}>
                    {col.id === 'PLANEJADA' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAlterarStatus(viagem.id, 'EM_CARREGAMENTO');
                        }}
                        style={{ border: 'none', background: 'none', color: '#3b82f6', fontSize: '10px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                      >
                        Carregar <ChevronRight size={12} />
                      </button>
                    )}
                    {col.id === 'EM_CARREGAMENTO' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAlterarStatus(viagem.id, 'EM_TRANSITO');
                        }}
                        style={{ border: 'none', background: 'none', color: '#3b82f6', fontSize: '10px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                      >
                        Despachar <ChevronRight size={12} />
                      </button>
                    )}
                    {col.id === 'EM_TRANSITO' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onAbrirEncerramento) {
                            onAbrirEncerramento(viagem);
                          } else {
                            onAlterarStatus(viagem.id, 'ENTREGUE');
                          }
                        }}
                        style={{ border: 'none', background: 'none', color: '#8b5cf6', fontSize: '10px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                      >
                        Confirmar Entrega <ChevronRight size={12} />
                      </button>
                    )}
                    {col.id === 'ENTREGUE' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onAbrirEncerramento) {
                            onAbrirEncerramento(viagem);
                          } else {
                            onAlterarStatus(viagem.id, 'ENCERRADA');
                          }
                        }}
                        style={{ border: 'none', background: 'none', color: '#10b981', fontSize: '10px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                      >
                        Encerrar &amp; Quitar <ChevronRight size={12} />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {viagensNaColuna.length === 0 && (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)', fontSize: '11px' }}>
                  Nenhuma viagem neste estágio
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
