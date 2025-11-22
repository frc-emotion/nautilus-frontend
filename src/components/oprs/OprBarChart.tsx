/**
 * OPR Bar Chart Component
 * Displays OPR metrics as horizontal bars for comparison
 */
import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import type { TeamOprMetrics } from '@/src/types/oprs';
import { OPR_METRICS } from '@/src/types/oprs';

type OprBarChartProps = {
  teamNumber: string;
  metrics: TeamOprMetrics;
  maxValues?: Record<string, number>;
};

export function OprBarChart({ teamNumber, metrics, maxValues }: OprBarChartProps) {
  // Calculate max value for scaling if not provided
  const getMaxValue = (key: keyof TeamOprMetrics): number => {
    if (maxValues && maxValues[key]) {
      return maxValues[key];
    }
    return Math.max(metrics[key], 1);
  };

  return (
    <VStack className="w-full p-4 bg-background-0 rounded-2xl border border-outline-200">
      <Text className="text-lg font-semibold mb-4">
        Team {teamNumber} - OPR Breakdown
      </Text>

      <VStack space="md">
        {OPR_METRICS.map((config) => {
          const value = metrics[config.key];
          const maxValue = getMaxValue(config.key);
          const percentage = Math.min((Math.abs(value) / maxValue) * 100, 100);
          const isNegative = value < 0;

          return (
            <VStack key={config.key} space="xs">
              <HStack className="justify-between items-center">
                <Text className="text-sm font-medium">{config.shortLabel}</Text>
                <Text className="text-sm font-bold" style={{ color: config.color }}>
                  {value.toFixed(1)}
                </Text>
              </HStack>

              <View className="w-full h-6 bg-background-100 rounded-lg overflow-hidden">
                <View
                  className="h-full rounded-lg"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: isNegative ? '#EF4444' : config.color,
                  }}
                />
              </View>
            </VStack>
          );
        })}
      </VStack>

      <Text className="text-xs text-typography-500 mt-3">
        Bar length scaled to event maximum per metric
      </Text>
    </VStack>
  );
}
