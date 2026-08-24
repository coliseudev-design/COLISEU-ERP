import React from 'react';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../lib/formatters';
import { Printer, X, Download, Copy, ShieldCheck } from 'lucide-react';
import { PedidoVendaItem } from '../../lib/pedidosVenda';
import { getNfeConfig } from '../../lib/nfeConfig';
import { gerarXmlNFe } from '../../lib/nfeXmlGenerator';
import { salvarArquivoComDialogo, obterXmlRealDoDisco } from '../../lib/fileDialogHelper';

interface ModalDanfeNFeOficialProps {
  isOpen: boolean;
  onClose: () => void;
  pedido: PedidoVendaItem;
  chaveNFe: string;
  protocolo: string;
  dataAutorizacao?: string;
  tPag?: string;
  modFrete?: string;
  infCpl?: string;
}

export const ModalDanfeNFeOficial: React.FC<ModalDanfeNFeOficialProps> = ({
  isOpen,
  onClose,
  pedido,
  chaveNFe,
  protocolo,
  dataAutorizacao,
  tPag = '15',
  modFrete = '0',
  infCpl = '',
}) => {
  if (!isOpen) return null;

  const config = getNfeConfig();
  const numeroNfe = (pedido.numeroNFe || '1025').replace(/\D/g, '') || '1025';
  const dataHoje = dataAutorizacao || new Date().toLocaleDateString('pt-BR');
  const horaHoje = new Date().toLocaleTimeString('pt-BR');

  const handleImprimir = () => {
    window.print();
  };

  const handleBaixarXml = async () => {
    let xml = await obterXmlRealDoDisco(chaveNFe);
    if (!xml) {
      xml = gerarXmlNFe(pedido, chaveNFe, protocolo, tPag, modFrete, infCpl);
    }
    const salvo = await salvarArquivoComDialogo(`${chaveNFe}-procNFe.xml`, xml, 'xml');
    if (salvo) {
      alert(`✅ XML da NF-e salvo com sucesso em:\n${salvo}`);
    }
  };

  const handleCopiarChave = () => {
    navigator.clipboard.writeText(chaveNFe);
    alert('Chave de acesso copiada!');
  };

  return (
    <div
      className="coliseu-danfe-modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(3px)',
        zIndex: 14000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '920px',
          maxHeight: '94vh',
          backgroundColor: '#ffffff',
          color: '#000000',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
          overflow: 'hidden',
        }}
      >
        {/* Barra Superior - Ocultada na impressão */}
        <div
          className="no-print"
          style={{
            padding: '12px 20px',
            backgroundColor: '#1f2937',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={18} color="#10b981" />
            <div style={{ fontSize: '13px', fontWeight: 700 }}>
              DANFE Oficial — NF-e Nº {numeroNfe} (Série 1) • SEFAZ Autorizada
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopiarChave}
              leftIcon={<Copy size={13} />}
              style={{ height: '30px', fontSize: '11px', color: '#fff', borderColor: '#4b5563' }}
            >
              Copiar Chave
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleBaixarXml}
              leftIcon={<Download size={13} />}
              style={{ height: '30px', fontSize: '11px', color: '#38bdf8', borderColor: '#38bdf8' }}
            >
              Baixar XML
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={handleImprimir}
              leftIcon={<Printer size={14} />}
              style={{ height: '30px', fontSize: '11px', backgroundColor: '#10b981', borderColor: '#10b981' }}
            >
              Imprimir DANFE (PDF)
            </Button>

            <button
              type="button"
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', marginLeft: '4px' }}
              title="Fechar"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ÁREA DO DOCUMENTO FISCAL (ESTILO DANFE A4) */}
        <div
          className="coliseu-printable-danfe-content"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            backgroundColor: '#ffffff',
            color: '#000000',
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '9.5px',
            lineHeight: 1.25,
          }}
        >
          {/* CSS de Impressão Direta A4 */}
          <style>{`
            @media print {
              body * {
                visibility: hidden !important;
              }
              .coliseu-danfe-modal-overlay {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                height: auto !important;
                background: #fff !important;
                padding: 0 !important;
                margin: 0 !important;
                display: block !important;
              }
              .coliseu-printable-danfe-content, .coliseu-printable-danfe-content * {
                visibility: visible !important;
              }
              .no-print {
                display: none !important;
              }
              .coliseu-printable-danfe-content {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                padding: 0 !important;
                margin: 0 !important;
              }
              @page {
                size: A4 portrait;
                margin: 6mm 6mm 6mm 6mm;
              }
            }
          `}</style>

          {/* 1. CANHOTO DE RECEBIMENTO */}
          <div style={{ border: '1px solid #000', padding: '4px 6px', marginBottom: '6px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: '8px' }}>
              <div>
                <div style={{ fontSize: '8px', textTransform: 'uppercase' }}>
                  RECEBEMOS DE <strong>{config.nomeEmitente || 'PIVETA DIST. DE TINTAS AUTOMOTIVA LTDA'}</strong> OS PRODUTOS/SERVIÇOS CONSTANTES DA NOTA FISCAL INDICADA AO LADO.
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '8px', marginTop: '10px' }}>
                  <div style={{ borderTop: '1px solid #000', paddingTop: '2px', fontSize: '8px' }}>DATA DE RECEBIMENTO</div>
                  <div style={{ borderTop: '1px solid #000', paddingTop: '2px', fontSize: '8px' }}>IDENTIFICAÇÃO E ASSINATURA DO RECEBEDOR</div>
                </div>
              </div>

              <div style={{ borderLeft: '1px solid #000', paddingLeft: '8px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ fontSize: '11px', fontWeight: 800 }}>NF-e</div>
                <div style={{ fontSize: '13px', fontWeight: 900 }}>Nº {numeroNfe}</div>
                <div style={{ fontSize: '9px', fontWeight: 700 }}>SÉRIE 1</div>
              </div>
            </div>
          </div>

          <div style={{ borderBottom: '1px dashed #666', marginBottom: '6px' }} />

          {/* 2. CABEÇALHO DO DANFE */}
          <div style={{ border: '1px solid #000', display: 'grid', gridTemplateColumns: '2.3fr 1.2fr 2.5fr', marginBottom: '6px' }}>
            {/* Emitente */}
            <div style={{ padding: '6px' }}>
              <div style={{ fontSize: '12px', fontWeight: 800 }}>{config.nomeEmitente || 'PIVETA DIST. DE TINTAS AUTOMOTIVA LTDA'}</div>
              <div style={{ fontSize: '9px', marginTop: '2px' }}>AV. MARCELINO PIRES, 1250 - CENTRO</div>
              <div style={{ fontSize: '9px' }}>DOURADOS - MS - CEP: 79800-000</div>
              <div style={{ fontSize: '9px' }}>TEL: (67) 3421-9000</div>
            </div>

            {/* DANFE Box */}
            <div style={{ borderLeft: '1px solid #000', borderRight: '1px solid #000', padding: '4px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: '14px', fontWeight: 900, letterSpacing: '1px' }}>DANFE</div>
              <div style={{ fontSize: '7.5px' }}>Documento Auxiliar da Nota Fiscal Eletrônica</div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', margin: '4px 0', fontSize: '8.5px' }}>
                <span>0 - ENTRADA</span>
                <span style={{ border: '1px solid #000', padding: '0 4px', fontWeight: 900 }}>1</span>
                <span>1 - SAÍDA</span>
              </div>
              <div style={{ fontSize: '11px', fontWeight: 900 }}>Nº {numeroNfe}</div>
              <div style={{ fontSize: '9px', fontWeight: 700 }}>SÉRIE 1 • FOLHA 1/1</div>
            </div>

            {/* Chave de Acesso & Código de Barras */}
            <div style={{ padding: '6px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
                <svg width="100%" height="28" viewBox="0 0 400 30" preserveAspectRatio="none">
                  {Array.from({ length: 70 }).map((_, i) => (
                    <rect
                      key={i}
                      x={i * 5.7}
                      y="0"
                      width={(i % 3 === 0 || i % 7 === 0) ? 3 : 1.5}
                      height="30"
                      fill="#000"
                    />
                  ))}
                </svg>
              </div>

              <div>
                <div style={{ fontSize: '8px', fontWeight: 700 }}>CHAVE DE ACESSO:</div>
                <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '10px', letterSpacing: '0.5px' }}>
                  {chaveNFe.replace(/(\d{4})/g, '$1 ').trim()}
                </div>
              </div>

              <div style={{ fontSize: '7.5px', color: '#333' }}>
                Consulta de autenticidade no portal nacional da NF-e www.nfe.fazenda.gov.br ou no site da SEFAZ autorizadora.
              </div>
            </div>
          </div>

          {/* 3. NATUREZA DA OPERAÇÃO & PROTOCOLO */}
          <div style={{ border: '1px solid #000', display: 'grid', gridTemplateColumns: '2fr 2fr', marginBottom: '6px' }}>
            <div style={{ padding: '3px 6px', borderRight: '1px solid #000' }}>
              <div style={{ fontSize: '7.5px', fontWeight: 700 }}>NATUREZA DA OPERAÇÃO</div>
              <div style={{ fontSize: '9.5px', fontWeight: 700 }}>
                {pedido.naturezaOperacao?.cfop || '5102'} - {pedido.naturezaOperacao?.descricao || 'VENDA DE MERCADORIAS'}
              </div>
            </div>

            <div style={{ padding: '3px 6px' }}>
              <div style={{ fontSize: '7.5px', fontWeight: 700 }}>PROTOCOLO DE AUTORIZAÇÃO DE USO</div>
              <div style={{ fontSize: '9.5px', fontWeight: 800, color: '#047857' }}>
                {protocolo} — {dataHoje} {horaHoje}
              </div>
            </div>
          </div>

          {/* 4. INSCRIÇÃO ESTADUAL E CNPJ EMITENTE */}
          <div style={{ border: '1px solid #000', display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 1.5fr', marginBottom: '6px' }}>
            <div style={{ padding: '3px 6px', borderRight: '1px solid #000' }}>
              <div style={{ fontSize: '7.5px', fontWeight: 700 }}>INSCRIÇÃO ESTADUAL</div>
              <div style={{ fontSize: '9.5px', fontWeight: 700 }}>283261864</div>
            </div>
            <div style={{ padding: '3px 6px', borderRight: '1px solid #000' }}>
              <div style={{ fontSize: '7.5px', fontWeight: 700 }}>INSCRIÇÃO ESTADUAL DO SUBST. TRIBUT.</div>
              <div style={{ fontSize: '9.5px' }}>ISENTO</div>
            </div>
            <div style={{ padding: '3px 6px' }}>
              <div style={{ fontSize: '7.5px', fontWeight: 700 }}>CNPJ</div>
              <div style={{ fontSize: '9.5px', fontWeight: 700 }}>{config.cnpjEmitente || '05.766.577/0001-22'}</div>
            </div>
          </div>

          {/* 5. DESTINATÁRIO / REMETENTE */}
          <div style={{ border: '1px solid #000', marginBottom: '6px' }}>
            <div style={{ backgroundColor: '#e5e7eb', padding: '1px 6px', fontWeight: 800, fontSize: '8.5px', borderBottom: '1px solid #000' }}>
              DESTINATÁRIO / REMETENTE
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '3fr 1.8fr 1fr', borderBottom: '1px solid #ccc' }}>
              <div style={{ padding: '3px 6px', borderRight: '1px solid #ccc' }}>
                <div style={{ fontSize: '7.5px' }}>NOME / RAZÃO SOCIAL</div>
                <div style={{ fontSize: '9.5px', fontWeight: 800 }}>{pedido.clienteNome}</div>
              </div>
              <div style={{ padding: '3px 6px', borderRight: '1px solid #ccc' }}>
                <div style={{ fontSize: '7.5px' }}>CNPJ / CPF</div>
                <div style={{ fontSize: '9.5px', fontWeight: 800 }}>{pedido.clienteCnpjCpf || '000.000.000-00'}</div>
              </div>
              <div style={{ padding: '3px 6px' }}>
                <div style={{ fontSize: '7.5px' }}>DATA DA EMISSÃO</div>
                <div style={{ fontSize: '9.5px', fontWeight: 700 }}>{dataHoje}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1.5fr 1fr 1fr' }}>
              <div style={{ padding: '3px 6px', borderRight: '1px solid #ccc' }}>
                <div style={{ fontSize: '7.5px' }}>ENDEREÇO</div>
                <div style={{ fontSize: '9px' }}>{pedido.clienteEndereco || 'RUA PRINCIPAL, 100 - CENTRO'}</div>
              </div>
              <div style={{ padding: '3px 6px', borderRight: '1px solid #ccc' }}>
                <div style={{ fontSize: '7.5px' }}>MUNICÍPIO</div>
                <div style={{ fontSize: '9px', fontWeight: 700 }}>{pedido.clienteCidade || 'DOURADOS'}</div>
              </div>
              <div style={{ padding: '3px 6px', borderRight: '1px solid #ccc' }}>
                <div style={{ fontSize: '7.5px' }}>UF / FONE</div>
                <div style={{ fontSize: '9px' }}>{pedido.clienteUf || 'MS'} • {pedido.clienteTelefone || '(67) 9999-0000'}</div>
              </div>
              <div style={{ padding: '3px 6px' }}>
                <div style={{ fontSize: '7.5px' }}>DATA / HORA SAÍDA</div>
                <div style={{ fontSize: '9px' }}>{dataHoje} {horaHoje}</div>
              </div>
            </div>
          </div>

          {/* 6. CÁLCULO DO IMPOSTO */}
          <div style={{ border: '1px solid #000', marginBottom: '6px' }}>
            <div style={{ backgroundColor: '#e5e7eb', padding: '1px 6px', fontWeight: 800, fontSize: '8.5px', borderBottom: '1px solid #000' }}>
              CÁLCULO DO IMPOSTO
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', textAlign: 'right' }}>
              <div style={{ padding: '3px 6px', borderRight: '1px solid #ccc' }}>
                <div style={{ fontSize: '7px', textAlign: 'left' }}>BASE DE CÁLC. ICMS</div>
                <div style={{ fontWeight: 700 }}>{formatCurrency((pedido.totalProdutos || pedido.valorTotalFinal) - (pedido.totalDescontoGlobal || 0))}</div>
              </div>
              <div style={{ padding: '3px 6px', borderRight: '1px solid #ccc' }}>
                <div style={{ fontSize: '7px', textAlign: 'left' }}>VALOR DO ICMS</div>
                <div style={{ fontWeight: 700, color: '#047857' }}>{formatCurrency(pedido.totalIcms || pedido.valorTotalFinal * 0.17)}</div>
              </div>
              <div style={{ padding: '3px 6px', borderRight: '1px solid #ccc' }}>
                <div style={{ fontSize: '7px', textAlign: 'left' }}>BASE CÁLC. ICMS ST</div>
                <div>R$ 0,00</div>
              </div>
              <div style={{ padding: '3px 6px', borderRight: '1px solid #ccc' }}>
                <div style={{ fontSize: '7px', textAlign: 'left' }}>VALOR ICMS ST</div>
                <div>R$ 0,00</div>
              </div>
              <div style={{ padding: '3px 6px', borderRight: '1px solid #ccc' }}>
                <div style={{ fontSize: '7px', textAlign: 'left' }}>TOTAL PRODUTOS</div>
                <div style={{ fontWeight: 700 }}>{formatCurrency(pedido.totalProdutos || pedido.valorTotalFinal)}</div>
              </div>
              <div style={{ padding: '3px 6px', backgroundColor: '#f0fdf4' }}>
                <div style={{ fontSize: '7px', textAlign: 'left', fontWeight: 800 }}>VALOR TOTAL DA NOTA</div>
                <div style={{ fontSize: '11px', fontWeight: 900, color: '#047857' }}>{formatCurrency(pedido.valorTotalFinal)}</div>
              </div>
            </div>
          </div>

          {/* 7. DADOS DOS PRODUTOS / SERVIÇOS */}
          <div style={{ border: '1px solid #000', marginBottom: '6px' }}>
            <div style={{ backgroundColor: '#e5e7eb', padding: '1px 6px', fontWeight: 800, fontSize: '8.5px', borderBottom: '1px solid #000' }}>
              DADOS DOS PRODUTOS / SERVIÇOS
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8.5px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #000', textAlign: 'left' }}>
                  <th style={{ padding: '2px 4px', borderRight: '1px solid #ccc', width: '50px' }}>CÓDIGO</th>
                  <th style={{ padding: '2px 4px', borderRight: '1px solid #ccc' }}>DESCRIÇÃO DO PRODUTO / SERVIÇO</th>
                  <th style={{ padding: '2px 4px', borderRight: '1px solid #ccc', width: '55px', textAlign: 'center' }}>NCM/SH</th>
                  <th style={{ padding: '2px 4px', borderRight: '1px solid #ccc', width: '35px', textAlign: 'center' }}>CST</th>
                  <th style={{ padding: '2px 4px', borderRight: '1px solid #ccc', width: '35px', textAlign: 'center' }}>CFOP</th>
                  <th style={{ padding: '2px 4px', borderRight: '1px solid #ccc', width: '30px', textAlign: 'center' }}>UN</th>
                  <th style={{ padding: '2px 4px', borderRight: '1px solid #ccc', width: '45px', textAlign: 'right' }}>QTD</th>
                  <th style={{ padding: '2px 4px', borderRight: '1px solid #ccc', width: '55px', textAlign: 'right' }}>VL. UNIT</th>
                  <th style={{ padding: '2px 4px', borderRight: '1px solid #ccc', width: '60px', textAlign: 'right' }}>VL. TOTAL</th>
                  <th style={{ padding: '2px 4px', width: '45px', textAlign: 'right' }}>ICMS %</th>
                </tr>
              </thead>
              <tbody>
                {(pedido.itens || []).map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '2px 4px', borderRight: '1px solid #ccc' }}>{item.codigoInterno || item.codigoFabrica || item.produtoId}</td>
                    <td style={{ padding: '2px 4px', borderRight: '1px solid #ccc', fontWeight: 600 }}>{item.descricao}</td>
                    <td style={{ padding: '2px 4px', borderRight: '1px solid #ccc', textAlign: 'center' }}>32089011</td>
                    <td style={{ padding: '2px 4px', borderRight: '1px solid #ccc', textAlign: 'center' }}>00</td>
                    <td style={{ padding: '2px 4px', borderRight: '1px solid #ccc', textAlign: 'center' }}>{item.cfop || pedido.naturezaOperacao?.cfop || '5102'}</td>
                    <td style={{ padding: '2px 4px', borderRight: '1px solid #ccc', textAlign: 'center' }}>{item.unidadeMedida || 'UN'}</td>
                    <td style={{ padding: '2px 4px', borderRight: '1px solid #ccc', textAlign: 'right', fontWeight: 700 }}>{item.quantidade}</td>
                    <td style={{ padding: '2px 4px', borderRight: '1px solid #ccc', textAlign: 'right' }}>{formatCurrency(item.precoFinalUnitario)}</td>
                    <td style={{ padding: '2px 4px', borderRight: '1px solid #ccc', textAlign: 'right', fontWeight: 700 }}>{formatCurrency(item.subtotalLiquido || item.subtotalBruto)}</td>
                    <td style={{ padding: '2px 4px', textAlign: 'right' }}>17%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 8. DADOS ADICIONAIS */}
          <div style={{ border: '1px solid #000' }}>
            <div style={{ backgroundColor: '#e5e7eb', padding: '1px 6px', fontWeight: 800, fontSize: '8.5px', borderBottom: '1px solid #000' }}>
              DADOS ADICIONAIS / INFORMAÇÕES COMPLEMENTARES
            </div>
            <div style={{ padding: '4px 6px', fontSize: '8px', minHeight: '40px', color: '#222' }}>
              <div>Trib aprox R$ {(pedido.totalIcms * 0.8).toFixed(2)} Federal e R$ {(pedido.totalIcms).toFixed(2)} Estadual (Lei 12.741/2012). Pedido Nº <strong>{pedido.numeroPedido}</strong>. Vendedor: <strong>{pedido.vendedorNome}</strong>.</div>
              {infCpl && <div style={{ marginTop: '2px' }}>{infCpl}</div>}
              <div style={{ marginTop: '2px', fontWeight: 700 }}>ICMS recolhido nos termos do Regulamento do ICMS do Estado.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
