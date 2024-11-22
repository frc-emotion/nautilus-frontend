import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, FlatList, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface StorageItem {
  key: string;
  value: any; // Supports objects, arrays, etc.
  isString: boolean; // Indicates whether the value was originally a string
}

const DebugAsyncStorageScreen: React.FC = () => {
  const [storageData, setStorageData] = useState<StorageItem[]>([]);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Load AsyncStorage data
  const loadStorageData = async () => {
    setIsLoading(true);
    try {
      const keys = await AsyncStorage.getAllKeys();
      const entries = await AsyncStorage.multiGet(keys);

      const formattedData = entries.map(([key, value]) => {
        let parsedValue: any = value;
        let isString = true;

        // Attempt to parse the value as JSON
        try {
          parsedValue = JSON.parse(value ?? '');
          isString = false;
        } catch {
          parsedValue = value; // If parsing fails, keep it as a string
        }

        return {
          key,
          value: parsedValue,
          isString,
        };
      });

      setStorageData(formattedData);
    } catch (error) {
      Alert.alert('Error', 'Failed to load storage data.');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Add a new key-value pair
  const addItem = async () => {
    if (!newKey || !newValue) {
      Alert.alert('Validation Error', 'Both key and value are required.');
      return;
    }
    try {
      const valueToStore =
        typeof newValue === 'string' ? newValue : JSON.stringify(newValue);
      await AsyncStorage.setItem(newKey, valueToStore);
      setNewKey('');
      setNewValue('');
      await loadStorageData();
    } catch (error) {
      Alert.alert('Error', 'Failed to add item.');
      console.error(error);
    }
  };

  // Update an existing key-value pair
  const updateItem = async (key: string, newValue: any, isString: boolean) => {
    try {
      const valueToStore = isString ? newValue : JSON.stringify(newValue);
      await AsyncStorage.setItem(key, valueToStore);
      await loadStorageData();
    } catch (error) {
      Alert.alert('Error', `Failed to update item for key: ${key}`);
      console.error(error);
    }
  };

  // Delete a specific key
  const deleteItem = async (key: string) => {
    try {
      await AsyncStorage.removeItem(key);
      await loadStorageData();
    } catch (error) {
      Alert.alert('Error', `Failed to delete item for key: ${key}`);
      console.error(error);
    }
  };

  // Clear all AsyncStorage data
  const clearAll = async () => {
    Alert.alert('Confirm', 'Are you sure you want to clear all storage?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Yes',
        onPress: async () => {
          try {
            await AsyncStorage.clear();
            await loadStorageData();
          } catch (error) {
            Alert.alert('Error', 'Failed to clear storage.');
            console.error(error);
          }
        },
      },
    ]);
  };

  // Fetch storage data on component mount
  useEffect(() => {
    loadStorageData();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>AsyncStorage Debugger</Text>

      {/* Add New Item */}
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          placeholder="Key"
          value={newKey}
          onChangeText={setNewKey}
        />
        <TextInput
          style={styles.input}
          placeholder="Value (string or JSON)"
          value={newValue}
          onChangeText={setNewValue}
        />
        <Button title="Add" onPress={addItem} />
      </View>

      {/* Display Storage Data */}
      {isLoading ? (
        <Text style={styles.loadingText}>Loading...</Text>
      ) : (
        <FlatList
          data={storageData}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <View style={styles.item}>
              <Text style={styles.keyText}>{item.key}</Text>
              <TextInput
                style={styles.valueInput}
                value={
                  item.isString
                    ? item.value
                    : JSON.stringify(item.value, null, 2) // Prettify JSON
                }
                onChangeText={(text) => updateItem(item.key, text, item.isString)}
                multiline={!item.isString} // Allow multiline for JSON
              />
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => deleteItem(item.key)}
              >
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      {/* Clear All Data */}
      <View style={styles.footer}>
        <Button title="Clear All" color="red" onPress={clearAll} />
      </View>
    </View>
  );
};

export default DebugAsyncStorageScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f8f8f8',
  },
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  input: {
    flex: 1,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 8,
    marginRight: 8,
    backgroundColor: '#fff',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 5,
    elevation: 1,
  },
  keyText: {
    flex: 1,
    fontWeight: 'bold',
  },
  valueInput: {
    flex: 2,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 8,
    backgroundColor: '#fff',
  },
  deleteButton: {
    marginLeft: 8,
    backgroundColor: 'red',
    padding: 8,
    borderRadius: 5,
  },
  deleteText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  footer: {
    marginTop: 16,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});