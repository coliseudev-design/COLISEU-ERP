import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { StatusBadge } from '../ui/StatusBadge';
import { formatCurrency, formatDate } from '../../lib/formatters';
import {
  X,
  FileText,
  DollarSign,
  Calendar,
  Clock,
  User,
  Building,
  CheckCircle2,
  AlertCircle,
  Printer,
  History,
  ShieldCheck,
  CreditCard,
  Hash,
  RotateCcw,
} from 'lucide-react';

export interface TituloLiquidacaoItemLog {
  caixaOuBanco: string;
  especie: string;
  data: string;
  hora: string;
  tipoDC: 'C' | 'D'; // Crédito ou Débito
  valor: number;
  usuario: string;
  nsuAutorizacao?: string;
  numeroCheque?: string;
}

export interface TituloDetalhesData {
  codigo: string;
  emissao: string;
  vencimento: string;
  parcela: string;
  tipo: 'R' | 'P';
  valorOriginal: number;
  valorAtual: number;
  valorPago: number;
  saldoDevedor: number;
  especieOriginal: string;
  status: string;
  isAberto: boolean;
  isVencido: boolean;
  pedido?: string;
  nf?: string;
  clienteNome: string;
  clienteCpfCnpj?: string;
  portador?: string;

  // Informações da Liquidação (se quitado)
  liquidacao?: {
    dataLiquidacao: string;
    horaLiquidacao: string;
    valorLiquidado: number;
    numeroAutenticacao: string;
    descontoLiq: number;
    jurosLiq: number;
    multaLiq: number;
    usuarioLiquidou: string;
    caixaPrincipal: string;
    contaBancaria: string;
    itensPagamento: TituloLiquidacaoItemLog[];
  };

  // Histórico de Eventos / Auditoria
  eventos?: Array<{
    dataHora: string;
    evento: string;
    descricao: string;
    usuario: string;
  }>;
}

export interface TituloDetalhesModalProps {
  isOpen: boolean;
  onClose: () => void;
  titulo: TituloDetalhesData | null;
  onReemitirRecibo?: (titulo: TituloDetalhesData) => void;
  onEstornarTitulo?: (codigo: string) => void;
}

