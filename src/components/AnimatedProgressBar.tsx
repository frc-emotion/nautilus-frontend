import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';

/**
 * Animated progress bar with spring physics and gradient fill
 * Delightful micro-interaction inspired by Notion and Linear
 */

interface AnimatedProgressBarProps {
  value: number; // 0-100
  height?: number;
  showPercentage?: boolean;
  label?: string;
  gradient?: boolean;
}

export const AnimatedProgressBar: React.FC<AnimatedProgressBarProps> = ({
  value,
  height = 12,
  showPercentage = true,
  label,
  gradient = true,
}) => {
  const animatedWidth = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Smooth spring animation for width
    Animated.spring(animatedWidth, {
      toValue: value,
      friction: 7,
      tension: 40,
      useNativeDriver: false,
    }).start();

    // Subtle pulse on change
    Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.05,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [value]);

  const widthInterpolated = animatedWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <VStack space="sm" className="w-full">
      {label && (
        <HStack className="justify-between items-center">
          <Text className="text-sm font-medium text-typography-700">{label}</Text>
          {showPercentage && (
            <Text className="text-sm font-semibold text-typography-900">
              {Math.round(value)}%
            </Text>
          )}
        </HStack>
      )}
      
      <Animated.View
        style={[
          styles.track,
          {
            height,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.fill,
            {
              width: widthInterpolated,
              height,
            },
          ]}
        >
          {gradient ? (
            <LinearGradient
              colors={['#10B981', '#059669', '#047857']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: '#10B981' }]} />
          )}
        </Animated.View>
      </Animated.View>
    </VStack>
  );
};

const styles = StyleSheet.create({
  track: {
    width: '100%',
    backgroundColor: '#E5E7EB',
    borderRadius: 999,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: 999,
    overflow: 'hidden',
  },
});

export default AnimatedProgressBar;
