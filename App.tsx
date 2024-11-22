import React from "react";
import "@/global.css";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AuthProvider } from "./src/utils/AuthContext";
import AuthLoadingScreen from "./src/screens/AuthLoadingScreen";
import RoleBasedTabs from "./src/navigation/RoleBasedTabs";
import NotLoggedIn from "./src/navigation/NotLoggedIn";
import { ModalProvider } from "./src/utils/GlobalModalContext";
import GlobalModal from "./src/components/GlobalModal";
import { ToastProvider } from "./src/utils/GlobalToastProvider";

type AppStackParamList = {
  AuthLoading: undefined;
  RoleBasedTabs: undefined;
  NotLoggedInTabs: undefined;
};

const Stack = createNativeStackNavigator<AppStackParamList>();

export default function App() {
  return (
    <GluestackUIProvider mode="dark">
      <ToastProvider>
      <ModalProvider>
        <GlobalModal />
          <NavigationContainer>
          <AuthProvider>
              <Stack.Navigator screenOptions={{ headerShown: false }}>
                <Stack.Screen name="AuthLoading" component={AuthLoadingScreen} options={{ gestureEnabled: false }}/>
                <Stack.Screen name="RoleBasedTabs" component={RoleBasedTabs} options={{ gestureEnabled: false }}/>
                <Stack.Screen name="NotLoggedInTabs" component={NotLoggedIn} options={{ gestureEnabled: false }}/>
              </Stack.Navigator>
              </AuthProvider>
          </NavigationContainer>
        </ModalProvider>
        </ToastProvider>
    </GluestackUIProvider>
  );
}