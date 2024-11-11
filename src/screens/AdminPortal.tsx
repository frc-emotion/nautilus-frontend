// screens/AdminPortal.tsx
import React, { useState, useEffect } from 'react';
import BLEHelper from '../utils/BLEHelper';
import Constants from 'expo-constants';
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { VStack } from '@/components/ui/vstack';
import { Input, InputField } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Text } from "@/components/ui/text"
import { Spinner } from '@/components/ui/spinner';

const DEBUG_PREFIX = '[AdminPortal]';
const APP_UUID = Constants.expoConfig?.extra?.APP_UUID || '00000000-0000-0000-0000-000000000000';

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
    <GluestackUIProvider>
      <VStack space="lg" className="p-6 bg-gray-100 flex-1">
        <Text size="2xl" bold={true} className="text-center mb-4">
          {isBroadcasting ? `Broadcasting Major: ${major}, Minor: ${minor}` : 'Not Broadcasting'}
        </Text>

        <VStack space="md" className="bg-white p-4 rounded-lg shadow-md">
          <Text size="lg" className="text-gray-700 mb-2 font-semibold">Major</Text>
          <Input
            variant='outline'
            size='lg'
            className="border-gray-300"
            isDisabled={isBroadcasting}
          >
            <InputField placeholder="Enter Major" onChangeText={setMajor}/>
          </Input>

          <Text size="lg" className="text-gray-700 mt-4 mb-2 font-semibold">Minor</Text>
          <Input
            variant='outline'
            size='lg'
            className="border-gray-300"
            isDisabled={isBroadcasting}
          >
            <InputField placeholder="Enter Minor" onChangeText={setMinor}/>
          </Input>
        </VStack>

        <Button 
          onPress={toggleBroadcasting} 
          className={`mt-6 px-6 rounded-lg ${loading ? 'bg-gray-400' : isBroadcasting ? 'bg-red-500' : 'bg-blue-500'}`}
          isDisabled={loading}
        >
          {loading ? (
            <Spinner color="white" />
          ) : (
            <Text size="lg" className="text-white font-bold text-center">
              {isBroadcasting ? 'Stop Broadcasting' : 'Start Broadcasting'}
            </Text>
          )}
        </Button>
      </VStack>
    </GluestackUIProvider>
  );
};

export default AdminPortal;