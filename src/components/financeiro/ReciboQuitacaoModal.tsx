import React, { useRef } from 'react';
import { Button } from '../ui/Button';
import { formatCurrency, formatDate } from '../../lib/formatters';
import { Printer, X, CheckCircle2, Building, User, Calendar, DollarSign, ShieldCheck } from 'lucide-react';

export interface ReciboQuitacaoData {
  numeroRecibo: string;
  dataHora: string;
  clienteNome: string;
  clienteCpfCnpj?: string;
  titulos: Array<{
    codigo: string;
    parcela: string;
    vencimento: string;
    valorOriginal: number;
    juros: number;
    multa: number;
    desconto: number;
    valorLiquidado: number;
  }>;
  totalSubtotal: number;
  totalJuros: number;
  totalMulta: number;
  totalDesconto: number;
  totalLiquidado: number;
  formasPagamento: Array<{ especie: string; valor: number }>;
  caixaNome: string;
  contaNome: string;
  autenticacao: string;
}

export interface ReciboQuitacaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  recibo: ReciboQuitacaoData | null;
}

export const ReciboQuitacaoModal: React.FC<ReciboQuitacaoModalProps> = ({
  isOpen,
  onClose,
  recibo,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !recibo) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 'calc(var(--z-modal) + 10)',
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
          maxWidth: '780px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#ffffff',
          color: '#1e293b',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6)',
        }}
      >
        {/* Modal Toolbar (Não sai na impressão) */}
        <div
          className="no-print"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 20px',
            backgroundColor: '#0f172a',
            color: '#f8fafc',
            borderBottom: '1px solid #334155',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={18} color="#10b981" />
            <span style={{ fontSize: '14px', fontWeight: 600 }}>Quitação Confirmada com Sucesso</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="primary" size="sm" onClick={handlePrint}>
              <Printer size={14} /> Imprimir Recibo
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} style={{ color: '#f8fafc' }}>
              <X size={16} /> Fechar
            </Button>
          </div>
        </div>

        {/* Conteúdo Imprimível do Recibo */}
        <div
          ref={printRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px 32px',
            backgroundColor: '#ffffff',
            color: '#0f172a',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: '12px',
            lineHeight: 1.5,
          }}
        >
          {/* Cabeçalho da Empresa */}
          <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: '12px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h1 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 2px 0', letterSpacing: '-0.02em', color: '#0f172a' }}>
                  PIVETA DISTRIBUIDORA DE TINTAS LTDA
                </h1>
                <div style={{ fontSize: '11px', color: '#475569' }}>
                  CNPJ: 05.766.577/0001-22 &bull; I.E.: 283261864 &bull; Dourados/MS
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>RECIBO Nº {recibo.numeroRecibo}</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Data: {recibo.dataHora}</div>
              </div>
            </div>
          </div>

          {/* Dados do Pagador */}
          <div style={{ backgroundColor: '#f8fafc', padding: '10px 14px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '4px' }}>
              Dados do Cliente / Sacado
            </div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{recibo.clienteNome}</div>
            {recibo.clienteCpfCnpj && (
              <div style={{ fontSize: '11px', color: '#475569' }}>CPF/CNPJ: {recibo.clienteCpfCnpj}</div>
            )}
          </div>

          {/* Tabela de Títulos Liquidados */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '6px' }}>
              Títulos Liquidados ({recibo.titulos.length})
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                  <th style={{ textAlign: 'left', padding: '6px 8px' }}>Código Título</th>
                  <th style={{ textAlign: 'center', padding: '6px 8px' }}>Parc.</th>
                  <th style={{ textAlign: 'left', padding: '6px 8px' }}>Vencimento</th>
                  <th style={{ textAlign: 'right', padding: '6px 8px' }}>Valor Original</th>
                  <th style={{ textAlign: 'right', padding: '6px 8px' }}>Juros/Mora</th>
                  <th style={{ textAlign: 'right', padding: '6px 8px' }}>Desconto</th>
                  <th style={{ textAlign: 'right', padding: '6px 8px' }}>Valor Pago</th>
                </tr>
              </thead>
              <tbody>
                {recibo.titulos.map((t, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '6px 8px', fontWeight: 600 }}>{t.codigo}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'center' }}>{t.parcela}</td>
                    <td style={{ padding: '6px 8px' }}>{formatDate(t.vencimento)}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right' }}>{formatCurrency(t.valorOriginal)}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right' }}>{t.juros > 0 ? formatCurrency(t.juros) : '-'}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right' }}>{t.desconto > 0 ? formatCurrency(t.desconto) : '-'}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700 }}>{formatCurrency(t.valorLiquidado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totais & Formas de Pagamento */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div style={{ backgroundColor: '#f8fafc', padding: '10px 14px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '6px' }}>
                Forma de Pagamento
              </div>
              {recibo.formasPagamento.map((fp, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span>{fp.especie}</span>
                  <strong style={{ fontFamily: 'monospace' }}>{formatCurrency(fp.valor)}</strong>
                </div>
              ))}
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
                Caixa: <strong>{recibo.caixaNome}</strong> &bull; Conta: <strong>{recibo.contaNome}</strong>
              </div>
            </div>

            <div style={{ backgroundColor: '#f8fafc', padding: '10px 14px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '6px' }}>
                Resumo dos Valores
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '2px' }}>
                <span>Subtotal Títulos:</span>
                <span>{formatCurrency(recibo.totalSubtotal)}</span>
              </div>
              {recibo.totalJuros > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#b91c1c', marginBottom: '2px' }}>
                  <span>(+) Juros/Multa:</span>
                  <span>{formatCurrency(recibo.totalJuros + recibo.totalMulta)}</span>
                </div>
              )}
              {recibo.totalDesconto > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#047857', marginBottom: '2px' }}>
                  <span>(-) Desconto Concedido:</span>
                  <span>{formatCurrency(recibo.totalDesconto)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 800, borderTop: '1px solid #cbd5e1', paddingTop: '6px', marginTop: '4px', color: '#0f172a' }}>
                <span>TOTAL LIQUIDADO:</span>
                <span style={{ color: '#047857' }}>{formatCurrency(recibo.totalLiquidado)}</span>
              </div>
            </div>
          </div>

          {/* Autenticação e Rodapé */}
          <div style={{ borderTop: '1px dashed #94a3b8', paddingTop: '12px', fontSize: '10px', color: '#64748b', textAlign: 'center' }}>
            <div style={{ fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.05em', color: '#334155', marginBottom: '4px' }}>
              AUTENTICAÇÃO ELETRÔNICA: {recibo.autenticacao}
            </div>
            <div>
              Declaramos para os devidos fins que recebemos do sacado acima indicado a quantia descrita neste recibo, conferindo plena, rasa e irrevogável quitação dos títulos aqui relacionados.
            </div>
          </div>
        </div>

        {/* Footer (Não sai na impressão) */}
        <div
          className="no-print"
          style={{
            padding: '12px 20px',
            backgroundColor: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px',
          }}
        >
          <Button variant="secondary" onClick={onClose}>
            Concluir e Voltar
          </Button>
          <Button variant="primary" onClick={handlePrint}>
            <Printer size={14} /> Imprimir Recibo
          </Button>
        </div>
      </div>
    </div>
  );
};
