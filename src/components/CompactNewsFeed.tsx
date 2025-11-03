import React from 'react';
import { View } from 'react-native';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Button, ButtonText } from '@/components/ui/button';
import { Pressable } from '@/components/ui/pressable';
import { Icon } from '@/components/ui/icon';
import { BellIcon, ChevronRightIcon } from 'lucide-react-native';

/**
 * Compact news feed with clean list design
 * Inspired by Apple News and Notion's update feed
 */

interface CompactNewsFeedProps {
  updates: Array<[string, number]>;
  onEditPress?: () => void;
  canEdit?: boolean;
  maxVisible?: number;
  theme?: 'light' | 'dark';
}

export const CompactNewsFeed: React.FC<CompactNewsFeedProps> = ({
  updates,
  onEditPress,
  canEdit = false,
  maxVisible = 3,
  theme = 'light',
}) => {
  const visibleUpdates = updates.slice(0, maxVisible);
  const hasMore = updates.length > maxVisible;

  if (updates.length === 0) {
    return (
      <View className="bg-background-0 rounded-2xl shadow-md border border-outline-100 p-6">
        <VStack space="md" className="items-center">
          <BellIcon color={theme === 'light' ? '#9CA3AF' : '#6B7280'} size={32} />
          <Text className="text-sm text-typography-600 text-center">
            No announcements right now
          </Text>
        </VStack>
      </View>
    );
  }

  return (
    <View className="bg-background-0 rounded-2xl shadow-md border border-outline-100 overflow-hidden">
      <VStack>
        {/* Header */}
        <HStack className="items-center justify-between px-5 py-4 border-b border-outline-100">
          <HStack space="sm" className="items-center">
            <BellIcon color={theme === 'light' ? '#333333' : '#F5F5F5'} size={20} />
            <Text className="text-base font-semibold text-typography-950">
              Announcements
            </Text>
          </HStack>
          {canEdit && onEditPress && (
            <Pressable onPress={onEditPress}>
              <Text className="text-sm font-medium text-blue-600">Edit</Text>
            </Pressable>
          )}
        </HStack>

        {/* News Items */}
        <VStack>
          {visibleUpdates.map(([text, id], index) => (
            <View
              key={id}
              className={`px-5 py-4 ${
                index < visibleUpdates.length - 1 ? 'border-b border-outline-50' : ''
              }`}
            >
              <HStack space="sm" className="items-start">
                <View className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2" />
                <Text className="flex-1 text-sm text-typography-800 leading-relaxed">
                  {text}
                </Text>
              </HStack>
            </View>
          ))}
        </VStack>

        {/* Footer if more items */}
        {hasMore && (
          <View className="px-5 py-3 border-t border-outline-100 bg-background-50">
            <Text className="text-xs text-typography-500 text-center">
              +{updates.length - maxVisible} more announcement{updates.length - maxVisible !== 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </VStack>
    </View>
  );
};

export default CompactNewsFeed;
