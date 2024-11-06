import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from './src/screens/HomeScreen';
import AdminPortal from './src/screens/AdminPortal';
import LoggerPortal from './src/screens/LoggerPortal';
import ProfileScreen from './src/screens/ProfileScreen';
import { createTamagui, TamaguiProvider, View } from 'tamagui'
import defaultConfig from '@tamagui/config/v3'

const Tab = createBottomTabNavigator();
const config = createTamagui(defaultConfig);

function App() {
  return (
    <TamaguiProvider config={config}>
      <NavigationContainer>
        <Tab.Navigator>
          <Tab.Screen name="Home" component={HomeScreen} />
          <Tab.Screen name="Broadcaster" component={AdminPortal} />
          <Tab.Screen name="Listener" component={LoggerPortal} />
          <Tab.Screen name="Profile" component={ProfileScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </TamaguiProvider>
  );
}

export default App;