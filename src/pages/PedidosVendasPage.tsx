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
  RefreshCw,
  SlidersHorizontal,
  GripVertical,
  Columns,
  RotateCcw,
  Ban,
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
  getStatusConfig,
  normalizarStatusPedido,
  cancelarPedidoVenda,
} from '../lib/pedidosVenda';
import { syncService } from '../lib/syncService';
import { ModalEmissaoPedidoVenda } from '../components/vendas/ModalEmissaoPedidoVenda';
import { ModalImpressaoPedidoA4 } from '../components/vendas/ModalImpressaoPedidoA4';
import { ModalFaturamentoNFe } from '../components/vendas/ModalFaturamentoNFe';
import { ModalFaturamentoNFCe } from '../components/vendas/ModalFaturamentoNFCe';
import { ModalCancelarPedido } from '../components/vendas/ModalCancelarPedido';
import {
  ModalPersonalizarColunasPedidos,
  ColunaTabelaPedido,
} from '../components/vendas/ModalPersonalizarColunasPedidos';

export const COLUNAS_PADRAO_PEDIDOS: ColunaTabelaPedido[] = [
  { id: 'numeroPedido', label: 'Nº Pedido', visible: true, width: '95px', minWidth: '90px', align: 'left' },
  { id: 'nfe', label: 'NF-e', visible: true, width: '85px', minWidth: '80px', align: 'center' },
  { id: 'nfce', label: 'NFC-e', visible: true, width: '85px', minWidth: '80px', align: 'center' },
  { id: 'dataEmissao', label: 'Data/Hora', visible: true, width: '135px', minWidth: '125px', align: 'left' },
  { id: 'dataFaturamento', label: 'Data Faturamento', visible: true, width: '125px', minWidth: '115px', align: 'left' },
  { id: 'cliente', label: 'Cliente / Fornecedor', visible: true, width: '250px', minWidth: '200px', align: 'left' },
  { id: 'vendedor', label: 'Vendedor', visible: true, width: '140px', minWidth: '120px', align: 'left' },
  { id: 'valorTotal', label: 'Valor Total', visible: true, width: '115px', minWidth: '105px', align: 'right' },
  { id: 'valorDesconto', label: 'Valor Desconto', visible: true, width: '110px', minWidth: '100px', align: 'right' },
  { id: 'valorOriginal', label: 'Valor Original', visible: true, width: '115px', minWidth: '105px', align: 'right' },
  { id: 'especie', label: 'Espécie', visible: true, width: '140px', minWidth: '120px', align: 'left' },
  { id: 'formaPgto', label: 'Forma de Pgto', visible: true, width: '120px', minWidth: '100px', align: 'left' },
  { id: 'cupomFiscal', label: 'Cupom Fiscal', visible: true, width: '105px', minWidth: '95px', align: 'center' },
  { id: 'naturezaOp', label: 'Natureza Op.', visible: true, width: '220px', minWidth: '180px', align: 'left' },
  { id: 'itens', label: 'Itens', visible: true, width: '65px', minWidth: '60px', align: 'center' },
  { id: 'status', label: 'Status', visible: true, width: '105px', minWidth: '95px', align: 'center' },
  { id: 'acoes', label: 'Ações', visible: true, width: '290px', minWidth: '275px', align: 'center' },
];

