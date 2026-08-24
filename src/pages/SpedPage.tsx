import React, { useState } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { AIInsight } from '../components/ui/AIComponents';
import { FileText, Download, CheckCircle, AlertTriangle, Wrench, Check } from 'lucide-react';

export const SpedPage: React.FC = () => {
  const [pendencias, setPendencias] = useState([
    {
      id: 'ERR-001',
      documento: 'NF-e 000.001.294',
      descricao: 'NCM 22021000 sem alíquota de ICMS configurada para operação interestadual.',
      acaoSugerida: 'Atualizar Matriz Tributária para NCM 22021000',
    },
    {
      id: 'ERR-002',
      documento: 'NFC-e 000.005.812',
      descricao: 'CPF do destinatário com formatação inválida no Registro C170.',
      acaoSugerida: 'Sanitizar máscara de CPF no cadastro do cliente',
    },
  ]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleCorrigirDocumento = (errId: string, doc: string) => {
    setPendencias((prev) => prev.filter((p) => p.id !== errId));
    showToast(`✅ Inconsistência ${errId} no documento ${doc} foi corrigida e revalidada!`);
  };

  const handleGerarSped = () => {
    showToast('📄 Arquivo SPED Fiscal EFD (08/2026.txt) gerado e pronto para validação no PVA!');
  };

  return (
    <div className="coliseu-page">
      {toastMessage && (
        <div className="coliseu-toast-container">
          <div className="coliseu-toast coliseu-toast--success">
            <Check style={{ width: '1.25rem', height: '1.25rem', color: 'var(--status-success)' }} aria-hidden="true" />
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{toastMessage}</span>
          </div>
        </div>
      )}

      <PageHeader
        title="SPED Fiscal EFD & Obrigações Acessórias"
        subtitle="Geração de arquivos magnéticos do SPED Fiscal (ICMS/IPI) com auditoria de registros antes da transmissão ao PVA."
        breadcrumbItems={[
          { label: 'Fiscal', active: false },
          { label: 'SPED Fiscal EFD', active: true },
        ]}
        primaryAction={{
          label: 'Gerar SPED EFD (08/2026)',
          onClick: handleGerarSped,
          icon: <Download size={14} aria-hidden="true" />,
        }}
      />

      <div className="coliseu-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-default)', paddingBottom: '12px' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText style={{ width: '1.25rem', height: '1.25rem', color: 'var(--action-primary)' }} aria-hidden="true" />
            Auditoria Prévia do Arquivo SPED
          </h2>
          <span style={{ fontSize: '11px', color: 'var(--status-success)', display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'monospace', fontWeight: 700 }}>
            <CheckCircle size={14} aria-hidden="true" /> Validação SEFAZ 100% OK
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {pendencias.map((p) => (
            <div
              key={p.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'var(--surface-app)',
                padding: '12px 16px',
                border: '1px solid var(--border-default)',
                borderRadius: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <AlertTriangle size={18} color="var(--status-danger)" aria-hidden="true" />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '13px' }}>{p.documento}</span>
                    <span style={{ fontSize: '11px', color: 'var(--status-danger)', fontWeight: 600 }}>({p.id})</span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0' }}>{p.descricao}</p>
                  <span style={{ fontSize: '11px', color: 'var(--action-primary)' }}><strong>Ação Sugerida:</strong> {p.acaoSugerida}</span>
                </div>
              </div>

              <Button
                variant="primary"
                size="sm"
                leftIcon={<Wrench size={12} aria-hidden="true" />}
                onClick={() => handleCorrigirDocumento(p.id, p.documento)}
              >
                Corrigir Documento
              </Button>
            </div>
          ))}

          {pendencias.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--status-success)', fontSize: '0.875rem', fontWeight: 600 }}>
              🎉 Nenhuma inconsistência encontrada! Arquivo SPED EFD totalmente limpo.
            </div>
          )}
        </div>
      </div>

      <AIInsight
        title="Diagnóstico do Motor SPED"
        description="Arquivo do período 08/2026 validado com 100% de integridade no Bloco C (Documentos Fiscais I - Mercadorias). Pronto para transmissão ao PVA."
      />
    </div>
  );
};

