import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { ShieldCheck, Upload, Key, Server, Save, CheckCircle2, X, AlertCircle } from 'lucide-react';
import {
  CertificadoA1Config,
  getCertificadoConfig,
  salvarCertificadoConfig,
} from '../../lib/certificadoA1';

interface ModalConfiguracaoCertificadoProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ModalConfiguracaoCertificado: React.FC<ModalConfiguracaoCertificadoProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [config, setConfig] = useState<CertificadoA1Config>(getCertificadoConfig);
  const [senhaCert, setSenhaCert] = useState('********');
  const [nomeArquivo, setNomeArquivo] = useState('certificado_a1_2026.pfx');

  if (!isOpen) return null;

  const handleSalvar = (e: React.FormEvent) => {
    e.preventDefault();
    salvarCertificadoConfig(config);
    onSuccess();
    onClose();
  };

  const handleSimularUpload = () => {
    setConfig((prev) => ({
      ...prev,
      instalado: true,
      nomeTitular: 'COLISEU MATERIAIS & DISTRIBUICAO LTDA',
      cnpjTitular: '12.345.678/0001-90',
      emissor: 'AC SERASA RFB v5 (ICP-BRASIL)',
      validadeInicio: '01/01/2026',
      validadeFim: '01/01/2027',
      diasRestantes: 136,
      senhaSalva: true,
    }));
    setNomeArquivo('certificado_coliseu_a1.pfx');
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(4px)',
        zIndex: 11000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '680px',
          backgroundColor: 'var(--surface-1)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={20} color="#3b82f6" />
            <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Certificado Digital A1 & Configurações SEFAZ (DF-e)
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

        {/* Form Body */}
        <form onSubmit={handleSalvar} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Card Status do Certificado A1 */}
          <div
            style={{
              padding: '14px',
              backgroundColor: config.instalado ? 'rgba(16, 185, 129, 0.06)' : 'rgba(239, 68, 68, 0.06)',
              border: `1px solid ${config.instalado ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Key size={16} color={config.instalado ? '#10b981' : '#ef4444'} />
                <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                  {config.instalado ? 'Certificado A1 Válido e Ativo' : 'Nenhum Certificado Instalado'}
                </strong>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#10b981' }}>
                {config.diasRestantes} dias para expirar
              </span>
            </div>

            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              <div><strong>Titular:</strong> {config.nomeTitular} ({config.cnpjTitular})</div>
              <div><strong>Autoridade Emissora:</strong> {config.emissor}</div>
              <div><strong>Validade:</strong> {config.validadeInicio} até {config.validadeFim}</div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '6px', alignItems: 'center' }}>
              <Button type="button" variant="secondary" size="sm" onClick={handleSimularUpload} leftIcon={<Upload size={14} />}>
                Atualizar Arquivo .PFX
              </Button>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{nomeArquivo}</span>
            </div>
          </div>

          {/* Ambiente & CSC Token */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label className="coliseu-label">Ambiente de Emissão SEFAZ *</label>
              <select
                className="coliseu-input"
                value={config.ambiente}
                onChange={(e) => setConfig({ ...config, ambiente: e.target.value as any })}
                style={{ height: '38px', width: '100%', fontWeight: 700 }}
              >
                <option value="HOMOLOGACAO">HOMOLOGAÇÃO (Testes / Sem Valor Fiscal)</option>
                <option value="PRODUCAO">PRODUÇÃO (Oficial com Validade Jurídica)</option>
              </select>
            </div>

            <div>
              <label className="coliseu-label">RNTRC da Empresa (ANTT / MDF-e)</label>
              <input
                type="text"
                className="coliseu-input"
                value={config.rntrcEmpresa || ''}
                onChange={(e) => setConfig({ ...config, rntrcEmpresa: e.target.value })}
                placeholder="Ex: 09812345"
                style={{ height: '38px', width: '100%' }}
              />
            </div>
          </div>

          {/* Séries e Numerações dos Documentos Fiscais */}
          <div
            style={{
              padding: '12px',
              backgroundColor: 'var(--surface-2)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Séries e Próximos Números dos Documentos Fiscais
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              {/* NF-e */}
              <div style={{ border: '1px solid var(--border-default)', padding: '8px', borderRadius: '4px', backgroundColor: 'var(--surface-1)' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#3b82f6' }}>NF-e (Mod. 55)</div>
                <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                  <div>
                    <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Série</label>
                    <input
                      type="number"
                      value={config.nfeSerie}
                      onChange={(e) => setConfig({ ...config, nfeSerie: parseInt(e.target.value, 10) || 1 })}
                      className="coliseu-input"
                      style={{ height: '28px', width: '50px', textAlign: 'center' }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Último Nº</label>
                    <input
                      type="number"
                      value={config.nfeNumeroAtual}
                      onChange={(e) => setConfig({ ...config, nfeNumeroAtual: parseInt(e.target.value, 10) || 1 })}
                      className="coliseu-input"
                      style={{ height: '28px', width: '100%', textAlign: 'right', fontWeight: 700 }}
                    />
                  </div>
                </div>
              </div>

              {/* NFC-e */}
              <div style={{ border: '1px solid var(--border-default)', padding: '8px', borderRadius: '4px', backgroundColor: 'var(--surface-1)' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#10b981' }}>NFC-e (Mod. 65)</div>
                <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                  <div>
                    <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Série</label>
                    <input
                      type="number"
                      value={config.nfceSerie}
                      onChange={(e) => setConfig({ ...config, nfceSerie: parseInt(e.target.value, 10) || 1 })}
                      className="coliseu-input"
                      style={{ height: '28px', width: '50px', textAlign: 'center' }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Último Nº</label>
                    <input
                      type="number"
                      value={config.nfceNumeroAtual}
                      onChange={(e) => setConfig({ ...config, nfceNumeroAtual: parseInt(e.target.value, 10) || 1 })}
                      className="coliseu-input"
                      style={{ height: '28px', width: '100%', textAlign: 'right', fontWeight: 700 }}
                    />
                  </div>
                </div>
              </div>

              {/* MDF-e */}
              <div style={{ border: '1px solid var(--border-default)', padding: '8px', borderRadius: '4px', backgroundColor: 'var(--surface-1)' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#f59e0b' }}>MDF-e (Mod. 58)</div>
                <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                  <div>
                    <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Série</label>
                    <input
                      type="number"
                      value={config.mdfeSerie}
                      onChange={(e) => setConfig({ ...config, mdfeSerie: parseInt(e.target.value, 10) || 1 })}
                      className="coliseu-input"
                      style={{ height: '28px', width: '50px', textAlign: 'center' }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Último Nº</label>
                    <input
                      type="number"
                      value={config.mdfeNumeroAtual}
                      onChange={(e) => setConfig({ ...config, mdfeNumeroAtual: parseInt(e.target.value, 10) || 1 })}
                      className="coliseu-input"
                      style={{ height: '28px', width: '100%', textAlign: 'right', fontWeight: 700 }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CSC para NFC-e (QR Code) */}
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px' }}>
            <div>
              <label className="coliseu-label">IdCSC (SEFAZ)</label>
              <input
                type="text"
                className="coliseu-input"
                value={config.nfceIdCsc}
                onChange={(e) => setConfig({ ...config, nfceIdCsc: e.target.value })}
                placeholder="000001"
                style={{ height: '38px', width: '100%', textAlign: 'center' }}
              />
            </div>
            <div>
              <label className="coliseu-label">Token CSC (Código de Segurança do Contribuinte)</label>
              <input
                type="text"
                className="coliseu-input"
                value={config.nfceCscToken}
                onChange={(e) => setConfig({ ...config, nfceCscToken: e.target.value })}
                placeholder="Ex: 9B8A7C6D5E4F3A2B1C0D9E8F7A6B5C4D"
                style={{ height: '38px', width: '100%', fontFamily: 'monospace' }}
              />
            </div>
          </div>

          {/* Botões de Ação */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px', borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" leftIcon={<Save size={16} />}>
              Salvar Configurações SEFAZ
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