export const TituloDetalhesModal: React.FC<TituloDetalhesModalProps> = ({
  isOpen,
  onClose,
  titulo,
  onReemitirRecibo,
  onEstornarTitulo,
}) => {
  const [activeTab, setActiveTab] = useState<'liquidacao' | 'geral' | 'eventos'>('liquidacao');

  if (!isOpen || !titulo) return null;

  const isQuitado = !titulo.isAberto || titulo.status === 'Pago';
  const liq = titulo.liquidacao;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 'calc(var(--z-modal) + 5)',
        backgroundColor: 'var(--surface-overlay-heavy)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        className="coliseu-card"
        style={{
          width: '100%',
          maxWidth: '860px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--surface-1)',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        {/* Header do Título */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--surface-2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: isQuitado ? 'var(--status-success)' : titulo.isVencido ? 'var(--status-danger)' : 'var(--status-warning)',
              }}
            />
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Ficha do Título #{titulo.codigo} — Parcela {titulo.parcela}
            </h2>
            <StatusBadge
              status={isQuitado ? 'Pago' : titulo.isVencido ? 'Vencido' : 'Em Aberto'}
              label={isQuitado ? 'Quitado / Pago' : titulo.isVencido ? 'Vencido' : 'Em Aberto'}
            />
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar Modal"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px',
              borderRadius: 'var(--radius-xs)',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Barra do Cliente & Resumo */}
        <div
          style={{
            padding: '10px 20px',
            backgroundColor: 'var(--surface-sunken)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid var(--border-subtle)',
            fontSize: '12px',
          }}
        >
          <div>
            <strong style={{ color: 'var(--text-secondary)' }}>Cliente / Sacado:</strong>{' '}
            <span style={{ fontWeight: 600, color: 'var(--text-link)' }}>{titulo.clienteNome}</span>{' '}
            {titulo.clienteCpfCnpj && <span style={{ color: 'var(--text-muted)' }}>({titulo.clienteCpfCnpj})</span>}
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Valor Original:</span>{' '}
            <strong className="tabular-nums" style={{ fontSize: '13px' }}>
              {formatCurrency(titulo.valorOriginal)}
            </strong>
          </div>
        </div>

        {/* Tabs de Navegação */}
        <div
          className="coliseu-tabs"
          style={{
            display: 'flex',
            padding: '0 20px',
            borderBottom: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--surface-1)',
          }}
        >
          <button
            className={`coliseu-tab ${activeTab === 'liquidacao' ? 'coliseu-tab--active' : ''}`}
            onClick={() => setActiveTab('liquidacao')}
            style={{
              padding: '10px 18px',
              borderBottom: activeTab === 'liquidacao' ? '2px solid var(--action-primary)' : '2px solid transparent',
              background: 'none',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '12px',
              color: activeTab === 'liquidacao' ? 'var(--action-primary)' : 'var(--text-secondary)',
            }}
          >
            Informações da Liquidação (Log de Quitação)
          </button>
          <button
            className={`coliseu-tab ${activeTab === 'geral' ? 'coliseu-tab--active' : ''}`}
            onClick={() => setActiveTab('geral')}
            style={{
              padding: '10px 18px',
              borderBottom: activeTab === 'geral' ? '2px solid var(--action-primary)' : '2px solid transparent',
              background: 'none',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '12px',
              color: activeTab === 'geral' ? 'var(--action-primary)' : 'var(--text-secondary)',
            }}
          >
            Dados Gerais do Título
          </button>
          <button
            className={`coliseu-tab ${activeTab === 'eventos' ? 'coliseu-tab--active' : ''}`}
            onClick={() => setActiveTab('eventos')}
            style={{
              padding: '10px 18px',
              borderBottom: activeTab === 'eventos' ? '2px solid var(--action-primary)' : '2px solid transparent',
              background: 'none',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '12px',
              color: activeTab === 'eventos' ? 'var(--action-primary)' : 'var(--text-secondary)',
            }}
          >
            Trilha de Auditoria & Eventos
          </button>
        </div>

        {/* Conteúdo das Abas */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {/* ABA 1: INFORMAÇÕES DA LIQUIDAÇÃO (LOG COMPLETO DE QUITAÇÃO) */}
          {activeTab === 'liquidacao' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {isQuitado && liq ? (
                <>
                  {/* Grade Superior de Informações da Liquidação (Igual ao Coliseu ERP) */}
                  <fieldset
                    style={{
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px 14px',
                      backgroundColor: 'var(--surface-sunken)',
                    }}
                  >
                    <legend style={{ padding: '0 6px', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Informações da Liquidação
                    </legend>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
                      <div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Data Liquidação</div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }} className="tabular-nums">
                          {formatDate(liq.dataLiquidacao)} {liq.horaLiquidacao ? `às ${liq.horaLiquidacao}` : ''}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Valor Liquidado</div>
                        <div className="tabular-nums" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--status-success)' }}>
                          {formatCurrency(liq.valorLiquidado)}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Nº Autenticação</div>
                        <div className="text-mono" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {liq.numeroAutenticacao || '252208'}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Descontos Liq.</div>
                        <div className="tabular-nums" style={{ fontSize: '13px', fontWeight: 600, color: liq.descontoLiq > 0 ? 'var(--status-success)' : 'var(--text-secondary)' }}>
                          {formatCurrency(liq.descontoLiq)}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Juros / Multa Liq.</div>
                        <div className="tabular-nums" style={{ fontSize: '13px', fontWeight: 600, color: liq.jurosLiq > 0 ? 'var(--status-danger)' : 'var(--text-secondary)' }}>
                          {formatCurrency(liq.jurosLiq + liq.multaLiq)}
                        </div>
                      </div>
                    </div>
                  </fieldset>

                  {/* Tabela de Detalhamento dos Lançamentos / Espécies */}
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>
                      Detalhamento dos Lançamentos no Caixa / Banco
                    </div>
                    <div className="coliseu-table-container" style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-xs)' }}>
                      <table className="coliseu-table" style={{ fontSize: '11px' }}>
                        <thead>
                          <tr>
                            <th>Caixa / Banco</th>
                            <th>Espécie Pgto</th>
                            <th style={{ textAlign: 'center' }}>Data</th>
                            <th style={{ textAlign: 'center' }}>Hora</th>
                            <th style={{ textAlign: 'center' }}>D/C</th>
                            <th style={{ textAlign: 'right' }}>Valor</th>
                            <th>Usuário / Operador</th>
                          </tr>
                        </thead>
                        <tbody>
                          {liq.itensPagamento.map((item, idx) => (
                            <tr key={idx}>
                              <td style={{ fontWeight: 600 }}>{item.caixaOuBanco}</td>
                              <td>
                                <span style={{ padding: '2px 6px', backgroundColor: 'var(--surface-2)', borderRadius: 'var(--radius-xs)', fontSize: '10px', fontWeight: 600 }}>
                                  {item.especie}
                                </span>
                                {item.nsuAutorizacao && <span style={{ marginLeft: '4px', fontSize: '10px', color: 'var(--text-muted)' }}>NSU: {item.nsuAutorizacao}</span>}
                              </td>
                              <td style={{ textAlign: 'center' }} className="tabular-nums">{formatDate(item.data)}</td>
                              <td style={{ textAlign: 'center' }}>{item.hora}</td>
                              <td style={{ textAlign: 'center', fontWeight: 700, color: item.tipoDC === 'C' ? 'var(--status-success)' : 'var(--status-danger)' }}>
                                {item.tipoDC}
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 700 }} className="tabular-nums">
                                {formatCurrency(item.valor)}
                              </td>
                              <td style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{item.usuario}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ padding: '32px', textAlign: 'center', backgroundColor: 'var(--surface-sunken)', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border-subtle)' }}>
                  <AlertCircle size={32} style={{ color: 'var(--status-warning)', margin: '0 auto 8px' }} />
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Título ainda se encontra Em Aberto
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Este título ainda não foi liquidado. Para registar a quitação, selecione-o na lista e clique em "Liquidar Selecionados".
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ABA 2: DADOS GERAIS DO TÍTULO */}
          {activeTab === 'geral' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div style={{ padding: '12px', backgroundColor: 'var(--surface-sunken)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Documento & Faturamento
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Código do Título:</span>
                    <strong className="text-mono">{titulo.codigo}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Pedido de Venda:</span>
                    <strong style={{ color: 'var(--text-link)' }}>{titulo.pedido || 'MOB391'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Nota Fiscal (NF-e):</span>
                    <strong>{titulo.nf || '1024'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Parcela:</span>
                    <strong>{titulo.parcela}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Tipo de Movimento:</span>
                    <strong style={{ color: titulo.tipo === 'R' ? 'var(--status-success)' : 'var(--status-danger)' }}>
                      {titulo.tipo === 'R' ? 'Receber (Crédito Empresa)' : 'Pagar (Débito Empresa)'}
                    </strong>
                  </div>
                </div>
              </div>

              <div style={{ padding: '12px', backgroundColor: 'var(--surface-sunken)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Prazos & Valores
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Data de Emissão:</span>
                    <strong className="tabular-nums">{formatDate(titulo.emissao)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Data de Vencimento:</span>
                    <strong style={{ color: titulo.isVencido && !isQuitado ? 'var(--status-danger)' : 'var(--text-primary)' }} className="tabular-nums">
                      {formatDate(titulo.vencimento)}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Espécie Padrão:</span>
                    <strong>{titulo.especieOriginal || 'BOLETO BANCARIO'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Portador / Banco Cobrança:</span>
                    <strong>{titulo.portador || '748 - SICREDI CARTEIRA SIMPLES'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '4px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Valor Nominal do Título:</span>
                    <strong className="tabular-nums" style={{ fontSize: '13px' }}>
                      {formatCurrency(titulo.valorOriginal)}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ABA 3: TRILHA DE AUDITORIA & EVENTOS */}
          {activeTab === 'eventos' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(titulo.eventos && titulo.eventos.length > 0 ? titulo.eventos : [
                {
                  dataHora: `${titulo.emissao} 10:15:00`,
                  evento: 'EMISSÃO DO TÍTULO',
                  descricao: `Título gerado a partir do Pedido ${titulo.pedido || 'MOB391'} no valor de ${formatCurrency(titulo.valorOriginal)}.`,
                  usuario: 'ROBERTO SILVA (VENDEDOR)',
                },
                ...(isQuitado && liq ? [{
                  dataHora: `${liq.dataLiquidacao} ${liq.horaLiquidacao || '10:36:28'}`,
                  evento: 'LIQUIDAÇÃO DE TÍTULO',
                  descricao: `Quitação realizada no valor de ${formatCurrency(liq.valorLiquidado)} no ${liq.caixaPrincipal} via ${liq.itensPagamento.map(p => p.especie).join(' + ')}. Autenticação: ${liq.numeroAutenticacao || '252208'}.`,
                  usuario: liq.usuarioLiquidou || 'GERENCIA 99863',
                }] : []),
              ]).map((ev, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '8px 12px',
                    borderLeft: '3px solid var(--domain-comercial)',
                    backgroundColor: 'var(--surface-sunken)',
                    borderRadius: '0 var(--radius-xs) var(--radius-xs) 0',
                    fontSize: '11px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{ev.evento}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{ev.dataHora}</span>
                  </div>
                  <p style={{ margin: '2px 0 4px', color: 'var(--text-secondary)', lineHeight: 1.35 }}>
                    {ev.descricao}
                  </p>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    Operador / Responsável: <strong style={{ color: 'var(--text-primary)' }}>{ev.usuario}</strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer com Ações */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'var(--surface-2)',
          }}
        >
          <div style={{ display: 'flex', gap: '8px' }}>
            {isQuitado && onReemitirRecibo && (
              <Button variant="secondary" size="sm" onClick={() => onReemitirRecibo(titulo)}>
                <Printer size={13} /> Reemitir Recibo de Quitação
              </Button>
            )}
            {isQuitado && onEstornarTitulo && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => onEstornarTitulo(titulo.codigo)}
                style={{ backgroundColor: 'var(--status-danger)', borderColor: 'var(--status-danger)', color: '#fff' }}
              >
                <RotateCcw size={13} /> Estornar Quitação
              </Button>
            )}
          </div>
          <Button variant="primary" onClick={onClose}>
            ✓ OK / Fechar
          </Button>
        </div>
      </div>
    </div>
  );
};
