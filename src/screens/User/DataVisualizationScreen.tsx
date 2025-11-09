/**
 * Scouting Data Visualization Screen
 * Displays aggregated scouting and TBA data with charts and KPIs
 */
import React, { useState, useRef, useEffect } from 'react';
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
import { CompetitionSelect } from '@/src/components/dataviz/CompetitionSelect';
import { EventKeyInput } from '@/src/components/dataviz/EventKeyInput';
import { TeamNumberInput } from '@/src/components/dataviz/TeamNumberInput';
import { MetricCard } from '@/src/components/MetricCard';
import { LevelContributionChart } from '@/src/components/dataviz/LevelContributionChart';
import { ClimbBarChart } from '@/src/components/dataviz/ClimbBarChart';
import { useTeamAggregation } from '@/src/hooks/useTeamAggregation';
import { useEventSummary } from '@/src/hooks/useEventSummary';
import { useTheme } from '@/src/utils/UI/CustomThemeProvider';
import { PremiumFAB } from '@/src/components/PremiumFAB';
import {
  TrophyIcon,
  ActivityIcon,
  TrendingUpIcon,
  TargetIcon,
  MoonIcon,
  SunIcon
} from 'lucide-react-native';

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
const teamNumberSchema = z.string().regex(/^\d+$/, 'Team number must be numeric');

