import React, { useState, useMemo, useEffect, useRef } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { KPICard } from '../components/ui/KPICard';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { AIInsight } from '../components/ui/AIComponents';
import { formatCurrency, formatDate, parseNumber, formatCnpjCpf } from '../lib/formatters';
import {
  TitulosLiquidarModal,
  LiquidacaoPayload,
  ReciboQuitacaoModal,
  ReciboQuitacaoData,
  TituloDetalhesModal,
  TituloDetalhesData,
  ConfigurarColunasModal,
} from '../components/financeiro';
import {
  Search,
  Plus,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  CheckCircle2,
  X,
  Check,
  Trash2,
  Eye,
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
  RotateCcw,
  AlertTriangle,
  Building,
  CreditCard,
  Clock,
  User,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  GripVertical,
  Settings2,
} from 'lucide-react';
import customerTitlesData from '../data/customer_titles.json';

export interface TituloFinanceiroCompleto {
  id: string;
  codigo: string;
  tipo: 'receber' | 'pagar';
  tipoRP: 'R' | 'P';
  titulo: string;
  clienteFornecedor: string;
  clienteId?: string;
  cpfCnpj?: string;
  categoria: string;
  formaPagamento: string;
  emissao: string;
  vencimento: string;
  parcela: string;
  valor: number;
  valorAtual: number;
  valorPago: number;
  saldoDevedor: number;
  pedido?: string;
  nf?: string;
  status: 'Em Aberto' | 'Vencido' | 'Pago' | 'Cancelado';
  isAberto: boolean;
  isVencido: boolean;
  dataQuitacao?: string;
  portador?: string;
}

// Lançamentos base de Contas a Pagar (Fornecedores & Despesas Operacionais)
const INITIAL_CONTAS_PAGAR: TituloFinanceiroCompleto[] = [
  {
    id: 'PAG-401',
    codigo: '40101',
    tipo: 'pagar',
    tipoRP: 'P',
    titulo: 'DUPLICATA FORNECEDOR TINTAS',
    clienteFornecedor: 'TINTAS BRASIL LTDA',
    cpfCnpj: '04.123.456/0001-88',
    categoria: 'Fornecedores Matéria-Prima',
    formaPagamento: 'Boleto Bancário',
    emissao: '2026-07-20',
    vencimento: '2026-08-14',
    parcela: '1/3',
    valor: 8400.0,
    valorAtual: 8568.0,
    valorPago: 0,
    saldoDevedor: 8568.0,
    pedido: 'FORN-8821',
    nf: '4510',
    status: 'Vencido',
    isAberto: true,
    isVencido: true,
    portador: '001 - BANCO DO BRASIL',
  },
  {
    id: 'PAG-402',
    codigo: '40102',
    tipo: 'pagar',
    tipoRP: 'P',
    titulo: 'DUPLICATA FORNECEDOR TINTAS',
    clienteFornecedor: 'TINTAS BRASIL LTDA',
    cpfCnpj: '04.123.456/0001-88',
    categoria: 'Fornecedores Matéria-Prima',
    formaPagamento: 'Boleto Bancário',
    emissao: '2026-07-20',
    vencimento: '2026-08-28',
    parcela: '2/3',
    valor: 8400.0,
    valorAtual: 8400.0,
    valorPago: 0,
    saldoDevedor: 8400.0,
    pedido: 'FORN-8821',
    nf: '4510',
    status: 'Em Aberto',
    isAberto: true,
    isVencido: false,
    portador: '001 - BANCO DO BRASIL',
  },
  {
    id: 'PAG-403',
    codigo: '40103',
    tipo: 'pagar',
    tipoRP: 'P',
    titulo: 'ENERGIA ELÉTRICA ENERGISA MS',
    clienteFornecedor: 'ENERGISA DISTRIBUIDORA S.A.',
    cpfCnpj: '03.222.111/0001-00',
    categoria: 'Despesas Operacionais',
    formaPagamento: 'Débito Automático',
    emissao: '2026-08-01',
    vencimento: '2026-08-22',
    parcela: '1/1',
    valor: 3450.0,
    valorAtual: 3450.0,
    valorPago: 0,
    saldoDevedor: 3450.0,
    pedido: 'CONTRATO-ENERG',
    nf: '98201',
    status: 'Em Aberto',
    isAberto: true,
    isVencido: false,
    portador: '748 - SICREDI',
  },
  {
    id: 'PAG-404',
    codigo: '40104',
    tipo: 'pagar',
    tipoRP: 'P',
    titulo: 'ALUGUEL GALPÃO LOGÍSTICO',
    clienteFornecedor: 'IMOBILIÁRIA CENTRAL DOURADOS',
    cpfCnpj: '11.888.777/0001-33',
    categoria: 'Instalações & Aluguéis',
    formaPagamento: 'PIX / Transferência',
    emissao: '2026-08-01',
    vencimento: '2026-08-10',
    parcela: '1/1',
    valor: 6500.0,
    valorAtual: 0,
    valorPago: 6500.0,
    saldoDevedor: 0,
    pedido: 'ALUG-2026',
    nf: 'REC-08',
    status: 'Pago',
    isAberto: false,
    isVencido: false,
    dataQuitacao: '2026-08-10',
    portador: 'CONTA DA EMPRESA',
  },
  {
    id: 'PAG-405',
    codigo: '40105',
    tipo: 'pagar',
    tipoRP: 'P',
    titulo: 'HONORÁRIOS CONTÁBEIS MÊS 07',
    clienteFornecedor: 'ESCRITÓRIO CONTÁBIL SÃO PAULO',
    cpfCnpj: '22.333.444/0001-55',
    categoria: 'Serviços Profissionais',
    formaPagamento: 'Boleto Bancário',
    emissao: '2026-08-01',
    vencimento: '2026-08-20',
    parcela: '1/1',
    valor: 2200.0,
    valorAtual: 2200.0,
    valorPago: 0,
    saldoDevedor: 2200.0,
    pedido: 'SERV-CONT',
    nf: '7721',
    status: 'Em Aberto',
    isAberto: true,
    isVencido: false,
    portador: '748 - SICREDI',
  },
];

