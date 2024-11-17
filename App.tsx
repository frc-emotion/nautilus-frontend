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
import { ModalProvider } from './src/utils/GlobalModalContext';
import { ToastProvider } from './src/utils/GlobalToastProvider';
import GlobalModal from './src/components/GlobalModal';
import DebugAsyncStorageScreen from './src/screens/DebugAsyncStorageScreen';

const Tab = createBottomTabNavigator();

function App() {
  return (
    <GluestackUIProvider mode="dark">
      <ModalProvider>
        <GlobalModal />
        <ToastProvider>
          <NavigationContainer>
            <Tab.Navigator>
              <Tab.Screen name="Home" component={HomeScreen} />
              <Tab.Screen name="Broadcaster" component={AdminPortal} />
              <Tab.Screen name="Listener" component={LoggerPortal} />
              <Tab.Screen name="Profile" component={ProfileScreen} />
              <Tab.Screen name="Register" component={RegisterScreen} />
              <Tab.Screen name="AsyncStorage" component={DebugAsyncStorageScreen} />
            </Tab.Navigator>
          </NavigationContainer>
        </ToastProvider>
      </ModalProvider>
    </GluestackUIProvider>
  );
}

export default App;