import React from 'react';
import { View, Text } from 'react-native';
import { useUpdate } from '../utils/Context/UpdateContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pressable } from '@/components/ui/pressable';

const UpdateRibbon: React.FC = () => {
  const { openUpdateURL, isOutOfDate } = useUpdate();

  if (!isOutOfDate) return null;

  return (

    <View className="w-full z-50">
      <Pressable onPress={openUpdateURL} >
        <View className="bg-red-600 py-2 px-4 items-center">
          <Text className="text-white font-bold text-base">
            A new version is available. Tap to update.
          </Text>
        </View>
      </Pressable>
    </View>
  );
};

export default UpdateRibbon;
