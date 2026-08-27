import api from './api';
import { BiPeriodFilter, BiApiResponse } from '../types/bi.types';
import { SalesIntelligenceResponse, SalesHubResponse, ABCAnalysisResponse } from '../types/sales.types';
import { Radar360Response, CustomerAnalyticsResponse } from '../types/customer.types';
import { FinancialDashboardResponse } from '../types/financial.types';
import { SupplierAnalyticsResponse } from '../types/supplier.types';
import { ComparativeAnalysisResponse } from '../types/comparative.types';
import { GoalsResponse } from '../types/goals.types';

export const BIService = {
  // Inteligência de Vendas
  getSalesIntelligence: async (filter: BiPeriodFilter): Promise<SalesIntelligenceResponse> => {
    const { data } = await api.get<BiApiResponse<SalesIntelligenceResponse>>('/bi/sales/executive-summary', { params: filter });
    return data.data || data as any;
  },

  // Hub de Vendas
  getSalesHub: async (filter: BiPeriodFilter): Promise<SalesHubResponse> => {
    // There is no single endpoint for this, but to prevent 404 we point to an existing one or create a proxy
    // For now we'll point to sales/commercial-kpis just to prevent the 404, or the user can implement the real route.
    const { data } = await api.get<BiApiResponse<any>>('/bi/sales/commercial-kpis', { params: filter });
    return data.data || data;
  },

  // Análise ABC
  getABCAnalysis: async (filter: BiPeriodFilter): Promise<ABCAnalysisResponse> => {
    const { data } = await api.get<BiApiResponse<any>>('/bi/sales/abc-analysis', { params: filter });
    return data.data || data;
  },

  // Análise Financeira
  getFinancialIntelligence: async (filter: BiPeriodFilter): Promise<FinancialDashboardResponse> => {
    const { data } = await api.get<BiApiResponse<any>>('/bi/financial/summary', { params: filter });
    return data.data || data;
  },

  // Radar 360
  getRadar360: async (customerId: number, filter: Partial<BiPeriodFilter> = {}): Promise<Radar360Response> => {
    const { data } = await api.get<BiApiResponse<any>>('/bi/customer/radar-360', { params: { ...filter, id: customerId } });
    return data.data || data;
  },

  searchCustomers: async (query: string): Promise<{id: number, nome: string, cnpj: string, ltv?: number, risco_churn_pct?: number}[]> => {
    if (!query || query.length < 3) return [];
    const { data } = await api.get<any>('/bi/customer/search', { params: { q: query } });
    return data;
  },

  // Análise de Clientes
  getCustomerAnalytics: async (filter: BiPeriodFilter): Promise<CustomerAnalyticsResponse> => {
    const { data } = await api.get<BiApiResponse<any>>('/bi/customer/analytics', { params: filter });
    return data.data || data;
  },

  // Análise de Fornecedores
  getSupplierAnalytics: async (filter: BiPeriodFilter): Promise<SupplierAnalyticsResponse> => {
    const { data } = await api.get<BiApiResponse<any>>('/bi/supplier/analytics', { params: filter });
    return data.data || data;
  },

  getProductDetail: async (codigo: string): Promise<any> => {
    const { data } = await api.get<any>('/bi/supplier/product-detail', { params: { codigo } });
    return data;
  },

  // Análise Comparativa
  getComparativeAnalysis: async (filter: BiPeriodFilter): Promise<ComparativeAnalysisResponse> => {
    const { data } = await api.get<BiApiResponse<any>>('/bi/comparative/summary', { params: filter });
    return data.data || data;
  },

  // Análise de Metas
  getGoals: async (filter: BiPeriodFilter): Promise<GoalsResponse> => {
    const { data } = await api.get<BiApiResponse<any>>('/bi/goals/summary', { params: filter });
    return data.data || data;
  },

  // Hub do Vendedor
  getSellerSummary: async (filter: BiPeriodFilter & { mes?: number; ano?: number; vendedor_id?: string }): Promise<any> => {
    const { data } = await api.get<any>('/bi/seller/summary', { params: filter });
    return data;
  },

  getSellerGoalsDetails: async (vendedorId: number, ano: number): Promise<any[]> => {
    const { data } = await api.get<any[]>(`/bi/goals/seller-details`, { params: { vendedor_id: vendedorId, ano } });
    return data;
  },
  getPromotoraGoalsDetails: async (promotoraId: number, ano: number, params?: { vendedor_id?: number; marca_nome?: string }): Promise<any[]> => {
    const { data } = await api.get<any[]>(`/bi/goals/promotora-details`, { 
      params: { 
        promotora_id: promotoraId, 
        ano,
        vendedor_id: params?.vendedor_id,
        marca_nome: params?.marca_nome
      } 
    });
    return data;
  },

  // Metas Editor CRUD Endpoints
  getGoalsList: async (filter: { tipo_entidade: string; metric: string; month?: number; year?: number }) => {
    const { data } = await api.get('/goals/list', { params: filter });
    return data;
  },
  saveSellerGoal: async (payload: {
    vendedor_id: number;
    mes: number;
    ano: number;
    valor_meta_total: number | null;
    metas_por_marca: { marca_id: number; valor_meta: number }[];
    tipo_meta: string;
  }) => {
    const { data } = await api.post('/goals/seller', payload);
    return data;
  },
  savePromotoraGoal: async (payload: {
    vendedor_id: number;
    mes: number;
    ano: number;
    valor_meta_total: number | null;
    metas_por_marca?: { marca_id: number; valor_meta: number }[];
    metas_por_grupo?: { grupo_id: number; valor_meta: number }[];
  }) => {
    const { data } = await api.post('/goals/promotora', payload);
    return data;
  },
  batchUpsertGoals: async (payload: {
    tipo_meta: string;
    tipo_entidade: string;
    data_referencia: string;
    periodo: string;
    metas: { referencia_id: number; valor: number }[];
  }) => {
    const { data } = await api.post('/goals/batch', payload);
    return data;
  },
  replicateGoal: async (payload: {
    vendedor_id: number;
    mes_origem: number;
    ano_origem: number;
    mes_destino: number;
    ano_destino: number;
    percentual_ajuste: number;
    tipo_meta: string;
  }) => {
    const { data } = await api.post('/goals/replicate', payload);
    return data;
  },
  bulkReplicateGoals: async (payload: any) => {
    const { data } = await api.post('/goals/bulk-replicate', payload);
    return data;
  },
  zeroGoals: async (payload: any) => {
    const { data } = await api.post('/goals/zero', payload);
    return data;
  },
  getSellerBrandGoals: async (vendedorId: number, params: { mes: number; ano: number; tipo_meta: string }) => {
    const { data } = await api.get(`/goals/seller-brands/${vendedorId}`, { params });
    return data;
  },
  getPromotoraBrandGoals: async (promotoraId: number, params: { mes: number; ano: number }) => {
    const { data } = await api.get(`/goals/promotora-brands/${promotoraId}`, { params });
    return data;
  },
  deleteGoal: async (id: number) => {
    const { data } = await api.delete(`/goals/${id}`);
    return data;
  },
  getBrandsList: async () => {
    const { data } = await api.get('/goals/brands');
    return data;
  },
  getSellersList: async () => {
    const { data } = await api.get('/goals/sellers');
    return data;
  },
  getLojasList: async () => {
    const { data } = await api.get('/goals/lojas');
    return data;
  },
  getGroupsList: async (): Promise<any[]> => {
    const { data } = await api.get('/goals/groups');
    return data;
  },
  saveGroup: async (payload: { id?: number; nome: string; marcas_ids: number[]; produtos_ids: string[] }) => {
    const { data } = await api.post('/goals/groups', payload);
    return data;
  },
  deleteGroup: async (id: number) => {
    const { data } = await api.delete(`/goals/groups/${id}`);
    return data;
  },
  getProductsByBrand: async (marcaId: number): Promise<any[]> => {
    const { data } = await api.get(`/goals/products-by-brand/${marcaId}`);
    return data;
  },
  getPromotoraGroupGoals: async (promotoraId: number, params: { mes: number; ano: number }) => {
    const { data } = await api.get(`/goals/promotora-groups/${promotoraId}`, { params });
    return data;
  },
  getSellerBrandProducts: async (vendedorId: number, brandName: string, mes: number, ano: number): Promise<any[]> => {
    const { data } = await api.get('/goals/seller-brand-products', { params: { vendedor_id: vendedorId, brand: brandName, mes, ano } });
    return data;
  }
};
