import React, { useState, useMemo, useEffect } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { AIInsight } from '../components/ui/AIComponents';
import { formatCurrency, formatDate, formatCnpjCpf } from '../lib/formatters';
import { ImportarXmlModal, NotaFiscalXmlParsed } from '../components/fiscal/ImportarXmlModal';
import { DanfeViewerModal } from '../components/fiscal/DanfeViewerModal';
import { ConferenciaCegaModal } from '../components/fiscal/ConferenciaCegaModal';
import {
  Search,
  Upload,
  FileCode,
  CheckCircle2,
  X,
  Check,
  FileText,
  PackageCheck,
  KeyRound,
  Eye,
  Building,
  Package,
  Calendar,
  DollarSign,
  Receipt,
  Sparkles,
  Barcode,
  Printer,
  ShieldCheck,
  AlertTriangle,
  Send,
  HelpCircle,
} from 'lucide-react';

export type EventoMDe = 'Ciência da Emissão' | 'Confirmação da Operação' | 'Desconhecimento' | 'Operação Não Realizada' | 'Pendente';

export interface EntradaXmlCompleta {
  chave: string;
  fornecedor: string;
  cnpj: string;
  nfe: string;
  serie: string;
  data: string;
  valor: number;
  qtdItens: number;
  status: 'Concluído' | 'Pendente' | 'Processando';
  statusMde?: EventoMDe;
  protocoloMde?: string;
  statusConferencia?: '100%_conferido' | 'com_divergencia' | 'pendente';
  itens: Array<{
    seq: number;
    codigoFornecedor: string;
    ean: string;
    descricao: string;
    ncm: string;
    unidade: string;
    quantidade: number;
    valorUnitario: number;
    valorTotal: number;
    statusDePara: string;
  }>;
  parcelas: Array<{
    numero: string;
    vencimento: string;
    valor: number;
  }>;
}

const INITIAL_ENTRADAS: EntradaXmlCompleta[] = [
  {
    chave: '50260103857766000185550010000197831000316715',
    fornecedor: 'RANCHAO MATERIAIS PARA CONSTRUCAO LTDA',
    cnpj: '03857766000185',
    nfe: '19783',
    serie: '1',
    data: '2026-08-08',
    valor: 683.0,
    qtdItens: 6,
    status: 'Concluído',
    statusMde: 'Confirmação da Operação',
    statusConferencia: '100%_conferido',
    itens: [
      { seq: 1, codigoFornecedor: '2913', ean: '78910001001', descricao: 'TELHA ONDULADA S.A 2,44X1,10 6MM', ncm: '68118200', unidade: 'PC', quantidade: 4, valorUnitario: 69.90, valorTotal: 279.60, statusDePara: 'Novo Produto' },
      { seq: 2, codigoFornecedor: '5172', ean: '78910001002', descricao: 'CIMENTO CPII F32 CAUE 50KG', ncm: '25232910', unidade: 'SC', quantidade: 3, valorUnitario: 43.50, valorTotal: 130.50, statusDePara: 'Novo Produto' },
      { seq: 3, codigoFornecedor: '4278', ean: '78910001003', descricao: 'TANQUE SINT. DUPLO 1.10X0.55 PP', ncm: '68109900', unidade: 'UN', quantidade: 1, valorUnitario: 239.00, valorTotal: 239.00, statusDePara: 'Novo Produto' },
      { seq: 4, codigoFornecedor: '1427', ean: '78910001004', descricao: 'PINO FEMEA TRAMONTINA 2P 10A 250A', ncm: '85366910', unidade: 'UN', quantidade: 1, valorUnitario: 5.00, valorTotal: 5.00, statusDePara: 'Novo Produto' },
      { seq: 5, codigoFornecedor: '1369', ean: '78910001005', descricao: 'PINO MACHO RETO 2P 10A 250V', ncm: '85366910', unidade: 'UN', quantidade: 1, valorUnitario: 4.00, valorTotal: 4.00, statusDePara: 'Novo Produto' },
    ],
    parcelas: [
      { numero: '001', vencimento: '2026-09-08', valor: 683.0 },
    ],
  },
  {
    chave: '35260833491029000188550010000006201000006204',
    fornecedor: 'BASF REFINISH BRASIL S.A.',
    cnpj: '33491029000188',
    nfe: '620',
    serie: '1',
    data: '2026-08-16',
    valor: 18750.0,
    qtdItens: 3,
    status: 'Concluído',
    statusMde: 'Ciência da Emissão',
    statusConferencia: 'pendente',
    itens: [
      { seq: 1, codigoFornecedor: 'BASF-01', ean: '78910001001', descricao: 'VERNIZ PU ALTO SOLIDOS 900ML', ncm: '32089010', unidade: 'UN', quantidade: 20, valorUnitario: 185.0, valorTotal: 3700.0, statusDePara: 'Vinculado' },
      { seq: 2, codigoFornecedor: 'BASF-02', ean: '78910001002', descricao: 'CATALISADOR RAPIDO PU 450ML', ncm: '38159000', unidade: 'UN', quantidade: 20, valorUnitario: 75.0, valorTotal: 1500.0, statusDePara: 'Vinculado' },
      { seq: 3, codigoFornecedor: 'BASF-03', ean: '78910001003', descricao: 'PRIMER POLIURETANO CINZA 900ML', ncm: '32089010', unidade: 'UN', quantidade: 30, valorUnitario: 95.0, valorTotal: 2850.0, statusDePara: 'Vinculado' },
    ],
    parcelas: [
      { numero: '001/003', vencimento: '2026-09-15', valor: 6250.0 },
      { numero: '002/003', vencimento: '2026-10-15', valor: 6250.0 },
      { numero: '003/003', vencimento: '2026-11-15', valor: 6250.0 },
    ],
  },
];

