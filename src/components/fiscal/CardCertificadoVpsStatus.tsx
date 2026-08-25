import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { ShieldCheck, Upload, AlertTriangle, CheckCircle2, Lock, RefreshCw } from 'lucide-react';
import { fiscalCloudService, CertificadoA1Status } from '../../lib/fiscalCloudService';
import { ModalUploadCertificadoVps } from './ModalUploadCertificadoVps';
import { formatDate } from '../../lib/formatters';

interface CardCertificadoVpsStatusProps {
  empresaId?: string;
  onCertificateUpdated?: (status: CertificadoA1Status) => void;
}

export const CardCertificadoVpsStatus: React.FC<CardCertificadoVpsStatusProps> = ({
  empresaId = 'emp-matriz-001',
  onCertificateUpdated,
}) => {
  const [status, setStatus] = useState<CertificadoA1Status>({ instalado: false });
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const carregarStatus = async () => {
    setIsLoading(true);
    try {
      const data = await fiscalCloudService.getCertificadoStatus(empresaId);
      setStatus(data);
      if (onCertificateUpdated) onCertificateUpdated(data);
    } catch {
      setStatus({ instalado: false });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    carregarStatus();
  }, [empresaId]);

  const cert = status.certificado;

  return (
    <>
      <div
        style={{
          padding: '12px 16px',
          backgroundColor: status.instalado ? 'rgba(16, 185, 129, 0.08)' : 'rgba(234, 179, 8, 0.08)',
          border: `1px solid ${status.instalado ? 'rgba(16, 185, 129, 0.4)' : 'rgba(234, 179, 8, 0.4)'}`,
          borderRadius: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: status.instalado ? 'rgba(16, 185, 129, 0.2)' : 'rgba(234, 179, 8, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: status.instalado ? '#10b981' : '#eab308',
              flexShrink: 0,
            }}
          >
            {status.instalado ? <ShieldCheck size={20} /> : <AlertTriangle size={20} />}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 800, color: status.instalado ? '#10b981' : '#eab308' }}>
                {status.instalado
                  ? '🔒 COFRE CENTRAL VPS: CERTIFICADO DIGITAL A1 ATIVO (AES-256)'
                  : '⚠️ NENHUM CERTIFICADO DIGITAL A1 ATIVO NO SERVIDOR CENTRAL'}
              </span>
              {status.instalado && cert && (
                <span
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '10px',
                    backgroundColor: cert.expirado ? '#ef4444' : '#10b981',
                    color: '#fff',
                  }}
                >
                  {cert.expirado ? 'EXPIRADO' : `${cert.diasRestantes} dias restantes`}
                </span>
              )}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {status.instalado && cert ? (
                <>
                  Titular: <strong>{cert.nome_titular || cert.alias}</strong> | CNPJ: <strong>{cert.cnpj || '05.766.577/0001-22'}</strong> | Validade:{' '}
                  <strong>{formatDate(cert.validade_fim)}</strong>
                </>
              ) : (
                'Envie o arquivo .PFX e a senha para habilitar a assinatura e transmissão direta pela nuvem a partir de qualquer máquina.'
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={carregarStatus}
            disabled={isLoading}
            title="Atualizar status do certificado na VPS"
            style={{ height: '30px', padding: '0 10px' }}
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            leftIcon={<Upload size={13} />}
            style={{ height: '30px', fontSize: '11.5px', fontWeight: 700, backgroundColor: '#10b981' }}
          >
            {status.instalado ? 'Atualizar Certificado A1 (.PFX)' : 'Enviar Certificado A1 (.PFX)'}
          </Button>
        </div>
      </div>

      <ModalUploadCertificadoVps
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(novoStatus) => {
          setStatus(novoStatus);
          if (onCertificateUpdated) onCertificateUpdated(novoStatus);
        }}
      />
    </>
  );
};
