import { NativeModules, Platform, PermissionsAndroid, Alert, Permission } from 'react-native';
import { BLEHelperType, Beacon } from '@/src/Constants';
import { requireNativeModule } from 'expo-modules-core';
import { EventEmitter, Subscription } from "expo-modules-core";

const BLEBeaconManager = (Platform.OS !== 'android') ? null : requireNativeModule('BLEBeaconManager');

// Initialize the event emitter based on the platform
const emitter = new EventEmitter(
  Platform.OS === 'ios' ? NativeModules.BeaconBroadcaster : BLEBeaconManager
);

// Function to check and request permissions
const checkAndRequestPermissions = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return true; // iOS permissions handled differently
  }

  try {
    
    const permissions: Permission[] = [];
    
    if (Platform.Version >= 31) { // Android 12 and above
      permissions.push(
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE
      );
      permissions.push(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
      permissions.push(PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION);
    } else { // Below Android 12
      permissions.push(
        PermissionsAndroid.PERMISSIONS.BLUETOOTH,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADMIN,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      permissions.push(PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION);
    }
    
    const granted: { [key: string]: string } = await PermissionsAndroid.requestMultiple(permissions);
    
    let allGranted = true;
    for (const permission of permissions) {
      if (granted[permission] !== PermissionsAndroid.RESULTS.GRANTED) {
        allGranted = false;
        break;
      }
    }

    if (!allGranted) {
      Alert.alert(
        'Permissions Required',
        'Please grant all Bluetooth permissions to use this feature.',
        [{ text: 'OK' }],
        { cancelable: false }
      );
    }

    return allGranted;
  } catch (err) {
    console.warn('Permission Request Error: ', err);
    return false;
  }
};


const BLEHelper: BLEHelperType = {
  // Unified startBroadcasting
  startBroadcasting: async (uuid: string, major: number, minor: number): Promise<void> => {
    if (Platform.OS === 'ios') {
      if (!NativeModules.BeaconBroadcaster || !NativeModules.BeaconBroadcaster.startBroadcasting) {
        throw new Error('BeaconBroadcaster native module is not available for startBroadcasting');
      }
      return NativeModules.BeaconBroadcaster.startBroadcasting(uuid, major, minor);
    } else if (Platform.OS === 'android') {

      if (!BLEBeaconManager || !BLEBeaconManager.broadcast) {
        throw new Error('BLEBeaconManager native module is not available for startBroadcasting');
      }

      const hasPermissions = await checkAndRequestPermissions();
      if (!hasPermissions) {
        throw new Error('Bluetooth permissions not granted.');
      }

      BLEBeaconManager.broadcast(uuid, major, minor);
    } else {
      throw new Error('Unsupported platform');
    }
  },

  // Unified stopBroadcasting
  stopBroadcasting: async (): Promise<void> => {
    if (Platform.OS === 'ios') {
      if (!NativeModules.BeaconBroadcaster || !NativeModules.BeaconBroadcaster.stopBroadcasting) {
        throw new Error('BeaconBroadcaster native module is not available for stopBroadcasting');
      }
      return NativeModules.BeaconBroadcaster.stopBroadcasting();
    } else if (Platform.OS === 'android') {
      const BLEBeaconManager = requireNativeModule('BLEBeaconManager');

      if (!BLEBeaconManager || !BLEBeaconManager.stopBroadcast) {
        throw new Error('BLEBeaconManager native module is not available for stopBroadcasting');
      }

      const hasPermissions = await checkAndRequestPermissions();
      if (!hasPermissions) {
        throw new Error('Bluetooth permissions not granted.');
      }

      BLEBeaconManager.stopBroadcast();
    } else {
      throw new Error('Unsupported platform');
    }
  },

  // Unified startListening
  startListening: async (uuid: string): Promise<void> => {
    if (Platform.OS === 'ios') {
      // Existing iOS implementation
      if (!NativeModules.BeaconBroadcaster || !NativeModules.BeaconBroadcaster.startListening) {
        throw new Error('BeaconBroadcaster native module is not available for startListening');
      }
      return NativeModules.BeaconBroadcaster.startListening(uuid);
    } else if (Platform.OS === 'android') {
      const BLEBeaconManager = requireNativeModule('BLEBeaconManager');

      if (!BLEBeaconManager || !BLEBeaconManager.startListening) {
        throw new Error('BLEBeaconManager native module is not available for startListening');
      }

      const hasPermissions = await checkAndRequestPermissions();
      if (!hasPermissions) {
        throw new Error('Bluetooth permissions not granted.');
      }

      // Await the startListening result and handle exceptions
      await BLEBeaconManager.startListening(uuid);
    } else {
      throw new Error('Unsupported platform');
    }
  },

  // Unified stopListening
  stopListening: async (): Promise<void> => {
    if (Platform.OS === 'ios') {
      if (!NativeModules.BeaconBroadcaster || !NativeModules.BeaconBroadcaster.stopListening) {
        throw new Error('BeaconBroadcaster native module is not available for stopListening');
      }
      return NativeModules.BeaconBroadcaster.stopListening();
    } else if (Platform.OS === 'android') {
      const BLEBeaconManager = requireNativeModule('BLEBeaconManager');

      if (!BLEBeaconManager || !BLEBeaconManager.stopListening) {
        throw new Error('BLEBeaconManager native module is not available for stopListening');
      }

      const hasPermissions = await checkAndRequestPermissions();
      if (!hasPermissions) {
        throw new Error('Bluetooth permissions not granted.');
      }

      BLEBeaconManager.stopListening();
    } else {
      throw new Error('Unsupported platform');
    }
  },

  // Unified getDetectedBeacons
  getDetectedBeacons: async (): Promise<Beacon[]> => {
    if (Platform.OS === 'ios') {
      if (!NativeModules.BeaconBroadcaster || !NativeModules.BeaconBroadcaster.getDetectedBeacons) {
        throw new Error('BeaconBroadcaster native module is not available for getDetectedBeacons');
      }
      return NativeModules.BeaconBroadcaster.getDetectedBeacons();
    } else if (Platform.OS === 'android') {
      const BLEBeaconManager = requireNativeModule('BLEBeaconManager');

      if (!BLEBeaconManager || !BLEBeaconManager.getDetectedBeacons) {
        throw new Error('BLEBeaconManager native module is not available for getDetectedBeacons');
      }

      const hasPermissions = await checkAndRequestPermissions();
      if (!hasPermissions) {
        throw new Error('Bluetooth permissions not granted.');
      }

      return BLEBeaconManager.getDetectedBeacons();
    } else {
      throw new Error('Unsupported platform');
    }
  },

  // Unified addBluetoothStateListener
  addBluetoothStateListener: (callback: (event: { state: string }) => void): Subscription => {
    return emitter.addListener('BluetoothStateChanged', callback);
  },

  // Unified removeBluetoothStateListener
  removeBluetoothStateListener: (subscription: Subscription): void => {
    subscription.remove();
  },

  // Unified addBeaconDetectedListener
  addBeaconDetectedListener: (listener: (event: Beacon) => void): Subscription => {
    return emitter.addListener<Beacon>('BeaconDetected', listener);
  },

  // Unified removeBeaconDetectedListener
  removeBeaconDetectedListener: (subscription: Subscription): void => {
    subscription.remove();
  },

  // Unified enableBluetooth
  // enableBluetooth: async (): Promise<string> => {
  //   if (Platform.OS === 'ios') {
  //     if (!NativeModules.BeaconBroadcaster || !NativeModules.BeaconBroadcaster.enableBluetooth) {
  //       throw new Error('BeaconBroadcaster native module is not available');
  //     }
  //     return NativeModules.BeaconBroadcaster.enableBluetooth();
  //   } else if (Platform.OS === 'android') {
  //     const BLEBeaconManager = requireNativeModule('BLEBeaconManager');

  //     if (!BLEBeaconManager || !BLEBeaconManager.enableBluetooth) {
  //       throw new Error('BLEBeaconManager native module is not available');
  //     }

  //     const hasPermissions = await checkAndRequestPermissions();
  //     if (!hasPermissions) {
  //       throw new Error('Bluetooth permissions not granted.');
  //     }

  //     return BLEBeaconManager.enableBluetooth();
  //   } else {
  //     throw new Error('Unsupported platform');
  //   }
  // },

  // Unified disableBluetooth
  // disableBluetooth: async (): Promise<string> => {
  //   if (Platform.OS === 'ios') {
  //     if (!NativeModules.BeaconBroadcaster || !NativeModules.BeaconBroadcaster.disableBluetooth) {
  //       throw new Error('BeaconBroadcaster native module is not available');
  //     }
  //     return NativeModules.BeaconBroadcaster.disableBluetooth();
  //   } else if (Platform.OS === 'android') {
  //     const BLEBeaconManager = requireNativeModule('BLEBeaconManager');

  //     if (!BLEBeaconManager || !BLEBeaconManager.disableBluetooth) {
  //       throw new Error('BLEBeaconManager native module is not available');
  //     }

  //     const hasPermissions = await checkAndRequestPermissions();
  //     if (!hasPermissions) {
  //       throw new Error('Bluetooth permissions not granted.');
  //     }

  //     return BLEBeaconManager.disableBluetooth();
  //   } else {
  //     throw new Error('Unsupported platform');
  //   }
  // },

  // Unified getBluetoothState
  getBluetoothState: async (): Promise<string> => {
    if (Platform.OS === 'ios') {
      if (!NativeModules.BeaconBroadcaster || !NativeModules.BeaconBroadcaster.getBluetoothState) {
        console.log(NativeModules.BeaconBroadcaster)
        throw new Error('BeaconBroadcaster native module is not available for getBluetoothState');
      }
      
      return NativeModules.BeaconBroadcaster.getBluetoothState();
    } else if (Platform.OS === 'android') {
      const BLEBeaconManager = requireNativeModule('BLEBeaconManager');

      if (!BLEBeaconManager || !BLEBeaconManager.getBluetoothState) {
        throw new Error('BLEBeaconManager native module is not available for getBluetoothState');
      }

      const hasPermissions = await checkAndRequestPermissions();
      if (!hasPermissions) {
        throw new Error('Bluetooth permissions not granted.');
      }

      return BLEBeaconManager.getBluetoothState();
    } else {
      throw new Error('Unsupported platform');
    }
  },

  testBeaconEvent: async (): Promise<void> => {
    requireNativeModule('BLEBeaconManager').testBeaconEvent();
  }
  
};

export default BLEHelper;
