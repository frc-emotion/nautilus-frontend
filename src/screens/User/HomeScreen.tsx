import React, { useEffect, useState } from "react";
import { ScrollView, RefreshControl, Alert } from "react-native";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Button, ButtonText } from "@/components/ui/button";
import { Progress, ProgressFilledTrack } from "@/components/ui/progress";
import { useAuth } from "../../utils/Context/AuthContext";
import { useGlobalToast } from "../../utils/UI/CustomToastProvider";
import ApiClient from "../../utils/Networking/APIClient";
import { MeetingObject, QueuedRequest } from "../../Constants"; // Ensure Meeting type is defined appropriately
import { Fab, FabIcon } from "@/components/ui/fab";
import { MoonIcon, SunIcon } from "lucide-react-native";
import { useThemeContext } from "../../utils/UI/CustomThemeProvider";
import AsyncStorage from '@react-native-async-storage/async-storage';

const HomeScreen: React.FC = () => {
  const { colorMode, toggleColorMode } = useThemeContext();

  const { user, refreshUser } = useAuth();
  const { openToast } = useGlobalToast();
  const [refreshing, setRefreshing] = useState(false);
  const [attendanceHours, setAttendanceHours] = useState<number | null>(null);

  useEffect(() => {
    if (user && user.role !== "unverified") {
      console.log("HomeScreen: Fetching attendance hours and meetings.");
      fetchAttendanceHours(user.token);
      fetchAndCacheMeetings(user.token);
    }
  }, [user]);

  /**
   * Fetches all meetings from the backend and caches them in AsyncStorage.
   * @param token User's authentication token.
   */
  const fetchAndCacheMeetings = async (token: string) => {
    const request: QueuedRequest = {
      url: "/api/meetings/info",
      method: "get",
      headers: { Authorization: `Bearer ${token}` },
      retryCount: 0,
      successHandler: async (response) => {
        const meetings: MeetingObject[] = response.data.meetings;
        try {
          await AsyncStorage.setItem('meetings', JSON.stringify(meetings));
          openToast({
            title: "Meetings Cached",
            description: "All meetings have been cached locally.",
            type: "success",
          });
        } catch (storageError) {
          console.error("Error saving meetings to AsyncStorage:", storageError);
          openToast({
            title: "Error",
            description: "Failed to cache meetings locally.",
            type: "error",
          });
        }
      },
      errorHandler: async (error) => {
        console.error("Failed to fetch meetings:", error);
        openToast({
          title: "Error",
          description: "Unable to fetch meetings.",
          type: "error",
        });
      },
      offlineHandler: async () => {
        openToast({
          title: "Offline",
          description: "Cannot fetch meetings while offline.",
          type: "info",
        });
      },
    };

    try {
      await ApiClient.handleRequest(request);
    } catch (error) {
      console.error("Error during meetings fetch:", error);
    }
  };

  /**
   * Fetches attendance hours from the backend.
   * @param token User's authentication token.
   */
  const fetchAttendanceHours = async (token: string) => {
    const request: QueuedRequest = {
      url: "/api/attendance/hours",
      method: "get",
      headers: { Authorization: `Bearer ${token}` },
      retryCount: 0,
      successHandler: async (response) => {
        setAttendanceHours(response.data.total_hours);

        openToast({
          title: "Attendance Updated",
          description: "Your attendance hours have been successfully updated.",
          type: "success",
        });
      },
      errorHandler: async (error) => {
        console.error("Failed to fetch attendance hours:", error);
        openToast({
          title: "Error",
          description: "Unable to fetch attendance hours.",
          type: "error",
        });
      },
      offlineHandler: async () => {
        openToast({
          title: "Offline",
          description: "You must be connected to the internet to update your hours!",
          type: "info",
        });
      },
    };

    try {
      await ApiClient.handleRequest(request);
    } catch (error) {
      console.error("Error during attendance request:", error);
    }
  };

  /**
   * Handles pull-to-refresh action.
   */
  const handleRefresh = async () => {
    setRefreshing(true);
    if (user?.role !== "unverified" && user?.token) {
      await fetchAttendanceHours(user.token);
      await fetchAndCacheMeetings(user.token);
    }
    setRefreshing(false);
  };

  /**
   * Handles refresh action for unverified users.
   */
  const handleUnverifiedRefresh = async () => {
    setRefreshing(true);
    await refreshUser();
    setRefreshing(false);
  };

  if (user?.role === "unverified") {
    // Unverified User Screen
    return (
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, padding: 16, backgroundColor: colorMode === 'light' ? '#FFFFFF' : '#1A202C' }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleUnverifiedRefresh} />}
      >
        <VStack space="lg" className="items-center mt-8">
          <Text className="text-red-600 text-center font-bold text-lg">
            Unverified Account
          </Text>
          <Text className="text-center">
            Please contact an administrator to verify your account.
          </Text>
          <Button
            onPress={handleUnverifiedRefresh}
            size="lg"
            className="mt-4 py-2 rounded-md"
          >
            <ButtonText className="font-semibold">Refresh</ButtonText>
          </Button>
        </VStack>
        <Fab
          size="md"
          placement="bottom right"
          onPress={toggleColorMode}
        >
          <FabIcon as={colorMode === 'light' ? MoonIcon : SunIcon} />
        </Fab>
      </ScrollView>
    );
  }

  // Verified User Screen
  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1, padding: 16, backgroundColor: colorMode === 'light' ? '#FFFFFF' : '#1A202C' }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <VStack space="lg" className="items-center">
        <Text className="font-bold text-lg">Attendance Hours</Text>
        {attendanceHours !== null ? (
          <>
            <VStack space="md" className="w-full max-w-[600px]">
              <Text className="text-center">
                You have completed {attendanceHours} out of 36 hours of attendance.
              </Text>
              <HStack className="items-center justify-center">
                <Progress value={(attendanceHours / 36) * 100} className="w-80 h-2">
                  <ProgressFilledTrack className="bg-emerald-600" />
                </Progress>
              </HStack>
            </VStack>
          </>
        ) : (
          <Text>Loading attendance hours...</Text>
        )}
        <Button
          onPress={handleRefresh}
          size="lg"
          className="mt-4 py-2 rounded-md"
        >
          <ButtonText className="font-semibold">Refresh</ButtonText>
        </Button>
      </VStack>
      <Fab
        size="md"
        placement="bottom right"
        onPress={toggleColorMode}
      >
        <FabIcon as={colorMode === 'light' ? MoonIcon : SunIcon} />
      </Fab>
    </ScrollView>
  );
};

export default HomeScreen;