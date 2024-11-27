import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  StyleSheet,
  ScrollView,
  Alert,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import BleBeaconBroadcaster from '@/./modules/BLEBeaconManager'; // Ensure the correct path
import { Subscription } from 'expo-modules-core';

interface Beacon {
  uid: string;
  major: number;
  minor: number;
  rssi: number;
  timestamp: number;
}

const BLETestScreen: React.FC = () => {
  // State variables for Bluetooth status and BLE support
  const [bluetoothEnabled, setBluetoothEnabled] = useState<boolean>(false);
  const [bleSupported, setBleSupported] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);

  // State variables for broadcasting
  const [broadcastUUID, setBroadcastUUID] = useState<string>('');
  const [broadcastMajor, setBroadcastMajor] = useState<string>(''); // Using string to handle input
  const [broadcastMinor, setBroadcastMinor] = useState<string>('');

  // State variables for RSSI
  const [peripheralID, setPeripheralID] = useState<string>('');
  const [rssiValue, setRssiValue] = useState<number | null>(null);

  // State variables for detected beacons
  const [detectedBeacons, setDetectedBeacons] = useState<Beacon[]>([]);
  const [beaconListenerSubscription, setBeaconListenerSubscription] = useState<
    Subscription | null
  >(null);

  // State variables for company ID
  const [companyID, setCompanyID] = useState<string>('0x1234'); // Default value

  // Effect to initialize Bluetooth and request permissions on component mount
  useEffect(() => {
    const initialize = async () => {
      await requestBLEPermissions();
      initializeBluetooth();
    };

    initialize();

    return () => {
      // Clean up the event listener on unmount
      if (beaconListenerSubscription) {
        BleBeaconBroadcaster.removeBeaconListener(beaconListenerSubscription);
      }
    };
  }, []);

  // Function to request BLE permissions
  const requestBLEPermissions = async () => {
    if (Platform.OS !== 'android') {
      return;
    }

    // Define the permissions required for different Android versions
    const permissions: string[] = [];

    if (Platform.Version >= 31) { // Android 12 and above
      permissions.push(
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT
      );
    } else { // Below Android 12
      permissions.push(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION
      );
    }

    try {
      const granted = await PermissionsAndroid.requestMultiple(permissions);

      let allGranted = true;
      for (const permission of permissions) {
        if (granted[permission] !== PermissionsAndroid.RESULTS.GRANTED) {
          allGranted = false;
          break;
        }
      }

      if (allGranted) {
        logMessage('All BLE permissions granted.');
      } else {
        Alert.alert(
          'Permissions Required',
          'Please grant all BLE permissions to use this feature.',
          [{ text: 'OK' }],
          { cancelable: false }
        );
        logMessage('BLE permissions denied.');
      }
    } catch (err) {
      console.warn('Permission Request Error: ', err);
      logMessage(`Permission Request Error: ${err}`);
    }
  };

  // Function to initialize Bluetooth
  const initializeBluetooth = async () => {
    try {
      await BleBeaconBroadcaster.enableBluetooth();
      logMessage('Bluetooth initialization called.');
      // Optionally, check if Bluetooth is enabled
      // Note: There's no direct method to check Bluetooth status via the module
      // You might need to implement such a method in the native module
      checkBluetoothStatus();
    } catch (error: any) {
      console.error('Initialization Error:', error);
      logMessage(`Initialization Error: ${error.message}`);
    }
  };

  // Function to check Bluetooth status
  const checkBluetoothStatus = async () => {
    // Since the native module doesn't provide a method to check Bluetooth status,
    // you can use the React Native Bluetooth library or implement a native method.
    // For simplicity, we'll assume Bluetooth is enabled after initialization.
    setBluetoothEnabled(true);
    logMessage('Bluetooth is enabled.');
  };

  // Function to set the company ID
  const handleSetCompanyId = () => {
    try {
      BleBeaconBroadcaster.setCompanyId(companyID);
      logMessage(`Company ID set to ${companyID}`);
    } catch (error: any) {
      console.error('SetCompanyId Error:', error);
      logMessage(`SetCompanyId Error: ${error.message}`);
    }
  };

  // Function to start broadcasting
  const handleStartBroadcasting = async () => {
    if (!broadcastUUID || !broadcastMajor || !broadcastMinor) {
      Alert.alert('Missing Fields', 'Please enter UUID, Major, and Minor values.');
      return;
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[4][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
    if (!uuidRegex.test(broadcastUUID)) {
      Alert.alert('Invalid UUID', 'Please enter a valid UUID.');
      return;
    }

    try {
      const major = parseInt(broadcastMajor, 10);
      const minor = parseInt(broadcastMinor, 10);

      if (isNaN(major) || isNaN(minor)) {
        Alert.alert('Invalid Major/Minor', 'Major and Minor must be numbers.');
        return;
      }

      const result = await BleBeaconBroadcaster.broadcast(broadcastUUID, major, minor);
      logMessage(result);
    } catch (error: any) {
      console.error('Broadcast Error:', error);
      logMessage(`Broadcast Error: ${error.message}`);
    }
  };

  // Function to stop broadcasting
  const handleStopBroadcasting = async () => {
    try {
      const stoppedUids = await BleBeaconBroadcaster.stopBroadcast();
      logMessage(`Stopped Broadcasting for UIDs: ${stoppedUids.join(', ')}`);
    } catch (error: any) {
      console.error('StopBroadcast Error:', error);
      logMessage(`StopBroadcast Error: ${error.message}`);
    }
  };

  // Function to check BLE support
  const handleCheckBleSupport = async () => {
    try {
      const status = await BleBeaconBroadcaster.checkIfBLESupported();
      setBleSupported(status);
      logMessage(`BLE Supported Status: ${status}`);
    } catch (error: any) {
      console.error('CheckIfBLESupported Error:', error);
      logMessage(`CheckIfBLESupported Error: ${error.message}`);
    }
  };

  // Function to read RSSI
  const handleReadRSSI = async () => {
    if (!peripheralID) {
      Alert.alert('Missing Peripheral ID', 'Please enter a Peripheral ID.');
      return;
    }

    try {
      const rssi = await BleBeaconBroadcaster.readRSSI(peripheralID);
      setRssiValue(rssi);
      logMessage(`RSSI for ${peripheralID}: ${rssi}`);
    } catch (error: any) {
      console.error('ReadRSSI Error:', error);
      logMessage(`ReadRSSI Error: ${error.message}`);
    }
  };

  // Function to start listening for beacons
  const handleStartListening = () => {
    if (!broadcastUUID) {
      Alert.alert('Missing UUID', 'Please enter a UUID to listen for.');
      return;
    }

    try {
      BleBeaconBroadcaster.startListening(broadcastUUID);
      logMessage(`Started listening for UUID: ${broadcastUUID}`);
      // Subscribe to BeaconDetected events
      const subscription = BleBeaconBroadcaster.addBeaconListener((beacon: Beacon) => {
        logMessage(`Beacon Detected: UID=${beacon.uid}, Major=${beacon.major}, Minor=${beacon.minor}, RSSI=${beacon.rssi}`);
        setDetectedBeacons((prevBeacons) => {
          // Check if the beacon already exists
          const index = prevBeacons.findIndex(
            (b) => b.uid === beacon.uid && b.major === beacon.major && b.minor === beacon.minor
          );
          if (index !== -1) {
            // Update existing beacon
            const updatedBeacons = [...prevBeacons];
            updatedBeacons[index] = beacon;
            return updatedBeacons;
          } else {
            // Add new beacon
            return [...prevBeacons, beacon];
          }
        });
      });
      setBeaconListenerSubscription(subscription);
    } catch (error: any) {
      console.error('StartListening Error:', error);
      logMessage(`StartListening Error: ${error.message}`);
    }
  };

  // Function to stop listening for beacons
  const handleStopListening = () => {
    try {
      BleBeaconBroadcaster.stopListening();
      logMessage('Stopped listening for beacons.');
      // Remove the event listener
      if (beaconListenerSubscription) {
        BleBeaconBroadcaster.removeBeaconListener(beaconListenerSubscription);
        setBeaconListenerSubscription(null);
      }
    } catch (error: any) {
      console.error('StopListening Error:', error);
      logMessage(`StopListening Error: ${error.message}`);
    }
  };

  // Function to get detected beacons
  const handleGetDetectedBeacons = async () => {
    try {
      const beacons = await BleBeaconBroadcaster.getDetectedBeacons();
      setDetectedBeacons(beacons);
      logMessage('Retrieved detected beacons.');
    } catch (error: any) {
      console.error('GetDetectedBeacons Error:', error);
      logMessage(`GetDetectedBeacons Error: ${error.message}`);
    }
  };

  // Function to enable Bluetooth adapter
  const handleEnableBluetooth = () => {
    try {
      BleBeaconBroadcaster.enableBluetooth();
      setBluetoothEnabled(true);
      logMessage('Bluetooth adapter enabled.');
    } catch (error: any) {
      console.error('EnableBluetooth Error:', error);
      logMessage(`EnableBluetooth Error: ${error.message}`);
    }
  };

  // Function to disable Bluetooth adapter
  const handleDisableBluetooth = () => {
    try {
      BleBeaconBroadcaster.disableBluetooth();
      setBluetoothEnabled(false);
      logMessage('Bluetooth adapter disabled.');
    } catch (error: any) {
      console.error('DisableBluetooth Error:', error);
      logMessage(`DisableBluetooth Error: ${error.message}`);
    }
  };

  // Function to log messages
  const logMessage = (message: string) => {
    setLogs((prevLogs) => [...prevLogs, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.header}>BLE Beacon Manager Test</Text>

      {/* Company ID Section */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Set Company ID</Text>
        <TextInput
          style={styles.input}
          placeholder="Company ID (e.g., 0x1234)"
          value={companyID}
          onChangeText={setCompanyID}
        />
        <Button title="Set Company ID" onPress={handleSetCompanyId} />
      </View>

      {/* Bluetooth Control Section */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Bluetooth Control</Text>
        <Text>Status: {bluetoothEnabled ? 'Enabled' : 'Disabled'}</Text>
        <Button title="Enable Bluetooth" onPress={handleEnableBluetooth} />
        <Button title="Disable Bluetooth" onPress={handleDisableBluetooth} />
      </View>

      {/* Broadcast Section */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Broadcast BLE Beacon</Text>
        <TextInput
          style={styles.input}
          placeholder="UUID (e.g., 123e4567-e89b-12d3-a456-426614174000)"
          value={broadcastUUID}
          onChangeText={setBroadcastUUID}
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Major (e.g., 100)"
          value={broadcastMajor}
          onChangeText={setBroadcastMajor}
          keyboardType="numeric"
        />
        <TextInput
          style={styles.input}
          placeholder="Minor (e.g., 200)"
          value={broadcastMinor}
          onChangeText={setBroadcastMinor}
          keyboardType="numeric"
        />
        <Button title="Start Broadcasting" onPress={handleStartBroadcasting} />
        <Button title="Stop Broadcasting" onPress={handleStopBroadcasting} />
      </View>

      {/* BLE Support Section */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Check BLE Support</Text>
        <Button title="Check BLE Support" onPress={handleCheckBleSupport} />
        <Text>BLE Supported Status: {bleSupported}</Text>
      </View>

      {/* RSSI Section */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Read RSSI</Text>
        <TextInput
          style={styles.input}
          placeholder="Peripheral ID"
          value={peripheralID}
          onChangeText={setPeripheralID}
        />
        <Button title="Read RSSI" onPress={handleReadRSSI} />
        {rssiValue !== null && <Text>RSSI: {rssiValue}</Text>}
      </View>

      {/* Listening Section */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Listen for Beacons</Text>
        <Button title="Start Listening" onPress={handleStartListening} />
        <Button title="Stop Listening" onPress={handleStopListening} />
      </View>

      {/* Detected Beacons Section */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Detected Beacons</Text>
        <Button title="Refresh Detected Beacons" onPress={handleGetDetectedBeacons} />
        {detectedBeacons.length === 0 ? (
          <Text>No beacons detected.</Text>
        ) : (
          <FlatList
            data={detectedBeacons}
            keyExtractor={(item, index) => `${item.uid}-${item.major}-${item.minor}-${index}`}
            renderItem={({ item }) => (
              <View style={styles.beaconItem}>
                <Text style={styles.beaconText}>UID: {item.uid}</Text>
                <Text style={styles.beaconText}>Major: {item.major}</Text>
                <Text style={styles.beaconText}>Minor: {item.minor}</Text>
                <Text style={styles.beaconText}>RSSI: {item.rssi}</Text>
                <Text style={styles.beaconText}>
                  Timestamp: {new Date(item.timestamp).toLocaleString()}
                </Text>
              </View>
            )}
          />
        )}
      </View>

      {/* Logs Section */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Logs</Text>
        {logs.length === 0 ? (
          <Text>No logs yet.</Text>
        ) : (
          <FlatList
            data={logs}
            keyExtractor={(item, index) => `log-${index}`}
            renderItem={({ item }) => (
              <Text style={styles.logText}>{item}</Text>
            )}
          />
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
  },
  contentContainer: {
    paddingVertical: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
  },
  section: {
    marginBottom: 30,
    padding: 15,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#888',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
  },
  beaconItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  beaconText: {
    fontSize: 14,
  },
  logText: {
    fontSize: 12,
    color: '#555',
  },
});

export default BLETestScreen;
