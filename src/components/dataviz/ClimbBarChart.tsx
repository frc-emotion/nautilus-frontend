/**
 * Climb Type Bar Chart showing counts for PARK/SHALLOW/DEEP
 */
import React from 'react';
import { View, Dimensions } from 'react-native';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { VictoryBar, VictoryChart, VictoryAxis, VictoryTheme } from 'victory-native';
import type { ClimbCounts } from '@/src/types/scouting';

type ClimbBarChartProps = {
  climbCounts: ClimbCounts;
};

export function ClimbBarChart({ climbCounts }: ClimbBarChartProps) {
  const width = Dimensions.get('window').width - 64;
  const chartWidth = Math.min(width, 400);

  const data = [
    { x: 'Park', y: climbCounts.PARK, label: `${climbCounts.PARK}` },
    { x: 'Shallow', y: climbCounts.SHALLOW_CAGE, label: `${climbCounts.SHALLOW_CAGE}` },
    { x: 'Deep', y: climbCounts.DEEP_CAGE, label: `${climbCounts.DEEP_CAGE}` },
  ];

  const maxCount = Math.max(climbCounts.PARK, climbCounts.SHALLOW_CAGE, climbCounts.DEEP_CAGE, 1);

  return (
    <View className="rounded-2xl p-4 shadow-md bg-background-0">
      <VStack space="md">
        <Text className="text-lg font-semibold">Climb Type Distribution</Text>

        <View style={{ alignItems: 'center' }}>
          <VictoryChart
            width={chartWidth}
            height={250}
            theme={VictoryTheme.material}
            domainPadding={{ x: 50 }}
          >
            <VictoryAxis
              style={{
                tickLabels: { fontSize: 12, padding: 5 },
              }}
            />
            <VictoryAxis
              dependentAxis
              tickFormat={(tick) => Math.round(tick)}
              domain={[0, maxCount + 1]}
              style={{
                tickLabels: { fontSize: 12, padding: 5 },
              }}
            />
            <VictoryBar
              data={data}
              style={{
                data: {
                  fill: ({ index }) =>
                    index === 0 ? '#6b7280' : index === 1 ? '#3b82f6' : '#10b981',
                },
                labels: { fontSize: 14, fill: 'white', fontWeight: 'bold' },
              }}
              labels={({ datum }) => datum.label}
              labelComponent={<Text />}
              animate={{
                duration: 500,
                onLoad: { duration: 500 },
              }}
            />
          </VictoryChart>
        </View>

        <Text className="text-xs text-typography-500 text-center">
          Total climbs: {climbCounts.PARK + climbCounts.SHALLOW_CAGE + climbCounts.DEEP_CAGE}
        </Text>
      </VStack>
    </View>
  );
}
