// screens/AdminPortal.tsx
import React, { useState, useEffect } from 'react';
import { Button, Text, Spinner, Input, YStack, createTamagui } from 'tamagui';
import BLEHelper from '../utils/BLEHelper';
import { TamaguiProvider } from 'tamagui';
import defaultConfig from '@tamagui/config/v3';
import Constants from 'expo-constants';

const DEBUG_PREFIX = '[AdminPortal]';
const APP_UUID = Constants.expoConfig?.extra?.APP_UUID || '00000000-0000-0000-0000-000000000000';
const config = createTamagui(defaultConfig);

const AdminPortal: React.FC = () => {
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [major, setMajor] = useState('69');
  const [minor, setMinor] = useState('69');

  useEffect(() => {
    console.log(`${DEBUG_PREFIX} Component mounted.`);
    return () => {
      console.log(`${DEBUG_PREFIX} Component unmounting.`);
      if (isBroadcasting) {
        console.log(`${DEBUG_PREFIX} Stopping broadcasting on unmount.`);
        BLEHelper.stopBroadcasting();
      }
    };
  }, [isBroadcasting]);

  const validateInput = (value: string) => {
    const isValid = !isNaN(parseInt(value, 10));
    if (!isValid) console.error(`${DEBUG_PREFIX} Invalid input detected: ${value}`);
    return isValid;
  };

  const toggleBroadcasting = async () => {
    console.log(`${DEBUG_PREFIX} Toggling broadcasting. Current state: ${isBroadcasting ? 'Broadcasting' : 'Not Broadcasting'}`);

    if (!validateInput(major) || !validateInput(minor)) {
      console.error(`${DEBUG_PREFIX} Major and Minor must be valid numbers`);
      return;
    }

    setLoading(true);
    console.log(`${DEBUG_PREFIX} Starting toggleBroadcasting, loading state set to true.`);
    try {
      if (isBroadcasting) {
        console.log(`${DEBUG_PREFIX} Attempting to stop broadcasting.`);
        await BLEHelper.stopBroadcasting();
        console.log(`${DEBUG_PREFIX} Broadcasting stopped successfully.`);
      } else {
        console.log(`${DEBUG_PREFIX} Starting broadcasting with UUID: ${APP_UUID}, Major: ${major}, Minor: ${minor}`);
        await BLEHelper.startBroadcasting(APP_UUID, parseInt(major, 10), parseInt(minor, 10));
        console.log(`${DEBUG_PREFIX} Broadcasting started successfully.`);
      }
      setIsBroadcasting(!isBroadcasting);
    } catch (error) {
      console.error(`${DEBUG_PREFIX} Error toggling broadcasting:`, error);
    } finally {
      setLoading(false);
      console.log(`${DEBUG_PREFIX} toggleBroadcasting completed, loading state set to false.`);
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
            onChangeText={(value) => {
              console.log(`${DEBUG_PREFIX} Major input changed to: ${value}`);
              setMajor(value);
            }}
            placeholder="Enter Major"
            keyboardType="numeric"
          />
          <Input
            value={minor}
            onChangeText={(value) => {
              console.log(`${DEBUG_PREFIX} Minor input changed to: ${value}`);
              setMinor(value);
            }}
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