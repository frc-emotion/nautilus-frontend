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
import { Icon, ThreeDotsIcon, EyeIcon } from "@/components/ui/icon";
import { useTheme } from "../../utils/UI/CustomThemeProvider";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { useForm, Controller } from "react-hook-form";
import { handleErrorWithModalOrToast } from "@/src/utils/Helpers";
import { useGlobalModal } from "@/src/utils/UI/CustomModalProvider";
import { Card } from "@/components/ui/card";
import { View } from "@/components/ui/view";
import { Input, InputField } from "@/components/ui/input";
import { Pressable } from "@/components/ui/pressable";
import { MeetingObject, FormData, QueuedRequest, UserObject, AttendanceLog } from "@/src/Constants";
import { Spinner } from "@/components/ui/spinner";
import { useUsers } from "@/src/utils/Context/UsersContext";
import { useNetworking } from "@/src/utils/Context/NetworkingContext";
import { useAttendance } from "@/src/utils/Context/AttendanceContext";
import { Dimensions } from "react-native";
import { useMeetings } from "@/src/utils/Context/MeetingContext";
const screenHeight = Dimensions.get("window").height;

const MeetingsScreen: React.FC = () => {
  const { user } = useAuth();
  const { openToast } = useGlobalToast();
  const { openModal } = useGlobalModal();
  const { theme } = useTheme();
  const { users } = useUsers();
  const { meetings, isLoadingMeetings, fetchMeetings, init } = useMeetings();
  const { handleRequest } = useNetworking();
  const { currentYear, currentTerm, addManualAttendanceLog } = useAttendance();

  const [refreshing, setRefreshing] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editMeeting, setEditMeeting] = useState<MeetingObject | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filteredMeetings, setFilteredMeetings] = useState<MeetingObject[]>([]);

  const [viewingUsers, setViewingUsers] = useState<UserObject[]>([]);
  const [showViewUsersDialog, setShowViewUsersDialog] = useState<boolean>(false);
  const [attendeesSearchQuery, setAttendeesSearchQuery] = useState("");

  const [viewAddUsers, setViewAddUsers] = useState<boolean>(false);

  const [selectedMeeting, setSelectedMeeting] = useState<MeetingObject>();

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    getValues,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      title: "",
      description: "",
      location: "",
      time_start: new Date(),
      time_end: new Date(),
      hours: 1.0,
    },
  });

  const {
    control: controlForm2,
    handleSubmit: handleSubmitForm2,
    reset: resetForm2,
    setValue: setValueForm2,
    watch: watchForm2,
    getValues: getValuesForm2,
    formState: { errors: errorsForm2 },
  } = useForm({
    defaultValues: {
      user_id:1234567,
    },
  });

  const timeStart = watch("time_start");
  const timeEnd = watch("time_end");

  const log = (...args: any[]) => {
    console.log(`[${new Date().toISOString()}] [MeetingsScreen]`, ...args);
  };

  useEffect(() => {
    log("useEffect [user]", user);
    if (!user) return;
    init();
  }, [user]);

  useEffect(() => {
    log('useEffect [searchQuery]', searchQuery);
    if (!searchQuery) {
      setFilteredMeetings(meetings);
      return;
    }

    const filtered = meetings.filter((meeting: MeetingObject) => {
      return (
        meeting.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        meeting.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        meeting.location.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });

    setFilteredMeetings(filtered);
  }, [searchQuery, meetings]);

  const filteredAttendees = viewingUsers.filter((u) =>
    `${u.first_name} ${u.last_name}`
      .toLowerCase()
      .includes(attendeesSearchQuery.toLowerCase())
  );

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
      await handleRequest(request);
      log("handleDeleteMeeting request sent");
    } catch (error) {
      log("handleDeleteMeeting exception", error);
    }
  };

  const handleEditMeeting = (meeting: MeetingObject) => {
    log("handleEditMeeting called", meeting);
    setEditMeeting({ ...meeting });
    setValue("title", meeting.title);
    setValue("description", meeting.description);
    setValue("location", meeting.location);
    setValue("time_start", new Date(meeting.time_start * 1000));
    setValue("time_end", new Date(meeting.time_end * 1000));
    setValue("hours", meeting.hours);
    setValue("created_by", meeting.created_by);
    setShowEditDialog(true);
  };

  const handleSubmitAddUsers = async(data) => {
    let initial_id = data.user_id
    let meeting = selectedMeeting
    console.log("Yurr",meeting?.members_logged);
    const isStudentInList = users.some(user => user.student_id === initial_id);
    if (!isStudentInList){
      openToast({
        title: "Add User Failed",
        description: "User doesn't exist!",
        type: "error",
      });
    
    
      return;
    };

    console.log(meeting?.members_logged)
    let cur_user = users.find(user => user.student_id === initial_id);
    let id = cur_user._id;
    const isStudentInMeeting = meeting?.members_logged.some(_id => _id===id);
    console.log(isStudentInMeeting, "variable");

    if (isStudentInMeeting){
      openToast({
        title: "Add User Failed",
        description: "User already logged!",
        type:"error",
      });

      return;
    };

    const attendanceLogManual: AttendanceLog = {
                    meeting_id: -1,
                    lead_id: user?._id || 1,
                    time_received: Math.floor(Date.now() / 1000),
                    flag: false,
                    hours: meeting?.hours || 1,
                    term: currentTerm,
                    year: currentYear,
                };
    const attendanceLog: AttendanceLog = {
                  meeting_id: meeting?._id || -1,
                  lead_id: user?._id || 1,
                  time_received: Math.floor(Date.now() / 1000),
                  flag: false,
                  hours: meeting?.hours || 1,
                  term: currentTerm,
                  year: currentYear,
              };
    const payload = {
      user_id: id,
      attendance_log: attendanceLog,
    };

    const request: QueuedRequest = {
      url: '/api/meetings/add_user',
      method: "post",
      data: {
        user_id: id,
        attendanceLog,
    },
      retryCount: 0,
      successHandler: async (response: AxiosResponse) => {
        log("saveEditChanges successHandler", response.data);
        openToast({
          title: "Success",
          description: "User added successfully!",
          type: "success",
        });
        setViewAddUsers(false);
        await addManualAttendanceLog(id, attendanceLogManual);
        fetchMeetings();
      },
      errorHandler: async (error: AxiosError) => {
        log("addUser errorHandler", error);

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
          actionName: "Add Users",
          error,
          showModal: false,
          showToast: true,
          openModal,
          openToast,
        });
      },
      offlineHandler: async () => {
        log("addUsers offlineHandler");
        openToast({
          title: "Offline",
          description: "You are offline!",
          type: "error",
        });
      },
    };

    try {
      await handleRequest(request);
      log("addUsers request sent");
    } catch (error) {
      log("addUsers exception", error);
    } finally {
      setIsSubmitting(false);
    }
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
      created_by: data.created_by,
      time_start: Math.floor(data.time_start.getTime() / 1000),
      time_end: Math.floor(data.time_end.getTime() / 1000),
      hours: data.hours,
      term: currentTerm,
      year: currentYear,
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
      await handleRequest(request);
      log("saveEditChanges request sent");
    } catch (error) {
      log("saveEditChanges exception", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddUsers = (meeting: MeetingObject) => {
    log("handleAddUser called");
    setViewAddUsers(true);
    // handleSubmitAddUsers(addID,meeting);

  };

  const handleViewMeeting = (meeting: MeetingObject) => {
    log("handleViewMeeting called", meeting);
    // Existing functionality: just log or show details if needed
  };

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

    const loggedUsers: UserObject[] = users.filter(u => meeting.members_logged?.includes(u._id));
    setViewingUsers(loggedUsers);
    setShowViewUsersDialog(true);
  };

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

  // Handlers for changing start/end times (Android)
  const onChangeEditStartDate = (event: any, selectedDate?: Date) => {
    if (event.type === "set" && selectedDate) {
      const currentStart = new Date(selectedDate);
      const oldStart = watch("time_start");
      currentStart.setHours(oldStart.getHours());
      currentStart.setMinutes(oldStart.getMinutes());
      setValue("time_start", currentStart, { shouldValidate: true });
    }
  };

  const onChangeEditStartTime = (event: any, selectedTime?: Date) => {
    if (event.type === "set" && selectedTime) {
      const currentStart = new Date(watch("time_start"));
      currentStart.setHours(selectedTime.getHours());
      currentStart.setMinutes(selectedTime.getMinutes());
      setValue("time_start", currentStart, { shouldValidate: true });
    }
  };

  const onChangeEditEndDate = (event: any, selectedDate?: Date) => {
    if (event.type === "set" && selectedDate) {
      const currentEnd = new Date(selectedDate);
      const oldEnd = watch("time_end");
      currentEnd.setHours(oldEnd.getHours());
      currentEnd.setMinutes(oldEnd.getMinutes());
      setValue("time_end", currentEnd, { shouldValidate: true });
    }
  };

  const onChangeEditEndTime = (event: any, selectedTime?: Date) => {
    if (event.type === "set" && selectedTime) {
      const currentEnd = new Date(watch("time_end"));
      currentEnd.setHours(selectedTime.getHours());
      currentEnd.setMinutes(selectedTime.getMinutes());
      setValue("time_end", currentEnd, { shouldValidate: true });
    }
  };

  const showEditDatePicker = (pickerType: 'start' | 'end') => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: pickerType === 'start' ? timeStart : timeEnd,
        onChange: pickerType === 'start' ? onChangeEditStartDate : onChangeEditEndDate,
        mode: 'date',
        is24Hour: false,
      });
    }
  };

  const showEditTimePicker = (pickerType: 'start' | 'end') => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: pickerType === 'start' ? timeStart : timeEnd,
        onChange: pickerType === 'start' ? onChangeEditStartTime : onChangeEditEndTime,
        mode: 'time',
        is24Hour: false,
      });
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{
        flex: 1,
        backgroundColor: theme === "light" ? "#FFFFFF" : "#1A202C",
      }}
    >
      <Box className="p-4 flex-1">
        {/* Search Input */}
        <Input variant="outline" size="md" className="mb-4">
          <InputField
            value={searchQuery}
            onChangeText={(text) => {
              log('Search query changed', text);
              setSearchQuery(text);
            }}
            placeholder="Search by name, description, location..."
            placeholderTextColor={theme === 'light' ? '#A0AEC0' : '#4A5568'}
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
                  className="p-4 mb-3 rounded-lg"
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
                          <Pressable
                            onPress={() => handleViewUsers(meeting)}
                            className="mr-2"
                          >
                            <Icon as={EyeIcon} />
                          </Pressable>

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
                            {user.role === "admin" && (
                            <MenuItem
                              onPress={() => {
                                log("meeting", meeting);
                                setSelectedMeeting(meeting);
                                handleAddUsers(meeting);
                              }}
                            >
                              <MenuItemLabel>Add User</MenuItemLabel>
                            </MenuItem>)}
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
              reset();
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
                      <Input variant="outline" size="md">
                        <InputField
                          value={value}
                          onChangeText={onChange}
                          placeholder="Title"
                          placeholderTextColor={
                            theme === "light" ? "#A0AEC0" : "#4A5568"
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
                            theme === "light" ? "#A0AEC0" : "#4A5568"
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
                            theme === "light" ? "#A0AEC0" : "#4A5568"
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
                            onPress={() => showEditDatePicker('start')}
                            className="flex-1 p-2 border border-gray-300 rounded"
                          >
                            <Text>
                              {value ? value.toLocaleDateString() : "Select Start Date"}
                            </Text>
                          </Pressable>

                          <Pressable
                            onPress={() => showEditTimePicker('start')}
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
                        <View className="flex-row justify-between space-x-2">
                          <Pressable
                            onPress={() => showEditDatePicker('end')}
                            className="flex-1 p-2 border border-gray-300 rounded"
                          >
                            <Text>
                              {value ? value.toLocaleDateString() : "Select End Date"}
                            </Text>
                          </Pressable>

                          <Pressable
                            onPress={() => showEditTimePicker('end')}
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
                          value={value.toString()}
                          onChangeText={onChange}
                          placeholder="Hours"
                          keyboardType="numeric"
                          placeholderTextColor={
                            theme === "light" ? "#A0AEC0" : "#4A5568"
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
                    log("Cancel button pressed in Edit Dialog");
                    setShowEditDialog(false);
                    reset();
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

        {/* View Users Dialog */}
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
        {/* Search bar for filtering attendees */}
        <Input variant="outline" size="md" className="mb-4">
          <InputField
            value={attendeesSearchQuery}
            onChangeText={(text) => setAttendeesSearchQuery(text)}
            placeholder="Search users..."
            placeholderTextColor={
              theme === "light" ? "#A0AEC0" : "#4A5568"
            }
          />
        </Input>

        {filteredAttendees.length > 0 ? (
          <ScrollView 
            style={{ maxHeight: screenHeight * 0.4 }} 
            showsVerticalScrollIndicator={true}
          >
            {filteredAttendees.map((user) => (
              <VStack key={user._id} className="mb-2">
                <Text className="font-medium">
                  {user.first_name} {user.last_name}
                </Text>
              </VStack>
            ))}
          </ScrollView>
        ) : (
          <Text>No users match the search criteria.</Text>
        )}
      </AlertDialogBody>
      <AlertDialogFooter className="flex justify-end space-x-3 pt-6">
        <Button onPress={() => setShowViewUsersDialog(false)}>
          <ButtonText>Close</ButtonText>
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
)}

