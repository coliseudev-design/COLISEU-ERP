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
      try {
        const saved = localStorage.getItem('coliseu_sync_pending_queue');
        if (saved) {
          this.pendingQueue = JSON.parse(saved);
        }
      } catch {
        this.pendingQueue = [];
      }
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
      case 'pedidos_venda': {
        try {
          const STORAGE_KEY = 'coliseu_pedidos_venda_list';
          const raw = localStorage.getItem(STORAGE_KEY);
          let currentList: any[] = raw ? JSON.parse(raw) : [];
          if (!Array.isArray(currentList)) currentList = [];

          if (event.action === 'UPSERT' && event.payload) {
            const p = event.payload;
            const rawNum = p.numero_pedido || p.numeroPedido || '0';
            const rawCliente = p.cliente_nome || p.clienteNome || 'CLIENTE NÃO INFORMADO';
            const rawTotal = parseFloat(p.valor_total || p.valorTotalFinal || '0');
            const rawData = p.data_emissao || p.dataEmissao || new Date().toLocaleDateString('pt-BR');
            const dataFmt = typeof rawData === 'string' && rawData.includes('-') ? new Date(rawData).toLocaleDateString('pt-BR') : String(rawData);

            const formatado = {
              id: p.id,
              numeroPedido: String(rawNum),
              tipoMovimento: p.tipoMovimento || 'SAIDA',
              status: p.status || 'APROVADO',
              dataEmissao: dataFmt,
              filialDepto: p.filial_id || p.filialDepto || 'MATRIZ - DOURADOS/MS',
              clienteId: p.cliente_id || p.clienteId || '',
              clienteCodigo: p.clienteCodigo || '1',
              clienteNome: rawCliente,
              clienteCnpjCpf: p.cliente_cpf_cnpj || p.clienteCnpjCpf || '',
              clienteCidade: p.cliente_cidade || p.clienteCidade || 'DOURADOS',
              clienteUf: p.cliente_uf || p.clienteUf || 'MS',
              clienteEndereco: p.cliente_endereco || p.clienteEndereco || 'CENTRO',
              clienteBairro: p.cliente_bairro || p.clienteBairro || 'CENTRO',
              clienteTelefone: p.clienteTelefone || '',
              naturezaOperacao: typeof p.naturezaOperacao === 'object' && p.naturezaOperacao !== null
                ? p.naturezaOperacao
                : {
                    cfop: '5102',
                    descricao: p.natureza_operacao || '5102 - VENDA DE MERCADORIAS',
                    tipo: 'SAIDA',
                    geraFinanceiro: true,
                    movimentaEstoque: true,
                    destinacaoPadrao: 'ESTADUAL',
                  },
              vendedorId: p.vendedorId || 'VEND-1',
              vendedorNome: p.vendedor_nome || p.vendedorNome || 'CARLOS SILVA (INTERNO)',
              tabelaPrecos: p.tabelaPrecos || 'TABELA PADRÃO',
              tipoFrete: p.tipoFrete || 'CIF',
              valorFrete: p.valorFrete || 0,
              pesoLiquidoKg: p.pesoLiquidoKg || 0,
              pesoBrutoKg: p.pesoBrutoKg || 0,
              quantidadeVolumes: p.quantidadeVolumes || 1,
              itens: Array.isArray(p.itens) ? p.itens : [],
              totalProdutos: rawTotal,
              totalDescontoGlobal: 0,
              totalAcrescimos: 0,
              totalIpi: 0,
              totalIcms: 0,
              totalIcmsSt: 0,
              totalServicos: 0,
              valorTotalFinal: rawTotal,
              formaPagamentoNome: p.formaPagamentoNome || 'A VISTA / A PRAZO',
              parcelas: Array.isArray(p.parcelas) ? p.parcelas : [],
            };

            const idx = currentList.findIndex((item) => item.id === p.id);
            if (idx >= 0) {
              currentList[idx] = { ...currentList[idx], ...formatado };
            } else {
              currentList = [formatado, ...currentList];
            }
            localStorage.setItem('coliseu_pedidos_vendas_b2b', JSON.stringify(currentList));
            localStorage.setItem('coliseu_pedidos_venda_list', JSON.stringify(currentList));
          } else if (event.action === 'DELETE' && event.id) {
            currentList = currentList.filter((item) => item.id !== event.id);
            localStorage.setItem('coliseu_pedidos_vendas_b2b', JSON.stringify(currentList));
            localStorage.setItem('coliseu_pedidos_venda_list', JSON.stringify(currentList));
          } else if (event.action === 'RESET') {
            localStorage.setItem('coliseu_pedidos_vendas_b2b', JSON.stringify([]));
            localStorage.setItem('coliseu_pedidos_venda_list', JSON.stringify([]));
          }
        } catch (e) {
          console.warn('[SyncEngine] Erro ao sincronizar cache local de pedidos:', e);
        }
        window.dispatchEvent(new CustomEvent('coliseu_pedidos_vendas_updated', { detail: event }));
        break;
      }
      case 'pessoas': {
        try {
          const raw = localStorage.getItem('coliseu_custom_pessoas');
          let list: any[] = raw ? JSON.parse(raw) : [];
          if (!Array.isArray(list)) list = [];

          if (event.action === 'UPSERT' && event.payload) {
            const p = event.payload;
            const idx = list.findIndex((item) => item.id === p.id);
            if (idx >= 0) {
              list[idx] = { ...list[idx], ...p };
            } else {
              list = [p, ...list];
            }
            localStorage.setItem('coliseu_custom_pessoas', JSON.stringify(list));
          } else if (event.action === 'DELETE' && event.id) {
            list = list.filter((item) => item.id !== event.id);
            localStorage.setItem('coliseu_custom_pessoas', JSON.stringify(list));
          }
        } catch (e) {
          console.warn('[SyncEngine] Erro ao atualizar cache local de pessoas:', e);
        }
        window.dispatchEvent(new CustomEvent('coliseu_pessoas_updated', { detail: event }));
        break;
      }
      case 'produtos': {
        try {
          const raw = localStorage.getItem('coliseu_custom_produtos');
          let list: any[] = raw ? JSON.parse(raw) : [];
          if (!Array.isArray(list)) list = [];

          if (event.action === 'UPSERT' && event.payload) {
            const p = event.payload;
            const idx = list.findIndex((item) => item.id === p.id || item.sku === p.sku || item.codigo === p.codigo);
            if (idx >= 0) {
              list[idx] = { ...list[idx], ...p };
            } else {
              list = [p, ...list];
            }
            localStorage.setItem('coliseu_custom_produtos', JSON.stringify(list));
          } else if (event.action === 'STOCK_DELTA' && event.payload) {
            const { id, delta_quantidade } = event.payload;
            const idx = list.findIndex((item) => item.id === id || item.sku === id || item.codigo === id);
            if (idx >= 0) {
              list[idx].estoqueAtual = (list[idx].estoqueAtual || 0) + (parseFloat(delta_quantidade) || 0);
              localStorage.setItem('coliseu_custom_produtos', JSON.stringify(list));
            }
          } else if (event.action === 'DELETE' && event.id) {
            list = list.filter((item) => item.id !== event.id);
            localStorage.setItem('coliseu_custom_produtos', JSON.stringify(list));
          }
        } catch (e) {
          console.warn('[SyncEngine] Erro ao atualizar cache local de produtos:', e);
        }
        window.dispatchEvent(new CustomEvent('coliseu_produtos_updated', { detail: event }));
        break;
      }
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
      } else if (fullEvent.entity === 'pessoas') {
        if (fullEvent.action === 'DELETE' && fullEvent.id) {
          url = `${CLOUD_API_URL}/api/pessoas/${fullEvent.id}`;
          method = 'DELETE';
          body = undefined;
        } else {
          url = `${CLOUD_API_URL}/api/pessoas`;
          method = 'POST';
        }
      } else if (fullEvent.entity === 'produtos') {
        if (fullEvent.action === 'DELETE' && fullEvent.id) {
          url = `${CLOUD_API_URL}/api/produtos/${fullEvent.id}`;
          method = 'DELETE';
          body = undefined;
        } else if (fullEvent.action === 'STOCK_DELTA' && fullEvent.id) {
          url = `${CLOUD_API_URL}/api/produtos/${fullEvent.id}/estoque-delta`;
          method = 'POST';
        } else if (fullEvent.action === 'PRICE_UPDATE' && fullEvent.id) {
          url = `${CLOUD_API_URL}/api/produtos/${fullEvent.id}/preco`;
          method = 'POST';
        } else {
          url = `${CLOUD_API_URL}/api/produtos`;
          method = 'POST';
        }
      } else if (fullEvent.entity === 'ordens_servico') {
        if (fullEvent.action === 'DELETE' && fullEvent.id) {
          url = `${CLOUD_API_URL}/api/ordens_servico/${fullEvent.id}`;
          method = 'DELETE';
          body = undefined;
        } else {
          url = `${CLOUD_API_URL}/api/ordens_servico`;
          method = 'POST';
        }
      } else if (fullEvent.entity === 'financeiro') {
        if (fullEvent.action === 'DELETE' && fullEvent.id) {
          url = `${CLOUD_API_URL}/api/financeiro/${fullEvent.id}`;
          method = 'DELETE';
          body = undefined;
        } else {
          url = `${CLOUD_API_URL}/api/financeiro`;
          method = 'POST';
        }
      } else if (fullEvent.entity === 'transporte') {
        if (fullEvent.action === 'DELETE' && fullEvent.id) {
          url = `${CLOUD_API_URL}/api/transporte/${fullEvent.id}`;
          method = 'DELETE';
          body = undefined;
        } else {
          url = `${CLOUD_API_URL}/api/transporte`;
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
      this.savePendingQueue();
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
    this.savePendingQueue();

    for (const item of queueToFlush) {
      await this.mutate(item);
    }
  }

  private savePendingQueue() {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('coliseu_sync_pending_queue', JSON.stringify(this.pendingQueue));
      }
    } catch {
      // ignore
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
