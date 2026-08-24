import React, { useState } from 'react';
import {
  Building2,
  Upload,
  CheckCircle,
  RefreshCw,
  FileText,
  Boxes,
} from 'lucide-react';
import { financeService, ResultadoConciliacaoOfx } from '../lib/finance';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';

const DEMO_OFX_SAMPLE = `OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<TRNUID>1001
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<STMTRS>
<CURDEF>BRL
<BANKACCTFROM>
<BANKID>0341
<ACCTID>99201-4
<ACCTTYPE>CHECKING
</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>20260801
<DTEND>20260813
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260805
<TRNAMT>-150.00
<FITID>OFX-20260805-001
<MEMO>PAGTO FORNECEDOR CAFE SP
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260810
<TRNAMT>450.00
<FITID>OFX-20260810-002
<MEMO>RECEBIMENTO CLIENTE VENDA PDV
</STMTTRN>
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;

export const OfxPage: React.FC = () => {
  const [ofxContent, setOfxContent] = useState(DEMO_OFX_SAMPLE);
  const [resultado, setResultado] = useState<ResultadoConciliacaoOfx | null>(null);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleImportarOfx = async () => {
    setLoading(true);
    try {
      const res = await financeService.importarExtratoOfx('fil1', ofxContent);
      setResultado(res);
      showToast(`✅ Extrato OFX importado! ${res.conciliados_automaticamente} transações conciliadas automaticamente.`);
    } catch (err: any) {
      showToast(`❌ Erro ao importar OFX: ${err?.message || 'Falha IPC'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="coliseu-page">
      {toastMessage && (
        <div className="coliseu-toast-container">
          <div className={`coliseu-toast coliseu-toast--${toastMessage.includes('❌') ? 'danger' : 'success'}`}>
            <CheckCircle style={{ width: '1.25rem', height: '1.25rem' }} />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      <PageHeader
        title="Conciliação Bancária & Importador OFX"
        subtitle="Importação de extratos bancários digitais com batimento automático de lançamentos financeiros"
        icon={<Building2 style={{ color: 'var(--action-primary)', width: '1.5rem', height: '1.5rem' }} />}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '1.5rem', marginTop: '1rem' }}>
        <div className="coliseu-card">
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Upload style={{ width: '1.25rem', height: '1.25rem', color: 'var(--action-primary)' }} />
            Conteúdo do Arquivo .OFX Bancário
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <textarea
              rows={12}
              value={ofxContent}
              onChange={(e) => setOfxContent(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: 'var(--surface-1)',
                border: '1px solid var(--border-default)',
                borderRadius: '0.75rem',
                padding: '1rem',
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
              placeholder="Cole aqui o conteúdo XML/SGML do arquivo .OFX baixado do Internet Banking..."
            />

            <Button
              onClick={handleImportarOfx}
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem' }}
            >
              <RefreshCw style={{ width: '1rem', height: '1rem' }} />
              {loading ? 'Processando & Conciliando...' : 'Processar Extrato & Executar Conciliação Automática'}
            </Button>
          </div>
        </div>

        {/* Resumo da Conciliação */}
        <div className="coliseu-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Boxes style={{ width: '1.25rem', height: '1.25rem', color: 'var(--status-success)' }} />
              Resultado da Conciliação
            </h2>

            {resultado ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                <div style={{ backgroundColor: 'var(--surface-1)', border: '1px solid var(--border-default)', borderRadius: '0.75rem', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-default)', paddingBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Total Transações OFX:</span>
                    <span className="tabular-nums" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{resultado.total_processados}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-default)', paddingBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Conciliados Automáticos:</span>
                    <span className="tabular-nums" style={{ color: 'var(--status-success)', fontWeight: 700 }}>{resultado.conciliados_automaticamente}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Pendentes de Ajuste:</span>
                    <span className="tabular-nums" style={{ color: 'var(--status-warning)', fontWeight: 700 }}>{resultado.pendentes}</span>
                  </div>
                </div>

                <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '0.75rem', padding: '1rem', color: 'var(--status-success)', fontSize: '0.75rem', fontFamily: 'Inter, system-ui, sans-serif' }}>
                   Lançamentos validados deram baixa automática e atualizaram o status para <b>PAGO</b>.
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                <FileText style={{ width: '2.5rem', height: '2.5rem', color: 'var(--text-secondary)' }} />
                <p style={{ fontSize: '0.75rem', margin: 0 }}>Cole ou carregue um arquivo OFX para visualizar o batimento do extrato.</p>
              </div>
            )}
          </div>

          <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-default)', fontSize: '0.6875rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
            Registros gravados na tabela `ofx_extratos` com vínculo por FITID único.
          </div>
        </div>
      </div>
    </div>
  );
};
