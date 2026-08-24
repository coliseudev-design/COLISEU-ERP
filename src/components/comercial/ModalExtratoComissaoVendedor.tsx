import React from 'react';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../lib/formatters';
import { Printer, X, Award, DollarSign, TrendingUp, CheckCircle2 } from 'lucide-react';
import { VendedorItem, getHistoricoComissoes, ItemComissaoVenda } from '../../lib/comissoes';

interface ModalExtratoComissaoVendedorProps {
  isOpen: boolean;
  onClose: () => void;
  vendedor: VendedorItem | null;
}

export const ModalExtratoComissaoVendedor: React.FC<ModalExtratoComissaoVendedorProps> = ({
  isOpen,
  onClose,
  vendedor,
}) => {
  if (!isOpen || !vendedor) return null;

  const historico = getHistoricoComissoes().filter((h) => h.vendedorId === vendedor.id);

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
          maxWidth: '900px',
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
            Extrato Analítico de Comissões — {vendedor.nome} ({vendedor.cargo.replace('_', ' ')})
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
          {/* Header */}
          <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '10px', marginBottom: '16px' }}>
            <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
              DEMOSTRATIVO DE REMUNERAÇÃO VARIÁVEL & COMISSÕES
            </h1>
            <div style={{ fontSize: '11px', color: '#4b5563', marginTop: '2px' }}>
              COLISEU MATERIAIS & DISTRIBUIÇÃO LTDA • CNPJ: 12.345.678/0001-90
            </div>
            <div style={{ fontSize: '10px', color: '#6b7280' }}>
              Vendedor: <strong>{vendedor.nome}</strong> • Competência: AGOSTO/2026
            </div>
          </div>

          {/* Cards de Resumo da Performance */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px', textAlign: 'center' }}>
            <div style={{ border: '1px solid #ccc', padding: '6px', borderRadius: '4px' }}>
              <div style={{ fontSize: '10px', color: '#666' }}>META ESTABELECIDA</div>
              <strong style={{ fontSize: '13px' }}>{formatCurrency(vendedor.metaFaturamentoMensal)}</strong>
            </div>

            <div style={{ border: '1px solid #ccc', padding: '6px', borderRadius: '4px' }}>
              <div style={{ fontSize: '10px', color: '#666' }}>TOTAL VENDIDO (FATURADO)</div>
              <strong style={{ fontSize: '13px', color: '#16a34a' }}>{formatCurrency(vendedor.totalVendidoMes)}</strong>
              <div style={{ fontSize: '9px', color: '#16a34a', fontWeight: 'bold' }}>
                {vendedor.percentualAtingimentoMeta}% da Meta
              </div>
            </div>

            <div style={{ border: '1px solid #ccc', padding: '6px', borderRadius: '4px' }}>
              <div style={{ fontSize: '10px', color: '#666' }}>MARGEM MÉDIA OBTIDA</div>
              <strong style={{ fontSize: '13px', color: '#2563eb' }}>{vendedor.margemMediaObtida}%</strong>
            </div>

            <div style={{ border: '2px solid #16a34a', padding: '6px', borderRadius: '4px', backgroundColor: '#f0fdf4' }}>
              <div style={{ fontSize: '10px', color: '#166534', fontWeight: 'bold' }}>TOTAL COMISSÃO GERADA</div>
              <strong style={{ fontSize: '15px', color: '#16a34a' }}>{formatCurrency(vendedor.totalComissaoGerada)}</strong>
            </div>
          </div>

          {/* Tabela Analítica das Vendas Comissionadas */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '11px', marginBottom: '6px' }}>
              DISCRIMINAÇÃO ANALÍTICA DAS VENDAS & MARGENS DE CONTRIBUIÇÃO
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '1px solid #000' }}>
                  <th style={{ textAlign: 'left', padding: '4px' }}>Venda/NF</th>
                  <th style={{ textAlign: 'left', padding: '4px' }}>Cliente</th>
                  <th style={{ textAlign: 'center', padding: '4px' }}>Data</th>
                  <th style={{ textAlign: 'right', padding: '4px' }}>Valor Venda</th>
                  <th style={{ textAlign: 'right', padding: '4px' }}>Margem %</th>
                  <th style={{ textAlign: 'left', padding: '4px' }}>Regra Aplicada</th>
                  <th style={{ textAlign: 'center', padding: '4px' }}>% Com.</th>
                  <th style={{ textAlign: 'right', padding: '4px' }}>Comissão</th>
                </tr>
              </thead>
              <tbody>
                {historico.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '4px', fontWeight: 'bold' }}>{item.numeroDocumentoVenda}</td>
                    <td style={{ padding: '4px' }}>{item.clienteNome}</td>
                    <td style={{ textAlign: 'center', padding: '4px' }}>{item.dataVenda}</td>
                    <td style={{ textAlign: 'right', padding: '4px' }}>{formatCurrency(item.valorTotalVenda)}</td>
                    <td style={{ textAlign: 'right', padding: '4px', color: item.margemLucroPercent >= 25 ? '#16a34a' : '#d97706', fontWeight: 'bold' }}>
                      {item.margemLucroPercent}%
                    </td>
                    <td style={{ padding: '4px', fontSize: '9px' }}>{item.regraAplicada}</td>
                    <td style={{ textAlign: 'center', padding: '4px', fontWeight: 'bold' }}>{item.aliquotaComissaoAplicada}%</td>
                    <td style={{ textAlign: 'right', padding: '4px', fontWeight: 'bold', color: '#16a34a' }}>
                      {formatCurrency(item.valorTotalComissao)}
                    </td>
                  </tr>
                ))}
                {historico.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '12px', color: '#666' }}>
                      Nenhuma venda individual registrada no período. Comissão total calculada pelo fechamento de meta.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Dados para Pagamento e Assinatura */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '30px', borderTop: '1px solid #ccc', paddingTop: '16px' }}>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '11px' }}>DADOS PARA PAGAMENTO:</div>
              <div style={{ fontSize: '10px', marginTop: '4px' }}>
                Banco: {vendedor.bancoFavorecido || '748 - SICREDI'}<br />
                Chave PIX: <strong>{vendedor.chavePix || 'Não informada'}</strong><br />
                Status de Pagamento: <strong>{vendedor.totalComissaoPendente === 0 ? 'TOTALMENTE PAGO' : `PENDENTE: ${formatCurrency(vendedor.totalComissaoPendente)}`}</strong>
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ borderBottom: '1px solid #000', width: '220px', margin: '30px auto 4px auto' }}></div>
              <div style={{ fontSize: '10px', fontWeight: 'bold' }}>{vendedor.nome}</div>
              <div style={{ fontSize: '9px', color: '#666' }}>Assinatura do Vendedor / Colaborador</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