function DataVisualizationScreenContent() {
  const { theme, toggleTheme } = useTheme();
  const [competition, setCompetition] = useState<string>('');
  const [eventKey, setEventKey] = useState<string>('');
  const [teamNumber, setTeamNumber] = useState<string>('');
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Animation refs for premium feel
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const [errors, setErrors] = useState<{
    eventKey?: string;
    teamNumber?: string;
  }>({});

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

  // Queries - only enabled after validation
  const {
    data: scoutingData,
    isLoading: isLoadingScouting,
    error: scoutingError,
    refetch: refetchScouting,
  } = useTeamAggregation(hasSubmitted ? competition : undefined, hasSubmitted ? teamNumber : undefined);

  const {
    data: tbaData,
    isLoading: isLoadingTba,
    error: tbaError,
    refetch: refetchTba,
  } = useEventSummary(hasSubmitted ? eventKey : undefined, hasSubmitted ? teamNumber : undefined);

  // Debug logging
  useEffect(() => {
    if (tbaData) {
      console.log('TBA Data received:', JSON.stringify(tbaData, null, 2));
    }
    if (tbaError) {
      console.log('TBA Error:', tbaError.message);
    }
  }, [tbaData, tbaError]);

  const handleLoadData = () => {
    // Validate inputs
    const validationErrors: typeof errors = {};

    if (!competition) {
      validationErrors.eventKey = 'Please select a competition';
    }

    if (!eventKey) {
      validationErrors.eventKey = 'Event key is required';
    } else {
      const eventValidation = eventKeySchema.safeParse(eventKey);
      if (!eventValidation.success) {
        validationErrors.eventKey = eventValidation.error.errors[0].message;
      }
    }

    if (!teamNumber) {
      validationErrors.teamNumber = 'Team number is required';
    } else {
      const teamValidation = teamNumberSchema.safeParse(teamNumber);
      if (!teamValidation.success) {
        validationErrors.teamNumber = teamValidation.error.errors[0].message;
      }
    }

    setErrors(validationErrors);

    if (Object.keys(validationErrors).length === 0) {
      setHasSubmitted(true);
    }
  };

  const handleRefresh = async () => {
    if (hasSubmitted) {
      await Promise.all([refetchScouting(), refetchTba()]);
    }
  };

  const isLoading = isLoadingScouting || isLoadingTba;

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
            {/* Compact Header */}
            <VStack space="xs">
              <Text className="text-sm font-medium text-typography-600">Scouting Analytics</Text>
              <Text className="text-3xl font-bold text-typography-950">Data Visualization</Text>
            </VStack>

            {/* Input Section - Compact Design */}
            <View className="bg-background-0 rounded-2xl shadow-lg border border-outline-100 overflow-hidden">
              <LinearGradient
                colors={theme === 'light'
                  ? ['#F0F9FF', '#E0F2FE']
                  : ['#1E293B', '#0F172A']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <VStack space="md" className="p-5">
                  <HStack className="items-center justify-between">
                    <Text className="text-xs font-medium text-typography-600 uppercase tracking-wide">
                      Team Selection
                    </Text>
                    <TargetIcon color={theme === 'light' ? '#0EA5E9' : '#38BDF8'} size={20} />
                  </HStack>

                  <CompetitionSelect value={competition} onValueChange={setCompetition} />

                  <HStack space="md" className="w-full">
                    <View className="flex-1">
                      <EventKeyInput
                        value={eventKey}
                        onChangeText={setEventKey}
                        error={errors.eventKey}
                      />
                    </View>
                    <View className="flex-1">
                      <TeamNumberInput
                        value={teamNumber}
                        onChangeText={setTeamNumber}
                        error={errors.teamNumber}
                      />
                    </View>
                  </HStack>

                  <Button
                    size="md"
                    onPress={handleLoadData}
                    disabled={!competition || !eventKey || !teamNumber}
                    className="w-full rounded-xl"
                  >
                    <ButtonText className="font-medium">Load Data</ButtonText>
                  </Button>
                </VStack>
              </LinearGradient>
            </View>

            {/* Loading State */}
            {isLoading && (
              <View className="py-8 items-center">
                <ActivityIndicator size="large" />
                <Text className="mt-4 text-typography-500">Loading data...</Text>
              </View>
            )}

            {/* Error States */}
            {!isLoading && hasSubmitted && (scoutingError || tbaError) && (
              <View className="rounded-2xl p-4 bg-error-100 border border-error-300">
                <VStack space="sm">
                  {scoutingError && (
                    <Text className="text-error-700">
                      Scouting: {scoutingError.message}
                    </Text>
                  )}
                  {tbaError && (
                    <Text className="text-error-700">TBA: {tbaError.message}</Text>
                  )}
                </VStack>
              </View>
            )}

            {/* KPI Cards */}
            {!isLoading && hasSubmitted && (tbaData || scoutingData) && (
              <VStack space="lg">
                <Text className="text-xl font-semibold">Key Metrics</Text>

                {/* Team Name - Full Width */}
                {tbaData?.teamName && (
                  <MetricCard
                    label="Team Name"
                    value={tbaData.teamName}
                    theme={theme}
                  />
                )}

                {/* 2-Column Grid for all other cards */}
                <HStack className="gap-3">
                  <View className="flex-1">
                    <MetricCard
                      label="Team #"
                      value={teamNumber}
                      theme={theme}
                    />
                  </View>
                  
                  
                </HStack>

                {(tbaData?.matchesPlayed !== null && tbaData?.matchesPlayed !== undefined) || tbaData?.record ? (
                  <HStack className="gap-3 items-stretch">
                    {tbaData?.matchesPlayed !== null && tbaData?.matchesPlayed !== undefined && (
                      <View className="flex-1">
                        <MetricCard
                          label="Matches Played"
                          value={tbaData.matchesPlayed}
                          theme={theme}
                        />
                      </View>
                    )}
                    {tbaData?.record && (
                      <View className="flex-1">
                        <MetricCard
                          label="Record"
                          value={`${tbaData.record.wins}-${tbaData.record.losses}-${tbaData.record.ties}`}
                          subtitle={`${tbaData.record.winratePct.toFixed(1)}% win rate`}
                          theme={theme}
                        />
                      </View>
                    )}
                  </HStack>
                ) : null}

                {/* OPR/DPR Row */}
                {((tbaData?.opr !== null && tbaData?.opr !== undefined) || (tbaData?.dpr !== null && tbaData?.dpr !== undefined)) && (
                  <HStack className="gap-3">
                    {tbaData?.opr !== null && tbaData?.opr !== undefined && (
                      <View className="flex-1">
                        <MetricCard
                          label="OPR"
                          value={tbaData.opr.toFixed(1)}
                          theme={theme}
                        />
                      </View>
                    )}
                    {tbaData?.dpr !== null && tbaData?.dpr !== undefined && (
                      <View className="flex-1">
                        <MetricCard
                          label="DPR"
                          value={tbaData.dpr.toFixed(1)}
                          theme={theme}
                        />
                      </View>
                    )}
                    {tbaData?.ccwm !== null && tbaData?.ccwm !== undefined && (
                      <View className="flex-1">
                        <MetricCard
                          label="CCWM"
                          value={tbaData.ccwm.toFixed(1)}
                          theme={theme}
                        />
                      </View>
                    )}
                  </HStack>
                )}

                {/* CCWM/Ranking Row */}
                {(tbaData?.ranking) && (
                  <HStack className="gap-3">
                    {tbaData?.ranking && (
                      <View className="flex-1">
                        <MetricCard
                          label="Ranking"
                          value={`#${tbaData.ranking.rank}`}
                          subtitle={tbaData.ranking.rp ? `${tbaData.ranking.rp} RP` : undefined}
                          theme={theme}
                        />
                      </View>
                    )}
                  </HStack>
                )}

                {/* Scouting Data - Full Width if exists */}
                {scoutingData && scoutingData.matchesScouted > 0 && (
                  <MetricCard
                    label="Avg PPG (Scouted)"
                    value={scoutingData.avgPpgScouted.toFixed(1)}
                    subtitle={`from ${scoutingData.matchesScouted} scouted matches`}
                    theme={theme}
                  />
                )}

                {/* Charts */}
                {scoutingData && scoutingData.matchesScouted > 0 && (
                  <>
                    <LevelContributionChart levelPct={scoutingData.levelPct} />
                    <ClimbBarChart climbCounts={scoutingData.climbCounts} />
                  </>
                )}

                {/* Empty State for Scouting */}
                {scoutingData && scoutingData.matchesScouted === 0 && (
                  <View className="rounded-2xl p-6 bg-background-100">
                    <Text className="text-center text-typography-600">
                      No scouted data for team {teamNumber} at {competition}
                    </Text>
                  </View>
                )}

                {/* Sample Matches */}
                {scoutingData && scoutingData.samples.length > 0 && (
                  <VStack space="md">
                    <Text className="text-xl font-semibold">Scouted Matches</Text>
                    {scoutingData.samples.map((sample, idx) => (
                      <View
                        key={idx}
                        className="rounded-xl p-4 bg-background-50 border border-outline-200"
                      >
                        <VStack space="sm">
                          <HStack className="justify-between">
                            <Text className="font-semibold">Match {sample.matchNumber}</Text>
                            <Text className="font-bold text-lg">{sample.points.toFixed(1)} pts</Text>
                          </HStack>

                          <HStack space="md">
                            <Text className="text-sm text-typography-600">
                              Result:{' '}
                              {sample.won === 1 || sample.won === true
                                ? '✅ Won'
                                : sample.won === 0
                                  ? '🤝 Tied'
                                  : '❌ Lost'}
                            </Text>
                            {sample.climb && (
                              <Text className="text-sm text-typography-600">
                                Climb: {sample.climb.replace('_', ' ')}
                              </Text>
                            )}
                          </HStack>

                          {sample.comments && (
                            <Text className="text-sm italic text-typography-500">
                              {sample.comments}
                            </Text>
                          )}
                        </VStack>
                      </View>
                    ))}
                  </VStack>
                )}
              </VStack>
            )}
          </VStack>
        </Animated.View>
      </ScrollView>
      <PremiumFAB
        onPress={toggleTheme}
        icon={theme === 'light' ? <MoonIcon color="#333333" size={24} /> : <SunIcon color="#F5F5F5" size={24} />}
        theme={theme}
      />
    </VStack>
  );
}

// Wrap with QueryClientProvider
export default function DataVisualizationScreen() {
  return (
    <QueryClientProvider client={queryClient}>
      <DataVisualizationScreenContent />
    </QueryClientProvider>
  );
}
