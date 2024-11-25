// src/screens/UserDirectoryScreen.tsx

import React, { useEffect, useState } from 'react';
import {
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  TouchableOpacity,
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
import { useAuth } from '../../utils/AuthContext';
import { useModal } from '../../utils/UI/CustomModalProvider';
import ApiClient from '../../utils/Networking/APIClient';
import {
  GRADES,
  SUBTEAMS,
  ROLES,
  UserObject,
} from '../../Constants';
import { useGlobalToast } from '../../utils/UI/CustomToastProvider';
import { AxiosError, AxiosResponse } from 'axios';
import {
  CheckIcon,
  ChevronDownIcon,
  Icon,
  ThreeDotsIcon,
} from '@/components/ui/icon';
import { useThemeContext } from '../../utils/UI/CustomThemeProvider';
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
import { useUsers } from '@/src/utils/UsersContext';

const UserDirectoryScreen: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useGlobalToast();
  const { openModal } = useModal();
  const { colorMode } = useThemeContext();
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
    filteredUsers 
  } = useUsers(); // Use UsersContext

  // Logging function
  const log = (...args: any[]) => {
    console.log(`[${new Date().toISOString()}] [UserDirectoryScreen]`, ...args);
  };

  // State for viewing user details
  const [viewUser, setViewUser] = useState<UserObject | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);

  // Admin-specific states
  const [editUserState, setEditUserState] = useState<UserObject | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const handleViewUser = (user: UserObject) => {
    log('handleViewUser called', user);
    setViewUser(user);
    setShowViewDialog(true);
  };

  const handleEditUser = (user: UserObject) => {
    log('handleEditUser called', user);
    setEditUserState(user);
    setShowEditDialog(true);
  };

  const handleDeleteUser = async (userId: number) => {
    log('handleDeleteUser called', userId);
    try {
      await deleteUser(userId);
    } catch (error) {
      log('handleDeleteUser exception', error);
    }
  };

  const saveEditChanges = async (userId: number) => {
    log('saveEditChanges called', userId);
    if (!editUserState) {
      log('No editUser selected');
      showToast({
        title: 'Error',
        description: 'No user selected for editing.',
        type: 'error',
      });
      return;
    }

    const updates: Partial<UserObject> = {};
    const originalUser = users.find((u) => u._id === editUserState._id);

    if (!originalUser) {
      log('Original user data not found');
      showToast({
        title: 'Error',
        description: 'Original user data not found.',
        type: 'error',
      });
      return;
    }

    for (const key in editUserState) {
      const typedKey = key as keyof UserObject;
      if (editUserState[typedKey] !== originalUser[typedKey]) {
        updates[typedKey] = editUserState[typedKey];
      }
    }

    log('saveEditChanges payload', updates);

    if (Object.keys(updates).length === 0) {
      log('No changes were made');
      showToast({
        title: 'No Changes',
        description: 'No changes were made.',
        type: 'info',
      });
      setShowEditDialog(false);
      return;
    }

    try {
      await editUser(userId, updates);
    } catch (error) {
      log('saveEditChanges exception', error);
    }

    setShowEditDialog(false);
  };

  const handleRefresh = async () => {
    log('handleRefresh called');
    try {
      await fetchUsers();
      showToast({
        title: 'Refreshed!',
        description: 'Successfully fetched users!',
        type: 'success',
      });
    } catch (error) {
      log('handleRefresh exception', error);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{
        flex: 1,
        backgroundColor: colorMode === 'light' ? '#FFFFFF' : '#1A202C',
      }}
    >
      <Box className="p-4 flex-1">
        {/* Search Bar (only for admins) */}
        {["admin", "executive", "advisor"].includes(user?.role ?? "") && (
          <TextInput
            placeholder="Search by name, email, or role"
            value={searchQuery}
            onChangeText={(text) => {
              log('Search query changed', text);
              setSearchQuery(text);
            }}
            className="border rounded-md p-3 mb-2 bg-inputBackground"
            placeholderTextColor="var(--color-placeholder)"
          />
        )}

        {/* Filters */}
        <View className="mb-2">
          <View className="flex flex-row flex-wrap">
            {/* Subteam Filter */}
            <View style={{ flex: 1, minWidth: '45%', marginRight: 5 }}>
              <Select
                selectedValue={selectedSubteam}
                onValueChange={(itemValue) => setSelectedSubteam(itemValue)}
              >
                <SelectTrigger variant="outline" size="md" className="mb-2">
                  <SelectInput placeholder="Subteam" />
                  <SelectIcon className="mr-2" as={ChevronDownIcon} />
                </SelectTrigger>
                <SelectPortal>
                  <SelectBackdrop />
                  <SelectContent>
                    <SelectDragIndicatorWrapper>
                      <SelectDragIndicator />
                    </SelectDragIndicatorWrapper>
                    <SelectItem label="All Subteams" value="" />
                    {SUBTEAMS.map((subteam) => (
                      <SelectItem key={subteam} label={subteam} value={subteam} />
                    ))}
                  </SelectContent>
                </SelectPortal>
              </Select>
            </View>

            {/* Grade Filter */}
            <View style={{ flex: 1, minWidth: '45%', marginRight: 5 }}>
              <Select
                selectedValue={selectedGrade}
                onValueChange={(itemValue) => setSelectedGrade(itemValue)}
              >
                <SelectTrigger variant="outline" size="md" className="mb-2">
                  <SelectInput placeholder="Grade" />
                  <SelectIcon className="mr-2" as={ChevronDownIcon} />
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

        {/* Users List */}
        <Box className="rounded-lg overflow-hidden flex-1">
          <ScrollView
            refreshControl={
              <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />
            }
          >
            {/* Table Header */}
            <View className="flex flex-row bg-headerBackground">
              <Text className="p-2 font-medium" style={{ flex: 1.2 }}>
                First Name
              </Text>
              <Text className="p-2 font-medium" style={{ flex: 1.2 }}>
                Last Name
              </Text>
              <Text className="p-2 font-medium" style={{ flex: 0.8 }}>
                Grade
              </Text>
              {user?.role === 'admin' && (
                <>
                  <Text className="p-2 font-medium" style={{ flex: 1 }}>
                    Role
                  </Text>
                  <Text
                    className="p-2 font-medium text-center"
                    style={{ width: 40 }}
                  >
                    ⚙️
                  </Text>
                </>
              )}
            </View>

            <Divider className="my-1 bg-outline-300" />

            {isLoading ? (
              <View className="p-3">
                <Text className="text-center">Loading users...</Text>
              </View>
            ) : filteredUsers.length === 0 ? (
              <View className="p-3">
                <Text className="text-center">No users found.</Text>
              </View>
            ) : (
              filteredUsers.map((userItem) => (
                <TouchableOpacity
                  key={userItem._id}
                  onPress={() => handleViewUser(userItem)}
                >
                  <View className="flex flex-row items-center border-b border-outline">
                    <Text className="p-2" style={{ flex: 1.2 }}>
                      {userItem.first_name}
                    </Text>
                    <Text className="p-2" style={{ flex: 1.2 }}>
                      {userItem.last_name}
                    </Text>
                    <Text className="p-2" style={{ flex: 0.8 }}>
                      {userItem.grade}
                    </Text>
                    {user?.role === 'admin' && (
                      <>
                        <Text className="p-2" style={{ flex: 1 }}>
                          {userItem.role}
                        </Text>
                        <View
                          className="p-2 items-center justify-center"
                          style={{ width: 40 }}
                        >
                          <Menu
                            trigger={({ ...triggerProps }) => (
                              <TouchableOpacity {...triggerProps}>
                                <Icon as={ThreeDotsIcon} />
                              </TouchableOpacity>
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
                                log('Delete user pressed', userItem._id);
                                handleDeleteUser(userItem._id);
                              }}
                            >
                              <MenuItemLabel>Delete</MenuItemLabel>
                            </MenuItem>
                          </Menu>
                        </View>
                      </>
                    )}
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </Box>

        {/* View User Details Dialog */}
        {viewUser && showViewDialog && (
          <AlertDialog
            isOpen={showViewDialog}
            onClose={() => {
              log('View user dialog closed');
              setShowViewDialog(false);
            }}
          >
            <AlertDialogBackdrop />
            <AlertDialogContent>
              <AlertDialogHeader className="pb-4">
                <Text className="text-lg font-semibold">User Details</Text>
              </AlertDialogHeader>
              <AlertDialogBody>
                <VStack space="sm">
                  <Text className="font-medium">First Name:</Text>
                  <Text>{viewUser.first_name}</Text>

                  <Text className="font-medium">Last Name:</Text>
                  <Text>{viewUser.last_name}</Text>

                  <Text className="font-medium">Grade:</Text>
                  <Text>{viewUser.grade}</Text>

                  <Text className="font-medium">Role:</Text>
                  <Text>{viewUser.role}</Text>

                  <Text className="font-medium">Subteam(s):</Text>
                  <Text>{viewUser.subteam.join(', ')}</Text>

                  {user?.role === 'admin' && (
                    <>
                      <Text className="font-medium">Email:</Text>
                      <Text>{viewUser.email}</Text>

                      <Text className="font-medium">Phone:</Text>
                      <Text>{viewUser.phone}</Text>

                      <Text className="font-medium">Student ID:</Text>
                      <Text>{viewUser.student_id}</Text>
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
        {editUserState && showEditDialog && (
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
                    value={editUserState.first_name}
                    className="border rounded-md p-3 bg-inputBackground"
                    onChangeText={(text) => {
                      log('Edit User first_name changed', text);
                      setEditUserState({ ...editUserState, first_name: text });
                    }}
                    placeholderTextColor="var(--color-placeholder)"
                  />
                  <TextInput
                    placeholder="Last Name"
                    value={editUserState.last_name}
                    className="border rounded-md p-3 bg-inputBackground"
                    onChangeText={(text) => {
                      log('Edit User last_name changed', text);
                      setEditUserState({ ...editUserState, last_name: text });
                    }}
                    placeholderTextColor="var(--color-placeholder)"
                  />
                  <TextInput
                    placeholder="Email"
                    value={editUserState.email}
                    className="border rounded-md p-3 bg-inputBackground"
                    onChangeText={(text) => {
                      log('Edit User email changed', text);
                      setEditUserState({ ...editUserState, email: text });
                    }}
                    placeholderTextColor="var(--color-placeholder)"
                  />
                  <TextInput
                    placeholder="Phone"
                    value={editUserState.phone}
                    className="border rounded-md p-3 bg-inputBackground"
                    onChangeText={(text) => {
                      log('Edit User phone changed', text);
                      setEditUserState({ ...editUserState, phone: text });
                    }}
                    placeholderTextColor="var(--color-placeholder)"
                  />
                  <TextInput
                    placeholder="Student ID"
                    value={editUserState.student_id}
                    className="border rounded-md p-3 bg-inputBackground"
                    onChangeText={(text) => {
                      log('Edit User student_id changed', text);
                      setEditUserState({ ...editUserState, student_id: text });
                    }}
                    placeholderTextColor="var(--color-placeholder)"
                  />
                  {/* Grade Selector */}
                  <Text className="font-medium">Grade</Text>
                  <Select
                    selectedValue={editUserState.grade}
                    onValueChange={(value) => {
                      log('Edit User grade changed', value);
                      setEditUserState({ ...editUserState, grade: value });
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
                          <SelectItem key={grade} label={grade} value={grade} />
                        ))}
                      </SelectContent>
                    </SelectPortal>
                  </Select>
                  {/* Role Selector */}
                  <Text className="font-medium">Role</Text>
                  <Select
                    selectedValue={editUserState.role}
                    onValueChange={(value: string) => {
                      log('Edit User role changed', value);
                      setEditUserState({
                        ...editUserState,
                        role: value as UserObject['role'],
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
                        {ROLES.map((role) => (
                          <SelectItem key={role} label={role} value={role} />
                        ))}
                      </SelectContent>
                    </SelectPortal>
                  </Select>
                  {/* Subteam Selector */}
                  <Text className="font-medium">Subteams</Text>
                  <CheckboxGroup
                    value={editUserState.subteam || []}
                    onChange={(selectedValues: string[]) => {
                      log('Edit User subteam changed', selectedValues);
                      setEditUserState({
                        ...editUserState,
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
                    saveEditChanges(editUserState._id);
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

export default UserDirectoryScreen;