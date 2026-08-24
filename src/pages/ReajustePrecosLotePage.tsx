import React, { useState, useMemo, useEffect } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { formatCurrency, parseNumber } from '../lib/formatters';
import {
  TrendingUp,
  Percent,
  Calculator,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RotateCcw,
  SlidersHorizontal,
  DollarSign,
  Tag,
  Check,
  X,
  Layers,
  MapPin,
  Sparkles,
  Save,
} from 'lucide-react';
import migratedProdutosData from '../data/migrated_produtos.json';
import { getCategorias, getMarcas, CategoriaItem, MarcaItem } from '../lib/classificacoes';
import { getEnderecos, EnderecoItem } from '../lib/enderecos';

interface ItemReajuste {
  id: string;
  sku: string;
  descricao: string;
  marca: string;
  categoria: string;
  localizacao: string;
  precoCusto: number;
  precoVendaAtual: number;
  margemAtual: number;
  novoPrecoVenda: number;
  novaMargem: number;
  variacaoPercent: number;
  selecionado: boolean;
}

export const ReajustePrecosLotePage: React.FC = () => {
  const [busca, setBusca] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroMarca, setFiltroMarca] = useState('');
  const [filtroLocalizacao, setFiltroLocalizacao] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isModalConfirmarOpen, setIsModalConfirmarOpen] = useState(false);

  // Parâmetros de Reajuste em Lote
  const [tipoOperacao, setTipoOperacao] = useState<'PERCENTUAL' | 'MARGEM_META' | 'VALOR_FIXO'>('PERCENTUAL');
  const [valorParametro, setValorParametro] = useState<number>(5.0); // 5% ou 35% de margem
  const [regraArredondamento, setRegraArredondamento] = useState<'NENHUM' | '90' | '99' | '00' | '50'>('90');

  const [categoriasList] = useState<CategoriaItem[]>(getCategorias);
  const [marcasList] = useState<MarcaItem[]>(getMarcas);
  const [enderecosList] = useState<EnderecoItem[]>(getEnderecos);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Cálculo da Margem por dentro
  const calcularMargem = (custo: number, preco: number): number => {
    if (!preco || preco <= 0) return 0;
    const deducoes = preco * (0.12 + 0.04 + 0.07 + 0.025); // 25.5% impostos/comissao
    const lucro = preco - custo - deducoes;
    return (lucro / preco) * 100;
  };

  // Aplicar Arredondamento
  const aplicarArredondamento = (valor: number, regra: string): number => {
    if (regra === 'NENHUM') return Math.round(valor * 100) / 100;
    const inteiro = Math.floor(valor);
    if (regra === '90') return inteiro + 0.90;
    if (regra === '99') return inteiro + 0.99;
    if (regra === '00') return Math.ceil(valor);
    if (regra === '50') return inteiro + 0.50;
    return Math.round(valor * 100) / 100;
  };

  // Carregar produtos do catálogo
  const [produtos, setProdutos] = useState<ItemReajuste[]>(() => {
    try {
      const custom = localStorage.getItem('coliseu_custom_produtos');
      const customProds: any[] = custom ? JSON.parse(custom) : [];
      const base = Array.isArray(migratedProdutosData) ? (migratedProdutosData as any[]) : [];
      const todos = [...customProds, ...base];

      return todos.slice(0, 150).map((p, idx) => {
        const custo = p.precoCusto || 30;
        const venda = p.precoVenda || custo * 1.6;
        const margem = calcularMargem(custo, venda);

        return {
          id: p.id || `P-${idx}`,
          sku: p.sku || p.codigo || String(idx + 1).padStart(5, '0'),
          descricao: p.descricao,
          marca: p.marca || 'PPG / DELTRON',
          categoria: p.categoria || 'TINTAS & QUÍMICOS',
          localizacao: p.localizacaoDeposito || 'DEPÓSITO - RUA A - PRATELEIRA 01',
          precoCusto: custo,
          precoVendaAtual: venda,
          margemAtual: margem,
          novoPrecoVenda: venda,
          novaMargem: margem,
          variacaoPercent: 0,
          selecionado: true,
        };
      });
    } catch {
      return [];
    }
  });

  // Executar Simulação em Lote
  const handleSimularLote = () => {
    setProdutos((prev) =>
      prev.map((item) => {
        if (!item.selecionado) return item;

        let novoPreco = item.precoVendaAtual;

        if (tipoOperacao === 'PERCENTUAL') {
          // Reajuste percentual direto sobre o preço de venda atual
          const fator = 1 + valorParametro / 100;
          novoPreco = item.precoVendaAtual * fator;
        } else if (tipoOperacao === 'MARGEM_META') {
          // Precificação por Margem Meta por dentro: Preço = Custo / (1 - (MargemMeta + Deducoes)/100)
          const deducoesPercent = 25.5; // impostos e despesas
          const denominador = 1 - (valorParametro + deducoesPercent) / 100;
          if (denominador > 0.1) {
            novoPreco = item.precoCusto / denominador;
          } else {
            novoPreco = item.precoCusto * 2.0;
          }
        } else if (tipoOperacao === 'VALOR_FIXO') {
          novoPreco = item.precoVendaAtual + valorParametro;
        }

        novoPreco = Math.max(item.precoCusto * 1.05, aplicarArredondamento(novoPreco, regraArredondamento));
        const novaMargem = calcularMargem(item.precoCusto, novoPreco);
        const variacao = item.precoVendaAtual > 0 ? ((novoPreco - item.precoVendaAtual) / item.precoVendaAtual) * 100 : 0;

        return {
          ...item,
          novoPrecoVenda: novoPreco,
          novaMargem,
          variacaoPercent: variacao,
        };
      })
    );

    showToast(`⚡ Simulação de reajuste calculada para todos os itens selecionados!`);
  };

  // Atualizar preço individual na tabela
  const handleEditarPrecoIndividual = (id: string, novoValor: number) => {
    setProdutos((prev) =>
      prev.map((it) => {
        if (it.id === id) {
          const val = Math.max(0, novoValor);
          const novaMargem = calcularMargem(it.precoCusto, val);
          const variacao = it.precoVendaAtual > 0 ? ((val - it.precoVendaAtual) / it.precoVendaAtual) * 100 : 0;
          return {
            ...it,
            novoPrecoVenda: val,
            novaMargem,
            variacaoPercent: variacao,
          };
        }
        return it;
      })
    );
  };

  // Alternar seleção de todos os itens filtrados
  const handleToggleSelectAll = (checked: boolean) => {
    const idsVisiveis = new Set(produtosFiltrados.map((p) => p.id));
    setProdutos((prev) =>
      prev.map((p) => (idsVisiveis.has(p.id) ? { ...p, selecionado: checked } : p))
    );
  };

  // Alternar seleção de um item individual
  const handleToggleSelectOne = (id: string) => {
    setProdutos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, selecionado: !p.selecionado } : p))
    );
  };

  // Filtragem
  const produtosFiltrados = useMemo(() => {
    return produtos.filter((p) => {
      if (filtroCategoria && p.categoria.toUpperCase() !== filtroCategoria.toUpperCase()) return false;
      if (filtroMarca && !p.marca.toUpperCase().includes(filtroMarca.toUpperCase())) return false;
      if (filtroLocalizacao && !p.localizacao.toUpperCase().includes(filtroLocalizacao.toUpperCase())) return false;
      if (busca) {
        const q = busca.toLowerCase();
        const mDesc = p.descricao.toLowerCase().includes(q);
        const mSku = p.sku.toLowerCase().includes(q);
        if (!mDesc && !mSku) return false;
      }
      return true;
    });
  }, [produtos, filtroCategoria, filtroMarca, filtroLocalizacao, busca]);

  // Estatísticas do Lote
  const stats = useMemo(() => {
    const selecionados = produtos.filter((p) => p.selecionado);
    const totalSelecionados = selecionados.length;
    const somaAtual = selecionados.reduce((acc, p) => acc + p.precoVendaAtual, 0);
    const somaNova = selecionados.reduce((acc, p) => acc + p.novoPrecoVenda, 0);
    const diferencaTotal = somaNova - somaAtual;
    const mediaMargemAtual =
      totalSelecionados > 0 ? selecionados.reduce((acc, p) => acc + p.margemAtual, 0) / totalSelecionados : 0;
    const mediaMargemNova =
      totalSelecionados > 0 ? selecionados.reduce((acc, p) => acc + p.novaMargem, 0) / totalSelecionados : 0;

    return {
      totalSelecionados,
      somaAtual,
      somaNova,
      diferencaTotal,
      mediaMargemAtual,
      mediaMargemNova,
    };
  }, [produtos]);

  // Efetivar no catálogo
  const handleGravarReajustes = () => {
    try {
      const custom = localStorage.getItem('coliseu_custom_produtos');
      let customProds: any[] = custom ? JSON.parse(custom) : [];

      produtos.forEach((p) => {
        if (p.selecionado) {
          const idx = customProds.findIndex((cp) => String(cp.sku) === String(p.sku));
          if (idx >= 0) {
            customProds[idx].precoVenda = p.novoPrecoVenda;
          } else {
            customProds.push({
              id: p.id,
              sku: p.sku,
              descricao: p.descricao,
              precoCusto: p.precoCusto,
              precoVenda: p.novoPrecoVenda,
              estoqueAtual: 10,
              marca: p.marca,
              categoria: p.categoria,
              localizacaoDeposito: p.localizacao,
            });
          }
        }
      });

      localStorage.setItem('coliseu_custom_produtos', JSON.stringify(customProds));
      window.dispatchEvent(new Event('coliseu_produtos_updated'));

      setIsModalConfirmarOpen(false);
      showToast(`✅ Preços atualizados com sucesso para ${stats.totalSelecionados} produtos!`);
    } catch (e) {
      console.error(e);
      showToast('❌ Erro ao salvar reajustes.');
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
        title="Reajuste de Preços & Margens em Lote"
        description="Atualização em massa de tabelas de preço com simulação de margem líquida, arredondamento comercial e filtros por categoria, marca ou prateleira."
        breadcrumbItems={[
          { label: 'Comercial', active: false },
          { label: 'Reajuste em Lote', active: true },
        ]}
      >
        <Button
          variant="primary"
          onClick={() => setIsModalConfirmarOpen(true)}
          disabled={stats.totalSelecionados === 0}
          style={{ display: 'inline-flex', gap: '6px', fontSize: '12px', fontWeight: 700 }}
        >
          <Save size={16} /> Gravar Novos Preços ({stats.totalSelecionados})
        </Button>
      </PageHeader>

      {/* Painel de Configuração do Reajuste em Lote */}
      <div
        className="coliseu-card"
        style={{
          backgroundColor: 'var(--surface-2)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          marginBottom: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={18} color="#3b82f6" />
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
              1. Configurar Regra de Reajuste em Massa
            </span>
          </div>

          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Selecione a modalidade de cálculo e clique em <strong>Simular Reajuste</strong> para pré-visualizar.
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr auto', gap: '12px', alignItems: 'flex-end' }}>
          {/* Tipo de Operação */}
          <div>
            <label className="coliseu-label" style={{ fontSize: '11px', marginBottom: '4px' }}>
              Modalidade de Reajuste
            </label>
            <select
              value={tipoOperacao}
              onChange={(e) => setTipoOperacao(e.target.value as any)}
              className="coliseu-input"
              style={{ height: '38px', fontSize: '12px', fontWeight: 600 }}
            >
              <option value="PERCENTUAL">Reajuste Percentual (+ / - % no Preço Atual)</option>
              <option value="MARGEM_META">Margem Líquida Meta (% sobre Custo Real)</option>
              <option value="VALOR_FIXO">Acréscimo Fixo em Reais (R$)</option>
            </select>
          </div>

          {/* Valor do Parâmetro */}
          <div>
            <label className="coliseu-label" style={{ fontSize: '11px', marginBottom: '4px' }}>
              {tipoOperacao === 'PERCENTUAL'
                ? 'Percentual de Reajuste (%)'
                : tipoOperacao === 'MARGEM_META'
                ? 'Margem Líquida Meta Desejada (%)'
                : 'Valor a Somar (R$)'}
            </label>
            <input
              type="number"
              step="0.1"
              value={valorParametro}
              onChange={(e) => setValorParametro(parseFloat(e.target.value) || 0)}
              className="coliseu-input"
              style={{ height: '38px', fontSize: '13px', fontWeight: 700, fontFamily: 'monospace' }}
            />
          </div>

          {/* Regra de Arredondamento */}
          <div>
            <label className="coliseu-label" style={{ fontSize: '11px', marginBottom: '4px' }}>
              Arredondamento Psicológico
            </label>
            <select
              value={regraArredondamento}
              onChange={(e) => setRegraArredondamento(e.target.value as any)}
              className="coliseu-input"
              style={{ height: '38px', fontSize: '12px' }}
            >
              <option value="90">Terminar em ,90 (Ex: R$ 29,90)</option>
              <option value="99">Terminar em ,99 (Ex: R$ 29,99)</option>
              <option value="50">Terminar em ,50 (Ex: R$ 29,50)</option>
              <option value="00">Inteiro mais próximo (Ex: R$ 30,00)</option>
              <option value="NENHUM">Sem arredondamento (Centavos exatos)</option>
            </select>
          </div>

          {/* Botão de Simulação */}
          <Button
            variant="primary"
            onClick={handleSimularLote}
            style={{ height: '38px', padding: '0 20px', fontSize: '12px', fontWeight: 700 }}
            leftIcon={<Sparkles size={15} />}
          >
            ⚡ Simular Reajuste
          </Button>
        </div>
      </div>

      {/* Barra de Filtros de Segmentação */}
      <div
        className="coliseu-card"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          marginBottom: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flex: 1 }}>
          <div style={{ width: '260px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por SKU ou descrição..."
                className="coliseu-input"
                style={{ paddingLeft: '30px', height: '34px', fontSize: '11px' }}
              />
            </div>
          </div>

          {/* Filtro Categoria */}
          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            className="coliseu-input"
            style={{ height: '34px', fontSize: '11px', minWidth: '160px' }}
          >
            <option value="">Todas as Categorias</option>
            {categoriasList.map((c) => (
              <option key={c.id} value={c.nome}>
                {c.nome}
              </option>
            ))}
          </select>

          {/* Filtro Marca */}
          <select
            value={filtroMarca}
            onChange={(e) => setFiltroMarca(e.target.value)}
            className="coliseu-input"
            style={{ height: '34px', fontSize: '11px', minWidth: '150px' }}
          >
            <option value="">Todas as Marcas</option>
            {marcasList.map((m) => (
              <option key={m.id} value={m.nome}>
                {m.nome}
              </option>
            ))}
          </select>

          {/* Filtro Localização WMS */}
          <select
            value={filtroLocalizacao}
            onChange={(e) => setFiltroLocalizacao(e.target.value)}
            className="coliseu-input"
            style={{ height: '34px', fontSize: '11px', minWidth: '170px' }}
          >
            <option value="">Todos os Locais / WMS</option>
            {enderecosList.map((end) => (
              <option key={end.id} value={end.codigoFormatado}>
                📍 {end.codigoFormatado}
              </option>
            ))}
          </select>

          {(busca || filtroCategoria || filtroMarca || filtroLocalizacao) && (
            <button
              type="button"
              onClick={() => {
                setBusca('');
                setFiltroCategoria('');
                setFiltroMarca('');
                setFiltroLocalizacao('');
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
                gap: '2px',
              }}
            >
              <X size={12} /> Limpar
            </button>
          )}
        </div>

        {/* Seleção em Massa */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            onClick={() => handleToggleSelectAll(true)}
            className="coliseu-btn coliseu-btn-secondary"
            style={{ fontSize: '11px', padding: '4px 10px' }}
          >
            Marcar Todos ({produtosFiltrados.length})
          </button>
          <button
            type="button"
            onClick={() => handleToggleSelectAll(false)}
            className="coliseu-btn coliseu-btn-secondary"
            style={{ fontSize: '11px', padding: '4px 10px' }}
          >
            Desmarcar Todos
          </button>
        </div>
      </div>

      {/* Tabela de Simulação Prévia */}
      <div className="coliseu-table-container">
        <table className="coliseu-table" style={{ fontSize: '12px' }}>
          <thead>
            <tr>
              <th style={{ width: '40px', textAlign: 'center' }}>
                <input
                  type="checkbox"
                  checked={produtosFiltrados.length > 0 && produtosFiltrados.every((p) => p.selecionado)}
                  onChange={(e) => handleToggleSelectAll(e.target.checked)}
                />
              </th>
              <th style={{ width: '100px' }}>SKU</th>
              <th>Descrição do Produto</th>
              <th>Marca / Categoria</th>
              <th style={{ width: '110px', textAlign: 'right' }}>Custo Real</th>
              <th style={{ width: '120px', textAlign: 'right' }}>Preço Atual</th>
              <th style={{ width: '100px', textAlign: 'right' }}>Margem Atual</th>
              <th style={{ width: '150px', textAlign: 'center' }}>Novo Preço (Simulado)</th>
              <th style={{ width: '100px', textAlign: 'right' }}>Nova Margem</th>
              <th style={{ width: '90px', textAlign: 'right' }}>Variação</th>
            </tr>
          </thead>
          <tbody>
            {produtosFiltrados.map((item) => {
              const mudou = Math.abs(item.novoPrecoVenda - item.precoVendaAtual) > 0.01;

              return (
                <tr
                  key={item.id}
                  style={{
                    backgroundColor: item.selecionado
                      ? mudou
                        ? 'rgba(59, 130, 246, 0.04)'
                        : 'transparent'
                      : 'rgba(0, 0, 0, 0.02)',
                    opacity: item.selecionado ? 1 : 0.6,
                  }}
                >
                  <td style={{ textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={item.selecionado}
                      onChange={() => handleToggleSelectOne(item.id)}
                    />
                  </td>
                  <td style={{ fontWeight: 700, color: 'var(--text-link)', fontSize: '11px' }}>{item.sku}</td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.descricao}</div>
                    <div style={{ fontSize: '10px', color: '#10b981' }}>📍 {item.localizacao}</div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                    {item.marca} • {item.categoria}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                    {formatCurrency(item.precoCusto)}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>
                    {formatCurrency(item.precoVendaAtual)}
                  </td>
                  <td
                    style={{
                      textAlign: 'right',
                      fontFamily: 'monospace',
                      fontWeight: 600,
                      color: item.margemAtual >= 15 ? '#10b981' : '#ef4444',
                    }}
                  >
                    {item.margemAtual.toFixed(1)}%
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>R$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={item.novoPrecoVenda}
                        onChange={(e) => handleEditarPrecoIndividual(item.id, parseFloat(e.target.value) || 0)}
                        className="coliseu-input"
                        style={{
                          width: '100px',
                          height: '32px',
                          fontSize: '12px',
                          fontWeight: 700,
                          textAlign: 'right',
                          fontFamily: 'monospace',
                          borderColor: mudou ? '#3b82f6' : 'var(--border-default)',
                          color: mudou ? '#3b82f6' : 'var(--text-primary)',
                        }}
                      />
                    </div>
                  </td>
                  <td
                    style={{
                      textAlign: 'right',
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      color: item.novaMargem >= 15 ? '#10b981' : '#ef4444',
                    }}
                  >
                    {item.novaMargem.toFixed(1)}%
                  </td>
                  <td
                    style={{
                      textAlign: 'right',
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      color: item.variacaoPercent > 0 ? '#10b981' : item.variacaoPercent < 0 ? '#ef4444' : 'var(--text-muted)',
                    }}
                  >
                    {item.variacaoPercent > 0 ? '+' : ''}
                    {item.variacaoPercent.toFixed(1)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Resumo & Barra de Aplicação Inferior */}
      <div
        className="coliseu-card"
        style={{
          marginTop: '16px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          backgroundColor: 'var(--surface-2)',
          border: '1px solid var(--border-default)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Itens Selecionados</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {stats.totalSelecionados} produtos
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Margem Média Atual ➔ Projetada</div>
            <div style={{ fontSize: '15px', fontWeight: 700, fontFamily: 'monospace' }}>
              <span style={{ color: 'var(--text-secondary)' }}>{stats.mediaMargemAtual.toFixed(1)}%</span> ➔{' '}
              <span style={{ color: '#10b981' }}>{stats.mediaMargemNova.toFixed(1)}%</span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Variação Financeira Total</div>
            <div
              style={{
                fontSize: '15px',
                fontWeight: 700,
                fontFamily: 'monospace',
                color: stats.diferencaTotal >= 0 ? '#10b981' : '#ef4444',
              }}
            >
              {stats.diferencaTotal >= 0 ? '+' : ''}
              {formatCurrency(stats.diferencaTotal)}
            </div>
          </div>
        </div>

        <Button
          variant="primary"
          size="lg"
          onClick={() => setIsModalConfirmarOpen(true)}
          disabled={stats.totalSelecionados === 0}
          leftIcon={<CheckCircle2 size={18} />}
        >
          ✓ Gravar Reajustes no Catálogo
        </Button>
      </div>

      {/* Modal de Confirmação */}
      {isModalConfirmarOpen && (
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
              maxWidth: '520px',
              backgroundColor: 'var(--surface-1)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={20} color="#3b82f6" />
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Confirmar Reajuste em Lote
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalConfirmarOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Você está prestes a atualizar o preço de venda de <strong>{stats.totalSelecionados} produtos</strong> no catálogo e no PDV.
            </div>

            <div style={{ backgroundColor: 'var(--surface-2)', padding: '12px', borderRadius: '6px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Margem Média Projetada:</span>
                <strong style={{ color: '#10b981' }}>{stats.mediaMargemNova.toFixed(1)}%</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Impacto Médio de Preço:</span>
                <strong style={{ color: stats.diferencaTotal >= 0 ? '#10b981' : '#ef4444' }}>
                  {stats.diferencaTotal >= 0 ? '+' : ''}{formatCurrency(stats.diferencaTotal)}
                </strong>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <Button variant="secondary" onClick={() => setIsModalConfirmarOpen(false)}>
                Cancelar
              </Button>
              <Button variant="primary" onClick={handleGravarReajustes} leftIcon={<Check size={16} />}>
                Confirmar & Aplicar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
