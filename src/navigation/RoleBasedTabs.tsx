import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useAuth } from "../utils/Context/AuthContext";
import { useThemeContext } from "../utils/UI/CustomThemeProvider";
import {
  BookUser,
  CircleHelpIcon,
  CircleUserRoundIcon,
  HomeIcon,
  NotebookPenIcon,
} from "lucide-react-native";

import DebugAsyncStorageScreen from "../screens/DebugAsyncStorageScreen";
import HomeStackNavigator from "./HomeStackNavigator";
import AttendanceStackNavigator from "./AttendanceStackNavigator";
import DirectoryStackNavigator from "./DirectoryStackNavigator";
import { roleHierarchy, Roles, TabNames } from "../Constants";
import ProfileStackNavigator from "./ProfileStackNavigator";

const Tab = createBottomTabNavigator();

// Icon mapping remains the same
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