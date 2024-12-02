import React, { useState } from "react";
import {
  TouchableOpacity,
  ActivityIndicator,
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
import { useAuth } from "../utils/Context/AuthContext";
import { useThemeContext } from "../utils/UI/CustomThemeProvider";
import { useGlobalToast } from "../utils/UI/CustomToastProvider";
import ApiClient from "../utils/Networking/APIClient";
import { FormData } from "../Constants";
import { handleErrorWithModalOrToast } from "../utils/Helpers";
import { useModal } from "../utils/UI/CustomModalProvider";
import { Input, InputField } from "@/components/ui/input"; // Import subcomponents

const CreateMeetingButton: React.FC<{ onMeetingCreated?: () => void }> = ({
  onMeetingCreated,
}) => {
  const { openToast } = useGlobalToast();
  const { openModal } = useModal();
  const { colorMode } = useThemeContext();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      term: 1, // TODO: Remove hardcoded term
      year: "2024-2025" // TODO: Remove hardcoded year

    };

    const request: QueuedRequest = {
      url: `/api/meetings/`,
      method: "post",
      data: payload,
      retryCount: 0,
      successHandler: async (response: AxiosResponse) => {
        log("handleCreateMeeting successHandler", response.data);
        openToast({
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

        handleErrorWithModalOrToast({
          actionName: "Creating meeting",
          error,
          showModal: false,
          showToast: true,
          openModal,
          openToast,
        });
      },
      offlineHandler: async () => {
        log("handleCreateMeeting offlineHandler");
        openToast({
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

  // Helper function to format date and time
  const formatDateTime = (date: Date) => {
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    });
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
                    <Input variant="outline" size="md">
                      <InputField
                        value={value}
                        onChangeText={onChange}
                        placeholder="Title"
                        placeholderTextColor={
                          colorMode === "light" ? "#A0AEC0" : "#4A5568"
                        }
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
                    <Input variant="outline" size="md">
                      <InputField
                        value={value}
                        onChangeText={onChange}
                        placeholder="Description"
                        placeholderTextColor={
                          colorMode === "light" ? "#A0AEC0" : "#4A5568"
                        }
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
                    <Input variant="outline" size="md">
                      <InputField
                        value={value}
                        onChangeText={onChange}
                        placeholder="Location"
                        placeholderTextColor={
                          colorMode === "light" ? "#A0AEC0" : "#4A5568"
                        }
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
                    rules={{
                      required: "Start time is required",
                      }}
                      
                    render={({ field: { onChange, value } }) => (
                      <DateTimePicker
                        value={value}
                        mode="datetime"
                        display={
                          "default"
                        }
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
                        display={
                          "default"
                        }
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
                    <Input variant="outline" size="md">
                      <InputField
                        value={value}
                        onChangeText={onChange}
                        placeholder="Hours"
                        keyboardType="numeric"
                        placeholderTextColor={
                          colorMode === "light" ? "#A0AEC0" : "#4A5568"
                        }
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