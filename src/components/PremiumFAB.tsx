import React, { useEffect, useRef } from 'react';
import { Pressable, Animated, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * Premium Floating Action Button with micro-interactions
 * Inspired by Material Design 3 and Apple's design language
 */

interface PremiumFABProps {
  onPress: () => void;
  icon: React.ReactNode;
  theme?: 'light' | 'dark';
}

export const PremiumFAB: React.FC<PremiumFABProps> = ({
  onPress,
  icon,
  theme = 'light',
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Subtle breathing animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handlePress = () => {
    // Rotation animation on press
    Animated.sequence([
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: 0,
        duration: 0,
        useNativeDriver: true,
      }),
    ]).start();

    onPress();
  };

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const gradientColors = (theme === 'light'
    ? ['#FFFFFF', '#F9FAFB']
    : ['#2D2D2D', '#1E1E1E']) as [string, string, ...string[]];

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ scale: scaleAnim }, { rotate }],
        },
      ]}
    >
      <Pressable onPress={handlePress}>
        {({ pressed }) => (
          <Animated.View
            style={[
              styles.button,
              {
                transform: [{ scale: pressed ? 0.95 : 1 }],
              },
            ]}
          >
            <LinearGradient
              colors={gradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradient}
            >
              {icon}
            </LinearGradient>
          </Animated.View>
        )}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 32 : 24,
    right: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  button: {
    borderRadius: 28,
    overflow: 'hidden',
  },
  gradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
});

export default PremiumFAB;
