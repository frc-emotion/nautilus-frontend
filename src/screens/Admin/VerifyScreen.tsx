import React, { useEffect, useState, useMemo } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
} from "react-native";
import { Button, ButtonText } from "@/components/ui/button";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { Text } from "@/components/ui/text";
import { useAuth } from "../../utils/Context/AuthContext";
import { useGlobalModal } from "../../utils/UI/CustomModalProvider";
import { AppStackParamList, QueuedRequest, UserFlag, UserObject } from "../../Constants";
import { useGlobalToast } from "../../utils/UI/CustomToastProvider";
import { AxiosError, AxiosResponse } from "axios";
import {
    Checkbox,
    CheckboxIndicator,
    CheckboxIcon,
} from "@/components/ui/checkbox";
import {
    AlertDialog,
    AlertDialogBackdrop,
    AlertDialogBody,
    AlertDialogContent,
    AlertDialogFooter,
    AlertDialogHeader,
} from "@/components/ui/alert-dialog";
import { useTheme } from "../../utils/UI/CustomThemeProvider";
import { Divider } from "@/components/ui/divider";
import { CheckIcon } from "@/components/ui/icon";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { handleErrorWithModalOrToast } from "@/src/utils/Helpers";
import { useNetworking } from "@/src/utils/Context/NetworkingContext";
import { View } from "@/components/ui/view";
import { Portal } from "@/components/ui/portal";
import { HStack } from "@/components/ui/hstack";
import { Input, InputField } from "@/components/ui/input";
import { Pressable } from "@/components/ui/pressable";
import { useUsers } from '@/src/utils/Context/UsersContext';

type SortCriteria = 'name' | 'subteam';

interface SortConfig {
    criteria: SortCriteria;
    order: 'asc' | 'desc' | 'none';
}

