import React from 'react';
import { View } from 'react-native';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * Compact metric card for dashboard layout
 * Clean, scannable design inspired by Stripe and Apple
 */

interface MetricCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'accent' | 'gradient';
  theme?: 'light' | 'dark';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtitle,
  icon,
  variant = 'default',
  theme = 'light',
}) => {
  const gradientColors = variant === 'gradient'
    ? (theme === 'light' 
      ? ['#F0F9FF', '#E0F2FE'] as [string, string, ...string[]]
      : ['#1E293B', '#0F172A'] as [string, string, ...string[]])
    : undefined;

  const content = (
    <VStack space="sm" className={variant === 'default' ? 'p-5' : 'p-4'}>
      <HStack className="items-center justify-between">
        <Text className="text-xs font-medium text-typography-600 uppercase tracking-wide">
          {label}
        </Text>
        {icon && <View>{icon}</View>}
      </HStack>
      <Text className="text-3xl font-bold text-typography-950 tracking-tight">
        {value}
      </Text>
      {subtitle && (
        <Text className="text-sm text-typography-600">{subtitle}</Text>
      )}
    </VStack>
  );

  if (variant === 'gradient' && gradientColors) {
    return (
      <View className="rounded-2xl overflow-hidden shadow-md border border-outline-100 bg-background-0">
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {content}
        </LinearGradient>
      </View>
    );
  }

  return (
    <View className="bg-background-0 rounded-2xl shadow-md border border-outline-100">
      {content}
    </View>
  );
};

export default MetricCard;
