import React from 'react';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../lib/formatters';
import { Printer, X, ShieldCheck, FileSpreadsheet, Download } from 'lucide-react';
import { TituloPagarItem, getTitulosPagar } from '../../lib/fornecedores';

interface ModalRelatorioRetencoesProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ModalRelatorioRetencoes: React.FC<ModalRelatorioRetencoesProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const titulos = getTitulosPagar().filter((t) => t.retencoes.valorTotalRetencoes > 0);

  const totalIrrf = titulos.reduce((acc, t) => acc + t.retencoes.valorIrrf, 0);
  const totalCsrf = titulos.reduce((acc, t) => acc + t.retencoes.valorCsrf, 0);
  const totalIssqn = titulos.reduce((acc, t) => acc + t.retencoes.valorIssqn, 0);
  const totalInss = titulos.reduce((acc, t) => acc + t.retencoes.valorInss, 0);
  const totalGeral = totalIrrf + totalCsrf + totalIssqn + totalInss;

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
          maxWidth: '850px',
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
            Extrato de Retenções na Fonte (WHT) — EFD-Reinf & DCTFWeb
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              variant="primary"
              size="sm"
              onClick={() => window.print()}
              leftIcon={<Printer size={15} />}
            >
              Imprimir Extrato (Ctrl + P)
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

        {/* Folha do Relatório */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '30px',
            fontFamily: 'Arial, sans-serif',
            fontSize: '11px',
            lineHeight: 1.4,
          }}
        >
          <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '10px', marginBottom: '16px' }}>
            <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
              DEMOSTRATIVO CONSOLIDADO DE RETENÇÕES TRIBUTÁRIAS NA FONTE
            </h1>
            <div style={{ fontSize: '11px', color: '#4b5563', marginTop: '2px' }}>
              COLISEU MATERIAIS & DISTRIBUIÇÃO LTDA • CNPJ: 12.345.678/0001-90
            </div>
            <div style={{ fontSize: '10px', color: '#6b7280' }}>
              Competência: AGOSTO/2026 • Gerado em: {new Date().toLocaleString('pt-BR')}
            </div>
          </div>

          {/* Cards Totais dos Tributos a Recolher */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', marginBottom: '16px', textAlign: 'center' }}>
            <div style={{ border: '1px solid #ccc', padding: '6px', borderRadius: '4px' }}>
              <div style={{ fontSize: '10px', color: '#666' }}>TOTAL IRRF</div>
              <strong style={{ fontSize: '13px', color: '#dc2626' }}>{formatCurrency(totalIrrf)}</strong>
            </div>
            <div style={{ border: '1px solid #ccc', padding: '6px', borderRadius: '4px' }}>
              <div style={{ fontSize: '10px', color: '#666' }}>TOTAL CSRF (4,65%)</div>
              <strong style={{ fontSize: '13px', color: '#dc2626' }}>{formatCurrency(totalCsrf)}</strong>
            </div>
            <div style={{ border: '1px solid #ccc', padding: '6px', borderRadius: '4px' }}>
              <div style={{ fontSize: '10px', color: '#666' }}>TOTAL ISSQN</div>
              <strong style={{ fontSize: '13px', color: '#dc2626' }}>{formatCurrency(totalIssqn)}</strong>
            </div>
            <div style={{ border: '1px solid #ccc', padding: '6px', borderRadius: '4px' }}>
              <div style={{ fontSize: '10px', color: '#666' }}>TOTAL INSS (11%)</div>
              <strong style={{ fontSize: '13px', color: '#dc2626' }}>{formatCurrency(totalInss)}</strong>
            </div>
            <div style={{ border: '2px solid #111827', padding: '6px', borderRadius: '4px', backgroundColor: '#f3f4f6' }}>
              <div style={{ fontSize: '10px', fontWeight: 'bold' }}>TOTAL A RECOLHER</div>
              <strong style={{ fontSize: '14px', color: '#16a34a' }}>{formatCurrency(totalGeral)}</strong>
            </div>
          </div>

          {/* Tabela de Títulos com Retenção */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '11px', marginBottom: '6px' }}>
              DISCRIMINAÇÃO POR FORNECEDOR / DOCUMENTO FISCAL
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '1px solid #000' }}>
                  <th style={{ textAlign: 'left', padding: '4px' }}>Documento</th>
                  <th style={{ textAlign: 'left', padding: '4px' }}>Fornecedor / Favorecido</th>
                  <th style={{ textAlign: 'right', padding: '4px' }}>Valor Bruto</th>
                  <th style={{ textAlign: 'right', padding: '4px' }}>IRRF</th>
                  <th style={{ textAlign: 'right', padding: '4px' }}>CSRF</th>
                  <th style={{ textAlign: 'right', padding: '4px' }}>ISSQN</th>
                  <th style={{ textAlign: 'right', padding: '4px' }}>INSS</th>
                  <th style={{ textAlign: 'right', padding: '4px' }}>Total Retido</th>
                  <th style={{ textAlign: 'right', padding: '4px' }}>Líquido Pago</th>
                </tr>
              </thead>
              <tbody>
                {titulos.map((t) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '4px', fontWeight: 'bold' }}>{t.numeroDocumento}</td>
                    <td style={{ padding: '4px' }}>{t.fornecedorNome}</td>
                    <td style={{ textAlign: 'right', padding: '4px' }}>{formatCurrency(t.valorBruto)}</td>
                    <td style={{ textAlign: 'right', padding: '4px', color: t.retencoes.valorIrrf > 0 ? '#dc2626' : '#999' }}>
                      {formatCurrency(t.retencoes.valorIrrf)}
                    </td>
                    <td style={{ textAlign: 'right', padding: '4px', color: t.retencoes.valorCsrf > 0 ? '#dc2626' : '#999' }}>
                      {formatCurrency(t.retencoes.valorCsrf)}
                    </td>
                    <td style={{ textAlign: 'right', padding: '4px', color: t.retencoes.valorIssqn > 0 ? '#dc2626' : '#999' }}>
                      {formatCurrency(t.retencoes.valorIssqn)}
                    </td>
                    <td style={{ textAlign: 'right', padding: '4px', color: t.retencoes.valorInss > 0 ? '#dc2626' : '#999' }}>
                      {formatCurrency(t.retencoes.valorInss)}
                    </td>
                    <td style={{ textAlign: 'right', padding: '4px', fontWeight: 'bold', color: '#dc2626' }}>
                      {formatCurrency(t.retencoes.valorTotalRetencoes)}
                    </td>
                    <td style={{ textAlign: 'right', padding: '4px', fontWeight: 'bold', color: '#16a34a' }}>
                      {formatCurrency(t.valorFinalPagar)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ borderTop: '1px solid #ccc', paddingTop: '10px', fontSize: '9px', color: '#6b7280' }}>
            ℹ️ Este relatório é emitido em conformidade com a Instrução Normativa RFB nº 2043/2021 (EFD-Reinf) e Lei nº 10.833/2003. Os valores retidos devem ser recolhidos via DCTFWeb/DARF até o dia 20 do mês subsequente ao fato gerador.
          </div>
        </div>
      </div>
    </div>
  );
};
