import React, { useEffect } from "react";
import { HStack } from "@/components/ui/hstack";
import { Spinner } from "@/components/ui/spinner"; // Ensure Spinner is correctly implemented
import { Text } from "@/components/ui/text";
import { useAuth } from "../../utils/AuthContext";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { AppStackParamList } from "../../Constants";
import { Button } from "@/components/ui/button";

const AuthLoadingScreen: React.FC = () => {
  const { isLoading, isLoggedIn } = useAuth();
  const navigation = useNavigation<StackNavigationProp<AppStackParamList>>();

  useEffect(() => {
    if (!isLoading) {
      console.log(`AuthLoadingScreen: User is ${isLoggedIn ? "logged in" : "not logged in"}.`);
      setTimeout(() => {
        navigation.replace(isLoggedIn ? "RoleBasedTabs" : "NotLoggedInTabs");
      }, 0);
    }
  }, [isLoading, isLoggedIn, navigation]);

  return (
    <HStack space="sm" className="justify-center items-center h-full">
      <Spinner />
      <Text size="md">Verifying your authentication status...</Text>
      <Button onPress={() => navigation.replace("RoleBasedTabs")}>
        <Text>Continue</Text>
      </Button>
      <Button onPress={() => navigation.replace("NotLoggedInTabs")}>
        <Text>Not Logged In</Text>
      </Button>
    </HStack>
  );
};

export default AuthLoadingScreen;