import React, { useState } from 'react';
import { View } from '@/components/ui/view';
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
import { GRADES, ROLES, UserObject } from '../../Constants';
import { useGlobalToast } from '../../utils/UI/CustomToastProvider';
import { CheckIcon, ChevronDownIcon, Icon, ThreeDotsIcon } from '@/components/ui/icon';
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
import { formatPhoneNumber } from '@/src/utils/Helpers';
import { useUsers } from '@/src/utils/Context/UsersContext';
import { Input, InputField } from '@/components/ui/input';
import { useForm, Controller, FieldErrors } from 'react-hook-form';
import { Pressable } from '@/components/ui/pressable';

const SUBTEAMS = ["build", "software", "marketing", "electrical", "design"];

interface EditUserFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  student_id: string;
  grade: string;
  role: string;
  subteam: string[];
}

const UserDirectoryScreen: React.FC = () => {
  const { user } = useAuth();
  const { openToast } = useGlobalToast();
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
    filteredUsers,
  } = useUsers();

  const log = (...args: any[]) => {
    console.log(`[${new Date().toISOString()}] [UserDirectoryScreen]`, ...args);
  };

  const [viewUser, setViewUser] = useState<UserObject | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);

  const [editUserId, setEditUserId] = useState<number | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const { control, handleSubmit, reset, formState: { errors } } = useForm<EditUserFormData>({
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      student_id: '',
      grade: '',
      role: '',
      subteam: [],
    },
  });

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
      grade: userToEdit.grade,
      role: userToEdit.role,
      subteam: userToEdit.subteam,
    });
    setShowEditDialog(true);
  };

  const handleDeleteUser = (userId: number) => {
    log('handleDeleteUser called', userId);
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
    } catch (error) {
      log('saveEditChanges exception', error);
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
              placeholderTextColor={colorMode === 'light' ? '#A0AEC0' : '#4A5568'}
            />
          </Input>
        )}

        {/* Filters */}
        <View className="mb-4">
          <View className="flex flex-row flex-wrap justify-between">
            {/* Subteam Filter */}
            <View style={{ flex: 1, minWidth: '45%', marginBottom: 10 }} className="mr-2">
              <Select
                selectedValue={selectedSubteam}
                onValueChange={(itemValue) => setSelectedSubteam(itemValue)}
              >
                <SelectTrigger variant="outline" size="md" className="mb-2 justify-between">
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
                      <SelectItem key={subteam} label={subteam.charAt(0).toUpperCase() + subteam.slice(1)} value={subteam} />
                    ))}
                  </SelectContent>
                </SelectPortal>
              </Select>
            </View>

            {/* Grade Filter */}
            <View style={{ flex: 1, minWidth: '45%', marginBottom: 10 }}>
              <Select
                selectedValue={selectedGrade}
                onValueChange={(itemValue) => setSelectedGrade(itemValue)}
              >
                <SelectTrigger variant="outline" size="md" className="mb-2 justify-between">
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
                <Pressable
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
                              <Pressable {...triggerProps}>
                                <Icon as={ThreeDotsIcon} />
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
                </Pressable>
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
            <AlertDialogContent style={{ width: '90%', maxWidth: 600 }}>
              <AlertDialogHeader className="pb-4">
                <Text className="text-lg font-semibold">User Details</Text>
              </AlertDialogHeader>
              <AlertDialogBody>
                <VStack space="sm">

                  {/* Row 1: First Name, Last Name */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                    <View style={{ flex: 0.48 }}>
                      <Text className="font-medium">First Name:</Text>
                      <Text>{viewUser.first_name}</Text>
                    </View>
                    <View style={{ flex: 0.48 }}>
                      <Text className="font-medium">Last Name:</Text>
                      <Text>{viewUser.last_name}</Text>
                    </View>
                  </View>

                  {/* Row 2: Grade, Role */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                    <View style={{ flex: 0.48 }}>
                      <Text className="font-medium">Grade:</Text>
                      <Text>{viewUser.grade}</Text>
                    </View>
                    <View style={{ flex: 0.48 }}>
                      <Text className="font-medium">Role:</Text>
                      <Text>{viewUser.role}</Text>
                    </View>
                  </View>

                  {/* Row 3: Subteams */}
                  <View style={{ marginBottom: 10 }}>
                    <Text className="font-medium">Subteam(s):</Text>
                    <Text>{viewUser.subteam.map(st => st.charAt(0).toUpperCase() + st.slice(1)).join(', ')}</Text>
                  </View>

                  {/* Admin/Executive Only Fields */}
                  {['admin', 'executive'].includes(user?.role ?? '') && (
                    <>
                      {/* Row 4: Email, Phone */}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                        <View style={{ flex: 0.48 }}>
                          <Text className="font-medium">Email:</Text>
                          <Text>{viewUser.email}</Text>
                        </View>
                        <View style={{ flex: 0.48 }}>
                          <Text className="font-medium">Phone:</Text>
                          <Text>{formatPhoneNumber(viewUser.phone)}</Text>
                        </View>
                      </View>

                      {/* Row 5: Student ID */}
                      <View style={{ marginBottom: 10 }}>
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
            <AlertDialogContent style={{ width: '90%', maxWidth: 800 }}>
              <AlertDialogHeader className="pb-4">
                <Text className="text-lg font-semibold">Edit User</Text>
              </AlertDialogHeader>
              <AlertDialogBody>
                <ScrollView>
                  <VStack space="sm">
                    {/* Row 1: First Name and Last Name */}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                      <View style={{ flex: 0.48 }}>
                        <Text className="font-medium">First Name</Text>
                        <Controller
                          control={control}
                          name="first_name"
                          rules={{ required: 'First Name is required' }}
                          render={({ field: { onChange, value }, fieldState: { error } }) => (
                            <>
                              <Input variant="outline" size="md">
                                <InputField
                                  value={value}
                                  onChangeText={onChange}
                                  placeholder="First Name"
                                  placeholderTextColor={
                                    colorMode === 'light' ? '#A0AEC0' : '#4A5568'
                                  }
                                />
                              </Input>
                              {error && <Text style={{ color: 'red' }}>{error.message}</Text>}
                            </>
                          )}
                        />
                      </View>
                      <View style={{ flex: 0.48 }}>
                        <Text className="font-medium">Last Name</Text>
                        <Controller
                          control={control}
                          name="last_name"
                          rules={{ required: 'Last Name is required' }}
                          render={({ field: { onChange, value }, fieldState: { error } }) => (
                            <>
                              <Input variant="outline" size="md">
                                <InputField
                                  value={value}
                                  onChangeText={onChange}
                                  placeholder="Last Name"
                                  placeholderTextColor={
                                    colorMode === 'light' ? '#A0AEC0' : '#4A5568'
                                  }
                                />
                              </Input>
                              {error && <Text style={{ color: 'red' }}>{error.message}</Text>}
                            </>
                          )}
                        />
                      </View>
                    </View>

                    {/* Row 2: Email and Phone */}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 10 }}>
                      <View style={{ flex: 0.48 }}>
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
                              <Input variant="outline" size="md">
                                <InputField
                                  value={value}
                                  onChangeText={onChange}
                                  placeholder="Email"
                                  keyboardType="email-address"
                                  placeholderTextColor={
                                    colorMode === 'light' ? '#A0AEC0' : '#4A5568'
                                  }
                                />
                              </Input>
                              {error && <Text style={{ color: 'red' }}>{error.message}</Text>}
                            </>
                          )}
                        />
                      </View>
                      <View style={{ flex: 0.48 }}>
                        <Text className="font-medium">Phone</Text>
                        <Controller
                          control={control}
                          name="phone"
                          rules={{
                            required: 'Phone Number is required',
                            pattern: {
                              value: /^\d{10}$/,
                              message: 'Phone Number must be 10 digits',
                            },
                          }}
                          render={({ field: { onChange, value }, fieldState: { error } }) => (
                            <>
                              <Input variant="outline" size="md">
                                <InputField
                                  value={value}
                                  onChangeText={(text) => {
                                    const formattedText = formatPhoneNumber(text);
                                    onChange(formattedText);
                                  }}
                                  placeholder="Phone"
                                  keyboardType="phone-pad"
                                  placeholderTextColor={
                                    colorMode === 'light' ? '#A0AEC0' : '#4A5568'
                                  }
                                />
                              </Input>
                              {error && <Text style={{ color: 'red' }}>{error.message}</Text>}
                            </>
                          )}
                        />
                      </View>
                    </View>

                    {/* Row 3: Student ID and Grade */}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 10 }}>
                      <View style={{ flex: 0.48 }}>
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
                              <Input variant="outline" size="md">
                                <InputField
                                  value={value}
                                  onChangeText={onChange}
                                  placeholder="Student ID"
                                  keyboardType="numeric"
                                  maxLength={7}
                                  placeholderTextColor={
                                    colorMode === 'light' ? '#A0AEC0' : '#4A5568'
                                  }
                                />
                              </Input>
                              {error && <Text style={{ color: 'red' }}>{error.message}</Text>}
                            </>
                          )}
                        />
                      </View>
                      <View style={{ flex: 0.48 }}>
                        <Text className="font-medium">Grade</Text>
                        <Controller
                          control={control}
                          name="grade"
                          rules={{ required: 'Grade is required' }}
                          render={({ field: { onChange, value }, fieldState: { error } }) => (
                            <>
                              <Select
                                selectedValue={value}
                                onValueChange={onChange}
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
                              {error && <Text style={{ color: 'red' }}>{error.message}</Text>}
                            </>
                          )}
                        />
                      </View>
                    </View>

                    {/* Row 4: Role */}
                    <View style={{ marginTop: 10 }}>
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
                            {error && <Text style={{ color: 'red' }}>{error.message}</Text>}
                          </>
                        )}
                      />
                    </View>

                    {/* Row 5: Subteams (Checkboxes) */}
                    <View style={{ marginTop: 10 }}>
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
                              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                                {SUBTEAMS.map((team) => (
                                  <View key={team} style={{ width: '45%', marginBottom: 10, marginRight: 10 }}>
                                    <Checkbox value={team}>
                                      <CheckboxIndicator>
                                        <CheckboxIcon as={CheckIcon} />
                                      </CheckboxIndicator>
                                      <CheckboxLabel>{team.charAt(0).toUpperCase() + team.slice(1)}</CheckboxLabel>
                                    </Checkbox>
                                  </View>
                                ))}
                              </View>
                            </CheckboxGroup>
                            {error && <Text style={{ color: 'red' }}>{error.message}</Text>}
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
    </KeyboardAvoidingView>
  );
};

export default UserDirectoryScreen;