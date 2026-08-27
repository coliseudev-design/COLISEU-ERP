export interface SupplierAnalyticsResponse {
  overview: {
    receita: number;
    custo: number;
    pedidos: number;
    clientes: number;
  };
  top_products: Array<{
    rank: number;
    name: string;
    volume: number;
    receita: number;
  }>;
  monthly_performance: Array<{
    mes: string;
    valor: number;
    qtde: number;
    margem: number;
  }>;
  available_brands: string[];
  total_company_revenue?: number;
  top_brands?: Array<{
    rank: number;
    name: string;
    volume: number;
    receita: number;
  }>;
  stock_kpis?: {
    custo_total: number;
    venda_total: number;
    volume_total: number;
  };
  inventory?: Array<{
    cod: string;
    desc: string;
    un: string;
    marca: string;
    estoque: number;
    custo: number;
    preco: number;
    valor_total: number;
    status: string;
  }>;
}
