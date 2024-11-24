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
import { Menu, MenuItem, MenuItemLabel } from "@/components/ui/menu";
import {
    AlertDialog,
    AlertDialogBackdrop,
    AlertDialogBody,
    AlertDialogContent,
    AlertDialogFooter,
    AlertDialogHeader,
} from "@/components/ui/alert-dialog";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { Text } from "@/components/ui/text";
import { useAuth } from "../../utils/AuthContext";
import { useModal } from "../../utils/ModalProvider";
import ApiClient from "../../utils/APIClient";
import { GRADES, QueuedRequest, SUBTEAMS, UserObject } from "../../Constants";
import { useGlobalToast } from "../../utils/ToastProvider";
import { AxiosError, AxiosResponse } from "axios";
import { CheckIcon, ChevronDownIcon, Icon, ThreeDotsIcon } from "@/components/ui/icon";
import { useThemeContext } from "../../utils/ThemeContext";
import { Divider } from "@/components/ui/divider";
import {
    Select,
    SelectBackdrop,
    SelectContent,
    SelectIcon,
    SelectInput,
    SelectItem,
    SelectPortal,
    SelectTrigger,
} from "@/components/ui/select";
import {
    CheckboxGroup,
    Checkbox,
    CheckboxIndicator,
    CheckboxIcon,
    CheckboxLabel,
} from "@/components/ui/checkbox";

