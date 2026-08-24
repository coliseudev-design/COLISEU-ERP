import React from 'react';
import {
  Printer,
  Download,
  X,
  FileText,
  Building2,
  Calendar,
  DollarSign,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { formatCurrency, formatDate, formatCnpjCpf } from '../../lib/formatters';
import { Button } from '../ui/Button';

interface DanfeItem {
  seq: number;
  codigo: string;
  descricao: string;
  ncm: string;
  cst?: string;
  cfop?: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  baseIcms?: number;
  valorIcms?: number;
  valorIpi?: number;
  aliquotaIcms?: number;
  aliquotaIpi?: number;
}

interface DanfeData {
  chaveAcesso: string;
  numero: string;
  serie: string;
  dataEmissao: string;
  naturezaOperacao: string;
  protocolo?: string;
  dataAutorizacao?: string;
  
  // Emitente
  emitenteRazaoSocial: string;
  emitenteNomeFantasia?: string;
  emitenteCnpj: string;
  emitenteIe?: string;
  emitenteEndereco: string;
  emitenteCidade: string;
  emitenteUf: string;
  emitenteCep?: string;
  emitenteTelefone?: string;
  
  // Destinatário
  destinatarioRazaoSocial: string;
  destinatarioCnpj: string;
  destinatarioIe?: string;
  destinatarioEndereco?: string;
  destinatarioCidade?: string;
  destinatarioUf?: string;
  
  // Totais
  baseCalculoIcms: number;
  valorIcms: number;
  baseCalculoIcmsSt: number;
  valorIcmsSt: number;
  valorTotalProdutos: number;
  valorFrete: number;
  valorSeguro: number;
  valorDesconto: number;
  valorOutrasDespesas: number;
  valorIpi: number;
  valorTotalNota: number;
  
  // Itens
  itens: DanfeItem[];
  
  // Duplicatas
  duplicatas?: Array<{ numero: string; vencimento: string; valor: number }>;
  
  // Dados Adicionais
  informacoesComplementares?: string;
}

interface DanfeViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: DanfeData | null;
}

