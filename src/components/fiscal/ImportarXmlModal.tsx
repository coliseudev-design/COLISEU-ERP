import React, { useState, useRef, useMemo } from 'react';
import { Button } from '../ui/Button';
import { StatusBadge } from '../ui/StatusBadge';
import { formatCurrency, formatDate, formatCnpjCpf, parseNumber } from '../../lib/formatters';
import migratedProdutosData from '../../data/migrated_produtos.json';
import { FormacaoPrecoPanel, PARAMETROS_PRECIFICACAO_PADRAO, ParametrosPrecificacao } from './FormacaoPrecoPanel';
import { AmarracaoFornecedorModal } from './AmarracaoFornecedorModal';
import {
  X,
  Upload,
  KeyRound,
  FileCode,
  CheckCircle2,
  Search,
  AlertTriangle,
  Building,
  Package,
  Calendar,
  DollarSign,
  FileText,
  Copy,
  Check,
  Loader2,
  ArrowRight,
  Sparkles,
  Link,
  PlusCircle,
  FolderOpen,
  Calculator,
  Sliders,
  TrendingUp,
  Percent,
  Layers,
  HelpCircle,
} from 'lucide-react';

export interface ItemNotaFiscalXml {
  seq: number;
  codigoFornecedor: string;
  ean: string;
  descricao: string;
  ncm: string;
  cfop: string;
  unidade: string;
  unidadeEstoque: string;
  fatorConversao: number;
  quantidade: number;
  quantidadeEstoque: number;
  valorUnitario: number;
  valorTotal: number;
  
  // Encargos e Tributos Rateados
  valorFreteItem: number;
  valorSeguroItem: number;
  valorOutroItem: number;
  valorIpiItem: number;
  valorIcmsStItem: number;
  valorDescontoItem: number;
  creditosFiscaisItem: number;
  
  // Custos Calculados
  custoRealUnitario: number;
  custoMedioAnterior: number;
  custoMedioNovo: number;
  estoqueAnterior: number;
  variacaoCustoPercent: number;
  
  // Precificação
  margemLucroPercent: number; // Margem de Lucro Líquida Real (%)
  precoVendaSugerido: number;
  precoMinimo: number;
  
  // De-Para
  statusDePara: 'Novo Produto' | 'Vinculado';
  produtoVinculadoId?: string;
  produtoVinculadoSku?: string;
  produtoVinculadoNome?: string;
}

export interface ParcelaNotaFiscalXml {
  numero: string;
  vencimento: string;
  valor: number;
}

export interface EncargosEntrada {
  valorFrete: number;
  valorSeguro: number;
  valorOutrasDesp: number;
  valorIpi: number;
  valorIcmsSt: number;
  valorDesconto: number;
  regimeTributario: 'simples' | 'lucro_presumido' | 'lucro_real';
  criterioRateio: 'valor' | 'quantidade';
}

export interface NotaFiscalXmlParsed {
  chave: string;
  numero: string;
  serie: string;
  naturezaOperacao: string;
  dataEmissao: string;
  fornecedorNome: string;
  fornecedorCnpj: string;
  fornecedorUf: string;
  fornecedorCidade: string;
  fornecedorIe?: string;
  destinatarioNome: string;
  destinatarioCnpj: string;
  valorProdutos: number;
  encargos: EncargosEntrada;
  valorTotal: number;
  itens: ItemNotaFiscalXml[];
  parcelas: ParcelaNotaFiscalXml[];
  xmlRaw?: string;
}

export interface ImportarXmlModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmarImportacao: (nota: NotaFiscalXmlParsed) => void;
}

// Helpers seguros para parser
const safeText = (element: Element | Document | null, tagName: string, fallback = ''): string => {
  if (!element) return fallback;
  try {
    const nodes = element.getElementsByTagName(tagName);
    if (nodes && nodes.length > 0 && nodes[0]?.textContent) {
      return nodes[0].textContent.trim();
    }
  } catch { /* fallback */ }
  return fallback;
};

const safeNum = (val: string | null | undefined, fallback = 0): number => {
  if (!val) return fallback;
  try {
    const clean = val.replace(/[^\d.,-]/g, '').replace(',', '.');
    const n = parseFloat(clean);
    return isNaN(n) ? fallback : n;
  } catch {
    return fallback;
  }
};