const AdminScreen: React.FC = () => {
    const { user } = useAuth();
    const { showToast } = useGlobalToast();
    const { openModal } = useModal();
    const { colorMode } = useThemeContext();
    const [refreshing, setRefreshing] = useState(false);

    // Logging function
    const log = (...args: any[]) => {
        console.log(`[${new Date().toISOString()}] [AdminScreen]`, ...args);
    };

    const [users, setUsers] = useState<UserObject[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [filteredUsers, setFilteredUsers] = useState<UserObject[]>([]);
    const [editUser, setEditUser] = useState<UserObject | null>(null);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        log('useEffect [user]', user);
        if (user?.role !== "admin") {
            log('User is not admin, opening access denied modal');
            openModal({
                title: "Access Denied",
                message: "You do not have access to this page.",
                type: "error",
            });
        } else {
            log('User is admin, fetching users');
            fetchUsers();
        }
    }, [user]);

    useEffect(() => {
        log('useEffect [searchQuery, users]', { searchQuery, users });
        const query = searchQuery.toLowerCase();
        const filtered = users.filter(
            (user) =>
                user.email.toLowerCase().includes(query) ||
                user.first_name.toLowerCase().includes(query) ||
                user.last_name.toLowerCase().includes(query) ||
                user.role.toLowerCase().includes(query)
        );
        log('Filtered users', filtered);
        setFilteredUsers(filtered);
    }, [searchQuery, users]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchUsers();
        showToast({
            title: "Refreshed!",
            description: "Successfully checked for new users!",
            type: "success"
        })
        setRefreshing(false);
      };    

    const fetchUsers = async () => {
        log('fetchUsers called');
        setIsLoading(true);
        const request: QueuedRequest = {
            url: "/api/account/users",
            method: "get",
            headers: { Authorization: `Bearer ${user?.token}` },
            retryCount: 0,
            successHandler: async (response: AxiosResponse) => {
                log('fetchUsers successHandler', response.data);
                setUsers(response.data.users);
                setFilteredUsers(response.data.users);
                setIsLoading(false);
            },
            errorHandler: async (error: AxiosError) => {
                log('fetchUsers errorHandler', error);
                showToast({
                    title: "Error",
                    description: "Failed to fetch users.",
                    type: "error",
                });
                setIsLoading(false);
            },
            offlineHandler: async () => {
                log('fetchUsers offlineHandler');
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
            log('fetchUsers request sent');
        } catch (error) {
            log('fetchUsers exception', error);
            setIsLoading(false);
        }
    };

    const handleDeleteUser = async (userId: string) => {
        log('handleDeleteUser called', userId);
        const request: QueuedRequest = {
            url: `/api/account/users/${userId}`,
            method: "delete",
            headers: { Authorization: `Bearer ${user?.token}` },
            retryCount: 0,
            successHandler: async (response: AxiosResponse) => {
                log('handleDeleteUser successHandler', response.data);
                showToast({
                    title: "Success",
                    description: "User deleted.",
                    type: "success",
                });
                fetchUsers();
            },
            errorHandler: async (error: AxiosError) => {
                log('handleDeleteUser errorHandler', error);
                showToast({
                    title: "Error",
                    description: "Failed to delete user.",
                    type: "error",
                });
            },
            offlineHandler: async () => {
                log('handleDeleteUser offlineHandler');
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
            log('handleDeleteUser request sent');
        } catch (error) {
            log('handleDeleteUser exception', error);
        }
    };

    const handleEditUser = (user: UserObject) => {
        log('handleEditUser called', user);
        setEditUser(user);
        setShowEditDialog(true);
    };

    const saveEditChanges = async (userId: string) => {
        log('saveEditChanges called', userId);
        if (!editUser) {
            log('No editUser selected');
            showToast({
                title: "Error",
                description: "No user selected for editing.",
                type: "error",
            });
            return;
        }

        const payload: Partial<UserObject> = {};
        const originalUser = users.find((user) => user._id === editUser._id);

        if (!originalUser) {
            log('Original user data not found');
            showToast({
                title: "Error",
                description: "Original user data not found.",
                type: "error",
            });
            return;
        }

        for (const key in editUser) {
            const typedKey = key as keyof UserObject;
            if (editUser[typedKey] !== originalUser[typedKey]) {
                payload[typedKey] = editUser[typedKey];
            }
        }

        log('saveEditChanges payload', payload);

        if (Object.keys(payload).length === 0) {
            log('No changes were made');
            showToast({
                title: "No Changes",
                description: "No changes were made.",
                type: "info",
            });
            setShowEditDialog(false);
            return;
        }

        const request: QueuedRequest = {
            url: `/api/account/users/${userId}`,
            method: "put",
            headers: { Authorization: `Bearer ${user?.token}` },
            data: payload,
            retryCount: 0,
            successHandler: async (response: AxiosResponse) => {
                log('saveEditChanges successHandler', response.data);
                showToast({
                    title: "Success",
                    description: "User edited successfully!",
                    type: "success",
                });
                fetchUsers();
            },
            errorHandler: async (error: AxiosError) => {
                log('saveEditChanges errorHandler', error);
                showToast({
                    title: "Error",
                    description: "Failed to edit user.",
                    type: "error",
                });
            },
            offlineHandler: async () => {
                log('saveEditChanges offlineHandler');
                showToast({
                    title: "Offline",
                    description: "You are offline!",
                    type: "error",
                });
            },
        };

        try {
            await ApiClient.handleNewRequest(request);
            log('saveEditChanges request sent');
        } catch (error) {
            log('saveEditChanges exception', error);
        }

        setShowEditDialog(false);
        fetchUsers();
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
                {/* Search Bar */}
                <TextInput
                    placeholder="Search by name, email, or role"
                    value={searchQuery}
                    onChangeText={(text) => {
                        log('Search query changed', text);
                        setSearchQuery(text);
                    }}
                    className="border rounded-md p-3 mb-4"
                    placeholderTextColor={colorMode === "light" ? "black" : "white"}
                />

                {/* User List */}
                <Box className="rounded-lg overflow-hidden flex-1">
                    <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
                        {/* Table Header */}
                        <View className="flex flex-row bg-headerBackground">
                            <Text className="flex-1 p-3 font-medium">Name</Text>
                            <Text className="flex-1 p-3 font-medium">Email</Text>
                            <Text className="flex-1 p-3 font-medium">Role</Text>
                            <Text className="w-16 p-3 font-medium text-center">⚙️</Text>
                        </View>

                        <Divider className="my-2 bg-outline-300" />

                        {isLoading ? (
                            <View className="p-3">
                                <Text className="text-center ">Loading users...</Text>
                            </View>
                        ) : filteredUsers.length === 0 ? (
                            <View className="p-3">
                                <Text className="text-center ">No users found.</Text>
                            </View>
                        ) : (
                            filteredUsers.map((u) => (
                                <View
                                    key={u._id}
                                    className="flex flex-row items-center border-b border-outline"
                                >
                                    <Text className="flex-1 p-3 ">
                                        {u.first_name}{" "}
                                        {u.last_name ? u.last_name.charAt(0) + "." : ""}
                                    </Text>
                                    <Text className="flex-1 p-3 ">{u.email}</Text>
                                    <Text className="flex-1 p-3 ">{u.role}</Text>
                                    <View className="w-16 p-3 items-center justify-center">
                                        <Menu
                                            trigger={({ ...triggerProps }) => (
                                                <TouchableOpacity {...triggerProps}>
                                                    <Icon as={ThreeDotsIcon} />
                                                </TouchableOpacity>
                                            )}
                                        >
                                            <MenuItem
                                                onPress={() => {
                                                    log('Edit user pressed', u._id);
                                                    handleEditUser(u);
                                                }}
                                            >
                                                <MenuItemLabel>Edit</MenuItemLabel>
                                            </MenuItem>
                                            <MenuItem
                                                onPress={() => {
                                                    log('Delete user pressed', u._id);
                                                    handleDeleteUser(u._id);
                                                }}
                                            >
                                                <MenuItemLabel>Delete</MenuItemLabel>
                                            </MenuItem>
                                        </Menu>
                                    </View>
                                </View>
                            ))
                        )}
                    </ScrollView>
                </Box>

                {/* Edit Dialog */}
                {editUser && (
                    <AlertDialog
                        isOpen={showEditDialog}
                        onClose={() => {
                            log('Edit dialog closed');
                            setShowEditDialog(false);
                        }}
                    >
                        <AlertDialogBackdrop />
                        <AlertDialogContent>
                            <AlertDialogHeader className="pb-4">
                                <Text className="text-lg font-semibold">Edit User</Text>
                            </AlertDialogHeader>
                            <AlertDialogBody>
                                <VStack space="sm">
                                    <TextInput
                                        placeholder="First Name"
                                        value={editUser.first_name}
                                        className="border rounded-md p-3 bg-inputBackground"
                                        onChangeText={(text) => {
                                            log('Edit User first_name changed', text);
                                            setEditUser({ ...editUser, first_name: text });
                                        }}
                                        placeholderTextColor="var(--color-placeholder)"
                                    />
                                    <TextInput
                                        placeholder="Last Name"
                                        value={editUser.last_name}
                                        className="border rounded-md p-3 bg-inputBackground"
                                        onChangeText={(text) => {
                                            log('Edit User last_name changed', text);
                                            setEditUser({ ...editUser, last_name: text });
                                        }}
                                        placeholderTextColor="var(--color-placeholder)"
                                    />
                                    <TextInput
                                        placeholder="Email"
                                        value={editUser.email}
                                        className="border rounded-md p-3 bg-inputBackground"
                                        onChangeText={(text) => {
                                            log('Edit User email changed', text);
                                            setEditUser({ ...editUser, email: text });
                                        }}
                                        placeholderTextColor="var(--color-placeholder)"
                                    />
                                    <TextInput
                                        placeholder="Phone"
                                        value={editUser.phone}
                                        className="border rounded-md p-3 bg-inputBackground"
                                        onChangeText={(text) => {
                                            log('Edit User phone changed', text);
                                            setEditUser({ ...editUser, phone: text });
                                        }}
                                        placeholderTextColor="var(--color-placeholder)"
                                    />
                                    <TextInput
                                        placeholder="Student ID"
                                        value={editUser.student_id}
                                        className="border rounded-md p-3 bg-inputBackground"
                                        onChangeText={(text) => {
                                            log('Edit User student_id changed', text);
                                            setEditUser({ ...editUser, student_id: text });
                                        }}
                                        placeholderTextColor="var(--color-placeholder)"
                                    />
                                    {/* Grade Selector */}
                                    <Select
                                        selectedValue={editUser.grade}
                                        onValueChange={(value) => {
                                            log('Edit User grade changed', value);
                                            setEditUser({ ...editUser, grade: value });
                                        }}
                                    >
                                        <SelectTrigger
                                            variant="outline"
                                            size="md"
                                            className="rounded justify-between"
                                        >
                                            <SelectInput placeholder="Select Grade" />
                                            <SelectIcon as={ChevronDownIcon} className="mr-2" />
                                        </SelectTrigger>
                                        <SelectPortal>
                                            <SelectBackdrop />
                                            <SelectContent>
                                                {GRADES.map((grade) => (
                                                    <SelectItem
                                                        key={grade}
                                                        label={grade}
                                                        value={grade}
                                                    />
                                                ))}
                                            </SelectContent>
                                        </SelectPortal>
                                    </Select>
                                    <Select
                                        selectedValue={editUser.role}
                                        onValueChange={(value: string) => {
                                            log('Edit User role changed', value);
                                            setEditUser({
                                                ...editUser,
                                                role: value as UserObject["role"],
                                            });
                                        }}
                                    >
                                        <SelectTrigger
                                            variant="outline"
                                            size="md"
                                            className="rounded justify-between"
                                        >
                                            <SelectInput placeholder="Select Role" />
                                            <SelectIcon as={ChevronDownIcon} className="mr-2" />
                                        </SelectTrigger>
                                        <SelectPortal>
                                            <SelectBackdrop />
                                            <SelectContent>
                                                <SelectItem label="Unverified" value="unverified" />
                                                <SelectItem label="Member" value="member" />
                                                <SelectItem label="Leadership" value="leadership" />
                                                <SelectItem label="Executive" value="executive" />
                                                <SelectItem label="Advisor" value="advisor" />
                                                <SelectItem label="Admin" value="admin" />
                                            </SelectContent>
                                        </SelectPortal>
                                    </Select>
                                    {/* Subteam Selector */}
                                    <CheckboxGroup
                                        value={editUser.subteam || []}
                                        onChange={(selectedValues: string[]) => {
                                            log('Edit User subteam changed', selectedValues);
                                            setEditUser({
                                                ...editUser,
                                                subteam: selectedValues,
                                            });
                                        }}
                                    >
                                        <VStack space="sm">
                                            {SUBTEAMS.map((team) => (
                                                <Checkbox key={team} value={team.toLowerCase()}>
                                                    <CheckboxIndicator>
                                                        <CheckboxIcon as={CheckIcon} />
                                                    </CheckboxIndicator>
                                                    <CheckboxLabel>{team}</CheckboxLabel>
                                                </Checkbox>
                                            ))}
                                        </VStack>
                                    </CheckboxGroup>
                                    {/* Role Selector */}
                                </VStack>
                            </AlertDialogBody>
                            <AlertDialogFooter className="flex justify-end space-x-3 pt-6">
                                <Button
                                    variant="outline"
                                    onPress={() => {
                                        log('Cancel button pressed in Edit Dialog');
                                        setShowEditDialog(false);
                                    }}
                                >
                                    <ButtonText>Cancel</ButtonText>
                                </Button>
                                <Button
                                    onPress={() => {
                                        log('Save button pressed in Edit Dialog');
                                        saveEditChanges(editUser._id);
                                    }}
                                    action="primary"
                                >
                                    <ButtonText>Save</ButtonText>
                                </Button>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </Box>
        </KeyboardAvoidingView>
    );
};

export default AdminScreen;