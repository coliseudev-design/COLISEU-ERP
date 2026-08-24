import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { FileEdit, XCircle, CheckCircle2, X, AlertTriangle } from 'lucide-react';
import {
  DocumentoFiscalItem,
  emitirCartaCorrecao,
  cancelarDocumentoFiscal,
  encerrarMDFe,
} from '../../lib/dfe';

interface ModalCartaCorrecaoProps {
  isOpen: boolean;
  onClose: () => void;
  tipoAcao: 'CARTA_CORRECAO' | 'CANCELAMENTO' | 'ENCERRAMENTO_MDFE';
  doc: DocumentoFiscalItem | null;
  onSuccess: (doc: DocumentoFiscalItem) => void;
}

export const ModalCartaCorrecao: React.FC<ModalCartaCorrecaoProps> = ({
  isOpen,
  onClose,
  tipoAcao,
  doc,
  onSuccess,
}) => {
  const [texto, setTexto] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen || !doc) return null;

  const handleExecutar = (e: React.FormEvent) => {
    e.preventDefault();
    if (tipoAcao !== 'ENCERRAMENTO_MDFE' && texto.trim().length < 15) {
      alert('O texto explicativo deve ter no mínimo 15 caracteres.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      let atualizado: DocumentoFiscalItem | null = null;

      if (tipoAcao === 'CARTA_CORRECAO') {
        atualizado = emitirCartaCorrecao(doc.id, texto);
      } else if (tipoAcao === 'CANCELAMENTO') {
        atualizado = cancelarDocumentoFiscal(doc.id, texto);
      } else if (tipoAcao === 'ENCERRAMENTO_MDFE') {
        atualizado = encerrarMDFe(doc.id);
      }

      if (atualizado) {
        onSuccess(atualizado);
      }
      onClose();
    }, 1000);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
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
          maxWidth: '560px',
          backgroundColor: 'var(--surface-1)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {tipoAcao === 'CARTA_CORRECAO' && <FileEdit size={18} color="#3b82f6" />}
            {tipoAcao === 'CANCELAMENTO' && <XCircle size={18} color="#ef4444" />}
            {tipoAcao === 'ENCERRAMENTO_MDFE' && <CheckCircle2 size={18} color="#10b981" />}
            <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {tipoAcao === 'CARTA_CORRECAO'
                ? `Carta de Correção Eletrônica (CC-e) — ${doc.numero}`
                : tipoAcao === 'CANCELAMENTO'
                ? `Cancelar Documento Fiscal — ${doc.numero}`
                : `Encerrar MDF-e — ${doc.numero}`}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleExecutar} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            <div><strong>Chave de Acesso:</strong> <span className="text-mono">{doc.chaveAcesso}</span></div>
            <div><strong>Destinatário:</strong> {doc.destinatarioNome}</div>
          </div>

          {tipoAcao === 'CARTA_CORRECAO' && (
            <div>
              <label className="coliseu-label">
                Texto de Retificação da CC-e (Mínimo 15 caracteres) *
              </label>
              <textarea
                className="coliseu-input"
                rows={4}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Ex: CORREÇÃO DO ENDEREÇO DE ENTREGA DO DESTINATÁRIO PARA RUA DAS FLORES, 1500..."
                style={{ width: '100%', resize: 'none', padding: '10px', textTransform: 'uppercase' }}
                required
              />
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                ⚠️ A Carta de Correção não pode alterar valores fiscais, datas ou alíquotas de impostos (Art. 58-B do Convênio SINIEF 06/89).
              </div>
            </div>
          )}

          {tipoAcao === 'CANCELAMENTO' && (
            <div>
              <label className="coliseu-label">
                Justificativa do Cancelamento (Mínimo 15 caracteres) *
              </label>
              <textarea
                className="coliseu-input"
                rows={3}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Ex: CANCELAMENTO DEVIDO A DESISTÊNCIA DA COMPRA PELO CLIENTE ANTES DO EMBARQUE..."
                style={{ width: '100%', resize: 'none', padding: '10px', textTransform: 'uppercase' }}
                required
              />
            </div>
          )}

          {tipoAcao === 'ENCERRAMENTO_MDFE' && (
            <div style={{ padding: '12px', backgroundColor: 'rgba(16, 185, 129, 0.08)', borderRadius: '6px', fontSize: '12px', lineHeight: 1.5 }}>
              O encerramento do MDF-e comunica à SEFAZ que a carga foi descarregada com sucesso no destino ({doc.dadosMdfe?.municipioDescarregamento}/{doc.dadosMdfe?.ufDescarregamento}), liberando o veículo ({doc.dadosMdfe?.placaVeiculo}) para emissão de novos manifestos.
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
            <Button variant="secondary" type="button" onClick={onClose} disabled={isLoading}>
              Voltar
            </Button>
            <Button
              variant={tipoAcao === 'CANCELAMENTO' ? 'primary' : 'primary'}
              type="submit"
              disabled={isLoading}
              style={{
                backgroundColor: tipoAcao === 'CANCELAMENTO' ? '#ef4444' : undefined,
                borderColor: tipoAcao === 'CANCELAMENTO' ? '#ef4444' : undefined,
              }}
            >
              {isLoading
                ? 'Transmitindo Evento...'
                : tipoAcao === 'CARTA_CORRECAO'
                ? 'Transmitir CC-e para SEFAZ'
                : tipoAcao === 'CANCELAMENTO'
                ? 'Confirmar Cancelamento'
                : 'Confirmar Encerramento do MDF-e'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
