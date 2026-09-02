import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from "../screens/User/HomeScreen";

const Stack = createNativeStackNavigator();

const HomeStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{}}>
      <Stack.Screen
        name="HomeMain"
        component={HomeScreen}
        options={({ navigation }) => ({
          headerTitleAlign: "center",
          title: "Home",
        })}
      />
    </Stack.Navigator>
  );
};

export default HomeStackNavigator;