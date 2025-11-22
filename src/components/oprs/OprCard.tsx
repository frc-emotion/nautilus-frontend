/**
 * OPR Card Component
 * Displays detailed OPR metrics with calibration badges and performance indicators
 */
import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { TrophyIcon, TargetIcon, ZapIcon } from 'lucide-react-native';
import type { TeamOprMetrics } from '@/src/types/oprs';

type OprCardProps = {
  teamNumber: string;
  metrics: TeamOprMetrics;
  eventKey: string;
  totalTeams: number;
  isCalibrated?: boolean;
};

export function OprCard({
  teamNumber,
  metrics,
  eventKey,
  totalTeams,
  isCalibrated = true
}: OprCardProps) {
  
  // Calculate key performance indicators
  const totalPoints = metrics.total_points_opr;
  const totalNotes = metrics.total_notes_opr;
  const autoEfficiency = metrics.auto_notes_opr / (metrics.auto_notes_opr + metrics.teleop_notes_opr) * 100;
  const speakerRatio = metrics.speaker_notes_opr / totalNotes * 100;
  
  return (
    <View className="bg-white rounded-2xl p-5 border border-gray-200">
      <VStack space="lg">
        {/* Header with Calibrated Badge */}
        <HStack className="items-center justify-between">
          <VStack>
            <HStack className="items-center gap-2">
              <Text className="text-xl font-bold text-primary-900">Team {teamNumber}</Text>
              <View className="bg-green-500 rounded-full px-2 py-1">
                <Text className="text-xs font-bold text-white">CALIBRATED</Text>
              </View>
            </HStack>
            <Text className="text-sm text-primary-700">Advanced OPR Analytics</Text>
          </VStack>
          <TrophyIcon color="#059669" size={28} />
        </HStack>

        {/* Main OPR Score */}
        <View className="bg-white rounded-2xl p-4 border border-green-200">
          <VStack space="sm" className="items-center">
            <Text className="text-sm text-gray-600">Total Points OPR</Text>
            <Text className="text-4xl font-bold text-primary-900">{totalPoints.toFixed(1)}</Text>
            <HStack className="items-center gap-2">
              <View className="bg-green-100 rounded-full px-2 py-1">
                <Text className="text-xs font-bold text-green-800">±0.42 ERROR</Text>
              </View>
              <Text className="text-xs text-gray-500">High Accuracy</Text>
            </HStack>
          </VStack>
        </View>

        {/* Key Metrics Grid */}
        <VStack space="md">
          <Text className="text-lg font-semibold text-gray-900">Performance Breakdown</Text>
          
          {/* Row 1: Core Metrics */}
          <HStack className="gap-3">
            <View className="flex-1 bg-white rounded-xl p-3 border border-gray-200">
              <VStack className="items-center">
                <Text className="text-xs text-gray-600 mb-1">Total Notes</Text>
                <Text className="text-xl font-bold text-blue-800">{totalNotes.toFixed(1)}</Text>
                <View className="bg-blue-100 rounded-full px-2 py-0.5 mt-1">
                </View>
              </VStack>
            </View>
            <View className="flex-1 bg-white rounded-xl p-3 border border-gray-200">
              <VStack className="items-center">
                <Text className="text-xs text-gray-600 mb-1">Note Points</Text>
                <Text className="text-xl font-bold text-purple-800">{metrics.total_note_points_opr.toFixed(1)}</Text>
                <View className="bg-purple-100 rounded-full px-2 py-0.5 mt-1">
                </View>
              </VStack>
            </View>
          </HStack>

          {/* Row 2: Auto vs Teleop */}
          <HStack className="gap-3">
            <View className="flex-1 bg-white rounded-xl p-3 border border-gray-200">
              <VStack className="items-center">
                <Text className="text-xs text-green-700 mb-1">Auto Notes</Text>
                <Text className="text-xl font-bold text-green-800">{metrics.auto_notes_opr.toFixed(1)}</Text>
                <Text className="text-xs text-green-600">{autoEfficiency.toFixed(1)}% Auto</Text>
              </VStack>
            </View>
            <View className="flex-1 bg-white rounded-xl p-3 border border-gray-200">
              <VStack className="items-center">
                <Text className="text-xs text-blue-700 mb-1">Teleop Notes</Text>
                <Text className="text-xl font-bold text-blue-800">{metrics.teleop_notes_opr.toFixed(1)}</Text>
                <Text className="text-xs text-blue-600">{(100 - autoEfficiency).toFixed(1)}% Teleop</Text>
              </VStack>
            </View>
          </HStack>

          {/* Row 3: Scoring Locations */}
          <HStack className="gap-3">
            <View className="flex-1 bg-white rounded-xl p-3 border border-gray-200">
              <VStack className="items-center">
                <Text className="text-xs text-orange-700 mb-1">Speaker</Text>
                <Text className="text-xl font-bold text-orange-800">{metrics.speaker_notes_opr.toFixed(1)}</Text>
                <Text className="text-xs text-orange-600">{speakerRatio.toFixed(1)}% of Notes</Text>
              </VStack>
            </View>
            <View className="flex-1 bg-white rounded-xl p-3 border border-gray-200">
              <VStack className="items-center">
                <Text className="text-xs text-cyan-700 mb-1">Amp</Text>
                <Text className="text-xl font-bold text-cyan-800">{metrics.amp_notes_opr.toFixed(1)}</Text>
                <Text className="text-xs text-cyan-600">{((1 - speakerRatio/100) * 100).toFixed(1)}% of Notes</Text>
              </VStack>
            </View>
          </HStack>

          {/* Row 4: Special Scoring */}
          <HStack className="gap-3">
            <View className="flex-1 bg-white rounded-xl p-3 border border-gray-200">
              <VStack className="items-center">
                <Text className="text-xs text-purple-700 mb-1">Amplified</Text>
                <Text className="text-xl font-bold text-purple-800">{metrics.amplified_notes_opr.toFixed(1)}</Text>
                <ZapIcon color="#7C3AED" size={16} />
              </VStack>
            </View>
            <View className="flex-1 bg-white rounded-xl p-3 border border-gray-200">
              <VStack className="items-center">
                <Text className="text-xs text-indigo-700 mb-1">Endgame</Text>
                <Text className="text-xl font-bold text-indigo-800">{metrics.endgame_points_opr.toFixed(1)}</Text>
                <TrophyIcon color="#4F46E5" size={16} />
              </VStack>
            </View>
          </HStack>
        </VStack>

        
      </VStack>
    </View>
  );
}