export const DanfeViewerModal: React.FC<DanfeViewerModalProps> = ({
  isOpen,
  onClose,
  data,
}) => {
  if (!isOpen || !data) return null;

  const handlePrint = () => {
    window.print();
  };

  // Formatação da Chave de Acesso em 4 blocos de 4 dígitos
  const chaveFormatada = data.chaveAcesso
    .replace(/\D/g, '')
    .replace(/(\d{4})/g, '$1 ')
    .trim();

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(4px)',
        zIndex: 11000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '920px',
          height: '92vh',
          backgroundColor: '#ffffff',
          color: '#000000',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Barra de Ações Superior (Não sai na impressão) */}
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
            <FileText size={18} color="#60a5fa" />
            <span style={{ fontWeight: 600, fontSize: '14px' }}>
              DANFE - Documento Auxiliar da Nota Fiscal Eletrônica (NF-e Nº {data.numero})
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Button variant="secondary" onClick={handlePrint} style={{ display: 'inline-flex', gap: '6px', fontSize: '12px' }}>
              <Printer size={15} /> Imprimir DANFE A4
            </Button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#9ca3af',
                cursor: 'pointer',
                padding: '4px',
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Conteúdo do DANFE Formatado em Padrão Fiscal Nacional */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
            fontFamily: 'Arial, sans-serif',
            fontSize: '9px',
            lineHeight: 1.2,
            backgroundColor: '#ffffff',
          }}
        >
          {/* Canhoto de Recebimento */}
          <div
            style={{
              border: '1px solid #000',
              padding: '6px',
              marginBottom: '8px',
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '8px',
            }}
          >
            <div style={{ width: '75%' }}>
              RECEBEMOS DE <strong>{data.emitenteRazaoSocial}</strong> OS PRODUTOS/SERVIÇOS CONSTANTES DA NOTA FISCAL INDICADA AO LADO
              <div style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
                <div style={{ borderTop: '1px solid #000', width: '120px', textAlign: 'center', paddingTop: '2px' }}>DATA DE RECEBIMENTO</div>
                <div style={{ borderTop: '1px solid #000', width: '260px', textAlign: 'center', paddingTop: '2px' }}>IDENTIFICAÇÃO E ASSINATURA DO RECEBEDOR</div>
              </div>
            </div>
            <div style={{ width: '22%', borderLeft: '1px solid #000', paddingLeft: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', fontWeight: 800 }}>NF-e</div>
              <div style={{ fontSize: '11px', fontWeight: 700 }}>Nº {data.numero}</div>
              <div>Série {data.serie}</div>
            </div>
          </div>

          {/* Cabeçalho Principal com Emitente, DANFE Box e Chave de Acesso */}
          <div style={{ border: '1px solid #000', display: 'flex', marginBottom: '8px' }}>
            {/* Bloco Emitente */}
            <div style={{ width: '40%', padding: '8px', borderRight: '1px solid #000' }}>
              <div style={{ fontSize: '11px', fontWeight: 800 }}>{data.emitenteRazaoSocial}</div>
              {data.emitenteNomeFantasia && <div style={{ fontSize: '10px', fontWeight: 600 }}>{data.emitenteNomeFantasia}</div>}
              <div style={{ fontSize: '8px', marginTop: '4px' }}>{data.emitenteEndereco}</div>
              <div style={{ fontSize: '8px' }}>{data.emitenteCidade} - {data.emitenteUf}</div>
              {data.emitenteTelefone && <div style={{ fontSize: '8px' }}>Fone: {data.emitenteTelefone}</div>}
            </div>

            {/* Bloco DANFE */}
            <div style={{ width: '22%', padding: '6px', borderRight: '1px solid #000', textAlign: 'center' }}>
              <div style={{ fontSize: '13px', fontWeight: 900 }}>DANFE</div>
              <div style={{ fontSize: '7px', fontWeight: 600 }}>Documento Auxiliar da Nota Fiscal Eletrônica</div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', margin: '4px 0', fontSize: '8px' }}>
                <div>0 - ENTRADA<br /><strong>1 - SAÍDA</strong></div>
                <div style={{ border: '1px solid #000', padding: '2px 6px', fontSize: '10px', fontWeight: 700 }}>1</div>
              </div>
              <div style={{ fontSize: '10px', fontWeight: 700 }}>Nº {data.numero}</div>
              <div>Série {data.serie}</div>
              <div>Folha 1/1</div>
            </div>

            {/* Bloco Chave de Acesso e Código de Barras */}
            <div style={{ width: '38%', padding: '6px' }}>
              <div style={{ textAlign: 'center', marginBottom: '4px' }}>
                {/* Simulação de Código de Barras Code 128 */}
                <div
                  style={{
                    height: '32px',
                    backgroundColor: '#000',
                    backgroundImage: 'repeating-linear-gradient(90deg, #000 0px, #000 2px, #fff 2px, #fff 4px, #000 4px, #000 7px, #fff 7px, #fff 8px)',
                    margin: '0 auto 4px',
                    width: '95%',
                  }}
                />
              </div>
              <div style={{ fontSize: '8px', color: '#666', textAlign: 'center' }}>CHAVE DE ACESSO</div>
              <div style={{ fontSize: '9px', fontWeight: 700, fontFamily: 'monospace', textAlign: 'center', letterSpacing: '0.5px' }}>
                {chaveFormatada}
              </div>
              <div style={{ fontSize: '7.5px', textAlign: 'center', marginTop: '4px', color: '#444' }}>
                Consulta de autenticidade no portal nacional da NF-e www.nfe.fazenda.gov.br/portal ou no site da Sefaz Autorizadora
              </div>
            </div>
          </div>

          {/* Protocolo de Autorização */}
          <div style={{ border: '1px solid #000', padding: '4px 8px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
            <div>NATUREZA DA OPERAÇÃO: <strong>{data.naturezaOperacao}</strong></div>
            <div>PROTOCOLO DE AUTORIZAÇÃO: <strong>{data.protocolo || '135260009876543'} - {formatDate(data.dataAutorizacao || data.dataEmissao)}</strong></div>
          </div>

          {/* Destinatário / Remetente */}
          <div style={{ border: '1px solid #000', padding: '6px', marginBottom: '8px' }}>
            <div style={{ fontSize: '8px', fontWeight: 800, borderBottom: '1px solid #ccc', paddingBottom: '2px', marginBottom: '4px' }}>
              DESTINATÁRIO / REMETENTE
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr', gap: '6px' }}>
              <div>NOME / RAZÃO SOCIAL: <strong>{data.destinatarioRazaoSocial}</strong></div>
              <div>CNPJ / CPF: <strong>{formatCnpjCpf(data.destinatarioCnpj)}</strong></div>
              <div>DATA DE EMISSÃO: <strong>{formatDate(data.dataEmissao)}</strong></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 0.5fr', gap: '6px', marginTop: '3px' }}>
              <div>ENDEREÇO: {data.destinatarioEndereco || 'RUA PRINCIPAL, S/N'}</div>
              <div>MUNICÍPIO: {data.destinatarioCidade || 'DOURADOS'}</div>
              <div>UF: {data.destinatarioUf || 'MS'}</div>
              <div>INSC. EST.: {data.destinatarioIe || 'ISENTO'}</div>
            </div>
          </div>

          {/* Cálculo do Imposto */}
          <div style={{ border: '1px solid #000', padding: '6px', marginBottom: '8px' }}>
            <div style={{ fontSize: '8px', fontWeight: 800, borderBottom: '1px solid #ccc', paddingBottom: '2px', marginBottom: '4px' }}>
              CÁLCULO DO IMPOSTO
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px', textAlign: 'right' }}>
              <div>
                <span style={{ fontSize: '7px', display: 'block', color: '#666' }}>BASE DE CÁLC. ICMS</span>
                <strong>{formatCurrency(data.baseCalculoIcms)}</strong>
              </div>
              <div>
                <span style={{ fontSize: '7px', display: 'block', color: '#666' }}>VALOR DO ICMS</span>
                <strong>{formatCurrency(data.valorIcms)}</strong>
              </div>
              <div>
                <span style={{ fontSize: '7px', display: 'block', color: '#666' }}>BASE CÁLC. ICMS ST</span>
                <strong>{formatCurrency(data.baseCalculoIcmsSt)}</strong>
              </div>
              <div>
                <span style={{ fontSize: '7px', display: 'block', color: '#666' }}>VALOR DO ICMS ST</span>
                <strong>{formatCurrency(data.valorIcmsSt)}</strong>
              </div>
              <div>
                <span style={{ fontSize: '7px', display: 'block', color: '#666' }}>VALOR TOTAL PRODUTOS</span>
                <strong>{formatCurrency(data.valorTotalProdutos)}</strong>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '4px', textAlign: 'right', marginTop: '4px', borderTop: '1px solid #eee', paddingTop: '3px' }}>
              <div>
                <span style={{ fontSize: '7px', display: 'block', color: '#666' }}>VALOR DO FRETE</span>
                {formatCurrency(data.valorFrete)}
              </div>
              <div>
                <span style={{ fontSize: '7px', display: 'block', color: '#666' }}>VALOR DO SEGURO</span>
                {formatCurrency(data.valorSeguro)}
              </div>
              <div>
                <span style={{ fontSize: '7px', display: 'block', color: '#666' }}>DESCONTO</span>
                {formatCurrency(data.valorDesconto)}
              </div>
              <div>
                <span style={{ fontSize: '7px', display: 'block', color: '#666' }}>OUTRAS DESP. ACESS.</span>
                {formatCurrency(data.valorOutrasDespesas)}
              </div>
              <div>
                <span style={{ fontSize: '7px', display: 'block', color: '#666' }}>VALOR DO IPI</span>
                {formatCurrency(data.valorIpi)}
              </div>
              <div>
                <span style={{ fontSize: '7px', display: 'block', color: '#666' }}>VALOR TOTAL DA NOTA</span>
                <strong style={{ fontSize: '10px' }}>{formatCurrency(data.valorTotalNota)}</strong>
              </div>
            </div>
          </div>

          {/* Dados dos Produtos e Serviços */}
          <div style={{ border: '1px solid #000', marginBottom: '8px' }}>
            <div style={{ fontSize: '8px', fontWeight: 800, padding: '4px 6px', borderBottom: '1px solid #000', backgroundColor: '#f3f4f6' }}>
              DADOS DOS PRODUTOS / SERVIÇOS
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #000', backgroundColor: '#fafafa' }}>
                  <th style={{ padding: '3px', textAlign: 'left', width: '60px' }}>CÓD. PROD.</th>
                  <th style={{ padding: '3px', textAlign: 'left' }}>DESCRIÇÃO DO PRODUTO / SERVIÇO</th>
                  <th style={{ padding: '3px', textAlign: 'center', width: '55px' }}>NCM/SH</th>
                  <th style={{ padding: '3px', textAlign: 'center', width: '30px' }}>CST</th>
                  <th style={{ padding: '3px', textAlign: 'center', width: '35px' }}>CFOP</th>
                  <th style={{ padding: '3px', textAlign: 'center', width: '25px' }}>UN</th>
                  <th style={{ padding: '3px', textAlign: 'right', width: '40px' }}>QTD</th>
                  <th style={{ padding: '3px', textAlign: 'right', width: '60px' }}>VL. UNIT.</th>
                  <th style={{ padding: '3px', textAlign: 'right', width: '65px' }}>VL. TOTAL</th>
                  <th style={{ padding: '3px', textAlign: 'right', width: '50px' }}>BC ICMS</th>
                  <th style={{ padding: '3px', textAlign: 'right', width: '45px' }}>VL. ICMS</th>
                  <th style={{ padding: '3px', textAlign: 'right', width: '40px' }}>ALIQ.%</th>
                </tr>
              </thead>
              <tbody>
                {data.itens.map((it, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '2px 3px', fontFamily: 'monospace' }}>{it.codigo}</td>
                    <td style={{ padding: '2px 3px', fontWeight: 600 }}>{it.descricao}</td>
                    <td style={{ padding: '2px 3px', textAlign: 'center', fontFamily: 'monospace' }}>{it.ncm}</td>
                    <td style={{ padding: '2px 3px', textAlign: 'center' }}>{it.cst || '0102'}</td>
                    <td style={{ padding: '2px 3px', textAlign: 'center' }}>{it.cfop || '5102'}</td>
                    <td style={{ padding: '2px 3px', textAlign: 'center' }}>{it.unidade}</td>
                    <td style={{ padding: '2px 3px', textAlign: 'right' }}>{it.quantidade}</td>
                    <td style={{ padding: '2px 3px', textAlign: 'right', fontFamily: 'monospace' }}>{formatCurrency(it.valorUnitario)}</td>
                    <td style={{ padding: '2px 3px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>{formatCurrency(it.valorTotal)}</td>
                    <td style={{ padding: '2px 3px', textAlign: 'right' }}>{formatCurrency(it.baseIcms || 0)}</td>
                    <td style={{ padding: '2px 3px', textAlign: 'right' }}>{formatCurrency(it.valorIcms || 0)}</td>
                    <td style={{ padding: '2px 3px', textAlign: 'right' }}>{it.aliquotaIcms || 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Dados Adicionais */}
          <div style={{ border: '1px solid #000', padding: '6px' }}>
            <div style={{ fontSize: '8px', fontWeight: 800, borderBottom: '1px solid #ccc', paddingBottom: '2px', marginBottom: '4px' }}>
              DADOS ADICIONAIS / INFORMAÇÕES COMPLEMENTARES
            </div>
            <div style={{ fontSize: '7.5px', color: '#333', minHeight: '30px' }}>
              {data.informacoesComplementares || 'Documento emitido por ME ou EPP optante pelo Simples Nacional. Não gera direito a crédito fiscal de IPI. Tributos incidentes conforme Lei 12.741/2012.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
