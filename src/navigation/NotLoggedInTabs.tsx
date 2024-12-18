import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import LoginScreen from "../screens/Auth/LoginScreen";
import RegisterScreen from "../screens/Auth/RegisterScreen";
import { KeyRound, LogIn, UserRoundPen } from "lucide-react-native";
import { useThemeContext } from "../utils/UI/CustomThemeProvider";
import { useRoute } from "@react-navigation/native";
import ForgotPasswordScreen from "../screens/Auth/ForgotPasswordScreen";

const Tab = createBottomTabNavigator();

const NotLoggedIn: React.FC = () => {
  const { colorMode } = useThemeContext();
  const route = useRoute();
  const { token = false }  = route.params as { token?: string } || {};

  return (
    <Tab.Navigator>
      {!token && <Tab.Screen options={{
        headerTitleAlign: "center",
        tabBarIcon: ({ }) => (
          <LogIn color={colorMode === "light" ? "black" : "white"} />
        )
      }} name="Login" component={LoginScreen} />}
      {!token && 
       <Tab.Screen options={{
        headerTitleAlign: "center",
        tabBarIcon: ({ }) => (
          <UserRoundPen color={colorMode === "light" ? "black" : "white"} />
        )
      }} name="Register" component={RegisterScreen} />}
      {token && <Tab.Screen options={{
        tabBarIcon: ({ }) => (
          <KeyRound color={colorMode === "light" ? "black" : "white"} />
        )
      }} name="Forgot Password" component={ForgotPasswordScreen} initialParams={{ token }} />}
      {/* <Tab.Screen name="BLETest" component={BLETestScreen}/> */}
    </Tab.Navigator>
  )
};

export default NotLoggedIn;