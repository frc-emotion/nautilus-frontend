import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from "../screens/User/HomeScreen";
import ScoutingForm from "../screens/User/ScoutingForm";
import { Roles } from "../Constants";
import RoleBasedHeaderButton from "../components/RoleBasedHeaderButton";
import { useTheme } from "../utils/UI/CustomThemeProvider";
import { useAuth } from "../utils/Context/AuthContext";

const Stack = createNativeStackNavigator();

const HomeStackNavigator: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();

  return (
    <Stack.Navigator screenOptions={{}}>
      {user && user.role !== Roles.Unverified && (
        <Stack.Screen
          name="HomeMain"
          component={HomeScreen}
          options={({ navigation }) => ({
            headerTitleAlign: "center",
            title: "Home",
          })}
        />
      )}

      {user && user.role === Roles.Unverified && (
        <Stack.Screen
          name="HomeMain"
          component={HomeScreen}
          options={{
            headerTitleAlign: "center",
            title: "Home",
          }}
        />
      )}

    </Stack.Navigator>
  );
};

export default HomeStackNavigator;