import React from "react";
import { ScrollView } from "react-native";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Text } from "@/components/ui/text";
import { Button, ButtonText } from "@/components/ui/button";
import { Image } from "@/components/ui/image";
import { useAuth } from "../utils/AuthContext";
import { useGlobalToast } from "../utils/GlobalToastProvider";

const ProfileScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { showToast } = useGlobalToast();

  const handleLogout = async () => {
    try {
      await logout();
      showToast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
        type: "success",
      });
      navigation.replace("NotLoggedIn");
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
            <Text className="text-black font-semibold">{`${user?.first_name} ${user?.last_name}`}</Text>
          </HStack>

          <HStack className="justify-between">
            <Text className="text-gray-600">Email</Text>
            <Text className="text-black font-semibold">{user?.email}</Text>
          </HStack>

          <HStack className="justify-between">
            <Text className="text-gray-600">Phone</Text>
            <Text className="text-black font-semibold">{user?.phone}</Text>
          </HStack>

          <HStack className="justify-between">
            <Text className="text-gray-600">Student ID</Text>
            <Text className="text-black font-semibold">{user?.student_id}</Text>
          </HStack>

          <HStack className="justify-between">
            <Text className="text-gray-600">Grade</Text>
            <Text className="text-black font-semibold">{user?.grade}</Text>
          </HStack>

          <HStack className="justify-between">
            <Text className="text-gray-600">Subteam</Text>
            <Text className="text-black font-semibold">{user?.subteam.join(", ")}</Text>
          </HStack>

          <HStack className="justify-between">
            <Text className="text-gray-600">Role</Text>
            <Text className="text-black font-semibold">{user?.role}</Text>
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