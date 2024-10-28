import { NativeModules, Platform } from 'react-native';

type BeaconBroadcasterType = {
  startBroadcasting: (uuid: string, major: number, minor: number) => Promise<string>;
  stopBroadcasting: () => Promise<string>;
};

const { BeaconBroadcaster } = NativeModules;

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
};

export default BeaconBroadcasterModule;