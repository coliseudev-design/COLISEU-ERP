import React, { useState, useMemo } from 'react';
import {
  Search,
  Link,
  Package,
  CheckCircle2,
  X,
  Plus,
  Building2,
  ArrowRight,
  Calculator,
  AlertCircle,
} from 'lucide-react';
import { formatCurrency } from '../../lib/formatters';

export interface AmarracaoFornecedor {
  id: string;
  fornecedorCnpj: string;
  fornecedorNome: string;
  codigoProdutoFornecedor: string;
  descricaoProdutoFornecedor: string;
  eanFornecedor?: string;
  unidadeFornecedor: string;
  produtoInternoId: string;
  produtoInternoSku: string;
  produtoInternoNome: string;
  unidadeEstoque: string;
  fatorConversao: number; // Ex: 1 Caixa = 12 Unidades -> Fator 12
  ultimoPrecoCompra: number;
  dataUltimaCompra: string;
}

interface AmarracaoFornecedorModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemXml: {
    codigoFornecedor: string;
    descricao: string;
    ean?: string;
    unidade: string;
    valorUnitario: number;
    quantidade: number;
  } | null;
  fornecedorCnpj: string;
  fornecedorNome: string;
  catalogoProdutos: any[];
  onConfirmarVinculo: (vinculo: {
    produtoInternoId: string;
    produtoInternoSku: string;
    produtoInternoNome: string;
    fatorConversao: number;
    unidadeEstoque: string;
  }) => void;
}

