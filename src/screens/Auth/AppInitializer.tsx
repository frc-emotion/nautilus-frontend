import React, { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useMeetings } from "@/src/utils/Context/MeetingContext";
import { useUsers } from "@/src/utils/Context/UsersContext";
import { useAuth } from "@/src/utils/Context/AuthContext";
import { Center } from "@/components/ui/center";
import { VStack } from "@/components/ui/vstack";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";

const AppInitializer: React.FC = () => {
  const { isLoggedIn, isLoading } = useAuth();
  const meetings = useMeetings();
  const users = useUsers();
  const navigation = useNavigation<StackNavigationProp<any>>();

  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initializeApp = async () => {
      if (isLoading) return;

      if (isLoggedIn) {
        try {
          console.log("Initializing app contexts...");

          // Handle each context's init individually
          await Promise.allSettled([
            initializeContext(meetings.init, "Meetings"),
            initializeContext(users.init, "Users"),
          ]);

          console.log("Contexts initialized successfully!");
        } catch (error) {
          console.error("Unexpected error during app initialization:", error);
        }
      }

      navigateToAppropriateScreen();
    };

    initializeApp();
  }, [isLoading, isLoggedIn]);

  const initializeContext = async (
    initFn: () => Promise<void>,
    contextName: string
  ) => {
    try {
      console.log(`Initializing ${contextName} context...`);
      await initFn();
      console.log(`${contextName} context initialized successfully.`);
    } catch (error) {
      console.error(`Error initializing ${contextName} context:`, error);
    }
  };

  const navigateToAppropriateScreen = () => {
    setIsInitializing(false);
    navigation.replace(isLoggedIn ? "RoleBasedTabs" : "NotLoggedInTabs");
  };

  return (
    <Center className="flex-1">
      <VStack space="sm">
        <Spinner />
        <Text size="lg">
          {isInitializing ? "Initializing application..." : "Verifying authentication..."}
        </Text>
      </VStack>
    </Center>
  );
};

export default AppInitializer;