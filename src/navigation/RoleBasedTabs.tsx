import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator, NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { useAuth } from "../utils/Context/AuthContext";
import { useThemeContext } from "../utils/UI/CustomThemeProvider";
import {
  BookUser,
  CircleHelpIcon,
  CircleUserRoundIcon,
  HomeIcon,
  NotebookPenIcon,
} from "lucide-react-native";

import ProfileScreen from "../screens/User/ProfileScreen";
import DebugAsyncStorageScreen from "../screens/DebugAsyncStorageScreen";
import VerifyScreen from "../screens/Admin/VerifyScreen";
import LogAttendance from "../screens/User/LogAttendance";
import UserDirectoryScreen from "../screens/User/UserDirectoryScreen";
import BroadcastAttendancePortal from "../screens/Leads/BroadcastAttendancePortal";
import MeetingsScreen from "../screens/Leads/MeetingsScreen";
import CreateMeetingButton from "../components/CreateMeetingButton";
import { TouchableOpacity, Text } from "react-native";
import HomeScreen from "../screens/User/HomeScreen";
import { roleHierarchy, Roles, TabNames, SingleScreenStackProps } from "../Constants";
import AttendanceManagementScreen from "../screens/Admin/AttendanceManagementScreen";
import AttendanceHistoryScreen from "../screens/User/AttendanceHistoryScreen";

const Tab = createBottomTabNavigator();

const SingleScreenStack: React.FC<SingleScreenStackProps> = ({ screenName, component, options }) => {
  const Stack = createNativeStackNavigator();

  const defaultScreenOptions: NativeStackNavigationOptions = {
    // Define any default options here
  };

  return (
    <Stack.Navigator screenOptions={defaultScreenOptions}>
      <Stack.Screen
        name={screenName}
        component={component}
        options={options}
      />
    </Stack.Navigator>
  );
};

// Reusable function to create stack navigators for single screens with unique names
const createSingleScreenStack = (
  screenName: string,
  Component: React.ComponentType<any>,
  title: string,
  headerRight?: () => React.ReactNode
) => {
  return () => (
    <SingleScreenStack
      screenName={`${screenName}Screen`} // Append 'Screen' to make it unique
      component={Component}
      options={{
        headerTitleAlign: "center",
        title,
        headerRight,
      }}
    />
  );
};

// Define all necessary stack navigators within the same file with unique screen names
const ProfileStackNavigator = createSingleScreenStack(TabNames.Profile, ProfileScreen, "Profile");
const AsyncStorageStackNavigator = createSingleScreenStack(TabNames.AsyncStorage, DebugAsyncStorageScreen, "Async Storage");

const HomeStackNavigator: React.FC = () => {
  const Stack = createNativeStackNavigator();
  const { colorMode } = useThemeContext();

  return (
    <Stack.Navigator screenOptions={{}}>
      <Stack.Screen
        name="HomeMain" // Unique name
        component={HomeScreen}
        options={({ navigation }) => ({
          headerTitleAlign: "center",
          title: 'Home',
          headerRight: () => (
            <TouchableOpacity onPress={() => navigation.navigate('AttendanceHistoryScreen')}>
              <Text style={{ marginRight: 10, color: colorMode === "light" ? "black" : "white" }}>Attendance History</Text>
            </TouchableOpacity>
          ),
        })}
      />
      <Stack.Screen
        name="AttendanceHistoryScreen" // Unique name
        component={AttendanceHistoryScreen}
        options={{
          headerTitleAlign: "center",
          title: 'Attendance History'
        }}
      />
    </Stack.Navigator>
  );
}

// Attendance Stack Navigator with unique screen names
const AttendanceStackNavigator: React.FC = () => {
  const Stack = createNativeStackNavigator();
  const { colorMode } = useThemeContext();

  return (
    <Stack.Navigator screenOptions={{}}>
      <Stack.Screen
        name="AttendanceMain" // Unique name
        component={LogAttendance}
        options={({ navigation }) => ({
          headerTitleAlign: "center",
          title: 'Attendance',
          headerRight: () => (
            <TouchableOpacity onPress={() => navigation.navigate('BroadcastMain')}>
              <Text style={{ marginRight: 10, color: colorMode === "light" ? "black" : "white" }}>Broadcast</Text>
            </TouchableOpacity>
          ),
          headerLeft: () => (
            <TouchableOpacity onPress={() => navigation.navigate('MeetingsMain')}>
              <Text style={{ marginLeft: 10, color: colorMode === "light" ? "black" : "white" }}>Meetings</Text>
            </TouchableOpacity>
          ),
        })}
      />
      <Stack.Screen
        name="BroadcastMain" // Unique name
        component={BroadcastAttendancePortal}
        options={{
          headerTitleAlign: "center",
          title: 'Broadcast',
        }}
      />
      <Stack.Screen
        name="MeetingsMain" // Unique name
        component={MeetingsScreen}
        options={({ navigation }) => ({
          headerTitleAlign: "center",
          title: 'Meetings',
          headerRight: () => <CreateMeetingButton />,
        })}
      />
    </Stack.Navigator>
  );
};

