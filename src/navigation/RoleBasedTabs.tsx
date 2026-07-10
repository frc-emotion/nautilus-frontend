import React from "react";
import { View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useAuth } from "../utils/Context/AuthContext";
import {
  BookUser,
  CircleHelpIcon,
  CircleUserRoundIcon,
  HomeIcon,
  NotebookPenIcon,
  UserPen,
  Binoculars
} from "lucide-react-native";
import AnimatedTabBar from "../components/AnimatedTabBar";

import DebugAsyncStorageScreen from "../screens/DebugAsyncStorageScreen";
import HomeStackNavigator from "./HomeStackNavigator";
import AttendanceStackNavigator from "./AttendanceStackNavigator";
import DirectoryStackNavigator from "./DirectoryStackNavigator";
import { roleHierarchy, Roles, TabNames } from "../Constants";
import ProfileStackNavigator from "./ProfileStackNavigator";
import ForgotPasswordScreen from "../screens/Auth/ForgotPasswordScreen";
import { useRoute } from "@react-navigation/native";
import ScoutingStackNavigator from "./ScoutingStackNavigator";


const Tab = createBottomTabNavigator();

// Icon mapping with theme-aware colors
const renderIcon = (name: TabNames, iconColor: string, iconFill: string) => {
  const size = 24;
  
  switch (name) {
    case TabNames.Home:
      return <HomeIcon color={iconColor} size={size} fill={iconFill} />;
    case TabNames.Attendance:
      return <NotebookPenIcon color={iconColor} size={size} fill={iconFill} />;
    case TabNames.Profile:
      return <CircleUserRoundIcon color={iconColor} size={size} fill={iconFill} />;
    case TabNames.AsyncStorage:
      return <CircleHelpIcon color={iconColor} size={size} fill={iconFill} />;
    case TabNames.Directory:
      return <BookUser color={iconColor} size={size} fill={iconFill} />;
    case TabNames.Scouting:
      return <Binoculars color={iconColor} size={size} fill={iconFill} />;
    case TabNames.ForgotPasswordScreen:
      return <UserPen color={iconColor} size={size} fill={iconFill} />;
    default:
      return <CircleHelpIcon color={iconColor} size={size} fill={iconFill} />;
  }
};

const getIcon = (name: TabNames, focused: boolean, color: string, fill?: string) => {
  const size = 24;

  // Stack a yellow layer under a black layer for a solid fill
  if (focused && fill) {
    return (
      <View style={{ width: size, height: size }}>
        <View style={{ position: 'absolute', top: 0, left: 0 }}>
          {renderIcon(name, 'transparent', fill)}
        </View>
        <View style={{ position: 'absolute', top: 0, left: 0 }}>
          {renderIcon(name, color, 'none')}
        </View>
      </View>
    );
  }

  return renderIcon(name, color, 'none');
};

// Define all necessary stack navigators within the same file with unique screen names
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
    component: DebugAsyncStorageScreen, // Assuming you have a stack navigator for this
    roles: [
      // Define roles if needed
    ],
  },
  {
    name: TabNames.Directory,
    component: DirectoryStackNavigator,
    roles: [
      Roles.Member,
      Roles.Leadership,
      Roles.Executive,
      Roles.Advisor,
      Roles.Admin,
    ],
  },
  {
    name: TabNames.Scouting,
    component: ScoutingStackNavigator,
    roles: [
      Roles.Member,
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
  {
    name: TabNames.ForgotPasswordScreen,
    component: ForgotPasswordScreen,
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

// Role-Based Tab Navigator Component
const RoleBasedTabs: React.FC = () => {
  const route = useRoute();
  // console.log(route.params);
  const { token, admin }  = route.params as { token?:string, email?:string, admin?:boolean } || {};

  const initialTabs = token
    ? allTabs // Include all tabs if token is present
    : allTabs.filter(tab => tab.name !== TabNames.ForgotPasswordScreen);

  const { user } = useAuth();
  const role = (user?.role as Roles) || Roles.Unverified;

  // Get all roles that the current role includes
  const allowedRoles = roleHierarchy[role] || [Roles.Unverified];

  // Filter tabs where any of the allowedRoles are included
  const filteredTabs = initialTabs.filter(tab =>
    tab.roles.some(tabRole => allowedRoles.includes(tabRole))
  );

  return (
    <Tab.Navigator
      tabBar={(props) => <AnimatedTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      {filteredTabs.map(({ name, component }, index) => (
        <Tab.Screen
          key={`${name}-${index}`}
          name={name}
          component={component}
          initialParams={{ token, admin }}
          options={{
            tabBarIcon: ({ focused, color, fill }) => getIcon(name, focused, color, fill),
            tabBarLabel: name,
          }}
        />
      ))}
    </Tab.Navigator>
  );
};

export default RoleBasedTabs;