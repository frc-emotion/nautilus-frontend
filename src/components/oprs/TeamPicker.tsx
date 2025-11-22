/**
 * Team Picker Component
 * Dropdown selector for choosing a team to visualize
 */
import React from 'react';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import {
  Select,
  SelectBackdrop,
  SelectContent,
  SelectDragIndicator,
  SelectDragIndicatorWrapper,
  SelectIcon,
  SelectInput,
  SelectItem,
  SelectPortal,
  SelectTrigger,
} from '@/components/ui/select';
import { ChevronDownIcon } from 'lucide-react-native';
import type { AdvancedOprResponse } from '@/src/types/oprs';

type TeamPickerProps = {
  data: AdvancedOprResponse;
  value?: string;
  onValueChange: (teamNumber: string) => void;
};

export function TeamPicker({ data, value, onValueChange }: TeamPickerProps) {
  const teams = Object.keys(data.team_metrics).sort((a, b) => {
    // Sort by OPR descending
    const aOpr = data.team_metrics[a].total_points_opr;
    const bOpr = data.team_metrics[b].total_points_opr;
    return bOpr - aOpr;
  });

  return (
    <VStack className="w-full">
      <Text className="mb-1 font-medium text-sm">Select Team</Text>
      <Select onValueChange={onValueChange} selectedValue={value}>
        <SelectTrigger variant="outline" size="md">
          <SelectInput placeholder="Choose a team" />
          <SelectIcon className="ml-auto" as={ChevronDownIcon} />
        </SelectTrigger>
        <SelectPortal>
          <SelectBackdrop />
          <SelectContent>
            <SelectDragIndicatorWrapper>
              <SelectDragIndicator />
            </SelectDragIndicatorWrapper>
            {teams.map((teamNumber) => {
              const opr = data.team_metrics[teamNumber].total_points_opr.toFixed(1);
              return (
                <SelectItem
                  key={teamNumber}
                  label={`Team ${teamNumber} (OPR: ${opr})`}
                  value={teamNumber}
                />
              );
            })}
          </SelectContent>
        </SelectPortal>
      </Select>
    </VStack>
  );
}
