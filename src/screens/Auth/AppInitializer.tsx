import React, { useEffect, useState } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useMeetings } from "@/src/utils/Context/MeetingContext";
import { useUsers } from "@/src/utils/Context/UsersContext";
import { useAuth } from "@/src/utils/Context/AuthContext";
import { useAttendance } from "@/src/utils/Context/AttendanceContext";
import { Center } from "@/components/ui/center";
import { VStack } from "@/components/ui/vstack";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { HStack } from "@/components/ui/hstack"; // for horizontal layout
import { useNetworking } from "@/src/utils/Context/NetworkingContext";
import * as Sentry from '@sentry/react-native';
import { useUpdate } from "@/src/utils/Context/UpdateContext";

interface ContextStatus {
  Update: 'Pending' | 'Loading' | 'Success' | 'Error';
  Meetings: 'Pending' | 'Loading' | 'Success' | 'Error';
  Users: 'Pending' | 'Loading' | 'Success' | 'Error';
  Attendance: 'Pending' | 'Loading' | 'Success' | 'Error';
}

const AppInitializer: React.FC = () => {
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const { init: initMeetings } = useMeetings();
  const { init: initUsers } = useUsers();
  const { init: initAttendance } = useAttendance();
  const { isConnected } = useNetworking();
  const { checkAppVersion } = useUpdate();
  const route = useRoute();

  const navigation = useNavigation<StackNavigationProp<any>>();
  const [isInitializing, setIsInitializing] = useState(true);

  const [contextsLoadingStatus, setContextsLoadingStatus] = useState<ContextStatus>({
    Update: 'Pending',
    Meetings: 'Pending',
    Users: 'Pending',
    Attendance: 'Pending',
  });

  useEffect(() => {
    const initializeApp = async () => {
      // If we don't know about connectivity yet, or auth is still loading, do nothing
      if (isConnected === null || authLoading) return;

      console.log("CONNECTION: " + isConnected);

      const { email, token } = (route.params ?? {}) as { email?: string, token?: string };
      console.log("Deep link params:", email, token);

      // If user is not logged in, navigate immediately.
      if (!isLoggedIn) {
        navigateToAppropriateScreen();
        return;
      }

      setContextsLoadingStatus((prev) => ({ ...prev, Update: 'Loading' }));
      await initializeContext(checkAppVersion, "Update");

      // User is logged in and we know connectivity
      // Initialize additional contexts one by one for transparency
      setContextsLoadingStatus((prev) => ({ ...prev, Meetings: 'Loading' }));
      await initializeContext(initMeetings, "Meetings");

      setContextsLoadingStatus((prev) => ({ ...prev, Users: 'Loading' }));
      await initializeContext(initUsers, "Users");

      setContextsLoadingStatus((prev) => ({ ...prev, Attendance: 'Loading' }));
      await initializeContext(initAttendance, "Attendance");

      // After all done, navigate
      navigateToAppropriateScreen();
    };

    initializeApp();
  }, [isConnected, authLoading, isLoggedIn]);

  const initializeContext = async (
    initFn: () => Promise<void>,
    contextName: keyof ContextStatus
  ) => {
    try {
      console.log(`Initializing ${contextName} context...`);
      await initFn();
      console.log(`${contextName} context initialized successfully.`);
      setContextsLoadingStatus((prev) => ({ ...prev, [contextName]: 'Success' }));
    } catch (error) {
      console.error(`Error initializing ${contextName} context:`, error);
      setContextsLoadingStatus((prev) => ({ ...prev, [contextName]: 'Error' }));
    }
  };

  const navigateToAppropriateScreen = () => {
    setIsInitializing(false);
    setTimeout(() => {
      navigation.replace(isLoggedIn ? "RoleBasedTabs" : "NotLoggedInTabs", route.params);
    }, 0);
  };

  // Determine main loading message
  let loadingMessage = "Initializing application...";
  if (authLoading) {
    loadingMessage = "Verifying authentication...";
  } else if (isConnected === null) {
    loadingMessage = "Checking network connectivity...";
  } else if (isInitializing && isLoggedIn) {
    loadingMessage = "Initializing contexts...";
  }

  // If we haven't got connectivity or auth is still loading,
  // or user is logged in and still initializing contexts, show loading
  const shouldShowLoading = (isConnected === null) || authLoading || (isLoggedIn && isInitializing);

  if (shouldShowLoading) {
    return (
      <Center className="flex-1">
        <VStack space="sm" className="items-center">
          <Spinner />
          <Text size="lg" className="mb-4">{loadingMessage}</Text>

          {/* Show contexts loading state only if user is logged in and we know connectivity */}
          {isConnected !== null && isLoggedIn && (
            <VStack space="sm" className="items-start">
              <ContextStatusItem label="Meetings" status={contextsLoadingStatus.Meetings} />
              <ContextStatusItem label="Users" status={contextsLoadingStatus.Users} />
              <ContextStatusItem label="Attendance" status={contextsLoadingStatus.Attendance} />
            </VStack>
          )}
        </VStack>
      </Center>
    );
  }

  return null; // We have navigated away

};

interface ContextStatusItemProps {
  label: string;
  status: 'Pending' | 'Loading' | 'Success' | 'Error';
}

const ContextStatusItem: React.FC<ContextStatusItemProps> = ({ label, status }) => {
  let statusMessage = "";
  let color = "gray";

  switch (status) {
    case 'Pending':
      statusMessage = "Pending";
      color = "gray";
      break;
    case 'Loading':
      statusMessage = "Loading...";
      color = "yellow";
      break;
    case 'Success':
      statusMessage = "Success";
      color = "green";
      break;
    case 'Error':
      statusMessage = "Error";
      color = "red";
      break;
  }

  return (
    <HStack space="sm" className="items-center">
      <Text size="md" style={{ color }}>
        •
      </Text>
      <Text size="md" style={{ color }}>{label}: {statusMessage}</Text>
    </HStack>
  );
};

export default AppInitializer;