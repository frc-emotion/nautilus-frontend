// screens/AdminPortal.tsx
import React, { useState, useEffect } from 'react';
import { Button, Text, XStack, Spinner } from 'tamagui';
import BLEHelper from '../utils/BLEHelper';

const AdminPortal: React.FC = () => {
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [loading, setLoading] = useState(false);
  const major = 69;
  const minor = 69;

  useEffect(() => {
    // Cleanup when component unmounts
    return () => {
      if (isBroadcasting) {
        BLEHelper.stopAdvertising();
      }
    };
  }, [isBroadcasting]);

  const toggleBroadcasting = async () => {
    setLoading(true);

    try {
      if (isBroadcasting) {
        await BLEHelper.stopAdvertising();
      } else {
        await BLEHelper.startAdvertising(major, minor);
      }
      setIsBroadcasting(!isBroadcasting);
    } catch (error) {
      console.error('Error toggling broadcasting:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <XStack f={1} ai="center" jc="center" bg="$background" space>
      <Text fontSize={20} color="$text">
        {isBroadcasting
          ? `Broadcasting Major: ${major}, Minor: ${minor}`
          : 'Not Broadcasting'}
      </Text>
      <Button onPress={toggleBroadcasting} bg="$primary" disabled={loading}>
        {loading ? <Spinner color="$background" /> : isBroadcasting ? 'Stop Broadcasting' : 'Start Broadcasting'}
      </Button>
    </XStack>
  );
};

export default AdminPortal;