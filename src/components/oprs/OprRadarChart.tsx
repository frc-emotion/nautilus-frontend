/**
 * OPR Radar Chart Component
 * Displays team metrics profile in a radar/spider chart visualization
 */
import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import type { TeamOprMetrics } from '@/src/types/oprs';
import { OPR_METRICS } from '@/src/types/oprs';

type OprRadarChartProps = {
  teamNumber: string;
  metrics: TeamOprMetrics;
  maxValues: Record<string, number>;
};

export function OprRadarChart({ teamNumber, metrics, maxValues }: OprRadarChartProps) {
  // Simplified radar chart as a grid of normalized values
  // For a true radar chart, you'd need react-native-svg or similar

  const normalizedMetrics = OPR_METRICS.map((config) => {
    const value = metrics[config.key];
    const maxValue = maxValues[config.key] || 1;
    const normalized = Math.min((value / maxValue) * 100, 100);

    return {
      ...config,
      value,
      normalized: Math.max(0, normalized),
    };
  });

  return (
    <VStack className="w-full p-4 bg-background-0 rounded-2xl border border-outline-200">
      <Text className="text-lg font-semibold mb-4">
        Team {teamNumber} - Performance Profile
      </Text>

      <VStack space="sm">
        {normalizedMetrics.map((metric) => (
          <HStack key={metric.key} className="items-center" space="md">
            <View className="w-24">
              <Text className="text-xs font-medium">{metric.shortLabel}</Text>
            </View>

            <View className="flex-1 h-8 bg-background-100 rounded-lg overflow-hidden">
              <View
                className="h-full rounded-lg"
                style={{
                  width: `${metric.normalized}%`,
                  backgroundColor: metric.color,
                }}
              />
            </View>

            <View className="w-12">
              <Text className="text-xs text-right">{metric.normalized.toFixed(0)}%</Text>
            </View>
          </HStack>
        ))}
      </VStack>

      <Text className="text-xs text-typography-500 mt-3">
        Percentages relative to event maximum per metric
      </Text>
    </VStack>
  );
}
