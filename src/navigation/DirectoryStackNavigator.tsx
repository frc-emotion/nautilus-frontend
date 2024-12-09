import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import UserDirectoryScreen from "../screens/User/UserDirectoryScreen";
import VerifyScreen from "../screens/Admin/VerifyScreen";
import AttendanceManagementScreen from "../screens/Admin/AttendanceManagementScreen";
import { Roles } from "../Constants";
import RoleBasedHeaderButton from "../components/RoleBasedHeaderButton";
import { useThemeContext } from "../utils/UI/CustomThemeProvider";

const Stack = createNativeStackNavigator();

const DirectoryStackNavigator: React.FC = () => {
  const { colorMode } = useThemeContext();

  return (
    <Stack.Navigator screenOptions={{}}>
      <Stack.Screen
        name="DirectoryMain"
        component={UserDirectoryScreen}
        options={({ navigation }) => ({
          headerTitleAlign: "center",
          title: "Directory",
          headerRight: () => (
            <RoleBasedHeaderButton
              onPress={() => navigation.navigate("Verifier")}
              title="Verifier"
              requiredRoles={[Roles.Executive, Roles.Admin]}
              style={{ color: colorMode === "light" ? "black" : "white" }}
            />
          ),
          headerLeft: () => (
            <RoleBasedHeaderButton
              onPress={() => navigation.navigate("Attendance")}
              title="Attendance"
              requiredRoles={[Roles.Executive, Roles.Admin]}
              style={{ color: colorMode === "light" ? "black" : "white" }}
            />
          ),
        })}
      />
      <Stack.Screen
        name="Verifier"
        component={VerifyScreen}
        options={{
          headerTitleAlign: "center",
          title: "Verifier",
        }}
      />
      <Stack.Screen
        name="Attendance"
        component={AttendanceManagementScreen}
        options={{
          headerTitleAlign: "center",
          title: "Attendance Management",
        }}
      />
    </Stack.Navigator>
  );
};

export default DirectoryStackNavigator;