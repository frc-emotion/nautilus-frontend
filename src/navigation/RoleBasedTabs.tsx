import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator, NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { useAuth } from "../utils/AuthContext";
import { useThemeContext } from "../utils/UI/CustomThemeProvider";
import {
  BookUser,
  CircleHelpIcon,
  CircleUserRoundIcon,
  HomeIcon,
  NotebookPenIcon,
} from "lucide-react-native";

// Import screens
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
import { roleHierarchy, Roles, TabNames } from "../Constants";

const Tab = createBottomTabNavigator();

// Define a reusable SingleScreenStack component
type SingleScreenStackProps = {
  screenName: string;
  component: React.ComponentType<any>;
  options?: NativeStackNavigationOptions;
};

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
        title,
        headerRight,
      }}
    />
  );
};

// Define all necessary stack navigators within the same file with unique screen names
const HomeStackNavigator = createSingleScreenStack(TabNames.Home, HomeScreen, "Home");
const ProfileStackNavigator = createSingleScreenStack(TabNames.Profile, ProfileScreen, "Profile");
const AsyncStorageStackNavigator = createSingleScreenStack(TabNames.AsyncStorage, DebugAsyncStorageScreen, "Async Storage");

// Attendance Stack Navigator with unique screen names
const AttendanceStackNavigator: React.FC = () => {
  const Stack = createNativeStackNavigator();

  return (
    <Stack.Navigator screenOptions={{}}>
      <Stack.Screen
        name="AttendanceMain" // Unique name
        component={LogAttendance}
        options={({ navigation }) => ({
          title: 'Attendance',
          headerRight: () => (
            <TouchableOpacity onPress={() => navigation.navigate('BroadcastMain')}>
              <Text style={{ marginRight: 10 }}>Broadcast</Text>
            </TouchableOpacity>
          ),
          headerLeft: () => (
            <TouchableOpacity onPress={() => navigation.navigate('MeetingsMain')}>
              <Text style={{ marginLeft: 10 }}>Meetings</Text>
            </TouchableOpacity>
          ),
        })}
      />
      <Stack.Screen
        name="BroadcastMain" // Unique name
        component={BroadcastAttendancePortal}
        options={{
          title: 'Broadcast',
        }}
      />
      <Stack.Screen
        name="MeetingsMain" // Unique name
        component={MeetingsScreen}
        options={({ navigation }) => ({
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

  return (
    <Stack.Navigator screenOptions={{}}>
      <Stack.Screen
        name="DirectoryMain" // Unique name
        component={UserDirectoryScreen}
        options={({ navigation }) => ({
          title: 'Directory',
          headerRight: () => (
            <TouchableOpacity onPress={() => navigation.navigate('Verifier')}>
              <Text style={{ marginRight: 10 }}>Verifier</Text>
            </TouchableOpacity>
          ),
        })}
      />
      <Stack.Screen
        name="Verifier" // Unique name
        component={VerifyScreen}
        options={{
          title: 'Verifier',
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
            tabBarIcon: ({ size = 24 }) => getIcon(name, colorMode),
          }}
        />
      ))}
    </Tab.Navigator>
  );
};

export default RoleBasedTabs;