import React, { useState, useRef } from 'react';
import { Button } from '../ui/Button';
import { ShieldCheck, Key, Upload, X, CheckCircle2, AlertTriangle, Loader2, FileText } from 'lucide-react';
import { fiscalCloudService, CertificadoA1Status } from '../../lib/fiscalCloudService';

interface ModalUploadCertificadoVpsProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (status: CertificadoA1Status) => void;
}

export const ModalUploadCertificadoVps: React.FC<ModalUploadCertificadoVpsProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [alias, setAlias] = useState('Certificado Digital A1 Matriz');
  const [password, setPassword] = useState('');
  const [fileName, setFileName] = useState('');
  const [pfxBase64, setPfxBase64] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pfx') && !file.name.toLowerCase().endsWith('.p12')) {
      setErrorMsg('⚠️ Selecione um arquivo de certificado válido com extensão .PFX ou .P12');
      return;
    }

    setErrorMsg(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] || result;
      setPfxBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleSalvarCertificado = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pfxBase64) {
      setErrorMsg('⚠️ Por favor selecione o arquivo .PFX do certificado digital.');
      return;
    }
    if (!password) {
      setErrorMsg('⚠️ Por favor digite a senha do certificado digital.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fiscalCloudService.uploadCertificadoA1({
        alias: alias.trim() || 'Certificado Digital A1',
        pfxBase64,
        password,
        empresaId: 'emp-matriz-001',
      });

      if (res.success) {
        const novoStatus = await fiscalCloudService.getCertificadoStatus();
        onSuccess(novoStatus);
        onClose();
      } else {
        setErrorMsg(res.message || 'Falha ao salvar o certificado.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro de comunicação ao enviar o certificado.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(3px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--surface-1)',
          borderRadius: '12px',
          border: '1px solid var(--border-default)',
          width: '100%',
          maxWidth: '540px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
          overflow: 'hidden',
        }}
      >
        {/* Header do Modal */}
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: 'var(--surface-2)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#10b981',
              }}
            >
              <ShieldCheck size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
                Cofre de Certificados A1 na VPS
              </h3>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Upload Seguro Criptografado com Chave Militar AES-256
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSalvarCertificado} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {errorMsg && (
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '6px',
                fontSize: '12px',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertTriangle size={15} flexShrink={0} />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="coliseu-label" style={{ marginBottom: '6px' }}>Identificação / Razão Social do Certificado:</label>
            <input
              type="text"
              required
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              placeholder="Ex: PIVETA DISTRIBUIDORA DE TINTAS LTDA"
              className="coliseu-input"
              style={{ height: '36px', fontWeight: 700 }}
            />
          </div>

          <div>
            <label className="coliseu-label" style={{ marginBottom: '6px' }}>Arquivo do Certificado Digital (.PFX ou .P12):</label>
            <input
              type="file"
              ref={fileInputRef}
              accept=".pfx,.p12"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed var(--border-default)',
                borderRadius: '8px',
                padding: '16px',
                textAlign: 'center',
                cursor: 'pointer',
                backgroundColor: fileName ? 'rgba(16, 185, 129, 0.05)' : 'var(--surface-2)',
                borderColor: fileName ? '#10b981' : undefined,
                transition: 'all 0.2s',
              }}
            >
              {fileName ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#10b981' }}>
                  <FileText size={18} />
                  <span style={{ fontSize: '13px', fontWeight: 700 }}>{fileName}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>(Clique para trocar)</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <Upload size={22} color="#3b82f6" />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Clique para selecionar o arquivo .PFX
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Formatos aceitos: ICP-Brasil A1 (.pfx ou .p12)
                  </span>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="coliseu-label" style={{ marginBottom: '6px' }}>Senha do Certificado Digital A1:</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite a senha do certificado"
                className="coliseu-input"
                style={{ height: '36px', paddingLeft: '32px', fontWeight: 700 }}
              />
              <Key size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '11px' }} />
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
              🔒 A senha será salva com criptografia AES-256 no banco de dados e usada exclusivamente para assinar os XMLs no servidor.
            </span>
          </div>

          {/* Botões de Ação */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', paddingTop: '14px', borderTop: '1px solid var(--border-subtle)' }}>
            <Button variant="secondary" type="button" onClick={onClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={isLoading || !pfxBase64 || !password}
              leftIcon={isLoading ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
              style={{ backgroundColor: '#10b981' }}
            >
              {isLoading ? 'Protegendo & Salvando na VPS...' : 'Salvar no Cofre da VPS'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
