import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from './src/screens/HomeScreen';
import ProfileScreen from './src/screens/ProfileScreen';

const Stack = createStackNavigator();
// TODO: Figure out how to create a bar at the bottom of the screen that allows the user to navigate between the Home and Profile screens.
const App = () => (
  <NavigationContainer>
    <Stack.Navigator>
      <Stack.Screen name="Home" component={HomeScreen} />
    </Stack.Navigator>
    <Stack.Screen name="Profile" component={ProfileScreen} />
  </NavigationContainer>
);

export default App;