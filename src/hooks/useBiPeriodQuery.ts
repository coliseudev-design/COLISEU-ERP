import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { BiPeriodFilter } from '../types/bi.types';
import { format, subDays } from 'date-fns';
import { useState } from 'react';
import { useBranchParam } from '../contexts/BranchContext';

// Estado global simples ou contexto para o período (usando estado local no momento para simplificar o hook)
// O ideal seria usar Zustand se precisar compartilhar entre muitas rotas diferentes.
export const useBiFilterState = () => {
  const [filter, setFilter] = useState<BiPeriodFilter>({
    start_date: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'),
    end_date: format(new Date(), 'yyyy-MM-dd'),
    startDate: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  });

  return { filter, setFilter };
};

export function useBiPeriodQuery<TData, TError = unknown>(
  queryKey: unknown[],
  fetchFn: (filter: any) => Promise<TData>,
  filter: BiPeriodFilter,
  options?: Omit<UseQueryOptions<TData, TError, TData>, 'queryKey' | 'queryFn'>
) {
  const branchParam = useBranchParam();
  const mergedFilter = { ...filter, ...branchParam };

  return useQuery<TData, TError>({
    queryKey: [...queryKey, mergedFilter],
    queryFn: () => fetchFn(mergedFilter),
    ...options,
  });
}

