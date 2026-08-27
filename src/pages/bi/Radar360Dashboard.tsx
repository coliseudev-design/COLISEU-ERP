import { useOutletContext, useSearchParams, useNavigate } from 'react-router-dom';
import { useBiPeriodQuery } from '../../hooks/useBiPeriodQuery';
import { BIService } from '../../services/biApi';
import { BiPeriodFilter } from '../../types/bi.types';
import { useState, useEffect } from 'react';
import { 
  User, 
  Calendar, 
  Loader2, 
  Fingerprint, 
  ArrowLeft, 
  Search, 
  MapPin, 
  Phone, 
  Mail, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  BarChart3, 
  Users, 
  ClipboardCheck, 
  Package, 
  Bookmark, 
  ShieldAlert, 
  ChevronRight 
} from 'lucide-react';
import clsx from 'clsx';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts';

// CommandCenter (Busca Preditiva Flutuante)
import { CommandCenter } from '../../components/bi/Radar360/CommandCenter';

export default function Radar360Dashboard() {
  const { filter } = useOutletContext<{ filter: BiPeriodFilter }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const urlId = searchParams.get('id');
  const [customerId, setCustomerId] = useState<number | null>(
    urlId ? parseInt(urlId, 10) : null
  );

  const [selectedPeriod, setSelectedPeriod] = useState<'TODOS' | 'MES_ATUAL' | '6_MESES' | 'PERSONALIZADO'>('TODOS');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Orders table state
  const [orderSearch, setOrderSearch] = useState('');
  const [orderDateFrom, setOrderDateFrom] = useState('');
  const [orderDateTo, setOrderDateTo] = useState('');
  const [orderPage, setOrderPage] = useState(1);
  const ORDER_PAGE_SIZE = 30;

  useEffect(() => {
    if (urlId) {
      setCustomerId(parseInt(urlId, 10));
    } else {
      setCustomerId(null);
    }
  }, [urlId]);

  const { data, isLoading, isError } = useBiPeriodQuery(
    ['bi', 'radar360', customerId],
    () => customerId ? BIService.getRadar360(customerId, filter) : Promise.resolve(null),
    filter,
    { enabled: !!customerId }
  );

  const handleSelectCustomer = (id: number) => {
    setSearchParams({ id: id.toString() });
  };

  const handleClearCustomer = () => {
    setSearchParams({});
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const formatNum = (val: number) => new Intl.NumberFormat('pt-BR').format(val);

  // Render da tela antes da seleção do cliente (Imagem 1)
  if (!customerId) {
    return (
      <div aria-label="Radar 360 Dashboard Inicial" className="space-y-8 animate-in fade-in duration-500 relative min-h-[85vh] flex flex-col justify-center items-center pb-12">
        {/* Background gradients for Glassmorphism effect */}
        <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
          <div className="absolute top-[15%] left-[20%] w-[35%] h-[35%] rounded-full bg-brand-500/5 blur-[120px]"></div>
          <div className="absolute bottom-[20%] right-[15%] w-[40%] h-[40%] rounded-full bg-cyan-500/5 blur-[150px]"></div>
        </div>

        <div className="w-full max-w-2xl text-center space-y-3 mb-6 animate-in slide-in-from-top-6 duration-300">
          <h1 className="text-4xl font-extrabold tracking-tight text-text-primary flex items-center justify-center gap-3">
            <span className="text-brand-500">⚡</span> Radar 360
          </h1>
          <p className="text-sm text-text-secondary font-medium">
            Busque um cliente para ativar a Interface Antecipatória
          </p>
        </div>

        {/* CommandCenter no centro */}
        <div className="w-full max-w-2xl px-4 z-50 animate-in zoom-in-95 duration-200">
          <CommandCenter onSelectCustomer={handleSelectCustomer} />
        </div>

        {/* Card do Fingerprint */}
        <div className="w-full max-w-4xl px-4 mt-8 animate-in slide-in-from-bottom-8 duration-300">
          <div className="bg-bg-primary border border-divider shadow-card rounded-3xl p-10 flex flex-col items-center justify-center text-center space-y-4">
            <div className="relative group cursor-pointer p-6 bg-brand-500/5 rounded-full border border-brand-500/10 hover:border-brand-500/20 transition-all duration-300">
              <Fingerprint size={68} className="text-brand-500 animate-pulse" />
              <div className="absolute inset-0 rounded-full bg-brand-500/10 blur opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
            <div className="space-y-1.5 max-w-md">
              <h3 className="text-base font-bold text-text-primary">Ficha de Cliente Antecipatória</h3>
              <p className="text-xs text-text-secondary leading-relaxed font-medium">
                Pesquise e selecione um cliente na barra superior para acessar a inteligência de compras e comportamento comercial.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render do loading (DNA Extractor)
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-brand-500 space-y-4">
        <Loader2 size={54} className="animate-spin text-brand-500" />
        <div className="text-center space-y-1">
          <p className="text-text-primary text-sm font-black uppercase tracking-widest animate-pulse">Extraindo DNA do Cliente...</p>
          <p className="text-xs text-text-secondary">Processando histórico e inteligência comercial...</p>
        </div>
      </div>
    );
  }

  // Render de erro
  if (isError || !data) {
    return (
      <div className="p-8 max-w-md mx-auto text-center space-y-4 animate-in zoom-in-95">
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl flex flex-col items-center gap-2">
          <AlertCircle size={32} />
          <h3 className="font-bold text-sm">Falha na Requisição</h3>
          <p className="text-xs text-text-secondary leading-relaxed">Não foi possível carregar os dados analíticos do cliente. Por favor, tente novamente.</p>
        </div>
        <button
          onClick={handleClearCustomer}
          className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md inline-flex items-center gap-2"
        >
          <ArrowLeft size={14} /> Voltar à busca
        </button>
      </div>
    );
  }

  const { dna, behavior, rfm, affinity, upsell, top_lists, risk_assessment, order_history } = (data || {}) as any;

  return (
    <div aria-label="Radar 360 Dashboard Detalhado" className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Background gradients for Glassmorphism effect */}
      <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
        <div className="absolute top-[10%] left-[-5%] w-[35%] h-[35%] rounded-full bg-brand-500/5 blur-[120px]"></div>
        <div className="absolute bottom-[-5%] right-[-5%] w-[40%] h-[40%] rounded-full bg-cyan-500/5 blur-[150px]"></div>
      </div>

      {/* HEADER DE NAVEGAÇÃO E BUSCA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-divider/10 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={handleClearCustomer}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-secondary hover:bg-bg-tertiary border border-divider text-text-primary text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm"
          >
            <ArrowLeft size={14} /> Voltar
          </button>
          <div>
            <h2 className="text-xl font-extrabold text-text-primary tracking-tight flex items-center gap-2">
              <span className="text-brand-500">⚡</span> Radar 360
            </h2>
            <p className="text-[10px] text-text-secondary/70 font-bold uppercase tracking-wider">Interface Antecipatória de Cliente</p>
          </div>
        </div>

        {/* Seletor flutuante de busca de outro cliente */}
        <div className="w-full md:w-80 z-40">
          <CommandCenter onSelectCustomer={handleSelectCustomer} />
        </div>
      </div>

      {/* CARD DO PERFIL DO CLIENTE */}
      <div className="bg-bg-primary border border-divider shadow-card rounded-3xl p-6 space-y-6 relative overflow-hidden animate-in slide-in-from-top-4 duration-300">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-500 to-cyan-500"></div>
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-brand-500 text-white rounded-full flex items-center justify-center font-bold text-xl shrink-0 shadow-md">
              {dna.nome?.substring(0, 1).toUpperCase()}
            </div>
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-black text-text-primary tracking-tight truncate max-w-[280px] sm:max-w-md">{dna.nome}</h2>
                <span className={clsx(
                  "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider",
                  dna.status === 'ATIVO' ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                )}>
                  {dna.status}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-text-secondary flex-wrap">
                <span className="font-mono">{dna.documento}</span>
                <span className="flex items-center gap-1">
                  <Calendar size={13} className="text-brand-500" />
                  Cliente desde {dna.data_cadastro ? new Date(dna.data_cadastro).toLocaleDateString('pt-BR') : '—'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap lg:flex-nowrap">
            {/* Bloco Tempo de Cliente */}
            <div className="bg-bg-secondary/50 border border-divider/10 rounded-2xl px-5 py-3 text-center shrink-0">
              <span className="text-[9px] font-black text-text-secondary/70 uppercase tracking-widest block mb-0.5">Tempo de Cliente</span>
              <span className="text-sm font-bold text-text-primary flex items-center gap-1.5 justify-center">
                <User size={13} className="text-brand-500" />
                {dna.tempo_cliente || '—'}
              </span>
            </div>

            {/* Bloco Churn/Dias Sem Compras */}
            <div className="bg-red-500/5 border border-red-500/10 rounded-2xl px-6 py-3 flex items-center gap-4 shrink-0">
              <div className="text-right">
                <span className="text-[9px] font-black text-red-500/70 uppercase tracking-widest block mb-0.5">Dias Sem Comprar</span>
                <span className="text-xs text-text-secondary block font-bold">
                  Última Compra: <span className="text-red-500/90 font-mono font-bold">{dna.ultima_compra ? new Date(dna.ultima_compra).toLocaleDateString('pt-BR') : 'N/A'}</span>
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-3xl font-black text-red-500 font-mono leading-none">{dna.dias_sem_comprar}</span>
                <AlertCircle size={16} className="text-red-500 shrink-0" />
              </div>
            </div>
          </div>
        </div>

        {/* CONTATOS DO CLIENTE */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-divider/10 text-xs">
          <div className="flex items-center gap-2 text-text-secondary">
            <div className="p-2 bg-bg-secondary rounded-lg text-brand-500 border border-divider/10">
              <MapPin size={14} />
            </div>
            <div className="min-w-0">
              <span className="block text-[9px] font-black uppercase text-text-secondary/60">Localidade</span>
              <span className="font-bold text-text-primary uppercase truncate block">{dna.cidade || '—'}/{dna.estado || '—'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-text-secondary">
            <div className="p-2 bg-bg-secondary rounded-lg text-brand-500 border border-divider/10">
              <Phone size={14} />
            </div>
            <div className="min-w-0">
              <span className="block text-[9px] font-black uppercase text-text-secondary/60">Celular</span>
              <span className="font-bold text-text-primary truncate block font-mono">{dna.telefone || '—'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-text-secondary">
            <div className="p-2 bg-bg-secondary rounded-lg text-brand-500 border border-divider/10">
              <Mail size={14} />
            </div>
            <div className="min-w-0">
              <span className="block text-[9px] font-black uppercase text-text-secondary/60">E-mail</span>
              <span className="font-bold text-text-primary truncate block">{dna.email || '—'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* SELETOR DE PERÍODO */}
      <div className="bg-bg-primary border border-divider rounded-2xl p-4 flex flex-wrap gap-4 items-center justify-between shadow-card">
        <div className="flex items-center gap-1 bg-bg-secondary p-1 rounded-xl border border-divider/10">
          {(['TODOS', 'MES_ATUAL', '6_MESES', 'PERSONALIZADO'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setSelectedPeriod(p)}
              className={clsx(
                "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer",
                selectedPeriod === p 
                  ? "bg-brand-500 text-white shadow-sm" 
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-tertiary"
              )}
            >
              {p === 'TODOS' ? 'Todos' : p === 'MES_ATUAL' ? 'Mês Atual' : p === '6_MESES' ? '6 Meses' : 'Personalizado'}
            </button>
          ))}
        </div>

        {selectedPeriod === 'PERSONALIZADO' && (
          <div className="flex items-center gap-2 text-[10px] font-bold text-text-secondary">
            <div className="flex items-center gap-1.5">
              <span>DE:</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-bg-secondary border border-divider text-text-primary rounded-lg px-2 py-1 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span>ATÉ:</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-bg-secondary border border-divider text-text-primary rounded-lg px-2 py-1 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* BENTO GRID DE INTELIGÊNCIA COMERCIAL (4 COLUNAS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card 1: Vendedor e Wallet Share */}
        <div className="bg-bg-primary border border-divider shadow-card rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <span className="text-[10px] font-black text-text-secondary/70 uppercase tracking-widest block pl-1">Mais Vendas (Faturamento)</span>
            <div className="space-y-2">
              <span className="text-[9px] font-bold text-text-secondary/50 uppercase tracking-wider block pl-1">Participação</span>
              <div className="space-y-2">
                {affinity.vendedores?.slice(0, 2).map((s: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between text-xs p-1.5 bg-bg-secondary/40 rounded-xl border border-divider/10">
                    <span className="font-bold text-text-primary flex items-center gap-1.5 truncate max-w-[120px]">
                      <span className="w-5 h-5 rounded-full bg-brand-500/10 text-brand-500 flex items-center justify-center font-bold text-[9px] shrink-0">
                        {s.nome?.substring(0, 2).toUpperCase()}
                      </span>
                      <span className="truncate">{s.nome}</span>
                    </span>
                    <span className="font-mono font-black text-brand-500 shrink-0">{s.pct.toFixed(0)}%</span>
                  </div>
                ))}
                {(!affinity.vendedores || affinity.vendedores.length === 0) && (
                  <span className="text-[11px] text-text-secondary/70 block italic pl-1">Sem histórico</span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2 border-t border-divider/10 pt-3">
            <span className="text-[9px] font-bold text-text-secondary/50 uppercase tracking-wider block pl-1">Vinculados no Cadastro</span>
            <div className="flex flex-wrap gap-1.5">
              {affinity.vendedores?.slice(0, 3).map((s: any, idx: number) => (
                <span key={idx} className="px-2 py-1 bg-bg-secondary text-text-primary text-[10px] font-bold rounded-lg border border-divider/10 truncate max-w-[150px]">
                  {s.nome}
                </span>
              ))}
              {(!affinity.vendedores || affinity.vendedores.length === 0) && (
                <span className="text-[11px] text-text-secondary/70 italic pl-1">Nenhum</span>
              )}
            </div>
          </div>
        </div>

        {/* Card 2: Score RFM */}
        <div className="bg-bg-primary border border-divider shadow-card rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black text-text-secondary/70 uppercase tracking-widest pl-1">Score RFM</span>
              <span className={clsx(
                "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider",
                rfm.recencia <= 2 ? "bg-orange-500/10 text-orange-500" : "bg-emerald-500/10 text-emerald-500"
              )}>
                {rfm.recencia <= 2 ? 'Em Risco' : 'Saudável'}
              </span>
            </div>

            <div className="flex items-baseline gap-2 pl-1 mb-4">
              <span className="text-3xl font-black text-text-primary font-mono">{rfm.recencia}{rfm.frequencia}{rfm.monetario}</span>
              <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Classificação</span>
            </div>

            <div className="space-y-2.5">
              {/* Recência */}
              <div>
                <div className="flex justify-between text-[10px] font-black uppercase text-text-secondary/80">
                  <span>Recência (Última Compra)</span>
                  <span className="font-mono text-text-primary font-black">{rfm.recencia}/5</span>
                </div>
                <div className="w-full bg-bg-secondary h-1.5 rounded-full mt-1 overflow-hidden border border-divider/10">
                  <div className="bg-brand-500 h-full rounded-full transition-all duration-500" style={{ width: `${(rfm.recencia / 5) * 100}%` }}></div>
                </div>
              </div>

              {/* Frequência */}
              <div>
                <div className="flex justify-between text-[10px] font-black uppercase text-text-secondary/80">
                  <span>Frequência (Total Compras)</span>
                  <span className="font-mono text-text-primary font-black">{rfm.frequencia}/5</span>
                </div>
                <div className="w-full bg-bg-secondary h-1.5 rounded-full mt-1 overflow-hidden border border-divider/10">
                  <div className="bg-brand-500 h-full rounded-full transition-all duration-500" style={{ width: `${(rfm.frequencia / 5) * 100}%` }}></div>
                </div>
              </div>

              {/* Monetário */}
              <div>
                <div className="flex justify-between text-[10px] font-black uppercase text-text-secondary/80">
                  <span>Monetário (Total Gasto)</span>
                  <span className="font-mono text-text-primary font-black">{rfm.monetario}/5</span>
                </div>
                <div className="w-full bg-bg-secondary h-1.5 rounded-full mt-1 overflow-hidden border border-divider/10">
                  <div className="bg-brand-500 h-full rounded-full transition-all duration-500" style={{ width: `${(rfm.monetario / 5) * 100}%` }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Segmento & Potencial */}
        <div className="bg-bg-primary border border-divider shadow-card rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <span className="text-[10px] font-black text-text-secondary/70 uppercase tracking-widest block pl-1">Segmento & Potencial</span>
            
            <div className="space-y-2 text-xs font-bold pl-1">
              <div className="flex items-center justify-between">
                <span className="text-text-secondary/80">vs Média Segmento</span>
                <span className="text-emerald-500">+15% Acima</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-secondary/80">Frequência Compra</span>
                <span className="text-text-primary">A cada {behavior.frequencia_dias || 25} dias</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-secondary/80">Faturamento Em</span>
                <span className="text-text-primary font-mono">{formatCurrency(dna.ltv)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 border-t border-divider/10 pt-3">
            <span className="text-[9px] font-bold text-text-secondary/50 uppercase tracking-wider block pl-1">Upsell Oportunidades</span>
            <div className="flex flex-wrap gap-1.5">
              {upsell.oportunidades?.map((op: string, idx: number) => (
                <span key={idx} className="px-2 py-0.5 bg-brand-500/5 text-brand-500 text-[9px] font-black uppercase rounded-lg border border-brand-500/10">
                  {op}
                </span>
              ))}
              {(!upsell.oportunidades || upsell.oportunidades.length === 0) && (
                <span className="text-[10px] text-text-secondary/60 italic pl-1 block">Nenhuma oportunidade</span>
              )}
            </div>
          </div>
        </div>

        {/* Card 4: Risco */}
        <div className="bg-bg-primary border border-divider shadow-card rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <span className="text-[10px] font-black text-text-secondary/70 uppercase tracking-widest block pl-1">Risco</span>
            
            <div className="flex items-baseline gap-2 pl-1">
              <span className={clsx(
                "text-4xl font-extrabold font-mono leading-none",
                dna.dias_sem_comprar > 90 ? "text-red-500" : "text-emerald-500"
              )}>
                {risk_assessment.risco_churn_pct}%
              </span>
              <span className="text-[9px] font-black uppercase tracking-wider text-red-500">Alerta</span>
            </div>
            
            <p className="text-[11px] text-text-secondary font-bold pl-1">
              {dna.dias_sem_comprar > 90 ? 'Sem compras há mais de 90 dias' : 'Saúde de compras regular'}
            </p>
          </div>

          <div className="space-y-2 border-t border-divider/10 pt-3">
            <span className="text-[9px] font-bold text-text-secondary/50 uppercase tracking-wider block pl-1">Ações Recomendadas</span>
            <div className="space-y-1.5 pl-1">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-text-primary">
                <span className="text-red-500">•</span>
                Contato imediato
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-text-primary">
                <span className="text-orange-500">•</span>
                Oferecer desconto
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* KPI BOXES HISTÓRICOS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Box 1: Faturamento Vitalício */}
        <div className="bg-bg-primary border border-divider shadow-card rounded-2xl p-5 flex items-center gap-4">
          <div className="p-3 bg-brand-500/10 text-brand-500 rounded-2xl border border-brand-500/10">
            <DollarSign size={20} />
          </div>
          <div>
            <span className="text-[9px] font-black text-text-secondary/70 uppercase tracking-widest block mb-0.5">Faturamento Vitalício (LTV)</span>
            <span className="text-lg font-black text-text-primary block font-mono leading-tight">{formatCurrency(dna.ltv)}</span>
            <span className="text-[9px] text-text-secondary font-bold">Faturamento total acumulado na empresa</span>
          </div>
        </div>

        {/* Box 2: Ticket Médio Histórico */}
        <div className="bg-bg-primary border border-divider shadow-card rounded-2xl p-5 flex items-center gap-4">
          <div className="p-3 bg-cyan-500/10 text-cyan-500 rounded-2xl border border-cyan-500/10">
            <TrendingUp size={20} />
          </div>
          <div>
            <span className="text-[9px] font-black text-text-secondary/70 uppercase tracking-widest block mb-0.5">Ticket Médio Histórico</span>
            <span className="text-lg font-black text-text-primary block font-mono leading-tight">{formatCurrency(behavior.ticket_medio_historico)}</span>
            <span className="text-[9px] text-text-secondary font-bold">Média de valor faturado por pedido</span>
          </div>
        </div>

        {/* Box 3: Compras Totais */}
        <div className="bg-bg-primary border border-divider shadow-card rounded-2xl p-5 flex items-center gap-4">
          <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-2xl border border-indigo-500/10">
            <Package size={20} />
          </div>
          <div>
            <span className="text-[9px] font-black text-text-secondary/70 uppercase tracking-widest block mb-0.5">Compras Totais</span>
            <span className="text-lg font-black text-text-primary block font-mono leading-tight">{dna.qtd_pedidos || 0} compras</span>
            <span className="text-[9px] text-text-secondary font-bold">Faturamento de pedidos realizados</span>
          </div>
        </div>

      </div>

      {/* SAZONALIDADE DE COMPRAS (MENSAL) — Recharts */}
      <div className="bg-bg-primary border border-divider shadow-card rounded-3xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-divider/10 pb-4">
          <h3 className="text-sm font-black text-text-primary uppercase tracking-wider flex items-center gap-2">
            <BarChart3 size={16} className="text-brand-500" />
            Sazonalidade de Compras (Distribuição Mensal)
          </h3>
          <div className="flex items-center gap-4 text-xs font-bold text-text-secondary flex-wrap">
            <span>Mês com Maior Volume: <span className="text-emerald-500 font-extrabold">{behavior.mes_maior_volume}</span></span>
            <span>Mês com Menor Volume: <span className="text-red-500 font-extrabold">{behavior.mes_menor_volume}</span></span>
          </div>
        </div>

        {/* Recharts BarChart — substitui o gráfico customizado instável */}
        <div className="w-full" style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={behavior.sazonalidade || []}
              margin={{ top: 10, right: 8, left: 0, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.3} />
              <XAxis
                dataKey="mes"
                tick={{ fontSize: 10, fill: 'var(--color-text-muted)', fontWeight: 700 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={(v: number) =>
                  v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` :
                  v >= 1_000 ? `${(v / 1_000).toFixed(0)}K` : String(v)
                }
                tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }}
                tickLine={false}
                axisLine={false}
                width={48}
              />
              <Tooltip
                formatter={(value: any) => [formatCurrency(Number(value) || 0), 'Faturamento'] as any}
                cursor={{ fill: 'rgba(99,102,241,0.06)', radius: 6 } as any}
                contentStyle={{
                  background: 'rgba(15,23,42,0.92)',
                  border: '1px solid rgba(99,102,241,0.3)',
                  borderRadius: 10,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#e2e8f0',
                  backdropFilter: 'blur(12px)',
                }}
                labelStyle={{ color: '#94a3b8', fontSize: 10, fontWeight: 700, marginBottom: 2 }}
              />
              <Bar dataKey="total" name="Faturamento" radius={[6, 6, 0, 0]} maxBarSize={36}>
                {((behavior as any)?.sazonalidade || []).map((entry: any, idx: number) => {
                  const maxVal = Math.max(...((behavior as any)?.sazonalidade || []).map((x: any) => x.total), 1);
                  const ratio = maxVal > 0 ? entry.total / maxVal : 0;
                  // Gradiente de cor: baixo = índigo apagado, alto = brand vibrante
                  const alpha = Math.round(80 + ratio * 175);
                  const hexAlpha = alpha.toString(16).padStart(2, '0');
                  const isMaior = entry.mes === (behavior as any)?.mes_maior_volume;
                  const isMenor = entry.mes === (behavior as any)?.mes_menor_volume;
                  const fill = isMaior ? '#10B981' : isMenor ? '#EF4444' : `#4F46E5${hexAlpha}`;
                  return <Cell key={idx} fill={fill} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legenda */}
        <div className="flex items-center gap-5 text-[10px] font-bold text-text-secondary flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-emerald-500" />
            Mês de maior volume
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ background: '#4F46E5' }} />
            Meses normais
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-red-500" />
            Mês de menor volume
          </div>
        </div>

        <span className="text-[9px] text-text-secondary/50 font-bold block text-center italic">
          * Distribuição cronológica acumulada de vendas — Janeiro a Dezembro (histórico completo).
        </span>
      </div>

      {/* TOP 5 LISTS (PRODUTOS, CATEGORIAS, MARCAS) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Top Produtos */}
        <div className="bg-bg-primary border border-divider shadow-card rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-divider/10 pb-2">
              <span className="text-[10px] font-black text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                <Package size={14} className="text-brand-500" /> Top Produtos
              </span>
              <span className="text-[9px] font-black uppercase text-brand-500">Participação</span>
            </div>
            
            <div className="space-y-3">
              {top_lists.produtos?.map((p: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded-lg bg-bg-secondary border border-divider/15 text-text-secondary font-mono font-bold flex items-center justify-center text-[10px] shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <span className="block font-bold text-text-primary truncate max-w-[150px] uppercase leading-tight">{p.nome}</span>
                      <span className="block text-[8.5px] text-text-secondary font-mono">Qtd: {formatNum(p.qtd)} • {formatCurrency(p.total)}</span>
                    </div>
                  </div>
                  <span className="font-mono font-black text-brand-500">{p.pct.toFixed(0)}%</span>
                </div>
              ))}
              {(!top_lists.produtos || top_lists.produtos.length === 0) && (
                <span className="text-xs text-text-secondary italic block py-4 text-center">Nenhum produto faturado.</span>
              )}
            </div>
          </div>
          
          <button className="w-full py-1.5 bg-bg-secondary hover:bg-bg-tertiary border border-divider/20 rounded-xl text-[9px] font-black uppercase tracking-wider text-text-secondary transition-all cursor-pointer">
            Ver Todos ({top_lists.produtos?.length || 0})
          </button>
        </div>

        {/* Top Grupos */}
        <div className="bg-bg-primary border border-divider shadow-card rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-divider/10 pb-2">
              <span className="text-[10px] font-black text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                <Users size={14} className="text-brand-500" /> Top Grupos
              </span>
              <span className="text-[9px] font-black uppercase text-brand-500">Participação</span>
            </div>

            <div className="space-y-3">
              {top_lists.grupos?.map((g: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded-lg bg-bg-secondary border border-divider/15 text-text-secondary font-mono font-bold flex items-center justify-center text-[10px] shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <span className="block font-bold text-text-primary truncate max-w-[150px] uppercase leading-tight">{g.nome}</span>
                      <span className="block text-[8.5px] text-text-secondary font-mono">Qtd: {formatNum(g.qtd)} • {formatCurrency(g.total)}</span>
                    </div>
                  </div>
                  <span className="font-mono font-black text-brand-500">{g.pct.toFixed(0)}%</span>
                </div>
              ))}
              {(!top_lists.grupos || top_lists.grupos.length === 0) && (
                <span className="text-xs text-text-secondary italic block py-4 text-center">Nenhum grupo faturado.</span>
              )}
            </div>
          </div>

          <button className="w-full py-1.5 bg-bg-secondary hover:bg-bg-tertiary border border-divider/20 rounded-xl text-[9px] font-black uppercase tracking-wider text-text-secondary transition-all cursor-pointer">
            Ver Todos ({top_lists.grupos?.length || 0})
          </button>
        </div>

        {/* Top Marcas */}
        <div className="bg-bg-primary border border-divider shadow-card rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-divider/10 pb-2">
              <span className="text-[10px] font-black text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                <Bookmark size={14} className="text-brand-500" /> Top Marcas
              </span>
              <span className="text-[9px] font-black uppercase text-brand-500">Participação</span>
            </div>

            <div className="space-y-3">
              {top_lists.marcas?.map((m: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded-lg bg-bg-secondary border border-divider/15 text-text-secondary font-mono font-bold flex items-center justify-center text-[10px] shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <span className="block font-bold text-text-primary truncate max-w-[150px] uppercase leading-tight">{m.nome}</span>
                      <span className="block text-[8.5px] text-text-secondary font-mono">Qtd: {formatNum(m.qtd)} • {formatCurrency(m.total)}</span>
                    </div>
                  </div>
                  <span className="font-mono font-black text-brand-500">{m.pct.toFixed(0)}%</span>
                </div>
              ))}
              {(!top_lists.marcas || top_lists.marcas.length === 0) && (
                <span className="text-xs text-text-secondary italic block py-4 text-center">Nenhuma marca faturada.</span>
              )}
            </div>
          </div>

          <button className="w-full py-1.5 bg-bg-secondary hover:bg-bg-tertiary border border-divider/20 rounded-xl text-[9px] font-black uppercase tracking-wider text-text-secondary transition-all cursor-pointer">
            Ver Todos ({top_lists.marcas?.length || 0})
          </button>
        </div>

      </div>

      {/* HISTÓRICO DE PEDIDOS COM BUSCA E PAGINAÇÃO */}
      {(() => {
        // Apply filters client-side
        const filteredOrders = (order_history || []).filter((order: any) => {
          const matchCode = !orderSearch || String(order.numero_nota).toLowerCase().includes(orderSearch.toLowerCase());
          let matchDate = true;
          if (orderDateFrom || orderDateTo) {
            // data_emissao is formatted as dd/mm/yyyy in pt-BR
            const parts = (order.data_emissao || '').split('/');
            const orderDate = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : '';
            if (orderDateFrom && orderDate < orderDateFrom) matchDate = false;
            if (orderDateTo && orderDate > orderDateTo) matchDate = false;
          }
          return matchCode && matchDate;
        });

        const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ORDER_PAGE_SIZE));
        const safePage = Math.min(orderPage, totalPages);
        const pageOrders = filteredOrders.slice((safePage - 1) * ORDER_PAGE_SIZE, safePage * ORDER_PAGE_SIZE);

        return (
          <div className="bg-bg-primary border border-divider shadow-card rounded-3xl overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-divider/10 flex items-center justify-between flex-wrap gap-3">
              <h3 className="text-sm font-black text-text-primary uppercase tracking-wider flex items-center gap-2">
                <Calendar size={16} className="text-brand-500" />
                Histórico de Pedidos
                <span className="text-[10px] font-bold text-text-secondary bg-bg-secondary px-2 py-0.5 rounded-lg border border-divider/20">
                  {filteredOrders.length} de {order_history?.length || 0}
                </span>
              </h3>
            </div>

            {/* Filtros de busca */}
            <div className="px-5 py-3 bg-bg-secondary/30 border-b border-divider/10 flex flex-wrap gap-3 items-center">
              {/* Busca por código */}
              <div className="flex items-center gap-2 flex-1 min-w-[180px] bg-bg-primary border border-divider rounded-xl px-3 py-2 shadow-sm">
                <Search size={13} className="text-text-secondary shrink-0" />
                <input
                  type="text"
                  placeholder="Buscar nº pedido..."
                  value={orderSearch}
                  onChange={e => { setOrderSearch(e.target.value); setOrderPage(1); }}
                  className="bg-transparent text-xs font-medium text-text-primary placeholder-text-secondary/50 outline-none w-full"
                />
                {orderSearch && (
                  <button onClick={() => { setOrderSearch(''); setOrderPage(1); }} className="text-text-secondary hover:text-text-primary transition-colors cursor-pointer">
                    ×
                  </button>
                )}
              </div>

              {/* Data De */}
              <div className="flex items-center gap-2 bg-bg-primary border border-divider rounded-xl px-3 py-2 shadow-sm">
                <Calendar size={13} className="text-text-secondary shrink-0" />
                <span className="text-[10px] font-black text-text-secondary uppercase tracking-wider">De:</span>
                <input
                  type="date"
                  value={orderDateFrom}
                  onChange={e => { setOrderDateFrom(e.target.value); setOrderPage(1); }}
                  className="bg-transparent text-xs font-medium text-text-primary outline-none cursor-pointer"
                />
              </div>

              {/* Data Até */}
              <div className="flex items-center gap-2 bg-bg-primary border border-divider rounded-xl px-3 py-2 shadow-sm">
                <Calendar size={13} className="text-text-secondary shrink-0" />
                <span className="text-[10px] font-black text-text-secondary uppercase tracking-wider">Até:</span>
                <input
                  type="date"
                  value={orderDateTo}
                  onChange={e => { setOrderDateTo(e.target.value); setOrderPage(1); }}
                  className="bg-transparent text-xs font-medium text-text-primary outline-none cursor-pointer"
                />
              </div>

              {/* Limpar filtros */}
              {(orderSearch || orderDateFrom || orderDateTo) && (
                <button
                  onClick={() => { setOrderSearch(''); setOrderDateFrom(''); setOrderDateTo(''); setOrderPage(1); }}
                  className="text-[10px] font-black text-text-secondary hover:text-red-500 uppercase tracking-wider transition-colors cursor-pointer px-2"
                >
                  Limpar
                </button>
              )}
            </div>

            {/* Tabela */}
            <div className="overflow-x-auto text-[11px] font-medium text-text-primary">
              <table className="w-full text-left">
                <thead className="bg-bg-secondary/40 text-[9px] text-text-secondary uppercase font-black tracking-wider border-b border-divider/10">
                  <tr>
                    <th className="px-6 py-3.5">Nº Pedido</th>
                    <th className="px-6 py-3.5">Vendedor</th>
                    <th className="px-6 py-3.5">Emissão</th>
                    <th className="px-6 py-3.5 text-right">Valor Total</th>
                    <th className="px-6 py-3.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-divider/10">
                  {pageOrders.map((order: any) => (
                    <tr key={order.id} className="hover:bg-bg-secondary/20 transition-colors">
                      <td className="px-6 py-3 font-mono font-bold text-brand-500">#{order.numero_nota}</td>
                      <td className="px-6 py-3 text-text-secondary">{order.vendedor_nome}</td>
                      <td className="px-6 py-3 text-text-secondary font-mono">{order.data_emissao}</td>
                      <td className="px-6 py-3 text-right font-mono font-bold text-text-primary">{formatCurrency(order.valor_total)}</td>
                      <td className="px-6 py-3 text-center">
                        <span className={clsx(
                          "px-2 py-0.5 text-[9px] font-black rounded-lg uppercase tracking-wider border",
                          (order.status === 'FATURADO' || order.status === 'FINALIZADO')
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                        )}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {pageOrders.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-text-secondary font-bold">
                        {filteredOrders.length === 0 && (orderSearch || orderDateFrom || orderDateTo)
                          ? 'Nenhum pedido encontrado para os filtros aplicados.'
                          : 'Nenhum pedido encontrado.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            {filteredOrders.length > ORDER_PAGE_SIZE && (
              <div className="p-4 border-t border-divider/10 flex items-center justify-between gap-4 flex-wrap">
                <span className="text-[10px] font-bold text-text-secondary">
                  Mostrando {(safePage - 1) * ORDER_PAGE_SIZE + 1}–{Math.min(safePage * ORDER_PAGE_SIZE, filteredOrders.length)} de {filteredOrders.length} pedidos
                </span>

                <div className="flex items-center gap-1.5">
                  {/* Primeira página */}
                  <button
                    disabled={safePage === 1}
                    onClick={() => setOrderPage(1)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg border border-divider text-[10px] font-black text-text-secondary hover:bg-bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    «
                  </button>

                  {/* Anterior */}
                  <button
                    disabled={safePage === 1}
                    onClick={() => setOrderPage(p => Math.max(1, p - 1))}
                    className="w-7 h-7 flex items-center justify-center rounded-lg border border-divider text-[10px] font-black text-text-secondary hover:bg-bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    ‹
                  </button>

                  {/* Pages */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 2)
                    .reduce((acc: (number | string)[], p, idx, arr) => {
                      if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push('...');
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, idx) =>
                      p === '...' ? (
                        <span key={`ellipsis-${idx}`} className="w-7 h-7 flex items-center justify-center text-[10px] text-text-secondary">…</span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => setOrderPage(p as number)}
                          className={clsx(
                            "w-7 h-7 flex items-center justify-center rounded-lg border text-[10px] font-black transition-all cursor-pointer",
                            safePage === p
                              ? "bg-brand-500 text-white border-brand-500 shadow-sm"
                              : "border-divider text-text-secondary hover:bg-bg-secondary"
                          )}
                        >
                          {p}
                        </button>
                      )
                    )
                  }

                  {/* Próxima */}
                  <button
                    disabled={safePage === totalPages}
                    onClick={() => setOrderPage(p => Math.min(totalPages, p + 1))}
                    className="w-7 h-7 flex items-center justify-center rounded-lg border border-divider text-[10px] font-black text-text-secondary hover:bg-bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    ›
                  </button>

                  {/* Última página */}
                  <button
                    disabled={safePage === totalPages}
                    onClick={() => setOrderPage(totalPages)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg border border-divider text-[10px] font-black text-text-secondary hover:bg-bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    »
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })()}

    </div>
  );
}
