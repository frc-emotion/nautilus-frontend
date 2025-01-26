import React, { useEffect, useState } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";

import { useAuth } from "@/src/utils/Context/AuthContext";
import { useUsers } from "@/src/utils/Context/UsersContext";
import { useMeetings } from "@/src/utils/Context/MeetingContext";
import { useAttendance } from "@/src/utils/Context/AttendanceContext";
import { useNetworking } from "@/src/utils/Context/NetworkingContext";
import { useUpdate } from "@/src/utils/Context/UpdateContext";

import { Center } from "@/components/ui/center";
import { VStack } from "@/components/ui/vstack";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { HStack } from "@/components/ui/hstack";
import * as Sentry from "@sentry/react-native";

interface ContextStatus {
  Update: "Pending" | "Loading" | "Success" | "Error";
  Meetings: "Pending" | "Loading" | "Success" | "Error";
  Users: "Pending" | "Loading" | "Success" | "Error";
  Attendance: "Pending" | "Loading" | "Success" | "Error";
}

const AppInitializer: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const route = useRoute();

  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const { isConnected, isLoading: networkingLoading } = useNetworking();

  const { checkAppVersion } = useUpdate();
  const { init: initMeetings } = useMeetings();
  const { init: initUsers } = useUsers();
  const { init: initAttendance } = useAttendance();

  const [isInitializing, setIsInitializing] = useState(true);
  const [contextsLoadingStatus, setContextsLoadingStatus] = useState<ContextStatus>({
    Update: "Pending",
    Meetings: "Pending",
    Users: "Pending",
    Attendance: "Pending",
  });

  useEffect(() => {
    // Wait until we know networking state (not null) AND auth is done
    if (networkingLoading || authLoading || isConnected === null) {
      return;
    }

    const initializeApp = async () => {
      // 1) Check version
      try {
        setContextsLoadingStatus((prev) => ({ ...prev, Update: "Loading" }));
        await checkAppVersion(); // Now isConnected===true or false, never null
        setContextsLoadingStatus((prev) => ({ ...prev, Update: "Success" }));
      } catch (err) {
        Sentry.captureException(err);
        setContextsLoadingStatus((prev) => ({ ...prev, Update: "Error" }));
      }

      // If user not logged in => skip other contexts
      if (!isLoggedIn) {
        navigateAway();
        return;
      }

      // 2) Meetings
      try {
        setContextsLoadingStatus((prev) => ({ ...prev, Meetings: "Loading" }));
        await initMeetings();
        setContextsLoadingStatus((prev) => ({ ...prev, Meetings: "Success" }));
      } catch (err) {
        Sentry.captureException(err);
        setContextsLoadingStatus((prev) => ({ ...prev, Meetings: "Error" }));
      }

      // 3) Users
      try {
        setContextsLoadingStatus((prev) => ({ ...prev, Users: "Loading" }));
        await initUsers();
        setContextsLoadingStatus((prev) => ({ ...prev, Users: "Success" }));
      } catch (err) {
        Sentry.captureException(err);
        setContextsLoadingStatus((prev) => ({ ...prev, Users: "Error" }));
      }

      // 4) Attendance
      try {
        setContextsLoadingStatus((prev) => ({ ...prev, Attendance: "Loading" }));
        await initAttendance();
        setContextsLoadingStatus((prev) => ({ ...prev, Attendance: "Success" }));
      } catch (err) {
        Sentry.captureException(err);
        setContextsLoadingStatus((prev) => ({ ...prev, Attendance: "Error" }));
      }

      navigateAway();
    };

    initializeApp();
  }, [
    networkingLoading,
    authLoading,
    isConnected,
    isLoggedIn,
    // checkAppVersion,
    // initMeetings,
    // initUsers,
    // initAttendance
  ]);

  function navigateAway() {
    setIsInitializing(false);
    navigation.replace(isLoggedIn ? "RoleBasedTabs" : "NotLoggedInTabs", route.params);
  }

  const shouldShowLoading = authLoading || networkingLoading || isInitializing;
  if (shouldShowLoading) {
    let loadingMessage = "Initializing application...";
    if (authLoading) {
      loadingMessage = "Verifying authentication...";
    } else if (networkingLoading) {
      loadingMessage = "Checking network connectivity...";
    } else if (isInitializing && isLoggedIn) {
      loadingMessage = "Initializing contexts...";
    }

    return (
      <Center className="flex-1">
        <VStack space="sm" className="items-center">
          <Spinner />
          <Text size="lg" className="mb-4">
            {loadingMessage}
          </Text>

          {isLoggedIn && (
            <VStack space="sm" className="items-start">
              <ContextStatusItem label="Update" status={contextsLoadingStatus.Update} />
              <ContextStatusItem label="Meetings" status={contextsLoadingStatus.Meetings} />
              <ContextStatusItem label="Users" status={contextsLoadingStatus.Users} />
              <ContextStatusItem label="Attendance" status={contextsLoadingStatus.Attendance} />
            </VStack>
          )}
        </VStack>
      </Center>
    );
  }

  return null;
};

interface ContextStatusItemProps {
  label: string;
  status: "Pending" | "Loading" | "Success" | "Error";
}

const ContextStatusItem: React.FC<ContextStatusItemProps> = ({ label, status }) => {
  let color = "gray";
  let text = "";
  switch (status) {
    case "Pending":
      text = "Pending";
      color = "gray";
      break;
    case "Loading":
      text = "Loading...";
      color = "yellow";
      break;
    case "Success":
      text = "Success";
      color = "green";
      break;
    case "Error":
      text = "Error";
      color = "red";
      break;
  }

  return (
    <HStack space="sm" className="items-center">
      <Text size="md" style={{ color }}>
        •
      </Text>
      <Text size="md" style={{ color }}>
        {label}: {text}
      </Text>
    </HStack>
  );
};

export default AppInitializer;