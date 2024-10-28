// screens/LoggerPortal.tsx
import React, { useState } from 'react';
import { Button, Text, XStack, YStack } from 'tamagui';
import BLEHelper from '../utils/BLEHelper';

const LoggerPortal: React.FC = () => {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [detectedBeacons, setDetectedBeacons] = useState<{ major: number; minor: number }[]>([]);

  const toggleMonitoring = () => {
    if (isMonitoring) {
      BLEHelper.stopMonitoring();
    } else {
      BLEHelper.startMonitoring(setDetectedBeacons);
    }
    setIsMonitoring(!isMonitoring);
  };

  return (
    <YStack f={1} ai="center" jc="center" bg="$background" space>
      <Text fontSize={20} color="$text">
        {isMonitoring ? 'Monitoring for Beacons' : 'Not Monitoring'}
      </Text>
      <Button onPress={toggleMonitoring} bg="$primary">
        {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
      </Button>

      <YStack mt="$3" space>
        {detectedBeacons.map((beacon, index) => (
          <Text key={index} color="$text">
            Detected Beacon - Major: {beacon.major}, Minor: {beacon.minor}
          </Text>
        ))}
      </YStack>
    </YStack>
  );
};

export default LoggerPortal;
