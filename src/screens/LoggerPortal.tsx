// screens/LoggerPortal.tsx
import React, { useEffect, useState, useRef } from 'react';
import { Button, Text, YStack } from 'tamagui';
import BLEHelper from '../utils/BLEHelper';
import Constants from 'expo-constants';

const DEBUG_PREFIX = '[LoggerPortal]';
const APP_UUID = Constants.expoConfig?.extra?.APP_UUID || '00000000-0000-0000-0000-000000000000';
console.log(`${DEBUG_PREFIX} APP_UUID: ${APP_UUID}`);
console.log(`${DEBUG_PREFIX} Expo Config Extra:`, Constants.expoConfig?.extra);

type Beacon = { uuid: string; major: number; minor: number };

const LoggerPortal: React.FC = () => {
  const [isMonitoring, setIsMonitoring] = useState(false);
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
    try {
      const action = isMonitoring ? 'stopListening' : 'startListening';
      console.log(`${DEBUG_PREFIX} Attempting to ${action} for beacons with UUID: ${APP_UUID}`);
      const result = await BLEHelper[action](APP_UUID);
      console.log(`${DEBUG_PREFIX} Monitoring ${action} result:`, result);
      setIsMonitoring((prev) => !prev);
    } catch (error) {
      console.error(`${DEBUG_PREFIX} Error toggling monitoring:`, error);
    }
  };

  return (
    <YStack flex={1} alignItems="center" justifyContent="center" background="$background" space>
      <Text fontSize={20} color="$text">
        {isMonitoring ? 'Monitoring for Beacons' : 'Not Monitoring'}
      </Text>
      <Button onPress={toggleMonitoring} backgroundColor="$primary">
        {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
      </Button>

      <YStack marginTop="$3" space>
        {detectedBeacons.length > 0 ? (
          detectedBeacons.map((beacon, index) => (
            <Text key={index} color="$text">
              Detected Beacon - UUID: {beacon.uuid}, Major: {beacon.major}, Minor: {beacon.minor}
            </Text>
          ))
        ) : (
          <Text color="$text">No beacons detected</Text>
        )}
      </YStack>
    </YStack>
  );
};

export default LoggerPortal;