const VerifyScreen: React.FC = () => {
    const { user } = useAuth();
    const { openToast } = useGlobalToast();
    const { openModal } = useGlobalModal();
    const { theme } = useTheme();
    const { handleRequest } = useNetworking();
    const navigation = useNavigation<StackNavigationProp<AppStackParamList>>();

    const [unverifiedUsers, setUnverifiedUsers] = useState<UserObject[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
    const [isFiltering, setIsFiltering] = useState(true);
    const [selectedUserInfo, setSelectedUserInfo] = useState<UserObject | null>(null);
    const [showUserDialog, setShowUserDialog] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // State for flags popup
    const [showFlagsPortal, setShowFlagsPortal] = useState(false);
    const [flagsToShow, setFlagsToShow] = useState<UserFlag[]>([]);

    // Search query
    // const [searchQuery, setSearchQuery] = useState("");

    // Sorting
    const [sortConfig, setSortConfig] = useState<SortConfig[]>([]);

    // Confirmation dialogs
    const [showVerifyConfirm, setShowVerifyConfirm] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const {
        users,
        isLoading,
        fetchUsers,
        editUser,
        deleteUser,
        searchQuery,
        setSearchQuery,
        selectedSubteam,
        setSelectedSubteam,
        selectedGrade,
        setSelectedGrade,
        filteredUsers,
    } = useUsers();


    const log = (...args: any[]) => {
        console.log(`[${new Date().toISOString()}] [VerifyScreen]`, ...args);
    };

    useEffect(() => {
        log("useEffect [user]", user);
        if (user?.role !== "admin" && user?.role !== "executive" && user?.role !== "advisor") {
            log("User is not admin/exec/advisor, opening access denied modal");
            openModal({
                title: "Access Denied",
                message: "You do not have access to this page.",
                type: "error",
            });
            navigation.goBack();
        } else {
            log("User is admin/exec, fetching unverified users");
            fetchUnverifiedUsers();
        }
    }, [user]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchUsers();
        await fetchUnverifiedUsers();
        openToast({
            title: "Refreshed!",
            description: "Successfully checked for new users!",
            type: "success"
        });
        setRefreshing(false);
    };

    const fetchUnverifiedUsers = async () => {
        setUnverifiedUsers(users.filter(
            (user: UserObject) =>
                user.role === "unverified"
        ));

        // Apply flagging logic
        // const usersWithFlags = unverifiedUsers.map(
        //     (user: UserObject) => ({
        //         ...user,
        //         flags: getUserFlags(user, users),
        //     })
        // );
        // setUnverifiedUsers(usersWithFlags);
        setIsFiltering(false);
    };

    const getUserFlags = (user: UserObject, allUsers: UserObject[]): UserFlag[] => {
        const combinedFlags: UserFlag[] = user.flags ? [...user.flags] : [];

        if (!user.phone) {
            combinedFlags.push({
                field: "phone",
                issue: "missing",
            });
        }

        if (!user.student_id) {
            combinedFlags.push({
                field: "student_id",
                issue: "missing",
            });
        }

        if (!user.grade) {
            combinedFlags.push({
                field: "grade",
                issue: "missing",
            });
        }

        const duplicateNames = allUsers.filter(
            (u) =>
                u._id !== user._id &&
                u.first_name.toLowerCase() === user.first_name.toLowerCase() &&
                u.last_name.toLowerCase() === user.last_name.toLowerCase()
        );
        if (duplicateNames.length > 0) {
            combinedFlags.push({
                field: "name",
                issue: "duplicate",
                actual: `${user.first_name.toLowerCase()} ${user.last_name.toLowerCase()}`
            });
        }

        const duplicateEmails = allUsers.filter(
            (u) => u._id !== user._id && u.email.toLowerCase() === user.email.toLowerCase()
        );
        if (duplicateEmails.length > 0) {
            combinedFlags.push({
                field: "email",
                issue: "duplicate",
                actual: user.email.toLowerCase()
            });
        }

        if (user.student_id && !/^\d{7}$/.test(user.student_id)) {
            combinedFlags.push({
                field: "student_id",
                issue: "invalid_format",
                actual: user.student_id.toLowerCase()
            });
        }

        return combinedFlags;
    };

    const handleSelectUser = (userId: number) => {
        log("handleSelectUser called", userId);
        setSelectedUsers((prevSelected) => {
            if (prevSelected.includes(userId)) {
                return prevSelected.filter((id) => id !== userId);
            } else {
                return [...prevSelected, userId];
            }
        });
    };

    const confirmVerifyUsers = () => {
        if (selectedUsers.length === 0) {
            openToast({
                title: "No Users Selected",
                description: "Please select at least one user to verify.",
                type: "info",
            });
            return;
        }
        setShowVerifyConfirm(true);
    };

    const handleVerifyUsers = async () => {
        setShowVerifyConfirm(false);
        log("handleVerifyUsers called", selectedUsers);
        const request: QueuedRequest = {
            url: `/api/account/users/verify`,
            method: "post",
            data: { users: selectedUsers },
            retryCount: 0,
            successHandler: async (response: AxiosResponse) => {
                log("handleVerifyUsers successHandler", response.data);
                openToast({
                    title: "Success",
                    description: "Users verified successfully!",
                    type: "success",
                });
                setSelectedUsers([]);
                fetchUnverifiedUsers();
            },
            errorHandler: async (error: AxiosError) => {
                log("handleVerifyUsers errorHandler", error);
                handleErrorWithModalOrToast({
                    actionName: "Verifying users",
                    error,
                    showModal: false,
                    showToast: true,
                    openModal,
                    openToast,
                });
            },
            offlineHandler: async () => {
                log("handleVerifyUsers offlineHandler");
                openToast({
                    title: "Offline",
                    description: "You are offline!",
                    type: "error",
                });
            },
        };

        try {
            await handleRequest(request);
            log("handleVerifyUsers request sent");
        } catch (error) {
            log("handleVerifyUsers exception", error);
        }
    };

    const confirmDeleteUsers = () => {
        if (selectedUsers.length === 0) {
            openToast({
                title: "No Users Selected",
                description: "Please select at least one user to delete.",
                type: "info",
            });
            return;
        }
        setShowDeleteConfirm(true);
    };

    const handleDeleteUsers = async () => {
        setShowDeleteConfirm(false);
        log("handleDeleteUsers called", selectedUsers);

        const request: QueuedRequest = {
            url: `/api/account/users/delete`,
            method: "post",
            data: { users: selectedUsers },
            retryCount: 0,
            successHandler: async (response: AxiosResponse) => {
                log("handleDeleteUsers successHandler", response.data);
                openToast({
                    title: "Success",
                    description: "Users deleted successfully!",
                    type: "success",
                });
                setSelectedUsers([]);
                fetchUnverifiedUsers();
            },
            errorHandler: async (error: AxiosError) => {
                log("handleDeleteUsers errorHandler", error);
                handleErrorWithModalOrToast({
                    actionName: "Deleting users",
                    error,
                    showModal: false,
                    showToast: true,
                    openModal,
                    openToast,
                });
            },
            offlineHandler: async () => {
                log("handleDeleteUsers offlineHandler");
                openToast({
                    title: "Offline",
                    description: "You are offline!",
                    type: "error",
                });
            },
        };

        try {
            await handleRequest(request);
            log("handleDeleteUsers request sent");
        } catch (error) {
            log("handleDeleteUsers exception", error);
        }
    };

    const handleUserRowPress = (user: UserObject) => {
        log("handleUserRowPress called", user);
        setSelectedUserInfo(user);
        setShowUserDialog(true);
    };

    const handleViewFlags = (flags: UserFlag[]) => {
        setFlagsToShow(flags);
        setShowFlagsPortal(true);
    };

    const getFriendlyFlagMessage = (flag: UserFlag) => {
        const fieldMap: { [key: string]: string } = {
            "first_name": "First name",
            "last_name": "Last name",
            "email": "Email",
            "grade": "Grade",
            "student_id": "Student ID",
            "phone": "Phone",
            "name": "Name"
        };

        const fieldDisplay = fieldMap[flag.field] || flag.field.charAt(0).toUpperCase() + flag.field.slice(1);

        if (typeof flag.actual === 'string') {
            flag.actual = flag.actual.toLowerCase();
        }

        if (typeof flag.expected === 'string') {
            flag.expected = flag.expected.toLowerCase();
        }

        const actual = flag.actual;
        const expected = flag.expected;

        switch (flag.issue) {
            case "missing":
                return `${fieldDisplay} is missing.`;
            case "duplicate":
                if (flag.field === "name") {
                    return "Another user has the same name.";
                } else if (flag.field === "email") {
                    return "Another user has the same email address.";
                }
                return `Another user has the same ${fieldDisplay.toLowerCase()}.`;
            case "invalid_format":
                return `${fieldDisplay} "${actual}" is not in the correct format.`;
            default:
                if (expected && actual) {
                    return `${fieldDisplay} "${actual}" does not match "${expected}".`;
                }
                return `${fieldDisplay} has an issue.`;
        }
    };

    const filteredUsersFr = useMemo(() => {
        return unverifiedUsers.filter((u) => {
            const fullName = `${u.first_name} ${u.last_name}`.toLowerCase();
            return (
                fullName.includes(searchQuery.toLowerCase()) ||
                u.subteam.some(st => st.toLowerCase().includes(searchQuery.toLowerCase()))
            );
        });
    }, [unverifiedUsers, searchQuery]);

    const sortedUsers = useMemo(() => {
        if (sortConfig.length === 0) return filteredUsersFr;

        const sorted = [...filteredUsersFr
        ].sort((a, b) => {
            for (const sort of sortConfig) {
                let comparison = 0;
                const { criteria, order } = sort;

                if (criteria === 'name') {
                    const aName = `${a.first_name} ${a.last_name}`.trim().toLowerCase();
                    const bName = `${b.first_name} ${b.last_name}`.trim().toLowerCase();
                    comparison = aName.localeCompare(bName);
                } else if (criteria === 'subteam') {
                    const aSubteam = a.subteam.map(st => st.toLowerCase()).join(", ");
                    const bSubteam = b.subteam.map(st => st.toLowerCase()).join(", ");
                    comparison = aSubteam.localeCompare(bSubteam);
                }

                if (comparison !== 0) {
                    return order === 'asc' ? comparison : -comparison;
                }
            }
            return 0;
        });
        return sorted;
    }, [filteredUsersFr, sortConfig]);

    const updateSortConfig = (criteria: SortCriteria) => {
        setSortConfig((prevConfig) => {
            const existingIndex = prevConfig.findIndex(
                (sort) => sort.criteria === criteria
            );
            let newConfig = [...prevConfig];

            if (existingIndex !== -1) {
                const currentOrder = newConfig[existingIndex].order;
                let newOrder: 'asc' | 'desc' | 'none';

                if (currentOrder === 'asc') {
                    newOrder = 'desc';
                } else if (currentOrder === 'desc') {
                    newOrder = 'none';
                } else {
                    newOrder = 'asc';
                }

                if (newOrder === 'none') {
                    newConfig.splice(existingIndex, 1);
                } else {
                    newConfig[existingIndex].order = newOrder;
                }
            } else {
                newConfig.push({ criteria, order: 'asc' });
            }

            return newConfig;
        });
    };

    const renderSortIndicator = (criteria: SortCriteria) => {
        const sort = sortConfig.find((sort) => sort.criteria === criteria);
        if (!sort || sort.order === 'none') return null;

        return (
            <HStack className="items-center ml-1">
                {sort.order === 'asc' ? (
                    <ChevronUpIcon size={16} />
                ) : (
                    <ChevronDownIcon size={16} />
                )}
            </HStack>
        );
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{
                flex: 1,
                backgroundColor: theme === "light" ? "#FFFFFF" : "#1A202C",
            }}
        >
            <Box className="p-4 flex-1">
                <Input variant="outline" size="md" className="mb-4">
                    <InputField
                        value={searchQuery}
                        onChangeText={(text) => {
                            log('Search query changed', text);
                            setSearchQuery(text);
                        }}
                        placeholder="Search by name or subteam"
                        className={`placeholder-gray-400`}
                    />
                </Input>

                <Box className="rounded-lg overflow-hidden flex-1">
                    <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
                        {/* Table Header */}
                        <View className="flex flex-row bg-headerBackground">
                            {/* Empty cell for alignment */}
                            <View className="w-12 p-2" />
                            <Pressable
                                className="flex-1 p-2 font-medium flex-row items-center justify-center"
                                onPress={() => updateSortConfig('name')}
                            >
                                <Text numberOfLines={1} ellipsizeMode="tail">Name</Text>
                                {renderSortIndicator('name')}
                            </Pressable>
                            <Pressable
                                className="flex-1 p-2 font-medium flex-row items-center justify-center"
                                onPress={() => updateSortConfig('subteam')}
                            >
                                <Text numberOfLines={1} ellipsizeMode="tail">Subteam</Text>
                                {renderSortIndicator('subteam')}
                            </Pressable>
                            <Text className="flex-1 p-2 font-medium text-center" numberOfLines={1} ellipsizeMode="tail">
                                Flags
                            </Text>
                        </View>

                        <Divider className="my-1 bg-outline-300" />

                        {isFiltering ? (
                            <View className="p-3">
                                <Text className="text-center ">Loading users...</Text>
                            </View>
                        ) : sortedUsers.length === 0 ? (
                            <View className="p-3">
                                <Text className="text-center ">
                                    No unverified users found.
                                </Text>
                            </View>
                        ) : (
                            sortedUsers.map((u) => {
                                const nameLower = `${u.first_name.toLowerCase()} ${u.last_name.toLowerCase()}`;
                                const subteamsLower = u.subteam.length > 0 ? u.subteam.map(st => st.toLowerCase()).join(", ") : "none";

                                return (
                                    <View
                                        key={u._id}
                                        className="flex flex-row items-center border-b border-outline"
                                    >
                                        <View className="w-12 p-2 items-center mr-8">
                                            <Checkbox
                                                value={u._id.toString()}
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
                                            style={{ alignItems: 'center' }}
                                        >
                                            <Text
                                                className="flex-1 p-2"
                                                numberOfLines={1}
                                                ellipsizeMode="tail"
                                            >
                                                {nameLower}
                                            </Text>
                                            <Text
                                                className="flex-1"
                                                numberOfLines={1}
                                                ellipsizeMode="tail"
                                            >
                                                {subteamsLower}
                                            </Text>
                                            <View className="flex-1 p-2">
                                                {u.flags && u.flags.length > 0 ? (
                                                    <TouchableOpacity onPress={() => handleViewFlags(u.flags!)}>
                                                        <Text
                                                            className="text-red-500 underline"
                                                            numberOfLines={1}
                                                            ellipsizeMode="tail"
                                                        >
                                                            View Flags ({u.flags.length})
                                                        </Text>
                                                    </TouchableOpacity>
                                                ) : (
                                                    <Text
                                                        className="text-green-500"
                                                        numberOfLines={1}
                                                        ellipsizeMode="tail"
                                                    >
                                                        No flags
                                                    </Text>
                                                )}
                                            </View>
                                        </TouchableOpacity>
                                    </View>
                                );
                            })
                        )}
                    </ScrollView>
                </Box>

                {/* Action Buttons */}
                {/* Action Buttons */}
                <VStack className="mt-4 w-full" space="md">
                    <Button
                        onPress={confirmDeleteUsers}
                        variant="outline"
                        className="w-full"
                    >
                        <ButtonText>Delete Selected Users</ButtonText>
                    </Button>
                    <Button
                        onPress={confirmVerifyUsers}
                        action="primary"
                        className="w-full"
                    >
                        <ButtonText>Verify Selected Users</ButtonText>
                    </Button>
                </VStack>
            </Box>

            {/* Flags Portal */}
            <Portal isOpen={showFlagsPortal} onRequestClose={() => setShowFlagsPortal(false)} className="justify-center items-center">
                <HStack className="border-2 w-11/12 max-w-md py-6 px-4 gap-4 rounded-lg flex-col justify-center items-start bg-background-0">
                    <Text className="text-typography-950 font-bold text-lg mb-2">
                        Flags
                    </Text>
                    <VStack space="sm" className="w-full">
                        {flagsToShow.length > 0 ? (
                            flagsToShow.map((flag, index) => (
                                <Text key={index} className="text-red-500">
                                    • {getFriendlyFlagMessage(flag)}
                                </Text>
                            ))
                        ) : (
                            <Text className="text-green-500">No flags</Text>
                        )}
                    </VStack>
                    <View className="self-end mt-4">
                        <Button variant="outline" onPress={() => setShowFlagsPortal(false)}>
                            <ButtonText>Close</ButtonText>
                        </Button>
                    </View>
                </HStack>
            </Portal>

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
                                    {selectedUserInfo.first_name.toLowerCase()} {selectedUserInfo.last_name.toLowerCase()}
                                </Text>
                                <Text>
                                    <Text className="font-semibold">Email: </Text>
                                    {selectedUserInfo.email.toLowerCase()}
                                </Text>
                                <Text>
                                    <Text className="font-semibold">Phone: </Text>
                                    {selectedUserInfo.phone ? selectedUserInfo.phone.toLowerCase() : "N/A"}
                                </Text>
                                <Text>
                                    <Text className="font-semibold">Student ID: </Text>
                                    {selectedUserInfo.student_id ? selectedUserInfo.student_id.toLowerCase() : "N/A"}
                                </Text>
                                <Text>
                                    <Text className="font-semibold">Grade: </Text>
                                    {selectedUserInfo.grade ? selectedUserInfo.grade.toLowerCase() : "N/A"}
                                </Text>
                                <Text>
                                    <Text className="font-semibold">Subteam(s): </Text>
                                    {selectedUserInfo.subteam && selectedUserInfo.subteam.length > 0
                                        ? selectedUserInfo.subteam.map(st => st.toLowerCase()).join(", ")
                                        : "None"}
                                </Text>
                                <Text>
                                    <Text className="font-semibold">Flags: </Text>
                                    {selectedUserInfo.flags && selectedUserInfo.flags.length > 0 ? (
                                        selectedUserInfo.flags.map((flag: UserFlag, index: number) => (
                                            <Text key={index} className="text-red-500">
                                                {"\n"}• {getFriendlyFlagMessage(flag)}
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

            {/* Confirm Delete Dialog */}
            <AlertDialog
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
            >
                <AlertDialogBackdrop />
                <AlertDialogContent>
                    <AlertDialogHeader className="pb-4">
                        <Text className="text-lg font-semibold">Confirm Deletion</Text>
                    </AlertDialogHeader>
                    <AlertDialogBody>
                        <Text>Are you sure you want to delete the selected users?</Text>
                    </AlertDialogBody>
                    <AlertDialogFooter className="flex justify-end space-x-3 pt-6">
                        <Button variant="outline" onPress={() => setShowDeleteConfirm(false)}>
                            <ButtonText>Cancel</ButtonText>
                        </Button>
                        <Button action="negative" onPress={handleDeleteUsers}>
                            <ButtonText>Delete</ButtonText>
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Confirm Verify Dialog */}
            <AlertDialog
                isOpen={showVerifyConfirm}
                onClose={() => setShowVerifyConfirm(false)}
            >
                <AlertDialogBackdrop />
                <AlertDialogContent>
                    <AlertDialogHeader className="pb-4">
                        <Text className="text-lg font-semibold">Confirm Verification</Text>
                    </AlertDialogHeader>
                    <AlertDialogBody>
                        <Text>Are you sure you want to verify the selected users?</Text>
                    </AlertDialogBody>
                    <AlertDialogFooter className="flex justify-end space-x-3 pt-6">
                        <Button variant="outline" onPress={() => setShowVerifyConfirm(false)}>
                            <ButtonText>Cancel</ButtonText>
                        </Button>
                        <Button action="primary" onPress={handleVerifyUsers}>
                            <ButtonText>Verify</ButtonText>
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </KeyboardAvoidingView>
    );
};

export default VerifyScreen;