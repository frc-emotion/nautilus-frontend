import React from 'react';
import "@/global.css";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AuthProvider } from "./src/utils/AuthContext";
import AuthLoadingScreen from "./src/screens/Auth/AuthLoadingScreen";
import RoleBasedTabs from "./src/navigation/RoleBasedTabs";
import NotLoggedIn from "./src/navigation/NotLoggedInTabs";
import { ModalProvider } from "./src/utils/ModalProvider";
import GlobalModal from "./src/components/GlobalModal";
import { ToastProvider } from "./src/utils/ToastProvider";
import { ThemeProvider, useThemeContext } from './src/utils/ThemeContext';
import { LightTheme, DarkTheme, AppStackParamList } from './src/Constants';

const Stack = createNativeStackNavigator<AppStackParamList>();

function AppContent() {
  const { colorMode } = useThemeContext();

  return (
    <GluestackUIProvider mode={colorMode}>
      <ToastProvider>
        <ModalProvider>
          <GlobalModal />
          <NavigationContainer theme={colorMode === 'light' ? LightTheme : DarkTheme}>
            <AuthProvider>
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