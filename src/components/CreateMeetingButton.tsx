import React, { useState } from "react";
import {
  TouchableOpacity,
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
import DateTimePicker, {
  DateTimePickerAndroid,
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { AxiosError, AxiosResponse } from "axios";
import { QueuedRequest, FormData } from "../Constants";
import { useThemeContext } from "../utils/UI/CustomThemeProvider";
import { useGlobalToast } from "../utils/UI/CustomToastProvider";
import { useModal } from "../utils/UI/CustomModalProvider";
import { handleErrorWithModalOrToast } from "../utils/Helpers";
import { Input, InputField } from "@/components/ui/input";
import { useNetworking } from "../utils/Context/NetworkingContext";
import { useAttendance } from "../utils/Context/AttendanceContext";

const CreateMeetingButton: React.FC<{ onMeetingCreated?: () => void }> = ({
  onMeetingCreated,
}) => {
  const { openToast } = useGlobalToast();
  const { openModal } = useModal();
  const { colorMode } = useThemeContext();
  const { handleRequest } = useNetworking();
  const { currentYear, currentTerm } = useAttendance();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State variables to control DateTimePicker visibility for Android
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

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

  // Watch the form values for time_start and time_end
  const timeStart = watch("time_start");
  const timeEnd = watch("time_end");

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
      await handleRequest(request); // Use handleRequest from networking context
      log("handleCreateMeeting request sent");
    } catch (error) {
      log("handleCreateMeeting exception", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handlers for Date and Time Pickers (Android)
  const onChangeStartDate = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (event.type === "set" && selectedDate) {
      const currentStart = new Date(selectedDate);
      setValue("time_start", currentStart, { shouldValidate: true });
      if (Platform.OS === "android") {
        // After selecting date, open time picker
        setShowStartTimePicker(true);
      }
    }
    setShowStartDatePicker(false);
  };

  const onChangeStartTime = (event: DateTimePickerEvent, selectedTime?: Date) => {
    if (event.type === "set" && selectedTime) {
      const currentStart = new Date(watch("time_start"));
      currentStart.setHours(selectedTime.getHours());
      currentStart.setMinutes(selectedTime.getMinutes());
      setValue("time_start", currentStart, { shouldValidate: true });
    }
    setShowStartTimePicker(false);
  };

  const onChangeEndDate = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (event.type === "set" && selectedDate) {
      const currentEnd = new Date(selectedDate);
      setValue("time_end", currentEnd, { shouldValidate: true });
      if (Platform.OS === "android") {
        // After selecting date, open time picker
        setShowEndTimePicker(true);
      }
    }
    setShowEndDatePicker(false);
  };

  const onChangeEndTime = (event: DateTimePickerEvent, selectedTime?: Date) => {
    if (event.type === "set" && selectedTime) {
      const currentEnd = new Date(watch("time_end"));
      currentEnd.setHours(selectedTime.getHours());
      currentEnd.setMinutes(selectedTime.getMinutes());
      setValue("time_end", currentEnd, { shouldValidate: true });
    }
    setShowEndTimePicker(false);
  };

  const showDatePicker = (pickerType: 'start' | 'end') => {
    if (pickerType === 'start') {
      setShowStartDatePicker(true);
      if (Platform.OS === 'android') {
        DateTimePickerAndroid.open({
          value: timeStart,
          onChange: onChangeStartDate,
          mode: 'date',
          is24Hour: true,
        });
      }
    } else {
      setShowEndDatePicker(true);
      if (Platform.OS === 'android') {
        DateTimePickerAndroid.open({
          value: timeEnd,
          onChange: onChangeEndDate,
          mode: 'date',
          is24Hour: true,
        });
      }
    }
  };

  const showTimePicker = (pickerType: 'start' | 'end') => {
    if (pickerType === 'start') {
      setShowStartTimePicker(true);
      if (Platform.OS === 'android') {
        DateTimePickerAndroid.open({
          value: timeStart,
          onChange: onChangeStartTime,
          mode: 'time',
          is24Hour: true,
        });
      }
    } else {
      setShowEndTimePicker(true);
      if (Platform.OS === 'android') {
        DateTimePickerAndroid.open({
          value: timeEnd,
          onChange: onChangeEndTime,
          mode: 'time',
          is24Hour: true,
        });
      }
    }
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => {
          reset();
          setShowCreateDialog(true);
        }}
      >
        <Text>
          Create Meeting
        </Text>
      </TouchableOpacity>

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
                {Platform.OS === 'ios' ? (
                  <Controller
                    control={control}
                    name="time_start"
                    rules={{ required: "Start time is required" }}
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
                        style={{ backgroundColor: '#fff' }}
                      />
                    )}
                  />
                ) : (
                  <>
                    <Controller
                      control={control}
                      name="time_start"
                      rules={{ required: "Start time is required" }}
                      render={({ field: { value } }) => (
                        <TouchableOpacity
                          onPress={() => {
                            // For Android, open date picker
                            showDatePicker('start');
                          }}
                          style={{
                            padding: 10,
                            borderWidth: 1,
                            borderColor: '#ccc',
                            borderRadius: 5,
                            marginBottom: 5,
                          }}
                        >
                          <Text>
                            {value ? value.toLocaleString() : "Select Start Time"}
                          </Text>
                        </TouchableOpacity>
                      )}
                    />
                  </>
                )}
                {errors.time_start && (
                  <Text className="text-red-500">
                    {errors.time_start.message}
                  </Text>
                )}

                {/* End Time Picker */}
                <Text className="font-medium">End Time</Text>
                {Platform.OS === 'ios' ? (
                  <Controller
                    control={control}
                    name="time_end"
                    rules={{ required: "End time is required" }}
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
                        style={{ backgroundColor: '#fff' }}
                      />
                    )}
                  />
                ) : (
                  <>
                    <Controller
                      control={control}
                      name="time_end"
                      rules={{ required: "End time is required" }}
                      render={({ field: { value } }) => (
                        <TouchableOpacity
                          onPress={() => {
                            // For Android, open date picker
                            showDatePicker('end');
                          }}
                          style={{
                            padding: 10,
                            borderWidth: 1,
                            borderColor: '#ccc',
                            borderRadius: 5,
                            marginBottom: 5,
                          }}
                        >
                          <Text>
                            {value ? value.toLocaleString() : "Select End Time"}
                          </Text>
                        </TouchableOpacity>
                      )}
                    />
                  </>
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