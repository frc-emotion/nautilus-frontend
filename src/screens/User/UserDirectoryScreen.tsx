import React, { useState, useEffect, useMemo } from 'react';
import { View, Pressable } from 'react-native';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Button, ButtonText } from '@/components/ui/button';
import { Menu, MenuItem, MenuItemLabel } from '@/components/ui/menu';
import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
} from '@/components/ui/alert-dialog';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { Text } from '@/components/ui/text';
import { useAuth } from '../../utils/Context/AuthContext';
import { GRADES, QueuedRequest, ROLES, UserObject } from '../../Constants';
import { useGlobalToast } from '../../utils/UI/CustomToastProvider';
import { CheckIcon, ChevronDownIcon, ChevronUpIcon, EllipsisVertical } from 'lucide-react-native';
import { Icon } from '@/components/ui/icon';
import { useTheme } from '../../utils/UI/CustomThemeProvider';
import { Divider } from '@/components/ui/divider';
import {
  Select,
  SelectBackdrop,
  SelectContent,
  SelectIcon,
  SelectInput,
  SelectItem,
  SelectPortal,
  SelectTrigger,
  SelectDragIndicatorWrapper,
  SelectDragIndicator,
} from '@/components/ui/select';
import {
  CheckboxGroup,
  Checkbox,
  CheckboxIndicator,
  CheckboxIcon,
  CheckboxLabel,
} from '@/components/ui/checkbox';
import { formatPhoneNumber } from '@/src/utils/Helpers';
import { useUsers } from '@/src/utils/Context/UsersContext';
import { Input, InputField } from '@/components/ui/input';
import { useForm, Controller, FieldErrors } from 'react-hook-form';
import { HStack } from '@/components/ui/hstack';
import { useNavigation } from '@react-navigation/native'; 
import { StackNavigationProp } from '@react-navigation/stack';
import { AxiosError, AxiosResponse } from 'axios';
import { useNetworking } from '@/src/utils/Context/NetworkingContext';

const SUBTEAMS = ["build", "software", "marketing", "electrical", "design"];

interface EditUserFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  student_id: string;
  role: string;
  subteam: string[];
}

type SortCriteria = 'role';

interface SortConfig {
  criteria: SortCriteria;
  order: 'asc' | 'desc' | 'none';
}

