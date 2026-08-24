/**
 * Coliseu ERP - Universal Sync Service (Omni-Sync Bridge)
 * 
 * Gerencia a transmissão e sincronização bidirecional em tempo real de TODOS os dados
 * (Clientes, Produtos, Vendas, OS, Financeiro e Transporte) entre o Executável
 * Desktop (Local-First) e o PostgreSQL Central na Nuvem (VPS).
 */

import { syncEngine } from './syncEngine';

const CLOUD_API_URL = syncEngine.getApiUrl();

export const syncService = {
  // =========================================================================
  // 1. CLIENTES & FORNECEDORES (PESSOAS)
  // =========================================================================
  async syncPessoa(pessoa: any): Promise<boolean> {
    return await syncEngine.mutate({
      entity: 'pessoas',
      action: 'UPSERT',
      id: pessoa.id,
      payload: pessoa,
    });
  },

  async deletePessoa(pessoaId: string): Promise<boolean> {
    return await syncEngine.mutate({
      entity: 'pessoas',
      action: 'DELETE',
      id: pessoaId,
      payload: { id: pessoaId },
    });
  },

  async fetchCloudPessoas(): Promise<any[]> {
    try {
      const response = await fetch(`${CLOUD_API_URL}/api/pessoas`);
      if (response.ok) {
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      }
    } catch (err) {
      console.warn('[SyncService] Falha ao buscar pessoas da nuvem:', err);
    }
    return [];
  },

  async syncBatchPessoas(pessoas: any[]): Promise<boolean> {
    if (!pessoas || pessoas.length === 0) return true;
    try {
      const response = await fetch(`${CLOUD_API_URL}/api/pessoas/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pessoas }),
      });
      return response.ok;
    } catch (err) {
      console.warn('[SyncService] Falha no batch sync de pessoas:', err);
      return false;
    }
  },

  // =========================================================================
  // 2. PRODUTOS & CATÁLOGO & ESTOQUE
  // =========================================================================
  async syncProduto(produto: any): Promise<boolean> {
    return await syncEngine.mutate({
      entity: 'produtos',
      action: 'UPSERT',
      id: produto.id,
      payload: produto,
    });
  },

  async deleteProduto(produtoId: string): Promise<boolean> {
    return await syncEngine.mutate({
      entity: 'produtos',
      action: 'DELETE',
      id: produtoId,
      payload: { id: produtoId },
    });
  },

  async syncEstoqueDelta(produtoId: string, deltaQuantidade: number, motivo?: string): Promise<boolean> {
    return await syncEngine.mutate({
      entity: 'produtos',
      action: 'STOCK_DELTA',
      id: produtoId,
      payload: { delta_quantidade: deltaQuantidade, motivo },
    });
  },

  async syncPrecoProduto(produtoId: string, precoVenda: number, precoCusto?: number): Promise<boolean> {
    return await syncEngine.mutate({
      entity: 'produtos',
      action: 'PRICE_UPDATE',
      id: produtoId,
      payload: { preco_venda: precoVenda, preco_custo: precoCusto },
    });
  },

  async fetchCloudProdutos(): Promise<any[]> {
    try {
      const response = await fetch(`${CLOUD_API_URL}/api/produtos`);
      if (response.ok) {
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      }
    } catch (err) {
      console.warn('[SyncService] Falha ao buscar produtos da nuvem:', err);
    }
    return [];
  },

  // =========================================================================
  // 3. PEDIDOS DE VENDA & ORÇAMENTOS
  // =========================================================================
  async syncPedido(pedido: any): Promise<boolean> {
    return await syncEngine.mutate({
      entity: 'pedidos_venda',
      action: 'UPSERT',
      id: pedido.id,
      payload: pedido,
    });
  },

  async deletePedido(pedidoId: string): Promise<boolean> {
    return await syncEngine.mutate({
      entity: 'pedidos_venda',
      action: 'DELETE',
      id: pedidoId,
      payload: { id: pedidoId },
    });
  },

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

  // =========================================================================
  // 4. ORDENS DE SERVIÇO (OS)
  // =========================================================================
  async syncOrdemServico(os: any): Promise<boolean> {
    return await syncEngine.mutate({
      entity: 'ordens_servico',
      action: 'UPSERT',
      id: os.id,
      payload: os,
    });
  },

  async deleteOrdemServico(osId: string): Promise<boolean> {
    return await syncEngine.mutate({
      entity: 'ordens_servico',
      action: 'DELETE',
      id: osId,
      payload: { id: osId },
    });
  },

  async fetchCloudOrdensServico(): Promise<any[]> {
    try {
      const response = await fetch(`${CLOUD_API_URL}/api/ordens_servico`);
      if (response.ok) {
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      }
    } catch (err) {
      console.warn('[SyncService] Falha ao buscar OS da nuvem:', err);
    }
    return [];
  },

  // =========================================================================
  // 5. FINANCEIRO (TÍTULOS A RECEBER / PAGAR)
  // =========================================================================
  async syncTituloFinanceiro(titulo: any): Promise<boolean> {
    return await syncEngine.mutate({
      entity: 'financeiro',
      action: 'UPSERT',
      id: titulo.id,
      payload: titulo,
    });
  },

  async fetchCloudFinanceiro(): Promise<any[]> {
    try {
      const response = await fetch(`${CLOUD_API_URL}/api/financeiro`);
      if (response.ok) {
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      }
    } catch (err) {
      console.warn('[SyncService] Falha ao buscar financeiro da nuvem:', err);
    }
    return [];
  },

  // =========================================================================
  // 6. TRANSPORTE (FROTAS, MOTORISTAS, CT-E, MDF-E)
  // =========================================================================
  async syncTransporte(item: any): Promise<boolean> {
    return await syncEngine.mutate({
      entity: 'transporte',
      action: 'UPSERT',
      id: item.id,
      payload: item,
    });
  },

  async fetchCloudTransporte(): Promise<any[]> {
    try {
      const response = await fetch(`${CLOUD_API_URL}/api/transporte`);
      if (response.ok) {
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      }
    } catch (err) {
      console.warn('[SyncService] Falha ao buscar transporte da nuvem:', err);
    }
    return [];
  },
};