export const PedidosVendasPage: React.FC = () => {
  const [pedidos, setPedidos] = useState<PedidoVendaItem[]>(getPedidosVenda);
  const [tabStatus, setTabStatus] = useState<string>('TODOS');
  const [viewMode, setViewMode] = useState<'TABELA' | 'KANBAN'>('TABELA');
  const [busca, setBusca] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Configuração e Ordem de Colunas Personalizadas
  const [colunas, setColunas] = useState<ColunaTabelaPedido[]>(() => {
    try {
      const salvo = localStorage.getItem('coliseu_pedidos_colunas_v3');
      if (salvo) {
        const parsed = JSON.parse(salvo);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Garantir que novas colunas que possam não existir no storage antigo sejam mescladas
          const idsSalvos = new Set(parsed.map((c: ColunaTabelaPedido) => c.id));
          const faltantes = COLUNAS_PADRAO_PEDIDOS.filter((c) => !idsSalvos.has(c.id));
          return [...parsed, ...faltantes];
        }
      }
    } catch {}
    return COLUNAS_PADRAO_PEDIDOS;
  });

  const [isModalColunasOpen, setIsModalColunasOpen] = useState(false);
  const [draggedColId, setDraggedColId] = useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);

  // Modais
  const [isModalEmissaoOpen, setIsModalEmissaoOpen] = useState(false);
  const [isModalImpressaoOpen, setIsModalImpressaoOpen] = useState(false);
  const [isModalFaturamentoOpen, setIsModalFaturamentoOpen] = useState(false);
  const [isModalFaturamentoNFCeOpen, setIsModalFaturamentoNFCeOpen] = useState(false);
  const [pedidoSelecionado, setPedidoSelecionado] = useState<PedidoVendaItem | null>(null);
  const [pedidoFaturamento, setPedidoFaturamento] = useState<PedidoVendaItem | null>(null);
  const [pedidoCancelamento, setPedidoCancelamento] = useState<PedidoVendaItem | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleSalvarColunas = (novasColunas: ColunaTabelaPedido[]) => {
    setColunas(novasColunas);
    try {
      localStorage.setItem('coliseu_pedidos_colunas_v3', JSON.stringify(novasColunas));
    } catch {}
    showToast('Preferências de colunas salvas com sucesso!');
  };

  const handleRestaurarColunasPadrao = () => {
    setColunas(COLUNAS_PADRAO_PEDIDOS);
    try {
      localStorage.setItem('coliseu_pedidos_colunas_v3', JSON.stringify(COLUNAS_PADRAO_PEDIDOS));
    } catch {}
    showToast('Colunas restauradas para o padrão oficial!');
    setIsModalColunasOpen(false);
  };

  // Drag & Drop no Cabeçalho da Tabela
  const handleHeaderDragStart = (e: React.DragEvent, id: string) => {
    setDraggedColId(id);
    e.dataTransfer.setData('text/plain', id);
  };

  const handleHeaderDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (dragOverColId !== id) {
      setDragOverColId(id);
    }
  };

  const handleHeaderDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedColId || draggedColId === targetId) {
      setDraggedColId(null);
      setDragOverColId(null);
      return;
    }

    const indexOrigem = colunas.findIndex((c) => c.id === draggedColId);
    const indexDestino = colunas.findIndex((c) => c.id === targetId);

    if (indexOrigem !== -1 && indexDestino !== -1) {
      const novaLista = [...colunas];
      const [removido] = novaLista.splice(indexOrigem, 1);
      novaLista.splice(indexDestino, 0, removido);
      setColunas(novaLista);
      try {
        localStorage.setItem('coliseu_pedidos_colunas_v3', JSON.stringify(novaLista));
      } catch {}
      showToast(`Coluna "${removido.label}" reposicionada!`);
    }

    setDraggedColId(null);
    setDragOverColId(null);
  };

  const handleHeaderDragEnd = () => {
    setDraggedColId(null);
    setDragOverColId(null);
  };

  useEffect(() => {
    // 1. Carrega dados locais imediatamente
    setPedidos(getPedidosVenda());

    // 2. Escuta eventos em tempo real do barramento Omni-Sync (SSE)
    const handleUpdate = () => {
      setPedidos(getPedidosVenda());
    };
    window.addEventListener('coliseu_pedidos_vendas_updated', handleUpdate);

    // 3. Carga inicial da Nuvem (PostgreSQL Central)
    const loadInitialCloudData = async () => {
      try {
        const localList = getPedidosVenda();
        // Se houver pedidos locais no terminal (Desktop ou Web), sincroniza com a Nuvem no primeiro boot
        if (localList.length > 0) {
          syncService.syncBatchPedidos(localList).catch(() => {});
        }

        const cloudList = await syncService.fetchCloudPedidos();
        if (Array.isArray(cloudList) && cloudList.length > 0) {
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

          // Mesclar com pedidos locais reais
          localList.forEach((p) => {
            if (!map.has(p.id)) {
              map.set(p.id, p);
            }
          });

          const unificada = Array.from(map.values());
          localStorage.setItem('coliseu_pedidos_vendas_b2b', JSON.stringify(unificada));
          localStorage.setItem('coliseu_pedidos_venda_list', JSON.stringify(unificada));
          setPedidos(unificada);
        }
      } catch (err) {
        console.warn('[Pedidos] Falha ao carregar pedidos da nuvem:', err);
      }
    };

    loadInitialCloudData();

    return () => {
      window.removeEventListener('coliseu_pedidos_vendas_updated', handleUpdate);
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

  // Filtragem 100% Blindada contra valores nulos
  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter((p) => {
      if (!p) return false;
      const norm = normalizarStatusPedido(p.status);
      if (tabStatus !== 'TODOS' && norm !== tabStatus) return false;

      if (busca) {
        const q = String(busca).toLowerCase().trim();
        const mNum = String(p.numeroPedido || '').toLowerCase().includes(q);
        const mCli = String(p.clienteNome || '').toLowerCase().includes(q);
        const mVend = String(p.vendedorNome || '').toLowerCase().includes(q);
        const natDesc = typeof p.naturezaOperacao === 'object' && p.naturezaOperacao !== null
          ? String(p.naturezaOperacao.descricao || '')
          : String(p.naturezaOperacao || '');
        const natCfop = typeof p.naturezaOperacao === 'object' && p.naturezaOperacao !== null
          ? String(p.naturezaOperacao.cfop || '')
          : '';
        const mNat = natDesc.toLowerCase().includes(q) || natCfop.includes(q);
        
        const mItem = Array.isArray(p.itens) && p.itens.some(
          (i) =>
            String(i.descricao || '').toLowerCase().includes(q) ||
            String(i.codigoFabrica || '').toLowerCase().includes(q) ||
            String(i.referencia || '').toLowerCase().includes(q) ||
            String(i.codigoBarras || '').includes(q)
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
            { key: 'EM_ABERTO', label: '⬜ Em Aberto' },
            { key: 'A_FATURAR', label: '🟩 A Faturar' },
            { key: 'EM_FATURAMENTO', label: '🟨 Em Faturamento' },
            { key: 'PROCESSADO', label: '⬛ Processados' },
            { key: 'BLOQUEADO', label: '🟥 Bloqueados' },
            { key: 'CANCELADO', label: '🟦 Cancelados' },
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
                padding: '6px 10px',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Botão de Personalização de Colunas */}
          <button
            type="button"
            onClick={() => setIsModalColunasOpen(true)}
            className="coliseu-btn coliseu-btn-secondary"
            style={{
              height: '34px',
              padding: '0 12px',
              fontSize: '11px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            title="Personalizar Colunas e Ordem de Exibição"
          >
            <SlidersHorizontal size={13} />
            <span>Colunas ({colunas.filter((c) => c.visible).length})</span>
          </button>

          <div style={{ width: '300px' }}>
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
      </div>

      {/* PAINEL DE LEGENDA OFICIAL DE CORES DOS PEDIDOS */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '6px 12px',
          backgroundColor: 'var(--surface-2)',
          border: '1px solid var(--border-default)',
          borderRadius: '6px',
          fontSize: '11px',
          flexWrap: 'wrap',
          marginBottom: '8px',
        }}
      >
        <span style={{ fontWeight: 800, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          🏷️ Legenda:
        </span>

        {[
          { label: 'Em Aberto', bg: '#ffffff', border: '#94a3b8', text: '#334155' },
          { label: 'A Faturar', bg: '#dcfce7', border: '#86efac', text: '#166534' },
          { label: 'Em Faturamento', bg: '#fef08a', border: '#fde047', text: '#854d0e' },
          { label: 'Processado', bg: '#64748b', border: '#475569', text: '#ffffff' },
          { label: 'Bloqueado', bg: '#f87171', border: '#ef4444', text: '#ffffff' },
          { label: 'Cancelado', bg: '#0070f3', border: '#2563eb', text: '#ffffff' },
        ].map((leg) => (
          <div
            key={leg.label}
            onClick={() => setTabStatus(leg.label.toUpperCase().replace(/\s+/g, '_') as any)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              cursor: 'pointer',
              padding: '2px 4px',
              borderRadius: '4px',
            }}
            title={`Filtrar por ${leg.label}`}
          >
            <span
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '2px',
                backgroundColor: leg.bg,
                border: `1px solid ${leg.border}`,
                display: 'inline-block',
                boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
              }}
            />
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{leg.label}</span>
          </div>
        ))}
      </div>

      {/* DICA DE ARRASTAR COLUNAS */}
      {viewMode === 'TABELA' && (
        <div
          style={{
            fontSize: '11px',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '2px 4px',
            marginBottom: '4px',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            💡 <em>Dica: Arraste os cabeçalhos das colunas para reposicioná-las conforme sua preferência de visualização.</em>
          </span>
          <span style={{ fontSize: '10.5px' }}>
            {pedidosFiltrados.length} pedidos listados • Barra de rolagem horizontal ativa
          </span>
        </div>
      )}

      {/* VISÃO TABELA COM ROLAGEM HORIZONTAL E DRAG-AND-DROP */}
      {viewMode === 'TABELA' && (
        <div className="coliseu-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div
            className="coliseu-table-container"
            style={{
              maxHeight: 'calc(100vh - 280px)',
              overflowX: 'auto',
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            <table
              className="coliseu-table"
              style={{
                fontSize: '12px',
                width: 'max-content',
                minWidth: '100%',
                borderCollapse: 'separate',
                borderSpacing: 0,
              }}
            >
              <thead>
                <tr>
                  {colunas
                    .filter((c) => c.visible)
                    .map((col) => {
                      const isDraggingThis = draggedColId === col.id;
                      const isOverThis = dragOverColId === col.id;

                      return (
                        <th
                          key={col.id}
                          draggable
                          onDragStart={(e) => handleHeaderDragStart(e, col.id)}
                          onDragOver={(e) => handleHeaderDragOver(e, col.id)}
                          onDrop={(e) => handleHeaderDrop(e, col.id)}
                          onDragEnd={handleHeaderDragEnd}
                          style={{
                            width: col.width,
                            minWidth: col.minWidth || col.width,
                            textAlign: col.align || 'left',
                            cursor: 'grab',
                            userSelect: 'none',
                            backgroundColor: isOverThis
                              ? 'rgba(59, 130, 246, 0.2)'
                              : isDraggingThis
                              ? 'rgba(0, 0, 0, 0.05)'
                              : undefined,
                            borderLeft: isOverThis ? '2px solid #3b82f6' : undefined,
                            position: 'sticky',
                            top: 0,
                            zIndex: 2,
                            whiteSpace: 'nowrap',
                          }}
                          title="Arraste para reposicionar esta coluna"
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent:
                                col.align === 'center'
                                  ? 'center'
                                  : col.align === 'right'
                                  ? 'flex-end'
                                  : 'flex-start',
                              gap: '4px',
                            }}
                          >
                            <GripVertical size={11} style={{ opacity: 0.4, flexShrink: 0 }} />
                            <span>{col.label}</span>
                          </div>
                        </th>
                      );
                    })}
                </tr>
              </thead>
              <tbody>
                {pedidosFiltrados.map((p) => {
                  const colunasVisiveis = colunas.filter((c) => c.visible);

                  return (
                    <tr
                      key={p.id}
                      onDoubleClick={() => handleEditarPedido(p)}
                      style={{ height: '38px', cursor: 'pointer' }}
                      title="Clique duas vezes para abrir o pedido"
                    >
                      {colunasVisiveis.map((col) => (
                        <td
                          key={col.id}
                          style={{
                            textAlign: col.align || 'left',
                            whiteSpace: 'nowrap',
                            padding: '6px 10px',
                          }}
                        >
                          {(() => {
                            switch (col.id) {
                              case 'numeroPedido': {
                                const norm = normalizarStatusPedido(p.status);
                                const cfg = getStatusConfig(norm);
                                return (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {/* Quadrado de Cor Oficial do Status */}
                                    <span
                                      style={{
                                        width: '13px',
                                        height: '13px',
                                        borderRadius: '2px',
                                        backgroundColor: cfg.bg,
                                        border: `1px solid ${cfg.border}`,
                                        display: 'inline-block',
                                        flexShrink: 0,
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                                      }}
                                      title={`Status: ${cfg.label} - ${cfg.tooltip}`}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleEditarPedido(p)}
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        padding: 0,
                                        fontWeight: 800,
                                        color: 'var(--text-link, #2563eb)',
                                        fontSize: '12px',
                                        textDecoration: 'underline',
                                        textAlign: 'left',
                                      }}
                                      title="Clique para entrar no pedido"
                                    >
                                      {p.numeroPedido}
                                    </button>
                                  </div>
                                );
                              }
                              case 'nfe': {
                                const temNfe = !!p.chaveNFeEmitida || (!!p.numeroNFe && p.numeroNFe !== '0');
                                const numExibir = p.numeroNFe && p.numeroNFe !== '0' ? p.numeroNFe : (temNfe ? '1026' : '0');
                                return temNfe ? (
                                  <span
                                    style={{
                                      fontSize: '10.5px',
                                      fontWeight: 700,
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      backgroundColor: 'rgba(16, 185, 129, 0.15)',
                                      color: '#10b981',
                                      cursor: 'pointer',
                                    }}
                                    title={`Chave NF-e: ${p.chaveNFeEmitida || 'Autorizada'}\nClique para baixar o XML Oficial`}
                                    onClick={() => {
                                      if (p.chaveNFeEmitida) {
                                        window.open(`/api/fiscal/xml/${p.chaveNFeEmitida}`, '_blank');
                                      } else {
                                        handleFaturarNFe(p);
                                      }
                                    }}
                                  >
                                    {numExibir}
                                  </span>
                                ) : (
                                  <span style={{ color: 'var(--text-muted, #9ca3af)', fontSize: '11px' }}>0</span>
                                );
                              }
                              case 'nfce': {
                                const temNfce = !!p.chaveNFCeEmitida || (!!p.numeroNFCe && p.numeroNFCe !== '0');
                                const numExibir = p.numeroNFCe && p.numeroNFCe !== '0' ? p.numeroNFCe : (temNfce ? 'Emitida' : '0');
                                return temNfce ? (
                                  <span
                                    style={{
                                      fontSize: '10.5px',
                                      fontWeight: 700,
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      backgroundColor: 'rgba(59, 130, 246, 0.15)',
                                      color: '#3b82f6',
                                      cursor: 'pointer',
                                    }}
                                    title={`Chave NFC-e: ${p.chaveNFCeEmitida || 'Autorizada'}\nClique para baixar o XML Oficial`}
                                    onClick={() => {
                                      if (p.chaveNFCeEmitida) {
                                        window.open(`/api/fiscal/xml/${p.chaveNFCeEmitida}`, '_blank');
                                      } else {
                                        handleFaturarNFCe(p);
                                      }
                                    }}
                                  >
                                    {numExibir}
                                  </span>
                                ) : (
                                  <span style={{ color: 'var(--text-muted, #9ca3af)', fontSize: '11px' }}>0</span>
                                );
                              }
                              case 'dataEmissao':
                                return (
                                  <span style={{ fontSize: '11px' }} className="tabular-nums">
                                    {p.dataEmissao?.includes('T')
                                      ? new Date(p.dataEmissao).toLocaleString('pt-BR')
                                      : p.dataEmissao || '-'}
                                  </span>
                                );
                              case 'dataFaturamento':
                                return (
                                  <span style={{ fontSize: '11px' }} className="tabular-nums">
                                    {p.dataFaturamento || (p.status === 'FATURADO' ? formatDate(p.dataEmissao) : '-')}
                                  </span>
                                );
                              case 'cliente':
                                return (
                                  <div>
                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '11.5px' }}>
                                      {p.clienteNome}
                                    </div>
                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                      CNPJ/CPF: {p.clienteCnpjCpf || '000.000.000-00'} • {p.clienteCidade || 'DOURADOS'}/{p.clienteUf || 'MS'}
                                    </div>
                                  </div>
                                );
                              case 'vendedor':
                                return (
                                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                    {p.vendedorNome || 'ROBERSON'}
                                  </span>
                                );
                              case 'valorTotal':
                                return (
                                  <span style={{ fontWeight: 800, color: '#10b981', fontFamily: 'monospace' }}>
                                    {formatCurrency(p.valorTotalFinal)}
                                  </span>
                                );
                              case 'valorDesconto': {
                                const desc = p.totalDescontoGlobal || 0;
                                return (
                                  <span
                                    style={{
                                      fontWeight: desc > 0 ? 700 : 500,
                                      color: desc > 0 ? '#ef4444' : 'var(--text-muted)',
                                      fontFamily: 'monospace',
                                    }}
                                  >
                                    {formatCurrency(desc)}
                                  </span>
                                );
                              }
                              case 'valorOriginal': {
                                const original = (p.totalProdutos || p.valorTotalFinal) + (p.totalDescontoGlobal || 0);
                                return (
                                  <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                                    {formatCurrency(original)}
                                  </span>
                                );
                              }
                              case 'especie': {
                                const esp = p.parcelas?.[0]?.especiePagamento || p.formaPagamentoNome || 'BOLETO BANCARIO';
                                return (
                                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                                    {esp}
                                  </span>
                                );
                              }
                              case 'formaPgto':
                                return (
                                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                    {p.formaPagamentoNome || (p.parcelas && p.parcelas.length > 1 ? `${p.parcelas.length} X` : 'À VISTA')}
                                  </span>
                                );
                              case 'cupomFiscal': {
                                const numCupom = p.numeroNFCe || (p.chaveNFCeEmitida ? 'EMITIDO' : '0');
                                return (
                                  <span
                                    style={{
                                      fontSize: '11px',
                                      color: p.chaveNFCeEmitida ? '#10b981' : 'var(--text-muted)',
                                      fontWeight: p.chaveNFCeEmitida ? 700 : 500,
                                    }}
                                  >
                                    {numCupom}
                                  </span>
                                );
                              }
                              case 'naturezaOp': {
                                const nat = p.naturezaOperacao;
                                const cfop = nat?.cfop || '5102';
                                const desc = nat?.descricao || 'VENDA DE MERCADORIAS DENTRO DO ESTADO';
                                return (
                                  <div style={{ fontWeight: 600, color: '#3b82f6', fontSize: '11px' }} title={`${cfop} - ${desc}`}>
                                    {cfop} - {desc.length > 28 ? desc.slice(0, 28) + '...' : desc}
                                  </div>
                                );
                              }
                              case 'itens':
                                return <span style={{ fontWeight: 700 }}>{p.itens.length}</span>;
                              case 'status': {
                                const norm = normalizarStatusPedido(p.status);
                                const cfg = getStatusConfig(norm);
                                return (
                                  <span
                                    style={{
                                      fontSize: '10.5px',
                                      fontWeight: 800,
                                      padding: '2px 8px',
                                      borderRadius: '4px',
                                      backgroundColor: cfg.bg,
                                      border: `1px solid ${cfg.border}`,
                                      color: cfg.text,
                                      boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                                    }}
                                    title={cfg.tooltip}
                                  >
                                    {cfg.label}
                                  </span>
                                );
                              }
                              case 'acoes': {
                                const norm = normalizarStatusPedido(p.status);
                                const isCancelled = norm === 'CANCELADO';

                                return (
                                  <div style={{ display: 'flex', gap: '5px', justifyContent: 'center', alignItems: 'center' }}>
                                    {/* Imprimir A4 */}
                                    <button
                                      type="button"
                                      onClick={() => handleImprimirA4(p)}
                                      className="coliseu-btn coliseu-btn-secondary"
                                      style={{ padding: '0 7px', height: '26px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px' }}
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
                                            style={{
                                              padding: '0 7px',
                                              height: '26px',
                                              fontSize: '11px',
                                              color: '#8b5cf6',
                                              borderColor: 'rgba(139, 92, 246, 0.4)',
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '3px',
                                            }}
                                            title="Emitir NF-e de Acobertamento (CFOP 5.929 / 6.929)"
                                          >
                                            <FileCheck size={12} /> Acobert.
                                          </button>
                                        );
                                      }
                                      if (check.permitido) {
                                        return (
                                          <button
                                            type="button"
                                            onClick={() => handleFaturarNFe(p)}
                                            className="coliseu-btn coliseu-btn-secondary"
                                            style={{
                                              padding: '0 7px',
                                              height: '26px',
                                              fontSize: '11px',
                                              color: '#3b82f6',
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '3px',
                                            }}
                                            title="Emitir NF-e Mod. 55"
                                          >
                                            <FileCheck size={12} /> NF-e
                                          </button>
                                        );
                                      }
                                      if (p.chaveNFeEmitida) {
                                        return (
                                          <button
                                            type="button"
                                            onClick={() => handleFaturarNFe(p)}
                                            className="coliseu-btn coliseu-btn-secondary"
                                            style={{
                                              padding: '0 7px',
                                              height: '26px',
                                              fontSize: '11px',
                                              color: '#10b981',
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '3px',
                                            }}
                                            title={`NF-e Nº ${p.numeroNFe || ''} Autorizada`}
                                          >
                                            <FileCheck size={12} /> Ver NF-e
                                          </button>
                                        );
                                      }
                                      return null;
                                    })()}

                                    {/* Botão Dinâmico de NFC-e */}
                                    {(() => {
                                      const checkNfce = podeFaturarPedidoNFCe(p);
                                      if (checkNfce.permitido) {
                                        return (
                                          <button
                                            type="button"
                                            onClick={() => handleFaturarNFCe(p)}
                                            className="coliseu-btn coliseu-btn-secondary"
                                            style={{
                                              padding: '0 7px',
                                              height: '26px',
                                              fontSize: '11px',
                                              color: '#10b981',
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '3px',
                                            }}
                                            title="Emitir NFC-e Mod. 65 (Cupom Fiscal)"
                                          >
                                            <Receipt size={12} /> NFC-e
                                          </button>
                                        );
                                      }
                                      if (p.chaveNFCeEmitida) {
                                        return (
                                          <button
                                            type="button"
                                            onClick={() => handleFaturarNFCe(p)}
                                            className="coliseu-btn coliseu-btn-secondary"
                                            style={{
                                              padding: '0 7px',
                                              height: '26px',
                                              fontSize: '11px',
                                              color: '#10b981',
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '3px',
                                            }}
                                            title={`NFC-e Nº ${p.numeroNFCe || ''} Autorizada`}
                                          >
                                            <Receipt size={12} /> Ver NFC-e
                                          </button>
                                        );
                                      }
                                      return null;
                                    })()}

                                    {/* Entrar / Abrir Pedido */}
                                    <button
                                      type="button"
                                      onClick={() => handleEditarPedido(p)}
                                      className="coliseu-btn"
                                      style={{
                                        padding: '0 9px',
                                        height: '26px',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        backgroundColor: 'rgba(59, 130, 246, 0.12)',
                                        color: '#2563eb',
                                        border: '1px solid rgba(59, 130, 246, 0.35)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                      }}
                                      title="Abrir e Editar Pedido"
                                    >
                                      <Edit2 size={12} /> Abrir
                                    </button>

                                    {/* Cancelar Pedido / Venda */}
                                    {!isCancelled && (
                                      <button
                                        type="button"
                                        onClick={() => setPedidoCancelamento(p)}
                                        className="coliseu-btn"
                                        style={{
                                          padding: '0 8px',
                                          height: '26px',
                                          fontSize: '11px',
                                          fontWeight: 700,
                                          backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                          color: '#dc2626',
                                          border: '1px solid rgba(239, 68, 68, 0.3)',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '3px',
                                        }}
                                        title={`Cancelar Pedido Nº ${p.numeroPedido} com estorno`}
                                      >
                                        <Ban size={12} /> Cancelar
                                      </button>
                                    )}

                                    {/* Excluir (para orçamentos ou cancelados) */}
                                    {(norm === 'EM_ABERTO' || norm === 'CANCELADO') && (
                                      <button
                                        type="button"
                                        onClick={() => handleExcluir(p.id, p.numeroPedido)}
                                        className="coliseu-btn"
                                        style={{
                                          padding: '0 7px',
                                          height: '26px',
                                          fontSize: '11px',
                                          fontWeight: 600,
                                          backgroundColor: 'rgba(239, 68, 68, 0.08)',
                                          color: '#dc2626',
                                          border: '1px solid rgba(239, 68, 68, 0.25)',
                                          display: 'flex',
                                          alignItems: 'center',
                                        }}
                                        title={`Excluir Registro Nº ${p.numeroPedido}`}
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    )}
                                  </div>
                                );
                              }
                              default:
                                return null;
                            }
                          })()}
                        </td>
                      ))}
                    </tr>
                  );
                })}
                {pedidosFiltrados.length === 0 && (
                  <tr>
                    <td
                      colSpan={colunas.filter((c) => c.visible).length || 1}
                      style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}
                    >
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

      {/* Modal de Personalização de Colunas & Reordenação */}
      <ModalPersonalizarColunasPedidos
        isOpen={isModalColunasOpen}
        onClose={() => setIsModalColunasOpen(false)}
        colunas={colunas}
        onSalvarColunas={handleSalvarColunas}
        onRestaurarPadrao={handleRestaurarColunasPadrao}
      />

      {/* Modal de Cancelamento Direto na Grade */}
      {pedidoCancelamento && (
        <ModalCancelarPedido
          isOpen={!!pedidoCancelamento}
          onClose={() => setPedidoCancelamento(null)}
          pedido={pedidoCancelamento}
          onCancelamentoConcluido={(atualizado) => {
            showToast(`✅ Pedido Nº ${atualizado.numeroPedido} cancelado com sucesso.`);
            setPedidos(getPedidosVenda());
            setPedidoCancelamento(null);
          }}
        />
      )}
    </div>
  );
};
