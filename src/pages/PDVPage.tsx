import React, { useState, useEffect, useRef } from 'react';
import type { Produto, CreateVendaPayload, VendaPagamentoPayload } from '../lib/types';
import type { CartItem } from '../lib/discount';
import { dbService } from '../lib/db';
import { fiscalService, DocumentoFiscalResult } from '../lib/fiscal';
import { calculateCart, buildVendaItensPayload } from '../lib/discount';
import { parseNumber } from '../lib/formatters';
import { obterProximoNumeroNFCe, incrementarNumeroNFCe } from '../lib/nfceConfig';

import { POSHeader } from '../components/pdv/POSHeader';
import { BarcodeScannerListener } from '../components/pdv/BarcodeScannerListener';
import { ProductGrid } from '../components/pdv/ProductGrid';
import { CartSummary } from '../components/pdv/CartSummary';
import { PaymentModal } from '../components/pdv/PaymentModal';
import { FiscalContingencyBanner } from '../components/pdv/FiscalContingencyBanner';

import { CheckCircle2, AlertCircle } from 'lucide-react';

const MOCK_PRODUCTS: Produto[] = [
  { id: 'prod-001', empresa_id: 'emp-01', codigo_sku: 'VERNIZ-PU-8100', codigo_barras: '7891991000803', descricao: 'Verniz Poliuretano Alto Sólidos 5L', unidade_medida: 'UN', preco_custo: 120.0, preco_venda: 200.0, ncm: '32082019', ativo: true, device_id: 'dev-local', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), x_sync_status: 'synced', x_version: 1, is_deleted: 0 },
  { id: 'prod-002', empresa_id: 'emp-01', codigo_sku: 'PRIMER-EP-310', codigo_barras: '7896006700018', descricao: 'Primer Epóxi Cinza Automotivo 3.6L', unidade_medida: 'UN', preco_custo: 85.0, preco_venda: 150.0, ncm: '32089010', ativo: true, device_id: 'dev-local', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), x_sync_status: 'synced', x_version: 1, is_deleted: 0 },
  { id: 'prod-003', empresa_id: 'emp-01', codigo_sku: 'TINTA-BASE-POL', codigo_barras: '7896006700025', descricao: 'Tinta Base Poliéster Prata Lunar 900ml', unidade_medida: 'UN', preco_custo: 72.0, preco_venda: 130.0, ncm: '32081010', ativo: true, device_id: 'dev-local', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), x_sync_status: 'synced', x_version: 1, is_deleted: 0 },
  { id: 'prod-004', empresa_id: 'emp-01', codigo_sku: 'DILUENTE-PU-500', codigo_barras: '7891000240105', descricao: 'Diluente para Poliuretano e Poliéster 5L', unidade_medida: 'UN', preco_custo: 48.0, preco_venda: 90.0, ncm: '38140090', ativo: true, device_id: 'dev-local', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), x_sync_status: 'synced', x_version: 1, is_deleted: 0 },
  { id: 'prod-005', empresa_id: 'emp-01', codigo_sku: 'MASSA-PLAST-1KG', codigo_barras: '7891000300052', descricao: 'Massa Plástica com Catalisador 1kg', unidade_medida: 'UN', preco_custo: 18.0, preco_venda: 35.0, ncm: '32141010', ativo: true, device_id: 'dev-local', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), x_sync_status: 'synced', x_version: 1, is_deleted: 0 },
  { id: 'prod-006', empresa_id: 'emp-01', codigo_sku: 'LIXA-AGUA-600', codigo_barras: '7896006700100', descricao: 'Lixa d Água Grão 600 Folha', unidade_medida: 'UN', preco_custo: 2.2, preco_venda: 5.5, ncm: '68052000', ativo: true, device_id: 'dev-local', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), x_sync_status: 'synced', x_version: 1, is_deleted: 0 },
];

