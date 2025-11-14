import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from "../screens/User/HomeScreen";
import ScoutingForm from "../screens/User/ScoutingForm";
import DataVisualizationScreen from "../screens/User/DataVisualizationScreen";
import AdvancedOprScreen from "../screens/User/AdvancedOprScreen";
import { Roles } from "../Constants";
import RoleBasedHeaderButton from "../components/RoleBasedHeaderButton";
import { useTheme } from "../utils/UI/CustomThemeProvider";
import { useAuth } from "../utils/Context/AuthContext";
import AttendanceHistoryScreen from "../screens/User/AttendanceHistoryScreen";
import PitScoutingForm from "../screens/User/PitScoutingForm";
import { Center } from "@/components/ui/center";

const Stack = createNativeStackNavigator()


const ScoutingStackNavigator: React.FC = () => {
    const { theme } = useTheme();
    const { user } = useAuth();




    return (
        <Stack.Navigator screenOptions={{}}>
            {user && user.role != Roles.Unverified && (
                <Stack.Screen
                    name="Scouting"
                    component={ScoutingForm}
                    options={({ navigation }) => ({
                        headerTitleAlign: "center",
                        title: "Scouting",
                        headerLeft: () => (
                            <RoleBasedHeaderButton
                                onPress={() => navigation.navigate("DataViz")}
                                title="Data Visualization"
                                requiredRoles={[Roles.Member, Roles.Leadership, Roles.Executive, Roles.Admin]}
                                style={{ color: theme === "light" ? "black" : "white" }}
                            />
                        ),
                        headerRight: () => (
                            <RoleBasedHeaderButton
                                onPress={() => navigation.navigate("PitScouting")}
                                title="Pit Scouting"
                                requiredRoles={[Roles.Member, Roles.Leadership, Roles.Executive, Roles.Admin]}
                                style={{ color: theme === "light" ? "black" : "white" }}
                            />
                        )
                    })}
                />
            )}


            <Stack.Screen
                name="PitScouting"
                component={PitScoutingForm}
                options={{
                    headerTitleAlign: "center",
                    title: "Pit Scouting",
                }}
            />

            <Stack.Screen
                name="DataViz"
                component={DataVisualizationScreen}
                options={({ navigation }) => ({
                    headerTitleAlign: "center",
                    title: "Data Visualization",
                    headerRight: () => (
                        <RoleBasedHeaderButton
                            onPress={() => navigation.navigate("AdvancedOpr")}
                            title="Advanced OPR"
                            requiredRoles={[Roles.Member, Roles.Leadership, Roles.Executive, Roles.Admin]}
                            style={{ color: theme === "light" ? "black" : "white" }}
                        />
                    )
                })}
            />

            <Stack.Screen
                name="AdvancedOpr"
                component={AdvancedOprScreen}
                options={{
                    headerTitleAlign: "center",
                    title: "Advanced OPR Analytics",
                }}
            />
        </Stack.Navigator>
    )


}

export default ScoutingStackNavigator;