/**
 * Competition selection dropdown component
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
import { useCompetitions } from '@/src/hooks/useCompetitions';
import { Spinner } from '@/components/ui/spinner';

type CompetitionSelectProps = {
  value?: string;
  onValueChange: (value: string) => void;
};

export function CompetitionSelect({ value, onValueChange }: CompetitionSelectProps) {
  const { data: competitions, isLoading, error } = useCompetitions();

  return (
    <VStack className="w-full">
      <Text className="mb-1 font-medium text-sm">Competition</Text>
      {isLoading ? (
        <Spinner size="small" />
      ) : error ? (
        <Text className="text-red-500 text-sm">Failed to load competitions</Text>
      ) : (
        <Select onValueChange={onValueChange} selectedValue={value}>
          <SelectTrigger variant="outline" size="md">
            <SelectInput placeholder="Select competition" />
            <SelectIcon className="ml-auto" as={ChevronDownIcon} />
          </SelectTrigger>
          <SelectPortal>
            <SelectBackdrop />
            <SelectContent>
              <SelectDragIndicatorWrapper>
                <SelectDragIndicator />
              </SelectDragIndicatorWrapper>
              {competitions?.map((comp) => (
                <SelectItem key={comp.value} label={comp.label} value={comp.value} />
              ))}
            </SelectContent>
          </SelectPortal>
        </Select>
      )}
    </VStack>
  );
}
