/**
 * Hook to fetch team scouting aggregation data
 */
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';
import type { TeamScoutingAggregation } from '../types/scouting';

export function useTeamAggregation(competition?: string, teamNumber?: string) {
  return useQuery<TeamScoutingAggregation, Error>({
    queryKey: ['teamAggregation', competition, teamNumber],
    queryFn: () =>
      apiFetch<TeamScoutingAggregation>(
        `/api/scouting/team_aggregation?competition=${competition}&team=${teamNumber}`
      ),
    enabled: !!competition && !!teamNumber,
    staleTime: 60 * 1000, // 1 minute
  });
}
