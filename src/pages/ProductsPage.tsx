import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { AIInsight } from '../components/ui/AIComponents';
import { formatCurrency, parseNumber } from '../lib/formatters';
import { Search, Plus, Package, QrCode, X, Check, ChevronLeft, ChevronRight, Filter, Layers, Tag } from 'lucide-react';
import migratedProdutosData from '../data/migrated_produtos.json';
import { getCategorias, getMarcas, CategoriaItem, MarcaItem } from '../lib/classificacoes';
import { getEnderecos, EnderecoItem } from '../lib/enderecos';
import { ModalCadastroRapidoMarca } from '../components/produtos/ModalCadastroRapidoMarca';
import { ModalCadastroRapidoCategoria } from '../components/produtos/ModalCadastroRapidoCategoria';
import { ModalCadastroRapidoEndereco } from '../components/produtos/ModalCadastroRapidoEndereco';
import { syncService } from '../lib/syncService';
import { MapPin } from 'lucide-react';

export interface ProdutoItem {
  id: string;
  codigo?: string;
  sku: string;
  descricao: string;
  unidade: string;
  codigoBarras: string;
  ncm?: string;
  cest?: string;
  precoCusto: number;
  precoVenda: number;
  estoqueAtual: number;
  estoqueMinimo: number;
  marca?: string;
}

