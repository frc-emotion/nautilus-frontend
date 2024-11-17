import React from "react";
import { useAuth } from "../utils/AuthContext";
import { HStack } from "@/components/ui/hstack";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";

const AuthLoadingScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const { isLoggedIn, isLoading } = useAuth();

    React.useEffect(() => {
        if (!isLoading) {
            // Navigate to MainApp or NotLoggedIn based on login status
            navigation.replace(isLoggedIn ? "MainApp" : "NotLoggedIn");
        }
    }, [isLoading, isLoggedIn, navigation]);

    return (
        <HStack space="sm" className="justify-center items-center h-full">
            <Spinner />
            <Text size="md">Loading user...</Text>
        </HStack>
    );
};

export default AuthLoadingScreen;