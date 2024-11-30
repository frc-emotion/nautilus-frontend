// MeetingsScreen.tsx

import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
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
import { useAuth } from "../../utils/Context/AuthContext";
import { useGlobalToast } from "../../utils/UI/CustomToastProvider";
import { AxiosError, AxiosResponse } from "axios";
import { Icon, ThreeDotsIcon, EyeIcon } from "@/components/ui/icon"; // Import EyeIcon
import { useThemeContext } from "../../utils/UI/CustomThemeProvider";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useForm, Controller } from "react-hook-form";
import { handleErrorWithModalOrToast } from "@/src/utils/Helpers";
import { useModal } from "@/src/utils/UI/CustomModalProvider";
import { Card } from "@/components/ui/card";
import { View } from "@/components/ui/view";
import { Input, InputField } from "@/components/ui/input";
import { Pressable } from "@/components/ui/pressable";
import { useMeetings } from "@/src/utils/Context/MeetingContext";
import { MeetingObject, FormData, QueuedRequest, UserObject } from "@/src/Constants";
import ApiClient from "@/src/utils/Networking/APIClient";
import { useUsers } from "@/src/utils/Context/UsersContext";
import { Spinner } from "@/components/ui/spinner";

const MeetingsScreen: React.FC = () => {
  const { user } = useAuth();
  const { openToast } = useGlobalToast();
  const { openModal } = useModal();
  const { colorMode } = useThemeContext();

  const { users } = useUsers();

  const {
    meetings,
    isLoadingMeetings,
    fetchMeetings,
    init,
  } = useMeetings();

  // Logging function
  const log = (...args: any[]) => {
    console.log(`[${new Date().toISOString()}] [MeetingsScreen]`, ...args);
  };

  const [refreshing, setRefreshing] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editMeeting, setEditMeeting] = useState<MeetingObject | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filteredMeetings, setFilteredMeetings] = useState<MeetingObject[]>([]);

  // State for viewing meeting details
  const [viewingUsers, setViewingUsers] = useState<UserObject[]>([]);
  const [showViewUsersDialog, setShowViewUsersDialog] = useState<boolean>(false);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      title: "",
      description: "",
      location: "",
      time_start: new Date(),
      time_end: new Date(),
      hours: "1",
    },
  });

  useEffect(() => {
    log("useEffect [user]", user);
    if (!user) {
      return;
    }

    init();
  }, [user]);

  // Filter meetings based on search query
  useEffect(() => {
    log('useEffect [searchQuery]', searchQuery);
    if (!searchQuery) {
      setFilteredMeetings(meetings);
      return;
    }

    const filtered = meetings.filter((meeting) => {
      return (
        meeting.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        meeting.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        meeting.location.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });

    setFilteredMeetings(filtered);
  }, [searchQuery, meetings]);


  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchMeetings();
    openToast({
      title: "Refreshed!",
      description: "Successfully fetched meetings!",
      type: "success",
    });
    setRefreshing(false);
  };

  const handleDeleteMeeting = async (meetingId: number) => {
    log("handleDeleteMeeting called", meetingId);
    const request: QueuedRequest = {
      url: `/api/meetings/${meetingId}`,
      method: "delete",
      retryCount: 0,
      successHandler: async (response: AxiosResponse) => {
        log("handleDeleteMeeting successHandler", response.data);
        openToast({
          title: "Success",
          description: "Meeting deleted.",
          type: "success",
        });
        fetchMeetings();
      },
      errorHandler: async (error: AxiosError) => {
        log("handleDeleteMeeting errorHandler", error);
        handleErrorWithModalOrToast({
          actionName: "Delete Meeting",
          error,
          showModal: false,
          showToast: true,
          openModal,
          openToast,
        });
      },
      offlineHandler: async () => {
        log("handleDeleteMeeting offlineHandler");
        openToast({
          title: "Offline",
          description: "You are offline!",
          type: "error",
        });
      },
    };
    try {
      await ApiClient.handleRequest(request);
      log("handleDeleteMeeting request sent");
    } catch (error) {
      log("handleDeleteMeeting exception", error);
    }
  };

  const handleEditMeeting = (meeting: MeetingObject) => {
    log("handleEditMeeting called", meeting);
    setEditMeeting({ ...meeting }); // Create a copy to avoid mutating original
    setValue("title", meeting.title);
    setValue("description", meeting.description);
    setValue("location", meeting.location);
    setValue("time_start", new Date(meeting.time_start * 1000));
    setValue("time_end", new Date(meeting.time_end * 1000));
    setValue("hours", meeting.hours.toString());
    setShowEditDialog(true);
  };

  const saveEditChanges = async (data: FormData) => {
    log("saveEditChanges called", data);
    if (!editMeeting) {
      log("No editMeeting selected");
      openToast({
        title: "Error",
        description: "No meeting selected for editing.",
        type: "error",
      });
      return;
    }
    setIsSubmitting(true);

    const payload = {
      title: data.title,
      description: data.description,
      location: data.location,
      time_start: Math.floor(data.time_start.getTime() / 1000),
      time_end: Math.floor(data.time_end.getTime() / 1000),
      hours: parseFloat(data.hours),
    };

    const request: QueuedRequest = {
      url: `/api/meetings/${editMeeting._id}`,
      method: "put",
      data: payload,
      retryCount: 0,
      successHandler: async (response: AxiosResponse) => {
        log("saveEditChanges successHandler", response.data);
        openToast({
          title: "Success",
          description: "Meeting edited successfully!",
          type: "success",
        });
        setShowEditDialog(false);
        reset();
        fetchMeetings();
      },
      errorHandler: async (error: AxiosError) => {
        log("saveEditChanges errorHandler", error);

        if (error.response?.status === 404) {
          openToast({
            title: "No change",
            description: "You did not submit any new information!",
            type: "warning",
          });
          setShowEditDialog(false);
          reset();
          return;
        }

        handleErrorWithModalOrToast({
          actionName: "Edit Meeting",
          error,
          showModal: false,
          showToast: true,
          openModal,
          openToast,
        });
      },
      offlineHandler: async () => {
        log("saveEditChanges offlineHandler");
        openToast({
          title: "Offline",
          description: "You are offline!",
          type: "error",
        });
      },
    };

    try {
      await ApiClient.handleRequest(request);
      log("saveEditChanges request sent");
    } catch (error) {
      log("saveEditChanges exception", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to handle viewing meeting details (existing functionality)
  const handleViewMeeting = (meeting: MeetingObject) => {
    log("handleViewMeeting called", meeting);
    // Existing functionality to view meeting details
    // You can enhance this as needed
  };

  // Function to handle viewing logged users
  const handleViewUsers = (meeting: MeetingObject) => {
    log("handleViewUsers called", meeting);
    
    if (!meeting.members_logged || meeting.members_logged.length === 0) {
      openToast({
        title: "No Users Logged",
        description: "No users have logged for this meeting.",
        type: "info",
      });
      return;
    }
    
    // Map user IDs to UserObject
    const loggedUsers: UserObject[] = users.filter(u => meeting.members_logged?.includes(u._id));
    
    setViewingUsers(loggedUsers);
    setShowViewUsersDialog(true);
  };

  // Helper function to format date and time
  const formatDateTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getUserName = (userId: number): string => {
    const user = users.find(u => u._id === userId);
    return user ? `${user.first_name} ${user.last_name}` : `Lead ID: ${userId}`;
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
      
          <Input variant="outline" size="md" className="mb-4">
            <InputField
              value={searchQuery}
              onChangeText={(text) => {
                log('Search query changed', text);
                setSearchQuery(text);
              }}
              placeholder="Search by name, description, location..."
              placeholderTextColor={colorMode === 'light' ? '#A0AEC0' : '#4A5568'}
            />
          </Input>
        

        {/* Meetings List */}
        <Box className="rounded-lg overflow-hidden flex-1">
          <ScrollView
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
          >
            {isLoadingMeetings ? (
              <View className="p-3">
                <Spinner />
                <Text className="text-center">Loading meetings...</Text>
              </View>
            ) : filteredMeetings.length === 0 ? (
              <View className="p-3">
                <Text className="text-center">No meetings found.</Text>
              </View>
            ) : (
              filteredMeetings.map((meeting) => (
                <Card
                  key={meeting._id}
                  variant="outline"
                  className="bg-white p-4 mb-3 rounded-lg"
                >
                  <View className="flex flex-row justify-between items-center">
                    <Pressable
                      style={{ flex: 1 }}
                      onPress={() => handleViewMeeting(meeting)}
                    >
                      <Text className="text-lg font-semibold">
                        {meeting.title}
                      </Text>
                      <Text>{meeting.location}</Text>
                      <Text>
                        {formatDateTime(meeting.time_start)} -{" "}
                        {formatDateTime(meeting.time_end)}
                      </Text>
                    </Pressable>
                    <View className="flex flex-row items-center">
                      {(user?.role === "admin" || user?.role === "executive" || user?.role === "advisor" || user?.role === "leadership") && (
                        <>
                          {/* Eye Icon for Viewing Logged Users */}
                          <Pressable
                            onPress={() => handleViewUsers(meeting)}
                            className="mr-2"
                          >
                            <Icon as={EyeIcon} />
                          </Pressable>
                          
                          {/* Existing Menu for Edit/Delete */}
                          <Menu
                            trigger={({ ...triggerProps }) => (
                              <Pressable {...triggerProps}>
                                <Icon as={ThreeDotsIcon} />
                              </Pressable>
                            )}
                          >
                            <MenuItem
                              onPress={() => {
                                log("Edit meeting pressed", meeting._id);
                                handleEditMeeting(meeting);
                              }}
                            >
                              <MenuItemLabel>Edit</MenuItemLabel>
                            </MenuItem>
                            <MenuItem
                              onPress={() => {
                                log("Delete meeting pressed", meeting._id);
                                handleDeleteMeeting(meeting._id);
                              }}
                            >
                              <MenuItemLabel>Delete</MenuItemLabel>
                            </MenuItem>
                          </Menu>
                        </>
                      )}
                    </View>
                  </View>
                </Card>
              ))
            )}
          </ScrollView>
        </Box>

        {/* Edit Meeting Dialog */}
        {editMeeting && showEditDialog && (
          <AlertDialog
            isOpen={showEditDialog}
            onClose={() => {
              log("Edit meeting dialog closed");
              setShowEditDialog(false);
            }}
          >
            <AlertDialogBackdrop />
            <AlertDialogContent>
              <AlertDialogHeader className="pb-4">
                <Text className="text-lg font-semibold">Edit Meeting</Text>
              </AlertDialogHeader>
              <AlertDialogBody>
                <VStack space="sm">
                  {/* Title Field */}
                  <Text className="font-medium">Title</Text>
                  <Controller
                    control={control}
                    name="title"
                    rules={{ required: "Title is required" }}
                    render={({ field: { onChange, value } }) => (
                      <Input
                        variant="outline"
                        size="md"
                      >
                        <InputField
                          value={value}
                          onChangeText={onChange}
                          placeholder="Title"
                          className="bg-inputBackground"
                          placeholderTextColor={colorMode === "light" ? "#A0AEC0" : "#4A5568"}
                        />
                      </Input>
                    )}
                  />
                  {errors.title && (
                    <Text className="text-red-500">{errors.title.message}</Text>
                  )}

                  {/* Description Field */}
                  <Text className="font-medium">Description</Text>
                  <Controller
                    control={control}
                    name="description"
                    rules={{ required: "Description is required" }}
                    render={({ field: { onChange, value } }) => (
                      <Input
                        variant="outline"
                        size="md"
                      >
                        <InputField
                          value={value}
                          onChangeText={onChange}
                          placeholder="Description"
                          className="bg-inputBackground"
                          placeholderTextColor={colorMode === "light" ? "#A0AEC0" : "#4A5568"}
                        />
                      </Input>
                    )}
                  />
                  {errors.description && (
                    <Text className="text-red-500">
                      {errors.description.message}
                    </Text>
                  )}

                  {/* Location Field */}
                  <Text className="font-medium">Location</Text>
                  <Controller
                    control={control}
                    name="location"
                    rules={{ required: "Location is required" }}
                    render={({ field: { onChange, value } }) => (
                      <Input
                        variant="outline"
                        size="md"
                      >
                        <InputField
                          value={value}
                          onChangeText={onChange}
                          placeholder="Location"
                          className="bg-inputBackground"
                          placeholderTextColor={colorMode === "light" ? "#A0AEC0" : "#4A5568"}
                        />
                      </Input>
                    )}
                  />
                  {errors.location && (
                    <Text className="text-red-500">
                      {errors.location.message}
                    </Text>
                  )}

                  {/* Start Time Picker */}
                  <Text className="font-medium">Start Time</Text>
                  <Controller
                    control={control}
                    name="time_start"
                    render={({ field: { onChange, value } }) => (
                      <DateTimePicker
                        value={value}
                        mode="datetime"
                        display="default"
                        onChange={(event, selectedDate) => {
                          if (selectedDate) {
                            onChange(selectedDate);
                          }
                        }}
                      />
                    )}
                  />
                  {errors.time_start && (
                    <Text className="text-red-500">
                      {errors.time_start.message}
                    </Text>
                  )}

                  {/* End Time Picker */}
                  <Text className="font-medium">End Time</Text>
                  <Controller
                    control={control}
                    name="time_end"
                    rules={{
                      required: "End time is required",
                      validate: (value) => {
                        const { time_start } = getValues();
                        return (
                          value > time_start ||
                          "End time must be after start time"
                        );
                      },
                    }}
                    render={({ field: { onChange, value } }) => (
                      <DateTimePicker
                        value={value}
                        mode="datetime"
                        display="default"
                        onChange={(event, selectedDate) => {
                          if (selectedDate) {
                            onChange(selectedDate);
                          }
                        }}
                      />
                    )}
                  />
                  {errors.time_end && (
                    <Text className="text-red-500">
                      {errors.time_end.message}
                    </Text>
                  )}

                  {/* Hours Field */}
                  <Text className="font-medium">Hours</Text>
                  <Controller
                    control={control}
                    name="hours"
                    rules={{
                      required: "Hours are required",
                      pattern: {
                        value: /^\d+(\.\d+)?$/,
                        message: "Please enter a valid number",
                      },
                    }}
                    render={({ field: { onChange, value } }) => (
                      <Input
                        variant="outline"
                        size="md"
                      >
                        <InputField
                          value={value}
                          onChangeText={onChange}
                          placeholder="Hours"
                          keyboardType="numeric"
                          className="bg-inputBackground"
                          placeholderTextColor={colorMode === "light" ? "#A0AEC0" : "#4A5568"}
                        />
                      </Input>
                    )}
                  />
                  {errors.hours && (
                    <Text className="text-red-500">{errors.hours.message}</Text>
                  )}
                </VStack>
              </AlertDialogBody>
              <AlertDialogFooter className="flex justify-end space-x-3 pt-6">
                <Button
                  variant="outline"
                  onPress={() => {
                    log("Cancel button pressed in Edit Dialog");
                    setShowEditDialog(false);
                  }}
                >
                  <ButtonText>Cancel</ButtonText>
                </Button>
                <Button
                  onPress={handleSubmit(saveEditChanges)}
                  action="primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <ButtonText>Save</ButtonText>
                  )}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {/* View Logged Users Dialog */}
        {showViewUsersDialog && (
          <AlertDialog
            isOpen={showViewUsersDialog}
            onClose={() => setShowViewUsersDialog(false)}
          >
            <AlertDialogBackdrop />
            <AlertDialogContent>
              <AlertDialogHeader className="pb-4">
                <Text className="text-lg font-semibold">Attending Users</Text>
              </AlertDialogHeader>
              <AlertDialogBody>
                {viewingUsers.length > 0 ? (
                  viewingUsers.map(user => (
                    <VStack key={user._id} className="mb-2">
                      <Text className="font-medium">{user.first_name} {user.last_name}</Text>
                    </VStack>
                  ))
                ) : (
                  <Text>No users have logged for this meeting.</Text>
                )}
              </AlertDialogBody>
              <AlertDialogFooter className="flex justify-end space-x-3 pt-6">
                <Button
                  onPress={() => setShowViewUsersDialog(false)}
                >
                  <ButtonText>Close</ButtonText>
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </Box>
    </KeyboardAvoidingView>
  );
};

export default MeetingsScreen;