export const AmarracaoFornecedorModal: React.FC<AmarracaoFornecedorModalProps> = ({
  isOpen,
  onClose,
  itemXml,
  fornecedorCnpj,
  fornecedorNome,
  catalogoProdutos,
  onConfirmarVinculo,
}) => {
  const [busca, setBusca] = useState('');
  const [produtoSelecionado, setProdutoSelecionado] = useState<any | null>(null);
  const [fatorConversao, setFatorConversao] = useState<number>(1);
  const [unidadeEstoque, setUnidadeEstoque] = useState<string>('UN');

  // Ao selecionar um produto do catálogo, inicializa unidade de estoque
  const handleSelectProduto = (prod: any) => {
    setProdutoSelecionado(prod);
    setUnidadeEstoque(prod.unidade || 'UN');
    // Se a unidade do XML for CX ou FD, sugere fator de conversão
    if (itemXml?.unidade.toUpperCase() === 'CX' || itemXml?.unidade.toUpperCase() === 'FD') {
      setFatorConversao(12);
    } else {
      setFatorConversao(1);
    }
  };

  // Filtragem no catálogo com busca multi-critério
  const produtosFiltrados = useMemo(() => {
    const q = busca.toLowerCase().trim();
    if (!q) return catalogoProdutos.slice(0, 20);

    return catalogoProdutos
      .filter((p: any) => {
        const desc = String(p.descricao || '').toLowerCase();
        const sku = String(p.sku || p.codigo || '').toLowerCase();
        const ean = String(p.codigoBarras || p.ean || '').toLowerCase();
        const marca = String(p.marca || '').toLowerCase();
        return desc.includes(q) || sku.includes(q) || ean.includes(q) || marca.includes(q);
      })
      .slice(0, 30);
  }, [catalogoProdutos, busca]);

  if (!isOpen || !itemXml) return null;

  const custoUnitarioConvertido =
    fatorConversao > 0 ? itemXml.valorUnitario / fatorConversao : itemXml.valorUnitario;
  const quantidadeEstoqueConvertida = itemXml.quantidade * (fatorConversao || 1);

  const handleSalvar = () => {
    if (!produtoSelecionado) return;

    // Persistir amarração permanente no LocalStorage (ou backend)
    try {
      const saved = localStorage.getItem('coliseu_amarracoes_fornecedores');
      const amarracoes: AmarracaoFornecedor[] = saved ? JSON.parse(saved) : [];
      const cnpjClean = fornecedorCnpj.replace(/\D/g, '');

      const novaAmarracao: AmarracaoFornecedor = {
        id: `AMARR-${Date.now()}`,
        fornecedorCnpj: cnpjClean,
        fornecedorNome,
        codigoProdutoFornecedor: itemXml.codigoFornecedor,
        descricaoProdutoFornecedor: itemXml.descricao,
        eanFornecedor: itemXml.ean,
        unidadeFornecedor: itemXml.unidade,
        produtoInternoId: produtoSelecionado.id || `PROD-${produtoSelecionado.sku}`,
        produtoInternoSku: produtoSelecionado.sku || produtoSelecionado.codigo,
        produtoInternoNome: produtoSelecionado.descricao,
        unidadeEstoque,
        fatorConversao: fatorConversao || 1,
        ultimoPrecoCompra: itemXml.valorUnitario,
        dataUltimaCompra: new Date().toISOString(),
      };

      const filtradas = amarracoes.filter(
        (a) => !(a.fornecedorCnpj === cnpjClean && a.codigoProdutoFornecedor === itemXml.codigoFornecedor)
      );
      filtradas.unshift(novaAmarracao);
      localStorage.setItem('coliseu_amarracoes_fornecedores', JSON.stringify(filtradas));

      // Também salvar mapeamento simples de-para
      const dePara = JSON.parse(localStorage.getItem('coliseu_depara_mappings') || '{}');
      dePara[`${cnpjClean}_${itemXml.codigoFornecedor}`] = produtoSelecionado.sku || produtoSelecionado.codigo;
      localStorage.setItem('coliseu_depara_mappings', JSON.stringify(dePara));
    } catch (e) {
      console.error('Erro ao salvar amarração:', e);
    }

    onConfirmarVinculo({
      produtoInternoId: produtoSelecionado.id || `PROD-${produtoSelecionado.sku}`,
      produtoInternoSku: produtoSelecionado.sku || produtoSelecionado.codigo,
      produtoInternoNome: produtoSelecionado.descricao,
      fatorConversao: fatorConversao || 1,
      unidadeEstoque,
    });

    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(3px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '860px',
          maxHeight: '90vh',
          backgroundColor: 'var(--surface-1)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Cabeçalho */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-default)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--surface-2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                color: '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Link size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Amarração de Produto & Conversão de Embalagem (De-Para)
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                Vincule o item da nota a um produto do catálogo e defina a regra de conversão de estoque.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div style={{ padding: '18px 20px', overflowY: 'auto', flex: 1 }}>
          {/* Card do Produto no XML do Fornecedor */}
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: 'rgba(59, 130, 246, 0.06)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '16px',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#3b82f6', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Building2 size={14} /> ITEM NO XML DO FORNECEDOR ({fornecedorNome})
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 140px 100px 100px', gap: '10px', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>Cód. Fornecedor:</span>
                <span style={{ fontSize: '12px', fontWeight: 600, fontFamily: 'monospace' }}>{itemXml.codigoFornecedor}</span>
              </div>
              <div>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>Descrição na Nota:</span>
                <span style={{ fontSize: '12px', fontWeight: 600 }}>{itemXml.descricao}</span>
              </div>
              <div>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>EAN/Código Barras:</span>
                <span style={{ fontSize: '12px', fontFamily: 'monospace' }}>{itemXml.ean || 'SEM GTIN'}</span>
              </div>
              <div>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>Qtd / Unidade:</span>
                <span style={{ fontSize: '12px', fontWeight: 600 }}>{itemXml.quantidade} {itemXml.unidade}</span>
              </div>
              <div>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>Valor Unit. NF:</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#10b981' }}>{formatCurrency(itemXml.valorUnitario)}</span>
              </div>
            </div>
          </div>

          {/* Busca no Catálogo Interno */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
              1. Selecione o Produto Correspondente no Catálogo do Coliseu ERP:
            </label>
            <div style={{ position: 'relative' }}>
              <Search
                size={16}
                style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }}
              />
              <input
                type="text"
                placeholder="Pesquisar por descrição, SKU, código de barras ou marca..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="coliseu-input"
                style={{ paddingLeft: '32px', height: '36px', fontSize: '12px' }}
                autoFocus
              />
            </div>
          </div>

          {/* Lista de Produtos do Catálogo */}
          <div
            style={{
              maxHeight: '180px',
              overflowY: 'auto',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--surface-2)',
              marginBottom: '16px',
            }}
          >
            {produtosFiltrados.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                Nenhum produto encontrado no catálogo com o termo "{busca}".
              </div>
            ) : (
              produtosFiltrados.map((p: any) => {
                const isSelected = produtoSelecionado && (produtoSelecionado.sku === p.sku || produtoSelecionado.id === p.id);
                return (
                  <div
                    key={p.id || p.sku}
                    onClick={() => handleSelectProduto(p)}
                    style={{
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottom: '1px solid var(--border-subtle)',
                      backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                      cursor: 'pointer',
                      fontSize: '12px',
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          border: isSelected ? '5px solid #3b82f6' : '1px solid var(--border-default)',
                          backgroundColor: isSelected ? '#fff' : 'transparent',
                        }}
                      />
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.descricao}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          SKU: <span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{p.sku || p.codigo}</span> | EAN: {p.codigoBarras || p.ean || 'N/D'} | Marca: {p.marca || 'Sem Marca'}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 600, color: '#10b981' }}>{formatCurrency(p.precoVenda || 0)}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Estoque: {p.estoqueAtual || 0} {p.unidade || 'UN'}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Seção de Regra de Conversão de Embalagem (Fator de Conversão) */}
          {produtoSelecionado && (
            <div
              style={{
                padding: '14px',
                backgroundColor: 'var(--surface-2)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calculator size={16} color="#10b981" /> 2. Regra de Conversão de Embalagem (Ex: Caixa para Unidade):
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 1fr 40px 1.2fr', gap: '8px', alignItems: 'center' }}>
                {/* Unidade Fornecedor */}
                <div>
                  <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Unidade da Nota (Entrada)
                  </label>
                  <input
                    type="text"
                    value={`1 ${itemXml.unidade.toUpperCase()}`}
                    disabled
                    className="coliseu-input"
                    style={{ height: '34px', fontSize: '12px', fontWeight: 600, backgroundColor: 'var(--surface-3)' }}
                  />
                </div>

                <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '16px', color: 'var(--text-muted)' }}>=</div>

                {/* Fator Multiplicador */}
                <div>
                  <label style={{ display: 'block', fontSize: '10px', color: '#10b981', fontWeight: 600, marginBottom: '4px' }}>
                    Fator Multiplicador (Qtd por embalagem)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={fatorConversao}
                    onChange={(e) => setFatorConversao(Math.max(1, parseInt(e.target.value) || 1))}
                    className="coliseu-input"
                    style={{ height: '34px', fontSize: '13px', fontWeight: 700, textAlign: 'center', borderColor: '#10b981' }}
                  />
                </div>

                <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '16px', color: 'var(--text-muted)' }}>×</div>

                {/* Unidade Estoque Interno */}
                <div>
                  <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Unidade no Estoque
                  </label>
                  <select
                    value={unidadeEstoque}
                    onChange={(e) => setUnidadeEstoque(e.target.value)}
                    className="coliseu-input"
                    style={{ height: '34px', fontSize: '12px', fontWeight: 600 }}
                  >
                    <option value="UN">UN - Unidade</option>
                    <option value="PC">PC - Peça</option>
                    <option value="KG">KG - Quilograma</option>
                    <option value="M">M - Metro</option>
                    <option value="L">L - Litro</option>
                    <option value="CX">CX - Caixa</option>
                    <option value="PAR">PAR - Par</option>
                  </select>
                </div>
              </div>

              {/* Prévia do Custo Unitário e Saldo de Estoque */}
              <div
                style={{
                  marginTop: '12px',
                  padding: '8px 12px',
                  backgroundColor: 'rgba(16, 185, 129, 0.08)',
                  borderRadius: '4px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '11px',
                }}
              >
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Impacto na Entrada: </span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    Entrarão <strong>{quantidadeEstoqueConvertida} {unidadeEstoque}</strong> no estoque
                  </span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Novo Custo Unitário Líquido: </span>
                  <span style={{ fontWeight: 700, color: '#10b981', fontSize: '12px' }}>
                    {formatCurrency(custoUnitarioConvertido)} / {unidadeEstoque}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--border-default)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--surface-2)',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="coliseu-btn coliseu-btn-secondary"
            style={{ padding: '8px 16px', fontSize: '12px' }}
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSalvar}
            disabled={!produtoSelecionado}
            className="coliseu-btn coliseu-btn-primary"
            style={{
              padding: '8px 20px',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              opacity: produtoSelecionado ? 1 : 0.5,
              cursor: produtoSelecionado ? 'pointer' : 'not-allowed',
            }}
          >
            <CheckCircle2 size={16} /> Confirmar Vínculo & Salvar Regra
          </button>
        </div>
      </div>
    </div>
  );
};
