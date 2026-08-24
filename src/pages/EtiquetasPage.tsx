import React, { useState } from 'react';
import {
  Printer,
  Barcode,
  CheckCircle,
  Sparkles,
  Tag,
  Copy,
  Eye,
  FileCode2,
} from 'lucide-react';
import { etiquetasService, ItemEtiquetaInput, LoteEtiquetasOutput } from '../lib/etiquetas';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { parseNumber } from '../lib/formatters';

export const EtiquetasPage: React.FC = () => {
  const [layout, setLayout] = useState<'GONDOLA' | 'VESTUARIO'>('GONDOLA');
  const [descricao, setDescricao] = useState('TENIS ADIDAS ULTRABOOST');
  const [sku, setSku] = useState('TENIS-ADI-40');
  const [ean, setEan] = useState('7891234567890');
  const [tamanho, setTamanho] = useState('40');
  const [cor, setCor] = useState('Preto');
  const [preco, setPreco] = useState(299.90);
  const [quantidade, setQuantidade] = useState(10);
  const [loteZpl, setLoteZpl] = useState<LoteEtiquetasOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleGerarLote = async () => {
    setLoading(true);
    try {
      const item: ItemEtiquetaInput = {
        codigo_sku: sku,
        codigo_barras: ean,
        descricao,
        tamanho,
        cor,
        preco_venda: preco,
        quantidade,
      };

      const res = await etiquetasService.processarLoteEtiquetasZpl(layout, [item]);
      setLoteZpl(res);
      showToast(`✅ Lote de ${res.total_etiquetas} etiquetas ZPL gerado!`);
    } catch (err: any) {
      showToast(`❌ Erro ao gerar etiquetas ZPL: ${err?.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopiarZpl = () => {
    if (!loteZpl) return;
    navigator.clipboard.writeText(loteZpl.zpl_raw);
    showToast('📋 ZPL copiado para a área de transferência!');
  };

  return (
    <div className="coliseu-page">
      {toastMessage && (
        <div className="coliseu-toast-container">
          <div className="coliseu-toast coliseu-toast--success">
            <CheckCircle style={{ width: '1.25rem', height: '1.25rem', color: 'var(--status-success)' }} />
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>{toastMessage}</span>
          </div>
        </div>
      )}

      <PageHeader
        title="Impressão de Etiquetas (ZPL / Pimaco)"
        subtitle="Gerador de etiquetas em tempo real para impressoras térmicas (Zebra, Argox, Elgin) e papel A4"
        icon={<Printer style={{ color: 'var(--text-link)', width: '1.5rem', height: '1.5rem' }} />}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 2fr)', gap: '1.5rem', marginTop: '1rem' }}>
        {/* Formulário de Configuração */}
        <div className="coliseu-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Tag style={{ width: '1.25rem', height: '1.25rem', color: 'var(--text-link)' }} />
            Configuração da Etiqueta
          </h2>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>Modelo de Layout</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setLayout('GONDOLA')}
                style={{
                  padding: '0.5rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  border: layout === 'GONDOLA' ? '1px solid var(--text-link)' : '1px solid var(--border-default)',
                  backgroundColor: layout === 'GONDOLA' ? 'rgba(var(--text-link-rgb), 0.15)' : 'var(--surface-1)',
                  color: layout === 'GONDOLA' ? 'var(--text-link)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                Gôndola (100×30mm)
              </button>
              <button
                type="button"
                onClick={() => setLayout('VESTUARIO')}
                style={{
                  padding: '0.5rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  border: layout === 'VESTUARIO' ? '1px solid var(--action-primary)' : '1px solid var(--border-default)',
                  backgroundColor: layout === 'VESTUARIO' ? 'rgba(var(--action-primary-rgb), 0.15)' : 'var(--surface-1)',
                  color: layout === 'VESTUARIO' ? 'var(--action-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                Roupa/Calçado (35×60mm)
              </button>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Descrição do Produto</label>
            <Input
              type="text"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Código SKU</label>
              <Input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>EAN / GTIN</label>
              <Input
                type="text"
                value={ean}
                onChange={(e) => setEan(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {layout === 'VESTUARIO' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Tamanho</label>
                <Input
                  type="text"
                  value={tamanho}
                  onChange={(e) => setTamanho(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Cor</label>
                <Input
                  type="text"
                  value={cor}
                  onChange={(e) => setCor(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Preço (R$)</label>
              <Input
                type="text"
                value={preco}
                onChange={(e) => setPreco(parseNumber(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Cópias</label>
              <Input
                type="number"
                value={quantidade}
                onChange={(e) => setQuantidade(parseInt(e.target.value) || 1)}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <Button
            onClick={handleGerarLote}
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}
          >
            <Sparkles style={{ width: '1rem', height: '1rem' }} />
            Gerar Lote de Etiquetas ZPL
          </Button>
        </div>

        {/* Pré-visualizador Gráfico */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="coliseu-card">
            <h2 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Eye style={{ width: '1rem', height: '1rem', color: 'var(--status-success)' }} />
              Pré-visualização da Etiqueta ({layout === 'GONDOLA' ? 'Gôndola Prateleira' : 'Tag Vestuário'})
            </h2>

            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem', backgroundColor: 'var(--surface-1)', borderRadius: '0.75rem', border: '1px solid var(--border-default)' }}>
              {layout === 'GONDOLA' ? (
                <div style={{ width: '340px', height: '120px', backgroundColor: '#ffffff', color: '#0f172a', borderRadius: '0.5rem', padding: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', border: '2px solid #cbd5e1' }}>
                  <div>
                    <h3 style={{ fontWeight: 700, fontSize: '0.875rem', textTransform: 'uppercase', color: '#0f172a', margin: 0 }}>{descricao}</h3>
                    <span style={{ fontSize: '0.625rem', fontFamily: 'monospace', color: '#475569' }}>SKU: {sku}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontFamily: 'monospace', fontSize: '0.75rem', color: '#1e293b' }}>
                      <Barcode style={{ width: '2rem', height: '2rem' }} />
                      <span>{ean}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.5625rem', color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Preço Un.</span>
                      <span style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'monospace', color: '#0f172a' }}>R$ {preco.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ width: '180px', height: '280px', backgroundColor: '#ffffff', color: '#0f172a', borderRadius: '0.5rem', padding: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', border: '2px solid #cbd5e1' }}>
                  <div>
                    <h3 style={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', color: '#0f172a', margin: 0 }}>{descricao}</h3>
                    <span style={{ fontSize: '0.625rem', fontFamily: 'monospace', color: '#475569', display: 'block', marginTop: '0.25rem' }}>SKU: {sku}</span>
                    <div style={{ marginTop: '0.5rem', backgroundColor: '#f1f5f9', padding: '0.375rem', borderRadius: '0.25rem', fontSize: '0.6875rem', fontWeight: 700, fontFamily: 'monospace', color: '#1e293b', display: 'flex', justifyContent: 'space-between' }}>
                      <span>TAM: {tamanho}</span>
                      <span>COR: {cor}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', margin: '0.5rem 0' }}>
                    <Barcode style={{ width: '3rem', height: '2rem', margin: '0 auto', color: '#1e293b' }} />
                    <span style={{ fontSize: '0.5625rem', fontFamily: 'monospace', color: '#475569' }}>{ean}</span>
                  </div>
                  <div style={{ textAlign: 'center', paddingTop: '0.5rem', borderTop: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.625rem', color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Preço R$</span>
                    <span style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'monospace', color: '#0f172a' }}>R$ {preco.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Saída ZPL Raw */}
          {loteZpl && (
            <div className="coliseu-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileCode2 style={{ width: '1rem', height: '1rem', color: 'var(--text-link)' }} />
                  Código ZPL Raw Gerado ({loteZpl.total_etiquetas} cópias)
                </h3>
                <Button onClick={handleCopiarZpl} style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <Copy style={{ width: '0.875rem', height: '0.875rem' }} />
                  Copiar ZPL
                </Button>
              </div>

              <textarea
                readOnly
                rows={6}
                value={loteZpl.zpl_raw}
                style={{
                  width: '100%',
                  backgroundColor: 'var(--surface-1)',
                  border: '1px solid var(--border-default)',
                  borderRadius: '0.75rem',
                  padding: '1rem',
                  fontSize: '0.75rem',
                  fontFamily: 'monospace',
                  color: 'var(--status-success)',
                  outline: 'none',
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
