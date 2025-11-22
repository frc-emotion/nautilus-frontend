/**
 * Level Contribution Donut Chart showing L1-L4 percentage distribution
 */
import React from 'react';
import { View, Dimensions } from 'react-native';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { VictoryPie } from 'victory-native';
import type { LevelPercentages } from '@/src/types/scouting';

const CHART_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444']; // L1-L4 colors

type LevelContributionChartProps = {
  levelPct: LevelPercentages;
};

export function LevelContributionChart({ levelPct }: LevelContributionChartProps) {
  const width = Dimensions.get('window').width - 64; // Account for padding
  const chartSize = Math.min(width, 300);

  const data = [
    { x: 'L1', y: levelPct.L1, color: CHART_COLORS[0] },
    { x: 'L2', y: levelPct.L2, color: CHART_COLORS[1] },
    { x: 'L3', y: levelPct.L3, color: CHART_COLORS[2] },
    { x: 'L4', y: levelPct.L4, color: CHART_COLORS[3] },
  ].filter((item) => item.y > 0); // Only show non-zero slices

  if (data.length === 0) {
    return (
      <View className="rounded-2xl p-4 shadow-md bg-background-0">
        <Text className="text-lg font-semibold mb-2">Level Contribution</Text>
        <Text className="text-typography-500">No coral scoring data available</Text>
      </View>
    );
  }

  return (
    <View className="rounded-2xl p-4 shadow-md bg-background-0">
      <VStack space="md">
        <Text className="text-lg font-semibold">Level Contribution</Text>
        
        <View style={{ alignItems: 'center' }}>
          <VictoryPie
            data={data}
            width={chartSize}
            height={chartSize}
            innerRadius={chartSize / 4}
            labelRadius={chartSize / 3}
            style={{
              data: {
                fill: ({ datum }) => datum.color,
              },
              labels: {
                fill: 'white',
                fontSize: 16,
                fontWeight: 'bold',
              },
            }}
            labels={({ datum }) => `${datum.x}\n${datum.y.toFixed(1)}%`}
          />
        </View>

        {/* Legend */}
        <HStack space="md" className="flex-wrap justify-center">
          {data.map((item, index) => (
            <HStack key={item.x} space="xs" className="items-center">
              <View
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 8,
                  backgroundColor: item.color,
                }}
              />
              <Text className="text-sm">
                {item.x}: {item.y.toFixed(1)}%
              </Text>
            </HStack>
          ))}
        </HStack>
      </VStack>
    </View>
  );
}
