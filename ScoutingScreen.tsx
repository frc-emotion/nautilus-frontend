import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const ScoutingScreen: React.FC = () => (
  <View style={header.container}>
    <Text>Scouting</Text>
  </View>
);

const header = StyleSheet.create({
  container: {
    flex: 0,             
    justifyContent: 'flex-start',
    alignItems: 'center',
    width: '100%',       
    position: 'absolute', 
    top: 0,              
    paddingTop: 20,       
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ScoutingScreen;