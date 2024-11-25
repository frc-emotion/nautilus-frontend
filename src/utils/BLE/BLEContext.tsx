import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { EmitterSubscription } from 'react-native';
import BLEHelper from '@/src/utils/BLE/BLEHelper';
import { Beacon, QueuedRequest, MeetingObject, APP_UUID } from '@/src/Constants';
import { useGlobalToast } from '@/src/utils/UI/CustomToastProvider';
import { useAuth } from '@/src/utils/AuthContext';
import { useModal } from '@/src/utils/UI/CustomModalProvider';

interface BLEContextProps {
  bluetoothState: string;
  detectedBeacons: Beacon[];
  isListening: boolean;
  isBroadcasting: boolean;
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  startBroadcasting: (uuid: string, major: number, minor: number) => Promise<void>;
  stopBroadcasting: () => Promise<void>;
}

const BLEContext = createContext<BLEContextProps | undefined>(undefined);

export const useBLE = (): BLEContextProps => {
  const context = useContext(BLEContext);
  if (!context) {
    throw new Error('useBLE must be used within a BLEProvider');
  }
  return context;
};

const DEBUG_PREFIX = '[GlobalBLEManager]';

export const BLEProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [bluetoothState, setBluetoothState] = useState<string>('unknown');
  const [detectedBeacons, setDetectedBeacons] = useState<Beacon[]>([]);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isBroadcasting, setIsBroadcasting] = useState<boolean>(false);

  const beaconInterval = useRef<NodeJS.Timeout | null>(null);
  const bluetoothStateSubscription = useRef<EmitterSubscription | null>(null);
  const beaconDetectedSubscription = useRef<EmitterSubscription | null>(null);

  const { showToast } = useGlobalToast();
  const { user } = useAuth();
  const { openModal } = useModal();

  // Subscribe to Bluetooth state changes
  useEffect(() => {
    console.log(`${DEBUG_PREFIX} Subscribing to Bluetooth state changes.`);
    bluetoothStateSubscription.current = BLEHelper.addBluetoothStateListener(handleBluetoothStateChange);

    // Subscribe to Beacon detected events
    beaconDetectedSubscription.current = BLEHelper.addBeaconDetectedListener(handleBeaconDetected);

    return () => {
      console.log(`${DEBUG_PREFIX} Cleaning up subscriptions.`);
      if (bluetoothStateSubscription.current) {
        BLEHelper.removeBluetoothStateListener(bluetoothStateSubscription.current);
      }
      if (beaconDetectedSubscription.current) {
        BLEHelper.removeBeaconDetectedListener(beaconDetectedSubscription.current);
      }
      if (isListening) {
        BLEHelper.stopListening();
      }
      if (isBroadcasting) {
        BLEHelper.stopBroadcasting();
      }
      if (beaconInterval.current) {
        clearInterval(beaconInterval.current);
      }
    };

  }, []);

  // Handle Bluetooth state changes
  const handleBluetoothStateChange = (event: { state: string }) => {
    console.log(`${DEBUG_PREFIX} Bluetooth state changed: ${event.state}`);
    setBluetoothState(event.state);

    switch (event.state) {
      case 'poweredOff':
        handleBluetoothPoweredOff();
        break;
      case 'poweredOn':
        handleBluetoothPoweredOn();
        break;
      case 'unsupported':
        handleBluetoothUnsupported();
        break;
      case 'unauthorized':
        handleBluetoothUnauthorized();
        break;
      case 'unknown':
      case 'resetting':
      default:
        handleBluetoothUnknown();
        break;
    }
  };

  // Handle Beacon detected
  const handleBeaconDetected = (event: { beacons: { uuid: string; major: number; minor: number; }[] }) => {
    const { beacons } = event;
    console.log(`${DEBUG_PREFIX} Beacon detected:`, beacons);
    if (beacons.length === 0) return;
    setDetectedBeacons((prevBeacons) => {
      // Avoid duplicates
      const exists = prevBeacons.some(
        (b) => b.uuid === beacons[0].uuid && b.major === beacons[0].major && b.minor === beacons[0].minor
      );
      if (!exists && beacons[0].uuid === APP_UUID) {
        return [...prevBeacons, beacons[0]];
      }
      return prevBeacons;
    });
  };

  const handleBluetoothPoweredOff = () => {
    if (isListening) {
      console.log(`${DEBUG_PREFIX} Bluetooth powered off while listening.`);
      showToast({
        title: 'Bluetooth Disabled',
        description: 'Bluetooth has been turned off. Listening stopped.',
        type: 'error',
      });
      openModal({
        title: 'Bluetooth Disabled',
        message: 'Bluetooth has been turned off. Listening for beacons has stopped.',
        type: 'error',
      });
      stopListening();
    }
    if (isBroadcasting) {
      console.log(`${DEBUG_PREFIX} Bluetooth powered off while broadcasting.`);
      showToast({
        title: 'Bluetooth Disabled',
        description: 'Bluetooth has been turned off. Broadcasting stopped.',
        type: 'error',
      });
      openModal({
        title: 'Bluetooth Disabled',
        message: 'Bluetooth has been turned off. Broadcasting has stopped.',
        type: 'error',
      });
      stopBroadcasting();
    }
  };

  const handleBluetoothPoweredOn = () => {
    console.log(`${DEBUG_PREFIX} Bluetooth powered on.`);
    showToast({
      title: 'Bluetooth Enabled',
      description: 'Bluetooth has been turned on.',
      type: 'success',
    });
  };

  const handleBluetoothUnsupported = () => {
    console.error(`${DEBUG_PREFIX} Bluetooth unsupported on this device.`);
    showToast({
      title: 'Bluetooth Unsupported',
      description: 'Bluetooth is unsupported on this device.',
      type: 'error',
    });
    openModal({
      title: 'Bluetooth Unsupported',
      message: 'Bluetooth is unsupported on this device.',
      type: 'error',
    });
  };

  const handleBluetoothUnauthorized = () => {
    console.error(`${DEBUG_PREFIX} Bluetooth unauthorized.`);
    showToast({
      title: 'Bluetooth Unauthorized',
      description: 'Bluetooth is unauthorized on this device.',
      type: 'error',
    });
    openModal({
      title: 'Bluetooth Unauthorized',
      message: 'Bluetooth is unauthorized on this device.',
      type: 'error',
    });
  };

  const handleBluetoothUnknown = () => {
    console.error(`${DEBUG_PREFIX} Bluetooth state unknown.`);
    showToast({
      title: 'Bluetooth State Unknown',
      description: 'Bluetooth state is unknown.',
      type: 'error',
    });
    openModal({
      title: 'Bluetooth State Unknown',
      message: 'Bluetooth state is unknown.',
      type: 'error',
    });
  };

  // Start Listening
  const startListening = async () => {
    if (bluetoothState !== 'poweredOn') {
      showToast({
        title: 'Bluetooth Required',
        description: 'Please enable Bluetooth to start listening for beacons.',
        type: 'error',
      });
      openModal({
        title: 'Bluetooth Required',
        message: 'Please enable Bluetooth to start listening for beacons.',
        type: 'error',
      });
      return;
    }

    try {
      await BLEHelper.startListening(APP_UUID);
      setIsListening(true);
      showToast({
        title: 'Started Listening',
        description: 'Now listening for beacons.',
        type: 'success',
      });
    } catch (error) {
      console.error(`${DEBUG_PREFIX} Error starting listening:`, error);
      showToast({ title: 'Error', description: 'Failed to start listening.', type: 'error' });
    }
  };

  // Stop Listening
  const stopListening = async () => {
    try {
      await BLEHelper.stopListening();
      setIsListening(false);
      showToast({
        title: 'Stopped Listening',
        description: 'Stopped listening for beacons.',
        type: 'info',
      });
    } catch (error) {
      console.error(`${DEBUG_PREFIX} Error stopping listening:`, error);
      showToast({ title: 'Error', description: 'Failed to stop listening.', type: 'error' });
    }
  };

  // Start Broadcasting
  const startBroadcasting = async (uuid: string, major: number, minor: number) => {
    if (bluetoothState !== 'poweredOn') {
      showToast({
        title: 'Bluetooth Required',
        description: 'Please enable Bluetooth to start broadcasting.',
        type: 'error',
      });
      openModal({
        title: 'Bluetooth Required',
        message: 'Please enable Bluetooth to start broadcasting.',
        type: 'error',
      });
      return;
    }

    try {
      await BLEHelper.startBroadcasting(uuid, major, minor);
      setIsBroadcasting(true);
      showToast({
        title: 'Started Broadcasting',
        description: 'Now broadcasting beacon.',
        type: 'success',
      });
    } catch (error) {
      console.error(`${DEBUG_PREFIX} Error starting broadcasting:`, error);
      showToast({ title: 'Error', description: 'Failed to start broadcasting.', type: 'error' });
    }
  };

  // Stop Broadcasting
  const stopBroadcasting = async () => {
    try {
      await BLEHelper.stopBroadcasting();
      setIsBroadcasting(false);
      showToast({
        title: 'Stopped Broadcasting',
        description: 'Stopped broadcasting beacon.',
        type: 'info',
      });
    } catch (error) {
      console.error(`${DEBUG_PREFIX} Error stopping broadcasting:`, error);
      showToast({ title: 'Error', description: 'Failed to stop broadcasting.', type: 'error' });
    }
  };

  // Context value
  const contextValue: BLEContextProps = {
    bluetoothState,
    detectedBeacons,
    isListening,
    isBroadcasting,
    startListening,
    stopListening,
    startBroadcasting,
    stopBroadcasting,
  };

  return <BLEContext.Provider value={contextValue}>{children}</BLEContext.Provider>;
};