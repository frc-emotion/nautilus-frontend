import { NativeModules, Platform, PermissionsAndroid, Alert, Permission } from 'react-native';
import { BLEHelperType, Beacon } from '@/src/Constants';
import { requireNativeModule } from 'expo-modules-core';
import { EventEmitter, Subscription } from "expo-modules-core";
import * as Sentry from '@sentry/react-native';

const BLEBeaconManager = (Platform.OS !== 'android') ? null : requireNativeModule('BLEBeaconManager');
const emitter = new EventEmitter(
  Platform.OS === 'ios' ? NativeModules.BeaconBroadcaster : BLEBeaconManager
);

export const checkAndRequestPermissions = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return true;
  }

  try {
    const permissionsToRequest: Permission[] = [];
    
    if (Platform.Version >= 31) {
      // Android 12+ (API 31 and above)
      if (PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT) {
        permissionsToRequest.push(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT);
      }
      if (PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE) {
        permissionsToRequest.push(PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE);
      }
      if (PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN) {
        permissionsToRequest.push(PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN);
      }
      if (PermissionsAndroid.PERMISSIONS.FOREGROUND_SERVICE_LOCATION) {
        permissionsToRequest.push(PermissionsAndroid.PERMISSIONS.FOREGROUND_SERVICE_LOCATION);
      }
    } else {
      // Android 11 and below (API < 31)
      if (PermissionsAndroid.PERMISSIONS.BLUETOOTH) {
        permissionsToRequest.push(PermissionsAndroid.PERMISSIONS.BLUETOOTH);
      }
      if (PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADMIN) {
        permissionsToRequest.push(PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADMIN);
      }
    }

    // Location permissions (needed for BLE scanning on older versions)
    if (PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION) {
      permissionsToRequest.push(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
    }
    if (PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION) {
      permissionsToRequest.push(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION);
    }

    // ACCESS_BACKGROUND_LOCATION is needed only for API 29+
    // Foreground service permission (added in API 29+)
    if (Platform.Version >= 29) {
      if (PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION) {
        permissionsToRequest.push(PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION);
      }

      if (PermissionsAndroid.PERMISSIONS.FOREGROUND_SERVICE) {
        permissionsToRequest.push(PermissionsAndroid.PERMISSIONS.FOREGROUND_SERVICE);
      }
    }

    // If no permissions to request, return true
    if (permissionsToRequest.length === 0) {
      return true;
    }

    let granted: { [key: string]: string } = {};
    let allGranted = true;

    for (const permission of permissionsToRequest) {
      const status = await PermissionsAndroid.request(permission);
      granted[permission] = status;
    }

    for (const permission of permissionsToRequest) {
      if (granted[permission] !== PermissionsAndroid.RESULTS.GRANTED) {
        allGranted = false;
        break;
      }
    }

    if (!allGranted) {
      Alert.alert(
        'Permissions Required',
        'Please grant all required permissions to use this feature.',
        [{ text: 'OK' }],
        { cancelable: false }
      );
    }

    return allGranted;
  } catch (err) {
    Sentry.captureException(err);
    console.warn('Permission Request Error: ', err);
    return false;
  }
};
const BLEHelper: BLEHelperType = {
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
  stopBroadcasting: async (): Promise<void> => {
    if (Platform.OS === 'ios') {
      if (!NativeModules.BeaconBroadcaster || !NativeModules.BeaconBroadcaster.stopBroadcasting) {
        throw new Error('BeaconBroadcaster native module is not available for stopBroadcasting');
      }
      return NativeModules.BeaconBroadcaster.stopBroadcasting();
    } else if (Platform.OS === 'android') {
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
  startListening: async (uuid: string, mode: number = 1): Promise<void> => {
    if (Platform.OS === 'ios') {
      if (!NativeModules.BeaconBroadcaster || !NativeModules.BeaconBroadcaster.startListening) {
        throw new Error('BeaconBroadcaster native module is not available for startListening');
      }
      return NativeModules.BeaconBroadcaster.startListening(uuid);
    } else if (Platform.OS === 'android') {
      if (!BLEBeaconManager || !BLEBeaconManager.startListening) {
        throw new Error('BLEBeaconManager native module is not available for startListening');
      }

      const hasPermissions = await checkAndRequestPermissions();
      
      if (!hasPermissions) {
        throw new Error('Bluetooth permissions not granted.');
      }

      await BLEBeaconManager.startListening(uuid, mode);
    } else {
      throw new Error('Unsupported platform');
    }
  },
  stopListening: async (): Promise<void> => {
    if (Platform.OS === 'ios') {
      if (!NativeModules.BeaconBroadcaster || !NativeModules.BeaconBroadcaster.stopListening) {
        throw new Error('BeaconBroadcaster native module is not available for stopListening');
      }
      return NativeModules.BeaconBroadcaster.stopListening();
    } else if (Platform.OS === 'android') {
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
  getDetectedBeacons: async (): Promise<Beacon[]> => {
    if (Platform.OS === 'ios') {
      if (!NativeModules.BeaconBroadcaster || !NativeModules.BeaconBroadcaster.getDetectedBeacons) {
        throw new Error('BeaconBroadcaster native module is not available for getDetectedBeacons');
      }
      return NativeModules.BeaconBroadcaster.getDetectedBeacons();
    } else if (Platform.OS === 'android') {
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
  addBluetoothStateListener: (callback: (event: { state: string }) => void): Subscription => {
    return emitter.addListener('BluetoothStateChanged', callback);
  },
  removeBluetoothStateListener: (subscription: Subscription): void => {
    subscription.remove();
  },
  addBeaconDetectedListener: (listener: (event: Beacon) => void): Subscription => {
    return emitter.addListener<Beacon>('BeaconDetected', listener);
  },
  removeBeaconDetectedListener: (subscription: Subscription): void => {
    subscription.remove();
  },
  getBluetoothState: async (): Promise<string> => {
    if (Platform.OS === 'ios') {
      if (!NativeModules.BeaconBroadcaster || !NativeModules.BeaconBroadcaster.getBluetoothState) {
        throw new Error('BeaconBroadcaster native module is not available for getBluetoothState');
      }
      return NativeModules.BeaconBroadcaster.getBluetoothState();
    } else if (Platform.OS === 'android') {
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