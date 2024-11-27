import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import LoginScreen from "../screens/Auth/LoginScreen";
import RegisterScreen from "../screens/Auth/RegisterScreen";
import { LogIn, UserRoundPen } from "lucide-react-native";
import ForgotPasswordScreen from "../screens/Auth/ForgotPasswordScreen"
import { useThemeContext } from "../utils/UI/CustomThemeProvider";
import { useRoute } from "@react-navigation/native";

const Tab = createBottomTabNavigator();

const NotLoggedIn: React.FC = () => {
  const { colorMode } = useThemeContext();
  const route = useRoute();
  const { token=false, email }  = route.params || {};
  console.log("yo", token,email)

  return (
    <Tab.Navigator>
      {!token &&
      <Tab.Screen options={{
        tabBarIcon: ({ }) => (
          <LogIn color={colorMode === "light" ? "black" : "white"} />
        )
      }} name="Login" component={LoginScreen} />}
      {!token &&
      <Tab.Screen options={{
        tabBarIcon: ({ }) => (
          <UserRoundPen color={colorMode === "light" ? "black" : "white"} />
        )
      }} name="Register" component={RegisterScreen} />}
      {token && <Tab.Screen options={{
        tabBarIcon: ({ }) => (
          <UserRoundPen color={colorMode === "light" ? "black" : "white"} />
        )
      }} name="ForgotPassword" component={ForgotPasswordScreen} initialParams={{ token, email }} />}

      {/* {() => <ForgotPasswordScreen token={token} email={email} />} */}
    </Tab.Navigator>
  )
};

export default NotLoggedIn;