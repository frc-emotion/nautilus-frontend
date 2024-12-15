import React, { useState } from "react";
import { Platform, View, ActivityIndicator } from "react-native";
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
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { Pressable } from "@/components/ui/pressable";
import { AxiosError, AxiosResponse } from "axios";
import { QueuedRequest, FormData } from "../Constants";
import { useThemeContext } from "../utils/UI/CustomThemeProvider";
import { useGlobalToast } from "../utils/UI/CustomToastProvider";
import { useGlobalModal } from "../utils/UI/CustomModalProvider";
import { handleErrorWithModalOrToast } from "../utils/Helpers";
import { Input, InputField } from "@/components/ui/input";
import { useNetworking } from "../utils/Context/NetworkingContext";
import { useAttendance } from "../utils/Context/AttendanceContext";

const CreateMeetingButton: React.FC<{ onMeetingCreated?: () => void }> = ({
  onMeetingCreated,
}) => {
  const { openToast } = useGlobalToast();
  const { openModal } = useGlobalModal();
  const { colorMode } = useThemeContext();
  const { handleRequest } = useNetworking();
  const { currentYear, currentTerm } = useAttendance();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
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

  const timeStart = watch("time_start");
  const timeEnd = watch("time_end");

  const log = (...args: any[]) => {
    console.log(`[${new Date().toISOString()}] [CreateMeetingButton]`, ...args);
  };

  const handleCreateMeeting = async (data: FormData) => {
    log("handleCreateMeeting called", data);
    setIsSubmitting(true);

    log(currentTerm);
    log(currentYear);

    const payload = {
      title: data.title,
      description: data.description,
      location: data.location,
      time_start: Math.floor(data.time_start.getTime() / 1000),
      time_end: Math.floor(data.time_end.getTime() / 1000),
      hours: parseFloat(data.hours),
      term: currentTerm,
      year: currentYear,
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
      await handleRequest(request);
      log("handleCreateMeeting request sent");
    } catch (error) {
      log("handleCreateMeeting exception", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onChangeStartDate = (event: any, selectedDate?: Date) => {
    if (event.type === "set" && selectedDate) {
      const currentStart = new Date(selectedDate);
      const oldStart = watch("time_start");
      currentStart.setHours(oldStart.getHours());
      currentStart.setMinutes(oldStart.getMinutes());
      setValue("time_start", currentStart, { shouldValidate: true });
    }
  };

  const onChangeStartTime = (event: any, selectedTime?: Date) => {
    if (event.type === "set" && selectedTime) {
      const currentStart = new Date(watch("time_start"));
      currentStart.setHours(selectedTime.getHours());
      currentStart.setMinutes(selectedTime.getMinutes());
      setValue("time_start", currentStart, { shouldValidate: true });
    }
  };

  const onChangeEndDate = (event: any, selectedDate?: Date) => {
    if (event.type === "set" && selectedDate) {
      const currentEnd = new Date(selectedDate);
      const oldEnd = watch("time_end");
      currentEnd.setHours(oldEnd.getHours());
      currentEnd.setMinutes(oldEnd.getMinutes());
      setValue("time_end", currentEnd, { shouldValidate: true });
    }
  };

  const onChangeEndTime = (event: any, selectedTime?: Date) => {
    if (event.type === "set" && selectedTime) {
      const currentEnd = new Date(watch("time_end"));
      currentEnd.setHours(selectedTime.getHours());
      currentEnd.setMinutes(selectedTime.getMinutes());
      setValue("time_end", currentEnd, { shouldValidate: true });
    }
  };

  const showDatePicker = (pickerType: 'start' | 'end') => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: pickerType === 'start' ? timeStart : timeEnd,
        onChange: pickerType === 'start' ? onChangeStartDate : onChangeEndDate,
        mode: 'date',
        is24Hour: false,
      });
    }
  };

  const showTimePicker = (pickerType: 'start' | 'end') => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: pickerType === 'start' ? timeStart : timeEnd,
        onChange: pickerType === 'start' ? onChangeStartTime : onChangeEndTime,
        mode: 'time',
        is24Hour: false,
      });
    }
  };

  return (
    <>
      <Pressable
        onPress={() => {
          reset();
          setShowCreateDialog(true);
        }}
        className="p-2 bg-primary-500 rounded items-center justify-center"
      >
        <Text className="text-typography-0">Create Meeting</Text>
      </Pressable>

      {showCreateDialog && (
        <AlertDialog
          isOpen={showCreateDialog}
          onClose={() => {
            log("Create meeting dialog closed");
            setShowCreateDialog(false);
            reset();
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
                  <Text className="text-red-500">{errors.description.message}</Text>
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
                  <Text className="text-red-500">{errors.location.message}</Text>
                )}

                {/* Start Time */}
                <Text className="font-medium">Start Time</Text>
                {Platform.OS === 'ios' ? (
                  <Controller
                    control={control}
                    name="time_start"
                    rules={{ required: "Start time is required" }}
                    render={({ field: { onChange, value } }) => (
                      <View className="bg-white">
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
                      </View>
                    )}
                  />
                ) : (
                  <Controller
                    control={control}
                    name="time_start"
                    rules={{ required: "Start time is required" }}
                    render={({ field: { value } }) => (
                      <View className="flex-row justify-between space-x-2">
                        <Pressable
                          onPress={() => showDatePicker('start')}
                          className="flex-1 p-2 border border-gray-300 rounded"
                        >
                          <Text>
                            {value ? value.toLocaleDateString() : "Select Start Date"}
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={() => showTimePicker('start')}
                          className="flex-1 p-2 border border-gray-300 rounded"
                        >
                          <Text>
                            {value
                              ? value.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
                              : "Select Start Time"}
                          </Text>
                        </Pressable>
                      </View>
                    )}
                  />
                )}
                {errors.time_start && (
                  <Text className="text-red-500">{errors.time_start.message}</Text>
                )}

                {/* End Time */}
                <Text className="font-medium">End Time</Text>
                {Platform.OS === 'ios' ? (
                  <Controller
                    control={control}
                    name="time_end"
                    rules={{ required: "End time is required" }}
                    render={({ field: { onChange, value } }) => (
                      <View className="bg-white">
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
                      </View>
                    )}
                  />
                ) : (
                  <Controller
                    control={control}
                    name="time_end"
                    rules={{ required: "End time is required" }}
                    render={({ field: { value } }) => (
                      <View className="flex-row justify-between space-x-2">
                        <Pressable
                          onPress={() => showDatePicker('end')}
                          className="flex-1 p-2 border border-gray-300 rounded"
                        >
                          <Text>
                            {value ? value.toLocaleDateString() : "Select End Date"}
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={() => showTimePicker('end')}
                          className="flex-1 p-2 border border-gray-300 rounded"
                        >
                          <Text>
                            {value
                              ? value.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
                              : "Select End Time"}
                          </Text>
                        </Pressable>
                      </View>
                    )}
                  />
                )}
                {errors.time_end && (
                  <Text className="text-red-500">{errors.time_end.message}</Text>
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
                  reset();
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