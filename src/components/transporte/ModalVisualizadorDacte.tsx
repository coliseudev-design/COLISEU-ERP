import React from 'react';
import { Button } from '../ui/Button';
import { Printer, Download, X, FileText, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '../../lib/formatters';
import { CteItem } from '../../lib/transporte';

interface ModalVisualizadorDacteProps {
  isOpen: boolean;
  onClose: () => void;
  cte: CteItem | null;
}

export const ModalVisualizadorDacte: React.FC<ModalVisualizadorDacteProps> = ({
  isOpen,
  onClose,
  cte,
}) => {
  if (!isOpen || !cte) return null;

  const handleImprimir = () => {
    window.print();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(4px)',
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
          maxWidth: '840px',
          maxHeight: '94vh',
          backgroundColor: '#ffffff',
          color: '#000000',
          borderRadius: '8px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        {/* Barra de Ações (Não impressa) */}
        <div
          className="no-print"
          style={{
            padding: '12px 20px',
            backgroundColor: '#1e293b',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} color="#38bdf8" />
            <span style={{ fontSize: '13px', fontWeight: 700 }}>
              DACTE — Documento Auxiliar do Conhecimento de Transporte Eletrônico (Mod. 57)
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="secondary" onClick={handleImprimir} leftIcon={<Printer size={14} />} style={{ height: '30px', fontSize: '11px' }}>
              Imprimir DACTE (Ctrl+P)
            </Button>
            <Button variant="secondary" onClick={onClose} style={{ height: '30px', fontSize: '11px' }}>
              Fechar
            </Button>
          </div>
        </div>

        {/* Corpo do DACTE em Layout Padrão SEFAZ */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', backgroundColor: '#ffffff' }}>
          {/* Cabeçalho DACTE */}
          <div style={{ border: '2px solid #000', padding: '10px', marginBottom: '8px', display: 'grid', gridTemplateColumns: '1.8fr 1.2fr 1.5fr', gap: '10px' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 900 }}>COLISEU MATERIAIS & DISTRIBUIÇÃO LTDA</div>
              <div style={{ fontSize: '10px' }}>AV. MARCELINO PIRES, 1250 - CENTRO - DOURADOS/MS</div>
              <div style={{ fontSize: '10px' }}>CNPJ: 05.766.577/0001-22 | IE: 28.326.186-4</div>
              <div style={{ fontSize: '10px', fontWeight: 700, marginTop: '4px' }}>RNTRC: {cte.rntrc || '09812345'}</div>
            </div>

            <div style={{ textAlign: 'center', borderLeft: '1px solid #000', borderRight: '1px solid #000', padding: '0 8px' }}>
              <div style={{ fontSize: '15px', fontWeight: 900 }}>DACTE</div>
              <div style={{ fontSize: '9px' }}>Documento Auxiliar do Conhecimento de Transporte Eletrônico</div>
              <div style={{ fontSize: '11px', fontWeight: 800, marginTop: '6px' }}>MOD. 57 • SÉRIE {cte.serie}</div>
              <div style={{ fontSize: '13px', fontWeight: 900 }}>Nº {cte.numero_cte}</div>
            </div>

            <div style={{ fontSize: '9px' }}>
              <div style={{ fontWeight: 700 }}>CHAVE DE ACESSO:</div>
              <div style={{ fontFamily: 'monospace', fontSize: '10px', fontWeight: 800, wordBreak: 'break-all', backgroundColor: '#f1f5f9', padding: '4px', border: '1px solid #cbd5e1' }}>
                {cte.chave_acesso || '50260868148349000109570010000001011082739182'}
              </div>
              <div style={{ marginTop: '6px', fontWeight: 700 }}>PROTOCOLO DE AUTORIZAÇÃO:</div>
              <div style={{ fontWeight: 800, color: '#15803d' }}>
                {cte.protocolo_autorizacao || '150260001928374'} - {cte.data_autorizacao || '2026-08-23'}
              </div>
            </div>
          </div>

          {/* Dados do Transporte */}
          <div style={{ border: '1px solid #000', padding: '8px', marginBottom: '8px', fontSize: '10px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
            <div><strong>TIPO DO CT-E:</strong> {cte.tipo_cte === 0 ? 'NORMAL' : 'COMPLEMENTAR'}</div>
            <div><strong>TIPO DO SERVIÇO:</strong> NORMAL</div>
            <div><strong>FORMA DE EMISSÃO:</strong> NORMAL</div>
            <div><strong>NATUREZA DA OPERAÇÃO:</strong> {cte.natureza_operacao}</div>
            <div><strong>CFOP:</strong> {cte.cfop}</div>
            <div><strong>INÍCIO DA PRESTAÇÃO:</strong> {cte.municipio_inicio}/{cte.uf_inicio}</div>
            <div><strong>TÉRMINO DA PRESTAÇÃO:</strong> {cte.municipio_fim}/{cte.uf_fim}</div>
            <div><strong>TOMADOR DO SERVIÇO:</strong> DESTINATÁRIO</div>
          </div>

          {/* Remetente & Destinatário */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
            <div style={{ border: '1px solid #000', padding: '8px', fontSize: '10px' }}>
              <div style={{ fontWeight: 900, borderBottom: '1px solid #ccc', paddingBottom: '2px', marginBottom: '4px' }}>REMETENTE:</div>
              <div><strong>Razão Social:</strong> {cte.remetente_nome || 'COLISEU MATERIAIS LTDA'}</div>
              <div><strong>Município/UF:</strong> {cte.municipio_inicio}/{cte.uf_inicio}</div>
            </div>

            <div style={{ border: '1px solid #000', padding: '8px', fontSize: '10px' }}>
              <div style={{ fontWeight: 900, borderBottom: '1px solid #ccc', paddingBottom: '2px', marginBottom: '4px' }}>DESTINATÁRIO:</div>
              <div><strong>Razão Social:</strong> {cte.destinatario_nome || 'AGROPECUARIA PANTANEIRA LTDA'}</div>
              <div><strong>Município/UF:</strong> {cte.municipio_fim}/{cte.uf_fim}</div>
            </div>
          </div>

          {/* Dados da Carga & Documentos Originários */}
          <div style={{ border: '1px solid #000', padding: '8px', marginBottom: '8px', fontSize: '10px' }}>
            <div style={{ fontWeight: 900, borderBottom: '1px solid #ccc', paddingBottom: '2px', marginBottom: '4px' }}>
              INFORMAÇÕES DA CARGA & DOCUMENTOS VINCULADOS (NF-e):
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: '6px', marginBottom: '6px' }}>
              <div><strong>Produto Predominante:</strong> {cte.produto_predominante}</div>
              <div><strong>Peso Bruto (Kg):</strong> {cte.peso_bruto_carga_kg.toFixed(2)} KG</div>
              <div><strong>Valor da Carga:</strong> {formatCurrency(cte.valor_carga)}</div>
              <div><strong>Placa Veículo:</strong> {cte.veiculo_placa || 'HQH-4490'}</div>
            </div>
            <div>
              <strong>Chaves de NF-e Acobertadas:</strong>
              <div style={{ fontFamily: 'monospace', fontSize: '9px', marginTop: '2px' }}>
                {cte.chaves_nfes.join(' | ') || '50260868148349000109550010000003451000003450'}
              </div>
            </div>
          </div>

          {/* Componentes do Valor da Prestação & Tributos */}
          <div style={{ border: '2px solid #000', padding: '10px', fontSize: '10px', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
            <div>
              <div style={{ fontWeight: 900, marginBottom: '4px' }}>COMPONENTES DO VALOR DA PRESTAÇÃO:</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                {cte.componentes.map((c, i) => (
                  <div key={i}><strong>{c.nome}:</strong> {formatCurrency(c.valor)}</div>
                ))}
              </div>
            </div>

            <div style={{ textAlign: 'right', borderLeft: '1px solid #ccc', paddingLeft: '10px' }}>
              <div style={{ fontSize: '11px', color: '#64748b' }}>VALOR TOTAL DA PRESTAÇÃO:</div>
              <div style={{ fontSize: '16px', fontWeight: 900, color: '#0f172a' }}>
                {formatCurrency(cte.valor_total_prestacao)}
              </div>
              <div style={{ fontSize: '10px', marginTop: '4px' }}>
                Base ICMS: {formatCurrency(cte.icms_base_calculo)} | Alíq: {cte.icms_aliquota}% | ICMS: {formatCurrency(cte.icms_valor)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
