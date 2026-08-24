import React, { useState, useMemo, useEffect } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { formatCurrency } from '../lib/formatters';
import {
  ClipboardCheck,
  Search,
  Barcode,
  MapPin,
  Filter,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Printer,
  RotateCcw,
  Layers,
  Save,
  Eye,
  EyeOff,
  SlidersHorizontal,
  FileSpreadsheet,
  X,
} from 'lucide-react';
import migratedProdutosData from '../data/migrated_produtos.json';
import { getCategorias, CategoriaItem } from '../lib/classificacoes';
import { getEnderecos, EnderecoItem } from '../lib/enderecos';

interface ItemBalanco {
  id: string;
  sku: string;
  codigoBarras: string;
  descricao: string;
  marca?: string;
  categoria?: string;
  localizacao: string;
  unidade: string;
  custoUnitario: number;
  saldoSistema: number;
  quantidadeContada: number | null; // null = ainda não contado
  divergencia: number;             // quantidadeContada - saldoSistema
  impactoFinanceiro: number;        // divergencia * custoUnitario
  status: 'PENDENTE' | 'CONFERIDO_OK' | 'DIVERGENCIA_SOBRA' | 'DIVERGENCIA_FALTA';
}

export const BalancoEstoquePage: React.FC = () => {
  const [busca, setBusca] = useState('');
  const [filtroLocalizacao, setFiltroLocalizacao] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'TODOS' | 'PENDENTES' | 'DIVERGENTES'>('TODOS');
  const [modoContagemCega, setModoContagemCega] = useState(true); // Oculta o saldo do sistema durante a contagem
  const [codigoBipado, setCodigoBipado] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isModalFinalizarOpen, setIsModalFinalizarOpen] = useState(false);

  const [enderecosList] = useState<EnderecoItem[]>(getEnderecos);
  const [categoriasList] = useState<CategoriaItem[]>(getCategorias);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Carregar produtos e gerar itens do balanço
  const [itensBalanco, setItensBalanco] = useState<ItemBalanco[]>(() => {
    try {
      const custom = localStorage.getItem('coliseu_custom_produtos');
      const customProds: any[] = custom ? JSON.parse(custom) : [];
      const base = Array.isArray(migratedProdutosData) ? (migratedProdutosData as any[]) : [];
      const todos = [...customProds, ...base];

      // Endereços rotativos default para demonstração WMS
      const locaisMock = [
        'DEPÓSITO - RUA A - PRATELEIRA 01',
        'DEPÓSITO - RUA A - PRATELEIRA 02',
        'DEPÓSITO - RUA B - PRATELEIRA 01',
        'LOJA - FRENTE - GÔNDOLA 01',
        'LOJA - MOSTRUÁRIO / VITRINE',
      ];

      return todos.slice(0, 100).map((p, idx) => {
        const saldo = typeof p.estoqueAtual === 'number' ? p.estoqueAtual : 10;
        const custo = p.precoCusto || 50;
        const local = p.localizacaoDeposito || locaisMock[idx % locaisMock.length];

        return {
          id: p.id || `PROD-${idx}`,
          sku: p.sku || p.codigo || String(idx + 1).padStart(5, '0'),
          codigoBarras: p.codigoBarras || p.sku || `78900000${idx}`,
          descricao: p.descricao,
          marca: p.marca || 'PPG / DELTRON',
          categoria: p.categoria || 'TINTAS & QUÍMICOS',
          localizacao: local,
          unidade: p.unidade || 'UN',
          custoUnitario: custo,
          saldoSistema: saldo,
          quantidadeContada: null,
          divergencia: 0,
          impactoFinanceiro: 0,
          status: 'PENDENTE',
        };
      });
    } catch {
      return [];
    }
  });

  // Atualiza contagem de um item
  const handleAtualizarContagem = (id: string, qtd: number | null) => {
    setItensBalanco((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          if (qtd === null || isNaN(qtd)) {
            return {
              ...item,
              quantidadeContada: null,
              divergencia: 0,
              impactoFinanceiro: 0,
              status: 'PENDENTE',
            };
          }

          const divergencia = qtd - item.saldoSistema;
          const impacto = divergencia * item.custoUnitario;
          let status: ItemBalanco['status'] = 'CONFERIDO_OK';
          if (divergencia > 0) status = 'DIVERGENCIA_SOBRA';
          if (divergencia < 0) status = 'DIVERGENCIA_FALTA';

          return {
            ...item,
            quantidadeContada: qtd,
            divergencia,
            impactoFinanceiro: impacto,
            status,
          };
        }
        return item;
      })
    );
  };

  // Suporte a leitor de código de barras (Bipagem contínua)
  const handleBiparCodigo = (e: React.FormEvent) => {
    e.preventDefault();
    const bip = codigoBipado.trim().toUpperCase();
    if (!bip) return;

    const index = itensBalanco.findIndex(
      (it) => it.sku.toUpperCase() === bip || it.codigoBarras.toUpperCase() === bip
    );

    if (index >= 0) {
      const item = itensBalanco[index];
      const novaQtd = (item.quantidadeContada === null ? 0 : item.quantidadeContada) + 1;
      handleAtualizarContagem(item.id, novaQtd);
      showToast(`📦 Item bipado: ${item.descricao} ➔ Qtd: ${novaQtd} ${item.unidade}`);
      setCodigoBipado('');
    } else {
      showToast(`⚠️ Produto com código/EAN '${bip}' não encontrado neste balanço.`);
    }
  };

  // Filtragem dos itens
  const itensFiltrados = useMemo(() => {
    return itensBalanco.filter((it) => {
      if (filtroLocalizacao && !it.localizacao.toUpperCase().includes(filtroLocalizacao.toUpperCase())) {
        return false;
      }
      if (filtroCategoria && it.categoria?.toUpperCase() !== filtroCategoria.toUpperCase()) {
        return false;
      }
      if (filtroStatus === 'PENDENTES' && it.status !== 'PENDENTE') return false;
      if (filtroStatus === 'DIVERGENTES' && it.status !== 'DIVERGENCIA_SOBRA' && it.status !== 'DIVERGENCIA_FALTA') {
        return false;
      }
      if (busca) {
        const q = busca.toLowerCase();
        const matchesDesc = it.descricao.toLowerCase().includes(q);
        const matchesSku = it.sku.toLowerCase().includes(q);
        const matchesEan = it.codigoBarras.toLowerCase().includes(q);
        const matchesLocal = it.localizacao.toLowerCase().includes(q);
        if (!matchesDesc && !matchesSku && !matchesEan && !matchesLocal) return false;
      }
      return true;
    });
  }, [itensBalanco, filtroLocalizacao, filtroCategoria, filtroStatus, busca]);

  // Estatísticas de Auditoria
  const stats = useMemo(() => {
    const totalItens = itensBalanco.length;
    const contados = itensBalanco.filter((it) => it.quantidadeContada !== null).length;
    const pendentes = totalItens - contados;
    const divergentes = itensBalanco.filter(
      (it) => it.status === 'DIVERGENCIA_SOBRA' || it.status === 'DIVERGENCIA_FALTA'
    );
    const totalSobraFinanceira = divergentes
      .filter((it) => it.divergencia > 0)
      .reduce((acc, it) => acc + it.impactoFinanceiro, 0);
    const totalFaltaFinanceira = divergentes
      .filter((it) => it.divergencia < 0)
      .reduce((acc, it) => acc + Math.abs(it.impactoFinanceiro), 0);
    const impactoLiquido = totalSobraFinanceira - totalFaltaFinanceira;

    return {
      totalItens,
      contados,
      pendentes,
      divergentesQtd: divergentes.length,
      totalSobraFinanceira,
      totalFaltaFinanceira,
      impactoLiquido,
      progresso: totalItens > 0 ? (contados / totalItens) * 100 : 0,
    };
  }, [itensBalanco]);

  // Finalizar e Efetivar Ajuste de Estoque
  const handleEfetivarBalanco = () => {
    try {
      const custom = localStorage.getItem('coliseu_custom_produtos');
      let customProds: any[] = custom ? JSON.parse(custom) : [];

      // Atualizar saldos dos produtos contados
      itensBalanco.forEach((it) => {
        if (it.quantidadeContada !== null) {
          const idx = customProds.findIndex((p) => String(p.sku) === String(it.sku));
          if (idx >= 0) {
            customProds[idx].estoqueAtual = it.quantidadeContada;
            customProds[idx].localizacaoDeposito = it.localizacao;
          } else {
            customProds.push({
              id: it.id,
              sku: it.sku,
              descricao: it.descricao,
              codigoBarras: it.codigoBarras,
              estoqueAtual: it.quantidadeContada,
              localizacaoDeposito: it.localizacao,
              precoCusto: it.custoUnitario,
              precoVenda: it.custoUnitario * 1.5,
              unidade: it.unidade,
            });
          }
        }
      });

      localStorage.setItem('coliseu_custom_produtos', JSON.stringify(customProds));
      window.dispatchEvent(new Event('coliseu_produtos_updated'));

      setIsModalFinalizarOpen(false);
      showToast('✅ Balanço efetivado com sucesso! Saldos de estoque sincronizados.');
    } catch (e) {
      console.error(e);
      showToast('❌ Erro ao efetivar balanço.');
    }
  };

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
        title="Balanço & Conferência Física de Estoque"
        description="Auditoria de inventário com contagem cega, suporte a leitor de código de barras, conferência por prateleira/WMS e conciliação de divergências."
        breadcrumbItems={[
          { label: 'Estoque', active: false },
          { label: 'Balanço & Auditoria', active: true },
        ]}
      >
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            variant="secondary"
            onClick={() => window.print()}
            style={{ display: 'inline-flex', gap: '6px', fontSize: '12px' }}
          >
            <Printer size={15} /> Imprimir Ficha de Contagem
          </Button>

          <Button
            variant="primary"
            onClick={() => setIsModalFinalizarOpen(true)}
            disabled={stats.contados === 0}
            style={{ display: 'inline-flex', gap: '6px', fontSize: '12px', fontWeight: 700 }}
          >
            <CheckCircle2 size={16} /> Efetivar Ajuste de Estoque
          </Button>
        </div>
      </PageHeader>

      {/* Grid de Métricas do Inventário */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '14px',
          margin: '18px 0',
        }}
      >
        <div className="coliseu-card" style={{ padding: '14px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Progresso da Contagem</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: '4px 0' }}>
            {stats.contados} / {stats.totalItens} <span style={{ fontSize: '12px', color: '#10b981' }}>({stats.progresso.toFixed(0)}%)</span>
          </div>
          <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--surface-3)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${stats.progresso}%`, height: '100%', backgroundColor: '#10b981', transition: 'width 0.3s' }} />
          </div>
        </div>

        <div className="coliseu-card" style={{ padding: '14px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Itens com Divergência</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: stats.divergentesQtd > 0 ? '#ef4444' : '#10b981', margin: '4px 0' }}>
            {stats.divergentesQtd} itens
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {stats.divergentesQtd === 0 ? 'Nenhuma diferença detectada' : 'Necessitam de auditoria'}
          </div>
        </div>

        <div className="coliseu-card" style={{ padding: '14px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Falta de Estoque (Prejuízo)</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#ef4444', fontFamily: 'monospace', margin: '4px 0' }}>
            {formatCurrency(stats.totalFaltaFinanceira)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Itens físicos &lt; Saldo sistema</div>
        </div>

        <div className="coliseu-card" style={{ padding: '14px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Impacto Líquido da Conciliação</div>
          <div
            style={{
              fontSize: '18px',
              fontWeight: 700,
              color: stats.impactoLiquido >= 0 ? '#10b981' : '#ef4444',
              fontFamily: 'monospace',
              margin: '4px 0',
            }}
          >
            {stats.impactoLiquido >= 0 ? '+' : ''}
            {formatCurrency(stats.impactoLiquido)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Sobras financeiras - Faltas</div>
        </div>
      </div>

      {/* Barra de Ações Rápidas & Bipagem */}
      <div
        className="coliseu-card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          marginBottom: '16px',
        }}
      >
        {/* Linha 1: Leitor de Código de Barras & Alternador Contagem Cega */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <form onSubmit={handleBiparCodigo} style={{ display: 'flex', gap: '8px', flex: 1, minWidth: '320px', maxWidth: '560px' }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <Barcode
                size={18}
                style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }}
              />
              <input
                type="text"
                value={codigoBipado}
                onChange={(e) => setCodigoBipado(e.target.value.toUpperCase())}
                placeholder="Bipar código de barras (EAN-13) ou digitar SKU e pressionar Enter..."
                className="coliseu-input"
                style={{ paddingLeft: '38px', height: '38px', fontSize: '12px', fontWeight: 600 }}
              />
            </div>
            <Button variant="primary" type="submit" style={{ whiteSpace: 'nowrap' }}>
              Contar +1
            </Button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setModoContagemCega(!modoContagemCega)}
              className="coliseu-btn coliseu-btn-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                height: '38px',
                borderColor: modoContagemCega ? '#3b82f6' : 'var(--border-default)',
                color: modoContagemCega ? '#3b82f6' : 'var(--text-primary)',
              }}
              title="Modo Contagem Cega esconde o saldo do sistema para evitar vícios de contagem"
            >
              {modoContagemCega ? <EyeOff size={15} /> : <Eye size={15} />}
              {modoContagemCega ? 'Contagem Cega (Ativa)' : 'Contagem Aberta'}
            </button>
          </div>
        </div>

        {/* Linha 2: Filtros de Localização, Categoria e Status */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
          {/* Busca Texto */}
          <div style={{ width: '260px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar produto por nome..."
                className="coliseu-input"
                style={{ paddingLeft: '30px', height: '34px', fontSize: '11px' }}
              />
            </div>
          </div>

          {/* Filtro por Localização WMS (Prateleira / Depósito) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <MapPin size={14} color="#10b981" />
            <select
              value={filtroLocalizacao}
              onChange={(e) => setFiltroLocalizacao(e.target.value)}
              className="coliseu-input"
              style={{ height: '34px', fontSize: '11px', minWidth: '180px' }}
            >
              <option value="">Todas as Localizações (WMS)</option>
              {enderecosList.map((end) => (
                <option key={end.id} value={end.codigoFormatado}>
                  {end.codigoFormatado}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Categoria */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Layers size={14} color="#3b82f6" />
            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              className="coliseu-input"
              style={{ height: '34px', fontSize: '11px', minWidth: '160px' }}
            >
              <option value="">Todas as Categorias</option>
              {categoriasList.map((cat) => (
                <option key={cat.id} value={cat.nome}>
                  {cat.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Status da Contagem */}
          <div style={{ display: 'flex', backgroundColor: 'var(--surface-3)', borderRadius: '6px', padding: '2px', gap: '2px' }}>
            {(['TODOS', 'PENDENTES', 'DIVERGENTES'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setFiltroStatus(st)}
                style={{
                  border: 'none',
                  background: filtroStatus === st ? 'var(--surface-1)' : 'transparent',
                  color: filtroStatus === st ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                {st === 'TODOS' ? 'Todos' : st === 'PENDENTES' ? 'Pendentes' : 'Com Diferença'}
              </button>
            ))}
          </div>

          {(busca || filtroLocalizacao || filtroCategoria || filtroStatus !== 'TODOS') && (
            <button
              type="button"
              onClick={() => {
                setBusca('');
                setFiltroLocalizacao('');
                setFiltroCategoria('');
                setFiltroStatus('TODOS');
              }}
              style={{
                border: 'none',
                background: 'none',
                color: '#ef4444',
                fontSize: '11px',
                cursor: 'pointer',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              <X size={12} /> Limpar Filtros
            </button>
          )}
        </div>
      </div>

      {/* Tabela de Contagem e Auditoria */}
      <div className="coliseu-table-container">
        <table className="coliseu-table" style={{ fontSize: '12px' }}>
          <thead>
            <tr>
              <th style={{ width: '100px' }}>SKU / EAN</th>
              <th>Descrição do Produto</th>
              <th style={{ width: '200px' }}>Localização (WMS)</th>
              <th style={{ width: '80px', textAlign: 'center' }}>Unidade</th>
              {!modoContagemCega && <th style={{ width: '100px', textAlign: 'right' }}>Saldo Sistema</th>}
              <th style={{ width: '140px', textAlign: 'center' }}>Qtd Contada (Física)</th>
              <th style={{ width: '110px', textAlign: 'right' }}>Divergência</th>
              <th style={{ width: '110px', textAlign: 'right' }}>Impacto (R$)</th>
              <th style={{ width: '110px', textAlign: 'center' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {itensFiltrados.map((item) => {
              const divergencia = item.quantidadeContada !== null ? item.quantidadeContada - item.saldoSistema : 0;
              const impacto = divergencia * item.custoUnitario;

              return (
                <tr
                  key={item.id}
                  style={{
                    backgroundColor:
                      item.quantidadeContada === null
                        ? 'transparent'
                        : divergencia === 0
                        ? 'rgba(16, 185, 129, 0.04)'
                        : 'rgba(239, 68, 68, 0.05)',
                  }}
                >
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--text-link)', fontSize: '11px' }}>{item.sku}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{item.codigoBarras}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.descricao}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{item.marca} • {item.categoria}</div>
                  </td>
                  <td style={{ color: '#10b981', fontWeight: 600, fontSize: '11px' }}>
                    📍 {item.localizacao}
                  </td>
                  <td style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>{item.unidade}</td>
                  {!modoContagemCega && (
                    <td style={{ textAlign: 'right', fontWeight: 600, fontFamily: 'monospace' }}>
                      {item.saldoSistema}
                    </td>
                  )}
                  <td style={{ textAlign: 'center' }}>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="Não contado"
                      value={item.quantidadeContada === null ? '' : item.quantidadeContada}
                      onChange={(e) => {
                        const val = e.target.value === '' ? null : parseInt(e.target.value, 10);
                        handleAtualizarContagem(item.id, val);
                      }}
                      className="coliseu-input"
                      style={{
                        height: '32px',
                        fontSize: '13px',
                        fontWeight: 700,
                        textAlign: 'center',
                        borderColor:
                          item.quantidadeContada === null
                            ? 'var(--border-default)'
                            : divergencia === 0
                            ? '#10b981'
                            : '#ef4444',
                      }}
                    />
                  </td>
                  <td
                    style={{
                      textAlign: 'right',
                      fontWeight: 700,
                      fontFamily: 'monospace',
                      color:
                        item.quantidadeContada === null
                          ? 'var(--text-muted)'
                          : divergencia === 0
                          ? '#10b981'
                          : divergencia > 0
                          ? '#3b82f6'
                          : '#ef4444',
                    }}
                  >
                    {item.quantidadeContada === null ? '—' : `${divergencia > 0 ? '+' : ''}${divergencia}`}
                  </td>
                  <td
                    style={{
                      textAlign: 'right',
                      fontWeight: 700,
                      fontFamily: 'monospace',
                      color:
                        item.quantidadeContada === null
                          ? 'var(--text-muted)'
                          : impacto === 0
                          ? '#10b981'
                          : impacto > 0
                          ? '#3b82f6'
                          : '#ef4444',
                    }}
                  >
                    {item.quantidadeContada === null ? '—' : `${impacto > 0 ? '+' : ''}${formatCurrency(impacto)}`}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {item.quantidadeContada === null ? (
                      <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'var(--surface-3)', color: 'var(--text-muted)' }}>
                        Pendente
                      </span>
                    ) : divergencia === 0 ? (
                      <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: 600 }}>
                        ✓ OK
                      </span>
                    ) : divergencia > 0 ? (
                      <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', fontWeight: 600 }}>
                        + Sobra ({divergencia})
                      </span>
                    ) : (
                      <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontWeight: 600 }}>
                        - Falta ({Math.abs(divergencia)})
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal de Finalização do Balanço */}
      {isModalFinalizarOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(3px)',
            zIndex: 11000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
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
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ClipboardCheck size={20} color="#10b981" />
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Confirmar & Efetivar Balanço de Estoque
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalFinalizarOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Você está prestes a atualizar os saldos de estoque no sistema para <strong>{stats.contados} produtos contados</strong>.
            </div>

            <div style={{ backgroundColor: 'var(--surface-2)', padding: '14px', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span>Itens com Saldos Corretos (Sem diferença):</span>
                <strong style={{ color: '#10b981' }}>{stats.contados - stats.divergentesQtd} itens</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span>Itens com Ajuste de Divergência:</span>
                <strong style={{ color: stats.divergentesQtd > 0 ? '#ef4444' : 'var(--text-primary)' }}>{stats.divergentesQtd} itens</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', borderTop: '1px solid var(--border-subtle)', paddingTop: '6px' }}>
                <span>Impacto Financeiro Líquido:</span>
                <strong style={{ color: stats.impactoLiquido >= 0 ? '#10b981' : '#ef4444', fontFamily: 'monospace' }}>
                  {stats.impactoLiquido >= 0 ? '+' : ''}{formatCurrency(stats.impactoLiquido)}
                </strong>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <Button variant="secondary" onClick={() => setIsModalFinalizarOpen(false)}>
                Revisar Contagem
              </Button>
              <Button variant="primary" onClick={handleEfetivarBalanco} leftIcon={<CheckCircle2 size={16} />}>
                ✓ Confirmar & Ajustar Estoque
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
