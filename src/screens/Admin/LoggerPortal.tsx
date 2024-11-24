// screens/LoggerPortal.tsx
import React, { useEffect, useState, useRef } from 'react';
import Constants from 'expo-constants';
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { VStack } from '@/components/ui/vstack';
import { Button } from '@/components/ui/button';
import { Text } from "@/components/ui/text";
import { Spinner } from '@/components/ui/spinner';
import BLEHelper from '@/src/utils/BLEHelper';

const DEBUG_PREFIX = '[LoggerPortal]';
const APP_UUID = Constants.expoConfig?.extra?.APP_UUID || '00000000-0000-0000-0000-000000000000';
console.log(`${DEBUG_PREFIX} APP_UUID: ${APP_UUID}`);
console.log(`${DEBUG_PREFIX} Expo Config Extra:`, Constants.expoConfig?.extra);

type Beacon = { uuid: string; major: number; minor: number };

const LoggerPortal: React.FC = () => {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [loading, setLoading] = useState(false);
  const [detectedBeacons, setDetectedBeacons] = useState<Beacon[]>([]);
  const beaconInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    console.log(`${DEBUG_PREFIX} Monitoring status changed: ${isMonitoring}`);
    if (isMonitoring) {
      startBeaconInterval();
    } else {
      stopBeaconInterval();
    }

    return () => {
      console.log(`${DEBUG_PREFIX} Component unmounting, stopping beacon interval if active.`);
      stopBeaconInterval();
    };
  }, [isMonitoring]);

  const startBeaconInterval = () => {
    console.log(`${DEBUG_PREFIX} Starting beacon detection interval.`);
    beaconInterval.current = setInterval(fetchDetectedBeacons, 2000);
  };

  const stopBeaconInterval = () => {
    if (beaconInterval.current) {
      console.log(`${DEBUG_PREFIX} Stopping beacon detection interval.`);
      clearInterval(beaconInterval.current);
      beaconInterval.current = null;
    }
  };

  const fetchDetectedBeacons = async () => {
    console.log(`${DEBUG_PREFIX} Fetching detected beacons.`);
    try {
      const beacons = await BLEHelper.getDetectedBeacons();
      console.log(`${DEBUG_PREFIX} Detected beacons:`, beacons);
      setDetectedBeacons(beacons);
    } catch (error) {
      console.error(`${DEBUG_PREFIX} Error fetching detected beacons:`, error);
    }
  };

  const toggleMonitoring = async () => {
    setLoading(true);
    try {
      const action = isMonitoring ? 'stopListening' : 'startListening';
      console.log(`${DEBUG_PREFIX} Attempting to ${action} for beacons with UUID: ${APP_UUID}`);
      const result = await BLEHelper[action](APP_UUID);
      console.log(`${DEBUG_PREFIX} Monitoring ${action} result:`, result);
      setIsMonitoring((prev) => !prev);
    } catch (error) {
      console.error(`${DEBUG_PREFIX} Error toggling monitoring:`, error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <VStack space="lg" className="p-6 bg-gray-100 flex-1">
      <Text size="2xl" bold={true} className="text-center mb-4">
        {isMonitoring ? 'Monitoring for Beacons' : 'Not Monitoring'}
      </Text>

      <Button
        onPress={toggleMonitoring}
        className={`px-6 rounded-lg ${loading ? 'bg-gray-400' : isMonitoring ? 'bg-red-500' : 'bg-blue-500'}`}
        isDisabled={loading}
      >
        {loading ? (
          <Spinner color="white" />
        ) : (
          <Text size="lg" className="text-white font-bold text-center">
            {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
          </Text>
        )}
      </Button>

      <VStack space="md" className="bg-white p-4 rounded-lg shadow-md mt-6">
        {detectedBeacons.length > 0 ? (
          detectedBeacons.map((beacon, index) => (
            <Text key={index} className="text-gray-700 text-md">
              Detected Beacon - UUID: {beacon.uuid}, Major: {beacon.major}, Minor: {beacon.minor}
            </Text>
          ))
        ) : (
          <Text className="text-gray-500 text-center">
            No beacons detected
          </Text>
        )}
      </VStack>
    </VStack>
  );
};

export default LoggerPortal;