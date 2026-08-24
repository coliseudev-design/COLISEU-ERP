import React, { useState } from 'react';
import {
  QrCode,
  FileText,
  CheckCircle,
  Sparkles,
  Copy,
} from 'lucide-react';
import { pixBoletoService, PixPayloadOutput, BoletoBancarioOutput } from '../lib/pix_boleto';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { parseNumber, formatCurrency } from '../lib/formatters';

export const PixBoletoPage: React.FC = () => {
  const [chavePix, setChavePix] = useState('12345678000195');
  const [merchantName, setMerchantName] = useState('LOJA VAREJO MODA SP');
  const [merchantCity, setMerchantCity] = useState('SAO PAULO');
  const [valorPix, setValorPix] = useState(150.00);
  const [pixPayload, setPixPayload] = useState<PixPayloadOutput | null>(null);

  const [banco, setBanco] = useState('001');
  const [nossoNumero, setNossoNumero] = useState('1234567890');
  const [valorBoleto, setValorBoleto] = useState(250.00);
  const [boletoOutput, setBoletoOutput] = useState<BoletoBancarioOutput | null>(null);

  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleGerarPix = async () => {
    setLoading(true);
    try {
      const res = await pixBoletoService.gerarPixDinamicoVenda(
        chavePix,
        merchantName,
        merchantCity,
        valorPix
      );
      setPixPayload(res);
      showToast('✅ Payload PIX Dinâmico gerado com sucesso!');
    } catch (err: any) {
      showToast(`❌ Erro ao gerar PIX: ${err?.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGerarBoleto = async () => {
    setLoading(true);
    try {
      const res = await pixBoletoService.gerarBoletoBancario(banco, nossoNumero, valorBoleto);
      setBoletoOutput(res);
      showToast('✅ Linha digitável do Boleto gerada com sucesso!');
    } catch (err: any) {
      showToast(`❌ Erro ao gerar Boleto: ${err?.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopiarTexto = (txt: string, label: string) => {
    navigator.clipboard.writeText(txt);
    showToast(`📋 ${label} copiado!`);
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
        title="Cobranças Eletrônicas — PIX Dinâmico & Boletos"
        subtitle="Integração de pagamentos instantâneos PIX para PDV e emissão de boletos bancários para crediário"
        icon={<QrCode style={{ color: '#10b981', width: '1.5rem', height: '1.5rem' }} />}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
        {/* Painel PIX Dinâmico */}
        <div className="coliseu-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <QrCode style={{ width: '1.25rem', height: '1.25rem', color: 'var(--status-success)' }} />
            Gerador PIX QR Code Dinâmico (PDV)
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Chave PIX (CNPJ/CPF/EVP)</label>
              <Input
                type="text"
                value={chavePix}
                onChange={(e) => setChavePix(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Nome do Recebedor</label>
                <Input
                  type="text"
                  value={merchantName}
                  onChange={(e) => setMerchantName(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Cidade</label>
                <Input
                  type="text"
                  value={merchantCity}
                  onChange={(e) => setMerchantCity(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Valor da Venda (R$)</label>
              <Input
                type="text"
                value={valorPix}
                onChange={(e) => setValorPix(parseNumber(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            <Button
              variant="success"
              onClick={handleGerarPix}
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}
            >
              <Sparkles style={{ width: '1rem', height: '1rem' }} />
              Gerar PIX Copia e Cola / QR Code
            </Button>
          </div>

          {pixPayload && (
            <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'var(--surface-1)', borderRadius: '0.75rem', border: '1px solid var(--border-default)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>TXID: {pixPayload.txid}</span>
                <span className="tabular-nums" style={{ color: 'var(--status-success)', fontWeight: 700 }}>{formatCurrency(pixPayload.valor)}</span>
              </div>

              <textarea
                readOnly
                rows={3}
                value={pixPayload.payload_emv}
                style={{
                  width: '100%',
                  backgroundColor: 'var(--surface-2)',
                  border: '1px solid var(--border-default)',
                  borderRadius: '0.5rem',
                  padding: '0.5rem',
                  fontSize: '0.6875rem',
                  fontFamily: 'monospace',
                  color: 'var(--status-success)',
                  outline: 'none',
                }}
              />

              <Button
                variant="secondary"
                onClick={() => handleCopiarTexto(pixPayload.payload_emv, 'PIX Copia e Cola')}
                style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem' }}
              >
                <Copy style={{ width: '0.875rem', height: '0.875rem' }} />
                Copiar Código PIX Copia e Cola
              </Button>
            </div>
          )}
        </div>

        {/* Painel Boletos Registrados */}
        <div className="coliseu-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText style={{ width: '1.25rem', height: '1.25rem', color: 'var(--action-primary)' }} />
            Emissão de Boleto Registrado
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Banco Emissor</label>
                <select
                  value={banco}
                  onChange={(e) => setBanco(e.target.value)}
                  style={{ width: '100%', backgroundColor: 'var(--surface-1)', border: '1px solid var(--border-default)', borderRadius: '0.5rem', padding: '0.5rem', fontSize: '0.75rem', color: 'var(--text-primary)' }}
                >
                  <option value="001">001 - Banco do Brasil</option>
                  <option value="341">341 - Itaú Unibanco</option>
                  <option value="237">237 - Bradesco</option>
                  <option value="033">033 - Santander</option>
                  <option value="756">756 - Sicoob</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Nosso Número</label>
                <Input
                  type="text"
                  value={nossoNumero}
                  onChange={(e) => setNossoNumero(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Valor do Boleto (R$)</label>
              <Input
                type="text"
                value={valorBoleto}
                onChange={(e) => setValorBoleto(parseNumber(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            <Button
              onClick={handleGerarBoleto}
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}
            >
              <FileText style={{ width: '1rem', height: '1rem' }} />
              Emitir Boleto & Linha Digitável
            </Button>
          </div>

          {boletoOutput && (
            <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'var(--surface-1)', borderRadius: '0.75rem', border: '1px solid var(--border-default)', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontFamily: 'monospace', fontSize: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>Doc: #{boletoOutput.numero_documento}</span>
                <span className="tabular-nums" style={{ color: 'var(--action-primary)', fontWeight: 700 }}>{formatCurrency(boletoOutput.valor)}</span>
              </div>

              <div>
                <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)', display: 'block' }}>Linha Digitável:</span>
                <span className="tabular-nums" style={{ color: 'var(--status-success)', fontWeight: 700, display: 'block', backgroundColor: 'var(--surface-2)', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--border-default)', userSelect: 'all' }}>
                  {boletoOutput.linha_digitavel}
                </span>
              </div>

              <Button
                variant="secondary"
                onClick={() => handleCopiarTexto(boletoOutput.linha_digitavel, 'Linha Digitável')}
                style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem' }}
              >
                <Copy style={{ width: '0.875rem', height: '0.875rem' }} />
                Copiar Linha Digitável
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
