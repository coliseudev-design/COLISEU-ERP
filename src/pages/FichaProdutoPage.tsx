import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Package,
  Barcode,
  DollarSign,
  TrendingUp,
  Boxes,
  Truck,
  History,
  FileText,
  Save,
  ArrowLeft,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Building2,
  Layers,
  Calculator,
  ShieldCheck,
  Tag,
  Copy,
  Printer,
  Calendar,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { KPICard } from '../components/ui/KPICard';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { formatCurrency, formatDate, formatCnpjCpf } from '../lib/formatters';
import migratedProdutosData from '../data/migrated_produtos.json';
import { FormacaoPrecoPanel } from '../components/fiscal/FormacaoPrecoPanel';
import { getCategorias, getMarcas, CategoriaItem, MarcaItem } from '../lib/classificacoes';
import { getEnderecos, EnderecoItem } from '../lib/enderecos';
import { ModalCadastroRapidoMarca } from '../components/produtos/ModalCadastroRapidoMarca';
import { ModalCadastroRapidoCategoria } from '../components/produtos/ModalCadastroRapidoCategoria';
import { ModalCadastroRapidoEndereco } from '../components/produtos/ModalCadastroRapidoEndereco';
import { MapPin } from 'lucide-react';

export const FichaProdutoPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<
    'dados_gerais' | 'tributacao_entrada' | 'tributacao_saida' | 'formacao_preco' | 'estoque' | 'fornecedores' | 'historico_compras'
  >('dados_gerais');

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const [produto, setProduto] = useState<any>(() => {
    try {
      const custom = localStorage.getItem('coliseu_custom_produtos');
      const customProds = custom ? JSON.parse(custom) : [];
      const todos = [...customProds, ...(Array.isArray(migratedProdutosData) ? migratedProdutosData : [])];
      
      const found = todos.find((p: any) => String(p.id) === String(id) || String(p.sku) === String(id) || String(p.codigo) === String(id));
      if (found) return found;
    } catch { /* fallback */ }

    // Fallback padrão se não encontrar
    return (migratedProdutosData && migratedProdutosData[0]) || {
      id: 'PROD-00001',
      sku: '00001',
      codigo: '0001',
      descricao: 'PRODUTO NÃO ENCONTRADO',
      unidade: 'UN',
      codigoBarras: '',
      ncm: '38140090',
      cest: '',
      precoCusto: 100.0,
      custoMedio: 100.0,
      precoVenda: 180.0,
      precoMinimo: 140.0,
      precoAtacado: 160.0,
      estoqueAtual: 10.0,
      estoqueMinimo: 3.0,
      marca: 'GERAL',
    };
  });

  // Estado dos campos editáveis do produto
  const [formData, setFormData] = useState<any>({
    descricao: produto.descricao || '',
    descricaoCurta: produto.descricaoCurta || produto.descricao || '',
    sku: produto.sku || produto.codigo || '',
    codigoBarras: produto.codigoBarras || produto.ean || '',
    codigoBarrasTributavel: produto.codigoBarrasTributavel || '',
    codigoFabricante: produto.codigoFabricante || '',
    codigoOriginal: produto.codigoOriginal || '',
    marca: produto.marca || '',
    categoria: produto.categoria || 'Geral',
    subcategoria: produto.subcategoria || '',
    unidadeEstoque: produto.unidade || 'UN',
    unidadeCompra: produto.unidadeCompra || 'UN',
    fatorConversaoCompra: produto.fatorConversaoCompra || 1,
    unidadeVenda: produto.unidadeVenda || 'UN',
    fatorConversaoVenda: produto.fatorConversaoVenda || 1,
    pesoLiquido: produto.pesoLiquido || 0,
    pesoBruto: produto.pesoBruto || 0,
    altura: produto.altura || 0,
    largura: produto.largura || 0,
    profundidade: produto.profundidade || 0,
    
    // Tributação Entrada
    ncm: produto.ncm || '38140090',
    cest: produto.cest || '',
    origemMercadoria: produto.origemMercadoria || 0,
    cfopEntradaInterno: produto.cfopEntradaInterno || '1102',
    cfopEntradaExterno: produto.cfopEntradaExterno || '2102',
    cstIcmsEntrada: produto.cstIcmsEntrada || '00',
    aliquotaIcmsEntrada: produto.aliquotaIcmsEntrada || 12,
    cstPisEntrada: produto.cstPisEntrada || '50',
    cstCofinsEntrada: produto.cstCofinsEntrada || '50',
    
    // Tributação Saída
    cfopSaidaInterno: produto.cfopSaidaInterno || '5102',
    cfopSaidaExterno: produto.cfopSaidaExterno || '6102',
    csosnSaida: produto.csosnSaida || '102',
    aliquotaIcmsSaida: produto.aliquotaIcmsSaida || 17,
    cstPisSaida: produto.cstPisSaida || '49',
    cstCofinsSaida: produto.cstCofinsSaida || '49',
    aliquotaPisSaida: produto.aliquotaPisSaida || 0.65,
    aliquotaCofinsSaida: produto.aliquotaCofinsSaida || 3.0,
    aliquotaIpiSaida: produto.aliquotaIpiSaida || 0,
    mvaStPercent: produto.mvaStPercent || 0,
    reducaoBcIcmsPercent: produto.reducaoBcIcmsPercent || 0,
    aliquotaIbptNacional: produto.aliquotaIbptNacional || 13.45,
    aliquotaIbptEstadual: produto.aliquotaIbptEstadual || 17.0,

    // Custos e Preços
    precoCusto: produto.precoCusto || 0,
    custoMedio: produto.custoMedio || produto.precoCusto || 0,
    precoVenda: produto.precoVenda || 0,
    precoMinimo: produto.precoMinimo || (produto.precoVenda ? produto.precoVenda * 0.8 : 0),
    precoAtacado: produto.precoAtacado || (produto.precoVenda ? produto.precoVenda * 0.9 : 0),

    // Estoque
    estoqueAtual: produto.estoqueAtual || 0,
    estoqueMinimo: produto.estoqueMinimo || 3,
    estoqueMaximo: produto.estoqueMaximo || 50,
    pontoPedido: produto.pontoPedido || 5,
    localizacaoDeposito: produto.localizacaoDeposito || 'Rua A - Prateleira 03',
  });

  const [categoriasList, setCategoriasList] = useState<CategoriaItem[]>(getCategorias);
  const [marcasList, setMarcasList] = useState<MarcaItem[]>(getMarcas);
  const [enderecosList, setEnderecosList] = useState<EnderecoItem[]>(getEnderecos);
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

  const subcategoriasDisponiveis = useMemo(() => {
    const cat = categoriasList.find(
      (c) => c.nome.toUpperCase() === (formData.categoria || '').toUpperCase()
    );
    return cat ? cat.subcategorias : [];
  }, [categoriasList, formData.categoria]);

  const updateField = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  // Cálculo da Margem Líquida Real
  const margemLucroReal = useMemo(() => {
    if (!formData.precoVenda || formData.precoVenda <= 0) return 0;
    const custo = formData.precoCusto || 0;
    const deducoes = formData.precoVenda * (0.12 + 0.04 + 0.07 + 0.025); // 25.5% impostos/comissao/custos
    const lucro = formData.precoVenda - custo - deducoes;
    return (lucro / formData.precoVenda) * 100;
  }, [formData.precoVenda, formData.precoCusto]);

  const handleSalvar = () => {
    try {
      const custom = localStorage.getItem('coliseu_custom_produtos');
      const customProds: any[] = custom ? JSON.parse(custom) : [];
      
      const updatedProduct = {
        ...produto,
        ...formData,
        id: produto.id || `PROD-${formData.sku}`,
      };

      const filtrados = customProds.filter((p) => p.sku !== updatedProduct.sku && p.id !== updatedProduct.id);
      filtrados.unshift(updatedProduct);

      localStorage.setItem('coliseu_custom_produtos', JSON.stringify(filtrados));
      setProduto(updatedProduct);
      showToast('✓ Alterações salvas com sucesso no banco de dados!');
    } catch (e) {
      console.error(e);
      showToast('Erro ao salvar produto.');
    }
  };

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

      {/* Navegação Superior */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <button
          type="button"
          onClick={() => navigate('/produtos')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: '12px',
            cursor: 'pointer',
            padding: '4px 0',
          }}
        >
          <ArrowLeft size={16} /> Voltar ao Catálogo de Produtos
        </button>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            variant="secondary"
            onClick={() => showToast('Impressão de etiqueta enviada para fila.')}
            style={{ display: 'inline-flex', gap: '6px', fontSize: '12px' }}
          >
            <Printer size={15} /> Imprimir Etiqueta
          </Button>

          <Button
            variant="primary"
            onClick={handleSalvar}
            style={{ display: 'inline-flex', gap: '6px', fontSize: '12px', fontWeight: 600 }}
          >
            <Save size={15} /> Salvar Alterações
          </Button>
        </div>
      </div>

      {/* Cabeçalho da Ficha */}
      <PageHeader
        title={formData.descricao}
        subtitle={`SKU: ${formData.sku} • EAN/Código de Barras: ${formData.codigoBarras || 'N/D'} • Marca: ${formData.marca || 'Sem Marca'} • 📍 Local: ${formData.localizacaoDeposito || 'NÃO ENDEREÇADO'}`}
        icon={<Package style={{ color: 'var(--primary)', width: '1.5rem', height: '1.5rem' }} />}
      />

      {/* Grid de KPIs do Produto 360° */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          margin: '20px 0',
        }}
      >
        <KPICard
          title="Custo Médio Ponderado (CMP)"
          value={formatCurrency(formData.custoMedio)}
          change={`Última Compra: ${formatCurrency(formData.precoCusto)}`}
          changeType="neutral"
        />

        <KPICard
          title="Preço de Venda (Varejo)"
          value={formatCurrency(formData.precoVenda)}
          change={`Preço Mínimo: ${formatCurrency(formData.precoMinimo)}`}
          changeType="positive"
        />

        <KPICard
          title="Margem Líquida Real"
          value={`${margemLucroReal.toFixed(1)}%`}
          change={margemLucroReal >= 15 ? 'Margem Saudável (Acima da Meta)' : 'Abaixo da Margem Ideal'}
          changeType={margemLucroReal >= 15 ? 'positive' : 'negative'}
        />

        <KPICard
          title="Saldo em Estoque"
          value={`${formData.estoqueAtual} ${formData.unidadeEstoque}`}
          change={`Mínimo: ${formData.estoqueMinimo} | Ponto Pedido: ${formData.pontoPedido}`}
          changeType={formData.estoqueAtual > formData.estoqueMinimo ? 'positive' : 'negative'}
        />
      </div>

      {/* Navegação por Abas da Ficha */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-default)',
          gap: '4px',
          marginBottom: '20px',
          overflowX: 'auto',
        }}
      >
        {[
          { id: 'dados_gerais', label: 'Dados Gerais & Dimensões', icon: Package },
          { id: 'tributacao_entrada', label: 'Tributação de Entrada', icon: ShieldCheck },
          { id: 'tributacao_saida', label: 'Tributação de Saída & NF-e', icon: Tag },
          { id: 'formacao_preco', label: 'Formação de Preço (Waterfall)', icon: TrendingUp },
          { id: 'estoque', label: 'Estoque & Endereçamento', icon: Boxes },
          { id: 'fornecedores', label: 'Fornecedores & De-Para', icon: Building2 },
          { id: 'historico_compras', label: 'Histórico de Entradas XML', icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: '10px 16px',
                fontSize: '12px',
                fontWeight: isActive ? 600 : 500,
                border: 'none',
                borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                backgroundColor: 'transparent',
                color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={15} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* CONTEÚDO DAS ABAS */}
      <div className="coliseu-card" style={{ padding: '24px' }}>
        {/* ABA 1: DADOS GERAIS */}
        {activeTab === 'dados_gerais' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h4 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Identificação do Produto
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="coliseu-label">Descrição Completa</label>
                  <input
                    type="text"
                    value={formData.descricao}
                    onChange={(e) => updateField('descricao', e.target.value)}
                    className="coliseu-input"
                  />
                </div>

                <div>
                  <label className="coliseu-label">Código Interno (SKU)</label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => updateField('sku', e.target.value)}
                    className="coliseu-input"
                    style={{ fontFamily: 'monospace' }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label className="coliseu-label" style={{ margin: 0 }}>Marca / Fabricante</label>
                    <button
                      type="button"
                      onClick={() => setIsModalMarcaOpen(true)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#3b82f6',
                        fontSize: '11px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '2px',
                        fontWeight: 600,
                        padding: 0,
                      }}
                    >
                      <Plus size={12} /> Nova Marca
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <input
                      type="text"
                      list="marcas-datalist"
                      value={formData.marca}
                      onChange={(e) => updateField('marca', e.target.value.toUpperCase())}
                      className="coliseu-input"
                      placeholder="Selecione ou digite a marca..."
                    />
                    <datalist id="marcas-datalist">
                      {marcasList.map((m) => (
                        <option key={m.id} value={m.nome}>
                          {m.fabricante ? `${m.nome} (${m.fabricante})` : m.nome}
                        </option>
                      ))}
                    </datalist>
                    <button
                      type="button"
                      onClick={() => setIsModalMarcaOpen(true)}
                      className="coliseu-btn coliseu-btn-secondary"
                      style={{ padding: '0 8px', height: '38px' }}
                      title="Cadastrar Nova Marca"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="coliseu-label">EAN / Código de Barras (EAN-13)</label>
                  <input
                    type="text"
                    value={formData.codigoBarras}
                    onChange={(e) => updateField('codigoBarras', e.target.value)}
                    className="coliseu-input"
                    style={{ fontFamily: 'monospace' }}
                  />
                </div>

                <div>
                  <label className="coliseu-label">GTIN Tributável (se diferente)</label>
                  <input
                    type="text"
                    value={formData.codigoBarrasTributavel}
                    onChange={(e) => updateField('codigoBarrasTributavel', e.target.value)}
                    className="coliseu-input"
                    placeholder="Opcional"
                  />
                </div>

                <div>
                  <label className="coliseu-label">Cód. Referência Fabricante</label>
                  <input
                    type="text"
                    value={formData.codigoFabricante}
                    onChange={(e) => updateField('codigoFabricante', e.target.value)}
                    className="coliseu-input"
                  />
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
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#3b82f6',
                        fontSize: '11px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '2px',
                        fontWeight: 600,
                        padding: 0,
                      }}
                    >
                      <Plus size={12} /> Nova Categoria
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <select
                      value={formData.categoria}
                      onChange={(e) => {
                        updateField('categoria', e.target.value);
                        updateField('subcategoria', '');
                      }}
                      className="coliseu-input"
                    >
                      <option value="">Selecione uma categoria...</option>
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
                      style={{ padding: '0 8px', height: '38px' }}
                      title="Cadastrar Nova Categoria"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label className="coliseu-label" style={{ margin: 0 }}>Subcategoria / Subgrupo</label>
                    <button
                      type="button"
                      onClick={() => {
                        setCatSelecionadaPrevia(formData.categoria);
                        setIsModalCatOpen(true);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#3b82f6',
                        fontSize: '11px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '2px',
                        fontWeight: 600,
                        padding: 0,
                      }}
                    >
                      <Plus size={12} /> Nova Subcategoria
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <select
                      value={formData.subcategoria || ''}
                      onChange={(e) => updateField('subcategoria', e.target.value)}
                      className="coliseu-input"
                    >
                      <option value="">Selecione a subcategoria...</option>
                      {subcategoriasDisponiveis.map((sub, idx) => (
                        <option key={idx} value={sub}>
                          {sub}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        setCatSelecionadaPrevia(formData.categoria);
                        setIsModalCatOpen(true);
                      }}
                      className="coliseu-btn coliseu-btn-secondary"
                      style={{ padding: '0 8px', height: '38px' }}
                      title="Cadastrar Nova Subcategoria nesta Categoria"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
              <h4 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Unidades de Medida & Fatores de Conversão
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                <div>
                  <label className="coliseu-label">Unidade de Estoque Padrão</label>
                  <select
                    value={formData.unidadeEstoque}
                    onChange={(e) => updateField('unidadeEstoque', e.target.value)}
                    className="coliseu-input"
                  >
                    <option value="UN">UN - Unidade</option>
                    <option value="PC">PC - Peça</option>
                    <option value="KG">KG - Quilograma</option>
                    <option value="M">M - Metro</option>
                    <option value="L">L - Litro</option>
                    <option value="GL">GL - Galão</option>
                    <option value="CX">CX - Caixa</option>
                  </select>
                </div>

                <div>
                  <label className="coliseu-label">Unidade Padrão de Compra</label>
                  <select
                    value={formData.unidadeCompra}
                    onChange={(e) => updateField('unidadeCompra', e.target.value)}
                    className="coliseu-input"
                  >
                    <option value="CX">CX - Caixa</option>
                    <option value="FD">FD - Fardo</option>
                    <option value="PCT">PCT - Pacote</option>
                    <option value="UN">UN - Unidade</option>
                  </select>
                </div>

                <div>
                  <label className="coliseu-label">Fator Conversão Compra (1 Compra = X Estoque)</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.fatorConversaoCompra}
                    onChange={(e) => updateField('fatorConversaoCompra', parseFloat(e.target.value) || 1)}
                    className="coliseu-input"
                  />
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
              <h4 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Pesos e Dimensões Logísticas
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px' }}>
                <div>
                  <label className="coliseu-label">Peso Líquido (kg)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={formData.pesoLiquido}
                    onChange={(e) => updateField('pesoLiquido', parseFloat(e.target.value) || 0)}
                    className="coliseu-input"
                  />
                </div>
                <div>
                  <label className="coliseu-label">Peso Bruto (kg)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={formData.pesoBruto}
                    onChange={(e) => updateField('pesoBruto', parseFloat(e.target.value) || 0)}
                    className="coliseu-input"
                  />
                </div>
                <div>
                  <label className="coliseu-label">Altura (cm)</label>
                  <input
                    type="number"
                    value={formData.altura}
                    onChange={(e) => updateField('altura', parseFloat(e.target.value) || 0)}
                    className="coliseu-input"
                  />
                </div>
                <div>
                  <label className="coliseu-label">Largura (cm)</label>
                  <input
                    type="number"
                    value={formData.largura}
                    onChange={(e) => updateField('largura', parseFloat(e.target.value) || 0)}
                    className="coliseu-input"
                  />
                </div>
                <div>
                  <label className="coliseu-label">Profundidade (cm)</label>
                  <input
                    type="number"
                    value={formData.profundidade}
                    onChange={(e) => updateField('profundidade', parseFloat(e.target.value) || 0)}
                    className="coliseu-input"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ABA 2: TRIBUTAÇÃO DE ENTRADA */}
        {activeTab === 'tributacao_entrada' && (
          <div>
            <h4 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Regras Fiscais de Aquisição / Entrada
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
              <div>
                <label className="coliseu-label">Classificação NCM (8 dígitos)</label>
                <input
                  type="text"
                  value={formData.ncm}
                  onChange={(e) => updateField('ncm', e.target.value)}
                  className="coliseu-input"
                  style={{ fontFamily: 'monospace' }}
                />
              </div>

              <div>
                <label className="coliseu-label">CEST (Substituição Tributária)</label>
                <input
                  type="text"
                  value={formData.cest}
                  onChange={(e) => updateField('cest', e.target.value)}
                  className="coliseu-input"
                  style={{ fontFamily: 'monospace' }}
                />
              </div>

              <div>
                <label className="coliseu-label">Origem da Mercadoria</label>
                <select
                  value={formData.origemMercadoria}
                  onChange={(e) => updateField('origemMercadoria', parseInt(e.target.value))}
                  className="coliseu-input"
                >
                  <option value={0}>0 - Nacional</option>
                  <option value={1}>1 - Estrangeira (Importação Direta)</option>
                  <option value={2}>2 - Estrangeira (Adquirida no Mercado Interno)</option>
                  <option value={5}>5 - Nacional com Conteúdo Importado &gt; 40%</option>
                </select>
              </div>

              <div>
                <label className="coliseu-label">CFOP Entrada Estadual (Dentro UF)</label>
                <input
                  type="text"
                  value={formData.cfopEntradaInterno}
                  onChange={(e) => updateField('cfopEntradaInterno', e.target.value)}
                  className="coliseu-input"
                  style={{ fontFamily: 'monospace' }}
                />
              </div>

              <div>
                <label className="coliseu-label">CFOP Entrada Interestadual (Fora UF)</label>
                <input
                  type="text"
                  value={formData.cfopEntradaExterno}
                  onChange={(e) => updateField('cfopEntradaExterno', e.target.value)}
                  className="coliseu-input"
                  style={{ fontFamily: 'monospace' }}
                />
              </div>

              <div>
                <label className="coliseu-label">CST ICMS Entrada</label>
                <input
                  type="text"
                  value={formData.cstIcmsEntrada}
                  onChange={(e) => updateField('cstIcmsEntrada', e.target.value)}
                  className="coliseu-input"
                />
              </div>
            </div>
          </div>
        )}

        {/* ABA 3: TRIBUTAÇÃO DE SAÍDA */}
        {activeTab === 'tributacao_saida' && (
          <div>
            <h4 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Regras Fiscais de Venda / Emissão de NF-e & NFC-e
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
              <div>
                <label className="coliseu-label">CFOP Saída Dentro do Estado</label>
                <input
                  type="text"
                  value={formData.cfopSaidaInterno}
                  onChange={(e) => updateField('cfopSaidaInterno', e.target.value)}
                  className="coliseu-input"
                  style={{ fontFamily: 'monospace' }}
                />
              </div>

              <div>
                <label className="coliseu-label">CFOP Saída Interestadual</label>
                <input
                  type="text"
                  value={formData.cfopSaidaExterno}
                  onChange={(e) => updateField('cfopSaidaExterno', e.target.value)}
                  className="coliseu-input"
                  style={{ fontFamily: 'monospace' }}
                />
              </div>

              <div>
                <label className="coliseu-label">CSOSN ICMS (Simples) / CST</label>
                <input
                  type="text"
                  value={formData.csosnSaida}
                  onChange={(e) => updateField('csosnSaida', e.target.value)}
                  className="coliseu-input"
                />
              </div>

              <div>
                <label className="coliseu-label">Alíquota ICMS Saída (%)</label>
                <input
                  type="number"
                  value={formData.aliquotaIcmsSaida}
                  onChange={(e) => updateField('aliquotaIcmsSaida', parseFloat(e.target.value) || 0)}
                  className="coliseu-input"
                />
              </div>

              <div>
                <label className="coliseu-label">CST PIS Saída</label>
                <input
                  type="text"
                  value={formData.cstPisSaida}
                  onChange={(e) => updateField('cstPisSaida', e.target.value)}
                  className="coliseu-input"
                />
              </div>

              <div>
                <label className="coliseu-label">CST COFINS Saída</label>
                <input
                  type="text"
                  value={formData.cstCofinsSaida}
                  onChange={(e) => updateField('cstCofinsSaida', e.target.value)}
                  className="coliseu-input"
                />
              </div>

              <div>
                <label className="coliseu-label">MVA Substituição Tributária (%)</label>
                <input
                  type="number"
                  value={formData.mvaStPercent}
                  onChange={(e) => updateField('mvaStPercent', parseFloat(e.target.value) || 0)}
                  className="coliseu-input"
                />
              </div>

              <div>
                <label className="coliseu-label">Tributação Aprox. IBPT (%)</label>
                <input
                  type="number"
                  value={formData.aliquotaIbptNacional}
                  onChange={(e) => updateField('aliquotaIbptNacional', parseFloat(e.target.value) || 0)}
                  className="coliseu-input"
                />
              </div>
            </div>
          </div>
        )}

        {/* ABA 4: FORMAÇÃO DE PREÇO (WATERFALL) */}
        {activeTab === 'formacao_preco' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <FormacaoPrecoPanel
              custoRealAquisicao={formData.precoCusto}
              precoVendaAtual={formData.precoVenda}
              onPrecoCalculadoChange={(novoPreco, margem, precoMin) => {
                updateField('precoVenda', novoPreco);
                updateField('precoMinimo', precoMin);
              }}
            />

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
              <h4 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Tabelas de Preço de Venda
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                <div>
                  <label className="coliseu-label">Preço Varejo (Balcão Padrão)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.precoVenda}
                    onChange={(e) => updateField('precoVenda', parseFloat(e.target.value) || 0)}
                    className="coliseu-input"
                    style={{ fontWeight: 700, color: '#10b981', fontSize: '14px' }}
                  />
                </div>

                <div>
                  <label className="coliseu-label">Preço Atacado / Profissional</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.precoAtacado}
                    onChange={(e) => updateField('precoAtacado', parseFloat(e.target.value) || 0)}
                    className="coliseu-input"
                    style={{ fontWeight: 600 }}
                  />
                </div>

                <div>
                  <label className="coliseu-label">Preço Mínimo Autorizado (Piso)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.precoMinimo}
                    onChange={(e) => updateField('precoMinimo', parseFloat(e.target.value) || 0)}
                    className="coliseu-input"
                    style={{ fontWeight: 600, color: '#ef4444' }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ABA 5: ESTOQUE & ENDEREÇAMENTO WMS */}
        {activeTab === 'estoque' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Bloco 1: Endereçamento Físico WMS */}
            <div
              style={{
                padding: '16px',
                backgroundColor: 'var(--surface-2)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MapPin size={17} style={{ color: '#10b981' }} />
                  <div>
                    <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Localização Física do Produto (WMS / Armazenagem)
                    </h4>
                    <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>
                      Define a localização exata no galpão/loja para conferências, contagem de balanço e picking de vendas.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsModalEnderecoOpen(true)}
                  className="coliseu-btn coliseu-btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', padding: '5px 10px', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.4)' }}
                >
                  <Plus size={13} /> + Novo Local
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '14px', alignItems: 'flex-start' }}>
                <div>
                  <label className="coliseu-label">Selecione ou Digite a Localização Cadastrada</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type="text"
                      list="enderecos-disponiveis-list"
                      value={formData.localizacaoDeposito}
                      onChange={(e) => updateField('localizacaoDeposito', e.target.value.toUpperCase())}
                      className="coliseu-input"
                      placeholder="Ex: DEPÓSITO - RUA A - PRATELEIRA 01"
                      style={{ height: '38px', fontWeight: 600 }}
                    />
                    <datalist id="enderecos-disponiveis-list">
                      {enderecosList.map((end) => (
                        <option key={end.id} value={end.codigoFormatado} />
                      ))}
                    </datalist>

                    <button
                      type="button"
                      onClick={() => setIsModalEnderecoOpen(true)}
                      className="coliseu-btn coliseu-btn-secondary"
                      style={{ padding: '0 10px', height: '38px' }}
                      title="Cadastrar Novo Endereço Físico"
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                </div>

                {/* Badge Visual do Endereço Formatado */}
                <div
                  style={{
                    padding: '10px 14px',
                    backgroundColor: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    borderRadius: '6px',
                    height: '38px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: '23px',
                  }}
                >
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Local Atual:</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#10b981', fontFamily: 'monospace' }}>
                    📍 {formData.localizacaoDeposito || 'NÃO DEFINIDO'}
                  </span>
                </div>
              </div>
            </div>

            {/* Bloco 2: Parâmetros e Níveis de Estoque */}
            <div>
              <h4 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Parâmetros de Quantidade & Níveis Críticos
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
                <div>
                  <label className="coliseu-label">Saldo Atual em Estoque</label>
                  <input
                    type="number"
                    value={formData.estoqueAtual}
                    onChange={(e) => updateField('estoqueAtual', parseFloat(e.target.value) || 0)}
                    className="coliseu-input"
                    style={{ fontWeight: 700, fontSize: '14px', color: formData.estoqueAtual <= formData.estoqueMinimo ? '#ef4444' : 'var(--text-primary)' }}
                  />
                </div>

                <div>
                  <label className="coliseu-label">Estoque Mínimo (Alerta de Falta)</label>
                  <input
                    type="number"
                    value={formData.estoqueMinimo}
                    onChange={(e) => updateField('estoqueMinimo', parseFloat(e.target.value) || 0)}
                    className="coliseu-input"
                  />
                </div>

                <div>
                  <label className="coliseu-label">Ponto de Pedido (Sugestão Compra)</label>
                  <input
                    type="number"
                    value={formData.pontoPedido}
                    onChange={(e) => updateField('pontoPedido', parseFloat(e.target.value) || 0)}
                    className="coliseu-input"
                  />
                </div>

                <div>
                  <label className="coliseu-label">Estoque Máximo (Teto)</label>
                  <input
                    type="number"
                    value={formData.estoqueMaximo || 100}
                    onChange={(e) => updateField('estoqueMaximo', parseFloat(e.target.value) || 0)}
                    className="coliseu-input"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ABA 6: FORNECEDORES & DE-PARA */}
        {activeTab === 'fornecedores' && (
          <div>
            <h4 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Amarração Fornecedor × Produto (De-Para Salvo)
            </h4>
            <div style={{ border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
              <table className="coliseu-table" style={{ fontSize: '12px' }}>
                <thead>
                  <tr>
                    <th>Fornecedor</th>
                    <th>CNPJ</th>
                    <th>Cód. no Fornecedor</th>
                    <th>Fator Conversão</th>
                    <th style={{ textAlign: 'right' }}>Último Custo</th>
                    <th>Data Última Compra</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: 600 }}>{formData.marca || 'FORNECEDOR PRINCIPAL'}</td>
                    <td style={{ fontFamily: 'monospace' }}>03.857.766/0001-85</td>
                    <td style={{ fontFamily: 'monospace', color: '#3b82f6' }}>{formData.codigoFabricante || formData.sku}</td>
                    <td>1 CX = {formData.fatorConversaoCompra} {formData.unidadeEstoque}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#10b981', fontFamily: 'monospace' }}>
                      {formatCurrency(formData.precoCusto)}
                    </td>
                    <td>15/01/2026</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ABA 7: HISTÓRICO DE ENTRADAS XML */}
        {activeTab === 'historico_compras' && (
          <div>
            <h4 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Histórico das Últimas Entradas por NF-e
            </h4>
            <div style={{ border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
              <table className="coliseu-table" style={{ fontSize: '12px' }}>
                <thead>
                  <tr>
                    <th>NF-e / Série</th>
                    <th>Emissão</th>
                    <th>Fornecedor</th>
                    <th style={{ textAlign: 'right' }}>Qtd Entrada</th>
                    <th style={{ textAlign: 'right' }}>Vl. Bruto NF</th>
                    <th style={{ textAlign: 'right' }}>Custo Real/UN</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>NF-e 19783 / 1</td>
                    <td>08/01/2026</td>
                    <td>RANCHAO MATERIAIS PARA CONSTRUCAO LTDA</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>4 UN</td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{formatCurrency(formData.precoCusto)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#10b981', fontFamily: 'monospace' }}>
                      {formatCurrency(formData.precoCusto)}
                    </td>
                    <td><StatusBadge status="Concluído" label="Processado" /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modais de Cadastro Rápido Inline */}
      {isModalMarcaOpen && (
        <ModalCadastroRapidoMarca
          isOpen={isModalMarcaOpen}
          onClose={() => setIsModalMarcaOpen(false)}
          onMarcaCadastrada={(nova) => {
            updateField('marca', nova.nome);
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
            updateField('categoria', novaCat.nome);
            if (novaSub) {
              updateField('subcategoria', novaSub);
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
            updateField('localizacaoDeposito', novoEnd.codigoFormatado);
            showToast(`✅ Local '${novoEnd.codigoFormatado}' criado e selecionado!`);
          }}
        />
      )}
    </div>
  );
};
