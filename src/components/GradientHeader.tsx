import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

/**
 * Premium gradient header with subtle animation
 * Inspired by Apple's product pages and Stripe's hero sections
 */

interface GradientHeaderProps {
  title: string;
  subtitle?: string;
  theme?: 'light' | 'dark';
}

export const GradientHeader: React.FC<GradientHeaderProps> = ({
  title,
  subtitle,
  theme = 'light',
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const gradientColors = theme === 'light'
    ? ['#FFFFFF', '#F9FAFB', '#F3F4F6']
    : ['#1E1E1E', '#171717', '#121212'];

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
        <VStack space="sm" className="items-center">
          <Text className="text-4xl font-bold text-typography-950 text-center">
            {title}
          </Text>
          {subtitle && (
            <Text className="text-lg text-typography-600 text-center">
              {subtitle}
            </Text>
          )}
        </VStack>
      </Animated.View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 32,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
});

export default GradientHeader;