export const XmlEntradaPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalImportarOpen, setIsModalImportarOpen] = useState(false);
  const [selectedNotaVisualizar, setSelectedNotaVisualizar] = useState<EntradaXmlCompleta | null>(null);
  const [notaParaDanfe, setNotaParaDanfe] = useState<EntradaXmlCompleta | null>(null);
  const [notaParaConferencia, setNotaParaConferencia] = useState<EntradaXmlCompleta | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal de Manifestação MDe
  const [notaParaMde, setNotaParaMde] = useState<EntradaXmlCompleta | null>(null);
  const [eventoMdeSelecionado, setEventoMdeSelecionado] = useState<EventoMDe>('Confirmação da Operação');
  const [justificativaMde, setJustificativaMde] = useState('');

  // Carregar dados salvos no localStorage
  const [entradasXml, setEntradasXml] = useState<EntradaXmlCompleta[]>(() => {
    try {
      const saved = localStorage.getItem('coliseu_entradas_xml');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch { /* fallback */ }
    return INITIAL_ENTRADAS;
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Processa a importação do XML confirmado
  const handleConfirmarImportacao = (nota: NotaFiscalXmlParsed) => {
    const novaEntrada: EntradaXmlCompleta = {
      chave: nota.chave,
      fornecedor: nota.fornecedorNome,
      cnpj: nota.fornecedorCnpj,
      nfe: nota.numero,
      serie: nota.serie,
      data: nota.dataEmissao,
      valor: nota.valorTotal,
      qtdItens: nota.itens.length,
      status: 'Concluído',
      statusMde: 'Confirmação da Operação',
      statusConferencia: 'pendente',
      itens: nota.itens.map((it) => ({
        seq: it.seq,
        codigoFornecedor: it.codigoFornecedor,
        ean: it.ean,
        descricao: it.descricao,
        ncm: it.ncm,
        unidade: it.unidadeEstoque || it.unidade,
        quantidade: it.quantidadeEstoque || it.quantidade,
        valorUnitario: it.custoRealUnitario || it.valorUnitario,
        valorTotal: it.valorTotal,
        statusDePara: it.statusDePara,
      })),
      parcelas: nota.parcelas.map((p) => ({
        numero: p.numero,
        vencimento: p.vencimento,
        valor: p.valor,
      })),
    };

    const updated = [novaEntrada, ...entradasXml.filter((x) => x.chave !== nota.chave)];
    setEntradasXml(updated);

    try {
      localStorage.setItem('coliseu_entradas_xml', JSON.stringify(updated));

      // Gerar automaticamente os títulos no Contas a Pagar do Financeiro
      const savedTitulos = localStorage.getItem('coliseu_financial_custom_titulos');
      const currentTitulos: any[] = savedTitulos ? JSON.parse(savedTitulos) : [];

      nota.parcelas.forEach((parc, idx) => {
        const codTitulo = `PAG-NFE-${nota.numero}-${idx + 1}`;
        if (!currentTitulos.some((t) => t.codigo === codTitulo)) {
          currentTitulos.unshift({
            id: `xml_${Date.now()}_${idx}`,
            codigo: codTitulo,
            tipoRP: 'P',
            clienteFornecedor: nota.fornecedorNome,
            cpfCnpj: formatCnpjCpf(nota.fornecedorCnpj),
            titulo: `NF-e ${nota.numero} Parc ${parc.numero} - ${nota.fornecedorNome.substring(0, 20)}`,
            emissao: nota.dataEmissao,
            vencimento: parc.vencimento,
            valor: parc.valor,
            valorAtual: parc.valor,
            formaPagamento: 'BOLETO BANCARIO',
            parcela: parc.numero,
            isAberto: true,
            isVencido: new Date(parc.vencimento) < new Date(),
            status: 'Pendente',
          });
        }
      });

      localStorage.setItem('coliseu_financial_custom_titulos', JSON.stringify(currentTitulos));
    } catch (e) {
      console.error(e);
    }

    showToast(`✅ NF-e nº ${nota.numero} de '${nota.fornecedorNome}' importada e integrada ao estoque e financeiro!`);
  };

  // Transmitir Evento MDe para SEFAZ
  const handleTransmitirMde = () => {
    if (!notaParaMde) return;

    if (eventoMdeSelecionado === 'Operação Não Realizada' && justificativaMde.trim().length < 15) {
      alert('Para operação não realizada, informe uma justificativa com no mínimo 15 caracteres.');
      return;
    }

    const protocolo = `1352600${Math.floor(Math.random() * 9000000 + 1000000)}`;
    const updated = entradasXml.map((x) => {
      if (x.chave === notaParaMde.chave) {
        return {
          ...x,
          statusMde: eventoMdeSelecionado,
          protocoloMde: protocolo,
        };
      }
      return x;
    });

    setEntradasXml(updated);
    try {
      localStorage.setItem('coliseu_entradas_xml', JSON.stringify(updated));
    } catch { /* fallback */ }

    setNotaParaMde(null);
    setJustificativaMde('');
    showToast(`✓ Evento SEFAZ '${eventoMdeSelecionado}' transmitido com sucesso! Protocolo: ${protocolo}`);
  };

  // Filtragem de Notas
  const filteredEntradas = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return entradasXml;
    return entradasXml.filter((x) =>
      x.fornecedor.toLowerCase().includes(q) ||
      x.nfe.toLowerCase().includes(q) ||
      x.chave.toLowerCase().includes(q) ||
      x.cnpj.toLowerCase().includes(q)
    );
  }, [entradasXml, searchTerm]);

  // Estatísticas Rápidas
  const totalNotas = entradasXml.length;
  const totalValor = entradasXml.reduce((acc, curr) => acc + curr.valor, 0);
  const totalItens = entradasXml.reduce((acc, curr) => acc + curr.qtdItens, 0);

  return (
    <div className="coliseu-page" style={{ padding: '20px 28px' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            backgroundColor: '#10b981',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={18} />
          {toastMessage}
        </div>
      )}

      {/* Cabeçalho da Página */}
      <PageHeader
        title="Entrada de Mercadorias via XML NF-e & Gestão de Compras"
        subtitle="Importação inteligente com Landed Cost, bipagem cega, DANFE A4 e Manifestação do Destinatário (SEFAZ MDe)."
        icon={<FileCode style={{ color: 'var(--primary)', width: '1.5rem', height: '1.5rem' }} />}
      />

      {/* Cards de Resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', margin: '20px 0' }}>
        <div className="coliseu-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Receipt size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Total de Notas Processadas</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>{totalNotas} NF-es</div>
          </div>
        </div>

        <div className="coliseu-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DollarSign size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Volume Financeiro Importado</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#10b981', fontFamily: 'monospace' }}>{formatCurrency(totalValor)}</div>
          </div>
        </div>

        <div className="coliseu-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Package size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Itens Ingressados no Estoque</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>{totalItens} produtos</div>
          </div>
        </div>
      </div>

      {/* Painel Principal com Tabela de Notas */}
      <div className="coliseu-card" style={{ padding: '20px' }}>
        {/* Barra de Filtros e Ações */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px' }}>
          <div style={{ position: 'relative', width: '360px' }}>
            <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Buscar por fornecedor, nº nota fiscal, chave..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="coliseu-input"
              style={{ paddingLeft: '32px', height: '34px', fontSize: '12px' }}
            />
          </div>

          <Button
            variant="primary"
            onClick={() => setIsModalImportarOpen(true)}
            style={{ display: 'inline-flex', gap: '6px', fontSize: '12px', fontWeight: 600 }}
          >
            <Upload size={15} /> Importar XML / Chave SEFAZ
          </Button>
        </div>

        {/* Tabela de Notas Fiscais */}
        <div className="coliseu-table-container" style={{ border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
          <table className="coliseu-table" style={{ fontSize: '12px' }}>
            <thead>
              <tr>
                <th style={{ width: '85px' }}>NF-e Nº</th>
                <th>Fornecedor / Emitente</th>
                <th style={{ width: '85px' }}>Emissão</th>
                <th style={{ textAlign: 'right', width: '100px' }}>Valor Total</th>
                <th style={{ textAlign: 'center', width: '130px' }}>Manifestação MDe</th>
                <th style={{ textAlign: 'center', width: '120px' }}>Conferência</th>
                <th style={{ textAlign: 'center', width: '160px' }}>Ações Rápidas</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntradas.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    Nenhuma entrada de mercadoria localizada com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredEntradas.map((x) => (
                  <tr key={x.chave}>
                    <td style={{ fontWeight: 700, color: 'var(--text-link)', fontFamily: 'monospace' }}>
                      NF-e {x.nfe}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{x.fornecedor}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        CNPJ: {formatCnpjCpf(x.cnpj)} | Chave: {x.chave.substring(0, 16)}...
                      </div>
                    </td>
                    <td>{formatDate(x.data)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#10b981', fontFamily: 'monospace' }}>
                      {formatCurrency(x.valor)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span
                        onClick={() => setNotaParaMde(x)}
                        title="Clique para transmitir evento de Manifestação à SEFAZ"
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 600,
                          backgroundColor:
                            x.statusMde === 'Confirmação da Operação'
                              ? 'rgba(16, 185, 129, 0.15)'
                              : x.statusMde === 'Ciência da Emissão'
                              ? 'rgba(59, 130, 246, 0.15)'
                              : 'rgba(239, 68, 68, 0.15)',
                          color:
                            x.statusMde === 'Confirmação da Operação'
                              ? '#10b981'
                              : x.statusMde === 'Ciência da Emissão'
                              ? '#3b82f6'
                              : '#ef4444',
                          cursor: 'pointer',
                        }}
                      >
                        {x.statusMde || 'Pendente (MDe)'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span
                        onClick={() => setNotaParaConferencia(x)}
                        title="Clique para abrir conferência física cega por leitor"
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 600,
                          backgroundColor:
                            x.statusConferencia === '100%_conferido'
                              ? 'rgba(16, 185, 129, 0.15)'
                              : 'rgba(245, 158, 11, 0.15)',
                          color:
                            x.statusConferencia === '100%_conferido'
                              ? '#10b981'
                              : '#f59e0b',
                          cursor: 'pointer',
                        }}
                      >
                        {x.statusConferencia === '100%_conferido' ? '✓ 100% Conferido' : '⏳ Bipar Itens'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '4px' }}>
                        <button
                          type="button"
                          onClick={() => setNotaParaDanfe(x)}
                          title="Visualizar e Imprimir DANFE A4"
                          style={{
                            padding: '3px 6px',
                            fontSize: '10px',
                            borderRadius: '4px',
                            border: '1px solid var(--border-default)',
                            background: 'var(--surface-2)',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}
                        >
                          <Printer size={12} /> DANFE
                        </button>

                        <button
                          type="button"
                          onClick={() => setNotaParaConferencia(x)}
                          title="Conferência Física por Código de Barras"
                          style={{
                            padding: '3px 6px',
                            fontSize: '10px',
                            borderRadius: '4px',
                            border: '1px solid var(--border-default)',
                            background: 'var(--surface-2)',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}
                        >
                          <Barcode size={12} /> Bipar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Importação com Landed Cost e Precificação */}
      <ImportarXmlModal
        isOpen={isModalImportarOpen}
        onClose={() => setIsModalImportarOpen(false)}
        onConfirmarImportacao={handleConfirmarImportacao}
      />

      {/* Modal do DANFE A4 Oficial */}
      {notaParaDanfe && (
        <DanfeViewerModal
          isOpen={!!notaParaDanfe}
          onClose={() => setNotaParaDanfe(null)}
          data={{
            chaveAcesso: notaParaDanfe.chave,
            numero: notaParaDanfe.nfe,
            serie: notaParaDanfe.serie,
            dataEmissao: notaParaDanfe.data,
            naturezaOperacao: 'COMPRA PARA COMERCIALIZACAO',
            emitenteRazaoSocial: notaParaDanfe.fornecedor,
            emitenteCnpj: notaParaDanfe.cnpj,
            emitenteEndereco: 'AV. PRINCIPAL DOS FORNECEDORES, 1500',
            emitenteCidade: 'DOURADOS',
            emitenteUf: 'MS',
            destinatarioRazaoSocial: 'COLISEU MATERIAIS PARA CONSTRUCAO LTDA',
            destinatarioCnpj: '05.766.577/0001-22',
            baseCalculoIcms: notaParaDanfe.valor * 0.8,
            valorIcms: notaParaDanfe.valor * 0.8 * 0.12,
            baseCalculoIcmsSt: 0,
            valorIcmsSt: 0,
            valorTotalProdutos: notaParaDanfe.valor,
            valorFrete: 0,
            valorSeguro: 0,
            valorDesconto: 0,
            valorOutrasDespesas: 0,
            valorIpi: 0,
            valorTotalNota: notaParaDanfe.valor,
            itens: notaParaDanfe.itens.map((it) => ({
              seq: it.seq,
              codigo: it.codigoFornecedor,
              descricao: it.descricao,
              ncm: it.ncm,
              unidade: it.unidade,
              quantidade: it.quantidade,
              valorUnitario: it.valorUnitario,
              valorTotal: it.valorTotal,
            })),
            duplicatas: notaParaDanfe.parcelas.map((p) => ({
              numero: p.numero,
              vencimento: p.vencimento,
              valor: p.valor,
            })),
          }}
        />
      )}

      {/* Modal de Conferência Cega */}
      {notaParaConferencia && (
        <ConferenciaCegaModal
          isOpen={!!notaParaConferencia}
          onClose={() => setNotaParaConferencia(null)}
          numeroNota={notaParaConferencia.nfe}
          fornecedorNome={notaParaConferencia.fornecedor}
          itens={notaParaConferencia.itens}
          onConferenciaConcluida={(relatorio) => {
            const updated = entradasXml.map((x) => {
              if (x.chave === notaParaConferencia.chave) {
                return { ...x, statusConferencia: relatorio.status };
              }
              return x;
            });
            setEntradasXml(updated);
            try {
              localStorage.setItem('coliseu_entradas_xml', JSON.stringify(updated));
            } catch { /* fallback */ }
            showToast(
              relatorio.status === '100%_conferido'
                ? '✓ Conferência física 100% aprovada!'
                : `⚠️ Conferência finalizada com ${relatorio.itensDivergentes.length} divergência(s).`
            );
          }}
        />
      )}

      {/* Modal de Manifestação do Destinatário (SEFAZ MDe) */}
      {notaParaMde && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(3px)',
            zIndex: 10600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '560px',
              backgroundColor: 'var(--surface-1)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={20} color="#3b82f6" />
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Manifestação do Destinatário (SEFAZ MDe)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setNotaParaMde(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              NF-e Nº {notaParaMde.nfe} • Fornecedor: <strong>{notaParaMde.fornecedor}</strong>
              <br />
              Chave: <span style={{ fontFamily: 'monospace' }}>{notaParaMde.chave}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
              {[
                { id: 'Confirmação da Operação', desc: 'Confirma que a mercadoria foi recebida integralmente e aceita.', color: '#10b981' },
                { id: 'Ciência da Emissão', desc: 'Declara ter ciência da emissão da nota antes do recebimento da carga.', color: '#3b82f6' },
                { id: 'Desconhecimento', desc: 'Declara que a operação não foi solicitada por esta empresa.', color: '#ef4444' },
                { id: 'Operação Não Realizada', desc: 'A compra foi realizada mas a entrega foi cancelada/avariada.', color: '#f59e0b' },
              ].map((ev) => (
                <label
                  key={ev.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '10px',
                    borderRadius: '6px',
                    border: `1px solid ${eventoMdeSelecionado === ev.id ? ev.color : 'var(--border-subtle)'}`,
                    backgroundColor: eventoMdeSelecionado === ev.id ? 'var(--surface-2)' : 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name="eventoMde"
                    checked={eventoMdeSelecionado === ev.id}
                    onChange={() => setEventoMdeSelecionado(ev.id as any)}
                    style={{ marginTop: '3px' }}
                  />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '12px', color: 'var(--text-primary)' }}>{ev.id}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{ev.desc}</div>
                  </div>
                </label>
              ))}
            </div>

            {eventoMdeSelecionado === 'Operação Não Realizada' && (
              <div style={{ marginBottom: '16px' }}>
                <label className="coliseu-label">Justificativa do Cancelamento / Recusa (Mínimo 15 caracteres) *</label>
                <textarea
                  value={justificativaMde}
                  onChange={(e) => setJustificativaMde(e.target.value)}
                  placeholder="Ex: Mercadoria avariada durante o transporte e devolvida ao transportador."
                  className="coliseu-input"
                  style={{ height: '60px', padding: '8px', fontSize: '12px' }}
                />
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setNotaParaMde(null)}
                className="coliseu-btn coliseu-btn-secondary"
                style={{ padding: '8px 16px', fontSize: '12px' }}
              >
                Cancelar
              </button>

              <Button
                variant="primary"
                onClick={handleTransmitirMde}
                style={{ padding: '8px 20px', fontSize: '12px', fontWeight: 600, display: 'inline-flex', gap: '6px' }}
              >
                <Send size={15} /> Transmitir Evento para SEFAZ
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