export const ProductsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
        setIsLabelModalOpen(false);
      }
    };
    if (isModalOpen || isLabelModalOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, isLabelModalOpen]);

  // Form Novo Produto
  const [nome, setNome] = useState('');
  const [sku, setSku] = useState('');
  const [ean, setEan] = useState('');
  const [ncm, setNcm] = useState('');
  const [preco, setPreco] = useState(49.90);
  const [precoCusto, setPrecoCusto] = useState(25.00);
  const [estoque, setEstoque] = useState(10);
  const [marca, setMarca] = useState('PPG / DELTRON');
  const [categoria, setCategoria] = useState('Geral');
  const [subcategoria, setSubcategoria] = useState('');
  const [localizacao, setLocalizacao] = useState('DEPÓSITO - RUA A - PRATELEIRA 01');

  // Filtros de Classificação e Localização
  const [selectedCategoriaFilter, setSelectedCategoriaFilter] = useState('');
  const [selectedMarcaFilter, setSelectedMarcaFilter] = useState('');
  const [selectedEnderecoFilter, setSelectedEnderecoFilter] = useState('');
  const [categoriasList, setCategoriasList] = useState<CategoriaItem[]>(getCategorias);
  const [marcasList, setMarcasList] = useState<MarcaItem[]>(getMarcas);
  const [enderecosList, setEnderecosList] = useState<EnderecoItem[]>(getEnderecos);

  // Modais Rápidos
  const [isModalMarcaOpen, setIsModalMarcaOpen] = useState(false);
  const [isModalCatOpen, setIsModalCatOpen] = useState(false);
  const [isModalEnderecoOpen, setIsModalEnderecoOpen] = useState(false);
  const [catSelecionadaPrevia, setCatSelecionadaPrevia] = useState('');

  useEffect(() => {
    const handleUpdate = () => {
      setCategoriasList(getCategorias());
      setMarcasList(getMarcas());
      setEnderecosList(getEnderecos());
    };
    window.addEventListener('coliseu_classificacoes_updated', handleUpdate);
    window.addEventListener('coliseu_enderecos_updated', handleUpdate);
    return () => {
      window.removeEventListener('coliseu_classificacoes_updated', handleUpdate);
      window.removeEventListener('coliseu_enderecos_updated', handleUpdate);
    };
  }, []);

  const carregarCatalogo = () => {
    try {
      const custom = localStorage.getItem('coliseu_custom_produtos');
      let customProds: any[] = custom ? JSON.parse(custom) : [];
      const base = Array.isArray(migratedProdutosData) ? (migratedProdutosData as any[]) : [];

      // Sincronizar itens de entradas XML já salvas
      const entradasSalvas = localStorage.getItem('coliseu_entradas_xml');
      const entradas: any[] = entradasSalvas ? JSON.parse(entradasSalvas) : [];

      let novosAdicionados = 0;
      entradas.forEach((ent) => {
        if (Array.isArray(ent.itens)) {
          ent.itens.forEach((it: any) => {
            const cleanDesc = (it.descricao || '').toUpperCase().trim();
            const skuForn = String(it.codigoFornecedor || '').trim();
            const cleanEan = it.ean && it.ean.toUpperCase() !== 'SEM GTIN' ? it.ean.trim() : '';

            const existsInCustom = customProds.some(
              (p) => String(p.sku || p.codigo).toUpperCase() === skuForn.toUpperCase() || p.descricao.toUpperCase().trim() === cleanDesc
            );

            if (!existsInCustom && cleanDesc.length > 0) {
              const custo = it.valorUnitario || 0;
              const precoVenda = Math.round((custo * 1.8) * 100) / 100;
              const precoMin = Math.round((custo * 1.3) * 100) / 100;

              customProds.unshift({
                id: `PROD-${Date.now()}-${it.seq || it.codigoFornecedor}`,
                sku: skuForn || `PRD-${Date.now().toString().slice(-5)}`,
                codigo: skuForn,
                codigoBarras: cleanEan,
                descricao: cleanDesc,
                unidade: it.unidade || 'UN',
                ncm: it.ncm || '00000000',
                precoCusto: custo,
                custoMedio: custo,
                precoVenda: precoVenda,
                precoMinimo: precoMin,
                estoqueAtual: it.quantidade || 1,
                estoqueMinimo: 3,
                marca: ent.fornecedor || 'FORNECEDOR XML',
              });
              novosAdicionados++;
            }
          });
        }
      });

      if (novosAdicionados > 0) {
        localStorage.setItem('coliseu_custom_produtos', JSON.stringify(customProds));
      }

      const customMap = new Map<string, any>();
      customProds.forEach((p) => {
        const key = String(p.sku || p.codigo || p.id).toUpperCase();
        customMap.set(key, p);
      });

      const baseFiltrados = base.filter((p) => {
        const key = String(p.sku || p.codigo || p.id).toUpperCase();
        return !customMap.has(key);
      });

      return [...customProds, ...baseFiltrados];
    } catch (e) {
      console.error('Erro ao carregar catálogo:', e);
      return Array.isArray(migratedProdutosData) ? (migratedProdutosData as any) : [];
    }
  };

  const [produtos, setProdutos] = useState<ProdutoItem[]>(carregarCatalogo);

  useEffect(() => {
    const handleUpdate = () => {
      setProdutos(carregarCatalogo());
    };
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('focus', handleUpdate);
    window.addEventListener('coliseu_produtos_updated', handleUpdate);

    // Carga inicial da Nuvem (PostgreSQL Central)
    const loadCloudProducts = async () => {
      try {
        const cloudProds = await syncService.fetchCloudProdutos();
        if (Array.isArray(cloudProds) && cloudProds.length > 0) {
          const custom = localStorage.getItem('coliseu_custom_produtos');
          let customProds: any[] = custom ? JSON.parse(custom) : [];

          cloudProds.forEach((cp: any) => {
            const idx = customProds.findIndex((p: any) => p.id === cp.id || p.sku === cp.sku || p.codigo === cp.codigo);
            if (idx >= 0) {
              customProds[idx] = { ...customProds[idx], ...cp };
            } else {
              customProds = [cp, ...customProds];
            }
          });

          localStorage.setItem('coliseu_custom_produtos', JSON.stringify(customProds));
          setProdutos(carregarCatalogo());
        }
      } catch (err) {
        console.warn('[Produtos] Falha ao carregar produtos da nuvem:', err);
      }
    };
    loadCloudProducts();

    return () => {
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('focus', handleUpdate);
      window.removeEventListener('coliseu_produtos_updated', handleUpdate);
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleSalvarProduto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome) return;

    const newProd: any = {
      id: sku ? `PROD-${sku.padStart(5, '0')}` : `PROD-${(produtos.length + 1).toString().padStart(5, '0')}`,
      sku: sku || (produtos.length + 1).toString().padStart(5, '0'),
      codigoBarras: ean || '7890000000000',
      descricao: nome.toUpperCase(),
      unidade: 'UN',
      ncm: ncm || '38140090',
      precoCusto,
      precoVenda: preco,
      estoqueAtual: estoque,
      estoqueMinimo: 5,
      marca,
      categoria,
      subcategoria,
      localizacaoDeposito: localizacao,
    };

    try {
      const custom = localStorage.getItem('coliseu_custom_produtos');
      const customProds = custom ? JSON.parse(custom) : [];
      const updatedCustom = [newProd, ...customProds.filter((p: any) => String(p.sku) !== String(newProd.sku))];
      localStorage.setItem('coliseu_custom_produtos', JSON.stringify(updatedCustom));
      window.dispatchEvent(new Event('coliseu_produtos_updated'));
    } catch (err: any) {
      console.error(err);
    }

    // Sincroniza em tempo real com a VPS (PostgreSQL Central)
    syncService.syncProduto(newProd).catch(() => {});

    setProdutos((prev) => [newProd, ...prev]);
    setIsModalOpen(false);
    setNome('');
    setSku('');
    setEan('');
    setNcm('');
    showToast(`✅ Produto '${nome}' cadastrado e sincronizado com sucesso!`);
  };

  const filteredProdutos = useMemo(() => {
    let list = produtos;

    if (selectedCategoriaFilter) {
      list = list.filter((p: any) => (p.categoria || '').toUpperCase() === selectedCategoriaFilter.toUpperCase());
    }

    if (selectedMarcaFilter) {
      list = list.filter((p: any) => (p.marca || '').toUpperCase().includes(selectedMarcaFilter.toUpperCase()));
    }

    if (selectedEnderecoFilter) {
      list = list.filter((p: any) => {
        const loc = String(p.localizacaoDeposito || 'DEPÓSITO - RUA A - PRATELEIRA 01').toUpperCase();
        return loc.includes(selectedEnderecoFilter.toUpperCase());
      });
    }

    const q = searchTerm.toLowerCase().trim();
    if (!q) return list;

    return list.filter(
      (p) =>
        p.descricao.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.codigoBarras && p.codigoBarras.includes(q)) ||
        (p.ncm && p.ncm.includes(q)) ||
        (p.marca && p.marca.toLowerCase().includes(q)) ||
        ((p as any).categoria && (p as any).categoria.toLowerCase().includes(q)) ||
        ((p as any).localizacaoDeposito && (p as any).localizacaoDeposito.toLowerCase().includes(q))
    );
  }, [produtos, searchTerm, selectedCategoriaFilter, selectedMarcaFilter, selectedEnderecoFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredProdutos.length / pageSize));
  const paginatedProdutos = useMemo(
    () => filteredProdutos.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filteredProdutos, currentPage, pageSize]
  );

  return (
    <div className="coliseu-page" style={{ minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {toastMessage && (
        <div className="coliseu-toast-container">
          <div className="coliseu-toast coliseu-toast--success">
            <Check aria-hidden="true" style={{ width: '1.25rem', height: '1.25rem', color: 'var(--status-success)' }} />
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{toastMessage}</span>
          </div>
        </div>
      )}

      <PageHeader
        title="Catálogo & Cadastro de Produtos (Base PIVETA FDB)"
        description="Gestão unificada de 4.336 itens reais migrados do banco de dados Coliseu Sistemas."
        breadcrumbItems={[
          { label: 'Comercial', active: false },
          { label: 'Produtos', active: true },
        ]}
        primaryAction={{
          label: 'Novo Produto',
          onClick: () => setIsModalOpen(true),
          icon: <Plus aria-hidden="true" size={14} />,
        }}
      />

       <div className="coliseu-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '320px', flexWrap: 'wrap' }}>
            <div style={{ width: '320px' }}>
              <Input
                placeholder="Buscar por descrição, SKU, EAN ou NCM..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                leftIcon={<Search aria-hidden="true" size={14} />}
                style={{ width: '100%' }}
              />
            </div>

            {/* Filtro por Categoria */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <select
                value={selectedCategoriaFilter}
                onChange={(e) => {
                  setSelectedCategoriaFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="coliseu-input"
                style={{ height: '36px', fontSize: '11px', minWidth: '160px' }}
              >
                <option value="">Todas as Categorias</option>
                {categoriasList.map((c) => (
                  <option key={c.id} value={c.nome}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro por Marca */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <select
                value={selectedMarcaFilter}
                onChange={(e) => {
                  setSelectedMarcaFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="coliseu-input"
                style={{ height: '36px', fontSize: '11px', minWidth: '150px' }}
              >
                <option value="">Todas as Marcas</option>
                {marcasList.map((m) => (
                  <option key={m.id} value={m.nome}>
                    {m.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro por Localização WMS */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <select
                value={selectedEnderecoFilter}
                onChange={(e) => {
                  setSelectedEnderecoFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="coliseu-input"
                style={{ height: '36px', fontSize: '11px', minWidth: '170px' }}
              >
                <option value="">Todos os Locais / WMS</option>
                {enderecosList.map((end) => (
                  <option key={end.id} value={end.codigoFormatado}>
                    📍 {end.codigoFormatado}
                  </option>
                ))}
              </select>
            </div>

            {(selectedCategoriaFilter || selectedMarcaFilter || selectedEnderecoFilter) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedCategoriaFilter('');
                  setSelectedMarcaFilter('');
                  setSelectedEnderecoFilter('');
                  setCurrentPage(1);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ef4444',
                  fontSize: '11px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px',
                }}
              >
                <X size={12} /> Limpar Filtros
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="secondary" size="md" leftIcon={<QrCode aria-hidden="true" size={14} />} onClick={() => setIsLabelModalOpen(true)}>
              Imprimir Etiquetas
            </Button>
          </div>
        </div>

        <div className="coliseu-table-container">
          <table className="coliseu-table">
            <thead>
              <tr>
                <th style={{ width: '110px' }}>SKU / EAN</th>
                <th>Descrição do Produto</th>
                <th>Marca / Linha</th>
                <th>Local / WMS</th>
                <th style={{ width: '90px' }}>NCM</th>
                <th style={{ textAlign: 'right', width: '110px' }}>Estoque Atual</th>
                <th style={{ textAlign: 'right', width: '120px' }}>Preço Venda</th>
                <th style={{ textAlign: 'center', width: '90px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProdutos.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => navigate(`/produtos/${p.sku || p.id}`)}
                  style={{ cursor: 'pointer' }}
                  title="Clique para abrir a Ficha do Produto 360°"
                >
                  <td>
                    <span style={{ fontWeight: 700, color: 'var(--text-link)', display: 'block', fontSize: '11px' }}>
                      {p.sku}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      EAN: {p.codigoBarras || p.sku}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                    {p.descricao}
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                    {p.marca || 'PPG / DELTRON'}
                  </td>
                  <td style={{ color: '#10b981', fontSize: '11px', fontWeight: 600 }}>
                    📍 {(p as any).localizacaoDeposito || 'DEPÓSITO - RUA A - PRAT 01'}
                  </td>
                  <td className="text-mono" style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                    {p.ncm || '-'}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: p.estoqueAtual <= 3 ? 'var(--status-danger)' : 'var(--text-primary)' }}>
                    {p.estoqueAtual} {p.unidade || 'UN'}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: '#10b981', fontFamily: 'monospace' }}>
                    {formatCurrency(p.precoVenda)}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <StatusBadge
                      status={p.estoqueAtual > 0 ? 'success' : 'warning'}
                      label={p.estoqueAtual > 0 ? 'Ativo' : 'Esgotado'}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 4px', fontSize: '12px', color: 'var(--text-muted)' }}>
          <span>
            Mostrando <strong>{Math.min(filteredProdutos.length, (currentPage - 1) * pageSize + 1)}</strong>-
            <strong>{Math.min(filteredProdutos.length, currentPage * pageSize)}</strong> de <strong>{filteredProdutos.length}</strong> produtos
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Button
              variant="ghost"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft size={13} />
            </Button>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              {currentPage} de {totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              <ChevronRight size={13} />
            </Button>
          </div>
        </div>

        <AIInsight
          title="Sugestão de Reposição de Estoque"
          description="O item VERNIZ POLIURETANO ALTO SÓLIDOS atingiu 4 unidades (abaixo do ponto de pedido de 15 un). Deseja emitir sugestão de compra automatizada?"
          badge="IA Preditiva"
          actionText="Gerar Pedido de Compra"
          onAction={() => showToast('🛒 Pedido de compra automatizado enviado para o fornecedor!')}
        />
      </div>

      {/* Modal Cadastro de Produto */}
      {isModalOpen && (
        <div className="coliseu-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="coliseu-modal" role="dialog" aria-modal="true" style={{ width: '100%', maxWidth: '600px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Cadastrar Novo Produto</h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X aria-hidden="true" style={{ width: '1.25rem', height: '1.25rem' }} />
              </button>
            </div>

            <form onSubmit={handleSalvarProduto} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="coliseu-label">Descrição do Produto *</label>
                <Input
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: TINTA POLIURETANO AZUL BÚZIOS 900ML"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <Input
                  label="Código de Barras (EAN)"
                  type="text"
                  value={ean}
                  onChange={(e) => setEan(e.target.value)}
                  placeholder="7891234567893"
                />
                <Input
                  label="Código NCM"
                  type="text"
                  value={ncm}
                  onChange={(e) => setNcm(e.target.value)}
                  placeholder="38140090"
                />
              </div>

              {/* Classificação: Marca e Categoria com Atalhos Inline */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label className="coliseu-label" style={{ margin: 0 }}>Marca / Fabricante</label>
                    <button
                      type="button"
                      onClick={() => setIsModalMarcaOpen(true)}
                      style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}
                    >
                      + Nova
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <input
                      type="text"
                      list="modal-marcas-list"
                      value={marca}
                      onChange={(e) => setMarca(e.target.value.toUpperCase())}
                      className="coliseu-input"
                      placeholder="Selecione ou digite..."
                      style={{ height: '36px' }}
                    />
                    <datalist id="modal-marcas-list">
                      {marcasList.map((m) => (
                        <option key={m.id} value={m.nome} />
                      ))}
                    </datalist>
                    <button
                      type="button"
                      onClick={() => setIsModalMarcaOpen(true)}
                      className="coliseu-btn coliseu-btn-secondary"
                      style={{ padding: '0 8px', height: '36px' }}
                      title="Cadastrar Nova Marca"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label className="coliseu-label" style={{ margin: 0 }}>Categoria / Grupo</label>
                    <button
                      type="button"
                      onClick={() => {
                        setCatSelecionadaPrevia('');
                        setIsModalCatOpen(true);
                      }}
                      style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}
                    >
                      + Nova
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <select
                      value={categoria}
                      onChange={(e) => {
                        setCategoria(e.target.value);
                        setSubcategoria('');
                      }}
                      className="coliseu-input"
                      style={{ height: '36px' }}
                    >
                      {categoriasList.map((c) => (
                        <option key={c.id} value={c.nome}>
                          {c.nome}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        setCatSelecionadaPrevia('');
                        setIsModalCatOpen(true);
                      }}
                      className="coliseu-btn coliseu-btn-secondary"
                      style={{ padding: '0 8px', height: '36px' }}
                      title="Cadastrar Nova Categoria"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Localização / Endereçamento WMS */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label className="coliseu-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={13} color="#10b981" /> Local do Produto (WMS / Armazenagem)
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsModalEnderecoOpen(true)}
                    style={{ background: 'none', border: 'none', color: '#10b981', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}
                  >
                    + Novo Local
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <input
                    type="text"
                    list="modal-enderecos-list"
                    value={localizacao}
                    onChange={(e) => setLocalizacao(e.target.value.toUpperCase())}
                    className="coliseu-input"
                    placeholder="Ex: DEPÓSITO - RUA A - PRATELEIRA 01"
                    style={{ height: '36px' }}
                  />
                  <datalist id="modal-enderecos-list">
                    {enderecosList.map((end) => (
                      <option key={end.id} value={end.codigoFormatado} />
                    ))}
                  </datalist>
                  <button
                    type="button"
                    onClick={() => setIsModalEnderecoOpen(true)}
                    className="coliseu-btn coliseu-btn-secondary"
                    style={{ padding: '0 8px', height: '36px' }}
                    title="Cadastrar Novo Endereço"
                  >
                    <Plus size={13} />
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                <Input
                  label="Preço de Custo (R$)"
                  type="number"
                  step="0.01"
                  value={precoCusto.toString()}
                  onChange={(e) => setPrecoCusto(parseNumber(e.target.value))}
                />
                <Input
                  label="Preço de Venda (R$)"
                  type="number"
                  step="0.01"
                  value={preco.toString()}
                  onChange={(e) => setPreco(parseNumber(e.target.value))}
                />
                <Input
                  label="Estoque Inicial (UN)"
                  type="number"
                  value={estoque.toString()}
                  onChange={(e) => setEstoque(parseInt(e.target.value, 10) || 0)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
                <Button
                  variant="secondary"
                  size="md"
                  type="button"
                  leftIcon={<X size={15} />}
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancelar (ESC)
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  type="submit"
                  leftIcon={<Check size={16} />}
                >
                  Salvar Produto
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modais de Cadastro Rápido Inline */}
      {isModalMarcaOpen && (
        <ModalCadastroRapidoMarca
          isOpen={isModalMarcaOpen}
          onClose={() => setIsModalMarcaOpen(false)}
          onMarcaCadastrada={(nova) => {
            setMarca(nova.nome);
            showToast(`✅ Marca '${nova.nome}' criada e selecionada!`);
          }}
        />
      )}

      {isModalCatOpen && (
        <ModalCadastroRapidoCategoria
          isOpen={isModalCatOpen}
          onClose={() => setIsModalCatOpen(false)}
          categoriaSelecionadaPrevia={catSelecionadaPrevia}
          onCategoriaCadastrada={(novaCat, novaSub) => {
            setCategoria(novaCat.nome);
            if (novaSub) {
              setSubcategoria(novaSub);
            }
            showToast(`✅ Categoria '${novaCat.nome}' selecionada!`);
          }}
        />
      )}

      {isModalEnderecoOpen && (
        <ModalCadastroRapidoEndereco
          isOpen={isModalEnderecoOpen}
          onClose={() => setIsModalEnderecoOpen(false)}
          onEnderecoCadastrado={(novoEnd) => {
            setLocalizacao(novoEnd.codigoFormatado);
            showToast(`✅ Local '${novoEnd.codigoFormatado}' criado e selecionado!`);
          }}
        />
      )}
    </div>
  );
};
