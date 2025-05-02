import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ProfileScreen from "../screens/User/ProfileScreen";

const Stack = createNativeStackNavigator();

const ProfileStackNavigator: React.FC = () => {

  return (
    <Stack.Navigator screenOptions={{}}>
      <Stack.Screen
        name="ProfileMain"
        component={ProfileScreen}
        options={({ navigation }) => ({
          headerTitleAlign: "center",
          title: "Profile",
          
        
        })}
      />
    </Stack.Navigator>
  );
};

export default ProfileStackNavigator;