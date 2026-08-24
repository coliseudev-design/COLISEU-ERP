/**
 * Coliseu ERP - Universal Sync Service (Omni-Sync Bridge)
 * 
 * Gerencia a transmissão e sincronização bidirecional de dados entre o
 * Executável Desktop (Local-First) e o PostgreSQL Central na Nuvem (VPS).
 */

import { syncEngine } from './syncEngine';

const CLOUD_API_URL = syncEngine.getApiUrl();

export const syncService = {
  // Sincronizar um único pedido imediatamente
  async syncPedido(pedido: any): Promise<boolean> {
    return await syncEngine.mutate({
      entity: 'pedidos_venda',
      action: 'UPSERT',
      id: pedido.id,
      payload: pedido,
    });
  },

  // Excluir pedido na nuvem imediatamente
  async deletePedido(pedidoId: string): Promise<boolean> {
    return await syncEngine.mutate({
      entity: 'pedidos_venda',
      action: 'DELETE',
      id: pedidoId,
      payload: { id: pedidoId },
    });
  },

  // Baixa / Ajuste atômico de estoque (Zero Race Condition)
  async syncEstoqueDelta(produtoId: string, deltaQuantidade: number, motivo?: string): Promise<boolean> {
    return await syncEngine.mutate({
      entity: 'produtos',
      action: 'STOCK_DELTA',
      id: produtoId,
      payload: { delta_quantidade: deltaQuantidade, motivo },
    });
  },

  // Alteração de preço de produto
  async syncPrecoProduto(produtoId: string, precoVenda: number, precoCusto?: number): Promise<boolean> {
    return await syncEngine.mutate({
      entity: 'produtos',
      action: 'PRICE_UPDATE',
      id: produtoId,
      payload: { preco_venda: precoVenda, preco_custo: precoCusto },
    });
  },

  // Sincronizar todos os pedidos locais em lote (Batch Sync)
  async syncBatchPedidos(pedidos: any[]): Promise<boolean> {
    if (!pedidos || pedidos.length === 0) return true;
    try {
      const response = await fetch(`${CLOUD_API_URL}/api/pedidos/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pedidos }),
      });
      return response.ok;
    } catch (err) {
      console.warn('[SyncService] Falha no batch sync de pedidos:', err);
      return false;
    }
  },

  // Buscar pedidos consolidados na nuvem (PostgreSQL Central)
  async fetchCloudPedidos(): Promise<any[]> {
    try {
      const response = await fetch(`${CLOUD_API_URL}/api/pedidos`);
      if (response.ok) {
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      }
    } catch (err) {
      console.warn('[SyncService] Falha ao buscar pedidos da nuvem:', err);
    }
    return [];
  },
};
