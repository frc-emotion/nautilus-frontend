import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import HomeScreen from "../screens/User/HomeScreen";
import AdminPortal from "../screens/Admin/AdminPortal";
import DebugAsyncStorageScreen from "../screens/DebugAsyncStorageScreen";
import { useAuth } from "../utils/AuthContext";
import AdminScreen from "../screens/Admin/AdminScreen";
import ProfileScreen from "../screens/User/ProfileScreen";
import LoggerPortal from "../screens/Admin/LoggerPortal";
import { CircleHelpIcon, CircleUserRoundIcon, HomeIcon, NotebookPenIcon } from "lucide-react-native";
import { useThemeContext } from "../utils/ThemeContext";

const Tab = createBottomTabNavigator();

const roleTabConfig = {
  unverified: [
    { name: "Home", component: HomeScreen },
    { name: "Profile", component: ProfileScreen },
    { name: "AsyncStorage", component: DebugAsyncStorageScreen },
  ],
  member: [
    { name: "Home", component: HomeScreen },
    { name: "Profile", component: ProfileScreen },
    { name: "AsyncStorage", component: DebugAsyncStorageScreen },
  ],
  leadership: [
    { name: "Home", component: HomeScreen },
    { name: "Attendance", component: AdminPortal },
    { name: "Profile", component: ProfileScreen },
    { name: "AsyncStorage", component: DebugAsyncStorageScreen },
  ],
  executive: [
    { name: "Home", component: HomeScreen },
    { name: "Attendance", component: AdminPortal },
    { name: "Profile", component: ProfileScreen },
    { name: "AsyncStorage", component: DebugAsyncStorageScreen },
    { name: "Logger", component: LoggerPortal },
  ],
  advisor: [
    { name: "Home", component: HomeScreen },
    { name: "Profile", component: ProfileScreen },
    { name: "AsyncStorage", component: DebugAsyncStorageScreen },
  ],
  admin: [
    { name: "Home", component: HomeScreen },
    { name: "Attendance", component: AdminPortal },
    { name: "Profile", component: ProfileScreen },
    { name: "AsyncStorage", component: DebugAsyncStorageScreen },
    { name: "Logger", component: LoggerPortal },
    { name: "Admin", component: AdminScreen }
  ],
};

const getIcon = (name: String) => {
  switch (name) {
    case "Home":
      return HomeIcon;
    case "Attendance":
      return NotebookPenIcon;
    case "Profile":
      return CircleUserRoundIcon;
    default:
      return CircleHelpIcon;
  }
};

const RoleBasedTabs: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role || "unverified";
  const tabs = roleTabConfig[role] || roleTabConfig.unverified;
  const { colorMode } = useThemeContext();

  return (
    <Tab.Navigator>
      {tabs.map((tab) => {
        const Icon = getIcon(tab.name);
        return (
          <Tab.Screen
            key={tab.name}
            name={tab.name}
            component={tab.component}
            options={{
              tabBarIcon: ({ color, size }) => (
                <Icon color={colorMode === "light" ? "black" : "white"} size={size || 24} />
              ),
            }}
          />
        );
      })}
    </Tab.Navigator>
  );
};

export default RoleBasedTabs;