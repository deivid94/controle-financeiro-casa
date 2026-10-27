import type { HistoricoItem } from '@casa/shared';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useHistorico() {
  return useQuery({
    queryKey: ['historico'],
    queryFn: () => api<HistoricoItem[]>('/api/historico'),
  });
}
