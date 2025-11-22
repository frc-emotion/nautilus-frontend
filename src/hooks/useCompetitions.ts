/**
 * Hook to fetch available competitions
 */
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';
import type { Competition } from '../types/scouting';

export function useCompetitions() {
  return useQuery<Competition[], Error>({
    queryKey: ['competitions'],
    queryFn: () => apiFetch<Competition[]>('/api/scouting/competitions'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
