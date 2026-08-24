import React, { useState, useEffect } from 'react';
import { Printer, X, ShieldAlert } from 'lucide-react';
import { imprimirDanfeSimplificadoTipo2 } from '../../lib/danfeSimplificado';
import { Button } from '../ui/Button';

interface DanfeSimplificadoModalProps {
  isOpen: boolean;
  onClose: () => void;
  chaveAcesso?: string;
  numeroNfe?: number;
  tpEmis?: number; // 1=Normal, 9=Contingência Offline
  tpAmb?: number;  // 1=Produção, 2=Homologação
}

export const DanfeSimplificadoModal: React.FC<DanfeSimplificadoModalProps> = ({
  isOpen,
  onClose,
  chaveAcesso = '35260805766577000122550010000000011000001234',
  numeroNfe = 1,
  tpEmis = 1,
  tpAmb = 2,
}) => {
  const [segundaVia, setSegundaVia] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const chaveFormatada = chaveAcesso.replace(/(\d{4})/g, '$1 ').trim();
  const isContingencia = tpEmis === 9;
  const isHomologacao = tpAmb === 2;

  const handleImprimirTermica = async () => {
    setLoading(true);
    try {
      await imprimirDanfeSimplificadoTipo2(chaveAcesso, undefined, 'TERMICA_ESCPOS');
      alert('Comando de impressão enviado para a impressora térmica!');
    } catch (err: any) {
      alert(`Erro ao imprimir: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="coliseu-overlay"
      onClick={onClose}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--spacing-4)' }}
    >
      <div
        className="coliseu-modal coliseu-modal--md"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="danfe-modal-title"
        style={{
          padding: 'var(--spacing-6)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
          position: 'relative',
          top: 'auto',
          left: 'auto',
          transform: 'none',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border-default)',
            paddingBottom: 'var(--spacing-3)',
            marginBottom: 'var(--spacing-4)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(56, 189, 248, 0.15)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-link)',
              }}
            >
              <Printer size={20} aria-hidden="true" />
            </div>
            <div>
              <h3
                id="danfe-modal-title"
                style={{
                  fontSize: 'var(--font-size-lg)',
                  fontWeight: 'var(--font-weight-bold)',
                  color: 'var(--text-primary)',
                  margin: 0,
                }}
              >
                DANFE Simplificado Tipo 2
              </h3>
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', margin: 0 }}>
                NF-e Modelo 55 • NT 2026.003
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal"
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Botão de Toggle Via Estabelecimento em Contingência */}
        {isContingencia && (
          <div
            style={{
              marginBottom: 'var(--spacing-4)',
              backgroundColor: 'var(--status-warning-bg)',
              border: '1px solid var(--status-warning-border)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--spacing-3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 'var(--font-size-xs)',
              color: 'var(--status-warning)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
              <ShieldAlert size={16} style={{ color: 'var(--status-warning)' }} aria-hidden="true" />
              <span>Contingência Offline: 2 Vias (SINIEF 14/2026)</span>
            </div>
            <button
              type="button"
              onClick={() => setSegundaVia(!segundaVia)}
              style={{
                backgroundColor: 'var(--status-warning)',
                border: 'none',
                color: 'var(--text-inverse)',
                fontWeight: 'var(--font-weight-bold)',
                padding: 'var(--spacing-1) var(--spacing-2-5)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
              }}
            >
              Ver {segundaVia ? '1ª Via' : '2ª Via'}
            </button>
          </div>
        )}

        {/* Visualizador de Cupom Térmico (simulação de papel térmico impresso) */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            backgroundColor: '#ffffff',
            color: '#0f172a',
            padding: 'var(--spacing-5)',
            borderRadius: 'var(--radius-md)',
            fontFamily: 'var(--font-family-mono)',
            fontSize: 'var(--font-size-xs)',
            border: '1px solid #cbd5e1',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-3)',
            lineHeight: 1.5,
          }}
        >
          <div style={{ textAlign: 'center', borderBottom: '1px solid #cbd5e1', paddingBottom: 'var(--spacing-2)' }}>
            <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>PIVETA DISTRIBUIDORA DE TINTAS AUTOMOTIVAS LTDA</div>
            <div style={{ fontSize: '0.6875rem' }}>CNPJ: 05.766.577/0001-22</div>
            <div style={{ fontSize: '0.625rem', color: '#475569' }}>RUA PRINCIPAL, 100 - SÃO PAULO / SP</div>
            <div style={{ fontWeight: 700, marginTop: '0.25rem', color: '#0f172a' }}>DANFE Simplificado - Tipo 2</div>
          </div>

          {isContingencia && (
            <div style={{ textAlign: 'center', fontWeight: 700, color: '#b45309', backgroundColor: '#fef3c7', padding: '0.375rem', borderRadius: '0.25rem', border: '1px solid #fde68a' }}>
              EMITIDA EM CONTINGÊNCIA<br />Pendente de autorização
            </div>
          )}
          {isHomologacao && !isContingencia && (
            <div style={{ textAlign: 'center', fontWeight: 700, color: '#dc2626', backgroundColor: '#fef2f2', padding: '0.375rem', borderRadius: '0.25rem', border: '1px solid #fecaca' }}>
              EMITIDA EM AMBIENTE DE HOMOLOGAÇÃO - SEM VALOR FISCAL
            </div>
          )}

          <div>
            <div style={{ fontWeight: 700, borderBottom: '1px solid #cbd5e1', paddingBottom: '0.25rem', marginBottom: '0.25rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem' }}>
              <span>CÓD DESCRIÇÃO</span>
              <span>QTD UN VL.UNIT VL.TOTAL</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>003277 TINTA AUTOMOTIVA SEYLER 900ML</span>
                <span>2 UN x 45,00 = 90,00</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>085273 VERNIZ PU PREMIUM 750ML</span>
                <span>1 UN x 60,74 = 60,74</span>
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.125rem', textAlign: 'right' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Qtde. total de itens:</span>
              <span style={{ fontWeight: 700 }}>2</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Valor total R$:</span>
              <span>150,74</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Desconto R$:</span>
              <span>10,00</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '0.875rem', color: '#0f172a', borderTop: '1px solid #e2e8f0', paddingTop: '0.125rem' }}>
              <span>Valor a Pagar R$:</span>
              <span>140,74</span>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '0.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.625rem', color: '#475569' }}>Consulte pela Chave de Acesso em</div>
            <div style={{ fontWeight: 700, fontSize: '0.625rem' }}>www.fazenda.sp.gov.br/nfe/consulta</div>
            <div style={{ fontSize: '0.625rem', letterSpacing: '0.05em', marginTop: '0.25rem', backgroundColor: '#f1f5f9', padding: '0.25rem', borderRadius: '0.25rem' }}>{chaveFormatada}</div>
          </div>

          <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '4.5rem', height: '4.5rem', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5625rem', textAlign: 'center', padding: '0.25rem' }}>
              [QR CODE 25x25mm]
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.625rem' }}>
              <div><span style={{ fontWeight: 700 }}>CONSUMIDOR:</span> CPF 000.000.000-00</div>
              <div>CONSUMIDOR FINAL VAREJO</div>
              <div style={{ fontWeight: 700 }}>
                NF-e nº {numeroNfe.toString().padStart(9, '0')} Série 001 14/08/2026 - {segundaVia ? 'Via Estabelecimento' : 'Via Consumidor'}
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '0.375rem', fontSize: '0.5625rem', color: '#64748b', textAlign: 'center' }}>
            Tributos Totais Incidentes (Lei Federal 12.741/2012): R$ 32,50
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid var(--border-default)',
            paddingTop: 'var(--spacing-4)',
            marginTop: 'var(--spacing-4)',
            gap: 'var(--spacing-3)',
          }}
        >
          <Button variant="secondary" onClick={onClose}>
            Fechar
          </Button>
          <Button onClick={handleImprimirTermica} isLoading={loading} leftIcon={<Printer size={16} />}>
            Imprimir Térmica (ESC/POS)
          </Button>
        </div>
      </div>
    </div>
  );
};
