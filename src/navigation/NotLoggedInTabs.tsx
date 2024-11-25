import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import LoginScreen from "../screens/Auth/LoginScreen";
import RegisterScreen from "../screens/Auth/RegisterScreen";
import { LogIn, UserRoundPen } from "lucide-react-native";
import { useThemeContext } from "../utils/UI/CustomThemeProvider";

const Tab = createBottomTabNavigator();

const NotLoggedIn: React.FC = () => {
  const { colorMode } = useThemeContext();

  return (
    <Tab.Navigator>
      <Tab.Screen options={{
        tabBarIcon: ({ }) => (
          <LogIn color={colorMode === "light" ? "black" : "white"} />
        )
      }} name="Login" component={LoginScreen} />
      <Tab.Screen options={{
        tabBarIcon: ({ }) => (
          <UserRoundPen color={colorMode === "light" ? "black" : "white"} />
        )
      }} name="Register" component={RegisterScreen} />
    </Tab.Navigator>
  )
};

export default NotLoggedIn;