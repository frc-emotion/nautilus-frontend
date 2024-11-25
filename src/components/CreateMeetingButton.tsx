import React, { useState } from "react";
import {
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Button, ButtonText } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
} from "@/components/ui/alert-dialog";
import { VStack } from "@/components/ui/vstack";
import { Text } from "@/components/ui/text";
import { useForm, Controller } from "react-hook-form";
import DateTimePicker from "@react-native-community/datetimepicker";
import { AxiosError, AxiosResponse } from "axios";
import { QueuedRequest } from "../Constants";
import { useAuth } from "../utils/AuthContext";
import { useThemeContext } from "../utils/UI/CustomThemeProvider";
import { useGlobalToast } from "../utils/UI/CustomToastProvider";
import ApiClient from "../utils/Networking/APIClient";
import { FormData } from "../Constants";

const CreateMeetingButton: React.FC<{ onMeetingCreated?: () => void }> = ({
  onMeetingCreated,
}) => {
  const { user } = useAuth();
  const { showToast } = useGlobalToast();
  const { colorMode } = useThemeContext();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Date picker state variables
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

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

  // Logging function
  const log = (...args: any[]) => {
    console.log(`[${new Date().toISOString()}] [CreateMeetingButton]`, ...args);
  };

  const handleCreateMeeting = async (data: FormData) => {
    log("handleCreateMeeting called", data);
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
      url: `/api/meetings/`,
      method: "post",
      headers: { Authorization: `Bearer ${user?.token}` },
      data: payload,
      retryCount: 0,
      successHandler: async (response: AxiosResponse) => {
        log("handleCreateMeeting successHandler", response.data);
        showToast({
          title: "Success",
          description: "Meeting created successfully!",
          type: "success",
        });
        setShowCreateDialog(false);
        reset();
        if (onMeetingCreated) {
          onMeetingCreated();
        }
      },
      errorHandler: async (error: AxiosError) => {
        log("handleCreateMeeting errorHandler", error);
        showToast({
          title: "Error",
          description: "Failed to create meeting.",
          type: "error",
        });
      },
      offlineHandler: async () => {
        log("handleCreateMeeting offlineHandler");
        showToast({
          title: "Offline",
          description: "You are offline!",
          type: "error",
        });
      },
    };

    try {
      await ApiClient.handleRequest(request);
      log("handleCreateMeeting request sent");
    } catch (error) {
      log("handleCreateMeeting exception", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => {
          reset();
          setShowCreateDialog(true);
        }}
        style={{ marginRight: 10, padding: 5 }}
      >
        <Text style={{ color: colorMode === "light" ? "#000" : "#fff" }}>
          Create Meeting
        </Text>
      </TouchableOpacity>

      {showCreateDialog && (
        <AlertDialog
          isOpen={showCreateDialog}
          onClose={() => {
            log("Create meeting dialog closed");
            setShowCreateDialog(false);
          }}
        >
          <AlertDialogBackdrop />
          <AlertDialogContent>
            <AlertDialogHeader className="pb-4">
              <Text className="text-lg font-semibold">Create Meeting</Text>
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
                      autoCorrect={false}
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
                      autoCorrect={false}
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
                      autoCorrect={false}
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
                        {value.toLocaleString(undefined, {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "numeric",
                          minute: "numeric",
                        })}
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
                        display={
                          Platform.OS === "ios" ? "spinner" : "default"
                        }
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
                        {value.toLocaleString(undefined, {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "numeric",
                          minute: "numeric",
                        })}
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
                        display={
                          Platform.OS === "ios" ? "spinner" : "default"
                        }
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
                      autoCorrect={false}
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
                  log("Cancel button pressed in Create Dialog");
                  setShowCreateDialog(false);
                }}
              >
                <ButtonText>Cancel</ButtonText>
              </Button>
              <Button
                onPress={handleSubmit(handleCreateMeeting)}
                action="primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <ButtonText>Create</ButtonText>
                )}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
};

export default CreateMeetingButton;