/**
 * Coliseu ERP - Sync Service (Local-First Cloud Bridge)
 * 
 * Gerencia a transmissão e sincronização bidirecional de dados entre o
 * Executável Desktop (Local-First) e o PostgreSQL Central na Nuvem (VPS).
 */

const CLOUD_API_URL = typeof window !== 'undefined' && window.location.origin.includes('coliseusistemas.com.br')
  ? window.location.origin
  : 'https://erp.coliseusistemas.com.br';

export const syncService = {
  // Sincronizar um único pedido imediatamente
  async syncPedido(pedido: any): Promise<boolean> {
    try {
      const response = await fetch(`${CLOUD_API_URL}/api/pedidos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pedido),
      });
      return response.ok;
    } catch (err) {
      console.warn('[SyncService] Falha no push do pedido para a nuvem:', err);
      return false;
    }
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