{viewAddUsers && (
  <AlertDialog
    isOpen={viewAddUsers}
    onClose={() => setViewAddUsers(false)}
  >
    <AlertDialogBackdrop />
    <AlertDialogContent>
      <AlertDialogHeader className="pb-4">
        <Text className="text-lg font-semibold">Add User</Text>
      </AlertDialogHeader>
      <AlertDialogBody>
        {/* Search bar for filtering attendees */}
        <Text className="font-medium">Student ID</Text>
                  <Controller
                    control={controlForm2}
                    name="user_id"
                    rules={{
                      required: "User ID is required",
                      pattern: {
                        value: /^\d{7}$/,
                        message: "Please enter a valid 7-digit id",
                      },
                    }}
                    render={({ field: { onChange, value } }) => (
                      <Input variant="outline" size="md">
                        <InputField
                          value={value.toString()}
                          onChangeText={onChange}
                          placeholder="Student ID"
                          keyboardType="numeric"
                          placeholderTextColor={
                            theme === "light" ? "#A0AEC0" : "#4A5568"
                          }
                        />
                      </Input>
                    )}
                  />
                  {errorsForm2.user_id && (
                    <Text className="text-red-500">{errorsForm2.user_id.message}</Text>
                  )}
      </AlertDialogBody>
      <AlertDialogFooter className="flex justify-end space-x-3 pt-6">
        <Button onPress={() => setViewAddUsers(false)}>
          <ButtonText>Close</ButtonText>
        </Button>
        <Button onPress={handleSubmitForm2(handleSubmitAddUsers)}>
          <ButtonText>Add</ButtonText>
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