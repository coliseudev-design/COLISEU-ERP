import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import { StatusBadge } from '../ui/StatusBadge';
import { formatCurrency, formatCnpjCpf, formatDate } from '../../lib/formatters';
import { TitulosLiquidarModal, LiquidacaoPayload } from '../financeiro/TitulosLiquidarModal';
import { ReciboQuitacaoModal, ReciboQuitacaoData } from '../financeiro/ReciboQuitacaoModal';
import { TituloDetalhesModal, TituloDetalhesData } from '../financeiro/TituloDetalhesModal';
import { ConfigurarColunasModal } from '../financeiro/ConfigurarColunasModal';
import {
  X,
  Phone,
  Mail,
  MapPin,
  Clock,
  Building,
  CreditCard,
  Edit3,
  FileText,
  ShoppingCart,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  Package,
  RotateCcw,
  Undo2,
  ArrowLeftRight,
  Eye,
  Info,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  GripVertical,
  Settings2,
} from 'lucide-react';
import customerTitlesData from '../../data/customer_titles.json';
import customerOrdersData from '../../data/customer_orders.json';

export interface CustomerCommandCenter360Props {
  customer?: any;
  cliente?: any;
  onClose?: () => void;
  onEditClient?: (cliente: any) => void;
}

export const CustomerCommandCenter360: React.FC<CustomerCommandCenter360Props> = ({
  customer,
  cliente,
  onClose,
  onEditClient,
}) => {
  const [activeTab, setActiveTab] = useState<'resumo' | 'comercial' | 'financeiro' | 'produtos' | 'timeline'>('resumo');
  const [financeiroFilter, setFinanceiroFilter] = useState<'aberto' | 'vencido' | 'pago' | 'todos'>('aberto');
  const [selectedTitleIds, setSelectedTitleIds] = useState<Set<string>>(new Set());
  const [isLiquidarOpen, setIsLiquidarOpen] = useState(false);
  const [liquidarMode, setLiquidarMode] = useState<'liquidar' | 'renegociar'>('liquidar');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [reciboData, setReciboData] = useState<ReciboQuitacaoData | null>(null);
  const [isReciboOpen, setIsReciboOpen] = useState(false);
  const [selectedTituloDetalhes, setSelectedTituloDetalhes] = useState<TituloDetalhesData | null>(null);
  const [isTituloDetalhesOpen, setIsTituloDetalhesOpen] = useState(false);

  const c = customer || cliente || {};
  const clienteId = c.id || `pes-${(c.codigo || '1').toString().padStart(5, '0')}`;
  const codigo = c.codigo || (c.id ? c.id.replace('pes-', '') : '001');
  
  const nomeCliente = c.nome || c.nome_razaosocial || 'ROBERSON DE ALMEIDA SOUZA';
  const nomeFantasia = c.nomeAbrev || c.fantasia || nomeCliente;
  const cpfCnpj = c.cpfCnpj || c.cpf_cnpj || '705.032.141-91';
  const rgIe = c.inscEstadual || c.rg || c.ie || '-';
  const score = c.score || c.score_credito || 850;
  const limiteTotal = typeof c.limiteCredito === 'number' ? c.limiteCredito : (c.limite_credito || 500000.0);
  
  const telefone = c.celularWhats || c.telefone || c.celular || '-';
  const email = c.emailPrincipal || c.email || c.email_principal || '-';
  const endereco = c.endereco || c.logradouro || '';
  const numero = c.numero || '';
  const bairro = c.bairro || '';
  const cidade = c.municipio || c.cidade || 'GUARATINGA';
  const uf = c.uf || 'BA';
  const status = c.status || 'Ativo';
  const curva = c.curva || 'Curva A (VIP)';
  const vendedor = c.vendedor || 'Roberto Silva';
  const tabelaPreco = c.tabelaPreco || 'Tabela Atacado Padrão';
  const condicaoPagto = c.condicaoPagto || '30/60 Dias';

  // Buscar títulos reais do cliente no dataset com suporte a persistência
  const initialTitles = useMemo(() => {
    const fromId = (customerTitlesData as any)[clienteId];
    if (Array.isArray(fromId) && fromId.length > 0) return fromId;
    
    const paddedCode = `pes-${(codigo || '').padStart(5, '0')}`;
    const fromCode = (customerTitlesData as any)[paddedCode];
    if (Array.isArray(fromCode) && fromCode.length > 0) return fromCode;

    return [];
  }, [clienteId, codigo]);

  const [clientTitles, setClientTitles] = useState<any[]>(() => {
    try {
      const savedQuitacoes = localStorage.getItem(`coliseu_quitacoes_${clienteId}`);
      const paidIds = savedQuitacoes ? new Set(JSON.parse(savedQuitacoes)) : new Set();
      return initialTitles.map((t: any) => {
        const isLocallyPaid = paidIds.has(t.codigo);
        const isPago = isLocallyPaid || !t.isAberto || t.status === 'Pago';
        let dtQuitacao = undefined;
        if (isPago) {
          try {
            const savedLog = localStorage.getItem(`coliseu_titulo_log_${t.codigo}`);
            if (savedLog) {
              const parsed = JSON.parse(savedLog);
              dtQuitacao = parsed.dataLiquidacao;
            }
          } catch { /* fallback */ }
          if (!dtQuitacao) {
            dtQuitacao = t.dataQuitacao || t.dtPagto || t.vencimento || '2026-08-10';
          }
        }
        return isPago
          ? { ...t, isAberto: false, isVencido: false, status: 'Pago', valorAtual: 0, valorPago: t.valor, dataQuitacao: dtQuitacao }
          : t;
      });
    } catch { /* fallback */ }
    return initialTitles;
  });

  useEffect(() => {
    try {
      const savedQuitacoes = localStorage.getItem(`coliseu_quitacoes_${clienteId}`);
      const paidIds = savedQuitacoes ? new Set(JSON.parse(savedQuitacoes)) : new Set();
      setClientTitles(
        initialTitles.map((t: any) => {
          const isLocallyPaid = paidIds.has(t.codigo);
          const isPago = isLocallyPaid || !t.isAberto || t.status === 'Pago';
          let dtQuitacao = undefined;
          if (isPago) {
            try {
              const savedLog = localStorage.getItem(`coliseu_titulo_log_${t.codigo}`);
              if (savedLog) {
                const parsed = JSON.parse(savedLog);
                dtQuitacao = parsed.dataLiquidacao;
              }
            } catch { /* fallback */ }
            if (!dtQuitacao) {
              dtQuitacao = t.dataQuitacao || t.dtPagto || t.vencimento || '2026-08-10';
            }
          }
          return isPago
            ? { ...t, isAberto: false, isVencido: false, status: 'Pago', valorAtual: 0, valorPago: t.valor, dataQuitacao: dtQuitacao }
            : t;
        })
      );
    } catch { /* fallback */ }
  }, [initialTitles, clienteId]);

  // Sorting State na Ficha do Cliente
  type SortField =
    | 'codigo'
    | 'emissao'
    | 'parcela'
    | 'tipo'
    | 'vencimento'
    | 'quitacao'
    | 'valor'
    | 'valorAtual'
    | 'pedido'
    | 'especie'
    | 'status';
  type SortDirection = 'asc' | 'desc';

  const [sortField, setSortField] = useState<SortField>('vencimento');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Configuração e Reordenação de Colunas por Arrastar e Soltar (Salvo no Login do Usuário)
  interface ColumnConfig {
    id: string;
    label: string;
    field: SortField;
    width?: string;
    align?: 'left' | 'center' | 'right';
  }

  const DEFAULT_CUSTOMER_COLUMNS: ColumnConfig[] = [
    { id: 'codigo', label: 'Código', field: 'codigo', width: '65px', align: 'left' },
    { id: 'emissao', label: 'Emissão', field: 'emissao', width: '75px', align: 'left' },
    { id: 'parcela', label: 'Parc.', field: 'parcela', width: '45px', align: 'center' },
    { id: 'tipo', label: 'R/P', field: 'tipo', width: '40px', align: 'center' },
    { id: 'vencimento', label: 'Vencimento', field: 'vencimento', width: '80px', align: 'left' },
    { id: 'quitacao', label: 'Dt. Quitação', field: 'quitacao', width: '85px', align: 'center' },
    { id: 'valor', label: 'Valor Título', field: 'valor', width: '90px', align: 'right' },
    { id: 'valorAtual', label: 'Valor Atual', field: 'valorAtual', width: '90px', align: 'right' },
    { id: 'pedido', label: 'Pedido', field: 'pedido', align: 'left' },
    { id: 'especie', label: 'Espécie', field: 'especie', align: 'left' },
    { id: 'status', label: 'Status', field: 'status', width: '85px', align: 'center' },
  ];

  const getUserKey = () => {
    return localStorage.getItem('coliseu_logged_user') || 'silenus';
  };

  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    try {
      const user = getUserKey();
      const saved = localStorage.getItem(`coliseu_columns_order_customer360_${user}`);
      if (saved) {
        const orderIds: string[] = JSON.parse(saved);
        const ordered: ColumnConfig[] = [];
        orderIds.forEach((id) => {
          const found = DEFAULT_CUSTOMER_COLUMNS.find((c) => c.id === id);
          if (found) ordered.push(found);
        });
        DEFAULT_CUSTOMER_COLUMNS.forEach((c) => {
          if (!ordered.some((o) => o.id === c.id)) ordered.push(c);
        });
        return ordered;
      }
    } catch { /* fallback */ }
    return DEFAULT_CUSTOMER_COLUMNS;
  });

  // Pointer-Based Drag & Drop para Reordenação de Colunas (sem conflito de cursor proibido)
  interface ColumnDragState {
    isDragging: boolean;
    sourceIndex: number;
    hoverIndex: number;
    label: string;
    mouseX: number;
    mouseY: number;
    startX: number;
    startY: number;
  }

  const [columnDragState, setColumnDragState] = useState<ColumnDragState | null>(null);
  const columnDragRef = useRef<ColumnDragState | null>(null);
  columnDragRef.current = columnDragState;
  const [isConfigColunasOpen, setIsConfigColunasOpen] = useState(false);

  const handleHeaderMouseDown = (e: React.MouseEvent, index: number, col: ColumnConfig) => {
    if (e.button !== 0) return;
    e.preventDefault();

    const startX = e.clientX;
    const startY = e.clientY;

    const initialDrag: ColumnDragState = {
      isDragging: false,
      sourceIndex: index,
      hoverIndex: index,
      label: col.label,
      mouseX: startX,
      mouseY: startY,
      startX,
      startY,
    };

    setColumnDragState(initialDrag);

    const onMouseMove = (moveEvent: MouseEvent) => {
      const current = columnDragRef.current;
      if (!current) return;

      const dx = Math.abs(moveEvent.clientX - current.startX);
      const dy = Math.abs(moveEvent.clientY - current.startY);
      const isNowDragging = current.isDragging || dx > 4 || dy > 4;

      const elem = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY);
      const thElem = elem?.closest('th[data-customer-col-index]');
      let targetIdx = current.hoverIndex;
      if (thElem) {
        const idxAttr = thElem.getAttribute('data-customer-col-index');
        if (idxAttr !== null) {
          targetIdx = parseInt(idxAttr, 10);
        }
      }

      setColumnDragState({
        ...current,
        isDragging: isNowDragging,
        hoverIndex: targetIdx,
        mouseX: moveEvent.clientX,
        mouseY: moveEvent.clientY,
      });
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);

      const finalDrag = columnDragRef.current;
      if (finalDrag) {
        if (finalDrag.isDragging && finalDrag.sourceIndex !== finalDrag.hoverIndex && finalDrag.hoverIndex >= 0) {
          setColumns((prevCols) => {
            const updated = [...prevCols];
            const [removed] = updated.splice(finalDrag.sourceIndex, 1);
            updated.splice(finalDrag.hoverIndex, 0, removed);
            try {
              const user = getUserKey();
              localStorage.setItem(`coliseu_columns_order_customer360_${user}`, JSON.stringify(updated.map((c) => c.id)));
            } catch { /* fallback */ }
            return updated;
          });
        } else if (!finalDrag.isDragging) {
          handleSort(col.field);
        }
      }
      setColumnDragState(null);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleResetColumns = () => {
    setColumns(DEFAULT_CUSTOMER_COLUMNS);
    try {
      const user = getUserKey();
      localStorage.removeItem(`coliseu_columns_order_customer360_${user}`);
    } catch { /* fallback */ }
  };

  const handleSaveConfigColumns = (newCols: ColumnConfig[]) => {
    setColumns(newCols);
    try {
      const user = getUserKey();
      localStorage.setItem(`coliseu_columns_order_customer360_${user}`, JSON.stringify(newCols.map((c) => c.id)));
    } catch { /* fallback */ }
  };

  const renderSortHeader = (col: ColumnConfig, index: number) => {
    const isSorted = sortField === col.field;
    const isBeingDragged = columnDragState?.isDragging && columnDragState.sourceIndex === index;
    const isDropTarget = columnDragState?.isDragging && columnDragState.hoverIndex === index && columnDragState.sourceIndex !== index;
    const displayLabel = col.id === 'valorAtual' && financeiroFilter === 'pago' ? 'Valor Pago' : col.label;

    return (
      <th
        key={col.id}
        data-customer-col-index={index}
        onMouseDown={(e) => handleHeaderMouseDown(e, index, col)}
        style={{
          cursor: columnDragState?.isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
          width: col.width,
          textAlign: col.align || 'left',
          opacity: isBeingDragged ? 0.3 : 1,
          borderLeft: isDropTarget ? '3px solid var(--action-primary)' : undefined,
          backgroundColor: isDropTarget ? 'var(--surface-3)' : undefined,
          transition: 'border-left 0.15s ease, background-color 0.15s ease',
          padding: '6px 8px',
          position: 'relative',
        }}
        title={`Arraste para mover "${col.label}" ou clique para ordenar`}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            justifyContent: col.align === 'right' ? 'flex-end' : col.align === 'center' ? 'center' : 'flex-start',
            width: '100%',
            pointerEvents: 'none',
          }}
        >
          <GripVertical
            size={11}
            style={{ opacity: 0.45, flexShrink: 0, marginRight: '-2px' }}
          />
          <span>{displayLabel}</span>
          {isSorted ? (
            sortDirection === 'asc' ? (
              <ArrowUp size={12} style={{ color: 'var(--action-primary)', flexShrink: 0 }} />
            ) : (
              <ArrowDown size={12} style={{ color: 'var(--action-primary)', flexShrink: 0 }} />
            )
          ) : (
            <ArrowUpDown size={11} style={{ opacity: 0.35, flexShrink: 0 }} />
          )}
        </div>
      </th>
    );
  };

  const renderCell = (colId: string, t: any, isPago: boolean) => {
    switch (colId) {
      case 'codigo':
        return (
          <td
            key={colId}
            className="text-mono"
            style={{
              fontWeight: 600,
              color: 'var(--text-link)',
              fontSize: '11px',
              cursor: 'pointer',
            }}
            onClick={() => handleAbrirDetalhesTitulo(t)}
            title="Clique para ver o Log de Liquidação / Ficha do Título"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ textDecoration: 'underline' }}>{t.codigo}</span>
              <Eye size={12} style={{ opacity: 0.7, color: 'var(--text-link)', flexShrink: 0 }} />
            </div>
          </td>
        );
      case 'emissao':
        return <td key={colId} style={{ fontSize: '11px' }} className="tabular-nums">{formatDate(t.emissao)}</td>;
      case 'parcela':
        return <td key={colId} style={{ fontSize: '11px', textAlign: 'center' }}>{t.parcela}</td>;
      case 'tipo':
        return (
          <td
            key={colId}
            style={{
              fontSize: '11px',
              textAlign: 'center',
              fontWeight: 600,
              color: t.tipo === 'Receber' || t.tipo === 'R' ? 'var(--status-success)' : 'var(--status-danger)',
            }}
          >
            {t.tipo === 'Receber' || t.tipo === 'R' ? 'R' : 'P'}
          </td>
        );
      case 'vencimento':
        return (
          <td
            key={colId}
            style={{
              fontSize: '11px',
              fontWeight: t.isVencido && !isPago ? 700 : 500,
              color: isPago ? 'var(--text-muted)' : t.isVencido ? 'var(--status-danger)' : 'var(--text-primary)',
            }}
            className="tabular-nums"
          >
            {formatDate(t.vencimento)}
          </td>
        );
      case 'quitacao':
        return (
          <td
            key={colId}
            style={{
              fontSize: '11px',
              textAlign: 'center',
              fontWeight: isPago ? 600 : 400,
              color: isPago ? 'var(--status-success)' : 'var(--text-muted)',
            }}
            className="tabular-nums"
          >
            {isPago ? formatDate(t.dataQuitacao || t.vencimento) : '-'}
          </td>
        );
      case 'valor':
        return (
          <td key={colId} style={{ textAlign: 'right', fontWeight: 600 }} className="tabular-nums">
            {formatCurrency(t.valor)}
          </td>
        );
      case 'valorAtual':
        return (
          <td
            key={colId}
            style={{
              textAlign: 'right',
              fontWeight: 700,
              color: isPago
                ? 'var(--status-success)'
                : t.isVencido
                ? 'var(--status-danger)'
                : 'var(--text-primary)',
            }}
            className="tabular-nums"
          >
            {isPago ? `${formatCurrency(t.valorPago || t.valor)}` : formatCurrency(t.valorAtual || t.valor)}
          </td>
        );
      case 'pedido':
        return (
          <td key={colId} style={{ fontSize: '11px', color: 'var(--text-link)' }}>
            {t.pedido || '-'}
          </td>
        );
      case 'especie':
        return (
          <td key={colId} style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
            {t.especie || 'BOLETO BANCARIO'}
          </td>
        );
      case 'status':
        return (
          <td key={colId} style={{ textAlign: 'center' }}>
            <StatusBadge
              status={isPago ? 'Pago' : t.isVencido ? 'Vencido' : 'Em Aberto'}
              label={isPago ? 'Pago' : t.isVencido ? 'Vencido' : 'Em Aberto'}
            />
          </td>
        );
      default:
        return <td key={colId}>-</td>;
    }
  };

  // Buscar pedidos reais do cliente no dataset
  const clientOrdersRaw: any[] = useMemo(() => {
    const fromId = (customerOrdersData as any)[clienteId];
    if (Array.isArray(fromId) && fromId.length > 0) return fromId;
    
    const paddedCode = `pes-${(codigo || '').padStart(5, '0')}`;
    const fromCode = (customerOrdersData as any)[paddedCode];
    if (Array.isArray(fromCode) && fromCode.length > 0) return fromCode;

    return [];
  }, [clienteId, codigo]);

  // Totais financeiros calculados em tempo real com base nos títulos reativos
  const financialTotals = useMemo(() => {
    let aberto = 0.0;
    let vencido = 0.0;
    let quitado = 0.0;
    let juros = 0.0;
    let qtdAberto = 0;
    let qtdVencido = 0;
    let qtdQuitado = 0;

    const hojeStr = new Date().toISOString().split('T')[0];

    clientTitles.forEach((t) => {
      if (t.isAberto) {
        aberto += t.valor;
        qtdAberto += 1;
        if (t.isVencido || (t.vencimento && t.vencimento < hojeStr)) {
          vencido += t.valor;
          qtdVencido += 1;
          const diffJuros = (t.valorAtual || t.valor) - t.valor;
          juros += diffJuros > 0 ? diffJuros : Math.round(t.valor * 0.02 * 100) / 100;
        }
      } else {
        quitado += (t.valorPago || t.valor || 0);
        qtdQuitado += 1;
      }
    });

    return {
      subtotalAberto: Math.round(aberto * 100) / 100,
      totalVencido: Math.round(vencido * 100) / 100,
      totalQuitado: Math.round(quitado * 100) / 100,
      totalJuros: Math.round(juros * 100) / 100,
      totalGeral: Math.round((aberto + juros) * 100) / 100,
      qtdAberto,
      qtdVencido,
      qtdQuitado,
      qtdTotal: clientTitles.length,
    };
  }, [clientTitles]);

  const limiteUtilizado = financialTotals.subtotalAberto > 0 ? financialTotals.subtotalAberto : (c.creditoUtilizado || 0.0);
  const limiteDisponivel = Math.max(0, limiteTotal - limiteUtilizado);
  const percentUtilizado = Math.min(100, Math.round((limiteUtilizado / (limiteTotal || 1)) * 1000) / 10);

  // Filtrar e Ordenar títulos na tabela da Aba Financeiro
  const filteredTitles = useMemo(() => {
    let list: any[] = [];
    if (financeiroFilter === 'aberto') {
      list = clientTitles.filter((t) => t.isAberto);
    } else if (financeiroFilter === 'vencido') {
      list = clientTitles.filter((t) => t.isVencido && t.isAberto);
    } else if (financeiroFilter === 'pago') {
      list = clientTitles.filter((t) => !t.isAberto || t.status === 'Pago');
    } else {
      list = clientTitles;
    }

    return list.sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      switch (sortField) {
        case 'codigo':
          valA = parseInt(a.codigo, 10) || a.codigo;
          valB = parseInt(b.codigo, 10) || b.codigo;
          break;
        case 'emissao':
          valA = a.emissao || '';
          valB = b.emissao || '';
          break;
        case 'parcela':
          valA = a.parcela || '';
          valB = b.parcela || '';
          break;
        case 'tipo':
          valA = a.tipo || '';
          valB = b.tipo || '';
          break;
        case 'vencimento':
          valA = a.vencimento || '';
          valB = b.vencimento || '';
          break;
        case 'quitacao':
          valA = a.dataQuitacao || a.vencimento || '';
          valB = b.dataQuitacao || b.vencimento || '';
          break;
        case 'valor':
          valA = a.valor || 0;
          valB = b.valor || 0;
          break;
        case 'valorAtual':
          valA = a.isAberto ? (a.valorAtual || a.valor) : (a.valorPago || a.valor);
          valB = b.isAberto ? (b.valorAtual || b.valor) : (b.valorPago || b.valor);
          break;
        case 'pedido':
          valA = a.pedido || '';
          valB = b.pedido || '';
          break;
        case 'especie':
          valA = (a.especie || '').toLowerCase();
          valB = (b.especie || '').toLowerCase();
          break;
        case 'status':
          valA = a.status || '';
          valB = b.status || '';
          break;
        default:
          valA = a.vencimento || '';
          valB = b.vencimento || '';
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [clientTitles, financeiroFilter, sortField, sortDirection]);

  // Produtos mais comprados extraídos dos pedidos
  const topProducts = useMemo(() => {
    return [
      { sku: '00579', descricao: 'VERNIZ POLIURETANO ALTO SÓLIDOS DELTRON PPG 5LT', qtdTotal: 36, valorTotal: 6840.0, ultimaCompra: '10/08/2026' },
      { sku: '00537', descricao: 'DUL2045 PRIMER POLIURETANO CINZA 800 ML', qtdTotal: 28, valorTotal: 3450.0, ultimaCompra: '07/08/2026' },
      { sku: '00001', descricao: 'D807 DILUENTE MEDIO PPG 5LT UNIVERSAL', qtdTotal: 18, valorTotal: 6587.10, ultimaCompra: '20/07/2026' },
      { sku: '00120', descricao: 'MASSA POLIESTER RÁPIDA 1KG C/ CATALISADOR', qtdTotal: 45, valorTotal: 1890.0, ultimaCompra: '18/05/2026' },
    ];
  }, []);

  // Função para Estornar / Cancelar Quitação de títulos
  const handleEstornarQuitacao = () => {
    if (selectedTitleIds.size === 0) return;

    const titulosParaEstornar = clientTitles.filter((t) => selectedTitleIds.has(t.codigo));
    const valorEstornoTotal = titulosParaEstornar.reduce((acc, t) => acc + (t.valorPago || t.valor || 0), 0);

    const confirmar = window.confirm(
      `Deseja realmente cancelar/estornar a quitação de ${selectedTitleIds.size} título(s) no valor total de ${formatCurrency(valorEstornoTotal)}?\n\nOs títulos retornarão imediatamente para a situação 'Em Aberto' e o valor será estornado do Caixa/Banco.`
    );

    if (!confirmar) return;

    const hojeStr = new Date().toISOString().split('T')[0];

    // Atualizar estado reativo dos títulos para voltarem a Em Aberto
    const updatedTitles = clientTitles.map((t) => {
      if (selectedTitleIds.has(t.codigo)) {
        const isVencido = t.vencimento && t.vencimento < hojeStr;
        return {
          ...t,
          isAberto: true,
          isVencido: !!isVencido,
          status: isVencido ? 'Vencido' : 'Em Aberto',
          valorPago: 0,
          valorAtual: t.valor,
          dataQuitacao: undefined,
        };
      }
      return t;
    });

    setClientTitles(updatedTitles);

    // Atualizar localStorage de quitações
    try {
      const existingSaved = localStorage.getItem(`coliseu_quitacoes_${clienteId}`);
      if (existingSaved) {
        const currentIds: string[] = JSON.parse(existingSaved);
        const filteredIds = currentIds.filter((id) => !selectedTitleIds.has(id));
        localStorage.setItem(`coliseu_quitacoes_${clienteId}`, JSON.stringify(filteredIds));
      }

      // Registrar movimento de estorno no caixa
      const existingMovs = localStorage.getItem('coliseu_movimentacoes_caixa');
      const movs = existingMovs ? JSON.parse(existingMovs) : [];
      const novaMov = {
        id: `estorno-${Date.now()}`,
        data: new Date().toISOString(),
        tipo: 'ESTORNO_QUITACAO_TITULO',
        valor: -valorEstornoTotal,
        caixa: 'CAIXA PADRÃO',
        conta: 'CONTA DA EMPRESA',
        cliente: nomeCliente,
        titulos: Array.from(selectedTitleIds),
        observacao: `Estorno de quitação de ${selectedTitleIds.size} títulos`,
      };
      localStorage.setItem('coliseu_movimentacoes_caixa', JSON.stringify([novaMov, ...movs]));
    } catch { /* fallback */ }

    setSelectedTitleIds(new Set());
    setToastMessage(`↩ Estorno de ${formatCurrency(valorEstornoTotal)} (${titulosParaEstornar.length} títulos) realizado com sucesso! Títulos voltaram para 'Em Aberto'.`);
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Função para abrir o Log de Liquidação / Detalhes do Título
  const handleAbrirDetalhesTitulo = (t: any) => {
    const isPago = !t.isAberto || t.status === 'Pago';
    let liqData: any = null;

    if (isPago) {
      try {
        const savedLog = localStorage.getItem(`coliseu_titulo_log_${t.codigo}`);
        if (savedLog) {
          liqData = JSON.parse(savedLog);
        }
      } catch { /* fallback */ }

      // Se for título migrado do Firebird sem log prévio, gerar log histórico com base nos dados do sistema
      if (!liqData) {
        liqData = {
          dataLiquidacao: t.dataQuitacao || t.vencimento || '18/01/2025',
          horaLiquidacao: '10:36:28',
          valorLiquidado: t.valorPago || t.valor || 0,
          numeroAutenticacao: `252${t.codigo.slice(-3) || '208'}`,
          descontoLiq: 0.0,
          jurosLiq: 0.0,
          multaLiq: 0.0,
          usuarioLiquidou: 'GERENCIA 99863',
          caixaPrincipal: 'CAIXA PADRAO',
          contaBancaria: 'CONTA DA EMPRESA',
          itensPagamento: [
            {
              caixaOuBanco: 'CAIXA PADRAO',
              especie: t.especie || 'DINHEIRO',
              data: t.dataQuitacao || t.vencimento || '18/01/2025',
              hora: '10:36:28',
              tipoDC: 'C',
              valor: t.valorPago || t.valor || 0,
              usuario: 'GERENCIA 99863',
            },
          ],
        };
      }
    }

    const detalhe: TituloDetalhesData = {
      codigo: t.codigo,
      emissao: t.emissao || '2026-07-17',
      vencimento: t.vencimento || '2026-08-15',
      parcela: t.parcela || '1/1',
      tipo: (t.tipo === 'Receber' || t.tipo === 'R') ? 'R' : 'P',
      valorOriginal: t.valor || 0,
      valorAtual: t.valorAtual || t.valor || 0,
      valorPago: t.valorPago || (isPago ? t.valor : 0),
      saldoDevedor: isPago ? 0 : (t.valorAtual || t.valor || 0),
      especieOriginal: t.especie || 'BOLETO BANCARIO',
      status: isPago ? 'Pago' : (t.isVencido ? 'Vencido' : 'Em Aberto'),
      isAberto: !isPago,
      isVencido: !!t.isVencido && !isPago,
      pedido: t.pedido || 'MOB391',
      nf: t.nf || '1024',
      clienteNome: nomeCliente,
      clienteCpfCnpj: cpfCnpj,
      portador: '748 - SICREDI CARTEIRA SIMPLES',
      liquidacao: liqData,
    };

    setSelectedTituloDetalhes(detalhe);
    setIsTituloDetalhesOpen(true);
  };

  // Reemissão de 2ª via de Recibo
  const handleReemitirRecibo = (detalhe: TituloDetalhesData) => {
    setIsTituloDetalhesOpen(false);
    const randomAuth = Array.from({ length: 4 }, () => Math.random().toString(36).substring(2, 6).toUpperCase()).join('-');
    setReciboData({
      numeroRecibo: `REC-${detalhe.codigo}-2VIA`,
      dataHora: `${detalhe.liquidacao?.dataLiquidacao || 'Hoje'} às ${detalhe.liquidacao?.horaLiquidacao || '10:00'}`,
      clienteNome: nomeCliente,
      clienteCpfCnpj: cpfCnpj,
      titulos: [
        {
          codigo: detalhe.codigo,
          parcela: detalhe.parcela,
          vencimento: detalhe.vencimento,
          valorOriginal: detalhe.valorOriginal,
          juros: detalhe.liquidacao?.jurosLiq || 0,
          multa: detalhe.liquidacao?.multaLiq || 0,
          desconto: detalhe.liquidacao?.descontoLiq || 0,
          valorLiquidado: detalhe.liquidacao?.valorLiquidado || detalhe.valorOriginal,
        },
      ],
      totalSubtotal: detalhe.valorOriginal,
      totalJuros: detalhe.liquidacao?.jurosLiq || 0,
      totalMulta: detalhe.liquidacao?.multaLiq || 0,
      totalDesconto: detalhe.liquidacao?.descontoLiq || 0,
      totalLiquidado: detalhe.liquidacao?.valorLiquidado || detalhe.valorOriginal,
      formasPagamento: detalhe.liquidacao?.itensPagamento.map(p => ({ especie: p.especie, valor: p.valor })) || [{ especie: 'DINHEIRO', valor: detalhe.valorOriginal }],
      caixaNome: detalhe.liquidacao?.caixaPrincipal || 'CAIXA PADRÃO',
      contaNome: detalhe.liquidacao?.contaBancaria || 'CONTA DA EMPRESA',
      autenticacao: detalhe.liquidacao?.numeroAutenticacao || `AUT-${randomAuth}-2026`,
    });
    setIsReciboOpen(true);
  };

  // Estorno direto de título a partir da Ficha
  const handleEstornarTitulo = (cod: string) => {
    setIsTituloDetalhesOpen(false);
    setSelectedTitleIds(new Set([cod]));
    setTimeout(() => {
      handleEstornarQuitacao();
    }, 100);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--surface-1)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-sm)',
        overflow: 'hidden',
      }}
    >
      {/* 1. Header do Customer Workspace */}
      <div
        style={{
          padding: 'var(--spacing-3) var(--spacing-4)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 'var(--spacing-3)',
          backgroundColor: 'var(--surface-sunken)',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', flexWrap: 'wrap' }}>
            <h3
              style={{
                fontSize: 'var(--font-size-base)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--text-primary)',
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              {nomeCliente}
            </h3>
            <StatusBadge status={status} />
            <span
              style={{
                fontSize: '10px',
                color: 'var(--domain-comercial)',
                backgroundColor: 'var(--surface-2)',
                padding: '1px 6px',
                borderRadius: 'var(--radius-xs)',
                fontWeight: 'var(--font-weight-medium)',
              }}
            >
              Cód. {codigo}
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-3)',
              marginTop: '4px',
              fontSize: '11px',
              color: 'var(--text-muted)',
              flexWrap: 'wrap',
            }}
          >
            <span style={{ color: 'var(--domain-comercial)', fontWeight: 'var(--font-weight-medium)' }}>
              {curva}
            </span>
            <span>•</span>
            <span>CPF/CNPJ: <strong style={{ color: 'var(--text-secondary)' }}>{formatCnpjCpf(cpfCnpj)}</strong></span>
            {rgIe && rgIe !== '-' && (
              <>
                <span>•</span>
                <span>IE/RG: {rgIe}</span>
              </>
            )}
            <span>•</span>
            <span>Vendedor: <strong style={{ color: 'var(--text-secondary)' }}>{vendedor}</strong></span>
            <span>•</span>
            <span>{cidade}/{uf}</span>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {onEditClient && (
            <Button
              variant="secondary"
              size="md"
              onClick={() => onEditClient(c)}
              leftIcon={<Edit3 size={15} />}
            >
              Editar Cadastro
            </Button>
          )}
          <Button
            variant="primary"
            size="md"
            onClick={() => alert(`Iniciando nova venda balcão/faturada para o cliente: ${nomeCliente}`)}
            leftIcon={<ShoppingCart size={15} />}
          >
            Nova Venda
          </Button>
          {onClose && (
            <Button variant="ghost" size="md" onClick={onClose} aria-label="Fechar" style={{ padding: '8px', minWidth: '38px', height: '38px' }}>
              <X size={16} />
            </Button>
          )}
        </div>
      </div>

      {/* 2. Sub-abas do Customer Workspace */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--surface-1)',
          padding: '0 var(--spacing-4)',
        }}
      >
        <button
          onClick={() => setActiveTab('resumo')}
          className={`coliseu-tab-btn ${activeTab === 'resumo' ? 'active' : ''}`}
          style={{
            padding: '8px 12px',
            fontSize: '11px',
            fontWeight: activeTab === 'resumo' ? 'var(--font-weight-semibold)' : 'var(--font-weight-normal)',
            color: activeTab === 'resumo' ? 'var(--text-primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'resumo' ? '2px solid var(--domain-comercial)' : '2px solid transparent',
            background: 'none',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer',
          }}
        >
          Visão 360°
        </button>

        <button
          onClick={() => setActiveTab('comercial')}
          className={`coliseu-tab-btn ${activeTab === 'comercial' ? 'active' : ''}`}
          style={{
            padding: '8px 12px',
            fontSize: '11px',
            fontWeight: activeTab === 'comercial' ? 'var(--font-weight-semibold)' : 'var(--font-weight-normal)',
            color: activeTab === 'comercial' ? 'var(--text-primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'comercial' ? '2px solid var(--domain-comercial)' : '2px solid transparent',
            background: 'none',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer',
          }}
        >
          Comercial & Pedidos ({clientOrdersRaw.length})
        </button>

        <button
          onClick={() => setActiveTab('financeiro')}
          className={`coliseu-tab-btn ${activeTab === 'financeiro' ? 'active' : ''}`}
          style={{
            padding: '8px 12px',
            fontSize: '11px',
            fontWeight: activeTab === 'financeiro' ? 'var(--font-weight-semibold)' : 'var(--font-weight-normal)',
            color: activeTab === 'financeiro' ? 'var(--text-primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'financeiro' ? '2px solid var(--domain-comercial)' : '2px solid transparent',
            background: 'none',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <span>Financeiro & Crédito</span>
          {financialTotals.qtdAberto > 0 && (
            <span
              style={{
                fontSize: '10px',
                padding: '1px 5px',
                borderRadius: '10px',
                backgroundColor: financialTotals.totalVencido > 0 ? 'var(--status-danger-bg)' : 'var(--status-warning-bg)',
                color: financialTotals.totalVencido > 0 ? 'var(--status-danger)' : 'var(--status-warning)',
                fontWeight: 700,
              }}
            >
              {financialTotals.qtdAberto}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('produtos')}
          className={`coliseu-tab-btn ${activeTab === 'produtos' ? 'active' : ''}`}
          style={{
            padding: '8px 12px',
            fontSize: '11px',
            fontWeight: activeTab === 'produtos' ? 'var(--font-weight-semibold)' : 'var(--font-weight-normal)',
            color: activeTab === 'produtos' ? 'var(--text-primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'produtos' ? '2px solid var(--domain-comercial)' : '2px solid transparent',
            background: 'none',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer',
          }}
        >
          Produtos Comprados
        </button>

        <button
          onClick={() => setActiveTab('timeline')}
          className={`coliseu-tab-btn ${activeTab === 'timeline' ? 'active' : ''}`}
          style={{
            padding: '8px 12px',
            fontSize: '11px',
            fontWeight: activeTab === 'timeline' ? 'var(--font-weight-semibold)' : 'var(--font-weight-normal)',
            color: activeTab === 'timeline' ? 'var(--text-primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'timeline' ? '2px solid var(--domain-comercial)' : '2px solid transparent',
            background: 'none',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer',
          }}
        >
          Timeline
        </button>
      </div>

      {/* 3. Conteúdo da Aba Ativa */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 'var(--spacing-4)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--spacing-3)',
        }}
      >
        {/* ABA 1: VISÃO 360° */}
        {activeTab === 'resumo' && (
          <>
            {/* Card de Crédito e Risco */}
            <div
              style={{
                backgroundColor: 'var(--surface-sunken)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-xs)',
                padding: 'var(--spacing-3)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--spacing-2)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
                  <CheckCircle2 size={15} style={{ color: 'var(--status-success)' }} />
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Score de Crédito: <strong style={{ color: 'var(--status-success)' }}>{score} pts</strong> ({score >= 800 ? 'Excelente' : score >= 600 ? 'Bom' : 'Restrito'})
                  </span>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Limite Consumido: <strong style={{ color: percentUtilizado > 80 ? 'var(--status-danger)' : 'var(--text-primary)' }}>{percentUtilizado}%</strong>
                </span>
              </div>

              {/* Barra de Progresso do Limite */}
              <div
                style={{
                  height: '6px',
                  backgroundColor: 'var(--surface-2)',
                  borderRadius: '3px',
                  overflow: 'hidden',
                  width: '100%',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${Math.min(100, Math.max(2, percentUtilizado))}%`,
                    backgroundColor: percentUtilizado > 80 ? 'var(--status-danger)' : 'var(--domain-comercial)',
                    borderRadius: '3px',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>

              {/* Três Métricas de Crédito */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--spacing-2)', marginTop: '4px' }}>
                <div>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Limite Concedido</span>
                  <div className="tabular-nums" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {formatCurrency(limiteTotal)}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Crédito Utilizado (Em Aberto)</span>
                  <div className="tabular-nums" style={{ fontSize: '13px', fontWeight: 700, color: financialTotals.totalVencido > 0 ? 'var(--status-danger)' : 'var(--status-warning)' }}>
                    {formatCurrency(limiteUtilizado)}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Saldo Disponível</span>
                  <div className="tabular-nums" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--status-success)' }}>
                    {formatCurrency(limiteDisponivel)}
                  </div>
                </div>
              </div>
            </div>

            {/* Inteligência Contextual Discreta */}
            <div
              style={{
                backgroundColor: 'var(--surface-2)',
                borderLeft: '3px solid var(--status-ai)',
                padding: '8px 12px',
                borderRadius: '0 var(--radius-xs) var(--radius-xs) 0',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase' }}>Oportunidade & Análise Financeira</span>
                <span>Insight IA</span>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.35 }}>
                {financialTotals.totalVencido > 0 ? (
                  <>Cliente possui <strong style={{ color: 'var(--status-danger)' }}>{formatCurrency(financialTotals.totalVencido)}</strong> em títulos vencidos ({financialTotals.qtdVencido} títulos). Limite operacional em atenção.</>
                ) : (
                  <>Cliente com pontualidade excelente e limite saudável de {formatCurrency(limiteTotal)}. Saldo disponível de {formatCurrency(limiteDisponivel)} para novos pedidos faturados.</>
                )}
              </p>
            </div>

            {/* Dados Cadastrais & Contato Completos */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Dados de Contato, Endereço & Parâmetros Comerciais
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Phone size={13} style={{ color: 'var(--text-muted)' }} />
                  <span>{telefone}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Mail size={13} style={{ color: 'var(--text-muted)' }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={13} style={{ color: 'var(--text-muted)' }} />
                  <span>{endereco ? `${endereco}${numero ? ', ' + numero : ''}${bairro ? ' - ' + bairro : ''} - ${cidade}/${uf}` : `${cidade}/${uf}`}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={13} style={{ color: 'var(--text-muted)' }} />
                  <span>Última Compra: {c.dataUltimaCompra || c.ultimaCompra || (c.dataCadastro ? `Cadastrado em ${c.dataCadastro}` : '-')}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Building size={13} style={{ color: 'var(--text-muted)' }} />
                  <span>Fantasia: {nomeFantasia}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CreditCard size={13} style={{ color: 'var(--text-muted)' }} />
                  <span>{tabelaPreco} • {condicaoPagto}</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ABA 2: COMERCIAL & PEDIDOS */}
        {activeTab === 'comercial' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--spacing-2)' }}>
              <div style={{ backgroundColor: 'var(--surface-sunken)', padding: '8px 10px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Total de Pedidos Realizados</span>
                <div className="tabular-nums" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {clientOrdersRaw.length} pedidos
                </div>
              </div>
              <div style={{ backgroundColor: 'var(--surface-sunken)', padding: '8px 10px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Volume Total Comprado</span>
                <div className="tabular-nums" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--status-success)' }}>
                  {formatCurrency(clientOrdersRaw.reduce((acc, o) => acc + (o.valor || 0), 0))}
                </div>
              </div>
              <div style={{ backgroundColor: 'var(--surface-sunken)', padding: '8px 10px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Canal Predominante</span>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Representante Mobile
                </div>
              </div>
            </div>

            <div className="coliseu-table-container" style={{ flex: 1, overflowY: 'auto' }}>
              <table className="coliseu-table">
                <thead>
                  <tr>
                    <th>Nº Pedido</th>
                    <th>Data</th>
                    <th>Canal</th>
                    <th style={{ textAlign: 'center' }}>Itens</th>
                    <th style={{ textAlign: 'right' }}>Valor Total R$</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {clientOrdersRaw.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)' }}>
                        Nenhum pedido registrado para este cliente.
                      </td>
                    </tr>
                  ) : (
                    clientOrdersRaw.map((ord) => (
                      <tr key={ord.id}>
                        <td style={{ fontWeight: 600, color: 'var(--text-link)', fontSize: '11px' }}>{ord.numero || ord.id}</td>
                        <td style={{ fontSize: '11px' }}>{ord.data}</td>
                        <td style={{ fontSize: '11px' }}>{ord.canal}</td>
                        <td style={{ textAlign: 'center', fontSize: '11px' }}>{ord.itens} un</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }} className="tabular-nums">{formatCurrency(ord.valor)}</td>
                        <td style={{ textAlign: 'center' }}><StatusBadge status={ord.status === 'Concluído' ? 'success' : 'warning'} label={ord.status} /></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ABA 3: FINANCEIRO & CRÉDITO (CENTRAL DE RELACIONAMENTO REAL) */}
        {activeTab === 'financeiro' && (
          <>
            {/* Top KPIs da Central de Relacionamento */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 'var(--spacing-2)' }}>
              <div style={{ backgroundColor: 'var(--surface-sunken)', padding: '8px 10px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>SubTotal em Aberto</span>
                <div className="tabular-nums" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--status-warning)' }}>
                  {formatCurrency(financialTotals.subtotalAberto)}
                </div>
              </div>
              <div style={{ backgroundColor: 'var(--status-danger-bg)', padding: '8px 10px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--status-danger)' }}>
                <span style={{ fontSize: '10px', color: 'var(--status-danger)', fontWeight: 600 }}>Vencido</span>
                <div className="tabular-nums" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--status-danger)' }}>
                  {formatCurrency(financialTotals.totalVencido)}
                </div>
              </div>
              <div style={{ backgroundColor: 'var(--status-success-bg)', padding: '8px 10px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--status-success)' }}>
                <span style={{ fontSize: '10px', color: 'var(--status-success)', fontWeight: 600 }}>Quitado / Pago</span>
                <div className="tabular-nums" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--status-success)' }}>
                  {formatCurrency(financialTotals.totalQuitado)}
                </div>
              </div>
              <div style={{ backgroundColor: 'var(--surface-sunken)', padding: '8px 10px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Juros Moratórios</span>
                <div className="tabular-nums" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {formatCurrency(financialTotals.totalJuros)}
                </div>
              </div>
              <div style={{ backgroundColor: 'var(--surface-sunken)', padding: '8px 10px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--domain-comercial)' }}>
                <span style={{ fontSize: '10px', color: 'var(--domain-comercial)', fontWeight: 600 }}>Total Atualizado</span>
                <div className="tabular-nums" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {formatCurrency(financialTotals.totalGeral)}
                </div>
              </div>
            </div>

            {/* Barra de Ações da Central de Liquidação / Estorno */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                {financeiroFilter === 'pago' ? (
                  <>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={handleEstornarQuitacao}
                      disabled={selectedTitleIds.size === 0}
                      style={{ backgroundColor: 'var(--status-danger)', borderColor: 'var(--status-danger)', color: '#fff' }}
                    >
                      <RotateCcw size={13} /> Cancelar / Estornar Quitação ({selectedTitleIds.size})
                    </Button>
                    <div style={{ display: 'flex', gap: '2px', marginLeft: '8px' }}>
                      <button
                        type="button"
                        onClick={() => { const ids = new Set(filteredTitles.map((t: any) => t.codigo)); setSelectedTitleIds(ids); }}
                        style={{ padding: '3px 8px', fontSize: '10px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--surface-2)', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 500 }}
                      >
                        Marcar Todos ({filteredTitles.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedTitleIds(new Set())}
                        style={{ padding: '3px 8px', fontSize: '10px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--surface-2)', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 500 }}
                      >
                        Desmarcar
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => { setLiquidarMode('liquidar'); setIsLiquidarOpen(true); }}
                      disabled={selectedTitleIds.size === 0}
                    >
                      <DollarSign size={13} /> Liquidar Selecionados ({selectedTitleIds.size})
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => { setLiquidarMode('renegociar'); setIsLiquidarOpen(true); }}
                      disabled={selectedTitleIds.size === 0}
                    >
                      Renegociar
                    </Button>
                    <div style={{ display: 'flex', gap: '2px', marginLeft: '8px' }}>
                      <button
                        type="button"
                        onClick={() => { const ids = new Set(filteredTitles.filter((t: any) => t.isAberto).map((t: any) => t.codigo)); setSelectedTitleIds(ids); }}
                        style={{ padding: '3px 8px', fontSize: '10px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--surface-2)', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 500 }}
                      >
                        Marcar Todos
                      </button>
                      <button
                        type="button"
                        onClick={() => { const ids = new Set(filteredTitles.filter((t: any) => t.isVencido && t.isAberto).map((t: any) => t.codigo)); setSelectedTitleIds(ids); }}
                        style={{ padding: '3px 8px', fontSize: '10px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--surface-2)', color: 'var(--status-danger)', cursor: 'pointer', fontWeight: 500 }}
                      >
                        Marcar Vencidos
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedTitleIds(new Set())}
                        style={{ padding: '3px 8px', fontSize: '10px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--surface-2)', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 500 }}
                      >
                        Desmarcar
                      </button>
                    </div>
                  </>
                )}
              </div>
              {selectedTitleIds.size > 0 && (
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  {financeiroFilter === 'pago' ? (
                    <>
                      {selectedTitleIds.size} selecionado(s) para estorno • Total a Estornar:{' '}
                      <strong className="tabular-nums" style={{ color: 'var(--status-danger)' }}>
                        {formatCurrency(filteredTitles.filter((t: any) => selectedTitleIds.has(t.codigo)).reduce((s: number, t: any) => s + (t.valorPago || t.valor), 0))}
                      </strong>
                    </>
                  ) : (
                    <>
                      {selectedTitleIds.size} selecionado(s) • Subtotal:{' '}
                      <strong className="tabular-nums">
                        {formatCurrency(filteredTitles.filter((t: any) => selectedTitleIds.has(t.codigo)).reduce((s: number, t: any) => s + (t.valorAtual || t.valor), 0))}
                      </strong>
                    </>
                  )}
                </span>
              )}
            </div>

            {/* Filtros da Tabela de Títulos */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => { setFinanceiroFilter('aberto'); setSelectedTitleIds(new Set()); }}
                  style={{
                    padding: '3px 8px',
                    fontSize: '11px',
                    borderRadius: 'var(--radius-xs)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: financeiroFilter === 'aberto' ? 'var(--domain-comercial)' : 'var(--surface-2)',
                    color: financeiroFilter === 'aberto' ? '#fff' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Em Aberto ({financialTotals.qtdAberto})
                </button>
                <button
                  type="button"
                  onClick={() => { setFinanceiroFilter('vencido'); setSelectedTitleIds(new Set()); }}
                  style={{
                    padding: '3px 8px',
                    fontSize: '11px',
                    borderRadius: 'var(--radius-xs)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: financeiroFilter === 'vencido' ? 'var(--status-danger)' : 'var(--surface-2)',
                    color: financeiroFilter === 'vencido' ? '#fff' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Vencidos ({financialTotals.qtdVencido})
                </button>
                <button
                  type="button"
                  onClick={() => { setFinanceiroFilter('pago'); setSelectedTitleIds(new Set()); }}
                  style={{
                    padding: '3px 8px',
                    fontSize: '11px',
                    borderRadius: 'var(--radius-xs)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: financeiroFilter === 'pago' ? 'var(--status-success)' : 'var(--surface-2)',
                    color: financeiroFilter === 'pago' ? '#fff' : 'var(--status-success)',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Quitados ({financialTotals.qtdQuitado})
                </button>
                <button
                  type="button"
                  onClick={() => { setFinanceiroFilter('todos'); setSelectedTitleIds(new Set()); }}
                  style={{
                    padding: '3px 8px',
                    fontSize: '11px',
                    borderRadius: 'var(--radius-xs)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: financeiroFilter === 'todos' ? 'var(--text-primary)' : 'var(--surface-2)',
                    color: financeiroFilter === 'todos' ? 'var(--surface-1)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Todos os Títulos ({financialTotals.qtdTotal})
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setIsConfigColunasOpen(true)}
                  title="Abrir painel para organizar ordem das colunas"
                  style={{
                    padding: '2px 8px',
                    fontSize: '10px',
                    borderRadius: 'var(--radius-xs)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--surface-2)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontWeight: 500,
                  }}
                >
                  <Settings2 size={10} color="var(--action-primary)" />
                  <span>Organizar Colunas</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetColumns}
                  title="Restaurar a ordem padrão original das colunas"
                  style={{
                    padding: '2px 8px',
                    fontSize: '10px',
                    borderRadius: 'var(--radius-xs)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--surface-2)',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <RotateCcw size={10} />
                  <span>Restaurar Padrão</span>
                </button>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '4px' }}>
                  Exibindo <strong>{filteredTitles.length}</strong> títulos
                </span>
              </div>
            </div>

            {/* Tabela de Títulos Reais com Drag & Drop de Colunas */}
            <div className="coliseu-table-container" style={{ flex: 1, overflowY: 'auto' }}>
              <table className="coliseu-table">
                <thead>
                  <tr>
                    <th style={{ width: '35px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={filteredTitles.length > 0 && filteredTitles.every((t: any) => selectedTitleIds.has(t.codigo))}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTitleIds(new Set(filteredTitles.map((t: any) => t.codigo)));
                          } else {
                            setSelectedTitleIds(new Set());
                          }
                        }}
                        style={{ cursor: 'pointer', accentColor: financeiroFilter === 'pago' ? 'var(--status-danger)' : 'var(--action-primary)' }}
                      />
                    </th>
                    {columns.map((col, idx) => renderSortHeader(col, idx))}
                  </tr>
                </thead>
                <tbody>
                  {filteredTitles.length === 0 ? (
                    <tr>
                      <td colSpan={columns.length + 1} style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)' }}>
                        Nenhum título localizado com o filtro selecionado.
                      </td>
                    </tr>
                  ) : (
                    filteredTitles.map((t, idx) => {
                      const isPago = !t.isAberto || t.status === 'Pago';
                      return (
                        <tr
                          key={`${t.codigo}-${idx}`}
                          style={{
                            backgroundColor: isPago
                              ? 'rgba(16, 185, 129, 0.03)'
                              : t.isVencido
                              ? 'rgba(239, 68, 68, 0.04)'
                              : undefined,
                          }}
                        >
                          <td style={{ textAlign: 'center', width: '35px' }}>
                            <input
                              type="checkbox"
                              checked={selectedTitleIds.has(t.codigo)}
                              onChange={(e) => {
                                const next = new Set(selectedTitleIds);
                                if (e.target.checked) { next.add(t.codigo); } else { next.delete(t.codigo); }
                                setSelectedTitleIds(next);
                              }}
                              style={{ cursor: 'pointer', accentColor: isPago ? 'var(--status-danger)' : 'var(--action-primary)' }}
                            />
                          </td>
                          {columns.map((col) => renderCell(col.id, t, isPago))}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ABA 4: PRODUTOS MAIS COMPRADOS */}
        {activeTab === 'produtos' && (
          <div className="coliseu-table-container">
            <table className="coliseu-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Descrição do Produto</th>
                  <th style={{ textAlign: 'right' }}>Qtd Total</th>
                  <th style={{ textAlign: 'right' }}>Total R$</th>
                  <th style={{ textAlign: 'center' }}>Última Compra</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((p) => (
                  <tr key={p.sku}>
                    <td className="text-mono" style={{ color: 'var(--text-link)', fontSize: '11px' }}>{p.sku}</td>
                    <td style={{ fontWeight: 500 }}>{p.descricao}</td>
                    <td style={{ textAlign: 'right' }} className="tabular-nums">{p.qtdTotal} Un</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }} className="tabular-nums">{formatCurrency(p.valorTotal)}</td>
                    <td style={{ textAlign: 'center', fontSize: '11px' }}>{p.ultimaCompra}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ABA 5: TIMELINE */}
        {activeTab === 'timeline' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ padding: '8px 12px', borderLeft: '2px solid var(--domain-comercial)', backgroundColor: 'var(--surface-sunken)', borderRadius: '0 var(--radius-xs) var(--radius-xs) 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Pedido MOB399 Faturado</span>
                <span style={{ color: 'var(--text-muted)' }}>10/08/2026 16:30</span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--text-secondary)' }}>
                Pedido MOB399 faturado em 3 parcelas via Boleto Bancário no valor de R$ 105,00.
              </p>
            </div>
            <div style={{ padding: '8px 12px', borderLeft: '2px solid var(--domain-comercial)', backgroundColor: 'var(--surface-sunken)', borderRadius: '0 var(--radius-xs) var(--radius-xs) 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Pedido MOB398 Faturado</span>
                <span style={{ color: 'var(--text-muted)' }}>10/08/2026 16:15</span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--text-secondary)' }}>
                Pedido MOB398 faturado em 3 parcelas via Boleto Bancário no valor de R$ 25,44.
              </p>
            </div>
            <div style={{ padding: '8px 12px', borderLeft: '2px solid var(--domain-comercial)', backgroundColor: 'var(--surface-sunken)', borderRadius: '0 var(--radius-xs) var(--radius-xs) 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Pedido MOB391 Faturado</span>
                <span style={{ color: 'var(--text-muted)' }}>17/07/2026 11:20</span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--text-secondary)' }}>
                Pedido MOB391 faturado em 3 parcelas de R$ 2.666,67 (Total R$ 8.000,00) via Boleto Bancário.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 'var(--z-toast)', display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 18px', backgroundColor: '#065f46', color: '#ecfdf5', borderRadius: 'var(--radius-sm)', boxShadow: '0 10px 25px rgba(0,0,0,0.3)', border: '1px solid #10b981', fontSize: '13px', fontWeight: 600 }}>
          <CheckCircle2 size={18} color="#34d399" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Modal de Liquidação de Títulos */}
      <TitulosLiquidarModal
        isOpen={isLiquidarOpen}
        onClose={() => setIsLiquidarOpen(false)}
        titulos={clientTitles.map((t: any) => ({
          codigo: t.codigo || '',
          emissao: t.emissao || '',
          parcela: t.parcela || '1/1',
          tipo: (t.tipo === 'Receber' || t.tipo === 'R') ? 'R' : 'P',
          vencimento: t.vencimento || '',
          valorTitulo: t.valor || 0,
          valorAtual: t.valorAtual || t.valor || 0,
          valorPago: t.valorPago || 0,
          saldoDevedor: t.isAberto ? (t.valorAtual || t.valor || 0) : 0,
          especie: t.especie || 'BOLETO BANCARIO',
          status: t.status || 'Em Aberto',
          pedido: t.pedido,
          nf: t.nf,
          isVencido: !!t.isVencido,
          diasAtraso: 0,
        }))}
        clienteNome={nomeCliente}
        clienteCnpj={cpfCnpj}
        totalCliente={financialTotals.subtotalAberto}
        initialSelectedIds={selectedTitleIds}
        onConfirmarLiquidacao={(data) => {
          const paidIds = new Set(data.titulosIds);

          // Atualizar o estado reativo dos títulos
          const updatedTitles = clientTitles.map((t) => {
            if (paidIds.has(t.codigo)) {
              return {
                ...t,
                isAberto: false,
                isVencido: false,
                status: 'Pago',
                valorPago: t.valor,
                valorAtual: 0,
                dataQuitacao: new Date().toISOString().split('T')[0],
              };
            }
            return t;
          });

          setClientTitles(updatedTitles);

          // Persistir no localStorage
          try {
            const existingSaved = localStorage.getItem(`coliseu_quitacoes_${clienteId}`);
            const existingIds = existingSaved ? JSON.parse(existingSaved) : [];
            const mergedIds = Array.from(new Set([...existingIds, ...data.titulosIds]));
            localStorage.setItem(`coliseu_quitacoes_${clienteId}`, JSON.stringify(mergedIds));

            const existingMovs = localStorage.getItem('coliseu_movimentacoes_caixa');
            const movs = existingMovs ? JSON.parse(existingMovs) : [];
            const novaMov = {
              id: `mov-${Date.now()}`,
              data: new Date().toISOString(),
              tipo: 'RECEBIMENTO_TITULO',
              valor: data.valorTotal,
              caixa: data.caixaNome,
              conta: data.contaNome,
              cliente: nomeCliente,
              titulos: data.titulosIds,
              pagamentos: data.pagamentos,
            };
            localStorage.setItem('coliseu_movimentacoes_caixa', JSON.stringify([novaMov, ...movs]));

            // Salvar Log Detalhado da Liquidação para cada título quitado (para consulta na Ficha/Log)
            const randomAuth = Array.from({ length: 4 }, () => Math.random().toString(36).substring(2, 6).toUpperCase()).join('-');
            const horaAgora = new Date().toLocaleTimeString('pt-BR');
            const dataHoje = new Date().toLocaleDateString('pt-BR');

            data.titulosIds.forEach((id) => {
              const tit = clientTitles.find((t) => t.codigo === id);
              const logData = {
                dataLiquidacao: dataHoje,
                horaLiquidacao: horaAgora,
                valorLiquidado: tit ? (tit.valorAtual || tit.valor) : data.valorTotal / data.titulosIds.length,
                numeroAutenticacao: `AUT-${randomAuth}-2026`,
                descontoLiq: data.desconto > 0 ? Math.round((data.desconto / data.titulosIds.length) * 100) / 100 : 0,
                jurosLiq: data.juros > 0 ? Math.round((data.juros / data.titulosIds.length) * 100) / 100 : 0,
                multaLiq: data.multa > 0 ? Math.round((data.multa / data.titulosIds.length) * 100) / 100 : 0,
                usuarioLiquidou: 'ROBERTO SOUZA (GERENCIA)',
                caixaPrincipal: data.caixaNome,
                contaBancaria: data.contaNome,
                itensPagamento: data.pagamentos.map((p) => ({
                  caixaOuBanco: data.caixaNome,
                  especie: p.especie,
                  data: dataHoje,
                  hora: horaAgora,
                  tipoDC: 'C' as const,
                  valor: Math.round((p.valor / data.titulosIds.length) * 100) / 100,
                  usuario: 'ROBERTO SOUZA (GERENCIA)',
                  nsuAutorizacao: p.nsuAutorizacao,
                  numeroCheque: p.numeroCheque,
                })),
              };
              localStorage.setItem(`coliseu_titulo_log_${id}`, JSON.stringify(logData));
            });
          } catch { /* fallback */ }

          // Fechar modal de liquidação e limpar seleção
          setIsLiquidarOpen(false);
          setSelectedTitleIds(new Set());

          // Exibir Toast de confirmação
          setToastMessage(`Quitação de ${formatCurrency(data.valorTotal)} (${data.titulosIds.length} títulos) confirmada com sucesso no ${data.caixaNome}!`);
          setTimeout(() => setToastMessage(null), 4500);

          // Abrir Recibo de Quitação se solicitado
          if (data.imprimirRecibo) {
            const titulosLiquidadosDetalhe = clientTitles
              .filter((t) => paidIds.has(t.codigo))
              .map((t) => ({
                codigo: t.codigo,
                parcela: t.parcela || '1/1',
                vencimento: t.vencimento,
                valorOriginal: t.valor,
                juros: data.juros > 0 ? data.juros / data.titulosIds.length : 0,
                multa: data.multa > 0 ? data.multa / data.titulosIds.length : 0,
                desconto: data.desconto > 0 ? data.desconto / data.titulosIds.length : 0,
                valorLiquidado: t.valorAtual || t.valor,
              }));

            const randomAuth = Array.from({ length: 4 }, () => Math.random().toString(36).substring(2, 6).toUpperCase()).join('-');

            setReciboData({
              numeroRecibo: `REC-${Date.now().toString().slice(-6)}`,
              dataHora: new Date().toLocaleString('pt-BR'),
              clienteNome: nomeCliente,
              clienteCpfCnpj: cpfCnpj,
              titulos: titulosLiquidadosDetalhe,
              totalSubtotal: data.subtotal,
              totalJuros: data.juros,
              totalMulta: data.multa,
              totalDesconto: data.desconto,
              totalLiquidado: data.valorTotal,
              formasPagamento: data.pagamentos.map((p) => ({ especie: p.especie, valor: p.valor })),
              caixaNome: data.caixaNome,
              contaNome: data.contaNome,
              autenticacao: `AUT-${randomAuth}-2026`,
            });

            setIsReciboOpen(true);
          }
        }}
        onConfirmarRenegociacao={(config) => {
          setIsLiquidarOpen(false);
          setSelectedTitleIds(new Set());
          setToastMessage(`Acordo de renegociação em ${config.numParcelas} parcelas via ${config.especieNovasParcelas} gerado com sucesso!`);
          setTimeout(() => setToastMessage(null), 4500);
        }}
      />

      {/* Modal de Recibo Imprimível */}
      <ReciboQuitacaoModal
        isOpen={isReciboOpen}
        onClose={() => setIsReciboOpen(false)}
        recibo={reciboData}
      />

      {/* Modal de Detalhes e Log de Liquidação do Título */}
      <TituloDetalhesModal
        isOpen={isTituloDetalhesOpen}
        onClose={() => setIsTituloDetalhesOpen(false)}
        titulo={selectedTituloDetalhes}
        onReemitirRecibo={handleReemitirRecibo}
        onEstornarTitulo={handleEstornarTitulo}
      />

      {/* Modal de Configuração de Colunas */}
      <ConfigurarColunasModal
        isOpen={isConfigColunasOpen}
        onClose={() => setIsConfigColunasOpen(false)}
        columns={columns}
        onSaveColumns={handleSaveConfigColumns}
        onResetColumns={handleResetColumns}
      />

      {/* Floating Drag Chip que segue o cursor sem símbolo de proibido */}
      {columnDragState?.isDragging && (
        <div
          style={{
            position: 'fixed',
            left: columnDragState.mouseX + 12,
            top: columnDragState.mouseY + 12,
            zIndex: 99999,
            pointerEvents: 'none',
            backgroundColor: 'var(--action-primary)',
            color: '#ffffff',
            fontSize: '11px',
            fontWeight: 600,
            padding: '5px 12px',
            borderRadius: 'var(--radius-xs)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            userSelect: 'none',
          }}
        >
          <GripVertical size={13} />
          <span>Movendo: {columnDragState.label}</span>
        </div>
      )}
    </div>
  );
};
