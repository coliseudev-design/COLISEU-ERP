import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../lib/formatters';
import {
  FileText,
  Save,
  X,
  Plus,
  Trash2,
  Printer,
  FileCheck,
  CreditCard,
  Barcode,
  Search,
  CheckCircle2,
  AlertCircle,
  Truck,
  User,
  Tag,
  DollarSign,
  Layers,
  Sparkles,
  ShoppingBag,
  Receipt,
} from 'lucide-react';
import {
  PedidoVendaItem,
  ItemPedidoVenda,
  ParcelaPedidoVenda,
  NaturezaOperacaoItem,
  NATUREZAS_OPERACAO_PADRAO,
  MOCK_PRODUTOS_BUSCA_UNIVERSAL,
  salvarPedidoVenda,
  salvarOrcamento,
  processarVendaCompleta,
  cancelarPedidoVenda,
  reabrirPedidoParaEdicao,
  getStatusConfig,
  normalizarStatusPedido,
  StatusPedidoVenda,
} from '../../lib/pedidosVenda';
import { getNaturezasAtivasParaVenda } from '../../lib/naturezasOperacao';
import { ModalBuscaClientes, ClienteItemBusca } from './ModalBuscaClientes';
import { ModalFaturamentoNFe } from './ModalFaturamentoNFe';
import { ModalFaturamentoNFCe } from './ModalFaturamentoNFCe';
import { ModalCancelarPedido } from './ModalCancelarPedido';

interface ModalEmissaoPedidoVendaProps {
  isOpen: boolean;
  onClose: () => void;
  pedidoEdicao?: PedidoVendaItem | null;
  onSaveSuccess: (pedido: PedidoVendaItem) => void;
  onImprimirA4: (pedido: PedidoVendaItem) => void;
}