export const ImportarXmlModal: React.FC<ImportarXmlModalProps> = ({
  isOpen,
  onClose,
  onConfirmarImportacao,
}) => {
  const [importMode, setImportMode] = useState<'arquivo' | 'chave'>('arquivo');
  
  // Estado do Arquivo
  const [dragActive, setDragActive] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [selectedFileSize, setSelectedFileSize] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Estado da Chave
  const [chaveInput, setChaveInput] = useState('');
  const [isConsultandoSefaz, setIsConsultandoSefaz] = useState(false);
  const [sefazStatusText, setSefazStatusText] = useState('');
  const [copiedKey, setCopiedKey] = useState(false);

  // Estado dos Dados Parseados
  const [notaParseada, setNotaParseada] = useState<NotaFiscalXmlParsed | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'itens' | 'custos' | 'duplicatas' | 'totais'>('itens');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modais Secundários
  const [itemParaAmarração, setItemParaAmarração] = useState<ItemNotaFiscalXml | null>(null);
  const [itemParaPrecificar, setItemParaPrecificar] = useState<ItemNotaFiscalXml | null>(null);
  const [simulacaoAtual, setSimulacaoAtual] = useState<{
    novoPreco: number;
    margem: number;
    precoMinimo: number;
    params: ParametrosPrecificacao;
  } | null>(null);
  const [margemLoteInput, setMargemLoteInput] = useState<number>(20);

  // Carregar Catálogo de Produtos para Matching Real
  const catalogoProdutos = useMemo(() => {
    try {
      const custom = localStorage.getItem('coliseu_custom_produtos');
      const customProds = custom ? JSON.parse(custom) : [];
      const base = Array.isArray(migratedProdutosData) ? migratedProdutosData : [];
      return [...base, ...(Array.isArray(customProds) ? customProds : [])];
    } catch {
      return Array.isArray(migratedProdutosData) ? migratedProdutosData : [];
    }
  }, []);

  // Carregar Mapeamentos De-Para Salvos
  const deParaMappings = useMemo<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('coliseu_depara_mappings');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  }, []);

  // MOTOR DE CUSTO REAL (LANDED COST ENGINE) AUDITADO
  const recalcularCustosItens = (
    itensBase: ItemNotaFiscalXml[],
    encargos: EncargosEntrada,
    valorTotalProdutos: number
  ): ItemNotaFiscalXml[] => {
    const totalProd = valorTotalProdutos > 0 ? valorTotalProdutos : 1;
    const totalQtd = itensBase.reduce((acc, it) => acc + (it.quantidade || 1), 0) || 1;

    // Carregar configurações de precificação do sistema
    let configPrecificacao: ParametrosPrecificacao = PARAMETROS_PRECIFICACAO_PADRAO;
    try {
      const saved = localStorage.getItem('coliseu_config_precificacao');
      if (saved) configPrecificacao = JSON.parse(saved);
    } catch { /* fallback */ }

    // Soma das Deduções Padrão de Venda (Impostos + Comissao + Custos Fixos + Cartao)
    const somaDeducoes =
      (configPrecificacao.impostosSaidaPercent || 12) +
      (configPrecificacao.comissaoPercent || 4) +
      (configPrecificacao.custosFixosPercent || 6) +
      (configPrecificacao.taxaCartaoPercent || 2.5);

    // Função auxiliar para aplicar arredondamento comercial
    const aplicarArredondamento = (valor: number): number => {
      if (valor <= 0) return 0;
      switch (configPrecificacao.arredondamento) {
        case '0.10':
          return Math.round(valor * 10) / 10;
        case '0.50':
          return Math.round(valor * 2) / 2;
        case '0.90': {
          const base = Math.floor(valor);
          return valor - base < 0.45 ? Math.max(0.9, base - 0.1) : base + 0.9;
        }
        case '0.99': {
          const base = Math.floor(valor);
          return base + 0.99;
        }
        case '1.00':
          return Math.round(valor);
        default:
          return Math.round(valor * 100) / 100;
      }
    };

    return itensBase.map((it) => {
      // 1. Proporção do rateio do item sobre a nota
      const pesoRateio = encargos.criterioRateio === 'valor'
        ? (it.valorTotal / totalProd)
        : (it.quantidade / totalQtd);

      // 2. Encargos proporcionais atribuídos a este lote
      const freteItem = (encargos.valorFrete || 0) * pesoRateio;
      const seguroItem = (encargos.valorSeguro || 0) * pesoRateio;
      const outroItem = (encargos.valorOutrasDesp || 0) * pesoRateio;
      const descontoItem = (encargos.valorDesconto || 0) * pesoRateio;
      const ipiItem = it.valorIpiItem > 0 ? it.valorIpiItem : ((encargos.valorIpi || 0) * pesoRateio);
      const icmsStItem = it.valorIcmsStItem > 0 ? it.valorIcmsStItem : ((encargos.valorIcmsSt || 0) * pesoRateio);

      // 3. Créditos Fiscais de Entrada (apenas para Lucro Presumido / Real)
      let creditosFiscais = 0;
      if (encargos.regimeTributario === 'lucro_real') {
        creditosFiscais = (it.valorTotal * 0.0925) + (it.valorTotal * 0.12);
      } else if (encargos.regimeTributario === 'lucro_presumido') {
        creditosFiscais = it.valorTotal * 0.0365;
      }

      // 4. Custo Total Líquido do Lote deste Item
      const custoTotalLote =
        it.valorTotal -
        descontoItem +
        freteItem +
        seguroItem +
        outroItem +
        ipiItem +
        icmsStItem -
        creditosFiscais;

      // 5. Quantidade convertida para a unidade de estoque interno
      const fator = it.fatorConversao && it.fatorConversao > 0 ? it.fatorConversao : 1;
      const qtdEstoque = it.quantidade * fator;
      const custoRealUnitario = qtdEstoque > 0 ? Math.max(0.01, custoTotalLote / qtdEstoque) : it.valorUnitario;

      // 6. Recálculo do Custo Médio Ponderado (CMP)
      const valorEstoqueAnterior = (it.estoqueAnterior || 0) * (it.custoMedioAnterior || custoRealUnitario);
      const valorEstoqueEntrada = qtdEstoque * custoRealUnitario;
      const totalQtdEstoque = (it.estoqueAnterior || 0) + qtdEstoque;
      const custoMedioNovo = totalQtdEstoque > 0
        ? (valorEstoqueAnterior + valorEstoqueEntrada) / totalQtdEstoque
        : custoRealUnitario;

      // 7. Variação de custo vs compra anterior
      const variacao = it.custoMedioAnterior > 0
        ? ((custoRealUnitario - it.custoMedioAnterior) / it.custoMedioAnterior) * 100
        : 0;

      // 8. Margem de Lucro Líquida (Margem por Dentro) - Default 20%
      const margemLiquida = it.margemLucroPercent > 0 && it.margemLucroPercent < 60
        ? it.margemLucroPercent
        : (configPrecificacao.margemLucroLiquidaPercent || 20);

      // 9. Cálculo de Preço de Venda
      let precoSugeridoBruto = 0;
      let precoMinimoBruto = 0;

      if (configPrecificacao.metodo === 'markup_multiplicador') {
        const mkp = configPrecificacao.markupMultiplicadorPercent || 70;
        precoSugeridoBruto = custoRealUnitario * (1 + mkp / 100);
        precoMinimoBruto = custoRealUnitario * (1 + somaDeducoes / 100);
      } else {
        // Markup Divisor Oficial: Preço = Custo / (1 - (somaDeducoes + margemLiquida)/100)
        const indiceDivisor = Math.max(0.10, 1 - (somaDeducoes + margemLiquida) / 100);
        const indiceMinimo = Math.max(0.10, 1 - somaDeducoes / 100);
        precoSugeridoBruto = custoRealUnitario / indiceDivisor;
        precoMinimoBruto = custoRealUnitario / indiceMinimo;
      }

      const precoSugerido = aplicarArredondamento(precoSugeridoBruto);
      const precoMinimo = aplicarArredondamento(precoMinimoBruto);

      return {
        ...it,
        quantidadeEstoque: qtdEstoque,
        valorFreteItem: freteItem,
        valorSeguroItem: seguroItem,
        valorOutroItem: outroItem,
        valorDescontoItem: descontoItem,
        valorIpiItem: ipiItem,
        valorIcmsStItem: icmsStItem,
        creditosFiscaisItem: creditosFiscais,
        custoRealUnitario,
        custoMedioNovo,
        variacaoCustoPercent: variacao,
        margemLucroPercent: margemLiquida,
        precoVendaSugerido: precoSugerido,
        precoMinimo,
      };
    });
  };

  // Parser XML NF-e
  const parseXmlString = (xmlText: string, fileName?: string): NotaFiscalXmlParsed => {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

      const parseError = xmlDoc.getElementsByTagName('parsererror');
      if (parseError.length > 0) {
        throw new Error('O arquivo selecionado não contém uma estrutura XML válida de NF-e.');
      }

      const ide = xmlDoc.getElementsByTagName('ide')[0];
      const emit = xmlDoc.getElementsByTagName('emit')[0];
      const dest = xmlDoc.getElementsByTagName('dest')[0];
      const total = xmlDoc.getElementsByTagName('total')[0];
      const icmsTot = total ? total.getElementsByTagName('ICMSTot')[0] : null;

      let chave = '';
      const infNFe = xmlDoc.getElementsByTagName('infNFe')[0];
      if (infNFe) {
        const idAttr = infNFe.getAttribute('Id') || '';
        chave = idAttr.replace(/^NFe/, '').trim();
      }
      if (!chave && ide) {
        chave = `502601${safeText(emit, 'CNPJ')}${safeText(ide, 'nNF').padStart(9, '0')}1`;
      }

      const fornecedorCnpj = safeText(emit, 'CNPJ') || safeText(emit, 'CPF');
      const cnpjNumeros = fornecedorCnpj.replace(/\D/g, '');

      // Encargos da Nota Fiscal (Landed Costs)
      const valorProdutos = safeNum(safeText(icmsTot, 'vProd'), 0);
      const valorFrete = safeNum(safeText(icmsTot, 'vFrete'), 0);
      const valorSeguro = safeNum(safeText(icmsTot, 'vSeg'), 0);
      const valorOutrasDesp = safeNum(safeText(icmsTot, 'vOutro'), 0);
      const valorDesconto = safeNum(safeText(icmsTot, 'vDesc'), 0);
      const valorIpi = safeNum(safeText(icmsTot, 'vIPI'), 0);
      const valorIcmsSt = safeNum(safeText(icmsTot, 'vST'), 0);
      const valorTotal = safeNum(safeText(icmsTot, 'vNF'), valorProdutos + valorFrete + valorIpi + valorIcmsSt - valorDesconto);

      const encargosIniciais: EncargosEntrada = {
        valorFrete,
        valorSeguro,
        valorOutrasDesp,
        valorIpi,
        valorIcmsSt,
        valorDesconto,
        regimeTributario: 'simples',
        criterioRateio: 'valor',
      };

      // Extração dos Itens (<det>)
      const detNodes = xmlDoc.getElementsByTagName('det');
      const itensRaw: ItemNotaFiscalXml[] = [];

      for (let i = 0; i < detNodes.length; i++) {
        const det = detNodes[i];
        const prod = det.getElementsByTagName('prod')[0];
        const imposto = det.getElementsByTagName('imposto')[0];

        if (!prod) continue;

        const seq = parseInt(det.getAttribute('nItem') || String(i + 1), 10);
        const cProd = safeText(prod, 'cProd');
        const cEAN = safeText(prod, 'cEAN');
        const xProd = safeText(prod, 'xProd');
        const ncm = safeText(prod, 'NCM');
        const cfop = safeText(prod, 'CFOP');
        const uCom = safeText(prod, 'uCom') || 'UN';
        const qCom = safeNum(safeText(prod, 'qCom'), 1);
        const vUnCom = safeNum(safeText(prod, 'vUnCom'), 0);
        const vProd = safeNum(safeText(prod, 'vProd'), qCom * vUnCom);

        const cleanEan = cEAN && cEAN.toUpperCase() !== 'SEM GTIN' ? cEAN : '';

        // Matching no Catálogo Local
        let vinculado: any = null;
        const deParaKey = `${cnpjNumeros}_${cProd}`;
        const skuSalvo = deParaMappings[deParaKey];

        if (skuSalvo) {
          vinculado = catalogoProdutos.find((p: any) => String(p.sku || p.codigo) === String(skuSalvo));
        }

        if (!vinculado && cleanEan) {
          vinculado = catalogoProdutos.find((p: any) => {
            const pEan = String(p.codigoBarras || p.ean || '');
            return pEan.length > 3 && pEan === cleanEan;
          });
        }

        if (!vinculado) {
          vinculado = catalogoProdutos.find((p: any) => String(p.sku || p.codigo) === String(cProd));
        }

        // Sugestão de Fator de Conversão
        let fatorConversao = 1;
        let unidadeEstoque = uCom.toUpperCase();
        if (unidadeEstoque === 'CX' || unidadeEstoque === 'FD') {
          fatorConversao = 12;
          unidadeEstoque = 'UN';
        } else if (unidadeEstoque === 'PC' || unidadeEstoque === 'SC') {
          unidadeEstoque = 'UN';
        }

        const estoqueAnterior = vinculado ? (vinculado.estoqueAtual || 0) : 0;
        const custoMedioAnterior = vinculado ? (vinculado.precoCusto || vUnCom) : vUnCom;

        itensRaw.push({
          seq,
          codigoFornecedor: cProd,
          ean: cleanEan,
          descricao: xProd,
          ncm,
          cfop,
          unidade: uCom,
          unidadeEstoque,
          fatorConversao,
          quantidade: qCom,
          quantidadeEstoque: qCom * fatorConversao,
          valorUnitario: vUnCom,
          valorTotal: vProd,
          valorFreteItem: 0,
          valorSeguroItem: 0,
          valorOutroItem: 0,
          valorIpiItem: safeNum(safeText(imposto, 'vIPI'), 0),
          valorIcmsStItem: safeNum(safeText(imposto, 'vICMSST'), 0),
          valorDescontoItem: 0,
          creditosFiscaisItem: 0,
          custoRealUnitario: vUnCom,
          custoMedioAnterior,
          custoMedioNovo: vUnCom,
          estoqueAnterior,
          variacaoCustoPercent: 0,
          margemLucroPercent: 20, // 20% Margem Líquida Real
          precoVendaSugerido: vUnCom * 1.8,
          precoMinimo: vUnCom * 1.3,
          statusDePara: vinculado ? 'Vinculado' : 'Novo Produto',
          produtoVinculadoId: vinculado ? (vinculado.id || `PROD-${vinculado.sku}`) : undefined,
          produtoVinculadoSku: vinculado ? (vinculado.sku || vinculado.codigo) : undefined,
          produtoVinculadoNome: vinculado ? vinculado.descricao : undefined,
        });
      }

      // Aplicar Landed Costs nos Itens
      const itensComCustoReal = recalcularCustosItens(itensRaw, encargosIniciais, valorProdutos);

      // Duplicatas (<dup>)
      const dupNodes = xmlDoc.getElementsByTagName('dup');
      const parcelas: ParcelaNotaFiscalXml[] = [];

      for (let i = 0; i < dupNodes.length; i++) {
        const dup = dupNodes[i];
        parcelas.push({
          numero: safeText(dup, 'nDup') || String(i + 1),
          vencimento: safeText(dup, 'dVenc') || new Date().toISOString().split('T')[0],
          valor: safeNum(safeText(dup, 'vDup'), valorTotal / (dupNodes.length || 1)),
        });
      }

      if (parcelas.length === 0) {
        parcelas.push({
          numero: '001',
          vencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          valor: valorTotal,
        });
      }

      return {
        chave,
        numero: safeText(ide, 'nNF') || '1',
        serie: safeText(ide, 'serie') || '1',
        naturezaOperacao: safeText(ide, 'natOp') || 'COMPRA PARA COMERCIALIZACAO',
        dataEmissao: safeText(ide, 'dhEmi') || safeText(ide, 'dEmi') || new Date().toISOString(),
        fornecedorNome: safeText(emit, 'xNome') || 'FORNECEDOR DIVERSOS LTDA',
        fornecedorCnpj,
        fornecedorUf: safeText(emit, 'UF') || 'MS',
        fornecedorCidade: safeText(emit, 'xMun') || 'DOURADOS',
        fornecedorIe: safeText(emit, 'IE'),
        destinatarioNome: safeText(dest, 'xNome') || 'COLISEU MATERIAIS PARA CONSTRUCAO',
        destinatarioCnpj: safeText(dest, 'CNPJ'),
        valorProdutos,
        encargos: encargosIniciais,
        valorTotal,
        itens: itensComCustoReal,
        parcelas,
        xmlRaw: xmlText,
      };
    } catch (err: any) {
      console.error('Erro ao processar XML da NF-e:', err);
      throw new Error(err.message || 'Falha ao processar o arquivo XML.');
    }
  };

  // Manipulador de Seleção de Arquivo XML
  const handleFileSelect = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.xml')) {
      setErrorMsg('Por favor, selecione um arquivo com extensão .xml válido.');
      return;
    }

    setErrorMsg(null);
    setSelectedFileName(file.name);
    setSelectedFileSize(`${(file.size / 1024).toFixed(1)} KB`);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        if (!content) {
          throw new Error('Não foi possível ler o conteúdo do arquivo selecionado.');
        }
        const parsed = parseXmlString(content, file.name);
        setNotaParseada(parsed);
      } catch (err: any) {
        setErrorMsg(err.message || 'Erro ao processar o XML.');
      }
    };
    reader.onerror = () => {
      setErrorMsg('Erro de I/O ao ler o arquivo do disco.');
    };
    reader.readAsText(file, 'UTF-8');
  };

  // Alteração de Encargos / Landed Costs da Nota
  const handleUpdateEncargo = (field: keyof EncargosEntrada, val: any) => {
    if (!notaParseada) return;
    const novosEncargos = { ...notaParseada.encargos, [field]: val };
    const novosItens = recalcularCustosItens(notaParseada.itens, novosEncargos, notaParseada.valorProdutos);

    const novoTotal =
      notaParseada.valorProdutos +
      novosEncargos.valorFrete +
      novosEncargos.valorSeguro +
      novosEncargos.valorOutrasDesp +
      novosEncargos.valorIpi +
      novosEncargos.valorIcmsSt -
      novosEncargos.valorDesconto;

    setNotaParseada({
      ...notaParseada,
      encargos: novosEncargos,
      valorTotal: novoTotal,
      itens: novosItens,
    });
  };

  // Alteração Inline do Preço de Venda do Item
  const handleItemPrecoVendaChange = (seq: number, novoPreco: number) => {
    if (!notaParseada) return;

    const somaDeducoes = 12 + 4 + 6 + 2.5; // 24.5%
    const updated = notaParseada.itens.map((it) => {
      if (it.seq === seq) {
        const custo = it.custoRealUnitario;
        if (novoPreco <= 0 || custo <= 0) {
          return { ...it, precoVendaSugerido: novoPreco, margemLucroPercent: 0 };
        }
        
        // Calcular a margem líquida real de forma consistente:
        // Lucro Líquido = Preço - Custo - Deduções(Preço * somaDeducoes%)
        // Margem Líquida % = (Lucro Líquido / Preço) * 100
        const valorDeducoes = (novoPreco * somaDeducoes) / 100;
        const lucroLiquido = novoPreco - custo - valorDeducoes;
        const margemLiquida = Math.round(((lucroLiquido / novoPreco) * 100) * 10) / 10;

        return {
          ...it,
          precoVendaSugerido: novoPreco,
          margemLucroPercent: Math.max(1, Math.min(50, margemLiquida)),
        };
      }
      return it;
    });
    setNotaParseada({ ...notaParseada, itens: updated });
  };

  // Aplicar margem calculada individualmente apenas ao item selecionado
  const handleAplicarPrecoIndividual = () => {
    if (!itemParaPrecificar || !simulacaoAtual || !notaParseada) return;

    const updated = notaParseada.itens.map((it) => {
      if (it.seq === itemParaPrecificar.seq) {
        return {
          ...it,
          precoVendaSugerido: simulacaoAtual.novoPreco,
          precoMinimo: simulacaoAtual.precoMinimo,
          margemLucroPercent: simulacaoAtual.params.margemLucroLiquidaPercent,
        };
      }
      return it;
    });

    setNotaParseada({ ...notaParseada, itens: updated });
    setItemParaPrecificar(null);
    setSimulacaoAtual(null);
  };

  // Aplicar a mesma margem e parâmetros a TODOS os itens da nota
  const handleAplicarPrecoTodosItens = (paramsParaTodos?: ParametrosPrecificacao) => {
    if (!notaParseada) return;
    const targetParams = paramsParaTodos || simulacaoAtual?.params || PARAMETROS_PRECIFICACAO_PADRAO;

    try {
      localStorage.setItem('coliseu_config_precificacao', JSON.stringify(targetParams));
    } catch { /* fallback */ }

    const updated = notaParseada.itens.map((it) => {
      const custo = it.custoRealUnitario;
      const somaDeducoes =
        targetParams.impostosSaidaPercent +
        targetParams.comissaoPercent +
        targetParams.custosFixosPercent +
        targetParams.taxaCartaoPercent;

      let precoSugeridoBruto = 0;
      let precoMinimoBruto = 0;

      if (targetParams.metodo === 'markup_multiplicador') {
        precoSugeridoBruto = custo * (1 + targetParams.markupMultiplicadorPercent / 100);
        precoMinimoBruto = custo * (1 + somaDeducoes / 100);
      } else {
        const divisor = Math.max(0.10, 1 - (somaDeducoes + targetParams.margemLucroLiquidaPercent) / 100);
        const divisorMin = Math.max(0.10, 1 - somaDeducoes / 100);
        precoSugeridoBruto = custo / divisor;
        precoMinimoBruto = custo / divisorMin;
      }

      const aplicarArredondamento = (valor: number): number => {
        if (valor <= 0) return 0;
        switch (targetParams.arredondamento) {
          case '0.10': return Math.round(valor * 10) / 10;
          case '0.50': return Math.round(valor * 2) / 2;
          case '0.90': {
            const base = Math.floor(valor);
            return valor - base < 0.45 ? Math.max(0.9, base - 0.1) : base + 0.9;
          }
          case '0.99': return Math.floor(valor) + 0.99;
          case '1.00': return Math.round(valor);
          default: return Math.round(valor * 100) / 100;
        }
      };

      return {
        ...it,
        margemLucroPercent: targetParams.margemLucroLiquidaPercent,
        precoVendaSugerido: aplicarArredondamento(precoSugeridoBruto),
        precoMinimo: aplicarArredondamento(precoMinimoBruto),
      };
    });

    setNotaParseada({ ...notaParseada, itens: updated });
    setItemParaPrecificar(null);
    setSimulacaoAtual(null);
  };

  // Forçar Todos como Novos Produtos
  const handleMarcarTodosComoNovos = () => {
    if (!notaParseada) return;
    const updated = notaParseada.itens.map((it) => ({
      ...it,
      statusDePara: 'Novo Produto' as const,
      produtoVinculadoId: undefined,
      produtoVinculadoSku: undefined,
      produtoVinculadoNome: undefined,
    }));
    setNotaParseada({ ...notaParseada, itens: updated });
  };

  // Confirmação final da Importação
  const handleConfirmar = () => {
    if (!notaParseada) return;

    try {
      const custom = localStorage.getItem('coliseu_custom_produtos');
      const customProds: any[] = custom ? JSON.parse(custom) : [];
      const dePara: Record<string, string> = { ...deParaMappings };
      const cnpjNumeros = (notaParseada.fornecedorCnpj || '').replace(/\D/g, '');

      notaParseada.itens.forEach((it) => {
        const cleanDesc = (it.descricao || '').toUpperCase().trim();
        const skuForn = String(it.codigoFornecedor || '').trim();
        const cleanEan = it.ean && it.ean.toUpperCase() !== 'SEM GTIN' ? it.ean.trim() : '';

        if (it.statusDePara === 'Novo Produto') {
          const newSku = skuForn || `PRD-${Date.now().toString().slice(-5)}`;

          const existingIdx = customProds.findIndex(
            (p) => String(p.sku || p.codigo).toUpperCase() === newSku.toUpperCase() || p.descricao.toUpperCase().trim() === cleanDesc
          );

          const novoOuAtualizado = {
            id: existingIdx !== -1 ? customProds[existingIdx].id : `PROD-${Date.now()}-${it.seq}`,
            sku: newSku,
            codigo: newSku,
            codigoBarras: cleanEan || (existingIdx !== -1 ? customProds[existingIdx].codigoBarras : ''),
            descricao: cleanDesc,
            unidade: it.unidadeEstoque || it.unidade || 'UN',
            ncm: it.ncm || '00000000',
            precoCusto: it.custoRealUnitario,
            custoMedio: it.custoMedioNovo,
            precoVenda: it.precoVendaSugerido,
            precoMinimo: it.precoMinimo,
            estoqueAtual: existingIdx !== -1 ? (customProds[existingIdx].estoqueAtual || 0) + it.quantidadeEstoque : it.quantidadeEstoque,
            estoqueMinimo: 3,
            marca: notaParseada.fornecedorNome,
          };

          if (existingIdx !== -1) {
            customProds[existingIdx] = novoOuAtualizado;
          } else {
            customProds.unshift(novoOuAtualizado);
          }

          dePara[`${cnpjNumeros}_${it.codigoFornecedor}`] = newSku;
        } else if (it.statusDePara === 'Vinculado' && it.produtoVinculadoSku) {
          const skuVinculado = String(it.produtoVinculadoSku).trim();
          dePara[`${cnpjNumeros}_${it.codigoFornecedor}`] = skuVinculado;

          const existingIdx = customProds.findIndex((p) => String(p.sku || p.codigo || p.id).toUpperCase() === skuVinculado.toUpperCase());
          if (existingIdx !== -1) {
            customProds[existingIdx] = {
              ...customProds[existingIdx],
              precoCusto: it.custoRealUnitario,
              custoMedio: it.custoMedioNovo,
              precoVenda: it.precoVendaSugerido > 0 ? it.precoVendaSugerido : customProds[existingIdx].precoVenda,
              precoMinimo: it.precoMinimo > 0 ? it.precoMinimo : customProds[existingIdx].precoMinimo,
              estoqueAtual: (customProds[existingIdx].estoqueAtual || 0) + it.quantidadeEstoque,
            };
          } else {
            const baseProd = (Array.isArray(migratedProdutosData) ? migratedProdutosData : []).find(
              (p: any) => String(p.sku || p.codigo || p.id).toUpperCase() === skuVinculado.toUpperCase()
            );
            customProds.unshift({
              id: baseProd?.id || `PROD-${skuVinculado}`,
              sku: skuVinculado,
              codigo: skuVinculado,
              codigoBarras: cleanEan || baseProd?.codigoBarras || '',
              descricao: baseProd?.descricao || cleanDesc,
              unidade: it.unidadeEstoque || baseProd?.unidade || 'UN',
              ncm: it.ncm || baseProd?.ncm || '00000000',
              precoCusto: it.custoRealUnitario,
              custoMedio: it.custoMedioNovo,
              precoVenda: it.precoVendaSugerido > 0 ? it.precoVendaSugerido : ((baseProd as any)?.precoVenda || 0),
              precoMinimo: it.precoMinimo > 0 ? it.precoMinimo : ((baseProd as any)?.precoMinimo || 0),
              estoqueAtual: ((baseProd as any)?.estoqueAtual || 0) + it.quantidadeEstoque,
              estoqueMinimo: (baseProd as any)?.estoqueMinimo || 3,
              marca: (baseProd as any)?.marca || notaParseada.fornecedorNome,
            });
          }
        }
      });

      localStorage.setItem('coliseu_custom_produtos', JSON.stringify(customProds));
      localStorage.setItem('coliseu_depara_mappings', JSON.stringify(dePara));
      window.dispatchEvent(new Event('coliseu_produtos_updated'));
    } catch (e) {
      console.error('Erro ao gravar produtos do XML:', e);
    }

    onConfirmarImportacao(notaParseada);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(3px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1240px',
          height: '94vh',
          backgroundColor: 'var(--surface-1)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Cabeçalho do Modal */}
        <div
          style={{
            padding: '14px 20px',
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
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                color: '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileCode size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Entrada de Mercadorias via XML NF-e & Formação de Custos
              </h2>
              <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>
                Landed Cost Engine: Rateio automático de frete, impostos e precificação inteligente com Markup Divisor.
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
              padding: '6px',
              borderRadius: '6px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Mensagem de Erro se houver */}
        {errorMsg && (
          <div
            style={{
              padding: '10px 20px',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              borderBottom: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertTriangle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Corpo Principal */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column' }}>
          {!notaParseada ? (
            /* TELA 1: Seleção de Arquivo XML / Chave SEFAZ */
            <div style={{ maxWidth: '640px', margin: '40px auto', width: '100%' }}>
              <div
                style={{
                  border: `2px dashed ${dragActive ? '#3b82f6' : 'var(--border-default)'}`,
                  borderRadius: 'var(--radius-lg)',
                  padding: '40px 20px',
                  textAlign: 'center',
                  backgroundColor: dragActive ? 'rgba(59, 130, 246, 0.05)' : 'var(--surface-2)',
                  transition: 'all 0.2s ease',
                  marginBottom: '20px',
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileSelect(e.dataTransfer.files[0]);
                  }
                }}
              >
                <div
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(59, 130, 246, 0.12)',
                    color: '#3b82f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                  }}
                >
                  <Upload size={28} />
                </div>
                <h3 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Arraste o arquivo XML da NF-e aqui
                </h3>
                <p style={{ margin: '0 0 20px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  Suporta arquivos padrão NF-e modelo 55 versão 4.00
                </p>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".xml,text/xml"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelect(e.target.files[0]);
                      e.target.value = '';
                    }
                  }}
                />

                <Button
                  variant="primary"
                  onClick={() => fileInputRef.current?.click()}
                  style={{ padding: '10px 24px', fontSize: '13px', display: 'inline-flex', gap: '8px' }}
                >
                  <FolderOpen size={16} /> Procurar Arquivo XML no Computador
                </Button>
              </div>
            </div>
          ) : (
            /* TELA 2: Painel de Conferência, Landed Cost e Precificação */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Card Resumo do Cabeçalho da Nota */}
              <div
                style={{
                  backgroundColor: 'var(--surface-2)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      NF-e Nº {notaParseada.numero} (Série {notaParseada.serie})
                    </span>
                    <StatusBadge status="Concluído" label="XML Válido & Assinado" />
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Fornecedor: <strong style={{ color: 'var(--text-primary)' }}>{notaParseada.fornecedorNome}</strong> (CNPJ: {formatCnpjCpf(notaParseada.fornecedorCnpj)}) | Emissão: {formatDate(notaParseada.dataEmissao)}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Valor Total da Nota</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#10b981', fontFamily: 'monospace' }}>
                    {formatCurrency(notaParseada.valorTotal)}
                  </div>
                </div>
              </div>

              {/* PAINEL LANDED COST: Formação de Custo Real & Rateio de Encargos */}
              <div
                style={{
                  backgroundColor: 'var(--surface-2)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 16px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    <Calculator size={16} color="#3b82f6" />
                    Formação de Custo de Aquisição (Rateio de Encargos & Créditos)
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Regime Tributário */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Regime da Empresa:</span>
                      <select
                        value={notaParseada.encargos.regimeTributario}
                        onChange={(e) => handleUpdateEncargo('regimeTributario', e.target.value)}
                        className="coliseu-input"
                        style={{ height: '28px', fontSize: '11px', padding: '2px 8px' }}
                      >
                        <option value="simples">Simples Nacional (Sem Créditos)</option>
                        <option value="lucro_presumido">Lucro Presumido</option>
                        <option value="lucro_real">Lucro Real (Abate PIS/COFINS/ICMS)</option>
                      </select>
                    </div>

                    {/* Critério de Rateio */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Critério Rateio:</span>
                      <select
                        value={notaParseada.encargos.criterioRateio}
                        onChange={(e) => handleUpdateEncargo('criterioRateio', e.target.value)}
                        className="coliseu-input"
                        style={{ height: '28px', fontSize: '11px', padding: '2px 8px' }}
                      >
                        <option value="valor">Proporcional ao Valor (Padrão)</option>
                        <option value="quantidade">Por Quantidade de Peças</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Grid de Encargos da Nota */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '2px' }}>
                      Total Produtos (XML)
                    </label>
                    <input
                      type="text"
                      disabled
                      value={formatCurrency(notaParseada.valorProdutos)}
                      className="coliseu-input"
                      style={{ height: '30px', fontSize: '11px', fontWeight: 600, backgroundColor: 'var(--surface-3)', textAlign: 'right' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '10px', color: '#3b82f6', fontWeight: 600, marginBottom: '2px' }}>
                      (+) Frete (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={notaParseada.encargos.valorFrete}
                      onChange={(e) => handleUpdateEncargo('valorFrete', parseFloat(e.target.value) || 0)}
                      className="coliseu-input"
                      style={{ height: '30px', fontSize: '11px', fontWeight: 600, textAlign: 'right', borderColor: 'rgba(59, 130, 246, 0.4)' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '10px', color: '#3b82f6', fontWeight: 600, marginBottom: '2px' }}>
                      (+) Seguro (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={notaParseada.encargos.valorSeguro}
                      onChange={(e) => handleUpdateEncargo('valorSeguro', parseFloat(e.target.value) || 0)}
                      className="coliseu-input"
                      style={{ height: '30px', fontSize: '11px', textAlign: 'right' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '10px', color: '#3b82f6', fontWeight: 600, marginBottom: '2px' }}>
                      (+) Outras Desp. (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={notaParseada.encargos.valorOutrasDesp}
                      onChange={(e) => handleUpdateEncargo('valorOutrasDesp', parseFloat(e.target.value) || 0)}
                      className="coliseu-input"
                      style={{ height: '30px', fontSize: '11px', textAlign: 'right' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '10px', color: '#f59e0b', fontWeight: 600, marginBottom: '2px' }}>
                      (+) IPI Total (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={notaParseada.encargos.valorIpi}
                      onChange={(e) => handleUpdateEncargo('valorIpi', parseFloat(e.target.value) || 0)}
                      className="coliseu-input"
                      style={{ height: '30px', fontSize: '11px', textAlign: 'right' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '10px', color: '#f59e0b', fontWeight: 600, marginBottom: '2px' }}>
                      (+) ICMS-ST (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={notaParseada.encargos.valorIcmsSt}
                      onChange={(e) => handleUpdateEncargo('valorIcmsSt', parseFloat(e.target.value) || 0)}
                      className="coliseu-input"
                      style={{ height: '30px', fontSize: '11px', textAlign: 'right' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '10px', color: '#10b981', fontWeight: 600, marginBottom: '2px' }}>
                      (-) Desconto (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={notaParseada.encargos.valorDesconto}
                      onChange={(e) => handleUpdateEncargo('valorDesconto', parseFloat(e.target.value) || 0)}
                      className="coliseu-input"
                      style={{ height: '30px', fontSize: '11px', textAlign: 'right', color: '#10b981' }}
                    />
                  </div>
                </div>
              </div>

              {/* Sub-Abas: Itens | Contas a Pagar */}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border-default)', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('itens')}
                  style={{
                    padding: '8px 16px',
                    fontSize: '12px',
                    fontWeight: 600,
                    border: 'none',
                    borderBottom: activeSubTab === 'itens' ? '2px solid var(--primary)' : '2px solid transparent',
                    backgroundColor: 'transparent',
                    color: activeSubTab === 'itens' ? 'var(--primary)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  Itens & Custo Real no Estoque ({notaParseada.itens.length})
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSubTab('duplicatas')}
                  style={{
                    padding: '8px 16px',
                    fontSize: '12px',
                    fontWeight: 600,
                    border: 'none',
                    borderBottom: activeSubTab === 'duplicatas' ? '2px solid var(--primary)' : '2px solid transparent',
                    backgroundColor: 'transparent',
                    color: activeSubTab === 'duplicatas' ? 'var(--primary)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  Contas a Pagar / Parcelas ({notaParseada.parcelas.length})
                </button>

                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handleMarcarTodosComoNovos}
                    style={{
                      padding: '4px 10px',
                      fontSize: '11px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-default)',
                      backgroundColor: 'var(--surface-2)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <PlusCircle size={13} /> Cadastrar Todos como Novos
                  </button>
                </div>
              </div>

              {/* Conteúdo da Sub-Aba ITENS */}
              {activeSubTab === 'itens' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* Barra de Precificação Rápida em Lote */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      backgroundColor: 'var(--surface-2)',
                      padding: '6px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Sliders size={13} color="#3b82f6" /> Precificação em Lote:
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Margem Meta:</span>
                      <input
                        type="number"
                        min="1"
                        max="90"
                        value={margemLoteInput}
                        onChange={(e) => setMargemLoteInput(parseFloat(e.target.value) || 20)}
                        className="coliseu-input"
                        style={{ width: '55px', height: '24px', fontSize: '11px', textAlign: 'center', fontWeight: 600 }}
                      />
                      <span style={{ color: 'var(--text-muted)' }}>%</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAplicarPrecoTodosItens({ ...PARAMETROS_PRECIFICACAO_PADRAO, margemLucroLiquidaPercent: margemLoteInput })}
                      style={{
                        padding: '3px 12px',
                        fontSize: '11px',
                        borderRadius: '4px',
                        border: '1px solid rgba(59, 130, 246, 0.4)',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        color: '#3b82f6',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      ⚡ Aplicar Margem a Todos os Itens
                    </button>
                    <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'var(--text-muted)' }}>
                      💡 Para ajustar margem individual, clique no ícone <strong>📈</strong> na linha de cada produto.
                    </span>
                  </div>

                  <div style={{ overflowX: 'auto', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)' }}>
                    <table className="coliseu-table" style={{ fontSize: '11px', minWidth: '1100px' }}>
                      <thead>
                        <tr>
                          <th style={{ width: '35px', textAlign: 'center' }}>#</th>
                          <th style={{ width: '70px' }}>Cód. Forn.</th>
                          <th>Descrição da Mercadoria (XML)</th>
                          <th style={{ width: '70px' }}>NCM</th>
                          <th style={{ width: '80px', textAlign: 'center' }}>Conversão</th>
                          <th style={{ width: '80px', textAlign: 'right' }}>Vl. Unit. NF</th>
                          <th style={{ width: '85px', textAlign: 'right' }}>Encargos/UN</th>
                          <th style={{ width: '95px', textAlign: 'right' }}>Custo Real/UN</th>
                          <th style={{ width: '110px', textAlign: 'right' }}>Preço Venda Sug.</th>
                          <th style={{ width: '130px', textAlign: 'center' }}>Ação De-Para</th>
                          <th style={{ width: '40px', textAlign: 'center' }}>Prec.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {notaParseada.itens.map((it) => {
                          const totalEncargosLote = it.valorFreteItem + it.valorSeguroItem + it.valorOutroItem + it.valorIpiItem + it.valorIcmsStItem - it.valorDescontoItem;
                          const encargoUnitario = it.quantidadeEstoque > 0 ? totalEncargosLote / it.quantidadeEstoque : 0;

                          return (
                            <tr key={it.seq}>
                              <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{it.seq}</td>
                              <td style={{ fontFamily: 'monospace', color: '#3b82f6', fontWeight: 600 }}>{it.codigoFornecedor}</td>
                              <td>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{it.descricao}</div>
                                {it.statusDePara === 'Vinculado' && it.produtoVinculadoNome && (
                                  <div style={{ fontSize: '10px', color: '#10b981' }}>
                                    🔗 Vinculado a: <strong>{it.produtoVinculadoNome}</strong> (SKU: {it.produtoVinculadoSku})
                                  </div>
                                )}
                              </td>
                              <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>{it.ncm}</td>
                              <td style={{ textAlign: 'center' }}>
                                <span
                                  onClick={() => setItemParaAmarração(it)}
                                  title="Clique para ajustar fator de conversão"
                                  style={{
                                    display: 'inline-block',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    backgroundColor: it.fatorConversao > 1 ? 'rgba(59, 130, 246, 0.15)' : 'var(--surface-3)',
                                    color: it.fatorConversao > 1 ? '#3b82f6' : 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                  }}
                                >
                                  {it.quantidade} {it.unidade} {it.fatorConversao > 1 ? `→ ${it.quantidadeEstoque} ${it.unidadeEstoque}` : ''}
                                </span>
                              </td>
                              <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{formatCurrency(it.valorUnitario)}</td>
                              <td
                                style={{ textAlign: 'right', fontFamily: 'monospace', color: '#3b82f6' }}
                                title={`Total no Lote: +${formatCurrency(totalEncargosLote)}`}
                              >
                                +{formatCurrency(encargoUnitario)}
                              </td>
                              <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#10b981', fontSize: '12px' }}>
                                {formatCurrency(it.custoRealUnitario)}
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={it.precoVendaSugerido}
                                  onChange={(e) => handleItemPrecoVendaChange(it.seq, parseFloat(e.target.value) || 0)}
                                  className="coliseu-input"
                                  style={{ height: '26px', fontSize: '11px', fontWeight: 600, textAlign: 'right', width: '90px' }}
                                />
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                {it.statusDePara === 'Novo Produto' ? (
                                  <button
                                    type="button"
                                    onClick={() => setItemParaAmarração(it)}
                                    style={{
                                      padding: '2px 8px',
                                      fontSize: '10px',
                                      borderRadius: '4px',
                                      border: '1px solid rgba(59, 130, 246, 0.3)',
                                      backgroundColor: 'rgba(59, 130, 246, 0.08)',
                                      color: '#3b82f6',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    + Novo Produto (Vincular)
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setItemParaAmarração(it)}
                                    style={{
                                      padding: '2px 8px',
                                      fontSize: '10px',
                                      borderRadius: '4px',
                                      border: '1px solid rgba(16, 185, 129, 0.3)',
                                      backgroundColor: 'rgba(16, 185, 129, 0.08)',
                                      color: '#10b981',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    ✓ Vinculado
                                  </button>
                                )}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => setItemParaPrecificar(it)}
                                  title="Abrir Simulador de Precificação Waterfall"
                                  style={{
                                    border: 'none',
                                    background: 'none',
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer',
                                    padding: '2px',
                                  }}
                                >
                                  <TrendingUp size={15} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Conteúdo da Sub-Aba DUPLICATAS */}
              {activeSubTab === 'duplicatas' && (
                <div style={{ border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                  <table className="coliseu-table" style={{ fontSize: '12px' }}>
                    <thead>
                      <tr>
                        <th>Nº Parcela / Duplicata</th>
                        <th>Data de Vencimento</th>
                        <th style={{ textAlign: 'right' }}>Valor da Parcela</th>
                        <th>Destino Financeiro</th>
                      </tr>
                    </thead>
                    <tbody>
                      {notaParseada.parcelas.map((parc) => (
                        <tr key={parc.numero}>
                          <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Parcela {parc.numero}</td>
                          <td>{formatDate(parc.vencimento)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'monospace', color: '#10b981' }}>
                            {formatCurrency(parc.valor)}
                          </td>
                          <td style={{ color: 'var(--text-muted)' }}>Contas a Pagar ➔ Boleto Bancário Fornecedor</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Rodapé do Modal */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--border-default)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--surface-2)',
          }}
        >
          {notaParseada ? (
            <>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {notaParseada.itens.length} itens a processar • {notaParseada.parcelas.length} duplicata(s) no Contas a Pagar
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setNotaParseada(null)}
                  className="coliseu-btn coliseu-btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '12px' }}
                >
                  Selecionar Outro Arquivo
                </button>

                <Button
                  variant="primary"
                  onClick={handleConfirmar}
                  style={{ padding: '8px 24px', fontSize: '12px', fontWeight: 600, display: 'flex', gap: '6px' }}
                >
                  <CheckCircle2 size={16} /> Confirmar Entrada no Estoque & Gerar Financeiro
                </Button>
              </div>
            </>
          ) : (
            <div style={{ marginLeft: 'auto' }}>
              <button
                type="button"
                onClick={onClose}
                className="coliseu-btn coliseu-btn-secondary"
                style={{ padding: '8px 16px', fontSize: '12px' }}
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal Secundário: Amarração e Conversão de Unidade */}
      {itemParaAmarração && (
        <AmarracaoFornecedorModal
          isOpen={!!itemParaAmarração}
          onClose={() => setItemParaAmarração(null)}
          itemXml={itemParaAmarração}
          fornecedorCnpj={notaParseada?.fornecedorCnpj || ''}
          fornecedorNome={notaParseada?.fornecedorNome || ''}
          catalogoProdutos={catalogoProdutos}
          onConfirmarVinculo={(vinculo) => {
            if (!notaParseada) return;
            const updated = notaParseada.itens.map((it) => {
              if (it.seq === itemParaAmarração.seq) {
                return {
                  ...it,
                  statusDePara: 'Vinculado' as const,
                  produtoVinculadoId: vinculo.produtoInternoId,
                  produtoVinculadoSku: vinculo.produtoInternoSku,
                  produtoVinculadoNome: vinculo.produtoInternoNome,
                  fatorConversao: vinculo.fatorConversao,
                  unidadeEstoque: vinculo.unidadeEstoque,
                };
              }
              return it;
            });
            const recalcs = recalcularCustosItens(updated, notaParseada.encargos, notaParseada.valorProdutos);
            setNotaParseada({ ...notaParseada, itens: recalcs });
            setItemParaAmarração(null);
          }}
        />
      )}

      {/* Modal Secundário: Simulador de Precificação Waterfall */}
      {itemParaPrecificar && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(3px)',
            zIndex: 10001,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '780px',
              backgroundColor: 'var(--surface-1)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            {/* Header do Simulador */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Simulador de Precificação: {itemParaPrecificar.descricao}
                  </h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(59, 130, 246, 0.12)',
                      color: '#3b82f6',
                      fontWeight: 700,
                      fontSize: '11px',
                    }}
                  >
                    📦 Custo Real Apurado: {formatCurrency(itemParaPrecificar.custoRealUnitario)} / {itemParaPrecificar.unidadeEstoque}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    SKU / Fornecedor: {itemParaPrecificar.codigoFornecedor}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setItemParaPrecificar(null);
                  setSimulacaoAtual(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Painel de Precificação */}
            <FormacaoPrecoPanel
              custoRealAquisicao={itemParaPrecificar.custoRealUnitario}
              precoVendaAtual={itemParaPrecificar.precoVendaSugerido}
              initialParams={{
                margemLucroLiquidaPercent: itemParaPrecificar.margemLucroPercent || 20,
              }}
              persistGlobal={false}
              onPrecoCalculadoChange={(novoPreco, margem, precoMinimo, paramsUtilizados) => {
                setSimulacaoAtual({
                  novoPreco,
                  margem,
                  precoMinimo,
                  params: paramsUtilizados,
                });
              }}
            />

            {/* Rodapé com Ações Claras: Individual vs Todos */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderTop: '1px solid var(--border-subtle)',
                paddingTop: '14px',
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Margem Simulada: <strong style={{ color: '#10b981' }}>{simulacaoAtual?.params.margemLucroLiquidaPercent || 20}%</strong>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setItemParaPrecificar(null);
                    setSimulacaoAtual(null);
                  }}
                  className="coliseu-btn coliseu-btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '12px' }}
                >
                  Cancelar
                </button>

                <Button
                  variant="secondary"
                  onClick={() => handleAplicarPrecoTodosItens()}
                  style={{
                    padding: '8px 16px',
                    fontSize: '12px',
                    fontWeight: 600,
                    display: 'inline-flex',
                    gap: '6px',
                    borderColor: 'rgba(99, 102, 241, 0.4)',
                    color: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.08)',
                  }}
                  title="Aplica esta mesma regra de precificação para todos os itens da nota"
                >
                  <Sparkles size={15} /> Aplicar a TODOS os Itens da Nota
                </Button>

                <Button
                  variant="primary"
                  onClick={handleAplicarPrecoIndividual}
                  style={{ padding: '8px 22px', fontSize: '12px', fontWeight: 600, display: 'inline-flex', gap: '6px' }}
                >
                  <CheckCircle2 size={16} /> Aplicar Somente a este Produto
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
