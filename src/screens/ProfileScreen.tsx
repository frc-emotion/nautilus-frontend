import React, { useEffect, useState } from "react";
import { RefreshControl, ScrollView } from "react-native";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Text } from "@/components/ui/text";
import { Button, ButtonText } from "@/components/ui/button";
import { Image } from "@/components/ui/image";
import { useAuth } from "../utils/AuthContext";
import { useGlobalToast } from "../utils/GlobalToastProvider";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AxiosError } from "axios";
import ApiClient, { QueuedRequest } from "../utils/APIClient";

type AppStackParamList = {
  AuthLoading: undefined;
  RoleBasedTabs: undefined;
  NotLoggedInTabs: undefined;
};

const ProfileScreen: React.FC = () => {
  const { user, logout, refreshUser } = useAuth();
  const { showToast } = useGlobalToast();
  const navigation = useNavigation<StackNavigationProp<AppStackParamList>>();
  const [refreshing, setRefreshing] = useState(false);
  const [displayUser, setDisplayUser] = useState(user);

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
      headers: { Authorization: `Bearer ${token}` },
      retryCount: 0,
      successHandler: async (response) => {
        const { user: updatedUser } = response.data;

        // Save updated user to local storage
        await AsyncStorage.setItem("userData", JSON.stringify(updatedUser));

        setDisplayUser(updatedUser);

        showToast({
          title: "Validation Successful",
          description: "User data has been updated.",
          type: "success",
        });
      },
      errorHandler: async (error: AxiosError) => {
        console.error("Token validation failed:", error);

        showToast({
          title: "Validation Failed",
          description: "Unable to validate token with the server.",
          type: "error",
        });

        // Optionally log out user if token validation fails
        handleLogout();
      },
      offlineHandler: async () => {
        showToast({
          title: "Offline",
          description: "Token validation skipped due to offline status.",
          type: "info",
        });
      },
    };

    try {
      await ApiClient.handleNewRequest(request);
    } catch (error) {
      console.error("Error during token validation:", error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshUser();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      showToast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
        type: "success",
      });
      navigation.navigate("NotLoggedInTabs");
    } catch (error) {
      console.error("Error during logout:", error);
      showToast({
        title: "Logout Failed",
        description: "An error occurred while logging out.",
        type: "error",
      });
    }
  };

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1, padding: 16, backgroundColor: "#F8F8F8" }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <VStack space="lg" className="items-center">
        {/* Profile Picture */}
        <Image
          width={128}
          height={128}
          className="w-32 h-32 rounded-full"
          source={require("../assets/icon.png")}
          alt="Profile Picture"
        />

        {/* User Info */}
        <VStack space="md" className="w-full max-w-[600px]">
          <HStack className="justify-between">
            <Text className="text-gray-600">Name</Text>
            <Text className="text-black font-semibold">{`${displayUser?.first_name} ${displayUser?.last_name}`}</Text>
          </HStack>

          <HStack className="justify-between">
            <Text className="text-gray-600">Email</Text>
            <Text className="text-black font-semibold">{displayUser?.email}</Text>
          </HStack>

          <HStack className="justify-between">
            <Text className="text-gray-600">Phone</Text>
            <Text className="text-black font-semibold">{displayUser?.phone}</Text>
          </HStack>

          <HStack className="justify-between">
            <Text className="text-gray-600">Student ID</Text>
            <Text className="text-black font-semibold">{displayUser?.student_id}</Text>
          </HStack>

          <HStack className="justify-between">
            <Text className="text-gray-600">Grade</Text>
            <Text className="text-black font-semibold">{displayUser?.grade}</Text>
          </HStack>

          <HStack className="justify-between">
            <Text className="text-gray-600">Subteam</Text>
            <Text className="text-black font-semibold">{displayUser?.subteam.join(", ")}</Text>
          </HStack>

          <HStack className="justify-between">
            <Text className="text-gray-600">Role</Text>
            <Text className="text-black font-semibold">{displayUser?.role}</Text>
          </HStack>
        </VStack>

        {/* Logout Button */}
        <Button
          onPress={handleLogout}
          size="lg"
          className="mt-4 py-2 rounded-md bg-red-600"
        >
          <ButtonText className="text-white font-semibold">Logout</ButtonText>
        </Button>
      </VStack>
    </ScrollView>
  );
};

export default ProfileScreen;