// Directory Stack Navigator with unique screen names
const DirectoryStackNavigator: React.FC = () => {
  const Stack = createNativeStackNavigator();
  const { colorMode } = useThemeContext();

  return (
    <Stack.Navigator screenOptions={{}}>
      <Stack.Screen
        name="DirectoryMain" // Unique name
        component={UserDirectoryScreen}
        options={({ navigation }) => ({
          headerTitleAlign: "center",
          title: 'Directory',
          headerRight: () => (
            <TouchableOpacity onPress={() => navigation.navigate('Verifier')}>
              <Text style={{ marginRight: 10, color: colorMode === "light" ? "black" : "white"}}>Verifier</Text>
            </TouchableOpacity>
          ),
          headerLeft: () => (
            <TouchableOpacity onPress={() => navigation.navigate('Attendance')}>
              <Text style={{ marginLeft: 10, color: colorMode === "light" ? "black" : "white"}}>Attendance</Text>
            </TouchableOpacity>
          )
        })}
      />
      <Stack.Screen
        name="Verifier" // Unique name
        component={VerifyScreen}
        options={{
          headerTitleAlign: "center",
          title: 'Verifier',
        }}
      />
      <Stack.Screen
        name="Attendance" // Unique name
        component={AttendanceManagementScreen}
        options={{
          headerTitleAlign: "center",
          title: 'Attendance Management',
        }}
      />

    </Stack.Navigator>
  );
};

// Define a unified tab configuration with associated roles
const allTabs: Array<{
  name: TabNames;
  component: React.ComponentType<any>;
  roles: Roles[];
}> = [
  {
    name: TabNames.Home,
    component: HomeStackNavigator,
    roles: [
      Roles.Unverified,
      Roles.Member,
      Roles.Leadership,
      Roles.Executive,
      Roles.Advisor,
      Roles.Admin,
    ],
  },
  {
    name: TabNames.Attendance,
    component: AttendanceStackNavigator,
    roles: [Roles.Member, Roles.Leadership, Roles.Executive, Roles.Admin],
  },
  {
    name: TabNames.AsyncStorage,
    component: AsyncStorageStackNavigator,
    roles: [
      // Roles.Unverified,
      // Roles.Member,
      // Roles.Leadership,
      // Roles.Executive,
      // Roles.Advisor,
      // Roles.Admin,
    ],
  },
  {
    name: TabNames.Directory,
    component: DirectoryStackNavigator,
    roles: [
      Roles.Leadership,
      Roles.Executive,
      Roles.Advisor,
      Roles.Admin,
    ],
  },
  {
    name: TabNames.Profile,
    component: ProfileStackNavigator,
    roles: [
      Roles.Unverified,
      Roles.Member,
      Roles.Leadership,
      Roles.Executive,
      Roles.Advisor,
      Roles.Admin,
    ],
  },
];

// Icon mapping
const getIcon = (name: TabNames, colorMode: string) => {
  const color = colorMode === "light" ? "black" : "white";
  switch (name) {
    case TabNames.Home:
      return <HomeIcon color={color} />;
    case TabNames.Attendance:
      return <NotebookPenIcon color={color} />;
    case TabNames.Profile:
      return <CircleUserRoundIcon color={color} />;
    case TabNames.AsyncStorage:
      return <CircleHelpIcon color={color} />;
    case TabNames.Directory:
      return <BookUser color={color} />; 
    default:
      return <CircleHelpIcon color={color} />;
  }
};

// Role-Based Tab Navigator Component
const RoleBasedTabs: React.FC = () => {
  const { user } = useAuth();
  const role = (user?.role as Roles) || Roles.Unverified;
  const { colorMode } = useThemeContext();

  // Get all roles that the current role includes
  const allowedRoles = roleHierarchy[role] || [Roles.Unverified];

  // Filter tabs where any of the allowedRoles are included
  const filteredTabs = allTabs.filter(tab =>
    tab.roles.some(tabRole => allowedRoles.includes(tabRole))
  );

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false, // Disable headers in Tab Navigator
      }}
    >
      {filteredTabs.map(({ name, component }, index) => (
        <Tab.Screen
          key={`${name}-${index}`}
          name={name}
          component={component}
          options={{
            headerTitleAlign: "center",
            tabBarIcon: ({ size = 24 }) => getIcon(name, colorMode),
          }}
        />
      ))}
    </Tab.Navigator>
  );
};

export default RoleBasedTabs;