import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ScoutingForm from "../screens/User/ScoutingForm";

const Stack = createNativeStackNavigator();

const ScoutingStackNavigator: React.FC = () => {

  return (
    <Stack.Navigator screenOptions={{}}>
      <Stack.Screen
        name="ScoutingForm"
        component={ScoutingForm}
        options={({ navigation }) => ({
          headerTitleAlign: "center",
          title: "Scouting",
          
        
        })}
      />
    </Stack.Navigator>
  );
};

export default ScoutingStackNavigator;