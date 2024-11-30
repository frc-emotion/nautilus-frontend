import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import LoginScreen from "../screens/Auth/LoginScreen";
import RegisterScreen from "../screens/Auth/RegisterScreen";
import { LogIn, UserRoundPen } from "lucide-react-native";
import { useThemeContext } from "../utils/UI/CustomThemeProvider";
import { useRoute } from "@react-navigation/native";
import ForgotPasswordScreen from "../screens/Auth/ForgotPasswordScreen";

const Tab = createBottomTabNavigator();

const NotLoggedIn: React.FC = () => {
  const { colorMode } = useThemeContext();
  const route = useRoute();
  const { token, email }  = route.params as { token?: string, email?: string } || {};

  return (
    <Tab.Navigator>
      <Tab.Screen options={{
        headerTitleAlign: "center",
        tabBarIcon: ({ }) => (
          <LogIn color={colorMode === "light" ? "black" : "white"} />
        )
      }} name="Login" component={LoginScreen} />
      <Tab.Screen options={{
        headerTitleAlign: "center",
        tabBarIcon: ({ }) => (
          <UserRoundPen color={colorMode === "light" ? "black" : "white"} />
        )
      }} name="Register" component={RegisterScreen} />
      {token && <Tab.Screen options={{
        tabBarIcon: ({ }) => (
          <UserRoundPen color={colorMode === "light" ? "black" : "white"} />
        )
      }} name="ForgotPassword" component={ForgotPasswordScreen} initialParams={{ token, email }} />}
      {/* <Tab.Screen name="BLETest" component={BLETestScreen}/> */}
    </Tab.Navigator>
  )
};

export default NotLoggedIn;