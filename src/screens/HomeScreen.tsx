import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const HomeScreen: React.FC = () => (
  <View style={styles.container}>
    <Text>Welcome to Home Screen</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default HomeScreen;