import React, { useEffect } from "react";
import { HStack } from "@/components/ui/hstack";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { AppStackParamList } from "../../Constants";
import * as Linking from 'expo-linking';

const AuthLoadingScreen: React.FC = () => {
    console.log("URL for me",Linking.useURL())
  const navigation = useNavigation<StackNavigationProp<AppStackParamList>>();
  
  return (
    <HStack space="sm" className="justify-center items-center h-full">
      <Spinner />
      <Text size="md">Checking your authentication status...</Text>
    </HStack>
  );
};

export default AuthLoadingScreen;