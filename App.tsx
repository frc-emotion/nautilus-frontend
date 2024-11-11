import * as React from 'react';
import "@/global.css";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from './src/screens/HomeScreen';
import AdminPortal from './src/screens/AdminPortal';
import LoggerPortal from './src/screens/LoggerPortal';
import ProfileScreen from './src/screens/ProfileScreen';
import RegisterScreen from './src/screens/RegisterScreen';

const Tab = createBottomTabNavigator();

function App() {
  return (
    <GluestackUIProvider mode="dark">
        <NavigationContainer>
          <Tab.Navigator>
            <Tab.Screen name="Home" component={HomeScreen} />
            <Tab.Screen name="Broadcaster" component={AdminPortal} />
            <Tab.Screen name="Listener" component={LoggerPortal} />
            <Tab.Screen name="Profile" component={ProfileScreen} />
            <Tab.Screen name="Register" component={RegisterScreen} />
          </Tab.Navigator>
        </NavigationContainer>
      </GluestackUIProvider>
  );
}

export default App;