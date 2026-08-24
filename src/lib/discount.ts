import type { Produto, VendaItemPayload } from './types';

export interface CartItem {
  produto: Produto;
  quantidade: number;
  preco_unitario: number;
  desconto_unitario_manual: number;
}

export interface CalculatedCartItem extends CartItem {
  item_ordem: number;
  subtotal: number;
  desconto_rateado_total: number;
  desconto_unitario_final: number;
  valor_total: number;
}

export interface CartCalculationResult {
  subtotal: number;
  desconto_itens_manual: number;
  desconto_global: number;
  desconto_total_combinado: number;
  valor_total: number;
  items: CalculatedCartItem[];
}

/**
 * BLINDAGEM RULE-16 (rule-16-erp-discount-shield.md):
 * Rateia todo e qualquer desconto global do pedido proporcionalmente entre os itens.
 * Garante que a soma dos valores totais dos itens é exatamente igual ao valor final da venda.
 * O cabeçalho do pedido no ERP devederá receber SEMPRE valor_desconto = 0.00 para evitar abatimento duplo no Firebird.
 */
export function calculateCart(
  cartItems: CartItem[],
  discountValue: number,
  discountType: 'value' | 'percent'
): CartCalculationResult {
  if (cartItems.length === 0) {
    return {
      subtotal: 0,
      desconto_itens_manual: 0,
      desconto_global: 0,
      desconto_total_combinado: 0,
      valor_total: 0,
      items: [],
    };
  }

  // 1. Calcular subtotal bruto e descontos manuais por item
  let subtotalBruto = 0;
  let descontoItensManualTotal = 0;

  const baseItems = cartItems.map((item, index) => {
    const itemSubtotal = item.quantidade * item.preco_unitario;
    const manualDiscountTotal = Math.min(
      itemSubtotal,
      item.desconto_unitario_manual * item.quantidade
    );
    subtotalBruto += itemSubtotal;
    descontoItensManualTotal += manualDiscountTotal;

    return {
      ...item,
      item_ordem: index + 1,
      subtotal: itemSubtotal,
      subtotal_apos_desconto_manual: Math.max(0, itemSubtotal - manualDiscountTotal),
      manual_discount_total: manualDiscountTotal,
    };
  });

  const subtotalAposDescontosManuais = baseItems.reduce(
    (acc, curr) => acc + curr.subtotal_apos_desconto_manual,
    0
  );

  // 2. Calcular valor efetivo do desconto global em R$
  let descontoGlobalEfetivo = 0;
  if (discountType === 'percent') {
    descontoGlobalEfetivo = (subtotalAposDescontosManuais * Math.max(0, discountValue)) / 100;
  } else {
    descontoGlobalEfetivo = Math.max(0, discountValue);
  }
  // Não pode exceder o subtotal disponível
  descontoGlobalEfetivo = Math.min(subtotalAposDescontosManuais, descontoGlobalEfetivo);

  // 3. Rateio proporcional do desconto global entre os itens
  const globalDiscountsPerItem: number[] = new Array(baseItems.length).fill(0);

  if (descontoGlobalEfetivo > 0 && subtotalAposDescontosManuais > 0) {
    let allocatedSum = 0;
    let maxSubtotalIdx = 0;
    let maxSubtotalVal = -1;

    baseItems.forEach((item, idx) => {
      if (item.subtotal_apos_desconto_manual > maxSubtotalVal) {
        maxSubtotalVal = item.subtotal_apos_desconto_manual;
        maxSubtotalIdx = idx;
      }

      const ratio = item.subtotal_apos_desconto_manual / subtotalAposDescontosManuais;
      // Arredonda para 2 casas decimais
      const itemAllocatedDiscount = Math.round(descontoGlobalEfetivo * ratio * 100) / 100;
      globalDiscountsPerItem[idx] = itemAllocatedDiscount;
      allocatedSum += itemAllocatedDiscount;
    });

    // Ajustar a diferença de centavos decorrente de arredondamento no item de maior valor
    const remainder = Math.round((descontoGlobalEfetivo - allocatedSum) * 100) / 100;
    if (remainder !== 0 && globalDiscountsPerItem.length > 0) {
      globalDiscountsPerItem[maxSubtotalIdx] = Math.round(
        (globalDiscountsPerItem[maxSubtotalIdx] + remainder) * 100
      ) / 100;
    }
  }

  // 4. Consolidar itens finais com desconto unitário e valor total por item
  let valorTotalCalculado = 0;
  let descontoTotalCombinado = 0;

  const calculatedItems: CalculatedCartItem[] = baseItems.map((item, idx) => {
    const descontoGlobalItem = globalDiscountsPerItem[idx];
    const descontoTotalItem = Math.round((item.manual_discount_total + descontoGlobalItem) * 100) / 100;
    const valorTotalItem = Math.max(0, Math.round((item.subtotal - descontoTotalItem) * 100) / 100);
    const descontoUnitarioFinal = Math.round((descontoTotalItem / item.quantidade) * 10000) / 10000;

    valorTotalCalculado += valorTotalItem;
    descontoTotalCombinado += descontoTotalItem;

    return {
      produto: item.produto,
      quantidade: item.quantidade,
      preco_unitario: item.preco_unitario,
      desconto_unitario_manual: item.desconto_unitario_manual,
      item_ordem: item.item_ordem,
      subtotal: item.subtotal,
      desconto_rateado_total: descontoTotalItem,
      desconto_unitario_final: descontoUnitarioFinal,
      valor_total: valorTotalItem,
    };
  });

  return {
    subtotal: Math.round(subtotalBruto * 100) / 100,
    desconto_itens_manual: Math.round(descontoItensManualTotal * 100) / 100,
    desconto_global: Math.round(descontoGlobalEfetivo * 100) / 100,
    desconto_total_combinado: Math.round(descontoTotalCombinado * 100) / 100,
    valor_total: Math.round(valorTotalCalculado * 100) / 100,
    items: calculatedItems,
  };
}

/**
 * Converte itens do carrinho calculados para a estrutura VendaItemPayload exigida pelo IPC Rust.
 */
export function buildVendaItensPayload(items: CalculatedCartItem[]): VendaItemPayload[] {
  return items.map((item) => ({
    produto_id: item.produto.id,
    item_ordem: item.item_ordem,
    quantidade: item.quantidade,
    preco_unitario: item.preco_unitario,
    desconto_unitario: item.desconto_unitario_final,
    valor_total: item.valor_total,
  }));
}