const UserDirectoryScreen: React.FC = () => {
  const { handleRequest } = useNetworking();
  const { user } = useAuth();
  const { openToast } = useGlobalToast();
  const { theme } = useTheme();
  const navigation = useNavigation<StackNavigationProp<any>>();
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
    selectedGrade, // Assuming this is still used for filtering
    setSelectedGrade,
    filteredUsers,
  } = useUsers();

  const log = (...args: any[]) => {
    console.log(`[${new Date().toISOString()}] [UserDirectoryScreen]`, ...args);
  };

  const [viewUser, setViewUser] = useState<UserObject | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);

  const [editUserId, setEditUserId] = useState<number | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  // If user role changes then refresh users
  useEffect(() => {
    if (user) {
      fetchUsers();
    }
  }, [user]);

  const { control, handleSubmit, reset, formState: { errors } } = useForm<EditUserFormData>({
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      student_id: '',
      role: '',
      subteam: [],
    },
  });

  const [sortConfig, setSortConfig] = useState<SortConfig[]>([
    { criteria: 'role', order: 'desc' },
  ]);

  const getRoleRank = (role: string): number => {
    const index = ROLES.indexOf(role);
    return index !== -1 ? index : ROLES.length;
  };

  const sortedUsers = useMemo(() => {
    // Exclude unverified users
    const verifiedFilteredUsers = filteredUsers.filter(u => u.role !== 'unverified');

    if (sortConfig.length === 0) return verifiedFilteredUsers;

    const sorted = [...verifiedFilteredUsers].sort((a, b) => {
      for (const sort of sortConfig) {
        let comparison = 0;
        const { criteria, order } = sort;

        if (criteria === 'role') {
          comparison = getRoleRank(a.role) - getRoleRank(b.role);
        }

        if (comparison !== 0) {
          log(`Sorting by ${criteria} in ${order} order: ${a.role} vs ${b.role} => ${comparison}`);
          return order === 'asc' ? comparison : -comparison;
        }
      }
      return 0;
    });
    log('Sorted Users:', sorted);
    return sorted;
  }, [filteredUsers, sortConfig]);

  const handleViewUser = (user: UserObject) => {
    log('handleViewUser called', user);
    setViewUser(user);
    setShowViewDialog(true);
  };

  const handleEditUser = (userToEdit: UserObject) => {
    log('handleEditUser called', userToEdit);
    setEditUserId(userToEdit._id);
    reset({
      first_name: userToEdit.first_name,
      last_name: userToEdit.last_name,
      email: userToEdit.email,
      phone: userToEdit.phone,
      student_id: userToEdit.student_id,
      role: userToEdit.role,
      subteam: userToEdit.subteam,
    });
    setShowEditDialog(true);
  };

  const handleChangePassword = async (userToEdit: UserObject) => {
    log('handleChangePassword called', userToEdit._id);
    // navigation.navigate('ForgotPasswordScreen', { token: 'hi' });
    // log(userToEdit.token);
    const payload = userToEdit;
    //                {
    //             // "user" : {
    //             //   "_id":userToEdit._id,
    //             //   "role":userToEdit.role,
    //             // },
    //         };
    
    console.log("Payload for API:", payload);
    
    const request: QueuedRequest = {
        url: "/api/auth/jwt",
        method: "post",
        data: payload,
        retryCount: 0,
        successHandler: async (response: AxiosResponse) => {
          const jwt = response.data;
          // log(jwt);
          navigation.replace("RoleBasedTabs", {token:jwt.toString(), email:userToEdit.email, admin:true});
            // openModal({
            //     title: "Success",
            //     message: "Your password has been reset successfully.",
            //     type: "success",
            // });

            // navigation.replace("NotLoggedInTabs", {});
        },
        errorHandler: async (error: AxiosError) => {
            console.error("Token creation failed:", error);

            // handleErrorWithModalOrToast({
            //     actionName: "Update password",
            //     error,
            //     showModal: true,
            //     showToast: true,
            //     openModal,
            //     openToast,
            // });
        },
        offlineHandler: async () => {
            openToast({
                title: "Offline",
                description: "Password request saved. It will be processed when you're back online.",
                type: "info",
            });

            // openModal({
            //     title: "Offline",
            //     message: "Reset request saved. It will be processed when you're back online.",
            //     type: "info",
            // });
        }
    };

    try {
        await handleRequest(request);
    } catch (error: any) {
        console.error("Error during change:", error);
        openToast({
            title: "Error",
            description: "An error occurred while attempting to change the password. Please report this.",
            type: "error",
        });
    }
  }

  const handleDeleteUser = (userId: number) => {
    log('handleDeleteUser called', userId);
    // Optionally, confirm deletion with a dialog
    deleteUser(userId);
  };

  const saveEditChanges = handleSubmit(async (data: EditUserFormData) => {
    if (editUserId === null) {
      log('No user selected for editing');
      openToast({
        title: 'Error',
        description: 'No user selected for editing.',
        type: 'error',
      });
      return;
    }

    const originalUser = users.find((u) => u._id === editUserId);

    if (!originalUser) {
      log('Original user data not found');
      openToast({
        title: 'Error',
        description: 'Original user data not found.',
        type: 'error',
      });
      return;
    }

    const updates: Partial<UserObject> = {};

    for (const key in data) {
      const typedKey = key as keyof EditUserFormData;
      if (data[typedKey] !== originalUser[typedKey]) {
        updates[typedKey] = data[typedKey];
      }
    }

    log('saveEditChanges payload', updates);

    if (Object.keys(updates).length === 0) {
      log('No changes were made');
      openToast({
        title: 'No Changes',
        description: 'No changes were made.',
        type: 'info',
      });
      setShowEditDialog(false);
      return;
    }

    try {
      await editUser(editUserId, updates);
      openToast({
        title: 'Success',
        description: 'User details updated successfully.',
        type: 'success',
      });
    } catch (error) {
      log('saveEditChanges exception', error);
      openToast({
        title: 'Error',
        description: 'Failed to update user details.',
        type: 'error',
      });
    }

    setShowEditDialog(false);
  }, (validationErrors: FieldErrors) => {
    log('Validation errors:', validationErrors);
    const firstError = Object.values(validationErrors)[0];
    if (firstError && 'message' in firstError) {
      openToast({
        title: 'Validation Error',
        description: (firstError as { message: string }).message,
        type: 'error',
      });
    }
  });

  const handleRefresh = async () => {
    log('handleRefresh called');
    try {
      await fetchUsers();
      openToast({
        title: 'Refreshed!',
        description: 'Successfully fetched users!',
        type: 'success',
      });
    } catch (error) {
      log('handleRefresh exception', error);
      openToast({
        title: 'Error',
        description: 'Failed to fetch users.',
        type: 'error',
      });
    }
  };

  const updateSortConfig = (criteria: SortCriteria) => {
    log(`updateSortConfig called with criteria: ${criteria}`);
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
          log(`Removing sort criteria: ${criteria}`);
          newConfig.splice(existingIndex, 1);
        } else {
          log(`Updating sort criteria: ${criteria} to ${newOrder}`);
          newConfig[existingIndex].order = newOrder;
        }
      } else {
        log(`Adding new sort criteria: ${criteria} with order asc`);
        newConfig.push({ criteria, order: 'asc' });
      }

      log('New sortConfig:', newConfig);
      return newConfig;
    });
  };

  const renderSortIndicator = (criteria: SortCriteria) => {
    const sort = sortConfig.find((sort) => sort.criteria === criteria);
    if (!sort || sort.order === 'none') return null;

    return (
      <HStack className="flex-row items-center ml-1">
        {sort.order === 'asc' ? (
          <ChevronUpIcon color={theme === 'light' ? "black" : "white"} size={16} />
        ) : (
          <ChevronDownIcon color={theme === 'light' ? "black" : "white"} size={16} />
        )}
      </HStack>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={80}
      style={{ flex: 1, backgroundColor: theme === 'light' ? '#FFFFFF' : '#1A202C' }}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />
        }
      >
        <Box className="p-4 flex-1">
          {/* Search Bar */}
          {['admin', 'executive', 'advisor'].includes(user?.role ?? '') && (
            <Input variant="outline" size="md" className="mb-4">
              <InputField
                value={searchQuery}
                onChangeText={(text) => {
                  log('Search query changed', text);
                  setSearchQuery(text);
                }}
                placeholder="Search by name, email, or role"
                className={`placeholder-gray-400`}
              />
            </Input>
          )}

          {/* Filters */}
          <View className="mb-4">
            <View className="flex flex-row flex-wrap justify-between">
              <View className="flex-1 min-w-[45%] mb-2 mr-2">
                <Select
                  selectedValue={selectedSubteam}
                  onValueChange={(itemValue) => {
                    log('Subteam filter changed to:', itemValue);
                    setSelectedSubteam(itemValue);
                  }}
                >
                  <SelectTrigger variant="outline" size="md" className="mb-2 justify-between">
                    <SelectInput placeholder="Subteam" />
                    <SelectIcon className='mr-2' as={ChevronDownIcon} />
                  </SelectTrigger>
                  <SelectPortal>
                    <SelectBackdrop />
                    <SelectContent>
                      <SelectDragIndicatorWrapper>
                        <SelectDragIndicator />
                      </SelectDragIndicatorWrapper>
                      <SelectItem label="All Subteams" value="" />
                      {SUBTEAMS.map((subteam) => (
                        <SelectItem key={subteam} label={subteam.charAt(0).toUpperCase() + subteam.slice(1)} value={subteam} />
                      ))}
                    </SelectContent>
                  </SelectPortal>
                </Select>
              </View>

              <View className="flex-1 min-w-[45%] mb-2">
                <Select
                  selectedValue={selectedGrade}
                  onValueChange={(itemValue) => {
                    log('Grade filter changed to:', itemValue);
                    setSelectedGrade(itemValue);
                  }}
                >
                  <SelectTrigger variant="outline" size="md" className="mb-2 justify-between">
                    <SelectInput placeholder="Grade" />
                    <SelectIcon as={ChevronDownIcon} />
                  </SelectTrigger>
                  <SelectPortal>
                    <SelectBackdrop />
                    <SelectContent>
                      <SelectDragIndicatorWrapper>
                        <SelectDragIndicator />
                      </SelectDragIndicatorWrapper>
                      <SelectItem label="All Grades" value="" />
                      {GRADES.map((grade) => (
                        <SelectItem key={grade} label={grade} value={grade} />
                      ))}
                    </SelectContent>
                  </SelectPortal>
                </Select>
              </View>
            </View>
          </View>

          {/* User Table Header */}
          <View className="flex flex-row p-2 rounded mb-1">
            <View className="flex-1 items-center justify-center">
              <Text className="font-medium">First Name</Text>
            </View>

            <View className="flex-1 items-center justify-center">
              <Text className="font-medium">Last Name</Text>
            </View>

            {/* <Pressable
              onPress={() => updateSortConfig('role')}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
            >
              <HStack className="flex-row items-center">
                <Text className="font-medium">Role</Text>
                {renderSortIndicator('role')}
              </HStack>
            </Pressable> */}

            <View className="flex-1 items-center justify-center">
              <Text className="font-medium">Role</Text>
            </View>

            {/* {user?.role === 'admin' && (
              <View className="flex-1 items-center justify-center">
                <Text className="font-medium">Actions</Text>
              </View>
            )} */}
          </View>

          <Divider className="my-1" />

          {/* User List */}
          {isLoading ? (
            <View className="p-3">
              <Text className="text-center">Loading users...</Text>
            </View>
          ) : sortedUsers.length === 0 ? (
            <View className="p-3">
              <Text className="text-center">No users found.</Text>
            </View>
          ) : (
            sortedUsers.map((userItem) => (
              <Pressable
                key={userItem._id}
                onPress={() => handleViewUser(userItem)}
              >
                <View className={`flex flex-row items-center border-b ${theme === 'light' ? 'border-gray-300' : 'border-gray-600'}`}>
                  <Text
                    className="p-2 flex-1 text-center"
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {userItem.first_name}
                  </Text>
                  <Text
                    className="p-2 flex-1 text-center"
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {userItem.last_name}
                  </Text>
                  <Text
                    className="p-2 flex-1 text-center"
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {userItem.role.charAt(0).toUpperCase() + userItem.role.slice(1)}
                  </Text>
                  {user?.role === 'admin' && (
                    <View className="p-2 items-center justify-center w-10">
                      <Menu
                        trigger={({ ...triggerProps }) => (
                          <Pressable {...triggerProps}>
                            <Icon as={EllipsisVertical} />
                          </Pressable>
                        )}
                      >
                        <MenuItem
                          onPress={() => {
                            log('Edit user pressed', userItem._id);
                            handleEditUser(userItem);
                          }}
                        >
                          <MenuItemLabel>Edit</MenuItemLabel>
                        </MenuItem>
                        <MenuItem
                          onPress={() => {
                            log('Change password pressed', userItem._id);
                            handleChangePassword(userItem);
                          }}
                        >
                          <MenuItemLabel>Password</MenuItemLabel>
                        </MenuItem>
                        <MenuItem
                          onPress={() => {
                            log('Delete user pressed', userItem._id);
                            handleDeleteUser(userItem._id);
                          }}
                        >
                          <MenuItemLabel>Delete</MenuItemLabel>
                        </MenuItem>
                      </Menu>
                    </View>
                  )}
                </View>
              </Pressable>
            ))
          )}

          {/* View User Dialog */}
          {viewUser && showViewDialog && (
            <AlertDialog
              isOpen={showViewDialog}
              onClose={() => {
                log('View user dialog closed');
                setShowViewDialog(false);
              }}
            >
              <AlertDialogBackdrop />
              <AlertDialogContent className="w-11/12 max-w-2xl">
                <AlertDialogHeader className="pb-4">
                  <Text className="text-lg font-semibold">User Details</Text>
                </AlertDialogHeader>
                <AlertDialogBody>
                  <VStack space="sm">
                    <View className="flex flex-row justify-between mb-2">
                      <View className="flex-1 mr-1">
                        <Text className="font-medium">First Name:</Text>
                        <Text>{viewUser.first_name}</Text>
                      </View>
                      <View className="flex-1 ml-1">
                        <Text className="font-medium">Last Name:</Text>
                        <Text>{viewUser.last_name}</Text>
                      </View>
                    </View>

                    <View className="flex flex-row justify-between mb-2">
                      <View className="flex-1 mr-1">
                        <Text className="font-medium">Role:</Text>
                        <Text>{viewUser.role.charAt(0).toUpperCase() + viewUser.role.slice(1)}</Text>
                      </View>
                      <View className="flex-1 ml-1">
                        <Text className="font-medium">Subteam(s):</Text>
                        <Text>{viewUser.subteam.map(st => st.charAt(0).toUpperCase() + st.slice(1)).join(', ')}</Text>
                      </View>
                    </View>

                    {['admin', 'executive'].includes(user?.role ?? '') && (
                      <>
                        <View className="flex flex-row justify-between mb-2">
                          <View className="flex-1 mr-1">
                            <Text className="font-medium">Email:</Text>
                            <Text>{viewUser.email}</Text>
                          </View>
                          <View className="flex-1 ml-1">
                            <Text className="font-medium">Phone:</Text>
                            <Text>{formatPhoneNumber(viewUser.phone)}</Text>
                          </View>
                        </View>

                        <View className="mb-2">
                          <Text className="font-medium">Student ID:</Text>
                          <Text>{viewUser.student_id}</Text>
                        </View>
                      </>
                    )}
                  </VStack>
                </AlertDialogBody>
                <AlertDialogFooter className="flex justify-end space-x-3 pt-6">
                  <Button
                    onPress={() => {
                      log('Close button pressed in View Dialog');
                      setShowViewDialog(false);
                    }}
                  >
                    <ButtonText>Close</ButtonText>
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {/* Edit User Dialog */}
          {showEditDialog && (
            <AlertDialog
              isOpen={showEditDialog}
              onClose={() => {
                log('Edit dialog closed');
                setShowEditDialog(false);
              }}
            >
              <AlertDialogBackdrop />
              <AlertDialogContent className="w-11/12 max-w-3xl">
                <AlertDialogHeader className="pb-4">
                  <Text className="text-lg font-semibold">Edit User</Text>
                </AlertDialogHeader>
                <AlertDialogBody>
                  <ScrollView>
                    <VStack space="sm">
                      <View className="flex flex-row flex-wrap justify-between">
                        <View className="flex-1 mr-1">
                          <Text className="font-medium">First Name</Text>
                          <Controller
                            control={control}
                            name="first_name"
                            rules={{ required: 'First Name is required' }}
                            render={({ field: { onChange, value }, fieldState: { error } }) => (
                              <>
                                <Input variant="outline" size="md" className="mt-1">
                                  <InputField
                                    value={value}
                                    onChangeText={onChange}
                                    placeholder="First Name"
                                    className={`placeholder-gray-400`}
                                  />
                                </Input>
                                {error && <Text className="text-red-500">{error.message}</Text>}
                              </>
                            )}
                          />
                        </View>
                        <View className="flex-1 ml-1">
                          <Text className="font-medium">Last Name</Text>
                          <Controller
                            control={control}
                            name="last_name"
                            rules={{ required: 'Last Name is required' }}
                            render={({ field: { onChange, value }, fieldState: { error } }) => (
                              <>
                                <Input variant="outline" size="md" className="mt-1">
                                  <InputField
                                    value={value}
                                    onChangeText={onChange}
                                    placeholder="Last Name"
                                    className={`placeholder-gray-400`}
                                  />
                                </Input>
                                {error && <Text className="text-red-500">{error.message}</Text>}
                              </>
                            )}
                          />
                        </View>
                      </View>

                      <View className="flex flex-row flex-wrap justify-between mt-4">
                        <View className="flex-1 mr-1">
                          <Text className="font-medium">Email</Text>
                          <Controller
                            control={control}
                            name="email"
                            rules={{
                              required: 'Email is required',
                              pattern: {
                                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                                message: 'Invalid Email',
                              },
                            }}
                            render={({ field: { onChange, value }, fieldState: { error } }) => (
                              <>
                                <Input variant="outline" size="md" className="mt-1">
                                  <InputField
                                    value={value}
                                    onChangeText={onChange}
                                    placeholder="Email"
                                    keyboardType="email-address"
                                    className={`placeholder-gray-400`}
                                  />
                                </Input>
                                {error && <Text className="text-red-500">{error.message}</Text>}
                              </>
                            )}
                          />
                        </View>
                        <View className="flex-1 ml-1">
                          <Text className="font-medium">Phone</Text>
                          <Controller
                            control={control}
                            name="phone"
                            rules={{
                              required: 'Phone Number is required',
                              pattern: {
                                value: /^\(\d{3}\)\s\d{3}-\d{4}$/,
                                message: 'Phone Number must be in the format (123) 456-7890',
                              },
                            }}
                            render={({ field: { onChange, value }, fieldState: { error } }) => (
                              <>
                                <Input variant="outline" size="md" className="mt-1">
                                  <InputField
                                    value={value}
                                    onChangeText={(text) => {
                                      const formattedText = formatPhoneNumber(text);
                                      onChange(formattedText);
                                    }}
                                    placeholder="Phone"
                                    keyboardType="phone-pad"
                                    maxLength={14}
                                    className={`placeholder-gray-400`}
                                  />
                                </Input>
                                {error && <Text className="text-red-500">{error.message}</Text>}
                              </>
                            )}
                          />
                        </View>
                      </View>

                      <View className="flex flex-row flex-wrap justify-between mt-4">
                        <View className="flex-1 mr-1">
                          <Text className="font-medium">Student ID</Text>
                          <Controller
                            control={control}
                            name="student_id"
                            rules={{
                              required: 'Student ID is required',
                              pattern: {
                                value: /^\d{7}$/,
                                message: 'Student ID must be 7 digits',
                              },
                            }}
                            render={({ field: { onChange, value }, fieldState: { error } }) => (
                              <>
                                <Input variant="outline" size="md" className="mt-1">
                                  <InputField
                                    value={value}
                                    onChangeText={onChange}
                                    placeholder="Student ID"
                                    keyboardType="numeric"
                                    maxLength={7}
                                    className={`placeholder-gray-400`}
                                  />
                                </Input>
                                {error && <Text className="text-red-500">{error.message}</Text>}
                              </>
                            )}
                          />
                        </View>
                        {/* Removed Grade field */}
                        <View className="flex-1 ml-1">
                          <Text className="font-medium">Role</Text>
                          <Controller
                            control={control}
                            name="role"
                            rules={{ required: 'Role is required' }}
                            render={({ field: { onChange, value }, fieldState: { error } }) => (
                              <>
                                <Select
                                  selectedValue={value}
                                  onValueChange={onChange}
                                >
                                  <SelectTrigger
                                    variant="outline"
                                    size="md"
                                    className="mt-1 rounded justify-between"
                                  >
                                    <SelectInput placeholder="Select Role" />
                                    <SelectIcon as={ChevronDownIcon} />
                                  </SelectTrigger>
                                  <SelectPortal>
                                    <SelectBackdrop />
                                    <SelectContent>
                                      <SelectDragIndicatorWrapper>
                                        <SelectDragIndicator />
                                      </SelectDragIndicatorWrapper>
                                      {ROLES.map((role) => (
                                        <SelectItem key={role} label={role.charAt(0).toUpperCase() + role.slice(1)} value={role} />
                                      ))}
                                    </SelectContent>
                                  </SelectPortal>
                                </Select>
                                {error && <Text className="text-red-500">{error.message}</Text>}
                              </>
                            )}
                          />
                        </View>
                      </View>

                      <View className="mt-4">
                        <Text className="font-medium">Subteams</Text>
                        <Controller
                          control={control}
                          name="subteam"
                          rules={{ required: 'At least one subteam is required' }}
                          render={({ field: { onChange, value }, fieldState: { error } }) => (
                            <>
                              <CheckboxGroup
                                value={value || []}
                                onChange={onChange}
                              >
                                <View className="flex flex-row flex-wrap">
                                  {SUBTEAMS.map((team) => (
                                    <View key={team} className="w-1/2 mb-2 mr-2">
                                      <Checkbox value={team} className="flex-row items-center">
                                        <CheckboxIndicator className="mr-2">
                                          <CheckboxIcon as={CheckIcon} />
                                        </CheckboxIndicator>
                                        <CheckboxLabel>
                                          {team.charAt(0).toUpperCase() + team.slice(1)}
                                        </CheckboxLabel>
                                      </Checkbox>
                                    </View>
                                  ))}
                                </View>
                              </CheckboxGroup>
                              {error && <Text className="text-red-500">{error.message}</Text>}
                            </>
                          )}
                        />
                      </View>
                    </VStack>
                  </ScrollView>
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
                    onPress={saveEditChanges}
                    action="primary"
                  >
                    <ButtonText>Save</ButtonText>
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </Box>
      </ScrollView>

      {/* View User Dialog */}
      {viewUser && showViewDialog && (
        <AlertDialog
          isOpen={showViewDialog}
          onClose={() => {
            log('View user dialog closed');
            setShowViewDialog(false);
          }}
        >
          <AlertDialogBackdrop />
          <AlertDialogContent className="w-11/12 max-w-2xl">
            <AlertDialogHeader className="pb-4">
              <Text className="text-lg font-semibold">User Details</Text>
            </AlertDialogHeader>
            <AlertDialogBody>
              <VStack space="sm">
                <View className="flex flex-row justify-between mb-2">
                  <View className="flex-1 mr-1">
                    <Text className="font-medium">First Name:</Text>
                    <Text>{viewUser.first_name}</Text>
                  </View>
                  <View className="flex-1 ml-1">
                    <Text className="font-medium">Last Name:</Text>
                    <Text>{viewUser.last_name}</Text>
                  </View>
                </View>

                <View className="flex flex-row justify-between mb-2">
                  <View className="flex-1 mr-1">
                    <Text className="font-medium">Role:</Text>
                    <Text>{viewUser.role.charAt(0).toUpperCase() + viewUser.role.slice(1)}</Text>
                  </View>
                  <View className="flex-1 ml-1">
                    <Text className="font-medium">Subteam(s):</Text>
                    <Text>{viewUser.subteam.map(st => st.charAt(0).toUpperCase() + st.slice(1)).join(', ')}</Text>
                  </View>
                </View>

                {['admin', 'executive'].includes(user?.role ?? '') && (
                  <>
                    <View className="flex flex-row justify-between mb-2">
                      <View className="flex-1 mr-1">
                        <Text className="font-medium">Email:</Text>
                        <Text>{viewUser.email}</Text>
                      </View>
                      <View className="flex-1 ml-1">
                        <Text className="font-medium">Phone:</Text>
                        <Text>{formatPhoneNumber(viewUser.phone)}</Text>
                      </View>
                    </View>

                    <View className="mb-2">
                      <Text className="font-medium">Student ID:</Text>
                      <Text>{viewUser.student_id}</Text>
                    </View>
                  </>
                )}
              </VStack>
            </AlertDialogBody>
            <AlertDialogFooter className="flex justify-end space-x-3 pt-6">
              <Button
                onPress={() => {
                  log('Close button pressed in View Dialog');
                  setShowViewDialog(false);
                }}
              >
                <ButtonText>Close</ButtonText>
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Edit User Dialog */}
      {showEditDialog && (
        <AlertDialog
          isOpen={showEditDialog}
          onClose={() => {
            log('Edit dialog closed');
            setShowEditDialog(false);
          }}
        >
          <AlertDialogBackdrop />
          <AlertDialogContent className="w-11/12 max-w-3xl">
            <AlertDialogHeader className="pb-4">
              <Text className="text-lg font-semibold">Edit User</Text>
            </AlertDialogHeader>
            <AlertDialogBody>
              <ScrollView>
                <VStack space="sm">
                  <View className="flex flex-row flex-wrap justify-between">
                    <View className="flex-1 mr-1">
                      <Text className="font-medium">First Name</Text>
                      <Controller
                        control={control}
                        name="first_name"
                        rules={{ required: 'First Name is required' }}
                        render={({ field: { onChange, value }, fieldState: { error } }) => (
                          <>
                            <Input variant="outline" size="md" className="mt-1">
                              <InputField
                                value={value}
                                onChangeText={onChange}
                                placeholder="First Name"
                                className={`placeholder-gray-400`}
                              />
                            </Input>
                            {error && <Text className="text-red-500">{error.message}</Text>}
                          </>
                        )}
                      />
                    </View>
                    <View className="flex-1 ml-1">
                      <Text className="font-medium">Last Name</Text>
                      <Controller
                        control={control}
                        name="last_name"
                        rules={{ required: 'Last Name is required' }}
                        render={({ field: { onChange, value }, fieldState: { error } }) => (
                          <>
                            <Input variant="outline" size="md" className="mt-1">
                              <InputField
                                value={value}
                                onChangeText={onChange}
                                placeholder="Last Name"
                                className={`placeholder-gray-400`}
                              />
                            </Input>
                            {error && <Text className="text-red-500">{error.message}</Text>}
                          </>
                        )}
                      />
                    </View>
                  </View>

                  <View className="flex flex-row flex-wrap justify-between mt-4">
                    <View className="flex-1 mr-1">
                      <Text className="font-medium">Email</Text>
                      <Controller
                        control={control}
                        name="email"
                        rules={{
                          required: 'Email is required',
                          pattern: {
                            value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                            message: 'Invalid Email',
                          },
                        }}
                        render={({ field: { onChange, value }, fieldState: { error } }) => (
                          <>
                            <Input variant="outline" size="md" className="mt-1">
                              <InputField
                                value={value}
                                onChangeText={onChange}
                                placeholder="Email"
                                keyboardType="email-address"
                                className={`placeholder-gray-400`}
                              />
                            </Input>
                            {error && <Text className="text-red-500">{error.message}</Text>}
                          </>
                        )}
                      />
                    </View>
                    <View className="flex-1 ml-1">
                      <Text className="font-medium">Phone</Text>
                      <Controller
                        control={control}
                        name="phone"
                        rules={{
                          required: 'Phone Number is required',
                          pattern: {
                            value: /^\(\d{3}\)\s\d{3}-\d{4}$/,
                            message: 'Phone Number must be in the format (123) 456-7890',
                          },
                        }}
                        render={({ field: { onChange, value }, fieldState: { error } }) => (
                          <>
                            <Input variant="outline" size="md" className="mt-1">
                              <InputField
                                value={value}
                                onChangeText={(text) => {
                                  const formattedText = formatPhoneNumber(text);
                                  onChange(formattedText);
                                }}
                                placeholder="Phone"
                                keyboardType="phone-pad"
                                maxLength={14}
                                className={`placeholder-gray-400`}
                              />
                            </Input>
                            {error && <Text className="text-red-500">{error.message}</Text>}
                          </>
                        )}
                      />
                    </View>
                  </View>

                  <View className="flex flex-row flex-wrap justify-between mt-4">
                    <View className="flex-1 mr-1">
                      <Text className="font-medium">Student ID</Text>
                      <Controller
                        control={control}
                        name="student_id"
                        rules={{
                          required: 'Student ID is required',
                          pattern: {
                            value: /^\d{7}$/,
                            message: 'Student ID must be 7 digits',
                          },
                        }}
                        render={({ field: { onChange, value }, fieldState: { error } }) => (
                          <>
                            <Input variant="outline" size="md" className="mt-1">
                              <InputField
                                value={value}
                                onChangeText={onChange}
                                placeholder="Student ID"
                                keyboardType="numeric"
                                maxLength={7}
                                className={`placeholder-gray-400`}
                              />
                            </Input>
                            {error && <Text className="text-red-500">{error.message}</Text>}
                          </>
                        )}
                      />
                    </View>
                    {/* Removed Grade field */}
                    <View className="flex-1 ml-1">
                      <Text className="font-medium">Role</Text>
                      <Controller
                        control={control}
                        name="role"
                        rules={{ required: 'Role is required' }}
                        render={({ field: { onChange, value }, fieldState: { error } }) => (
                          <>
                            <Select
                              selectedValue={value}
                              onValueChange={onChange}
                            >
                              <SelectTrigger
                                variant="outline"
                                size="md"
                                className="mt-1 rounded justify-between"
                              >
                                <SelectInput placeholder="Select Role" />
                                <SelectIcon as={ChevronDownIcon} />
                              </SelectTrigger>
                              <SelectPortal>
                                <SelectBackdrop />
                                <SelectContent>
                                  <SelectDragIndicatorWrapper>
                                    <SelectDragIndicator />
                                  </SelectDragIndicatorWrapper>
                                  {ROLES.map((role) => (
                                    <SelectItem key={role} label={role.charAt(0).toUpperCase() + role.slice(1)} value={role} />
                                  ))}
                                </SelectContent>
                              </SelectPortal>
                            </Select>
                            {error && <Text className="text-red-500">{error.message}</Text>}
                          </>
                        )}
                      />
                    </View>
                  </View>

                  <View className="mt-4">
                    <Text className="font-medium">Subteams</Text>
                    <Controller
                      control={control}
                      name="subteam"
                      rules={{ required: 'At least one subteam is required' }}
                      render={({ field: { onChange, value }, fieldState: { error } }) => (
                        <>
                          <CheckboxGroup
                            value={value || []}
                            onChange={onChange}
                          >
                            <View className="flex flex-row flex-wrap">
                              {SUBTEAMS.map((team) => (
                                <View key={team} className="w-1/2 mb-2 mr-2">
                                  <Checkbox value={team} className="flex-row items-center">
                                    <CheckboxIndicator className="mr-2">
                                      <CheckboxIcon as={CheckIcon} />
                                    </CheckboxIndicator>
                                    <CheckboxLabel>
                                      {team.charAt(0).toUpperCase() + team.slice(1)}
                                    </CheckboxLabel>
                                  </Checkbox>
                                </View>
                              ))}
                            </View>
                          </CheckboxGroup>
                          {error && <Text className="text-red-500">{error.message}</Text>}
                        </>
                      )}
                    />
                  </View>
                </VStack>
              </ScrollView>
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
                onPress={saveEditChanges}
                action="primary"
              >
                <ButtonText>Save</ButtonText>
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </KeyboardAvoidingView>
  );
};

export default UserDirectoryScreen;