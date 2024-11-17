import * as React from "react";
import "@/global.css";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import HomeScreen from "./src/screens/HomeScreen";
import AdminPortal from "./src/screens/AdminPortal";
import LoggerPortal from "./src/screens/LoggerPortal";
import ProfileScreen from "./src/screens/ProfileScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import LoginScreen from "./src/screens/LoginScreen";
import DebugAsyncStorageScreen from "./src/screens/DebugAsyncStorageScreen";
import AuthLoadingScreen from "./src/screens/AuthLoadingScreen";
import { ModalProvider } from "./src/utils/GlobalModalContext";
import { ToastProvider } from "./src/utils/GlobalToastProvider";
import GlobalModal from "./src/components/GlobalModal";
import { AuthProvider } from "./src/utils/AuthContext";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function UserTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Broadcaster" component={AdminPortal} />
      <Tab.Screen name="Listener" component={LoggerPortal} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      <Tab.Screen name="AsyncStorage" component={DebugAsyncStorageScreen} />
    </Tab.Navigator>
  );
}

function AdminTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Broadcaster" component={AdminPortal} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      <Tab.Screen name="AsyncStorage" component={DebugAsyncStorageScreen} />
    </Tab.Navigator>
  );
}

function UnverifiedTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Listener" component={LoggerPortal} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      <Tab.Screen name="AsyncStorage" component={DebugAsyncStorageScreen} />
    </Tab.Navigator>
  );
}

function NotLoggedIn() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Login" component={LoginScreen} />
      <Tab.Screen name="Register" component={RegisterScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <GluestackUIProvider mode="dark">
      <ModalProvider>
        <GlobalModal />
        <ToastProvider>
          <AuthProvider>
            <NavigationContainer>
              <Stack.Navigator screenOptions={{ headerShown: false }}>
                {/* Initial loading screen */}
                <Stack.Screen name="AuthLoading" component={AuthLoadingScreen} />

                {/* Main app or login flow */}
                <Stack.Screen name="MainApp" component={UserTabs} />
                <Stack.Screen name="NotLoggedIn" component={NotLoggedIn} />
              </Stack.Navigator>
            </NavigationContainer>
          </AuthProvider>
        </ToastProvider>
      </ModalProvider>
    </GluestackUIProvider>
  );
}