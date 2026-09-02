import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LogAttendance from "../screens/User/LogAttendance";
import AttendanceHistoryScreen from "../screens/User/AttendanceHistoryScreen";
import MeetingsScreen from "../screens/Leads/MeetingsScreen";
import CreateMeetingButton from "../components/CreateMeetingButton";
import { Roles } from "../Constants";
import RoleBasedHeaderButton from "../components/RoleBasedHeaderButton";
import { useTheme } from "../utils/UI/CustomThemeProvider";

const Stack = createNativeStackNavigator();

const AttendanceStackNavigator: React.FC = () => {
  const { theme } = useTheme();

  return (
    <Stack.Navigator screenOptions={{}}>
      <Stack.Screen
        name="AttendanceMain"
        component={LogAttendance}
        options={({ navigation }) => ({
          headerTitleAlign: "center",
          title: "Attendance",
          headerRight: () => (
            <RoleBasedHeaderButton
                onPress={() => navigation.navigate("AttendanceHistoryScreen")}
                title="History"
                requiredRoles={[Roles.Member, Roles.Leadership, Roles.Executive, Roles.Admin]}
                style={{color: theme === "light" ? "black" : "white" }}
            />
          ),
          headerLeft: () => (
            <RoleBasedHeaderButton
              onPress={() => navigation.navigate("MeetingsMain")}
              title="Meetings"
              requiredRoles={[Roles.Leadership, Roles.Executive, Roles.Admin]}
              style={{ color: theme === "light" ? "black" : "white" }}
            />
          ),
        })}
      />
      <Stack.Screen
        name="AttendanceHistoryScreen"
        component={AttendanceHistoryScreen}
        options={{
          headerTitleAlign: "center",
          title: "Attendance History",
        }}
      />
      <Stack.Screen
        name="MeetingsMain"
        component={MeetingsScreen}
        options={{
          headerTitleAlign: "center",
          title: "Meetings",
          headerRight: () => <CreateMeetingButton />, // Assume this button handles its own role checks
        }}
      />
    </Stack.Navigator>
  );
};

export default AttendanceStackNavigator;