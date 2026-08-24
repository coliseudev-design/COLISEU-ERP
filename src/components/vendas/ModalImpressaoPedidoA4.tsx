import React from 'react';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../lib/formatters';
import { Printer, X } from 'lucide-react';
import { PedidoVendaItem } from '../../lib/pedidosVenda';

interface ModalImpressaoPedidoA4Props {
  isOpen: boolean;
  onClose: () => void;
  pedido: PedidoVendaItem | null;
}

export const ModalImpressaoPedidoA4: React.FC<ModalImpressaoPedidoA4Props> = ({
  isOpen,
  onClose,
  pedido,
}) => {
  if (!isOpen || !pedido) return null;

  const valorFrete = pedido.valorFrete ?? 0;
  const totalProdutos = pedido.totalProdutos ?? 0;
  const totalDescontos = pedido.totalDescontoGlobal ?? 0;
  const totalIpi = pedido.totalIpi ?? 0;
  const valorTotalFinal = pedido.valorTotalFinal ?? (totalProdutos - totalDescontos + valorFrete + totalIpi);
  const cfop = pedido.naturezaOperacao?.cfop || '5102';
  const natDesc = pedido.naturezaOperacao?.descricao || 'VENDA DE MERCADORIAS';

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
          maxHeight: '96vh',
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
            padding: '10px 20px',
            backgroundColor: '#1f2937',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 600 }}>
            Visualização de Impressão A4 — Pedido de Venda / Orçamento Nº {pedido.numeroPedido}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              variant="primary"
              size="sm"
              onClick={() => window.print()}
              leftIcon={<Printer size={14} />}
            >
              Imprimir Pedido (Ctrl + P)
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

        {/* Folha A4 */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '30px',
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '11px',
            color: '#111827',
            backgroundColor: '#ffffff',
          }}
        >
          {/* Cabeçalho da Empresa */}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #1f2937', paddingBottom: '12px', marginBottom: '14px' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#1f2937' }}>
                COLISEU MATERIAIS & DISTRIBUIÇÃO LTDA
              </h1>
              <div style={{ fontSize: '10px', color: '#4b5563', marginTop: '2px' }}>
                CNPJ: 12.345.678/0001-90 • I.E.: 28.910.123-4 • Telefone: (67) 3422-9000
              </div>
              <div style={{ fontSize: '10px', color: '#4b5563' }}>
                Av. Marcelino Pires, 4500 - Distrito Industrial - Dourados/MS - CEP 79800-000
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#1f2937' }}>
                {pedido.status === 'ORCAMENTO' ? 'PROPOSTA COMERCIAL' : 'PEDIDO DE VENDA'}
              </div>
              <div style={{ fontSize: '14px', fontWeight: 900, color: '#2563eb' }}>
                Nº {pedido.numeroPedido}
              </div>
              <div style={{ fontSize: '10px', color: '#6b7280' }}>
                Emissão: {pedido.dataEmissao} • Depto: {pedido.filialDepto || 'MATRIZ'}
              </div>
            </div>
          </div>

          {/* Dados do Cliente & Natureza de Operação */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px', border: '1px solid #d1d5db', borderRadius: '4px', padding: '10px', marginBottom: '14px', backgroundColor: '#f9fafb' }}>
            <div>
              <div><strong>CLIENTE:</strong> {pedido.clienteCodigo} - {pedido.clienteNome}</div>
              <div><strong>CNPJ/CPF:</strong> {pedido.clienteCnpjCpf} • <strong>I.E.:</strong> {pedido.clienteInscricaoEstadual || 'ISENTO'}</div>
              <div><strong>ENDEREÇO:</strong> {pedido.clienteEndereco || ''} - {pedido.clienteBairro || ''} - {pedido.clienteCidade || ''}/{pedido.clienteUf || ''}</div>
              <div><strong>TELEFONE:</strong> {pedido.clienteTelefone} • <strong>E-MAIL:</strong> {pedido.clienteEmail || 'NÃO INFORMADO'}</div>
            </div>

            <div>
              <div><strong>NATUREZA:</strong> {cfop} - {natDesc}</div>
              <div><strong>VENDEDOR:</strong> {pedido.vendedorNome}</div>
              <div><strong>TABELA:</strong> {pedido.tabelaPrecos || 'TABELA PADRÃO'}</div>
              <div><strong>FRETE:</strong> {pedido.tipoFrete || 'SEM FRETE'} (R$ {valorFrete.toFixed(2)})</div>
            </div>
          </div>

          {/* Tabela de Itens */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '14px', fontSize: '10px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '1px solid #9ca3af' }}>
                <th style={{ padding: '6px 4px', textAlign: 'center' }}>Item</th>
                <th style={{ padding: '6px 4px', textAlign: 'left' }}>Cód. Fábrica</th>
                <th style={{ padding: '6px 4px', textAlign: 'left' }}>Referência</th>
                <th style={{ padding: '6px 4px', textAlign: 'left' }}>Descrição do Produto</th>
                <th style={{ padding: '6px 4px', textAlign: 'center' }}>Un</th>
                <th style={{ padding: '6px 4px', textAlign: 'center' }}>Qtd</th>
                <th style={{ padding: '6px 4px', textAlign: 'right' }}>Preço Unit.</th>
                <th style={{ padding: '6px 4px', textAlign: 'center' }}>Desc %</th>
                <th style={{ padding: '6px 4px', textAlign: 'right' }}>Total Líquido</th>
              </tr>
            </thead>
            <tbody>
              {(pedido.itens || []).map((it) => (
                <tr key={it.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '5px 4px', textAlign: 'center' }}>{it.itemOrdem}</td>
                  <td style={{ padding: '5px 4px', fontWeight: 'bold' }}>{it.codigoFabrica || it.codigoInterno}</td>
                  <td style={{ padding: '5px 4px', color: '#4b5563' }}>{it.referencia || '-'}</td>
                  <td style={{ padding: '5px 4px' }}>{it.descricao}</td>
                  <td style={{ padding: '5px 4px', textAlign: 'center' }}>{it.unidadeMedida}</td>
                  <td style={{ padding: '5px 4px', textAlign: 'center', fontWeight: 'bold' }}>{it.quantidade}</td>
                  <td style={{ padding: '5px 4px', textAlign: 'right' }}>{formatCurrency(it.precoTabelaUnitario)}</td>
                  <td style={{ padding: '5px 4px', textAlign: 'center' }}>{it.descontoPercent > 0 ? `${it.descontoPercent}%` : '-'}</td>
                  <td style={{ padding: '5px 4px', textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(it.subtotalLiquido)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Parcelas e Totais */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '14px', marginBottom: '20px' }}>
            {/* Parcelas */}
            <div style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '8px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '10px', borderBottom: '1px solid #e5e7eb', paddingBottom: '4px', marginBottom: '4px' }}>
                PROGRAMAÇÃO DE VENCIMENTOS & DUPLICATAS
              </div>
              <table style={{ width: '100%', fontSize: '10px' }}>
                <thead>
                  <tr style={{ color: '#6b7280' }}>
                    <th style={{ textAlign: 'left' }}>Parc</th>
                    <th style={{ textAlign: 'center' }}>Vencimento</th>
                    <th style={{ textAlign: 'left' }}>Nº Doc</th>
                    <th style={{ textAlign: 'right' }}>Valor</th>
                    <th style={{ textAlign: 'left', paddingLeft: '6px' }}>Espécie</th>
                  </tr>
                </thead>
                <tbody>
                  {(pedido.parcelas || []).map((parc) => (
                    <tr key={parc.numeroParcela} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ fontWeight: 'bold' }}>{parc.numeroParcela}ª</td>
                      <td style={{ textAlign: 'center' }}>{parc.dataVencimento}</td>
                      <td>{parc.numeroDocumento}</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(parc.valorParcela)}</td>
                      <td style={{ paddingLeft: '6px', color: '#4b5563' }}>{parc.especiePagamento}</td>
                    </tr>
                  ))}
                  {(!pedido.parcelas || pedido.parcelas.length === 0) && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '8px', color: '#9ca3af' }}>
                        Pagamento à vista / Contra entrega.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Quadro de Totais */}
            <div style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '8px', backgroundColor: '#f9fafb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                <span>Subtotal dos Produtos:</span>
                <strong>{formatCurrency(totalProdutos)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                <span>(-) Descontos Concedidos:</span>
                <strong style={{ color: '#16a34a' }}>- {formatCurrency(totalDescontos)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                <span>(+) Frete:</span>
                <strong>{formatCurrency(valorFrete)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span>(+) IPI / Outras Despesas:</span>
                <strong>{formatCurrency(totalIpi)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #111827', paddingTop: '6px', fontSize: '13px' }}>
                <strong>TOTAL GERAL:</strong>
                <strong style={{ fontSize: '14px', color: '#2563eb' }}>{formatCurrency(valorTotalFinal)}</strong>
              </div>
            </div>
          </div>

          {/* Observações e Termo de Aceite */}
          {pedido.observacoesGerais && (
            <div style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '8px', marginBottom: '24px', fontSize: '10px' }}>
              <strong>OBSERVAÇÕES:</strong> {pedido.observacoesGerais}
            </div>
          )}

          {/* Assinaturas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginTop: '40px', textAlign: 'center', fontSize: '10px' }}>
            <div>
              <div style={{ borderTop: '1px solid #000', paddingTop: '4px', fontWeight: 'bold' }}>
                {pedido.vendedorNome}
              </div>
              <div style={{ color: '#6b7280' }}>Departamento Comercial / Vendedor</div>
            </div>

            <div>
              <div style={{ borderTop: '1px solid #000', paddingTop: '4px', fontWeight: 'bold' }}>
                {pedido.clienteNome}
              </div>
              <div style={{ color: '#6b7280' }}>Aceite do Cliente / Destinatário</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
