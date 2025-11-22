/**
 * React Query hook for fetching Advanced OPR Analytics data
 */
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';
import type { AdvancedOprResponse } from '../types/oprs';

export function useAdvancedOprs(eventKey?: string) {
  return useQuery<AdvancedOprResponse, Error>({
    queryKey: ['advancedOprs', eventKey],
    queryFn: () => apiFetch<AdvancedOprResponse>(`/api/tba/oprs/${eventKey}`),
    enabled: !!eventKey && eventKey.length > 0,
    staleTime: 3 * 60 * 1000, // 3 minutes - OPR data changes slowly
    retry: 2,
    refetchOnWindowFocus: false,
  });
}
