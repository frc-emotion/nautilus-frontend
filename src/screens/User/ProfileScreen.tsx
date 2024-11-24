import React, { useEffect, useState } from "react";
import { RefreshControl, ScrollView } from "react-native";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Text } from "@/components/ui/text";
import { Button, ButtonText } from "@/components/ui/button";
import { Image } from "@/components/ui/image";
import { useAuth } from "../../utils/AuthContext";
import { useGlobalToast } from "../../utils/ToastProvider";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AxiosError } from "axios";
import ApiClient from "../../utils/APIClient";
import { AppStackParamList, QueuedRequest } from "../../Constants";
import { useThemeContext } from "../../utils/ThemeContext";
const icon = require("@/src/assets/icon.png")

const ProfileScreen: React.FC = () => {
  const { user, logout, refreshUser } = useAuth();
  const { showToast } = useGlobalToast();
  const navigation = useNavigation<StackNavigationProp<AppStackParamList>>();
  const [refreshing, setRefreshing] = useState(false);
  const [displayUser, setDisplayUser] = useState(user);
  const { colorMode, toggleColorMode } = useThemeContext();

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
          description: "Unable to update user data with server.",
          type: "error",
        });

        // Optionally log out user if token validation fails
        handleLogout();
      },
      offlineHandler: async () => {
        showToast({
          title: "Offline",
          description: "I cannot refresh your profile without an internet connection!",
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
      contentContainerStyle={{ flexGrow: 1, padding: 16, backgroundColor: colorMode === 'light' ? '#FFFFFF' : '#1A202C' }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <VStack space="lg" className="items-center">
        {/* Profile Picture */}
        <Image
          width={128}
          height={128}
          className="w-32 h-32 rounded-full"
          source={icon}
          alt="Profile Picture"
        />

        {/* User Info */}
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
            <Text className="font-semibold">{displayUser?.phone}</Text>
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
            <Text className="font-semibold">{displayUser?.subteam.join(", ")}</Text>
          </HStack>

          <HStack className="justify-between">
            <Text>Role</Text>
            <Text className="font-semibold">{displayUser?.role}</Text>
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