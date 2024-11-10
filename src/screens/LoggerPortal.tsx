// screens/LoggerPortal.tsx
import React, { useEffect, useState, useRef } from 'react';
import { Button, Text, YStack } from 'tamagui';
import BLEHelper from '../utils/BLEHelper';
import Constants from 'expo-constants';

const { APP_UUID } = Constants.expoConfig?.extra || {};
console.log(APP_UUID);
console.log(Constants.expoConfig?.extra);

type Beacon = { uuid: string; major: number; minor: number };

const LoggerPortal: React.FC = () => {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [detectedBeacons, setDetectedBeacons] = useState<Beacon[]>([]);
  const beaconInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isMonitoring) {
      startBeaconInterval();
    } else {
      stopBeaconInterval();
    }

    return () => stopBeaconInterval();
  }, [isMonitoring]);

  const startBeaconInterval = () => {
    beaconInterval.current = setInterval(fetchDetectedBeacons, 2000);
  };

  const stopBeaconInterval = () => {
    if (beaconInterval.current) {
      clearInterval(beaconInterval.current);
      beaconInterval.current = null;
    }
  };

  const fetchDetectedBeacons = async () => {
    try {
      const beacons = await BLEHelper.getDetectedBeacons();
      setDetectedBeacons(beacons);
    } catch (error) {
      console.error('Error fetching detected beacons:', error);
    }
  };

  const toggleMonitoring = async () => {
    try {
      const action = isMonitoring ? 'stopListening' : 'startListening';
      const result = await BLEHelper[action](APP_UUID);
      console.log(result);
      setIsMonitoring((prev) => !prev);
    } catch (error) {
      console.error('Error toggling monitoring:', error);
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