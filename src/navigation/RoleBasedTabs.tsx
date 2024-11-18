import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import HomeScreen from "../screens/HomeScreen";
import AdminPortal from "../screens/AdminPortal";
import LoggerPortal from "../screens/LoggerPortal";
import ProfileScreen from "../screens/ProfileScreen";
import DebugAsyncStorageScreen from "../screens/DebugAsyncStorageScreen";
import { useAuth } from "../utils/AuthContext";

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
    ],
  };

const RoleBasedTabs: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role || "unverified";
  const tabs = roleTabConfig[role] || roleTabConfig.unverified;

  return (
    <Tab.Navigator>
      {tabs.map((tab) => (
        <Tab.Screen key={tab.name} name={tab.name} component={tab.component} />
      ))}
    </Tab.Navigator>
  );
};

export default RoleBasedTabs;