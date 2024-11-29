import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import BLEHelper from '@/src/utils/BLE/BLEHelper';
import { Beacon, BLEContextProps } from '@/src/Constants';
import { useGlobalToast } from '@/src/utils/UI/CustomToastProvider';
import { useModal } from '@/src/utils/UI/CustomModalProvider';
import Constants from 'expo-constants';
import { Subscription } from "expo-modules-core";

const BLEContext = createContext<BLEContextProps | undefined>(undefined);

export const useBLE = (): BLEContextProps => {
  const context = useContext(BLEContext);
  if (!context) {
    throw new Error('useBLE must be used within a BLEProvider');
  }
  return context;
};

const APP_UUID = Constants.expoConfig?.extra?.APP_UUID.toUpperCase() || '00000000-0000-0000-0000-000000000000';

const DEBUG_PREFIX = '[GlobalBLEManager]';

export const BLEProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [bluetoothState, setBluetoothState] = useState<string>('unknown');
  const [detectedBeacons, setDetectedBeacons] = useState<Beacon[]>([]);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isBroadcasting, setIsBroadcasting] = useState<boolean>(false);

  const bluetoothStateSubscription = useRef<Subscription | null>(null);
  const beaconDetectedSubscription = useRef<Subscription | null>(null);

  const { openToast } = useGlobalToast();
  const { openModal } = useModal();

  // Subscribe to Bluetooth state changes and Beacon detected events
  useEffect(() => {
    console.log(`${DEBUG_PREFIX} Subscribing to Bluetooth state changes and Beacon detected events.`);

    // Add Bluetooth state listener
    bluetoothStateSubscription.current = BLEHelper.addBluetoothStateListener(handleBluetoothStateChange);

    // Add Beacon detected listener
    beaconDetectedSubscription.current = BLEHelper.addBeaconDetectedListener(handleBeaconDetected);

    // Fetch the initial Bluetooth state
    fetchInitialBluetoothState();

    return () => {
      // Remove Bluetooth state listener
      if (bluetoothStateSubscription.current) {
        BLEHelper.removeBluetoothStateListener(bluetoothStateSubscription.current);
      }
      // Remove Beacon detected listener
      if (beaconDetectedSubscription.current) {
        BLEHelper.removeBeaconDetectedListener(beaconDetectedSubscription.current);
      }
      // Stop listening and broadcasting if active
      if (isListening) {
        stopListening();
      }
      if (isBroadcasting) {
        stopBroadcasting();
      }
    };
  }, []);

  const fetchInitialBluetoothState = async () => {
    try {
      const state = await BLEHelper.getBluetoothState();
      console.log(`${DEBUG_PREFIX} Initial Bluetooth state: ${state}`);
      setBluetoothState(state);
    } catch (error: any) {
      console.error(`${DEBUG_PREFIX} Error fetching initial Bluetooth state:`, error);
      setBluetoothState('unknown');
    }
  };

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
      case 'turningOff':
        //handleBluetoothPoweredOff();
        break;
      case 'turningOn':
        //handleBluetoothPoweredOn();
        break;
      default:
        handleBluetoothUnknown();
        break;
    }
  };

  // Handle Beacon detected
  const handleBeaconDetected = (beacon: Beacon) => {
    setDetectedBeacons((prevBeacons) => {
      console.log(`${DEBUG_PREFIX} Previous beacons:`, prevBeacons);

      const existingBeacon = prevBeacons.find(
        (b) => b.uuid === beacon.uuid && b.major === beacon.major && b.minor === beacon.minor
      );

      if (!existingBeacon) {
        console.log(`${DEBUG_PREFIX} Adding beacon:`, beacon);
        const newBeacons = [...prevBeacons, beacon];
        console.log(`${DEBUG_PREFIX} Updated beacons:`, newBeacons);
        return newBeacons;
      } else {
        console.log(`${DEBUG_PREFIX} Beacon already exists:`, existingBeacon);
        return prevBeacons;
      }
    });

    // Log the beacon outside of state update to avoid unnecessary re-renders
    logMessage(`Beacon detected: ${beacon.uuid}, Major: ${beacon.major}, Minor: ${beacon.minor}`);
  };


  const handleBluetoothPoweredOff = () => {
    if (isListening) {
      console.log(`${DEBUG_PREFIX} Bluetooth powered off while listening.`);
      openToast({
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
      openToast({
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
    if (!isListening && !isBroadcasting) {
      openToast({
        title: 'Bluetooth Disabled',
        description: 'Please enable Bluetooth in order to receive attendence.',
        type: 'error',
      });

      openModal({
        title: 'Bluetooth Disabled',
        message: 'Please enable Bluetooth in order to receive attendence.',
        type: 'error',
      });
    }
  };

  const handleBluetoothPoweredOn = () => {
    console.log(`${DEBUG_PREFIX} Bluetooth powered on.`);
    openToast({
      title: 'Bluetooth Enabled',
      description: 'Bluetooth has been turned on.',
      type: 'success',
    });
  };

  const handleBluetoothUnsupported = () => {
    console.error(`${DEBUG_PREFIX} Bluetooth unsupported on this device.`);
    openToast({
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
    openToast({
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
    console.error(`${DEBUG_PREFIX} Bluetooth state unknown or transitioning.`);
    openToast({
      title: 'Bluetooth State Unknown',
      description: 'Bluetooth state is unknown or transitioning.',
      type: 'error',
    });
    openModal({
      title: 'Bluetooth State Unknown',
      message: 'Bluetooth state is unknown or transitioning.',
      type: 'error',
    });
  };

  // Start Listening
  const startListening = async () => {
    if (bluetoothState !== 'poweredOn') {
      openToast({
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
      logMessage(`Started listening for UUID: ${APP_UUID}`);
      openToast({
        title: 'Started Listening',
        description: 'Now listening for beacons.',
        type: 'success',
      });
    } catch (error: any) {
      console.error(`${DEBUG_PREFIX} Error starting listening:`, error);
      logMessage(`StartListening Error: ${error.message}`);
      openToast({ title: 'Error', description: 'Failed to start listening.', type: 'error' });
    }
  };

  // Stop Listening
  const stopListening = async () => {
    try {
      await BLEHelper.stopListening();
      setIsListening(false);
      logMessage('Stopped listening.');
      openToast({
        title: 'Stopped Listening',
        description: 'Stopped listening for beacons.',
        type: 'info',
      });
    } catch (error: any) {
      console.error(`${DEBUG_PREFIX} Error stopping listening:`, error);
      logMessage(`StopListening Error: ${error.message}`);
      openToast({ title: 'Error', description: 'Failed to stop listening.', type: 'error' });
    }
  };

  // Start Broadcasting
  const startBroadcasting = async (uuid: string, major: number, minor: number, title: string) => {
    if (bluetoothState !== 'poweredOn') {
      openToast({
        title: 'Bluetooth Required',
        description: 'Please enable Bluetooth to start broadcasting.',
        type: 'error',
      });
      return;
    }

    try {
      await BLEHelper.startBroadcasting(uuid, major, minor);
      setIsBroadcasting(true);
      logMessage(`Started broadcasting UUID: ${uuid}, Major: ${major}, Minor: ${minor}`);
      openToast({
        title: 'Broadcasting Started',
        description: `Broadcasting for meeting "${title}" has started.`,
        type: 'success',
      });
    } catch (error: any) {
      console.error(`${DEBUG_PREFIX} Error starting broadcasting:`, error);
      logMessage(`StartBroadcasting Error: ${error.message}`);
      openToast({ title: 'Error', description: 'Failed to start broadcasting.', type: 'error' });
    }
  };

  // Stop Broadcasting
  const stopBroadcasting = async () => {
    try {
      await BLEHelper.stopBroadcasting();
      setIsBroadcasting(false);
      logMessage('Stopped broadcasting.');
      openToast({
        title: 'Stopped Broadcasting',
        description: 'Stopped broadcasting beacon.',
        type: 'info',
      });
    } catch (error: any) {
      console.error(`${DEBUG_PREFIX} Error stopping broadcasting:`, error);
      logMessage(`StopBroadcasting Error: ${error.message}`);
      openToast({ title: 'Error', description: 'Failed to stop broadcasting.', type: 'error' });
    }
  };

  // Function to get detected beacons
  const getDetectedBeacons = async () => {
    try {
      const beacons = await BLEHelper.getDetectedBeacons();
      setDetectedBeacons(beacons);
      logMessage('Retrieved detected beacons.');
    } catch (error: any) {
      console.error(`${DEBUG_PREFIX} Error getting detected beacons:`, error);
      logMessage(`GetDetectedBeacons Error: ${error.message}`);
      openToast({ title: 'Error', description: 'Failed to retrieve beacons.', type: 'error' });
    }
  };

  // Function to log messages (for debugging purposes)
  const logMessage = (message: string) => {
    // Implement your logging mechanism here, e.g., updating a state or sending to a logging service
    console.log(`${DEBUG_PREFIX} ${message}`);
  };

  const testEvent = async () => {
    await BLEHelper.testBeaconEvent();
  }

  // Context value to be provided to consumers
  const contextValue: BLEContextProps = {
    bluetoothState,
    detectedBeacons,
    isListening,
    isBroadcasting,
    startListening,
    stopListening,
    startBroadcasting,
    stopBroadcasting,
    getDetectedBeacons,
    testEvent,
    fetchInitialBluetoothState
  };

  return <BLEContext.Provider value={contextValue}>{children}</BLEContext.Provider>;
};