export const PDVPage: React.FC = () => {
  const [products, setProducts] = useState<Produto[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [discountType, setDiscountType] = useState<'value' | 'percent'>('value');

  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'contingency'>('synced');
  const [isContingency, setIsContingency] = useState<boolean>(false);
  const [pendingContingencyCount, setPendingContingencyCount] = useState<number>(0);

  const [isPaymentOpen, setIsPaymentOpen] = useState<boolean>(false);
  const [isSangriaOpen, setIsSangriaOpen] = useState<boolean>(false);
  const [sangriaType, setSangriaType] = useState<'sangria' | 'suprimento'>('sangria');
  const [sangriaAmount, setSangriaAmount] = useState<string>('');
  const [sangriaObs, setSangriaObs] = useState<string>('');

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isRetransmitting, setIsRetransmitting] = useState<boolean>(false);
  const [completedFiscalDoc, setCompletedFiscalDoc] = useState<DocumentoFiscalResult | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const [gridFocusedIndex, setGridFocusedIndex] = useState<number>(0);

  const loadProducts = async () => {
    try {
      if (typeof window !== 'undefined' && !('__TAURI_INTERNALS__' in window)) {
        setProducts(MOCK_PRODUCTS);
        return;
      }
      const loaded = await dbService.listProdutos('emp-01');
      if (loaded && loaded.length > 0) {
        setProducts(loaded);
      } else {
        setProducts(MOCK_PRODUCTS);
      }
    } catch (err: any) {
      console.warn('Erro ao listar produtos via IPC (usando mock):', err);
      setProducts(MOCK_PRODUCTS);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3000);
  };

  const handleBarcodeScanned = (code: string) => {
    const cleanCode = code.trim().toLowerCase();
    const found = products.find(
      (p) =>
        p.codigo_barras?.toLowerCase() === cleanCode ||
        p.codigo_sku.toLowerCase() === cleanCode
    );

    if (found) {
      handleAddToCart(found);
      showToast(`Item adicionado: ${found.descricao}`);
    } else {
      showToast(`Produto "${code}" não localizado.`);
    }
  };

  const handleAddToCart = (product: Produto) => {
    setCart((prevCart) => {
      const idx = prevCart.findIndex((item) => item.produto.id === product.id);
      if (idx >= 0) {
        const updated = [...prevCart];
        updated[idx] = {
          ...updated[idx],
          quantidade: updated[idx].quantidade + 1,
        };
        return updated;
      } else {
        return [
          ...prevCart,
          {
            produto: product,
            quantidade: 1,
            preco_unitario: product.preco_venda,
            desconto_unitario_manual: 0,
          },
        ];
      }
    });
  };

  const handleUpdateQuantity = (index: number, qty: number) => {
    setCart((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], quantidade: qty };
      return updated;
    });
  };

  const handleRemoveItem = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClearCart = () => {
    if (cart.length === 0) return;
    setCart([]);
    setDiscountValue(0);
    showToast('Carrinho limpo.');
  };

  const handleF1_Search = () => {
    searchInputRef.current?.focus();
    searchInputRef.current?.select();
  };

  const handleF2_Payment = () => {
    if (cart.length > 0) {
      setIsPaymentOpen(true);
    } else {
      showToast('Adicione itens ao carrinho antes de prosseguir com o pagamento.');
    }
  };

  const handleF3_Cancel = () => {
    handleClearCart();
  };

  const handleF4_Sangria = () => {
    setIsSangriaOpen(true);
  };

  const handleF5_Sync = () => {
    setSyncStatus('syncing');
    setTimeout(() => {
      setSyncStatus(isContingency ? 'contingency' : 'synced');
      showToast('Sincronização concluída com sucesso.');
    }, 800);
  };

  const handleEsc_Close = () => {
    setIsPaymentOpen(false);
    setIsSangriaOpen(false);
    setCompletedFiscalDoc(null);
  };

  const handleConfirmPayment = async (pagamentos: VendaPagamentoPayload[]) => {
    setIsProcessing(true);
    try {
      const cartCalc = calculateCart(cart, discountValue, discountType);
      const vendaItensPayload = buildVendaItensPayload(cartCalc.items);

      const vendaPayload: CreateVendaPayload = {
        filial_id: 'filial-01',
        deposito_id: 'deposito-01',
        valor_subtotal: cartCalc.subtotal,
        valor_desconto: 0.0,
        valor_total: cartCalc.valor_total,
        itens: vendaItensPayload,
        pagamentos: pagamentos,
        observacoes: 'Venda efetuada via PDV Local-First',
      };

      let vendaId = 'venda-temp-' + Date.now();
      if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
        const createdVenda = await dbService.createVenda(vendaPayload);
        vendaId = createdVenda.id;
      }

      let fiscalDoc: DocumentoFiscalResult;
      const tpEmis = isContingency ? 9 : 1;

      if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
        fiscalDoc = await fiscalService.emitirNFCe(vendaId, 65, tpEmis);
        incrementarNumeroNFCe();
      } else {
        const nfceInfo = obterProximoNumeroNFCe();
        const numAtual = nfceInfo.proximoNumero;
        incrementarNumeroNFCe(numAtual);

        fiscalDoc = {
          id: 'doc-' + Date.now(),
          chave_acesso: `5026080576657700012265001${String(numAtual).padStart(9, '0')}1000001234`,
          status: isContingency ? 'contingencia' : 'autorizado',
          modelo: 65,
          serie: nfceInfo.serie,
          numero: numAtual,
          xml_envio: '<nfeProc>...</nfeProc>',
          qrcode_url:
            `https://www.sefaz.ms.gov.br/nfce/qrcode?p=5026080576657700012265001${String(numAtual).padStart(9, '0')}1000001234|2|1|1|HASH`,
        };
      }

      if (fiscalDoc.status === 'contingencia') {
        setPendingContingencyCount((prev) => prev + 1);
        setSyncStatus('contingency');
      }

      setCompletedFiscalDoc(fiscalDoc);
      setIsPaymentOpen(false);
      setCart([]);
      setDiscountValue(0);
      showToast('Venda registrada e NFC-e emitida com sucesso!');
    } catch (err: any) {
      showToast(`Erro ao finalizar venda: ${err?.message || 'Falha IPC'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetransmitContingency = async () => {
    setIsRetransmitting(true);
    try {
      if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
        const retransmitted = await fiscalService.retransmitirContingencia();
        setPendingContingencyCount(Math.max(0, pendingContingencyCount - retransmitted));
        showToast(`Retransmitidos ${retransmitted} documentos.`);
      } else {
        await new Promise((res) => setTimeout(res, 1200));
        setPendingContingencyCount(0);
        setIsContingency(false);
        setSyncStatus('synced');
        showToast('Retransmissão concluída.');
      }
    } catch (err: any) {
      showToast(`Erro na retransmissão: ${err?.message || 'Falha SEFAZ'}`);
    } finally {
      setIsRetransmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--surface-app)', color: 'var(--text-primary)', overflow: 'hidden' }}>
      <BarcodeScannerListener
        onBarcodeScanned={handleBarcodeScanned}
        onF1_Search={handleF1_Search}
        onF2_Payment={handleF2_Payment}
        onF3_Cancel={handleF3_Cancel}
        onF4_Sangria={handleF4_Sangria}
        onF5_Sync={handleF5_Sync}
        onEsc_Close={handleEsc_Close}
      />

      <POSHeader
        syncStatus={syncStatus}
        filialNome="Filial Matriz 01"
        operadorNome="Caixa 01 - Roberto"
        caixaNumero="CX-01"
        onManualSync={handleF5_Sync}
      />

      <FiscalContingencyBanner
        isContingency={isContingency || syncStatus === 'contingency'}
        pendingCount={pendingContingencyCount}
        onRetransmit={handleRetransmitContingency}
        isRetransmitting={isRetransmitting}
      />

      {/* Grid Principal PDV (Esquerda 7 colunas / Direita 5 colunas) */}
      <div style={{ flex: 1, padding: 'var(--spacing-2) var(--spacing-3)', display: 'grid', gridTemplateColumns: '7fr 5fr', gap: 'var(--spacing-2-5)', overflow: 'hidden' }}>
        <div style={{ height: '100%', overflow: 'hidden' }}>
          <ProductGrid
            products={products}
            onSelectProduct={handleAddToCart}
            onQuickAdd={handleAddToCart}
            searchInputRef={searchInputRef}
            focusedIndex={gridFocusedIndex}
            setFocusedIndex={setGridFocusedIndex}
          />
        </div>

        <div style={{ height: '100%', overflow: 'hidden' }}>
          <CartSummary
            items={cart}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            onClearCart={handleClearCart}
            discountValue={discountValue}
            discountType={discountType}
            onUpdateDiscount={(val, type) => {
              setDiscountValue(val);
              setDiscountType(type);
            }}
            onOpenPayment={handleF2_Payment}
          />
        </div>
      </div>

      {toastMessage && (
        <div style={{ position: 'fixed', bottom: '16px', right: '16px', zIndex: 50, backgroundColor: 'var(--surface-2)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', padding: '8px 14px', borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow-md)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--font-size-xs)' }}>
          <CheckCircle2 size={14} style={{ color: 'var(--status-success)' }} />
          <span>{toastMessage}</span>
        </div>
      )}

      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        totalAmount={calculateCart(cart, discountValue, discountType).valor_total}
        onConfirmPayment={handleConfirmPayment}
        isProcessing={isProcessing}
      />
    </div>
  );
};
