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
import { Icon, ThreeDotsIcon, InfoIcon } from "@/components/ui/icon";
import { useThemeContext } from "../../utils/UI/CustomThemeProvider";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useForm, Controller } from "react-hook-form";
import { handleErrorWithModalOrToast } from "@/src/utils/Helpers";
import { useModal } from "@/src/utils/UI/CustomModalProvider";
import { Card } from "@/components/ui/card";
import { View } from "@/components/ui/view";
import { Input, InputField, InputSlot, InputIcon } from "@/components/ui/input";
import { Pressable } from "@/components/ui/pressable";
import { useMeetings } from "@/src/utils/Context/MeetingContext";
import { MeetingObject, FormData, QueuedRequest } from "@/src/Constants";
import ApiClient from "@/src/utils/Networking/APIClient";
import { useUsers } from "@/src/utils/Context/UsersContext";

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

  // State for viewing meeting details
  const [viewMeeting, setViewMeeting] = useState<MeetingObject | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);

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
      headers: { Authorization: `Bearer ${user?.token}` },
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
      headers: { Authorization: `Bearer ${user?.token}` },
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
        {/* Meetings List */}
        <Box className="rounded-lg overflow-hidden flex-1">
          <ScrollView
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
          >
            {isLoadingMeetings ? (
              <View className="p-3">
                <Text className="text-center">Loading meetings...</Text>
              </View>
            ) : meetings.length === 0 ? (
              <View className="p-3">
                <Text className="text-center">No meetings found.</Text>
              </View>
            ) : (
              meetings.map((meeting) => (
                <Card
                  key={meeting._id}
                  variant="outline" // Use a variant if your Card supports it
                  className="bg-white p-4 mb-3 rounded-lg shadow-md"
                >
                  <View className="flex flex-row justify-between items-center">
                    <Pressable
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
                    </Pressable>
                    <View className="flex flex-row items-center">
                      {(user?.role === "admin" || user?.role === "executive") && (
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

                  <Text className="font-medium">Created By:</Text>
                  <Text>{getUserName(viewMeeting.created_by)}</Text>
                  
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