export const ModalEmissaoPedidoVenda: React.FC<ModalEmissaoPedidoVendaProps> = ({
  isOpen,
  onClose,
  pedidoEdicao,
  onSaveSuccess,
  onImprimirA4,
}) => {
  // Estados do Cabeçalho
  const [numeroPedido, setNumeroPedido] = useState(pedidoEdicao?.numeroPedido || `${Math.floor(100000 + Math.random() * 900000)}`);
  const [status, setStatus] = useState<any>(pedidoEdicao?.status || 'ORCAMENTO');
  const [dataEmissao, setDataEmissao] = useState(pedidoEdicao?.dataEmissao || new Date().toLocaleDateString('pt-BR'));
  const [filialDepto, setFilialDepto] = useState(pedidoEdicao?.filialDepto || 'MATRIZ - DOURADOS/MS');

  // Cliente
  const [clienteCodigo, setClienteCodigo] = useState(pedidoEdicao?.clienteCodigo || '1');
  const [clienteNome, setClienteNome] = useState(pedidoEdicao?.clienteNome || 'AO CONSUMIDOR');
  const [clienteCnpjCpf, setClienteCnpjCpf] = useState(pedidoEdicao?.clienteCnpjCpf || '00.000.000/0000-00');
  const [clienteEndereco, setClienteEndereco] = useState(pedidoEdicao?.clienteEndereco || 'RUA PRINCIPAL, 100 - CENTRO');
  const [clienteTelefone, setClienteTelefone] = useState(pedidoEdicao?.clienteTelefone || '(67) 3421-0000');
  const [clienteUf, setClienteUf] = useState(pedidoEdicao?.clienteUf || 'MS');

  // Natureza de Operação (CFOP)
  const [cfopSelecionado, setCfopSelecionado] = useState(pedidoEdicao?.naturezaOperacao?.cfop || '5102');
  
  // Vendedor e Condições Comerciais
  const [vendedorNome, setVendedorNome] = useState(pedidoEdicao?.vendedorNome || 'CARLOS SILVA (INTERNO)');
  const [tabelaPrecos, setTabelaPrecos] = useState(pedidoEdicao?.tabelaPrecos || 'TABELA PADRÃO VAREJO');
  const [observacoesGerais, setObservacoesGerais] = useState(pedidoEdicao?.observacoesGerais || '');

  // Logística & Frete
  const [tipoFrete, setTipoFrete] = useState<'CIF' | 'FOB' | 'SEM_FRETE'>(pedidoEdicao?.tipoFrete || 'CIF');
  const [valorFrete, setValorFrete] = useState<number>(pedidoEdicao?.valorFrete || 0);

  // Itens do Pedido
  const [itens, setItens] = useState<ItemPedidoVenda[]>(pedidoEdicao?.itens || []);
  
  // Barra de Inclusão Rápida de Produtos (Multi-Chaves F9)
  const [buscaProdutoTermo, setBuscaProdutoTermo] = useState('');
  const [qtdInclusao, setQtdInclusao] = useState<number>(1);
  const [descontoInclusaoPercent, setDescontoInclusaoPercent] = useState<number>(0);
  const [produtoEncontrado, setProdutoEncontrado] = useState<any | null>(null);
  const [sugestoesBusca, setSugestoesBusca] = useState<any[]>([]);
  const [sugestaoIndex, setSugestaoIndex] = useState<number>(0);

  // Financeiro & Parcelas
  const [formaPagamentoNome, setFormaPagamentoNome] = useState(pedidoEdicao?.formaPagamentoNome || '30 DIAS (BOLETO BANCÁRIO)');
  const [parcelas, setParcelas] = useState<ParcelaPedidoVenda[]>(pedidoEdicao?.parcelas || []);

  // Metadados Fiscais Vinculados (NF-e / NFC-e)
  const [numeroNFe, setNumeroNFe] = useState(pedidoEdicao?.numeroNFe);
  const [chaveNFeEmitida, setChaveNFeEmitida] = useState(pedidoEdicao?.chaveNFeEmitida);
  const [statusFiscalNfe, setStatusFiscalNfe] = useState(pedidoEdicao?.statusFiscalNfe);
  const [protocoloAutorizacao, setProtocoloAutorizacao] = useState(pedidoEdicao?.protocoloAutorizacao);
  const [dataAutorizacaoSefaz, setDataAutorizacaoSefaz] = useState(pedidoEdicao?.dataAutorizacaoSefaz);
  const [dataFaturamento, setDataFaturamento] = useState(pedidoEdicao?.dataFaturamento);
  const [numeroNFCe, setNumeroNFCe] = useState(pedidoEdicao?.numeroNFCe);
  const [chaveNFCeEmitida, setChaveNFCeEmitida] = useState(pedidoEdicao?.chaveNFCeEmitida);
  const [statusFiscalNfce, setStatusFiscalNfce] = useState(pedidoEdicao?.statusFiscalNfce);

  // Modais Secundários
  const [isModalBuscaClientesOpen, setIsModalBuscaClientesOpen] = useState(false);
  const [isModalFaturamentoOpen, setIsModalFaturamentoOpen] = useState(false);
  const [isModalFaturamentoNFCeOpen, setIsModalFaturamentoNFCeOpen] = useState(false);
  const [isModalCancelarOpen, setIsModalCancelarOpen] = useState(false);

  // Status & Regras de Bloqueio
  const normStatus = normalizarStatusPedido(status);
  const statusCfg = getStatusConfig(normStatus);
  const isEmFaturamento = normStatus === 'EM_FATURAMENTO';
  const isProcessado = normStatus === 'PROCESSADO';
  const isCancelado = normStatus === 'CANCELADO';
  const isBloqueadoEdicao = isEmFaturamento || isProcessado || isCancelado;

  // Refs de Navegação por Teclado
  const buscaInputRef = useRef<HTMLInputElement>(null);
  const qtdInputRef = useRef<HTMLInputElement>(null);
  const descontoInputRef = useRef<HTMLInputElement>(null);

  // Atalhos de Teclado (F2, F3, F4, F5, F6, F7, F8, F9)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isModalBuscaClientesOpen || isModalFaturamentoOpen || isModalFaturamentoNFCeOpen || isModalCancelarOpen) return;

      if (e.key === 'F8') {
        e.preventDefault();
        if (!isBloqueadoEdicao) setIsModalBuscaClientesOpen(true);
      } else if (e.key === 'F9') {
        e.preventDefault();
        if (!isBloqueadoEdicao) {
          buscaInputRef.current?.focus();
          buscaInputRef.current?.select();
        }
      } else if (e.key === 'F2') {
        e.preventDefault();
        handleAbrirFaturamentoNFe();
      } else if (e.key === 'F4') {
        e.preventDefault();
        handleAbrirFaturamentoNFCe();
      } else if (e.key === 'F3') {
        e.preventDefault();
        handleLimparNovo();
      } else if (e.key === 'F5') {
        e.preventDefault();
        handleSalvarOrcamento();
      } else if (e.key === 'F6') {
        e.preventDefault();
        handleImprimir();
      } else if (e.key === 'F7') {
        e.preventDefault();
        handleConfirmarVenda();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  if (!isOpen) return null;

  const naturezasVenda = getNaturezasAtivasParaVenda();
  const natOperacaoAtual = naturezasVenda.find((n) => n.cfop === cfopSelecionado) || NATUREZAS_OPERACAO_PADRAO[0];

  // Busca Inteligente Multi-Chaves
  const handleBuscaDigitada = (termo: string) => {
    setBuscaProdutoTermo(termo);
    if (!termo.trim()) {
      setSugestoesBusca([]);
      setProdutoEncontrado(null);
      return;
    }

    const q = termo.toLowerCase().trim();
    const filtrados = MOCK_PRODUTOS_BUSCA_UNIVERSAL.filter((p) => {
      const matchNome = p.descricao.toLowerCase().includes(q);
      const matchFabrica = p.codigoFabrica.toLowerCase().includes(q);
      const matchRef = p.referencia.toLowerCase().includes(q);
      const matchEan = p.codigoBarras.includes(q);
      const matchSku = p.codigoSku.toLowerCase().includes(q);
      const matchInterno = p.codigoInterno.includes(q);
      const matchSimilar = p.similares.some((s) => s.toLowerCase().includes(q));
      return matchNome || matchFabrica || matchRef || matchEan || matchSku || matchInterno || matchSimilar;
    });

    setSugestoesBusca(filtrados);
    setSugestaoIndex(0);
    if (filtrados.length === 1) {
      setProdutoEncontrado(filtrados[0]);
    }
  };

  const handleSelecionarSugestao = (p: any) => {
    setProdutoEncontrado(p);
    setBuscaProdutoTermo(`${p.codigoFabrica} - ${p.descricao}`);
    setSugestoesBusca([]);
    setTimeout(() => {
      qtdInputRef.current?.focus();
      qtdInputRef.current?.select();
    }, 50);
  };

  // Navegação por teclado no campo de Busca
  const handleBuscaKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (sugestoesBusca.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSugestaoIndex((prev) => Math.min(sugestoesBusca.length - 1, prev + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSugestaoIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (sugestoesBusca[sugestaoIndex]) {
          handleSelecionarSugestao(sugestoesBusca[sugestaoIndex]);
        }
      }
    } else if (e.key === 'Enter' || e.key === 'ArrowRight') {
      if (produtoEncontrado) {
        e.preventDefault();
        qtdInputRef.current?.focus();
        qtdInputRef.current?.select();
      }
    }
  };

  // Inclusão do Item no Grid
  const handleAdicionarItem = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!produtoEncontrado) {
      alert('Selecione ou bipe um produto válido pelo código de fábrica, barras ou nome.');
      buscaInputRef.current?.focus();
      return;
    }

    const precoTabela = produtoEncontrado.precoVenda;
    const descontoUnitario = Math.round(precoTabela * (descontoInclusaoPercent / 100) * 100) / 100;
    const precoFinal = Math.max(0, precoTabela - descontoUnitario);
    const subtotalBruto = precoTabela * qtdInclusao;
    const subtotalLiquido = precoFinal * qtdInclusao;
    const valorIcms = Math.round(subtotalLiquido * (produtoEncontrado.aliquotaIcms / 100) * 100) / 100;
    const valorIpi = Math.round(subtotalLiquido * (produtoEncontrado.aliquotaIpi / 100) * 100) / 100;

    const novoItem: ItemPedidoVenda = {
      id: `IT-${Date.now()}`,
      itemOrdem: itens.length + 1,
      produtoId: produtoEncontrado.id,
      codigoInterno: produtoEncontrado.codigoInterno,
      codigoFabrica: produtoEncontrado.codigoFabrica,
      referencia: produtoEncontrado.referencia,
      codigoBarras: produtoEncontrado.codigoBarras,
      descricao: produtoEncontrado.descricao,
      unidadeMedida: produtoEncontrado.unidadeMedida,
      quantidade: qtdInclusao,
      precoTabelaUnitario: precoTabela,
      descontoPercent: descontoInclusaoPercent,
      descontoValorUnitario: descontoUnitario,
      acrescimoValorUnitario: 0,
      precoFinalUnitario: precoFinal,
      subtotalBruto,
      subtotalLiquido,
      cfop: cfopSelecionado,
      aliquotaIcms: produtoEncontrado.aliquotaIcms,
      valorIcms,
      aliquotaIpi: produtoEncontrado.aliquotaIpi,
      valorIpi,
      estoqueAtualDisponivel: produtoEncontrado.estoqueDisponivel,
      produtosSimilaresDisponiveis: produtoEncontrado.similares,
    };

    const novosItens = [...itens, novoItem];
    setItens(novosItens);
    recalcularParcelas(novosItens, valorFrete);

    // Limpar barra de inclusão e retornar foco para a Busca imediatamente
    setBuscaProdutoTermo('');
    setProdutoEncontrado(null);
    setSugestoesBusca([]);
    setQtdInclusao(1);
    setDescontoInclusaoPercent(0);
    setTimeout(() => {
      buscaInputRef.current?.focus();
    }, 50);
  };

  const handleRemoverItem = (index: number) => {
    const atualizados = itens.filter((_, i) => i !== index).map((item, idx) => ({ ...item, itemOrdem: idx + 1 }));
    setItens(atualizados);
    recalcularParcelas(atualizados, valorFrete);
  };

  // Cálculos de Totais
  const totalProdutos = itens.reduce((acc, i) => acc + (i.subtotalBruto ?? 0), 0);
  const totalDescontos = itens.reduce((acc, i) => acc + ((i.descontoValorUnitario ?? 0) * i.quantidade), 0);
  const totalIcms = itens.reduce((acc, i) => acc + (i.valorIcms ?? 0), 0);
  const totalIpi = itens.reduce((acc, i) => acc + (i.valorIpi ?? 0), 0);
  const valorTotalFinal = Math.max(0, totalProdutos - totalDescontos + valorFrete + totalIpi);

  // Recalcular Parcelas Automaticamente
  const recalcularParcelas = (itensAtuais: ItemPedidoVenda[], frete: number) => {
    const total = itensAtuais.reduce((acc, i) => acc + i.subtotalLiquido, 0) + frete;
    if (total <= 0) {
      setParcelas([]);
      return;
    }

    if (formaPagamentoNome.includes('30/60')) {
      const vParc = Math.round((total / 2) * 100) / 100;
      setParcelas([
        {
          numeroParcela: 1,
          dataVencimento: '17/09/2026',
          numeroDocumento: `${numeroPedido}/01`,
          valorParcela: vParc,
          especiePagamento: 'BOLETO BANCÁRIO (PIX)',
          linhaDigitavelBoleto: '74891.12345 67890.123456 78901.234567 1 98760000047000',
        },
        {
          numeroParcela: 2,
          dataVencimento: '17/10/2026',
          numeroDocumento: `${numeroPedido}/02`,
          valorParcela: total - vParc,
          especiePagamento: 'BOLETO BANCÁRIO (PIX)',
          linhaDigitavelBoleto: '74891.12345 67890.123456 78901.234567 1 98760000047000',
        },
      ]);
    } else {
      setParcelas([
        {
          numeroParcela: 1,
          dataVencimento: new Date().toLocaleDateString('pt-BR'),
          numeroDocumento: `${numeroPedido}/01`,
          valorParcela: total,
          especiePagamento: 'À VISTA / PIX / DINHEIRO',
        },
      ]);
    }
  };

  const montarObjetoPedido = (novoStatus?: any): PedidoVendaItem => {
    return {
      id: pedidoEdicao?.id || `PED-${Date.now()}`,
      numeroPedido,
      tipoMovimento: 'SAIDA',
      status: novoStatus || status,
      dataEmissao,
      dataValidadeOrcamento: '25/08/2026',
      filialDepto,
      clienteId: 'CLI-001',
      clienteCodigo,
      clienteNome,
      clienteCnpjCpf,
      clienteEndereco,
      clienteBairro: 'CENTRO',
      clienteCidade: 'DOURADOS',
      clienteUf,
      clienteTelefone,
      naturezaOperacao: {
        cfop: natOperacaoAtual.cfop,
        descricao: natOperacaoAtual.descricao,
        tipo: 'SAIDA',
        geraFinanceiro: (natOperacaoAtual as any).operacional?.geraFinanceiro ?? (natOperacaoAtual as any).geraFinanceiro ?? true,
        movimentaEstoque: (natOperacaoAtual as any).operacional?.movimentaEstoqueReal ?? (natOperacaoAtual as any).movimentaEstoque ?? true,
        destinacaoPadrao: 'ESTADUAL',
      },
      vendedorId: 'VEND-001',
      vendedorNome,
      tabelaPrecos,
      tipoFrete,
      valorFrete,
      pesoLiquidoKg: 45.0,
      pesoBrutoKg: 48.0,
      quantidadeVolumes: itens.length,
      itens,
      totalProdutos,
      totalDescontoGlobal: totalDescontos,
      totalAcrescimos: 0,
      totalIpi,
      totalIcms,
      totalIcmsSt: 0,
      totalServicos: 0,
      valorTotalFinal,
      formaPagamentoNome,
      parcelas,
      observacoesGerais,
      numeroNFe: numeroNFe || pedidoEdicao?.numeroNFe,
      chaveNFeEmitida: chaveNFeEmitida || pedidoEdicao?.chaveNFeEmitida,
      statusFiscalNfe: statusFiscalNfe || pedidoEdicao?.statusFiscalNfe,
      protocoloAutorizacao: protocoloAutorizacao || pedidoEdicao?.protocoloAutorizacao,
      dataAutorizacaoSefaz: dataAutorizacaoSefaz || pedidoEdicao?.dataAutorizacaoSefaz,
      dataFaturamento: dataFaturamento || pedidoEdicao?.dataFaturamento,
      numeroNFCe: numeroNFCe || pedidoEdicao?.numeroNFCe,
      chaveNFCeEmitida: chaveNFCeEmitida || pedidoEdicao?.chaveNFCeEmitida,
      statusFiscalNfce: statusFiscalNfce || pedidoEdicao?.statusFiscalNfce,
    };
  };

  const handleSalvarOrcamento = () => {
    if (isBloqueadoEdicao && !isCancelado) {
      alert('Não é possível alterar este pedido pois ele já está em faturamento ou processado.');
      return;
    }
    if (itens.length === 0) {
      alert('Adicione ao menos um produto no pedido.');
      return;
    }

    const pedido = montarObjetoPedido('EM_ABERTO');
    salvarOrcamento(pedido);
    onSaveSuccess(pedido);
    onClose();
  };

  const handleConfirmarVenda = () => {
    if (normStatus === 'PROCESSADO' && pedidoEdicao?.status === 'PROCESSADO') {
      alert('Esta venda já foi processada e finalizada. Cancele a venda caso precise alterar.');
      return;
    }
    if (itens.length === 0) {
      alert('Adicione ao menos um produto no pedido.');
      return;
    }

    const pedido = montarObjetoPedido('PROCESSADO');
    const res = processarVendaCompleta(pedido);
    if (res.success && res.pedido) {
      onSaveSuccess(res.pedido);
      onClose();
    } else {
      alert(res.message || 'Erro ao processar a venda.');
    }
  };

  const handleReabrirParaEdicao = () => {
    if (!pedidoEdicao) {
      setStatus('EM_ABERTO');
      return;
    }
    const res = reabrirPedidoParaEdicao(pedidoEdicao.id);
    if (res.success && res.pedido) {
      setStatus('EM_ABERTO');
      onSaveSuccess(res.pedido);
    }
  };

  const handleAbrirFaturamentoNFe = () => {
    if (itens.length === 0) {
      alert('Adicione produtos no pedido antes de faturar a NF-e.');
      return;
    }
    setIsModalFaturamentoOpen(true);
  };

  const handleAbrirFaturamentoNFCe = () => {
    if (itens.length === 0) {
      alert('Adicione produtos no pedido antes de emitir a NFC-e.');
      return;
    }
    setIsModalFaturamentoNFCeOpen(true);
  };

  const handleImprimir = () => {
    if (itens.length === 0) {
      alert('Adicione itens no pedido antes de imprimir.');
      return;
    }
    const pedidoTemp = montarObjetoPedido();
    onImprimirA4(pedidoTemp);
  };

  const handleLimparNovo = () => {
    setNumeroPedido(`${Math.floor(100000 + Math.random() * 900000)}`);
    setItens([]);
    setParcelas([]);
    setObservacoesGerais('');
    buscaInputRef.current?.focus();
  };

  const handleClienteSelecionado = (cli: ClienteItemBusca) => {
    setClienteCodigo(cli.codigo);
    setClienteNome(cli.nome);
    setClienteCnpjCpf(cli.cpfCnpj);
    setClienteEndereco(`${cli.endereco || ''}${cli.numero ? `, ${cli.numero}` : ''}${cli.bairro ? ` - ${cli.bairro}` : ''}`);
    setClienteTelefone(cli.telefone);
    setClienteUf(cli.uf || 'MS');
    setTimeout(() => {
      buscaInputRef.current?.focus();
    }, 50);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(4px)',
        zIndex: 11000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1240px',
          height: '96vh',
          backgroundColor: 'var(--surface-1)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* BARRA SUPERIOR EXECUTIVA COM QUADRADO DE STATUS OFICIAL */}
        <div
          style={{
            padding: '10px 16px',
            backgroundColor: 'var(--surface-2)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FileText size={22} color="#3b82f6" />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  EMISSÃO DE PEDIDOS & ORÇAMENTOS
                </span>

                {/* Quadrado e Badge de Status Oficial */}
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: statusCfg.bg,
                    border: `1px solid ${statusCfg.border}`,
                    color: statusCfg.text,
                    fontSize: '11px',
                    fontWeight: 800,
                  }}
                  title={statusCfg.tooltip}
                >
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '2px',
                      backgroundColor: statusCfg.bg,
                      border: `1px solid ${statusCfg.border}`,
                      display: 'inline-block',
                      boxShadow: '0 0 0 1px rgba(0,0,0,0.1)',
                    }}
                  />
                  {statusCfg.label}
                </div>
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                Nº Pedido: <strong>{numeroPedido}</strong> • Depto: <strong>{filialDepto}</strong> • Emissão: <strong>{dataEmissao}</strong>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Indicador Visual Oficial de Status (Sem alteração manual) */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '6px',
                backgroundColor: statusCfg.bg,
                border: `1px solid ${statusCfg.border}`,
                color: statusCfg.text,
                fontSize: '11.5px',
                fontWeight: 800,
                boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
              }}
              title={`Status oficial: ${statusCfg.label}. As transições ocorrem automaticamente pelas operações comerciais e fiscais.`}
            >
              <span
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '2px',
                  backgroundColor: statusCfg.bg,
                  border: `1px solid ${statusCfg.border}`,
                  display: 'inline-block',
                }}
              />
              {statusCfg.label.toUpperCase()}
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* BANNERS DE STATUS E BLOQUEIO */}
        {isEmFaturamento && (
          <div
            style={{
              padding: '8px 16px',
              backgroundColor: '#fef9c3',
              borderBottom: '1px solid #fde047',
              color: '#854d0e',
              fontSize: '11.5px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px' }}>🟨</span>
              <span>
                <strong>EM FATURAMENTO:</strong> Este pedido possui Nota Fiscal (NF-e/NFC-e) vinculada e autorizada na SEFAZ. Os dados de produtos e valores estão bloqueados para garantir conformidade fiscal.
              </span>
            </div>
            <div style={{ fontSize: '11px', fontStyle: 'italic' }}>
              Ação necessária: Clique em "Confirmar Venda (F7)" para processar a baixa ou "Cancelar Venda" para estornar.
            </div>
          </div>
        )}

        {isProcessado && (
          <div
            style={{
              padding: '8px 16px',
              backgroundColor: 'rgba(100, 116, 139, 0.12)',
              borderBottom: '1px solid rgba(100, 116, 139, 0.3)',
              color: 'var(--text-primary)',
              fontSize: '11.5px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px' }}>⬛</span>
              <span>
                <strong>VENDA PROCESSADA:</strong> O estoque já foi baixado e o financeiro foi lançado em contas a receber. O botão de confirmação está bloqueado para evitar duplicação.
              </span>
            </div>
            <Button
              variant="danger"
              size="sm"
              type="button"
              onClick={() => setIsModalCancelarOpen(true)}
              style={{ height: '26px', fontSize: '11px', fontWeight: 700 }}
            >
              🚫 Cancelar Venda & Estornar
            </Button>
          </div>
        )}

        {isCancelado && (
          <div
            style={{
              padding: '8px 16px',
              backgroundColor: 'rgba(0, 112, 243, 0.1)',
              borderBottom: '1px solid rgba(0, 112, 243, 0.3)',
              color: '#0070f3',
              fontSize: '11.5px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px' }}>🟦</span>
              <span>
                <strong>PEDIDO CANCELADO:</strong> Esta venda foi cancelada e os estoques/títulos foram estornados.
              </span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={handleReabrirParaEdicao}
              style={{ height: '26px', fontSize: '11px', fontWeight: 700, borderColor: '#0070f3', color: '#0070f3' }}
            >
              🔄 Reabrir Orçamento em Aberto
            </Button>
          </div>
        )}

        {/* CORPO DO PEDIDO */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* PAINEL CABEÇALHO COMERCIAL & NATUREZA DE OPERAÇÃO */}
          <div
            style={{
              padding: '12px',
              backgroundColor: 'var(--surface-2)',
              borderRadius: '6px',
              border: '1px solid var(--border-default)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            {/* Linha 1: Cliente com Botão de Busca F8 */}
            <div style={{ display: 'grid', gridTemplateColumns: '80px 2fr 1.2fr 1fr', gap: '8px' }}>
              <div>
                <label className="coliseu-label" style={{ color: '#3b82f6' }}>Cód (F8)</label>
                <div style={{ display: 'flex', gap: '2px' }}>
                  <input
                    type="text"
                    value={clienteCodigo}
                    onChange={(e) => setClienteCodigo(e.target.value)}
                    className="coliseu-input"
                    style={{ height: '30px', textAlign: 'center', fontWeight: 700, width: '100%' }}
                  />
                  <button
                    type="button"
                    onClick={() => setIsModalBuscaClientesOpen(true)}
                    className="coliseu-btn coliseu-btn-secondary"
                    style={{ height: '30px', padding: '0 6px' }}
                    title="Buscar Cliente (F8)"
                  >
                    <Search size={12} />
                  </button>
                </div>
              </div>

              <div>
                <label className="coliseu-label">Razão Social / Nome do Cliente *</label>
                <input
                  type="text"
                  value={clienteNome}
                  onChange={(e) => setClienteNome(e.target.value.toUpperCase())}
                  className="coliseu-input"
                  style={{ height: '30px', fontWeight: 700, width: '100%' }}
                />
              </div>

              <div>
                <label className="coliseu-label">CNPJ / CPF</label>
                <input
                  type="text"
                  value={clienteCnpjCpf}
                  onChange={(e) => setClienteCnpjCpf(e.target.value)}
                  className="coliseu-input"
                  style={{ height: '30px', width: '100%' }}
                />
              </div>

              <div>
                <label className="coliseu-label">Telefone / WhatsApp</label>
                <input
                  type="text"
                  value={clienteTelefone}
                  onChange={(e) => setClienteTelefone(e.target.value)}
                  className="coliseu-input"
                  style={{ height: '30px', width: '100%' }}
                />
              </div>
            </div>

            {/* Linha 2: Natureza de Operação (CFOP), Vendedor, Tabela de Preços e Endereço */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1.2fr 1fr', gap: '8px' }}>
              <div>
                <label className="coliseu-label" style={{ color: '#3b82f6' }}>
                  Natureza da Operação (CFOP) *
                </label>
                <select
                  value={cfopSelecionado}
                  onChange={(e) => setCfopSelecionado(e.target.value)}
                  className="coliseu-input"
                  style={{ height: '30px', width: '100%', fontWeight: 700, borderColor: '#3b82f6' }}
                >
                  {naturezasVenda.map((nat) => (
                    <option key={nat.cfop} value={nat.cfop}>
                      {nat.cfop} - {nat.descricao}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="coliseu-label">Vendedor Responsável</label>
                <select
                  value={vendedorNome}
                  onChange={(e) => setVendedorNome(e.target.value)}
                  className="coliseu-input"
                  style={{ height: '30px', width: '100%' }}
                >
                  <option value="CARLOS SILVA (INTERNO)">CARLOS SILVA (INTERNO)</option>
                  <option value="RICARDO OLIVEIRA (EXTERNO)">RICARDO OLIVEIRA (EXTERNO)</option>
                  <option value="FELIPE ANDRADE (REPRESENTANTE)">FELIPE ANDRADE (REPRESENTANTE)</option>
                </select>
              </div>

              <div>
                <label className="coliseu-label">Tabela de Preços</label>
                <select
                  value={tabelaPrecos}
                  onChange={(e) => setTabelaPrecos(e.target.value)}
                  className="coliseu-input"
                  style={{ height: '30px', width: '100%' }}
                >
                  <option value="TABELA PADRÃO VAREJO">TABELA PADRÃO VAREJO</option>
                  <option value="TABELA ATACADO / DISTRIBUIDOR">TABELA ATACADO / DISTRIBUIDOR</option>
                  <option value="TABELA PROMOÇÃO BALCÃO">TABELA PROMOÇÃO BALCÃO</option>
                </select>
              </div>

              <div>
                <label className="coliseu-label">UF / Destino</label>
                <input
                  type="text"
                  value={clienteUf}
                  onChange={(e) => setClienteUf(e.target.value.toUpperCase())}
                  className="coliseu-input"
                  style={{ height: '30px', textAlign: 'center', fontWeight: 700 }}
                />
              </div>
            </div>
          </div>

          {/* BARRA DE INCLUSÃO RÁPIDA DE PRODUTOS (MULTI-CHAVES F9 COM NAVEGAÇÃO POR TECLADO) */}
          <form
            onSubmit={handleAdicionarItem}
            style={{
              padding: '10px 14px',
              backgroundColor: 'rgba(59, 130, 246, 0.08)',
              borderRadius: '6px',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              position: 'relative',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Barcode size={15} /> Inclusão Ultrarrápida de Produtos (F9) — Pressione [Enter] para navegar entre os campos e adicionar ao pedido
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '3fr 80px 100px 90px 140px', gap: '8px', alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <input
                  ref={buscaInputRef}
                  type="text"
                  value={buscaProdutoTermo}
                  onChange={(e) => handleBuscaDigitada(e.target.value)}
                  onKeyDown={handleBuscaKeyDown}
                  placeholder="DIGITE CÓD. FÁBRICA (EX: PU-8100-5L), REF, EAN-13, NOME OU SIMILAR..."
                  className="coliseu-input"
                  style={{ height: '34px', width: '100%', fontWeight: 600, fontSize: '11px' }}
                />

                {/* Dropdown de Sugestões de Busca */}
                {sugestoesBusca.length > 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '38px',
                      left: 0,
                      right: 0,
                      backgroundColor: 'var(--surface-1)',
                      border: '1px solid var(--border-default)',
                      borderRadius: '6px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                      zIndex: 200,
                      maxHeight: '200px',
                      overflowY: 'auto',
                    }}
                  >
                    {sugestoesBusca.map((p, idx) => (
                      <div
                        key={p.id}
                        onClick={() => handleSelecionarSugestao(p)}
                        style={{
                          padding: '8px 12px',
                          borderBottom: '1px solid var(--border-subtle)',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '11px',
                          backgroundColor: idx === sugestaoIndex ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                        }}
                      >
                        <div>
                          <strong style={{ color: idx === sugestaoIndex ? '#3b82f6' : 'var(--text-primary)' }}>{p.codigoFabrica}</strong> — {p.descricao}
                          <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                            Ref: {p.referencia} • EAN: {p.codigoBarras} • Estoque: {p.estoqueDisponivel} un
                          </div>
                        </div>
                        <div style={{ fontWeight: 700, color: '#10b981', fontFamily: 'monospace' }}>
                          {formatCurrency(p.precoVenda)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <input
                  ref={qtdInputRef}
                  type="number"
                  min="1"
                  value={qtdInclusao}
                  onChange={(e) => setQtdInclusao(parseFloat(e.target.value) || 1)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === 'ArrowRight') {
                      e.preventDefault();
                      descontoInputRef.current?.focus();
                      descontoInputRef.current?.select();
                    } else if (e.key === 'ArrowLeft') {
                      e.preventDefault();
                      buscaInputRef.current?.focus();
                    }
                  }}
                  placeholder="Qtd"
                  className="coliseu-input"
                  style={{ height: '34px', width: '100%', textAlign: 'center', fontWeight: 700 }}
                />
              </div>

              <div>
                <input
                  type="text"
                  readOnly
                  value={produtoEncontrado ? formatCurrency(produtoEncontrado.precoVenda) : 'R$ 0,00'}
                  className="coliseu-input"
                  style={{ height: '34px', width: '100%', textAlign: 'right', backgroundColor: 'var(--surface-2)', fontFamily: 'monospace' }}
                />
              </div>

              <div>
                <input
                  ref={descontoInputRef}
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  value={descontoInclusaoPercent}
                  onChange={(e) => setDescontoInclusaoPercent(parseFloat(e.target.value) || 0)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAdicionarItem();
                    } else if (e.key === 'ArrowLeft') {
                      e.preventDefault();
                      qtdInputRef.current?.focus();
                    }
                  }}
                  placeholder="% Desc"
                  className="coliseu-input"
                  style={{ height: '34px', width: '100%', textAlign: 'center', color: '#10b981', fontWeight: 700 }}
                />
              </div>

              <div>
                <Button type="submit" variant="primary" style={{ width: '100%', height: '34px', fontSize: '11px' }} leftIcon={<Plus size={14} />}>
                  + Inserir Item
                </Button>
              </div>
            </div>

            {/* Aviso de Similares se selecionado */}
            {produtoEncontrado?.similares && (
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span>💡 Produtos Similares/Substitutos:</span>
                {produtoEncontrado.similares.map((sim: string, idx: number) => (
                  <span key={idx} style={{ backgroundColor: 'var(--surface-3)', padding: '1px 6px', borderRadius: '3px' }}>
                    {sim}
                  </span>
                ))}
              </div>
            )}
          </form>

          {/* GRID DE ITENS DO PEDIDO */}
          <div className="coliseu-table-container" style={{ flex: 1, minHeight: '180px' }}>
            <table className="coliseu-table" style={{ fontSize: '11px' }}>
              <thead>
                <tr>
                  <th style={{ width: '35px', textAlign: 'center' }}>#</th>
                  <th style={{ width: '90px' }}>Cód. Fábrica</th>
                  <th style={{ width: '90px' }}>Referência</th>
                  <th>Produto / Descrição</th>
                  <th style={{ width: '50px', textAlign: 'center' }}>Un</th>
                  <th style={{ width: '60px', textAlign: 'center' }}>Qtde</th>
                  <th style={{ width: '90px', textAlign: 'right' }}>Preço Tab.</th>
                  <th style={{ width: '70px', textAlign: 'center' }}>Desc %</th>
                  <th style={{ width: '90px', textAlign: 'right' }}>Preço Un.</th>
                  <th style={{ width: '100px', textAlign: 'right' }}>Subtotal</th>
                  <th style={{ width: '60px', textAlign: 'center' }}>ICMS</th>
                  <th style={{ width: '40px', textAlign: 'center' }}></th>
                </tr>
              </thead>
              <tbody>
                {itens.map((it, idx) => (
                  <tr key={it.id}>
                    <td style={{ textAlign: 'center', fontWeight: 700 }}>{it.itemOrdem}</td>
                    <td style={{ fontWeight: 700, color: 'var(--text-link)', fontFamily: 'monospace' }}>{it.codigoFabrica}</td>
                    <td style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{it.referencia}</td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{it.descricao}</div>
                      <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                        EAN: {it.codigoBarras} • Estoque: {it.estoqueAtualDisponivel} un
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>{it.unidadeMedida}</td>
                    <td style={{ textAlign: 'center', fontWeight: 700 }}>{it.quantidade}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{formatCurrency(it.precoTabelaUnitario)}</td>
                    <td style={{ textAlign: 'center', color: it.descontoPercent > 0 ? '#10b981' : 'var(--text-muted)', fontWeight: 700 }}>
                      {it.descontoPercent > 0 ? `${it.descontoPercent}%` : '-'}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>{formatCurrency(it.precoFinalUnitario)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: '#10b981', fontFamily: 'monospace' }}>
                      {formatCurrency(it.subtotalLiquido)}
                    </td>
                    <td style={{ textAlign: 'center', fontSize: '10px' }}>{it.aliquotaIcms}%</td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleRemoverItem(idx)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                        title="Remover item"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
                {itens.length === 0 && (
                  <tr>
                    <td colSpan={12} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                      Nenhum item inserido no pedido. Utilize a barra acima ou pressione <strong>F9</strong> para buscar produtos.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* PAINEL INFERIOR: TOTAIS FISCAIS & GRID DE PARCELAS/DUPLICATAS */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.2fr', gap: '10px' }}>
            {/* Grid de Parcelas Financeiras */}
            <div style={{ padding: '10px', backgroundColor: 'var(--surface-2)', borderRadius: '6px', border: '1px solid var(--border-default)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Condições de Pagamento & Duplicatas (F10)
                </span>
                <select
                  value={formaPagamentoNome}
                  onChange={(e) => {
                    setFormaPagamentoNome(e.target.value);
                    recalcularParcelas(itens, valorFrete);
                  }}
                  className="coliseu-input"
                  style={{ height: '24px', fontSize: '10px', fontWeight: 700 }}
                >
                  <option value="À VISTA / PIX">À VISTA (PIX / DINHEIRO)</option>
                  <option value="30 DIAS (BOLETO BANCÁRIO)">30 DIAS (BOLETO BANCÁRIO)</option>
                  <option value="30/60 DIAS (BOLETO BANCÁRIO)">30/60 DIAS (BOLETO BANCÁRIO)</option>
                  <option value="30/60/90 DIAS (BOLETO BANCÁRIO)">30/60/90 DIAS (BOLETO BANCÁRIO)</option>
                  <option value="CARTÃO DE CRÉDITO 3X">CARTÃO DE CRÉDITO 3X</option>
                </select>
              </div>

              <div style={{ maxHeight: '80px', overflowY: 'auto' }}>
                <table style={{ width: '100%', fontSize: '10px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                      <th style={{ textAlign: 'left' }}>Parc</th>
                      <th style={{ textAlign: 'center' }}>Vencimento</th>
                      <th style={{ textAlign: 'left' }}>Nº Doc</th>
                      <th style={{ textAlign: 'right' }}>Valor</th>
                      <th style={{ textAlign: 'left', paddingLeft: '8px' }}>Espécie</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parcelas.map((parc) => (
                      <tr key={parc.numeroParcela} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ fontWeight: 700 }}>{parc.numeroParcela}ª</td>
                        <td style={{ textAlign: 'center' }}>{parc.dataVencimento}</td>
                        <td style={{ fontFamily: 'monospace' }}>{parc.numeroDocumento}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#10b981', fontFamily: 'monospace' }}>
                          {formatCurrency(parc.valorParcela)}
                        </td>
                        <td style={{ paddingLeft: '8px', color: 'var(--text-muted)' }}>{parc.especiePagamento}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totalizadores Gerais */}
            <div style={{ padding: '10px 14px', backgroundColor: 'var(--surface-2)', borderRadius: '6px', border: '1px solid var(--border-default)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', fontSize: '10px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Base ICMS:</span>
                  <div style={{ fontWeight: 700 }}>{formatCurrency(totalProdutos - totalDescontos)}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Valor ICMS:</span>
                  <div style={{ fontWeight: 700 }}>{formatCurrency(totalIcms)}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Valor IPI:</span>
                  <div style={{ fontWeight: 700 }}>{formatCurrency(totalIpi)}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Frete:</span>
                  <input
                    type="number"
                    value={valorFrete || ''}
                    onChange={(e) => {
                      const f = parseFloat(e.target.value) || 0;
                      setValorFrete(f);
                      recalcularParcelas(itens, f);
                    }}
                    placeholder="0,00"
                    style={{ width: '60px', height: '18px', textAlign: 'right', fontSize: '10px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '6px', marginTop: '6px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Total Produtos: <strong>{formatCurrency(totalProdutos)}</strong> • Desc (F1): <strong style={{ color: '#10b981' }}>- {formatCurrency(totalDescontos)}</strong>
                </div>
                <div style={{ fontSize: '20px', fontWeight: 900, color: '#10b981', fontFamily: 'monospace' }}>
                  TOTAL: {formatCurrency(valorTotalFinal)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BARRA INFERIOR DE FATURAMENTO & ATALHOS */}
        <div
          style={{
            padding: '10px 16px',
            backgroundColor: 'var(--surface-2)',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          {/* Atalhos Rápidos */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <Button variant="secondary" size="sm" type="button" onClick={handleLimparNovo} title="Novo Pedido (F3)">
              Novo (F3)
            </Button>
            <Button variant="secondary" size="sm" type="button" onClick={handleImprimir} leftIcon={<Printer size={13} />} title="Imprimir Orçamento A4 (F6)">
              Imprimir A4 (F6)
            </Button>
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={handleAbrirFaturamentoNFe}
              leftIcon={<FileCheck size={13} />}
              style={{ color: '#3b82f6', fontWeight: 700 }}
              title="Faturar e Emitir NF-e Mod. 55 (F2)"
            >
              Emitir NFE (F2)
            </Button>
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={handleAbrirFaturamentoNFCe}
              leftIcon={<Receipt size={13} />}
              style={{ color: '#10b981', fontWeight: 700 }}
              title="Emitir Cupom Fiscal NFC-e Mod. 65 (F4)"
            >
              Emitir NFCe (F4)
            </Button>
          </div>

          {/* Ações Principais */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Button variant="secondary" type="button" onClick={onClose}>
              Fechar (ESC)
            </Button>

            {/* Salvar Orçamento (F5) */}
            <Button
              variant="secondary"
              type="button"
              onClick={handleSalvarOrcamento}
              disabled={isBloqueadoEdicao && !isCancelado}
              leftIcon={<Save size={14} />}
              style={{ fontWeight: 700 }}
              title="Salvar apenas como Orçamento em Aberto (F5)"
            >
              Salvar Orçamento (F5)
            </Button>

            {/* Botão de Cancelar Venda para pedidos Processados ou em Faturamento */}
            {(isProcessado || isEmFaturamento) && (
              <Button
                variant="danger"
                type="button"
                onClick={() => setIsModalCancelarOpen(true)}
                style={{ backgroundColor: '#ef4444', borderColor: '#ef4444', color: '#fff', fontWeight: 700 }}
                title="Cancelar a venda e estornar estoque/financeiro"
              >
                🚫 Cancelar Venda
              </Button>
            )}

            {/* Botão de Reabrir Orçamento para pedidos Cancelados */}
            {isCancelado && (
              <Button
                variant="secondary"
                type="button"
                onClick={handleReabrirParaEdicao}
                style={{ borderColor: '#0070f3', color: '#0070f3', fontWeight: 700 }}
                title="Reabrir este pedido como Orçamento em Aberto"
              >
                🔄 Reabrir Orçamento
              </Button>
            )}

            {/* Confirmar Venda / Processar (F7) */}
            {isProcessado ? (
              <Button
                variant="secondary"
                type="button"
                disabled
                style={{ opacity: 0.6, cursor: 'not-allowed', fontWeight: 700 }}
                title="Esta venda já foi processada e finalizada. Cancele a venda caso precise alterar."
              >
                🔒 Venda Processada (F7)
              </Button>
            ) : (
              <Button
                variant="primary"
                type="button"
                onClick={handleConfirmarVenda}
                style={{ backgroundColor: '#10b981', borderColor: '#10b981', fontWeight: 700 }}
                leftIcon={<Save size={15} />}
                title="Processar Venda, Baixar Estoque & Lançar no Financeiro (F7)"
              >
                Confirmar Venda (F7)
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Busca Rápida de Clientes (F8) */}
      {isModalBuscaClientesOpen && (
        <ModalBuscaClientes
          isOpen={isModalBuscaClientesOpen}
          onClose={() => setIsModalBuscaClientesOpen(false)}
          onSelectCliente={handleClienteSelecionado}
        />
      )}

      {/* Modal Especializado de Faturamento / Emissão de NF-e Mod. 55 */}
      {isModalFaturamentoOpen && (
        <ModalFaturamentoNFe
          isOpen={isModalFaturamentoOpen}
          onClose={() => setIsModalFaturamentoOpen(false)}
          pedido={montarObjetoPedido('EM_FATURAMENTO')}
          onFaturamentoConcluido={(faturado) => {
            setStatus('EM_FATURAMENTO');
            setNumeroNFe(faturado.numeroNFe);
            setChaveNFeEmitida(faturado.chaveNFeEmitida);
            setStatusFiscalNfe(faturado.statusFiscalNfe);
            setProtocoloAutorizacao(faturado.protocoloAutorizacao);
            setDataAutorizacaoSefaz(faturado.dataAutorizacaoSefaz);
            setDataFaturamento(faturado.dataFaturamento);
            faturado.status = 'EM_FATURAMENTO';
            salvarPedidoVenda(faturado);
            onSaveSuccess(faturado);
          }}
        />
      )}

      {/* Modal Especializado de Faturamento / Emissão de NFC-e Mod. 65 */}
      {isModalFaturamentoNFCeOpen && (
        <ModalFaturamentoNFCe
          isOpen={isModalFaturamentoNFCeOpen}
          onClose={() => setIsModalFaturamentoNFCeOpen(false)}
          pedido={montarObjetoPedido('EM_FATURAMENTO')}
          onFaturamentoConcluido={(faturado) => {
            setStatus('EM_FATURAMENTO');
            setNumeroNFCe(faturado.numeroNFCe);
            setChaveNFCeEmitida(faturado.chaveNFCeEmitida);
            setStatusFiscalNfce(faturado.statusFiscalNfce);
            setProtocoloAutorizacao(faturado.protocoloAutorizacao);
            setDataAutorizacaoSefaz(faturado.dataAutorizacaoSefaz);
            setDataFaturamento(faturado.dataFaturamento);
            faturado.status = 'EM_FATURAMENTO';
            salvarPedidoVenda(faturado);
            onSaveSuccess(faturado);
          }}
        />
      )}

      {/* Modal de Cancelamento de Pedido com Estorno */}
      {isModalCancelarOpen && (
        <ModalCancelarPedido
          isOpen={isModalCancelarOpen}
          onClose={() => setIsModalCancelarOpen(false)}
          pedido={pedidoEdicao || montarObjetoPedido()}
          onCancelamentoConcluido={(cancelado) => {
            setStatus('CANCELADO');
            onSaveSuccess(cancelado);
            setIsModalCancelarOpen(false);
          }}
        />
      )}
    </div>
  );
};
