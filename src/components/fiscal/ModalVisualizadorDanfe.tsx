import React from 'react';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../lib/formatters';
import { Printer, X, FileText, QrCode, Truck, CheckCircle2 } from 'lucide-react';
import { DocumentoFiscalItem } from '../../lib/dfe';

interface ModalVisualizadorDanfeProps {
  isOpen: boolean;
  onClose: () => void;
  doc: DocumentoFiscalItem | null;
}

export const ModalVisualizadorDanfe: React.FC<ModalVisualizadorDanfeProps> = ({
  isOpen,
  onClose,
  doc,
}) => {
  if (!isOpen || !doc) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
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
          maxWidth: doc.modelo === '65_NFCE' ? '460px' : '880px',
          maxHeight: '94vh',
          backgroundColor: '#ffffff',
          color: '#111827',
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
          overflow: 'hidden',
        }}
      >
        {/* Barra Superior */}
        <div
          style={{
            padding: '12px 20px',
            backgroundColor: '#1f2937',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 600 }}>
            {doc.modelo === '55_NFE' && `DANFE — NF-e Nº ${doc.numero} (Série ${doc.serie})`}
            {doc.modelo === '65_NFCE' && `DANFE NFC-e — Cupom Nº ${doc.numero}`}
            {doc.modelo === '58_MDFE' && `DAMDFE — Manifesto de Carga Nº ${doc.numero}`}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              variant="primary"
              size="sm"
              onClick={() => window.print()}
              leftIcon={<Printer size={15} />}
            >
              Imprimir (Ctrl + P)
            </Button>
            <button
              type="button"
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ÁREA DO DOCUMENTO FISCAL */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: doc.modelo === '65_NFCE' ? '20px 24px' : '26px',
            fontFamily: 'Arial, sans-serif',
            fontSize: '11px',
            lineHeight: 1.35,
          }}
        >
          {/* ========================================================= */}
          {/* 1. MODELO 55: DANFE NF-e RETRATO A4                     */}
          {/* ========================================================= */}
          {doc.modelo === '55_NFE' && (
            <div>
              {/* Header com Canhoto */}
              <div style={{ border: '1px solid #000', padding: '6px', marginBottom: '8px', fontSize: '9px' }}>
                RECEBEMOS DE COLISEU MATERIAIS & DISTRIBUICAO LTDA OS PRODUTOS CONSTANTES DA NOTA FISCAL INDICADA AO LADO.
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', borderTop: '1px dashed #999', paddingTop: '4px' }}>
                  <span>DATA DE RECEBIMENTO: _____/_____/_________</span>
                  <span>IDENTIFICAÇÃO E ASSINATURA DO RECEBEDOR: _____________________________________________</span>
                  <strong>NF-e Nº {doc.numero}</strong>
                </div>
              </div>

              {/* Cabeçalho DANFE */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr 1.8fr', border: '1px solid #000', padding: '8px', marginBottom: '8px' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '13px', fontWeight: 'bold' }}>COLISEU MATERIAIS & DISTRIBUICAO LTDA</h2>
                  <div>AV. MARCELINO PIRES, 1250 - CENTRO</div>
                  <div>DOURADOS - MS - CEP: 79800-000</div>
                  <div>TEL: (67) 3421-0000</div>
                </div>

                <div style={{ textAlign: 'center', borderLeft: '1px solid #000', borderRight: '1px solid #000', padding: '0 8px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 'bold' }}>DANFE</div>
                  <div style={{ fontSize: '9px' }}>DOCUMENTO AUXILIAR DA NOTA FISCAL ELETRÔNICA</div>
                  <div style={{ marginTop: '4px', fontSize: '10px' }}>0 - ENTRADA<br /><strong>1 - SAÍDA (1)</strong></div>
                  <div style={{ marginTop: '4px', fontWeight: 'bold' }}>Nº {doc.numero} • SÉRIE {doc.serie}</div>
                </div>

                <div style={{ paddingLeft: '8px', fontSize: '10px' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '9px' }}>CHAVE DE ACESSO:</div>
                  <div className="text-mono" style={{ fontSize: '10px', wordBreak: 'break-all', fontWeight: 'bold' }}>
                    {doc.chaveAcesso}
                  </div>
                  <div style={{ marginTop: '6px', fontSize: '9px' }}>
                    Consulta de autenticidade no portal nacional da NF-e www.nfe.fazenda.gov.br
                  </div>
                  <div style={{ marginTop: '4px', fontWeight: 'bold', color: '#16a34a' }}>
                    PROTOCOLO: {doc.protocoloAutorizacao} ({doc.dataAutorizacao})
                  </div>
                </div>
              </div>

              {/* Destinatário */}
              <div style={{ border: '1px solid #000', padding: '6px', marginBottom: '8px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '10px', borderBottom: '1px solid #ccc', paddingBottom: '2px', marginBottom: '4px' }}>
                  DESTINATÁRIO / REMETENTE
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '4px' }}>
                  <div><strong>NOME/RAZÃO SOCIAL:</strong> {doc.destinatarioNome}</div>
                  <div><strong>CNPJ/CPF:</strong> {doc.destinatarioCpfCnpj}</div>
                  <div><strong>DATA EMISSÃO:</strong> {doc.dataEmissao}</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 60px', gap: '4px', marginTop: '2px' }}>
                  <div><strong>ENDEREÇO:</strong> RUA PRINCIPAL, 500</div>
                  <div><strong>MUNICÍPIO:</strong> {doc.destinatarioMunicipio}</div>
                  <div><strong>UF:</strong> {doc.destinatarioUf}</div>
                </div>
              </div>

              {/* Cálculo do Imposto */}
              <div style={{ border: '1px solid #000', padding: '6px', marginBottom: '8px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '10px', borderBottom: '1px solid #ccc', paddingBottom: '2px', marginBottom: '4px' }}>
                  CÁLCULO DO IMPOSTO
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px', textAlign: 'right' }}>
                  <div>
                    <div style={{ fontSize: '9px', color: '#666' }}>BASE CÁLC. ICMS</div>
                    <strong>{formatCurrency(doc.valorBaseIcms)}</strong>
                  </div>
                  <div>
                    <div style={{ fontSize: '9px', color: '#666' }}>VALOR ICMS</div>
                    <strong style={{ color: '#16a34a' }}>{formatCurrency(doc.valorIcms)}</strong>
                  </div>
                  <div>
                    <div style={{ fontSize: '9px', color: '#666' }}>VALOR DO FRETE</div>
                    <strong>{formatCurrency(doc.valorFrete)}</strong>
                  </div>
                  <div>
                    <div style={{ fontSize: '9px', color: '#666' }}>PIS / COFINS</div>
                    <strong>{formatCurrency(doc.valorPis + doc.valorCofins)}</strong>
                  </div>
                  <div>
                    <div style={{ fontSize: '9px', color: '#666' }}>VALOR TOTAL NOTA</div>
                    <strong style={{ fontSize: '12px', color: '#16a34a' }}>{formatCurrency(doc.valorTotal)}</strong>
                  </div>
                </div>
              </div>

              {/* Itens */}
              <div style={{ border: '1px solid #000', padding: '6px', marginBottom: '8px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '10px', borderBottom: '1px solid #ccc', paddingBottom: '2px', marginBottom: '4px' }}>
                  DADOS DOS PRODUTOS / SERVIÇOS
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '1px solid #000' }}>
                      <th style={{ textAlign: 'left', padding: '2px 4px' }}>CÓDIGO</th>
                      <th style={{ textAlign: 'left', padding: '2px 4px' }}>DESCRIÇÃO DO PRODUTO</th>
                      <th style={{ textAlign: 'center', padding: '2px 4px' }}>NCM</th>
                      <th style={{ textAlign: 'center', padding: '2px 4px' }}>CFOP</th>
                      <th style={{ textAlign: 'center', padding: '2px 4px' }}>QTD</th>
                      <th style={{ textAlign: 'right', padding: '2px 4px' }}>VL. UNIT</th>
                      <th style={{ textAlign: 'right', padding: '2px 4px' }}>VL. TOTAL</th>
                      <th style={{ textAlign: 'right', padding: '2px 4px' }}>ICMS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doc.itens.map((it) => (
                      <tr key={it.id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '2px 4px' }}>{it.sku}</td>
                        <td style={{ padding: '2px 4px' }}>{it.descricao}</td>
                        <td style={{ textAlign: 'center', padding: '2px 4px' }}>{it.ncm}</td>
                        <td style={{ textAlign: 'center', padding: '2px 4px' }}>{it.cfop}</td>
                        <td style={{ textAlign: 'center', padding: '2px 4px' }}>{it.quantidade} {it.unidade}</td>
                        <td style={{ textAlign: 'right', padding: '2px 4px' }}>{formatCurrency(it.valorUnitario)}</td>
                        <td style={{ textAlign: 'right', padding: '2px 4px', fontWeight: 'bold' }}>{formatCurrency(it.valorTotal)}</td>
                        <td style={{ textAlign: 'right', padding: '2px 4px' }}>{formatCurrency(it.valorIcms)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 2. MODELO 65: DANFE NFC-e CUPOM TÉRMICO (58mm / 80mm)    */}
          {/* ========================================================= */}
          {doc.modelo === '65_NFCE' && (
            <div style={{ textAlign: 'center', fontFamily: 'monospace', fontSize: '11px', lineHeight: 1.3 }}>
              <div style={{ fontWeight: 'bold', fontSize: '13px' }}>COLISEU MATERIAIS LTDA</div>
              <div>CNPJ: 12.345.678/0001-90 • IE: 28.991.002-3</div>
              <div>AV. MARCELINO PIRES, 1250 - DOURADOS/MS</div>
              <div style={{ margin: '8px 0', borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '4px 0', fontWeight: 'bold' }}>
                DANFE NFC-e - Documento Auxiliar da Nota Fiscal de Consumidor Eletrônica
              </div>

              <div style={{ textAlign: 'left', margin: '8px 0' }}>
                <table style={{ width: '100%', fontSize: '10px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px dashed #000' }}>
                      <th style={{ textAlign: 'left' }}>Item Descrição</th>
                      <th style={{ textAlign: 'center' }}>Qtd</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doc.itens.map((it, idx) => (
                      <tr key={it.id}>
                        <td>{idx + 1}. {it.descricao}</td>
                        <td style={{ textAlign: 'center' }}>{it.quantidade}</td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(it.valorTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ borderTop: '1px dashed #000', paddingTop: '6px', textAlign: 'right', fontSize: '12px', fontWeight: 'bold' }}>
                TOTAL R$: {formatCurrency(doc.valorTotal)}
              </div>

              <div style={{ margin: '12px 0', borderTop: '1px dashed #000', paddingTop: '8px' }}>
                <div><strong>NFC-e Nº {doc.numero} • Série {doc.serie}</strong></div>
                <div>Emissão: {doc.dataEmissao} às {doc.horaEmissao}</div>
                <div style={{ fontSize: '9px', wordBreak: 'break-all', marginTop: '4px' }}>
                  Chave: {doc.chaveAcesso}
                </div>
                <div style={{ color: '#16a34a', fontWeight: 'bold', marginTop: '2px' }}>
                  Protocolo: {doc.protocoloAutorizacao}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', margin: '12px 0' }}>
                <div style={{ padding: '8px', border: '1px solid #000', display: 'inline-block' }}>
                  <QrCode size={90} />
                </div>
                <div style={{ fontSize: '9px' }}>Consulte pela Chave ou QR Code na SEFAZ</div>
              </div>

              <div style={{ fontSize: '9px', color: '#666', borderTop: '1px dashed #000', paddingTop: '4px' }}>
                Consumidor: {doc.destinatarioNome} ({doc.destinatarioCpfCnpj})
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 3. MODELO 58: DAMDFE MANIFESTO ELETRÔNICO DE CARGA       */}
          {/* ========================================================= */}
          {doc.modelo === '58_MDFE' && doc.dadosMdfe && (
            <div>
              <div style={{ border: '2px solid #000', padding: '10px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #000', paddingBottom: '6px', marginBottom: '8px' }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>COLISEU MATERIAIS & DISTRIBUICAO LTDA</h2>
                    <div>CNPJ: 12.345.678/0001-90 • RNTRC: {doc.dadosMdfe.rntrc}</div>
                    <div>DOURADOS/MS ➔ CAMPO GRANDE/MS</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#d97706' }}>DAMDFE</div>
                    <div>Documento Auxiliar de Manifesto de Carga</div>
                    <div><strong>MDF-e Nº {doc.numero} • Série {doc.serie}</strong></div>
                  </div>
                </div>

                <div style={{ fontSize: '10px', marginBottom: '8px' }}>
                  <strong>CHAVE DE ACESSO:</strong> <span className="text-mono">{doc.chaveAcesso}</span>
                  <div style={{ color: '#16a34a', fontWeight: 'bold' }}>
                    PROTOCOLO SEFAZ: {doc.protocoloAutorizacao} ({doc.dataAutorizacao})
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', border: '1px solid #ccc', padding: '6px', marginBottom: '8px' }}>
                  <div>
                    <strong>DADOS DO VEÍCULO DE TRAÇÃO:</strong>
                    <div>Placa: <strong>{doc.dadosMdfe.placaVeiculo}</strong> • RENAVAM: {doc.dadosMdfe.renavamVeiculo}</div>
                  </div>
                  <div>
                    <strong>CONDUTOR / MOTORISTA:</strong>
                    <div>{doc.dadosMdfe.motoristaNome} (CPF: {doc.dadosMdfe.motoristaCpf})</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', border: '1px solid #ccc', padding: '6px', marginBottom: '8px' }}>
                  <div><strong>PESO BRUTO TOTAL:</strong> {doc.dadosMdfe.pesoBrutoCargaKg} Kg</div>
                  <div><strong>VALOR TOTAL DA CARGA:</strong> {formatCurrency(doc.dadosMdfe.valorTotalCarga)}</div>
                </div>

                <div style={{ border: '1px solid #ccc', padding: '6px' }}>
                  <strong>DOCUMENTOS FISCAIS VINCULADOS ({doc.dadosMdfe.chavesNfeVinculadas.length} NF-e):</strong>
                  <ul style={{ margin: '4px 0', paddingLeft: '18px', fontSize: '10px' }}>
                    {doc.dadosMdfe.chavesNfeVinculadas.map((ch, idx) => (
                      <li key={idx} className="text-mono">{ch}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
