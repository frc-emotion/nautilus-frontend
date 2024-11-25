import React, { useEffect, useState } from "react";
import {
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  TouchableOpacity,
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
import { useAuth } from "../../utils/AuthContext";
import ApiClient from "../../utils/Networking/APIClient";
import { FailedRequest, MeetingObject, QueuedRequest } from "../../Constants";
import { useGlobalToast } from "../../utils/UI/CustomToastProvider";
import { AxiosError, AxiosResponse } from "axios";
import { Icon, ThreeDotsIcon, InfoIcon } from "@/components/ui/icon";
import { useThemeContext } from "../../utils/UI/CustomThemeProvider";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useForm, Controller } from "react-hook-form";

type FormData = {
  title: string;
  description: string;
  location: string;
  time_start: Date;
  time_end: Date;
  hours: string;
};

type UserObject = {
  _id: number;
  first_name: string;
  last_name: string;
  grade: string;
  role: string;
  subteam: string[];
};

const MeetingsScreen: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useGlobalToast();
  const { colorMode } = useThemeContext();
  const [refreshing, setRefreshing] = useState(false);

  // Logging function
  const log = (...args: any[]) => {
    console.log(`[${new Date().toISOString()}] [MeetingsScreen]`, ...args);
  };

  const [meetings, setMeetings] = useState<MeetingObject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editMeeting, setEditMeeting] = useState<MeetingObject | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State variables for date pickers
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  // State for viewing meeting details
  const [viewMeeting, setViewMeeting] = useState<MeetingObject | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);

  // State to store user data
  const [usersMap, setUsersMap] = useState<{ [key: number]: UserObject }>({});

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
    fetchMeetings();
  }, [user]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchMeetings();
    showToast({
      title: "Refreshed!",
      description: "Successfully fetched meetings!",
      type: "success",
    });
    setRefreshing(false);
  };

  const fetchMeetings = async () => {
    log("fetchMeetings called");
    setIsLoading(true);
    const request: QueuedRequest = {
      url: "/api/meetings/",
      method: "get",
      headers: { Authorization: `Bearer ${user?.token}` },
      retryCount: 0,
      successHandler: async (response: AxiosResponse) => {
        log("fetchMeetings successHandler", response.data);
        const fetchedMeetings = response.data.meetings;
        setMeetings(fetchedMeetings);

        // Fetch users after fetching meetings
        await fetchUsersForMeetings(fetchedMeetings);
        setIsLoading(false);
      },
      errorHandler: async (error: AxiosError) => {
        log("fetchMeetings errorHandler", error);
        showToast({
          title: "Error",
          description: "Failed to fetch meetings.",
          type: "error",
        });
        setIsLoading(false);
      },
      offlineHandler: async () => {
        log("fetchMeetings offlineHandler");
        showToast({
          title: "Offline",
          description: "You are offline!",
          type: "error",
        });
        setIsLoading(false);
      },
    };
    try {
      await ApiClient.handleRequest(request);
      log("fetchMeetings request sent");
    } catch (error) {
      log("fetchMeetings exception", error);
      setIsLoading(false);
    }
  };

  const fetchUsersForMeetings = async (meetingsData: MeetingObject[]) => {
    log("fetchUsersForMeetings called");
    // Extract unique user IDs from meetings
    const userIds = Array.from(
      new Set(meetingsData.map((meeting) => meeting.created_by))
    );
    log("Unique user IDs:", userIds);

    // Fetch user data for each unique user ID
    const userPromises = userIds.map((userId) => fetchUserById(userId));
    const usersArray = await Promise.all(userPromises);

    // Map user data by user ID for quick access
    const usersData: { [key: string]: UserObject } = {};
    usersArray.forEach((user) => {
      if (user) {
        usersData[user._id.toString()] = user;
      }
    });

    setUsersMap(usersData);
    log("Users map:", usersData);
  };

  const fetchUserById = (userId: number): Promise<UserObject | null> => {
    log("fetchUserById called for user ID:", userId);
    return new Promise((resolve) => {
      const request: QueuedRequest = {
        url: `/api/account/users/directory/${userId}`,
        method: "get",
        headers: { Authorization: `Bearer ${user?.token}` },
        retryCount: 0,
        successHandler: async (response: AxiosResponse) => {
          log("fetchUserById successHandler", response.data);
          resolve(response.data.user);
        },
        errorHandler: async (error: AxiosError) => {
          log("fetchUserById errorHandler", error);
          showToast({
            title: "Error",
            description: `Failed to fetch user data for user ID: ${userId}`,
            type: "error",
          });
          resolve(null);
        },
        offlineHandler: async () => {
          log("fetchUserById offlineHandler");
          showToast({
            title: "Offline",
            description: "You are offline!",
            type: "error",
          });
          resolve(null);
        },
      };

      ApiClient.handleRequest(request).catch((error) => {
        log("fetchUserById exception", error);
        resolve(null);
      });
    });
  };

  const handleDeleteMeeting = async (meetingId: number) => {
    log("handleDeleteMeeting called", meetingId);
    const request: QueuedRequest = {
      url: `/api/meetings/${meetingId}`,
      method: "delete",
      headers: { Authorization: `Bearer ${user?.token}` },
      retryCount: 0,
      successHandler: async (response: AxiosResponse) => {
        log("handleDeleteMeeting successHandler", response.data);
        showToast({
          title: "Success",
          description: "Meeting deleted.",
          type: "success",
        });
        fetchMeetings();
      },
      errorHandler: async (error: AxiosError) => {
        log("handleDeleteMeeting errorHandler", error);
        showToast({
          title: "Error",
          description: "Failed to delete meeting.",
          type: "error",
        });
      },
      offlineHandler: async () => {
        log("handleDeleteMeeting offlineHandler");
        showToast({
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
      showToast({
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
      headers: { Authorization: `Bearer ${user?.token}` },
      data: payload,
      retryCount: 0,
      successHandler: async (response: AxiosResponse) => {
        log("saveEditChanges successHandler", response.data);
        showToast({
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
          showToast({
            title: "No change",
            description: "You did not submit any new information!",
            type: "warning",
          });
          setShowEditDialog(false);
          reset();
          return;
        }

        showToast({
          title: "Error: " + error.response?.status,
          description:
            (error.response?.data as FailedRequest).message ||
            "Something went wrong",
          type: "error",
        });
      },
      offlineHandler: async () => {
        log("saveEditChanges offlineHandler");
        showToast({
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

  // Function to handle viewing meeting details
  const handleViewMeeting = (meeting: MeetingObject) => {
    log("handleViewMeeting called", meeting);
    setViewMeeting(meeting);
    setShowViewDialog(true);
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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{
        flex: 1,
        backgroundColor: colorMode === "light" ? "#FFFFFF" : "#1A202C",
      }}
    >
      <Box className="p-4 flex-1">
        {/* Meetings List */}
        <Box className="rounded-lg overflow-hidden flex-1">
          <ScrollView
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
          >
            {isLoading ? (
              <View className="p-3">
                <Text className="text-center ">Loading meetings...</Text>
              </View>
            ) : meetings.length === 0 ? (
              <View className="p-3">
                <Text className="text-center ">No meetings found.</Text>
              </View>
            ) : (
              meetings.map((meeting) => (
                <View
                  key={meeting._id}
                  className="bg-white p-4 mb-3 rounded-lg shadow-md"
                >
                  <View className="flex flex-row justify-between items-center">
                    <TouchableOpacity
                      style={{ flex: 1 }}
                      onPress={() => handleViewMeeting(meeting)}
                    >
                      <Text className="text-lg font-semibold">
                        {meeting.title}
                      </Text>
                      <Text className="text-gray-600">{meeting.location}</Text>
                      <Text className="text-gray-600">
                        {formatDateTime(meeting.time_start)} -{" "}
                        {formatDateTime(meeting.time_end)}
                      </Text>
                    </TouchableOpacity>
                    <View className="flex flex-row items-center">
                      {(user?.role === "admin" || user?.role === "executive") && (
                        <Menu
                          trigger={({ ...triggerProps }) => (
                            <TouchableOpacity {...triggerProps}>
                              <Icon as={ThreeDotsIcon} />
                            </TouchableOpacity>
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
                      )}
                    </View>
                  </View>
                </View>
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
                      <TextInput
                        placeholder="Title"
                        value={value}
                        onChangeText={onChange}
                        className="border rounded-md p-3 bg-inputBackground"
                        placeholderTextColor="var(--color-placeholder)"
                      />
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
                      <TextInput
                        placeholder="Description"
                        value={value}
                        onChangeText={onChange}
                        className="border rounded-md p-3 bg-inputBackground"
                        placeholderTextColor="var(--color-placeholder)"
                      />
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
                      <TextInput
                        placeholder="Location"
                        value={value}
                        onChangeText={onChange}
                        className="border rounded-md p-3 bg-inputBackground"
                        placeholderTextColor="var(--color-placeholder)"
                      />
                    )}
                  />
                  {errors.location && (
                    <Text className="text-red-500">
                      {errors.location.message}
                    </Text>
                  )}

                  {/* Start Time Picker */}
                  <Text className="font-medium">Start Time</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setShowStartDatePicker(true);
                    }}
                  >
                    <Controller
                      control={control}
                      name="time_start"
                      rules={{ required: "Start time is required" }}
                      render={({ field: { value } }) => (
                        <Text className="p-3 border rounded-md bg-inputBackground">
                          {value.toLocaleString()}
                        </Text>
                      )}
                    />
                  </TouchableOpacity>
                  {showStartDatePicker && (
                    <Controller
                      control={control}
                      name="time_start"
                      render={({ field: { onChange, value } }) => (
                        <DateTimePicker
                          value={value}
                          mode="datetime"
                          display="default"
                          onChange={(event, selectedDate) => {
                            setShowStartDatePicker(false);
                            if (selectedDate) {
                              onChange(selectedDate);
                            }
                          }}
                        />
                      )}
                    />
                  )}
                  {errors.time_start && (
                    <Text className="text-red-500">
                      {errors.time_start.message}
                    </Text>
                  )}

                  {/* End Time Picker */}
                  <Text className="font-medium">End Time</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setShowEndDatePicker(true);
                    }}
                  >
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
                      render={({ field: { value } }) => (
                        <Text className="p-3 border rounded-md bg-inputBackground">
                          {value.toLocaleString()}
                        </Text>
                      )}
                    />
                  </TouchableOpacity>
                  {showEndDatePicker && (
                    <Controller
                      control={control}
                      name="time_end"
                      render={({ field: { onChange, value } }) => (
                        <DateTimePicker
                          value={value}
                          mode="datetime"
                          display="default"
                          onChange={(event, selectedDate) => {
                            setShowEndDatePicker(false);
                            if (selectedDate) {
                              onChange(selectedDate);
                            }
                          }}
                        />
                      )}
                    />
                  )}
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
                      <TextInput
                        placeholder="Hours"
                        value={value}
                        onChangeText={onChange}
                        keyboardType="numeric"
                        className="border rounded-md p-3 bg-inputBackground"
                        placeholderTextColor="var(--color-placeholder)"
                      />
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

        {/* View Meeting Details Dialog */}
        {viewMeeting && showViewDialog && (
          <AlertDialog
            isOpen={showViewDialog}
            onClose={() => {
              log("View meeting dialog closed");
              setShowViewDialog(false);
            }}
          >
            <AlertDialogBackdrop />
            <AlertDialogContent>
              <AlertDialogHeader className="pb-4">
                <Text className="text-lg font-semibold">Meeting Details</Text>
              </AlertDialogHeader>
              <AlertDialogBody>
                <VStack space="sm">
                  <Text className="font-medium">Title:</Text>
                  <Text>{viewMeeting.title}</Text>

                  <Text className="font-medium">Description:</Text>
                  <Text>{viewMeeting.description}</Text>

                  <Text className="font-medium">Location:</Text>
                  <Text>{viewMeeting.location}</Text>

                  <Text className="font-medium">Start Time:</Text>
                  <Text>{formatDateTime(viewMeeting.time_start)}</Text>

                  <Text className="font-medium">End Time:</Text>
                  <Text>{formatDateTime(viewMeeting.time_end)}</Text>

                  <Text className="font-medium">Hours:</Text>
                  <Text>{viewMeeting.hours}</Text>

                  {/* Display creator's information */}
                  <Text className="font-medium">Created By:</Text>
                  {usersMap[viewMeeting.created_by] ? (
                    <Text>
                      {usersMap[viewMeeting.created_by].first_name}{" "}
                      {usersMap[viewMeeting.created_by].last_name}
                    </Text>
                  ) : (
                    <Text>Unknown User</Text>
                  )}
                </VStack>
              </AlertDialogBody>
              <AlertDialogFooter className="flex justify-end space-x-3 pt-6">
                <Button
                  onPress={() => {
                    log("Close button pressed in View Dialog");
                    setShowViewDialog(false);
                  }}
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