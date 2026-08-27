export interface BiPeriod {
  inicio: string;
  fim: string;
  label?: string;
}

export interface BiPeriodFilter {
  period?: string; // e.g. 'thisMonth', 'today', 'custom'
  /** snake_case - padrão canônico da API */
  start_date?: string; // ISO string YYYY-MM-DD
  end_date?: string;
  startDate?: string;
  endDate?: string;
  periodoLabel?: string;
  /** Filtros de filial/departamento */
  depto_id?: number;
  centro_custo?: number;
  /** Filtros extras de segmentação */
  vendedor_id?: string;
  cidade?: string;
  grupo?: string;
  marca?: string;
  [key: string]: any;
}

export type BiTrend = 'UP' | 'DOWN' | 'STABLE' | 'UP_STRONG' | 'DOWN_STRONG';
export type BiStatus = 'ATIVO' | 'INATIVO' | 'PENDENTE' | 'FATURADO' | 'CANCELADO';

export interface BiApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}
