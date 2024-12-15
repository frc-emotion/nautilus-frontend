import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useGlobalToast } from '@/src/utils/UI/CustomToastProvider';
import { useGlobalModal } from '@/src/utils/UI/CustomModalProvider';
import { APP_UUID } from '@/src/Constants';
import { useBLE } from '../utils/BLE/BLEContext';

const BLETestScreen: React.FC = () => {
  const {
    bluetoothState,
    detectedBeacons,
    isListening,
    isBroadcasting,
    startListening,
    stopListening,
    startBroadcasting,
    stopBroadcasting,
    getDetectedBeacons,
    testEvent
  } = useBLE();

  const [logs, setLogs] = useState<string[]>([]);

  const [broadcastUUID, setBroadcastUUID] = useState<string>(APP_UUID);
  const [broadcastMajor, setBroadcastMajor] = useState<string>('100'); // Default values
  const [broadcastMinor, setBroadcastMinor] = useState<string>('200');

  const { openToast } = useGlobalToast();
  const { openModal } = useGlobalModal();

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

      const result = await startBroadcasting(broadcastUUID, major, minor);
      logMessage(`Broadcasting started: ${result}`);
      openToast({ title: 'Success', description: 'Broadcasting started.', type: 'success' });
    } catch (error: any) {
      console.error('Broadcast Error:', error);
      logMessage(`Broadcast Error: ${error.message}`);
      openToast({ title: 'Error', description: 'Failed to start broadcasting.', type: 'error' });
    }
  };

  // Function to stop broadcasting
  const handleStopBroadcasting = async () => {
    try {
      const result = await stopBroadcasting();
      logMessage(`Broadcasting stopped: ${result}`);
      openToast({ title: 'Info', description: 'Broadcasting stopped.', type: 'info' });
    } catch (error: any) {
      console.error('StopBroadcast Error:', error);
      logMessage(`StopBroadcast Error: ${error.message}`);
      openToast({ title: 'Error', description: 'Failed to stop broadcasting.', type: 'error' });
    }
  };

  // Function to start listening for beacons
  const handleStartListening = async () => {
    if (!broadcastUUID) {
      Alert.alert('Missing UUID', 'Please enter a UUID to listen for.');
      return;
    }

    try {
      await startListening();
      logMessage(`Started listening for UUID: ${broadcastUUID}`);
      openToast({ title: 'Started Listening', description: 'Now listening for beacons.', type: 'success' });
    } catch (error: any) {
      console.error('StartListening Error:', error);
      logMessage(`StartListening Error: ${error.message}`);
      openToast({ title: 'Error', description: 'Failed to start listening.', type: 'error' });
    }
  };

  // Function to stop listening for beacons
  const handleStopListening = async () => {
    try {
      const result = await stopListening();
      logMessage(`Stopped listening: ${result}`);
      openToast({ title: 'Info', description: 'Stopped listening for beacons.', type: 'info' });
    } catch (error: any) {
      console.error('StopListening Error:', error);
      logMessage(`StopListening Error: ${error.message}`);
      openToast({ title: 'Error', description: 'Failed to stop listening.', type: 'error' });
    }
  };

  // Function to get detected beacons
  const handleGetDetectedBeacons = async () => {
    try {
      const beacons = await getDetectedBeacons();
      logMessage('Retrieved detected beacons.');
      openToast({ title: 'Info', description: 'Retrieved detected beacons.', type: 'info' });
    } catch (error: any) {
      console.error('GetDetectedBeacons Error:', error);
      logMessage(`GetDetectedBeacons Error: ${error.message}`);
      openToast({ title: 'Error', description: 'Failed to retrieve beacons.', type: 'error' });
    }
  };

  // Function to log messages (for debugging purposes)
  const logMessage = (message: string) => {
    setLogs((prevLogs) => [...prevLogs, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const doTestEvent = async () => {
      await testEvent();
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.header}>BLE Beacon Manager Test</Text>

      <View style={styles.section}>
        <Button
          title="Test Event"
          onPress={doTestEvent}
        />
      </View>

      {/* Bluetooth Control Section */}
      {/* <View style={styles.section}>
        <Text style={styles.sectionHeader}>Bluetooth Control</Text>
        <Text>Status: {bluetoothState}</Text>
        <Button title="Enable Bluetooth" onPress={BLEHelper.enableBluetooth} />
        <Button title="Disable Bluetooth" onPress={BLEHelper.disableBluetooth} />
      </View> */}

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
        <Button
          title="Start Broadcasting"
          onPress={handleStartBroadcasting}
          disabled={isBroadcasting}
        />
        <Button
          title="Stop Broadcasting"
          onPress={handleStopBroadcasting}
          disabled={!isBroadcasting}
        />
      </View>

      {/* Listening Section */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Listen for Beacons</Text>
        <Button
          title="Start Listening"
          onPress={handleStartListening}
          disabled={isListening}
        />
        <Button
          title="Stop Listening"
          onPress={handleStopListening}
          disabled={!isListening}
        />
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
            keyExtractor={(item, index) => `${item.uuid}-${item.major}-${item.minor}-${index}`}
            renderItem={({ item }) => (
              <View style={styles.beaconItem}>
                <Text style={styles.beaconText}>UID: {item.uuid}</Text>
                <Text style={styles.beaconText}>Major: {item.major}</Text>
                <Text style={styles.beaconText}>Minor: {item.minor}</Text>
                {/* <Text style={styles.beaconText}>RSSI: {item.rssi}</Text> */}
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
