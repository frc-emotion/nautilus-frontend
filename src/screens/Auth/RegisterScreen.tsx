import React, { useState, useEffect } from "react";
import {
  ScrollView,
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  View,
  Linking,
} from "react-native";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Text } from "@/components/ui/text";
import { Input, InputField, InputIcon, InputSlot } from "@/components/ui/input";
import { Button, ButtonText } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectInput,
  SelectIcon,
  SelectPortal,
  SelectBackdrop,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { EyeIcon, EyeOffIcon, ChevronDownIcon } from "lucide-react-native";
import { useGlobalModal } from "../../utils/UI/CustomModalProvider";
import { useGlobalToast } from "../../utils/UI/CustomToastProvider";
import { useForm, Controller, FieldErrors } from "react-hook-form";
import { AxiosError, AxiosResponse } from "axios";
import { GRADES, QueuedRequest, SUBTEAMS } from "../../Constants";
import { useTheme } from "../../utils/UI/CustomThemeProvider";
import {
  cleanPhoneNumber,
  formatPhoneNumber,
  handleErrorWithModalOrToast,
} from "@/src/utils/Helpers";
import { useNetworking } from "@/src/utils/Context/NetworkingContext";
import { Alert } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
} from "@/components/ui/alert-dialog";
import { useAttendance } from "@/src/utils/Context/AttendanceContext";

const RegisterScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { openToast } = useGlobalToast();
  const { openModal } = useGlobalModal();
  const { handleRequest } = useNetworking(); // handleRequest from networking
  const [hidePassword, setHidePassword] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { theme } = useTheme();
  const [showAttendancePolicy, setShowAttendancePolicy] = useState(false);
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);
  const [attendancePolicy, setAttendancePolicy] = useState<string>("");
  const [pendingFormData, setPendingFormData] = useState(null);

  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      studentId: "",
      password: "",
      confirmPassword: "",
      grade: null,
      subteam: null,
    },
  });

  const password = watch("password");

  // useEffect(() => {
  //   if (acceptedPolicy && pendingFormData) {
  //     handleRegister(pendingFormData);
  //     setPendingFormData(null);
  //   }
  // })
  useEffect(() => {
    if (acceptedPolicy) {
      handleSubmit(handleRegister)();
      setShowAttendancePolicy(false);
      setAcceptedPolicy(false);
    }
  }),
    [showAttendancePolicy];

  const fetchAttendancePolicy = async () => {
    console.log(`Fetching attendance policy.`);
    const request: QueuedRequest = {
      url: "/attendance-policy",
      method: "get",
      retryCount: 0,
      successHandler: async (response: AxiosResponse) => {
        const data = response.data;
        console.log(`Received attendance policy:`, data);
        setAttendancePolicy(data);
      },
      errorHandler: async (error: AxiosError) => {
        console.error(`Error fetching attendance policy`, error);
        handleErrorWithModalOrToast({
          actionName: "Fetch Attendance Policy",
          error,
          showModal: false,
          showToast: true,
          openModal,
          openToast,
        });
      },
      offlineHandler: async () => {
        console.warn(`Offline while fetching attendance policy.`);
        openToast({
          title: "Offline",
          description: "Cannot fetch attendance policy while offline.",
          type: "warning",
        });
      },
    };

    try {
      await handleRequest(request);
    } catch (error) {
      console.log("Error", error);
    }
  };

  const handleRegister = async (data: any) => {
    if (!acceptedPolicy) {
      // setPendingFormData(data);
      await fetchAttendancePolicy();
      setShowAttendancePolicy(true);
      return;
      console.log(acceptedPolicy);
    }
    console.log("Register form submitted with data:", data || pendingFormData);
    setIsSubmitting(true);

    const payload = {
      first_name: data.firstName,
      last_name: data.lastName,
      student_id: data.studentId,
      email: data.email,
      password: data.password,
      phone: cleanPhoneNumber(data.phone),
      subteam: [data.subteam?.toLowerCase()],
      grade: data.grade,
    };

    console.log("Payload for API:", payload);

    const request: QueuedRequest = {
      url: "/api/auth/register",
      method: "post",
      data: payload,
      retryCount: 0,
      successHandler: async (response: AxiosResponse) => {
        openModal({
          title: "Woop woop!",
          message:
            "Account created successfully. To gain full access, an admin must approve your account.",
          type: "success",
        });

        openToast({
          title: "Account Created",
          description: response.data.message,
          type: "success",
        });

        setAcceptedPolicy(false);

        reset();
      },
      errorHandler: async (error: AxiosError) => {
        handleErrorWithModalOrToast({
          actionName: "Registration",
          error,
          showModal: false,
          showToast: true,
          openModal,
          openToast,
        });
      },
      offlineHandler: async () => {
        openToast({
          title: "Offline",
          description:
            "Request saved. It will be processed when you're back online.",
          type: "info",
        });

        openModal({
          title: "Offline",
          message:
            "Request saved. It will be processed when you're back online.",
          type: "info",
        });

        reset();
      },
    };

    try {
      await handleRequest(request);
    } catch (error: any) {
      console.error("Error during registration:", error);
      openToast({
        title: "That's a rare bug...",
        description: error.message,
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onError = (validationErrors: FieldErrors) => {
    console.error("Validation errors:", validationErrors);
    const firstError = Object.values(validationErrors)[0];
    if (firstError && "message" in firstError) {
      openToast({
        title: "Validation Error",
        description: (firstError as { message: string }).message,
        type: "error",
      });
    }
  };

  return (
    <View className="flex-1 bg-background-0">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={100}
        className="flex-1 bg-background-0"
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              flexGrow: 1,
            }}
            bounces={false}
            showsVerticalScrollIndicator={false}
          >
            <VStack
              space="md"
              className="w-full max-w-[600px] mx-auto p-4 rounded-md shadow-lg flex-1 justify-center"
              style={{
                minHeight: "100%",
                paddingHorizontal: 16,
                paddingVertical: Platform.OS === "ios" ? 24 : 16,
              }}
            >
              {showAttendancePolicy && (
                <AlertDialog
                  isOpen={showAttendancePolicy}
                  // onClose={() => {
                  //   setShowAttendancePolicy(false);
                  // }}
                >
                  <AlertDialogBackdrop />
                  <AlertDialogContent>
                    <AlertDialogHeader className="pb-4">
                      <Text className="text-lg font-semibold">
                        Attendance Policy Agreement
                      </Text>
                    </AlertDialogHeader>
                    <AlertDialogBody>
                      <VStack>
                        <Text className="font-large"> {attendancePolicy} </Text>
                      </VStack>
                    </AlertDialogBody>
                    <AlertDialogFooter className="flex justify-end space-x-3 pt-6">
                      <Button
                        variant="outline"
                        onPress={() => {
                          setShowAttendancePolicy(false);
                        }}
                      >
                        <ButtonText>Cancel</ButtonText>
                      </Button>
                      <Button
                        onPress={() => {
                          setAcceptedPolicy(true);
                        }}
                      >
                        <ButtonText>Accept</ButtonText>
                      </Button>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              {/* First and Last Name */}
              <HStack space="sm">
                <VStack space="xs" className="flex-1">
                  <Text className="mb-1">First Name</Text>
                  <Controller
                    control={control}
                    name="firstName"
                    rules={{ required: "First Name is required" }}
                    render={({ field: { onChange, value } }) => (
                      <Input size="md" className="rounded">
                        <InputField
                          autoCorrect={false}
                          placeholder="First Name"
                          value={value}
                          onChangeText={onChange}
                        />
                      </Input>
                    )}
                  />
                </VStack>
                <VStack space="xs" className="flex-1">
                  <Text className="mb-1">Last Name</Text>
                  <Controller
                    control={control}
                    name="lastName"
                    rules={{ required: "Last Name is required" }}
                    render={({ field: { onChange, value } }) => (
                      <Input size="md" className="rounded">
                        <InputField
                          autoCorrect={false}
                          placeholder="Last Name"
                          value={value}
                          onChangeText={onChange}
                        />
                      </Input>
                    )}
                  />
                </VStack>
              </HStack>

              {/* Email */}
              <Text className="mb-1 mt-2">Email</Text>
              <Controller
                control={control}
                name="email"
                rules={{
                  required: "Email is required",
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: "Invalid Email",
                  },
                  validate: (value) =>
                    !value.includes("@stu.powayusd.com") ||
                    "Please use your personal email. School emails are not allowed.",
                }}
                render={({ field: { onChange, value } }) => (
                  <Input size="md" className="rounded">
                    <InputField
                      placeholder="Enter Email"
                      keyboardType="email-address"
                      value={value}
                      onChangeText={onChange}
                      autoCorrect={false}
                      autoCapitalize="none"
                    />
                  </Input>
                )}
              />

              {/* Phone */}
              <Text className="mb-1">Phone Number</Text>
              <Controller
                control={control}
                name="phone"
                rules={{
                  required: "Phone Number is required",
                  pattern: {
                    value: /^\(\d{3}\)\s\d{3}-\d{4}$/,
                    message:
                      "Phone Number must be in the format (123) 456-7890",
                  },
                }}
                render={({ field: { onChange, value } }) => (
                  <Input size="md" className="rounded">
                    <InputField
                      placeholder="Enter Phone Number"
                      keyboardType="phone-pad"
                      value={value}
                      onChangeText={(text) => {
                        const formattedText = formatPhoneNumber(text);
                        onChange(formattedText);
                      }}
                      autoCorrect={false}
                    />
                  </Input>
                )}
              />

              {/* Student ID */}
              <Text className="mb-1 mt-2">School Student ID</Text>
              <Controller
                control={control}
                name="studentId"
                rules={{
                  required: "Student ID is required",
                  pattern: {
                    value: /^\d{7}$/,
                    message: "Student ID must be 7 digits",
                  },
                }}
                render={({ field: { onChange, value } }) => (
                  <Input size="md" className="rounded">
                    <InputField
                      placeholder="Enter Student ID"
                      keyboardType="numeric"
                      value={value}
                      maxLength={7}
                      onChangeText={onChange}
                      autoCorrect={false}
                    />
                  </Input>
                )}
              />

              {/* Grade and Subteam */}
              <HStack space="sm" className="mt-2">
                <VStack space="xs" className="flex-1">
                  <Text className="mb-1">Grade</Text>
                  <Controller
                    control={control}
                    name="grade"
                    rules={{ required: "Grade is required" }}
                    render={({ field: { onChange, value } }) => (
                      <Select selectedValue={value} onValueChange={onChange}>
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
                              <SelectItem
                                key={grade}
                                label={grade}
                                value={grade}
                              />
                            ))}
                          </SelectContent>
                        </SelectPortal>
                      </Select>
                    )}
                  />
                </VStack>

                <VStack space="xs" className="flex-1">
                  <Text className="mb-1">Subteam</Text>
                  <Controller
                    control={control}
                    name="subteam"
                    rules={{ required: "Subteam is required" }}
                    render={({ field: { onChange, value } }) => (
                      <Select selectedValue={value} onValueChange={onChange}>
                        <SelectTrigger
                          variant="outline"
                          size="md"
                          className="rounded justify-between"
                        >
                          <SelectInput placeholder="Select Subteam" />
                          <SelectIcon as={ChevronDownIcon} className="mr-2" />
                        </SelectTrigger>
                        <SelectPortal>
                          <SelectBackdrop />
                          <SelectContent>
                            {SUBTEAMS.map((team) => (
                              <SelectItem
                                key={team}
                                label={team}
                                value={team}
                              />
                            ))}
                          </SelectContent>
                        </SelectPortal>
                      </Select>
                    )}
                  />
                </VStack>
              </HStack>

              {/* Password */}
              <Text className="mb-1 mt-2">Password</Text>
              <Controller
                control={control}
                name="password"
                rules={{
                  required: "Password is required",
                  minLength: {
                    value: 8,
                    message: "Password must be at least 8 characters long",
                  },
                  pattern: {
                    value: /^(?=.*\d)(?=.*[^a-zA-Z\d])[A-Za-z\d\S]+$/,
                    message:
                      "Password must contain at least one number and one special character",
                  },
                }}
                render={({ field: { onChange, value } }) => (
                  <Input size="md" className="rounded">
                    <InputField
                      placeholder="Enter Password"
                      secureTextEntry={hidePassword}
                      value={value}
                      onChangeText={onChange}
                      autoCorrect={false}
                    />
                    <InputSlot
                      className="pr-3"
                      onPress={() => setHidePassword(!hidePassword)}
                    >
                      <InputIcon as={hidePassword ? EyeOffIcon : EyeIcon} />
                    </InputSlot>
                  </Input>
                )}
              />

              {/* Confirm Password */}
              <Text className="mb-1 mt-2">Confirm Password</Text>
              <Controller
                control={control}
                name="confirmPassword"
                rules={{
                  required: "Confirm Password is required",
                  validate: (value) =>
                    value === password || "Passwords do not match",
                }}
                render={({ field: { onChange, value } }) => (
                  <Input size="md" className="rounded">
                    <InputField
                      placeholder="Confirm Password"
                      secureTextEntry={hidePassword}
                      value={value}
                      onChangeText={onChange}
                      autoCorrect={false}
                    />
                    <InputSlot
                      className="pr-3"
                      onPress={() => setHidePassword(!hidePassword)}
                    >
                      <InputIcon as={hidePassword ? EyeOffIcon : EyeIcon} />
                    </InputSlot>
                  </Input>
                )}
              />

              {/* Agree to privacy policy message */}
              <Text className="mt-2 text-center text-sm">
                By creating an account, you agree to our{" "}
                <Text
                  className="text-sm text-blue-600"
                  onPress={() =>
                    Linking.openURL("https://team2658.org/privacy-policy")
                  }
                >
                  Privacy Policy
                </Text>
              </Text>

              {/* Submit Button */}
              <Button
                onPress={handleSubmit(handleRegister, onError)}
                size="lg"
                className="mt-2 py-2 rounded-md"
                disabled={isSubmitting}
                action="primary"
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" />
                ) : (
                  <ButtonText className="font-semibold">
                    Create Account
                  </ButtonText>
                )}
              </Button>
            </VStack>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
};

export default RegisterScreen;
