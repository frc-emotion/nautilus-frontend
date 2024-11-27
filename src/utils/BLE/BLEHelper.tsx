import { BeaconBroadcasterType } from '@/src/Constants';
import { NativeModules, NativeEventEmitter, Platform, EmitterSubscription } from 'react-native';

const BeaconBroadcaster = NativeModules.BeaconBroadcaster;

const beaconBroadcasterEmitter = new NativeEventEmitter(BeaconBroadcaster);

const BeaconBroadcasterModule: BeaconBroadcasterType = {
  startBroadcasting: async (uuid, major, minor) => {
    if (Platform.OS !== 'ios') {
      throw new Error('Beacon broadcasting is only supported on iOS.');
    }
    return BeaconBroadcaster.startBroadcasting(uuid, major, minor);
  },
  stopBroadcasting: async () => {
    if (Platform.OS !== 'ios') {
      throw new Error('Beacon broadcasting is only supported on iOS.');
    }
    return BeaconBroadcaster.stopBroadcasting();
  },
  startListening: async (uuid) => {
    if (Platform.OS !== 'ios') {
      throw new Error('Beacon listening is only supported on iOS.');
    }
    return BeaconBroadcaster.startListening(uuid);
  },
  stopListening: async () => {
    if (Platform.OS !== 'ios') {
      throw new Error('Beacon listening is only supported on iOS.');
    }
    return BeaconBroadcaster.stopListening();
  },
  getDetectedBeacons: async () => {
    if (Platform.OS !== 'ios') {
      throw new Error('Beacon detection is only supported on iOS.');
    }
    return BeaconBroadcaster.getDetectedBeacons();
  },
  
  // Event subscription methods
  addBluetoothStateListener: (callback) => {
    return beaconBroadcasterEmitter.addListener('BluetoothStateChanged', callback);
  },
  removeBluetoothStateListener: (subscription) => {
    subscription.remove();
  },
  
  addBeaconDetectedListener: (callback) => {
    return beaconBroadcasterEmitter.addListener('BeaconDetected', callback);
  },
  removeBeaconDetectedListener: (subscription) => {
    subscription.remove();
  },
  
};

export default BeaconBroadcasterModule;