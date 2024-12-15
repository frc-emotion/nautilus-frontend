import React, { useEffect, useState } from "react";
import { RefreshControl, ScrollView, ActivityIndicator } from "react-native";
import { View } from "@/components/ui/view";
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
import { useThemeContext } from "../../utils/UI/CustomThemeProvider";
import { formatPhoneNumber, handleErrorWithModalOrToast } from "@/src/utils/Helpers";
import { useGlobalModal } from "@/src/utils/UI/CustomModalProvider";
import { useNetworking } from "@/src/utils/Context/NetworkingContext";

const icon = require("@/src/assets/icon.png");

const ProfileScreen: React.FC = () => {
  const { user, logout, refreshUser, isLoading } = useAuth();
  const { openToast } = useGlobalToast();
  const { openModal } = useGlobalModal();
  const { colorMode } = useThemeContext();
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
      contentContainerStyle={{
        flexGrow: 1,
        padding: 16,
        backgroundColor: colorMode === 'light' ? '#FFFFFF' : '#1A202C'
      }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <VStack space="lg" className="items-center">
        <Image
          width={128}
          height={128}
          className="w-32 h-32 rounded-full"
          source={icon}
          alt="Profile Picture"
        />

        <VStack space="md" className="w-full max-w-[600px]">
          <HStack className="justify-between">
            <Text>Name</Text>
            <Text className="font-semibold">{`${displayUser?.first_name} ${displayUser?.last_name}`}</Text>
          </HStack>

          <HStack className="justify-between">
            <Text>Email</Text>
            <Text className="font-semibold">{displayUser?.email}</Text>
          </HStack>

          <HStack className="justify-between">
            <Text>Phone</Text>
            <Text className="font-semibold">{displayUser?.phone ? formatPhoneNumber(displayUser?.phone) : displayUser?.phone}</Text>
          </HStack>

          <HStack className="justify-between">
            <Text>Student ID</Text>
            <Text className="font-semibold">{displayUser?.student_id}</Text>
          </HStack>

          <HStack className="justify-between">
            <Text>Grade</Text>
            <Text className="font-semibold">{displayUser?.grade}</Text>
          </HStack>

          <HStack className="justify-between">
            <Text>Subteam</Text>
            <Text className="font-semibold">{displayUser?.subteam ? displayUser.subteam.join(", ") : "N/A"}</Text>
          </HStack>

          <HStack className="justify-between">
            <Text>Role</Text>
            <Text className="font-semibold">{displayUser?.role}</Text>
          </HStack>

          <HStack className="justify-between">
            <Text>Push Notifications</Text>
            {/* <Text className="font-semibold">{backendHasToken}</Text> */}
            <Text className="font-semibold">Disabled</Text>
          </HStack>
        </VStack>

        <Button
          onPress={handleLogout}
          size="lg"
          className="mt-4 py-2 rounded-md bg-red-600"
        >
          <ButtonText className="font-semibold">Logout</ButtonText>
        </Button>
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