export const FinancialPage: React.FC = () => {
  const [activeMode, setActiveMode] = useState<'receber' | 'pagar' | 'fluxo'>('receber');
  const [statusFilter, setStatusFilter] = useState<'aberto' | 'vencido' | 'pago' | 'todos'>('aberto');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Sorting State
  type SortField =
    | 'codigo'
    | 'cliente'
    | 'titulo'
    | 'emissao'
    | 'parcela'
    | 'tipo'
    | 'vencimento'
    | 'quitacao'
    | 'valor'
    | 'valorAtual'
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

  const DEFAULT_COLUMNS: ColumnConfig[] = [
    { id: 'codigo', label: 'Código', field: 'codigo', width: '80px', align: 'left' },
    { id: 'cliente', label: 'Pessoa / Parceiro', field: 'cliente', align: 'left' },
    { id: 'titulo', label: 'Título / Descrição', field: 'titulo', align: 'left' },
    { id: 'emissao', label: 'Emissão', field: 'emissao', width: '75px', align: 'left' },
    { id: 'parcela', label: 'Parc.', field: 'parcela', width: '45px', align: 'center' },
    { id: 'tipo', label: 'R/P', field: 'tipo', width: '40px', align: 'center' },
    { id: 'vencimento', label: 'Vencimento', field: 'vencimento', width: '80px', align: 'left' },
    { id: 'quitacao', label: 'Dt. Quitação', field: 'quitacao', width: '85px', align: 'center' },
    { id: 'valor', label: 'Valor Título', field: 'valor', width: '95px', align: 'right' },
    { id: 'valorAtual', label: 'Valor Atual', field: 'valorAtual', width: '95px', align: 'right' },
    { id: 'especie', label: 'Espécie', field: 'especie', align: 'left' },
    { id: 'status', label: 'Status', field: 'status', width: '85px', align: 'center' },
  ];

  const getUserKey = () => {
    return localStorage.getItem('coliseu_logged_user') || 'silenus';
  };

  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    try {
      const user = getUserKey();
      const saved = localStorage.getItem(`coliseu_columns_order_financial_${user}`);
      if (saved) {
        const orderIds: string[] = JSON.parse(saved);
        const ordered: ColumnConfig[] = [];
        orderIds.forEach((id) => {
          const found = DEFAULT_COLUMNS.find((c) => c.id === id);
          if (found) ordered.push(found);
        });
        DEFAULT_COLUMNS.forEach((c) => {
          if (!ordered.some((o) => o.id === c.id)) ordered.push(c);
        });
        return ordered;
      }
    } catch { /* fallback */ }
    return DEFAULT_COLUMNS;
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
      const thElem = elem?.closest('th[data-financial-col-index]');
      let targetIdx = current.hoverIndex;
      if (thElem) {
        const idxAttr = thElem.getAttribute('data-financial-col-index');
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
              localStorage.setItem(`coliseu_columns_order_financial_${user}`, JSON.stringify(updated.map((c) => c.id)));
              showToast(`✨ Layout de colunas atualizado e salvo para o usuário ${user.toUpperCase()}!`);
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
    setColumns(DEFAULT_COLUMNS);
    try {
      const user = getUserKey();
      localStorage.removeItem(`coliseu_columns_order_financial_${user}`);
      showToast('↺ Ordem padrão das colunas restaurada!');
    } catch { /* fallback */ }
  };

  const handleSaveConfigColumns = (newCols: ColumnConfig[]) => {
    setColumns(newCols);
    try {
      const user = getUserKey();
      localStorage.setItem(`coliseu_columns_order_financial_${user}`, JSON.stringify(newCols.map((c) => c.id)));
      showToast(`✨ Ordem das colunas salva para o usuário ${user.toUpperCase()}!`);
    } catch { /* fallback */ }
  };

  // Modais State
  const [isLiquidarOpen, setIsLiquidarOpen] = useState(false);
  const [liquidarMode, setLiquidarMode] = useState<'liquidar' | 'renegociar'>('liquidar');
  const [reciboData, setReciboData] = useState<ReciboQuitacaoData | null>(null);
  const [isReciboOpen, setIsReciboOpen] = useState(false);
  const [selectedTituloDetalhes, setSelectedTituloDetalhes] = useState<TituloDetalhesData | null>(null);
  const [isTituloDetalhesOpen, setIsTituloDetalhesOpen] = useState(false);
  const [isNovoLancamentoOpen, setIsNovoLancamentoOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State Novo Lançamento
  const [novoTipo, setNovoTipo] = useState<'receber' | 'pagar'>('receber');
  const [novoTitulo, setNovoTitulo] = useState('');
  const [novoCliente, setNovoCliente] = useState('');
  const [novoValor, setNovoValor] = useState('');
  const [novoVencimento, setNovoVencimento] = useState(new Date().toISOString().split('T')[0]);
  const [novaCategoria, setNovaCategoria] = useState('Venda de Mercadorias');
  const [novaFormaPagto, setNovaFormaPagto] = useState('Boleto Bancário');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Carregar e Unificar Títulos Reais (Receber e Pagar)
  const [titulos, setTitulos] = useState<TituloFinanceiroCompleto[]>(() => {
    const rawData = customerTitlesData as Record<string, any[]>;
    const listaReceber: TituloFinanceiroCompleto[] = [];
    const hojeStr = new Date().toISOString().split('T')[0];

    // Mapeamento de clientes conhecidos
    const nomesClientes: Record<string, { nome: string; doc: string }> = {
      'pes-05738': { nome: 'ROBERSON DE ALMEIDA SOUZA', doc: '705.032.141-91' },
      'pes-00002': { nome: 'GRANDOURADOS VEICULOS LTDA', doc: '03.835.451/0001-37' },
      'pes-00003': { nome: 'RIBEIRO VEICULOS S/A', doc: '75.642.256/0004-44' },
      'pes-00004': { nome: 'AUTO TINTAS P.P.G LTDA', doc: '02.237.852/0001-22' },
      'pes-00005': { nome: 'PEDRO ROBERTO FERREIRA-ME', doc: '08.798.856/0001-30' },
      'pes-00006': { nome: 'RENATO LUIS DA SILVA', doc: '518.357.111-20' },
      'pes-00007': { nome: 'ROMERA ROMERA LTDA-ME', doc: '02.854.753/0001-05' },
      'pes-00008': { nome: 'SILENUS DE SOUZA ROBERTO', doc: '450.890.120-44' },
    };

    // Extrair títulos a receber de cada cliente
    Object.entries(rawData).forEach(([pesId, arr]) => {
      if (!Array.isArray(arr)) return;
      const infoCliente = nomesClientes[pesId] || {
        nome: (arr[0]?.descricao || `CLIENTE / PARCEIRO ${pesId.replace('pes-', '')}`).toUpperCase(),
        doc: '00.000.000/0000-00',
      };

      // Verificar quitações locais salvas no localStorage
      let localQuitados = new Set<string>();
      try {
        const savedQuitacoes = localStorage.getItem(`coliseu_quitacoes_${pesId}`);
        if (savedQuitacoes) {
          const ids: string[] = JSON.parse(savedQuitacoes);
          ids.forEach((id) => localQuitados.add(id));
        }
      } catch { /* fallback */ }

      arr.forEach((t) => {
        const isLocallyQuitado = localQuitados.has(t.codigo);
        const isAberto = isLocallyQuitado ? false : (t.isAberto !== false && t.status !== 'Pago');
        const isVenc = isAberto && (t.isVencido || (t.vencimento && t.vencimento < hojeStr));

        let dtQuitacao = undefined;
        if (!isAberto) {
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

        listaReceber.push({
          id: `REC-${t.codigo}`,
          codigo: t.codigo,
          tipo: 'receber',
          tipoRP: 'R',
          titulo: t.descricao || `DUPLICATA NF ${t.pedido || t.codigo}`,
          clienteFornecedor: infoCliente.nome,
          clienteId: pesId,
          cpfCnpj: infoCliente.doc,
          categoria: 'Venda de Mercadorias',
          formaPagamento: t.especie || 'Boleto Bancário',
          emissao: t.emissao || '2026-07-01',
          vencimento: t.vencimento || '2026-08-20',
          parcela: t.parcela || '1/1',
          valor: t.valor || 0,
          valorAtual: isAberto ? (t.valorAtual || t.valor || 0) : 0,
          valorPago: !isAberto ? (t.valorPago || t.valor || 0) : 0,
          saldoDevedor: isAberto ? (t.valorAtual || t.valor || 0) : 0,
          pedido: t.pedido || t.nDoc,
          nf: t.nDoc || t.pedido,
          status: !isAberto ? 'Pago' : isVenc ? 'Vencido' : 'Em Aberto',
          isAberto: isAberto,
          isVencido: isVenc,
          dataQuitacao: dtQuitacao,
          portador: t.portador || '748 - SICREDI CARTEIRA',
        });
      });
    });

    return [...listaReceber, ...INITIAL_CONTAS_PAGAR];
  });

  // Cálculos Consolidados dos KPIs
  const financialTotals = useMemo(() => {
    let recAberto = 0.0;
    let recVencido = 0.0;
    let recQuitado = 0.0;
    let pagAberto = 0.0;
    let pagVencido = 0.0;
    let pagQuitado = 0.0;

    let qtdRecAberto = 0;
    let qtdRecVencido = 0;
    let qtdRecQuitado = 0;
    let qtdPagAberto = 0;
    let qtdPagVencido = 0;
    let qtdPagQuitado = 0;

    titulos.forEach((t) => {
      if (t.tipo === 'receber') {
        if (t.isAberto) {
          recAberto += t.valorAtual || t.valor;
          qtdRecAberto += 1;
          if (t.isVencido) {
            recVencido += t.valorAtual || t.valor;
            qtdRecVencido += 1;
          }
        } else if (t.status === 'Pago') {
          recQuitado += t.valorPago || t.valor;
          qtdRecQuitado += 1;
        }
      } else {
        if (t.isAberto) {
          pagAberto += t.valorAtual || t.valor;
          qtdPagAberto += 1;
          if (t.isVencido) {
            pagVencido += t.valorAtual || t.valor;
            qtdPagVencido += 1;
          }
        } else if (t.status === 'Pago') {
          pagQuitado += t.valorPago || t.valor;
          qtdPagQuitado += 1;
        }
      }
    });

    return {
      recAberto: Math.round(recAberto * 100) / 100,
      recVencido: Math.round(recVencido * 100) / 100,
      recQuitado: Math.round(recQuitado * 100) / 100,
      pagAberto: Math.round(pagAberto * 100) / 100,
      pagVencido: Math.round(pagVencido * 100) / 100,
      pagQuitado: Math.round(pagQuitado * 100) / 100,
      saldoProjetado: Math.round((recAberto - pagAberto) * 100) / 100,
      qtdRecAberto,
      qtdRecVencido,
      qtdRecQuitado,
      qtdPagAberto,
      qtdPagVencido,
      qtdPagQuitado,
    };
  }, [titulos]);

  // Filtragem e Ordenação Dinâmica dos Títulos
  const filteredTitulos = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    const filtered = titulos.filter((t) => {
      // 1. Filtro do Modo Principal
      if (activeMode === 'receber' && t.tipo !== 'receber') return false;
      if (activeMode === 'pagar' && t.tipo !== 'pagar') return false;

      // 2. Filtro de Status
      if (statusFilter === 'aberto' && !t.isAberto) return false;
      if (statusFilter === 'vencido' && (!t.isVencido || !t.isAberto)) return false;
      if (statusFilter === 'pago' && t.isAberto) return false;

      // 3. Busca Textual 100% Protegida
      if (!q) return true;
      const cod = String(t.codigo || '').toLowerCase();
      const tit = String(t.titulo || '').toLowerCase();
      const cli = String(t.clienteFornecedor || '').toLowerCase();
      const cat = String(t.categoria || '').toLowerCase();
      const doc = String(t.cpfCnpj || '');
      const ped = String(t.pedido || '').toLowerCase();

      return (
        cod.includes(q) ||
        tit.includes(q) ||
        cli.includes(q) ||
        cat.includes(q) ||
        doc.includes(q) ||
        ped.includes(q)
      );
    });

    return filtered.sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      switch (sortField) {
        case 'codigo':
          valA = parseInt(String(a.codigo || '0'), 10) || String(a.codigo || '');
          valB = parseInt(String(b.codigo || '0'), 10) || String(b.codigo || '');
          break;
        case 'cliente':
          valA = String(a.clienteFornecedor || '').toLowerCase();
          valB = String(b.clienteFornecedor || '').toLowerCase();
          break;
        case 'titulo':
          valA = String(a.titulo || '').toLowerCase();
          valB = String(b.titulo || '').toLowerCase();
          break;
        case 'emissao':
          valA = String(a.emissao || '');
          valB = String(b.emissao || '');
          break;
        case 'parcela':
          valA = String(a.parcela || '');
          valB = String(b.parcela || '');
          break;
        case 'tipo':
          valA = String(a.tipoRP || '');
          valB = String(b.tipoRP || '');
          break;
        case 'vencimento':
          valA = String(a.vencimento || '');
          valB = String(b.vencimento || '');
          break;
        case 'quitacao':
          valA = String(a.dataQuitacao || a.vencimento || '');
          valB = String(b.dataQuitacao || b.vencimento || '');
          break;
        case 'valor':
          valA = a.valor || 0;
          valB = b.valor || 0;
          break;
        case 'valorAtual':
          valA = a.isAberto ? (a.valorAtual || a.valor) : (a.valorPago || a.valor);
          valB = b.isAberto ? (b.valorAtual || b.valor) : (b.valorPago || b.valor);
          break;
        case 'especie':
          valA = String(a.formaPagamento || '').toLowerCase();
          valB = String(b.formaPagamento || '').toLowerCase();
          break;
        case 'status':
          valA = String(a.status || '');
          valB = String(b.status || '');
          break;
        default:
          valA = String(a.vencimento || '');
          valB = String(b.vencimento || '');
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [titulos, activeMode, statusFilter, searchTerm, sortField, sortDirection]);

  // Limpar seleção ao mudar de tab ou filtro
  const handleModeChange = (mode: 'receber' | 'pagar' | 'fluxo') => {
    setActiveMode(mode);
    setSelectedIds(new Set());
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (st: 'aberto' | 'vencido' | 'pago' | 'todos') => {
    setStatusFilter(st);
    setSelectedIds(new Set());
    setCurrentPage(1);
  };

  // Funções de Seleção em Lote
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredTitulos.map((t) => t.codigo)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleToggleSelect = (codigo: string) => {
    const next = new Set(selectedIds);
    if (next.has(codigo)) {
      next.delete(codigo);
    } else {
      next.add(codigo);
    }
    setSelectedIds(next);
  };

  // Abrir Modal de Liquidação
  const handleAbrirLiquidacao = (mode: 'liquidar' | 'renegociar') => {
    if (selectedIds.size === 0) {
      showToast('⚠️ Selecione pelo menos 1 título para liquidar.');
      return;
    }
    setLiquidarMode(mode);
    setIsLiquidarOpen(true);
  };

  // Confirmar Liquidação de Títulos
  const handleConfirmarLiquidacao = (data: LiquidacaoPayload) => {
    const paidIds = new Set(data.titulosIds);
    const dataHoje = new Date().toISOString().split('T')[0];
    const horaAgora = new Date().toLocaleTimeString('pt-BR');
    const randomAuth = Array.from({ length: 4 }, () => Math.random().toString(36).substring(2, 6).toUpperCase()).join('-');

    // Atualizar estado reativo dos títulos
    const updated = titulos.map((t) => {
      if (paidIds.has(t.codigo)) {
        return {
          ...t,
          isAberto: false,
          isVencido: false,
          status: 'Pago' as const,
          valorPago: t.valor,
          valorAtual: 0,
          dataQuitacao: dataHoje,
        };
      }
      return t;
    });

    setTitulos(updated);

    // Persistir no localStorage
    try {
      data.titulosIds.forEach((cod: string) => {
        const tit = titulos.find((t) => t.codigo === cod);
        if (tit && tit.clienteId) {
          const key = `coliseu_quitacoes_${tit.clienteId}`;
          const existing = localStorage.getItem(key);
          const currentIds: string[] = existing ? JSON.parse(existing) : [];
          if (!currentIds.includes(cod)) {
            localStorage.setItem(key, JSON.stringify([...currentIds, cod]));
          }
        }

        // Salvar log detalhado da liquidação para cada título
        const logData = {
          dataLiquidacao: new Date().toLocaleDateString('pt-BR'),
          horaLiquidacao: horaAgora,
          valorLiquidado: tit ? (tit.valorAtual || tit.valor) : data.valorTotal / data.titulosIds.length,
          numeroAutenticacao: `AUT-${randomAuth}-2026`,
          descontoLiq: data.desconto > 0 ? Math.round((data.desconto / data.titulosIds.length) * 100) / 100 : 0,
          jurosLiq: data.juros > 0 ? Math.round((data.juros / data.titulosIds.length) * 100) / 100 : 0,
          multaLiq: data.multa > 0 ? Math.round((data.multa / data.titulosIds.length) * 100) / 100 : 0,
          usuarioLiquidou: 'ROBERTO SOUZA (GERENCIA)',
          caixaPrincipal: data.caixaNome,
          contaBancaria: data.contaNome,
          itensPagamento: data.pagamentos.map((p: any) => ({
            caixaOuBanco: data.caixaNome,
            especie: p.especie,
            data: new Date().toLocaleDateString('pt-BR'),
            hora: horaAgora,
            tipoDC: 'C' as const,
            valor: Math.round((p.valor / data.titulosIds.length) * 100) / 100,
            usuario: 'ROBERTO SOUZA (GERENCIA)',
            nsuAutorizacao: p.nsuAutorizacao,
            numeroCheque: p.numeroCheque,
          })),
        };
        localStorage.setItem(`coliseu_titulo_log_${cod}`, JSON.stringify(logData));
      });

      // Registrar movimento de caixa
      const existingMovs = localStorage.getItem('coliseu_movimentacoes_caixa');
      const movs = existingMovs ? JSON.parse(existingMovs) : [];
      const novaMov = {
        id: `mov-${Date.now()}`,
        data: new Date().toISOString(),
        tipo: activeMode === 'pagar' ? 'PAGAMENTO_TITULO' : 'RECEBIMENTO_TITULO',
        valor: activeMode === 'pagar' ? -data.valorTotal : data.valorTotal,
        caixa: data.caixaNome,
        conta: data.contaNome,
        cliente: 'VÁRIOS CLIENTES / FORNECEDORES',
        titulos: data.titulosIds,
        pagamentos: data.pagamentos,
      };
      localStorage.setItem('coliseu_movimentacoes_caixa', JSON.stringify([novaMov, ...movs]));
    } catch { /* fallback */ }

    setIsLiquidarOpen(false);
    setSelectedIds(new Set());
    showToast(`✅ Quitação de ${formatCurrency(data.valorTotal)} (${data.titulosIds.length} títulos) confirmada com sucesso!`);

    // Emitir recibo
    if (data.imprimirRecibo) {
      const titulosDet = titulos
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

      setReciboData({
        numeroRecibo: `REC-${Date.now().toString().slice(-6)}`,
        dataHora: new Date().toLocaleString('pt-BR'),
        clienteNome: titulosDet.length === 1 ? titulos.find((t) => t.codigo === titulosDet[0].codigo)?.clienteFornecedor || 'CLIENTE' : 'VÁRIOS PARCEIROS',
        clienteCpfCnpj: '',
        titulos: titulosDet,
        totalSubtotal: data.subtotal,
        totalJuros: data.juros,
        totalMulta: data.multa,
        totalDesconto: data.desconto,
        totalLiquidado: data.valorTotal,
        formasPagamento: data.pagamentos.map((p: any) => ({ especie: p.especie, valor: p.valor })),
        caixaNome: data.caixaNome,
        contaNome: data.contaNome,
        autenticacao: `AUT-${randomAuth}-2026`,
      });
      setIsReciboOpen(true);
    }
  };

  // Cancelar e Estornar Quitação
  const handleEstornarQuitacao = () => {
    if (selectedIds.size === 0) return;

    const titulosParaEstornar = titulos.filter((t) => selectedIds.has(t.codigo));
    const valorEstornoTotal = titulosParaEstornar.reduce((acc, t) => acc + (t.valorPago || t.valor || 0), 0);

    const confirmar = window.confirm(
      `Deseja realmente cancelar/estornar a quitação de ${selectedIds.size} título(s) no valor total de ${formatCurrency(valorEstornoTotal)}?\n\nOs títulos retornarão para 'Em Aberto' e o saldo será estornado do Caixa/Banco.`
    );

    if (!confirmar) return;

    const hojeStr = new Date().toISOString().split('T')[0];

    const updated = titulos.map((t) => {
      if (selectedIds.has(t.codigo)) {
        const isVenc = t.vencimento && t.vencimento < hojeStr;
        return {
          ...t,
          isAberto: true,
          isVencido: !!isVenc,
          status: (isVenc ? 'Vencido' : 'Em Aberto') as 'Em Aberto' | 'Vencido',
          valorPago: 0,
          valorAtual: t.valor,
          dataQuitacao: undefined,
        };
      }
      return t;
    });

    setTitulos(updated);

    // Remover dos salvos no localStorage
    try {
      titulosParaEstornar.forEach((t) => {
        if (t.clienteId) {
          const key = `coliseu_quitacoes_${t.clienteId}`;
          const existing = localStorage.getItem(key);
          if (existing) {
            const currentIds: string[] = JSON.parse(existing);
            localStorage.setItem(key, JSON.stringify(currentIds.filter((id) => id !== t.codigo)));
          }
        }
      });

      // Movimento de estorno
      const existingMovs = localStorage.getItem('coliseu_movimentacoes_caixa');
      const movs = existingMovs ? JSON.parse(existingMovs) : [];
      const novaMov = {
        id: `estorno-${Date.now()}`,
        data: new Date().toISOString(),
        tipo: 'ESTORNO_QUITACAO_TITULO',
        valor: activeMode === 'pagar' ? valorEstornoTotal : -valorEstornoTotal,
        caixa: 'CAIXA PADRÃO',
        conta: 'CONTA DA EMPRESA',
        cliente: 'VÁRIOS PARCEIROS',
        titulos: Array.from(selectedIds),
        observacao: `Estorno de quitação de ${selectedIds.size} títulos`,
      };
      localStorage.setItem('coliseu_movimentacoes_caixa', JSON.stringify([novaMov, ...movs]));
    } catch { /* fallback */ }

    setSelectedIds(new Set());
    showToast(`↩ Estorno de ${formatCurrency(valorEstornoTotal)} (${titulosParaEstornar.length} títulos) realizado com sucesso!`);
  };

  // Abrir Ficha do Título & Log de Liquidação
  const handleAbrirDetalhesTitulo = (t: TituloFinanceiroCompleto) => {
    const isPago = !t.isAberto || t.status === 'Pago';
    let liqData: any = null;

    if (isPago) {
      try {
        const savedLog = localStorage.getItem(`coliseu_titulo_log_${t.codigo}`);
        if (savedLog) {
          liqData = JSON.parse(savedLog);
        }
      } catch { /* fallback */ }

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
              especie: t.formaPagamento || 'DINHEIRO',
              data: t.dataQuitacao || t.vencimento || '18/01/2025',
              hora: '10:36:28',
              tipoDC: t.tipo === 'receber' ? 'C' : 'D',
              valor: t.valorPago || t.valor || 0,
              usuario: 'GERENCIA 99863',
            },
          ],
        };
      }
    }

    const detalhe: TituloDetalhesData = {
      codigo: t.codigo,
      emissao: t.emissao,
      vencimento: t.vencimento,
      parcela: t.parcela,
      tipo: t.tipoRP,
      valorOriginal: t.valor,
      valorAtual: t.valorAtual,
      valorPago: t.valorPago,
      saldoDevedor: t.saldoDevedor,
      especieOriginal: t.formaPagamento,
      status: t.status,
      isAberto: t.isAberto,
      isVencido: t.isVencido,
      pedido: t.pedido,
      nf: t.nf,
      clienteNome: t.clienteFornecedor,
      clienteCpfCnpj: t.cpfCnpj,
      portador: t.portador || '748 - SICREDI',
      liquidacao: liqData,
    };

    setSelectedTituloDetalhes(detalhe);
    setIsTituloDetalhesOpen(true);
  };

  // Reemissão de 2ª via do Recibo
  const handleReemitirRecibo = (detalhe: TituloDetalhesData) => {
    setIsTituloDetalhesOpen(false);
    const randomAuth = Array.from({ length: 4 }, () => Math.random().toString(36).substring(2, 6).toUpperCase()).join('-');
    setReciboData({
      numeroRecibo: `REC-${detalhe.codigo}-2VIA`,
      dataHora: `${detalhe.liquidacao?.dataLiquidacao || 'Hoje'} às ${detalhe.liquidacao?.horaLiquidacao || '10:00'}`,
      clienteNome: detalhe.clienteNome,
      clienteCpfCnpj: detalhe.clienteCpfCnpj,
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
      formasPagamento: detalhe.liquidacao?.itensPagamento.map((p) => ({ especie: p.especie, valor: p.valor })) || [{ especie: 'DINHEIRO', valor: detalhe.valorOriginal }],
      caixaNome: detalhe.liquidacao?.caixaPrincipal || 'CAIXA PADRÃO',
      contaNome: detalhe.liquidacao?.contaBancaria || 'CONTA DA EMPRESA',
      autenticacao: detalhe.liquidacao?.numeroAutenticacao || `AUT-${randomAuth}-2026`,
    });
    setIsReciboOpen(true);
  };

  // Salvar Novo Lançamento Manual
  const handleSalvarLancamento = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseNumber(novoValor);
    if (!novoTitulo.trim() || !novoCliente.trim() || isNaN(val) || val <= 0) {
      showToast('⚠️ Preencha os campos obrigatórios com valores válidos.');
      return;
    }

    const novoCod = `${Math.floor(Math.random() * 90000) + 10000}`;
    const novoItem: TituloFinanceiroCompleto = {
      id: `${novoTipo === 'receber' ? 'REC' : 'PAG'}-${novoCod}`,
      codigo: novoCod,
      tipo: novoTipo,
      tipoRP: novoTipo === 'receber' ? 'R' : 'P',
      titulo: novoTitulo.toUpperCase(),
      clienteFornecedor: novoCliente.toUpperCase(),
      cpfCnpj: '00.000.000/0000-00',
      categoria: novaCategoria,
      formaPagamento: novaFormaPagto,
      emissao: new Date().toISOString().split('T')[0],
      vencimento: novoVencimento,
      parcela: '1/1',
      valor: val,
      valorAtual: val,
      valorPago: 0,
      saldoDevedor: val,
      pedido: `MAN-${novoCod}`,
      status: 'Em Aberto',
      isAberto: true,
      isVencido: false,
      portador: '748 - SICREDI',
    };

    setTitulos((prev) => [novoItem, ...prev]);
    setIsNovoLancamentoOpen(false);
    setNovoTitulo('');
    setNovoCliente('');
    setNovoValor('');
    showToast(`✅ Título ${novoItem.id} cadastrado com sucesso!`);
  };

  // Dados para o TitulosLiquidarModal
  const selectedTitulosList = useMemo(() => {
    return titulos
      .filter((t) => selectedIds.has(t.codigo))
      .map((t) => ({
        codigo: t.codigo,
        emissao: t.emissao,
        parcela: t.parcela,
        tipo: t.tipoRP,
        vencimento: t.vencimento,
        valorTitulo: t.valor,
        valorAtual: t.valorAtual || t.valor,
        valorPago: t.valorPago,
        saldoDevedor: t.saldoDevedor,
        especie: t.formaPagamento,
        status: t.status,
        pedido: t.pedido,
        nf: t.nf,
        isVencido: t.isVencido,
        diasAtraso: 0,
      }));
  }, [titulos, selectedIds]);

  const totalSelecionado = useMemo(() => {
    return selectedTitulosList.reduce((acc, t) => acc + (t.valorAtual || t.valorTitulo), 0);
  }, [selectedTitulosList]);

  // Renderizador de Cabeçalhos Ordenáveis e Arrastáveis (Pointer-Based, sem cursor proibido)
  const renderSortHeader = (col: ColumnConfig, index: number) => {
    const isSorted = sortField === col.field;
    const isBeingDragged = columnDragState?.isDragging && columnDragState.sourceIndex === index;
    const isDropTarget = columnDragState?.isDragging && columnDragState.hoverIndex === index && columnDragState.sourceIndex !== index;
    const displayLabel = col.id === 'valorAtual' && statusFilter === 'pago' ? 'Valor Pago' : col.label;

    return (
      <th
        key={col.id}
        data-financial-col-index={index}
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
        title={`Arraste para mover a coluna "${col.label}" ou clique para ordenar`}
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

  // Renderizador de Células Conforme a Ordem Personalizada das Colunas
  const renderCell = (colId: string, t: TituloFinanceiroCompleto, isPago: boolean, isSelected: boolean) => {
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
      case 'cliente':
        return (
          <td key={colId} style={{ fontWeight: 600, fontSize: '11px' }}>
            <div>{t.clienteFornecedor}</div>
            {t.cpfCnpj && <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{t.cpfCnpj}</div>}
          </td>
        );
      case 'titulo':
        return <td key={colId} style={{ fontSize: '11px' }}>{t.titulo}</td>;
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
              fontWeight: 700,
              color: t.tipoRP === 'R' ? 'var(--status-success)' : 'var(--status-danger)',
            }}
          >
            {t.tipoRP}
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
            {isPago ? formatCurrency(t.valorPago || t.valor) : formatCurrency(t.valorAtual || t.valor)}
          </td>
        );
      case 'especie':
        return (
          <td key={colId} style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
            {t.formaPagamento}
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

  return (
    <div className="coliseu-page" style={{ padding: 'var(--spacing-3) var(--spacing-4)', gap: 'var(--spacing-3)' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="coliseu-toast-container">
          <div className="coliseu-toast coliseu-toast--success">
            <CheckCircle2 size={16} style={{ color: 'var(--status-success)', flexShrink: 0 }} />
            <span style={{ fontSize: '13px', fontWeight: 600 }}>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Header do Módulo */}
      <PageHeader
        title="Gestão Financeira & Central de Liquidação"
        description="Contas a Pagar, Contas a Receber, Liquidação multi-espécie em lote e conciliação bancária unificada."
        breadcrumbItems={[
          { label: 'Financeiro', active: false },
          { label: 'Gestão Financeira', active: true },
        ]}
        primaryAction={{
          label: '+ Novo Lançamento (F3)',
          onClick: () => setIsNovoLancamentoOpen(true),
          icon: <Plus size={14} />,
        }}
      />

      {/* 4 KPIs Financeiros Dinâmicos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--spacing-3)' }}>
        <KPICard
          title="Total a Receber (Em Aberto)"
          value={financialTotals.recAberto}
          isCurrency
          change={financialTotals.qtdRecAberto}
          periodLabel="títulos em carteira"
          icon={<TrendingUp size={18} color="var(--status-success)" />}
        />
        <KPICard
          title="Total a Pagar (Em Aberto)"
          value={financialTotals.pagAberto}
          isCurrency
          change={financialTotals.qtdPagAberto}
          periodLabel="compromissos pendentes"
          icon={<TrendingDown size={18} color="var(--status-danger)" />}
        />
        <KPICard
          title="Total Vencido (Atrasos)"
          value={activeMode === 'pagar' ? financialTotals.pagVencido : financialTotals.recVencido}
          isCurrency
          change={activeMode === 'pagar' ? financialTotals.qtdPagVencido : financialTotals.qtdRecVencido}
          periodLabel="títulos vencidos"
          icon={<AlertTriangle size={18} color="var(--status-danger)" />}
        />
        <KPICard
          title="Saldo Líquido Projetado"
          value={financialTotals.saldoProjetado}
          isCurrency
          change={14.2}
          periodLabel="fluxo consolidado"
          icon={<DollarSign size={18} color="var(--action-primary)" />}
        />
      </div>

      {/* Painel Central com Tabs, Ações e Tabela */}
      <div
        className="coliseu-card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--spacing-3)',
          padding: 'var(--spacing-3)',
          backgroundColor: 'var(--surface-1)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
        }}
      >
        {/* Barra Superior de Navegação (Modos de Visualização) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
          <div className="coliseu-tabs" style={{ margin: 0 }}>
            <button
              onClick={() => handleModeChange('receber')}
              className={`coliseu-tab ${activeMode === 'receber' ? 'coliseu-tab--active' : ''}`}
              style={{ fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <ArrowDownLeft size={14} color="var(--status-success)" />
              Contas a Receber ({financialTotals.qtdRecAberto})
            </button>
            <button
              onClick={() => handleModeChange('pagar')}
              className={`coliseu-tab ${activeMode === 'pagar' ? 'coliseu-tab--active' : ''}`}
              style={{ fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <ArrowUpRight size={14} color="var(--status-danger)" />
              Contas a Pagar ({financialTotals.qtdPagAberto})
            </button>
            <button
              onClick={() => handleModeChange('fluxo')}
              className={`coliseu-tab ${activeMode === 'fluxo' ? 'coliseu-tab--active' : ''}`}
              style={{ fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <DollarSign size={14} color="var(--action-primary)" />
              Fluxo Completo ({titulos.length})
            </button>
          </div>

          {/* Campo de Busca Rápida */}
          <div style={{ width: '320px' }}>
            <Input
              placeholder="Buscar título, cliente, fornecedor, código..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              leftIcon={<Search size={14} />}
            />
          </div>
        </div>

        {/* Barra de Ações da Central de Liquidação & Estorno */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {statusFilter === 'pago' ? (
              <>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleEstornarQuitacao}
                  disabled={selectedIds.size === 0}
                  style={{ backgroundColor: 'var(--status-danger)', borderColor: 'var(--status-danger)', color: '#fff' }}
                >
                  <RotateCcw size={13} /> Cancelar / Estornar Quitação ({selectedIds.size})
                </Button>
                <div style={{ display: 'flex', gap: '2px', marginLeft: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setSelectedIds(new Set(filteredTitulos.map((t) => t.codigo)))}
                    style={{ padding: '3px 8px', fontSize: '10px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--surface-2)', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 500 }}
                  >
                    Marcar Todos ({filteredTitulos.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedIds(new Set())}
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
                  onClick={() => handleAbrirLiquidacao('liquidar')}
                  disabled={selectedIds.size === 0}
                >
                  <DollarSign size={13} /> Liquidar Selecionados ({selectedIds.size})
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleAbrirLiquidacao('renegociar')}
                  disabled={selectedIds.size === 0}
                >
                  Renegociar
                </Button>
                <div style={{ display: 'flex', gap: '2px', marginLeft: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setSelectedIds(new Set(filteredTitulos.filter((t) => t.isAberto).map((t) => t.codigo)))}
                    style={{ padding: '3px 8px', fontSize: '10px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--surface-2)', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 500 }}
                  >
                    Marcar Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedIds(new Set(filteredTitulos.filter((t) => t.isVencido && t.isAberto).map((t) => t.codigo)))}
                    style={{ padding: '3px 8px', fontSize: '10px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--surface-2)', color: 'var(--status-danger)', cursor: 'pointer', fontWeight: 500 }}
                  >
                    Marcar Vencidos
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedIds(new Set())}
                    style={{ padding: '3px 8px', fontSize: '10px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--surface-2)', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 500 }}
                  >
                    Desmarcar
                  </button>
                </div>
              </>
            )}
          </div>

          {selectedIds.size > 0 && (
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500 }}>
              {statusFilter === 'pago' ? (
                <>
                  {selectedIds.size} título(s) para estorno • Total:{' '}
                  <strong className="tabular-nums" style={{ color: 'var(--status-danger)' }}>
                    {formatCurrency(filteredTitulos.filter((t) => selectedIds.has(t.codigo)).reduce((s, t) => s + (t.valorPago || t.valor), 0))}
                  </strong>
                </>
              ) : (
                <>
                  {selectedIds.size} selecionado(s) • Subtotal:{' '}
                  <strong className="tabular-nums">
                    {formatCurrency(filteredTitulos.filter((t) => selectedIds.has(t.codigo)).reduce((s, t) => s + (t.valorAtual || t.valor), 0))}
                  </strong>
                </>
              )}
            </span>
          )}
        </div>

        {/* Filtros por Pílulas de Status */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              type="button"
              onClick={() => handleStatusFilterChange('aberto')}
              style={{
                padding: '3px 10px',
                fontSize: '11px',
                borderRadius: 'var(--radius-xs)',
                border: '1px solid var(--border-subtle)',
                backgroundColor: statusFilter === 'aberto' ? 'var(--domain-comercial)' : 'var(--surface-2)',
                color: statusFilter === 'aberto' ? '#fff' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Em Aberto ({activeMode === 'pagar' ? financialTotals.qtdPagAberto : financialTotals.qtdRecAberto})
            </button>
            <button
              type="button"
              onClick={() => handleStatusFilterChange('vencido')}
              style={{
                padding: '3px 10px',
                fontSize: '11px',
                borderRadius: 'var(--radius-xs)',
                border: '1px solid var(--border-subtle)',
                backgroundColor: statusFilter === 'vencido' ? 'var(--status-danger)' : 'var(--surface-2)',
                color: statusFilter === 'vencido' ? '#fff' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Vencidos ({activeMode === 'pagar' ? financialTotals.qtdPagVencido : financialTotals.qtdRecVencido})
            </button>
            <button
              type="button"
              onClick={() => handleStatusFilterChange('pago')}
              style={{
                padding: '3px 10px',
                fontSize: '11px',
                borderRadius: 'var(--radius-xs)',
                border: '1px solid var(--border-subtle)',
                backgroundColor: statusFilter === 'pago' ? 'var(--status-success)' : 'var(--surface-2)',
                color: statusFilter === 'pago' ? '#fff' : 'var(--status-success)',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Quitados ({activeMode === 'pagar' ? financialTotals.qtdPagQuitado : financialTotals.qtdRecQuitado})
            </button>
            <button
              type="button"
              onClick={() => handleStatusFilterChange('todos')}
              style={{
                padding: '3px 10px',
                fontSize: '11px',
                borderRadius: 'var(--radius-xs)',
                border: '1px solid var(--border-subtle)',
                backgroundColor: statusFilter === 'todos' ? 'var(--text-primary)' : 'var(--surface-2)',
                color: statusFilter === 'todos' ? 'var(--surface-1)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Todos os Títulos ({filteredTitulos.length})
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={() => setIsConfigColunasOpen(true)}
              title="Abrir painel para organizar ordem das colunas"
              className="coliseu-btn coliseu-btn--ghost coliseu-btn--xs"
              style={{
                fontSize: '10px',
                height: '24px',
                padding: '0 8px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                backgroundColor: 'var(--surface-2)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-xs)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              <Settings2 size={11} color="var(--action-primary)" />
              <span>Organizar Colunas</span>
            </button>
            <button
              type="button"
              onClick={handleResetColumns}
              title="Restaurar a ordem padrão original das colunas"
              className="coliseu-btn coliseu-btn--ghost coliseu-btn--xs"
              style={{
                fontSize: '10px',
                height: '24px',
                padding: '0 8px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                backgroundColor: 'var(--surface-2)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-xs)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              <RotateCcw size={11} />
              <span>Restaurar Padrão</span>
            </button>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '4px' }}>
              Exibindo <strong>{filteredTitulos.length}</strong> lançamentos
            </span>
          </div>
        </div>

        {/* Tabela de Títulos com Multi-Seleção, Reordenação de Colunas por Drag & Drop e Ficha/Log */}
        <div className="coliseu-table-container" style={{ minHeight: '380px', overflowY: 'auto' }}>
          <table className="coliseu-table">
            <thead>
              <tr>
                <th style={{ width: '35px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={filteredTitulos.length > 0 && filteredTitulos.every((t) => selectedIds.has(t.codigo))}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    style={{ cursor: 'pointer', accentColor: statusFilter === 'pago' ? 'var(--status-danger)' : 'var(--action-primary)' }}
                  />
                </th>
                {columns.map((col, idx) => renderSortHeader(col, idx))}
              </tr>
            </thead>
            <tbody>
              {filteredTitulos.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    Nenhum título encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredTitulos
                  .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                  .map((t, idx) => {
                    const isPago = !t.isAberto || t.status === 'Pago';
                    const isSelected = selectedIds.has(t.codigo);
                    return (
                      <tr
                        key={`${t.id}-${idx}`}
                        style={{
                          backgroundColor: isSelected
                            ? 'var(--surface-selected)'
                            : isPago
                            ? 'rgba(16, 185, 129, 0.03)'
                            : t.isVencido
                            ? 'rgba(239, 68, 68, 0.04)'
                            : undefined,
                        }}
                      >
                        <td style={{ textAlign: 'center', width: '35px' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(t.codigo)}
                            style={{ cursor: 'pointer', accentColor: isPago ? 'var(--status-danger)' : 'var(--action-primary)' }}
                          />
                        </td>
                        {columns.map((col) => renderCell(col.id, t, isPago, isSelected))}
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação da Tabela */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--text-muted)', paddingTop: '8px' }}>
          <div>
            Mostrando {filteredTitulos.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} a{' '}
            {Math.min(currentPage * pageSize, filteredTitulos.length)} de {filteredTitulos.length} títulos
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft size={14} /> Anterior
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(Math.ceil(filteredTitulos.length / pageSize), p + 1))}
              disabled={currentPage * pageSize >= filteredTitulos.length}
            >
              Próximo <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      </div>

      {/* Insight IA de Fluxo de Caixa */}
      <AIInsight
        title="Análise Preditiva de Fluxo de Caixa"
        message={`Previsão consolidada de entradas em ${formatCurrency(financialTotals.recAberto)} contra compromissos de ${formatCurrency(financialTotals.pagAberto)}. Projeção de liquidez estável com saldo projetado positivo de ${formatCurrency(financialTotals.saldoProjetado)}.`}
      />

      {/* Modal de Liquidação / Pagamento em Lote */}
      <TitulosLiquidarModal
        isOpen={isLiquidarOpen}
        onClose={() => setIsLiquidarOpen(false)}
        titulos={selectedTitulosList}
        clienteNome={selectedTitulosList.length === 1 ? titulos.find((t) => t.codigo === selectedTitulosList[0].codigo)?.clienteFornecedor || 'PARCEIRO' : 'VÁRIOS PARCEIROS'}
        totalCliente={totalSelecionado}
        initialSelectedIds={selectedIds}
        onConfirmarLiquidacao={handleConfirmarLiquidacao}
        onConfirmarRenegociacao={(config: any) => {
          setIsLiquidarOpen(false);
          setSelectedIds(new Set());
          showToast(`Acordo de renegociação em ${config.numParcelas} parcelas via ${config.especieNovasParcelas} gerado com sucesso!`);
        }}
      />

      {/* Modal de Recibo Imprimível */}
      <ReciboQuitacaoModal
        isOpen={isReciboOpen}
        onClose={() => setIsReciboOpen(false)}
        recibo={reciboData}
      />

      {/* Modal de Detalhes e Log de Liquidação */}
      <TituloDetalhesModal
        isOpen={isTituloDetalhesOpen}
        onClose={() => setIsTituloDetalhesOpen(false)}
        titulo={selectedTituloDetalhes}
        onReemitirRecibo={handleReemitirRecibo}
        onEstornarTitulo={(cod) => {
          setIsTituloDetalhesOpen(false);
          setSelectedIds(new Set([cod]));
          setTimeout(() => handleEstornarQuitacao(), 100);
        }}
      />

      {/* Modal de Configuração de Colunas */}
      <ConfigurarColunasModal
        isOpen={isConfigColunasOpen}
        onClose={() => setIsConfigColunasOpen(false)}
        columns={columns}
        onSaveColumns={handleSaveConfigColumns}
        onResetColumns={handleResetColumns}
      />

      {/* Modal de Novo Lançamento Manual */}
      {isNovoLancamentoOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 'var(--z-modal)',
            backgroundColor: 'var(--surface-overlay-heavy)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            className="coliseu-card"
            style={{
              width: '100%',
              maxWidth: '540px',
              backgroundColor: 'var(--surface-1)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              padding: 'var(--spacing-4)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--spacing-3)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Novo Lançamento Financeiro
              </h3>
              <button onClick={() => setIsNovoLancamentoOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSalvarLancamento} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setNovoTipo('receber')}
                  style={{
                    flex: 1,
                    height: '38px',
                    borderRadius: 'var(--radius-xs)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: novoTipo === 'receber' ? 'var(--status-success-bg)' : 'var(--surface-2)',
                    color: novoTipo === 'receber' ? 'var(--status-success)' : 'var(--text-secondary)',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <ArrowDownLeft size={14} style={{ display: 'inline', marginRight: '4px' }} /> A Receber
                </button>
                <button
                  type="button"
                  onClick={() => setNovoTipo('pagar')}
                  style={{
                    flex: 1,
                    height: '38px',
                    borderRadius: 'var(--radius-xs)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: novoTipo === 'pagar' ? 'var(--status-danger-bg)' : 'var(--surface-2)',
                    color: novoTipo === 'pagar' ? 'var(--status-danger)' : 'var(--text-secondary)',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <ArrowUpRight size={14} style={{ display: 'inline', marginRight: '4px' }} /> A Pagar
                </button>
              </div>

              <div>
                <label className="coliseu-label">Título / Descrição *</label>
                <Input
                  placeholder="Ex: DUPLICATA NF 1055 OU ALUGUEL"
                  value={novoTitulo}
                  onChange={(e) => setNovoTitulo(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="coliseu-label">Cliente / Fornecedor / Favorecido *</label>
                <Input
                  placeholder="Ex: RAZÃO SOCIAL OU NOME DO FORNECEDOR"
                  value={novoCliente}
                  onChange={(e) => setNovoCliente(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="coliseu-label">Valor (R$) *</label>
                  <Input
                    placeholder="0,00"
                    value={novoValor}
                    onChange={(e) => setNovoValor(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="coliseu-label">Data de Vencimento *</label>
                  <input
                    type="date"
                    className="coliseu-input"
                    value={novoVencimento}
                    onChange={(e) => setNovoVencimento(e.target.value)}
                    style={{ height: '38px', width: '100%' }}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="coliseu-label">Categoria</label>
                  <select
                    className="coliseu-input"
                    value={novaCategoria}
                    onChange={(e) => setNovaCategoria(e.target.value)}
                    style={{ height: '38px', width: '100%' }}
                  >
                    <option value="Venda de Mercadorias">Venda de Mercadorias</option>
                    <option value="Fornecedores Matéria-Prima">Fornecedores Matéria-Prima</option>
                    <option value="Despesas Operacionais">Despesas Operacionais</option>
                    <option value="Instalações & Aluguéis">Instalações & Aluguéis</option>
                    <option value="Serviços Profissionais">Serviços Profissionais</option>
                  </select>
                </div>
                <div>
                  <label className="coliseu-label">Espécie / Forma</label>
                  <select
                    className="coliseu-input"
                    value={novaFormaPagto}
                    onChange={(e) => setNovaFormaPagto(e.target.value)}
                    style={{ height: '38px', width: '100%' }}
                  >
                    <option value="Boleto Bancário">Boleto Bancário</option>
                    <option value="PIX">PIX</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Cartão de Débito">Cartão de Débito</option>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <Button variant="secondary" type="button" onClick={() => setIsNovoLancamentoOpen(false)}>
                  Cancelar
                </Button>
                <Button variant="primary" type="submit">
                  ✓ Salvar Lançamento
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

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
