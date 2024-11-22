import React, { useEffect } from "react";
import { HStack } from "@/components/ui/hstack";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { useAuth } from "../utils/AuthContext";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";

type AppStackParamList = {
  AuthLoading: undefined;
  RoleBasedTabs: undefined;
  NotLoggedInTabs: undefined;
};

const AuthLoadingScreen: React.FC = () => {
  const { isLoading, isLoggedIn } = useAuth();
  const navigation = useNavigation<StackNavigationProp<AppStackParamList>>();
  useEffect(() => {
    if (!isLoading) {
      navigation.replace(isLoggedIn ? "RoleBasedTabs" : "NotLoggedInTabs");
    }
  }, [isLoading, isLoggedIn, navigation]);

  return (
    <HStack space="sm" className="justify-center items-center h-full">
      <Spinner />
      <Text size="md">Checking your authentication status...</Text>
    </HStack>
  );
};

export default AuthLoadingScreen;