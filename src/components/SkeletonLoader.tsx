import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';

/**
 * Beautiful shimmer skeleton loader
 * Inspired by Linear, Stripe, and modern design systems
 */

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  marginBottom?: number;
}

const Skeleton: React.FC<SkeletonProps> = ({ 
  width = '100%', 
  height = 20, 
  borderRadius = 6,
  marginBottom = 0,
}) => {
  const shimmerAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnimation, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnimation, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const opacity = shimmerAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 0.6, 0.3],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width: width as any,
          height,
          borderRadius,
          marginBottom,
          opacity,
        },
      ]}
    />
  );
};

export const CardSkeleton: React.FC = () => (
  <VStack space="md" className="bg-background-0 rounded-xl shadow-md p-6 border border-outline-100">
    <Skeleton height={24} width="60%" borderRadius={8} marginBottom={12} />
    <Skeleton height={16} width="100%" marginBottom={8} />
    <Skeleton height={16} width="90%" marginBottom={8} />
    <Skeleton height={16} width="70%" />
  </VStack>
);

export const ListItemSkeleton: React.FC = () => (
  <HStack space="md" className="p-4 border-b border-outline-200">
    <Skeleton width={48} height={48} borderRadius={24} />
    <VStack space="sm" className="flex-1">
      <Skeleton height={18} width="60%" marginBottom={6} />
      <Skeleton height={14} width="40%" />
    </VStack>
  </HStack>
);

export const ProfileSkeleton: React.FC = () => (
  <VStack space="xl" className="items-center px-6 py-8">
    <Skeleton width={128} height={128} borderRadius={64} marginBottom={24} />
    <VStack space="lg" className="w-full max-w-2xl">
      <View className="bg-background-0 rounded-xl shadow-md p-6 border border-outline-100">
        <VStack space="md">
          {[1, 2, 3, 4].map((i) => (
            <HStack key={i} space="md" className="justify-between">
              <Skeleton width="30%" height={16} />
              <Skeleton width="50%" height={16} />
            </HStack>
          ))}
        </VStack>
      </View>
    </VStack>
  </VStack>
);

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#E5E7EB',
  },
});

export default Skeleton;
