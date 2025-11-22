/**
 * Hook to fetch TBA event summary data
 */
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';
import type { TbaEventSummary } from '../types/tba';

export function useEventSummary(eventKey?: string, teamNumber?: string) {
  return useQuery<TbaEventSummary, Error>({
    queryKey: ['eventSummary', eventKey, teamNumber],
    queryFn: () =>
      apiFetch<TbaEventSummary>(
        `/api/tba/event_summary?event=${eventKey}&team=${teamNumber}`
      ),
    enabled: !!eventKey && !!teamNumber,
    staleTime: 60 * 1000, // 1 minute
    retry: 2,
  });
}
