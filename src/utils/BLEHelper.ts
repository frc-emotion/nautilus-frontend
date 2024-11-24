import { NativeModules, Platform } from 'react-native';
import { BeaconBroadcasterType } from '../Constants';

const { BeaconBroadcaster } = NativeModules;

console.log(BeaconBroadcaster);

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
};

export default BeaconBroadcasterModule;