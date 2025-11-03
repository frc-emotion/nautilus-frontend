import React, { useEffect, useRef } from 'react';
import { View, Pressable, Animated, StyleSheet, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/src/utils/UI/CustomThemeProvider';

/**
 * Industry-leading animated tab bar with spring physics and micro-interactions
 * Inspired by Apple's iOS design language and Linear's attention to detail
 */
export const AnimatedTabBar: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const { theme } = useTheme();
  const animatedValues = useRef(
    state.routes.map(() => new Animated.Value(0))
  ).current;

  const scaleValues = useRef(
    state.routes.map(() => new Animated.Value(1))
  ).current;

  const rotateValues = useRef(
    state.routes.map(() => new Animated.Value(0))
  ).current;

  const glowValues = useRef(
    state.routes.map(() => new Animated.Value(0))
  ).current;

  useEffect(() => {
    state.routes.forEach((_, index) => {
      const isFocused = state.index === index;
      
      // Dramatic pop-out animation
      Animated.parallel([
        // Scale: Active tab grows dramatically (25% larger)
        Animated.spring(scaleValues[index], {
          toValue: isFocused ? 1.25 : 1,
          useNativeDriver: true,
          friction: 6,
          tension: 80,
          overshootClamping: false,
        }),
        
        // Rotation: Playful tilt effect
        Animated.spring(rotateValues[index], {
          toValue: isFocused ? 1 : 0,
          useNativeDriver: true,
          friction: 8,
          tension: 100,
        }),
        
        // Glow: Background circle expands
        Animated.spring(glowValues[index], {
          toValue: isFocused ? 1 : 0,
          useNativeDriver: true,
          friction: 7,
          tension: 90,
        }),
        
        // Fade/opacity for icons and labels
        Animated.spring(animatedValues[index], {
          toValue: isFocused ? 1 : 0,
          useNativeDriver: true,
          friction: 8,
          tension: 100,
        }),
      ]).start();
    });
  }, [state.index]);

  const isDark = theme === 'dark';

  return (
    <View style={[styles.container, { 
      backgroundColor: isDark ? 'rgba(30, 30, 30, 0.98)' : 'rgba(255, 255, 255, 0.98)',
      borderTopColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'
    }]}>
      {/* Glassmorphic blur backdrop */}
      <View style={styles.blurContainer}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          // Dynamic scale for pop-out effect
          const scale = scaleValues[index];
          
          // Playful rotation (-5° to 0° tilt)
          const rotation = rotateValues[index].interpolate({
            inputRange: [0, 1],
            outputRange: ['0deg', '-5deg'],
          });
          
          // Glow circle scale (0 to 1.2x)
          const glowScale = glowValues[index].interpolate({
            inputRange: [0, 1],
            outputRange: [0, 1.2],
          });
          
          // Glow opacity
          const glowOpacity = glowValues[index].interpolate({
            inputRange: [0, 1],
            outputRange: [0, 0.2],
          });
          
          // Vertical lift for active tab
          const translateY = animatedValues[index].interpolate({
            inputRange: [0, 1],
            outputRange: [0, -8],
          });

          // Label and icon opacity
          const labelOpacity = animatedValues[index].interpolate({
            inputRange: [0, 1],
            outputRange: [0.6, 1],
          });

          const iconOpacity = animatedValues[index].interpolate({
            inputRange: [0, 1],
            outputRange: [0.5, 1],
          });

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tabButton}
            >
              {/* Glowing background circle - fourth dimension effect */}
              {isFocused && (
                <Animated.View
                  style={[
                    styles.glowCircle,
                    {
                      backgroundColor: isDark ? 'rgba(245, 245, 245, 0.15)' : 'rgba(51, 51, 51, 0.1)',
                      transform: [{ scale: glowScale }],
                      opacity: glowOpacity,
                    },
                  ]}
                />
              )}
              
              <Animated.View
                style={[
                  styles.tabContent,
                  {
                    transform: [
                      { scale },
                      { translateY },
                      { rotate: rotation },
                    ],
                  },
                  isFocused && Platform.select({
                    ios: {
                      shadowColor: isDark ? '#F5F5F5' : '#333333',
                      shadowOffset: { width: 0, height: 8 },
                      shadowOpacity: 0.3,
                      shadowRadius: 12,
                    },
                    android: {
                      elevation: 8,
                    },
                  }),
                ]}
              >
                <Animated.View style={{ opacity: iconOpacity }}>
                  {options.tabBarIcon?.({
                    focused: isFocused,
                    color: isFocused 
                      ? (isDark ? '#F5F5F5' : '#333333')
                      : (isDark ? '#9CA3AF' : '#6B7280'),
                    size: 24,
                  })}
                </Animated.View>
                
                <Animated.View style={{ opacity: labelOpacity }}>
                  <Text
                    style={[
                      styles.label,
                      {
                        color: isFocused 
                          ? (isDark ? '#F5F5F5' : '#333333')
                          : (isDark ? '#9CA3AF' : '#6B7280'),
                        fontWeight: isFocused ? '600' : '500',
                      },
                    ]}
                  >
                    {typeof options.tabBarLabel === 'string' ? options.tabBarLabel : route.name}
                  </Text>
                </Animated.View>
              </Animated.View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 0.5,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  blurContainer: {
    flexDirection: 'row',
    height: 68,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  glowCircle: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    zIndex: 1,
  },
  label: {
    fontSize: 11,
    marginTop: 4,
    letterSpacing: 0.2,
  },
});

export default AnimatedTabBar;
