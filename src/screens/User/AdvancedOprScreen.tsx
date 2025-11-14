/**
 * Advanced OPR Analytics Screen
 * 
 * Displays robot-isolated scoring contributions using least-squares
 * OPR calculations from official FMS match data via TBA.
 */
import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  ScrollView,
  View,
  RefreshControl,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Button, ButtonText } from '@/components/ui/button';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { z } from 'zod';
import { EventKeyInput } from '@/src/components/dataviz/EventKeyInput';
import { OprTable } from '@/src/components/oprs/OprTable';
import { TeamPicker } from '@/src/components/oprs/TeamPicker';
import { OprBarChart } from '@/src/components/oprs/OprBarChart';
import { OprRadarChart } from '@/src/components/oprs/OprRadarChart';
import { useAdvancedOprs } from '@/src/hooks/useAdvancedOprs';
import { useTheme } from '@/src/utils/UI/CustomThemeProvider';
import { PremiumFAB } from '@/src/components/PremiumFAB';
import {
  BarChart3Icon,
  TrendingUpIcon,
  TargetIcon,
  MoonIcon,
  SunIcon,
} from 'lucide-react-native';
import type { TeamOprMetrics } from '@/src/types/oprs';
import { OPR_METRICS } from '@/src/types/oprs';

// Create query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Validation schema
const eventKeySchema = z.string().regex(/^\d{4}[a-z0-9]+$/, 'Invalid event key format');

