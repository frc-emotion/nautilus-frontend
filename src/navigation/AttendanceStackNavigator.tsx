import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LogAttendance from "../screens/User/LogAttendance";
import BroadcastAttendancePortal from "../screens/Leads/BroadcastAttendancePortal";
import MeetingsScreen from "../screens/Leads/MeetingsScreen";
import CreateMeetingButton from "../components/CreateMeetingButton";
import { Roles } from "../Constants";
import RoleBasedHeaderButton from "../components/RoleBasedHeaderButton";
import { useThemeContext } from "../utils/UI/CustomThemeProvider";

const Stack = createNativeStackNavigator();

const AttendanceStackNavigator: React.FC = () => {
  const { colorMode } = useThemeContext();

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
              onPress={() => navigation.navigate("BroadcastMain")}
              title="Broadcast"
              requiredRoles={[Roles.Leadership, Roles.Executive, Roles.Admin]}
              style={{ color: colorMode === "light" ? "black" : "white" }}
            />
          ),
          headerLeft: () => (
            <RoleBasedHeaderButton
              onPress={() => navigation.navigate("MeetingsMain")}
              title="Meetings"
              requiredRoles={[Roles.Leadership, Roles.Executive, Roles.Admin]}
              style={{ color: colorMode === "light" ? "black" : "white" }}
            />
          ),
        })}
      />
      <Stack.Screen
        name="BroadcastMain"
        component={BroadcastAttendancePortal}
        options={{
          headerTitleAlign: "center",
          title: "Broadcast",
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