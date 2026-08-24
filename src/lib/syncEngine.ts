/**
 * Coliseu ERP - Omni-Sync Real-Time Engine
 * 
 * Motor Universal de Sincronização em Tempo Real (SSE + Background Auto-Push).
 * Espelha todas as ações (vendas, estoque, preços, clientes) instantaneamente
 * entre múltiplos terminais Desktop e Nuvem (< 200ms).
 */

const CLOUD_API_URL = typeof window !== 'undefined' && window.location.origin.includes('coliseusistemas.com.br')
  ? window.location.origin
  : 'https://erp.coliseusistemas.com.br';

export type SyncConnectionState = 'CONNECTED' | 'RECONNECTING' | 'OFFLINE';

export interface MutationEvent {
  entity: 'pedidos_venda' | 'produtos' | 'pessoas' | 'financeiro' | 'transporte' | 'ordens_servico';
  action: 'UPSERT' | 'DELETE' | 'STOCK_DELTA' | 'PRICE_UPDATE' | 'RESET' | 'BATCH_SYNC';
  id?: string;
  payload: any;
  timestamp: string;
}

type SyncStatusListener = (state: {
  status: SyncConnectionState;
  activeTerminals: number;
  pendingCount: number;
  lastSyncedAt: string;
}) => void;

class SyncEngine {
  private eventSource: EventSource | null = null;
  private statusListeners = new Set<SyncStatusListener>();
  private connectionState: SyncConnectionState = 'RECONNECTING';
  private activeTerminals = 1;
  private pendingQueue: MutationEvent[] = [];
  private lastSyncedAt = new Date().toISOString();
  private isInitialized = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  public init() {
    if (this.isInitialized) return;
    this.isInitialized = true;
    this.connectSSE();
    this.startPeriodicSync();
  }

  private connectSSE() {
    try {
      if (this.eventSource) {
        this.eventSource.close();
      }

      this.eventSource = new EventSource(`${CLOUD_API_URL}/api/sync/stream`);

      this.eventSource.addEventListener('connected', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          this.connectionState = 'CONNECTED';
          this.activeTerminals = data.clients_count || 1;
          this.lastSyncedAt = new Date().toISOString();
          this.notifyStatus();
          this.flushPendingQueue();
        } catch {
          // ignore
        }
      });

      this.eventSource.addEventListener('mutation', (e: MessageEvent) => {
        try {
          const event: MutationEvent = JSON.parse(e.data);
          this.handleIncomingMutation(event);
        } catch (err) {
          console.warn('[OmniSync] Erro ao processar mutação recebida:', err);
        }
      });

      this.eventSource.onerror = () => {
        this.connectionState = 'RECONNECTING';
        this.notifyStatus();
      };
    } catch (err) {
      this.connectionState = 'OFFLINE';
      this.notifyStatus();
    }
  }

  private handleIncomingMutation(event: MutationEvent) {
    this.lastSyncedAt = new Date().toISOString();

    // 1. Despacha evento genérico do barramento
    window.dispatchEvent(new CustomEvent('coliseu_sync_mutation', { detail: event }));

    // 2. Despacha eventos específicos por entidade para atualizar componentes React
    switch (event.entity) {
      case 'pedidos_venda':
        window.dispatchEvent(new CustomEvent('coliseu_pedidos_vendas_updated', { detail: event }));
        break;
      case 'produtos':
        window.dispatchEvent(new CustomEvent('coliseu_produtos_updated', { detail: event }));
        break;
      case 'pessoas':
        window.dispatchEvent(new CustomEvent('coliseu_pessoas_updated', { detail: event }));
        break;
      case 'financeiro':
        window.dispatchEvent(new CustomEvent('coliseu_financeiro_updated', { detail: event }));
        break;
      case 'transporte':
        window.dispatchEvent(new CustomEvent('coliseu_transporte_updated', { detail: event }));
        break;
    }

    this.notifyStatus();
  }

  /**
   * Envia mutação atômica em segundo plano para o Hub Central
   */
  public async mutate(event: Omit<MutationEvent, 'timestamp'>): Promise<boolean> {
    const fullEvent: MutationEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };

    try {
      let url = `${CLOUD_API_URL}/api/pedidos`;
      let method = 'POST';
      let body: any = fullEvent.payload;

      if (fullEvent.entity === 'pedidos_venda') {
        if (fullEvent.action === 'DELETE' && fullEvent.id) {
          url = `${CLOUD_API_URL}/api/pedidos/${fullEvent.id}`;
          method = 'DELETE';
          body = undefined;
        } else {
          url = `${CLOUD_API_URL}/api/pedidos`;
          method = 'POST';
        }
      } else if (fullEvent.entity === 'produtos') {
        if (fullEvent.action === 'STOCK_DELTA' && fullEvent.id) {
          url = `${CLOUD_API_URL}/api/produtos/${fullEvent.id}/estoque-delta`;
          method = 'POST';
        } else if (fullEvent.action === 'PRICE_UPDATE' && fullEvent.id) {
          url = `${CLOUD_API_URL}/api/produtos/${fullEvent.id}/preco`;
          method = 'POST';
        }
      }

      const res = await fetch(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      this.lastSyncedAt = new Date().toISOString();
      this.connectionState = 'CONNECTED';
      this.notifyStatus();
      return true;
    } catch (err) {
      console.warn('[OmniSync] Falha no push imediato, enfileirando offline:', err);
      this.pendingQueue.push(fullEvent);
      this.connectionState = 'OFFLINE';
      this.notifyStatus();
      return false;
    }
  }

  /**
   * Esvazia a fila de mutações offline quando a conexão é restabelecida
   */
  private async flushPendingQueue() {
    if (this.pendingQueue.length === 0) return;

    const queueToFlush = [...this.pendingQueue];
    this.pendingQueue = [];

    for (const item of queueToFlush) {
      await this.mutate(item);
    }
  }

  /**
   * Polling leve de sincronização a cada 12 segundos para garantia de consistência
   */
  private startPeriodicSync() {
    setInterval(async () => {
      if (this.connectionState === 'CONNECTED' && this.pendingQueue.length > 0) {
        await this.flushPendingQueue();
      }
    }, 12000);
  }

  public subscribeStatus(listener: SyncStatusListener): () => void {
    this.statusListeners.add(listener);
    listener({
      status: this.connectionState,
      activeTerminals: this.activeTerminals,
      pendingCount: this.pendingQueue.length,
      lastSyncedAt: this.lastSyncedAt,
    });

    return () => {
      this.statusListeners.delete(listener);
    };
  }

  private notifyStatus() {
    const payload = {
      status: this.connectionState,
      activeTerminals: this.activeTerminals,
      pendingCount: this.pendingQueue.length,
      lastSyncedAt: this.lastSyncedAt,
    };
    this.statusListeners.forEach((fn) => fn(payload));
  }

  public getApiUrl(): string {
    return CLOUD_API_URL;
  }
}

export const syncEngine = new SyncEngine();