function AdvancedOprScreenContent() {
  const { theme, toggleTheme } = useTheme();
  const [eventKey, setEventKey] = useState<string>('');
  const [selectedTeam, setSelectedTeam] = useState<string | undefined>(undefined);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  // Entrance animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
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

  // Fetch OPR data
  const {
    data: oprData,
    isLoading,
    error: oprError,
    refetch,
  } = useAdvancedOprs(hasSubmitted ? eventKey : undefined);

  // Calculate max values for scaling
  const maxValues = useMemo(() => {
    if (!oprData) return {};

    const maxes: Record<string, number> = {};
    const allTeams = Object.values(oprData.team_metrics);

    OPR_METRICS.forEach((config) => {
      const values = allTeams.map((m) => Math.abs(m[config.key]));
      maxes[config.key] = Math.max(...values, 1);
    });

    return maxes;
  }, [oprData]);

  const handleLoadData = () => {
    setError(undefined);

    if (!eventKey) {
      setError('Event key is required');
      return;
    }

    const eventValidation = eventKeySchema.safeParse(eventKey);
    if (!eventValidation.success) {
      setError(eventValidation.error.errors[0].message);
      return;
    }

    setHasSubmitted(true);
    setSelectedTeam(undefined);
  };

  const handleRefresh = async () => {
    if (hasSubmitted) {
      await refetch();
    }
  };

  const handleTeamSelect = (teamNumber: string) => {
    setSelectedTeam(teamNumber);
  };

  const selectedTeamMetrics: TeamOprMetrics | undefined = useMemo(() => {
    if (!oprData || !selectedTeam) return undefined;
    return oprData.team_metrics[selectedTeam];
  }, [oprData, selectedTeam]);

  return (
    <VStack className="flex-1 bg-background-0">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />
        }
      >
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <VStack space="lg" className="px-5 py-6">
            {/* Header */}
            <VStack space="xs">
              <Text className="text-sm font-medium text-typography-600">
                FRC 2025 Reefscape
              </Text>
              <Text className="text-3xl font-bold text-typography-950">
                Advanced OPR Analytics
              </Text>
              <Text className="text-sm text-typography-600">
                Robot-isolated scoring contributions using least-squares from official FMS data
              </Text>
            </VStack>

            {/* Input Section */}
            <View className="bg-background-0 rounded-2xl shadow-lg border border-outline-100 overflow-hidden">
              <LinearGradient
                colors={
                  theme === 'light'
                    ? ['#F0F9FF', '#E0F2FE']
                    : ['#1E293B', '#0F172A']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <VStack space="md" className="p-5">
                  <HStack className="items-center justify-between">
                    <Text className="text-xs font-medium text-typography-600 uppercase tracking-wide">
                      Event Selection
                    </Text>
                    <BarChart3Icon
                      color={theme === 'light' ? '#0EA5E9' : '#38BDF8'}
                      size={20}
                    />
                  </HStack>

                  <EventKeyInput
                    value={eventKey}
                    onChangeText={setEventKey}
                    error={error}
                  />

                  <Button
                    size="md"
                    onPress={handleLoadData}
                    disabled={!eventKey}
                    className="w-full rounded-xl"
                  >
                    <ButtonText className="font-medium">Load OPR Data</ButtonText>
                  </Button>
                </VStack>
              </LinearGradient>
            </View>

            {/* Loading State */}
            {isLoading && (
              <View className="py-8 items-center">
                <ActivityIndicator size="large" />
                <Text className="mt-4 text-typography-500">
                  Computing OPR metrics...
                </Text>
              </View>
            )}

            {/* Error State */}
            {!isLoading && hasSubmitted && oprError && (
              <View className="rounded-2xl p-4 bg-error-100 border border-error-300">
                <Text className="text-error-700">{oprError.message}</Text>
              </View>
            )}

            {/* Results */}
            {!isLoading && oprData && Object.keys(oprData.team_metrics).length > 0 && (
              <VStack space="lg">
                {/* Summary Card */}
                <View className="bg-primary-50 rounded-2xl p-4 border border-primary-200">
                  <HStack className="items-center justify-between">
                    <VStack>
                      <Text className="text-sm text-primary-700">Event</Text>
                      <Text className="text-2xl font-bold text-primary-900">
                        {oprData.event.toUpperCase()}
                      </Text>
                    </VStack>
                    <VStack className="items-end">
                      <Text className="text-sm text-primary-700">Teams Analyzed</Text>
                      <Text className="text-2xl font-bold text-primary-900">
                        {Object.keys(oprData.team_metrics).length}
                      </Text>
                    </VStack>
                  </HStack>
                </View>

                {/* OPR Table */}
                <OprTable
                  data={oprData}
                  onTeamSelect={handleTeamSelect}
                  selectedTeam={selectedTeam}
                />

                {/* Team Picker */}
                {selectedTeam && (
                  <TeamPicker
                    data={oprData}
                    value={selectedTeam}
                    onValueChange={setSelectedTeam}
                  />
                )}

                {/* Detailed Metrics for Selected Team */}
                {selectedTeam && selectedTeamMetrics && (
                  <VStack space="md">
                    <Text className="text-xl font-semibold">
                      Detailed Analysis - Team {selectedTeam}
                    </Text>

                    <OprBarChart
                      teamNumber={selectedTeam}
                      metrics={selectedTeamMetrics}
                      maxValues={maxValues}
                    />

                    <OprRadarChart
                      teamNumber={selectedTeam}
                      metrics={selectedTeamMetrics}
                      maxValues={maxValues}
                    />
                  </VStack>
                )}
              </VStack>
            )}

            {/* Empty State */}
            {!isLoading && oprData && Object.keys(oprData.team_metrics).length === 0 && (
              <View className="rounded-2xl p-6 bg-background-100">
                <Text className="text-center text-typography-600">
                  No OPR data available for event {eventKey}
                </Text>
              </View>
            )}
          </VStack>
        </Animated.View>
      </ScrollView>
      <PremiumFAB
        onPress={toggleTheme}
        icon={
          theme === 'light' ? (
            <MoonIcon color="#333333" size={24} />
          ) : (
            <SunIcon color="#F5F5F5" size={24} />
          )
        }
        theme={theme}
      />
    </VStack>
  );
}

// Wrap with QueryClientProvider
export default function AdvancedOprScreen() {
  return (
    <QueryClientProvider client={queryClient}>
      <AdvancedOprScreenContent />
    </QueryClientProvider>
  );
}
