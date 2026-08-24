import React, { useState, useMemo, useEffect } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { formatCurrency, formatDate } from '../lib/formatters';
import {
  FileText,
  Plus,
  Search,
  CheckCircle2,
  Printer,
  FileCheck,
  Edit2,
  Trash2,
  Layers,
  Sparkles,
  ShoppingBag,
  TrendingUp,
  DollarSign,
  Barcode,
  Receipt,
} from 'lucide-react';
import {
  PedidoVendaItem,
  StatusPedidoVenda,
  getPedidosVenda,
  faturarPedidoDireto,
  excluirPedidoVenda,
  podeFaturarPedidoNFe,
  podeFaturarPedidoNFCe,
  podeEmitirAcobertamento,
} from '../lib/pedidosVenda';
import { syncService } from '../lib/syncService';
import { ModalEmissaoPedidoVenda } from '../components/vendas/ModalEmissaoPedidoVenda';
import { ModalImpressaoPedidoA4 } from '../components/vendas/ModalImpressaoPedidoA4';
import { ModalFaturamentoNFe } from '../components/vendas/ModalFaturamentoNFe';
import { ModalFaturamentoNFCe } from '../components/vendas/ModalFaturamentoNFCe';

export const PedidosVendasPage: React.FC = () => {
  const [pedidos, setPedidos] = useState<PedidoVendaItem[]>(getPedidosVenda);
  const [tabStatus, setTabStatus] = useState<string>('TODOS');
  const [viewMode, setViewMode] = useState<'TABELA' | 'KANBAN'>('TABELA');
  const [busca, setBusca] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modais
  const [isModalEmissaoOpen, setIsModalEmissaoOpen] = useState(false);
  const [isModalImpressaoOpen, setIsModalImpressaoOpen] = useState(false);
  const [isModalFaturamentoOpen, setIsModalFaturamentoOpen] = useState(false);
  const [isModalFaturamentoNFCeOpen, setIsModalFaturamentoNFCeOpen] = useState(false);
  const [pedidoSelecionado, setPedidoSelecionado] = useState<PedidoVendaItem | null>(null);
  const [pedidoFaturamento, setPedidoFaturamento] = useState<PedidoVendaItem | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  useEffect(() => {
    const handleUpdate = () => {
      setPedidos(getPedidosVenda());
    };
    window.addEventListener('coliseu_pedidos_vendas_updated', handleUpdate);

    // Sincronização em background:
    const runSync = async () => {
      try {
        const localList = getPedidosVenda();
        // 1. Enviar lote de pedidos locais para a VPS (PostgreSQL Central)
        await syncService.syncBatchPedidos(localList);

        // 2. Buscar pedidos da Nuvem (PostgreSQL Central)
        const cloudList = await syncService.fetchCloudPedidos();
        if (cloudList && cloudList.length > 0) {
          const map = new Map<string, PedidoVendaItem>();

          cloudList.forEach((cp: any) => {
            const rawNum = cp.numero_pedido || cp.numeroPedido || '0';
            const rawCliente = cp.cliente_nome || cp.clienteNome || 'CLIENTE NÃO INFORMADO';
            const rawTotal = parseFloat(cp.valor_total || cp.valorTotalFinal || '0');
            const rawData = cp.data_emissao || cp.dataEmissao || new Date().toLocaleDateString('pt-BR');
            const dataFmt = typeof rawData === 'string' && rawData.includes('-') ? new Date(rawData).toLocaleDateString('pt-BR') : String(rawData);

            const itemFormatado: PedidoVendaItem = {
              id: cp.id,
              numeroPedido: String(rawNum),
              tipoMovimento: cp.tipoMovimento || 'SAIDA',
              status: cp.status || 'APROVADO',
              dataEmissao: dataFmt,
              filialDepto: cp.filial_id || cp.filialDepto || 'MATRIZ - DOURADOS/MS',
              clienteId: cp.cliente_id || cp.clienteId || '',
              clienteCodigo: cp.clienteCodigo || '1',
              clienteNome: rawCliente,
              clienteCnpjCpf: cp.cliente_cpf_cnpj || cp.clienteCnpjCpf || '',
              clienteCidade: cp.cliente_cidade || cp.clienteCidade || 'DOURADOS',
              clienteUf: cp.cliente_uf || cp.clienteUf || 'MS',
              clienteEndereco: cp.cliente_endereco || cp.clienteEndereco || 'CENTRO',
              clienteBairro: cp.cliente_bairro || cp.clienteBairro || 'CENTRO',
              clienteTelefone: cp.clienteTelefone || '',
              naturezaOperacao: typeof cp.naturezaOperacao === 'object' && cp.naturezaOperacao !== null
                ? cp.naturezaOperacao
                : {
                    cfop: '5102',
                    descricao: cp.natureza_operacao || '5102 - VENDA DE MERCADORIAS',
                    tipo: 'SAIDA',
                    geraFinanceiro: true,
                    movimentaEstoque: true,
                    destinacaoPadrao: 'ESTADUAL',
                  },
              vendedorId: cp.vendedorId || 'VEND-1',
              vendedorNome: cp.vendedor_nome || cp.vendedorNome || 'CARLOS SILVA (INTERNO)',
              tabelaPrecos: cp.tabelaPrecos || 'TABELA PADRÃO',
              tipoFrete: cp.tipoFrete || 'CIF',
              valorFrete: cp.valorFrete || 0,
              pesoLiquidoKg: cp.pesoLiquidoKg || 0,
              pesoBrutoKg: cp.pesoBrutoKg || 0,
              quantidadeVolumes: cp.quantidadeVolumes || 1,
              itens: Array.isArray(cp.itens) ? cp.itens : [],
              totalProdutos: rawTotal,
              totalDescontoGlobal: 0,
              totalAcrescimos: 0,
              totalIpi: 0,
              totalIcms: 0,
              totalIcmsSt: 0,
              totalServicos: 0,
              valorTotalFinal: rawTotal,
              formaPagamentoNome: cp.formaPagamentoNome || 'A VISTA / A PRAZO',
              parcelas: Array.isArray(cp.parcelas) ? cp.parcelas : [],
            };

            map.set(cp.id, itemFormatado);
          });

          // Incluir pedidos locais reais que ainda não foram gravados no banco
          localList.forEach(p => {
            if (!map.has(p.id) && !p.id.startsWith('PED-00')) {
              map.set(p.id, p);
            }
          });

          const unificada = Array.from(map.values());
          localStorage.setItem('coliseu_pedidos_venda_list', JSON.stringify(unificada));
          setPedidos(unificada);
        }
      } catch (err) {
        console.warn('[Pedidos] Falha no ciclo de sincronização:', err);
      }
    };

    runSync();
    const interval = setInterval(runSync, 10000); // Polling a cada 10s

    return () => {
      window.removeEventListener('coliseu_pedidos_vendas_updated', handleUpdate);
      clearInterval(interval);
    };
  }, []);

  const handleNovoPedido = () => {
    setPedidoSelecionado(null);
    setIsModalEmissaoOpen(true);
  };

  const handleEditarPedido = (p: PedidoVendaItem) => {
    setPedidoSelecionado(p);
    setIsModalEmissaoOpen(true);
  };

  const handleImprimirA4 = (p: PedidoVendaItem) => {
    setPedidoSelecionado(p);
    setIsModalImpressaoOpen(true);
  };

  const handleFaturarNFe = (p: PedidoVendaItem) => {
    const fiscalCheck = podeFaturarPedidoNFe(p);
    if (!fiscalCheck.permitido && fiscalCheck.acaoRecomendada !== 'ACOBERTAMENTO') {
      showToast(`⚠️ ${fiscalCheck.motivo}`);
      return;
    }
    setPedidoFaturamento(p);
    setIsModalFaturamentoOpen(true);
  };

  const handleFaturarNFCe = (p: PedidoVendaItem) => {
    const fiscalCheck = podeFaturarPedidoNFCe(p);
    if (!fiscalCheck.permitido) {
      showToast(`⚠️ ${fiscalCheck.motivo}`);
      return;
    }
    setPedidoFaturamento(p);
    setIsModalFaturamentoNFCeOpen(true);
  };

  const handleExcluir = (id: string, numero: string) => {
    if (confirm(`Deseja realmente excluir o Pedido Nº ${numero}?`)) {
      excluirPedidoVenda(id);
      showToast(`Pedido Nº ${numero} excluído.`);
    }
  };

  // Filtragem
  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter((p) => {
      if (tabStatus !== 'TODOS' && p.status !== tabStatus) return false;

      if (busca) {
        const q = busca.toLowerCase();
        const mNum = p.numeroPedido.toLowerCase().includes(q);
        const mCli = p.clienteNome.toLowerCase().includes(q);
        const mVend = p.vendedorNome.toLowerCase().includes(q);
        const mNat = p.naturezaOperacao.descricao.toLowerCase().includes(q) || p.naturezaOperacao.cfop.includes(q);
        const mItem = p.itens.some(
          (i) =>
            i.descricao.toLowerCase().includes(q) ||
            i.codigoFabrica.toLowerCase().includes(q) ||
            i.referencia.toLowerCase().includes(q) ||
            i.codigoBarras.includes(q)
        );
        if (!mNum && !mCli && !mVend && !mNat && !mItem) return false;
      }

      return true;
    });
  }, [pedidos, tabStatus, busca]);

  // Estatísticas de Faturamento B2B
  const stats = useMemo(() => {
    const totalQtd = pedidos.length;
    const orcamentosVal = pedidos
      .filter((p) => p.status === 'ORCAMENTO')
      .reduce((acc, p) => acc + p.valorTotalFinal, 0);
    const faturadosVal = pedidos
      .filter((p) => p.status === 'FATURADO' || p.status === 'APROVADO')
      .reduce((acc, p) => acc + p.valorTotalFinal, 0);
    const ticketMedio = totalQtd > 0 ? faturadosVal / (pedidos.filter((p) => p.status !== 'CANCELADO').length || 1) : 0;

    return {
      totalQtd,
      orcamentosVal,
      faturadosVal,
      ticketMedio,
    };
  }, [pedidos]);

  return (
    <div className="coliseu-page" style={{ minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {toastMessage && (
        <div className="coliseu-toast-container">
          <div className="coliseu-toast coliseu-toast--success">
            <CheckCircle2 size={18} color="#10b981" />
            <span style={{ fontSize: '12px', fontWeight: 600 }}>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <PageHeader
        title="Central de Pedidos de Venda, Orçamentos & Faturamento"
        description="Emissão corporativa com seleção de Natureza de Operação (CFOP), busca por Código de Fábrica/Referência, NF-e, NFC-e e Boletos."
        breadcrumbItems={[
          { label: 'Comercial', active: false },
          { label: 'Pedidos & Orçamentos (Vendas B2B)', active: true },
        ]}
      >
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ display: 'flex', backgroundColor: 'var(--surface-2)', borderRadius: '6px', padding: '2px', border: '1px solid var(--border-default)' }}>
            <button
              type="button"
              onClick={() => setViewMode('TABELA')}
              style={{
                border: 'none',
                background: viewMode === 'TABELA' ? 'var(--surface-1)' : 'transparent',
                color: viewMode === 'TABELA' ? '#3b82f6' : 'var(--text-muted)',
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 700,
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Tabela
            </button>
            <button
              type="button"
              onClick={() => setViewMode('KANBAN')}
              style={{
                border: 'none',
                background: viewMode === 'KANBAN' ? 'var(--surface-1)' : 'transparent',
                color: viewMode === 'KANBAN' ? '#3b82f6' : 'var(--text-muted)',
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 700,
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Kanban
            </button>
          </div>

          <Button
            variant="primary"
            onClick={handleNovoPedido}
            style={{ display: 'inline-flex', gap: '6px', fontSize: '12px' }}
            leftIcon={<Plus size={15} />}
          >
            Emitir Pedido / Orçamento (F3)
          </Button>
        </div>
      </PageHeader>

      {/* Métricas Comerciais */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '14px',
          marginBottom: '16px',
        }}
      >
        <div className="coliseu-card" style={{ padding: '14px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Total de Pedidos & Propostas</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: '4px 0' }}>
            {stats.totalQtd} registros
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Movimento geral</div>
        </div>

        <div className="coliseu-card" style={{ padding: '14px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Orçamentos em Aberto</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#eab308', fontFamily: 'monospace', margin: '4px 0' }}>
            {formatCurrency(stats.orcamentosVal)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Propostas em negociação</div>
        </div>

        <div className="coliseu-card" style={{ padding: '14px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Faturamento Aprovado / NF-e</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#10b981', fontFamily: 'monospace', margin: '4px 0' }}>
            {formatCurrency(stats.faturadosVal)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Vendas convertidas</div>
        </div>

        <div className="coliseu-card" style={{ padding: '14px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Ticket Médio B2B</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#3b82f6', fontFamily: 'monospace', margin: '4px 0' }}>
            {formatCurrency(stats.ticketMedio)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Média por venda</div>
        </div>
      </div>

      {/* Abas e Barra de Busca */}
      <div
        className="coliseu-card"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', backgroundColor: 'var(--surface-3)', borderRadius: '6px', padding: '2px', gap: '2px', flexWrap: 'wrap' }}>
          {[
            { key: 'TODOS', label: 'Todos os Pedidos' },
            { key: 'ORCAMENTO', label: '🟡 Orçamentos (Em Aberto)' },
            { key: 'APROVADO', label: '🔵 Pedidos Aprovados' },
            { key: 'FATURADO', label: '🟢 Faturados (NF-e Emitida)' },
            { key: 'CANCELADO', label: '🔴 Cancelados' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setTabStatus(tab.key)}
              style={{
                border: 'none',
                background: tabStatus === tab.key ? 'var(--surface-1)' : 'transparent',
                color: tabStatus === tab.key ? '#3b82f6' : 'var(--text-muted)',
                fontSize: '11px',
                fontWeight: 700,
                padding: '6px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ width: '320px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar Nº, Cliente, Cód. Fábrica, CFOP..."
              className="coliseu-input"
              style={{ paddingLeft: '30px', height: '34px', fontSize: '11px' }}
            />
          </div>
        </div>
      </div>

      {/* VISÃO TABELA */}
      {viewMode === 'TABELA' && (
        <div className="coliseu-card">
          <div className="coliseu-table-container">
            <table className="coliseu-table" style={{ fontSize: '12px' }}>
              <thead>
                <tr>
                  <th style={{ width: '85px' }}>Nº Pedido</th>
                  <th style={{ width: '90px' }}>Emissão</th>
                  <th>Cliente / Destinatário</th>
                  <th style={{ width: '220px' }}>Natureza da Operação</th>
                  <th style={{ width: '130px' }}>Vendedor</th>
                  <th style={{ width: '60px', textAlign: 'center' }}>Itens</th>
                  <th style={{ width: '110px', textAlign: 'right' }}>Total (R$)</th>
                  <th style={{ width: '100px', textAlign: 'center' }}>Status</th>
                  <th style={{ width: '180px', textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {pedidosFiltrados.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 800, color: 'var(--text-link)', fontSize: '12px' }}>
                      {p.numeroPedido}
                    </td>
                    <td style={{ fontSize: '11px' }} className="tabular-nums">{formatDate(p.dataEmissao)}</td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.clienteNome}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        CNPJ/CPF: {p.clienteCnpjCpf} • {p.clienteCidade}/{p.clienteUf}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#3b82f6', fontSize: '11px' }}>
                        {p.naturezaOperacao?.cfop || '5102'} - {(p.naturezaOperacao?.descricao || 'VENDA DE MERCADORIAS').slice(0, 32)}...
                      </div>
                    </td>
                    <td style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{p.vendedorNome}</td>
                    <td style={{ textAlign: 'center', fontWeight: 700 }}>{p.itens.length}</td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: '#10b981', fontFamily: 'monospace' }}>
                      {formatCurrency(p.valorTotalFinal)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor:
                            p.status === 'FATURADO'
                              ? 'rgba(16, 185, 129, 0.15)'
                              : p.status === 'APROVADO'
                              ? 'rgba(59, 130, 246, 0.15)'
                              : 'rgba(234, 179, 8, 0.15)',
                          color:
                            p.status === 'FATURADO'
                              ? '#10b981'
                              : p.status === 'APROVADO'
                              ? '#3b82f6'
                              : '#eab308',
                        }}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                        {/* Imprimir A4 */}
                        <button
                          type="button"
                          onClick={() => handleImprimirA4(p)}
                          className="coliseu-btn coliseu-btn-secondary"
                          style={{ padding: '0 6px', height: '26px', fontSize: '11px' }}
                          title="Imprimir Pedido / Orçamento A4"
                        >
                          <Printer size={12} /> A4
                        </button>

                        {/* Botão Dinâmico de NF-e / Acobertamento */}
                        {(() => {
                          const check = podeFaturarPedidoNFe(p);
                          if (check.acaoRecomendada === 'ACOBERTAMENTO') {
                            return (
                              <button
                                type="button"
                                onClick={() => handleFaturarNFe(p)}
                                className="coliseu-btn coliseu-btn-secondary"
                                style={{ padding: '0 6px', height: '26px', fontSize: '11px', color: '#8b5cf6', borderColor: 'rgba(139, 92, 246, 0.4)' }}
                                title="Emitir NF-e de Acobertamento (CFOP 5.929 / 6.929)"
                              >
                                <FileCheck size={12} /> Acobertamento
                              </button>
                            );
                          }
                          if (check.permitido) {
                            return (
                              <button
                                type="button"
                                onClick={() => handleFaturarNFe(p)}
                                className="coliseu-btn coliseu-btn-secondary"
                                style={{ padding: '0 6px', height: '26px', fontSize: '11px', color: '#3b82f6' }}
                                title="Emitir NF-e Mod. 55"
                              >
                                <FileCheck size={12} /> Emitir NFE
                              </button>
                            );
                          }
                          if (p.chaveNFeEmitida) {
                            return (
                              <button
                                type="button"
                                onClick={() => handleFaturarNFe(p)}
                                className="coliseu-btn coliseu-btn-secondary"
                                style={{ padding: '0 6px', height: '26px', fontSize: '11px', color: '#10b981' }}
                                title={`NF-e Nº ${p.numeroNFe || ''} Autorizada`}
                              >
                                <FileCheck size={12} /> Ver NF-e
                              </button>
                            );
                          }
                          return null;
                        })()}

                        {/* Botão Dinâmico de NFC-e (Mod. 65) */}
                        {(() => {
                          const checkNfce = podeFaturarPedidoNFCe(p);
                          if (checkNfce.permitido) {
                            return (
                              <button
                                type="button"
                                onClick={() => handleFaturarNFCe(p)}
                                className="coliseu-btn coliseu-btn-secondary"
                                style={{ padding: '0 6px', height: '26px', fontSize: '11px', color: '#10b981' }}
                                title="Emitir NFC-e Mod. 65 (Cupom Fiscal)"
                              >
                                <Receipt size={12} /> Emitir NFCe
                              </button>
                            );
                          }
                          if (p.chaveNFCeEmitida) {
                            return (
                              <button
                                type="button"
                                onClick={() => handleFaturarNFCe(p)}
                                className="coliseu-btn coliseu-btn-secondary"
                                style={{ padding: '0 6px', height: '26px', fontSize: '11px', color: '#10b981' }}
                                title={`NFC-e Nº ${p.numeroNFCe || ''} Autorizada`}
                              >
                                <Receipt size={12} /> Ver NFC-e
                              </button>
                            );
                          }
                          return null;
                        })()}

                        {/* Editar */}
                        <button
                          type="button"
                          onClick={() => handleEditarPedido(p)}
                          className="coliseu-btn coliseu-btn-secondary"
                          style={{ padding: '0 6px', height: '26px', fontSize: '11px' }}
                          title="Editar / Abrir Pedido"
                        >
                          <Edit2 size={12} />
                        </button>

                        {/* Excluir */}
                        <button
                          type="button"
                          onClick={() => handleExcluir(p.id, p.numeroPedido)}
                          className="coliseu-btn coliseu-btn-secondary"
                          style={{ padding: '0 6px', height: '26px', fontSize: '11px', color: '#ef4444' }}
                          title="Excluir"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {pedidosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                      Nenhum pedido ou orçamento encontrado. Pressione <strong>F3</strong> para emitir uma nova venda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VISÃO KANBAN */}
      {viewMode === 'KANBAN' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
          {[
            { statusKey: 'ORCAMENTO', label: 'Propostas / Orçamentos', color: '#eab308' },
            { statusKey: 'APROVADO', label: 'Pedidos Aprovados', color: '#3b82f6' },
            { statusKey: 'FATURADO', label: 'Faturados / NF-e Emitida', color: '#10b981' },
          ].map((col) => {
            const itensCol = pedidos.filter((p) => p.status === col.statusKey);
            const totalCol = itensCol.reduce((acc, p) => acc + p.valorTotalFinal, 0);

            return (
              <div
                key={col.statusKey}
                style={{
                  backgroundColor: 'var(--surface-2)',
                  borderRadius: '8px',
                  border: '1px solid var(--border-default)',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  minHeight: '400px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid ' + col.color, paddingBottom: '6px' }}>
                  <span style={{ fontWeight: 700, fontSize: '12px', color: col.color }}>{col.label} ({itensCol.length})</span>
                  <span style={{ fontWeight: 800, fontSize: '11px', fontFamily: 'monospace' }}>{formatCurrency(totalCol)}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
                  {itensCol.map((ped) => (
                    <div
                      key={ped.id}
                      onClick={() => handleEditarPedido(ped)}
                      style={{
                        backgroundColor: 'var(--surface-1)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '6px',
                        padding: '10px',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 800, color: 'var(--text-link)', fontSize: '12px' }}>
                          Nº {ped.numeroPedido}
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{ped.dataEmissao}</span>
                      </div>

                      <div style={{ fontWeight: 600, fontSize: '11px', color: 'var(--text-primary)' }}>
                        {ped.clienteNome}
                      </div>

                      <div style={{ fontSize: '10px', color: '#3b82f6' }}>
                        CFOP: {ped.naturezaOperacao?.cfop || '5102'} • {(ped.itens || []).length} itens
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{ped.vendedorNome}</span>
                        <span style={{ fontWeight: 800, color: '#10b981', fontFamily: 'monospace', fontSize: '12px' }}>
                          {formatCurrency(ped.valorTotalFinal)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Emissão de Pedido & Workstation */}
      {isModalEmissaoOpen && (
        <ModalEmissaoPedidoVenda
          isOpen={isModalEmissaoOpen}
          onClose={() => setIsModalEmissaoOpen(false)}
          pedidoEdicao={pedidoSelecionado}
          onSaveSuccess={(p) => {
            showToast(`✅ Pedido Nº ${p.numeroPedido} gravado com sucesso!`);
          }}
          onImprimirA4={(p) => {
            setPedidoSelecionado(p);
            setIsModalImpressaoOpen(true);
          }}
        />
      )}

      {/* Modal Impressão A4 */}
      {isModalImpressaoOpen && (
        <ModalImpressaoPedidoA4
          isOpen={isModalImpressaoOpen}
          onClose={() => setIsModalImpressaoOpen(false)}
          pedido={pedidoSelecionado}
        />
      )}

      {/* Modal Faturamento NF-e & Acobertamento */}
      {isModalFaturamentoOpen && pedidoFaturamento && (
        <ModalFaturamentoNFe
          isOpen={isModalFaturamentoOpen}
          onClose={() => {
            setIsModalFaturamentoOpen(false);
            setPedidoFaturamento(null);
          }}
          pedido={pedidoFaturamento}
          onFaturamentoConcluido={(atualizado) => {
            showToast(`✅ Faturamento NF-e do Pedido Nº ${atualizado.numeroPedido} concluído com sucesso!`);
            setPedidos(getPedidosVenda());
          }}
        />
      )}

      {/* Modal Faturamento NFC-e (Cupom Fiscal Mod. 65) */}
      {isModalFaturamentoNFCeOpen && pedidoFaturamento && (
        <ModalFaturamentoNFCe
          isOpen={isModalFaturamentoNFCeOpen}
          onClose={() => {
            setIsModalFaturamentoNFCeOpen(false);
            setPedidoFaturamento(null);
          }}
          pedido={pedidoFaturamento}
          onFaturamentoConcluido={(atualizado) => {
            showToast(`✅ Emissão NFC-e do Pedido Nº ${atualizado.numeroPedido} concluída com sucesso!`);
            setPedidos(getPedidosVenda());
          }}
        />
      )}
    </div>
  );
};
