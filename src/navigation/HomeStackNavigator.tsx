import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from "../screens/User/HomeScreen";
import AttendanceHistoryScreen from "../screens/User/AttendanceHistoryScreen";
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
            headerRight: () => (
              <RoleBasedHeaderButton
                onPress={() => navigation.navigate("AttendanceHistoryScreen")}
                title="Attendance History"
                requiredRoles={[Roles.Member, Roles.Leadership, Roles.Executive, Roles.Admin]}
                style={{color: theme === "light" ? "black" : "white" }}
              />
            ),
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

      <Stack.Screen
        name="AttendanceHistoryScreen"
        component={AttendanceHistoryScreen}
        options={{
          headerTitleAlign: "center",
          title: "Attendance History",
        }}
      />
    </Stack.Navigator>
  );
};

export default HomeStackNavigator;