import { EventEmitter, Subscription } from 'expo-modules-core';

// Import the native module. On web, it will be resolved to BleBeaconBroadcaster.web.ts
// and on native platforms to BleBeaconBroadcaster.ts
import BLEBeaconManagerModule from './src/BLEBeaconManager';

// Define the Beacon interface to match the native module's Beacon data structure
export interface Beacon {
  uid: string;
  major: number;
  minor: number;
  rssi: number;
  timestamp: number;
}

// Initialize the EventEmitter with the native module
const emitter = new EventEmitter(BLEBeaconManagerModule);

const BleBeaconBroadcaster = {
  /**
   * Starts broadcasting a BLE beacon with the specified UUID, major, and minor values.
   * @param uuid - The UUID of the beacon.
   * @param myMajor - The major value of the beacon.
   * @param myMinor - The minor value of the beacon.
   * @returns A promise that resolves to a confirmation message.
   */
  broadcast: async (uuid: string, myMajor: number, myMinor: number): Promise<string> => {
    try {
      const result = await BLEBeaconManagerModule.broadcast(uuid, myMajor, myMinor);
      return result; // "Advertising started successfully."
    } catch (error: any) {
      console.error('Broadcast Error:', error);
      throw new Error(error.message || 'Broadcast failed.');
    }
  },

  /**
   * Stops all ongoing BLE beacon broadcasts.
   * @returns A promise that resolves to an array of UIDs that were stopped.
   */
  stopBroadcast: async (): Promise<string[]> => {
    try {
      const stoppedUids = await BLEBeaconManagerModule.stopBroadcast();
      return stoppedUids; // Array of stopped UIDs
    } catch (error: any) {
      console.error('StopBroadcast Error:', error);
      throw new Error(error.message || 'Stopping broadcast failed.');
    }
  },

  /**
   * Checks if BLE advertising is supported on the device.
   * @returns A promise that resolves to "80" if supported, "100" otherwise.
   */
  checkIfBLESupported: async (): Promise<string> => {
    try {
      const status = await BLEBeaconManagerModule.checkIfBLESupported();
      return status;
    } catch (error: any) {
      console.error('CheckIfBLESupported Error:', error);
      throw new Error(error.message || 'BLE support check failed.');
    }
  },

  /**
   * Reads the RSSI value for a connected peripheral device.
   * @param peripheralID - The peripheral device ID.
   * @returns A promise that resolves to the RSSI value.
   */
  readRSSI: async (peripheralID: string): Promise<number> => {
    try {
      const rssi = await BLEBeaconManagerModule.readRSSI(peripheralID);
      return rssi;
    } catch (error: any) {
      console.error('ReadRSSI Error:', error);
      throw new Error(error.message || 'Read RSSI failed.');
    }
  },

  /**
   * Sets the company ID for BLE advertising.
   * Accepts both hexadecimal strings (e.g., "0x1234") and decimal numbers.
   * @param companyID - The company ID as a string or number.
   */
  setCompanyId: (companyID: string | number): void => {
    try {
      let parsedCompanyID: number;
      if (typeof companyID === 'string') {
        if (companyID.startsWith('0x') || companyID.startsWith('0X')) {
          parsedCompanyID = parseInt(companyID, 16);
        } else {
          parsedCompanyID = parseInt(companyID, 10);
        }
      } else {
        parsedCompanyID = companyID;
      }

      if (isNaN(parsedCompanyID)) {
        throw new Error('Invalid company ID format.');
      }

      BLEBeaconManagerModule.setCompanyId(parsedCompanyID);
      console.log(`Company ID set to ${parsedCompanyID}`);
    } catch (error: any) {
      console.error('SetCompanyId Error:', error);
      throw new Error(error.message || 'Set Company ID failed.');
    }
  },

  /**
   * Starts listening for BLE beacons with the specified UUID.
   * @param uuid - The UUID to listen for.
   */
  startListening: (uuid: string): void => {
    try {
      BLEBeaconManagerModule.startListening(uuid);
      console.log(`Started listening for UUID: ${uuid}`);
    } catch (error: any) {
      console.error('StartListening Error:', error);
      throw new Error(error.message || 'Start listening failed.');
    }
  },

  /**
   * Stops listening for BLE beacons.
   */
  stopListening: (): void => {
    try {
      BLEBeaconManagerModule.stopListening();
      console.log('Stopped listening for beacons.');
    } catch (error: any) {
      console.error('StopListening Error:', error);
      throw new Error(error.message || 'Stop listening failed.');
    }
  },

  /**
   * Retrieves the list of detected beacons.
   * @returns A promise that resolves to an array of Beacon objects.
   */
  getDetectedBeacons: async (): Promise<Beacon[]> => {
    try {
      const beacons = await BLEBeaconManagerModule.getDetectedBeacons();
      return beacons;
    } catch (error: any) {
      console.error('GetDetectedBeacons Error:', error);
      throw new Error(error.message || 'Get detected beacons failed.');
    }
  },

  /**
   * Enables the Bluetooth adapter.
   */
  enableBluetooth: (): void => {
    try {
      BLEBeaconManagerModule.enableBluetooth();
      console.log('Bluetooth adapter enabled.');
    } catch (error: any) {
      console.error('EnableBluetooth Error:', error);
      throw new Error(error.message || 'Enable Bluetooth failed.');
    }
  },

  /**
   * Disables the Bluetooth adapter.
   */
  disableBluetooth: (): void => {
    try {
      BLEBeaconManagerModule.disableBluetooth();
      console.log('Bluetooth adapter disabled.');
    } catch (error: any) {
      console.error('DisableBluetooth Error:', error);
      throw new Error(error.message || 'Disable Bluetooth failed.');
    }
  },

  /**
   * Adds a listener for beacon detection events.
   * @param listener - A callback function that receives a Beacon object.
   * @returns A Subscription object that can be used to remove the listener.
   */
  addBeaconListener: (listener: (beacon: Beacon) => void): Subscription => {
    return emitter.addListener("BeaconDetected", listener);
  },

  /**
   * Removes a previously added beacon listener.
   * @param subscription - The Subscription object returned by addBeaconListener.
   */
  removeBeaconListener: (subscription: Subscription): void => {
    subscription.remove();
  },
};

export default BleBeaconBroadcaster;
