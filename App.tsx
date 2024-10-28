import React, { useState } from 'react';
import { View, Button, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from './src/screens/HomeScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ScoutingScreen from './src/screens/ScoutingScreen';

const Stack = createStackNavigator();

const App = () => {
  const [currentScreen, setCurrentScreen] = useState("Home");

  const renderScreen = () => {
    if (currentScreen === "Home") return <HomeScreen />;
    if (currentScreen === "Profile") return <ProfileScreen />;
    if (currentScreen === "Scouting") return <ScoutingScreen />;
  };

  return (
    <NavigationContainer>
      <View style={{ flex: 1 }}>
      
        <View style={{ flex: 1 }}>
          {renderScreen()}
        </View>

        {/* Bottom navigation bar with buttons */}

        <View style={styles.bottomBar}>
          <Button title="Home" onPress={() => setCurrentScreen("Home")} />
          <Button title="Profile" onPress={() => setCurrentScreen("Profile")} />
          <Button title="Scouting" onPress={() => setCurrentScreen("Scouting")} />
        </View>

      </View>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#ccc',
    backgroundColor: '#fff',
  },
});

export default App;
