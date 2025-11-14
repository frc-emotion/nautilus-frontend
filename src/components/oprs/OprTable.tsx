/**
 * OPR Table Component
 * Displays team OPR metrics in a scrollable table
 */
import React, { useMemo } from 'react';
import { ScrollView, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import type { AdvancedOprResponse, TeamOprRow } from '@/src/types/oprs';

type OprTableProps = {
  data: AdvancedOprResponse;
  onTeamSelect?: (teamNumber: string) => void;
  selectedTeam?: string;
};

export function OprTable({ data, onTeamSelect, selectedTeam }: OprTableProps) {
  const rows = useMemo<TeamOprRow[]>(() => {
    return Object.entries(data.team_metrics)
      .map(([teamNumber, metrics]) => ({
        teamNumber,
        ...metrics,
      }))
      .sort((a, b) => b.total_points_opr - a.total_points_opr);
  }, [data]);

  return (
    <VStack className="w-full">
      <Text className="text-lg font-semibold mb-3">Team OPR Rankings</Text>
      
      {/* Header Row */}
      <HStack className="bg-background-100 p-3 rounded-t-xl border-b border-outline-200">
        <Text className="w-16 font-semibold text-xs">Team</Text>
        <Text className="flex-1 font-semibold text-xs text-right">Points</Text>
        <Text className="flex-1 font-semibold text-xs text-right">Notes</Text>
        <Text className="flex-1 font-semibold text-xs text-right">Auto</Text>
        <Text className="flex-1 font-semibold text-xs text-right">Teleop</Text>
        <Text className="flex-1 font-semibold text-xs text-right">Endgame</Text>
      </HStack>

      {/* Data Rows */}
      <ScrollView 
        className="max-h-96 border border-t-0 border-outline-200 rounded-b-xl"
        showsVerticalScrollIndicator={true}
      >
        {rows.map((row, idx) => {
          const isSelected = selectedTeam === row.teamNumber;
          const isEven = idx % 2 === 0;
          
          return (
            <TouchableOpacity
              key={row.teamNumber}
              onPress={() => onTeamSelect?.(row.teamNumber)}
              activeOpacity={0.7}
            >
              <HStack
                className={`p-3 border-b border-outline-100 ${
                  isSelected
                    ? 'bg-primary-100'
                    : isEven
                    ? 'bg-background-0'
                    : 'bg-background-50'
                }`}
              >
                <Text className={`w-16 font-bold ${isSelected ? 'text-primary-700' : ''}`}>
                  {row.teamNumber}
                </Text>
                <Text className="flex-1 text-right">{row.total_points_opr.toFixed(1)}</Text>
                <Text className="flex-1 text-right">{row.total_notes_opr.toFixed(1)}</Text>
                <Text className="flex-1 text-right">{row.auto_notes_opr.toFixed(1)}</Text>
                <Text className="flex-1 text-right">{row.teleop_notes_opr.toFixed(1)}</Text>
                <Text className="flex-1 text-right">{row.endgame_points_opr.toFixed(1)}</Text>
              </HStack>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      
      <Text className="text-xs text-typography-500 mt-2">
        Tap a team to view detailed metrics
      </Text>
    </VStack>
  );
}
