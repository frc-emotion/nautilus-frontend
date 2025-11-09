/**
 * Stat/KPI card component for displaying key metrics
 */
import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

type StatCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  variant?: 'default' | 'highlight';
};

export function StatCard({ title, value, subtitle, variant = 'default' }: StatCardProps) {
  return (
    <View
      className={`rounded-2xl p-4 shadow-md ${
        variant === 'highlight' ? 'bg-primary-500' : 'bg-background-0'
      }`}
    >
      <VStack space="xs">
        <Text
          className={`text-sm font-medium ${
            variant === 'highlight' ? 'text-white' : 'text-typography-600'
          }`}
        >
          {title}
        </Text>
        <Text
          className={`text-3xl font-bold ${
            variant === 'highlight' ? 'text-white' : 'text-typography-900'
          }`}
        >
          {value}
        </Text>
        {subtitle && (
          <Text
            className={`text-xs ${
              variant === 'highlight' ? 'text-white/80' : 'text-typography-500'
            }`}
          >
            {subtitle}
          </Text>
        )}
      </VStack>
    </View>
  );
}
