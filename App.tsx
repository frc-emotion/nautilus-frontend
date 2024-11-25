import React from 'react';
import "@/global.css";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AuthProvider } from "./src/utils/AuthContext";
import AuthLoadingScreen from "./src/screens/Auth/AuthLoadingScreen";
import RoleBasedTabs from "./src/navigation/RoleBasedTabs";
import NotLoggedIn from "./src/navigation/NotLoggedInTabs";
import { ModalProvider } from "./src/utils/UI/CustomModalProvider";
import GlobalModal from "./src/components/GlobalModal";
import { ToastProvider } from "./src/utils/UI/CustomToastProvider";
import { ThemeProvider, useThemeContext } from './src/utils/UI/CustomThemeProvider';
import { LightTheme, DarkTheme, AppStackParamList } from './src/Constants';
import { BLEProvider } from './src/utils/BLE/BLEContext';
import { MeetingsProvider } from './src/utils/MeetingContext';
import { UsersProvider } from './src/utils/UsersContext';


import * as Linking from 'expo-linking';
import { useEffect } from 'react';
import { LogBox } from 'react-native';

const Stack = createNativeStackNavigator<AppStackParamList>();
LogBox.ignoreLogs(['Warning: ...']); // Ignore log notification by message (optional)
LogBox.ignoreAllLogs(); //Ignore all log notifications (optional)
function AppContent() {
  const { colorMode } = useThemeContext();
  useEffect(() => {
    const handleDeepLink = (event) => {
      console.log('Received deep link:', event.url); // Logs the URL the app receives
    };

    Linking.addEventListener('url', handleDeepLink);

    return () => {
      Linking.removeEventListener('url', handleDeepLink);
    };
  }, []);


  return (
    <GluestackUIProvider mode={colorMode}>
      <ToastProvider>
        <ModalProvider>
          <GlobalModal />
          <NavigationContainer theme={colorMode === 'light' ? LightTheme : DarkTheme}>
            <AuthProvider>
              <UsersProvider>
                <MeetingsProvider>
                  <BLEProvider>
                    <Stack.Navigator screenOptions={{ headerShown: false }}>
                      <Stack.Screen
                        name="AuthLoading"
                        component={AuthLoadingScreen}
                        options={{ gestureEnabled: false }}
                      />
                      <Stack.Screen
                        name="RoleBasedTabs"
                        component={RoleBasedTabs}
                        options={{ gestureEnabled: false }}
                      />
                      <Stack.Screen
                        name="NotLoggedInTabs"
                        component={NotLoggedIn}
                        options={{ gestureEnabled: false }}
                      />
                    </Stack.Navigator>
                  </BLEProvider>
                </MeetingsProvider>
              </UsersProvider>
            </AuthProvider>
          </NavigationContainer>
        </ModalProvider>
      </ToastProvider>
    </GluestackUIProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}