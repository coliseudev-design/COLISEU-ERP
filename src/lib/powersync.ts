import { safeInvoke as invoke } from "./ipc";
import { useState, useEffect } from "react";

export type ConnectionState = "Online" | "Syncing" | "Offline" | "Error";

export interface QueueStats {
  total_pending: number;
  total_synced: number;
  total_error: number;
}

export interface ProcessBatchResult {
  processed_count: number;
  success_count: number;
  failed_count: number;
}

export interface SyncStatusResponse {
  is_online: boolean;
  status_text: string;
  queue_stats: QueueStats;
  last_synced_at: string;
}

export interface StockBalanceRecord {
  deposito_id: string;
  produto_id: string;
  quantidade_atual: number;
  quantidade_reservada: number;
  updated_at: string;
}

export interface PowerSyncState {
  connectionState: ConnectionState;
  isOnline: boolean;
  statusText: string;
  queueStats: QueueStats;
  lastSyncedAt: string;
}

type StatusListener = (state: PowerSyncState) => void;

class PowerSyncService {
  private listeners: Set<StatusListener> = new Set();
  private currentState: PowerSyncState = {
    connectionState: "Online",
    isOnline: true,
    statusText: "Sincronizado e Atualizado",
    queueStats: { total_pending: 0, total_synced: 0, total_error: 0 },
    lastSyncedAt: new Date().toISOString(),
  };

  constructor() {
    this.pollStatus();
  }

  private async pollStatus() {
    try {
      if (typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__) {
        const response = await invoke<SyncStatusResponse>("get_sync_status");
        let connState: ConnectionState = "Online";
        if (response.queue_stats.total_pending > 0) {
          connState = "Syncing";
        }
        if (response.queue_stats.total_error > 0) {
          connState = "Error";
        }

        this.currentState = {
          connectionState: connState,
          isOnline: response.is_online,
          statusText: response.status_text,
          queueStats: response.queue_stats,
          lastSyncedAt: response.last_synced_at,
        };
        this.notify();
      }
    } catch (e) {
      this.currentState = {
        ...this.currentState,
        connectionState: "Offline",
        isOnline: false,
        statusText: "Modo Offline - Alterações salvas localmente",
      };
      this.notify();
    }
  }

  private notify() {
    this.listeners.forEach((listener) => listener(this.currentState));
  }

  /**
   * Obtém o status atual do cliente PowerSync local
   */
  async getStatus(): Promise<SyncStatusResponse> {
    if (typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__) {
      return await invoke<SyncStatusResponse>("get_sync_status");
    }
    return {
      is_online: true,
      status_text: "Modo de Teste Web",
      queue_stats: { total_pending: 0, total_synced: 0, total_error: 0 },
      last_synced_at: new Date().toISOString(),
    };
  }

  /**
   * Dispara manualmente o envio da fila de write-back local
   */
  async processQueue(): Promise<ProcessBatchResult> {
    if (typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__) {
      const result = await invoke<ProcessBatchResult>("process_sync_queue");
      await this.pollStatus();
      return result;
    }
    return { processed_count: 0, success_count: 0, failed_count: 0 };
  }

  /**
   * Obtém estatísticas da fila offline ps_crud
   */
  async getQueueStats(): Promise<QueueStats> {
    if (typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__) {
      return await invoke<QueueStats>("get_sync_queue_stats");
    }
    return { total_pending: 0, total_synced: 0, total_error: 0 };
  }

  /**
   * Aplica alteração relativa de estoque via Delta CRDT PN-Counter
   */
  async applyStockDelta(
    depositoId: string,
    produtoId: string,
    deltaQuantidade: number,
    deltaReservada: number = 0
  ): Promise<StockBalanceRecord> {
    if (typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__) {
      const record = await invoke<StockBalanceRecord>("resolve_stock_crdt_delta", {
        depositoId,
        produtoId,
        deltaQuantidade,
        deltaReservada,
      });
      await this.pollStatus();
      return record;
    }
    return {
      deposito_id: depositoId,
      produto_id: produtoId,
      quantidade_atual: deltaQuantidade,
      quantidade_reservada: deltaReservada,
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * Inscreve ouvinte para atualizações de estado de conexão e fila
   */
  subscribe(listener: StatusListener): () => void {
    this.listeners.add(listener);
    listener(this.currentState);
    return () => this.listeners.delete(listener);
  }
}

export const powerSyncService = new PowerSyncService();

/**
   React Hook para consumir o estado em tempo real do PowerSync
 */
export function usePowerSyncStatus(): PowerSyncState {
  const [state, setState] = useState<PowerSyncState>({
    connectionState: "Online",
    isOnline: true,
    statusText: "Sincronizado e Atualizado",
    queueStats: { total_pending: 0, total_synced: 0, total_error: 0 },
    lastSyncedAt: new Date().toISOString(),
  });

  useEffect(() => {
    const unsubscribe = powerSyncService.subscribe((newState) => {
      setState(newState);
    });
    return unsubscribe;
  }, []);

  return state;
}
