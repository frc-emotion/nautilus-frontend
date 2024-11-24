import React, { useEffect, useState } from "react";
import { ScrollView, RefreshControl } from "react-native";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Button, ButtonText } from "@/components/ui/button";
import { Progress, ProgressFilledTrack } from "@/components/ui/progress";
import { useAuth } from "../../utils/AuthContext";
import { useGlobalToast } from "../../utils/ToastProvider";
import ApiClient from "../../utils/APIClient";
import { QueuedRequest } from "../../Constants";
import { Fab, FabIcon } from "@/components/ui/fab";
import { MoonIcon, SunIcon } from "lucide-react-native";
import { useThemeContext } from "../../utils/ThemeContext";

const HomeScreen: React.FC = () => {
  const { colorMode, toggleColorMode } = useThemeContext();

  const { user, refreshUser } = useAuth();
  const { showToast } = useGlobalToast();
  const [refreshing, setRefreshing] = useState(false);
  const [attendanceHours, setAttendanceHours] = useState<number | null>(null);


  useEffect(() => {
    if (user && user.role !== "unverified") {
      fetchAttendanceHours(user.token);
    }
  }, [user]);

  const fetchAttendanceHours = async (token: string) => {
    const request: QueuedRequest = {
      url: "/api/attendance/hours",
      method: "get",
      headers: { Authorization: `Bearer ${token}` },
      retryCount: 0,
      successHandler: async (response) => {
        setAttendanceHours(response.data.total_hours);

        showToast({
          title: "Attendance Updated",
          description: "Your attendance hours have been successfully updated.",
          type: "success",
        });
      },
      errorHandler: async (error) => {
        console.error("Failed to fetch attendance hours:", error);
        showToast({
          title: "Error",
          description: "Unable to fetch attendance hours.",
          type: "error",
        });
      },
      offlineHandler: async () => {
        showToast({
          title: "Offline",
          description: "You must be connected to the internet to update your hours!",
          type: "info",
        });
      },
    };

    try {
      await ApiClient.handleNewRequest(request);
    } catch (error) {
      console.error("Error during attendance request:", error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    if (user?.role !== "unverified" && user?.token) {
      await fetchAttendanceHours(user.token);
    }
    setRefreshing(false);
  };

  const handleUnverifiedRefresh = async () => {
    setRefreshing(true);
    await refreshUser();
    setRefreshing(false);
  }


  if (user?.role == "unverified") {
    // Unverified User Screen
    return (
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, padding: 16, backgroundColor: colorMode === 'light' ? '#FFFFFF' : '#1A202C' }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
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