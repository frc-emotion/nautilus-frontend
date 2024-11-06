// screens/AdminPortal.tsx
import React, { useState, useEffect } from 'react';
import { Button, Text, Spinner, Input, YStack, createTamagui } from 'tamagui';
import BLEHelper from '../utils/BLEHelper';
import { TamaguiProvider } from 'tamagui';
import defaultConfig from '@tamagui/config/v3';
import Constants from 'expo-constants';

const { APP_UUID } = Constants.expoConfig?.extra || {};
const config = createTamagui(defaultConfig);

const AdminPortal: React.FC = () => {
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [major, setMajor] = useState('69');
  const [minor, setMinor] = useState('69');

  useEffect(() => {
    return () => {
      if (isBroadcasting) BLEHelper.stopBroadcasting();
    };
  }, [isBroadcasting]);

  const validateInput = (value: string) => !isNaN(parseInt(value, 10));

  const toggleBroadcasting = async () => {
    if (!validateInput(major) || !validateInput(minor)) {
      console.error('Major and Minor must be valid numbers');
      return;
    }

    setLoading(true);
    try {
      if (isBroadcasting) {
        await BLEHelper.stopBroadcasting();
      } else {
        await BLEHelper.startBroadcasting(APP_UUID, parseInt(major, 10), parseInt(minor, 10));
      }
      setIsBroadcasting(!isBroadcasting);
    } catch (error) {
      console.error('Error toggling broadcasting:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TamaguiProvider config={config}>
      <YStack flex={1} alignItems="center" justifyContent="center" background="$background" space>
        <Text fontSize={20} color="$text">
          {isBroadcasting
            ? `Broadcasting Major: ${major}, Minor: ${minor}`
            : 'Not Broadcasting'}
        </Text>

        <YStack space="$3" width="80%">
          <Input
            value={major}
            onChangeText={setMajor}
            placeholder="Enter Major"
            keyboardType="numeric"
          />
          <Input
            value={minor}
            onChangeText={setMinor}
            placeholder="Enter Minor"
            keyboardType="numeric"
          />
        </YStack>

        <Button onPress={toggleBroadcasting} background="$primary" disabled={loading}>
          {loading ? <Spinner color="$background" /> : isBroadcasting ? 'Stop Broadcasting' : 'Start Broadcasting'}
        </Button>
      </YStack>
    </TamaguiProvider>
  );
};

export default AdminPortal;