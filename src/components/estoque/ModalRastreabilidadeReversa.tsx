import React from 'react';
import { Button } from '../ui/Button';
import {
  History,
  X,
  Truck,
  ArrowRight,
  User,
  Building,
  CheckCircle2,
  AlertTriangle,
  FileText,
  MapPin,
  Sprout,
  Boxes,
} from 'lucide-react';
import { LoteItem } from '../../lib/lotes';

interface ModalRastreabilidadeReversaProps {
  isOpen: boolean;
  onClose: () => void;
  lote: LoteItem | null;
}

export const ModalRastreabilidadeReversa: React.FC<ModalRastreabilidadeReversaProps> = ({
  isOpen,
  onClose,
  lote,
}) => {
  if (!isOpen || !lote) return null;

  const entradas = lote.historicoMovimentacoes.filter((m) => m.tipo === 'ENTRADA_COMPRA');
  const saidas = lote.historicoMovimentacoes.filter((m) => m.tipo === 'SAIDA_VENDA');

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
          maxWidth: '860px',
          maxHeight: '94vh',
          backgroundColor: 'var(--surface-1)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--surface-2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <History size={20} color="#3b82f6" />
            <div>
              <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Rastreabilidade Reversa 360° — Lote: {lote.numeroLote}
              </h2>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Cadeia de Custódia Completa (Origem ➔ Armazém WMS ➔ Destinos Finais / Clientes) para Auditoria e Recall.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body com a Linha do Tempo e Árvore */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Card Resumo do Lote */}
          <div
            style={{
              padding: '14px',
              backgroundColor: 'var(--surface-2)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-default)',
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr',
              gap: '12px',
            }}
          >
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Produto</div>
              <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{lote.produtoDescricao}</strong>
              {lote.dadosSementes && (
                <div style={{ fontSize: '11px', color: '#10b981', marginTop: '2px', fontWeight: 600 }}>
                  🌱 RENASEM: {lote.dadosSementes.renasemProdutor} • Peneira: {lote.dadosSementes.peneira}
                </div>
              )}
            </div>

            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Saldo Atual em Estoque</div>
              <strong style={{ fontSize: '16px', color: '#10b981', fontFamily: 'monospace' }}>
                {lote.quantidadeAtual} {lote.unidadeMedida}
              </strong>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Inicial: {lote.quantidadeInicial}</div>
            </div>

            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Validade do Lote</div>
              <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{lote.dataValidade}</strong>
              <div style={{ fontSize: '10px', color: '#10b981' }}>{lote.diasParaVencer} dias restantes</div>
            </div>
          </div>

          {/* 1. ETAPA DE ORIGEM / ENTRADA */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <Building size={15} /> 1. Origem / Fornecedor / Campo de Produção
            </div>
            {entradas.map((ent) => (
              <div
                key={ent.id}
                style={{
                  padding: '10px 14px',
                  backgroundColor: 'rgba(59, 130, 246, 0.06)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {ent.entidadeNome}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Documento: <strong>{ent.documentoRef}</strong> • Data Entrada: {ent.dataHora}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#3b82f6', fontFamily: 'monospace' }}>
                    + {ent.quantidade} {ent.unidade}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* 2. ARMAZENAMENTO ATUAL */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <MapPin size={15} /> 2. Armazenamento Atual & WMS
            </div>
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: 'rgba(245, 158, 11, 0.06)',
                border: '1px solid rgba(245, 158, 11, 0.2)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {lote.localizacaoWms}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Status de Qualidade: <strong>{lote.status}</strong>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#f59e0b', fontFamily: 'monospace' }}>
                  {lote.quantidadeAtual} {lote.unidadeMedida} disponíveis
                </span>
              </div>
            </div>
          </div>

          {/* 3. DESTINOS / CLIENTES ATENDIDOS (SAÍDAS) */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <Truck size={15} /> 3. Destinos & Vendas Realizadas (Cadeia de Distribuição - {saidas.length} entregas)
            </div>

            <div className="coliseu-table-container">
              <table className="coliseu-table" style={{ fontSize: '11px' }}>
                <thead>
                  <tr>
                    <th style={{ width: '130px' }}>Data / Hora</th>
                    <th style={{ width: '110px' }}>Documento</th>
                    <th>Cliente / Produtor Destinatário</th>
                    <th style={{ width: '100px', textAlign: 'right' }}>Qtd Entregue</th>
                    <th style={{ width: '100px', textAlign: 'right' }}>Saldo Após</th>
                  </tr>
                </thead>
                <tbody>
                  {saidas.map((s) => (
                    <tr key={s.id}>
                      <td style={{ color: 'var(--text-muted)' }}>{s.dataHora}</td>
                      <td style={{ fontWeight: 700, color: 'var(--text-link)' }}>{s.documentoRef}</td>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.entidadeNome}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#ef4444', fontFamily: 'monospace' }}>
                        - {s.quantidade} {s.unidade}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                        {s.saldoApos} {s.unidade}
                      </td>
                    </tr>
                  ))}
                  {saidas.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)' }}>
                        Nenhuma saída/venda registrada para este lote até o momento.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--surface-2)',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <Button variant="secondary" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
};
