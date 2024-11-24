import React, { useEffect, useState } from "react";
import {
    TextInput,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    View,
    TouchableOpacity,
    RefreshControl,
} from "react-native";
import { Button, ButtonText } from "@/components/ui/button";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { Text } from "@/components/ui/text";
import { useAuth } from "../../utils/AuthContext";
import { useModal } from "../../utils/ModalProvider";
import ApiClient from "../../utils/APIClient";
import { QueuedRequest, UserObject } from "../../Constants";
import { useGlobalToast } from "../../utils/ToastProvider";
import { AxiosError, AxiosResponse } from "axios";
import {
    Checkbox,
    CheckboxIndicator,
    CheckboxIcon,
    CheckboxLabel,
} from "@/components/ui/checkbox";
import {
    AlertDialog,
    AlertDialogBackdrop,
    AlertDialogBody,
    AlertDialogContent,
    AlertDialogFooter,
    AlertDialogHeader,
} from "@/components/ui/alert-dialog";
import { useThemeContext } from "../../utils/ThemeContext";
import { Divider } from "@/components/ui/divider";
import { CheckIcon } from "@/components/ui/icon";

const VerifyScreen: React.FC = () => {
    const { user } = useAuth();
    const { showToast } = useGlobalToast();
    const { openModal } = useModal();
    const { colorMode } = useThemeContext();

    const [users, setUsers] = useState<UserObject[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedUserInfo, setSelectedUserInfo] = useState<UserObject | null>(
        null
    );
    const [showUserDialog, setShowUserDialog] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Logging function
    const log = (...args: any[]) => {
        console.log(
            `[${new Date().toISOString()}] [VerifyScreen]`,
            ...args
        );
    };

    useEffect(() => {
        log("useEffect [user]", user);
        if (user?.role !== "admin") {
            log("User is not admin, opening access denied modal");
            openModal({
                title: "Access Denied",
                message: "You do not have access to this page.",
                type: "error",
            });
        } else {
            log("User is admin, fetching unverified users");
            fetchUnverifiedUsers();
        }
    }, [user]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchUnverifiedUsers();
        showToast({
            title: "Refreshed!",
            description: "Successfully checked for new users!",
            type: "success"
        })
        setRefreshing(false);
      };    

    const fetchUnverifiedUsers = async () => {
        log("fetchUnverifiedUsers called");
        setIsLoading(true);
        const request: QueuedRequest = {
            url: "/api/account/users",
            method: "get",
            headers: { Authorization: `Bearer ${user?.token}` },
            retryCount: 0,
            successHandler: async (response: AxiosResponse) => {
                log("fetchUnverifiedUsers successHandler", response.data);
                const unverifiedUsers = response.data.users.filter(
                    (user: UserObject) =>
                        user.role == "unverified"
                );

                // Apply flagging logic
                const usersWithFlags = unverifiedUsers.map(
                    (user: UserObject) => ({
                        ...user,
                        flags: getUserFlags(user, response.data.users),
                    })
                );
                setUsers(usersWithFlags);
                setIsLoading(false);
            },
            errorHandler: async (error: AxiosError) => {
                log("fetchUnverifiedUsers errorHandler", error);
                showToast({
                    title: "Error",
                    description: "Failed to fetch unverified users.",
                    type: "error",
                });
                setIsLoading(false);
            },
            offlineHandler: async () => {
                log("fetchUnverifiedUsers offlineHandler");
                showToast({
                    title: "Offline",
                    description: "You are offline!",
                    type: "error",
                });
                setIsLoading(false);
            },
        };
        try {
            await ApiClient.handleNewRequest(request);
            log("fetchUnverifiedUsers request sent");
        } catch (error) {
            log("fetchUnverifiedUsers exception", error);
            setIsLoading(false);
        }
    };

    // Function to get flags for a user
    const getUserFlags = (user: UserObject, allUsers: UserObject[]): string[] => {
        const flags: string[] = [];

        // Check for missing fields
        if (!user.phone) {
            flags.push("Missing phone number");
        }
        if (!user.student_id) {
            flags.push("Missing student ID");
        }
        if (!user.grade) {
            flags.push("Missing grade");
        }

        // Check for duplicate names
        const duplicateNames = allUsers.filter(
            (u) =>
                u._id !== user._id &&
                u.first_name === user.first_name &&
                u.last_name === user.last_name
        );
        if (duplicateNames.length > 0) {
            flags.push("Duplicate name");
        }

        // Check for duplicate emails
        const duplicateEmails = allUsers.filter(
            (u) => u._id !== user._id && u.email === user.email
        );
        if (duplicateEmails.length > 0) {
            flags.push("Duplicate email");
        }

        // Check for invalid student ID (e.g., must be 7 digits)
        if (user.student_id && !/^\d{7}$/.test(user.student_id)) {
            flags.push("Invalid student ID");
        }

        // Add other flagging logic as needed

        return flags;
    };

    const handleSelectUser = (userId: string) => {
        log("handleSelectUser called", userId);
        setSelectedUsers((prevSelected) => {
            if (prevSelected.includes(userId)) {
                // Deselect user
                return prevSelected.filter((id) => id !== userId);
            } else {
                // Select user
                return [...prevSelected, userId];
            }
        });
    };

    const handleVerifyUsers = async () => {
        log("handleVerifyUsers called", selectedUsers);
        if (selectedUsers.length === 0) {
            showToast({
                title: "No Users Selected",
                description: "Please select at least one user to verify.",
                type: "info",
            });
            return;
        }

        const request: QueuedRequest = {
            url: `/api/account/users/verify`,
            method: "post",
            headers: { Authorization: `Bearer ${user?.token}` },
            data: { users: selectedUsers },
            retryCount: 0,
            successHandler: async (response: AxiosResponse) => {
                log("handleVerifyUsers successHandler", response.data);
                showToast({
                    title: "Success",
                    description: "Users verified successfully!",
                    type: "success",
                });
                setSelectedUsers([]);
                fetchUnverifiedUsers();
            },
            errorHandler: async (error: AxiosError) => {
                log("handleVerifyUsers errorHandler", error);
                showToast({
                    title: "Error",
                    description: "Failed to verify users.",
                    type: "error",
                });
            },
            offlineHandler: async () => {
                log("handleVerifyUsers offlineHandler");
                showToast({
                    title: "Offline",
                    description: "You are offline!",
                    type: "error",
                });
            },
        };

        try {
            await ApiClient.handleNewRequest(request);
            log("handleVerifyUsers request sent");
        } catch (error) {
            log("handleVerifyUsers exception", error);
        }
    };

    const handleUserRowPress = (user: UserObject) => {
        log("handleUserRowPress called", user);
        setSelectedUserInfo(user);
        setShowUserDialog(true);
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{
                flex: 1,
                backgroundColor: colorMode === "light" ? "#FFFFFF" : "#1A202C",
            }}
        >
            <Box className="p-4 flex-1">
                {/* Users List */}
                <Box className="rounded-lg overflow-hidden flex-1">
                    <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
                        {/* Table Header */}
                        <View className="flex flex-row bg-headerBackground">
                            <Text className="w-12 p-3 font-medium">✅</Text>
                            <Text className="flex-1 p-3 font-medium">Name</Text>
                            <Text className="flex-1 p-3 font-medium">Email</Text>
                            <Text className="flex-1 p-3 font-medium">Flags</Text>
                        </View>

                        <Divider className="my-2 bg-outline-300" />

                        {isLoading ? (
                            <View className="p-3">
                                <Text className="text-center ">Loading users...</Text>
                            </View>
                        ) : users.length === 0 ? (
                            <View className="p-3">
                                <Text className="text-center ">
                                    No unverified users found.
                                </Text>
                            </View>
                        ) : (
                            users.map((u) => (
                                <View
                                    key={u._id}
                                    className="flex flex-row items-center border-b border-outline"
                                >
                                    <View className="w-12 p-3 items-center">
                                        <Checkbox
                                            value={u._id}
                                            isChecked={selectedUsers.includes(u._id)}
                                            onChange={() => handleSelectUser(u._id)}
                                        >
                                            <CheckboxIndicator>
                                                <CheckboxIcon as={CheckIcon} />
                                            </CheckboxIndicator>
                                        </Checkbox>
                                    </View>
                                    <TouchableOpacity
                                        className="flex-1 flex-row"
                                        onPress={() => handleUserRowPress(u)}
                                    >
                                        <Text className="flex-1 p-3 ">
                                            {u.first_name} {u.last_name}
                                        </Text>
                                        <Text className="flex-1 p-3 ">{u.email}</Text>
                                        <View className="flex-1 p-3">
                                            {u.flags && u.flags.length > 0 ? (
                                                u.flags.map((flag, index) => (
                                                    <Text key={index} className="text-red-500">
                                                        • {flag}
                                                    </Text>
                                                ))
                                            ) : (
                                                <Text className="text-green-500">No flags</Text>
                                            )}
                                        </View>
                                    </TouchableOpacity>
                                </View>
                            ))
                        )}
                    </ScrollView>
                </Box>

                {/* Verify Button */}
                <Button
                    onPress={handleVerifyUsers}
                    action="primary"
                    className="mt-4"
                >
                    <ButtonText>Verify Selected Users</ButtonText>
                </Button>
            </Box>

            {/* User Information Dialog */}
            {selectedUserInfo && (
                <AlertDialog
                    isOpen={showUserDialog}
                    onClose={() => {
                        log("User dialog closed");
                        setShowUserDialog(false);
                    }}
                >
                    <AlertDialogBackdrop />
                    <AlertDialogContent>
                        <AlertDialogHeader className="pb-4">
                            <Text className="text-lg font-semibold">User Information</Text>
                        </AlertDialogHeader>
                        <AlertDialogBody>
                            <VStack space="sm">
                                <Text>
                                    <Text className="font-semibold">Name: </Text>
                                    {selectedUserInfo.first_name} {selectedUserInfo.last_name}
                                </Text>
                                <Text>
                                    <Text className="font-semibold">Email: </Text>
                                    {selectedUserInfo.email}
                                </Text>
                                <Text>
                                    <Text className="font-semibold">Phone: </Text>
                                    {selectedUserInfo.phone || "N/A"}
                                </Text>
                                <Text>
                                    <Text className="font-semibold">Student ID: </Text>
                                    {selectedUserInfo.student_id || "N/A"}
                                </Text>
                                <Text>
                                    <Text className="font-semibold">Grade: </Text>
                                    {selectedUserInfo.grade || "N/A"}
                                </Text>
                                <Text>
                                    <Text className="font-semibold">Subteam: </Text>
                                    {selectedUserInfo.subteam?.join(", ") || "N/A"}
                                </Text>
                                <Text>
                                    <Text className="font-semibold">Flags: </Text>
                                    {selectedUserInfo.flags && selectedUserInfo.flags.length > 0 ? (
                                        selectedUserInfo.flags.map((flag, index) => (
                                            <Text key={index} className="text-red-500">
                                                {"\n"}• {flag}
                                            </Text>
                                        ))
                                    ) : (
                                        <Text className="text-green-500">No flags</Text>
                                    )}
                                </Text>
                            </VStack>
                        </AlertDialogBody>
                        <AlertDialogFooter className="flex justify-end space-x-3 pt-6">
                            <Button
                                variant="outline"
                                onPress={() => {
                                    log("Close button pressed in User Dialog");
                                    setShowUserDialog(false);
                                }}
                            >
                                <ButtonText>Close</ButtonText>
                            </Button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </KeyboardAvoidingView>
    );
};

export default VerifyScreen;