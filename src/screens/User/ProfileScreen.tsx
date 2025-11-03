import React, { useEffect, useState } from "react";
import { RefreshControl, ScrollView, ActivityIndicator, Pressable } from "react-native";
import { View } from "@/components/ui/view";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Text } from "@/components/ui/text";
import { Button, ButtonText } from "@/components/ui/button";
import { Image } from "@/components/ui/image";
import { useAuth } from "../../utils/Context/AuthContext";
import { useGlobalToast } from "../../utils/UI/CustomToastProvider";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AxiosError, AxiosResponse } from "axios";
import { AppStackParamList, QueuedRequest, UserObject } from "../../Constants";
import { useTheme } from "../../utils/UI/CustomThemeProvider";
import { formatPhoneNumber, handleErrorWithModalOrToast } from "@/src/utils/Helpers";
import { useGlobalModal } from "@/src/utils/UI/CustomModalProvider";
import { CLEAN_API_URL, useNetworking } from "@/src/utils/Context/NetworkingContext";
import * as Application from 'expo-application';
import { captureException } from '@sentry/react-native';

const icon = require("@/src/assets/icon.png");

const ProfileScreen: React.FC = () => {
  const { user, logout, refreshUser, isLoading } = useAuth();
  const { openToast } = useGlobalToast();
  const { openModal } = useGlobalModal();
  const { theme } = useTheme();
  // const { backendHasToken, checkBackendPushToken } = useNotifications();
  const { handleRequest } = useNetworking(); // handleRequest from networking
  const navigation = useNavigation<StackNavigationProp<AppStackParamList>>();
  const [refreshing, setRefreshing] = useState(false);
  const [displayUser, setDisplayUser] = useState<UserObject | null>(user);

  useEffect(() => {
    if (user) {
      setDisplayUser(user);
      validateTokenWithServer(user.token);
    }
  }, [user]);

  const validateTokenWithServer = async (token: string) => {
    const request: QueuedRequest = {
      url: "/api/account/validate",
      method: "get",
      retryCount: 0,
      successHandler: async (response: AxiosResponse) => {
        console.log(response.data);
        const newUser = response.data.data.user;

        await AsyncStorage.setItem("userData", JSON.stringify(newUser));
        setDisplayUser(newUser);

        openToast({
          title: "Validation Successful",
          description: "User data has been updated.",
          type: "success",
        });
      },
      errorHandler: async (error: AxiosError) => {
        console.error("Token validation failed:", error);

        handleErrorWithModalOrToast({
          actionName: "Validate session",
          error,
          showModal: true,
          showToast: true,
          openModal,
          openToast,
        });

        handleLogout();
      },
      offlineHandler: async () => {
        openToast({
          title: "Offline",
          description: "Cannot refresh your profile without an internet connection!",
          type: "info",
        });
      },
    };

    try {
      await handleRequest(request);
    } catch (error) {
      console.error("Error during token validation:", error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshUser();
    } catch (error) {
      console.error("Error during user refresh:", error);
      openToast({
        title: "Refresh Failed",
        description: "An error occurred while refreshing user data.",
        type: "error",
      });
      handleLogout();
    }

    //await checkBackendPushToken();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      openToast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
        type: "success",
      });
      navigation.replace("NotLoggedInTabs", {});
    } catch (error) {
      console.error("Error during logout:", error);
      openToast({
        title: "Logout Failed",
        description: "An error occurred while logging out.",
        type: "error",
      });
    }
  };

  const forceCrash = async () => {
    openToast({
      title: "Crash Triggered",
      description: "Uploading logs...",
      type: "info",
    });
    try {
      throw new Error("User uploading logs.");
      
    } catch (error) {
      captureException(error);
    }

    openToast({
      title: "Crash Triggered",
      description: "Logs uploaded.",
      type: "success",
    });
  }

  if (isLoading) {
    return <LoadingIndicator />;
  }

  if (!user) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>You are not logged in.</Text>
        <Button onPress={() => navigation.replace("NotLoggedInTabs", {})}>
          <ButtonText>Go to Login</ButtonText>
        </Button>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background-0"
      contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingVertical: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <VStack space="2xl" className="items-center">
        <Image
          width={128}
          height={128}
          className="w-32 h-32 rounded-full shadow-lg"
          source={icon}
          alt="Profile Picture"
        />

        <VStack space="lg" className="w-full max-w-2xl">
          <Box className="bg-background-0 rounded-xl shadow-md p-6 border border-outline-100">
            <VStack space="md">
              <HStack className="justify-between items-center">
                <Text className="text-sm font-medium text-typography-600">Name</Text>
                <Text className="font-semibold text-base text-typography-950">{`${displayUser?.first_name} ${displayUser?.last_name}`}</Text>
              </HStack>

              <HStack className="justify-between items-center">
                <Text className="text-sm font-medium text-typography-600">Email</Text>
                <Text className="font-semibold text-base text-typography-950">{displayUser?.email}</Text>
              </HStack>

              <HStack className="justify-between items-center">
                <Text className="text-sm font-medium text-typography-600">Phone</Text>
                <Text className="font-semibold text-base text-typography-950">{displayUser?.phone ? formatPhoneNumber(displayUser?.phone) : displayUser?.phone}</Text>
              </HStack>

              <HStack className="justify-between items-center">
                <Text className="text-sm font-medium text-typography-600">Student ID</Text>
                <Text className="font-semibold text-base text-typography-950">{displayUser?.student_id}</Text>
              </HStack>

              <HStack className="justify-between items-center">
                <Text className="text-sm font-medium text-typography-600">Grade</Text>
                <Text className="font-semibold text-base text-typography-950">{displayUser?.grade}</Text>
              </HStack>

              {/* Subteam - Horizontal Scrollable Chips */}
              <VStack space="xs">
                <Text className="text-sm font-medium text-typography-600">Subteam</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingVertical: 4 }}
                >
                  <HStack space="xs">
                    {displayUser?.subteam && displayUser.subteam.length > 0 ? (
                      displayUser.subteam.map((team, index) => (
                        <View 
                          key={index}
                          className="px-3 py-1.5 rounded-full border border-outline-200"
                          style={{
                            backgroundColor: theme === 'dark' ? 'rgba(245, 245, 245, 0.1)' : 'rgba(51, 51, 51, 0.05)',
                          }}
                        >
                          <Text className="text-sm font-semibold text-typography-900">{team}</Text>
                        </View>
                      ))
                    ) : (
                      <Text className="text-sm text-typography-500 italic">No subteam assigned</Text>
                    )}
                  </HStack>
                </ScrollView>
              </VStack>

              {/* Role - Single Badge with Accent Color */}
              <VStack space="xs">
                <Text className="text-sm font-medium text-typography-600">Role</Text>
                <View 
                  className="px-4 py-2 rounded-full self-start border-2"
                  style={{
                    backgroundColor: theme === 'dark' ? 'rgba(96, 165, 250, 0.15)' : 'rgba(59, 130, 246, 0.1)',
                    borderColor: theme === 'dark' ? 'rgba(96, 165, 250, 0.4)' : 'rgba(59, 130, 246, 0.3)',
                  }}
                >
                  <Text 
                    className="text-base font-bold uppercase tracking-wide"
                    style={{ color: theme === 'dark' ? '#60A5FA' : '#2563EB' }}
                  >
                    {displayUser?.role || 'N/A'}
                  </Text>
                </View>
              </VStack>

              <HStack className="justify-between items-center">
                <Text className="text-sm font-medium text-typography-600">Enrolled in 4.5 Class</Text>
                <Text className="font-semibold text-base text-typography-950">{displayUser?.fourpointfive}</Text>
              </HStack>
            </VStack>
          </Box>
          <Box className="bg-background-0 rounded-xl shadow-md p-6 border border-outline-100">
            <VStack space="md">
              <HStack className="justify-between items-center">
                <Text className="text-sm font-medium text-typography-600">API</Text>
                <Text className="font-semibold text-base text-typography-950">{CLEAN_API_URL}</Text>
              </HStack>
              
              <HStack className="justify-between items-center">
                <Text className="text-sm font-medium text-typography-600">Version</Text>
                <Text className="font-semibold text-base text-typography-950">{Application.nativeApplicationVersion}</Text>
              </HStack>
            </VStack>
          </Box>
        </VStack>

        <VStack space="md" className="w-full max-w-2xl">
          <Button
            onPress={handleLogout}
            size="lg"
            className="rounded-lg shadow-md bg-error-600"
          >
            <ButtonText className="font-semibold text-base">Logout</ButtonText>
          </Button>

          <Button
            onPress={forceCrash}
            size="lg"
            variant="outline"
            className="rounded-lg"
          >
            <ButtonText className="font-semibold text-base">Upload Logs</ButtonText>
          </Button>
        </VStack>
      </VStack>
    </ScrollView>
  );
};

export default ProfileScreen;

const LoadingIndicator: React.FC = () => (
  <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
    <ActivityIndicator size="large" />
  </View>
);