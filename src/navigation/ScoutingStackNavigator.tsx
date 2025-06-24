import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from "../screens/User/HomeScreen";
import ScoutingForm from "../screens/User/ScoutingForm";
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
                component={ScoutingForm}
                options={{
                    headerTitleAlign: "center",
                    title: "Pit Scouting",
                }}
            />
        </Stack.Navigator>
    )


}

export default ScoutingStackNavigator;